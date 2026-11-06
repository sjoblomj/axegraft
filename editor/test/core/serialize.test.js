// Canonical file output.
"use strict";

(function (AG) {
  var T = AG.testing;
  var D = AG.core.doc;
  var ser = AG.core.serialize;

  var MOVE = { position: 1, icon: 228, condition: "bf_always", action: "order_move", enabled_string: 664, disabled_string: 0 };

  T.test("stable file output: a new mod holds only its header", function () {
    T.equal(ser(D.create("starcraft"), T.catalog("starcraft")), '{\n  "patcher": "AxeGraft",\n  "format": 1,\n  "game": "starcraft",\n  "mod": {\n    "name": "",\n    "version": "",\n    "authors": []\n  }\n}\n');
  });

  T.test("stable file output: the layout of a mod with every part", function () {
    var cat = T.catalog("starcraft");
    var doc = D.create("starcraft");
    doc = D.setConstant(doc, cat, "max_supply", 600);
    doc = D.setRequirement(doc, cat, "upgrade", 3, ["current_unit_is", 139]);
    doc = D.setButtons(doc, cat, 7, [Object.assign({ condition_variable: 0 }, MOVE)]);
    doc = D.setUnitField(doc, cat, 32, "button_set", 7);
    T.equal(
      ser(doc, cat),
      [
        "{",
        '  "patcher": "AxeGraft",',
        '  "format": 1,',
        '  "game": "starcraft",',
        '  "mod": {',
        '    "name": "",',
        '    "version": "",',
        '    "authors": []',
        "  },",
        '  "units": [',
        '    { "id": 32, "label": "Terran Firebat", "button_set": 7 }',
        "  ],",
        '  "button_sets": [',
        "    {",
        '      "id": 7,',
        '      "label": "SCV",',
        '      "buttons": [',
        '        { "position": 1, "icon": 228, "condition": "bf_always", "action": "order_move", "enabled_string": 664, "disabled_string": 0 }',
        "      ]",
        "    }",
        "  ],",
        '  "requirements": [',
        "    {",
        '      "type": "upgrade",',
        '      "id": 3,',
        '      "label": "Zerg Carapace",',
        '      "list": ["current_unit_is", 139]',
        "    }",
        "  ],",
        '  "constants": [',
        '    { "name": "max_supply", "label": "Maximum supply", "value": 600 }',
        "  ]",
        "}",
        ""
      ].join("\n")
    );
  });

  T.test("stable file output: saving twice gives identical bytes", function () {
    var cat = T.catalog("starcraft");
    var doc = D.setButtons(D.setUnitField(D.create("starcraft"), cat, 0, "button_set", 5), cat, 5, [MOVE]);
    T.equal(ser(doc, cat), ser(doc, cat));
    T.equal(ser(doc, cat), ser(JSON.parse(JSON.stringify(doc)), cat));
  });

  T.test("stable file output: the same changes in a different order give identical bytes", function () {
    var cat = T.catalog("starcraft");
    var edits = [
      function (d) {
        return D.setUnitField(d, cat, 32, "button_set", 5);
      },
      function (d) {
        return D.setUnitField(d, cat, 0, "status_update", "statdraw_draw_none");
      },
      function (d) {
        return D.setUnitField(d, cat, 0, "button_set", 7);
      },
      function (d) {
        return D.setButtons(d, cat, 5, [MOVE]);
      },
      function (d) {
        return D.addSet(d, cat, 251, [MOVE]).doc;
      },
      function (d) {
        return D.setButtons(d, cat, 0, []);
      },
      function (d) {
        return D.setRequirement(d, cat, "order", 7, [41]);
      },
      function (d) {
        return D.setRequirement(d, cat, "unit", 32, []);
      },
      function (d) {
        return D.setRequirement(d, cat, "upgrade", 3, []);
      },
      function (d) {
        return D.setConstant(d, cat, "web_duration", 1);
      },
      function (d) {
        return D.setConstant(d, cat, "cloak_energy", "regain");
      }
    ];
    var forward = edits.reduce(function (d, f) {
      return f(d);
    }, D.create("starcraft"));
    var rnd = AG.util.random(42);
    for (var i = 0; i < 20; i++) {
      var shuffled = edits.slice().sort(function () {
        return rnd() - 0.5;
      });
      var other = shuffled.reduce(function (d, f) {
        return f(d);
      }, D.create("starcraft"));
      T.equal(ser(other, cat), ser(forward, cat), "order " + i);
    }
  });

  T.test("stable file output: an opened file's entries are sorted the same way, whatever their order", function () {
    var cat = T.catalog("starcraft");
    var a = { patcher: "AxeGraft", game: "starcraft", format: 1, units: [{ status_update: "statdraw_draw_none", id: 5 }, { id: 5, button_set: 0 }, { button_set: 7, id: 0 }] };
    var b = { format: 1, patcher: "AxeGraft", game: "starcraft", units: [{ button_set: 7, id: 0 }, { button_set: 0, id: 5 }, { id: 5, status_update: "statdraw_draw_none" }] };
    T.equal(ser(a, cat), ser(b, cat));
  });

  T.test("output readable by the patcher: opening a saved file gives the same mod", function () {
    var cats = { starcraft: T.catalog("starcraft"), warcraft2: T.catalog("warcraft2") };
    var n = 0;
    T.modFixtures.forEach(function (f) {
      if (!/^mods\/valid\//.test(f.file) || !f.mod) return;
      var cat = cats[f.mod.game];
      var doc = D.normalize(f.mod, cat);
      var text = ser(doc, cat);
      var again = AG.core.modfile.read(text, cats);
      T.equal(again.refused, false, f.file);
      T.equal(again.problems, [], f.file);
      T.equal(AG.core.canonical(again.mod, cat), AG.core.canonical(doc, cat), f.file);
      T.equal(ser(again.mod, cat), text, f.file + " saves to the same bytes");
      n++;
    });
    T.ok(n > 20, "checked " + n + " fixtures");
  });
})(AxeGraft);
