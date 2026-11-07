// The item tree in the UI: labels, order, search, selection per tab,
// markers, filters, the toolbar and keyboard navigation.
"use strict";

(function (AG) {
  var T = AG.testing;
  var U = T.ui;

  function startWith(ctx, cat) {
    return U.start(ctx, { catalogs: { games: { starcraft: cat }, errors: [] } }).then(function (app) {
      return app.newMod("starcraft").then(function () {
        return app;
      });
    });
  }

  function rows(app) {
    return U.texts(app, '.tree [role="treeitem"] > .row .text');
  }

  function search(app, text) {
    U.search(app, text);
  }

  function tool(app, focus) {
    return U.q(app, '.tree-toolbar [data-focus="' + focus + '"]');
  }

  function keydown(el, key) {
    var e = new KeyboardEvent("keydown", { key: key, bubbles: true, cancelable: true });
    el.dispatchEvent(e);
    return e;
  }

  T.test("item list: labels start with the ID and are in numeric order", function (ctx) {
    return startWith(ctx, T.catalogWithUnits()).then(function (app) {
      search(app, "terran");
      T.equal(rows(app).filter(function (r) {
        return /^\d/.test(r);
      }), ["0 Terran Marine", "2 Terran Vulture", "5 Terran Siege Tank", "7 Terran SCV", "32 Terran Firebat"]);
    });
  }, { dom: true });

  T.test("filtering the tree: searching for kerrigan shows each item whose label contains it, in open groups", function (ctx) {
    return startWith(ctx, T.catalogWithUnits()).then(function (app) {
      search(app, "kerrigan");
      T.equal(rows(app), ["Heroes", "16 Sarah Kerrigan", "51 Infested Kerrigan"]);
      T.equal(U.q(app, '.tree [role="treeitem"]').getAttribute("aria-expanded"), "true");
    });
  }, { dom: true });

  T.test("filtering the tree: searching for 51 shows unit 51 and every other item containing 51", function (ctx) {
    return startWith(ctx, T.catalogWithUnits()).then(function (app) {
      search(app, "51");
      T.equal(rows(app), ["Heroes", "51 Infested Kerrigan", "151 Cerebrate"]);
    });
  }, { dom: true });

  T.test("filtering the tree: clearing the search shows the whole tree, with the selection kept", function (ctx) {
    return startWith(ctx, T.catalogWithUnits()).then(function (app) {
      search(app, "kerrigan");
      U.q(app, '[data-key="unit:51"] > .row').click();
      T.equal(app.state.selection.units, "unit:51");
      search(app, "");
      T.ok(rows(app).indexOf("Terran") >= 0 && rows(app).indexOf("Other") >= 0, rows(app).join(", "));
      T.equal(U.q(app, '.tree [aria-selected="true"]').dataset.key, "unit:51");
      T.equal(app.selected("units"), "unit:51");
    });
  }, { dom: true });

  // ---- Toolbar

  T.test("toolbar: tree and list view buttons say what they are, and only one is pressed", function (ctx) {
    return startWith(ctx, T.catalogWithUnits()).then(function (app) {
      T.equal(tool(app, "view-tree").title, "Tree view");
      T.equal(tool(app, "view-list").title, "List view");
      T.equal(U.q(app, ".tree").title, "El Grando list of thangs.");
      T.equal(tool(app, "view-tree").getAttribute("aria-pressed"), "true");
      T.equal(tool(app, "view-list").getAttribute("aria-pressed"), "false");
      tool(app, "view-list").click();
      T.equal(tool(app, "view-tree").getAttribute("aria-pressed"), "false");
      T.equal(tool(app, "view-list").getAttribute("aria-pressed"), "true");
      tool(app, "view-list").click();
      T.equal(tool(app, "view-list").getAttribute("aria-pressed"), "true", "pressing the chosen view again keeps it");
      tool(app, "view-tree").click();
      T.equal(tool(app, "view-tree").getAttribute("aria-pressed"), "true");
      T.equal(tool(app, "view-list").getAttribute("aria-pressed"), "false");
    });
  }, { dom: true });

  T.test("toolbar: the list view shows every item without groups, in ID order", function (ctx) {
    return startWith(ctx, T.catalogWithUnits()).then(function (app) {
      tool(app, "view-list").click();
      var r = rows(app);
      T.ok(r.length > 5, r.join(", "));
      T.ok(r.every(function (x) {
        return /^\d+ /.test(x);
      }), "no groups: " + r.join(", "));
      var ids = r.map(function (x) {
        return parseInt(x, 10);
      });
      T.equal(ids, ids.slice().sort(function (a, b) {
        return a - b;
      }));
      T.ok(U.q(app, ".tree").classList.contains("flat"));
      search(app, "kerrigan");
      T.equal(rows(app), ["16 Sarah Kerrigan", "51 Infested Kerrigan"], "the search works in the list too");
    });
  }, { dom: true });

  T.test("toolbar: the view is remembered", function (ctx) {
    var prefs = U.memoryPrefs();
    return U.start(ctx, { prefs: prefs, catalogs: { games: { starcraft: T.catalogWithUnits() }, errors: [] } }).then(function (app) {
      return app.newMod("starcraft").then(function () {
        tool(app, "view-list").click();
        T.equal(prefs.values["axegraft-editor.itemView"], "list");
      });
    });
  }, { dom: true });

  T.test("toolbar: show only changes is disabled until the tab has changes, and works in either view", function (ctx) {
    return startWith(ctx, T.catalogWithUnits()).then(function (app) {
      var b = tool(app, "only-changes");
      T.equal(b.getAttribute("aria-disabled"), "true");
      T.equal(b.title, "There are no changes to show");
      b.click();
      T.equal(tool(app, "only-changes").getAttribute("aria-pressed"), "false", "a disabled toggle can't be pressed");
      app.edit(function (d) {
        return AG.core.doc.setUnitField(d, app.cat(), 51, "button_set", 0);
      });
      b = tool(app, "only-changes");
      T.equal(b.getAttribute("aria-disabled"), null);
      T.equal(b.title, "Show only changes");
      b.click();
      T.equal(tool(app, "only-changes").getAttribute("aria-pressed"), "true");
      T.equal(rows(app), ["Heroes", "51 Infested Kerrigan"]);
      tool(app, "view-list").click();
      T.equal(tool(app, "only-changes").getAttribute("aria-pressed"), "true", "the toggle stays on in the other view");
      T.equal(rows(app), ["51 Infested Kerrigan"]);
    });
  }, { dom: true });

  T.test("toolbar: the search box is hidden until the magnifying glass is clicked, and clicking it again closes and clears it", function (ctx) {
    return startWith(ctx, T.catalogWithUnits()).then(function (app) {
      T.equal(tool(app, "search-toggle").title, "Search");
      T.ok(!app.root.querySelector(".sidebar input[type=search]"));
      tool(app, "search-toggle").click();
      var input = U.q(app, ".sidebar input[type=search]");
      T.equal(document.activeElement, input, "the opened box has focus");
      U.change(input, "kerrigan");
      T.equal(rows(app), ["Heroes", "16 Sarah Kerrigan", "51 Infested Kerrigan"]);
      tool(app, "search-toggle").click();
      T.ok(!app.root.querySelector(".sidebar input[type=search]"));
      T.ok(rows(app).length > 3, "the whole tree is back");
    });
  }, { dom: true });

  T.test("toolbar: typing while the tree has focus opens the search with what was typed, and Escape closes it", function (ctx) {
    return startWith(ctx, T.catalogWithUnits()).then(function (app) {
      var treeEl = U.q(app, ".tree");
      treeEl.focus();
      var e = keydown(treeEl, "k");
      T.ok(e.defaultPrevented);
      var input = U.q(app, ".sidebar input[type=search]");
      T.equal(input.value, "k");
      T.equal(document.activeElement, input);
      U.change(input, "kerrigan");
      T.equal(rows(app), ["Heroes", "16 Sarah Kerrigan", "51 Infested Kerrigan"]);
      keydown(input, "Escape");
      T.ok(!app.root.querySelector(".sidebar input[type=search]"));
      T.equal(document.activeElement, U.q(app, ".tree"), "focus goes back to the tree");
      T.ok(rows(app).length > 3);
      keydown(U.q(app, ".tree"), " ");
      T.ok(!app.root.querySelector(".sidebar input[type=search]"), "space still toggles rather than searching");
    });
  }, { dom: true });
})(AxeGraft);
