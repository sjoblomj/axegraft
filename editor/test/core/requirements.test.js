// Requirement lists as rows.
"use strict";

(function (AG) {
  var T = AG.testing;
  var R = AG.core.requirements;

  function samples() {
    return AG.core.catalog.registry.registered
      .filter(function (r) {
        return r.raw.game === "starcraft";
      })
      .map(function (r) {
        return AG.core.catalog.index(JSON.parse(JSON.stringify(r.raw)));
      })[0];
  }

  T.test("requirement rows: every record in the sample catalog converts to rows and back unchanged", function () {
    var cat = samples();
    var n = 0;
    cat.requirements.forEach(function (r) {
      [r.original["default"]].concat(Object.keys(r.original.perVersion || {}).map(function (v) {
        return r.original.perVersion[v];
      })).forEach(function (list) {
        if (!list) return;
        T.equal(R.toList(R.toRows(cat, list)), list, r.type + " " + r.id);
        n++;
      });
    });
    T.ok(n >= 10, "checked " + n + " records");
  });

  T.test("requirement rows: an opcode and its parameter share a row; a bare unit is its own row", function () {
    var cat = T.catalog("starcraft");
    T.equal(R.toRows(cat, ["current_unit_is", 106, "not_lifted_off"]), [
      { kind: "op", op: "current_unit_is", param: 106, at: 0 },
      { kind: "op", op: "not_lifted_off", at: 2 }
    ]);
    T.equal(R.toRows(cat, [132, "or", "must_have", 133]), [
      { kind: "unit", unit: 132, at: 0 },
      { kind: "op", op: "or", at: 1 },
      { kind: "op", op: "must_have", param: 133, at: 2 }
    ]);
  });

  T.test("requirement rows: or sublists and upgrade levels, from the Zerg Carapace record, convert unchanged and show their structure", function () {
    var cat = T.catalog("starcraft");
    var list = cat.requirements.get("upgrade:3").original["default"];
    var rows = R.toRows(cat, list);
    T.equal(R.toList(rows), list);
    var s = R.structure(cat, rows);
    T.equal(
      rows.map(function (r, i) {
        return (r.kind === "unit" ? r.unit : r.op) + ":" + (s[i].level || "-") + (s[i].alternative ? ":alt" : "");
      }),
      [
        "current_unit_is:-",
        "not_training_or_morphing:-",
        "upgrade_level_1:upgrade_level_1",
        "end_sublist:upgrade_level_1",
        "upgrade_level_2:upgrade_level_2",
        "132:upgrade_level_2:alt",
        "or:upgrade_level_2",
        "must_have:upgrade_level_2:alt",
        "end_sublist:upgrade_level_2",
        "upgrade_level_3:upgrade_level_3",
        "133:upgrade_level_3"
      ]
    );
  });

  T.test("requirement rows: lists with problems still convert unchanged", function () {
    var cat = T.catalog("starcraft");
    [
      ["current_unit_is"],
      ["current_unit_is", "or"],
      ["or", "or", 5, 5],
      ["mystery", 3, "must_have", "end_sublist"],
      [1.5, -3, "current_unit_is", 99999]
    ].forEach(function (list) {
      T.equal(R.toList(R.toRows(cat, list)), list, JSON.stringify(list));
    });
  });

  T.test("requirement rows: problems are attached to the rows they're about", function () {
    var cat = T.catalog("starcraft");
    var rows = R.toRows(cat, ["current_unit_is", 111, "or"]);
    T.equal(R.rowProblems(cat, "unit", rows), [[], ["or can't end a list or level."]]);
    var missing = R.toRows(cat, ["current_unit_is", "not_lifted_off"]);
    T.equal(R.rowProblems(cat, "unit", missing)[0], ["current_unit_is needs a unit after it."]);
  });
})(AxeGraft);
