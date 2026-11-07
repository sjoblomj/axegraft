// Validation of a mod against its game's catalog.
//
// check() returns every problem it finds, each with a path such as
// button_sets[3].buttons[2].action_variable, so a problem can be shown
// beside its field. A problem is one of:
//   refuse:   the file doesn't have the structure the editor needs in order
//             to hold it, so it isn't loaded (wrong header, unknown property,
//             a part or array of the wrong shape)
//   error:    the patcher's format rules reject the value; the mod stays
//             open with the value as written, but can't be saved
//   warning:  valid for the format but looks wrong; it never blocks saving
// It never throws, whatever the input.
"use strict";

(function (AG) {
  var util = AG.util;
  var isObject = util.isObject;
  var isInt = util.isInt;

  var HEADER = ["patcher", "format", "game"];
  var PARTS = ["units", "button_sets", "requirements", "constants"];
  var FORMATS = [1];
  var REQUIREMENT_TYPES = ["unit", "upgrade", "tech_research", "tech_use", "order"];
  var TYPE_LIMIT = { unit: "unit", upgrade: "upgrade", tech_research: "tech", tech_use: "tech", order: "order" };
  var TYPE_NAME = { unit: "unit", upgrade: "upgrade", tech_research: "tech research", tech_use: "tech use", order: "order" };
  var VARIABLE_NAME = { unit: "unit", tech: "tech", upgrade: "upgrade", order: "order", number: "number", tableEntry: "table entry" };

  function Problems() {
    this.list = [];
  }
  Problems.prototype.add = function (severity, path, message, extra) {
    var p = { severity: severity, path: path, message: message };
    if (extra) Object.keys(extra).forEach(function (k) {
      p[k] = extra[k];
    });
    this.list.push(p);
    return p;
  };
  Problems.prototype.refuse = function (path, message) {
    return this.add("error", path, message, { refuse: true });
  };
  Problems.prototype.error = function (path, message, extra) {
    return this.add("error", path, message, extra);
  };
  Problems.prototype.warning = function (path, message, extra) {
    return this.add("warning", path, message, extra);
  };

  function rangeText(r) {
    return r.min + "-" + r.max;
  }

  // The set a table entry points at in the original game, or undefined if
  // the catalog doesn't say.
  function entrySetText(cat, id) {
    if (!cat.entrySet.has(id)) return null;
    var s = cat.entrySet.get(id);
    return s === null ? "entry " + id + " has no buttons" : "entry " + id + " uses set " + s;
  }

  // Checks the header. Returns the game, or null if the mod can't be read further.
  function checkHeader(mod, problems, catalogs) {
    if (!isObject(mod)) {
      problems.refuse("", "The file isn't an AxeGraft Patcher mod: it holds " + util.typeName(mod) + ", not a JSON object.");
      return null;
    }
    var ok = true;
    if (mod.patcher !== "AxeGraft") {
      problems.refuse("patcher", "The file isn't an AxeGraft Patcher mod: " + (mod.patcher === undefined ? "it has no patcher" : "its patcher is " + util.show(mod.patcher) + ", not \"AxeGraft\"") + ".");
      ok = false;
    }
    if (FORMATS.indexOf(mod.format) < 0) {
      problems.refuse("format", mod.format === undefined ? "The mod has no format version." : "The mod's format version " + util.show(mod.format) + " isn't supported. This editor reads format " + FORMATS.join(", ") + ".");
      ok = false;
    }
    if (mod.game !== "starcraft" && mod.game !== "warcraft2") {
      problems.refuse("game", mod.game === undefined ? "The mod doesn't name its game." : "The mod's game " + util.show(mod.game) + " isn't starcraft or warcraft2.");
      ok = false;
    } else if (catalogs && !catalogs[mod.game]) {
      problems.refuse("game", "There's no catalog for " + mod.game + ", so its mods can't be opened.");
      ok = false;
    }
    return ok ? mod.game : null;
  }

  // Checks a mod object against a catalog.
  // `assets` is optional: { strings: { count }, icons: { count } } of what's loaded.
  function check(mod, cat, assets) {
    var problems = new Problems();
    var catalogs = {};
    if (cat) catalogs[cat.game] = cat;
    if (!checkHeader(mod, problems, catalogs) && !isObject(mod)) return problems.list;
    if (isObject(mod) && cat && mod.game !== cat.game) return problems.list;

    // Properties at the top level, and the shape of each part.
    Object.keys(mod).forEach(function (k) {
      if (HEADER.indexOf(k) >= 0) return;
      if (k === "mod") {
        checkInfo(mod.mod, problems);
        return;
      }
      if (k === "labels") return;
      if (PARTS.indexOf(k) < 0) {
        problems.refuse(k, "The mod has a property the format doesn't define: " + k + ".");
        return;
      }
      if (cat && !cat.has(k)) {
        problems.refuse(k, "A " + cat.title + " mod can't contain " + k + ", because the game has no such data.");
        return;
      }
      if (!Array.isArray(mod[k])) {
        problems.refuse(k, k + " must be an array of objects, but it's " + util.typeName(mod[k]) + ".");
        return;
      }
      mod[k].forEach(function (e, i) {
        if (!isObject(e)) problems.refuse(k + "[" + i + "]", "Each entry of " + k + " must be an object, but this is " + util.typeName(e) + ".");
      });
    });
    if (!cat) return problems.list;

    var ctx = { mod: mod, cat: cat, problems: problems, assets: assets || {} };
    if (util.has(mod, "labels")) checkLabels(mod.labels, cat, problems);
    // The entries of a part the game has. A part it lacks is already refused.
    function gamePart(name) {
      return cat.has(name) ? part(mod, name) : [];
    }
    ctx.definedSets = definedSets(mod);
    gamePart("units").forEach(function (e, i) {
      checkUnit(ctx, e, "units[" + i + "]");
    });
    checkUnitDuplicates(ctx);
    gamePart("button_sets").forEach(function (e, i) {
      checkButtonSet(ctx, e, "button_sets[" + i + "]");
    });
    checkDuplicates(ctx, "button_sets", function (e) {
      return isInt(e.id) ? String(e.id) : null;
    }, function (e) {
      return "Button set " + e.id + " is defined twice in this mod.";
    });
    gamePart("requirements").forEach(function (e, i) {
      checkRequirement(ctx, e, "requirements[" + i + "]");
    });
    checkDuplicates(ctx, "requirements", function (e) {
      return typeof e.type === "string" && isInt(e.id) ? e.type + ":" + e.id : null;
    }, function (e) {
      return "The " + (TYPE_NAME[e.type] || e.type) + " " + e.id + " requirement record is defined twice in this mod.";
    });
    gamePart("constants").forEach(function (e, i) {
      checkConstant(ctx, e, "constants[" + i + "]");
    });
    checkDuplicates(ctx, "constants", function (e) {
      return typeof e.name === "string" ? e.name : null;
    }, function (e) {
      return "The constant " + e.name + " is set twice in this mod.";
    });
    return problems.list;
  }

  // Entries of a part that are objects. Other values were refused already.
  function part(mod, name) {
    return Array.isArray(mod[name])
      ? mod[name].filter(function (e) {
          return isObject(e);
        }).map(function (e) {
          return e;
        })
      : [];
  }

  function indexed(mod, name) {
    var out = [];
    if (Array.isArray(mod[name]))
      mod[name].forEach(function (e, i) {
        if (isObject(e)) out.push({ entry: e, index: i });
      });
    return out;
  }

  function definedSets(mod) {
    var ids = Object.create(null);
    part(mod, "button_sets").forEach(function (e) {
      if (isInt(e.id)) ids[e.id] = true;
    });
    return ids;
  }

  // The mod's name, version and authors only need the right type, and other
  // properties of "mod" are accepted as they are. Authors that aren't an
  // array can't be shown, so the file is refused.
  function checkInfo(info, problems) {
    if (!isObject(info)) {
      problems.refuse("mod", "mod must be an object, but it's " + util.typeName(info) + ".");
      return;
    }
    [["name", "The mod's name"], ["version", "The mod's version"]].forEach(function (f) {
      if (util.has(info, f[0]) && typeof info[f[0]] !== "string") {
        problems.error("mod." + f[0], f[1] + " must be text, but it's " + util.typeName(info[f[0]]) + ".");
      }
    });
    if (!util.has(info, "authors")) return;
    if (!Array.isArray(info.authors)) {
      problems.refuse("mod.authors", "The mod's authors must be an array of names, but it's " + util.typeName(info.authors) + ".");
      return;
    }
    info.authors.forEach(function (a, i) {
      if (typeof a !== "string") problems.error("mod.authors[" + i + "]", "Each of the mod's authors must be text, but this is " + util.typeName(a) + ".");
    });
  }

  // The names the editor shows for items, in `labels`. The patcher ignores
  // them, so nothing here is more than a warning.
  function checkLabels(labels, cat, problems) {
    var ignored = " The patcher ignores labels, and the editor ignores this one.";
    if (!isObject(labels)) {
      problems.warning("labels", "labels must be an object, but it's " + util.typeName(labels) + "." + ignored);
      return;
    }
    Object.keys(labels).forEach(function (kind) {
      var path = "labels." + kind;
      if (kind !== "units") {
        problems.warning(path, "Only units can be labelled, not " + kind + "." + ignored);
        return;
      }
      if (!isObject(labels.units)) {
        problems.warning(path, "labels.units must be an object of names by unit ID, but it's " + util.typeName(labels.units) + "." + ignored);
        return;
      }
      Object.keys(labels.units).forEach(function (k) {
        var p = path + "." + k;
        var id = /^(0|[1-9][0-9]*)$/.test(k) ? Number(k) : null;
        if (id === null || !util.inRange(id, cat.limits.tableEntry)) {
          problems.warning(p, util.show(k) + " isn't an entry of the game's button table, " + rangeText(cat.limits.tableEntry) + "." + ignored);
        } else if (typeof labels.units[k] !== "string") {
          problems.warning(p, "Unit " + k + "'s label must be text, but it's " + util.typeName(labels.units[k]) + "." + ignored);
        }
      });
    });
  }

  function checkLabel(obj, path, problems) {
    if (util.has(obj, "label") && typeof obj.label !== "string") {
      problems.error((path ? path + "." : "") + "label", "A label must be text, but this is " + util.typeName(obj.label) + ".");
    }
  }

  function unknownFields(obj, allowed, path, problems, what) {
    Object.keys(obj).forEach(function (k) {
      if (k === "label") return;
      if (allowed.indexOf(k) < 0) problems.refuse(path + "." + k, what + " has a field the format doesn't define: " + k + ".");
    });
  }

  function checkDuplicates(ctx, name, key, message) {
    var seen = Object.create(null);
    indexed(ctx.mod, name).forEach(function (x) {
      var k = key(x.entry);
      if (k === null) return;
      if (seen[k]) ctx.problems.error(name + "[" + x.index + "]", message(x.entry), { duplicate: true });
      seen[k] = true;
    });
  }

  // ---- Units

  function checkUnit(ctx, e, path) {
    var cat = ctx.cat;
    var problems = ctx.problems;
    var fields = cat.unitFields.map(function (f) {
      return f.name;
    });
    unknownFields(e, ["id"].concat(fields), path, problems, "A unit entry");
    checkLabel(e, path, problems);
    var id = e.id;
    var who = isInt(id) ? "Unit entry " + id : "A unit entry";
    if (!util.has(e, "id")) problems.error(path, "A unit entry has no id.");
    else if (!isInt(id)) problems.error(path + ".id", "A unit entry's id must be a whole number, but it's " + util.show(id) + ".");
    else if (!util.inRange(id, cat.limits.tableEntry)) {
      problems.error(path + ".id", "Unit ID " + id + " is outside the game's button table, " + rangeText(cat.limits.tableEntry) + ".", { orphan: true });
    }
    var present = fields.filter(function (f) {
      return util.has(e, f);
    });
    var others = Object.keys(e).filter(function (k) {
      return k !== "id" && k !== "label";
    });
    if (!others.length) problems.error(path, who + " has nothing to change. Give it at least one of " + fields.join(", ") + ".");
    var isUnit = isInt(id) && util.inRange(id, cat.limits.unit);
    var isEntry = isInt(id) && util.inRange(id, cat.limits.tableEntry);

    present.forEach(function (name) {
      var f = cat.unitField.get(name);
      var v = e[name];
      var fp = path + "." + name;
      if (isEntry && !isUnit && f.kind !== "buttonSet") {
        problems.error(fp, "Table entry " + id + " isn't a unit, so only " + cat.unitKind.buttonSet.name + " can be set.");
        return;
      }
      if (f.kind === "buttonSet") checkSetReference(ctx, v, fp);
      else if (f.kind === "statusChanged" || f.kind === "statusUpdate") checkFunction(ctx, f.kind, v, fp, f.name);
      else if (f.kind === "unit") {
        if (!isInt(v)) problems.error(fp, f.name + " must be a unit ID, but it's " + util.show(v) + ".");
        else if (!util.inRange(v, cat.limits.unit)) problems.error(fp, f.name + " " + v + " is outside the unit range, " + rangeText(cat.limits.unit) + ".");
      } else if (f.kind === "icon" || f.kind === "string") {
        if (!isInt(v)) problems.error(fp, f.name + " must be a whole number, but it's " + util.show(v) + ".");
        else if (!util.inRange(v, cat.limits[f.kind])) problems.error(fp, f.name + " " + v + " is outside its range, " + rangeText(cat.limits[f.kind]) + ".");
        else if (f.kind === "icon") checkIconAsset(ctx, v, fp);
        else checkStringAsset(ctx, v, fp, f.name);
      } else if (f.kind === "choice") {
        var ok = f.options.some(function (o) {
          return o.value === v;
        });
        if (!ok) problems.error(fp, f.name + " " + util.show(v) + " isn't one of " + f.options.map(function (o) {
          return o.value;
        }).join(", ") + ".");
      } else if (f.kind === "tableEntry") {
        if (v === null) return;
        if (!isInt(v)) problems.error(fp, f.name + " must be a table entry ID or null for none, but it's " + util.show(v) + ".");
        else if (!util.inRange(v, cat.limits.tableEntry)) problems.error(fp, f.name + " " + v + " is outside the game's button table, " + rangeText(cat.limits.tableEntry) + ".");
      }
    });
  }

  // Two entries for one unit may set different fields, but not the same one.
  function checkUnitDuplicates(ctx) {
    var seen = Object.create(null);
    indexed(ctx.mod, "units").forEach(function (x) {
      if (!isInt(x.entry.id)) return;
      ctx.cat.unitFields.forEach(function (f) {
        if (!util.has(x.entry, f.name)) return;
        var k = x.entry.id + ":" + f.name;
        if (seen[k]) ctx.problems.error("units[" + x.index + "]." + f.name, "Unit " + x.entry.id + "'s " + f.name + " is set twice in this mod.", { duplicate: true });
        seen[k] = true;
      });
    });
  }

  function checkSetReference(ctx, v, path) {
    var cat = ctx.cat;
    if (v === null) return;
    if (!isInt(v)) {
      ctx.problems.error(path, "A button set must be a set ID, or null for no buttons, but it's " + util.show(v) + ".");
      return;
    }
    if (cat.sets.has(v)) return;
    if (util.inRange(v, cat.limits.newButtonSet)) {
      if (!ctx.definedSets[v]) ctx.problems.error(path, "Set " + v + " is a new set, but this mod doesn't define it.");
      return;
    }
    var used = util.inRange(v, cat.limits.tableEntry) ? entrySetText(cat, v) : null;
    if (used) ctx.problems.error(path, "There's no set " + v + ": " + used + ".");
    else if (util.inRange(v, cat.limits.buttonSet)) ctx.problems.error(path, "There's no set " + v + " in the catalog.");
    else ctx.problems.error(path, "Set " + v + " is outside the set range, " + rangeText(cat.limits.buttonSet) + ".");
  }

  function checkFunction(ctx, list, v, path, field) {
    var listName = { statusChanged: "status function", statusUpdate: "status function", conditions: "condition", actions: "action" }[list];
    if (typeof v !== "string") {
      ctx.problems.error(path, field + " must name a " + listName + ", but it's " + util.show(v) + ".");
      return null;
    }
    var fn = ctx.cat.functions[list].get(v);
    if (!fn) ctx.problems.error(path, ctx.cat.title + " has no " + listName + " called " + util.show(v) + ".");
    return fn || null;
  }

  // ---- Button sets

  function checkButtonSet(ctx, e, path) {
    var cat = ctx.cat;
    var problems = ctx.problems;
    unknownFields(e, ["id", "buttons"], path, problems, "A button set entry");
    checkLabel(e, path, problems);
    var id = e.id;
    if (!util.has(e, "id")) problems.error(path, "A button set entry has no id.");
    else if (!isInt(id)) problems.error(path + ".id", "A button set's id must be a whole number, but it's " + util.show(id) + ".");
    else if (!util.inRange(id, cat.limits.buttonSet)) {
      problems.error(path + ".id", "Set ID " + id + " is outside the set range, " + rangeText(cat.limits.buttonSet) + ".", { orphan: true });
    } else if (!cat.sets.has(id) && !util.inRange(id, cat.limits.newButtonSet)) {
      var used = entrySetText(cat, id);
      problems.error(path + ".id", "There's no original set " + id + (used ? ": " + used : " in the catalog") + ". New sets start at " + cat.limits.newButtonSet.min + ".", { orphan: true });
    }
    if (!util.has(e, "buttons")) {
      problems.refuse(path, "Button set " + (isInt(id) ? id : "entry") + " has no buttons array. Use [] for a set with no buttons.");
      return;
    }
    if (!Array.isArray(e.buttons)) {
      problems.refuse(path + ".buttons", "buttons must be an array of objects, but it's " + util.typeName(e.buttons) + ".");
      return;
    }
    e.buttons.forEach(function (b, j) {
      var bp = path + ".buttons[" + j + "]";
      if (!isObject(b)) problems.refuse(bp, "Each button must be an object, but this is " + util.typeName(b) + ".");
      else checkButton(ctx, b, bp, "Button " + j + " of set " + (isInt(id) ? id : "?"));
    });
    checkPositionOrder(ctx, e, path);
  }

  // In a game that needs it, a set's buttons must be in ascending position
  // order, because the game fills the panel walking the list in order.
  function checkPositionOrder(ctx, e, path) {
    var cat = ctx.cat;
    if (!cat.panel.ascending) return;
    var pos = cat.buttonKind.position.name;
    var list = e.buttons.filter(isObject).length === e.buttons.length ? e.buttons : [];
    var bad = AG.core.catalog.firstOutOfOrder(list, pos);
    if (bad < 0) return;
    var set = isInt(e.id) ? cat.sets.get(e.id) : null;
    var who = "Set " + (isInt(e.id) ? e.id : "?") + (set ? " (" + set.name + ")" : "");
    ctx.problems.error(
      path + ".buttons[" + bad + "]." + pos,
      who + " isn't in ascending position order: button " + bad + " is at position " + list[bad][pos] + ", after position " + list[bad - 1][pos] + ". This game needs each set's buttons sorted by position, lowest first."
    );
  }

  function variableRange(cat, type, fieldLimit) {
    if (type === "number") return fieldLimit;
    return cat.limits[type] || null;
  }

  function checkButton(ctx, b, path, who) {
    var cat = ctx.cat;
    var problems = ctx.problems;
    unknownFields(
      b,
      cat.buttonFields.map(function (f) {
        return f.name;
      }),
      path,
      problems,
      who
    );
    checkLabel(b, path, problems);
    var fns = {};
    cat.buttonFields.forEach(function (f) {
      var fp = path + "." + f.name;
      if (!util.has(b, f.name)) {
        if (f.required) problems.error(path, who + " has no " + f.name + ".", { field: f.name });
        return;
      }
      var v = b[f.name];
      if (f.kind === "condition" || f.kind === "action") {
        fns[f.kind] = checkFunction(ctx, f.kind === "condition" ? "conditions" : "actions", v, fp, f.name);
        return;
      }
      if (f.kind === "conditionVariable" || f.kind === "actionVariable") return;
      if (f.kind === "choice") {
        var ok = f.options.some(function (o) {
          return o.value === v;
        });
        if (!ok) {
          problems.error(fp, f.name + " " + util.show(v) + " isn't one of " + f.options.map(function (o) {
            return o.value;
          }).join(", ") + ".");
        }
        return;
      }
      var r = cat.limits[f.kind];
      if (!isInt(v)) problems.error(fp, f.name + " must be a whole number, but it's " + util.show(v) + ".");
      else if (!util.inRange(v, r)) problems.error(fp, f.name + " " + v + " is outside its range, " + rangeText(r) + ".");
      else if (f.kind === "string") checkStringAsset(ctx, v, fp, f.name);
      else if (f.kind === "icon") checkIconAsset(ctx, v, fp);
    });

    // Variables: they must fit their field, and a function that reads one
    // must be given one of the type it reads.
    [["condition", "conditionVariable"], ["action", "actionVariable"]].forEach(function (pair) {
      var vf = cat.buttonKind[pair[1]];
      var fn = fns[pair[0]];
      var fp = path + "." + vf.name;
      var limit = cat.limits[pair[1]];
      var has = util.has(b, vf.name);
      var v = b[vf.name];
      if (has) {
        if (!isInt(v)) {
          problems.error(fp, vf.name + " must be a whole number, but it's " + util.show(v) + ".");
          return;
        }
        if (!util.inRange(v, limit)) {
          problems.error(fp, vf.name + " " + v + " doesn't fit its field, " + rangeText(limit) + ".");
          return;
        }
      }
      if (!fn || !fn.variable) return;
      if (!has) {
        problems.error(fp, fn.name + " reads a " + VARIABLE_NAME[fn.variable] + ", but " + vf.name + " is missing.");
        return;
      }
      var r = variableRange(cat, fn.variable, limit);
      if (r && !util.inRange(v, r)) {
        problems.error(fp, fn.name + " reads a " + VARIABLE_NAME[fn.variable] + ", and " + v + " is outside that range, " + rangeText(r) + ".");
      }
    });
  }

  function checkStringAsset(ctx, v, path, field) {
    var s = ctx.assets.strings;
    if (!s || !isInt(s.count) || v === 0) return;
    if (v > s.count) {
      ctx.problems.warning(path, field + " " + v + " is beyond the loaded string table, which holds " + s.count + " strings. It's still valid, because an MPQ can add strings.", { asset: true });
    }
  }

  function checkIconAsset(ctx, v, path) {
    var s = ctx.assets.icons;
    if (!s || !isInt(s.count)) return;
    if (v >= s.count) {
      ctx.problems.warning(path, "Icon " + v + " is beyond the loaded icons, which number " + s.count + ". It's still valid, because an MPQ can add icons.", { asset: true });
    }
  }

  // ---- Requirements

  function checkRequirement(ctx, e, path) {
    var cat = ctx.cat;
    var problems = ctx.problems;
    unknownFields(e, ["type", "id", "list"], path, problems, "A requirement entry");
    checkLabel(e, path, problems);
    var typeOk = REQUIREMENT_TYPES.indexOf(e.type) >= 0;
    if (!util.has(e, "type")) problems.error(path, "A requirement entry has no type.");
    else if (!typeOk) problems.error(path + ".type", "A requirement type must be one of " + REQUIREMENT_TYPES.join(", ") + ", but it's " + util.show(e.type) + ".", { orphan: true });
    if (!util.has(e, "id")) problems.error(path, "A requirement entry has no id.");
    else if (!isInt(e.id)) problems.error(path + ".id", "A requirement entry's id must be a whole number, but it's " + util.show(e.id) + ".");
    else if (typeOk) {
      var r = cat.limits[TYPE_LIMIT[e.type]];
      if (!util.inRange(e.id, r)) problems.error(path + ".id", "The " + TYPE_NAME[e.type] + " ID " + e.id + " is outside its range, " + rangeText(r) + ".", { orphan: true });
    }
    if (!util.has(e, "list")) {
      problems.refuse(path, "A requirement entry has no list. Use [] for no requirements.");
      return;
    }
    if (!Array.isArray(e.list)) {
      problems.refuse(path + ".list", "list must be a flat array of opcode names and numbers, but it's " + util.typeName(e.list) + ".");
      return;
    }
    var shapeOk = true;
    e.list.forEach(function (t, k) {
      if (typeof t !== "string" && typeof t !== "number") {
        problems.refuse(path + ".list[" + k + "]", "A list holds only opcode names and numbers, but this is " + util.typeName(t) + ".");
        shapeOk = false;
      }
    });
    if (!shapeOk) return;
    listProblems(cat, typeOk ? e.type : null, e.list).forEach(function (p) {
      problems.error(path + ".list" + (p.index === null ? "" : "[" + p.index + "]"), p.message);
    });
  }

  // The problems of a flat requirement list, each with the index of the
  // token it's about (null for the list as a whole). Shared with the
  // requirement editor, which shows them beside rows.
  function listProblems(cat, type, list) {
    var out = [];
    function add(index, message) {
      out.push({ index: index, message: message });
    }
    var levelOpen = false;
    var atStart = true; // at the start of the list or of a sublist
    var lastOr = -1; // index of an `or` not yet followed by a condition
    var pending = null; // an opcode waiting for its parameter: { index, op }
    for (var k = 0; k < list.length; k++) {
      var t = list[k];
      if (pending) {
        var p = pending;
        pending = null;
        if (typeof t === "number") {
          var r = cat.limits[p.op.parameter];
          if (!isInt(t)) add(k, p.op.name + " needs a whole number, but it's " + t + ".");
          else if (r && !util.inRange(t, r)) add(k, p.op.name + " takes a " + p.op.parameter + ", and " + t + " is outside that range, " + rangeText(r) + ".");
          continue;
        }
        add(p.index, p.op.name + " needs a " + p.op.parameter + " after it.");
      }
      if (typeof t === "number") {
        if (!isInt(t)) add(k, "A unit ID must be a whole number, but it's " + t + ".");
        else if (!util.inRange(t, cat.limits.unit)) add(k, "Unit " + t + " is outside the unit range, " + rangeText(cat.limits.unit) + ".");
        atStart = false;
        lastOr = -1;
        continue;
      }
      var op = cat.opcodes.get(t);
      if (!op) {
        add(k, cat.title + " has no opcode called " + util.show(t) + ".");
        atStart = false;
        lastOr = -1;
        continue;
      }
      if (type && op.allowedIn.indexOf(type) < 0) {
        add(k, op.name + " can't be used in a " + TYPE_NAME[type] + " record.");
      }
      if (op.role === "or") {
        if (atStart) add(k, "or can't start a " + (levelOpen ? "level" : "list") + ".");
        else if (lastOr >= 0) add(k, "or can't follow another or.");
        lastOr = k;
        continue;
      }
      if (op.role === "level") {
        if (lastOr >= 0) add(lastOr, "or can't end a list or level.");
        if (levelOpen) add(k, op.name + " starts a level before the previous level has ended.");
        levelOpen = true;
        atStart = true;
        lastOr = -1;
        continue;
      }
      if (op.role === "endSublist") {
        if (lastOr >= 0) add(lastOr, "or can't end a list or level.");
        if (!levelOpen) add(k, op.name + " has no level to end.");
        levelOpen = false;
        atStart = false;
        lastOr = -1;
        continue;
      }
      if (op.parameter) pending = { index: k, op: op };
      atStart = false;
      lastOr = -1;
    }
    if (pending) add(pending.index, pending.op.name + " needs a " + pending.op.parameter + " after it.");
    if (lastOr >= 0) add(lastOr, "or can't end a list or level.");
    return out;
  }

  // ---- Constants

  function checkConstant(ctx, e, path) {
    var cat = ctx.cat;
    var problems = ctx.problems;
    unknownFields(e, ["name", "value", "option"], path, problems, "A constant entry");
    checkLabel(e, path, problems);
    if (!util.has(e, "name")) {
      problems.error(path, "A constant entry has no name.");
      return;
    }
    if (typeof e.name !== "string") {
      problems.error(path + ".name", "A constant's name must be text, but it's " + util.show(e.name) + ".");
      return;
    }
    var c = cat.constants.get(e.name);
    if (!c) {
      problems.error(path + ".name", cat.title + " has no constant called " + util.show(e.name) + ".", { orphan: true });
      return;
    }
    var hasValue = util.has(e, "value");
    var hasOption = util.has(e, "option");
    if (hasValue && hasOption) {
      problems.error(path, "The constant " + c.name + " has both a value and an option. Give exactly one.");
      return;
    }
    if (c.kind === "number") {
      if (hasOption) problems.error(path + ".option", "The constant " + c.name + " is a number, so it takes a value, not an option.");
      else if (!hasValue) problems.error(path, "The constant " + c.name + " has no value.");
      else if (!isInt(e.value)) problems.error(path + ".value", "The constant " + c.name + " must be a whole number, but it's " + util.show(e.value) + ".");
      else if (!util.inRange(e.value, c.range)) {
        problems.error(path + ".value", "The constant " + c.name + " is " + e.value + ", outside its range, " + rangeText(c.range) + ".");
      }
    } else {
      if (hasValue) problems.error(path + ".value", "The constant " + c.name + " is a choice of options, so it takes an option, not a value.");
      else if (!hasOption) problems.error(path, "The constant " + c.name + " has no option.");
      else if (
        !c.options.some(function (o) {
          return o.name === e.option;
        })
      ) {
        problems.error(path + ".option", "The constant " + c.name + " has no option " + util.show(e.option) + ". Its options are " + c.options.map(function (o) {
          return o.name;
        }).join(", ") + ".");
      }
    }
  }

  AG.core.validate = {
    check: check,
    checkHeader: checkHeader,
    listProblems: listProblems,
    PARTS: PARTS,
    REQUIREMENT_TYPES: REQUIREMENT_TYPES,
    TYPE_LIMIT: TYPE_LIMIT,
    TYPE_NAME: TYPE_NAME,
    VARIABLE_NAME: VARIABLE_NAME
  };
})(AxeGraft);
