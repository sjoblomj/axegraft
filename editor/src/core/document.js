// The mod document: the parsed JSON of the mod, never changed in place.
//
// Every edit returns a new document that shares unchanged parts with the
// old one, which makes undo a list of earlier documents. There's no second
// model: the document is what's saved. An entry that matches its original on
// every version is removed, so a mod never holds an entry that changes nothing.
"use strict";

(function (AG) {
  var util = AG.util;
  var isObject = util.isObject;
  var isInt = util.isInt;

  // The mod's name, version and authors. They're informational only, and
  // every saved mod has them, empty if not given.
  var INFO = ["mod_name", "mod_version", "mod_authors"];

  function create(game, info) {
    return withInfo({ patcher: "AxeGraft", format: 1, game: game }, info || {});
  }

  // The information of a mod, with missing values as empty ones.
  function info(doc) {
    return {
      mod_name: util.has(doc, "mod_name") ? doc.mod_name : "",
      mod_version: util.has(doc, "mod_version") ? doc.mod_version : "",
      mod_authors: util.has(doc, "mod_authors") ? doc.mod_authors : []
    };
  }

  // A copy of the document with the information in `values` set, and any
  // missing information added empty.
  function withInfo(doc, values) {
    var current = info(doc);
    var out = {};
    Object.keys(doc).forEach(function (k) {
      out[k] = doc[k];
    });
    INFO.forEach(function (k) {
      out[k] = util.has(values, k) ? values[k] : current[k];
    });
    return util.equal(out, doc) && Object.keys(out).length === Object.keys(doc).length ? doc : out;
  }

  // Authors typed separated by commas, as a list.
  function parseAuthors(text) {
    return String(text)
      .split(",")
      .map(function (a) {
        return a.trim();
      })
      .filter(function (a) {
        return a !== "";
      });
  }

  function entries(doc, part) {
    return Array.isArray(doc[part]) ? doc[part] : [];
  }

  // A copy of the document with one part replaced. An empty part is removed.
  function withPart(doc, part, list) {
    var out = {};
    Object.keys(doc).forEach(function (k) {
      if (k !== part) out[k] = doc[k];
    });
    if (list.length) out[part] = list;
    return out;
  }

  // ---- Names, for labels

  function itemName(cat, kind, id) {
    var m = { unit: cat.units, set: cat.sets, upgrade: cat.upgrades, tech: cat.techs, order: cat.orders }[kind];
    var item = m && m.get(id);
    return item ? item.name : null;
  }

  function requirementName(cat, type, id) {
    var kind = { unit: "unit", upgrade: "upgrade", tech_research: "tech", tech_use: "tech", order: "order" }[type];
    return kind ? itemName(cat, kind, id) : null;
  }

  function withLabel(entry, label) {
    if (!label) return entry;
    var out = {};
    Object.keys(entry).forEach(function (k, i) {
      out[k] = entry[k];
      if (i === 0) out.label = label;
    });
    return out;
  }

  // ---- Units

  function unitEntries(doc, id) {
    var out = [];
    entries(doc, "units").forEach(function (e, i) {
      if (isObject(e) && e.id === id) out.push({ entry: e, index: i });
    });
    return out;
  }

  function originalUnit(cat, id) {
    var u = cat.units.get(id);
    return u ? u.original : null;
  }

  // The fields a table entry may have: all unit fields for a unit, only the
  // button set for other entries.
  function unitFieldsFor(cat, id) {
    var isUnit = util.inRange(id, cat.limits.unit);
    return cat.unitFields.filter(function (f) {
      return isUnit || f.kind === "buttonSet";
    });
  }

  // Each unit field's value in the mod or the original game.
  function effectiveUnit(doc, cat, id) {
    var original = originalUnit(cat, id) || {};
    var found = unitEntries(doc, id);
    var out = {};
    unitFieldsFor(cat, id).forEach(function (f) {
      var hit = null;
      found.some(function (x) {
        if (util.has(x.entry, f.name)) {
          hit = x;
          return true;
        }
        return false;
      });
      var known = util.has(original, f.name);
      out[f.name] = {
        value: hit ? hit.entry[f.name] : known ? original[f.name] : undefined,
        original: known ? original[f.name] : undefined,
        hasOriginal: known,
        changed: !!hit,
        path: hit ? "units[" + hit.index + "]." + f.name : null
      };
    });
    return out;
  }

  // Removes, from the entries of one unit, fields that match the original and
  // entries left with no fields.
  function tidyUnit(doc, cat, id) {
    var original = originalUnit(cat, id);
    var list = entries(doc, "units");
    var changed = false;
    var out = [];
    list.forEach(function (e) {
      if (!isObject(e) || e.id !== id) {
        out.push(e);
        return;
      }
      var copy = e;
      cat.unitFields.forEach(function (f) {
        if (original && util.has(copy, f.name) && util.has(original, f.name) && util.equal(copy[f.name], original[f.name])) {
          copy = util.omit(copy, [f.name]);
          changed = true;
        }
      });
      var fields = Object.keys(copy).filter(function (k) {
        return k !== "id" && k !== "label";
      });
      if (fields.length || copy === e) out.push(copy);
      else changed = true;
    });
    return changed ? withPart(doc, "units", out) : doc;
  }

  function setUnitField(doc, cat, id, field, value) {
    var list = entries(doc, "units").slice();
    var found = unitEntries(doc, id);
    var target = null;
    found.some(function (x) {
      if (util.has(x.entry, field)) {
        target = x;
        return true;
      }
      return false;
    });
    if (!target && found.length) target = found[0];
    if (target) {
      var copy = {};
      Object.keys(target.entry).forEach(function (k) {
        copy[k] = target.entry[k];
      });
      copy[field] = value;
      list[target.index] = copy;
    } else {
      var entry = { id: id };
      entry[field] = value;
      list.push(withLabel(entry, itemName(cat, "unit", id)));
    }
    return tidyUnit(withPart(doc, "units", list), cat, id);
  }

  function revertUnitField(doc, cat, id, field) {
    var list = entries(doc, "units").map(function (e) {
      return isObject(e) && e.id === id && util.has(e, field) ? util.omit(e, [field]) : e;
    });
    list = list.filter(function (e) {
      return !(
        isObject(e) &&
        e.id === id &&
        !Object.keys(e).some(function (k) {
          return k !== "id" && k !== "label";
        })
      );
    });
    return withPart(doc, "units", list);
  }

  function revertUnit(doc, cat, id) {
    return withPart(
      doc,
      "units",
      entries(doc, "units").filter(function (e) {
        return !(isObject(e) && e.id === id);
      })
    );
  }

  // ---- Button sets

  function setEntry(doc, id) {
    var hit = null;
    entries(doc, "button_sets").some(function (e, i) {
      if (isObject(e) && e.id === id) {
        hit = { entry: e, index: i };
        return true;
      }
      return false;
    });
    return hit;
  }

  function isNewSet(cat, id) {
    return util.inRange(id, cat.limits.newButtonSet);
  }

  // Drops a variable of 0 on a function that reads none, as the format
  // allows, so equal buttons compare equal.
  function tidyButton(cat, b) {
    if (!isObject(b)) return b;
    var out = b;
    [["condition", "conditions", "conditionVariable"], ["action", "actions", "actionVariable"]].forEach(function (k) {
      var fnField = cat.buttonKind[k[0]];
      var varField = cat.buttonKind[k[2]];
      var fn = cat.functions[k[1]].get(out[fnField.name]);
      if (fn && !fn.variable && out[varField.name] === 0) out = util.omit(out, [varField.name]);
    });
    return out;
  }

  function withoutLabels(buttons) {
    return buttons.map(function (b) {
      return isObject(b) && util.has(b, "label") ? util.omit(b, ["label"]) : b;
    });
  }

  function effectiveButtons(doc, cat, id) {
    var set = cat.sets.get(id);
    var hit = setEntry(doc, id);
    var original = set ? set.original : null;
    return {
      buttons: hit && Array.isArray(hit.entry.buttons) ? hit.entry.buttons : original || [],
      original: original,
      defined: !!hit,
      isNew: !set && isNewSet(cat, id),
      path: hit ? "button_sets[" + hit.index + "]" : null
    };
  }

  function sameButtons(cat, a, b) {
    return util.equal(withoutLabels(a.map(function (x) {
      return tidyButton(cat, x);
    })), withoutLabels(b.map(function (x) {
      return tidyButton(cat, x);
    })));
  }

  function setButtons(doc, cat, id, buttons) {
    buttons = buttons.map(function (b) {
      return tidyButton(cat, b);
    });
    var set = cat.sets.get(id);
    var hit = setEntry(doc, id);
    var list = entries(doc, "button_sets").slice();
    if (set && sameButtons(cat, buttons, set.original)) {
      // Matches the original: no entry.
      return withPart(
        doc,
        "button_sets",
        list.filter(function (e) {
          return !(isObject(e) && e.id === id);
        })
      );
    }
    if (hit) {
      var copy = {};
      Object.keys(hit.entry).forEach(function (k) {
        copy[k] = hit.entry[k];
      });
      copy.buttons = buttons;
      list[hit.index] = copy;
    } else {
      list.push(withLabel({ id: id, buttons: buttons }, set ? set.name : null));
    }
    return withPart(doc, "button_sets", list);
  }

  function revertSet(doc, cat, id) {
    return withPart(
      doc,
      "button_sets",
      entries(doc, "button_sets").filter(function (e) {
        return !(isObject(e) && e.id === id);
      })
    );
  }

  // The lowest new set ID the mod doesn't use, or null if all are used.
  function nextNewSet(doc, cat) {
    var used = {};
    entries(doc, "button_sets").forEach(function (e) {
      if (isObject(e) && isInt(e.id)) used[e.id] = true;
    });
    for (var id = cat.limits.newButtonSet.min; id <= cat.limits.newButtonSet.max; id++) if (!used[id]) return id;
    return null;
  }

  function addSet(doc, cat, id, buttons) {
    if (id === undefined || id === null) id = nextNewSet(doc, cat);
    if (id === null) throw new Error("every new set ID is in use");
    if (setEntry(doc, id)) throw new Error("set " + id + " is already defined");
    var list = entries(doc, "button_sets").concat([{ id: id, buttons: (buttons || []).map(function (b) {
      return tidyButton(cat, b);
    }) }]);
    return { doc: withPart(doc, "button_sets", list), id: id };
  }

  // Gives a table entry its own copy of its current set.
  function separateUnit(doc, cat, unitId) {
    var current = effectiveUnit(doc, cat, unitId)[cat.unitKind.buttonSet.name].value;
    var buttons = isInt(current) ? effectiveButtons(doc, cat, current).buttons : [];
    var added = addSet(doc, cat, null, buttons);
    return { doc: setUnitField(added.doc, cat, unitId, cat.unitKind.buttonSet.name, added.id), id: added.id };
  }

  // ---- Requirements

  function originalRecord(cat, type, id, version) {
    var r = cat.requirements.get(type + ":" + id);
    if (!r) return null;
    if (version && r.original.perVersion && util.has(r.original.perVersion, version)) return r.original.perVersion[version];
    return r.original["default"];
  }

  // The original record on each version, as { version: list or null }.
  function originalRecords(cat, type, id) {
    var out = {};
    cat.versionIds.forEach(function (v) {
      out[v] = originalRecord(cat, type, id, v);
    });
    return out;
  }

  function requirementEntry(doc, type, id) {
    var hit = null;
    entries(doc, "requirements").some(function (e, i) {
      if (isObject(e) && e.type === type && e.id === id) {
        hit = { entry: e, index: i };
        return true;
      }
      return false;
    });
    return hit;
  }

  function effectiveRequirement(doc, cat, type, id) {
    var hit = requirementEntry(doc, type, id);
    var original = originalRecord(cat, type, id, null);
    return {
      list: hit && Array.isArray(hit.entry.list) ? hit.entry.list : original || [],
      original: original,
      originals: originalRecords(cat, type, id),
      defined: !!hit,
      path: hit ? "requirements[" + hit.index + "]" : null
    };
  }

  // A list matches the original when it does on every version. An empty
  // list matches an item with no record.
  function matchesOriginalRecord(cat, type, id, list) {
    return cat.versionIds.every(function (v) {
      var o = originalRecord(cat, type, id, v);
      return util.equal(list, o === null ? [] : o);
    });
  }

  function setRequirement(doc, cat, type, id, list) {
    var others = entries(doc, "requirements").filter(function (e) {
      return !(isObject(e) && e.type === type && e.id === id);
    });
    if (matchesOriginalRecord(cat, type, id, list)) return withPart(doc, "requirements", others);
    var hit = requirementEntry(doc, type, id);
    var all = entries(doc, "requirements").slice();
    if (hit) {
      var copy = {};
      Object.keys(hit.entry).forEach(function (k) {
        copy[k] = hit.entry[k];
      });
      copy.list = list;
      all[hit.index] = copy;
    } else {
      var entry = { type: type, id: id, list: list };
      var name = requirementName(cat, type, id);
      if (name) entry = { type: type, id: id, label: name, list: list };
      all.push(entry);
    }
    return withPart(doc, "requirements", all);
  }

  function revertRequirement(doc, cat, type, id) {
    return withPart(
      doc,
      "requirements",
      entries(doc, "requirements").filter(function (e) {
        return !(isObject(e) && e.type === type && e.id === id);
      })
    );
  }

  // ---- Constants

  function constantEntry(doc, name) {
    var hit = null;
    entries(doc, "constants").some(function (e, i) {
      if (isObject(e) && e.name === name) {
        hit = { entry: e, index: i };
        return true;
      }
      return false;
    });
    return hit;
  }

  // The original values known on some version. "unknown" and
  // "not_applicable" versions don't count.
  function knownOriginals(c) {
    var out = [];
    Object.keys(c.availability).forEach(function (v) {
      var a = c.availability[v];
      if (a !== "unknown" && a !== "not_applicable") out.push(a);
    });
    return out;
  }

  function effectiveConstant(doc, cat, name) {
    var c = cat.constants.get(name);
    var hit = constantEntry(doc, name);
    var known = c ? knownOriginals(c) : [];
    var uniform = known.length && known.every(function (x) {
      return x === known[0];
    }) ? known[0] : undefined;
    var key = c && c.kind === "option" ? "option" : "value";
    return {
      value: hit ? hit.entry[key] : uniform,
      entry: hit ? hit.entry : null,
      original: uniform,
      varies: known.length > 1 && uniform === undefined,
      changed: !!hit,
      path: hit ? "constants[" + hit.index + "]" : null
    };
  }

  // Sets a constant's value (or option). It's removed when it matches the
  // original on every version where the original is known.
  function setConstant(doc, cat, name, v) {
    var c = cat.constants.get(name);
    var key = c && c.kind === "option" ? "option" : "value";
    var known = c ? knownOriginals(c) : [];
    var others = entries(doc, "constants").filter(function (e) {
      return !(isObject(e) && e.name === name);
    });
    if (
      known.length &&
      known.every(function (x) {
        return x === v;
      })
    ) {
      return withPart(doc, "constants", others);
    }
    var hit = constantEntry(doc, name);
    var all = entries(doc, "constants").slice();
    if (hit) {
      var copy = {};
      Object.keys(hit.entry).forEach(function (k) {
        if (k !== "value" && k !== "option") copy[k] = hit.entry[k];
      });
      copy[key] = v;
      all[hit.index] = copy;
    } else {
      var entry = { name: name };
      if (c) entry.label = c.label;
      entry[key] = v;
      all.push(entry);
    }
    return withPart(doc, "constants", all);
  }

  function revertConstant(doc, cat, name) {
    return withPart(
      doc,
      "constants",
      entries(doc, "constants").filter(function (e) {
        return !(isObject(e) && e.name === name);
      })
    );
  }

  // ---- Whole document

  // Removes the entry at `path`, such as "units[3]", for entries the item
  // list can't show.
  function removeEntry(doc, path) {
    var m = /^(units|button_sets|requirements|constants)\[(\d+)\]/.exec(path);
    if (!m) throw new Error("not an entry: " + path);
    var list = entries(doc, m[1]).slice();
    list.splice(+m[2], 1);
    return withPart(doc, m[1], list);
  }

  // Applied once when a file is opened: removes everything that matches the
  // original on every version, and variables of 0 that no function reads.
  function normalize(doc, cat) {
    var out = withInfo(doc, {});
    var unitIds = [];
    entries(doc, "units").forEach(function (e) {
      if (isObject(e) && isInt(e.id) && unitIds.indexOf(e.id) < 0) unitIds.push(e.id);
    });
    unitIds.forEach(function (id) {
      out = tidyUnit(out, cat, id);
    });
    if (Array.isArray(out.button_sets)) {
      var sets = [];
      var changed = false;
      out.button_sets.forEach(function (e) {
        if (!isObject(e) || !Array.isArray(e.buttons)) {
          sets.push(e);
          return;
        }
        var tidied = e.buttons.map(function (b) {
          return tidyButton(cat, b);
        });
        var set = isInt(e.id) ? cat.sets.get(e.id) : null;
        if (set && sameButtons(cat, tidied, set.original)) {
          changed = true;
          return;
        }
        if (!util.equal(tidied, e.buttons)) {
          var copy = {};
          Object.keys(e).forEach(function (k) {
            copy[k] = e[k];
          });
          copy.buttons = tidied;
          sets.push(copy);
          changed = true;
        } else sets.push(e);
      });
      if (changed) out = withPart(out, "button_sets", sets);
    }
    if (Array.isArray(out.requirements)) {
      var reqs = out.requirements.filter(function (e) {
        return !(isObject(e) && typeof e.type === "string" && isInt(e.id) && Array.isArray(e.list) && cat.limits[AG.core.validate.TYPE_LIMIT[e.type]] && matchesOriginalRecord(cat, e.type, e.id, e.list));
      });
      if (reqs.length !== out.requirements.length) out = withPart(out, "requirements", reqs);
    }
    if (Array.isArray(out.constants)) {
      var consts = out.constants.filter(function (e) {
        if (!isObject(e) || typeof e.name !== "string") return true;
        var c = cat.constants.get(e.name);
        if (!c) return true;
        var key = c.kind === "option" ? "option" : "value";
        if (!util.has(e, key) || util.has(e, key === "value" ? "option" : "value")) return true;
        var known = knownOriginals(c);
        return !(
          known.length &&
          known.every(function (x) {
            return x === e[key];
          })
        );
      });
      if (consts.length !== out.constants.length) out = withPart(out, "constants", consts);
    }
    return out;
  }

  // True if the mod changes nothing.
  function isEmpty(doc) {
    return AG.core.validate.PARTS.every(function (p) {
      return !entries(doc, p).length;
    });
  }

  AG.core.doc = {
    create: create,
    INFO: INFO,
    info: info,
    withInfo: withInfo,
    parseAuthors: parseAuthors,
    entries: entries,
    itemName: itemName,
    requirementName: requirementName,
    unitFieldsFor: unitFieldsFor,
    effectiveUnit: effectiveUnit,
    setUnitField: setUnitField,
    revertUnitField: revertUnitField,
    revertUnit: revertUnit,
    effectiveButtons: effectiveButtons,
    setButtons: setButtons,
    revertSet: revertSet,
    nextNewSet: nextNewSet,
    addSet: addSet,
    separateUnit: separateUnit,
    tidyButton: tidyButton,
    originalRecord: originalRecord,
    originalRecords: originalRecords,
    effectiveRequirement: effectiveRequirement,
    setRequirement: setRequirement,
    revertRequirement: revertRequirement,
    effectiveConstant: effectiveConstant,
    setConstant: setConstant,
    revertConstant: revertConstant,
    removeEntry: removeEntry,
    normalize: normalize,
    isEmpty: isEmpty
  };
})(AxeGraft);
