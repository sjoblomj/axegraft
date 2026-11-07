// Drafts of unsaved work, and the warning on closing.
"use strict";

(function (AG) {
  var T = AG.testing;
  var U = T.ui;
  var D = AG.core.doc;

  // Edits a mod in one editor, then starts a second one on the same storage,
  // as if the browser had closed in between.
  function crashAndRestart(ctx, edit) {
    var storage = AG.core.storage.memory();
    return U.start(ctx, { storage: storage }).then(function (first) {
      return first.newMod("starcraft").then(function () {
        first.edit(edit(first));
        return first.flushDraft();
      }).then(function () {
        first.root.parentNode.removeChild(first.root);
        var second = U.start(ctx, { storage: storage });
        return U.until(function () {
          return document.querySelector('dialog[data-dialog="draft"]');
        }, "the restore offer").then(function () {
          return { storage: storage, first: first, secondReady: second };
        });
      });
    });
  }

  T.test("drafts: a draft is kept while there are unsaved changes, and removed once they're saved", function (ctx) {
    var storage = AG.core.storage.memory();
    return U.start(ctx, { storage: storage }).then(function (app) {
      return app.newMod("starcraft").then(function () {
        app.edit(function (d) {
          return D.setConstant(d, app.cat(), "max_supply", 600);
        });
        return U.until(function () {
          return storage.get("drafts", "current");
        }, "the draft to be written");
      }).then(function (d) {
        T.ok(d, "written shortly after the change");
        T.equal(d.game, "starcraft");
        T.equal(JSON.parse(d.text).constants[0].value, 600);
        return app.save();
      }).then(function () {
        return U.until(function () {
          return storage.get("drafts", "current").then(function (d) {
            return d === undefined;
          });
        }, "the draft to be removed");
      }).then(function (removed) {
        T.ok(removed);
      });
    });
  }, { dom: true });

  T.test("drafts: after the browser closes with unsaved changes, the editor offers to restore that work", function (ctx) {
    return crashAndRestart(ctx, function (app) {
      return function (d) {
        return D.setUnitField(D.setConstant(d, app.cat(), "max_supply", 600), app.cat(), 0, "button_set", 5);
      };
    }).then(function (r) {
      var dlg = r.secondReady && document.querySelector('dialog[data-dialog="draft"]');
      T.ok(dlg, "the restore offer is shown");
      T.ok(/untitled StarCraft fixture mod/.test(dlg.textContent), dlg.textContent);
      dlg.querySelector('[data-value="yes"]').click();
      return r.secondReady.then(function (app) {
        T.equal(app.state.game, "starcraft");
        T.equal(app.doc().constants[0].value, 600);
        T.equal(app.doc().units[0].button_set, 5);
        T.ok(app.isDirty(), "restored work is still unsaved");
        T.equal(U.q(app, '[data-status="dirty"]').textContent, "Unsaved changes");
      });
    });
  }, { dom: true });

  T.test("drafts: declining a draft deletes it", function (ctx) {
    return crashAndRestart(ctx, function (app) {
      return function (d) {
        return D.setConstant(d, app.cat(), "max_supply", 600);
      };
    }).then(function (r) {
      var dlg = document.querySelector('dialog[data-dialog="draft"]');
      dlg.querySelector('[data-value="no"]').click();
      return r.secondReady.then(function (app) {
        T.equal(app.state.history, null, "nothing is loaded");
        return r.storage.get("drafts", "current");
      }).then(function (d) {
        T.equal(d, undefined);
      });
    });
  }, { dom: true });

  T.test("drafts: a draft for a game with no catalog any more is ignored", function (ctx) {
    var storage = AG.core.storage.memory();
    return storage.put("drafts", "current", { game: "warcraft2", text: '{"patcher":"AxeGraft","format":1,"game":"warcraft2"}' }).then(function () {
      return U.start(ctx, { storage: storage, catalogs: { games: { starcraft: T.catalog("starcraft") }, errors: [] } });
    }).then(function (app) {
      T.ok(!document.querySelector('dialog[data-dialog="draft"]'));
      T.equal(app.state.history, null);
    });
  }, { dom: true });

  T.test("closing: the browser is asked to warn when there are unsaved changes, and only then", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        var e1 = new Event("beforeunload", { cancelable: true });
        app.onBeforeUnload(e1);
        T.equal(e1.defaultPrevented, false, "no warning without changes");
        app.edit(function (d) {
          return D.setConstant(d, app.cat(), "max_supply", 600);
        });
        var e2 = new Event("beforeunload", { cancelable: true });
        app.onBeforeUnload(e2);
        T.equal(e2.defaultPrevented, true, "a warning with unsaved changes");
      });
    });
  }, { dom: true });
})(AxeGraft);
