// Labels: kept as written, given to new entries, and ignored by validation.
"use strict";

(function (AG) {
  var T = AG.testing;
  var D = AG.core.doc;

  var MOVE = { position: 1, icon: 228, condition: "bf_always", action: "order_move", enabled_string: 664, disabled_string: 0 };

  T.test("labels: an existing custom label is kept when its entry is edited", function () {
    var cat = T.catalog("starcraft");
    var opened = {
      patcher: "AxeGraft",
      format: 1,
      game: "starcraft",
      label: "My mod",
      units: [{ id: 0, label: "The Marine I changed", button_set: 5 }],
      button_sets: [{ id: 7, label: "Workers", buttons: [] }],
      requirements: [{ type: "unit", id: 0, label: "Marine needs", list: [] }],
      constants: [{ name: "max_supply", label: "Supply cap", value: 600 }]
    };
    var doc = D.setUnitField(opened, cat, 0, "status_update", "statdraw_draw_none");
    doc = D.setButtons(doc, cat, 7, [MOVE]);
    doc = D.setRequirement(doc, cat, "unit", 0, [111]);
    doc = D.setConstant(doc, cat, "max_supply", 800);
    T.equal(doc.label, "My mod");
    T.equal(doc.units[0], { id: 0, label: "The Marine I changed", button_set: 5, status_update: "statdraw_draw_none" });
    T.equal(doc.button_sets[0].label, "Workers");
    T.equal(doc.requirements[0].label, "Marine needs");
    T.equal(doc.constants[0], { name: "max_supply", label: "Supply cap", value: 800 });
    var text = AG.core.serialize(doc, cat);
    T.ok(text.indexOf('"label": "The Marine I changed"') > 0 && text.indexOf('"label": "My mod"') > 0, text);
  });

  T.test("labels: a new entry is labelled with the item's catalog name", function () {
    var cat = T.catalog("starcraft");
    T.equal(D.setUnitField(D.create("starcraft"), cat, 0, "button_set", 5).units, [{ id: 0, label: "Terran Marine", button_set: 5 }]);
    T.equal(D.setButtons(D.create("starcraft"), cat, 5, []).button_sets, [{ id: 5, label: "Siege Tank", buttons: [] }]);
    T.equal(D.setRequirement(D.create("starcraft"), cat, "tech_use", 5, ["current_unit_is", 5]).requirements[0].label, "Siege Mode");
    T.equal(D.setConstant(D.create("starcraft"), cat, "max_supply", 1).constants[0].label, "Maximum supply");
    T.equal(D.setUnitField(D.create("starcraft"), cat, 33, "button_set", 5).units, [{ id: 33, button_set: 5 }], "an item without a name gets no label");
  });

  T.test("labels: they don't affect validation", function () {
    var cat = T.catalog("starcraft");
    var doc = { patcher: "AxeGraft", format: 1, game: "starcraft", label: "x", units: [{ id: 0, label: "", button_set: 5 }] };
    T.equal(AG.core.validate.check(doc, cat), []);
    doc.units[0].label = "Something else entirely";
    T.equal(AG.core.validate.check(doc, cat), []);
  });

  T.test("labels: a unit's label can be set, changed and removed, and needs an entry", function () {
    var cat = T.catalog("starcraft");
    var doc = D.setUnitField(D.create("starcraft"), cat, 0, "button_set", 5);
    T.equal(D.unitLabel(doc, 0), "Terran Marine");
    doc = D.setUnitLabel(doc, 0, "Rifleman");
    T.equal(doc.units, [{ id: 0, label: "Rifleman", button_set: 5 }]);
    T.equal(D.unitLabel(doc, 0), "Rifleman");
    doc = D.setUnitLabel(doc, 0, "");
    T.equal(doc.units, [{ id: 0, button_set: 5 }], "empty text removes the label");
    T.equal(D.unitLabel(doc, 0), null);
    var none = D.create("starcraft");
    T.ok(D.setUnitLabel(none, 1, "Ghost guy") === none, "a unit with no entry is left as it is");
    var two = { patcher: "AxeGraft", format: 1, game: "starcraft", units: [{ id: 0, button_set: 5 }, { id: 0, label: "Old", status_update: "statdraw_draw_none" }] };
    T.equal(D.unitLabel(two, 0), "Old");
    T.equal(D.setUnitLabel(two, 0, "New").units, [{ id: 0, label: "New", button_set: 5 }, { id: 0, status_update: "statdraw_draw_none" }], "the label moves to the first entry");
  });
})(AxeGraft);
