// The shipped catalogs pass the catalog check. StarCraft's is a hand-written
// sample that holds what the editor needs to show each kind of case.
// Warcraft II's is the complete catalog built from the knowledge base.
"use strict";

(function (AG) {
  var T = AG.testing;
  var C = AG.core.catalog;

  function registered(game) {
    var found = C.registry.registered.filter(function (r) {
      return r.raw && r.raw.game === game;
    });
    if (found.length !== 1) throw new Error("expected one registered " + game + " catalog, found " + found.length);
    return found[0].raw;
  }

  T.test("sample StarCraft catalog: passes the catalog check and is marked as a sample", function () {
    var raw = registered("starcraft");
    T.equal(C.check(raw, "sample-starcraft.js"), []);
    T.equal(raw.sample, true);
    T.equal(raw.versions.length, 26, "every version from 1.05 to 1.17");
  });

  T.test("sample StarCraft catalog: has each kind of case the editor shows", function () {
    var cat = C.index(JSON.parse(JSON.stringify(registered("starcraft"))));
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

  T.test("Warcraft II catalog: passes the catalog check, is complete, with no requirements", function () {
    var raw = registered("warcraft2");
    T.equal(C.check(raw, "warcraft2.js"), []);
    T.equal(raw.sample, undefined, "not a sample, so every table entry is listed");
    T.equal(raw.parts, ["units", "button_sets", "constants"]);
    T.equal(raw.requirements, undefined);
    T.equal(raw.opcodes, undefined);
    T.equal(
      raw.versions.map(function (v) {
        return v.id;
      }),
      ["1.3", "1.33", "1.5", "2.00", "2.02"]
    );
    T.equal(raw.panel.ascending, true, "Warcraft II needs ascending positions");
  });

  T.test("Warcraft II catalog: has the string and highlighted fields, and no StarCraft string fields", function () {
    var cat = C.index(JSON.parse(JSON.stringify(registered("warcraft2"))));
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
    T.equal(cat.unitKind.icon.name, "icon", "Warcraft II units have an icon");
    T.equal(cat.units.get(0).original.icon, 2, "the Footman's icon");
    // The Peasant opens entries 111 and 112, and the build menu's Cancel opens 110.
    var peasant = cat.sets.get(2).original;
    T.equal(
      peasant.filter(function (b) {
        return b.action === "status_set_card";
      }).map(function (b) {
        return b.action_variable;
      }),
      [111, 112]
    );
    T.equal(cat.sets.get(111).original[7].action_variable, 110);
    T.equal(cat.sets.get(0).entries, [0, 4, 22, 36, 42, 46]);
    T.equal(cat.units.get(58).original.button_set, null);
  });

  T.test("Warcraft II catalog: uses the reference's function names", function () {
    var cat = C.index(JSON.parse(JSON.stringify(registered("warcraft2"))));
    T.equal(cat.units.get(0).original, { button_set: 0, icon: 2, stats_frame: 1, name_string: 2, status_changed: "statdraw_query_unit", status_update: "statdraw_draw_grunt" });
    T.equal(cat.units.get(2).original, { button_set: 2, icon: 0, stats_frame: 1, name_string: 4, status_changed: "statdraw_query_peon", status_update: "statdraw_draw_peon" });
    T.equal(cat.sets.get(0).original[1], { position: 1, icon: 164, condition: "bf_has_Shields", condition_variable: 0, action: "order_guard", string: 393, highlighted: 1 });
    T.equal(cat.sets.get(111).original[0], { position: 0, icon: 38, condition: "bf_farm_ok", action: "order_place", action_variable: 58, string: 306, highlighted: 0 });
    T.equal(cat.functions.conditions.get("bf_enhanced_mode").absentOn, ["1.3", "1.33", "1.5"], "a function only 2.00 and 2.02 have");
  });

  // The appendix of w2_exe.md: 2.00 and 2.02 insert a Patrol button,
  // shown only in Enhanced mode, before the last command.
  T.test("Warcraft II catalog: sets whose original differs on the DOS versions, as in the reference", function () {
    var cat = C.index(JSON.parse(JSON.stringify(registered("warcraft2"))));
    var D = AG.core.doc;
    function shields(icon) {
      return [0, 1, 2].map(function (lv) {
        return { position: 1, icon: icon + lv, condition: "bf_has_Shields", condition_variable: lv, action: "order_guard", string: 393, highlighted: 1 };
      });
    }
    function swords(icon) {
      return [0, 1, 2].map(function (lv) {
        return { position: 2, icon: icon + lv, condition: "bf_has_Swords", condition_variable: lv, action: "order_attack", string: 394, highlighted: 8 };
      });
    }
    function move(icon) {
      return { position: 0, icon: icon, condition: "bf_always", action: "order_move", string: 392, highlighted: 2 };
    }
    function patrol(icon) {
      return { position: 3, icon: icon, condition: "bf_enhanced_mode", action: "order_patrol", string: 404, highlighted: 4 };
    }
    var demolish = { position: 8, icon: 142, condition: "bf_always", action: "order_demolish", string: 406, highlighted: 32 };

    var dosSquad = [move(83)].concat(shields(164), swords(116), [demolish]);
    var bneSquad = [move(83)].concat(shields(164), swords(116), [patrol(184), demolish]);
    T.equal(cat.sets.get(14).entries, [14]);
    T.equal(D.originalButtons(cat, 14, "1.5"), dosSquad);
    T.equal(D.originalButtons(cat, 14, "1.3"), dosSquad);
    T.equal(D.originalButtons(cat, 14, "2.02"), bneSquad);
    T.equal(D.originalButtons(cat, 14, "2.00"), bneSquad);

    var dosZeppelin = [move(84)].concat(shields(167));
    T.equal(cat.sets.get(41).entries, [41, 45], "the Goblin Zeppelin and the Eye of Kilrogg");
    T.equal(D.originalButtons(cat, 41, "1.33"), dosZeppelin);
    T.equal(D.originalButtons(cat, 41, "2.02"), dosZeppelin.concat([patrol(185)]));
  });
})(AxeGraft);
