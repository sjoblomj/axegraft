// The storage wrapper: IndexedDB when it works, memory when it doesn't.
"use strict";

(function (AG) {
  var T = AG.testing;
  var St = AG.core.storage;

  // A fake IndexedDB whose open fails in the way given.
  function failingIdb(how) {
    return {
      open: function () {
        if (how === "throw") throw new Error("SecurityError: The operation is insecure.");
        var req = {};
        setTimeout(function () {
          if (how === "error") {
            req.error = new Error("QuotaExceededError");
            req.onerror();
          } else if (how === "blocked") req.onblocked();
          else if (how === "transaction" || how === "writes") {
            // Opens, then fails every transaction, or only those that write.
            req.result = {
              objectStoreNames: { contains: function () {
                return true;
              } },
              transaction: function (s, mode) {
                if (how === "transaction" || mode === "readwrite") throw new Error("InvalidStateError: the database connection is closing");
                return { objectStore: function () {
                  function ok() {
                    var r = {};
                    setTimeout(function () {
                      r.result = undefined;
                      r.onsuccess();
                    }, 0);
                    return r;
                  }
                  return { get: ok, getAllKeys: ok };
                } };
              }
            };
            req.onsuccess();
          }
        }, 0);
        return req;
      }
    };
  }

  function roundTrip(store) {
    return store
      .put("drafts", "a", { x: 1 })
      .then(function () {
        return store.get("drafts", "a");
      })
      .then(function (v) {
        T.equal(v, { x: 1 });
        return store.keys("drafts");
      })
      .then(function (keys) {
        T.equal(keys, ["a"]);
        return store.del("drafts", "a");
      })
      .then(function () {
        return store.get("drafts", "a");
      })
      .then(function (v) {
        T.equal(v, undefined);
      });
  }

  T.test("storage: memory storage keeps values for the session", function () {
    var m = St.memory();
    T.equal(m.persistent, false);
    return roundTrip(m);
  });

  T.test("storage: without IndexedDB, storage falls back to memory and says why", function () {
    return St.open(null).then(function (s) {
      T.equal(s.persistent, false);
      T.ok(/no IndexedDB/.test(s.reason));
      return roundTrip(s);
    });
  });

  ["throw", "error", "blocked"].forEach(function (how) {
    T.test("storage: an IndexedDB that fails to open (" + how + ") falls back to memory", function () {
      return St.open(failingIdb(how)).then(function (s) {
        T.equal(s.persistent, false);
        T.ok(s.reason, "a reason is given");
        return roundTrip(s);
      });
    });
  });

  T.test("storage: an IndexedDB that fails later falls back to memory and reports it", function () {
    return St.open(failingIdb("transaction")).then(function (s) {
      T.equal(s.persistent, true);
      var reported = null;
      s.onfail = function (why) {
        reported = why;
      };
      return roundTrip(s).then(function () {
        T.equal(s.persistent, false);
        T.ok(/closing/.test(reported), String(reported));
      });
    });
  });

  T.test("storage: the browser's IndexedDB keeps values", function () {
    if (typeof indexedDB === "undefined") T.notChecked("needs IndexedDB");
    return St.open().then(function (s) {
      if (!s.persistent) T.notChecked("this browser's storage is unavailable: " + s.reason);
      var key = "test-" + Date.now();
      return s
        .put("assets", key, { blob: [1, 2, 3] })
        .then(function () {
          return St.open();
        })
        .then(function (again) {
          return again.get("assets", key).then(function (v) {
            T.equal(v, { blob: [1, 2, 3] });
            return again.del("assets", key);
          });
        });
    });
  }, { dom: true });

  T.test("storage blocked: the editor works for the session and says nothing will be remembered", function (ctx) {
    return T.ui.start(ctx, { storage: null, idb: failingIdb("throw") }).then(function (app) {
      var notice = T.ui.q(app, '[data-notice="storage"]');
      T.ok(/drafts and imported assets won't be remembered/.test(notice.textContent), notice.textContent);
      return app.newMod("starcraft").then(function () {
        app.edit(function (d) {
          return AG.core.doc.setConstant(d, app.cat(), "max_supply", 600);
        });
        T.ok(app.isDirty());
        return app.flushDraft();
      }).then(function () {
        T.ok(app.root.querySelector('[data-notice="storage"]'), "the notice stays while editing");
      });
    });
  }, { dom: true });

  T.test("storage blocked later: a failure during the session shows the notice", function (ctx) {
    return St.open(failingIdb("writes")).then(function (store) {
      return T.ui.start(ctx, { storage: store }).then(function (app) {
        T.ok(!app.root.querySelector('[data-notice="storage"]'), "no notice while storage works");
        return app.newMod("starcraft").then(function () {
          app.edit(function (d) {
            return AG.core.doc.setConstant(d, app.cat(), "max_supply", 600);
          });
          return app.flushDraft();
        }).then(function () {
          T.ok(app.root.querySelector('[data-notice="storage"]'), "the notice appears");
        });
      });
    });
  }, { dom: true });
})(AxeGraft);
