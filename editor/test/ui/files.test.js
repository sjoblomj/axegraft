// Creating, opening and saving mods through the UI.
"use strict";

(function (AG) {
  var T = AG.testing;
  var U = T.ui;
  var D = AG.core.doc;

  var W2_MOD = JSON.stringify({ patcher: "AxeGraft", format: 1, game: "warcraft2", units: [{ id: 0, button_set: 2 }] });

  T.test("creating a mod: a new StarCraft mod saved right away holds only its header", function (ctx) {
    return U.start(ctx).then(function (app) {
      U.q(app, '[data-command="new:starcraft"]').click();
      return U.wait(0)
        .then(function () {
          return app.save();
        })
        .then(function (ok) {
          T.ok(ok);
          var saved = app.platform.saved;
          T.equal(saved.length, 1);
          T.equal(JSON.parse(saved[0].text), { patcher: "AxeGraft", format: 1, game: "starcraft", mod: { name: "", version: "", authors: [] } });
          T.equal(saved[0].name, "starcraft-mod.json");
          T.equal(U.q(app, '[data-status="dirty"]').textContent, "No unsaved changes");
        });
    });
  }, { dom: true });

  T.test("mod information: what's typed on the start screen goes into the new mod", function (ctx) {
    return U.start(ctx).then(function (app) {
      function type(key, text) {
        var input = U.q(app, '.welcome [data-info="' + key + '"]');
        input.value = text;
        input.dispatchEvent(new Event("input"));
      }
      type("name", " Faster Marines ");
      type("version", "1.2");
      type("authors", "Alice, Bob ,, ");
      U.q(app, '.welcome [data-new-mod="starcraft"]').click();
      return U.wait(0).then(function () {
        var doc = app.doc();
        T.equal(doc.mod, { name: "Faster Marines", version: "1.2", authors: ["Alice", "Bob"] });
        T.equal(U.q(app, '[data-status="dirty"]').textContent, "No unsaved changes");
      });
    });
  }, { dom: true });

  T.test("mod information: the File menu changes it as one undoable change", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        T.ok(!U.q(app, '[data-command="modInfo"]').disabled);
        U.q(app, '[data-command="modInfo"]').click();
        return U.wait(0);
      }).then(function () {
        var dlg = U.q(app, 'dialog[data-dialog="modInfo"]');
        var name = dlg.querySelector('[data-info="name"]');
        name.value = "Renamed";
        name.dispatchEvent(new Event("input"));
        var authors = dlg.querySelector('[data-info="authors"]');
        authors.value = "Carol";
        authors.dispatchEvent(new Event("input"));
        return U.answer(app, "modInfo", "ok");
      }).then(function () {
        return U.wait(0);
      }).then(function () {
        T.equal(app.doc().mod.name, "Renamed");
        T.equal(app.doc().mod.authors, ["Carol"]);
        T.ok(app.isDirty());
        app.undo();
        T.equal(app.doc().mod.name, "");
        T.equal(app.doc().mod.authors, []);
      });
    });
  }, { dom: true });

  T.test("opening a mod: a Warcraft II mod opened while editing StarCraft switches game and shows its changes", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        app.platform.toOpen = { file: U.file("footmen.json", W2_MOD), handle: null };
        U.q(app, '[data-command="open"]').click();
        return U.wait(10);
      }).then(function () {
        T.equal(app.state.game, "warcraft2");
        T.equal(U.texts(app, '[role="tab"] > span:first-child'), ["Units", "Button Sets", "Constants"]);
        T.ok(/footmen\.json/.test(U.q(app, '[data-status="file"]').textContent));
        T.equal(app.doc().units, [{ id: 0, button_set: 2 }]);
        T.equal(U.q(app, '[data-status="dirty"]').textContent, "No unsaved changes");
        T.ok(app.root.querySelector('[role="tab"][data-tab="units"] .mark.changed'), "the change is marked");
      });
    });
  }, { dom: true });

  T.test("opening a mod: with unsaved changes the editor asks before discarding them", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        app.edit(function (d) {
          return D.setConstant(d, app.cat(), "max_supply", 600);
        });
        app.platform.toOpen = { file: U.file("footmen.json", W2_MOD), handle: null };
        var opening = app.open();
        return U.answer(app, "discard", "no").then(function () {
          return opening;
        });
      }).then(function (opened) {
        T.equal(opened, false);
        T.equal(app.state.game, "starcraft", "keeping the changes keeps the mod");
        T.equal(app.doc().constants[0].value, 600);
        var again = app.open();
        return U.answer(app, "discard", "yes").then(function () {
          return again;
        });
      }).then(function (opened) {
        T.equal(opened, true);
        T.equal(app.state.game, "warcraft2");
      });
    });
  }, { dom: true });

  function refusedNames(app) {
    return Array.prototype.map.call(app.root.querySelectorAll('dialog[data-dialog="refused"] li'), function (li) {
      return li.textContent;
    });
  }

  T.test("refusing malformed files: an unknown property and an out-of-range ID are both listed, and the current mod is unchanged", function (ctx) {
    return U.start(ctx).then(function (app) {
      var before;
      return app.newMod("starcraft").then(function () {
        app.edit(function (d) {
          return D.setConstant(d, app.cat(), "max_supply", 600);
        });
        before = app.doc();
        var bad = JSON.stringify({ patcher: "AxeGraft", format: 1, game: "starcraft", units: [{ id: 400, button_set: 0, colour: "red" }] });
        return app.openFile(U.file("bad.json", bad), null, true);
      }).then(function (opened) {
        T.equal(opened, false);
        var items = refusedNames(app);
        T.equal(items.length, 2, items.join("\n"));
        T.ok(items.some(function (t) {
          return /colour/.test(t) && /units\[0\]\.colour/.test(t);
        }), items.join("\n"));
        T.ok(items.some(function (t) {
          return /400/.test(t) && /units\[0\]\.id/.test(t);
        }), items.join("\n"));
        T.ok(/bad\.json/.test(U.q(app, 'dialog[data-dialog="refused"]').textContent), "names the file");
        T.ok(app.doc() === before, "the current mod is unchanged");
        return U.answer(app, "refused", "ok");
      });
    });
  }, { dom: true });

  T.test("refusing malformed files: a part with the wrong shape is listed with its location", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.openFile(U.file("shape.json", JSON.stringify({ patcher: "AxeGraft", format: 1, game: "starcraft", units: { id: 0 } })), null, true).then(function (opened) {
        T.equal(opened, false);
        T.ok(/at units/.test(refusedNames(app)[0]), refusedNames(app)[0]);
        T.equal(app.state.history, null, "nothing was loaded");
      });
    });
  }, { dom: true });

  T.test("refusing malformed files: arbitrary bytes, invalid JSON, deep nesting and huge files are reported by name, and the editor stays usable", function (ctx) {
    return U.start(ctx).then(function (app) {
      var big = new Uint8Array(AG.core.modfile.MAX_BYTES + 10);
      var cases = [
        ["bytes.bin", new Uint8Array([0xff, 0x00, 0xfe, 0x81])],
        ["broken.json", '{"patcher": "AxeGraft",'],
        ["deep.json", new Array(5000).join("[") + new Array(5000).join("]")],
        ["huge.json", big]
      ];
      return cases.reduce(function (p, c) {
        return p.then(function () {
          return app.openFile(U.file(c[0], c[1]), null, true).then(function (opened) {
            T.equal(opened, false, c[0]);
            var dlg = U.q(app, 'dialog[data-dialog="refused"]');
            T.ok(dlg.textContent.indexOf(c[0]) >= 0, "names " + c[0]);
            return U.answer(app, "refused", "ok");
          });
        });
      }, Promise.resolve()).then(function () {
        return app.newMod("warcraft2");
      }).then(function () {
        T.equal(app.state.game, "warcraft2", "still usable");
      });
    });
  }, { dom: true });

  T.test("opening a file with errors: the file loads, and an entry with no matching item is listed with an offer to remove it", function (ctx) {
    return U.start(ctx).then(function (app) {
      var mod = JSON.stringify({ patcher: "AxeGraft", format: 1, game: "starcraft", units: [{ id: 300, button_set: 0 }, { id: 0, button_set: 5 }] });
      return app.openFile(U.file("errors.json", mod), null, true).then(function (opened) {
        T.equal(opened, true);
        app.showProblems();
        return U.wait(0);
      }).then(function () {
        var li = U.q(app, 'dialog[data-dialog="problems"] li[data-path="units[0].id"]');
        T.ok(/300/.test(li.textContent), li.textContent);
        li.querySelector("[data-remove]").click();
        return U.wait(0);
      }).then(function () {
        T.equal(app.doc().units, [{ id: 0, button_set: 5 }]);
        T.equal(app.errors().length, 0);
        U.q(app, 'dialog[data-dialog="problems"] [data-value="close"]').click();
      });
    });
  }, { dom: true });

  T.test("opening a file with errors: a button position out of range loads, and the field shows that value with an error", function (ctx) {
    return U.start(ctx).then(function (app) {
      var mod = JSON.stringify({ patcher: "AxeGraft", format: 1, game: "starcraft", button_sets: [{ id: 7, buttons: [{ position: 12, icon: 228, condition: "bf_always", action: "order_move", enabled_string: 664, disabled_string: 0 }] }] });
      return app.openFile(U.file("position.json", mod), null, true).then(function (opened) {
        T.equal(opened, true);
        app.goTo("button_sets[0].buttons[0].position");
        var f = U.q(app, '[data-field="set:7:0:position"]');
        var sel = f.querySelector("select");
        T.equal(sel.options[sel.selectedIndex].textContent, "12 (not in the list)");
        T.ok(f.classList.contains("has-error") && /12 is outside its range, 1-9/.test(f.querySelector(".problem.error").textContent), f.textContent);
        T.ok(document.activeElement === sel, "going to the problem focuses the field");
        T.ok(app.root.querySelector('.tree [data-key="set:7"] .mark.error'), "the set is marked in the list");
      });
    });
  }, { dom: true });

  T.test("saving only mods without errors: with errors, no file is written and the problem list is shown", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        app.edit(function (d) {
          return D.setUnitField(d, app.cat(), 0, "button_set", 999);
        });
        return app.save();
      }).then(function (ok) {
        T.equal(ok, false);
        T.equal(app.platform.saved, []);
        var dlg = U.q(app, 'dialog[data-dialog="problems"]');
        T.ok(/can't be saved/.test(dlg.textContent));
        T.ok(dlg.querySelector('li[data-path="units[0].button_set"]'));
        dlg.querySelector('[data-value="close"]').click();
      });
    });
  }, { dom: true });

  T.test("saving only mods without errors: with only warnings, the file is written", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        app.edit(function (d) {
          return D.setUnitField(d, app.cat(), 0, "button_set", 232);
        });
        T.equal(app.warnings().length, 1);
        return app.saveAs();
      }).then(function (ok) {
        T.ok(ok);
        T.equal(JSON.parse(app.platform.saved[0].text).units, [{ id: 0, label: "Terran Marine", button_set: 232 }]);
      });
    });
  }, { dom: true });

  T.test("save as: the file holds the mod, and opening it again gives the same mod", function (ctx) {
    return U.start(ctx).then(function (app) {
      var text;
      return app.newMod("starcraft").then(function () {
        app.edit(function (d) {
          return D.setRequirement(D.setConstant(d, app.cat(), "cloak_energy", "regain"), app.cat(), "upgrade", 3, ["current_unit_is", 139]);
        });
        return app.saveAs();
      }).then(function () {
        text = app.platform.saved[0].text;
        var before = app.doc();
        return app.openFile(U.file("again.json", text), null, true).then(function (ok) {
          T.ok(ok);
          T.equal(AG.core.serialize(app.doc(), app.cat()), text);
          T.equal(AG.core.canonical(app.doc(), app.cat()), AG.core.canonical(before, app.cat()));
        });
      });
    });
  }, { dom: true });

  T.test("saving: Save writes straight to the opened file where the browser allows, and Save As asks again", function (ctx) {
    var written = [];
    var handle = {
      name: "direct.json",
      createWritable: function () {
        return Promise.resolve({
          write: function (t) {
            written.push(t);
            return Promise.resolve();
          },
          close: function () {
            return Promise.resolve();
          }
        });
      }
    };
    var platform = Object.assign({}, AG.ui.platform, {
      openMod: function () {
        return Promise.resolve({ file: U.file("direct.json", W2_MOD), handle: handle });
      },
      saveAs: function (name, text) {
        written.push("download:" + name);
        return Promise.resolve({ name: name, handle: null });
      }
    });
    return U.start(ctx, { platform: platform }).then(function (app) {
      return app.open().then(function () {
        app.edit(function (d) {
          return D.setConstant(d, app.cat(), "mana_cycles", 20);
        });
        return app.save();
      }).then(function (ok) {
        T.ok(ok);
        T.equal(written.length, 1);
        T.equal(JSON.parse(written[0]).constants, [{ name: "mana_cycles", label: "Cycles per mana point", value: 20 }]);
        return app.saveAs();
      }).then(function () {
        T.equal(written[1], "download:direct.json");
      });
    });
  }, { dom: true });

  T.test("saving: without a way to save directly, Save downloads the file", function (ctx) {
    var downloads = [];
    var platform = Object.assign({}, AG.ui.platform, {
      download: function (name, text) {
        downloads.push(name);
        return Promise.resolve({ name: name, handle: null });
      }
    });
    // The real save functions, with saving directly unavailable.
    var saved = AG.ui.platform.canSaveDirectly;
    return U.start(ctx, { platform: platform }).then(function (app) {
      return app.newMod("starcraft").then(function () {
        T.ok(typeof AG.ui.platform.saveAs === "function");
        return AG.ui.platform.download === platform.download ? null : platform.download("starcraft-mod.json", app.serialized());
      }).then(function () {
        T.equal(downloads, ["starcraft-mod.json"]);
        T.equal(AG.ui.platform.canSaveDirectly, saved);
      });
    });
  }, { dom: true });

  T.test("keyboard: Ctrl+S saves", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        U.key(U.q(app, ".tree"), "s", { ctrlKey: true });
        return U.wait(0);
      }).then(function () {
        T.equal(app.platform.saved.length, 1);
      });
    });
  }, { dom: true });
})(AxeGraft);
