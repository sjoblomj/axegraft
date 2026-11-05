// PKWARE Data Compression Library "implode", decompressed. MPQ archives use
// it for most files. A port of the algorithm in Mark Adler's blast.c, from
// zlib's contrib directory.
//
// The input is untrusted: every read is bounds-checked, and the output never
// grows past the size the archive says the data has.
"use strict";

(function (AG) {
  var MAXBITS = 13;

  // Code lengths, run-length encoded: low four bits the length, high four
  // bits the repeat count less one.
  var LITLEN = [11, 124, 8, 7, 28, 7, 188, 13, 76, 4, 10, 8, 12, 10, 12, 10, 8, 23, 8, 9, 7, 6, 7, 8, 7, 6, 55, 8, 23, 24, 12, 11, 7, 9, 11,
    12, 6, 7, 22, 5, 7, 24, 6, 11, 9, 6, 7, 22, 7, 11, 38, 7, 9, 8, 25, 11, 8, 11, 9, 12, 8, 12, 5, 38, 5, 38, 5, 11, 7, 5, 6, 21, 6, 10, 53,
    8, 7, 24, 10, 27, 44, 253, 253, 253, 252, 252, 252, 13, 12, 45, 12, 45, 12, 61, 12, 45, 44, 173];
  var LENLEN = [2, 35, 36, 53, 38, 23];
  var DISTLEN = [2, 20, 53, 230, 247, 151, 248];
  var BASE = [3, 2, 4, 5, 6, 7, 8, 9, 10, 12, 16, 24, 40, 72, 136, 264];
  var EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8];

  function construct(rep) {
    var length = [];
    rep.forEach(function (r) {
      for (var i = (r >> 4) + 1; i > 0; i--) length.push(r & 15);
    });
    var count = new Array(MAXBITS + 1).fill(0);
    length.forEach(function (l) {
      count[l]++;
    });
    var offs = new Array(MAXBITS + 2).fill(0);
    for (var len = 1; len < MAXBITS; len++) offs[len + 1] = offs[len] + count[len];
    var symbol = new Array(length.length);
    for (var s = 0; s < length.length; s++) if (length[s]) symbol[offs[length[s]]++] = s;
    return { count: count, symbol: symbol };
  }

  var tables = null;
  function getTables() {
    if (!tables) tables = { lit: construct(LITLEN), len: construct(LENLEN), dist: construct(DISTLEN) };
    return tables;
  }

  function ExplodeError(message) {
    this.name = "ExplodeError";
    this.message = message;
  }
  ExplodeError.prototype = Object.create(Error.prototype);

  // Decompresses `input` (Uint8Array) into at most `size` bytes. Stops at
  // the end code or when `size` bytes have been written.
  function explode(input, size) {
    var t = getTables();
    var pos = 0;
    var bitbuf = 0;
    var bitcnt = 0;
    var out = new Uint8Array(size);
    var n = 0;

    function bits(need) {
      var val = bitbuf;
      while (bitcnt < need) {
        if (pos >= input.length) throw new ExplodeError("the compressed data ends early");
        val |= input[pos++] << bitcnt;
        bitcnt += 8;
      }
      bitbuf = val >>> need;
      bitcnt -= need;
      return val & ((1 << need) - 1);
    }

    // Codes are stored bit-reversed and inverted, as blast.c reads them.
    function decode(h) {
      var code = 0;
      var first = 0;
      var index = 0;
      for (var len = 1; len <= MAXBITS; len++) {
        code |= bits(1) ^ 1;
        var count = h.count[len];
        if (code < first + count) return h.symbol[index + (code - first)];
        index += count;
        first += count;
        first <<= 1;
        code <<= 1;
      }
      throw new ExplodeError("the compressed data holds an invalid code");
    }

    if (input.length < 2) throw new ExplodeError("the compressed data is too short");
    var lit = bits(8);
    if (lit > 1) throw new ExplodeError("the compressed data has an unknown literal mode " + lit);
    var dict = bits(8);
    if (dict < 4 || dict > 6) throw new ExplodeError("the compressed data has an unknown dictionary size " + dict);

    while (n < size) {
      if (bits(1)) {
        var symbol = decode(t.len);
        var len = BASE[symbol] + bits(EXTRA[symbol]);
        if (len === 519) break;
        var shift = len === 2 ? 2 : dict;
        var dist = (decode(t.dist) << shift) + bits(shift) + 1;
        if (dist > n) throw new ExplodeError("the compressed data refers back before its start");
        while (len-- > 0 && n < size) {
          out[n] = out[n - dist];
          n++;
        }
      } else {
        out[n++] = lit ? decode(t.lit) : bits(8);
      }
    }
    return n === size ? out : out.subarray(0, n);
  }

  AG.assets.explode = explode;
  AG.assets.ExplodeError = ExplodeError;
})(AxeGraft);
