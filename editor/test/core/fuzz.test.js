// Randomized tests, with a fixed seed so every run checks the same inputs:
// malformed values fed to the reader and the validator must always give a
// mod or problems, and never throw.
"use strict";

(function (AG) {
  var T = AG.testing;
  var M = AG.core.modfile;
  var V = AG.core.validate;

  var KEYS = ["id", "button_set", "buttons", "list", "name", "value", "option", "type", "label", "position", "icon", "condition",
    "action", "condition_variable", "action_variable", "enabled_string", "string", "highlighted", "__proto__", "constructor",
    "toString", "units", "button_sets", "constants", "requirements", "patcher", "format", "game", ""];
  var STRINGS = ["", "AxeGraft", "starcraft", "warcraft2", "bf_always", "order_move", "or", "end_sublist", "upgrade_level_1",
    "current_unit_is", "max_supply", "cloak_energy", "regain", "__proto__", "constructor", "\u0000", "\ud800", "x".repeat(300)];
  var NUMBERS = [0, 1, -1, 7, 32, 228, 249, 250, 255, 256, 999, 1000, 65535, 65536, 0.5, -0.0, 1e308, -1e308, 2147483648, 9007199254740993];

  function generator(seed) {
    var rnd = AG.util.random(seed);
    function pick(list) {
      return list[Math.floor(rnd() * list.length)];
    }
    function value(depth) {
      var r = rnd();
      if (depth > 3 || r < 0.35) {
        var s = rnd();
        if (s < 0.3) return pick(NUMBERS);
        if (s < 0.6) return pick(STRINGS);
        if (s < 0.75) return null;
        if (s < 0.9) return rnd() < 0.5;
        return Math.floor(rnd() * 100000) - 50000;
      }
      if (r < 0.65) {
        var arr = [];
        var n = Math.floor(rnd() * 4);
        for (var i = 0; i < n; i++) arr.push(value(depth + 1));
        return arr;
      }
      var obj = {};
      var m = Math.floor(rnd() * 4);
      for (var j = 0; j < m; j++) obj[pick(KEYS)] = value(depth + 1);
      return obj;
    }
    // Replaces or adds a random value somewhere in a copy of `base`.
    function mutate(base) {
      var copy = JSON.parse(JSON.stringify(base));
      var steps = 1 + Math.floor(rnd() * 3);
      for (var s = 0; s < steps; s++) {
        var node = copy;
        var parent = null;
        var key = null;
        while (node && typeof node === "object" && rnd() < 0.75) {
          var keys = Object.keys(node);
          if (!keys.length) break;
          parent = node;
          key = pick(keys);
          node = node[key];
        }
        if (parent === null) {
          if (node && typeof node === "object" && !Array.isArray(node)) node[pick(KEYS)] = value(1);
        } else if (rnd() < 0.15 && !Array.isArray(parent)) {
          delete parent[key];
        } else {
          parent[Array.isArray(parent) || rnd() < 0.7 ? key : pick(KEYS)] = value(1);
        }
      }
      return copy;
    }
    return { rnd: rnd, value: value, mutate: mutate, pick: pick };
  }

  function catalogs() {
    return { starcraft: T.catalog("starcraft"), warcraft2: T.catalog("warcraft2") };
  }

  function wellFormed(r) {
    if (!r || typeof r.refused !== "boolean" || !Array.isArray(r.problems)) return false;
    if (r.refused) return r.mod === null && r.problems.length > 0;
    return r.mod !== null && typeof r.mod === "object";
  }

  function bases() {
    return T.modFixtures
      .filter(function (f) {
        return f.mod;
      })
      .map(function (f) {
        return f.mod;
      });
  }

  T.test("random: mutated mods always give a mod or problems, and never throw", function () {
    var g = generator(20261105);
    var cats = catalogs();
    var all = bases();
    var counts = { refused: 0, errors: 0, clean: 0 };
    for (var i = 0; i < 3000; i++) {
      var mod = g.mutate(g.pick(all));
      var text;
      try {
        text = JSON.stringify(mod);
      } catch (e) {
        continue;
      }
      var r = M.read(text, cats);
      T.ok(wellFormed(r), "case " + i + ": " + text);
      r.problems.forEach(function (p) {
        T.ok(typeof p.message === "string" && p.message && typeof p.path === "string", "case " + i + " has a problem without a message: " + text);
        T.ok(!/undefined|\[object Object\]|NaN/.test(p.message), "case " + i + " has a garbled message: " + p.message);
      });
      if (r.refused) counts.refused++;
      else if (r.problems.length) counts.errors++;
      else counts.clean++;
    }
    T.ok(counts.refused > 100 && counts.errors > 50 && counts.clean > 20, "mutations reach every outcome: " + JSON.stringify(counts));
  });

  T.test("random: the validator takes any JSON value as a mod without throwing", function () {
    var g = generator(7);
    var cat = T.catalog("starcraft");
    for (var i = 0; i < 2000; i++) {
      var v = g.value(0);
      if (g.rnd() < 0.5 && v && typeof v === "object" && !Array.isArray(v)) {
        v.patcher = "AxeGraft";
        v.format = 1;
        v.game = "starcraft";
      }
      var problems = V.check(v, cat);
      T.ok(Array.isArray(problems), "case " + i);
    }
  });

  T.test("random: arbitrary bytes are refused with a reason, and never throw", function () {
    var g = generator(1999);
    var cats = catalogs();
    for (var i = 0; i < 500; i++) {
      var n = Math.floor(g.rnd() * 300);
      var bytes = new Uint8Array(n);
      for (var j = 0; j < n; j++) bytes[j] = Math.floor(g.rnd() * 256);
      // Some start like a mod, to get past the first checks.
      var prefix = new TextEncoder().encode('{"patcher": "AxeGraft", "format": 1, ');
      if (g.rnd() < 0.3 && n >= prefix.length) bytes.set(prefix, 0);
      var r = M.read(bytes, cats);
      T.ok(wellFormed(r) && r.refused, "case " + i);
    }
  });
})(AxeGraft);
