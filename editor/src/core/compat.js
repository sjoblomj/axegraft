// How a mod would behave on each version of its game, predicted from the
// catalog. A mod names no version, but what it uses may be absent on some.
//
// For each version, the result is one of:
//   applies:  every change would be made
//   skipped:  every change but some constants, which are unknown or don't
//             apply there, and which the patcher skips
//   rejected: the mod uses a button set, table entry or function the version
//             lacks, so the patcher would refuse it there
// These never make a mod invalid. Entries that lead to a rejection get a
// warning, at the field that causes it.
"use strict";

(function (AG) {
  var util = AG.util;
  var isObject = util.isObject;
  var isInt = util.isInt;

  // "1.05-1.07, 1.10" for a list of version IDs, using the catalog's order.
  function versionText(cat, ids) {
    var idx = ids
      .map(function (v) {
        return cat.versionIds.indexOf(v);
      })
      .filter(function (i) {
        return i >= 0;
      })
      .sort(util.byNumber);
    var parts = [];
    for (var i = 0; i < idx.length; i++) {
      var start = idx[i];
      while (i + 1 < idx.length && idx[i + 1] === idx[i] + 1) i++;
      var a = cat.versions[start].label;
      var b = cat.versions[idx[i]].label;
      parts.push(start === idx[i] ? a : a + "–" + b);
    }
    return parts.join(", ");
  }

  // Consecutive versions that share a value, as [{ value, versions }], in
  // the catalog's order. `valueOf` gives the value on one version.
  function groupVersions(cat, valueOf) {
    var groups = [];
    cat.versionIds.forEach(function (v) {
      var value = valueOf(v);
      var last = groups[groups.length - 1];
      if (last && util.equal(last.value, value)) last.versions.push(v);
      else groups.push({ value: value, versions: [v] });
    });
    return groups;
  }

  // The heading of one of those groups: its versions, or "All versions"
  // when there's only one group.
  function groupLabel(cat, groups, g) {
    return groups.length > 1 ? versionText(cat, g.versions) : "All versions";
  }

  function absentOn(item) {
    return item && Array.isArray(item.absentOn) ? item.absentOn : [];
  }

  // Everything in the mod that some versions lack, as
  // { path, versions, what } with a description of what's missing.
  function uses(doc, cat) {
    var out = [];
    function add(path, versions, what) {
      if (versions.length) out.push({ path: path, versions: versions, what: what });
    }
    var bsField = cat.unitKind.buttonSet.name;
    AG.core.doc.entries(doc, "units").forEach(function (e, i) {
      if (!isObject(e) || !isInt(e.id)) return;
      var p = "units[" + i + "]";
      add(p + ".id", absentOn(cat.units.get(e.id)), "table entry " + e.id);
      if (util.has(e, bsField) && isInt(e[bsField])) add(p + "." + bsField, absentOn(cat.sets.get(e[bsField])), "set " + e[bsField]);
      ["statusChanged", "statusUpdate"].forEach(function (kind) {
        var f = cat.unitKind[kind];
        if (f && typeof e[f.name] === "string") add(p + "." + f.name, absentOn(cat.functions[kind].get(e[f.name])), e[f.name]);
      });
    });
    AG.core.doc.entries(doc, "button_sets").forEach(function (e, i) {
      if (!isObject(e) || !isInt(e.id)) return;
      var p = "button_sets[" + i + "]";
      add(p + ".id", absentOn(cat.sets.get(e.id)), "set " + e.id);
      if (!Array.isArray(e.buttons)) return;
      e.buttons.forEach(function (b, j) {
        if (!isObject(b)) return;
        var bp = p + ".buttons[" + j + "]";
        var who = " in button " + j + " of set " + e.id;
        [["condition", "conditions", "conditionVariable"], ["action", "actions", "actionVariable"]].forEach(function (k) {
          var f = cat.buttonKind[k[0]];
          var fn = cat.functions[k[1]].get(b[f.name]);
          if (!fn) return;
          add(bp + "." + f.name, absentOn(fn), k[0] + " " + fn.name + who);
          var vf = cat.buttonKind[k[2]];
          if (fn.variable === "tableEntry" && isInt(b[vf.name])) {
            add(bp + "." + vf.name, absentOn(cat.units.get(b[vf.name])), "table entry " + b[vf.name] + who);
          }
        });
      });
    });
    return out;
  }

  function report(doc, cat) {
    var used = uses(doc, cat);
    return cat.versions.map(function (v) {
      var causes = used
        .filter(function (u) {
          return u.versions.indexOf(v.id) >= 0;
        })
        .map(function (u) {
          return { path: u.path, message: v.label + " has no " + u.what + "." };
        });
      var skipped = [];
      AG.core.doc.entries(doc, "constants").forEach(function (e, i) {
        if (!isObject(e) || typeof e.name !== "string") return;
        var c = cat.constants.get(e.name);
        if (!c) return;
        var a = c.availability[v.id];
        if (a === "unknown") skipped.push({ path: "constants[" + i + "]", name: c.name, reason: "unknown", message: c.label + " hasn't been found in " + v.label + "." });
        if (a === "not_applicable") skipped.push({ path: "constants[" + i + "]", name: c.name, reason: "not_applicable", message: c.label + " doesn't apply to " + v.label + ", which lacks that code." });
      });
      return {
        version: v.id,
        label: v.label,
        result: causes.length ? "rejected" : skipped.length ? "skipped" : "applies",
        causes: causes,
        skipped: skipped
      };
    });
  }

  // Warnings for everything that would make some versions reject the mod.
  function warnings(doc, cat) {
    return uses(doc, cat).map(function (u) {
      var what = u.what.charAt(0).toUpperCase() + u.what.slice(1);
      return {
        severity: "warning",
        path: u.path,
        message: what + " isn't in " + versionText(cat, u.versions) + ", which will reject this mod.",
        compat: true,
        versions: u.versions
      };
    });
  }

  // A one-line summary: "applies on all 26 versions", or counts of each result.
  function summary(results) {
    var n = { applies: 0, skipped: 0, rejected: 0 };
    results.forEach(function (r) {
      n[r.result]++;
    });
    if (n.applies === results.length) return "Applies on all " + results.length + " versions";
    var parts = [];
    if (n.applies) parts.push(n.applies + " apply");
    if (n.skipped) parts.push(n.skipped + " skip constants");
    if (n.rejected) parts.push(n.rejected + " reject");
    return parts.join(", ");
  }

  AG.core.compat = {
    report: report,
    warnings: warnings,
    summary: summary,
    versionText: versionText,
    groupVersions: groupVersions,
    groupLabel: groupLabel,
    absentOn: absentOn
  };

  // All problems of a document: the format's rules, asset warnings and
  // version warnings.
  AG.core.problems = function (doc, cat, assets) {
    var list = AG.core.validate.check(doc, cat, assets);
    return list.concat(warnings(doc, cat));
  };
})(AxeGraft);
