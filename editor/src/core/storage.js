// Browser storage for drafts and imported assets.
//
// IndexedDB, because localStorage is too small for icons. If IndexedDB can't
// be used, as in some private windows or with storage blocked, everything is
// kept in memory for the session instead, and `persistent` is false so the
// editor can say that nothing will be remembered.
"use strict";

(function (AG) {
  var DB_NAME = "axegraft-editor";
  var DB_VERSION = 1;
  var STORES = ["drafts", "assets"];

  function memoryStore(reason) {
    var data = {};
    STORES.forEach(function (s) {
      data[s] = new Map();
    });
    function bucket(s) {
      if (!data[s]) throw new Error("unknown store " + s);
      return data[s];
    }
    return {
      persistent: false,
      reason: reason || null,
      get: function (s, key) {
        return Promise.resolve(bucket(s).has(key) ? bucket(s).get(key) : undefined);
      },
      put: function (s, key, value) {
        bucket(s).set(key, value);
        return Promise.resolve();
      },
      del: function (s, key) {
        bucket(s)["delete"](key);
        return Promise.resolve();
      },
      keys: function (s) {
        return Promise.resolve(Array.from(bucket(s).keys()));
      }
    };
  }

  function request(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error || new Error("storage request failed"));
      };
    });
  }

  function idbStore(db, fallback) {
    // Once a request fails, the rest of the session uses memory.
    var failed = null;
    function run(s, mode, fn) {
      if (failed) return fn(failed);
      return new Promise(function (resolve, reject) {
        var tx;
        try {
          tx = db.transaction(s, mode);
        } catch (e) {
          reject(e);
          return;
        }
        request(fn(null, tx.objectStore(s))).then(resolve, reject);
      }).catch(function (e) {
        failed = fallback;
        store.persistent = false;
        store.reason = (e && e.message) || "storage failed";
        if (store.onfail) store.onfail(store.reason);
        return fn(failed);
      });
    }
    var store = {
      persistent: true,
      reason: null,
      onfail: null,
      get: function (s, key) {
        return run(s, "readonly", function (mem, os) {
          return mem ? mem.get(s, key) : os.get(key);
        });
      },
      put: function (s, key, value) {
        return run(s, "readwrite", function (mem, os) {
          return mem ? mem.put(s, key, value) : os.put(value, key);
        }).then(function () {});
      },
      del: function (s, key) {
        return run(s, "readwrite", function (mem, os) {
          return mem ? mem.del(s, key) : os["delete"](key);
        }).then(function () {});
      },
      keys: function (s) {
        return run(s, "readonly", function (mem, os) {
          return mem ? mem.keys(s) : os.getAllKeys();
        });
      }
    };
    return store;
  }

  // Opens storage. `idb` is the IndexedDB factory to use, normally the
  // browser's. Always resolves, with memory storage if IndexedDB fails.
  function open(idb) {
    if (idb === undefined) idb = typeof indexedDB !== "undefined" ? indexedDB : null;
    if (!idb) return Promise.resolve(memoryStore("this browser has no IndexedDB"));
    return new Promise(function (resolve) {
      var settled = false;
      function fallBack(why) {
        if (settled) return;
        settled = true;
        resolve(memoryStore(why));
      }
      var timer = setTimeout(function () {
        fallBack("storage didn't respond");
      }, 3000);
      try {
        var req = idb.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function () {
          var db = req.result;
          STORES.forEach(function (s) {
            if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
          });
        };
        req.onsuccess = function () {
          clearTimeout(timer);
          if (settled) return;
          settled = true;
          resolve(idbStore(req.result, memoryStore()));
        };
        req.onerror = function () {
          clearTimeout(timer);
          fallBack((req.error && req.error.message) || "storage can't be opened");
        };
        req.onblocked = function () {
          clearTimeout(timer);
          fallBack("storage is blocked");
        };
      } catch (e) {
        clearTimeout(timer);
        fallBack((e && e.message) || "storage can't be used");
      }
    });
  }

  AG.core.storage = {
    open: open,
    memory: memoryStore,
    DB_NAME: DB_NAME
  };
})(AxeGraft);
