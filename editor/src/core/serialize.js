// Canonical file output. The same mod always gives the same bytes: parts in
// a fixed order, entries sorted by type and ID, fields in a fixed order, and
// two-space indentation. An object or array holding only plain values, such
// as a button or a requirement list, is written on one line.
"use strict";

(function (AG) {
  var util = AG.util;
  var isObject = util.isObject;

  var PARTS = ["units", "button_sets", "requirements", "constants"];
  var TYPE_ORDER = ["unit", "upgrade", "tech_research", "tech_use", "order"];

  // Orders the keys of `obj`: `first` in that order, then any others
  // alphabetically, which only an invalid entry can have.
  function ordered(obj, first) {
    var out = {};
    first.forEach(function (k) {
      if (util.has(obj, k)) out[k] = obj[k];
    });
    Object.keys(obj)
      .filter(function (k) {
        return first.indexOf(k) < 0;
      })
      .sort()
      .forEach(function (k) {
        out[k] = obj[k];
      });
    return out;
  }

  function cmpNumber(a, b) {
    var ai = util.isInt(a);
    var bi = util.isInt(b);
    if (ai && bi) return a - b;
    if (ai) return -1;
    if (bi) return 1;
    return 0;
  }

  function cmpText(a, b) {
    var as = JSON.stringify(a);
    var bs = JSON.stringify(b);
    return as < bs ? -1 : as > bs ? 1 : 0;
  }

  // Sorts entries by `keys`, then by their whole text, so the order never
  // depends on the order of editing.
  function sortEntries(list, cmp) {
    return list.slice().sort(function (a, b) {
      return cmp(a, b) || cmpText(a, b);
    });
  }

  function canonical(doc, cat) {
    var buttonOrder = cat ? ["label"].concat(cat.buttonFields.map(function (f) {
      return f.name;
    })) : ["label"];
    var unitOrder = ["id", "label"].concat(cat ? cat.unitFields.map(function (f) {
      return f.name;
    }) : []);
    var out = ordered(doc, ["patcher", "format", "game", "mod_name", "mod_version", "mod_authors", "label"].concat(PARTS));
    PARTS.forEach(function (p) {
      if (!util.has(out, p)) return;
      if (!Array.isArray(out[p]) || !out[p].length) {
        if (Array.isArray(out[p])) delete out[p];
        return;
      }
      var list = out[p].map(function (e) {
        if (!isObject(e)) return e;
        if (p === "units") return ordered(e, unitOrder);
        if (p === "button_sets") {
          var s = ordered(e, ["id", "label", "buttons"]);
          if (Array.isArray(s.buttons)) {
            s.buttons = s.buttons.map(function (b) {
              return isObject(b) ? ordered(b, buttonOrder) : b;
            });
          }
          return s;
        }
        if (p === "requirements") return ordered(e, ["type", "id", "label", "list"]);
        return ordered(e, ["name", "label", "value", "option"]);
      });
      if (p === "units" || p === "button_sets") {
        list = sortEntries(list, function (a, b) {
          return cmpNumber(a && a.id, b && b.id);
        });
      } else if (p === "requirements") {
        list = sortEntries(list, function (a, b) {
          var ta = TYPE_ORDER.indexOf(a && a.type);
          var tb = TYPE_ORDER.indexOf(b && b.type);
          if (ta !== tb) return (ta < 0 ? 99 : ta) - (tb < 0 ? 99 : tb);
          return cmpNumber(a && a.id, b && b.id);
        });
      } else {
        list = sortEntries(list, function (a, b) {
          var na = a && typeof a.name === "string" ? a.name : "￿";
          var nb = b && typeof b.name === "string" ? b.name : "￿";
          return na < nb ? -1 : na > nb ? 1 : 0;
        });
      }
      out[p] = list;
    });
    return out;
  }

  function isFlat(v) {
    var values = Array.isArray(v)
      ? v
      : Object.keys(v).map(function (k) {
          return v[k];
        });
    return values.every(function (x) {
      return x === null || typeof x !== "object";
    });
  }

  function write(v, indent) {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    var pad = indent + "  ";
    if (Array.isArray(v)) {
      if (!v.length) return "[]";
      if (indent && isFlat(v)) return "[" + v.map(function (x) {
        return JSON.stringify(x);
      }).join(", ") + "]";
      return "[\n" + v.map(function (x) {
        return pad + write(x, pad);
      }).join(",\n") + "\n" + indent + "]";
    }
    var keys = Object.keys(v);
    if (!keys.length) return "{}";
    if (indent && isFlat(v)) return "{ " + keys.map(function (k) {
      return JSON.stringify(k) + ": " + JSON.stringify(v[k]);
    }).join(", ") + " }";
    return "{\n" + keys.map(function (k) {
      return pad + JSON.stringify(k) + ": " + write(v[k], pad);
    }).join(",\n") + "\n" + indent + "}";
  }

  // The file's text for a mod.
  function serialize(doc, cat) {
    return write(canonical(doc, cat), "") + "\n";
  }

  AG.core.serialize = serialize;
  AG.core.canonical = canonical;
})(AxeGraft);
