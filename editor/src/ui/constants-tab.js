// The Constants tab: a numeric constant as a number in the scale the game
// stores it, one that holds an ID chosen by name or ID, and an option
// constant as a choice of named behaviours. Each shows its availability on
// every version.
"use strict";

(function (AG) {
  var h = AG.ui.h;
  var help = AG.ui.help;
  var F = AG.ui.fields;
  var D = AG.core.doc;
  var tree = AG.core.tree;
  var util = AG.util;

  function referItems(app, kind) {
    var cat = app.cat();
    if (kind === "unit") return AG.ui.unitsTab.unitItems(cat);
    if (kind === "tableEntry") return AG.ui.buttonSets.entryItems(app);
    var list = { tech: cat.raw.techs, upgrade: cat.raw.upgrades, order: cat.raw.orders, missile: cat.raw.missiles, spellSound: cat.raw.spellSounds, sound: cat.raw.sounds }[kind] || [];
    return list
      .map(function (x) {
        return { id: x.id, label: x.id + " " + x.name };
      })
      .sort(function (a, b) {
        return a.id - b.id;
      });
  }

  function valueText(cat, c, v) {
    if (c.kind === "option") {
      var o = c.options.filter(function (x) {
        return x.name === v;
      })[0];
      return o ? o.label + " (" + o.name + ")" : String(v);
    }
    if (c.refers) {
      var name = c.refers === "tableEntry" ? D.itemName(cat, "unit", v) : D.itemName(cat, c.refers, v);
      return v + (name ? " " + name : "");
    }
    return String(v);
  }

  // Versions grouped by what they have: the original value, or a state.
  function availability(cat, c) {
    var groups = [];
    cat.versions.forEach(function (v) {
      var a = c.availability[v.id];
      var last = groups[groups.length - 1];
      if (last && last.value === a) last.versions.push(v.id);
      else groups.push({ value: a, versions: [v.id] });
    });
    return groups;
  }

  function panel(app, key) {
    var cat = app.cat();
    var name = tree.parseKey(key).name;
    var c = cat.constants.get(name);
    var eff = D.effectiveConstant(app.doc(), cat, name);
    var fieldKey = "const:" + name;
    var problems = app.problemsAt(function (l) {
      return l.key === key;
    });
    function set(v) {
      app.edit(function (d) {
        return D.setConstant(d, cat, name, v);
      });
    }
    var controls;
    var helpText = c.help;
    if (c.kind === "option") {
      controls = [F.select(c.options.map(function (o) {
        return { value: o.name, label: o.label };
      }), eff.value, set, { class: "ctl wide", "aria-label": c.label })];
      helpText += " " + help.text("constantOption");
      var chosen = c.options.filter(function (o) {
        return o.name === eff.value;
      })[0];
      if (chosen && chosen.help) helpText += " " + chosen.label + ": " + chosen.help;
    } else if (c.refers) {
      controls = F.idPicker(referItems(app, c.refers), eff.value, set, { label: c.label });
      helpText += " " + help.text("constantValue") + " " + help.text("nameSelect") + " " + help.text("idInput");
    } else {
      controls = [F.numberInput(eff.value, function (v) {
        set(v === undefined ? "" : v);
      }, { "aria-label": c.label })];
      helpText += " " + help.text("constantValue");
    }
    var extra = [];
    if (c.kind === "number") extra.push(h("span", { class: "range", text: "Range " + util.rangeText(c.range) }));

    var groups = availability(cat, c);
    var skips = groups.filter(function (g) {
      return g.value === "unknown" || g.value === "not_applicable";
    });
    var table = h("table", { class: "availability", dataset: { availability: "" } }, [
      h("thead", null, [h("tr", null, [h("th", { text: "Versions" }), h("th", { text: "Has it?" }), h("th", { text: "Original" })])]),
      h(
        "tbody",
        null,
        groups.map(function (g) {
          var state = g.value === "unknown" ? "Unknown" : g.value === "not_applicable" ? "Doesn't apply" : "Yes";
          return h("tr", { class: typeof g.value === "string" && (g.value === "unknown" || g.value === "not_applicable") ? g.value : null, dataset: { versions: g.versions.join(",") } }, [
            h("td", { text: AG.core.compat.versionText(cat, g.versions) }),
            h("td", { text: state }),
            h("td", { text: g.value === "unknown" || g.value === "not_applicable" ? "—" : valueText(cat, c, g.value) })
          ]);
        })
      )
    ]);

    return h("div", { class: "constants-panel", dataset: { constant: name } }, [
      h("h2", { class: "panel-title" }, [
        c.label,
        h("span", { class: "sub", text: "Saved as " + c.name }),
        eff.changed
          ? F.withHelp(h("button", { type: "button", class: "small", dataset: { action: "revert-constant" }, onclick: function () {
              app.edit(function (d) {
                return D.revertConstant(d, cat, name);
              });
            } }, "Revert"), help.text("revertItem"))
          : null
      ]),
      h("fieldset", null, [
        h("legend", { text: c.group.join(" › ") }),
        F.field({
          label: c.kind === "option" ? "Option" : "Value",
          help: helpText,
          controls: controls,
          extra: extra,
          key: fieldKey,
          changed: eff.changed,
          problems: problems,
          original: eff.varies ? "differs between versions, see below" : eff.original === undefined ? "unknown on every version" : valueText(cat, c, eff.original),
          note: c.note || null
        })
      ]),
      h("fieldset", null, [
        h("legend", { text: "Availability" }),
        table,
        skips.length
          ? h("p", { dataset: { skipNote: "" }, text: "On " + AG.core.compat.versionText(cat, [].concat.apply([], skips.map(function (g) {
              return g.versions;
            }))) + " this constant is unknown or doesn't apply, so the patcher will skip it there and apply the rest of the mod." })
          : null
      ])
    ]);
  }

  AG.ui.panels.constants = panel;
})(AxeGraft);
