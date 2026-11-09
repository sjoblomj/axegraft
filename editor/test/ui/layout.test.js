// The main layout: menu, tabs per game, the sample notice and the status bar.
"use strict";

(function (AG) {
  var T = AG.testing;
  var U = T.ui;

  function tabs(app) {
    return U.texts(app, '[role="tab"]');
  }

  T.test("main layout: a StarCraft mod has the Units, Button Sets, Requirements and Constants tabs", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        T.equal(tabs(app), ["Units", "Button Sets", "Requirements", "Constants"]);
        T.ok(app.root.querySelector(".menubar") && app.root.querySelector(".sidebar .tree") && app.root.querySelector(".statusbar"));
        T.equal(U.texts(app, ".menubar summary"), ["File", "Edit", "View", "Help"]);
      });
    });
  }, { dom: true });

  T.test("main layout: a Warcraft II mod has the Units, Button Sets and Constants tabs", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("warcraft2").then(function () {
        T.equal(tabs(app), ["Units", "Button Sets", "Constants"]);
      });
    });
  }, { dom: true });

  T.test("main layout: switching to a game without the current tab picks its first tab", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        app.setTab("requirements");
        return app.newMod("warcraft2");
      }).then(function () {
        T.equal(app.state.tab, "units");
      });
    });
  }, { dom: true });

  T.test("editing with a sample: a notice says the catalog is a sample, for as long as it's used", function (ctx) {
    return U.start(ctx).then(function (app) {
      T.ok(!app.root.querySelector('[data-notice="sample"]'), "no notice before editing");
      return app.newMod("starcraft").then(function () {
        var n = U.q(app, '[data-notice="sample"]');
        T.ok(/catalog is a sample/.test(n.textContent) && /may not match AxeGraft Patcher/.test(n.textContent), n.textContent);
        T.ok(!n.querySelector("button"), "it can't be dismissed");
        app.setTab("constants");
        app.edit(function (d) {
          return AG.core.doc.setConstant(d, app.cat(), "max_supply", 600);
        });
        T.ok(app.root.querySelector('[data-notice="sample"]'), "still shown after other actions");
      });
    });
  }, { dom: true });

  T.test("editing with a complete catalog: no sample notice", function (ctx) {
    var raw = T.rawCatalog("warcraft2");
    raw.sample = false;
    raw.units = [];
    raw.buttonSets = [];
    for (var i = 0; i <= 119; i++) raw.units.push({ id: i, name: "Entry " + i, tree: ["All"], original: i < 110 ? { button_set: null, icon: 0, stats_frame: 1, name_string: 0, status_changed: "w2_stats_changed_unit", display_function: "w2_stats_update_unit" } : { button_set: null } });
    var cats = AG.core.catalog.load([{ raw: raw, source: "full.js" }]);
    T.equal(cats.errors, []);
    return U.start(ctx, { catalogs: cats }).then(function (app) {
      return app.newMod("warcraft2").then(function () {
        T.ok(!app.root.querySelector('[data-notice="sample"]'));
      });
    });
  }, { dom: true });

  T.test("status bar: says when the mod has unsaved changes", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        T.equal(U.q(app, '[data-status="dirty"]').textContent, "No unsaved changes");
        T.ok(/Untitled mod/.test(U.q(app, '[data-status="file"]').textContent));
        app.edit(function (d) {
          return AG.core.doc.setUnitField(d, app.cat(), 0, "button_set", 5);
        });
        T.equal(U.q(app, '[data-status="dirty"]').textContent, "Unsaved changes");
        T.equal(U.q(app, '[data-status="problems"]').textContent, "0 errors, 0 warnings");
        app.edit(function (d) {
          return AG.core.doc.setUnitField(d, app.cat(), 0, "button_set", 999);
        });
        T.equal(U.q(app, '[data-status="problems"]').textContent, "1 error, 0 warnings");
        app.edit(function (d) {
          return AG.core.doc.setUnitField(d, app.cat(), 0, "button_set", 232);
        });
        T.equal(U.q(app, '[data-status="compat"]').textContent, "2 apply, 1 reject");
        app.undo();
        app.undo();
        T.equal(U.q(app, '[data-status="dirty"]').textContent, "Unsaved changes");
        app.undo();
        T.equal(U.q(app, '[data-status="dirty"]').textContent, "No unsaved changes", "undone back to the saved state");
      });
    });
  }, { dom: true });
  T.test("menu bar: with a menu open, moving the mouse to another menu opens it and closes the first", function (ctx) {
    return U.start(ctx).then(function (app) {
      var file = U.q(app, '.menubar details[data-menu="file"]');
      var edit = U.q(app, '.menubar details[data-menu="edit"]');
      edit.querySelector("summary").dispatchEvent(new Event("mouseenter"));
      T.ok(!edit.open, "hovering opens nothing while every menu is closed");
      file.open = true;
      edit.querySelector("summary").dispatchEvent(new Event("mouseenter"));
      T.ok(edit.open && !file.open, "the menu follows the mouse");
    });
  }, { dom: true });

  T.test("menu bar: a click outside the open menu, or Escape, closes it", function (ctx) {
    return U.start(ctx).then(function (app) {
      var file = U.q(app, '.menubar details[data-menu="file"]');
      file.open = true;
      file.querySelector(".menu").dispatchEvent(new Event("pointerdown", { bubbles: true }));
      T.ok(file.open, "a click inside the menu leaves it open");
      U.q(app, ".statusbar").dispatchEvent(new Event("pointerdown", { bubbles: true }));
      T.ok(!file.open, "a click outside closes it");
      file.open = true;
      U.key(file.querySelector("summary"), "Escape");
      T.ok(!file.open, "Escape closes it");
    });
  }, { dom: true });

  T.test("help: the text stays inside the window and isn't clipped by the panel", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        app.select("units", "unit:0");
        var helps = app.root.querySelectorAll(".tabpanel .help");
        T.ok(helps.length > 0);
        // The ? buttons nearest the window's right edge and bottom.
        var right = helps[0], low = helps[0];
        Array.prototype.forEach.call(helps, function (b) {
          if (b.getBoundingClientRect().right > right.getBoundingClientRect().right) right = b;
          if (b.getBoundingClientRect().bottom > low.getBoundingClientRect().bottom) low = b;
        });
        [right, low].forEach(function (b) {
          b.dispatchEvent(new Event("mouseenter"));
          var tip = b.querySelector(".tip");
          var r = tip.getBoundingClientRect();
          T.equal(getComputedStyle(tip).position, "fixed", "placed in window coordinates");
          T.ok(r.left >= 0 && r.top >= 0, "not off the left or top: " + r.left + "," + r.top);
          T.ok(r.right <= document.documentElement.clientWidth && r.bottom <= document.documentElement.clientHeight, "not off the right or bottom: " + r.right + "," + r.bottom);
          b.dispatchEvent(new Event("mouseleave"));
        });
      });
    });
  }, { dom: true });
  T.test("start screen: Open a mod has an icon and its own row, above the guide and About", function (ctx) {
    return U.start(ctx).then(function (app) {
      var open = U.q(app, '.welcome [data-command="open"]');
      T.ok(open.querySelector("svg"), "has an icon");
      T.equal(open.parentNode.querySelectorAll("button").length, 1, "alone in its row");
      var below = U.q(app, '.welcome [data-command="guide"]').parentNode;
      T.equal(below, U.q(app, '.welcome [data-command="about"]').parentNode, "the guide and About share a row");
      T.equal(below.previousElementSibling, open.parentNode, "that row is directly beneath");
    });
  }, { dom: true });

  function checkAbout(app) {
    var dlg = U.q(app, 'dialog[data-dialog="about"]');
    T.equal(dlg.querySelector("img.logo").getAttribute("src"), "../images/axegraft.png");
    T.ok(/Made by Ojan \(Johan Sjöblom\)/.test(dlg.textContent), "names the author");
    var thanks = U.texts(app, 'dialog[data-dialog="about"] .thanks li');
    T.equal(thanks.length, 7);
    T.equal(thanks[0], "Mordraug (Peter Hatch) for WarCraft II offsets");
    T.equal(thanks[6], "The community");
    var body = dlg.querySelector(".body");
    var link = body.lastElementChild;
    T.equal(link.getAttribute("href"), "https://jorsys.org");
    T.equal(link.target, "_blank");
    T.equal(link.querySelector("img").getAttribute("src"), "../images/jorsys.png");
    return U.answer(app, "about", "close").then(function () {
      T.ok(!app.root.querySelector('dialog[data-dialog="about"]'), "closes");
    });
  }

  T.test("about: the start screen's button shows the About dialog", function (ctx) {
    return U.start(ctx).then(function (app) {
      U.q(app, '.welcome [data-command="about"]').click();
      return checkAbout(app);
    });
  }, { dom: true });

  T.test("about: the Help menu shows the About dialog while a mod is open", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        var menu = U.q(app, '.menubar details[data-menu="help"]');
        menu.open = true;
        U.q(app, '.menubar [data-command="about"]').click();
        T.ok(!U.q(app, '.menubar details[data-menu="help"]').open, "the menu closes");
        return checkAbout(app);
      });
    });
  }, { dom: true });

  function checkGuide(app) {
    var dlg = U.q(app, 'dialog[data-dialog="guide"]');
    T.equal(dlg.querySelector(".title").textContent, "Making a mod with AxeGraft");
    T.ok(dlg.querySelectorAll(".body h2").length > 0, "has sections");
    T.ok(dlg.querySelectorAll(".body table").length > 0, "has tables");
    T.equal(document.activeElement, dlg.querySelector(".body"), "the text has the focus, so the keyboard scrolls it");
    return U.answer(app, "guide", "close").then(function () {
      T.ok(!app.root.querySelector('dialog[data-dialog="guide"]'), "closes");
    });
  }

  T.test("guide: the start screen's button shows the guide", function (ctx) {
    return U.start(ctx).then(function (app) {
      U.q(app, '.welcome [data-command="guide"]').click();
      return checkGuide(app);
    });
  }, { dom: true });

  T.test("guide: the Help menu shows the guide while a mod is open", function (ctx) {
    return U.start(ctx).then(function (app) {
      return app.newMod("starcraft").then(function () {
        U.q(app, '.menubar details[data-menu="help"]').open = true;
        U.q(app, '.menubar [data-command="guide"]').click();
        T.ok(!U.q(app, '.menubar details[data-menu="help"]').open, "the menu closes");
        return checkGuide(app);
      });
    });
  }, { dom: true });

  T.test("guide: Markdown becomes headings, nested lists, tables and inline styles", function () {
    var box = document.createElement("div");
    AG.ui.guide.render([
      "# Title",
      "",
      "## Section",
      "",
      "Some **bold** and `code` and a [link](page.html).",
      "",
      "1. One",
      "2. Two",
      "   - Nested",
      "   - More",
      "3. Three",
      "",
      "| A | B |",
      "| --- | --- |",
      "| **c** | d |"
    ]).forEach(function (el) {
      box.appendChild(el);
    });
    T.equal(box.querySelector("h1"), null, "the title is left to the dialog");
    T.equal(box.querySelector("h2").textContent, "Section");
    T.equal(box.querySelector("p strong").textContent, "bold");
    T.equal(box.querySelector("p code").textContent, "code");
    var a = box.querySelector("p a");
    T.equal(a.textContent, "link");
    T.equal(a.target, "_blank");
    T.equal(box.querySelectorAll("ol > li").length, 3);
    T.equal(box.querySelectorAll("ol > li:nth-child(2) > ul > li").length, 2);
    T.equal(box.querySelectorAll("th").length, 2);
    T.equal(box.querySelectorAll("td").length, 2);
    T.equal(box.querySelector("td strong").textContent, "c");
  }, { dom: true });

  T.test("guide: the text in the editor is the same as docs/making-a-mod.md", function (ctx) {
    if (!ctx.sourceTree.guideMarkdown) T.notChecked("only the command-line runner can read outside the editor's folder");
    var markdown = ctx.sourceTree.guideMarkdown().trimEnd().replace(/\r\n/g, "\n");
    return ctx.sourceTree.read("src/ui/guide-text.js").then(function (script) {
      var lines = JSON.parse(script.slice(script.indexOf("["), script.lastIndexOf("]") + 1));
      T.ok(lines.join("\n") === markdown, "differs; run node tools/build-guide.js");
    });
  }, { sourceTree: true });

  T.test("theme: dark is the default, and choosing Classic from the View menu switches and is remembered", function (ctx) {
    var prefs = U.memoryPrefs();
    return U.start(ctx, { prefs: prefs }).then(function (app) {
      T.equal(app.root.dataset.theme, "dark");
      var classic = U.q(app, '.menubar [data-command="theme:classic"]');
      T.equal(U.q(app, '.menubar [data-command="theme:dark"]').getAttribute("aria-checked"), "true");
      T.equal(classic.getAttribute("aria-checked"), "false");
      U.q(app, '.menubar details[data-menu="view"]').open = true;
      classic.click();
      T.equal(app.root.dataset.theme, "classic");
      T.equal(U.q(app, '.menubar [data-command="theme:classic"]').getAttribute("aria-checked"), "true");
      T.ok(!U.q(app, '.menubar details[data-menu="view"]').open, "the menu closes");
      T.equal(prefs.values["axegraft-editor.theme"], "classic");
      T.ok(getComputedStyle(U.q(app, ".app")).backgroundColor !== "", "styled");
    });
  }, { dom: true });

  T.test("theme: a remembered choice is used at start, and an unknown one falls back to dark", function (ctx) {
    return U.start(ctx, { prefs: U.memoryPrefs({ "axegraft-editor.theme": "classic" }) }).then(function (app) {
      T.equal(app.root.dataset.theme, "classic");
      return U.start(ctx, { prefs: U.memoryPrefs({ "axegraft-editor.theme": "neon" }) });
    }).then(function (app) {
      T.equal(app.root.dataset.theme, "dark");
    });
  }, { dom: true });

  T.test("theme: the two themes look different", function (ctx) {
    return U.start(ctx).then(function (app) {
      var looks = function () {
        return getComputedStyle(U.q(app, ".menubar")).backgroundColor + "/" + getComputedStyle(U.q(app, ".app")).color;
      };
      var dark = looks();
      app.setTheme("classic");
      T.ok(looks() !== dark, dark + " vs " + looks());
    });
  }, { dom: true });
})(AxeGraft);
