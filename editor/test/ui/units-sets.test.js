// The Units and Button Sets tabs.
"use strict";

(function (AG) {
  var T = AG.testing;
  var U = T.ui;
  var D = AG.core.doc;

  function start(ctx, game, options) {
    return U.start(ctx, options).then(function (app) {
      return app.newMod(game || "starcraft").then(function () {
        return app;
      });
    });
  }

  function labels(app) {
    return U.texts(app, ".tabpanel .field > .label-cell > label, .tabpanel .field > .label-cell > .label");
  }

  function field(app, key) {
    return U.q(app, '[data-field="' + key + '"]');
  }

  function idBox(app, key) {
    return field(app, key).querySelector('input[data-role="id"]');
  }

  function nameList(app, key) {
    return field(app, key).querySelector('select[data-role="name"]');
  }

  function selectedText(sel) {
    return sel.options[sel.selectedIndex].textContent;
  }

  // ---- Units: 6.1

  T.test("unit fields: a StarCraft unit shows all four fields", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("units", "unit:0");
      T.equal(labels(app), ["Button set", "Status changed", "Status update", "Status unit type"]);
      T.ok(!/Original/.test(field(app, "unit:0:button_set").textContent), "an unchanged field shows no original value");
      T.ok(!field(app, "unit:0:button_set").querySelector(".changed-mark"));
    });
  }, { dom: true });

  T.test("unit fields: a Warcraft II unit has no status unit type", function (ctx) {
    return start(ctx, "warcraft2").then(function (app) {
      app.select("units", "unit:2");
      T.equal(labels(app), ["Button set", "Stats changed", "Stats update"]);
    });
  }, { dom: true });

  T.test("unit fields: a table entry that isn't a unit, such as 238, shows only its button set", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("units", "unit:238");
      T.equal(labels(app), ["Button set"]);
    });
  }, { dom: true });

  T.test("choosing by name or ID: typing a set ID shows that set in the named list", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("units", "unit:0");
      U.change(idBox(app, "unit:0:button_set"), "7");
      T.equal(app.doc().units, [{ id: 0, label: "Terran Marine", button_set: 7 }]);
      T.equal(selectedText(nameList(app, "unit:0:button_set")), "7 SCV");
      U.change(nameList(app, "unit:0:button_set"), "5 Siege Tank");
      T.equal(idBox(app, "unit:0:button_set").value, "5");
    });
  }, { dom: true });

  T.test("choosing by name or ID: typing a table entry as a set ID shows that entry 32 uses set 0", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("units", "unit:5");
      U.change(idBox(app, "unit:5:button_set"), "32");
      var f = field(app, "unit:5:button_set");
      T.ok(f.classList.contains("has-error"));
      T.ok(/entry 32 uses set 0/.test(f.querySelector(".problem.error").textContent), f.textContent);
    });
  }, { dom: true });

  T.test("choosing by name or ID: choosing no buttons saves a button set of null", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("units", "unit:0");
      U.change(nameList(app, "unit:0:button_set"), "No buttons");
      T.equal(app.doc().units, [{ id: 0, label: "Terran Marine", button_set: null }]);
      T.equal(idBox(app, "unit:0:button_set").value, "");
      T.equal(JSON.parse(AG.core.serialize(app.doc(), app.cat())).units[0].button_set, null);
    });
  }, { dom: true });

  T.test("status functions by name: each field offers only its own functions, and changing one saves only it", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("units", "unit:7");
      T.equal(U.texts(app, '[data-field="unit:7:status_changed"] select option'), ["Unit (statdraw_query_unit)", "Never (statdraw_query_never)"]);
      T.equal(U.texts(app, '[data-field="unit:7:status_update"] select option'), ["Unit (statdraw_draw_unit)", "None (statdraw_draw_none)"]);
      U.change(field(app, "unit:7:status_update").querySelector("select"), "None (statdraw_draw_none)");
      T.equal(app.doc().units, [{ id: 7, label: "Terran SCV", status_update: "statdraw_draw_none" }]);
      T.ok(field(app, "unit:7:status_update").classList.contains("changed"), "the changed field is marked");
      var mark = field(app, "unit:7:status_update").querySelector(".changed-mark");
      T.ok(mark && mark.tabIndex === 0, "with a mark that takes focus");
      var tip = mark.querySelector(".tip");
      T.ok(/^Value changed\. Original: /.test(tip.textContent), tip.textContent);
      T.equal(getComputedStyle(tip).display, "none");
      mark.dispatchEvent(new Event("mouseenter"));
      T.equal(getComputedStyle(tip).display, "block", "shown on hover");
      mark.dispatchEvent(new Event("mouseleave"));
      mark.dispatchEvent(new Event("focus"));
      T.equal(getComputedStyle(tip).display, "block", "shown on focus");
      mark.dispatchEvent(new Event("blur"));
      T.ok(!/Original/.test(field(app, "unit:7:status_changed").textContent), "no original shown on an unchanged field");
      T.ok(!field(app, "unit:7:status_changed").classList.contains("changed"));
    });
  }, { dom: true });

  // ---- Units: 6.2

  T.test("going to the assigned set: unit 0 assigned set 5 opens Button Sets on set 5", function (ctx) {
    return start(ctx).then(function (app) {
      app.edit(function (d) {
        return D.setUnitField(d, app.cat(), 0, "button_set", 5);
      });
      app.select("units", "unit:0");
      U.q(app, '[data-action="go-to-set"]').click();
      T.equal(app.state.tab, "button_sets");
      T.equal(app.selected("button_sets"), "set:5");
      T.ok(/^5 Siege Tank/.test(U.q(app, ".panel-title").textContent));
    });
  }, { dom: true });

  T.test("going to the assigned set: assignments don't chain", function (ctx) {
    return start(ctx).then(function (app) {
      app.edit(function (d) {
        return D.setUnitField(D.setUnitField(d, app.cat(), 0, "button_set", 5), app.cat(), 5, "button_set", 7);
      });
      app.select("units", "unit:0");
      U.q(app, '[data-action="go-to-set"]').click();
      T.equal(app.selected("button_sets"), "set:5");
    });
  }, { dom: true });

  T.test("giving a unit its own set: the Firebat gets set 250 with set 0's current buttons, and the others are unchanged", function (ctx) {
    return start(ctx).then(function (app) {
      var current = [{ position: 1, icon: 1, condition: "bf_always", action: "order_move", enabled_string: 1, disabled_string: 0 }];
      app.edit(function (d) {
        return D.setButtons(d, app.cat(), 0, current);
      });
      app.select("units", "unit:32");
      U.q(app, '[data-action="own-set"]').click();
      var doc = app.doc();
      T.equal(doc.button_sets.filter(function (s) {
        return s.id === 250;
      })[0].buttons, current);
      T.equal(doc.units, [{ id: 32, label: "Terran Firebat", button_set: 250 }]);
      [0, 10, 20].forEach(function (u) {
        T.equal(D.effectiveUnit(doc, app.cat(), u).button_set.value, 0);
      });
      T.equal(app.errors(), []);
    });
  }, { dom: true });

  // ---- Button sets: 6.3

  T.test("button list: clearing a set defines it with no buttons", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:7");
      U.q(app, '[data-action="clear-set"]').click();
      T.equal(app.doc().button_sets, [{ id: 7, label: "SCV", buttons: [] }]);
      T.equal(U.texts(app, ".button-list li"), ["No buttons."]);
    });
  }, { dom: true });

  T.test("button list: an added button starts with valid default values", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:7");
      U.q(app, '[data-action="add-button"]').click();
      var b = app.doc().button_sets[0].buttons[1];
      T.equal(b, { position: 1, icon: 0, condition: "bf_always", action: "order_move", enabled_string: 0, disabled_string: 0 });
      T.equal(app.errors(), []);
      T.equal(U.q(app, ".button-form legend").textContent, "Button 2", "the new button is selected, counting from 1");
    });
  }, { dom: true });

  T.test("button list: reordering saves the buttons in the new order", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:0");
      U.q(app, '.button-list [data-index="1"]').click();
      U.q(app, '[data-action="move-up"]').click();
      var saved = JSON.parse(AG.core.serialize(app.doc(), app.cat())).button_sets[0].buttons;
      T.equal(saved.map(function (b) {
        return b.icon;
      }), [237, 228]);
      T.equal(U.q(app, '.button-list [aria-selected="true"]').dataset.index, "0", "the moved button stays selected");
      U.q(app, '[data-action="move-down"]').click();
      T.equal(app.doc().button_sets, undefined, "moving it back matches the original");
      U.q(app, '[data-action="remove-button"]').click();
      T.equal(app.doc().button_sets[0].buttons.length, 1);
    });
  }, { dom: true });

  // ---- Button sets: 6.4

  function formLabels(app) {
    return U.texts(app, ".button-form .field > .label-cell > label, .button-form .field > .label-cell > .label");
  }

  T.test("button fields: a Warcraft II button shows string and highlighted, and not the StarCraft string fields", function (ctx) {
    return start(ctx, "warcraft2").then(function (app) {
      app.select("button_sets", "set:2");
      T.equal(formLabels(app), ["Position", "Icon", "Condition", "Condition variable", "Action", "Action variable", "String", "Highlighted order"]);
      U.change(field(app, "set:2:0:highlighted").querySelector("select"), "8 Attack");
      T.equal(app.doc().button_sets[0].buttons[0].highlighted, 8);
      var help = field(app, "set:2:0:highlighted").querySelector(".help .tip").textContent;
      T.equal(help, "Order the button highlights.", "the help comes from the game's catalog");
    });
  }, { dom: true });

  T.test("button fields: a StarCraft button shows the enabled and disabled strings, and not string or highlighted", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:0");
      T.equal(formLabels(app), ["Position", "Icon", "Condition", "Condition variable", "Action", "Action variable", "Enabled string", "Disabled string"]);
    });
  }, { dom: true });

  T.test("fields with a name and an ID: an icon with no name, within the limit, is accepted and shown as a placeholder", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:0");
      U.change(idBox(app, "set:0:0:icon"), "60000");
      T.equal(app.doc().button_sets[0].buttons[0].icon, 60000);
      T.equal(app.errors(), []);
      T.ok(field(app, "set:0:0:icon").querySelector("[data-placeholder]"), "a placeholder");
      T.ok(U.q(app, '.slot[data-position="1"] [data-placeholder]'), "the preview shows a placeholder");
      T.equal(selectedText(nameList(app, "set:0:0:icon")), "60000 (no name in the catalog)");
    });
  }, { dom: true });

  T.test("fields with a name and an ID: a string beyond the loaded table is accepted, with a warning giving the table's size", function (ctx) {
    var assets = { info: function () {
      return { strings: { count: 700 } };
    }, string: function (g, id) {
      return id <= 700 ? "String " + id : null;
    } };
    return start(ctx, "starcraft", { assets: assets }).then(function (app) {
      app.select("button_sets", "set:0");
      U.change(idBox(app, "set:0:0:enabled_string"), "800");
      T.equal(app.doc().button_sets[0].buttons[0].enabled_string, 800);
      T.equal(app.errors(), []);
      var f = field(app, "set:0:0:enabled_string");
      T.ok(/holds 700 strings/.test(f.querySelector(".problem.warning").textContent), f.textContent);
    });
  }, { dom: true });

  // ---- Button sets: 6.5

  T.test("variables follow their function: an action reading a tech lists techs", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:0");
      U.change(field(app, "set:0:0:action").querySelector("select"), "Research (order_research)");
      T.equal(U.texts(app, '[data-field="set:0:0:action_variable"] select option').slice(0, 3), ["(choose)", "0 Stim Packs", "5 Siege Mode"]);
      T.ok(field(app, "set:0:0:action_variable").classList.contains("has-error"), "a problem until a tech is given");
      U.change(nameList(app, "set:0:0:action_variable"), "5 Siege Mode");
      T.equal(app.doc().button_sets[0].buttons[0].action_variable, 5);
      T.equal(app.errors(), []);
    });
  }, { dom: true });

  T.test("variables follow their function: an action opening a table entry lists entries with the set each has in the mod", function (ctx) {
    return start(ctx).then(function (app) {
      app.edit(function (d) {
        return D.setUnitField(d, app.cat(), 238, "button_set", 0);
      });
      app.select("button_sets", "set:7");
      var options = U.texts(app, '[data-field="set:7:0:action_variable"] select option');
      T.ok(options.indexOf("238 Zerg basic buildings — set 0") >= 0, options.join(" | "));
      T.ok(options.indexOf("4 Goliath Turret — no buttons") >= 0);
      T.equal(selectedText(nameList(app, "set:7:0:action_variable")), "238 Zerg basic buildings — set 0");
    });
  }, { dom: true });

  T.test("variables follow their function: a function reading no variable leaves the field editable, shown as unused", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:0");
      var f = field(app, "set:0:0:action_variable");
      T.ok(/doesn't read this variable/.test(f.querySelector(".problem.unused").textContent));
      U.change(f.querySelector("input"), "300");
      T.equal(app.doc().button_sets[0].buttons[0].action_variable, 300);
      T.equal(app.errors(), []);
      U.change(field(app, "set:0:0:action_variable").querySelector("input"), "70000");
      T.ok(field(app, "set:0:0:action_variable").classList.contains("has-error"), "but it must fit the field");
    });
  }, { dom: true });

  T.test("variables follow their function: changing to a function of another type shows a problem until a valid value is chosen", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:0");
      U.change(field(app, "set:0:0:action").querySelector("select"), "Build (order_build)");
      U.change(idBox(app, "set:0:0:action_variable"), "100");
      U.change(field(app, "set:0:0:action").querySelector("select"), "Research (order_research)");
      T.equal(app.doc().button_sets[0].buttons[0].action_variable, 100, "the value is kept");
      T.ok(/outside that range/.test(field(app, "set:0:0:action_variable").querySelector(".problem.error").textContent));
      U.change(nameList(app, "set:0:0:action_variable"), "0 Stim Packs");
      T.ok(!field(app, "set:0:0:action_variable").classList.contains("has-error"));
    });
  }, { dom: true });

  T.test("variable omitted when unset: a 0 on an action that reads none isn't saved", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:7");
      U.change(field(app, "set:7:0:action").querySelector("select"), "Move (order_move)");
      U.change(field(app, "set:7:0:action_variable").querySelector("input"), "0");
      var saved = JSON.parse(AG.core.serialize(app.doc(), app.cat())).button_sets[0].buttons[0];
      T.ok(!("action_variable" in saved), JSON.stringify(saved));
    });
  }, { dom: true });

  // ---- Button sets: 6.6

  T.test("panel preview: clicking a filled position selects its button in the list and form", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:0");
      U.q(app, '.slot[data-position="7"]').click();
      T.equal(U.q(app, '.button-list [aria-selected="true"]').dataset.index, "1");
      T.equal(U.q(app, ".button-form legend").textContent, "Button 2");
      T.ok(U.q(app, '.slot[data-position="7"]').classList.contains("selected"));
    });
  }, { dom: true });

  T.test("panel preview: double-clicking an empty position creates a button there", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:0");
      U.q(app, '.slot[data-position="9"]').dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      var b = app.doc().button_sets[0].buttons[2];
      T.equal(b.position, 9);
      T.equal(U.q(app, ".button-form legend").textContent, "Button 3");
      T.ok(U.q(app, '.slot[data-position="9"]').classList.contains("filled"));
      // From the keyboard, Enter on an empty position does the same.
      U.key(U.q(app, '.slot[data-position="8"]'), "Enter");
      T.equal(app.doc().button_sets[0].buttons[3].position, 8);
    });
  }, { dom: true });

  T.test("panel preview: buttons sharing a position are shown as sharing it, and each is reachable from the list", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:5");
      var slot = U.q(app, '.slot[data-position="7"]');
      T.equal(slot.dataset.buttons, "0,1");
      T.equal(slot.querySelector(".count").textContent, "2");
      // Button 0 is selected already, so a click moves to the next button there.
      slot.click();
      T.equal(U.q(app, '.button-list [aria-selected="true"]').dataset.index, "1");
      U.q(app, '.slot[data-position="7"]').click();
      T.equal(U.q(app, '.button-list [aria-selected="true"]').dataset.index, "0", "and on round to the first");
      U.q(app, '.button-list [data-index="0"]').click();
      T.equal(U.q(app, ".button-form legend").textContent, "Button 1");
    });
  }, { dom: true });

  // ---- Button sets: 6.7

  T.test("showing who uses a set: set 0 lists units 0, 10, 20 and 32, and says editing it changes all of them", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:0");
      T.equal(U.texts(app, "[data-used-by] li"), ["0 Terran Marine", "10 Gui Montag", "20 Jim Raynor", "32 Terran Firebat"]);
      T.ok(/changes all of them/.test(U.q(app, ".used-by").textContent));
      var panel = U.q(app, ".buttonset-panel");
      T.ok(panel.lastElementChild === U.q(app, ".used-by"), "the list is at the bottom of the tab");
    });
  }, { dom: true });

  T.test("showing who uses a set: a unit the mod assigns moves to its new set's list", function (ctx) {
    return start(ctx).then(function (app) {
      app.edit(function (d) {
        return D.setUnitField(d, app.cat(), 0, "button_set", 5);
      });
      app.select("button_sets", "set:5");
      T.equal(U.texts(app, "[data-used-by] li"), ["0 Terran Marine", "5 Terran Siege Tank"]);
      app.select("button_sets", "set:0");
      T.equal(U.texts(app, "[data-used-by] li"), ["10 Gui Montag", "20 Jim Raynor", "32 Terran Firebat"]);
      U.q(app, '[data-used-by] [data-unit="20"]').click();
      T.equal(app.state.tab, "units");
      T.equal(app.selected("units"), "unit:20");
    });
  }, { dom: true });

  T.test("new sets: adding a set to a mod with none gives set 250 with no buttons, listed beside the originals", function (ctx) {
    return start(ctx).then(function (app) {
      app.setTab("button_sets");
      U.q(app, '[data-action="add-set"]').click();
      T.equal(app.doc().button_sets, [{ id: 250, buttons: [] }]);
      T.equal(app.selected("button_sets"), "set:250");
      T.ok(U.texts(app, '.tree [role="treeitem"] > .row .text').indexOf("250 New set") >= 0);
      // Another ID can be chosen.
      U.change(U.q(app, 'input[data-role="new-set-id"]'), "300");
      U.q(app, '[data-action="add-set"]').click();
      T.equal(app.selected("button_sets"), "set:300");
    });
  }, { dom: true });

  T.test("new sets: removing a set still in use leaves an error on the entry until it gets another set", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("units", "unit:32");
      U.q(app, '[data-action="own-set"]').click();
      app.select("button_sets", "set:250");
      U.q(app, '[data-action="remove-set"]').click();
      T.equal(app.doc().button_sets, undefined);
      app.select("units", "unit:32");
      T.ok(field(app, "unit:32:button_set").classList.contains("has-error"));
      U.change(nameList(app, "unit:32:button_set"), "7 SCV");
      T.equal(app.errors(), []);
    });
  }, { dom: true });

  T.test("copying buttons: to chosen sets, each defined with the same buttons", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:7");
      U.change(U.q(app, 'input[data-copy-to="0"]'), true);
      U.change(U.q(app, 'input[data-copy-to="232"]'), true);
      U.q(app, '[data-action="copy-to"]').click();
      var src = app.cat().sets.get(7).original;
      [0, 232].forEach(function (id) {
        T.equal(D.effectiveButtons(app.doc(), app.cat(), id).buttons, src);
        T.ok(D.effectiveButtons(app.doc(), app.cat(), id).defined);
      });
    });
  }, { dom: true });

  T.test("copying buttons: from a set in the mod, or as in the original game, leaving the source unchanged", function (ctx) {
    return start(ctx).then(function (app) {
      var changed = [{ position: 2, icon: 2, condition: "bf_always", action: "order_move", enabled_string: 2, disabled_string: 0 }];
      app.edit(function (d) {
        return D.setButtons(d, app.cat(), 5, changed);
      });
      app.select("button_sets", "set:7");
      U.change(U.q(app, 'select[data-role="copy-source"]'), "5 Siege Tank");
      U.q(app, '[data-action="copy-from"]').click();
      T.equal(D.effectiveButtons(app.doc(), app.cat(), 7).buttons, changed);
      T.equal(D.effectiveButtons(app.doc(), app.cat(), 5).buttons, changed, "the source is unchanged");
      U.change(U.q(app, 'input[data-role="copy-original"]'), true);
      U.q(app, '[data-action="copy-from"]').click();
      T.equal(D.effectiveButtons(app.doc(), app.cat(), 7).buttons, app.cat().sets.get(5).original);
    });
  }, { dom: true });

  // ---- Original buttons that differ by version

  // The Warcraft II fixture with the DOS versions added, and the Peasant
  // set (2) with only its second button on them.
  function dosCatalogs() {
    var raw = T.rawCatalog("warcraft2");
    raw.versions = ["1.3", "1.33", "1.5"].map(function (v) {
      return { id: v, label: v };
    }).concat(raw.versions);
    raw.constants[0].availability = { "1.3": 40, "1.33": 40, "1.5": 40, "2.00": 40, "2.02": 40 };
    var peasant = raw.buttonSets[1].original;
    var dos = [peasant[1]];
    raw.buttonSets[1].original = { "default": peasant, perVersion: { "1.3": dos, "1.33": dos, "1.5": dos } };
    var problems = AG.core.catalog.check(raw, "dos");
    if (problems.length) throw new Error(problems.join("\n"));
    return { games: { starcraft: T.catalog("starcraft"), warcraft2: AG.core.catalog.index(raw, "dos") }, errors: [] };
  }

  function startDos(ctx) {
    return start(ctx, "warcraft2", { catalogs: dosCatalogs() });
  }

  function originalGroups(app) {
    return Array.prototype.map.call(app.root.querySelectorAll("[data-original-buttons] [data-versions]"), function (g) {
      return [g.querySelector("h3").textContent, g.querySelectorAll("li").length];
    });
  }

  T.test("original buttons by version: a set that differs shows each group of versions side by side, lined up", function (ctx) {
    return startDos(ctx).then(function (app) {
      app.select("button_sets", "set:2");
      var table = U.q(app, "[data-original-buttons] table.original-diff");
      T.equal(U.texts(app, "[data-original-buttons] table.original-diff thead th"), ["1.3–1.5", "2.00–2.02"]);
      var rows = Array.prototype.map.call(table.querySelectorAll("tbody tr"), function (tr) {
        return Array.prototype.map.call(tr.querySelectorAll("td"), function (td) {
          return td.className;
        });
      });
      // The Move button only 2.00 and 2.02 have, then the build button all have.
      T.equal(rows, [["diff-missing", "diff-added"], ["", ""]]);
    });
  }, { dom: true });

  T.test("original buttons by version: a button that differs between versions is marked as changed", function (ctx) {
    var catalogs = dosCatalogs();
    var raw = JSON.parse(JSON.stringify(catalogs.games.warcraft2.raw));
    var dos = raw.buttonSets[1].original.perVersion["1.3"];
    dos[0] = Object.assign({}, dos[0], { icon: 99 });
    raw.buttonSets[1].original.perVersion = { "1.3": dos, "1.33": dos, "1.5": dos };
    catalogs.games.warcraft2 = AG.core.catalog.index(raw, "dos");
    return start(ctx, "warcraft2", { catalogs: catalogs }).then(function (app) {
      app.select("button_sets", "set:2");
      T.equal(U.texts(app, "table.original-diff tbody tr:last-child td.diff-changed .pos"), ["6", "6"]);
    });
  }, { dom: true });

  T.test("original buttons by version: a set that never differs shows its original once", function (ctx) {
    return startDos(ctx).then(function (app) {
      app.select("button_sets", "set:0");
      T.equal(originalGroups(app), [["All versions:", 1]]);
    });
  }, { dom: true });

  T.test("original buttons by version: a set with 2.02's buttons is changed only on the DOS versions", function (ctx) {
    return startDos(ctx).then(function (app) {
      var cat = app.cat();
      app.edit(function (d) {
        return D.setButtons(d, cat, 2, D.originalButtons(cat, 2, "2.02"));
      });
      T.equal(app.doc().button_sets.length, 1, "the mod still defines the set");
      app.select("button_sets", "set:2");
      T.equal(U.q(app, "[data-differs-on]").textContent, "Differs from the original on 1.3–1.5. The same as the original on 2.00–2.02.");
      app.select("button_sets", "set:0");
      T.equal(app.root.querySelector("[data-differs-on]"), null, "nothing to say for a set the mod doesn't define");
    });
  }, { dom: true });

  T.test("original buttons by version: reverting removes the set, so every version keeps its own", function (ctx) {
    return startDos(ctx).then(function (app) {
      var cat = app.cat();
      app.edit(function (d) {
        return D.setButtons(d, cat, 2, []);
      });
      app.select("button_sets", "set:2");
      U.q(app, '[data-action="revert-set"]').click();
      T.equal(app.doc().button_sets, undefined);
    });
  }, { dom: true });

  T.test("copying buttons: the original of a set that differs by version, chosen by version, starting with the default", function (ctx) {
    return startDos(ctx).then(function (app) {
      var cat = app.cat();
      app.select("button_sets", "set:0");
      U.q(app, "details[data-copy] summary").click();
      U.change(U.q(app, 'select[data-role="copy-source"]'), "2 Peasant");
      T.equal(app.root.querySelector('select[data-role="copy-version"]'), null, "no version to choose without the original");
      U.change(U.q(app, 'input[data-role="copy-original"]'), true);
      var picker = U.q(app, 'select[data-role="copy-version"]');
      T.ok(U.q(app, "details[data-copy]").open, "the copy section stays open");
      T.equal(Array.prototype.map.call(picker.options, function (o) {
        return o.textContent;
      }), ["2.00–2.02 (default)", "1.3–1.5"]);
      U.q(app, '[data-action="copy-from"]').click();
      T.equal(D.effectiveButtons(app.doc(), cat, 0).buttons, D.originalButtons(cat, 2, "2.02"));
      U.change(U.q(app, 'select[data-role="copy-version"]'), "1.3–1.5");
      U.q(app, '[data-action="copy-from"]').click();
      T.equal(D.effectiveButtons(app.doc(), cat, 0).buttons, D.originalButtons(cat, 2, "1.5"));
      T.equal(D.effectiveButtons(app.doc(), cat, 0).buttons.length, 1);
      U.change(U.q(app, 'select[data-role="copy-source"]'), "111 Human Basic Build");
      T.equal(app.root.querySelector('select[data-role="copy-version"]'), null, "no choice for a set with one original");
    });
  }, { dom: true });

  // ---- Position order

  T.test("sort by position: offered for Warcraft II, and it fixes the order error", function (ctx) {
    return start(ctx, "warcraft2").then(function (app) {
      var cat = app.cat();
      var peasant = cat.sets.get(2).original;
      app.edit(function (d) {
        return D.setButtons(d, cat, 2, [peasant[1], peasant[0]]);
      });
      T.equal(app.errors().length, 1, "out of order is an error");
      app.select("button_sets", "set:2");
      var sort = U.q(app, '[data-action="sort-buttons"]');
      T.ok(!sort.disabled);
      sort.click();
      T.equal(app.errors(), []);
      T.equal(app.doc().button_sets, undefined, "sorted, the set matches the original");
      T.ok(U.q(app, '[data-action="sort-buttons"]').disabled, "nothing to sort");
    });
  }, { dom: true });

  T.test("sort by position: not offered for StarCraft", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:5");
      T.equal(app.root.querySelector('[data-action="sort-buttons"]'), null);
    });
  }, { dom: true });

  // ---- 6.8

  T.test("jump from a variable: a unit in an action variable leads to that unit's requirement record", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:238");
      U.q(app, '[data-field="set:238:0:action_variable"] [data-action="jump"]').click();
      T.equal(app.state.tab, "requirements");
      T.equal(app.selected("requirements"), "req:unit:131");
    });
  }, { dom: true });

  T.test("jump from a variable: a table entry leads to that entry in the Units tab", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:7");
      U.q(app, '[data-field="set:7:0:action_variable"] [data-action="jump"]').click();
      T.equal(app.state.tab, "units");
      T.equal(app.selected("units"), "unit:238");
    });
  }, { dom: true });
})(AxeGraft);
