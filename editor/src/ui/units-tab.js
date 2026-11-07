// The Units tab: a table entry's button set and, for units, its status
// functions and status unit type.
"use strict";

(function (AG) {
  var h = AG.ui.h;
  var help = AG.ui.help;
  var F = AG.ui.fields;
  var D = AG.core.doc;
  var util = AG.util;

  // Every set a field can name: the catalog's sets and the mod's new sets.
  function setItems(app) {
    var cat = app.cat();
    var doc = app.doc();
    var items = cat.raw.buttonSets.map(function (s) {
      return { id: s.id, label: D.setText(cat, s.id, doc) };
    });
    D.entries(doc, "button_sets").forEach(function (e) {
      if (util.isObject(e) && util.isInt(e.id) && util.inRange(e.id, cat.limits.newButtonSet)) {
        items.push({ id: e.id, label: D.setText(cat, e.id, doc) });
      }
    });
    return items.sort(function (a, b) {
      return a.id - b.id;
    });
  }

  function unitItems(app) {
    var cat = app.cat();
    var doc = app.doc();
    return cat.raw.units
      .filter(function (u) {
        return util.inRange(u.id, cat.limits.unit);
      })
      .map(function (u) {
        return { id: u.id, label: u.id + " " + D.itemName(cat, "unit", u.id, doc) };
      })
      .sort(function (a, b) {
        return a.id - b.id;
      });
  }

  function functionOptions(cat, kind) {
    var opts = [];
    cat.functions[kind].forEach(function (fn) {
      opts.push({ value: fn.name, label: fn.label + " (" + fn.name + ")" });
    });
    return opts;
  }

  function iconLabel(cat, id) {
    return cat.icons[id] ? id + " " + cat.icons[id] : String(id);
  }

  function stringLabel(app, id) {
    var text = app.assets && app.assets.string ? app.assets.string(app.state.game, id) : null;
    var name = text !== null && text !== undefined ? AG.core.tbl.name(text) : app.cat().strings[id];
    return name ? id + " " + name : String(id);
  }

  function setLabel(app, id) {
    if (id === null) return "no buttons";
    if (id === undefined) return "not in the catalog";
    return D.setText(app.cat(), id, app.doc());
  }

  function panel(app, key) {
    var cat = app.cat();
    var id = AG.core.tree.parseKey(key).id;
    var doc = app.doc();
    var eff = D.effectiveUnit(doc, cat, id);
    var unit = cat.units.get(id);
    var isUnit = util.inRange(id, cat.limits.unit);
    var problems = app.problemsAt(function (l) {
      return l.key === key;
    });
    function at(field) {
      return app.problemsAt(function (l) {
        return l.key === key && l.field === field;
      });
    }
    var changed = Object.keys(eff).some(function (f) {
      return eff[f].changed;
    });

    var fields = D.unitFieldsFor(cat, id).map(function (f) {
      var e = eff[f.name];
      var fieldKey = "unit:" + id + ":" + f.name;
      function set(v) {
        app.edit(function (d) {
          return D.setUnitField(d, cat, id, f.name, v);
        });
      }
      var revert = function () {
        app.edit(function (d) {
          return D.revertUnitField(d, cat, id, f.name);
        });
      };
      var controls;
      var extra = [];
      var original;
      var helpText = f.help;
      if (f.kind === "buttonSet") {
        controls = F.idPicker(setItems(app), e.value, set, { allowNone: true, noneLabel: "No buttons", label: f.label });
        helpText += " " + help.text("nameSelect") + " " + help.text("idInput") + " " + help.text("noButtons");
        original = e.hasOriginal ? setLabel(app, e.original) : null;
        if (util.isInt(e.value) && (cat.sets.has(e.value) || util.inRange(e.value, cat.limits.newButtonSet))) {
          extra.push(
            F.withHelp(
              h("button", { type: "button", class: "small", dataset: { action: "go-to-set" }, onclick: function () {
                app.select("button_sets", AG.core.tree.key.set(e.value));
              } }, "Edit set " + e.value),
              help.text("goToSet")
            )
          );
        }
        extra.push(
          F.withHelp(
            h("button", { type: "button", class: "small", dataset: { action: "own-set" }, disabled: D.nextNewSet(doc, cat) === null, onclick: function () {
              var made = null;
              app.edit(function (d) {
                made = D.separateUnit(d, cat, id);
                return made.doc;
              });
              if (made) app.select("units", key);
            } }, "Give it its own set"),
            help.text("ownSet")
          )
        );
      } else if (f.kind === "statusChanged" || f.kind === "statusUpdate") {
        controls = [F.select(functionOptions(cat, f.kind), e.value, set, { class: "ctl wide", "aria-label": f.label })];
        var fnOrig = e.hasOriginal ? cat.functions[f.kind].get(e.original) : null;
        original = e.hasOriginal ? (fnOrig ? fnOrig.label + " (" + fnOrig.name + ")" : e.original) : null;
        var fn = cat.functions[f.kind].get(e.value);
        if (fn && fn.help) helpText += " " + fn.help;
      } else if (f.kind === "icon") {
        controls = F.idPicker(AG.ui.buttonSets.mapItems(cat.icons), e.value, set, { label: f.label });
        helpText += " " + help.text("nameSelect") + " " + help.text("idInput");
        original = e.hasOriginal ? iconLabel(cat, e.original) : null;
        extra.push(h("span", { class: "icon-preview" }, [AG.ui.buttonSets.iconEl(app, e.value)]));
        if (AG.ui.iconPicker && app.assets && app.assets.hasIcons && app.assets.hasIcons(app.state.game)) {
          extra.push(F.withHelp(h("button", { type: "button", class: "small", dataset: { action: "pick-icon" }, onclick: function () {
            AG.ui.iconPicker.show(app, e.value, set);
          } }, "Choose icon..."), help.text("pickIcon")));
        }
      } else if (f.kind === "string") {
        var hasTable = !!(app.assets && app.assets.strings && app.assets.strings(app.state.game));
        controls = F.idPicker(AG.ui.buttonSets.stringItems(app), e.value, set, { label: f.label, unknownLabel: hasTable ? "(not in the string table)" : null });
        helpText += " " + help.text("nameSelect") + " " + help.text("idInput");
        original = e.hasOriginal ? stringLabel(app, e.original) : null;
      } else if (f.kind === "choice") {
        var choices = f.options.map(function (o) {
          return { value: o.value, label: o.value + " " + o.label };
        });
        controls = [F.select(choices, e.value, set, { class: "ctl wide", "aria-label": f.label })];
        var origChoice = e.hasOriginal ? choices.filter(function (o) {
          return o.value === e.original;
        })[0] : null;
        original = e.hasOriginal ? (origChoice ? origChoice.label : String(e.original)) : null;
      } else if (f.kind === "tableEntry") {
        controls = F.idPicker(AG.ui.buttonSets.entryItems(app), e.value, set, { allowNone: true, noneLabel: "None", label: f.label });
        helpText += " " + help.text("nameSelect") + " " + help.text("idInput");
        var origEntry = e.hasOriginal && util.isInt(e.original) ? cat.units.get(e.original) : null;
        original = e.hasOriginal ? (e.original === null ? "none" : e.original + (origEntry ? " " + D.itemName(cat, "unit", e.original, doc) : "")) : null;
        if (util.isInt(e.value) && e.value !== id && cat.units.has(e.value)) {
          extra.push(
            F.withHelp(
              h("button", { type: "button", class: "small", dataset: { action: "go-to-entry" }, onclick: function () {
                app.select("units", AG.core.tree.key.unit(e.value));
              } }, "Go to entry " + e.value),
              help.text("jump")
            )
          );
        }
      } else {
        controls = F.idPicker(unitItems(app), e.value, set, { label: f.label });
        helpText += " " + help.text("nameSelect") + " " + help.text("idInput");
        original = e.hasOriginal ? String(e.original) : null;
      }
      return F.field({
        label: f.label,
        help: helpText,
        controls: controls,
        extra: extra,
        key: fieldKey,
        changed: e.changed,
        problems: at(f.name),
        original: original,
        revert: revert
      });
    });

    // The button set and the equivalent entry are in the button table's
    // entry; the other fields are in the status panel's.
    var entryFields = [];
    var statusFields = [];
    D.unitFieldsFor(cat, id).forEach(function (f, i) {
      (f.kind === "buttonSet" || f.kind === "tableEntry" ? entryFields : statusFields).push(fields[i]);
    });

    // Problems of the entry as a whole, such as one with nothing to change.
    var general = problems.filter(function (p) {
      var l = AG.core.tree.locate(doc, cat, p.path);
      return !l.field || l.field === "id" || l.field === "label";
    });

    // The unit's icon, when the catalog names one and its image is available.
    // A game whose units have an icon field shows it there instead.
    var iconUrl = !cat.unitKind.icon && unit && util.isInt(unit.icon) && app.assets && app.assets.iconURL ? app.assets.iconURL(app.state.game, unit.icon) : null;

    return h("div", { class: "units-panel", dataset: { unit: id } }, [
      h("h2", { class: "panel-title" }, [
        iconUrl ? h("img", { class: "unit-icon", src: iconUrl, alt: "", dataset: { unitIcon: unit.icon } }) : null,
        F.nameTitle(app, { kind: "unit", id: id, prefix: id, fallback: "Table entry " + id }),
        h("span", { class: "sub", text: isUnit ? "Unit" : "Table entry that isn't a unit, so it has only a button set" }),
        changed
          ? F.withHelp(
              h("button", { type: "button", class: "small", dataset: { action: "revert-unit" }, onclick: function () {
                app.edit(function (d) {
                  return D.revertUnit(d, cat, id);
                });
              } }, "Revert entry"),
              help.text("revertItem")
            )
          : null
      ]),
      general.length
        ? h(
            "div",
            { class: "field" },
            general.map(function (p) {
              return h("div", { class: "problem " + (p.severity === "error" ? "error" : "warning"), text: p.message });
            })
          )
        : null,
      h("fieldset", null, [h("legend", { text: "Button table entry" })].concat(entryFields)),
      statusFields.length ? h("fieldset", null, [h("legend", { text: "Status panel" })].concat(statusFields)) : null
    ]);
  }

  // A table entry's fields, copied over another entry's. Only the fields
  // both have are pasted: a unit pasted onto an entry that isn't a unit
  // gives it only its button set. Names given in AxeGraft aren't copied.
  var unitCopy = AG.ui.copyPaste.make({
    stateKey: "unitClipboard",
    noun: "unit",
    action: "unit",
    chosen: function (app) {
      var key = app.selected("units");
      var k = key ? AG.core.tree.parseKey(key) : null;
      return k && util.isInt(k.id) ? { id: k.id } : null;
    },
    label: function (app, u) {
      var name = D.itemName(app.cat(), "unit", u.id, app.doc());
      return name ? u.id + " " + name : "table entry " + u.id;
    },
    take: function (app, u) {
      var eff = D.effectiveUnit(app.doc(), app.cat(), u.id);
      var out = {};
      Object.keys(eff).forEach(function (f) {
        if (eff[f].value !== undefined) out[f] = eff[f].value;
      });
      return out;
    },
    put: function (d, app, u, fields) {
      var cat = app.cat();
      D.unitFieldsFor(cat, u.id).forEach(function (f) {
        if (util.has(fields, f.name)) d = D.setUnitField(d, cat, u.id, f.name, fields[f.name]);
      });
      return d;
    },
    pasteText: function (to, from) {
      return "Replace the fields of " + to + " with those copied from " + from;
    }
  });

  AG.ui.panels.units = panel;
  AG.ui.treeActions.units = unitCopy.buttons;
  AG.ui.clipboard.units = unitCopy;
  AG.ui.unitsTab = { setItems: setItems, unitItems: unitItems };
})(AxeGraft);
