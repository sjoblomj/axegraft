// Runs the shared mod fixtures in test/fixtures/mods. Each fixture is plain
// JSON: a mod (or raw text or bytes), and whether the editor refuses it, and
// the paths of the errors and warnings it expects. Fixtures in valid/ must
// have none. They use the fixture catalogs, not the samples.
"use strict";

(function (AG) {
  var T = AG.testing;

  function catalogs() {
    return { starcraft: T.catalog("starcraft"), warcraft2: T.catalog("warcraft2") };
  }

  function input(f) {
    if (f.text !== undefined) return f.text;
    if (f.bytes !== undefined) return new Uint8Array(f.bytes);
    return JSON.stringify(f.mod);
  }

  function paths(problems, severity) {
    return problems
      .filter(function (p) {
        return p.severity === severity;
      })
      .map(function (p) {
        return p.path;
      })
      .sort();
  }

  T.test("mod fixtures: there are valid and invalid fixtures", function () {
    var dirs = {};
    T.modFixtures.forEach(function (f) {
      dirs[f.file.split("/").slice(0, 2).join("/")] = true;
    });
    T.equal(Object.keys(dirs).sort(), ["mods/invalid", "mods/valid"]);
  });

  T.modFixtures.forEach(function (f) {
    T.test("mod fixture " + f.file + " (" + f.scenario + ")", function () {
      var result = AG.core.modfile.read(input(f), catalogs());
      var e = f.expect;
      var shown = result.problems
        .map(function (p) {
          return (p.refuse ? "refuse " : p.severity + " ") + (p.path || "(file)") + ": " + p.message;
        })
        .join("\n");
      T.equal(result.refused, e.refused, "refused\n" + shown);
      T.equal(paths(result.problems, "error"), e.errors, "error paths\n" + shown);
      T.equal(paths(result.problems, "warning"), e.warnings || [], "warning paths\n" + shown);
      (e.messages || []).forEach(function (m) {
        T.ok(
          result.problems.some(function (p) {
            return p.message.indexOf(m) >= 0;
          }),
          "no message mentions " + JSON.stringify(m) + "\n" + shown
        );
      });
      var valid = !e.refused && !e.errors.length;
      T.equal(/^mods\/valid\//.test(f.file), valid, "a fixture in valid/ must have no errors, and one in invalid/ must have some");
      if (!result.refused) T.ok(result.mod !== null, "a file that isn't refused gives a mod");
    });
  });
})(AxeGraft);
