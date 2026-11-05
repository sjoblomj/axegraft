// The item tree in the UI: labels, order, search, selection per tab,
// markers, filters and keyboard navigation.
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
    U.change(U.q(app, ".sidebar input[type=search]"), text);
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
})(AxeGraft);
