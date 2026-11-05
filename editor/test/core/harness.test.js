// Checks the harness itself: passes, failures, async tests and tests whose
// needs aren't met.
"use strict";

(function (AG) {
  var T = AG.testing;

  T.test("harness: lists a pass, a failure and a test not checked", function () {
    var inner = T.createHarness();
    inner.test("deliberate pass", function () {
      inner.equal(1 + 1, 2);
    });
    inner.test("deliberate failure", function () {
      inner.equal(1 + 1, 3, "arithmetic");
    });
    inner.test("needs game files", function () {}, { gameFiles: true });
    inner.test("async pass", function () {
      return Promise.resolve();
    });
    inner.test("async failure", function () {
      return Promise.reject(new Error("rejected on purpose"));
    });
    inner.test("explicitly not checked", function () {
      inner.notChecked("nothing to check against");
    });
    return inner.run({}).then(function (results) {
      T.equal(
        results.map(function (r) {
          return r.status;
        }),
        ["pass", "fail", "not checked", "pass", "fail", "not checked"]
      );
      T.ok(/expected 3, got 2/.test(results[1].message), "failure says what differed: " + results[1].message);
      T.ok(/rejected on purpose/.test(results[4].message), "async failure keeps its message");
      T.equal(T.summary(results), { pass: 2, fail: 2, notChecked: 2, total: 6 });
    });
  });

  T.test("harness: deep equality compares JSON values", function () {
    T.equal({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] });
    T.throws(function () {
      T.equal({ a: 1 }, { a: 1, b: undefined === undefined ? 2 : 0 });
    });
    T.throws(function () {
      T.equal([1, 2], [2, 1]);
    });
  });
})(AxeGraft);
