// The problem list, undo and redo through the UI, and help for every control.
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

  // ---- 5.8

  T.test("problem while editing: a button left without a required variable shows an error beside the field and in the list, which leads back to it", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("button_sets", "set:0");
      U.change(U.q(app, '[data-field="set:0:0:action"] select'), "Upgrade (order_upgrade)");
      var f = U.q(app, '[data-field="set:0:0:action_variable"]');
      T.ok(/order_upgrade reads a upgrade, but action_variable is missing/.test(f.querySelector(".problem.error").textContent), f.textContent);
      T.equal(U.q(app, '[data-status="problems"]').textContent, "1 error, 0 warnings");
      app.select("units", "unit:5");
      U.q(app, '[data-status="problems"]').click();
      return U.wait(0).then(function () {
        var li = U.q(app, 'dialog[data-dialog="problems"] li[data-path="button_sets[0].buttons[0].action_variable"]');
        T.equal(li.dataset.severity, "error");
        li.querySelector("[data-goto]").click();
        return U.wait(0);
      }).then(function () {
        T.equal(app.state.tab, "button_sets");
        T.equal(app.selected("button_sets"), "set:0");
        T.ok(U.q(app, '[data-field="set:0:0:action_variable"]').contains(document.activeElement), "the field has focus");
        T.ok(!app.root.querySelector("dialog[open]"), "the list closed");
      });
    });
  }, { dom: true });

  T.test("undo across tabs: changing a unit, then a constant, and undoing twice from the menu and the keyboard", function (ctx) {
    return start(ctx).then(function (app) {
      var before = app.doc();
      app.select("units", "unit:0");
      U.change(U.q(app, '[data-field="unit:0:button_set"] input[data-role="id"]'), "7");
      app.select("constants", "const:max_supply");
      U.change(U.q(app, '[data-field="const:max_supply"] input'), "800");
      T.equal(app.doc().units.length + app.doc().constants.length, 2);
      // Undo from the menu.
      U.q(app, '[data-menu="edit"] summary').click();
      U.q(app, '[data-command="undo"]').click();
      T.equal(app.doc().constants, undefined);
      T.equal(app.doc().units.length, 1);
      // And from the keyboard.
      U.key(U.q(app, ".tree"), "z", { ctrlKey: true });
      T.equal(app.doc(), before, "the mod matches its earlier state");
      T.ok(U.q(app, '[data-command="undo"]').disabled, "nothing more to undo");
      U.key(U.q(app, ".tree"), "y", { ctrlKey: true });
      U.key(U.q(app, ".tree"), "z", { ctrlKey: true, shiftKey: true });
      T.equal(app.doc().constants[0].value, 800, "both redone");
      // In a text box, Ctrl+Z is left to the box.
      var box = U.q(app, '[data-field="const:max_supply"] input');
      var e = U.key(box, "z", { ctrlKey: true });
      T.equal(e.defaultPrevented, false);
      T.equal(app.doc().constants[0].value, 800);
    });
  }, { dom: true });

  // ---- 5.10

  T.test("reading help: a ? button shows its control's text on focus and on hover", function (ctx) {
    return start(ctx).then(function (app) {
      app.select("units", "unit:0");
      var f = U.q(app, '[data-field="unit:0:status_update"]');
      var btn = f.querySelector(".help");
      var tip = btn.querySelector(".tip");
      T.equal(getComputedStyle(tip).display, "none");
      btn.focus();
      T.ok(document.activeElement === btn, "the ? button takes keyboard focus");
      // A window without system focus, as in a headless browser, doesn't
      // match :focus, so the style is only checked where it applies.
      if (btn.matches(":focus")) T.equal(getComputedStyle(tip).display, "block", "shown on keyboard focus");
      T.ok(/Draws the status panel/.test(tip.textContent));
      var select = f.querySelector("select");
      T.equal(select.getAttribute("aria-describedby"), tip.id, "the control is described by its help");
      btn.blur();
      T.equal(getComputedStyle(tip).display, "none");
      btn.dispatchEvent(new Event("mouseenter"));
      T.equal(getComputedStyle(tip).display, "block", "shown on hover");
      btn.dispatchEvent(new Event("mouseleave"));
      T.equal(getComputedStyle(tip).display, "none");
      btn.dispatchEvent(new Event("focus"));
      T.equal(getComputedStyle(tip).display, "block", "shown on focus");
    });
  }, { dom: true });

  // Every control in the item list and the tab panels is described by a ?
  // button with text.
  function undescribed(app) {
    var bad = [];
    var controls = app.root.querySelectorAll(".sidebar input, .sidebar select, .sidebar textarea, .sidebar button, .tabpanel input, .tabpanel select, .tabpanel textarea, .tabpanel button, .tablist [role=tab], .sidebar .tree");
    Array.prototype.forEach.call(controls, function (c) {
      if (c.classList.contains("help")) return;
      var id = c.getAttribute("aria-describedby");
      var tip = id && document.getElementById(id);
      var ok = tip && tip.closest(".help") && tip.textContent.trim().length > 10;
      if (!ok) bad.push(c.outerHTML.slice(0, 120));
    });
    return bad;
  }

  function everyItem(app, check) {
    app.tabs().forEach(function (t) {
      app.setTab(t.id);
      var keys = [];
      (function walk(list) {
        list.forEach(function (n) {
          if (n.type === "item") keys.push(n.key);
          else walk(n.children);
        });
      })(app.nodes(t.id));
      keys.forEach(function (k) {
        app.select(t.id, k);
        if (t.id === "button_sets") {
          var n = AG.core.doc.effectiveButtons(app.doc(), app.cat(), AG.core.tree.parseKey(k).id).buttons.length;
          for (var i = 0; i < n; i++) {
            app.state.button[k] = i;
            app.render();
            check(t.id + " " + k + " button " + i);
          }
          if (!n) check(t.id + " " + k);
          U.q(app, ".buttonset-panel details").open = true;
          check(t.id + " " + k + " copy");
        } else check(t.id + " " + k);
        if (t.id === "requirements") {
          app.state.showOriginal = true;
          app.render();
          check(t.id + " " + k + " original");
          app.state.showOriginal = false;
        }
      });
    });
  }

  ["starcraft", "warcraft2"].forEach(function (game) {
    T.test("help for every control: every control in every panel of a " + game + " mod has a help text", function (ctx) {
      return start(ctx, game).then(function (app) {
        var problems = [];
        function check(where) {
          undescribed(app).forEach(function (b) {
            problems.push(where + ": " + b);
          });
        }
        check("empty");
        // A mod that changes things, so revert buttons, errors and new sets show too.
        app.edit(function (d) {
          var cat = app.cat();
          d = D.setUnitField(d, cat, 0, "button_set", 999);
          d = D.addSet(d, cat).doc;
          d = D.setButtons(d, cat, 0, []);
          d = D.setConstant(d, cat, cat.constantList[0].name, 1);
          if (cat.has("requirements")) d = D.setRequirement(d, cat, "unit", 0, ["or", "must_have"]);
          return d;
        });
        everyItem(app, check);
        // The problem filters, once there are problems.
        app.setTab("units");
        check("with problems");
        T.equal(problems.slice(0, 15), []);
      });
    }, { dom: true, timeout: 60000 });
  });

  T.test("help for every control: game-independent help is in the editor's table, game-specific help in the catalog", function () {
    T.ok(Object.keys(AG.ui.help.TEXT).length > 30);
    Object.keys(AG.ui.help.TEXT).forEach(function (k) {
      T.ok(AG.ui.help.TEXT[k].length > 10, k);
    });
    var raw = T.rawCatalog("warcraft2");
    T.equal(raw.buttonFields[7].help, "Order the button highlights.");
  }, { dom: true });
})(AxeGraft);
