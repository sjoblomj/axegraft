// Checks the source tree: every script is listed where it's loaded, there's
// no package manifest or lockfile, and nothing that runs names a remote URL.
//
// The checks are a function of a tree ({ paths, read }), so they are also
// tested against small trees that break each rule on purpose.
"use strict";

(function (AG) {
  var T = AG.testing;

  var MANIFESTS = [
    "package.json",
    "package-lock.json",
    "npm-shrinkwrap.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "bun.lockb",
    "bower.json",
    "deno.json",
    "deno.jsonc",
    "deno.lock",
    "composer.json",
    "composer.lock",
    "Gemfile",
    "Gemfile.lock",
    "requirements.txt",
    "Pipfile",
    "Pipfile.lock",
    "Cargo.toml",
    "Cargo.lock",
    "tsconfig.json",
    "webpack.config.js",
    "vite.config.js",
    "rollup.config.js"
  ];
  var VENDOR_DIRS = ["node_modules", "bower_components", "vendor", "jspm_packages"];
  // Links the user can choose to follow. They load nothing by themselves.
  var ALLOWED_LINKS = ["https://jorsys.org", "https://github.com/sjoblomj/axegraft/releases", "https://www.jorsys.org/common/software/mpqdraft.html"];

  function base(p) {
    return p.split("/").pop();
  }

  function scriptSrcs(html) {
    var out = [];
    var re = /<script\b[^>]*\bsrc="([^"]+)"/g;
    var m;
    while ((m = re.exec(html))) out.push(m[1]);
    return out;
  }

  // Files that run in the browser or test page, and so must name no remote URL.
  function runs(p) {
    return /\.(js|html|css)$/.test(p) && !/^openspec\//.test(p) && !/^\./.test(p);
  }

  // Returns a list of problems with a source tree.
  function checkTree(tree) {
    var problems = [];
    var paths = tree.paths;
    var has = {};
    paths.forEach(function (p) {
      has[p] = true;
    });

    paths.forEach(function (p) {
      if (MANIFESTS.indexOf(base(p)) >= 0) problems.push("package manifest or lockfile: " + p);
      p.split("/").slice(0, -1).forEach(function (dir) {
        if (VENDOR_DIRS.indexOf(dir) >= 0) problems.push("vendored code directory: " + p);
      });
    });

    var reads = [tree.read("index.html"), has["test/index.html"] ? tree.read("test/index.html") : Promise.resolve("")];
    var runnable = paths.filter(runs);
    return Promise.all(reads).then(function (htmls) {
      var app = scriptSrcs(htmls[0]);
      // On the test page, the app's scripts are those under "../".
      var testPage = scriptSrcs(htmls[1]);
      var appOnPage = testPage
        .filter(function (s) {
          return s.indexOf("../") === 0;
        })
        .map(function (s) {
          return s.slice(3);
        });

      // Every app script is in index.html, and index.html names only files that exist.
      paths
        .filter(function (p) {
          return /^(src|catalog|assets)\/.*\.js$/.test(p);
        })
        .forEach(function (p) {
          if (app.indexOf(p) < 0) problems.push("not listed in index.html: " + p);
        });
      app.forEach(function (src) {
        if (!has[src] && !/^assets\//.test(src)) problems.push("index.html lists a missing file: " + src);
      });

      // The test page loads the app's scripts in the same order, and every test file.
      if (has["test/index.html"]) {
        if (appOnPage.join("\n") !== app.join("\n")) {
          problems.push("test/index.html doesn't load the app's scripts in the order index.html does");
        }
        paths
          .filter(function (p) {
            return /^test\/.*\.js$/.test(p) && p !== "test/run-node.js";
          })
          .forEach(function (p) {
            if (testPage.indexOf(p.slice("test/".length)) < 0) problems.push("not listed in test/index.html: " + p);
          });
      }

      return Promise.all(
        runnable.map(function (p) {
          return tree.read(p).then(function (text) {
            var re = /\b(?:https?|ftp|wss?):\/\/[^\s"'`)]+/gi;
            var m;
            while ((m = re.exec(text))) {
              if (ALLOWED_LINKS.indexOf(m[0]) < 0) problems.push("remote URL in " + p + ": " + m[0]);
            }
            if (/(?:src|href)\s*=\s*["']\/\//i.test(text) || /url\(\s*["']?\/\//i.test(text)) {
              problems.push("protocol-relative URL in " + p);
            }
          });
        })
      ).then(function () {
        return problems;
      });
    });
  }

  AG.testing.checkTree = checkTree;

  // A small tree held in memory.
  function memoryTree(files) {
    return {
      paths: Object.keys(files).sort(),
      read: function (p) {
        return p in files ? Promise.resolve(files[p]) : Promise.reject(new Error("no file " + p));
      }
    };
  }

  function goodFiles() {
    return {
      "index.html": '<script src="src/core/a.js"></script><script src="catalog/game.js"></script>',
      "styles.css": "body { color: black; }",
      "src/core/a.js": "var a = 1;",
      "catalog/game.js": "AxeGraft.registerCatalog({});",
      "test/index.html":
        '<script src="../src/core/a.js"></script><script src="../catalog/game.js"></script><script src="harness.js"></script><script src="core/a.test.js"></script>',
      "test/harness.js": "",
      "test/core/a.test.js": "",
      "test/run-node.js": "",
      "README.md": "Some docs may link to " + "https:" + "//example.org/"
    };
  }

  T.test("source tree checks: a tree that follows every rule passes", function () {
    return checkTree(memoryTree(goodFiles())).then(function (problems) {
      T.equal(problems, []);
    });
  });

  T.test("source tree checks: a script missing from index.html fails", function () {
    var files = goodFiles();
    files["src/core/b.js"] = "var b = 2;";
    return checkTree(memoryTree(files)).then(function (problems) {
      T.equal(problems, ["not listed in index.html: src/core/b.js"]);
    });
  });

  T.test("source tree checks: a test file missing from the test page fails", function () {
    var files = goodFiles();
    files["test/core/b.test.js"] = "";
    return checkTree(memoryTree(files)).then(function (problems) {
      T.equal(problems, ["not listed in test/index.html: test/core/b.test.js"]);
    });
  });

  T.test("source tree checks: the test page loading scripts in another order fails", function () {
    var files = goodFiles();
    files["test/index.html"] =
      '<script src="../catalog/game.js"></script><script src="../src/core/a.js"></script><script src="harness.js"></script><script src="core/a.test.js"></script>';
    return checkTree(memoryTree(files)).then(function (problems) {
      T.equal(problems, ["test/index.html doesn't load the app's scripts in the order index.html does"]);
    });
  });

  T.test("source tree checks: a package manifest or lockfile fails", function () {
    var files = goodFiles();
    files["package.json"] = "{}";
    files["test/yarn.lock"] = "";
    return checkTree(memoryTree(files)).then(function (problems) {
      T.equal(problems, ["package manifest or lockfile: package.json", "package manifest or lockfile: test/yarn.lock"]);
    });
  });

  T.test("source tree checks: vendored code fails", function () {
    var files = goodFiles();
    files["node_modules/x/index.md"] = "";
    return checkTree(memoryTree(files)).then(function (problems) {
      T.equal(problems, ["vendored code directory: node_modules/x/index.md"]);
    });
  });

  T.test("source tree checks: a remote URL in source fails", function () {
    var files = goodFiles();
    var remote = "ht" + "tps://cdn.example.org/lib.js";
    files["src/core/a.js"] = "load('" + remote + "');";
    files["styles.css"] = "@import url(" + "//fonts.example.org/x.css);";
    return checkTree(memoryTree(files)).then(function (problems) {
      T.equal(problems.sort(), ["protocol-relative URL in styles.css", "remote URL in src/core/a.js: " + remote]);
    });
  });

  T.test("source tree checks: an allowed link passes, but only that exact URL", function () {
    var files = goodFiles();
    var other = ALLOWED_LINKS[0] + "/lib.js";
    files["src/core/a.js"] = "var a = '" + ALLOWED_LINKS[0] + "';";
    files["styles.css"] = "/* " + other + " */";
    return checkTree(memoryTree(files)).then(function (problems) {
      T.equal(problems, ["remote URL in styles.css: " + other]);
    });
  });

  T.test("source tree: the editor's own files follow every rule", function (ctx) {
    return checkTree(ctx.sourceTree).then(function (problems) {
      T.equal(problems, []);
    });
  }, { sourceTree: true });
})(AxeGraft);
