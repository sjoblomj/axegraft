// Game catalogs: registering them, checking them and indexing them.
//
// A catalog file is one call, AxeGraft.registerCatalog({ ...JSON... }), so a
// conversion tool can write it by adding one wrapper line. docs/catalog-format.md
// documents the format. The check here is the one place that enforces it.
"use strict";

(function (AG) {
  var util = AG.util;
  var isObject = util.isObject;
  var isInt = util.isInt;

  var CATALOG_FORMATS = [1];
  var MOD_FORMATS = [1];
  var GAMES = ["starcraft", "warcraft2"];
  var PARTS = ["units", "button_sets", "requirements", "constants"];
  var LIMITS_REQUIRED = [
    "unit",
    "tableEntry",
    "buttonSet",
    "newButtonSet",
    "icon",
    "string",
    "position",
    "conditionVariable",
    "actionVariable"
  ];
  var LIMITS_OPTIONAL = ["tech", "upgrade", "order"];
  var BUTTON_KINDS = ["position", "icon", "string", "condition", "conditionVariable", "action", "actionVariable", "choice"];
  var BUTTON_KINDS_ONCE = ["position", "icon", "condition", "conditionVariable", "action", "actionVariable"];
  var UNIT_KINDS = ["buttonSet", "statusChanged", "statusUpdate", "unit", "icon", "string", "choice", "tableEntry"];
  var FUNCTION_LISTS = ["conditions", "actions", "statusChanged", "statusUpdate"];
  var VARIABLE_TYPES = ["unit", "tech", "upgrade", "number", "tableEntry"];
  var PARAMETER_TYPES = ["unit", "tech", "upgrade", "order"];
  var REQUIREMENT_TYPES = ["unit", "upgrade", "tech_research", "tech_use", "order"];
  var OPCODE_ROLES = ["or", "level", "endSublist"];
  var REFERS = ["unit", "tech", "upgrade", "order", "tableEntry"];
  var STATES = ["unknown", "not_applicable"];

  var TOP_KEYS = [
    "application",
    "catalogFormat",
    "modFormat",
    "game",
    "title",
    "sample",
    "parts",
    "versions",
    "limits",
    "panel",
    "buttonFields",
    "unitFields",
    "functions",
    "opcodes",
    "bareUnit",
    "units",
    "buttonSets",
    "upgrades",
    "techs",
    "orders",
    "requirements",
    "constants",
    "icons",
    "strings",
    "assets"
  ];

  // The range of IDs a requirement type uses.
  var TYPE_LIMIT = { unit: "unit", upgrade: "upgrade", tech_research: "tech", tech_use: "tech", order: "order" };

  function isText(v) {
    return typeof v === "string" && v.trim() !== "";
  }

  // Returns every problem with a catalog, as messages that start with the
  // catalog's name. An empty list means the catalog can be used.
  function checkCatalog(raw, name) {
    var problems = [];
    var label = name || (isObject(raw) && (raw.title || raw.game)) || "catalog";
    function problem(msg) {
      problems.push("Catalog " + label + ": " + msg);
    }

    if (!isObject(raw)) {
      problem("isn't an object");
      return problems;
    }

    Object.keys(raw).forEach(function (k) {
      if (TOP_KEYS.indexOf(k) < 0) problem('unknown property "' + k + '"');
    });

    // Format versions come first: a catalog of another format can't be read further.
    if (CATALOG_FORMATS.indexOf(raw.catalogFormat) < 0) {
      problem("catalogFormat " + util.show(raw.catalogFormat) + " isn't supported; this editor reads format " + CATALOG_FORMATS.join(", "));
      return problems;
    }
    if (MOD_FORMATS.indexOf(raw.modFormat) < 0) {
      problem("modFormat " + util.show(raw.modFormat) + " isn't supported; this editor writes mod format " + MOD_FORMATS.join(", "));
      return problems;
    }
    if (GAMES.indexOf(raw.game) < 0) problem("game " + util.show(raw.game) + " isn't one of " + GAMES.join(", "));
    if (!isText(raw.title)) problem("title is missing");
    if (raw.sample !== undefined && typeof raw.sample !== "boolean") problem("sample must be true or false");
    // `application` is only for people reading the file, so it isn't checked.

    // Parts
    var parts = Array.isArray(raw.parts) ? raw.parts : [];
    if (!Array.isArray(raw.parts) || !raw.parts.length) problem("parts must list the mod parts the game has");
    parts.forEach(function (p) {
      if (PARTS.indexOf(p) < 0) problem("parts names an unknown part " + util.show(p));
    });
    var hasRequirements = parts.indexOf("requirements") >= 0;

    // Versions
    var versionIds = [];
    if (!Array.isArray(raw.versions) || !raw.versions.length) {
      problem("versions must list at least one version");
    } else {
      raw.versions.forEach(function (v, i) {
        if (!isObject(v) || !isText(v.id) || !isText(v.label)) problem("versions[" + i + "] needs an id and a label");
        else if (versionIds.indexOf(v.id) >= 0) problem("version " + v.id + " is listed twice");
        else versionIds.push(v.id);
      });
    }
    function checkVersions(list, where) {
      if (list === undefined) return;
      if (!Array.isArray(list)) {
        problem(where + " must be a list of versions");
        return;
      }
      list.forEach(function (v) {
        if (versionIds.indexOf(v) < 0) problem(where + " names an unknown version " + util.show(v));
      });
    }

    // Limits
    var limits = isObject(raw.limits) ? raw.limits : {};
    if (!isObject(raw.limits)) problem("limits are missing");
    LIMITS_REQUIRED.concat(LIMITS_OPTIONAL).forEach(function (k) {
      var r = limits[k];
      if (r === undefined) {
        if (LIMITS_REQUIRED.indexOf(k) >= 0) problem("limits." + k + " is missing");
        return;
      }
      if (!isObject(r) || !isInt(r.min) || !isInt(r.max) || r.min > r.max || r.min < 0) {
        problem("limits." + k + " must be { min, max } with whole numbers, min no more than max");
      }
    });
    Object.keys(limits).forEach(function (k) {
      if (LIMITS_REQUIRED.indexOf(k) < 0 && LIMITS_OPTIONAL.indexOf(k) < 0) problem("limits has an unknown range " + util.show(k));
    });
    function range(k) {
      var r = limits[k];
      return isObject(r) && isInt(r.min) && isInt(r.max) ? r : null;
    }
    function needLimit(k, why) {
      if (!range(k)) problem(why + " needs limits." + k);
    }
    if (range("tableEntry") && range("newButtonSet") && range("newButtonSet").min !== range("tableEntry").max + 1) {
      problem("limits.newButtonSet must start at the table's size, " + (range("tableEntry").max + 1));
    }
    if (range("buttonSet") && range("newButtonSet") && range("newButtonSet").max > range("buttonSet").max) {
      problem("limits.newButtonSet must end within limits.buttonSet");
    }
    if (range("unit") && range("tableEntry") && range("unit").max > range("tableEntry").max) {
      problem("limits.unit must lie within limits.tableEntry");
    }

    if (!isObject(raw.panel) || !isInt(raw.panel.columns) || raw.panel.columns < 1) {
      problem("panel.columns must give the number of columns in the command panel");
    }
    if (isObject(raw.panel) && raw.panel.ascending !== undefined && typeof raw.panel.ascending !== "boolean") {
      problem("panel.ascending must be true or false");
    }
    var ascending = isObject(raw.panel) && raw.panel.ascending === true;

    // Button fields
    var buttonFields = Array.isArray(raw.buttonFields) ? raw.buttonFields : [];
    if (!Array.isArray(raw.buttonFields)) problem("buttonFields are missing");
    var fieldNames = {};
    var kindsSeen = {};
    buttonFields.forEach(function (f, i) {
      var where = "buttonFields[" + i + "]";
      if (!isObject(f) || !isText(f.name)) {
        problem(where + " needs a name");
        return;
      }
      where = "button field " + f.name;
      if (fieldNames[f.name]) problem(where + " is listed twice");
      fieldNames[f.name] = f;
      if (f.name === "label") problem("a button field can't be called label, which every object may have");
      if (BUTTON_KINDS.indexOf(f.kind) < 0) problem(where + " has an unknown kind " + util.show(f.kind));
      kindsSeen[f.kind] = (kindsSeen[f.kind] || 0) + 1;
      if (typeof f.required !== "boolean") problem(where + " must say whether it's required");
      if (!isText(f.label)) problem(where + " needs a label");
      if (!isText(f.help)) problem(where + " has no help text");
      if (f.kind === "conditionVariable" || f.kind === "actionVariable") {
        if (f.required) problem(where + " can't be required, because a variable may be left out");
      }
      if (f.kind === "choice") {
        if (!Array.isArray(f.options) || !f.options.length) problem(where + " needs options");
        else
          f.options.forEach(function (o, j) {
            if (!isObject(o) || !isInt(o.value) || !isText(o.label)) problem(where + " option " + j + " needs a whole number value and a label");
          });
      }
    });
    BUTTON_KINDS_ONCE.forEach(function (k) {
      if (kindsSeen[k] !== 1) problem("buttonFields must have exactly one field of kind " + k);
    });

    // Unit fields
    var unitFields = Array.isArray(raw.unitFields) ? raw.unitFields : [];
    if (!Array.isArray(raw.unitFields)) problem("unitFields are missing");
    var unitFieldKinds = {};
    unitFields.forEach(function (f, i) {
      if (!isObject(f) || !isText(f.name)) {
        problem("unitFields[" + i + "] needs a name");
        return;
      }
      var where = "unit field " + f.name;
      if (UNIT_KINDS.indexOf(f.kind) < 0) problem(where + " has an unknown kind " + util.show(f.kind));
      if (unitFieldKinds[f.kind]) problem("unitFields has two fields of kind " + f.kind);
      unitFieldKinds[f.kind] = f;
      if (!isText(f.label)) problem(where + " needs a label");
      if (!isText(f.help)) problem(where + " has no help text");
      if (f.kind === "choice") {
        if (!Array.isArray(f.options) || !f.options.length) problem(where + " needs options");
        else
          f.options.forEach(function (o, j) {
            if (!isObject(o) || !isInt(o.value) || !isText(o.label)) problem(where + " option " + j + " needs a whole number value and a label");
          });
      }
    });
    if (!unitFieldKinds.buttonSet) problem("unitFields must have a field of kind buttonSet");

    // Functions
    var functions = isObject(raw.functions) ? raw.functions : {};
    if (!isObject(raw.functions)) problem("functions are missing");
    var fnByList = {};
    FUNCTION_LISTS.forEach(function (list) {
      fnByList[list] = {};
      var fns = functions[list];
      if (!Array.isArray(fns)) {
        problem("functions." + list + " is missing");
        return;
      }
      fns.forEach(function (fn, i) {
        if (!isObject(fn) || !isText(fn.name)) {
          problem("functions." + list + "[" + i + "] needs a name");
          return;
        }
        var where = "function " + fn.name + " in functions." + list;
        if (fnByList[list][fn.name]) problem(where + " is listed twice");
        fnByList[list][fn.name] = fn;
        if (!isText(fn.label)) problem(where + " needs a label");
        if (fn.variable !== null && VARIABLE_TYPES.indexOf(fn.variable) < 0) {
          problem(where + " has an unknown variable type " + util.show(fn.variable) + "; use null for none");
        }
        if ((list === "statusChanged" || list === "statusUpdate") && fn.variable !== null) {
          problem(where + " can't read a variable");
        }
        if (fn.variable === "tech" || fn.variable === "upgrade") needLimit(fn.variable, where);
        checkVersions(fn.absentOn, where + " absentOn");
        if (fn.help !== undefined && !isText(fn.help)) problem(where + " has an empty help text");
      });
    });
    Object.keys(functions).forEach(function (k) {
      if (FUNCTION_LISTS.indexOf(k) < 0) problem("functions has an unknown list " + util.show(k));
    });

    // Opcodes and the bare unit row, for games with requirements
    var opByName = {};
    if (hasRequirements) {
      if (!Array.isArray(raw.opcodes) || !raw.opcodes.length) problem("opcodes are missing, but parts includes requirements");
      (raw.opcodes || []).forEach(function (op, i) {
        if (!isObject(op) || !isText(op.name)) {
          problem("opcodes[" + i + "] needs a name");
          return;
        }
        var where = "opcode " + op.name;
        if (opByName[op.name]) problem(where + " is listed twice");
        opByName[op.name] = op;
        if (!isText(op.label)) problem(where + " needs a label");
        if (op.parameter !== null && PARAMETER_TYPES.indexOf(op.parameter) < 0) {
          problem(where + " has an unknown parameter type " + util.show(op.parameter) + "; use null for none");
        }
        if (op.parameter) needLimit(op.parameter, where);
        if (!Array.isArray(op.allowedIn) || !op.allowedIn.length) problem(where + " must list the record types it's allowed in");
        else
          op.allowedIn.forEach(function (t) {
            if (REQUIREMENT_TYPES.indexOf(t) < 0) problem(where + " names an unknown record type " + util.show(t));
          });
        if (op.role !== undefined && OPCODE_ROLES.indexOf(op.role) < 0) problem(where + " has an unknown role " + util.show(op.role));
        if (op.role && op.parameter) problem(where + " has a structural role, so it can't take a parameter");
        if (op.help !== undefined && !isText(op.help)) problem(where + " has an empty help text");
      });
      ["or", "endSublist"].forEach(function (role) {
        var n = (raw.opcodes || []).filter(function (op) {
          return isObject(op) && op.role === role;
        }).length;
        if (n !== 1) problem("opcodes must have exactly one with the role " + role);
      });
      if (!isObject(raw.bareUnit) || !isText(raw.bareUnit.label) || !isText(raw.bareUnit.help)) {
        problem("bareUnit needs a label and a help text, because the game has requirements");
      }
      ["upgrade", "tech", "order"].forEach(function (k) {
        needLimit(k, "requirements");
      });
    } else {
      if (raw.opcodes !== undefined) problem("opcodes are given, but parts doesn't include requirements");
      if (raw.requirements !== undefined) problem("requirements are given, but parts doesn't include requirements");
    }

    // Named things: upgrades, techs, orders
    function checkNamed(listName, rangeKey) {
      var list = raw[listName];
      var ids = {};
      if (list === undefined) return ids;
      if (!Array.isArray(list)) {
        problem(listName + " must be a list");
        return ids;
      }
      needLimit(rangeKey, listName);
      list.forEach(function (item, i) {
        if (!isObject(item) || !isInt(item.id) || !isText(item.name) || !Array.isArray(item.tree)) {
          problem(listName + "[" + i + "] needs an id, a name and a tree");
          return;
        }
        if (ids[item.id]) problem(listName + " lists " + item.id + " twice");
        ids[item.id] = item;
        if (range(rangeKey) && !util.inRange(item.id, range(rangeKey))) problem(listName + " " + item.id + " is outside limits." + rangeKey);
      });
      return ids;
    }
    checkNamed("upgrades", "upgrade");
    checkNamed("techs", "tech");
    checkNamed("orders", "order");

    // Button sets
    var setById = {};
    var sets = Array.isArray(raw.buttonSets) ? raw.buttonSets : [];
    if (!Array.isArray(raw.buttonSets)) problem("buttonSets are missing");
    sets.forEach(function (set, i) {
      if (!isObject(set) || !isInt(set.id)) {
        problem("buttonSets[" + i + "] needs an id");
        return;
      }
      var where = "button set " + set.id;
      if (setById[set.id]) problem(where + " is listed twice");
      setById[set.id] = set;
      if (!isText(set.name)) problem(where + " needs a name");
      if (!Array.isArray(set.tree)) problem(where + " needs a tree");
      if (range("tableEntry") && !util.inRange(set.id, range("tableEntry"))) problem(where + " isn't a table entry, so it can't be an original set");
      if (!Array.isArray(set.entries) || !set.entries.length) {
        problem(where + " must list the table entries that point at it");
      } else {
        var lowest = Math.min.apply(null, set.entries);
        if (lowest !== set.id) problem(where + " must take the ID of the lowest table entry pointing at it, " + lowest);
      }
      checkVersions(set.absentOn, where + " absentOn");
      // One list for every version, or { default, perVersion } like a requirement record.
      if (Array.isArray(set.original)) {
        checkButtons(set.original, where);
      } else if (isObject(set.original) && util.has(set.original, "default")) {
        checkButtons(set.original["default"], where);
        if (set.original.perVersion !== undefined) {
          if (!isObject(set.original.perVersion)) problem(where + " perVersion must be an object");
          else
            Object.keys(set.original.perVersion).forEach(function (v) {
              if (versionIds.indexOf(v) < 0) problem(where + " perVersion names an unknown version " + util.show(v));
              checkButtons(set.original.perVersion[v], where + " on " + v);
            });
        }
      } else {
        problem(where + " needs its original buttons");
      }
    });

    function checkButtons(list, where) {
      if (!Array.isArray(list)) {
        problem(where + " needs its original buttons");
        return;
      }
      list.forEach(function (b, j) {
        checkButton(b, where + " button " + j);
      });
      if (ascending) {
        var posField = fieldOfKind("position");
        var bad = posField ? firstOutOfOrder(list, posField.name) : -1;
        if (bad >= 0) {
          problem(where + " isn't in ascending position order: button " + bad + " at position " + list[bad][posField.name] + " follows position " + list[bad - 1][posField.name]);
        }
      }
    }

    function checkButton(b, where) {
      if (!isObject(b)) {
        problem(where + " isn't an object");
        return;
      }
      Object.keys(b).forEach(function (k) {
        if (!fieldNames[k]) problem(where + " has a field the catalog doesn't define: " + k);
      });
      buttonFields.forEach(function (f) {
        if (!isObject(f)) return;
        var v = b[f.name];
        if (v === undefined) {
          if (f.required) problem(where + " is missing " + f.name);
          return;
        }
        if (f.kind === "condition" || f.kind === "action") {
          var list = f.kind === "condition" ? "conditions" : "actions";
          if (!fnByList[list] || !fnByList[list][v]) problem(where + " names " + f.kind + " " + util.show(v) + ", which the catalog doesn't list");
          return;
        }
        if (f.kind === "choice") {
          var ok = (f.options || []).some(function (o) {
            return o.value === v;
          });
          if (!ok) problem(where + " has " + f.name + " " + util.show(v) + ", which isn't one of its options");
          return;
        }
        var r = range(f.kind === "position" ? "position" : f.kind);
        if (r && !util.inRange(v, r)) problem(where + " has " + f.name + " " + util.show(v) + ", outside limits." + f.kind);
      });
      // A function that reads a variable needs one.
      [
        ["condition", "conditions", "conditionVariable"],
        ["action", "actions", "actionVariable"]
      ].forEach(function (k) {
        var fnField = fieldOfKind(k[0]);
        var varField = fieldOfKind(k[2]);
        if (!fnField || !varField) return;
        var fn = fnByList[k[1]] && fnByList[k[1]][b[fnField.name]];
        if (fn && fn.variable && b[varField.name] === undefined) problem(where + " has no " + varField.name + ", which " + fn.name + " reads");
      });
    }
    function fieldOfKind(kind) {
      for (var i = 0; i < buttonFields.length; i++) if (isObject(buttonFields[i]) && buttonFields[i].kind === kind) return buttonFields[i];
      return null;
    }

    // Units: every entry of the button table
    var unitById = {};
    var units = Array.isArray(raw.units) ? raw.units : [];
    if (!Array.isArray(raw.units)) problem("units are missing");
    units.forEach(function (u, i) {
      if (!isObject(u) || !isInt(u.id)) {
        problem("units[" + i + "] needs an id");
        return;
      }
      var where = "table entry " + u.id;
      if (unitById[u.id]) problem(where + " is listed twice");
      unitById[u.id] = u;
      if (!isText(u.name)) problem(where + " needs a name");
      if (!Array.isArray(u.tree)) problem(where + " needs a tree");
      if (range("tableEntry") && !util.inRange(u.id, range("tableEntry"))) problem(where + " is outside limits.tableEntry");
      if (u.icon !== undefined && (!isInt(u.icon) || (range("icon") && !util.inRange(u.icon, range("icon"))))) problem(where + " has an icon that isn't an icon ID within limits.icon");
      checkVersions(u.absentOn, where + " absentOn");
      if (!isObject(u.original)) {
        problem(where + " needs its original values");
        return;
      }
      var isUnit = range("unit") && util.inRange(u.id, range("unit"));
      Object.keys(u.original).forEach(function (k) {
        var f = unitFields.filter(function (uf) {
          return isObject(uf) && uf.name === k;
        })[0];
        if (!f) problem(where + " has an original value for an unknown field " + k);
        else if (!isUnit && f.kind !== "buttonSet") problem(where + " isn't a unit, so it has only an original " + unitFieldKinds.buttonSet.name);
      });
      unitFields.forEach(function (f) {
        if (!isObject(f)) return;
        if (!isUnit && f.kind !== "buttonSet") return;
        var v = u.original[f.name];
        if (v === undefined) {
          problem(where + " has no original " + f.name);
          return;
        }
        if (f.kind === "buttonSet") {
          if (v === null) return;
          if (!setById[v]) problem(where + " has an original " + f.name + " " + util.show(v) + ", which isn't a listed set");
          else if (!Array.isArray(setById[v].entries) || setById[v].entries.indexOf(u.id) < 0) {
            problem(where + " has an original " + f.name + " " + v + ", but set " + v + " doesn't list entry " + u.id);
          }
        } else if (f.kind === "statusChanged" || f.kind === "statusUpdate") {
          if (!fnByList[f.kind] || !fnByList[f.kind][v]) problem(where + " has an original " + f.name + " " + util.show(v) + ", which the catalog doesn't list");
        } else if (f.kind === "unit") {
          if (range("unit") && !util.inRange(v, range("unit"))) problem(where + " has an original " + f.name + " outside limits.unit");
        } else if (f.kind === "icon" || f.kind === "string") {
          if (!isInt(v) || (range(f.kind) && !util.inRange(v, range(f.kind)))) problem(where + " has an original " + f.name + " that isn't an ID within limits." + f.kind);
        } else if (f.kind === "choice") {
          var known = Array.isArray(f.options) && f.options.some(function (o) {
            return isObject(o) && o.value === v;
          });
          if (!known) problem(where + " has an original " + f.name + " " + util.show(v) + ", which isn't one of its options");
        } else if (f.kind === "tableEntry") {
          if (v !== null && (!isInt(v) || (range("tableEntry") && !util.inRange(v, range("tableEntry"))))) problem(where + " has an original " + f.name + " that is neither null nor within limits.tableEntry");
        }
      });
    });
    // Each set's list of table entries must agree with those entries' original sets.
    sets.forEach(function (set) {
      if (!isObject(set) || !Array.isArray(set.entries)) return;
      set.entries.forEach(function (e) {
        var u = unitById[e];
        var bsField = unitFieldKinds.buttonSet;
        if (!u) problem("button set " + set.id + " lists table entry " + util.show(e) + ", which isn't in units");
        else if (bsField && isObject(u.original) && u.original[bsField.name] !== set.id) {
          problem("button set " + set.id + " lists table entry " + e + ", but that entry's original " + bsField.name + " is " + util.show(u.original[bsField.name]));
        }
      });
    });
    // A complete catalog lists every entry of the table. A sample may list a few.
    if (raw.sample !== true && range("tableEntry")) {
      var missing = [];
      for (var id = range("tableEntry").min; id <= range("tableEntry").max; id++) if (!unitById[id]) missing.push(id);
      if (missing.length) problem("units must list every table entry, but " + missing.length + " are missing, starting with " + missing[0]);
    }

    // Requirements
    var reqSeen = {};
    (Array.isArray(raw.requirements) ? raw.requirements : []).forEach(function (r, i) {
      if (!isObject(r) || REQUIREMENT_TYPES.indexOf(r.type) < 0 || !isInt(r.id)) {
        problem("requirements[" + i + "] needs a type and an id");
        return;
      }
      var where = r.type + " " + r.id + " requirement record";
      var key = r.type + ":" + r.id;
      if (reqSeen[key]) problem(where + " is listed twice");
      reqSeen[key] = true;
      var lim = range(TYPE_LIMIT[r.type]);
      if (lim && !util.inRange(r.id, lim)) problem(where + " has an id outside limits." + TYPE_LIMIT[r.type]);
      if (!isObject(r.original) || !util.has(r.original, "default")) {
        problem(where + " needs original.default");
        return;
      }
      checkList(r.original["default"], r.type, where);
      if (r.original.perVersion !== undefined) {
        if (!isObject(r.original.perVersion)) problem(where + " perVersion must be an object");
        else
          Object.keys(r.original.perVersion).forEach(function (v) {
            if (versionIds.indexOf(v) < 0) problem(where + " perVersion names an unknown version " + util.show(v));
            checkList(r.original.perVersion[v], r.type, where + " on " + v);
          });
      }
    });
    if (raw.requirements !== undefined && !Array.isArray(raw.requirements)) problem("requirements must be a list");
    function checkList(list, type, where) {
      if (list === null) return;
      if (!Array.isArray(list)) {
        problem(where + " must be a list, or null for no record");
        return;
      }
      list.forEach(function (t, j) {
        if (typeof t === "string") {
          var op = opByName[t];
          if (!op) problem(where + " uses opcode " + util.show(t) + ", which the catalog doesn't list");
          else if (Array.isArray(op.allowedIn) && op.allowedIn.indexOf(type) < 0) problem(where + " uses " + t + ", which isn't allowed in " + type + " records");
        } else if (!isInt(t) || t < 0) {
          problem(where + " has " + util.show(t) + " at " + j + ", which is neither an opcode nor an ID");
        }
      });
    }

    // Constants
    var constNames = {};
    var constants = raw.constants === undefined ? [] : raw.constants;
    if (!Array.isArray(constants)) {
      problem("constants must be a list");
      constants = [];
    }
    if (parts.indexOf("constants") >= 0 && raw.constants === undefined) problem("constants are missing, but parts includes constants");
    constants.forEach(function (c, i) {
      if (!isObject(c) || !isText(c.name)) {
        problem("constants[" + i + "] needs a name");
        return;
      }
      var where = "constant " + c.name;
      if (constNames[c.name]) problem(where + " is listed twice");
      constNames[c.name] = c;
      if (!isText(c.label)) problem(where + " needs a label");
      if (!Array.isArray(c.group)) problem(where + " needs a group");
      if (!isText(c.help)) problem(where + " has no help text");
      if (c.note !== undefined && !isText(c.note)) problem(where + " has an empty note");
      var optionNames = [];
      if (c.kind === "number") {
        if (!isObject(c.range) || !isInt(c.range.min) || !isInt(c.range.max) || c.range.min > c.range.max) {
          problem(where + " needs a range { min, max }");
        }
        if (c.options !== undefined) problem(where + " is a number, so it has no options");
        if (c.refers !== undefined) {
          if (REFERS.indexOf(c.refers) < 0) problem(where + " refers to an unknown kind " + util.show(c.refers));
          else needLimit(c.refers, where);
        }
      } else if (c.kind === "option") {
        if (!Array.isArray(c.options) || c.options.length < 2) problem(where + " needs at least two options");
        else
          c.options.forEach(function (o, j) {
            if (!isObject(o) || !isText(o.name) || !isText(o.label)) problem(where + " option " + j + " needs a name and a label");
            else if (STATES.indexOf(o.name) >= 0) problem(where + " can't have an option called " + o.name);
            else optionNames.push(o.name);
          });
        if (c.range !== undefined || c.refers !== undefined) problem(where + " is an option, so it has no range");
      } else {
        problem(where + " has an unknown kind " + util.show(c.kind) + "; use number or option");
      }
      if (!isObject(c.availability)) {
        problem(where + " needs availability for every version");
        return;
      }
      versionIds.forEach(function (v) {
        if (!util.has(c.availability, v)) problem(where + " doesn't say what version " + v + " has");
      });
      Object.keys(c.availability).forEach(function (v) {
        var a = c.availability[v];
        if (versionIds.indexOf(v) < 0) problem(where + " availability names an unknown version " + util.show(v));
        if (STATES.indexOf(a) >= 0) return;
        if (c.kind === "number" && !(isObject(c.range) && util.inRange(a, c.range))) {
          problem(where + " has an original value " + util.show(a) + " on " + v + ", outside its range");
        }
        if (c.kind === "option" && optionNames.indexOf(a) < 0) problem(where + " has an original option " + util.show(a) + " on " + v + ", which isn't one of its options");
      });
    });

    // Names of icons and strings
    ["icons", "strings"].forEach(function (k) {
      if (raw[k] === undefined) return;
      if (!isObject(raw[k])) {
        problem(k + " must map IDs to names");
        return;
      }
      Object.keys(raw[k]).forEach(function (id) {
        if (!/^(0|[1-9][0-9]*)$/.test(id) || !isText(raw[k][id])) problem(k + " entry " + util.show(id) + " must map an ID to a name");
      });
    });

    if (raw.assets !== undefined) {
      var a = raw.assets;
      if (!isObject(a)) problem("assets must be an object");
      else {
        if (!Array.isArray(a.archives)) problem("assets.archives must list archive names, highest priority first");
        if (a.icons !== undefined && (!isObject(a.icons) || !isText(a.icons.file))) problem("assets.icons needs a file");
        if (isObject(a.icons) && a.icons.palette !== undefined) {
          var pal = a.icons.palette;
          if (!isObject(pal) || !isText(pal.file) || ["pal", "wpe", "pcx", "ppl"].indexOf(pal.format) < 0) {
            problem("assets.icons.palette needs a file and a format: pal, wpe, pcx or ppl");
          } else if (pal.remap !== undefined && !isText(pal.remap)) problem("assets.icons.palette.remap must name a PCX file");
        }
        if (a.strings !== undefined && (!isObject(a.strings) || !isText(a.strings.file))) problem("assets.strings needs a file");
      }
    }

    return problems;
  }

  // The index of the first button whose position is lower than the one
  // before it, or -1 if the list is in ascending order. Equal positions are allowed.
  function firstOutOfOrder(list, posName) {
    for (var i = 1; i < list.length; i++) {
      var a = isObject(list[i - 1]) ? list[i - 1][posName] : undefined;
      var b = isObject(list[i]) ? list[i][posName] : undefined;
      if (isInt(a) && isInt(b) && b < a) return i;
    }
    return -1;
  }

  // A set's original buttons in one form: { default, perVersion }.
  function normalOriginal(original) {
    if (Array.isArray(original)) return util.freeze({ "default": original, perVersion: {} });
    return util.freeze({ "default": original["default"], perVersion: original.perVersion || {} });
  }

  // Builds lookups for a checked catalog. The raw data is kept as it is.
  function indexCatalog(raw, source) {
    function map(list, key) {
      var m = new Map();
      (list || []).forEach(function (x) {
        m.set(x[key || "id"], x);
      });
      return m;
    }
    function byKind(fields) {
      var out = {};
      fields.forEach(function (f) {
        if (!out[f.kind]) out[f.kind] = f;
      });
      return out;
    }
    var cat = {
      raw: util.freeze(raw),
      source: source || null,
      game: raw.game,
      title: raw.title,
      sample: raw.sample === true,
      parts: raw.parts.slice(),
      versions: raw.versions,
      versionIds: raw.versions.map(function (v) {
        return v.id;
      }),
      limits: raw.limits,
      panel: raw.panel,
      buttonFields: raw.buttonFields,
      buttonField: map(raw.buttonFields, "name"),
      buttonKind: byKind(raw.buttonFields),
      unitFields: raw.unitFields,
      unitField: map(raw.unitFields, "name"),
      unitKind: byKind(raw.unitFields),
      functions: {},
      functionLists: raw.functions,
      opcodes: map(raw.opcodes, "name"),
      opcodeList: raw.opcodes || [],
      bareUnit: raw.bareUnit || null,
      units: map(raw.units),
      sets: map(raw.buttonSets),
      upgrades: map(raw.upgrades),
      techs: map(raw.techs),
      orders: map(raw.orders),
      requirements: new Map(),
      constants: map(raw.constants, "name"),
      constantList: raw.constants || [],
      icons: raw.icons || {},
      strings: raw.strings || {},
      assets: raw.assets || null,
      // The set each table entry points at originally (null for none).
      entrySet: new Map(),
      // Each set's original buttons as { default, perVersion }, whichever form the catalog uses.
      setOriginals: new Map()
    };
    FUNCTION_LISTS.forEach(function (list) {
      cat.functions[list] = map(raw.functions[list], "name");
    });
    (raw.requirements || []).forEach(function (r) {
      cat.requirements.set(r.type + ":" + r.id, r);
    });
    (raw.buttonSets || []).forEach(function (set) {
      cat.setOriginals.set(set.id, normalOriginal(set.original));
    });
    var bs = cat.unitKind.buttonSet.name;
    (raw.units || []).forEach(function (u) {
      cat.entrySet.set(u.id, u.original[bs]);
    });
    cat.has = function (part) {
      return cat.parts.indexOf(part) >= 0;
    };
    return cat;
  }

  var registry = { registered: [], missing: [] };

  function scriptName() {
    var s = typeof document !== "undefined" && document.currentScript;
    var src = (s && s.src) || AG.currentScript;
    return src ? decodeURIComponent(src.split("/").pop()) : null;
  }

  // Called by each catalog file.
  AG.registerCatalog = function (raw) {
    registry.registered.push({ raw: raw, source: scriptName() });
  };

  // Called by a catalog script tag that fails to load.
  AG.catalogMissing = function (src, why) {
    registry.missing.push({ name: decodeURIComponent(String(src).split("/").pop()), why: why || "the file couldn't be loaded" });
  };

  // A catalog file that loads but doesn't run, such as one with a syntax
  // error, calls neither registerCatalog nor onerror, so its error is caught here.
  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("error", function (e) {
      if (e && e.filename && /\/catalog\/[^/]+\.js$/.test(e.filename)) {
        AG.catalogMissing(e.filename, "the file couldn't be run: " + e.message);
      }
    });
  }

  // Checks every registered catalog. Returns usable catalogs by game, and
  // the problems of those that can't be used.
  function loadCatalogs(entries, missing) {
    var games = {};
    var errors = [];
    (missing || []).forEach(function (m) {
      var name = typeof m === "string" ? m : m.name;
      var why = (typeof m === "string" ? null : m.why) || "the file couldn't be loaded";
      errors.push({ catalog: name, problems: ["Catalog " + name + ": " + why] });
    });
    entries.forEach(function (e) {
      var name = e.source || (isObject(e.raw) && (e.raw.title || e.raw.game)) || "catalog";
      var problems;
      try {
        problems = checkCatalog(e.raw, name);
      } catch (err) {
        problems = ["Catalog " + name + ": the check failed: " + err.message];
      }
      if (!problems.length && games[e.raw.game]) {
        problems = ["Catalog " + name + ": a catalog for " + e.raw.game + " is already loaded, from " + (games[e.raw.game].source || games[e.raw.game].title)];
      }
      if (problems.length) errors.push({ catalog: name, problems: problems });
      else games[e.raw.game] = indexCatalog(util.clone(e.raw), e.source);
    });
    return { games: games, errors: errors };
  }

  AG.core.catalog = {
    GAMES: GAMES,
    REQUIREMENT_TYPES: REQUIREMENT_TYPES,
    TYPE_LIMIT: TYPE_LIMIT,
    firstOutOfOrder: firstOutOfOrder,
    check: checkCatalog,
    index: indexCatalog,
    load: loadCatalogs,
    registry: registry,
    loadRegistered: function () {
      var missing = registry.missing.slice();
      // A catalog script that ran without registering a catalog, and without
      // an error event that named it, still has to be reported.
      if (typeof document !== "undefined") {
        Array.prototype.forEach.call(document.querySelectorAll('script[src*="catalog/"]'), function (s) {
          var name = decodeURIComponent(s.src.split("/").pop());
          var known =
            registry.registered.some(function (r) {
              return r.source === name;
            }) ||
            missing.some(function (m) {
              return m.name === name;
            });
          if (!known) missing.push({ name: name, why: "the file didn't register a catalog; it may have a syntax error" });
        });
      }
      return loadCatalogs(registry.registered, missing);
    }
  };
})(AxeGraft);
