// The Requirements and Constants tabs, and the version report.
"use strict";

(function (AG) {
  var T = AG.testing;
  var U = T.ui;
  var D = AG.core.doc;

  function start(ctx, options) {
    return U.start(ctx, options).then(function (app) {
      return app.newMod("starcraft").then(function () {
        return app;
      });
    });
  }

  function rows(app) {
    return Array.prototype.map.call(app.root.querySelectorAll('.tabpanel [data-field^="req:"] > .req-row, .tabpanel ol[data-field] > .req-row'), function (li) {
      var sel = li.querySelector("select");
      var kind = sel.options[sel.selectedIndex].textContent;
      var param = li.querySelector('input[data-role="id"]');
      return kind + (param ? " " + param.value : "");
    });
  }

  function row(app, i) {
    return U.q(app, '.tabpanel .req-row[data-row="' + i + '"]');
  }

  function list(app, type, id) {
    return D.effectiveRequirement(app.doc(), app.cat(), type, id).list;
  }

  // ---- 7.2

  T.test("copying a record: Copy and Paste under the item list, and Ctrl+C and Ctrl+V, replace the chosen record, of any type", function (ctx) {
    return start(ctx).then(function (app) {
      var cat = app.cat();
      app.select("requirements", "req:unit:0");
      T.equal(U.q(app, '[data-action="req-paste"]').getAttribute("aria-disabled"), "true", "nothing copied yet");
      U.q(app, '[data-action="req-copy"]').click();
      app.select("requirements", "req:tech_use:0");
      U.q(app, '[data-action="req-paste"]').click();
      T.equal(D.effectiveRequirement(app.doc(), cat, "tech_use", 0).list, cat.requirements.get("unit:0").original["default"]);
      app.select("requirements", "req:upgrade:3");
      T.ok(U.key(U.q(app, ".tree"), "c", { ctrlKey: true }).defaultPrevented);
      app.select("requirements", "req:unit:0");
      T.ok(U.key(U.q(app, ".tree"), "v", { metaKey: true }).defaultPrevented);
      T.equal(D.effectiveRequirement(app.doc(), cat, "unit", 0).list, cat.requirements.get("upgrade:3").original["default"]);
    });
  }, { dom: true });

  T.test("copying a record: pasted onto a type that can't use one of its opcodes, the rows are kept and that row shows an error", function (ctx) {
    return start(ctx).then(function (app) {
      var cat = app.cat();
      app.edit(function (d) {
        return D.setRequirement(d, cat, "unit", 0, ["must_have_addon", 107, "is_not_lifted_off"]);
      });
      app.select("requirements", "req:unit:0");
      U.q(app, '[data-action="req-copy"]').click();
      app.select("requirements", "req:tech_use:0");
      U.q(app, '[data-action="req-paste"]').click();
      T.equal(D.effectiveRequirement(app.doc(), cat, "tech_use", 0).list, ["must_have_addon", 107, "is_not_lifted_off"], "pasted whole");
      T.ok(app.errors().some(function (p) {
        return /must_have_addon can't be used in a tech use record/.test(p.message);
      }), JSON.stringify(app.errors()));
      var problem = row(app, 0).querySelector(".row-problem");
      T.ok(problem && /can't be used/.test(problem.textContent), "shown at the row");
      T.ok(!row(app, 1).querySelector(".row-problem"), "not at the row it can use");
    });
  }, { dom: true });

  T.test("record editor: an opcode and its parameter share a row", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("requirements", "req:unit:0");
      T.equal(rows(app), ["Current unit is 111", "Not lifted off"]);
    });
  }, { dom: true });

  T.test("record editor: edited rows are saved as the flat list the mod format defines", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("requirements", "req:unit:0");
      U.change(row(app, 0).querySelector('input[data-role="id"]'), "112");
      U.q(app, '[data-action="add-row"]').click();
      U.change(row(app, 2).querySelector('input[data-role="id"]'), "5");
      row(app, 2).querySelector('[data-action="row-up"]').click();
      T.equal(app.doc().requirements, [{ type: "unit", id: 0, label: "Terran Marine", list: ["current_unit_is", 112, 5, "is_not_lifted_off"] }]);
      row(app, 0).querySelector('[data-action="row-remove"]').click();
      T.equal(list(app, "unit", 0), [5, "is_not_lifted_off"]);
    });
  }, { dom: true });

  T.test("record editor: a lone row has no grip, since there's nowhere to move it", function (ctx) {
    return start(ctx).then(function (app) {
      app.edit(function (d) {
        return D.setRequirement(d, app.cat(), "unit", 0, ["is_not_lifted_off"]);
      });
      app.select("requirements", "req:unit:0");
      T.equal(app.root.querySelectorAll(".tabpanel .req-row").length >= 1, true);
      T.equal(app.root.querySelectorAll(".tabpanel .req-row > .grip").length, 0);
    });
  }, { dom: true });

  T.test("record editor: dragging a row by its grip moves it, keeping its parameter", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("requirements", "req:unit:0");
      T.equal(app.root.querySelectorAll(".tabpanel .req-row > .grip").length, 2, "each row has a grip");
      U.drag(row(app, 1).querySelector(".grip"), row(app, 0));
      T.equal(list(app, "unit", 0), ["is_not_lifted_off", "current_unit_is", 111]);
      U.drag(row(app, 0).querySelector(".grip"), row(app, 1), true);
      T.equal(list(app, "unit", 0), ["current_unit_is", 111, "is_not_lifted_off"]);
      T.equal(app.doc().requirements, undefined, "dragging it back matches the original");
    });
  }, { dom: true });

  T.test("record editor: Up, Down and a trash can are at the right of each row, with no help; Add row has none either", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("requirements", "req:unit:0");
      var r = row(app, 0);
      var tools = r.querySelector(".row-tools");
      T.equal(Array.prototype.map.call(tools.querySelectorAll("button"), function (b) {
        return b.dataset.action;
      }), ["row-up", "row-down", "row-remove"]);
      var remove = tools.querySelector('[data-action="row-remove"]');
      T.ok(remove.querySelector("svg"), "a trash can");
      T.equal(remove.textContent, "", "not the word");
      T.equal(remove.getAttribute("aria-label"), "Remove row 0");
      T.equal(tools.querySelectorAll(".help").length, 0);
      T.equal(U.q(app, '[data-action="add-row"]').parentNode.querySelectorAll(".help").length, 0);
      var sel = r.querySelector("select").getBoundingClientRect();
      var box = r.getBoundingClientRect();
      T.ok(box.right - remove.getBoundingClientRect().right < 12, "at the right of the row");
      T.ok(tools.getBoundingClientRect().left > sel.right, "after the row's fields");
    });
  }, { dom: true });

  T.test("parameters follow their opcode: changing to an opcode that takes a unit shows a unit field, holding the lowest unit ID", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("requirements", "req:unit:0");
      T.ok(!row(app, 1).querySelector('input[data-role="id"]'), "no parameter at first");
      U.change(row(app, 1).querySelector("select"), "Must have");
      var r = row(app, 1);
      T.equal(r.querySelector('input[data-role="id"]').value, "0", "a unit field, holding unit 0");
      T.ok(!r.querySelector(".row-problem"));
      T.equal(list(app, "unit", 0), ["current_unit_is", 111, "must_have", 0]);
      U.change(r.querySelector('input[data-role="id"]'), "133");
      T.equal(list(app, "unit", 0), ["current_unit_is", 111, "must_have", 133]);
      U.change(row(app, 1).querySelector('input[data-role="id"]'), "");
      T.equal(list(app, "unit", 0), ["current_unit_is", 111, "must_have", 133], "clearing the ID box keeps the parameter");
      T.equal(row(app, 1).querySelector('input[data-role="id"]').value, "133");
    });
  }, { dom: true });

  T.test("parameters follow their opcode: a completed-unit row after a changed opcode stays its own row", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("requirements", "req:unit:0");
      U.q(app, '[data-action="add-row"]').click();
      U.change(row(app, 2).querySelector('input[data-role="id"]'), "112");
      U.change(row(app, 1).querySelector("select"), "Must have");
      T.equal(list(app, "unit", 0), ["current_unit_is", 111, "must_have", 0, 112]);
      T.equal(app.root.querySelectorAll(".req-row").length, 3, "three rows");
    });
  }, { dom: true });

  T.test("bare units: a completed-unit row for unit 112 saves the number 112 at that place", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("requirements", "req:unit:0");
      U.q(app, '[data-action="add-row"]').click();
      U.change(row(app, 2).querySelector('input[data-role="id"]'), "112");
      T.equal(list(app, "unit", 0), ["current_unit_is", 111, "is_not_lifted_off", 112]);
    });
  }, { dom: true });

  T.test("bare units: a completed unit and must_have are different kinds of row, and save unchanged", function (ctx) {
    return start(ctx).then(function (app) {
      app.edit(function (d) {
        return D.setRequirement(d, app.cat(), "unit", 43, [132, "or", "must_have", 133]);
      });
      app.select("requirements", "req:unit:43");
      T.equal(rows(app), ["Completed unit 132", "Or", "Must have 133"]);
      // Changing a row's kind and back gives the same list.
      U.change(row(app, 0).querySelector("select"), "Must have");
      T.equal(list(app, "unit", 43), ["must_have", 132, "or", "must_have", 133]);
      U.change(row(app, 0).querySelector("select"), "Completed unit");
      T.equal(list(app, "unit", 43), [132, "or", "must_have", 133]);
    });
  }, { dom: true });

  T.test("opcodes limited by record type: a unit's record doesn't offer level opcodes, an upgrade's does", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("requirements", "req:unit:0");
      var opts = U.texts(app, '.req-row[data-row="0"] select:first-of-type option');
      T.ok(opts.indexOf("Level 1 requires") < 0 && opts.indexOf("End of upgrade level") < 0, opts.join(" | "));
      app.select("requirements", "req:upgrade:3");
      opts = U.texts(app, '.req-row[data-row="0"] select:first-of-type option');
      T.ok(opts.indexOf("Level 1 requires") >= 0 && opts.indexOf("End of upgrade level") >= 0);
    });
  }, { dom: true });

  // ---- 7.3

  T.test("showing structure: an upgrade's level sublists group their rows, and or alternatives are grouped", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("requirements", "req:upgrade:3");
      var cls = Array.prototype.map.call(app.root.querySelectorAll(".tabpanel .req-row"), function (li) {
        return ["level-row", "in-level", "or-row", "alt"].filter(function (c) {
          return li.classList.contains(c);
        }).join("+");
      });
      T.equal(cls, ["", "", "level-row", "in-level", "level-row", "in-level+alt", "in-level+or-row", "in-level+alt", "in-level", "level-row", "in-level"]);
    });
  }, { dom: true });

  T.test("showing structure: a dangling or or an unbalanced sublist marks the row it affects", function (ctx) {
    return start(ctx).then(function (app) {
      app.edit(function (d) {
        return D.setRequirement(d, app.cat(), "upgrade", 3, ["current_unit_is", 139, "or", "end_sublist"]);
      });
      app.select("requirements", "req:upgrade:3");
      T.ok(row(app, 1).classList.contains("has-error") && /can't end/.test(row(app, 1).textContent));
      T.ok(row(app, 2).classList.contains("has-error") && /no level to end/.test(row(app, 2).textContent));
      T.ok(!row(app, 0).classList.contains("has-error"));
      // The problem list leads to the row.
      app.goTo("requirements[0].list[3]");
      T.ok(row(app, 2).contains(document.activeElement));
    });
  }, { dom: true });

  // ---- 7.4

  T.test("records that don't exist originally: adding a row to an item with no record defines it", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("requirements", "req:unit:4");
      T.ok(/has no requirement record/.test(U.q(app, ".tabpanel [data-status]").textContent));
      U.q(app, '[data-action="add-row"]').click();
      T.equal(app.doc().requirements, [{ type: "unit", id: 4, label: "Goliath Turret", list: [0] }]);
    });
  }, { dom: true });

  T.test("records that don't exist originally: removing every row of a record empties it, which removes it from the game", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("requirements", "req:unit:0");
      row(app, 1).querySelector('[data-action="row-remove"]').click();
      row(app, 0).querySelector('[data-action="row-remove"]').click();
      T.equal(app.doc().requirements, [{ type: "unit", id: 0, label: "Terran Marine", list: [] }]);
      T.ok(/empties the record/.test(U.q(app, ".tabpanel [data-status]").textContent));
    });
  }, { dom: true });

  T.test("record replaced whole: changing one row of upgrade 3 saves the whole record", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("requirements", "req:upgrade:3");
      U.change(row(app, 10).querySelector('input[data-role="id"]'), "134");
      var saved = JSON.parse(AG.core.serialize(app.doc(), app.cat())).requirements;
      var whole = app.cat().requirements.get("upgrade:3").original["default"].slice(0, -1).concat([134]);
      T.equal(saved, [{ type: "upgrade", id: 3, label: "Zerg Carapace", list: whole }]);
    });
  }, { dom: true });

  T.test("viewing the original record: both are visible, and the original differs by version where the catalog says", function (ctx) {
    return start(ctx).then(function (app) {
      app.edit(function (d) {
        return D.setRequirement(d, app.cat(), "order", 73, ["current_unit_is", 42]);
      });
      app.select("requirements", "req:order:73");
      U.change(U.q(app, 'input[data-action="show-original"]'), true);
      var original = U.q(app, "[data-original]");
      T.ok(app.root.querySelector(".tabpanel .req-row[data-row]"), "the edited record is still shown");
      T.equal(U.texts(app, "[data-original] h3"), ["1.07–1.12:", "1.16.1:"]);
      T.ok(/Current unit is \(current_unit_is\): 41/.test(original.textContent));
      T.ok(/No requirement record/.test(original.textContent));
    });
  }, { dom: true });

  // ---- 7.5

  function valueField(app) {
    return U.q(app, '.tabpanel [data-field^="const:"]');
  }

  T.test("numeric constants: a value in range is saved; one outside shows an error naming the range", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("constants", "const:max_supply");
      T.ok(/Range 0-65535/.test(valueField(app).textContent));
      U.change(valueField(app).querySelector("input"), "600");
      T.equal(app.doc().constants, [{ name: "max_supply", label: "Maximum supply", value: 600 }]);
      T.equal(valueField(app).querySelector(".changed-mark .tip").textContent, "Value changed. Original: 400");
      U.change(valueField(app).querySelector("input"), "70000");
      T.ok(/0-65535/.test(valueField(app).querySelector(".problem.error").textContent));
    });
  }, { dom: true });

  T.test("stored scale: the catalog's note is shown, and the value is saved as entered", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("constants", "const:web_duration");
      T.equal(valueField(app).querySelector(".note").textContent, "Stored in game frames.");
      U.change(valueField(app).querySelector("input"), "123");
      T.equal(JSON.parse(AG.core.serialize(app.doc(), app.cat())).constants[0].value, 123);
    });
  }, { dom: true });

  T.test("constants that refer to game content: a unit can be chosen by name, and its ID is saved", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("constants", "const:terran_start_building");
      var sel = valueField(app).querySelector('select[data-role="name"]');
      U.change(sel, "7 Terran SCV");
      T.equal(app.doc().constants, [{ name: "terran_start_building", label: "Terran start building", value: 7 }]);
      T.equal(valueField(app).querySelector('input[data-role="id"]').value, "7");
    });
  }, { dom: true });

  T.test("named options: choosing an option saves it, with no value", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("constants", "const:cloak_energy");
      U.change(valueField(app).querySelector("select"), "Regain energy");
      var saved = JSON.parse(AG.core.serialize(app.doc(), app.cat())).constants[0];
      T.equal(saved, { name: "cloak_energy", label: "Permanent cloak energy", option: "regain" });
    });
  }, { dom: true });

  function renameTitle(app, text) {
    if (!app.root.querySelector(".panel-title input.title-input")) U.q(app, '.panel-title [data-action="edit-name"]').click();
    var box = U.q(app, ".panel-title input.title-input");
    box.value = text;
    box.dispatchEvent(new Event("input", { bubbles: true }));
    U.q(app, '.panel-title [data-action="save-name"]').click();
  }

  T.test("names: a unit's requirement record renames the unit itself, as the Units tab does", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("requirements", "req:unit:0");
      renameTitle(app, "Rifleman");
      T.equal(app.doc().labels, { units: { "0": "Rifleman" } });
      T.ok(app.root.querySelector(".panel-title [data-relabelled]"), "marked as relabelled");
      app.select("units", "unit:0");
      T.equal(U.q(app, '.panel-title [data-action="edit-name"]').textContent, "0 Rifleman");
    });
  }, { dom: true });

  T.test("names: a tech's research and use records share one name", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("requirements", "req:tech_research:5");
      U.q(app, '.panel-title [data-action="edit-name"]').click();
      T.ok(/shared by its research and use/.test(U.q(app, ".panel-title .help").textContent));
      renameTitle(app, "Siege");
      T.equal(app.doc().labels, { techs: { "5": "Siege" } });
      app.select("requirements", "req:tech_use:5");
      T.equal(U.q(app, '.panel-title [data-action="edit-name"]').textContent, "Tech use 5 Siege");
      T.ok(/shared by its research and use/.test(U.q(app, ".panel-title [data-relabelled] .tip").textContent));
    });
  }, { dom: true });

  T.test("names: a constant can be renamed, and its entry's label follows", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("constants", "const:team_multiplier");
      U.change(valueField(app).querySelector("input"), "1");
      renameTitle(app, "Team supply");
      T.equal(app.doc().labels, { constants: { team_multiplier: "Team supply" } });
      T.equal(app.doc().constants[0].label, "Team supply");
      T.ok(/^Team supply/.test(U.q(app, ".panel-title").textContent));
      T.ok(U.texts(app, ".tree .row .text").indexOf("Team supply") >= 0, "the item list");
      renameTitle(app, "");
      T.ok(!app.doc().labels);
      T.ok(/^Team supply multiplier/.test(U.q(app, ".panel-title").textContent));
    });
  }, { dom: true });

  T.test("grouped display: a constant shown under its group with a display name is saved under its name", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("constants", "const:team_multiplier");
      T.equal(U.q(app, ".tabpanel legend").textContent, "Game › Supply");
      T.ok(/^Team supply multiplier/.test(U.q(app, ".panel-title").textContent));
      U.change(valueField(app).querySelector("input"), "1");
      T.equal(app.doc().constants[0].name, "team_multiplier");
    });
  }, { dom: true });

  // ---- 7.6

  T.test("showing availability: a version where a constant is unknown is listed, saying the patcher skips it there", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("constants", "const:team_multiplier");
      T.equal(U.texts(app, "[data-availability] tbody tr").map(function (t) {
        return t.replace(/\s+/g, " ");
      }), ["1.07Doesn't apply—", "1.12Unknown—", "1.16.1Yes400"]);
      T.ok(/skip it there/.test(U.q(app, "[data-skip-note]").textContent));
      app.select("constants", "const:web_duration");
      T.equal(U.texts(app, "[data-availability] tbody tr td:last-child"), ["900", "360"]);
    });
  }, { dom: true });

  // ---- 7.7

  T.test("warnings don't block saving: a mod rejected on one version can be saved, and the report still shows it", function (ctx) {
    return start(ctx).then(function (app) {
      app.edit(function (d) {
        return D.setButtons(d, app.cat(), 232, []);
      });
      return app.save().then(function (ok) {
        T.ok(ok, "saved");
        U.q(app, '[data-status="compat"]').click();
        return U.wait(0);
      }).then(function () {
        var row = U.q(app, 'dialog[data-dialog="report"] tr[data-version="1.07"]');
        T.equal(row.dataset.result, "rejected");
        T.ok(/1.07 has no set 232/.test(row.textContent));
        T.equal(U.q(app, 'dialog[data-dialog="report"] tr[data-version="1.12"]').dataset.result, "applies");
        U.q(app, 'dialog[data-dialog="report"] [data-value="close"]').click();
      });
    });
  }, { dom: true });

  T.test("warnings don't block saving: a set absent on some versions has a warning naming them", function (ctx) {
    return start(ctx).then(function (app) {
      app.edit(function (d) {
        return D.setButtons(d, app.cat(), 232, []);
      });
      app.select("button_sets", "set:232");
      var w = U.q(app, ".buttonset-panel .problem.warning");
      T.ok(/isn't in 1\.07/.test(w.textContent), w.textContent);
    });
  }, { dom: true });

  T.test("warnings at the point of use: choosing a condition some versions lack lists them beside the field", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:0");
      U.change(U.q(app, '[data-field="set:0:0:condition"] select'), "Replay playing (is_watching_replay)");
      var f = U.q(app, '[data-field="set:0:0:condition"]');
      T.ok(/Not in 1\.07/.test(f.querySelector(".note").textContent));
      T.ok(/isn't in 1\.07/.test(f.querySelector(".problem.warning").textContent));
      app.select("units", "unit:0");
      U.change(U.q(app, '[data-field="unit:0:button_set"] input[data-role="id"]'), "232");
      T.ok(/isn't in 1\.07/.test(U.q(app, '[data-field="unit:0:button_set"] .problem.warning').textContent), "a set too");
    });
  }, { dom: true });

  T.test("limits of the report: it says its results are predictions from the catalog", function (ctx) {
    return start(ctx).then(function (app) {
      U.q(app, '[data-command="report"]').click();
      return U.wait(0).then(function () {
        var note = U.q(app, "[data-report-note]").textContent;
        T.ok(/predictions from the StarCraft fixture catalog/.test(note) && /decides for itself/.test(note), note);
        U.q(app, 'dialog[data-dialog="report"] [data-value="close"]').click();
      });
    });
  }, { dom: true });
})(AxeGraft);
