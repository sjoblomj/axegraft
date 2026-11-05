// Decompressing a sector of an MPQ file. StarCraft and Warcraft II compress
// everything the editor reads with PKWARE implode, so that is the only method
// decoded. Any other method is a named error, so the user learns which file
// and method aren't supported.
"use strict";

(function (AG) {
  var IMPLODE = 0x100;
  var COMPRESS = 0x200;

  var METHODS = {
    0x01: "Huffman",
    0x02: "zlib",
    0x08: "PKWARE implode",
    0x10: "bzip2",
    0x12: "LZMA",
    0x20: "sparse",
    0x40: "ADPCM stereo",
    0x80: "ADPCM mono"
  };

  function UnsupportedError(method) {
    this.name = "UnsupportedCompression";
    this.method = method;
    this.message = "it uses " + method + " compression, which this editor can't read";
  }
  UnsupportedError.prototype = Object.create(Error.prototype);

  function methodName(mask) {
    if (METHODS[mask]) return METHODS[mask];
    var names = [];
    Object.keys(METHODS).forEach(function (k) {
      if (+k !== 0x12 && (mask & +k) === +k) names.push(METHODS[k]);
    });
    return names.length ? names.join(" and ") : "unknown (0x" + mask.toString(16) + ")";
  }

  // Decompresses one sector. `flags` are the file's block flags. A sector
  // stored at full size isn't compressed.
  function sector(data, size, flags) {
    if (data.length >= size || !(flags & (IMPLODE | COMPRESS))) return Promise.resolve(data.length > size ? data.subarray(0, size) : data);
    try {
      if (flags & IMPLODE) return Promise.resolve(AG.assets.explode(data, size));
      var mask = data[0];
      var payload = data.subarray(1);
      if (mask === 0x08) return Promise.resolve(AG.assets.explode(payload, size));
      return Promise.reject(new UnsupportedError(methodName(mask)));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  AG.assets.decompress = {
    IMPLODE: IMPLODE,
    COMPRESS: COMPRESS,
    sector: sector,
    methodName: methodName,
    UnsupportedError: UnsupportedError
  };
})(AxeGraft);
