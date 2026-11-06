// The catalog check: each rule fails on a deliberately bad catalog, with a
// message naming the catalog and the problem.
"use strict";

(function (AG) {
  var T = AG.testing;
  var C = AG.core.catalog;

  function check(raw) {
    return C.check(raw, "bad.js");
  }

  // Runs `change` on a copy of the StarCraft fixture and expects a problem
  // matching `pattern`, naming the catalog.
  function expectProblem(name, change, pattern, game) {
    T.test("catalog check: " + name, function () {
      var raw = T.rawCatalog(game || "starcraft");
      change(raw);
      var problems = check(raw);
      T.ok(problems.length > 0, "expected the catalog to be treated as malformed");
      var match = problems.filter(function (p) {
        return pattern.test(p);
      });
      T.ok(match.length > 0, "no problem matches " + pattern + " in:\n" + problems.join("\n"));
      match.forEach(function (p) {
        T.ok(p.indexOf("Catalog bad.js: ") === 0, "message doesn't name the catalog: " + p);
      });
    });
  }

  T.test("catalog check: the fixture catalogs pass", function () {
    T.equal(check(T.rawCatalog("starcraft")), []);
    T.equal(check(T.rawCatalog("warcraft2")), []);
  });

  T.test("catalog check: the documented example passes", function () {
    T.equal(C.check(T.exampleCatalog(), "catalog-example.js"), []);
  });

  T.test("catalog documentation: the example in docs/catalog-format.md is the one tested", function (ctx) {
    return ctx.sourceTree.read("docs/catalog-format.md").then(function (doc) {
      var m = /<!-- example:start -->\n```json\n([\s\S]*?)\n```\n<!-- example:end -->/.exec(doc);
      T.ok(m, "the example is marked in the document");
      T.equal(JSON.parse(m[1]), T.exampleCatalog());
    });
  }, { sourceTree: true });

  T.test("catalog check: a catalog without an application value is used as normal", function () {
    var raw = T.rawCatalog("starcraft");
    delete raw.application;
    T.equal(check(raw), []);
    raw.application = "Something else";
    T.equal(check(raw), []);
  });

  expectProblem("a unit icon that isn't an icon ID", function (raw) {
    raw.units[0].icon = -1;
  }, /table entry \d+ has an icon that isn't an icon ID/);
  expectProblem("a unit icon that isn't a number", function (raw) {
    raw.units[0].icon = "Marine";
  }, /has an icon that isn't an icon ID/);

  // Format versions
  expectProblem("an unsupported catalog format", function (raw) {
    raw.catalogFormat = 2;
  }, /catalogFormat 2 isn't supported/);
  expectProblem("an unsupported mod format", function (raw) {
    raw.modFormat = 7;
  }, /modFormat 7 isn't supported/);

  // Contents
  expectProblem("not an object", function (raw) {
    Object.keys(raw).forEach(function (k) {
      delete raw[k];
    });
  }, /catalogFormat undefined isn't supported/);
  expectProblem("an unknown game", function (raw) {
    raw.game = "diablo";
  }, /game "diablo" isn't one of/);
  expectProblem("an unknown property", function (raw) {
    raw.adresses = {};
  }, /unknown property "adresses"/);
  expectProblem("no versions", function (raw) {
    raw.versions = [];
  }, /versions must list at least one version/);
  expectProblem("a missing limit", function (raw) {
    delete raw.limits.tableEntry;
  }, /limits.tableEntry is missing/);
  expectProblem("new sets not starting at the table's size", function (raw) {
    raw.limits.newButtonSet.min = 300;
  }, /newButtonSet must start at the table's size, 250/);
  expectProblem("a button field of unknown kind", function (raw) {
    raw.buttonFields[0].kind = "slot";
  }, /button field position has an unknown kind "slot"/);
  expectProblem("two condition fields", function (raw) {
    raw.buttonFields.push({ name: "condition2", label: "C", kind: "condition", required: false, help: "x" });
  }, /exactly one field of kind condition/);
  expectProblem("an unknown variable type", function (raw) {
    raw.functions.actions[0].variable = "spell";
  }, /function order_move in functions.actions has an unknown variable type "spell"/);
  expectProblem("requirements without opcodes", function (raw) {
    delete raw.opcodes;
  }, /opcodes are missing, but parts includes requirements/);
  expectProblem("requirements in a game without them", function (raw) {
    raw.parts = ["units", "button_sets", "constants"];
  }, /requirements are given, but parts doesn't include requirements/);
  expectProblem("a duplicate unit", function (raw) {
    raw.units.push(JSON.parse(JSON.stringify(raw.units[0])));
  }, /table entry 0 is listed twice/);
  expectProblem("a complete catalog missing table entries", function (raw) {
    raw.sample = false;
  }, /units must list every table entry, but 240 are missing, starting with 1/);
  expectProblem("an entry that isn't a unit with status functions", function (raw) {
    raw.units[7].original.status_update = "statdraw_draw_unit";
  }, /table entry 228 isn't a unit, so it has only an original button_set/);
  expectProblem("an option constant with a range", function (raw) {
    raw.constants[4].range = { min: 0, max: 1 };
  }, /constant cloak_energy is an option, so it has no range/);
  expectProblem("an original constant value outside its range", function (raw) {
    raw.constants[0].availability["1.12"] = 70000;
  }, /constant max_supply has an original value 70000 on 1.12, outside its range/);

  // Internal references
  expectProblem("an original button naming an unknown condition", function (raw) {
    raw.buttonSets[0].original[0].condition = "bf_sometimes";
  }, /button set 0 button 0 names condition "bf_sometimes", which the catalog doesn't list/);
  expectProblem("an original button without a variable its function reads", function (raw) {
    delete raw.buttonSets[1].original[0].action_variable;
  }, /button set 5 button 0 has no action_variable, which order_research reads/);
  expectProblem("an original button with another game's field", function (raw) {
    raw.buttonSets[0].original[0].highlighted = 2;
  }, /has a field the catalog doesn't define: highlighted/);
  expectProblem("a unit whose set doesn't list it", function (raw) {
    raw.buttonSets[0].entries = [0, 10, 20];
  }, /table entry 32 has an original button_set 0, but set 0 doesn't list entry 32/);
  expectProblem("a set listing an entry pointing elsewhere", function (raw) {
    raw.buttonSets[1].entries = [5, 7];
  }, /button set 5 lists table entry 7, but that entry's original button_set is 7/);
  expectProblem("a set not named after its lowest entry", function (raw) {
    raw.buttonSets[0].id = 10;
    raw.units.forEach(function (u) {
      if (u.original.button_set === 0) u.original.button_set = 10;
    });
  }, /button set 10 must take the ID of the lowest table entry pointing at it, 0/);
  expectProblem("a unit's original status function that isn't listed", function (raw) {
    raw.units[0].original.status_changed = "statdraw_query_mystery";
  }, /table entry 0 has an original status_changed "statdraw_query_mystery"/);
  expectProblem("a requirement record using an unknown opcode", function (raw) {
    raw.requirements[0].original["default"].push("can_fly");
  }, /unit 0 requirement record uses opcode "can_fly"/);
  expectProblem("a level opcode in a unit record", function (raw) {
    raw.requirements[0].original["default"].push("upgrade_level_1");
  }, /uses upgrade_level_1, which isn't allowed in unit records/);
  expectProblem("a constant referring to an unknown kind", function (raw) {
    raw.constants[1].refers = "spell";
  }, /constant terran_start_building refers to an unknown kind "spell"/);
  expectProblem("an original option that isn't one of the options", function (raw) {
    raw.constants[4].availability["1.07"] = "maybe";
  }, /original option "maybe" on 1.07/);

  // Per-version coverage
  expectProblem("a constant that forgets a version", function (raw) {
    delete raw.constants[0].availability["1.12"];
  }, /constant max_supply doesn't say what version 1.12 has/);
  expectProblem("a constant naming an unknown version", function (raw) {
    raw.constants[0].availability["1.99"] = 400;
  }, /availability names an unknown version "1.99"/);
  expectProblem("a set absent on an unknown version", function (raw) {
    raw.buttonSets[3].absentOn = ["1.0"];
  }, /button set 232 absentOn names an unknown version "1.0"/);
  expectProblem("a function absent on an unknown version", function (raw) {
    raw.functions.conditions[4].absentOn = ["0.9"];
  }, /bf_replay_play in functions.conditions absentOn names an unknown version "0.9"/);
  expectProblem("a requirement record per version naming an unknown version", function (raw) {
    raw.requirements[3].original.perVersion = { "1.17": null };
  }, /perVersion names an unknown version "1.17"/);

  // Original buttons by version
  function sixButtons() {
    return [{ position: 3, icon: 1, condition: "bf_always", action: "order_move", enabled_string: 1, disabled_string: 0 }];
  }

  T.test("catalog check: a set's original as one plain list is the same on every version", function () {
    var raw = T.rawCatalog("starcraft");
    T.equal(check(raw), []);
    var cat = C.index(raw);
    T.equal(cat.setOriginals.get(0)["default"], raw.buttonSets[0].original);
    T.equal(cat.setOriginals.get(0).perVersion, {});
  });

  T.test("catalog check: a set's original may differ by version", function () {
    var raw = T.rawCatalog("starcraft");
    var plain = raw.buttonSets[0].original;
    raw.buttonSets[0].original = { "default": plain, perVersion: { "1.07": sixButtons() } };
    T.equal(check(raw), []);
    var cat = C.index(raw);
    T.equal(cat.setOriginals.get(0)["default"], plain);
    T.equal(cat.setOriginals.get(0).perVersion, { "1.07": sixButtons() });
  });

  expectProblem("a set's per-version original naming an unknown version", function (raw) {
    raw.buttonSets[0].original = { "default": raw.buttonSets[0].original, perVersion: { "1.99": sixButtons() } };
  }, /button set 0 perVersion names an unknown version "1.99"/);
  expectProblem("a set's per-version original without a default", function (raw) {
    raw.buttonSets[0].original = { perVersion: { "1.07": sixButtons() } };
  }, /button set 0 needs its original buttons/);
  expectProblem("a bad button in a set's per-version original", function (raw) {
    var list = sixButtons();
    list[0].condition = "bf_sometimes";
    raw.buttonSets[0].original = { "default": raw.buttonSets[0].original, perVersion: { "1.07": list } };
  }, /button set 0 on 1.07 button 0 names condition "bf_sometimes"/);
  expectProblem("a set's per-version original that isn't a list", function (raw) {
    raw.buttonSets[0].original = { "default": raw.buttonSets[0].original, perVersion: { "1.07": null } };
  }, /button set 0 on 1.07 needs its original buttons/);

  // Ascending positions
  T.test("catalog check: with panel.ascending, a sorted original list and shared positions pass", function () {
    var raw = T.rawCatalog("starcraft");
    raw.panel.ascending = true;
    // Set 5 has two buttons at position 7; set 0 has positions 1 and 7.
    T.equal(check(raw), []);
  });
  T.test("catalog check: without panel.ascending, buttons may be in any order", function () {
    var raw = T.rawCatalog("starcraft");
    raw.buttonSets[0].original.reverse();
    T.equal(check(raw), []);
  });
  expectProblem("an original list out of order, with panel.ascending", function (raw) {
    raw.panel.ascending = true;
    raw.buttonSets[0].original.reverse();
  }, /button set 0 isn't in ascending position order: button 1 at position 1 follows position 7/);
  expectProblem("a per-version original list out of order, with panel.ascending", function (raw) {
    raw.panel.ascending = true;
    var list = sixButtons().concat(sixButtons());
    list[1].position = 2;
    raw.buttonSets[0].original = { "default": raw.buttonSets[0].original, perVersion: { "1.07": list } };
  }, /button set 0 on 1.07 isn't in ascending position order: button 1 at position 2 follows position 3/);
  expectProblem("panel.ascending that isn't true or false", function (raw) {
    raw.panel.ascending = "yes";
  }, /panel.ascending must be true or false/);

  // Help texts
  expectProblem("a constant without help", function (raw) {
    delete raw.constants[0].help;
  }, /constant max_supply has no help text/);
  expectProblem("a button field without help", function (raw) {
    raw.buttonFields[2].help = " ";
  }, /button field condition has no help text/);
  expectProblem("a unit field without help", function (raw) {
    delete raw.unitFields[1].help;
  }, /unit field status_changed has no help text/);
  expectProblem("a bare unit row without help", function (raw) {
    delete raw.bareUnit.help;
  }, /bareUnit needs a label and a help text/);
  expectProblem("a Warcraft II button field without help", function (raw) {
    delete raw.buttonFields[7].help;
  }, /button field highlighted has no help text/, "warcraft2");

  T.test("catalog check: a function or opcode may leave out help", function () {
    var raw = T.rawCatalog("starcraft");
    T.equal(raw.functions.actions[0].help, undefined);
    T.equal(raw.opcodes[0].help, undefined);
    T.equal(check(raw), []);
  });

  T.test("catalog check: a bad value doesn't stop the other problems being found", function () {
    var raw = T.rawCatalog("starcraft");
    raw.units = "everything";
    raw.constants[0].help = "";
    raw.functions = null;
    var problems = check(raw);
    T.ok(problems.some(function (p) {
      return /units are missing/.test(p);
    }), problems.join("\n"));
    T.ok(problems.some(function (p) {
      return /constant max_supply has no help text/.test(p);
    }), problems.join("\n"));
  });

  T.test("catalog loading: a bad catalog is left out and a good one is used", function () {
    var bad = T.rawCatalog("starcraft");
    delete bad.constants[0].help;
    var result = C.load(
      [
        { raw: bad, source: "starcraft.js" },
        { raw: T.rawCatalog("warcraft2"), source: "warcraft2.js" }
      ],
      ["missing.js"]
    );
    T.equal(Object.keys(result.games), ["warcraft2"]);
    T.equal(
      result.errors.map(function (e) {
        return e.catalog;
      }),
      ["missing.js", "starcraft.js"]
    );
    T.equal(result.errors[0].problems, ["Catalog missing.js: the file couldn't be loaded"]);
    T.equal(result.errors[1].problems, ["Catalog starcraft.js: constant max_supply has no help text"]);
  });

  T.test("catalog loading: two catalogs for one game", function () {
    var result = C.load([
      { raw: T.rawCatalog("starcraft"), source: "a.js" },
      { raw: T.rawCatalog("starcraft"), source: "b.js" }
    ]);
    T.equal(Object.keys(result.games), ["starcraft"]);
    T.ok(/already loaded, from a.js/.test(result.errors[0].problems[0]));
  });
})(AxeGraft);
