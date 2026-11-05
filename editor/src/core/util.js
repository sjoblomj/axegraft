// Small helpers with no DOM, shared by the core, assets and UI.
"use strict";

(function (AG) {
  var util = {};

  util.isObject = function (v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  };

  util.isInt = function (v) {
    return typeof v === "number" && Number.isInteger(v);
  };

  util.inRange = function (v, range) {
    return util.isInt(v) && range && v >= range.min && v <= range.max;
  };

  util.has = function (obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  };

  // Structural equality for JSON values.
  util.equal = function equal(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b || a === null || b === null) return false;
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) if (!equal(a[i], b[i])) return false;
      return true;
    }
    if (typeof a === "object") {
      if (Array.isArray(b)) return false;
      var ka = Object.keys(a);
      var kb = Object.keys(b);
      if (ka.length !== kb.length) return false;
      for (var j = 0; j < ka.length; j++) {
        if (!util.has(b, ka[j]) || !equal(a[ka[j]], b[ka[j]])) return false;
      }
      return true;
    }
    return false;
  };

  util.clone = function (v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  };

  // Recursively freezes a JSON value, so an accidental mutation fails loudly.
  util.freeze = function freeze(v) {
    if (v && typeof v === "object" && !Object.isFrozen(v)) {
      Object.freeze(v);
      Object.keys(v).forEach(function (k) {
        freeze(v[k]);
      });
    }
    return v;
  };

  // A copy of `obj` without the keys listed.
  util.omit = function (obj, keys) {
    var out = {};
    Object.keys(obj).forEach(function (k) {
      if (keys.indexOf(k) < 0) out[k] = obj[k];
    });
    return out;
  };

  util.typeName = function (v) {
    if (v === null) return "null";
    if (Array.isArray(v)) return "an array";
    if (typeof v === "object") return "an object";
    if (typeof v === "string") return "a string";
    if (typeof v === "number") return Number.isInteger(v) ? "a whole number" : "a fraction";
    if (typeof v === "boolean") return "true or false";
    return typeof v;
  };

  util.show = function (v) {
    try {
      var s = JSON.stringify(v);
      if (s === undefined) return String(v);
      return s.length > 60 ? s.slice(0, 57) + "..." : s;
    } catch (e) {
      return String(v);
    }
  };

  util.rangeText = function (range) {
    return range.min + "-" + range.max;
  };

  // A small deterministic pseudo-random generator (mulberry32), for tests.
  util.random = function (seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  util.byNumber = function (a, b) {
    return a - b;
  };

  AG.util = util;
})(AxeGraft);
