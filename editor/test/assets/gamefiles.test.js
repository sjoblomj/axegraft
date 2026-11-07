// Read-only checks against real game files. They run only when a game folder
// is given, through AXEGRAFT_EDITOR_GAME_DIR or the test page, and are
// reported as not checked otherwise. The files are only read.
"use strict";

(function (AG) {
  var T = AG.testing;

  function base(f) {
    return f.name.toLowerCase();
  }

  // The game the chosen folder holds, from its archive names.
  function gameOf(files) {
    var names = files.map(base);
    if (names.indexOf("stardat.mpq") >= 0 || names.indexOf("broodat.mpq") >= 0) return "starcraft";
    if (names.indexOf("war2dat.mpq") >= 0) return "warcraft2";
    return null;
  }

  function shippedCatalog(game) {
    var r = AG.core.catalog.registry.registered.filter(function (x) {
      return x.raw && x.raw.game === game;
    })[0];
    return AG.core.catalog.index(JSON.parse(JSON.stringify(r.raw)));
  }

  function archives(ctx) {
    return ctx.gameFiles.files.filter(function (f) {
      return /\.mpq$/i.test(f.name);
    });
  }

  T.test("game files: the chosen folder holds a game's archives", function (ctx) {
    T.ok(gameOf(ctx.gameFiles.files), "no StarCraft or Warcraft II archive among " + ctx.gameFiles.files.length + " files");
  }, { gameFiles: true });

  T.test("game files: icons and strings import from the real archives, with the catalog's archive order and palette", function (ctx) {
    var game = gameOf(ctx.gameFiles.files);
    if (!game) T.notChecked("the folder isn't a StarCraft or Warcraft II folder");
    var cat = shippedCatalog(game);
    return AG.assets.importFiles(ctx.gameFiles.files, cat).then(function (r) {
      if (game === "starcraft") {
        T.ok([1185, 1539, 1547].indexOf(r.strings.length) >= 0, "strings: " + r.strings.length);
        T.ok([365, 386, 390].indexOf(r.icons.images.length) >= 0, "icons: " + r.icons.images.length);
        // cmdicons.grp says 36 by 34, but its frames use only 33 by 32.
        T.equal([r.icons.width, r.icons.height], [33, 32]);
        // Strings run to the next one, so a unit's name keeps the parts after its NUL.
        T.equal(r.strings[0], "Terran Marine\u0000*\u0000Ground Units");
        T.equal(r.strings[663], "m\u0000\u0003M\u0001ove", "string 664 holds the Move button's hotkey, type and text");
        if (r.strings.length === 1547) T.equal(r.from.icons, "Patch_rt.mpq", "the patch archive's copy is used");
      } else {
        T.equal(r.strings.length, 479);
        T.equal(r.icons.images.length, 196);
        T.equal([r.icons.width, r.icons.height], [46, 38]);
        T.equal(r.strings[391], "m\u0000\u0004M\u0001OVE", "string 392 is the Move button's");
      }
      T.ok(r.icons.images.every(function (p) {
        return p && p.length > 50;
      }), "every frame decodes");
    });
  }, { gameFiles: true, timeout: 120000 });

  T.test("game files: every archive opens, and every file the catalog names reads", function (ctx) {
    var game = gameOf(ctx.gameFiles.files);
    if (!game) T.notChecked("the folder isn't a StarCraft or Warcraft II folder");
    var spec = shippedCatalog(game).assets;
    var names = [spec.icons.file, spec.icons.palette.file, spec.strings.file].concat(spec.icons.palette.remap ? [spec.icons.palette.remap] : []);
    var found = {};
    return archives(ctx).reduce(function (p, f) {
      return p.then(function () {
        if (spec.archives.indexOf(base(f)) < 0) return null;
        return AG.assets.mpq.open(f).then(function (a) {
          return names.reduce(function (q, n) {
            return q.then(function () {
              if (!a.has(n)) return null;
              return a.read(n).then(function (bytes) {
                T.ok(bytes.length > 0, n);
                found[n] = true;
              });
            });
          }, Promise.resolve());
        });
      });
    }, Promise.resolve()).then(function () {
      T.equal(Object.keys(found).sort(), names.slice().sort(), "every named file is in one of the archives");
    });
  }, { gameFiles: true, timeout: 120000 });
})(AxeGraft);
