// Starting the editor with bad or missing catalogs.
"use strict";

(function (AG) {
  var T = AG.testing;

  T.test("startup: a bad catalog is reported, and the valid game can still be edited", function (ctx) {
    var bad = T.rawCatalog("starcraft");
    delete bad.constants[0].help;
    bad.buttonSets[0].original[0].condition = "bf_sometimes";
    var catalogs = AG.core.catalog.load(
      [
        { raw: bad, source: "sample-starcraft.js" },
        { raw: T.rawCatalog("warcraft2"), source: "sample-warcraft2.js" }
      ],
      ["missing-game.js"]
    );
    var root = ctx.sandbox();
    var app = AG.ui.createApp(root, { catalogs: catalogs, storage: AG.core.storage.memory() });

    var notices = root.querySelectorAll("[data-catalog-error]");
    T.equal(
      Array.prototype.map.call(notices, function (n) {
        return n.dataset.catalogError;
      }),
      ["missing-game.js", "sample-starcraft.js"]
    );
    var text = notices[1].textContent;
    T.ok(/sample-starcraft\.js/.test(text), "names the catalog");
    T.ok(/constant max_supply has no help text/.test(text), "lists the first problem: " + text);
    T.ok(/names condition "bf_sometimes"/.test(text), "lists the second problem");
    T.ok(/couldn't be loaded/.test(notices[0].textContent), "reports the missing file");

    var offered = Array.prototype.map.call(root.querySelectorAll("[data-new-mod]"), function (b) {
      return b.dataset.newMod;
    });
    T.equal(offered, ["warcraft2"]);
    root.querySelector('[data-new-mod="warcraft2"]').click();
    return T.ui.wait(0).then(function () {
      T.equal(app.state.game, "warcraft2");
      T.equal(app.doc(), { patcher: "AxeGraft", format: 1, game: "warcraft2", mod_name: "", mod_version: "", mod_authors: [] });
      T.ok(root.querySelector('[data-catalog-error="sample-starcraft.js"]'), "the notice stays while editing");
      T.equal(T.ui.texts({ root: root }, '[role="tab"]'), ["Units", "Button Sets", "Constants"], "the game can be edited");
    });
  }, { dom: true });

  T.test("startup: with no usable catalog, the editor says there's nothing to edit", function (ctx) {
    var root = ctx.sandbox();
    AG.ui.createApp(root, { catalogs: AG.core.catalog.load([], ["sample-starcraft.js"]), storage: AG.core.storage.memory() });
    T.ok(/nothing to edit/.test(root.textContent));
  }, { dom: true });
})(AxeGraft);
