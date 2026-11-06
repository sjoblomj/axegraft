// Helpers for tests of the real UI.
"use strict";

(function (AG) {
  var T = AG.testing;

  function catalogs(which) {
    if (which === "samples") return AG.core.catalog.load(AG.core.catalog.registry.registered);
    return {
      games: { starcraft: T.catalog("starcraft"), warcraft2: T.catalog("warcraft2") },
      errors: []
    };
  }

  // A fake platform that records saves and serves files to open.
  function platform() {
    var p = {
      saved: [],
      toOpen: null,
      canSaveDirectly: false,
      saveAs: function (name, text) {
        p.saved.push({ name: name, text: text, how: "download" });
        return Promise.resolve({ name: name, handle: null });
      },
      save: function (handle, name, text) {
        p.saved.push({ name: name, text: text, how: handle ? "direct" : "download" });
        return Promise.resolve({ name: name, handle: handle });
      },
      openMod: function () {
        return Promise.resolve(this.toOpen);
      }
    };
    return p;
  }

  function file(name, text) {
    var bytes = typeof text === "string" ? new TextEncoder().encode(text) : text;
    return {
      name: name,
      size: bytes.length,
      arrayBuffer: function () {
        return Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
      }
    };
  }

  // Settings that last only for one test, so tests don't change the
  // theme of the editor opened in the same browser.
  function memoryPrefs(values) {
    var v = Object.assign({}, values || {});
    return {
      values: v,
      get: function (k) {
        return Object.prototype.hasOwnProperty.call(v, k) ? v[k] : null;
      },
      set: function (k, x) {
        v[k] = x;
      }
    };
  }

  // Starts an editor in the test sandbox. Resolves once it has started.
  function start(ctx, options) {
    options = options || {};
    var root = ctx.sandbox();
    var app = AG.ui.createApp(root, {
      catalogs: options.catalogs || catalogs(options.which),
      storage: options.storage || AG.core.storage.memory(),
      idb: options.idb,
      platform: options.platform || platform(),
      assets: options.assets,
      prefs: options.prefs || memoryPrefs()
    });
    app.testPlatform = app.platform;
    return app.ready.then(function () {
      return app;
    });
  }

  function wait(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms || 0);
    });
  }

  function key(el, k, opts) {
    var e = new KeyboardEvent("keydown", Object.assign({ key: k, bubbles: true, cancelable: true }, opts || {}));
    el.dispatchEvent(e);
    return e;
  }

  // Sets a control's value and fires change, as a user would.
  function change(el, value) {
    if (el.tagName === "SELECT") {
      var idx = Array.prototype.findIndex.call(el.options, function (o) {
        return o.textContent === value || o.value === value;
      });
      if (idx < 0) throw new Error("no option " + value + " in " + Array.prototype.map.call(el.options, function (o) {
        return o.textContent;
      }).join(" | "));
      el.selectedIndex = idx;
    } else if (el.type === "checkbox") el.checked = value;
    else el.value = value;
    el.dispatchEvent(new Event(el.tagName === "INPUT" && el.type === "search" ? "input" : "change", { bubbles: true }));
  }

  function q(app, sel) {
    var el = app.root.querySelector(sel);
    if (!el) throw new Error("nothing matches " + sel);
    return el;
  }

  function texts(app, sel) {
    return Array.prototype.map.call(app.root.querySelectorAll(sel), function (e) {
      return e.textContent.trim();
    });
  }

  // Waits for a dialog and answers it with the button whose value is given.
  function answer(app, name, value) {
    return wait(0).then(function () {
      var b = app.root.querySelector('dialog[data-dialog="' + name + '"] [data-value="' + value + '"]');
      if (!b) throw new Error("no " + name + " dialog with " + value);
      b.click();
      return wait(0);
    });
  }

  T.ui = { catalogs: catalogs, platform: platform, memoryPrefs: memoryPrefs, file: file, start: start, wait: wait, key: key, change: change, q: q, texts: texts, answer: answer };
})(AxeGraft);
