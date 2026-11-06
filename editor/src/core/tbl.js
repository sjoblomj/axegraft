// Text from a game's string table (stat_txt.tbl), shown two ways:
//
//   raw:  the string exactly as stored, with every control byte, newlines
//         included, written as its number, such as <3>. A literal < is
//         written <60>, so the raw form is never ambiguous.
//   name: a clean one-line name for lists, without hotkey, cost type,
//         colour codes or the map editor's extra names.
//
// The strings follow three patterns, in both games:
//   button strings  hotkey, cost type (a byte 0-5), then the text, with the
//                   hotkey letter between colour codes:
//                   "t<4>Research S<3>t<1>im Pack Tech<10>(Marine and Firebat ability)".
//                   The hotkey of a cancel button is Esc, which is byte 27 in
//                   StarCraft and 16 in Warcraft II.
//   unit names      name, subname and map editor group, separated by NULs:
//                   "Terran Siege Tank<0>Tank Mode<0>Ground Units"
//   anything else   text with colour codes, such as "<6>Disabled"
"use strict";

(function (AG) {
  var ESC_KEYS = [27, 16];
  var MAX_COST_TYPE = 5;

  function isControl(c) {
    return c < 32;
  }

  // The string as pieces: { text } for visible text, { code } for a control
  // byte or a literal <.
  function tokens(text) {
    var out = [];
    var plain = "";
    text = String(text);
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (isControl(c) || c === 60) {
        if (plain) out.push({ text: plain });
        plain = "";
        out.push({ code: c });
      } else plain += text[i];
    }
    if (plain) out.push({ text: plain });
    return out;
  }

  function raw(text) {
    return tokens(text)
      .map(function (t) {
        return t.text !== undefined ? t.text : "<" + t.code + ">";
      })
      .join("");
  }

  // True if the string starts with a hotkey and a cost type.
  function isButton(text) {
    if (text.length < 2) return false;
    var key = text.charCodeAt(0);
    var cost = text.charCodeAt(1);
    return cost <= MAX_COST_TYPE && (!isControl(key) || ESC_KEYS.indexOf(key) >= 0);
  }

  // A clean one-line name, or "" if the string has no visible text.
  function name(text) {
    text = String(text);
    if (isButton(text)) return clean(text.slice(2));
    // A unit name: the name, and its subname unless that's "*".
    var parts = text.split("\u0000");
    if (parts.length > 1 && clean(parts[0])) {
      var sub = clean(parts[1]);
      return clean(parts[0]) + (sub && sub !== "*" ? " (" + sub + ")" : "");
    }
    return clean(text);
  }

  // One line of visible text.
  function clean(text) {
    return text
      .replace(/[\n\r\t]+/g, " ")
      .replace(/[\u0000-\u001f]/g, "")
      .replace(/ {2,}/g, " ")
      .trim();
  }

  AG.core.tbl = { tokens: tokens, raw: raw, name: name, isButton: isButton };
})(AxeGraft);
