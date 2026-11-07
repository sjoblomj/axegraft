// The item tree logic: labels, order, filtering, markers and locating problems.
"use strict";

(function (AG) {
  var T = AG.testing;
  var Tr = AG.core.tree;
  var D = AG.core.doc;

  // The StarCraft fixture with extra table entries, listed out of order.
  function catalogWithUnits() {
    var raw = T.rawCatalog("starcraft");
    [
      [32, null],
      [16, "Sarah Kerrigan"],
      [51, "Infested Kerrigan"],
      [151, "Cerebrate"],
      [2, "Terran Vulture"]
    ].forEach(function (u) {
      if (u[1] === null) return;
      raw.units.push({ id: u[0], name: u[1], tree: u[0] === 2 ? ["Terran", "Ground Units"] : ["Heroes"], original: { button_set: null, status_changed: "statdraw_query_unit", status_update: "statdraw_draw_unit", status_unit_type: u[0] } });
    });
    return AG.core.catalog.index(raw);
  }

  function labels(nodes) {
    var out = [];
    (function walk(list) {
      list.forEach(function (n) {
        if (n.type === "item") out.push(n.label);
        else walk(n.children);
      });
    })(nodes);
    return out;
  }

  function groupOf(nodes, path) {
    var list = nodes;
    var g = null;
    path.forEach(function (name) {
      g = list.filter(function (n) {
        return n.type === "group" && n.label === name;
      })[0];
      list = g.children;
    });
    return g;
  }

  T.test("item labels: an item's label starts with its ID", function () {
    var nodes = Tr.build("units", D.create("starcraft"), T.catalog("starcraft"));
    T.ok(labels(nodes).indexOf("32 Terran Firebat") >= 0, labels(nodes).join(", "));
    var sets = Tr.build("button_sets", D.create("starcraft"), T.catalog("starcraft"));
    T.ok(labels(sets).indexOf("5 Siege Tank") >= 0);
  });

  T.test("item order: items in a group are sorted numerically by ID", function () {
    var nodes = Tr.build("units", D.create("starcraft"), catalogWithUnits());
    var g = groupOf(nodes, ["Terran", "Ground Units"]);
    T.equal(
      g.children.map(function (n) {
        return n.id;
      }),
      [0, 2, 5, 7, 32]
    );
    var heroes = groupOf(nodes, ["Heroes"]);
    T.equal(
      heroes.children.map(function (n) {
        return n.id;
      }),
      [16, 51, 151]
    );
  });

  T.test("item order: constants keep the tree's order, under its groups", function () {
    var nodes = Tr.build("constants", D.create("starcraft"), T.catalog("starcraft"));
    T.equal(
      nodes.map(function (n) {
        return n.label;
      }),
      ["Game", "Tech", "Units"]
    );
    T.equal(labels(groupOf(nodes, ["Game", "Supply"]).children), ["Maximum supply", "Team supply multiplier"]);
  });

  T.test("item list: the Requirements tab groups units, upgrades, tech research, tech use and orders", function () {
    var nodes = Tr.build("requirements", D.create("starcraft"), T.catalog("starcraft"));
    T.equal(
      nodes.map(function (n) {
        return n.label;
      }),
      ["Units", "Upgrades", "Tech research", "Tech use", "Orders"]
    );
    T.ok(labels([nodes[4]]).indexOf("73 Drone lift off") >= 0);
    T.ok(labels([nodes[0]]).indexOf("228 No unit") < 0, "table entries that aren't units have no requirement record");
  });

  T.test("item list: new sets and unnamed IDs the mod uses are listed", function () {
    var cat = T.catalog("starcraft");
    var doc = D.addSet(D.create("starcraft"), cat).doc;
    doc = D.setUnitField(doc, cat, 33, "button_set", 0);
    T.ok(labels(groupOf(Tr.build("button_sets", doc, cat), ["New sets"]).children).indexOf("Set 250") >= 0, "a new set with no name");
    var named = D.setItemName(doc, cat, "set", 250, "Builders");
    T.ok(labels(groupOf(Tr.build("button_sets", named, cat), ["New sets"]).children).indexOf("250 Builders") >= 0, "a named new set");
    T.equal(labels(groupOf(Tr.build("units", doc, cat), ["Not in the catalog"]).children), ["33"]);
  });

  T.test("filtering the tree: by name, ignoring case, with the groups that hold the matches", function () {
    var nodes = Tr.build("units", D.create("starcraft"), catalogWithUnits());
    var f = Tr.filter(nodes, "kerrigan");
    T.equal(labels(f), ["16 Sarah Kerrigan", "51 Infested Kerrigan"]);
    T.equal(f.length, 1);
    T.equal(f[0].label, "Heroes");
    T.ok(f[0].forced, "groups holding matches are shown open");
  });

  T.test("filtering the tree: by ID shows every item whose label contains it", function () {
    var nodes = Tr.build("units", D.create("starcraft"), catalogWithUnits());
    T.equal(labels(Tr.filter(nodes, "51")), ["51 Infested Kerrigan", "151 Cerebrate"]);
    T.equal(Tr.filter(nodes, "  "), nodes, "a blank search shows everything");
    T.equal(Tr.filter(nodes, "zzz"), []);
  });

  T.test("filtering the tree: only changed items, items with errors or with warnings", function () {
    var cat = T.catalog("starcraft");
    var doc = D.setUnitField(D.create("starcraft"), cat, 0, "button_set", 232);
    doc = D.setUnitField(doc, cat, 5, "button_set", 999);
    doc = D.setUnitField(doc, cat, 7, "status_update", "statdraw_draw_none");
    var m = Tr.marks(doc, cat, AG.core.problems(doc, cat));
    var nodes = Tr.mark(Tr.build("units", doc, cat), m.items.units);
    T.equal(labels(Tr.filter(nodes, "", "changed")), ["0 Terran Marine", "5 Terran Siege Tank", "7 Terran SCV"]);
    T.equal(labels(Tr.filter(nodes, "", "errors")), ["5 Terran Siege Tank"]);
    T.equal(labels(Tr.filter(nodes, "", "warnings")), ["0 Terran Marine"]);
    T.equal(labels(Tr.filter(nodes, "siege", "changed")), ["5 Terran Siege Tank"], "filters combine with the search");
  });

  T.test("filtering the tree: several conditions must all hold", function () {
    var cat = T.catalog("starcraft");
    var doc = D.setUnitField(D.create("starcraft"), cat, 0, "button_set", 232);
    doc = D.setUnitField(doc, cat, 5, "button_set", 999);
    doc = D.setUnitField(doc, cat, 7, "status_update", "statdraw_draw_none");
    var m = Tr.marks(doc, cat, AG.core.problems(doc, cat));
    var nodes = Tr.mark(Tr.build("units", doc, cat), m.items.units);
    T.equal(labels(Tr.filter(nodes, "", ["changed", "errors"])), ["5 Terran Siege Tank"]);
    T.equal(labels(Tr.filter(nodes, "", ["changed", null])), ["0 Terran Marine", "5 Terran Siege Tank", "7 Terran SCV"]);
    T.equal(Tr.filter(nodes, "", [null, null]), nodes, "no conditions shows everything");
  });

  T.test("list view: every item without its groups, in ID order", function () {
    var nodes = Tr.build("units", D.create("starcraft"), catalogWithUnits());
    var flat = Tr.flatten(nodes);
    T.ok(flat.every(function (n) {
      return n.type === "item";
    }));
    var ids = flat.map(function (n) {
      return n.id;
    });
    T.equal(ids, ids.slice().sort(function (a, b) {
      return a - b;
    }));
    T.equal(flat.length, labels(nodes).length);
  });

  T.test("list view: requirements are by type, then ID; constants keep the tree's order", function () {
    var cat = T.catalog("starcraft");
    var flat = Tr.flatten(Tr.build("requirements", D.create("starcraft"), cat));
    var types = flat.map(function (n) {
      return n.reqType;
    });
    var order = Tr.REQ_GROUPS.map(function (g) {
      return g.type;
    });
    T.equal(types.filter(function (t, i) {
      return t !== types[i - 1];
    }), order.filter(function (t) {
      return types.indexOf(t) >= 0;
    }));
    var consts = Tr.build("constants", D.create("starcraft"), cat);
    T.equal(Tr.flatten(consts).map(function (n) {
      return n.key;
    }), (function keys(list) {
      return [].concat.apply([], list.map(function (n) {
        return n.type === "item" ? [n.key] : keys(n.children);
      }));
    })(consts));
  });

  T.test("markers: an item's groups show that something inside has changed or has a problem", function () {
    var cat = T.catalog("starcraft");
    var doc = D.setUnitField(D.create("starcraft"), cat, 32, "button_set", 999);
    var m = Tr.marks(doc, cat, AG.core.problems(doc, cat));
    var nodes = Tr.mark(Tr.build("units", doc, cat), m.items.units);
    var terran = groupOf(nodes, ["Terran"]);
    T.ok(terran.changed && terran.error && !terran.warning);
    T.ok(!groupOf(nodes, ["Other"]).changed);
  });

  T.test("locating problems: fields, buttons, list tokens and entries the list can't show", function () {
    var cat = T.catalog("starcraft");
    var doc = {
      patcher: "AxeGraft",
      format: 1,
      game: "starcraft",
      units: [{ id: 0, button_set: 5 }, { id: 300, button_set: 0 }],
      button_sets: [{ id: 7, buttons: [] }, { id: 32, buttons: [] }],
      requirements: [{ type: "upgrade", id: 3, list: [] }],
      constants: [{ name: "max_supply", value: 1 }, { name: "gravity", value: 1 }]
    };
    T.equal(Tr.locate(doc, cat, "units[0].button_set"), { tab: "units", key: "unit:0", field: "button_set" });
    T.equal(Tr.locate(doc, cat, "units[1].id"), null);
    T.equal(Tr.locate(doc, cat, "button_sets[0].buttons[2].action_variable"), { tab: "button_sets", key: "set:7", button: 2, field: "action_variable" });
    T.equal(Tr.locate(doc, cat, "button_sets[1].id"), null);
    T.equal(Tr.locate(doc, cat, "requirements[0].list[4]"), { tab: "requirements", key: "req:upgrade:3", token: 4, field: "list" });
    T.equal(Tr.locate(doc, cat, "constants[0].value"), { tab: "constants", key: "const:max_supply", field: "value" });
    T.equal(Tr.locate(doc, cat, "constants[1].name"), null);
    var m = Tr.marks(doc, cat, AG.core.problems(doc, cat));
    T.equal(
      m.orphans.map(function (p) {
        return p.path;
      }).sort(),
      ["button_sets[1].id", "constants[1].name", "units[1].id"]
    );
  });

  T.test("visible rows: closed groups hide their items, and filtered groups are open", function () {
    var nodes = Tr.build("units", D.create("starcraft"), T.catalog("starcraft"));
    T.equal(
      Tr.visible(nodes, {}).map(function (r) {
        return r.node.label;
      }),
      ["Terran", "Other"]
    );
    var open = {};
    open[groupOf(nodes, ["Other"]).key] = true;
    T.equal(Tr.visible(nodes, open).length, 2 + 3);
    T.equal(
      Tr.visible(Tr.filter(nodes, "firebat"), {}).map(function (r) {
        return r.node.label;
      }),
      ["Terran", "Ground Units", "32 Terran Firebat"]
    );
  });

  T.catalogWithUnits = catalogWithUnits;
})(AxeGraft);
