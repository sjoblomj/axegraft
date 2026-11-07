// Importing assets from synthetic game archives, shipped assets, and how
// the editor shows icons and strings.
"use strict";

(function (AG) {
  var T = AG.testing;
  var B = T.build;
  var D = AG.core.doc;

  // A StarCraft fixture catalog that says where its assets are.
  function catalog() {
    var raw = T.rawCatalog("starcraft");
    raw.assets = {
      archives: ["patch_rt.mpq", "broodat.mpq", "stardat.mpq"],
      icons: { file: "unit\\cmdbtns\\cmdicons.grp", palette: { file: "tileset\\badlands.wpe", format: "wpe", remap: "unit\\cmdbtns\\ticon.pcx" } },
      strings: { file: "rez\\stat_txt.tbl" }
    };
    T.equal(AG.core.catalog.check(raw, "assets"), []);
    return AG.core.catalog.index(raw);
  }

  function pcxRow(values) {
    var head = new Uint8Array(128);
    head[0] = 0x0a;
    head[2] = 1;
    head[3] = 8;
    head[8] = values.length - 1;
    head[65] = 1;
    head[66] = values.length;
    var data = [];
    values.forEach(function (v) {
      if (v >= 0xc0) data.push(0xc1);
      data.push(v);
    });
    return B.concat([head, new Uint8Array(data)]);
  }

  function wpe() {
    var p = new Uint8Array(1024);
    for (var i = 0; i < 256; i++) {
      p[i * 4] = i;
      p[i * 4 + 1] = 255 - i;
      p[i * 4 + 2] = 7;
    }
    return p;
  }

  // Icons: `n` frames of 2 by 2, frame i filled with colour i + 1.
  function icons(n) {
    var frames = [];
    for (var i = 0; i < n; i++) frames.push({ x: 0, y: 0, w: 2, rows: [[["run", 2, (i % 15) + 1]], [["run", 2, (i % 15) + 1]]] });
    return B.grp(2, 2, frames);
  }

  // A StarCraft folder: a patch archive and two base ones.
  function folder(options) {
    options = options || {};
    var strings = [];
    for (var i = 1; i <= 700; i++) strings.push("String " + i);
    strings[333] = "t\u0003Use S\u0003t\u0001im Packs";
    return Promise.all([
      B.mpq([
        { name: "unit\\cmdbtns\\cmdicons.grp", data: icons(options.patchIcons || 12), mode: "implode" },
        { name: "rez\\stat_txt.tbl", data: B.tbl(strings), mode: "implode", encrypted: true, fixKey: true }
      ]),
      B.mpq([{ name: "unit\\cmdbtns\\cmdicons.grp", data: icons(5), mode: "pkware" }]),
      B.mpq([
        { name: "tileset\\badlands.wpe", data: wpe() },
        { name: "unit\\cmdbtns\\ticon.pcx", data: pcxRow([0, 9, 9, 9]) }
      ])
    ]).then(function (a) {
      return [B.file("Patch_rt.mpq", a[0]), B.file("BrooDat.mpq", a[1]), B.file("StarDat.mpq", a[2]), B.file("readme.txt", new TextEncoder().encode("not an archive"))];
    });
  }

  // Nothing is shipped unless a test says so, so the tests don't depend on
  // what assets/ holds.
  function service(storage, options) {
    return AG.assets.createService(storage || AG.core.storage.memory(), options || { shipped: {} });
  }

  T.test("importing from game files: a folder's archives are found by name, and icons and strings imported", function () {
    var cat = catalog();
    var svc = service();
    var steps = [];
    return folder()
      .then(function (files) {
        return svc.importFiles("starcraft", cat, files, function (p) {
          steps.push(p);
        });
      })
      .then(function (r) {
        T.equal(r.icons.images.length, 12);
        T.equal(r.strings.length, 700);
        T.ok(steps.length >= 4 && steps[steps.length - 1].done === steps[steps.length - 1].total, "progress is reported");
        T.equal(svc.info("starcraft"), { strings: { count: 700 }, icons: { count: 12 } });
        T.equal(svc.string("starcraft", 334), "t\u0003Use S\u0003t\u0001im Packs");
        T.equal(svc.string("starcraft", 701), null);
        T.equal(svc.string("starcraft", 0), null);
      });
  });

  T.test("importing from game files: icons are coloured through the palette's remap row", function () {
    var cat = catalog();
    return folder()
      .then(function (files) {
        return AG.assets.importFiles(files, cat);
      })
      .then(function (r) {
        T.equal(r.icons.images.length, 12);
        // Frame 0 uses index 1, which the remap row sends to palette entry 9.
        var g = AG.assets.images.grp(icons(1));
        var pal = AG.assets.images.remap(AG.assets.images.palette(wpe(), "wpe"), AG.assets.images.pcxRow(pcxRow([0, 9, 9, 9])));
        T.equal(Array.from(AG.assets.images.colour(g.frame(0), pal).subarray(0, 4)), [9, 246, 7, 255]);
      });
  });

  T.test("patched assets take priority: an icon file in the patch archive and a base one comes from the patch", function () {
    var cat = catalog();
    return folder({ patchIcons: 9 })
      .then(function (files) {
        // Chosen in another order: the catalog's order decides.
        return AG.assets.importFiles([files[2], files[1], files[0]], cat);
      })
      .then(function (r) {
        T.equal(r.icons.images.length, 9);
        T.equal(r.from.icons, "Patch_rt.mpq");
        T.equal(r.from.strings, "Patch_rt.mpq");
      });
  });

  T.test("files from the wrong game: the editor says which files it needed, and keeps the assets it had", function () {
    var cat = catalog();
    var svc = service();
    return folder()
      .then(function (files) {
        return svc.importFiles("starcraft", cat, files);
      })
      .then(function () {
        return B.mpq([{ name: "Art\\unit\\Portrait\\portrait.grp", data: icons(3) }]);
      })
      .then(function (w2) {
        return svc.importFiles("starcraft", cat, [B.file("War2Dat.mpq", w2)]).then(
          function () {
            throw new Error("expected a failure");
          },
          function (e) {
            T.ok(/patch_rt\.mpq, broodat\.mpq, stardat\.mpq/.test(e.message) && /stat_txt\.tbl/.test(e.message), e.message);
            T.equal(svc.info("starcraft").icons.count, 12, "the earlier import is kept");
          }
        );
      })
      .then(function () {
        // Archives with the right names that don't hold the files.
        return B.mpq([{ name: "other.txt", data: "x" }]).then(function (bytes) {
          return svc.importFiles("starcraft", cat, [B.file("BrooDat.mpq", bytes)]).then(
            function () {
              throw new Error("expected a failure");
            },
            function (e) {
              T.ok(/don't hold unit\\cmdbtns\\cmdicons\.grp or rez\\stat_txt\.tbl/.test(e.message), e.message);
            }
          );
        });
      });
  });

  T.test("importing a string table: a stat_txt.tbl chosen alone replaces the strings and keeps the icons", function () {
    var cat = catalog();
    var svc = service();
    return folder()
      .then(function (files) {
        return svc.importFiles("starcraft", cat, files);
      })
      .then(function () {
        return svc.importFiles("starcraft", cat, [B.file("stat_txt.tbl", B.tbl(["Mine"]))]);
      })
      .then(function (r) {
        T.equal(r.strings, ["Mine"]);
        T.equal(svc.info("starcraft"), { strings: { count: 1 }, icons: { count: 12 } });
        T.equal(svc.string("starcraft", 1), "Mine");
      });
  });

  T.test("assets remembered: at the next start, icons and strings are there without choosing files, and deleting them goes back", function () {
    var cat = catalog();
    var storage = AG.core.storage.memory();
    var shipped = { starcraft: { game: "starcraft", strings: ["Shipped"], icons: { count: 2, path: "icons/" } } };
    return folder()
      .then(function (files) {
        return service(storage, { shipped: shipped }).importFiles("starcraft", cat, files);
      })
      .then(function () {
        var again = service(storage, { shipped: shipped });
        return again.start().then(function () {
          T.equal(again.info("starcraft"), { strings: { count: 700 }, icons: { count: 12 } });
          T.equal(again.string("starcraft", 1), "String 1");
          return again.deleteImported("starcraft").then(function () {
            T.equal(again.info("starcraft"), { strings: { count: 1 }, icons: { count: 2 } }, "back to the shipped assets");
            T.equal(again.string("starcraft", 1), "Shipped");
            return service(storage).start();
          });
        });
      })
      .then(function () {
        var none = service(storage, { shipped: {} });
        return none.start().then(function () {
          T.equal(none.info("starcraft"), {}, "with nothing shipped, back to names and IDs");
          T.equal(none.iconURL("starcraft", 0), null);
        });
      });
  });

  T.test("import failures: a truncated archive or a damaged string table is reported by name", function () {
    var cat = catalog();
    var svc = service();
    return folder()
      .then(function (files) {
        return files[0].arrayBuffer().then(function (buf) {
          var cut = new Uint8Array(buf).subarray(0, 200);
          return svc.importFiles("starcraft", cat, [B.file("Patch_rt.mpq", cut)]).then(
            function () {
              throw new Error("expected a failure");
            },
            function (e) {
              T.ok(/^Patch_rt\.mpq: /.test(e.message), e.message);
            }
          );
        });
      })
      .then(function () {
        var bad = new Uint8Array([200, 0, 1, 2]);
        return svc.importFiles("starcraft", cat, [B.file("stat_txt.tbl", bad)]).then(
          function () {
            throw new Error("expected a failure");
          },
          function (e) {
            T.ok(/^stat_txt\.tbl: the string table/.test(e.message), e.message);
          }
        );
      });
  });

  T.test("import failures: a needed file using an unsupported compression names the file and the method", function () {
    var cat = catalog();
    return B.mpq([{ name: "rez\\stat_txt.tbl", data: new Uint8Array(4000), mode: "bzip2" }]).then(function (bytes) {
      return AG.assets.importFiles([B.file("patch_rt.mpq", bytes)], cat).then(
        function () {
          throw new Error("expected a failure");
        },
        function (e) {
          T.ok(/patch_rt\.mpq: rez\\stat_txt\.tbl: it uses bzip2 compression/.test(e.message), e.message);
        }
      );
    });
  });

  // ---- In the editor

  function startEditor(ctx, svc) {
    return T.ui.start(ctx, { catalogs: { games: { starcraft: catalog() }, errors: [] }, assets: svc }).then(function (app) {
      return app.newMod("starcraft").then(function () {
        return app;
      });
    });
  }

  T.test("import dialog: choosing files imports with progress, and a failure is a notice, not a mod problem", function (ctx) {
    var svc = service();
    var files;
    return folder()
      .then(function (f) {
        files = f;
        return startEditor(ctx, svc);
      })
      .then(function (app) {
        app.edit(function (d) {
          return D.setUnitField(d, app.cat(), 0, "button_set", 999);
        });
        var before = JSON.stringify(app.state.problems);
        var dlg = AG.ui.importDialog.show(app);
        return T.ui
          .wait(0)
          .then(function () {
            T.ok(/No icons or strings are loaded/.test(T.ui.q(app, "[data-import-status]").textContent));
            return dlg.run([B.file("stat_txt.tbl", new Uint8Array([9, 0]))]);
          })
          .then(function () {
            T.ok(/Importing failed\. stat_txt\.tbl/.test(T.ui.q(app, "[data-import-message]").textContent));
            T.ok(app.root.querySelector('[data-notice="import-failed"]'), "a notice");
            T.equal(JSON.stringify(app.state.problems), before, "the mod's problems are unchanged");
            T.ok(!app.root.querySelector('.tree [data-key="unit:0"] .mark.warning'), "nothing in the item list");
            return dlg.run(files);
          })
          .then(function () {
            T.ok(/Imported 12 icons and 700 strings/.test(T.ui.q(app, "[data-import-message]").textContent));
            T.ok(!app.root.querySelector('[data-notice="import-failed"]'), "the failure notice is gone");
            T.ok(/Using 12 icons and 700 strings imported/.test(T.ui.q(app, "[data-import-status]").textContent));
            T.ui.q(app, 'dialog[data-dialog="import"] [data-value="close"]').click();
          });
      });
  }, { dom: true });

  T.test("assets don't affect validity: a mod saves the same with and without assets, and an ID beyond them is a warning with a placeholder", function (ctx) {
    var svc = service();
    return folder()
      .then(function (files) {
        return startEditor(ctx, svc).then(function (app) {
          function editAndSave() {
            app.edit(function (d) {
              return D.setButtons(d, app.cat(), 0, [{ position: 1, icon: 50, condition: "bf_always", action: "order_move", enabled_string: 900, disabled_string: 0 }]);
            });
            return app.serialized();
          }
          var without = editAndSave();
          T.equal(app.errors(), []);
          T.equal(app.warnings(), []);
          return svc.importFiles("starcraft", app.cat(), files).then(function () {
            app.recompute();
            var withAssets = app.serialized();
            T.equal(withAssets, without, "the saved files are identical");
            T.equal(app.errors(), [], "no errors");
            T.equal(
              app.warnings().map(function (w) {
                return w.path;
              }).sort(),
              ["button_sets[0].buttons[0].enabled_string", "button_sets[0].buttons[0].icon"]
            );
            app.select("button_sets", "set:0");
            T.ok(T.ui.q(app, '[data-field="set:0:0:icon"] [data-placeholder]'), "a placeholder for the missing icon");
            T.ok(/beyond the loaded icons, which number 12/.test(T.ui.q(app, '[data-field="set:0:0:icon"] .problem.warning').textContent));
          });
        });
      });
  }, { dom: true });

  T.test("icon choice: with imported icons a picker shows them; without, names and IDs", function (ctx) {
    var svc = service();
    return startEditor(ctx, svc).then(function (app) {
      app.select("button_sets", "set:0");
      T.ok(!app.root.querySelector('[data-action="pick-icon"]'), "no picker without icons");
      T.ok(T.ui.q(app, '.slot[data-position="1"] [data-placeholder]').textContent === "Move", "the preview shows the icon's name");
      return folder()
        .then(function (files) {
          return svc.importFiles("starcraft", app.cat(), files);
        })
        .then(function () {
          app.edit(function (d) {
            return D.setButtons(d, app.cat(), 0, [{ position: 1, icon: 3, condition: "bf_always", action: "order_move", enabled_string: 664, disabled_string: 0 }]);
          });
          var img = T.ui.q(app, '.slot[data-position="1"] img');
          T.ok(/^blob:/.test(img.src), "the preview shows the imported image");
          T.ui.q(app, '[data-action="pick-icon"]').click();
          return T.ui.wait(0);
        })
        .then(function () {
          var buttons = app.root.querySelectorAll('dialog[data-dialog="icons"] button[data-icon]');
          T.equal(buttons.length, 12);
          T.equal(app.root.querySelector('dialog[data-dialog="icons"] button[aria-pressed="true"]').dataset.icon, "3");
          app.root.querySelector('dialog[data-dialog="icons"] button[data-icon="7"]').click();
          return T.ui.wait(0);
        })
        .then(function () {
          T.equal(app.doc().button_sets[0].buttons[0].icon, 7);
          var img = T.ui.q(app, '.slot[data-position="1"] img');
          return new Promise(function (resolve, reject) {
            if (img.complete && img.naturalWidth) return resolve(img);
            img.onload = function () {
              resolve(img);
            };
            img.onerror = function () {
              reject(new Error("the icon image doesn't load"));
            };
          });
        })
        .then(function (img) {
          T.equal(img.naturalWidth, 2);
        });
    });
  }, { dom: true });

  T.test("string text: the stored text is shown as it is, with control bytes as numbers; without a table, the ID", function (ctx) {
    var svc = service();
    return startEditor(ctx, svc).then(function (app) {
      app.select("button_sets", "set:0");
      app.state.button["set:0"] = 1;
      app.render();
      T.ok(!app.root.querySelector("[data-string-text]"), "no text without a table");
      T.equal(T.ui.q(app, '[data-field="set:0:1:enabled_string"] input[data-role="id"]').value, "334");
      return folder()
        .then(function (files) {
          return svc.importFiles("starcraft", app.cat(), files);
        })
        .then(function () {
          app.recompute();
          var shown = T.ui.q(app, '[data-string-text="334"]');
          T.equal(shown.textContent, "t<3>Use S<3>t<1>im Packs");
          T.equal(shown.querySelectorAll(".ctrl").length, 3);
        });
    });
  }, { dom: true });

  T.test("unit icons: a unit's panel shows the icon its catalog entry names, when icons are available", function (ctx) {
    // Unit 0 with the given icon, or none.
    function withUnitIcon(icon) {
      var raw = T.rawCatalog("starcraft");
      raw.units.forEach(function (u) {
        delete u.icon;
        if (u.id === 0 && icon !== undefined) u.icon = icon;
      });
      T.equal(AG.core.catalog.check(raw, "icons"), []);
      return { games: { starcraft: AG.core.catalog.index(raw) }, errors: [] };
    }
    var shipped = { starcraft: { game: "starcraft", icons: { count: 2, path: "icons/" } } };
    function open(icon, svc) {
      return T.ui.start(ctx, { catalogs: withUnitIcon(icon), assets: svc }).then(function (app) {
        return app.newMod("starcraft").then(function () {
          app.select("units", "unit:0");
          return app;
        });
      });
    }
    function iconSrc(app) {
      var img = app.root.querySelector(".panel-title img.unit-icon");
      return img ? img.getAttribute("src") : null;
    }
    var svc = service(AG.core.storage.memory(), { shipped: shipped, shippedBase: "fixtures/shipped/" });
    return open(1, svc)
      .then(function (app) {
        T.equal(iconSrc(app), "fixtures/shipped/starcraft/icons/1.png");
        return open(5, svc);
      })
      .then(function (app) {
        T.equal(iconSrc(app), null, "an icon beyond the available ones isn't shown");
        return open(undefined, svc);
      })
      .then(function (app) {
        T.equal(iconSrc(app), null, "a unit without an icon has none");
        return open(1, service(AG.core.storage.memory(), { shipped: {} }));
      })
      .then(function (app) {
        T.equal(iconSrc(app), null, "without icons there's no image");
        T.ok(/^0 /.test(T.ui.q(app, ".panel-title").textContent), "the title is still shown");
      });
  }, { dom: true });

  T.test("unit icons: a game whose units have an icon field shows the icon and the picker there, not beside the name", function (ctx) {
    var shipped = { warcraft2: { game: "warcraft2", icons: { count: 4, path: "icons/" } } };
    var svc = service(AG.core.storage.memory(), { shipped: shipped, shippedBase: "fixtures/shipped/" });
    var cats = { games: { warcraft2: T.catalog("warcraft2") }, errors: [] };
    return T.ui.start(ctx, { catalogs: cats, assets: svc }).then(function (app) {
      return app.newMod("warcraft2").then(function () {
        app.select("units", "unit:0");
        T.ok(!app.root.querySelector(".panel-title img"), "no icon beside the name");
        var f = T.ui.q(app, '[data-field="unit:0:icon"]');
        T.equal(f.querySelector(".icon-preview img").getAttribute("src"), "fixtures/shipped/warcraft2/icons/2.png");
        T.ok(f.querySelector('[data-action="pick-icon"]'), "the icon picker is offered");
      });
    });
  }, { dom: true });

  T.test("start screen logos: a game with a shipped logo gets a logo button, one without gets text, and a logo that doesn't load falls back to text", function (ctx) {
    var shipped = {
      starcraft: { game: "starcraft", logo: "logo.png" },
      warcraft2: { game: "warcraft2", logo: "missing.png" }
    };
    var svc = service(AG.core.storage.memory(), { shipped: shipped, shippedBase: "../assets/" });
    var cats = { games: { starcraft: catalog(), warcraft2: T.catalog("warcraft2") }, errors: [] };
    return T.ui.start(ctx, { catalogs: cats, assets: svc }).then(function (app) {
      var sc = T.ui.q(app, '[data-new-mod="starcraft"]');
      var img = sc.querySelector("img");
      T.ok(img, "StarCraft has a logo");
      T.equal(img.getAttribute("src"), "../assets/starcraft/logo.png");
      T.equal(img.alt, "New " + app.catalogs.games.starcraft.title + " mod");
      T.equal(svc.logoURL("nothing"), null);
      return T.ui.until(function () {
        var shippedLogo = app.root.querySelector('[data-new-mod="starcraft"] img');
        return !T.ui.q(app, '[data-new-mod="warcraft2"]').querySelector("img") && shippedLogo && shippedLogo.complete;
      }, "the logos to load or fail").then(function () {
        var w2 = T.ui.q(app, '[data-new-mod="warcraft2"]');
        T.ok(!w2.querySelector("img"), "a logo that doesn't load becomes text");
        T.equal(w2.textContent, "New " + app.catalogs.games.warcraft2.title + " mod");
        T.equal(T.ui.q(app, '[data-new-mod="starcraft"] img').naturalWidth > 0, true, "the shipped logo loads");
        var plain = service(AG.core.storage.memory(), { shipped: {} });
        T.equal(plain.logoURL("starcraft"), null, "without a logo there's no URL, so the button is text");
      });
    });
  }, { dom: true });

  T.test("string choices: a string field lists every string of the table by its clean name, and shows the stored text with <10>", function (ctx) {
    var strings = ["Terran Marine\u0000*\u0000Ground Units", "t\u0003Use S\u0003t\u0001im Packs\n(Marine ability)", "\u001b\u0000\u0003ESC\u0001 - Cancel"];
    var svc = service(AG.core.storage.memory(), { shipped: { starcraft: { game: "starcraft", strings: strings } } });
    return startEditor(ctx, svc).then(function (app) {
      app.edit(function (d) {
        return D.setButtons(d, app.cat(), 0, [{ position: 1, icon: 1, condition: "bf_always", action: "order_move", enabled_string: 2, disabled_string: 9 }]);
      });
      app.select("button_sets", "set:0");
      var sel = T.ui.q(app, '[data-field="set:0:0:enabled_string"] select');
      T.equal(Array.prototype.map.call(sel.options, function (o) {
        return o.textContent;
      }), ["0 (no string)", "1 Terran Marine", "2 Use Stim Packs (Marine ability)", "3 ESC - Cancel"]);
      T.equal(sel.options[sel.selectedIndex].textContent, "2 Use Stim Packs (Marine ability)");
      var beyond = T.ui.q(app, '[data-field="set:0:0:disabled_string"] select');
      T.equal(beyond.options[beyond.selectedIndex].textContent, "9 (not in the string table)");
      T.equal(T.ui.q(app, '[data-string-text="2"]').textContent, "t<3>Use S<3>t<1>im Packs<10>(Marine ability)");
      var row = T.ui.q(app, '.button-list li[data-index="0"]').textContent;
      T.ok(row.indexOf("— Use Stim Packs (Marine ability)") >= 0, "the button list uses the clean name: " + row);
    });
  }, { dom: true });

  T.test("assets are optional: shipped icons and strings are shown, and imported ones take priority", function (ctx) {
    var shipped = { starcraft: { game: "starcraft", strings: ["One", "Two"], icons: { count: 2, path: "icons/" } } };
    var svc = service(AG.core.storage.memory(), { shipped: shipped, shippedBase: "fixtures/shipped/" });
    return startEditor(ctx, svc).then(function (app) {
      app.edit(function (d) {
        return D.setButtons(d, app.cat(), 0, [{ position: 1, icon: 1, condition: "bf_always", action: "order_move", enabled_string: 2, disabled_string: 0 }]);
      });
      app.select("button_sets", "set:0");
      var img = T.ui.q(app, '.slot[data-position="1"] img');
      T.equal(img.getAttribute("src"), "fixtures/shipped/starcraft/icons/1.png");
      T.equal(T.ui.q(app, '[data-string-text="2"]').textContent, "Two");
      return new Promise(function (resolve, reject) {
        if (img.complete && img.naturalWidth) return resolve();
        img.onload = resolve;
        img.onerror = function () {
          reject(new Error("the shipped icon doesn't load"));
        };
      }).then(function () {
        T.equal(img.naturalWidth, 36, "the shipped image loads");
        return folder().then(function (files) {
          return svc.importFiles("starcraft", app.cat(), files);
        });
      }).then(function () {
        app.recompute();
        T.ok(/^blob:/.test(T.ui.q(app, '.slot[data-position="1"] img').src), "the imported icon is shown");
        T.equal(T.ui.q(app, '[data-string-text="2"]').textContent, "String 2");
      });
    });
  }, { dom: true });

  T.test("assets are optional: with no shipped and no imported assets, names and IDs are shown and editing works", function (ctx) {
    var svc = service(AG.core.storage.memory(), { shipped: {} });
    return startEditor(ctx, svc).then(function (app) {
      app.select("button_sets", "set:0");
      T.ok(!app.root.querySelector(".tabpanel img"), "no images");
      T.equal(T.ui.q(app, '.slot[data-position="1"] [data-placeholder]').textContent, "Move");
      T.ui.change(T.ui.q(app, '[data-field="set:0:0:icon"] input[data-role="id"]'), "5");
      T.equal(app.doc().button_sets[0].buttons[0].icon, 5);
      T.equal(app.errors(), []);
    });
  }, { dom: true });
})(AxeGraft);
