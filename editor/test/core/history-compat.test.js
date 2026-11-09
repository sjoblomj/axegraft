// Undo and redo over documents, and the version compatibility calculation.
"use strict";

(function (AG) {
  var T = AG.testing;
  var D = AG.core.doc;
  var H = AG.core.history;
  var C = AG.core.compat;

  var MOVE = { position: 1, icon: 228, condition: "always", action: "move", enabled_string: 664, disabled_string: 0 };

  T.test("undo across tabs: undoing a unit change and a constant change restores the earlier mod", function () {
    var cat = T.catalog("starcraft");
    var start = D.setButtons(D.create("starcraft"), cat, 7, []);
    var h = H.create(start);
    h = H.push(h, D.setUnitField(h.present, cat, 0, "button_set", 5));
    h = H.push(h, D.setConstant(h.present, cat, "max_supply", 800));
    T.ok(H.canUndo(h) && !H.canRedo(h));
    h = H.undo(H.undo(h));
    T.equal(h.present, start);
    T.ok(!H.canUndo(h));
    h = H.redo(h);
    T.equal(h.present.units, [{ id: 0, label: "Terran Marine", button_set: 5 }]);
    T.equal(h.present.constants, undefined);
    h = H.redo(h);
    T.equal(h.present.constants.length, 1);
  });

  T.test("undo: a new change clears what could be redone, and an edit that changes nothing isn't recorded", function () {
    var cat = T.catalog("starcraft");
    var h = H.create(D.create("starcraft"));
    h = H.push(h, D.setConstant(h.present, cat, "max_supply", 1));
    h = H.undo(h);
    h = H.push(h, D.setConstant(h.present, cat, "max_supply", 2));
    T.ok(!H.canRedo(h));
    var before = h;
    h = H.push(h, D.setConstant(h.present, cat, "max_supply", 2));
    T.ok(h === before, "no change, no new step");
    T.ok(H.undo(H.create(D.create("starcraft"))).present !== undefined, "undo with nothing to undo is harmless");
  });

  T.test("undo: the history is bounded", function () {
    var cat = T.catalog("starcraft");
    var h = H.create(D.create("starcraft"), 5);
    for (var i = 1; i <= 8; i++) h = H.push(h, D.setConstant(h.present, cat, "max_supply", i));
    T.equal(h.past.length, 5);
    for (i = 0; i < 10; i++) h = H.undo(h);
    T.equal(h.present.constants[0].value, 3, "the oldest steps were dropped");
  });

  function results(r) {
    return r.map(function (x) {
      return x.version + ":" + x.result;
    });
  }

  T.test("version compatibility: a mod using only common content applies on every version", function () {
    var cat = T.catalog("starcraft");
    var doc = D.setButtons(D.setUnitField(D.create("starcraft"), cat, 0, "button_set", 5), cat, 5, [MOVE]);
    doc = D.setConstant(doc, cat, "max_supply", 600);
    T.equal(results(C.report(doc, cat)), ["1.07:applies", "1.12:applies", "1.16.1:applies"]);
    T.equal(C.summary(C.report(doc, cat)), "Applies on all 3 versions");
    T.equal(C.warnings(doc, cat), []);
  });

  T.test("version compatibility: a set absent on older versions rejects them, naming the set, with a warning", function () {
    var cat = T.catalog("starcraft");
    var doc = D.setButtons(D.create("starcraft"), cat, 232, [MOVE]);
    var r = C.report(doc, cat);
    T.equal(results(r), ["1.07:rejected", "1.12:applies", "1.16.1:applies"]);
    T.equal(r[0].causes, [{ path: "button_sets[0].id", message: "1.07 has no set 232." }]);
    var w = C.warnings(doc, cat);
    T.equal(w.length, 1);
    T.equal(w[0].path, "button_sets[0].id");
    T.equal(w[0].severity, "warning");
    T.ok(/set 232 isn't in 1\.07/i.test(w[0].message), w[0].message);
    T.equal(C.summary(r), "2 apply, 1 reject");
  });

  T.test("version compatibility: a set named by a unit's button_set, and the button card itself", function () {
    var cat = T.catalog("starcraft");
    var doc = D.setUnitField(D.create("starcraft"), cat, 0, "button_set", 232);
    T.equal(C.report(doc, cat)[0].causes, [{ path: "units[0].button_set", message: "1.07 has no set 232." }]);
    var entry = D.setUnitField(D.create("starcraft"), cat, 232, "button_set", 0);
    T.equal(C.report(entry, cat)[0].causes, [{ path: "units[0].id", message: "1.07 has no button card 232." }]);
  });

  T.test("version compatibility: a function a version lacks rejects it, naming the function and button", function () {
    var cat = T.catalog("starcraft");
    var doc = D.setButtons(D.create("starcraft"), cat, 0, [Object.assign({}, MOVE, { condition: "is_watching_replay" })]);
    var r = C.report(doc, cat);
    T.equal(results(r), ["1.07:rejected", "1.12:applies", "1.16.1:applies"]);
    T.equal(r[0].causes[0].message, "1.07 has no condition is_watching_replay in button 0 of set 0.");
    T.equal(C.warnings(doc, cat)[0].path, "button_sets[0].buttons[0].condition");
  });

  T.test("version compatibility: a button card named by an action variable", function () {
    var cat = T.catalog("starcraft");
    var doc = D.setButtons(D.create("starcraft"), cat, 0, [Object.assign({}, MOVE, { action: "show_button_card", action_variable: 232 })]);
    var r = C.report(doc, cat);
    T.equal(r[0].causes, [{ path: "button_sets[0].buttons[0].action_variable", message: "1.07 has no button card 232 in button 0 of set 0." }]);
    // A variable that isn't a button card doesn't count.
    var other = D.setButtons(D.create("starcraft"), cat, 0, [Object.assign({}, MOVE, { action: "cancel_train", action_variable: 232 })]);
    T.equal(results(C.report(other, cat)), ["1.07:applies", "1.12:applies", "1.16.1:applies"]);
  });

  T.test("version compatibility: unknown or inapplicable constants are skipped, not rejected", function () {
    var cat = T.catalog("starcraft");
    var doc = D.setConstant(D.create("starcraft"), cat, "team_multiplier", 600);
    var r = C.report(doc, cat);
    T.equal(results(r), ["1.07:skipped", "1.12:skipped", "1.16.1:applies"]);
    T.equal(r[0].skipped[0].reason, "not_applicable");
    T.equal(r[1].skipped[0].reason, "unknown");
    T.equal(C.warnings(doc, cat), [], "skips don't need a warning");
  });

  T.test("version compatibility: results don't make a mod invalid", function () {
    var cat = T.catalog("starcraft");
    var doc = D.setButtons(D.create("starcraft"), cat, 232, [Object.assign({}, MOVE, { condition: "is_watching_replay" })]);
    var problems = AG.core.problems(doc, cat);
    T.ok(problems.length === 2 && problems.every(function (p) {
      return p.severity === "warning";
    }), JSON.stringify(problems));
  });

  T.test("version compatibility: versions are listed as ranges", function () {
    var cat = AG.core.catalog.index(JSON.parse(JSON.stringify(AG.core.catalog.registry.registered.filter(function (r) {
      return r.raw.game === "starcraft";
    })[0].raw)));
    T.equal(C.versionText(cat, ["1.05", "1.06", "1.07", "1.08", "1.10"]), "1.05–1.08, 1.10");
    T.equal(C.versionText(cat, ["1.17"]), "1.17");
  });
})(AxeGraft);
