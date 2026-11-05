// What the editor needs from the browser to open and save files, in one
// place, so tests can replace it.
"use strict";

(function (AG) {
  // Asks the user for files. Resolves with an array of File objects, which
  // is empty if they cancel.
  function pickFiles(options) {
    options = options || {};
    return new Promise(function (resolve) {
      var input = document.createElement("input");
      input.type = "file";
      if (options.accept) input.accept = options.accept;
      if (options.multiple) input.multiple = true;
      if (options.directory) {
        input.webkitdirectory = true;
        input.setAttribute("webkitdirectory", "");
      }
      input.style.display = "none";
      var settled = false;
      function finish(files) {
        if (settled) return;
        settled = true;
        if (input.parentNode) input.parentNode.removeChild(input);
        resolve(files);
      }
      input.addEventListener("change", function () {
        finish(Array.prototype.slice.call(input.files || []));
      });
      input.addEventListener("cancel", function () {
        finish([]);
      });
      document.body.appendChild(input);
      input.click();
    });
  }

  // Offers `text` as a download called `name`. Always available.
  function download(name, text) {
    var blob = new Blob([text], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 1000);
    return Promise.resolve({ name: name, handle: null });
  }

  // Saving straight to a file, where the browser can. Optional.
  var canSaveDirectly = typeof window !== "undefined" && typeof window.showSaveFilePicker === "function";

  function writeHandle(handle, text) {
    return handle.createWritable().then(function (w) {
      return w.write(text).then(function () {
        return w.close();
      });
    });
  }

  // Asks where to save, and writes the file. Resolves with { name, handle },
  // or null if the user cancels.
  function saveAs(name, text) {
    if (!canSaveDirectly) return download(name, text);
    return window
      .showSaveFilePicker({ suggestedName: name, types: [{ description: "AxeGraft mod", accept: { "application/json": [".json"] } }] })
      .then(function (handle) {
        return writeHandle(handle, text).then(function () {
          return { name: handle.name, handle: handle };
        });
      })
      .catch(function (e) {
        if (e && e.name === "AbortError") return null;
        // The picker failed for another reason: fall back to a download.
        return download(name, text);
      });
  }

  // Saves to the file last opened or saved, if the browser allows that.
  function save(handle, name, text) {
    if (handle && typeof handle.createWritable === "function") {
      return writeHandle(handle, text).then(
        function () {
          return { name: name, handle: handle };
        },
        function () {
          return saveAs(name, text);
        }
      );
    }
    return saveAs(name, text);
  }

  // Opens a mod. Uses the file picker that gives a handle where available,
  // so Save can write back to the file.
  function openMod() {
    if (typeof window !== "undefined" && typeof window.showOpenFilePicker === "function") {
      return window
        .showOpenFilePicker({ types: [{ description: "AxeGraft mod", accept: { "application/json": [".json"] } }] })
        .then(function (handles) {
          return handles[0].getFile().then(function (file) {
            return { file: file, handle: handles[0] };
          });
        })
        .catch(function (e) {
          if (e && e.name === "AbortError") return null;
          return pickFiles({ accept: ".json,application/json" }).then(function (files) {
            return files[0] ? { file: files[0], handle: null } : null;
          });
        });
    }
    return pickFiles({ accept: ".json,application/json" }).then(function (files) {
      return files[0] ? { file: files[0], handle: null } : null;
    });
  }

  AG.ui.platform = {
    pickFiles: pickFiles,
    download: download,
    save: save,
    saveAs: saveAs,
    openMod: openMod,
    canSaveDirectly: canSaveDirectly
  };
})(AxeGraft);
