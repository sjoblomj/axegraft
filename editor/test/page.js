// Runs every test on the test page and lists passes, failures and tests not
// checked. Tests that read the editor's own files or real game files run
// once the folder is chosen with the buttons at the top, since a page opened
// from disk can't read files by itself.
"use strict";

(function (AG) {
  var T = AG.testing;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // Wraps a chosen folder as the tree the source-tree tests read.
  function sourceTreeFromFiles(fileList) {
    var files = {};
    Array.prototype.forEach.call(fileList, function (f) {
      var rel = (f.webkitRelativePath || f.name).split("/").slice(1).join("/");
      if (rel) files[rel] = f;
    });
    return {
      paths: Object.keys(files).sort(),
      read: function (path) {
        var f = files[path];
        if (!f) return Promise.reject(new Error("no file " + path));
        return f.text();
      }
    };
  }

  // Wraps chosen game files as the list the game-file tests read.
  function gameFilesFromFiles(fileList) {
    return {
      files: Array.prototype.map.call(fileList, function (f) {
        return f;
      })
    };
  }

  function render(results, out, sum) {
    out.textContent = "";
    results.forEach(function (r) {
      var li = el("li", "result " + r.status.replace(" ", "-"));
      li.appendChild(el("span", "status", r.status === "pass" ? "PASS" : r.status === "fail" ? "FAIL" : "NOT CHECKED"));
      li.appendChild(el("span", "name", r.name));
      if (r.message) li.appendChild(el("pre", "message", r.message));
      out.appendChild(li);
    });
    sum.textContent =
      results.length +
      " tests: " +
      T.summary(results).pass +
      " passed, " +
      T.summary(results).fail +
      " failed, " +
      T.summary(results).notChecked +
      " not checked";
    sum.className = "summary " + (T.summary(results).fail ? "failed" : "passed");
  }

  function runAll(env) {
    var out = document.getElementById("results");
    var sum = document.getElementById("summary");
    var sandbox = document.getElementById("sandbox");
    var live = [];
    sum.textContent = "Running...";
    env.dom = true;
    env.sandbox = function () {
      var box = document.createElement("div");
      sandbox.appendChild(box);
      return box;
    };
    env.afterEach = function () {
      sandbox.textContent = "";
    };
    return T.run(env, function (r) {
      live.push(r);
      if (live.length % 25 === 0) sum.textContent = "Running... " + live.length + " of " + T.cases.length;
    }).then(function (results) {
      render(results, out, sum);
      var s = T.summary(results);
      document.title = (s.fail ? "FAIL " : "PASS ") + s.pass + "/" + s.total + " - AxeGraft Editor tests";
      // One line per failure and a summary, for reading from a console.
      results.forEach(function (r) {
        if (r.status === "fail") console.log("AXEGRAFT-TEST FAIL " + r.name + " :: " + r.message.split("\n")[0]);
      });
      console.log("AXEGRAFT-TESTS pass=" + s.pass + " fail=" + s.fail + " notchecked=" + s.notChecked + " total=" + s.total);
      return results;
    });
  }

  AG.testing.page = {
    sourceTreeFromFiles: sourceTreeFromFiles,
    gameFilesFromFiles: gameFilesFromFiles,
    start: function () {
      var env = {};
      document.getElementById("source-dir").addEventListener("change", function (e) {
        env.sourceTree = sourceTreeFromFiles(e.target.files);
        runAll(env);
      });
      document.getElementById("game-dir").addEventListener("change", function (e) {
        env.gameFiles = gameFilesFromFiles(e.target.files);
        runAll(env);
      });
      document.getElementById("rerun").addEventListener("click", function () {
        runAll(env);
      });
      return runAll(env);
    }
  };
})(AxeGraft);
