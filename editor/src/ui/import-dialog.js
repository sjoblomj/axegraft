// Importing icons and strings from the user's game files, deleting them
// again, and choosing an icon by sight.
"use strict";

(function (AG) {
  var h = AG.ui.h;
  var help = AG.ui.help;
  var F = AG.ui.fields;

  function describeSource(app) {
    var game = app.state.game;
    var im = app.assets && app.assets.imported(game);
    if (im) {
      var parts = [];
      if (im.icons) parts.push(im.icons.images.length + " icons");
      if (im.strings) parts.push(im.strings.length + " strings");
      return "Using " + parts.join(" and ") + " imported from " + im.source + " on " + new Date(im.time).toLocaleString() + ".";
    }
    var sh = app.assets && app.assets.shipped(game);
    if (sh && (sh.icons || sh.strings)) return "Using the icons and strings shipped with the editor.";
    return "No icons or strings are loaded, so the editor shows names and IDs.";
  }

  function show(app) {
    var cat = app.cat();
    var game = app.state.game;
    var spec = cat.assets;
    var status = h("p", { dataset: { importStatus: "" }, text: describeSource(app) });
    var progress = h("progress", { max: "1", value: "0", hidden: true });
    var message = h("p", { dataset: { importMessage: "" }, role: "status" });
    var busy = false;
    var close = null;

    function run(files) {
      if (!files || !files.length || busy) return Promise.resolve(null);
      busy = true;
      progress.hidden = false;
      progress.value = 0;
      message.textContent = "Reading...";
      message.className = "";
      return app.assets
        .importFiles(game, cat, files, function (p) {
          progress.max = p.total;
          progress.value = p.done;
          message.textContent = p.text;
        })
        .then(
          function (r) {
            var parts = [];
            if (r.icons) parts.push(r.icons.images.length + " icons");
            if (r.strings) parts.push(r.strings.length + " strings");
            message.textContent = "Imported " + parts.join(" and ") + " from " + r.source + ".";
            status.textContent = describeSource(app);
            app.dismiss("import-failed");
            app.recompute();
            return r;
          },
          function (e) {
            var text = "Importing failed. " + (e && e.message ? e.message : String(e)) + " Any assets imported before are kept.";
            message.textContent = text;
            message.className = "problem error";
            app.notice("import-failed", "error", text, true);
            return null;
          }
        )
        .then(function (r) {
          busy = false;
          progress.hidden = true;
          return r;
        });
    }

    var folderBtn = h("button", { type: "button", dataset: { action: "import-folder" }, onclick: function () {
      app.platform.pickFiles({ directory: true }).then(run);
    } }, "Choose game folder...");
    var filesBtn = h("button", { type: "button", dataset: { action: "import-files" }, onclick: function () {
      app.platform.pickFiles({ multiple: true, accept: ".mpq,.tbl" }).then(run);
    } }, "Choose files...");
    var deleteBtn = h("button", { type: "button", dataset: { action: "delete-assets" }, onclick: function () {
      deleteAssets(app).then(function () {
        status.textContent = describeSource(app);
        message.textContent = "The imported assets were deleted.";
      });
    } }, "Delete imported assets");

    var tblName = spec && spec.strings ? spec.strings.file.split("\\").pop() : "stat_txt.tbl";
    var body = [
      h("p", { text: "Choose your " + cat.title + " folder, or its archive files (" + (spec ? spec.archives.join(", ") : "none") + "), or a " + tblName + " on its own. A " + tblName + " chosen with the archive files is used in place of their strings. The files are only read, never changed, and nothing leaves this computer." }),
      status,
      h("div", { class: "toolbar" }, [F.withHelp(folderBtn, help.text("importFolder")), F.withHelp(filesBtn, help.text("importFiles")), F.withHelp(deleteBtn, "Deletes the icons and strings imported for this game. The editor then uses the shipped ones, if there are any, or names and IDs.")]),
      progress,
      message
    ];
    var shown = AG.ui.dialogs.show(app.root, "Import game assets", body, [{ label: "Close", value: "close" }], {
      name: "import",
      onOpen: function (dlg, c) {
        close = c;
      }
    });
    shown.run = run;
    return shown;
  }

  function deleteAssets(app) {
    if (!app.assets) return Promise.resolve();
    return app.assets.deleteImported(app.state.game).then(function () {
      app.recompute();
    });
  }

  // A grid of every icon, to choose one by sight.
  function pick(app, value, onChoose) {
    var game = app.state.game;
    var count = app.assets.iconCount(game);
    var close = null;
    var grid = h(
      "div",
      { class: "icon-picker", role: "listbox", "aria-label": "Icons" },
      Array.from({ length: count }, function (_, id) {
        var name = app.cat().icons[id];
        return h("button", { type: "button", "aria-pressed": String(id === value), title: id + (name ? " " + name : ""), dataset: { icon: id }, onclick: function () {
          close(null);
          onChoose(id);
        } }, [AG.ui.buttonSets.iconEl(app, id)]);
      })
    );
    return AG.ui.dialogs.show(app.root, "Choose an icon", [grid], [{ label: "Cancel", value: "cancel" }], {
      name: "icons",
      onOpen: function (dlg, c) {
        close = c;
        var cur = dlg.querySelector('[aria-pressed="true"]');
        if (cur) cur.focus();
      }
    });
  }

  AG.ui.importDialog = { show: show, deleteAssets: deleteAssets, describeSource: describeSource };
  AG.ui.iconPicker = { show: pick };
})(AxeGraft);
