// The mod document: edits, effective values, and removing what matches the
// original.
"use strict";

(function (AG) {
  var T = AG.testing;
  var D = AG.core.doc;

  function sc() {
    return T.catalog("starcraft");
  }

  var MOVE = { position: 1, icon: 228, condition: "bf_always", action: "order_move", enabled_string: 664, disabled_string: 0 };

  T.test("document: a new mod changes nothing", function () {
    var doc = D.create("starcraft");
    T.equal(doc, { patcher: "AxeGraft", format: 1, game: "starcraft", mod_name: "", mod_version: "", mod_authors: [] });
    T.ok(D.isEmpty(doc));
  });

  T.test("document: edits never change the document they're given", function () {
    var cat = sc();
    var doc = AG.util.freeze(D.setUnitField(D.create("starcraft"), cat, 0, "button_set", 5));
    var next = D.setUnitField(doc, cat, 0, "status_update", "statdraw_draw_none");
    T.equal(doc.units, [{ id: 0, label: "Terran Marine", button_set: 5 }]);
    T.equal(next.units, [{ id: 0, label: "Terran Marine", button_set: 5, status_update: "statdraw_draw_none" }]);
  });

  T.test("only differences are saved: changing one button defines that whole set and no other", function () {
    var cat = sc();
    var buttons = D.effectiveButtons(D.create("starcraft"), cat, 5).buttons.slice();
    buttons[1] = Object.assign({}, buttons[1], { icon: 999 });
    var doc = D.setButtons(D.create("starcraft"), cat, 5, buttons);
    T.equal(doc.button_sets.length, 1);
    T.equal(doc.button_sets[0].id, 5);
    T.equal(doc.button_sets[0].buttons.length, 2, "the whole set");
    T.equal(doc.button_sets[0].buttons[0], cat.sets.get(5).original[0]);
    T.equal(doc.button_sets[0].buttons[1].icon, 999);
    T.equal(doc.units, undefined);
  });

  T.test("only differences are saved: changing one unit field saves only that field", function () {
    var cat = sc();
    var doc = D.setUnitField(D.create("starcraft"), cat, 0, "status_update", "statdraw_draw_none");
    T.equal(doc.units, [{ id: 0, label: "Terran Marine", status_update: "statdraw_draw_none" }]);
    var eff = D.effectiveUnit(doc, cat, 0);
    T.equal(eff.status_update, { value: "statdraw_draw_none", original: "statdraw_draw_unit", hasOriginal: true, changed: true, path: "units[0].status_update" });
    T.equal(eff.button_set.value, 0);
    T.equal(eff.button_set.changed, false);
  });

  T.test("only differences are saved: editing back to the original removes the entry", function () {
    var cat = sc();
    var doc = D.setUnitField(D.create("starcraft"), cat, 0, "button_set", 5);
    doc = D.setUnitField(doc, cat, 0, "button_set", 0);
    T.equal(doc, D.create("starcraft"));

    var buttons = cat.sets.get(7).original;
    var edited = D.setButtons(D.create("starcraft"), cat, 7, [MOVE]);
    T.equal(edited.button_sets.length, 1);
    T.equal(D.setButtons(edited, cat, 7, buttons), D.create("starcraft"));

    var req = D.setRequirement(D.create("starcraft"), cat, "unit", 0, ["current_unit_is", 111]);
    T.equal(D.setRequirement(req, cat, "unit", 0, ["current_unit_is", 111, "not_lifted_off"]), D.create("starcraft"));

    var c = D.setConstant(D.create("starcraft"), cat, "max_supply", 600);
    T.equal(D.setConstant(c, cat, "max_supply", 400), D.create("starcraft"));
    var o = D.setConstant(D.create("starcraft"), cat, "cloak_energy", "regain");
    T.equal(o.constants, [{ name: "cloak_energy", label: "Permanent cloak energy", option: "regain" }]);
    T.equal(D.setConstant(o, cat, "cloak_energy", "no_regain"), D.create("starcraft"));
  });

  T.test("only differences are saved: a button with an unread variable of 0 matches the original without it", function () {
    var cat = sc();
    var buttons = cat.sets.get(7).original.map(function (b) {
      return Object.assign({}, b, { condition_variable: 0 });
    });
    T.equal(D.setButtons(D.create("starcraft"), cat, 7, buttons), D.create("starcraft"));
  });

  T.test("only differences are saved: a value matching only some versions stays", function () {
    var cat = sc();
    // 900 on 1.07, 360 on the others.
    var doc = D.setConstant(D.create("starcraft"), cat, "web_duration", 360);
    T.equal(doc.constants, [{ name: "web_duration", label: "Disruption Web duration", value: 360 }]);
    T.equal(D.setConstant(doc, cat, "web_duration", 900).constants[0].value, 900);
  });

  T.test("only differences are saved: a record with versions that differ stays unless it matches every version", function () {
    var cat = sc();
    // Order 73's record is absent on 1.16.1.
    var doc = D.setRequirement(D.create("starcraft"), cat, "order", 73, ["current_unit_is", 41]);
    T.equal(doc.requirements.length, 1);
    var none = D.setRequirement(D.create("starcraft"), cat, "order", 73, []);
    T.equal(none.requirements.length, 1);
  });

  T.test("only differences are saved: emptying an item that has no record matches the original", function () {
    var cat = sc();
    var doc = D.setRequirement(D.create("starcraft"), cat, "unit", 4, [111]);
    T.equal(doc.requirements, [{ type: "unit", id: 4, label: "Goliath Turret", list: [111] }]);
    T.equal(D.setRequirement(doc, cat, "unit", 4, []), D.create("starcraft"));
  });

  T.test("only differences are saved: an opened file's entries that match the original are removed", function () {
    var cat = sc();
    var opened = {
      patcher: "AxeGraft",
      format: 1,
      game: "starcraft",
      units: [{ id: 0, label: "Mine", button_set: 0, status_update: "statdraw_draw_none" }, { id: 32, button_set: 0 }],
      button_sets: [{ id: 5, buttons: cat.sets.get(5).original }, { id: 7, buttons: [Object.assign({ condition_variable: 0 }, MOVE)] }],
      requirements: [{ type: "unit", id: 0, list: ["current_unit_is", 111, "not_lifted_off"] }, { type: "unit", id: 4, list: [] }],
      constants: [{ name: "max_supply", value: 400 }, { name: "web_duration", value: 360 }, { name: "team_multiplier", value: 400 }]
    };
    var doc = D.normalize(opened, cat);
    T.equal(doc.units, [{ id: 0, label: "Mine", status_update: "statdraw_draw_none" }]);
    T.equal(doc.button_sets, [{ id: 7, buttons: [MOVE] }], "set 5 matched; the unread variable of 0 is dropped");
    T.equal(doc.requirements, undefined);
    // team_multiplier is 400 on the only version where it's known.
    T.equal(doc.constants, [{ name: "web_duration", value: 360 }]);
  });

  T.test("only differences are saved: normalizing leaves entries with errors as they are", function () {
    var cat = sc();
    var opened = {
      patcher: "AxeGraft",
      format: 1,
      game: "starcraft",
      mod_name: "",
      mod_version: "",
      mod_authors: [],
      units: [{ id: 5 }, { id: 300, button_set: 1 }],
      constants: [{ name: "max_supply", value: 400, option: "x" }, { name: "gravity", value: 1 }]
    };
    T.equal(D.normalize(opened, cat), opened);
  });

  T.test("reverting: a button set shows its original buttons, and the mod has no entry for it", function () {
    var cat = sc();
    var doc = D.setButtons(D.create("starcraft"), cat, 5, []);
    T.equal(D.effectiveButtons(doc, cat, 5).buttons, []);
    doc = D.revertSet(doc, cat, 5);
    T.equal(D.effectiveButtons(doc, cat, 5), { buttons: cat.sets.get(5).original, original: cat.sets.get(5).original, defined: false, isNew: false, path: null });
    T.equal(doc.button_sets, undefined);
  });

  T.test("reverting: a field, a whole unit, a record and a constant", function () {
    var cat = sc();
    var doc = D.setUnitField(D.create("starcraft"), cat, 0, "button_set", 5);
    doc = D.setUnitField(doc, cat, 0, "status_update", "statdraw_draw_none");
    var oneField = D.revertUnitField(doc, cat, 0, "button_set");
    T.equal(oneField.units, [{ id: 0, label: "Terran Marine", status_update: "statdraw_draw_none" }]);
    T.equal(D.revertUnitField(oneField, cat, 0, "status_update").units, undefined);
    T.equal(D.revertUnit(doc, cat, 0).units, undefined);
    var r = D.setRequirement(doc, cat, "upgrade", 3, []);
    T.equal(D.revertRequirement(r, cat, "upgrade", 3), doc);
    var c = D.setConstant(doc, cat, "max_supply", 2);
    T.equal(D.revertConstant(c, cat, "max_supply"), doc);
  });

  T.test("reverting: a field set in a second entry for the same unit", function () {
    var cat = sc();
    var doc = { patcher: "AxeGraft", format: 1, game: "starcraft", units: [{ id: 5, button_set: 0 }, { id: 5, status_update: "statdraw_draw_none" }] };
    T.equal(D.revertUnitField(doc, cat, 5, "status_update").units, [{ id: 5, button_set: 0 }]);
    T.equal(D.effectiveUnit(doc, cat, 5).status_update.path, "units[1].status_update");
  });

  T.test("document: effective values for a table entry that isn't a unit", function () {
    var cat = sc();
    T.equal(Object.keys(D.effectiveUnit(D.create("starcraft"), cat, 238)), ["button_set"]);
    T.equal(D.effectiveUnit(D.create("starcraft"), cat, 238).button_set.value, 238);
  });

  T.test("document: new sets take the lowest unused ID, and a unit can get its own copy", function () {
    var cat = sc();
    var a = D.addSet(D.create("starcraft"), cat);
    T.equal(a.id, 250);
    T.equal(a.doc.button_sets, [{ id: 250, buttons: [] }]);
    var b = D.addSet(a.doc, cat);
    T.equal(b.id, 251);
    var c = D.addSet(D.revertSet(b.doc, cat, 250), cat);
    T.equal(c.id, 250, "a freed ID is used again");

    var own = D.separateUnit(D.create("starcraft"), cat, 32);
    T.equal(own.id, 250);
    T.equal(own.doc.button_sets, [{ id: 250, buttons: cat.sets.get(0).original }]);
    T.equal(own.doc.units, [{ id: 32, label: "Terran Firebat", button_set: 250 }]);
    T.equal(D.effectiveUnit(own.doc, cat, 0).button_set.value, 0, "the other units on set 0 are unchanged");
  });

  T.test("document: removing an entry by its path", function () {
    var doc = { patcher: "AxeGraft", format: 1, game: "starcraft", units: [{ id: 300, button_set: 0 }, { id: 0, button_set: 5 }] };
    T.equal(D.removeEntry(doc, "units[0]").units, [{ id: 0, button_set: 5 }]);
    T.equal(D.removeEntry(D.removeEntry(doc, "units[0].id"), "units[0]").units, undefined);
  });
})(AxeGraft);
