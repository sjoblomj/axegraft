// Reading mod files: input too large or too deep to be a mod, and how the
// results are sorted into refused files, errors and warnings.
"use strict";

(function (AG) {
  var T = AG.testing;
  var M = AG.core.modfile;

  function catalogs() {
    return { starcraft: T.catalog("starcraft"), warcraft2: T.catalog("warcraft2") };
  }

  T.test("mod information: name, version and authors are accepted and change nothing", function () {
    var r = M.read('{"patcher": "AxeGraft", "format": 1, "game": "starcraft", "mod": {"name": "Faster Marines", "version": "1.2", "authors": ["Alice", "Bob"]}}', catalogs());
    T.ok(!r.refused);
    T.equal(r.problems, []);
    T.ok(AG.core.doc.isEmpty(r.mod));
  });

  T.test("mod information: unknown properties of mod are accepted, kept and saved after the known ones", function () {
    var cat = T.catalog("starcraft");
    var r = M.read('{"patcher": "AxeGraft", "format": 1, "game": "starcraft", "mod": {"website": "example.org", "name": "X", "notes": {"a": 1}}}', catalogs());
    T.ok(!r.refused);
    T.equal(r.problems, []);
    var doc = AG.core.doc.normalize(r.mod, cat);
    T.equal(doc.mod, { website: "example.org", name: "X", notes: { a: 1 }, version: "", authors: [] });
    doc = AG.core.doc.withInfo(doc, { name: "Y" });
    T.equal(doc.mod.website, "example.org", "editing the information keeps them");
    T.equal(Object.keys(JSON.parse(AG.core.serialize(doc, cat)).mod), ["name", "version", "authors", "notes", "website"]);
  });

  T.test("mod information: a file without it opens, and is saved with it empty", function () {
    var cat = T.catalog("starcraft");
    var r = M.read('{"patcher": "AxeGraft", "format": 1, "game": "starcraft"}', catalogs());
    T.ok(!r.refused);
    T.equal(r.problems, []);
    var doc = AG.core.doc.normalize(r.mod, cat);
    T.equal(doc.mod, { name: "", version: "", authors: [] });
    T.ok(/"mod": \{\n    "name": "",\n    "version": "",\n    "authors": \[\]\n  \}/.test(AG.core.serialize(doc, cat)));
  });

  T.test("mod information: values of the wrong type are errors, and authors that aren't an array are refused", function () {
    var r = M.read('{"patcher": "AxeGraft", "format": 1, "game": "starcraft", "mod": {"name": 3, "version": null, "authors": ["Alice", 7]}}', catalogs());
    T.ok(!r.refused);
    T.equal(r.problems.map(function (p) {
      return p.path;
    }).sort(), ["mod.authors[1]", "mod.name", "mod.version"]);
    r = M.read('{"patcher": "AxeGraft", "format": 1, "game": "starcraft", "mod": {"authors": "Alice"}}', catalogs());
    T.ok(r.refused);
    T.equal(r.problems[0].path, "mod.authors");
    r = M.read('{"patcher": "AxeGraft", "format": 1, "game": "starcraft", "mod": ["Alice"]}', catalogs());
    T.ok(r.refused);
    T.equal(r.problems[0].path, "mod");
  });

  T.test("reading: a very large file is refused without being parsed", function () {
    var bytes = new Uint8Array(M.MAX_BYTES + 1);
    bytes.fill(32);
    var started = Date.now();
    var r = M.read(bytes, catalogs());
    T.ok(r.refused && r.mod === null);
    T.ok(/far larger than any mod/.test(r.problems[0].message), r.problems[0].message);
    T.ok(Date.now() - started < 1000, "refused quickly");
    var text = '{"patcher": "AxeGraft", "format": 1, "game": "starcraft", "label": "' + new Array(M.MAX_BYTES).join("x") + '"}';
    T.ok(M.read(text, catalogs()).refused, "a very large string is refused too");
  });

  T.test("reading: nesting far deeper than JSON.parse can handle is refused", function () {
    var n = 200000;
    var text = new Array(n + 1).join("[") + new Array(n + 1).join("]");
    var r = M.read(text, catalogs());
    T.ok(r.refused);
    T.ok(/nested more than/.test(r.problems[0].message), r.problems[0].message);
  });

  T.test("reading: brackets inside strings don't count as nesting", function () {
    T.equal(M.nesting('{"a": "[[[[{{{{\\"]]]]", "b": [1]}', 100), 2);
    var r = M.read('{"patcher": "AxeGraft", "format": 1, "game": "starcraft", "mod": {"name": "[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[["}}', catalogs());
    T.equal(r.refused, false);
  });

  T.test("reading: every refusal names a reason, and arbitrary bytes don't throw", function () {
    var inputs = [
      new Uint8Array([0, 1, 2, 3]),
      new Uint8Array([0xef, 0xbb, 0xbf]),
      "null",
      "true",
      '"a string"',
      "12",
      "{",
      "{}",
      '{"patcher": "AxeGraft"}',
      new ArrayBuffer(0)
    ];
    inputs.forEach(function (input) {
      var r = M.read(input, catalogs());
      T.ok(r.refused, "refused: " + String(input));
      T.ok(r.problems.length > 0 && r.problems[0].message.length > 0);
    });
  });

  T.test("reading: a file for a game without a catalog is refused, naming the game", function () {
    var r = M.read('{"patcher": "AxeGraft", "format": 1, "game": "warcraft2"}', { starcraft: T.catalog("starcraft") });
    T.ok(r.refused);
    T.ok(/no catalog for warcraft2/.test(r.problems[0].message), r.problems[0].message);
  });

  T.test("strict fields: two mods that differ only in their labels are judged the same", function () {
    var a = { patcher: "AxeGraft", format: 1, game: "starcraft", units: [{ id: 0, button_set: 250, label: "One" }], constants: [{ name: "max_supply", value: 70000 }] };
    var b = JSON.parse(JSON.stringify(a));
    b.units[0].label = "Two";
    b.constants[0].label = "Supply";
    function shown(r) {
      return r.problems.map(function (p) {
        return p.path + " " + p.message;
      });
    }
    T.equal(shown(M.read(JSON.stringify(a), catalogs())), shown(M.read(JSON.stringify(b), catalogs())));
    T.equal(shown(M.read(JSON.stringify(a), catalogs())).length, 2);
  });

  // ---- Refused files, errors and warnings

  T.test("refusing malformed files: an unknown property and an out-of-range ID are both listed, with their locations", function () {
    var r = M.read(JSON.stringify({ patcher: "AxeGraft", format: 1, game: "starcraft", units: [{ id: 999, button_set: 0, colour: 1 }] }), catalogs());
    T.ok(r.refused && r.mod === null);
    T.equal(
      r.problems.map(function (p) {
        return p.path;
      }).sort(),
      ["units[0].colour", "units[0].id"]
    );
    T.equal(
      r.problems.filter(function (p) {
        return p.refuse;
      }).length,
      1,
      "only the unknown property is a reason to refuse"
    );
  });

  T.test("opening a file with errors: a value out of bounds is kept as written, with an error", function () {
    var mod = { patcher: "AxeGraft", format: 1, game: "starcraft", button_sets: [{ id: 0, buttons: [{ position: 12, icon: 228, condition: "bf_always", action: "order_move", enabled_string: 664, disabled_string: 0 }] }] };
    var r = M.read(JSON.stringify(mod), catalogs());
    T.equal(r.refused, false);
    T.equal(r.mod.button_sets[0].buttons[0].position, 12);
    T.equal(
      r.problems.map(function (p) {
        return [p.severity, p.path];
      }),
      [["error", "button_sets[0].buttons[0].position"]]
    );
  });

  T.test("opening a file with errors: an entry with no matching item is marked so it can be listed and removed", function () {
    var mod = {
      patcher: "AxeGraft",
      format: 1,
      game: "starcraft",
      units: [{ id: 300, button_set: 0 }],
      button_sets: [{ id: 1200, buttons: [] }, { id: 32, buttons: [] }],
      requirements: [{ type: "tech_use", id: 99, list: [] }],
      constants: [{ name: "gravity", value: 1 }]
    };
    var r = M.read(JSON.stringify(mod), catalogs());
    T.equal(r.refused, false);
    T.equal(
      r.problems
        .filter(function (p) {
          return p.orphan;
        })
        .map(function (p) {
          return p.path;
        })
        .sort(),
      ["button_sets[0].id", "button_sets[1].id", "constants[0].name", "requirements[0].id", "units[0].id"]
    );
  });

  T.test("errors and warnings: a list ending with or is an error", function () {
    var mod = { patcher: "AxeGraft", format: 1, game: "starcraft", requirements: [{ type: "unit", id: 0, list: ["current_unit_is", 111, "or"] }] };
    var problems = AG.core.validate.check(mod, T.catalog("starcraft"));
    T.equal(
      problems.map(function (p) {
        return [p.severity, p.path];
      }),
      [["error", "requirements[0].list[2]"]]
    );
  });

  // Both games need ascending positions.
  function wc2Set(positions) {
    return {
      patcher: "AxeGraft",
      format: 1,
      game: "warcraft2",
      button_sets: [
        {
          id: 0,
          buttons: positions.map(function (p, i) {
            return { position: p, icon: 83 + i, condition: "w2_always", action: "w2_move", string: 400, highlighted: 0 };
          })
        }
      ]
    };
  }

  T.test("errors and warnings: Warcraft II buttons out of position order are an error naming the set and the button", function () {
    var problems = AG.core.validate.check(wc2Set([0, 5, 3, 8]), T.catalog("warcraft2"));
    T.equal(
      problems.map(function (p) {
        return [p.severity, p.path, p.message];
      }),
      [["error", "button_sets[0].buttons[2].position", "Set 0 (Footman) isn't in ascending position order: button 2 is at position 3, after position 5. This game needs each set's buttons sorted by position, lowest first."]]
    );
  });

  T.test("errors and warnings: Warcraft II buttons sharing a position in a row are no error", function () {
    T.equal(AG.core.validate.check(wc2Set([1, 1, 1, 4]), T.catalog("warcraft2")), []);
  });

  T.test("errors and warnings: StarCraft buttons out of position order are an error too", function () {
    var mod = withString(664);
    mod.button_sets[0].buttons.push(Object.assign({}, mod.button_sets[0].buttons[0], { position: 1 }));
    mod.button_sets[0].buttons[0] = Object.assign({}, mod.button_sets[0].buttons[0], { position: 7 });
    T.equal(
      AG.core.validate.check(mod, T.catalog("starcraft")).map(function (p) {
        return [p.severity, p.path];
      }),
      [["error", "button_sets[0].buttons[1].position"]]
    );
  });

  function withString(id) {
    return {
      patcher: "AxeGraft",
      format: 1,
      game: "starcraft",
      button_sets: [{ id: 0, buttons: [{ position: 1, icon: 228, condition: "bf_always", action: "order_move", enabled_string: id, disabled_string: 0 }] }]
    };
  }

  T.test("errors and warnings: a string ID beyond the loaded table is a warning that says how many strings it holds", function () {
    var problems = AG.core.validate.check(withString(1600), T.catalog("starcraft"), { strings: { count: 1547 } });
    T.equal(
      problems.map(function (p) {
        return [p.severity, p.path];
      }),
      [["warning", "button_sets[0].buttons[0].enabled_string"]]
    );
    T.ok(/holds 1547 strings/.test(problems[0].message), problems[0].message);
    T.equal(AG.core.validate.check(withString(1547), T.catalog("starcraft"), { strings: { count: 1547 } }), [], "the last string is fine");
  });

  T.test("errors and warnings: with no string table loaded there's no warning", function () {
    T.equal(AG.core.validate.check(withString(1600), T.catalog("starcraft")), []);
    T.equal(AG.core.validate.check(withString(1600), T.catalog("starcraft"), {}), []);
  });

  T.test("errors and warnings: warnings never change whether a shared fixture is valid", function () {
    // Assets so small that almost every icon and string ID draws a warning.
    var assets = { strings: { count: 1 }, icons: { count: 1 } };
    var warned = 0;
    T.modFixtures.forEach(function (f) {
      if (f.text !== undefined || f.bytes !== undefined) return;
      var text = JSON.stringify(f.mod);
      var without = M.read(text, catalogs());
      var withAssets = M.read(text, catalogs(), assets);
      function errors(r) {
        return r.problems
          .filter(function (p) {
            return p.severity === "error";
          })
          .map(function (p) {
            return p.path + ": " + p.message;
          });
      }
      T.equal(withAssets.refused, without.refused, f.file);
      T.equal(errors(withAssets), errors(without), f.file);
      warned += withAssets.problems.length - without.problems.length;
    });
    T.ok(warned > 10, "the assets did cause warnings: " + warned);
  });
})(AxeGraft);
