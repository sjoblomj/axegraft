// Labels: kept as written, given to new entries, and ignored by validation.
"use strict";

(function (AG) {
  var T = AG.testing;
  var D = AG.core.doc;

  var MOVE = { position: 1, icon: 228, condition: "always", action: "move", enabled_string: 664, disabled_string: 0 };

  T.test("labels: an existing custom label is kept when its entry is edited", function () {
    var cat = T.catalog("starcraft");
    var opened = {
      patcher: "AxeGraft",
      format: 1,
      game: "starcraft",
      units: [{ id: 0, label: "The Marine I changed", button_set: 5 }],
      button_sets: [{ id: 7, label: "Workers", buttons: [] }],
      requirements: [{ type: "unit", id: 0, label: "Marine needs", list: [] }],
      constants: [{ name: "max_supply", label: "Supply cap", value: 600 }]
    };
    var doc = D.setUnitField(opened, cat, 0, "display_function", "draw_none");
    doc = D.setButtons(doc, cat, 7, [MOVE]);
    doc = D.setRequirement(doc, cat, "unit", 0, [111]);
    doc = D.setConstant(doc, cat, "max_supply", 800);
    T.equal(doc.units[0], { id: 0, label: "The Marine I changed", button_set: 5, display_function: "draw_none" });
    T.equal(doc.button_sets[0].label, "Workers");
    T.equal(doc.requirements[0].label, "Marine needs");
    T.equal(doc.constants[0], { name: "max_supply", label: "Supply cap", value: 800 });
    var text = AG.core.serialize(doc, cat);
    T.ok(text.indexOf('"label": "The Marine I changed"') > 0, text);
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
    var doc = { patcher: "AxeGraft", format: 1, game: "starcraft", units: [{ id: 0, label: "", button_set: 5 }] };
    T.equal(AG.core.validate.check(doc, cat), []);
    doc.units[0].label = "Something else entirely";
    T.equal(AG.core.validate.check(doc, cat), []);
  });

  T.test("labels: a label at the top of a mod is refused, since only entries and buttons have labels", function () {
    var cat = T.catalog("starcraft");
    var problems = AG.core.validate.check({ patcher: "AxeGraft", format: 1, game: "starcraft", label: "My mod" }, cat);
    T.equal(problems.map(function (p) {
      return [p.path, !!p.refuse];
    }), [["label", true]]);
  });

  // ---- Unit labels, in labels

  function mod(extra) {
    return Object.assign({ patcher: "AxeGraft", format: 1, game: "starcraft" }, extra);
  }

  T.test("unit labels: a unit's name is the mod's when it has one, otherwise the catalog's", function () {
    var cat = T.catalog("starcraft");
    var doc = mod({ labels: { units: { "0": "Rifleman" } } });
    T.equal(D.itemName(cat, "unit", 0, doc), "Rifleman");
    T.equal(D.itemName(cat, "unit", 0), "Terran Marine", "without the mod, the catalog's");
    T.equal(D.itemName(cat, "unit", 7, doc), "Terran SCV");
    T.equal(D.itemName(cat, "unit", 33, doc), null, "an entry with no name in either");
    T.equal(D.itemName(cat, "unit", 0, mod({ labels: { units: { "0": "" } } })), "Terran Marine", "an empty name counts as none");
    T.equal(D.itemName(cat, "unit", 0, mod({ labels: { units: [] } })), "Terran Marine", "labels of the wrong shape are ignored");
    T.equal(D.requirementName(cat, "unit", 0, doc), "Rifleman");
  });

  T.test("unit labels: renaming a unit changes only labels, and the labels of its entries", function () {
    var cat = T.catalog("starcraft");
    var doc = D.setUnitName(D.create("starcraft"), cat, 7, "  Worker ");
    T.equal(doc.labels, { units: { "7": "Worker" } }, "trimmed");
    T.ok(!doc.units, "an unchanged unit gets no entry");
    T.equal(AG.core.validate.check(doc, cat), []);

    doc = D.setUnitField(doc, cat, 7, "button_set", 5);
    T.equal(doc.units, [{ id: 7, label: "Worker", button_set: 5 }], "a new entry is labelled with the mod's name");
    doc = D.setUnitName(doc, cat, 7, "Peon");
    T.equal(doc.units, [{ id: 7, label: "Peon", button_set: 5 }], "renaming changes the entry's label");
    doc = D.setUnitName(doc, cat, 7, "Terran SCV");
    T.ok(!doc.labels, "the catalog's name removes the mod's, and empty labels objects go");
    T.equal(doc.units, [{ id: 7, label: "Terran SCV", button_set: 5 }]);

    var named = D.setUnitName(doc, cat, 7, "Peon");
    T.ok(D.setUnitName(named, cat, 7, "Peon") === named, "the same name changes nothing");
    T.equal(D.revertUnit(named, cat, 7).labels, { units: { "7": "Peon" } }, "reverting the unit keeps its name");
    T.equal(D.setUnitName(named, cat, 7, "").labels, undefined, "empty text removes the name");
  });

  T.test("unit labels: the labels of a unit's requirement record follow its name, and other entries are left alone", function () {
    var cat = T.catalog("starcraft");
    var doc = D.setRequirement(D.create("starcraft"), cat, "unit", 0, []);
    doc = D.setUnitField(doc, cat, 0, "button_set", 5);
    doc = D.setUnitField(doc, cat, 5, "button_set", 7);
    doc = D.setUnitName(doc, cat, 0, "Rifleman");
    T.equal(doc.requirements[0].label, "Rifleman");
    T.equal(doc.units.map(function (e) {
      return e.label;
    }), ["Rifleman", "Terran Siege Tank"]);
    T.equal(D.setRequirement(D.create("starcraft"), cat, "unit", 5, [111]).requirements[0].label, "Terran Siege Tank");
    T.equal(D.setRequirement(mod({ labels: { units: { "5": "Tank" } } }), cat, "unit", 5, [111]).requirements[0].label, "Tank", "a new record is labelled with the mod's name");
  });

  T.test("unit labels: other units' labels are kept, in ID order when saved", function () {
    var cat = T.catalog("starcraft");
    var doc = D.setUnitName(D.create("starcraft"), cat, 32, "Flamer");
    doc = D.setUnitName(doc, cat, 5, "Tank");
    doc = D.setUnitName(doc, cat, 0, "Rifleman");
    var text = AG.core.serialize(doc, cat);
    var saved = JSON.parse(text);
    T.equal(Object.keys(saved), ["patcher", "format", "game", "mod", "labels"], "labels come after the mod's information");
    T.equal(Object.keys(saved.labels.units), ["0", "5", "32"]);
    T.equal(D.setUnitName(doc, cat, 5, "").labels, { units: { "0": "Rifleman", "32": "Flamer" } });
  });

  T.test("unit labels: wrong labels are only warnings, since the patcher ignores them", function () {
    var cat = T.catalog("starcraft");
    function check(labels) {
      return AG.core.validate.check(mod({ labels: labels }), cat).map(function (p) {
        return p.severity + " " + p.path;
      });
    }
    T.equal(check({ units: { "0": "Rifleman", "33": "Unnamed entry" } }), [], "an entry the catalog doesn't name can be named");
    T.equal(check([]), ["warning labels"]);
    T.equal(check({ units: 5 }), ["warning labels.units"]);
    T.equal(check({ upgrades: {}, button_sets: {}, techs: {}, orders: {}, constants: {} }), [], "every kind that can be named");
    T.equal(check({ requirements: {} }), ["warning labels.requirements"], "requirements are named by their items");
    T.equal(check({ units: { "-1": "a", "1.5": "b", "007": "c", x: "d", "9999": "e", "0": 5 } }).sort(), ["warning labels.units.-1", "warning labels.units.0", "warning labels.units.007", "warning labels.units.1.5", "warning labels.units.9999", "warning labels.units.x"]);
  });

  // ---- Other items' labels

  T.test("item labels: sets, upgrades, techs, orders and constants are named from labels, falling back to the catalog", function () {
    var cat = T.catalog("starcraft");
    var doc = mod({ labels: { button_sets: { "5": "Tanks", "250": "Builders" }, upgrades: { "0": "Plating" }, techs: { "5": "Siege" }, orders: { "0": "Halt" }, constants: { max_supply: "Supply cap" } } });
    T.equal(D.itemName(cat, "set", 5, doc), "Tanks");
    T.equal(D.itemName(cat, "upgrade", 0, doc), "Plating");
    T.equal(D.itemName(cat, "tech", 5, doc), "Siege");
    T.equal(D.itemName(cat, "order", 0, doc), "Halt");
    T.equal(D.itemName(cat, "constant", "max_supply", doc), "Supply cap");
    T.equal(D.itemName(cat, "constant", "max_supply"), "Maximum supply");
    T.equal(D.requirementName(cat, "tech_research", 5, doc), "Siege", "a tech's research and use records share its name");
    T.equal(D.requirementName(cat, "tech_use", 5, doc), "Siege");
    T.equal(D.setText(cat, 250, doc), "250 Builders");
    T.equal(D.setText(cat, 251, doc), "Set 251", "a set with no name");
    T.equal(D.setText(cat, 5, mod({})), "5 Siege Tank");
  });

  T.test("item labels: renaming changes labels and the labels of the item's entries, and nothing else", function () {
    var cat = T.catalog("starcraft");
    var doc = D.setButtons(D.create("starcraft"), cat, 5, [MOVE]);
    doc = D.setRequirement(doc, cat, "tech_research", 5, [111]);
    doc = D.setRequirement(doc, cat, "tech_use", 5, ["current_unit_is", 5]);
    doc = D.setRequirement(doc, cat, "upgrade", 5, [111]);
    doc = D.setConstant(doc, cat, "max_supply", 800);

    var named = D.setItemName(doc, cat, "set", 5, "Tanks");
    T.equal(named.labels, { button_sets: { "5": "Tanks" } });
    T.equal(named.button_sets[0].label, "Tanks");

    var before = named;
    named = D.setItemName(named, cat, "tech", 5, "Siege");
    T.equal(named.requirements.slice(0, 2).map(function (e) {
      return e.type + " " + e.label;
    }), ["tech_research Siege", "tech_use Siege"], "both tech records");
    T.ok(named.requirements[2] === before.requirements[2], "not the upgrade with the same ID");

    named = D.setItemName(named, cat, "constant", "max_supply", " Supply cap ");
    T.equal(named.constants[0], { name: "max_supply", label: "Supply cap", value: 800 });
    T.equal(Object.keys(named.labels), ["button_sets", "techs", "constants"]);
    T.equal(AG.core.validate.check(named, cat), []);

    var back = D.setItemName(named, cat, "tech", 5, "");
    T.equal(back.labels.techs, undefined);
    T.equal(back.requirements[0].label, D.itemName(cat, "tech", 5), "back to the catalog's name");
    T.ok(D.setItemName(named, cat, "set", 5, "Tanks") === named, "the same name changes nothing");
  });

  T.test("item labels: a new set has no name until given one, and loses it when removed", function () {
    var cat = T.catalog("starcraft");
    var added = D.addSet(D.create("starcraft"), cat);
    var doc = D.setItemName(added.doc, cat, "set", added.id, "Builders");
    T.equal(doc.button_sets, [{ id: added.id, label: "Builders", buttons: [] }]);
    doc = D.setItemName(doc, cat, "set", added.id, "");
    T.equal(doc.button_sets, [{ id: added.id, buttons: [] }], "an unnamed new set has no label");
    doc = D.setItemName(doc, cat, "set", added.id, "Builders");
    T.ok(!D.revertSet(doc, cat, added.id).labels, "removing the set removes its name");
    T.equal(D.revertSet(D.setItemName(D.setButtons(D.create("starcraft"), cat, 5, [MOVE]), cat, "set", 5, "Tanks"), cat, 5).labels, { button_sets: { "5": "Tanks" } }, "reverting an original set keeps its name");
  });

  T.test("item labels: wrong labels of each kind are warnings", function () {
    var cat = T.catalog("starcraft");
    function check(labels) {
      return AG.core.validate.check(mod({ labels: labels }), cat).map(function (p) {
        return p.severity + " " + p.path;
      });
    }
    T.equal(check({ button_sets: { "5": "a", "250": "b" }, upgrades: { "0": "c" }, techs: { "0": "d" }, orders: { "0": "e" }, constants: { max_supply: "f" } }), []);
    T.equal(check({ button_sets: { "99999": "a", x: "b" } }).sort(), ["warning labels.button_sets.99999", "warning labels.button_sets.x"]);
    T.equal(check({ upgrades: { "-1": "a", "9999": "b", "0": 5 } }).sort(), ["warning labels.upgrades.-1", "warning labels.upgrades.0", "warning labels.upgrades.9999"]);
    T.equal(check({ constants: { no_such_constant: "a" } }), ["warning labels.constants.no_such_constant"]);
    T.equal(check({ techs: [] }), ["warning labels.techs"]);
  });
})(AxeGraft);
