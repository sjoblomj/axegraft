// The mod document: edits, effective values, and removing what matches the
// original.
"use strict";

(function (AG) {
  var T = AG.testing;
  var D = AG.core.doc;

  function sc() {
    return T.catalog("starcraft");
  }

  var MOVE = { position: 1, icon: 228, condition: "always", action: "move", enabled_string: 664, disabled_string: 0 };

  T.test("document: a new mod changes nothing", function () {
    var doc = D.create("starcraft");
    T.equal(doc, { patcher: "AxeGraft", format: 1, game: "starcraft", mod: { name: "", version: "", authors: [] } });
    T.ok(D.isEmpty(doc));
  });

  T.test("document: edits never change the document they're given", function () {
    var cat = sc();
    var doc = AG.util.freeze(D.setUnitField(D.create("starcraft"), cat, 0, "button_set", 5));
    var next = D.setUnitField(doc, cat, 0, "display_function", "draw_none");
    T.equal(doc.units, [{ id: 0, label: "Terran Marine", button_set: 5 }]);
    T.equal(next.units, [{ id: 0, label: "Terran Marine", button_set: 5, display_function: "draw_none" }]);
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
    var doc = D.setUnitField(D.create("starcraft"), cat, 0, "display_function", "draw_none");
    T.equal(doc.units, [{ id: 0, label: "Terran Marine", display_function: "draw_none" }]);
    var eff = D.effectiveUnit(doc, cat, 0);
    T.equal(eff.display_function, { value: "draw_none", original: "draw_unit", hasOriginal: true, changed: true, path: "units[0].display_function" });
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
    T.equal(D.setRequirement(req, cat, "unit", 0, ["current_unit_is", 111, "is_not_lifted_off"]), D.create("starcraft"));

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

  // StarCraft's fixture with set 7's original different on 1.07: MOVE there,
  // its usual button elsewhere.
  function perVersionCatalog() {
    var raw = T.rawCatalog("starcraft");
    raw.buttonSets[2].original = { "default": raw.buttonSets[2].original, perVersion: { "1.07": [MOVE] } };
    return AG.core.catalog.index(raw, "per-version");
  }

  T.test("original buttons by version: each version's own list, or the default", function () {
    var cat = perVersionCatalog();
    var usual = cat.setOriginals.get(7)["default"];
    T.equal(D.originalButtons(cat, 7, "1.07"), [MOVE]);
    T.equal(D.originalButtons(cat, 7, "1.12"), usual);
    T.equal(D.originalButtons(cat, 7, null), usual, "no version gives the default");
    T.equal(D.originalButtonsByVersion(cat, 7), { "1.07": [MOVE], "1.12": usual, "1.16.1": usual });
    T.equal(D.originalButtons(cat, 250, "1.07"), null, "a new set has no original");
    var eff = D.effectiveButtons(D.create("starcraft"), cat, 7);
    T.equal(eff.buttons, usual);
    T.equal(eff.original, usual);
    T.equal(eff.originals, { "1.07": [MOVE], "1.12": usual, "1.16.1": usual });
    T.equal(eff.differsOn, []);
  });

  T.test("aligning lists side by side: equal buttons share a row, an extra one gets its own, a changed one at the same position pairs up", function () {
    var cat = T.catalog("warcraft2");
    function btn(p, icon, cond) {
      return { position: p, icon: icon, condition: cond || "w2_always", action: "w2_move", string: 400, highlighted: 0 };
    }
    var dos = [btn(0, 1), btn(1, 2), btn(8, 9)];
    var bne = [btn(0, 1), btn(1, 2, "w2_has_upgrade"), btn(3, 4), btn(8, 9)];
    var rows = D.alignButtons(cat, [dos, bne]);
    T.equal(
      rows.map(function (r) {
        return [r.state, r.cells.map(function (c) {
          return c ? c.icon : null;
        })];
      }),
      [["same", [1, 1]], ["changed", [2, 2]], ["partial", [null, 4]], ["same", [9, 9]]]
    );
    T.equal(D.alignButtons(cat, [dos]).length, 3, "one list is its own rows");
    T.equal(
      D.alignButtons(cat, [[btn(0, 1)], [], [btn(0, 1)]]).map(function (r) {
        return r.state;
      }),
      ["partial"]
    );
  });

  T.test("only differences are saved: a set edited to one version's original stays defined", function () {
    var cat = perVersionCatalog();
    var usual = cat.setOriginals.get(7)["default"];
    var doc = D.setButtons(D.create("starcraft"), cat, 7, usual);
    T.equal(doc.button_sets, [{ id: 7, label: "SCV", buttons: usual }]);
    T.equal(D.effectiveButtons(doc, cat, 7).differsOn, ["1.07"]);
    doc = D.setButtons(D.create("starcraft"), cat, 7, [MOVE]);
    T.equal(doc.button_sets.length, 1, "matching only 1.07 stays too");
    T.equal(D.effectiveButtons(doc, cat, 7).differsOn, ["1.12", "1.16.1"]);
    T.equal(D.revertSet(doc, cat, 7), D.create("starcraft"), "reverting removes it, so each version keeps its own");
  });

  T.test("only differences are saved: an opened file's set is dropped only if it matches every version", function () {
    var cat = perVersionCatalog();
    var opened = {
      patcher: "AxeGraft",
      format: 1,
      game: "starcraft",
      mod: { name: "", version: "", authors: [] },
      button_sets: [{ id: 5, buttons: cat.sets.get(5).original }, { id: 7, buttons: cat.setOriginals.get(7)["default"] }]
    };
    T.equal(D.normalize(opened, cat).button_sets, [{ id: 7, buttons: cat.setOriginals.get(7)["default"] }]);
  });

  T.test("sorting by position: a stable sort, as one change that undo takes back", function () {
    var cat = T.catalog("warcraft2");
    function btn(p, icon) {
      return { position: p, icon: icon, condition: "w2_always", action: "w2_move", string: 400, highlighted: 0 };
    }
    var doc = D.setButtons(D.create("warcraft2"), cat, 0, [btn(5, 1), btn(1, 2), btn(1, 3), btn(3, 4)]);
    var h = AG.core.history.create(doc);
    var sorted = D.sortButtons(doc, cat, 0);
    h = AG.core.history.push(h, sorted);
    T.equal(
      D.effectiveButtons(sorted, cat, 0).buttons.map(function (b) {
        return [b.position, b.icon];
      }),
      [[1, 2], [1, 3], [3, 4], [5, 1]],
      "the two at position 1 keep their order"
    );
    T.equal(sorted.button_sets[0].label, "Footman", "the entry keeps its label");
    T.equal(AG.core.history.undo(h).present, doc);
    T.equal(D.sortButtons(sorted, cat, 0), sorted, "sorting a sorted set changes nothing");
  });

  // ---- Moving buttons between positions

  function w2(p, icon) {
    return { position: p, icon: icon, condition: "w2_always", action: "w2_move", string: 400, highlighted: 0 };
  }
  function shape(list) {
    return list.map(function (b) {
      return [b.position, b.icon];
    });
  }

  T.test("moving buttons: a button whose position changes moves to its place in the list, and no other button changes", function () {
    var cat = T.catalog("warcraft2");
    var list = AG.util.freeze([w2(1, 10), w2(3, 11), w2(5, 12)]);
    var r = D.moveButtonTo(cat, list, 2, 2);
    T.equal(shape(r.buttons), [[1, 10], [2, 12], [3, 11]]);
    T.equal(r.index, 1);
    T.ok(r.buttons[0] === list[0] && r.buttons[2] === list[1], "the other buttons are the same objects");
    var later = D.moveButtonTo(cat, list, 0, 4);
    T.equal(shape(later.buttons), [[3, 11], [4, 10], [5, 12]]);
    T.equal(later.index, 1);
  });

  T.test("moving buttons: a button moved onto a filled position joins the buttons there, last", function () {
    var cat = T.catalog("warcraft2");
    var r = D.moveButtonTo(cat, [w2(1, 10), w2(3, 11), w2(3, 12), w2(5, 13)], 0, 3);
    T.equal(shape(r.buttons), [[3, 11], [3, 12], [3, 10], [5, 13]]);
    T.equal(r.index, 2);
  });

  T.test("paired originals: a button equal to an original is unchanged, and others pair by position", function () {
    var cat = T.catalog("starcraft");
    var orig = cat.sets.get(0).original;
    var added = Object.assign({}, orig[0], { position: 2, icon: 99 });
    var changed = Object.assign({}, orig[1], { icon: 5 });
    var p = D.pairedOriginals(cat, 0, [orig[0], added, changed]);
    T.equal(p.map(function (x) {
      return x.unchanged;
    }), [true, false, false]);
    T.ok(p[0].original === orig[0], "the first pairs with the original at position 1");
    T.equal(p[1].original, null, "nothing is originally at position 2, so it's new");
    T.ok(p[2].original === orig[1], "the changed one pairs with the original at its position, not its index");
  });

  T.test("moving buttons: StarCraft keeps ascending positions too", function () {
    var cat = T.catalog("starcraft");
    var b = function (p) {
      return { position: p, icon: p, condition: "always", action: "move", enabled_string: 0, disabled_string: 0 };
    };
    var r = D.moveButtonTo(cat, [b(1), b(3), b(5)], 2, 2);
    T.equal(r.buttons.map(function (x) {
      return x.position;
    }), [1, 2, 3]);
    T.equal(r.index, 1);
  });

  T.test("moving buttons: a push moves the buttons from that position up to the first empty one, one position on", function () {
    var cat = T.catalog("warcraft2");
    var list = AG.util.freeze([w2(0, 10), w2(1, 11), w2(2, 12), w2(2, 13), w2(4, 14), w2(6, 15)]);
    T.equal(D.pushedPositions(cat, list, 5, 1), [1, 2]);
    var r = D.pushButtonTo(cat, list, 5, 1);
    T.equal(shape(r.buttons), [[0, 10], [1, 15], [2, 11], [3, 12], [3, 13], [4, 14]], "both buttons at 2 move, and 4 stays, as 3 was empty");
    T.equal(r.index, 1);
    T.equal(D.pushedPositions(cat, list, 5, 3), [], "into an empty position, nothing is pushed");
    T.equal(shape(D.pushButtonTo(cat, list, 5, 3).buttons), [[0, 10], [1, 11], [2, 12], [2, 13], [3, 15], [4, 14]]);
  });

  T.test("moving buttons: the position a pushed button leaves counts as empty", function () {
    var cat = T.catalog("warcraft2");
    var list = [w2(0, 10), w2(1, 11), w2(2, 12)];
    T.equal(D.pushedPositions(cat, list, 2, 1), [1]);
    T.equal(shape(D.pushButtonTo(cat, list, 2, 1).buttons), [[0, 10], [1, 12], [2, 11]]);
    T.equal(shape(D.pushButtonTo(cat, list, 1, 1).buttons), shape(list), "pushing a button into its own position changes nothing");
  });

  T.test("moving buttons: with no empty position, the last position's buttons stay and are joined by those before them", function () {
    var cat = T.catalog("warcraft2");
    var list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8].map(function (p, i) {
      return w2(p, 10 + i);
    });
    T.equal(D.pushedPositions(cat, list, 9, 2), [2, 3, 4, 5, 6, 7]);
    var r = D.pushButtonTo(cat, list, 9, 2);
    T.equal(shape(r.buttons), [[0, 10], [1, 11], [2, 19], [3, 12], [4, 13], [5, 14], [6, 15], [7, 16], [8, 17], [8, 18]]);
    T.equal(r.index, 2);
  });

  T.test("dropping in the list: onto a button joins its position, last", function () {
    var cat = T.catalog("warcraft2");
    var r = D.dropInList(cat, [w2(0, 10), w2(1, 11), w2(2, 12), w2(4, 13)], 3, { on: 1 });
    T.equal(shape(r.buttons), [[0, 10], [1, 11], [1, 13], [2, 12]]);
    T.equal(r.index, 2);
    T.equal(r.pushed, []);
    T.equal(D.dropInList(cat, [w2(0, 10), w2(1, 11)], 1, { on: 1 }), null, "onto itself changes nothing");
  });

  T.test("dropping in the list: between two buttons takes the second's position and pushes, as in the preview", function () {
    var cat = T.catalog("warcraft2");
    var list = [w2(0, 10), w2(1, 11), w2(2, 12), w2(4, 13)];
    var r = D.dropInList(cat, list, 3, { before: 1 });
    T.equal(shape(r.buttons), [[0, 10], [1, 13], [2, 11], [3, 12]]);
    T.equal(r.index, 1);
    T.equal(r.pushed, [1, 2]);
    T.equal(shape(D.dropInList(cat, list, 3, { before: 0 }).buttons), [[0, 13], [1, 10], [2, 11], [3, 12]], "before the first");
    T.equal(shape(D.dropInList(cat, list, 0, { before: 4 }).buttons), [[1, 11], [2, 12], [4, 13], [5, 10]], "after the last, the position after it");
  });

  T.test("dropping in the list: next to itself, or among buttons it can join without pushing, it only moves in the list", function () {
    var cat = T.catalog("warcraft2");
    var list = [w2(0, 10), w2(1, 11), w2(1, 12), w2(2, 13)];
    T.equal(D.dropInList(cat, list, 1, { before: 1 }), null);
    T.equal(D.dropInList(cat, list, 1, { before: 2 }), null);
    var r = D.dropInList(cat, list, 1, { before: 3 });
    T.equal(shape(r.buttons), [[0, 10], [1, 12], [1, 11], [2, 13]], "within its position");
    T.equal(r.pushed, []);
    T.equal(shape(D.dropInList(cat, list, 0, { before: 2 }).buttons), [[1, 11], [1, 10], [1, 12], [2, 13]], "between two sharing a position, it joins them");
    T.equal(D.dropInList(cat, list, 0, { before: 1 }), null, "just below itself changes nothing");
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
      units: [{ id: 0, label: "Mine", button_set: 0, display_function: "draw_none" }, { id: 32, button_set: 0 }],
      button_sets: [{ id: 5, buttons: cat.sets.get(5).original }, { id: 7, buttons: [Object.assign({ condition_variable: 0 }, MOVE)] }],
      requirements: [{ type: "unit", id: 0, list: ["current_unit_is", 111, "is_not_lifted_off"] }, { type: "unit", id: 4, list: [] }],
      constants: [{ name: "max_supply", value: 400 }, { name: "web_duration", value: 360 }, { name: "team_multiplier", value: 400 }]
    };
    var doc = D.normalize(opened, cat);
    T.equal(doc.units, [{ id: 0, label: "Mine", display_function: "draw_none" }]);
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
      mod: { name: "", version: "", authors: [] },
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
    var o = cat.sets.get(5).original;
    T.equal(D.effectiveButtons(doc, cat, 5), {
      buttons: o,
      original: o,
      originals: { "1.07": o, "1.12": o, "1.16.1": o },
      differsOn: [],
      defined: false,
      isNew: false,
      path: null
    });
    T.equal(doc.button_sets, undefined);
  });

  T.test("reverting: a whole unit, a record and a constant", function () {
    var cat = sc();
    var doc = D.setUnitField(D.create("starcraft"), cat, 0, "button_set", 5);
    doc = D.setUnitField(doc, cat, 0, "display_function", "draw_none");
    T.equal(D.revertUnit(doc, cat, 0).units, undefined);
    var r = D.setRequirement(doc, cat, "upgrade", 3, []);
    T.equal(D.revertRequirement(r, cat, "upgrade", 3), doc);
    var c = D.setConstant(doc, cat, "max_supply", 2);
    T.equal(D.revertConstant(c, cat, "max_supply"), doc);
  });

  T.test("document: effective values for a button card that isn't a unit", function () {
    var cat = sc();
    T.equal(Object.keys(D.effectiveUnit(D.create("starcraft"), cat, 238)), ["button_set"]);
    T.equal(D.effectiveUnit(D.create("starcraft"), cat, 238).button_set.value, 238);
  });

  T.test("document: new sets take the lowest unused ID", function () {
    var cat = sc();
    var a = D.addSet(D.create("starcraft"), cat);
    T.equal(a.id, 250);
    T.equal(a.doc.button_sets, [{ id: 250, buttons: [] }]);
    var b = D.addSet(a.doc, cat);
    T.equal(b.id, 251);
    var c = D.addSet(D.revertSet(b.doc, cat, 250), cat);
    T.equal(c.id, 250, "a freed ID is used again");
  });

  T.test("document: removing an entry by its path", function () {
    var doc = { patcher: "AxeGraft", format: 1, game: "starcraft", units: [{ id: 300, button_set: 0 }, { id: 0, button_set: 5 }] };
    T.equal(D.removeEntry(doc, "units[0]").units, [{ id: 0, button_set: 5 }]);
    T.equal(D.removeEntry(D.removeEntry(doc, "units[0].id"), "units[0]").units, undefined);
  });
})(AxeGraft);
