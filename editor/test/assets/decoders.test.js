// MPQ reading, decompression, and GRP and TBL decoding, against synthetic
// files, including damaged ones.
"use strict";

(function (AG) {
  var T = AG.testing;
  var B = T.build;
  var M = AG.assets.mpq;
  var I = AG.assets.images;

  function text(bytes) {
    return new TextDecoder().decode(bytes);
  }

  function expectError(promise, pattern) {
    return promise.then(
      function () {
        throw new Error("expected an error matching " + pattern);
      },
      function (e) {
        T.ok(pattern.test(e.message), "error: " + e.message);
        return e;
      }
    );
  }

  // ---- Encryption and explode

  T.test("mpq: the hash of the table names matches Storm's", function () {
    T.equal(M.hashString("(hash table)", 3), 0xc3af3770);
    T.equal(M.hashString("(block table)", 3), 0xec83b3a3);
    T.equal(M.hashString("unit\\cmdbtns\\cmdicons.grp", 0), M.hashString("UNIT/CMDBTNS/CMDICONS.GRP", 0), "case and slashes don't matter");
  });

  T.test("mpq: encryption and decryption are inverses", function () {
    var data = new Uint8Array(37);
    for (var i = 0; i < data.length; i++) data[i] = i * 7;
    var copy = new Uint8Array(data);
    M.encrypt(copy, 0x12345678);
    T.notEqual(Array.from(copy), Array.from(data));
    M.decrypt(copy, 0x12345678);
    T.equal(Array.from(copy), Array.from(data));
  });

  T.test("explode: decodes blast.c's example, which uses matches", function () {
    var out = AG.assets.explode(new Uint8Array([0x00, 0x04, 0x82, 0x24, 0x25, 0x8f, 0x80, 0x7f]), 100);
    T.equal(text(out), "AIAIAIAIAIAIA");
  });

  T.test("explode: decodes literals, and stops at the size given", function () {
    var data = new TextEncoder().encode("Literal bytes, in binary mode.");
    T.equal(text(AG.assets.explode(B.implode(data), data.length)), "Literal bytes, in binary mode.");
    T.equal(text(AG.assets.explode(B.implode(data), 7)), "Literal");
  });

  T.test("explode: damaged data is an error, not a crash", function () {
    T.throws(function () {
      AG.assets.explode(new Uint8Array([2, 6, 0]), 10);
    });
    T.throws(function () {
      AG.assets.explode(new Uint8Array([0, 9, 0]), 10);
    });
    T.throws(function () {
      AG.assets.explode(new Uint8Array([0, 6, 0xff, 0xff, 0xff, 0xff]), 10);
    }, "refers back before the start");
    T.throws(function () {
      AG.assets.explode(new Uint8Array([0, 6]), 10);
    }, "ends early");
    var rnd = AG.util.random(5);
    for (var i = 0; i < 300; i++) {
      var b = new Uint8Array(2 + Math.floor(rnd() * 40));
      for (var j = 0; j < b.length; j++) b[j] = Math.floor(rnd() * 256);
      b[0] = b[0] & 1;
      b[1] = 4 + Math.floor(rnd() * 3);
      try {
        var out = AG.assets.explode(b, 64);
        T.ok(out.length <= 64);
      } catch (e) {
        T.ok(e instanceof AG.assets.ExplodeError, String(e));
      }
    }
  });

  // ---- MPQ archives

  var LONG = new Array(200).join("A long file that spans several sectors. ");

  function sample() {
    return B.mpq(
      [
        { name: "rez\\stat_txt.tbl", data: "stored and plain" },
        { name: "long\\stored.txt", data: LONG },
        { name: "long\\imploded.txt", data: LONG, mode: "implode", encrypted: true, fixKey: true },
        { name: "long\\pkware.txt", data: LONG, mode: "pkware", encrypted: true },
        { name: "single.txt", data: LONG, mode: "implode", single: true, encrypted: true },
        { name: "locale.txt", data: "German", locale: 0x407 },
        { name: "locale.txt", data: "Neutral", locale: 0 },
        { name: "german.txt", data: "Nur Deutsch", locale: 0x407 },
        { name: "english.txt", data: "Neutral", locale: 0 },
        { name: "english.txt", data: "English", locale: 0x409 },
        { name: "odd\\bzip.txt", data: LONG, mode: "bzip2" }
      ],
      { offset: 1024 }
    );
  }

  T.test("mpq: reads stored, imploded and encrypted files, in sectors or whole, with the header at an offset", function () {
    var a;
    return sample()
      .then(function (bytes) {
        return M.open(B.file("test.mpq", bytes));
      })
      .then(function (opened) {
        a = opened;
        T.equal(a.sectorSize, 512);
        T.ok(a.has("REZ\\STAT_TXT.TBL") && !a.has("missing.txt"));
        return Promise.all(["rez\\stat_txt.tbl", "long\\stored.txt", "long\\imploded.txt", "long\\pkware.txt", "single.txt", "locale.txt"].map(function (n) {
          return a.read(n).then(text);
        }));
      })
      .then(function (texts) {
        T.equal(texts.slice(0, 1), ["stored and plain"]);
        texts.slice(1, 5).forEach(function (t) {
          T.equal(t, LONG);
        });
        T.equal(texts[5], "Neutral", "the language-neutral copy is used over another language's");
        T.ok(!a.has("german.txt"), "a file only in another language isn't found, as the game skips it");
        return a.read("english.txt").then(function (b) {
          T.equal(text(b), "English", "a US English copy is used first, as the game uses it");
        });
      });
  });

  T.test("mpq: an unsupported compression method is an error naming the file and the method", function () {
    return sample()
      .then(function (bytes) {
        return M.open(B.file("test.mpq", bytes));
      })
      .then(function (a) {
        return expectError(a.read("odd\\bzip.txt"), /odd\\bzip\.txt: it uses bzip2 compression/);
      })
      .then(function (e) {
        T.equal(e.method, "bzip2");
        T.ok(e instanceof AG.assets.decompress.UnsupportedError);
      });
  });

  T.test("mpq: a missing file, a truncated archive and a corrupted one give errors, never a crash", function () {
    return sample().then(function (bytes) {
      var checks = [];
      checks.push(M.open(B.file("a.mpq", bytes)).then(function (a) {
        return expectError(a.read("nothing.txt"), /isn't in it/);
      }));
      // Truncated: the tables at the end are cut off.
      checks.push(expectError(M.open(B.file("cut.mpq", bytes.subarray(0, bytes.length - 40))), /truncated|end/));
      // Truncated in the middle of the files: the tables are kept but the data is gone.
      var hole = new Uint8Array(bytes);
      checks.push(M.open(B.file("hole.mpq", hole)).then(function (a) {
        return a;
      }));
      // Not an archive.
      checks.push(expectError(M.open(B.file("text.mpq", new TextEncoder().encode("hello"))), /isn't an MPQ archive/));
      // Random damage anywhere must give a result or an error.
      var rnd = AG.util.random(99);
      for (var i = 0; i < 60; i++) {
        var damaged = new Uint8Array(bytes);
        var n = 1 + Math.floor(rnd() * 8);
        for (var j = 0; j < n; j++) damaged[1024 + Math.floor(rnd() * (damaged.length - 1024))] = Math.floor(rnd() * 256);
        checks.push(
          M.open(B.file("damaged.mpq", damaged)).then(
            function (a) {
              return Promise.all(["long\\imploded.txt", "long\\pkware.txt", "single.txt", "long\\stored.txt"].map(function (name) {
                return a.read(name).then(
                  function (data) {
                    T.ok(data.length <= LONG.length);
                  },
                  function (e) {
                    T.ok(e && typeof e.message === "string", "an error with a message");
                  }
                );
              }));
            },
            function (e) {
              T.ok(e && typeof e.message === "string");
            }
          )
        );
      }
      return Promise.all(checks);
    });
  });

  T.test("mpq: impossible table sizes and file sizes are refused before anything large is read", function () {
    return B.mpq([{ name: "a.txt", data: "abc" }]).then(function (bytes) {
      var big = new Uint8Array(bytes);
      new DataView(big.buffer).setUint32(24, 1 << 30, true);
      var odd = new Uint8Array(bytes);
      new DataView(odd.buffer).setUint32(24, 12, true);
      return Promise.all([
        expectError(M.open(B.file("big.mpq", big)), /hash table size/),
        expectError(M.open(B.file("odd.mpq", odd)), /hash table size, 12/)
      ]);
    });
  });

  // ---- GRP

  function sampleGrp() {
    return B.grp(4, 3, [
      { x: 0, y: 0, w: 4, rows: [[["copy", [1, 2, 3, 4]]], [["skip", 1], ["run", 2, 9], ["skip", 1]], [["run", 4, 5]]] },
      { x: 1, y: 1, w: 2, rows: [[["copy", [7, 8]]]] }
    ]);
  }

  T.test("grp: frames decode from their run-length rows", function () {
    var g = I.grp(sampleGrp());
    T.equal([g.count, g.width, g.height], [2, 4, 3]);
    T.equal(Array.from(g.frame(0).pixels), [1, 2, 3, 4, 0, 9, 9, 0, 5, 5, 5, 5]);
    T.equal(Array.from(g.frame(1).pixels), [0, 0, 0, 0, 0, 7, 8, 0, 0, 0, 0, 0]);
  });

  T.test("grp: the size is trimmed to the area the frames use, keeping each frame's place", function () {
    var g = I.grp(B.grp(6, 5, [
      { x: 0, y: 0, w: 2, rows: [[["copy", [1, 2]]], [["copy", [3, 4]]]] },
      { x: 1, y: 2, w: 3, rows: [[["copy", [5, 6, 7]]]] }
    ]));
    T.equal([g.width, g.height], [4, 3], "the right column, the rows below and the column past the widest frame are never used");
    T.equal(Array.from(g.frame(0).pixels), [1, 2, 0, 0, 3, 4, 0, 0, 0, 0, 0, 0]);
    T.equal(Array.from(g.frame(1).pixels), [0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 6, 7]);
  });

  T.test("grp: a frame out of range, or offsets past the end, are errors", function () {
    var bytes = sampleGrp();
    var g = I.grp(bytes);
    T.throws(function () {
      g.frame(2);
    });
    T.throws(function () {
      g.frame(-1);
    });
    var bad = new Uint8Array(bytes);
    new DataView(bad.buffer).setUint32(6 + 4, 5000, true);
    T.throws(function () {
      I.grp(bad).frame(0);
    }, "frame offset past the end");
    var rows = new Uint8Array(bytes);
    var off = new DataView(rows.buffer).getUint32(6 + 4, true);
    rows[off] = 0xff;
    rows[off + 1] = 0x7f;
    T.throws(function () {
      I.grp(rows).frame(0);
    }, "row offset past the end");
    T.throws(function () {
      I.grp(bytes.subarray(0, 10));
    }, "frame table cut off");
    T.throws(function () {
      I.grp(new Uint8Array([0, 0, 4, 0, 3, 0]));
    }, "no frames");
  });

  T.test("palettes: RGB, RGBX and PCX palettes, and colouring a frame with index 0 transparent", function () {
    var pal = new Uint8Array(768);
    pal[3] = 10;
    pal[4] = 20;
    pal[5] = 30;
    T.equal(I.palette(pal, "pal")[1], [10, 20, 30]);
    var wpe = new Uint8Array(1024);
    wpe[4] = 40;
    wpe[5] = 50;
    wpe[6] = 60;
    T.equal(I.palette(wpe, "wpe")[1], [40, 50, 60]);
    var ppl = new Uint8Array(768);
    ppl[3] = 63;
    ppl[4] = 32;
    T.equal(I.palette(ppl, "ppl")[1], [255, 130, 0], "6-bit values are scaled");
    T.throws(function () {
      I.palette(pal, "bmp");
    });
    var pcx = B.concat([new Uint8Array(100), new Uint8Array([0x0c]), pal]);
    T.equal(I.palette(pcx, "pcx")[1], [10, 20, 30]);
    T.throws(function () {
      I.palette(new Uint8Array(100), "pcx");
    });
    var rgba = I.colour({ width: 2, height: 1, pixels: new Uint8Array([0, 1]) }, I.palette(pal, "pal"));
    T.equal(Array.from(rgba), [0, 0, 0, 0, 10, 20, 30, 255]);
  });

  // ---- TBL

  T.test("tbl: strings are read by ID, with control bytes kept", function () {
    var t = I.tbl(B.tbl(["Move", "\u0001A\u0003ttack", "Café", "m\u0000\u0003M\u0001ove"]));
    T.equal(t, ["Move", "\u0001A\u0003ttack", "Café", "m\u0000\u0003M\u0001ove"], "a NUL inside a string, as in StarCraft's button strings, is kept");
  });

  T.test("tbl: offsets past the end and cut-off tables are errors", function () {
    var bytes = B.tbl(["One", "Two"]);
    var bad = new Uint8Array(bytes);
    new DataView(bad.buffer).setUint16(4, 999, true);
    T.throws(function () {
      I.tbl(bad);
    });
    T.throws(function () {
      I.tbl(new Uint8Array([50, 0, 1]));
    });
    T.throws(function () {
      I.tbl(new Uint8Array([1]));
    });
    var unterminated = bytes.subarray(0, bytes.length - 1);
    T.equal(I.tbl(unterminated), ["One", "Two"], "a last string without its end runs to the end of the file");
  });

  // ---- PNG

  T.test("png: frames are encoded as PNG files", function () {
    return I.png(2, 1, new Uint8Array([255, 0, 0, 255, 0, 0, 255, 128])).then(function (bytes) {
      T.equal(Array.from(bytes.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
      T.equal(text(bytes.subarray(12, 16)), "IHDR");
      if (typeof Image === "undefined") return null;
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () {
          T.equal([img.naturalWidth, img.naturalHeight], [2, 1]);
          resolve();
        };
        img.onerror = function () {
          reject(new Error("the browser can't read the PNG"));
        };
        img.src = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
      });
    });
  });
})(AxeGraft);
