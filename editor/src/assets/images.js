// Decoding the game's image and string files: GRP frames, palettes and
// stat_txt.tbl, and encoding frames as PNG so they can be cached and shown
// with ordinary <img> tags. Every length and offset is bounds-checked.
"use strict";

(function (AG) {
  function DecodeError(message) {
    this.name = "DecodeError";
    this.message = message;
  }
  DecodeError.prototype = Object.create(Error.prototype);

  function u16(b, o) {
    return b[o] | (b[o + 1] << 8);
  }
  function u32(b, o) {
    return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  }

  // ---- GRP

  // Reads a GRP file's header. Frames are decoded on demand by frame(i),
  // which returns { width, height, pixels } with palette indices; 0 is
  // transparent.
  //
  // Each frame keeps its place, but the size is trimmed to the area the
  // frames use, from the top-left corner. StarCraft's cmdicons.grp says 36
  // by 34, yet no icon reaches past 33 by 32, so the full size would leave
  // an empty strip on the right and bottom of every icon.
  function grp(bytes) {
    if (bytes.length < 6) throw new DecodeError("the GRP file is too short");
    var count = u16(bytes, 0);
    var width = u16(bytes, 2);
    var height = u16(bytes, 4);
    if (!count || count > 4096) throw new DecodeError("the GRP file says it has " + count + " frames");
    if (!width || !height || width > 1024 || height > 1024) throw new DecodeError("the GRP file's frames are " + width + " by " + height + ", which is impossible");
    if (6 + count * 8 > bytes.length) throw new DecodeError("the GRP file's frame table is cut off");
    var canvasWidth = width;
    var canvasHeight = height;
    var usedWidth = 0;
    var usedHeight = 0;
    for (var f = 0; f < count; f++) {
      var fx = 6 + f * 8;
      if (bytes[fx] + bytes[fx + 2] > canvasWidth || bytes[fx + 1] + bytes[fx + 3] > canvasHeight) continue;
      usedWidth = Math.max(usedWidth, bytes[fx] + bytes[fx + 2]);
      usedHeight = Math.max(usedHeight, bytes[fx + 1] + bytes[fx + 3]);
    }
    if (usedWidth && usedHeight) {
      width = usedWidth;
      height = usedHeight;
    }

    function frame(i) {
      if (!(i >= 0 && i < count)) throw new DecodeError("there's no frame " + i + "; the GRP file has " + count);
      var h = 6 + i * 8;
      var x = bytes[h];
      var y = bytes[h + 1];
      var w = bytes[h + 2];
      var fh = bytes[h + 3];
      var offset = u32(bytes, h + 4);
      var pixels = new Uint8Array(width * height);
      if (x + w > width || y + fh > height) throw new DecodeError("frame " + i + " lies outside the GRP's size");
      if (offset + fh * 2 > bytes.length) throw new DecodeError("frame " + i + " points past the end of the GRP file");
      for (var row = 0; row < fh; row++) {
        var p = offset + u16(bytes, offset + row * 2);
        var col = 0;
        var line = (y + row) * width + x;
        while (col < w) {
          if (p >= bytes.length) throw new DecodeError("frame " + i + ", row " + row + " runs past the end of the GRP file");
          var c = bytes[p++];
          if (c & 0x80) {
            col += c & 0x7f;
          } else if (c & 0x40) {
            var n = c & 0x3f;
            if (p >= bytes.length) throw new DecodeError("frame " + i + ", row " + row + " runs past the end of the GRP file");
            var v = bytes[p++];
            if (col + n > w) throw new DecodeError("frame " + i + ", row " + row + " is wider than the frame");
            for (var k = 0; k < n; k++) pixels[line + col++] = v;
          } else {
            if (p + c > bytes.length) throw new DecodeError("frame " + i + ", row " + row + " runs past the end of the GRP file");
            if (col + c > w) throw new DecodeError("frame " + i + ", row " + row + " is wider than the frame");
            for (var m = 0; m < c; m++) pixels[line + col++] = bytes[p++];
          }
          if (c === 0x80 || c === 0) break;
        }
      }
      return { width: width, height: height, pixels: pixels };
    }

    return { count: count, width: width, height: height, frame: frame };
  }

  // ---- Palettes

  var PALETTE_FORMATS = ["pal", "wpe", "pcx", "ppl"];

  // A palette as 256 [r, g, b]. Reads 768-byte RGB (.pal), 1024-byte RGBX
  // (.wpe), Warcraft II's 768-byte palettes of 6-bit values (.ppl) and the
  // palette at the end of a PCX file.
  function palette(bytes, format) {
    var out = [];
    var start = 0;
    var stride = 3;
    var scale = 1;
    if (PALETTE_FORMATS.indexOf(format) < 0) throw new DecodeError("unknown palette format " + format);
    if (format === "wpe") stride = 4;
    else if (format === "ppl") scale = 255 / 63;
    else if (format === "pcx") {
      if (bytes.length < 769 || bytes[bytes.length - 769] !== 0x0c) throw new DecodeError("the PCX file has no palette");
      start = bytes.length - 768;
    }
    if (start + stride * 256 > bytes.length) throw new DecodeError("the palette is too short");
    for (var i = 0; i < 256; i++) {
      var o = start + i * stride;
      out.push([Math.min(255, Math.round(bytes[o] * scale)), Math.min(255, Math.round(bytes[o + 1] * scale)), Math.min(255, Math.round(bytes[o + 2] * scale))]);
    }
    return out;
  }

  // The first row of an 8-bit PCX image, as palette indices. StarCraft's
  // unit\cmdbtns\ticon.pcx is such a row: it maps an icon's colours to the
  // game's palette.
  function pcxRow(bytes) {
    if (bytes.length < 129 || bytes[0] !== 0x0a || bytes[3] !== 8 || bytes[65] !== 1) throw new DecodeError("the PCX file isn't an 8-bit image");
    var width = (bytes[8] | (bytes[9] << 8)) - (bytes[4] | (bytes[5] << 8)) + 1;
    var perLine = bytes[66] | (bytes[67] << 8);
    if (width < 1 || width > 4096 || perLine < width) throw new DecodeError("the PCX image's size is impossible");
    var row = [];
    var p = 128;
    while (row.length < perLine) {
      if (p >= bytes.length) throw new DecodeError("the PCX image ends early");
      var c = bytes[p++];
      if ((c & 0xc0) === 0xc0) {
        if (p >= bytes.length) throw new DecodeError("the PCX image ends early");
        var v = bytes[p++];
        for (var k = 0; k < (c & 0x3f); k++) row.push(v);
      } else row.push(c);
    }
    return row.slice(0, width);
  }

  // A palette whose first entries go through a remap row first:
  // colour i is base[remap[i]] for i within the row, base[i] after it.
  function remap(base, row) {
    return base.map(function (c, i) {
      return i < row.length ? base[row[i]] : c;
    });
  }

  // RGBA pixels from palette indices; index 0 is transparent.
  function colour(frame, pal) {
    var rgba = new Uint8Array(frame.width * frame.height * 4);
    for (var i = 0; i < frame.pixels.length; i++) {
      var v = frame.pixels[i];
      if (!v) continue;
      var c = pal[v];
      rgba[i * 4] = c[0];
      rgba[i * 4 + 1] = c[1];
      rgba[i * 4 + 2] = c[2];
      rgba[i * 4 + 3] = 255;
    }
    return rgba;
  }

  // ---- TBL

  var decoder = null;
  // A string table: an array of strings, where ID n is element n - 1.
  // Text is decoded as Windows-1252, and control bytes are kept. A string
  // runs to where the next one starts, less its final NULs, because
  // StarCraft's button strings hold a NUL after their hotkey.
  function tbl(bytes) {
    if (bytes.length < 2) throw new DecodeError("the string table is too short");
    var count = u16(bytes, 0);
    if (2 + count * 2 > bytes.length) throw new DecodeError("the string table says it has " + count + " strings, but its offsets are cut off");
    if (!decoder) decoder = new TextDecoder("windows-1252");
    var offsets = [];
    for (var i = 0; i < count; i++) {
      var o = u16(bytes, 2 + i * 2);
      if (o >= bytes.length) throw new DecodeError("string " + (i + 1) + " points past the end of the string table");
      offsets.push(o);
    }
    var starts = offsets.slice().sort(function (a, b) {
      return a - b;
    });
    var out = [];
    offsets.forEach(function (o) {
      // The next start after this one, found by binary search.
      var lo = 0;
      var hi = starts.length;
      while (lo < hi) {
        var mid = (lo + hi) >> 1;
        if (starts[mid] <= o) lo = mid + 1;
        else hi = mid;
      }
      var end = lo < starts.length ? starts[lo] : bytes.length;
      while (end > o && bytes[end - 1] === 0) end--;
      out.push(decoder.decode(bytes.subarray(o, end)));
    });
    return out;
  }

  // ---- PNG

  var crcTable = null;
  function crc32(bytes, crc) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crcTable[n] = c >>> 0;
      }
    }
    crc = crc === undefined ? 0xffffffff : crc;
    for (var i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return crc >>> 0;
  }

  function deflate(bytes) {
    var cs = new CompressionStream("deflate");
    var w = cs.writable.getWriter();
    w.write(bytes);
    w.close();
    return new Response(cs.readable).arrayBuffer().then(function (b) {
      return new Uint8Array(b);
    });
  }

  // A PNG file from RGBA pixels.
  function png(width, height, rgba) {
    var raw = new Uint8Array((width * 4 + 1) * height);
    for (var y = 0; y < height; y++) raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
    return deflate(raw).then(function (z) {
      function chunk(type, data) {
        var out = new Uint8Array(12 + data.length);
        var dv = new DataView(out.buffer);
        dv.setUint32(0, data.length);
        for (var i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
        out.set(data, 8);
        dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)) ^ 0xffffffff);
        return out;
      }
      var ihdr = new Uint8Array(13);
      var dv = new DataView(ihdr.buffer);
      dv.setUint32(0, width);
      dv.setUint32(4, height);
      ihdr[8] = 8;
      ihdr[9] = 6;
      var parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", z), chunk("IEND", new Uint8Array(0))];
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
    });
  }

  AG.assets.images = {
    grp: grp,
    palette: palette,
    pcxRow: pcxRow,
    remap: remap,
    PALETTE_FORMATS: PALETTE_FORMATS,
    colour: colour,
    tbl: tbl,
    png: png,
    crc32: crc32,
    DecodeError: DecodeError
  };
})(AxeGraft);
