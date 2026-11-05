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
    for (var i = 0; i <= 119; i++) raw.units.push({ id: i, name: "Entry " + i, tree: ["All"], original: i < 110 ? { button_set: null, status_changed: "w2_stats_changed_unit", status_update: "w2_stats_update_unit" } : { button_set: null } });
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
})(AxeGraft);
