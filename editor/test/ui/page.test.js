// The test page's adapters for a chosen folder, given file-like objects as a
// folder picker returns them.
"use strict";

(function (AG) {
  var T = AG.testing;

  function fakeFile(rel, text) {
    return {
      name: rel.split("/").pop(),
      webkitRelativePath: rel,
      size: text.length,
      text: function () {
        return Promise.resolve(text);
      }
    };
  }

  T.test("test page: a chosen editor folder becomes a tree the source tree checks read", function () {
    var tree = AG.testing.page.sourceTreeFromFiles([
      fakeFile("editor/index.html", '<script src="src/core/a.js"></script>'),
      fakeFile("editor/src/core/a.js", "var a;")
    ]);
    T.equal(tree.paths, ["index.html", "src/core/a.js"]);
    return AG.testing.checkTree(tree).then(function (problems) {
      T.equal(problems, []);
      return tree.read("src/core/a.js").then(function (text) {
        T.equal(text, "var a;");
      });
    });
  }, { dom: true });
})(AxeGraft);
