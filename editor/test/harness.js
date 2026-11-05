// A small test harness with no dependencies.
//
// Test files call AxeGraft.testing.test(name, fn, options). `fn` gets a
// context and may return a promise. Options say what a test needs:
//   dom:        a browser DOM (not available in the Node runner)
//   gameFiles:  real game files, from AXEGRAFT_EDITOR_GAME_DIR or a folder
//               chosen on the test page
//   sourceTree: the editor's own files, read from disk or a chosen folder
// A test whose needs aren't met is reported as not checked, never as passed.
"use strict";

(function (AG) {
  function NotChecked(reason) {
    this.reason = reason;
  }

  function AssertionError(message) {
    this.name = "AssertionError";
    this.message = message;
  }
  AssertionError.prototype = Object.create(Error.prototype);

  function show(v) {
    var s;
    try {
      s = JSON.stringify(v);
      if (s === undefined) s = String(v);
    } catch (e) {
      s = String(v);
    }
    return s.length > 400 ? s.slice(0, 400) + "... (" + s.length + " characters)" : s;
  }

  function createHarness() {
    var cases = [];

    var api = {
      cases: cases,

      test: function (name, fn, options) {
        cases.push({ name: name, fn: fn, options: options || {} });
      },

      ok: function (cond, message) {
        if (!cond) throw new AssertionError(message || "expected a true value");
      },

      equal: function (actual, expected, message) {
        if (!AG.util.equal(actual, expected)) {
          throw new AssertionError(
            (message ? message + ": " : "") + "expected " + show(expected) + ", got " + show(actual)
          );
        }
      },

      notEqual: function (actual, unexpected, message) {
        if (AG.util.equal(actual, unexpected)) {
          throw new AssertionError((message ? message + ": " : "") + "did not expect " + show(actual));
        }
      },

      throws: function (fn, message) {
        var threw = false;
        try {
          fn();
        } catch (e) {
          threw = true;
        }
        if (!threw) throw new AssertionError(message || "expected an exception");
      },

      notChecked: function (reason) {
        throw new NotChecked(reason);
      },

      // Runs every test in order. `env` says what this runner provides.
      run: function (env, onResult) {
        env = env || {};
        var results = [];
        var index = 0;
        return new Promise(function (resolve) {
          function next() {
            if (index >= cases.length) {
              resolve(results);
              return;
            }
            var c = cases[index++];
            var started = Date.now();
            var missing = null;
            if (c.options.dom && !env.dom) missing = "needs a browser";
            else if (c.options.gameFiles && !env.gameFiles) missing = "needs game files (AXEGRAFT_EDITOR_GAME_DIR)";
            else if (c.options.sourceTree && !env.sourceTree) missing = "needs the source tree";

            function finish(status, message) {
              var r = { name: c.name, status: status, message: message || "", ms: Date.now() - started };
              results.push(r);
              if (onResult) onResult(r);
              if (env.afterEach) env.afterEach();
              setTimeout(next, 0);
            }

            if (missing) {
              finish("not checked", missing);
              return;
            }
            var ctx = {
              gameFiles: env.gameFiles || null,
              sourceTree: env.sourceTree || null,
              sandbox: env.sandbox || null
            };
            var timer = null;
            var done = false;
            function settle(status, message) {
              if (done) return;
              done = true;
              if (timer) clearTimeout(timer);
              finish(status, message);
            }
            function fail(e) {
              if (e instanceof NotChecked) settle("not checked", e.reason);
              else settle("fail", e && e.message ? e.message + (e instanceof AssertionError ? "" : "\n" + (e.stack || "")) : String(e));
            }
            try {
              var out = c.fn(ctx);
              if (out && typeof out.then === "function") {
                timer = setTimeout(function () {
                  settle("fail", "timed out after " + (c.options.timeout || 20000) + " ms");
                }, c.options.timeout || 20000);
                out.then(function () {
                  settle("pass");
                }, fail);
              } else {
                settle("pass");
              }
            } catch (e) {
              fail(e);
            }
          }
          next();
        });
      }
    };
    return api;
  }

  function summary(results) {
    var s = { pass: 0, fail: 0, notChecked: 0, total: results.length };
    results.forEach(function (r) {
      if (r.status === "pass") s.pass++;
      else if (r.status === "fail") s.fail++;
      else s.notChecked++;
    });
    return s;
  }

  // Fixture catalogs and mods are plain JSON inside one wrapper call, like
  // catalogs, so that other tools can read them by removing that line.
  var fixtureCatalogs = {};
  var modFixtures = [];
  AG.registerFixtureCatalog = function (raw) {
    fixtureCatalogs[raw.game] = raw;
  };
  var exampleCatalog = null;
  AG.registerExampleCatalog = function (raw) {
    exampleCatalog = raw;
  };
  AG.registerModFixture = function (fixture) {
    var s = typeof document !== "undefined" && document.currentScript;
    var src = (s && s.src) || AG.currentScript || "";
    fixture.file = decodeURIComponent(src).split("/test/fixtures/").pop();
    modFixtures.push(fixture);
  };

  var main = createHarness();
  AG.testing = {
    createHarness: createHarness,
    summary: summary,
    AssertionError: AssertionError,
    test: main.test,
    ok: main.ok,
    equal: main.equal,
    notEqual: main.notEqual,
    throws: main.throws,
    notChecked: main.notChecked,
    run: main.run,
    cases: main.cases,
    modFixtures: modFixtures,
    // The example from docs/catalog-format.md.
    exampleCatalog: function () {
      return JSON.parse(JSON.stringify(exampleCatalog));
    },
    // A fresh copy of a fixture catalog's raw data.
    rawCatalog: function (game) {
      return JSON.parse(JSON.stringify(fixtureCatalogs[game]));
    },
    // A fixture catalog, checked and indexed.
    catalog: function (game) {
      var raw = JSON.parse(JSON.stringify(fixtureCatalogs[game]));
      var problems = AG.core.catalog.check(raw, "fixture-" + game);
      if (problems.length) throw new Error(problems.join("\n"));
      return AG.core.catalog.index(raw, "fixture-" + game);
    }
  };
})(AxeGraft);
