// The main layout: menu, tabs per game, the sample notice and the status bar.
"use strict";

(function (AG) {
  var T = AG.testing;
  var U = T.ui;

  function tabs(app) {
    return U.texts(app, '[role="tab"]');
  }

  T.test("main layout: a StarCraft mod has the Units, Button Sets, Requirements and Constants tabs", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        T.equal(tabs(app), ["Units", "Button Sets", "Requirements", "Constants"]);
        T.ok(app.root.querySelector(".menubar") && app.root.querySelector(".sidebar .tree") && app.root.querySelector(".statusbar"));
        T.equal(U.texts(app, ".menubar summary"), ["File", "Edit", "View"]);
      });
    });
  }, { dom: true });

  T.test("main layout: a Warcraft II mod has the Units, Button Sets and Constants tabs", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("warcraft2").then(function () {
        T.equal(tabs(app), ["Units", "Button Sets", "Constants"]);
      });
    });
  }, { dom: true });

  T.test("main layout: switching to a game without the current tab picks its first tab", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        app.setTab("requirements");
        return app.newMod("warcraft2");
      }).then(function () {
        T.equal(app.state.tab, "units");
      });
    });
  }, { dom: true });

  T.test("editing with a sample: a notice says the catalog is a sample, for as long as it's used", function (ctx) {
    return U.start(ctx, { which: "samples" }).then(function (app) {
      T.ok(!app.root.querySelector('[data-notice="sample"]'), "no notice before editing");
      return app.newMod("starcraft").then(function () {
        var n = U.q(app, '[data-notice="sample"]');
        T.ok(/catalog is a sample/.test(n.textContent) && /may not match AxeGraft Patcher/.test(n.textContent), n.textContent);
        T.ok(!n.querySelector("button"), "it can't be dismissed");
        app.setTab("constants");
        app.edit(function (d) {
          return AG.core.doc.setConstant(d, app.cat(), "max_supply", 600);
        });
        T.ok(app.root.querySelector('[data-notice="sample"]'), "still shown after other actions");
      });
    });
  }, { dom: true });

  T.test("editing with a complete catalog: no sample notice", function (ctx) {
    var raw = T.rawCatalog("warcraft2");
    raw.sample = false;
    raw.units = [];
    raw.buttonSets = [];
    for (var i = 0; i <= 119; i++) raw.units.push({ id: i, name: "Entry " + i, tree: ["All"], original: i < 110 ? { button_set: null, icon: 0, status_changed: "w2_stats_changed_unit", status_update: "w2_stats_update_unit" } : { button_set: null } });
    var cats = AG.core.catalog.load([{ raw: raw, source: "full.js" }]);
    T.equal(cats.errors, []);
    return U.start(ctx, { catalogs: cats }).then(function (app) {
      return app.newMod("warcraft2").then(function () {
        T.ok(!app.root.querySelector('[data-notice="sample"]'));
      });
    });
  }, { dom: true });

  T.test("status bar: says when the mod has unsaved changes", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        T.equal(U.q(app, '[data-status="dirty"]').textContent, "No unsaved changes");
        T.ok(/Untitled mod/.test(U.q(app, '[data-status="file"]').textContent));
        app.edit(function (d) {
          return AG.core.doc.setUnitField(d, app.cat(), 0, "button_set", 5);
        });
        T.equal(U.q(app, '[data-status="dirty"]').textContent, "Unsaved changes");
        T.equal(U.q(app, '[data-status="problems"]').textContent, "0 errors, 0 warnings");
        app.edit(function (d) {
          return AG.core.doc.setUnitField(d, app.cat(), 0, "button_set", 999);
        });
        T.equal(U.q(app, '[data-status="problems"]').textContent, "1 error, 0 warnings");
        app.edit(function (d) {
          return AG.core.doc.setUnitField(d, app.cat(), 0, "button_set", 232);
        });
        T.equal(U.q(app, '[data-status="compat"]').textContent, "2 apply, 1 reject");
        app.undo();
        app.undo();
        T.equal(U.q(app, '[data-status="dirty"]').textContent, "Unsaved changes");
        app.undo();
        T.equal(U.q(app, '[data-status="dirty"]').textContent, "No unsaved changes", "undone back to the saved state");
      });
    });
  }, { dom: true });
  T.test("menu bar: with a menu open, moving the mouse to another menu opens it and closes the first", function (ctx) {
    return U.start(ctx).then(function (app) {
      var file = U.q(app, '.menubar details[data-menu="file"]');
      var edit = U.q(app, '.menubar details[data-menu="edit"]');
      edit.querySelector("summary").dispatchEvent(new Event("mouseenter"));
      T.ok(!edit.open, "hovering opens nothing while every menu is closed");
      file.open = true;
      edit.querySelector("summary").dispatchEvent(new Event("mouseenter"));
      T.ok(edit.open && !file.open, "the menu follows the mouse");
    });
  }, { dom: true });

  T.test("menu bar: a click outside the open menu, or Escape, closes it", function (ctx) {
    return U.start(ctx).then(function (app) {
      var file = U.q(app, '.menubar details[data-menu="file"]');
      file.open = true;
      file.querySelector(".menu").dispatchEvent(new Event("pointerdown", { bubbles: true }));
      T.ok(file.open, "a click inside the menu leaves it open");
      U.q(app, ".statusbar").dispatchEvent(new Event("pointerdown", { bubbles: true }));
      T.ok(!file.open, "a click outside closes it");
      file.open = true;
      U.key(file.querySelector("summary"), "Escape");
      T.ok(!file.open, "Escape closes it");
    });
  }, { dom: true });

  T.test("help: the text stays inside the window and isn't clipped by the panel", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        app.select("units", "unit:0");
        var helps = app.root.querySelectorAll(".tabpanel .help");
        T.ok(helps.length > 0);
        // The ? buttons nearest the window's right edge and bottom.
        var right = helps[0], low = helps[0];
        Array.prototype.forEach.call(helps, function (b) {
          if (b.getBoundingClientRect().right > right.getBoundingClientRect().right) right = b;
          if (b.getBoundingClientRect().bottom > low.getBoundingClientRect().bottom) low = b;
        });
        [right, low].forEach(function (b) {
          b.dispatchEvent(new Event("mouseenter"));
          var tip = b.querySelector(".tip");
          var r = tip.getBoundingClientRect();
          T.equal(getComputedStyle(tip).position, "fixed", "placed in window coordinates");
          T.ok(r.left >= 0 && r.top >= 0, "not off the left or top: " + r.left + "," + r.top);
          T.ok(r.right <= document.documentElement.clientWidth && r.bottom <= document.documentElement.clientHeight, "not off the right or bottom: " + r.right + "," + r.bottom);
          b.dispatchEvent(new Event("mouseleave"));
        });
      });
    });
  }, { dom: true });
  T.test("theme: dark is the default, and choosing Classic from the View menu switches and is remembered", function (ctx) {
    var prefs = U.memoryPrefs();
    return U.start(ctx, { prefs: prefs }).then(function (app) {
      T.equal(app.root.dataset.theme, "dark");
      var classic = U.q(app, '.menubar [data-command="theme:classic"]');
      T.equal(U.q(app, '.menubar [data-command="theme:dark"]').getAttribute("aria-checked"), "true");
      T.equal(classic.getAttribute("aria-checked"), "false");
      U.q(app, '.menubar details[data-menu="view"]').open = true;
      classic.click();
      T.equal(app.root.dataset.theme, "classic");
      T.equal(U.q(app, '.menubar [data-command="theme:classic"]').getAttribute("aria-checked"), "true");
      T.ok(!U.q(app, '.menubar details[data-menu="view"]').open, "the menu closes");
      T.equal(prefs.values["axegraft-editor.theme"], "classic");
      T.ok(getComputedStyle(U.q(app, ".app")).backgroundColor !== "", "styled");
    });
  }, { dom: true });

  T.test("theme: a remembered choice is used at start, and an unknown one falls back to dark", function (ctx) {
    return U.start(ctx, { prefs: U.memoryPrefs({ "axegraft-editor.theme": "classic" }) }).then(function (app) {
      T.equal(app.root.dataset.theme, "classic");
      return U.start(ctx, { prefs: U.memoryPrefs({ "axegraft-editor.theme": "neon" }) });
    }).then(function (app) {
      T.equal(app.root.dataset.theme, "dark");
    });
  }, { dom: true });

  T.test("theme: the two themes look different", function (ctx) {
    return U.start(ctx).then(function (app) {
      var looks = function () {
        return getComputedStyle(U.q(app, ".menubar")).backgroundColor + "/" + getComputedStyle(U.q(app, ".app")).color;
      };
      var dark = looks();
      app.setTheme("classic");
      T.ok(looks() !== dark, dark + " vs " + looks());
    });
  }, { dom: true });
})(AxeGraft);
