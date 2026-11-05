// Reading files from MPQ archives, Blizzard's archive format.
//
// Only the parts that are needed are read, through File.slice, so an archive
// of hundreds of megabytes isn't loaded into memory. The archive is
// untrusted: every size and offset is checked before it's used, so a damaged
// or crafted archive gives an error rather than a hang or a huge allocation.
"use strict";

(function (AG) {
  var D = AG.assets.decompress;

  var FLAG = {
    IMPLODE: 0x100,
    COMPRESS: 0x200,
    ENCRYPTED: 0x10000,
    FIX_KEY: 0x20000,
    SINGLE_UNIT: 0x1000000,
    SECTOR_CRC: 0x4000000,
    EXISTS: 0x80000000
  };
  var MAX_TABLE = 1 << 20;
  var MAX_FILE = 64 * 1024 * 1024;
  var HEADER_SEARCH = 8 * 1024 * 1024;

  // ---- Encryption

  var cryptTable = null;
  function table() {
    if (cryptTable) return cryptTable;
    cryptTable = new Uint32Array(0x500);
    var seed = 0x00100001;
    for (var i = 0; i < 0x100; i++) {
      for (var j = 0, k = i; j < 5; j++, k += 0x100) {
        seed = (seed * 125 + 3) % 0x2aaaab;
        var a = (seed & 0xffff) << 16;
        seed = (seed * 125 + 3) % 0x2aaaab;
        var b = seed & 0xffff;
        cryptTable[k] = (a | b) >>> 0;
      }
    }
    return cryptTable;
  }

  // Storm's hash of a file name. `type` 0 is the table index, 1 and 2 the
  // two name checks, 3 the encryption key.
  function hashString(name, type) {
    var t = table();
    var seed1 = 0x7fed7fed;
    var seed2 = 0xeeeeeeee;
    var s = name.toUpperCase().replace(/\//g, "\\");
    for (var i = 0; i < s.length; i++) {
      var ch = s.charCodeAt(i) & 0xff;
      seed1 = (t[type * 0x100 + ch] ^ ((seed1 + seed2) >>> 0)) >>> 0;
      seed2 = (ch + seed1 + seed2 + ((seed2 << 5) >>> 0) + 3) >>> 0;
    }
    return seed1 >>> 0;
  }

  // Decrypts whole 32-bit words of `bytes` in place.
  function decrypt(bytes, key) {
    var t = table();
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var seed2 = 0xeeeeeeee;
    key = key >>> 0;
    for (var i = 0; i + 4 <= bytes.length; i += 4) {
      seed2 = (seed2 + t[0x400 + (key & 0xff)]) >>> 0;
      var ch = (dv.getUint32(i, true) ^ ((key + seed2) >>> 0)) >>> 0;
      key = ((((~key) << 0x15) >>> 0) + 0x11111111 | (key >>> 0x0b)) >>> 0;
      seed2 = (ch + seed2 + ((seed2 << 5) >>> 0) + 3) >>> 0;
      dv.setUint32(i, ch, true);
    }
    return bytes;
  }

  // The inverse, used only to build archives in tests.
  function encrypt(bytes, key) {
    var t = table();
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var seed2 = 0xeeeeeeee;
    key = key >>> 0;
    for (var i = 0; i + 4 <= bytes.length; i += 4) {
      seed2 = (seed2 + t[0x400 + (key & 0xff)]) >>> 0;
      var ch = dv.getUint32(i, true);
      dv.setUint32(i, (ch ^ ((key + seed2) >>> 0)) >>> 0, true);
      key = ((((~key) << 0x15) >>> 0) + 0x11111111 | (key >>> 0x0b)) >>> 0;
      seed2 = (ch + seed2 + ((seed2 << 5) >>> 0) + 3) >>> 0;
    }
    return bytes;
  }

  function fileKey(name, block) {
    var base = name.replace(/\//g, "\\").split("\\").pop();
    var key = hashString(base, 3);
    if (block.flags & FLAG.FIX_KEY) key = ((key + block.filePos) ^ block.fileSize) >>> 0;
    return key;
  }

  // ---- Reading

  function MpqError(message) {
    this.name = "MpqError";
    this.message = message;
  }
  MpqError.prototype = Object.create(Error.prototype);

  function read(file, start, length) {
    if (start < 0 || length < 0 || start + length > file.size) {
      return Promise.reject(new MpqError("it points past the end of the file, at " + (start + length) + " of " + file.size + " bytes; it may be truncated"));
    }
    return Promise.resolve(file.slice(start, start + length).arrayBuffer()).then(function (buf) {
      if (buf.byteLength !== length) throw new MpqError("it ends early; it may be truncated");
      return new Uint8Array(buf);
    });
  }

  function u32(b, o) {
    return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  }
  function u16(b, o) {
    return b[o] | (b[o + 1] << 8);
  }

  // Finds the archive header: at the start, or at a 512-byte boundary.
  function findHeader(file) {
    var limit = Math.min(file.size, HEADER_SEARCH);
    var chunk = 64 * 1024;
    function scan(offset) {
      if (offset >= limit) return Promise.reject(new MpqError("it isn't an MPQ archive: no archive header was found"));
      var len = Math.min(chunk + 32, file.size - offset);
      return read(file, offset, len).then(function (b) {
        for (var o = 0; o + 32 <= b.length && o < chunk; o += 512) {
          if (b[o] === 0x4d && b[o + 1] === 0x50 && b[o + 2] === 0x51) {
            if (b[o + 3] === 0x1a) return offset + o;
            if (b[o + 3] === 0x1b) {
              // User data header: the archive header is further on.
              var at = offset + o + u32(b, o + 8);
              return at < file.size ? at : Promise.reject(new MpqError("its user data header points past the end"));
            }
          }
        }
        return scan(offset + chunk);
      });
    }
    return scan(0);
  }

  // Opens an archive. Resolves with an object that can find and read files.
  function open(file) {
    var base;
    var header;
    return findHeader(file)
      .then(function (at) {
        base = at;
        return read(file, base, 32);
      })
      .then(function (h) {
        if (u32(h, 0) !== 0x1a51504d) throw new MpqError("its archive header is damaged");
        header = {
          headerSize: u32(h, 4),
          format: u16(h, 12),
          sectorShift: u16(h, 14),
          hashPos: u32(h, 16),
          blockPos: u32(h, 20),
          hashCount: u32(h, 24),
          blockCount: u32(h, 28)
        };
        if (header.sectorShift > 20) throw new MpqError("its sector size is impossible");
        if (!header.hashCount || header.hashCount > MAX_TABLE || (header.hashCount & (header.hashCount - 1))) {
          throw new MpqError("its hash table size, " + header.hashCount + ", is impossible");
        }
        if (header.blockCount > MAX_TABLE) throw new MpqError("its block table size, " + header.blockCount + ", is impossible");
        return Promise.all([read(file, base + header.hashPos, header.hashCount * 16), read(file, base + header.blockPos, header.blockCount * 16)]);
      })
      .then(function (t) {
        var hashes = decrypt(t[0], hashString("(hash table)", 3));
        var blocks = decrypt(t[1], hashString("(block table)", 3));
        return archive(file, base, header, hashes, blocks);
      });
  }

  function archive(file, base, header, hashes, blocks) {
    var sectorSize = 512 << header.sectorShift;

    function block(i) {
      var o = i * 16;
      return { filePos: u32(blocks, o), compressedSize: u32(blocks, o + 4), fileSize: u32(blocks, o + 8), flags: u32(blocks, o + 12) };
    }

    // The block of a file, as an English install of the game picks it: the
    // US English copy, else the language-neutral one. Copies in other
    // languages are skipped, as Storm skips them.
    function find(name) {
      var n = header.hashCount;
      var start = hashString(name, 0) & (n - 1);
      var a = hashString(name, 1);
      var b = hashString(name, 2);
      var found = {};
      for (var k = 0; k < n; k++) {
        var o = ((start + k) & (n - 1)) * 16;
        var bi = u32(hashes, o + 12);
        if (bi === 0xffffffff) break;
        if (bi === 0xfffffffe) continue;
        if (u32(hashes, o) === a && u32(hashes, o + 4) === b && bi < header.blockCount) {
          var locale = u16(hashes, o + 8);
          if (!(locale in found)) found[locale] = bi;
        }
      }
      var pick = 0x409 in found ? found[0x409] : 0 in found ? found[0] : null;
      if (pick === null) return null;
      var bl = block(pick);
      return bl.flags & FLAG.EXISTS ? bl : null;
    }

    function readFile(name) {
      var bl = find(name);
      if (!bl) return Promise.reject(new MpqError(name + " isn't in it"));
      if (bl.fileSize > MAX_FILE) return Promise.reject(new MpqError(name + " is " + bl.fileSize + " bytes, larger than any file the editor needs"));
      var pos = base + bl.filePos;
      if (pos + bl.compressedSize > file.size) return Promise.reject(new MpqError(name + " points past the end of the archive; it may be truncated"));
      var compressed = !!(bl.flags & (FLAG.IMPLODE | FLAG.COMPRESS));
      var key = bl.flags & FLAG.ENCRYPTED ? fileKey(name, bl) : 0;
      var where = function (e) {
        if (e instanceof D.UnsupportedError) {
          var u = new D.UnsupportedError(e.method);
          u.message = name + ": " + e.message;
          throw u;
        }
        throw new MpqError(name + ": " + (e && e.message ? e.message : e));
      };

      if (bl.flags & FLAG.SINGLE_UNIT) {
        return read(file, pos, bl.compressedSize)
          .then(function (data) {
            if (bl.flags & FLAG.ENCRYPTED) decrypt(data, key);
            return compressed ? D.sector(data, bl.fileSize, bl.flags) : data.subarray(0, bl.fileSize);
          })
          .then(check(name, bl.fileSize))
          .catch(where);
      }

      var count = Math.ceil(bl.fileSize / sectorSize);
      return read(file, pos, bl.compressedSize)
        .then(function (data) {
          var offsets = [];
          if (compressed) {
            var entries = count + 1;
            if ((count + 1) * 4 > data.length) throw new MpqError("its sector table is cut off");
            var tableBytes = data.slice(0, entries * 4);
            if (bl.flags & FLAG.ENCRYPTED) decrypt(tableBytes, (key - 1) >>> 0);
            for (var i = 0; i < entries; i++) offsets.push(u32(tableBytes, i * 4));
            for (var j = 0; j < count; j++) {
              if (offsets[j] > offsets[j + 1] || offsets[j + 1] > data.length) throw new MpqError("its sector table is damaged");
            }
          } else {
            for (var s = 0; s <= count; s++) offsets.push(Math.min(s * sectorSize, bl.fileSize));
            if (bl.fileSize > data.length) throw new MpqError("it's shorter than its stated size");
          }
          var out = new Uint8Array(bl.fileSize);
          var at = 0;
          function next(i) {
            if (i >= count) return out;
            var want = Math.min(sectorSize, bl.fileSize - i * sectorSize);
            var chunk = data.slice(offsets[i], offsets[i + 1]);
            if (bl.flags & FLAG.ENCRYPTED) decrypt(chunk, (key + i) >>> 0);
            return D.sector(chunk, want, bl.flags).then(function (plain) {
              if (plain.length !== want) throw new MpqError("sector " + i + " decompresses to " + plain.length + " bytes, not " + want);
              out.set(plain, at);
              at += want;
              // Give the page a moment between sectors of a large file.
              return i % 16 === 15 ? new Promise(function (r) {
                setTimeout(function () {
                  r(next(i + 1));
                }, 0);
              }) : next(i + 1);
            });
          }
          return next(0);
        })
        .then(check(name, bl.fileSize))
        .catch(where);
    }

    function check(name, size) {
      return function (data) {
        if (data.length !== size) throw new MpqError(name + " decompresses to " + data.length + " bytes, not " + size);
        return data;
      };
    }

    return {
      name: file.name,
      sectorSize: sectorSize,
      has: function (name) {
        return !!find(name);
      },
      read: readFile
    };
  }

  AG.assets.mpq = {
    FLAG: FLAG,
    open: open,
    hashString: hashString,
    decrypt: decrypt,
    encrypt: encrypt,
    MpqError: MpqError
  };
})(AxeGraft);
