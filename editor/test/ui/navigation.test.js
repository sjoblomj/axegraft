// Selection per tab, markers, problem filters and keyboard navigation.
"use strict";

(function (AG) {
  var T = AG.testing;
  var U = T.ui;
  var D = AG.core.doc;

  function sc(ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        return app;
      });
    });
  }

  function rows(app) {
    return U.texts(app, '.tree [role="treeitem"] > .row .text');
  }

  function row(app, key) {
    return U.q(app, '.tree [data-key="' + key + '"]');
  }

  function marks(el) {
    return Array.prototype.map.call(el.querySelector(".marks") ? el.querySelector(".marks").children : [], function (m) {
      return m.className.replace("mark ", "");
    });
  }

  function tab(app, id) {
    return U.q(app, '[role="tab"][data-tab="' + id + '"]');
  }

  // ---- Selection per tab

  T.test("switching tabs: each tab keeps its own selection", function (ctx) {
    return sc(ctx).then(function (app) {
      app.select("button_sets", "set:7");
      app.select("units", "unit:32");
      tab(app, "button_sets").click();
      T.equal(app.state.tab, "button_sets");
      T.equal(U.q(app, '.tree [aria-selected="true"]').dataset.key, "set:7", "the set last selected there");
      tab(app, "units").click();
      T.equal(U.q(app, '.tree [aria-selected="true"]').dataset.key, "unit:32");
    });
  }, { dom: true });

  T.test("switching tabs: a unit and a set with the same ID aren't linked", function (ctx) {
    return sc(ctx).then(function (app) {
      app.select("button_sets", "set:7");
      app.select("units", "unit:5");
      app.setTab("button_sets");
      T.equal(app.selected("button_sets"), "set:7");
    });
  }, { dom: true });

  T.test("requirements list: units, upgrades, tech research, tech use and orders, each in its own group", function (ctx) {
    return sc(ctx).then(function (app) {
      app.setTab("requirements");
      T.equal(
        Array.prototype.map.call(app.root.querySelectorAll('.tree > [role="treeitem"] > .row .text'), function (e) {
          return e.textContent;
        }),
        ["Units", "Upgrades", "Tech research", "Tech use", "Orders"]
      );
    });
  }, { dom: true });

  T.test("constants list: constants are grouped as the catalog says", function (ctx) {
    return sc(ctx).then(function (app) {
      app.setTab("constants");
      // Open every group.
      app.nodes("constants").forEach(function walk(n) {
        if (n.type === "group") {
          (app.state.expanded.constants = app.state.expanded.constants || {})[n.key] = true;
          n.children.forEach(walk);
        }
      });
      app.render();
      T.equal(rows(app), ["Game", "Supply", "Maximum supply", "Team supply multiplier", "Start", "Terran start building", "Tech", "Disruption Web duration", "Units", "Permanent cloak energy"]);
    });
  }, { dom: true });

  // ---- Markers

  T.test("marking changes: a changed item, its collapsed group and its tab are marked", function (ctx) {
    return sc(ctx).then(function (app) {
      app.edit(function (d) {
        return D.setUnitField(d, app.cat(), 238, "button_set", 0);
      });
      var other = row(app, "group:/Other");
      T.equal(other.getAttribute("aria-expanded"), "false", "the group is collapsed");
      T.equal(marks(other.querySelector(".row")), ["changed"]);
      T.equal(marks(tab(app, "units")), ["changed"]);
      T.equal(marks(tab(app, "button_sets")), []);
      app.select("units", "unit:238");
      T.equal(marks(row(app, "unit:238").querySelector(".row")), ["changed"]);
      T.equal(marks(row(app, "unit:0").querySelector(".row")), [], "unchanged items have no mark");
    });
  }, { dom: true });

  T.test("marking changes: showing only changed items", function (ctx) {
    return sc(ctx).then(function (app) {
      app.edit(function (d) {
        return D.setUnitField(D.setUnitField(d, app.cat(), 238, "button_set", 0), app.cat(), 5, "display_function", "draw_none");
      });
      U.q(app, '.sidebar [data-focus="only-changes"]').click();
      T.equal(rows(app), ["Terran", "Ground Units", "5 Terran Siege Tank", "Other", "238 Zerg basic buildings"]);
    });
  }, { dom: true });

  T.test("marking problems: an item with an error, and its tab, show the error marker, unlike changes and warnings", function (ctx) {
    return sc(ctx).then(function (app) {
      app.edit(function (d) {
        return D.setUnitField(D.setUnitField(d, app.cat(), 0, "button_set", 999), app.cat(), 5, "button_set", 232);
      });
      app.select("units", "unit:0");
      T.equal(marks(row(app, "unit:0").querySelector(".row")), ["changed", "error"]);
      T.equal(marks(row(app, "unit:5").querySelector(".row")), ["changed", "warning"]);
      T.equal(marks(tab(app, "units")), ["changed", "error", "warning"]);
      var looks = ["changed", "error", "warning"].map(function (k) {
        var m = app.root.querySelector(".tree .mark." + k);
        var cs = getComputedStyle(m);
        return cs.backgroundColor + "/" + cs.borderRadius + "/" + cs.clipPath;
      });
      T.ok(looks[0] !== looks[1] && looks[1] !== looks[2] && looks[0] !== looks[2], looks.join(" | "));
    });
  }, { dom: true });

  // ---- Filtering by problem

  function toolTitles(app) {
    return Array.prototype.map.call(app.root.querySelectorAll(".tree-toolbar button"), function (b) {
      return b.title;
    });
  }

  T.test("filtering by problem: showing only warnings shows only the two items with warnings", function (ctx) {
    return sc(ctx).then(function (app) {
      app.edit(function (d) {
        d = D.setUnitField(d, app.cat(), 0, "button_set", 232);
        d = D.setUnitField(d, app.cat(), 32, "button_set", 232);
        return D.setUnitField(d, app.cat(), 7, "display_function", "draw_none");
      });
      T.equal(toolTitles(app), ["Tree view", "List view", "Show the open item in the list", "Expand all", "Collapse all", "Show only changes", "Show only warnings", "Search"]);
      U.q(app, '.sidebar [data-focus="only-warnings"]').click();
      T.equal(rows(app).filter(function (r) {
        return /^\d/.test(r);
      }), ["0 Terran Marine", "32 Terran Firebat"]);
      U.search(app, "fire");
      T.equal(rows(app).filter(function (r) {
        return /^\d/.test(r);
      }), ["32 Terran Firebat"], "the filter combines with the search");
    });
  }, { dom: true });

  T.test("filtering by problem: with no errors or warnings, those filters aren't offered", function (ctx) {
    return sc(ctx).then(function (app) {
      app.edit(function (d) {
        return D.setUnitField(d, app.cat(), 0, "button_set", 5);
      });
      T.equal(toolTitles(app), ["Tree view", "List view", "Show the open item in the list", "Expand all", "Collapse all", "Show only changes", "Search"]);
      app.edit(function (d) {
        return D.setUnitField(d, app.cat(), 0, "button_set", 999);
      });
      T.equal(toolTitles(app), ["Tree view", "List view", "Show the open item in the list", "Expand all", "Collapse all", "Show only changes", "Show only errors", "Search"]);
    });
  }, { dom: true });

  // ---- Keyboard

  T.test("tree navigation: moving onto a group shows where the cursor is, while the selected item stays selected", function (ctx) {
    return sc(ctx).then(function (app) {
      ["dark", "classic"].forEach(function (theme) {
        app.setTheme(theme);
        app.select("units", "unit:0");
        U.key(U.q(app, ".tree"), "ArrowUp");
        T.equal(app.state.cursor.units, "group:/Terran/Ground Units");
        T.equal(app.state.selection.units, "unit:0", "the item stays selected");
        var cur = U.q(app, ".tree .cursor");
        T.equal(cur.dataset.key, "group:/Terran/Ground Units");
        var groupLook = getComputedStyle(cur.querySelector(".row")).outlineStyle;
        var plain = getComputedStyle(row(app, "unit:5").querySelector(".row")).outlineStyle;
        T.ok(groupLook !== "none" && plain === "none", theme + ": the cursor row is outlined: " + groupLook + " / " + plain);
      });
    });
  }, { dom: true });

  T.test("tree navigation: groups with the same name are separate rows", function (ctx) {
    return sc(ctx).then(function (app) {
      app.setTab("requirements");
      app.select("requirements", "req:order:7");
      function cursors() {
        return Array.prototype.map.call(app.root.querySelectorAll(".tree .cursor"), function (e) {
          return e.dataset.key;
        });
      }
      U.key(U.q(app, ".tree"), "ArrowUp");
      T.equal(cursors(), ["group:/Orders/Orders"], "only the inner group is the cursor");
      U.key(U.q(app, ".tree"), "ArrowUp");
      T.equal(cursors(), ["group:/Orders"], "Up leaves the inner group");
      U.key(U.q(app, ".tree"), "ArrowUp");
      T.equal(cursors(), ["group:/Tech use"], "and goes on past the outer one");
      // Closing the inner group leaves the outer one open.
      U.key(U.q(app, ".tree"), "ArrowDown");
      U.key(U.q(app, ".tree"), "ArrowDown");
      U.key(U.q(app, ".tree"), "ArrowLeft");
      T.equal(row(app, "group:/Orders/Orders").getAttribute("aria-expanded"), "false");
      T.equal(row(app, "group:/Orders").getAttribute("aria-expanded"), "true");
    });
  }, { dom: true });

  T.test("tree navigation: moving onto a group scrolls that group into view", function (ctx) {
    return sc(ctx).then(function (app) {
      var style = document.createElement("style");
      style.textContent = ".tree { flex: none; height: 19px; }";
      app.root.appendChild(style);
      app.select("units", "unit:0");
      U.key(U.q(app, ".tree"), "ArrowUp");
      T.equal(app.state.cursor.units, "group:/Terran/Ground Units");
      T.equal(app.state.selection.units, "unit:0", "the item stays selected");
      var view = U.q(app, ".tree").getBoundingClientRect();
      var top = row(app, "group:/Terran/Ground Units").querySelector(".row").getBoundingClientRect().top;
      T.ok(top >= view.top - 1 && top < view.bottom, "the group's own row is in view: " + top + " in " + view.top + "-" + view.bottom);
    });
  }, { dom: true });

  T.test("tree navigation: the arrow keys move the selection through visible items, and Left and Right close and open groups", function (ctx) {
    return sc(ctx).then(function (app) {
      var treeEl = U.q(app, ".tree");
      treeEl.focus();
      T.equal(app.state.selection.units, "unit:0");
      U.key(treeEl, "ArrowDown");
      T.equal(app.state.selection.units, "unit:5");
      treeEl = U.q(app, ".tree");
      T.ok(document.activeElement === treeEl, "focus stays on the tree");
      U.key(treeEl, "ArrowDown");
      U.key(U.q(app, ".tree"), "ArrowDown");
      T.equal(app.state.selection.units, "unit:32");
      U.key(U.q(app, ".tree"), "ArrowUp");
      T.equal(app.state.selection.units, "unit:7");
      // Left from an item goes to its group; Left again closes it.
      U.key(U.q(app, ".tree"), "ArrowLeft");
      T.equal(app.state.cursor.units, "group:/Terran/Ground Units");
      U.key(U.q(app, ".tree"), "ArrowLeft");
      T.equal(row(app, "group:/Terran/Ground Units").getAttribute("aria-expanded"), "false");
      T.equal(rows(app), ["Terran", "Ground Units", "Special", "Heroes", "Other"]);
      T.equal(app.state.selection.units, "unit:7", "closing a group keeps the selection");
      // Right opens it again, and Right once more moves to its first item.
      U.key(U.q(app, ".tree"), "ArrowRight");
      T.equal(row(app, "group:/Terran/Ground Units").getAttribute("aria-expanded"), "true");
      U.key(U.q(app, ".tree"), "ArrowRight");
      T.equal(app.state.selection.units, "unit:0");
      U.key(U.q(app, ".tree"), "End");
      T.equal(app.state.cursor.units, "group:/Other");
      U.key(U.q(app, ".tree"), "Enter");
      T.equal(row(app, "group:/Other").getAttribute("aria-expanded"), "true");
      U.key(U.q(app, ".tree"), "ArrowDown");
      T.equal(app.state.selection.units, "unit:228");
      T.equal(U.q(app, ".tree").getAttribute("aria-activedescendant"), row(app, "unit:228").id);
    });
  }, { dom: true });

  T.test("tab navigation: Left and Right move between tabs", function (ctx) {
    return sc(ctx).then(function (app) {
      var t = tab(app, "units");
      t.focus();
      U.key(t, "ArrowRight");
      T.equal(app.state.tab, "button_sets");
      T.ok(document.activeElement === tab(app, "button_sets"));
      U.key(tab(app, "button_sets"), "ArrowLeft");
      U.key(tab(app, "units"), "ArrowLeft");
      T.equal(app.state.tab, "constants", "wraps around");
      U.key(tab(app, "constants"), "Home");
      T.equal(app.state.tab, "units");
    });
  }, { dom: true });
})(AxeGraft);
