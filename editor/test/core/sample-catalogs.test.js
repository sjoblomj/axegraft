// The hand-written sample catalogs pass the catalog check and hold what the
// editor needs to show each kind of case.
"use strict";

(function (AG) {
  var T = AG.testing;
  var C = AG.core.catalog;

  function sample(game) {
    var found = C.registry.registered.filter(function (r) {
      return r.raw && r.raw.game === game;
    });
    if (found.length !== 1) throw new Error("expected one registered " + game + " catalog, found " + found.length);
    return found[0].raw;
  }

  T.test("sample StarCraft catalog: passes the catalog check and is marked as a sample", function () {
    var raw = sample("starcraft");
    T.equal(C.check(raw, "sample-starcraft.js"), []);
    T.equal(raw.sample, true);
    T.equal(raw.versions.length, 26, "every version from 1.05 to 1.17");
  });

  T.test("sample StarCraft catalog: has each kind of case the editor shows", function () {
    var cat = C.index(JSON.parse(JSON.stringify(sample("starcraft"))));
    // A set several units share.
    T.equal(cat.sets.get(0).entries, [0, 10, 20, 32]);
    // A unit with no buttons, and a table entry that isn't a unit.
    T.equal(cat.units.get(4).original.button_set, null);
    T.equal(Object.keys(cat.units.get(238).original), ["button_set"]);
    // A set absent on older versions.
    T.equal(cat.sets.get(232).absentOn, ["1.05", "1.06", "1.07", "1.08", "1.08b", "1.09", "1.09b", "1.10", "1.11", "1.11b"]);
    // Every requirement type.
    var types = {};
    cat.requirements.forEach(function (r) {
      types[r.type] = true;
    });
    T.equal(Object.keys(types).sort(), ["order", "tech_research", "tech_use", "unit", "upgrade"]);
    // One constant of each kind: numeric, referring, option, and per-version states.
    var kinds = cat.constantList.map(function (c) {
      return c.kind + (c.refers ? ":" + c.refers : "");
    });
    T.ok(kinds.indexOf("number") >= 0 && kinds.indexOf("number:unit") >= 0 && kinds.indexOf("option") >= 0, kinds.join(","));
    var states = {};
    cat.constantList.forEach(function (c) {
      Object.keys(c.availability).forEach(function (v) {
        states[typeof c.availability[v] === "string" ? c.availability[v] : "value"] = true;
      });
    });
    T.ok(states.unknown && states.not_applicable, "has unknown and not_applicable versions");
    T.ok(cat.constants.get("disruption_web_duration").availability["1.07"] === 900, "an original value that differs by version");
    // The record from the mod format's example.
    T.equal(cat.requirements.get("upgrade:3").original["default"], [
      "current_unit_is", 139, "not_training_or_morphing", "upgrade_level_1", "end_sublist",
      "upgrade_level_2", 132, "or", "must_have", 133, "end_sublist", "upgrade_level_3", 133
    ]);
  });

  T.test("sample Warcraft II catalog: passes the catalog check, with no requirements", function () {
    var raw = sample("warcraft2");
    T.equal(C.check(raw, "sample-warcraft2.js"), []);
    T.equal(raw.sample, true);
    T.equal(raw.parts, ["units", "button_sets", "constants"]);
    T.equal(raw.requirements, undefined);
    T.equal(raw.opcodes, undefined);
    T.equal(
      raw.versions.map(function (v) {
        return v.id;
      }),
      ["2.00", "2.02"]
    );
  });

  T.test("sample Warcraft II catalog: has the string and highlighted fields, and no StarCraft string fields", function () {
    var cat = C.index(JSON.parse(JSON.stringify(sample("warcraft2"))));
    var names = cat.buttonFields.map(function (f) {
      return f.name;
    });
    T.ok(names.indexOf("string") >= 0 && names.indexOf("highlighted") >= 0, names.join(","));
    T.ok(names.indexOf("enabled_string") < 0 && names.indexOf("disabled_string") < 0);
    T.equal(
      cat.buttonField.get("highlighted").options.map(function (o) {
        return o.value;
      }),
      [0, 1, 2, 4, 8, 16, 32, 64, 128, 256]
    );
    T.ok(!cat.unitField.has("status_unit_type"), "Warcraft II units have no status unit type");
    // The Peasant opens entries 111 and 112, and the build menu's Cancel opens 110.
    var peasant = cat.sets.get(2).original;
    T.equal(
      peasant.filter(function (b) {
        return b.action === "show_table_entry";
      }).map(function (b) {
        return b.action_variable;
      }),
      [111, 112]
    );
    T.equal(cat.sets.get(111).original[7].action_variable, 110);
    T.equal(cat.sets.get(0).entries, [0, 4, 22, 36, 42, 46]);
    T.equal(cat.units.get(58).original.button_set, null);
  });
})(AxeGraft);
