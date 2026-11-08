// Builds small synthetic MPQ archives, GRP files and string tables for
// tests, so no game file is needed or stored.
"use strict";

(function (AG) {
  var T = AG.testing;
  var M = AG.assets.mpq;

  function concat(parts) {
    var len = parts.reduce(function (a, p) {
      return a + p.length;
    }, 0);
    var out = new Uint8Array(len);
    var at = 0;
    parts.forEach(function (p) {
      out.set(p, at);
      at += p.length;
    });
    return out;
  }

  function le32(n) {
    return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
  }

  function bytesOf(x) {
    return typeof x === "string" ? new TextEncoder().encode(x) : x;
  }

  // Literal-only PKWARE implode data, in binary mode with a 4 KB dictionary.
  function implode(bytes) {
    var out = [0, 6];
    var acc = 0;
    var n = 0;
    function put(v, bits) {
      for (var i = 0; i < bits; i++) {
        acc |= ((v >> i) & 1) << n;
        if (++n === 8) {
          out.push(acc);
          acc = 0;
          n = 0;
        }
      }
    }
    for (var i = 0; i < bytes.length; i++) {
      put(0, 1);
      put(bytes[i], 8);
    }
    if (n) out.push(acc);
    return new Uint8Array(out);
  }

  // Compresses one sector the way `mode` says.
  function pack(mode, data) {
    if (mode === "implode") return Promise.resolve(implode(data));
    if (mode === "pkware") return Promise.resolve(concat([new Uint8Array([0x08]), implode(data)]));
    if (mode === "bzip2") return Promise.resolve(concat([new Uint8Array([0x10]), new Uint8Array(4)]));
    return Promise.resolve(data);
  }

  // files: [{ name, data, mode: "stored" | "implode" | "pkware" | "bzip2",
  //           single, encrypted, fixKey, locale }]
  // options: { sectorShift, offset (bytes before the header), hashCount }
  function mpq(files, options) {
    options = options || {};
    var shift = options.sectorShift === undefined ? 0 : options.sectorShift;
    var sectorSize = 512 << shift;
    var hashCount = options.hashCount || 16;
    var offset = options.offset || 0;
    var F = M.FLAG;
    var body = [];
    var pos = 32;
    var blocks = [];
    return files
      .reduce(function (p, f) {
        return p.then(function () {
          var data = bytesOf(f.data);
          var mode = f.mode || "stored";
          var flags = F.EXISTS;
          if (mode === "implode") flags |= F.IMPLODE;
          else if (mode !== "stored") flags |= F.COMPRESS;
          if (f.single) flags |= F.SINGLE_UNIT;
          if (f.encrypted) flags |= F.ENCRYPTED;
          if (f.fixKey) flags |= F.FIX_KEY;
          var block = { filePos: pos, fileSize: data.length, flags: flags };
          var key = 0;
          if (f.encrypted) {
            key = M.hashString(f.name.split("\\").pop(), 3);
            if (f.fixKey) key = ((key + block.filePos) ^ block.fileSize) >>> 0;
          }
          var sectors = [];
          if (f.single) sectors.push(data);
          else for (var s = 0; s * sectorSize < data.length; s++) sectors.push(data.subarray(s * sectorSize, (s + 1) * sectorSize));
          return Promise.all(
            sectors.map(function (sec) {
              return mode === "stored" ? sec : pack(mode, sec).then(function (c) {
                return c.length < sec.length ? c : sec;
              });
            })
          ).then(function (packed) {
            packed = packed.map(function (p, i) {
              var copy = new Uint8Array(p);
              if (f.encrypted) M.encrypt(copy, f.single ? key : (key + i) >>> 0);
              return copy;
            });
            var stored;
            if (mode === "stored" || f.single) stored = concat(packed);
            else {
              var table = new Uint8Array((packed.length + 1) * 4);
              var at = table.length;
              var dv = new DataView(table.buffer);
              packed.forEach(function (p, i) {
                dv.setUint32(i * 4, at, true);
                at += p.length;
              });
              dv.setUint32(packed.length * 4, at, true);
              if (f.encrypted) M.encrypt(table, (key - 1) >>> 0);
              stored = concat([table].concat(packed));
            }
            block.compressedSize = stored.length;
            body.push(stored);
            pos += stored.length;
            blocks.push(block);
          });
        });
      }, Promise.resolve())
      .then(function () {
        var hashes = new Uint8Array(hashCount * 16).fill(0xff);
        var hv = new DataView(hashes.buffer);
        files.forEach(function (f, i) {
          var at = M.hashString(f.name, 0) & (hashCount - 1);
          while (hv.getUint32(at * 16 + 12, true) !== 0xffffffff) at = (at + 1) & (hashCount - 1);
          hv.setUint32(at * 16, M.hashString(f.name, 1), true);
          hv.setUint32(at * 16 + 4, M.hashString(f.name, 2), true);
          hv.setUint16(at * 16 + 8, f.locale || 0, true);
          hv.setUint16(at * 16 + 10, 0, true);
          hv.setUint32(at * 16 + 12, i, true);
        });
        var bt = new Uint8Array(blocks.length * 16);
        var bv = new DataView(bt.buffer);
        blocks.forEach(function (b, i) {
          bv.setUint32(i * 16, b.filePos, true);
          bv.setUint32(i * 16 + 4, b.compressedSize, true);
          bv.setUint32(i * 16 + 8, b.fileSize, true);
          bv.setUint32(i * 16 + 12, b.flags, true);
        });
        M.encrypt(hashes, M.hashString("(hash table)", 3));
        M.encrypt(bt, M.hashString("(block table)", 3));
        var hashPos = pos;
        var blockPos = pos + hashes.length;
        var header = concat([
          new Uint8Array([0x4d, 0x50, 0x51, 0x1a]),
          le32(32),
          le32(blockPos + bt.length),
          new Uint8Array([0, 0, shift, 0]),
          le32(hashPos),
          le32(blockPos),
          le32(hashCount),
          le32(blocks.length)
        ]);
        return concat([new Uint8Array(offset), header].concat(body).concat([hashes, bt]));
      });
  }

  // A file object like the browser's, from bytes.
  // A chosen file, as if found in a chosen folder, or picked by itself when
  // `picked` is true.
  function file(name, bytes, picked) {
    var b = new Blob([bytes]);
    try {
      Object.defineProperty(b, "name", { value: name });
      Object.defineProperty(b, "webkitRelativePath", { value: picked ? "" : "game/" + name });
    } catch (e) {
      b.name = name;
    }
    return b;
  }

  // A GRP file from frames: [{ x, y, rows: [[ops...]] }], where each op is
  // ["skip", n], ["run", n, v] or ["copy", [values]].
  function grpFile(width, height, frames) {
    var headers = [];
    var datas = [];
    var at = 6 + frames.length * 8;
    frames.forEach(function (f) {
      var rows = f.rows.map(function (ops) {
        var out = [];
        ops.forEach(function (op) {
          if (op[0] === "skip") out.push(0x80 | op[1]);
          else if (op[0] === "run") out.push(0x40 | op[1], op[2]);
          else {
            out.push(op[1].length);
            out.push.apply(out, op[1]);
          }
        });
        return new Uint8Array(out);
      });
      var w = f.w;
      var offsets = new Uint8Array(rows.length * 2);
      var o = offsets.length;
      rows.forEach(function (r, i) {
        offsets[i * 2] = o & 0xff;
        offsets[i * 2 + 1] = o >> 8;
        o += r.length;
      });
      var data = concat([offsets].concat(rows));
      headers.push(new Uint8Array([f.x, f.y, w, rows.length]), le32(at));
      datas.push(data);
      at += data.length;
    });
    return concat([new Uint8Array([frames.length, 0, width, 0, height, 0])].concat(headers).concat(datas));
  }

  function tblFile(strings) {
    var enc = strings.map(function (s) {
      var b = new Uint8Array(s.length + 1);
      for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
      return b;
    });
    var head = new Uint8Array(2 + strings.length * 2);
    var dv = new DataView(head.buffer);
    dv.setUint16(0, strings.length, true);
    var at = head.length;
    enc.forEach(function (b, i) {
      dv.setUint16(2 + i * 2, at, true);
      at += b.length;
    });
    return concat([head].concat(enc));
  }

  T.build = { mpq: mpq, file: file, grp: grpFile, tbl: tblFile, implode: implode, concat: concat };
})(AxeGraft);
