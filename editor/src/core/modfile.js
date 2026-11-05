// Reading a mod file: arbitrary bytes in, a mod or a list of problems out.
//
// The input is untrusted, so reading never throws. Bytes that aren't UTF-8,
// text that isn't JSON, JSON nested deeper than any mod needs and files far
// larger than any mod are refused before parsing goes far.
"use strict";

(function (AG) {
  var util = AG.util;

  var MAX_BYTES = 4 * 1024 * 1024;
  var MAX_DEPTH = 32;

  function problem(message) {
    return { severity: "error", path: "", message: message, refuse: true };
  }

  // The deepest nesting of arrays and objects in JSON text, ignoring strings.
  // Stops counting once it passes `limit`.
  function nesting(text, limit) {
    var depth = 0;
    var max = 0;
    var inString = false;
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (inString) {
        if (c === 92) i++; // backslash
        else if (c === 34) inString = false;
      } else if (c === 34) inString = true;
      else if (c === 123 || c === 91) {
        depth++;
        if (depth > max) {
          max = depth;
          if (max > limit) return max;
        }
      } else if (c === 125 || c === 93) depth--;
    }
    return max;
  }

  // Text from bytes, or null if they aren't UTF-8.
  function decode(bytes) {
    try {
      return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
    } catch (e) {
      return null;
    }
  }

  // Parses a file's contents. `input` is a string, an ArrayBuffer or a
  // Uint8Array. Returns { value } or { problems }.
  function parse(input) {
    var text = input;
    var size;
    if (typeof input !== "string") {
      var bytes = input instanceof Uint8Array ? input : new Uint8Array(input || []);
      size = bytes.length;
      if (size > MAX_BYTES) return { problems: [problem("The file is " + size + " bytes, far larger than any mod. Mods are limited to " + MAX_BYTES + " bytes.")] };
      text = decode(bytes);
      if (text === null) return { problems: [problem("The file isn't a mod: it isn't UTF-8 text.")] };
    } else {
      size = text.length;
      if (size > MAX_BYTES) return { problems: [problem("The file is over " + MAX_BYTES + " characters, far larger than any mod.")] };
    }
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    if (!text.trim()) return { problems: [problem("The file is empty.")] };
    var depth = nesting(text, MAX_DEPTH);
    if (depth > MAX_DEPTH) return { problems: [problem("The file is nested more than " + MAX_DEPTH + " levels deep, which no mod is.")] };
    try {
      return { value: JSON.parse(text) };
    } catch (e) {
      return { problems: [problem("The file isn't valid JSON: " + (e && e.message ? e.message : String(e)) + ".")] };
    }
  }

  // Reads a mod. `catalogs` maps games to catalogs; `assets` are optional.
  // Returns { refused, problems, mod, game }: a refused file has no mod.
  function read(input, catalogs, assets) {
    var result;
    try {
      var parsed = parse(input);
      if (parsed.problems) return { refused: true, problems: parsed.problems, mod: null, game: null };
      var mod = parsed.value;
      var problems = [];
      var header = [];
      var game = AG.core.validate.checkHeader(mod, { refuse: function (path, message) {
        header.push({ severity: "error", path: path, message: message, refuse: true });
      } }, catalogs || {});
      if (!game) return { refused: true, problems: header, mod: null, game: null };
      problems = AG.core.validate.check(mod, catalogs[game], assets);
      var refused = problems.some(function (p) {
        return p.refuse;
      });
      result = { refused: refused, problems: problems, mod: refused ? null : mod, game: game };
    } catch (e) {
      // A bug in the checks must not take the editor down with it.
      result = { refused: true, problems: [problem("The file couldn't be read: " + (e && e.message ? e.message : String(e)) + ".")], mod: null, game: null };
    }
    return result;
  }

  AG.core.modfile = {
    MAX_BYTES: MAX_BYTES,
    MAX_DEPTH: MAX_DEPTH,
    parse: parse,
    read: read,
    nesting: nesting
  };
})(AxeGraft);
