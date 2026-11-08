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

  // The mod's name, version and authors, in the "mod" object. They're
  // informational only, and every saved mod has them, empty if not given.
  // Other properties of "mod" are kept as they are.
  var INFO = ["name", "version", "authors"];

  function create(game, info) {
    return withInfo({ patcher: "AxeGraft", format: 1, game: game }, info || {});
  }

  // The information of a mod, with missing values as empty ones.
  function info(doc) {
    var mod = isObject(doc.mod) ? doc.mod : {};
    return {
      name: util.has(mod, "name") ? mod.name : "",
      version: util.has(mod, "version") ? mod.version : "",
      authors: util.has(mod, "authors") ? mod.authors : []
    };
  }

  // A copy of the document with the information in `values` set, and any
  // missing information added empty.
  function withInfo(doc, values) {
    var current = info(doc);
    var mod = {};
    if (isObject(doc.mod)) Object.keys(doc.mod).forEach(function (k) {
      mod[k] = doc.mod[k];
    });
    INFO.forEach(function (k) {
      mod[k] = util.has(values, k) ? values[k] : current[k];
    });
    if (isObject(doc.mod) && util.equal(mod, doc.mod) && Object.keys(mod).length === Object.keys(doc.mod).length) return doc;
    var out = {};
    Object.keys(doc).forEach(function (k) {
      out[k] = doc[k];
    });
    out.mod = mod;
    return out;
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

  // ---- Names

  // The kinds of item the mod can name in the editor, and the object of
  // `labels` that holds each kind's names, by ID (by name for constants).
  // The patcher ignores `labels`.
  var LABEL_KINDS = { unit: "units", set: "button_sets", upgrade: "upgrades", tech: "techs", order: "orders", constant: "constants" };
  var LABEL_ORDER = ["units", "button_sets", "upgrades", "techs", "orders", "constants"];

  // The name the mod gives an item in the editor, from its `labels`, or null.
  function customName(doc, kind, id) {
    var part = LABEL_KINDS[kind];
    var labels = part && isObject(doc) && isObject(doc.labels) && isObject(doc.labels[part]) ? doc.labels[part] : null;
    var n = labels && util.has(labels, String(id)) ? labels[String(id)] : null;
    return typeof n === "string" && n !== "" ? n : null;
  }

  function customUnitName(doc, id) {
    return customName(doc, "unit", id);
  }

  // An item's name in the catalog, or null.
  function catalogName(cat, kind, id) {
    if (kind === "constant") {
      var c = cat.constants.get(id);
      return c ? c.label : null;
    }
    var m = { unit: cat.units, set: cat.sets, upgrade: cat.upgrades, tech: cat.techs, order: cat.orders, missile: cat.missiles, spellSound: cat.spellSounds, sound: cat.sounds }[kind];
    var item = m && m.get(id);
    return item ? item.name : null;
  }

  // An item's name: the mod's name for it when `doc` is given and has one,
  // otherwise the catalog's. Null when neither has one.
  function itemName(cat, kind, id, doc) {
    if (doc) {
      var custom = customName(doc, kind, id);
      if (custom) return custom;
    }
    return catalogName(cat, kind, id);
  }

  // A button set as the editor shows it: its ID and name, or "Set N" for
  // one with no name, such as a new set the mod hasn't named.
  function setText(cat, id, doc) {
    var name = itemName(cat, "set", id, doc);
    return name ? id + " " + name : "Set " + id;
  }

  function requirementName(cat, type, id, doc) {
    var kind = { unit: "unit", upgrade: "upgrade", tech_research: "tech", tech_use: "tech", order: "order" }[type];
    return kind ? itemName(cat, kind, id, doc) : null;
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
      list.push(withLabel(entry, itemName(cat, "unit", id, doc)));
    }
    return tidyUnit(withPart(doc, "units", list), cat, id);
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

  // The mod's entries labelled with an item's name: a unit's entries and
  // its unit requirement record, a set's entries, an upgrade's, tech's or
  // order's requirement records, and a constant's entries.
  function namedEntry(kind, id, part, e) {
    if (!isObject(e)) return false;
    if (kind === "constant") return part === "constants" && e.name === id;
    if (e.id !== id) return false;
    if (kind === "unit") return part === "units" || (part === "requirements" && e.type === "unit");
    if (kind === "set") return part === "button_sets";
    if (part !== "requirements") return false;
    if (kind === "tech") return e.type === "tech_research" || e.type === "tech_use";
    return e.type === kind;
  }

  // Gives an item a name in the editor. Empty text, or the catalog's name,
  // removes the mod's name, so the catalog's shows. The labels of the item's
  // entries are changed to match, so the file reads the same as the editor;
  // an entry of an item left with no name loses its label.
  function setItemName(doc, cat, kind, id, name) {
    var part = LABEL_KINDS[kind];
    if (!part) throw new Error("items of kind " + kind + " can't be named");
    var text = typeof name === "string" ? name.trim() : "";
    if (text === catalogName(cat, kind, id)) text = "";
    if (text === (customName(doc, kind, id) || "")) return doc;
    var key = String(id);
    var labels = isObject(doc.labels) ? doc.labels : {};
    var names = {};
    if (isObject(labels[part])) {
      Object.keys(labels[part]).forEach(function (k) {
        if (k !== key) names[k] = labels[part][k];
      });
    }
    if (text) names[key] = text;
    var nextLabels = {};
    var kinds = LABEL_ORDER.concat(Object.keys(labels).filter(function (k) {
      return LABEL_ORDER.indexOf(k) < 0;
    }));
    kinds.forEach(function (k) {
      if (k === part) {
        if (Object.keys(names).length) nextLabels[k] = names;
      } else if (util.has(labels, k)) {
        nextLabels[k] = labels[k];
      }
    });
    var out = {};
    Object.keys(doc).forEach(function (k) {
      if (k !== "labels") out[k] = doc[k];
    });
    if (Object.keys(nextLabels).length) out.labels = nextLabels;

    var label = itemName(cat, kind, id, out);
    ["units", "button_sets", "requirements", "constants"].forEach(function (p) {
      if (!Array.isArray(out[p])) return;
      out[p] = out[p].map(function (e) {
        if (!namedEntry(kind, id, p, e)) return e;
        var copy = util.has(e, "label") ? util.omit(e, ["label"]) : e;
        return withLabel(copy, label);
      });
    });
    return out;
  }

  function setUnitName(doc, cat, id, name) {
    return setItemName(doc, cat, "unit", id, name);
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

  // A set's original buttons on one version, or the default list when
  // `version` is null. Null for a set the catalog doesn't list.
  function originalButtons(cat, id, version) {
    var o = cat.setOriginals.get(id);
    if (!o) return null;
    if (version && util.has(o.perVersion, version)) return o.perVersion[version];
    return o["default"];
  }

  // The original buttons on each version, as { version: list }, or null
  // for a set the catalog doesn't list.
  function originalButtonsByVersion(cat, id) {
    if (!cat.setOriginals.has(id)) return null;
    var out = {};
    cat.versionIds.forEach(function (v) {
      out[v] = originalButtons(cat, id, v);
    });
    return out;
  }

  function effectiveButtons(doc, cat, id) {
    var set = cat.sets.get(id);
    var hit = setEntry(doc, id);
    var original = originalButtons(cat, id, null);
    var originals = originalButtonsByVersion(cat, id);
    var buttons = hit && Array.isArray(hit.entry.buttons) ? hit.entry.buttons : original || [];
    return {
      buttons: buttons,
      original: original,
      originals: originals,
      // The versions whose original the mod's buttons don't match.
      differsOn: hit && originals ? cat.versionIds.filter(function (v) {
        return !sameButtons(cat, buttons, originals[v]);
      }) : [],
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

  // The original each of a set's buttons is compared with, as
  // [{ original, unchanged }] in list order. A button that equals an original
  // button on any version is unchanged. Any other is paired by position with
  // the default version's original: the k-th button at a position with the
  // k-th original button there, or null when the original has no k-th
  // button there, which makes it a new button.
  function pairedOriginals(cat, id, buttons) {
    var pos = cat.buttonKind.position.name;
    var byVersion = originalButtonsByVersion(cat, id) || {};
    var all = [];
    Object.keys(byVersion).forEach(function (v) {
      (byVersion[v] || []).forEach(function (o) {
        all.push(o);
      });
    });
    var defaults = originalButtons(cat, id, null) || [];
    var seen = {};
    return buttons.map(function (b) {
      var p = isObject(b) ? b[pos] : undefined;
      var k = (seen[p] = (seen[p] || 0) + 1) - 1;
      var atPos = defaults.filter(function (o) {
        return isObject(o) && o[pos] === p;
      });
      var unchanged = isObject(b) && all.some(function (o) {
        return sameButtons(cat, [b], [o]);
      });
      return { original: atPos[k] || null, unchanged: unchanged };
    });
  }

  // Lines up several lists of buttons side by side, keeping each list's
  // order, for showing how they differ. Equal buttons share a row; a button
  // that differs but has the same position as one in another list shares
  // that row; any other button gets a row of its own. Returns rows of
  // { cells: [button or null for each list], state }, where state is
  // "same" (equal in every list), "changed" (in every list, not all equal)
  // or "partial" (missing from some lists).
  function alignButtons(cat, lists) {
    var pos = cat.buttonKind.position.name;
    function equal(a, b) {
      return sameButtons(cat, [a], [b]);
    }
    // 0 for a row holding an equal button, 1 for one at the same position.
    function matchCost(row, b) {
      var cells = row.filter(function (c) {
        return c !== null;
      });
      if (cells.some(function (c) {
        return equal(c, b);
      })) return 0;
      if (isObject(b) && cells.some(function (c) {
        return isObject(c) && c[pos] === b[pos];
      })) return 1;
      return Infinity;
    }
    var rows = [];
    lists.forEach(function (list, k) {
      var n = rows.length;
      var m = list.length;
      var cost = [];
      for (var i = 0; i <= n; i++) {
        cost.push([]);
        for (var j = 0; j <= m; j++) {
          if (!i || !j) {
            cost[i][j] = i + j;
            continue;
          }
          cost[i][j] = Math.min(cost[i - 1][j - 1] + matchCost(rows[i - 1], list[j - 1]), cost[i - 1][j] + 1, cost[i][j - 1] + 1);
        }
      }
      var out = [];
      var i2 = n;
      var j2 = m;
      function blank() {
        var cells = [];
        for (var x = 0; x < k; x++) cells.push(null);
        return cells;
      }
      while (i2 > 0 || j2 > 0) {
        if (i2 > 0 && j2 > 0 && cost[i2][j2] === cost[i2 - 1][j2 - 1] + matchCost(rows[i2 - 1], list[j2 - 1])) {
          out.push(rows[i2 - 1].concat([list[j2 - 1]]));
          i2--;
          j2--;
        } else if (j2 > 0 && (i2 === 0 || cost[i2][j2] === cost[i2][j2 - 1] + 1)) {
          out.push(blank().concat([list[j2 - 1]]));
          j2--;
        } else {
          out.push(rows[i2 - 1].concat([null]));
          i2--;
        }
      }
      rows = out.reverse();
    });
    return rows.map(function (cells) {
      var present = cells.filter(function (c) {
        return c !== null;
      });
      var state = present.length < cells.length ? "partial" : present.every(function (c) {
        return equal(c, present[0]);
      }) ? "same" : "changed";
      return { cells: cells, state: state };
    });
  }

  // Buttons match the original only when they do on every version.
  function matchesOriginalButtons(cat, id, buttons) {
    if (!cat.setOriginals.has(id)) return false;
    return cat.versionIds.every(function (v) {
      return sameButtons(cat, buttons, originalButtons(cat, id, v));
    });
  }

  function setButtons(doc, cat, id, buttons) {
    buttons = buttons.map(function (b) {
      return tidyButton(cat, b);
    });
    var set = cat.sets.get(id);
    var hit = setEntry(doc, id);
    var list = entries(doc, "button_sets").slice();
    if (set && matchesOriginalButtons(cat, id, buttons)) {
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
      list.push(withLabel({ id: id, buttons: buttons }, itemName(cat, "set", id, doc)));
    }
    return withPart(doc, "button_sets", list);
  }

  // Sorts a set's buttons by position, lowest first. Buttons at the same
  // position keep their order. A set already in order is left as it is.
  function sortButtons(doc, cat, id) {
    var pos = cat.buttonKind.position.name;
    var buttons = effectiveButtons(doc, cat, id).buttons;
    var sorted = buttons
      .map(function (b, i) {
        return { b: b, i: i };
      })
      .sort(function (x, y) {
        return x.b[pos] - y.b[pos] || x.i - y.i;
      })
      .map(function (x) {
        return x.b;
      });
    var same = sorted.every(function (b, i) {
      return b === buttons[i];
    });
    return same ? doc : setButtons(doc, cat, id, sorted);
  }

  // ---- Moving buttons between positions
  //
  // These take a set's list of buttons and return a new list, and the index
  // the moved button ends up at. They never change the list they're given.

  function posOf(cat, b) {
    return isObject(b) ? b[cat.buttonKind.position.name] : undefined;
  }

  // Puts button i back in ascending order after its position changed: before
  // the first other button at a higher position, so it's last of those
  // sharing its position. No other button moves.
  function placeButton(cat, list, i) {
    var b = list[i];
    var p = posOf(cat, b);
    var rest = list.slice(0, i).concat(list.slice(i + 1));
    var at = rest.length;
    for (var k = 0; k < rest.length; k++) {
      if (typeof posOf(cat, rest[k]) === "number" && posOf(cat, rest[k]) > p) {
        at = k;
        break;
      }
    }
    rest.splice(at, 0, b);
    return { buttons: rest, index: at };
  }

  function withPosition(cat, b, p) {
    var copy = Object.assign({}, b);
    copy[cat.buttonKind.position.name] = p;
    return copy;
  }

  // Button i moved to `pos`, alone there or joining the buttons already there.
  function moveButtonTo(cat, list, i, pos) {
    var next = list.slice();
    next[i] = withPosition(cat, list[i], pos);
    return placeButton(cat, next, i);
  }

  // The positions whose buttons a push into `pos` shifts one place on: from
  // `pos` up to the first empty position, not counting button i, which is
  // leaving its own. With none empty, up to the last position, whose buttons
  // stay and are joined by those from the one before.
  function pushedPositions(cat, list, i, pos) {
    var max = cat.limits.position.max;
    var used = {};
    list.forEach(function (b, k) {
      if (k !== i && typeof posOf(cat, b) === "number") used[posOf(cat, b)] = true;
    });
    var out = [];
    for (var p = pos; p < max && used[p]; p++) out.push(p);
    return out;
  }

  // Button i put at `pos`, pushing the buttons from there on one position on
  // to make room, as `pushedPositions` says.
  function pushButtonTo(cat, list, i, pos) {
    var shifted = pushedPositions(cat, list, i, pos);
    var next = list.map(function (b, k) {
      if (k === i) return withPosition(cat, b, pos);
      var p = posOf(cat, b);
      return shifted.indexOf(p) >= 0 ? withPosition(cat, b, p + 1) : b;
    });
    return placeButton(cat, next, i);
  }

  // A drop of button i in a set's list.
  // `drop` is { on: k }, onto button k, or { before: k }, between buttons
  // k - 1 and k, where k may be the list's length, for after the last.
  //
  // Onto a button, it joins that button's position. Between x and y it
  // takes y's position and pushes, as `pushButtonTo` does; after the last
  // button, the position after x's. Where x and y share a position, or the
  // button already has x's or y's, it only moves in the list, keeping or
  // taking that position, as nothing needs pushing.
  //
  // Returns `{ buttons, index, pushed }`, `pushed` being the positions whose
  // buttons a push moves on, or null when the drop changes nothing.
  function dropInList(cat, list, i, drop) {
    var r;
    var pushed = [];
    if (drop.on !== undefined) {
      if (drop.on === i || typeof posOf(cat, list[drop.on]) !== "number") return null;
      r = moveButtonTo(cat, list, i, posOf(cat, list[drop.on]));
    } else {
      var k = drop.before;
      if (k < 0 || k > list.length || k === i || k === i + 1) return null;
      var px = k > 0 ? posOf(cat, list[k - 1]) : undefined;
      var py = k < list.length ? posOf(cat, list[k]) : undefined;
      var pd = posOf(cat, list[i]);
      var keep = pd === px || pd === py ? pd : px !== undefined && px === py ? py : undefined;
      if (keep !== undefined) {
        var next = list.slice();
        var b = next.splice(i, 1)[0];
        var at = k > i ? k - 1 : k;
        next.splice(at, 0, keep === pd ? b : withPosition(cat, b, keep));
        r = { buttons: next, index: at };
      } else {
        var p = py !== undefined ? py : typeof px === "number" ? Math.min(px + 1, cat.limits.position.max) : undefined;
        if (typeof p !== "number") return null;
        pushed = pushedPositions(cat, list, i, p);
        r = pushButtonTo(cat, list, i, p);
      }
    }
    if (util.equal(r.buttons, list)) return null;
    r.pushed = pushed;
    return r;
  }

  // Reverts an original set, or removes a new one, with its name, so a set
  // added later with the same ID doesn't inherit it.
  function revertSet(doc, cat, id) {
    var out = withPart(
      doc,
      "button_sets",
      entries(doc, "button_sets").filter(function (e) {
        return !(isObject(e) && e.id === id);
      })
    );
    return isNewSet(cat, id) ? setItemName(out, cat, "set", id, "") : out;
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
      var name = requirementName(cat, type, id, doc);
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
      var label = itemName(cat, "constant", name, doc);
      if (label) entry.label = label;
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
        if (isInt(e.id) && matchesOriginalButtons(cat, e.id, tidied)) {
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
    revertUnit: revertUnit,
    LABEL_KINDS: LABEL_KINDS,
    customName: customName,
    catalogName: catalogName,
    setText: setText,
    setItemName: setItemName,
    customUnitName: customUnitName,
    setUnitName: setUnitName,
    originalButtons: originalButtons,
    originalButtonsByVersion: originalButtonsByVersion,
    effectiveButtons: effectiveButtons,
    setButtons: setButtons,
    sortButtons: sortButtons,
    placeButton: placeButton,
    moveButtonTo: moveButtonTo,
    pushedPositions: pushedPositions,
    pushButtonTo: pushButtonTo,
    dropInList: dropInList,
    alignButtons: alignButtons,
    sameButtons: sameButtons,
    pairedOriginals: pairedOriginals,
    revertSet: revertSet,
    nextNewSet: nextNewSet,
    addSet: addSet,
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
