// A mod taken through the UI from new to saved, for each game, touching
// every tab the game has. The saved file must open again as the same mod,
// and pass validation.
"use strict";

(function (AG) {
  var T = AG.testing;
  var U = T.ui;

  function tabEl(app, id) {
    return U.q(app, '[role="tab"][data-tab="' + id + '"]');
  }

  function treeItem(app, key) {
    var el = app.root.querySelector('.tree [data-key="' + key + '"] > .row');
    if (!el) {
      // Search for it, as a user would.
      U.change(U.q(app, ".sidebar input[type=search]"), key.split(":").pop().replace(/_/g, " "));
      el = U.q(app, '.tree [data-key="' + key + '"] > .row');
    }
    el.click();
    U.change(U.q(app, ".sidebar input[type=search]"), "");
  }

  function steps(game) {
    if (game === "starcraft") {
      return function (app) {
        // Units: give the Firebat its own set, and change the Marine's status display.
        tabEl(app, "units").click();
        treeItem(app, "unit:32");
        U.q(app, '[data-action="own-set"]').click();
        treeItem(app, "unit:0");
        U.change(U.q(app, '[data-field="unit:0:status_update"] select'), "None (statdraw_draw_none)");
        // Button sets: edit the Firebat's new set and the SCV's set.
        tabEl(app, "button_sets").click();
        treeItem(app, "set:250");
        U.q(app, '.slot[data-position="7"]').click();
        U.change(U.q(app, '[data-field="set:250:1:action"] select'), "Research (order_research)");
        U.change(U.q(app, '[data-field="set:250:1:action_variable"] select[data-role="name"]'), "5 Siege Mode");
        U.q(app, '.slot[data-position="9"]').dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        U.change(U.q(app, '[data-field="set:250:2:enabled_string"] input[data-role="id"]'), "689");
        treeItem(app, "set:7");
        U.key(U.q(app, ".button-list"), "ArrowDown", { altKey: true });
        // Requirements: the Marine needs its Barracks, or must have an Academy under way.
        tabEl(app, "requirements").click();
        treeItem(app, "req:unit:0");
        U.q(app, '[data-action="add-row"]').click();
        U.change(U.q(app, '.req-row[data-row="2"] select'), "Or");
        U.q(app, '[data-action="add-row"]').click();
        U.change(U.q(app, '.req-row[data-row="3"] select'), "Must have");
        U.change(U.q(app, '.req-row[data-row="3"] input[data-role="id"]'), "112");
        // Constants: a number, and an option.
        tabEl(app, "constants").click();
        treeItem(app, "const:max_supply");
        U.change(U.q(app, '[data-field="const:max_supply"] input'), "500");
        treeItem(app, "const:cloak_energy");
        U.change(U.q(app, '[data-field="const:cloak_energy"] select'), "Regain energy");
      };
    }
    return function (app) {
      tabEl(app, "units").click();
      treeItem(app, "unit:2");
      U.change(U.q(app, '[data-field="unit:2:button_set"] input[data-role="id"]'), "0");
      tabEl(app, "button_sets").click();
      treeItem(app, "set:0");
      U.change(U.q(app, '[data-field="set:0:0:highlighted"] select'), "0 None");
      U.q(app, '[data-action="add-set"]').click();
      U.q(app, '[data-action="add-button"]').click();
      U.change(U.q(app, '[data-field="set:120:0:string"] input[data-role="id"]'), "392");
      tabEl(app, "constants").click();
      treeItem(app, "const:mana_cycles");
      U.change(U.q(app, '[data-field="const:mana_cycles"] input'), "30");
    };
  }

  ["starcraft", "warcraft2"].forEach(function (game) {
    T.test("end to end: a " + game + " mod made through the UI saves, and opens again as the same mod, passing validation", function (ctx) {
      return U.start(ctx).then(function (app) {
        U.q(app, '[data-new-mod="' + game + '"]').click();
        var saved;
        return U.wait(0)
          .then(function () {
            steps(game)(app);
            T.equal(app.errors(), [], "no errors after editing");
            var touched = AG.core.validate.PARTS.filter(function (p) {
              return app.doc()[p];
            });
            T.equal(touched, app.cat().has("requirements") ? ["units", "button_sets", "requirements", "constants"] : ["units", "button_sets", "constants"], "every tab changed something");
            return app.save();
          })
          .then(function (ok) {
            T.ok(ok, "saved");
            saved = app.platform.saved[app.platform.saved.length - 1].text;
            var r = AG.core.modfile.read(saved, app.catalogs.games);
            T.equal(r.refused, false);
            T.equal(r.problems.filter(function (p) {
              return p.severity === "error";
            }), [], "the saved file passes validation");
            return app.openFile(U.file("saved.json", saved), null, true);
          })
          .then(function (opened) {
            T.ok(opened);
            T.equal(app.serialized(), saved, "the file reopens identically");
            T.equal(U.q(app, '[data-status="dirty"]').textContent, "No unsaved changes");
          });
      });
    }, { dom: true, timeout: 60000 });
  });
})(AxeGraft);
