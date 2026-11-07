// The editor's main window: menu, item list, tabs, status bar and notices,
// and the commands behind them. Panels for each tab are in their own files
// and register themselves in AG.ui.panels.
"use strict";

(function (AG) {
  var h = AG.ui.h;
  var help = AG.ui.help;
  var dialogs = AG.ui.dialogs;
  var tree = AG.core.tree;
  var util = AG.util;

  AG.ui.panels = AG.ui.panels || {};

  var DRAFT_KEY = "current";
  var DRAFT_DELAY = 400;

  function isTextEntry(el) {
    if (!el || !el.tagName) return false;
    if (el.tagName === "TEXTAREA") return true;
    return el.tagName === "INPUT" && /^(text|search|number|)$/.test(el.type || "");
  }

  // Creates an editor in `root`. Options:
  //   catalogs:  the result of AG.core.catalog.load (games and errors)
  //   storage:   a storage object, or a promise of one (default: IndexedDB)
  //   idb:       the IndexedDB factory to open, when `storage` isn't given
  //   platform:  replacements for AG.ui.platform's functions
  //   assets:    the asset service (default: AG.assets.service if present)
  //   prefs:     { get(key), set(key, value) } for settings kept per browser,
  //              such as the theme (default: localStorage, where it works)
  //   page:      true to theme the whole page, not only `root`
  //   logo:      the URL of the start screen's logo (default: images/axegraft.png)
  function createApp(root, options) {
    options = options || {};
    var catalogs = options.catalogs || { games: {}, errors: [] };
    var platform = Object.assign({}, AG.ui.platform, options.platform || {});
    var app = {
      root: root,
      catalogs: catalogs,
      platform: platform,
      storage: null,
      notices: [],
      state: {
        game: null,
        cat: null,
        history: null,
        fileName: null,
        handle: null,
        savedText: null,
        tab: "units",
        selection: {},
        cursor: {},
        expanded: {},
        search: {},
        searchOpen: {},
        filter: {},
        button: {},
        showOriginal: false,
        problems: [],
        marks: null,
        report: [],
        // What's typed on the start screen for the next new mod.
        newInfo: { name: "", version: "", authors: "" }
      }
    };
    var S = app.state;
    var draftTimer = null;

    // ---- Theme

    // "dark" (the default) is dark and bluish; "classic" is close to
    // Windows 9x. The choice is kept in this browser only.
    var THEMES = { dark: "Dark", classic: "Classic" };
    var THEME_KEY = "axegraft-editor.theme";
    var prefs = options.prefs || localPrefs();
    S.theme = THEMES[prefs.get(THEME_KEY)] ? prefs.get(THEME_KEY) : "dark";

    function applyTheme() {
      root.dataset.theme = S.theme;
      if (options.page) root.ownerDocument.documentElement.dataset.theme = S.theme;
    }
    app.themes = THEMES;
    app.setTheme = function (name) {
      if (!THEMES[name]) throw new Error("unknown theme " + name);
      S.theme = name;
      prefs.set(THEME_KEY, name);
      applyTheme();
      app.render();
    };
    applyTheme();

    // ---- Derived state

    app.cat = function () {
      return S.cat;
    };
    app.doc = function () {
      return S.history ? S.history.present : null;
    };
    app.assetInfo = function () {
      return app.assets && app.assets.info ? app.assets.info(S.game) : {};
    };
    app.serialized = function () {
      return S.history ? AG.core.serialize(app.doc(), S.cat) : null;
    };
    app.isDirty = function () {
      return !!S.history && app.serialized() !== S.savedText;
    };
    app.errors = function () {
      return S.problems.filter(function (p) {
        return p.severity === "error";
      });
    };
    app.warnings = function () {
      return S.problems.filter(function (p) {
        return p.severity !== "error";
      });
    };

    function recompute() {
      if (!S.history) return;
      S.problems = AG.core.problems(app.doc(), S.cat, app.assetInfo());
      S.marks = tree.marks(app.doc(), S.cat, S.problems);
      S.report = AG.core.compat.report(app.doc(), S.cat);
    }
    app.recompute = function () {
      recompute();
      app.render();
    };

    // Problems at an item, or at one of its fields.
    app.problemsAt = function (pred) {
      var doc = app.doc();
      return S.problems.filter(function (p) {
        var l = tree.locate(doc, S.cat, p.path);
        return l && pred(l, p);
      });
    };

    // ---- Notices

    app.notice = function (id, kind, content, dismissible) {
      app.notices = app.notices.filter(function (n) {
        return n.id !== id;
      });
      app.notices.push({ id: id, kind: kind, content: content, dismissible: !!dismissible });
      app.render();
    };
    app.dismiss = function (id) {
      app.notices = app.notices.filter(function (n) {
        return n.id !== id;
      });
      app.render();
    };

    // ---- Loading a mod

    function load(game, doc, fileName, handle, savedText) {
      S.game = game;
      S.cat = catalogs.games[game];
      S.history = AG.core.history.create(doc);
      S.fileName = fileName;
      S.handle = handle || null;
      S.savedText = savedText === undefined ? AG.core.serialize(doc, S.cat) : savedText;
      S.selection = {};
      S.cursor = {};
      S.expanded = {};
      S.search = {};
      S.searchOpen = {};
      S.filter = {};
      S.button = {};
      var tabs = tree.tabsFor(S.cat);
      if (
        !tabs.some(function (t) {
          return t.id === S.tab;
        })
      )
        S.tab = tabs[0].id;
      recompute();
      scheduleDraft();
      app.render();
    }

    function confirmDiscard() {
      if (!app.isDirty()) return Promise.resolve(true);
      return dialogs.confirm(root, "Unsaved changes", "The current mod has unsaved changes. Discard them?", "Discard changes", "Keep editing", "discard");
    }

    // Creates a mod. While the start screen shows, the new mod takes the
    // information typed there.
    app.newMod = function (game) {
      if (!catalogs.games[game]) return Promise.reject(new Error("no catalog for " + game));
      var fromStart = !S.history;
      return confirmDiscard().then(function (ok) {
        if (!ok) return false;
        var info = fromStart ? infoValues(S.newInfo) : {};
        load(game, AG.core.doc.create(game, info), null, null);
        return true;
      });
    };

    // ---- Mod information

    // The document's information from what's typed in the form.
    function infoValues(typed) {
      return {
        name: typed.name.trim(),
        version: typed.version.trim(),
        authors: AG.core.doc.parseAuthors(typed.authors)
      };
    }

    // The name, version and authors fields. `typed` is changed as the user
    // types, so nothing is lost on a render.
    function infoFields(typed, problems) {
      function input(key, label, helpKey, attrs) {
        var el = h("input", Object.assign({ type: "text", class: "ctl wide", value: typed[key], autocomplete: "off", dataset: { info: key } }, attrs || {}));
        el.addEventListener("input", function () {
          typed[key] = el.value;
        });
        return AG.ui.fields.field({
          label: label,
          help: help.text(helpKey),
          controls: [el],
          problems: (problems || []).filter(function (p) {
            return p.path === "mod." + key || p.path.indexOf("mod." + key + "[") === 0;
          })
        });
      }
      return h("div", { class: "mod-info" }, [
        input("name", "Mod name", "modName"),
        input("version", "Version", "modVersion"),
        input("authors", "Authors", "modAuthors", { placeholder: "Separated by commas" })
      ]);
    }

    // Shows the current mod's information for editing. OK applies it as one
    // undoable change.
    app.editInfo = function () {
      if (!S.history) return Promise.resolve(false);
      var current = AG.core.doc.info(app.doc());
      function text(v) {
        return typeof v === "string" ? v : AG.ui.fields.showValue(v);
      }
      var typed = {
        name: text(current.name),
        version: text(current.version),
        authors: Array.isArray(current.authors) ? current.authors.map(text).join(", ") : text(current.authors)
      };
      var problems = S.problems.filter(function (p) {
        return /^mod\b/.test(p.path || "");
      });
      var body = [h("p", { text: "This information is for people using the mod. It doesn't change what the mod does." }), infoFields(typed, problems)];
      return dialogs.show(root, "Mod information", body, [{ label: "OK", value: "ok" }, { label: "Cancel", value: "cancel" }], {
        name: "modInfo",
        onOpen: function (dlg, close) {
          var first = dlg.querySelector("input");
          if (first) first.focus();
          dlg.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && e.target.matches("input")) {
              e.preventDefault();
              close("ok");
            }
          });
        }
      }).then(function (v) {
        if (v !== "ok") return false;
        app.edit(function (d) {
          return AG.core.doc.withInfo(d, infoValues(typed));
        });
        return true;
      });
    };

    // Opens a file chosen by the user.
    app.open = function () {
      return confirmDiscard().then(function (ok) {
        if (!ok) return false;
        return Promise.resolve(platform.openMod()).then(function (picked) {
          if (!picked) return false;
          return app.openFile(picked.file, picked.handle, true);
        });
      });
    };

    // Reads a File (or anything with a name and arrayBuffer()) as a mod.
    app.openFile = function (file, handle, confirmed) {
      var ready = confirmed ? Promise.resolve(true) : confirmDiscard();
      return ready.then(function (ok) {
        if (!ok) return false;
        var name = (file && file.name) || "the file";
        return Promise.resolve()
          .then(function () {
            return file.arrayBuffer();
          })
          .then(
            function (bytes) {
              var result = AG.core.modfile.read(bytes, catalogs.games, null);
              if (result.refused) {
                showRefused(name, result.problems);
                return false;
              }
              var cat = catalogs.games[result.game];
              var doc = AG.core.doc.normalize(result.mod, cat);
              load(result.game, doc, name, handle, AG.core.serialize(doc, cat));
              return true;
            },
            function (e) {
              showRefused(name, [{ severity: "error", path: "", message: "The file couldn't be read: " + ((e && e.message) || e) + "." }]);
              return false;
            }
          );
      });
    };

    function showRefused(name, problems) {
      var body = [
        h("p", { text: name + " can't be opened, because it isn't a mod this editor can hold. Nothing was changed." }),
        h(
          "ul",
          { class: "problem-list", dataset: { refused: name } },
          problems.map(function (p) {
            return h("li", null, [h("span", { class: "sev error", text: p.refuse ? "Refused" : "Error" }), h("span", null, [p.message, " ", p.path ? h("span", { class: "path", text: "at " + p.path }) : null])]);
          })
        )
      ];
      return dialogs.alert(root, "Can't open " + name, body, "refused");
    }

    // ---- Saving

    function defaultName() {
      return S.fileName || (S.game === "warcraft2" ? "warcraft2-mod.json" : "starcraft-mod.json");
    }

    function finishSave(result, text) {
      if (!result) return false;
      S.fileName = result.name || defaultName();
      S.handle = result.handle || null;
      S.savedText = text;
      clearDraft();
      app.render();
      return true;
    }

    app.save = function (as) {
      if (!S.history) return Promise.resolve(false);
      if (app.errors().length) {
        app.showProblems("This mod has errors, so it can't be saved. Fix or remove them first.");
        return Promise.resolve(false);
      }
      var text = app.serialized();
      var p = as || !S.handle ? platform.saveAs(defaultName(), text) : platform.save(S.handle, defaultName(), text);
      return Promise.resolve(p).then(function (r) {
        return finishSave(r, text);
      });
    };
    app.saveAs = function () {
      return app.save(true);
    };

    // ---- Editing

    // Applies `fn(doc)` to the mod as one undoable change.
    app.edit = function (fn) {
      if (!S.history) return;
      var next = fn(app.doc());
      if (next === app.doc()) return;
      var h2 = AG.core.history.push(S.history, next);
      if (h2 === S.history) return;
      S.history = h2;
      recompute();
      scheduleDraft();
      app.render();
    };
    app.undo = function () {
      if (!S.history || !AG.core.history.canUndo(S.history)) return;
      S.history = AG.core.history.undo(S.history);
      recompute();
      scheduleDraft();
      app.render();
    };
    app.redo = function () {
      if (!S.history || !AG.core.history.canRedo(S.history)) return;
      S.history = AG.core.history.redo(S.history);
      recompute();
      scheduleDraft();
      app.render();
    };

    // ---- Drafts

    function scheduleDraft() {
      if (!app.storage) return;
      if (draftTimer) clearTimeout(draftTimer);
      draftTimer = setTimeout(writeDraft, DRAFT_DELAY);
    }
    function writeDraft() {
      draftTimer = null;
      if (!app.storage || !S.history) return Promise.resolve();
      if (!app.isDirty()) return app.storage.del("drafts", DRAFT_KEY);
      return app.storage.put("drafts", DRAFT_KEY, { game: S.game, fileName: S.fileName, text: app.serialized(), savedText: S.savedText, time: Date.now() });
    }
    function clearDraft() {
      if (draftTimer) clearTimeout(draftTimer);
      draftTimer = null;
      if (app.storage) app.storage.del("drafts", DRAFT_KEY);
    }
    app.flushDraft = function () {
      if (draftTimer) clearTimeout(draftTimer);
      return writeDraft();
    };

    function offerDraft() {
      return app.storage.get("drafts", DRAFT_KEY).then(function (d) {
        if (!d || !catalogs.games[d.game]) return false;
        var result = AG.core.modfile.read(d.text, catalogs.games);
        if (result.refused) {
          clearDraft();
          return false;
        }
        var when = new Date(d.time || Date.now());
        return dialogs
          .confirm(
            root,
            "Restore unsaved work?",
            "There's unsaved work on " + (d.fileName || "an untitled " + catalogs.games[d.game].title + " mod") + " from " + when.toLocaleString() + ". Restore it? If you don't, it's deleted.",
            "Restore",
            "Delete it",
            "draft"
          )
          .then(function (yes) {
            if (!yes) {
              clearDraft();
              return false;
            }
            var cat = catalogs.games[d.game];
            load(d.game, AG.core.doc.normalize(result.mod, cat), d.fileName || null, null, d.savedText === undefined ? null : d.savedText);
            return true;
          });
      });
    }

    // ---- Selection and navigation

    app.tabs = function () {
      return S.cat ? tree.tabsFor(S.cat) : [];
    };
    app.setTab = function (tab) {
      S.tab = tab;
      app.render();
    };
    app.nodes = function (tab) {
      return tree.mark(tree.build(tab, app.doc(), S.cat), (S.marks && S.marks.items[tab]) || {});
    };
    // The selected item of a tab. Until one is chosen, it's the first item,
    // with its groups opened so it can be seen.
    app.selected = function (tab) {
      tab = tab || S.tab;
      if (S.selection[tab]) return S.selection[tab];
      var nodes = app.nodes(tab);
      var first = tree.firstItem(nodes);
      if (!first) return null;
      S.selection[tab] = first.key;
      var exp = S.expanded[tab] || (S.expanded[tab] = {});
      (tree.groupsOf(nodes, first.key) || []).forEach(function (g) {
        exp[g] = true;
      });
      return first.key;
    };
    app.select = function (tab, key) {
      S.tab = tab;
      S.selection[tab] = key;
      S.cursor[tab] = key;
      var groups = tree.groupsOf(app.nodes(tab), key) || [];
      var exp = S.expanded[tab] || (S.expanded[tab] = {});
      groups.forEach(function (g) {
        exp[g] = true;
      });
      app.render();
    };

    // Shows where a problem is: its tab, item and field.
    app.goTo = function (path) {
      var l = tree.locate(app.doc(), S.cat, path);
      if (!l) return false;
      if (l.tab === "button_sets" && l.button !== null && l.button !== undefined) S.button[l.key] = l.button;
      app.select(l.tab, l.key);
      // The most specific match first: the field, then its button or record.
      var el = null;
      fieldSelector(l).some(function (sel) {
        el = root.querySelector(sel);
        return !!el;
      });
      if (!el) el = root.querySelector(".tabpanel");
      var ctl = el && (el.matches("input, select, textarea, button") ? el : el.querySelector("input, select, textarea, button:not(.help)"));
      if (ctl) ctl.focus();
      else if (el) {
        el.setAttribute("tabindex", "-1");
        el.focus();
      }
      return true;
    };
    function fieldSelector(l) {
      var p = tree.parseKey(l.key);
      if (l.tab === "units" && l.field) return ['[data-field="unit:' + p.id + ":" + l.field + '"]'];
      if (l.tab === "button_sets" && l.button !== null && l.button !== undefined) {
        return ['[data-field="set:' + p.id + ":" + l.button + ":" + (l.field || "") + '"]', '[data-field="set:' + p.id + ":" + l.button + ':"]'];
      }
      if (l.tab === "requirements") {
        var t = [];
        if (l.token !== null && l.token !== undefined) {
          // The row holding the token: the last row starting at or before it.
          var rows = root.querySelectorAll(".tabpanel .req-row[data-token]");
          var best = null;
          Array.prototype.forEach.call(rows, function (r) {
            if (+r.dataset.token <= l.token) best = r;
          });
          if (best) t.push('.req-row[data-row="' + best.dataset.row + '"]');
        }
        return t.concat(['[data-field="req:' + p.type + ":" + p.id + '"]']);
      }
      if (l.tab === "constants") return ['[data-field="const:' + p.name + '"]'];
      return [];
    }

    // ---- Problem list

    app.showProblems = function (intro) {
      var doc = app.doc();
      var dlgClose = null;
      var list = h(
        "ul",
        { class: "problem-list", dataset: { problems: "" } },
        S.problems.length
          ? S.problems.map(function (p) {
              var l = tree.locate(doc, S.cat, p.path);
              var entry = /^(units|button_sets|requirements|constants)\[\d+\]/.exec(p.path || "");
              var action = null;
              if (l) {
                action = AG.ui.fields.withHelp(
                  h("button", { type: "button", class: "small", dataset: { goto: p.path }, onclick: function () {
                    dlgClose(null);
                    app.goTo(p.path);
                  } }, "Go to"),
                  help.text("goToProblem")
                );
              } else if (/^mod\b/.test(p.path || "")) {
                action = h("button", { type: "button", class: "small", dataset: { editInfo: p.path }, onclick: function () {
                  dlgClose(null);
                  app.editInfo();
                } }, "Edit");
              } else if (entry) {
                action = AG.ui.fields.withHelp(
                  h("button", { type: "button", class: "small", dataset: { remove: entry[0] }, onclick: function () {
                    dlgClose(null);
                    app.edit(function (d) {
                      return AG.core.doc.removeEntry(d, entry[0]);
                    });
                    app.showProblems();
                  } }, "Remove entry"),
                  help.text("removeEntry")
                );
              }
              return h("li", { dataset: { path: p.path, severity: p.severity } }, [
                h("span", { class: "sev " + (p.severity === "error" ? "error" : "warning"), text: p.severity === "error" ? "Error" : "Warning" }),
                h("span", { class: "grow" }, [p.message, " ", p.path ? h("span", { class: "path", text: p.path }) : null]),
                action
              ]);
            })
          : [h("li", { text: "This mod has no errors or warnings." })]
      );
      return dialogs.show(root, "Problems", [intro ? h("p", { text: intro }) : null, list], [{ label: "Close", value: "close" }], {
        name: "problems",
        onOpen: function (dlg, close) {
          dlgClose = close;
        }
      });
    };

    app.showReport = function () {
      return AG.ui.report ? AG.ui.report.show(app) : null;
    };

    // ---- Menu

    function menuItem(label, command, shortcut, disabled) {
      return h("button", { type: "button", role: "menuitem", disabled: !!disabled, dataset: { command: command }, onclick: function (e) {
        var d = e.target.closest("details");
        if (d) d.open = false;
        app.command(command);
      } }, [h("span", { text: label }), shortcut ? h("span", { class: "shortcut", text: shortcut }) : null]);
    }

    // A menu of the menu bar. Once one is open, moving the mouse over another
    // menu's title opens that one instead, as in desktop menu bars.
    function menuDetails(name, label, items) {
      var summary = h("summary", { text: label });
      var d = h("details", { dataset: { menu: name } }, [summary, h("div", { class: "menu", role: "menu" }, items)]);
      d.addEventListener("toggle", function () {
        if (d.open) closeMenus(d);
      });
      summary.addEventListener("mouseenter", function () {
        var open = root.querySelector(".menubar details[open]");
        if (open && open !== d) {
          closeMenus(d);
          d.open = true;
          summary.focus({ preventScroll: true });
        }
      });
      return d;
    }

    function closeMenus(except) {
      Array.prototype.forEach.call(root.querySelectorAll(".menubar details[open]"), function (d) {
        if (d !== except) d.open = false;
      });
    }

    function menu() {
      var hasMod = !!S.history;
      var games = Object.keys(catalogs.games).sort();
      return h("nav", { class: "menubar", "aria-label": "Menu" }, [
        menuDetails(
          "file",
          "File",
          games
            .map(function (g) {
              return menuItem("New " + catalogs.games[g].title + " mod", "new:" + g);
            })
            .concat([
              h("hr"),
              menuItem("Open...", "open", "Ctrl+O"),
              menuItem("Save", "save", "Ctrl+S", !hasMod),
              menuItem("Save As...", "saveAs", "Ctrl+Shift+S", !hasMod),
              h("hr"),
              menuItem("Mod information...", "modInfo", null, !hasMod),
              h("hr"),
              menuItem("Import game assets...", "import", null, !hasMod),
              menuItem("Delete imported assets", "deleteAssets", null, !hasMod)
            ])
        ),
        menuDetails("edit", "Edit", [
          menuItem("Undo", "undo", "Ctrl+Z", !hasMod || !AG.core.history.canUndo(S.history)),
          menuItem("Redo", "redo", "Ctrl+Y", !hasMod || !AG.core.history.canRedo(S.history))
        ]),
        menuDetails("view", "View", [
          menuItem("Problems...", "problems", null, !hasMod),
          menuItem("Version compatibility...", "report", null, !hasMod),
          h("hr")
        ].concat(Object.keys(THEMES).map(function (t) {
          var item = menuItem(THEMES[t] + " theme", "theme:" + t);
          item.setAttribute("role", "menuitemradio");
          item.setAttribute("aria-checked", String(S.theme === t));
          return item;
        })))
      ]);
    }

    app.command = function (command) {
      var m = /^new:(.+)$/.exec(command);
      if (m) return app.newMod(m[1]);
      var t = /^theme:(.+)$/.exec(command);
      if (t) return app.setTheme(t[1]);
      switch (command) {
        case "open":
          return app.open();
        case "save":
          return app.save(false);
        case "saveAs":
          return app.save(true);
        case "undo":
          return app.undo();
        case "redo":
          return app.redo();
        case "problems":
          return app.showProblems();
        case "report":
          return app.showReport();
        case "modInfo":
          return app.editInfo();
        case "import":
          return AG.ui.importDialog ? AG.ui.importDialog.show(app) : null;
        case "deleteAssets":
          return AG.ui.importDialog ? AG.ui.importDialog.deleteAssets(app) : null;
      }
      return null;
    };

    // ---- Rendering

    function noticesEl() {
      var list = catalogs.errors.map(function (e) {
        return h("div", { class: "notice error", role: "alert", dataset: { catalogError: e.catalog } }, [
          h("div", { class: "grow" }, [
            h("strong", { text: "The catalog " + e.catalog + " can't be used, so its game isn't offered." }),
            h(
              "ul",
              null,
              e.problems.map(function (p) {
                return h("li", { text: p });
              })
            )
          ])
        ]);
      });
      if (S.cat && S.cat.sample) {
        list.push(
          h("div", { class: "notice", role: "note", dataset: { notice: "sample" } }, [
            h("span", { class: "grow", text: "The " + S.cat.title + " catalog is a sample. It holds only part of the game's data, and mods made with it may not match AxeGraft Patcher." })
          ])
        );
      }
      app.notices.forEach(function (n) {
        list.push(
          h("div", { class: "notice" + (n.kind === "error" ? " error" : ""), role: n.kind === "error" ? "alert" : "status", dataset: { notice: n.id } }, [
            h("div", { class: "grow" }, [n.content]),
            n.dismissible ? h("button", { type: "button", class: "small", onclick: function () {
              app.dismiss(n.id);
            } }, "Dismiss") : null
          ])
        );
      });
      return h("div", { class: "notices" }, list);
    }

    // The button that creates a mod for a game: its shipped logo, or text if
    // there's none or it doesn't load.
    function newModButton(cat) {
      var label = "New " + cat.title + " mod";
      var url = app.assets && app.assets.logoURL ? app.assets.logoURL(cat.game) : null;
      var btn = h("button", { type: "button", dataset: { newMod: cat.game }, onclick: function () {
        app.newMod(cat.game);
      } }, label);
      if (!url) return btn;
      var img = h("img", { src: url, alt: label });
      img.addEventListener("error", function () {
        btn.classList.remove("logo-button");
        btn.removeAttribute("title");
        btn.textContent = label;
      });
      btn.textContent = "";
      btn.classList.add("logo-button");
      btn.title = label;
      btn.appendChild(img);
      return btn;
    }

    function welcome() {
      var games = app.games();
      return h("div", { class: "welcome" }, [
        h("h1", null, [h("img", { class: "logo", src: options.logo || "images/axegraft.png", alt: "AxeGraft" }), h("span", { class: "subtitle", text: "Editor" })]),
        games.length
          ? h("fieldset", { class: "new-mod" }, [h("legend", { text: "New mod" }), infoFields(S.newInfo), h("div", { class: "actions" }, games.map(newModButton))])
          : h("p", { text: "No game catalog could be loaded, so there's nothing to edit." }),
        h("div", { class: "actions" }, [h("button", { type: "button", dataset: { command: "open" }, onclick: function () {
          app.open();
        } }, "Open a mod...")])
      ]);
    }

    function tabMarks(tab) {
      var items = (S.marks && S.marks.items[tab]) || {};
      var m = { changed: false, error: false, warning: false };
      Object.keys(items).forEach(function (k) {
        if (items[k].changed) m.changed = true;
        if (items[k].error) m.error = true;
        if (items[k].warning) m.warning = true;
      });
      return m;
    }

    function markEls(m) {
      var out = [];
      if (m.changed) out.push(h("span", { class: "mark changed", title: "Changed", "aria-label": "changed", text: "•" }));
      if (m.error) out.push(h("span", { class: "mark error", title: "Errors", "aria-label": "errors", text: "!" }));
      if (m.warning) out.push(h("span", { class: "mark warning", title: "Warnings", "aria-label": "warnings", text: "!" }));
      return out.length ? h("span", { class: "marks" }, out) : null;
    }

    // Icons for the item list's toolbar, drawn in the text colour.
    var ICONS = {
      tree: '<circle cx="8" cy="3.5" r="2"/><circle cx="3.5" cy="12.5" r="2"/><circle cx="12.5" cy="12.5" r="2"/><path d="M8 5.5v2.5M3.5 10.5V8h9v2.5" fill="none" stroke="currentColor" stroke-width="1.3"/>',
      list: '<circle cx="8" cy="2.75" r="2"/><circle cx="8" cy="8" r="2"/><circle cx="8" cy="13.25" r="2"/>',
      changes: '<circle cx="8" cy="8" r="3"/>',
      search: '<circle cx="6.5" cy="6.5" r="4.25" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9.7 9.7L14 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
    };
    function icon(name) {
      var span = h("span", { class: "icon", "aria-hidden": "true" });
      span.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">' + ICONS[name] + "</svg>";
      return span;
    }

    // A small button showing only an icon, named by its tooltip. `pressed` is
    // given for toggles. A disabled button stays focusable and keeps its
    // tooltip, which says why it's disabled.
    function iconButton(o) {
      return h("button", {
        type: "button",
        class: "icon-btn",
        title: o.title,
        "aria-label": o.title,
        "aria-pressed": o.pressed === undefined ? null : String(!!o.pressed),
        "aria-disabled": o.disabled ? "true" : null,
        dataset: { focus: o.focus },
        onclick: function () {
          if (!o.disabled) o.onclick();
        }
      }, [o.content || icon(o.icon)]);
    }

    var VIEW_KEY = "axegraft-editor.itemView";
    S.itemView = prefs.get(VIEW_KEY) === "list" ? "list" : "tree";
    app.setItemView = function (v) {
      S.itemView = v === "list" ? "list" : "tree";
      prefs.set(VIEW_KEY, S.itemView);
      app.render();
    };

    function focusIn(sel) {
      var el = root.querySelector(sel);
      if (el) el.focus({ preventScroll: true });
      return el;
    }

    function sidebar() {
      var tab = S.tab;
      var hasErrors = app.errors().length > 0;
      var hasWarnings = app.warnings().length > 0;
      var hasChanges = tabMarks(tab).changed;
      var f = S.filter[tab] || (S.filter[tab] = { changed: false, problem: "" });
      if (!hasChanges) f.changed = false;
      if ((f.problem === "errors" && !hasErrors) || (f.problem === "warnings" && !hasWarnings)) f.problem = "";
      var text = S.search[tab] || "";
      var searchOpen = !!(S.searchOpen[tab] || text);

      function openSearch(initial) {
        S.searchOpen[tab] = true;
        if (initial !== undefined) S.search[tab] = initial;
        app.render();
        var input = focusIn('.sidebar [data-focus="search"]');
        if (input) input.setSelectionRange(input.value.length, input.value.length);
      }
      function closeSearch(focusSel) {
        S.searchOpen[tab] = false;
        S.search[tab] = "";
        app.render();
        focusIn(focusSel);
      }

      var tools = [
        h("span", { class: "tool-group", role: "group", "aria-label": "View" }, [
          iconButton({ icon: "tree", title: "Tree view", pressed: S.itemView === "tree", focus: "view-tree", onclick: function () {
            app.setItemView("tree");
          } }),
          iconButton({ icon: "list", title: "List view", pressed: S.itemView === "list", focus: "view-list", onclick: function () {
            app.setItemView("list");
          } })
        ]),
        iconButton({
          icon: "changes",
          title: hasChanges ? "Show only changes" : "There are no changes to show",
          pressed: f.changed,
          disabled: !hasChanges,
          focus: "only-changes",
          onclick: function () {
            f.changed = !f.changed;
            app.render();
          }
        })
      ];
      // While the mod has problems, the items with them can be picked out.
      [["errors", hasErrors, "error", "Show only errors"], ["warnings", hasWarnings, "warning", "Show only warnings"]].forEach(function (p) {
        if (!p[1]) return;
        tools.push(iconButton({
          content: h("span", { class: "mark " + p[2], "aria-hidden": "true", text: "!" }),
          title: p[3],
          pressed: f.problem === p[0],
          focus: "only-" + p[0],
          onclick: function () {
            f.problem = f.problem === p[0] ? "" : p[0];
            app.render();
          }
        }));
      });
      if (searchOpen) {
        var search = h("input", { type: "search", class: "ctl", placeholder: "Search", value: text, "aria-label": "Search the item list", dataset: { focus: "search" } });
        search.addEventListener("input", function () {
          S.search[tab] = search.value;
          app.render();
        });
        search.addEventListener("keydown", function (e) {
          if (e.key === "Escape") {
            e.preventDefault();
            closeSearch('.sidebar [data-focus="tree"]');
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            focusIn('.sidebar [data-focus="tree"]');
          }
        });
        tools.push(search);
      } else tools.push(h("span", { class: "grow" }));
      tools.push(iconButton({ icon: "search", title: "Search", pressed: searchOpen, focus: "search-toggle", onclick: function () {
        if (searchOpen) closeSearch('.sidebar [data-focus="search-toggle"]');
        else openSearch();
      } }));

      var selected = app.selected(tab);
      var only = [f.changed ? "changed" : null, f.problem || null];
      var nodes = tree.filter(app.nodes(tab), text, only);
      if (S.itemView === "list") nodes = tree.flatten(nodes);
      var treeEl = AG.ui.treeView.render({
        nodes: nodes,
        flat: S.itemView === "list",
        expanded: S.expanded[tab] || {},
        cursor: S.cursor[tab],
        selected: selected,
        idPrefix: "tree-" + tab,
        label: "Items",
        title: "El Grando list of thangs.",
        onSelect: function (k) {
          S.selection[tab] = k;
          S.cursor[tab] = k;
          // Open its groups, so it stays in view once a search is cleared.
          var exp = S.expanded[tab] || (S.expanded[tab] = {});
          (tree.groupsOf(app.nodes(tab), k) || []).forEach(function (g) {
            exp[g] = true;
          });
          app.render();
        },
        onToggle: function (k, open) {
          var exp = S.expanded[tab] || (S.expanded[tab] = {});
          exp[k] = open;
          S.cursor[tab] = k;
          app.render();
        },
        onCursor: function (k) {
          S.cursor[tab] = k;
          app.render();
        },
        onType: function (ch) {
          openSearch(text + ch);
        }
      });
      // The toolbar, item list and tabs explain themselves, so they have
      // no ? button.
      // A tab can add buttons under the list, for adding and removing items.
      var actionsFn = AG.ui.treeActions && AG.ui.treeActions[tab];
      return h("aside", { class: "sidebar", "aria-label": "Item list" }, [
        h("div", { class: "tree-toolbar", role: "toolbar", "aria-label": "Item list" }, tools),
        treeEl,
        actionsFn ? h("div", { class: "tree-actions", role: "toolbar", "aria-label": "Item actions" }, actionsFn(app)) : null
      ]);
    }

    function tabsArea() {
      var tabs = app.tabs();
      var current = S.tab;
      var tablist = h(
        "div",
        { class: "tablist", role: "tablist", "aria-label": "Mod parts" },
        tabs.map(function (t) {
          var selected = t.id === current;
          var b = h("button", {
            type: "button",
            class: "tab",
            role: "tab",
            id: "tab-" + t.id,
            "aria-selected": String(selected),
            "aria-controls": "panel-" + t.id,
            tabindex: selected ? "0" : "-1",
            dataset: { tab: t.id, focus: "tab:" + t.id },
            onclick: function () {
              app.setTab(t.id);
            }
          }, [h("span", { text: t.label }), markEls(tabMarks(t.id))]);
          return b;
        })
      );
      tablist.addEventListener("keydown", function (e) {
        var i = tabs.findIndex(function (t) {
          return t.id === S.tab;
        });
        var next = null;
        if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = tabs.length - 1;
        if (next === null) return;
        e.preventDefault();
        app.setTab(tabs[next].id);
        var b = root.querySelector('[data-tab="' + tabs[next].id + '"]');
        if (b) b.focus();
      });
      var panelFn = AG.ui.panels[current];
      var key = app.selected(current);
      var panel;
      try {
        panel = key ? (panelFn ? panelFn(app, key) : h("p", { class: "empty-panel", text: "This tab can't be edited yet." })) : h("p", { class: "empty-panel", text: "Choose an item from the list." });
      } catch (e) {
        panel = h("p", { class: "notice error", text: "This item can't be shown: " + e.message });
        if (typeof console !== "undefined") console.error(e);
      }
      return h("section", { class: "tabs-area" }, [
        h("div", { class: "tablist-row", style: { display: "flex", "align-items": "end", gap: "6px" } }, [tablist]),
        h("div", { class: "tabpanel", role: "tabpanel", id: "panel-" + current, "aria-labelledby": "tab-" + current, dataset: { panel: current } }, [panel])
      ]);
    }

    function statusBar() {
      if (!S.history) return h("footer", { class: "statusbar" }, [h("span", { class: "file", text: "No mod open" })]);
      var e = app.errors().length;
      var w = app.warnings().length;
      var dirty = app.isDirty();
      return h("footer", { class: "statusbar", "aria-label": "Status" }, [
        h("span", { class: "file", dataset: { status: "file" }, text: (S.fileName || "Untitled mod") + " — " + S.cat.title }),
        h("span", { dataset: { status: "dirty" }, text: dirty ? "Unsaved changes" : "No unsaved changes" }),
        h("span", null, [h("button", { type: "button", class: "link", dataset: { status: "problems" }, onclick: function () {
          app.showProblems();
        } }, e + (e === 1 ? " error, " : " errors, ") + w + (w === 1 ? " warning" : " warnings"))]),
        h("span", null, [h("button", { type: "button", class: "link", dataset: { status: "compat" }, onclick: function () {
          app.showReport();
        } }, AG.core.compat.summary(S.report))])
      ]);
    }

    // The control to focus again after a render: its data-focus, or its
    // field and position within the field.
    function focusKey(el) {
      if (!el || !root.contains(el)) return null;
      var f = el.closest("[data-focus]");
      if (f && f === el) return { focus: f.dataset.focus };
      var field = el.closest("[data-field]");
      if (field) {
        var ctls = Array.prototype.slice.call(field.querySelectorAll("input, select, textarea, button"));
        return { field: field.dataset.field, index: ctls.indexOf(el) };
      }
      if (f) return { focus: f.dataset.focus };
      return null;
    }
    function restoreFocus(k) {
      if (!k) return;
      var el = null;
      if (k.focus) el = root.querySelector('[data-focus="' + k.focus.replace(/"/g, '\\"') + '"]');
      else if (k.field) {
        var field = root.querySelector('[data-field="' + k.field.replace(/"/g, '\\"') + '"]');
        if (field) el = field.querySelectorAll("input, select, textarea, button")[k.index] || null;
      }
      if (el && el !== document.activeElement) el.focus({ preventScroll: true });
    }

    app.render = function () {
      var doc = root.ownerDocument;
      var fk = focusKey(doc.activeElement);
      var scroll = {};
      ["tree", "tabpanel"].forEach(function (c) {
        var el = root.querySelector("." + c);
        if (el) scroll[c] = el.scrollTop;
      });
      // Dialogs live beside the view, so rebuilding the view leaves them open.
      if (!app.view || app.view.parentNode !== root) {
        root.textContent = "";
        app.view = h("div", { class: "view" });
        root.appendChild(app.view);
      }
      var view = h("div", { class: "app", dataset: { game: S.game || "" } }, [
        menu(),
        noticesEl(),
        h("main", { class: "main" }, S.history ? [sidebar(), tabsArea()] : [welcome()]),
        statusBar()
      ]);
      // Keep menus that are open, open.
      var openMenu = app.view.querySelector("details[open]");
      if (openMenu) {
        var again = view.querySelector('details[data-menu="' + openMenu.dataset.menu + '"]');
        if (again) again.open = true;
      }
      app.view.textContent = "";
      app.view.appendChild(view);
      Object.keys(scroll).forEach(function (c) {
        var el = root.querySelector("." + c);
        if (el) el.scrollTop = scroll[c];
      });
      restoreFocus(fk);
      var sel = root.querySelector(".tree [aria-selected=true]");
      if (sel && sel.scrollIntoView && !app._noScroll) sel.scrollIntoView({ block: "nearest" });
    };

    app.games = function () {
      return Object.keys(catalogs.games)
        .sort()
        .map(function (g) {
          return catalogs.games[g];
        });
    };

    // ---- Keyboard shortcuts and closing

    function onKey(e) {
      if (!root.isConnected) {
        root.ownerDocument.removeEventListener("keydown", onKey);
        return;
      }
      var mod = e.ctrlKey || e.metaKey;
      if (!mod || e.altKey) return;
      var k = e.key.toLowerCase();
      if (root.querySelector("dialog[open]")) return;
      if (k === "z" && !e.shiftKey) {
        if (isTextEntry(e.target)) return;
        e.preventDefault();
        app.undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        if (isTextEntry(e.target)) return;
        e.preventDefault();
        app.redo();
      } else if (k === "s") {
        e.preventDefault();
        if (e.target && e.target.blur && isTextEntry(e.target)) e.target.dispatchEvent(new Event("change", { bubbles: true }));
        app.save(e.shiftKey);
      } else if (k === "o") {
        e.preventDefault();
        app.open();
      } else if ((k === "c" || k === "v") && !e.shiftKey) {
        // Copies or pastes the chosen item, or the part of it that has
        // focus or was last clicked, on a tab that offers it. Text being
        // typed or selected is left to the browser.
        var clip = S.cat && AG.ui.clipboard && AG.ui.clipboard[S.tab];
        if (!clip || isTextEntry(e.target)) return;
        var sel = root.ownerDocument.getSelection && root.ownerDocument.getSelection();
        if (k === "c" && sel && !sel.isCollapsed && String(sel).trim()) return;
        var done = k === "c" ? clip.copy(app, clip.areaOf(e.target) || S.clipArea[S.tab]) : clip.paste(app);
        if (done) e.preventDefault();
      }
    }
    root.ownerDocument.addEventListener("keydown", onKey);

    // Where the user last clicked or moved focus, for what Copy acts on
    // once a re-render has taken focus away from it.
    S.clipArea = {};
    function noteArea(e) {
      var clip = AG.ui.clipboard && AG.ui.clipboard[S.tab];
      var area = clip && clip.areaOf(e.target);
      if (area) S.clipArea[S.tab] = area;
    }
    root.addEventListener("pointerdown", noteArea, true);
    root.addEventListener("focusin", noteArea, true);

    // An open menu closes on a click anywhere outside it, and on Escape.
    function onPointerDown(e) {
      if (!root.isConnected) {
        root.ownerDocument.removeEventListener("pointerdown", onPointerDown, true);
        return;
      }
      var open = root.querySelector(".menubar details[open]");
      if (open && !open.contains(e.target)) closeMenus(null);
    }
    root.ownerDocument.addEventListener("pointerdown", onPointerDown, true);

    function onMenuKey(e) {
      if (!root.isConnected) {
        root.ownerDocument.removeEventListener("keydown", onMenuKey);
        return;
      }
      if (e.key !== "Escape") return;
      var open = root.querySelector(".menubar details[open]");
      if (!open) return;
      e.preventDefault();
      open.open = false;
      open.querySelector("summary").focus();
    }
    root.ownerDocument.addEventListener("keydown", onMenuKey);

    function onBeforeUnload(e) {
      if (!root.isConnected) {
        window.removeEventListener("beforeunload", onBeforeUnload);
        return undefined;
      }
      if (app.storage && draftTimer) writeDraft();
      if (app.isDirty()) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
      return undefined;
    }
    if (typeof window !== "undefined") window.addEventListener("beforeunload", onBeforeUnload);
    app.onBeforeUnload = onBeforeUnload;

    // ---- Start

    app.render();
    var storageReady = options.storage ? Promise.resolve(options.storage) : AG.core.storage.open(options.idb);
    app.ready = storageReady
      .then(function (store) {
        app.storage = store;
        function storageNotice() {
          app.notice("storage", "warning", "Browser storage can't be used" + (store.reason ? " (" + store.reason + ")" : "") + ", so drafts and imported assets won't be remembered after this session. Everything else works.", true);
        }
        if (!store.persistent) storageNotice();
        store.onfail = storageNotice;
        app.assets = options.assets || (AG.assets && AG.assets.service ? AG.assets.service(app) : null);
        return app.assets && app.assets.start ? app.assets.start() : null;
      })
      .then(function () {
        // The assets can change the start screen, such as its logos.
        app.render();
        return offerDraft();
      })
      .catch(function (e) {
        if (typeof console !== "undefined") console.error(e);
      })
      .then(function () {
        return app;
      });
    return app;
  }

  // Settings kept in localStorage. It can be missing or throw, as in a
  // private window or with site data blocked; then nothing is remembered.
  function localPrefs() {
    return {
      get: function (key) {
        try {
          return window.localStorage.getItem(key);
        } catch (e) {
          return null;
        }
      },
      set: function (key, value) {
        try {
          window.localStorage.setItem(key, value);
        } catch (e) {
          // Not remembered.
        }
      }
    };
  }

  AG.ui.createApp = createApp;
  AG.ui.start = function (root) {
    // Kept for people inspecting the editor from the browser's console.
    AG.ui.current = createApp(root, { catalogs: AG.core.catalog.loadRegistered(), page: true });
    return AG.ui.current;
  };
})(AxeGraft);
