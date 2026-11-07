// Drafts of unsaved work, and the warning on closing.
"use strict";

(function (AG) {
  var T = AG.testing;
  var U = T.ui;
  var D = AG.core.doc;

  // Edits a mod in one editor, then starts a second one on the same storage,
  // as if the browser had closed in between, which frees the first's lock.
  function crashAndRestart(ctx, edit) {
    var storage = AG.core.storage.memory();
    var locks = U.fakeLocks();
    return U.start(ctx, { storage: storage, locks: locks }).then(function (first) {
      return first.newMod("starcraft").then(function () {
        first.edit(edit(first));
        return first.flushDraft();
      }).then(function () {
        first.close();
        first.root.parentNode.removeChild(first.root);
        var second = U.start(ctx, { storage: storage, locks: locks });
        return U.until(function () {
          return document.querySelector('dialog[data-dialog="draft"]');
        }, "the restore offer").then(function () {
          return { storage: storage, locks: locks, first: first, secondReady: second };
        });
      });
    });
  }

  // Starts an editor with a new mod holding one unsaved constant, its draft
  // written.
  function editing(ctx, storage, locks, value) {
    return U.start(ctx, { storage: storage, locks: locks }).then(function (app) {
      return app.newMod("starcraft").then(function () {
        app.edit(function (d) {
          return D.setConstant(d, app.cat(), "max_supply", value);
        });
        return app.flushDraft();
      }).then(function () {
        return app;
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
          return storage.get("drafts", app.draftKey());
        }, "the draft to be written");
      }).then(function (d) {
        T.ok(d, "written shortly after the change");
        T.equal(d.game, "starcraft");
        T.equal(JSON.parse(d.text).constants[0].value, 600);
        return app.save();
      }).then(function () {
        return U.until(function () {
          return storage.get("drafts", app.draftKey()).then(function (d) {
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
        T.equal(app.draftKey(), r.first.draftKey(), "the restored work goes on under the draft's key");
        T.ok(r.locks.held["axegraft-editor.draft:" + r.first.draftKey()], "and its lock is held");
        return r.storage.keys("drafts");
      }).then(function (keys) {
        T.equal(keys.length, 1, "no second draft: " + keys.join(", "));
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
        return r.storage.get("drafts", r.first.draftKey());
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

  T.test("drafts: a draft from before drafts had one key per tab is still offered", function (ctx) {
    var storage = AG.core.storage.memory();
    var text = '{"patcher":"AxeGraft","format":1,"game":"starcraft","constants":[{"name":"max_supply","value":600}]}';
    return storage.put("drafts", "current", { game: "starcraft", text: text, time: 1 }).then(function () {
      var ready = U.start(ctx, { storage: storage });
      return U.until(function () {
        return document.querySelector('dialog[data-dialog="draft"]');
      }, "the restore offer").then(function (dlg) {
        dlg.querySelector('[data-value="yes"]').click();
        return ready;
      });
    }).then(function (app) {
      T.equal(app.doc().constants[0].value, 600);
    });
  }, { dom: true });

  T.test("drafts: two tabs keep separate drafts", function (ctx) {
    var storage = AG.core.storage.memory();
    var locks = U.fakeLocks();
    return Promise.all([editing(ctx, storage, locks, 600), editing(ctx, storage, locks, 700)]).then(function (apps) {
      T.ok(apps[0].draftKey() !== apps[1].draftKey(), "each has its own key");
      return Promise.all([storage.get("drafts", apps[0].draftKey()), storage.get("drafts", apps[1].draftKey())]);
    }).then(function (ds) {
      T.equal(JSON.parse(ds[0].text).constants[0].value, 600);
      T.equal(JSON.parse(ds[1].text).constants[0].value, 700);
    });
  }, { dom: true });

  T.test("drafts: a draft another open tab is using isn't offered, until that tab closes", function (ctx) {
    var storage = AG.core.storage.memory();
    var locks = U.fakeLocks();
    var first;
    return editing(ctx, storage, locks, 600).then(function (app) {
      first = app;
      return U.start(ctx, { storage: storage, locks: locks });
    }).then(function (second) {
      T.ok(!document.querySelector('dialog[data-dialog="draft"]'), "no offer while the first tab is open");
      T.equal(second.state.history, null);
      return storage.get("drafts", first.draftKey());
    }).then(function (d) {
      T.ok(d, "the first tab's draft is left alone");
      first.close();
      U.start(ctx, { storage: storage, locks: locks });
      return U.until(function () {
        return document.querySelector('dialog[data-dialog="draft"]');
      }, "the offer once the first tab has closed");
    }).then(function (dlg) {
      T.ok(dlg);
      dlg.querySelector('[data-value="no"]').click();
    });
  }, { dom: true });

  T.test("drafts: of several drafts no tab is using, the newest is offered first, then the next", function (ctx) {
    var storage = AG.core.storage.memory();
    function draft(value, time) {
      return { game: "starcraft", time: time, text: '{"patcher":"AxeGraft","format":1,"game":"starcraft","constants":[{"name":"max_supply","value":' + value + "}]}" };
    }
    var ready;
    return Promise.all([storage.put("drafts", "tab-a", draft(600, 1000)), storage.put("drafts", "tab-b", draft(700, 2000))]).then(function () {
      ready = U.start(ctx, { storage: storage });
      return U.until(function () {
        return document.querySelector('dialog[data-dialog="draft"]');
      }, "the first offer");
    }).then(function (dlg) {
      T.ok(dlg.textContent.indexOf(new Date(2000).toLocaleString()) >= 0, "the newest first: " + dlg.textContent);
      dlg.querySelector('[data-value="no"]').click();
      return U.until(function () {
        var d = document.querySelector('dialog[data-dialog="draft"]');
        return d && d !== dlg && d.textContent.indexOf(new Date(1000).toLocaleString()) >= 0 && d;
      }, "the second offer");
    }).then(function (dlg) {
      dlg.querySelector('[data-value="yes"]').click();
      return ready;
    }).then(function (app) {
      T.equal(app.doc().constants[0].value, 600);
      return storage.keys("drafts");
    }).then(function (keys) {
      T.equal(keys.join(), "tab-a", "the declined one is deleted");
    });
  }, { dom: true });

  T.test("drafts: hiding the page writes a pending draft at once", function (ctx) {
    var storage = AG.core.storage.memory();
    return U.start(ctx, { storage: storage }).then(function (app) {
      return app.newMod("starcraft").then(function () {
        app.edit(function (d) {
          return D.setConstant(d, app.cat(), "max_supply", 600);
        });
        app.onPageHidden({ type: "pagehide" });
        return storage.get("drafts", app.draftKey());
      }).then(function (d) {
        T.ok(d, "written without waiting for the delay");
        T.equal(JSON.parse(d.text).constants[0].value, 600);
      });
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
