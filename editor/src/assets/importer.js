// Importing icons and strings from the user's own game files, and the
// asset service the editor asks for them.
//
// Selected files are only read. The archives are found by name and searched
// in the catalog's order, highest priority first, as the game searches them.
// Icons are decoded once and kept as PNG images; strings as text. Both are
// stored in browser storage, so they're there at the next start.
//
// For each game, an icon or string comes from the imported assets, then
// from those shipped in assets/<game>/, and otherwise the editor shows a
// placeholder with the name or ID.
"use strict";

(function (AG) {
  var I = AG.assets.images;

  function base(name) {
    return String(name || "").replace(/\\/g, "/").split("/").pop().toLowerCase();
  }

  function pause() {
    return new Promise(function (r) {
      setTimeout(r, 0);
    });
  }

  function ImportError(file, message) {
    this.name = "ImportError";
    this.file = file;
    this.message = (file ? file + ": " : "") + message;
  }
  ImportError.prototype = Object.create(Error.prototype);

  // Imports from chosen files for a catalog. `progress({ text, done, total })`
  // is told how it goes. Resolves with { icons, strings, source }: icons is
  // null if the files hold none, and so is strings.
  function importFiles(files, cat, progress) {
    progress = progress || function () {};
    var spec = cat.assets;
    if (!spec) return Promise.reject(new ImportError(null, "the " + cat.title + " catalog doesn't say where the game keeps its icons and strings"));
    var stringsName = spec.strings ? base(spec.strings.file) : "stat_txt.tbl";
    var tables = files.filter(function (f) {
      return base(f.name) === stringsName || (files.length === 1 && /\.tbl$/i.test(f.name));
    });
    var archives = [];
    spec.archives.forEach(function (want) {
      files.forEach(function (f) {
        if (base(f.name) === base(want)) archives.push(f);
      });
    });

    function readTable(t) {
      return Promise.resolve(t.arrayBuffer()).then(function (buf) {
        try {
          return I.tbl(new Uint8Array(buf));
        } catch (e) {
          throw new ImportError(t.name, e.message);
        }
      });
    }

    // A string table chosen by itself.
    if (!archives.length && tables.length) {
      var t = tables[0];
      progress({ text: "Reading " + t.name, done: 0, total: 1 });
      return readTable(t).then(function (strings) {
        progress({ text: "Read " + strings.length + " strings", done: 1, total: 1 });
        return { icons: null, strings: strings, source: t.name };
      });
    }
    // A string table chosen with archives is used in place of theirs. One
    // that's only in a chosen folder isn't: the game doesn't read it there.
    var ownTable = tables.filter(function (f) {
      return !f.webkitRelativePath;
    })[0] || null;
    if (!archives.length) {
      var needed = spec.archives.join(", ");
      return Promise.reject(
        new ImportError(null, "none of the chosen files is one the editor needs. For " + cat.title + " it looks for " + needed + (spec.strings ? ", or " + stringsName + " on its own" : "") + ".")
      );
    }

    var opened = [];
    var step = 0;
    var total = archives.length + (spec.icons ? 2 : 0) + (spec.strings || ownTable ? 1 : 0);
    function tick(text) {
      progress({ text: text, done: ++step, total: total });
    }
    return archives
      .reduce(function (p, f) {
        return p.then(function () {
          return AG.assets.mpq.open(f).then(
            function (a) {
              opened.push({ file: f, archive: a });
              tick("Opened " + f.name);
            },
            function (e) {
              throw new ImportError(f.name, e.message);
            }
          );
        });
      }, Promise.resolve())
      .then(function () {
        // Reads a file from the archive with the highest priority that has it.
        function read(name) {
          for (var i = 0; i < opened.length; i++) {
            if (opened[i].archive.has(name)) {
              var o = opened[i];
              return o.archive.read(name).then(
                function (bytes) {
                  return { bytes: bytes, from: o.file.name };
                },
                function (e) {
                  throw new ImportError(o.file.name, e.message);
                }
              );
            }
          }
          return Promise.resolve(null);
        }
        var result = { icons: null, strings: null, source: opened.map(function (o) {
          return o.file.name;
        }).concat(ownTable ? [ownTable.name] : []).join(", "), from: {} };
        var chain = Promise.resolve();
        if (ownTable) {
          chain = chain.then(function () {
            return readTable(ownTable).then(function (strings) {
              tick("Read the strings from " + ownTable.name);
              result.strings = strings;
              result.from.strings = ownTable.name;
            });
          });
        } else if (spec.strings) {
          chain = chain.then(function () {
            return read(spec.strings.file).then(function (r) {
              tick("Read the strings");
              if (!r) return;
              try {
                result.strings = I.tbl(r.bytes);
                result.from.strings = r.from;
              } catch (e) {
                throw new ImportError(r.from, spec.strings.file + ": " + e.message);
              }
            });
          });
        }
        if (spec.icons) {
          chain = chain.then(function () {
            return Promise.all([
              read(spec.icons.file),
              spec.icons.palette ? read(spec.icons.palette.file) : Promise.resolve(null),
              spec.icons.palette && spec.icons.palette.remap ? read(spec.icons.palette.remap) : Promise.resolve(null)
            ]).then(function (r) {
              tick("Read the icons");
              if (!r[0]) return null;
              var g;
              var pal;
              try {
                g = I.grp(r[0].bytes);
              } catch (e) {
                throw new ImportError(r[0].from, spec.icons.file + ": " + e.message);
              }
              try {
                if (r[1]) {
                  pal = I.palette(r[1].bytes, spec.icons.palette.format);
                  if (r[2]) pal = I.remap(pal, I.pcxRow(r[2].bytes));
                } else {
                  pal = [];
                  for (var k = 0; k < 256; k++) pal.push([k, k, k]);
                }
              } catch (e) {
                throw new ImportError((r[2] || r[1]).from, "the palette: " + e.message);
              }
              result.from.icons = r[0].from;
              return encodeIcons(g, pal, function (done) {
                progress({ text: "Decoding icon " + done + " of " + g.count, done: step + done / g.count, total: total });
              }).then(function (icons) {
                result.icons = { width: g.width, height: g.height, images: icons };
                tick("Decoded " + g.count + " icons");
              });
            });
          });
        }
        return chain.then(function () {
          if (!result.icons && !result.strings) {
            throw new ImportError(null, "the chosen archives don't hold " + [spec.icons ? spec.icons.file : null, spec.strings ? spec.strings.file : null].filter(Boolean).join(" or ") + ", so they may be another game's");
          }
          return result;
        });
      });
  }

  // Each frame as PNG bytes, pausing now and then so the page stays responsive.
  function encodeIcons(g, pal, onFrame) {
    var out = [];
    function next(i) {
      if (i >= g.count) return Promise.resolve(out);
      var frame;
      try {
        frame = g.frame(i);
      } catch (e) {
        out.push(null);
        return next(i + 1);
      }
      return I.png(frame.width, frame.height, I.colour(frame, pal)).then(function (png) {
        out.push(png);
        if (i % 8 === 7) {
          onFrame(i + 1);
          return pause().then(function () {
            return next(i + 1);
          });
        }
        return next(i + 1);
      });
    }
    return next(0);
  }

  // ---- Shipped assets

  var shipped = {};
  // Called by assets/<game>/assets.js.
  AG.registerShippedAssets = function (data) {
    if (data && typeof data.game === "string") shipped[data.game] = data;
  };
  AG.assets.shippedBase = "assets/";

  // ---- The service

  // `storage` is the editor's storage. Imported assets are kept under the
  // game's name in the "assets" store.
  function service(storage, options) {
    options = options || {};
    var imported = {};
    var urls = {};
    var canURL = typeof URL !== "undefined" && typeof URL.createObjectURL === "function" && typeof Blob !== "undefined";

    function setImported(game, data) {
      (urls[game] || []).forEach(function (u) {
        if (u) URL.revokeObjectURL(u);
      });
      urls[game] = [];
      imported[game] = data || null;
      if (data && data.icons && canURL) {
        urls[game] = data.icons.images.map(function (img) {
          if (!img) return null;
          var blob = img instanceof Blob ? img : new Blob([img], { type: "image/png" });
          return URL.createObjectURL(blob);
        });
      }
    }

    function shippedFor(game) {
      return (options.shipped || shipped)[game] || null;
    }

    var svc = {
      start: function (games) {
        if (!storage) return Promise.resolve();
        return storage.keys("assets").then(function (keys) {
          return Promise.all(
            (keys || []).map(function (game) {
              return storage.get("assets", game).then(function (d) {
                if (d && (!games || games.indexOf(game) >= 0)) setImported(game, d);
              });
            })
          );
        });
      },
      imported: function (game) {
        return imported[game] || null;
      },
      shipped: shippedFor,
      // What's loaded, as validation counts it: only these make warnings.
      info: function (game) {
        var out = {};
        var im = imported[game];
        var sh = shippedFor(game);
        var strings = (im && im.strings) || (sh && sh.strings) || null;
        if (strings) out.strings = { count: strings.length };
        if (im && im.icons) out.icons = { count: im.icons.images.length };
        else if (sh && sh.icons && sh.icons.count) out.icons = { count: sh.icons.count };
        return out;
      },
      hasIcons: function (game) {
        return !!svc.info(game).icons;
      },
      iconCount: function (game) {
        var i = svc.info(game).icons;
        return i ? i.count : 0;
      },
      iconURL: function (game, id) {
        if (typeof id !== "number" || id < 0 || id !== Math.floor(id)) return null;
        var im = imported[game];
        if (im && im.icons) return urls[game] && urls[game][id] ? urls[game][id] : null;
        var sh = shippedFor(game);
        if (sh && sh.icons && id < sh.icons.count) return (options.shippedBase || AG.assets.shippedBase) + game + "/" + (sh.icons.path || "icons/") + id + ".png";
        return null;
      },
      // The game's logo shipped in assets/<game>/, or null if there's none.
      logoURL: function (game) {
        var sh = shippedFor(game);
        if (!sh || typeof sh.logo !== "string" || !sh.logo) return null;
        return (options.shippedBase || AG.assets.shippedBase) + game + "/" + sh.logo;
      },
      // The string table in use, imported or shipped: an array where ID n
      // is element n - 1, or null if there's none.
      strings: function (game) {
        var im = imported[game];
        var sh = shippedFor(game);
        return (im && im.strings) || (sh && sh.strings) || null;
      },
      string: function (game, id) {
        var list = svc.strings(game);
        if (!list || typeof id !== "number" || id < 1 || id > list.length) return null;
        return list[id - 1];
      },
      // Imports chosen files. Previously imported assets are kept until the
      // new ones are read in full; a string table alone replaces only the strings.
      importFiles: function (game, cat, files, progress) {
        return importFiles(files, cat, progress).then(function (r) {
          var prev = imported[game] || {};
          var stored = {
            game: game,
            time: Date.now(),
            source: r.source,
            icons: r.icons
              ? {
                  width: r.icons.width,
                  height: r.icons.height,
                  images: r.icons.images.map(function (b) {
                    return b && typeof Blob !== "undefined" ? new Blob([b], { type: "image/png" }) : b;
                  })
                }
              : prev.icons || null,
            strings: r.strings || prev.strings || null
          };
          setImported(game, stored);
          return (storage ? storage.put("assets", game, stored) : Promise.resolve()).then(function () {
            return r;
          });
        });
      },
      deleteImported: function (game) {
        setImported(game, null);
        return storage ? storage.del("assets", game) : Promise.resolve();
      }
    };
    return svc;
  }

  AG.assets.importFiles = importFiles;
  AG.assets.ImportError = ImportError;
  AG.assets.createService = service;
  // The editor's own service, over its storage.
  AG.assets.service = function (app) {
    return service(app.storage);
  };
})(AxeGraft);
