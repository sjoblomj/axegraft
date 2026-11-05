// AxeGraft Editor: the one global namespace.
//
// Every script adds to `AxeGraft`. Scripts are classic scripts, loaded in the
// order `index.html` lists them, because browsers load neither ES modules nor
// local data with `fetch` from `file://`.
"use strict";

var AxeGraft = (function (root) {
  var ns = root.AxeGraft || {};
  ns.core = ns.core || {};
  ns.assets = ns.assets || {};
  ns.ui = ns.ui || {};
  root.AxeGraft = ns;
  return ns;
})(typeof globalThis !== "undefined" ? globalThis : this);
