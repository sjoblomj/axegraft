// The Requirements tab: a record as rows, one for each opcode with its
// parameter, or each completed unit. Rows inside an upgrade level and
// alternatives joined by or are grouped. The mod saves the whole record.
"use strict";

(function (AG) {
  var h = AG.ui.h;
  var help = AG.ui.help;
  var F = AG.ui.fields;
  var D = AG.core.doc;
  var R = AG.core.requirements;
  var tree = AG.core.tree;
  var util = AG.util;
  var drag = AG.ui.drag;

  var TYPE_TEXT = { unit: "Unit", upgrade: "Upgrade", tech_research: "Tech research", tech_use: "Tech use", order: "Order" };
  var KIND_OF_TYPE = { unit: "unit", upgrade: "upgrade", tech_research: "tech", tech_use: "tech", order: "order" };

  function items(app, kind) {
    var cat = app.cat();
    if (kind === "unit") return AG.ui.unitsTab.unitItems(app);
    var list = { tech: cat.raw.techs, upgrade: cat.raw.upgrades, order: cat.raw.orders }[kind] || [];
    var doc = app.doc();
    return list
      .map(function (x) {
        return { id: x.id, label: x.id + " " + D.itemName(cat, kind, x.id, doc) };
      })
      .sort(function (a, b) {
        return a.id - b.id;
      });
  }

  function opText(cat, name) {
    var op = cat.opcodes.get(name);
    return op ? op.label + " (" + name + ")" : String(name);
  }

  function itemName(cat, type, id, doc) {
    return D.requirementName(cat, type, id, doc);
  }

  // A read-only line for a row, as in the original record.
  function rowText(cat, r, doc) {
    if (r.kind === "unit") {
      var n = itemName(cat, "unit", r.unit, doc);
      return (cat.bareUnit ? cat.bareUnit.label : "Unit") + ": " + r.unit + (n ? " " + n : "");
    }
    var op = cat.opcodes.get(r.op);
    var text = opText(cat, r.op);
    if (op && op.parameter && r.param !== undefined) {
      var pn = D.itemName(cat, op.parameter, r.param, doc);
      text += ": " + r.param + (pn ? " " + pn : "");
    }
    return text;
  }

  // A trash can, drawn in the text colour. Fixed markup, which the HTML
  // parser puts in the SVG namespace.
  var TRASH = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.7 6.5v4.5M9.3 6.5v4.5"/></svg>';
  function trashIcon() {
    var holder = document.createElement("span");
    holder.innerHTML = TRASH;
    return holder.firstChild;
  }

  function rowClasses(s, problems) {
    return [
      "req-row",
      s.role === "or" ? "or-row" : null,
      s.role === "level" ? "level-row" : null,
      s.level && s.role !== "level" ? "in-level" : null,
      s.alternative ? "alt" : null,
      problems && problems.length ? "has-error" : null
    ];
  }

  function originalView(cat, type, id, doc) {
    var groups = AG.core.compat.groupVersions(cat, function (v) {
      return D.originalRecord(cat, type, id, v);
    });
    return h(
      "div",
      { class: "req-original", dataset: { original: "" } },
      groups.map(function (g) {
        var rows = g.value ? R.toRows(cat, g.value) : [];
        var s = R.structure(cat, rows);
        return h("div", null, [
          h("h3", { style: { "font-size": "13px", margin: "4px 0" }, text: AG.core.compat.groupLabel(cat, groups, g) + ":" }),
          g.value === null
            ? h("p", { text: "No requirement record." })
            : !rows.length
            ? h("p", { text: "An empty record." })
            : h(
                "ol",
                { class: "rows" },
                rows.map(function (r, i) {
                  return h("li", { class: rowClasses(s[i]) }, [h("span", { class: "idx", text: String(i) }), h("span", { text: rowText(cat, r, doc) })]);
                })
              )
        ]);
      })
    );
  }

  function panel(app, key) {
    var cat = app.cat();
    var k = tree.parseKey(key);
    var type = k.type;
    var id = k.id;
    var doc = app.doc();
    var eff = D.effectiveRequirement(doc, cat, type, id);
    var rows = R.toRows(cat, eff.list);
    var s = R.structure(cat, rows);
    var probs = R.rowProblems(cat, type, rows);
    var hasOriginal = cat.versionIds.some(function (v) {
      return D.originalRecord(cat, type, id, v) !== null;
    });
    var fieldKey = "req:" + type + ":" + id;

    function setRows(next) {
      app.edit(function (d) {
        return D.setRequirement(d, cat, type, id, R.toList(next));
      });
    }

    // Row kinds offered: a completed unit, and the opcodes allowed here.
    var kindOptions = [{ value: "#unit", label: cat.bareUnit ? cat.bareUnit.label : "Completed unit" }];
    cat.opcodeList.forEach(function (op) {
      if (op.allowedIn.indexOf(type) >= 0) kindOptions.push({ value: op.name, label: op.label });
    });

    function rowEl(r, i) {
      var op = r.kind === "op" ? cat.opcodes.get(r.op) : null;
      function update(fn) {
        var next = rows.map(function (x) {
          return Object.assign({}, x);
        });
        fn(next);
        setRows(R.reindex(next));
      }
      var kindHelp = help.text("rowKind") + (cat.bareUnit ? " " + cat.bareUnit.label + ": " + cat.bareUnit.help : "") + (op && op.help ? " " + op.label + ": " + op.help : "");
      var kindSel = F.select(kindOptions, r.kind === "unit" ? "#unit" : r.op, function (v) {
        update(function (next) {
          var old = next[i];
          if (v === "#unit") {
            var u = old.kind === "op" && util.isInt(old.param) && cat.opcodes.get(old.op) && cat.opcodes.get(old.op).parameter === "unit" ? old.param : cat.limits.unit.min;
            next[i] = { kind: "unit", unit: u };
          } else {
            var newOp = cat.opcodes.get(v);
            var row = { kind: "op", op: v };
            var oldKind = old.kind === "unit" ? "unit" : cat.opcodes.get(old.op) ? cat.opcodes.get(old.op).parameter : null;
            var oldValue = old.kind === "unit" ? old.unit : old.param;
            // An opcode that takes a parameter always has one, as the game
            // stores it: the old value when the new opcode takes the same
            // kind, otherwise the lowest ID of its kind. A row left without
            // one would take the next row's unit as its parameter.
            if (newOp && newOp.parameter) {
              row.param = newOp.parameter === oldKind && oldValue !== undefined ? oldValue : cat.limits[newOp.parameter] ? cat.limits[newOp.parameter].min : 0;
            }
            next[i] = row;
          }
        });
      }, { class: "ctl", "aria-label": "Row " + i + " kind" });
      var parts = [rows.length > 1 ? drag.grip("Drag to move this row") : null, h("span", { class: "idx", text: String(i) })].concat(F.withHelp(kindSel, kindHelp));
      if (r.kind === "unit") {
        parts.push(paramControl("unit", r.unit, function (v) {
          if (v === undefined || v === "") return app.render();
          update(function (next) {
            next[i] = { kind: "unit", unit: v };
          });
        }));
      } else if (op && op.parameter) {
        parts.push(paramControl(op.parameter, r.param, function (v) {
          // Clearing the ID box keeps the parameter, which can't be empty.
          if (v === undefined || v === "") return app.render();
          update(function (next) {
            next[i] = { kind: "op", op: r.op, param: v };
          });
        }));
      } else if (r.kind === "op" && util.has(r, "param")) {
        parts.push(h("span", { text: String(r.param) }));
      }
      // Up, Down and Remove say what they do, and have no help.
      parts.push(
        h("span", { class: "row-tools" }, [
          h("button", { type: "button", class: "small", dataset: { action: "row-up", plain: "" }, disabled: i === 0, "aria-label": "Move row " + i + " up", title: "Move up", onclick: function () {
            update(function (next) {
              var x = next[i];
              next[i] = next[i - 1];
              next[i - 1] = x;
            });
          } }, "↑"),
          h("button", { type: "button", class: "small", dataset: { action: "row-down", plain: "" }, disabled: i === rows.length - 1, "aria-label": "Move row " + i + " down", title: "Move down", onclick: function () {
            update(function (next) {
              var x = next[i];
              next[i] = next[i + 1];
              next[i + 1] = x;
            });
          } }, "↓"),
          h("button", { type: "button", class: "small icon-button", dataset: { action: "row-remove", plain: "" }, "aria-label": "Remove row " + i, title: "Remove", onclick: function () {
            update(function (next) {
              next.splice(i, 1);
            });
          } }, [trashIcon()])
        ])
      );
      probs[i].forEach(function (m) {
        parts.push(h("span", { class: "row-problem", role: "alert", text: m }));
      });
      return h("li", { class: rowClasses(s[i], probs[i]), dataset: { token: r.at, row: i, field: fieldKey + ":row" + i } }, parts);
    }

    function paramControl(kind, value, onChange) {
      var ctl = F.idPicker(items(app, kind), value, function (v) {
        onChange(v === "" ? undefined : v);
      }, { label: kind });
      return h("span", { class: "with-help" }, ctl.concat([help.described(ctl[0], help.text("rowParameter") + " This one takes a " + kind + ". " + help.text("nameSelect") + " " + help.text("idInput"))[1]]));
    }

    // The ID boxes of a picker share the select's help.
    var list = h(
      "ol",
      { class: "rows", dataset: { field: fieldKey } },
      rows.map(rowEl)
    );
    if (rows.length > 1) {
      drag.list(list, Array.prototype.slice.call(list.children), function (from, to) {
        var next = rows.map(function (x) {
          return Object.assign({}, x);
        });
        next.splice(to, 0, next.splice(from, 1)[0]);
        setRows(R.reindex(next));
      }, function (row) {
        return row.querySelector(".grip");
      });
    }
    Array.prototype.forEach.call(list.querySelectorAll("input[data-role=id]"), function (inp) {
      var sel = inp.parentNode.querySelector("select");
      if (sel && sel.getAttribute("aria-describedby")) inp.setAttribute("aria-describedby", sel.getAttribute("aria-describedby"));
    });

    var showOriginal = h("input", { type: "checkbox", checked: !!app.state.showOriginal, dataset: { action: "show-original" } });
    showOriginal.addEventListener("change", function () {
      app.state.showOriginal = showOriginal.checked;
      app.render();
    });

    var addRow = h("button", { type: "button", class: "small", dataset: { action: "add-row", plain: "" }, onclick: function () {
      setRows(R.reindex(rows.concat([{ kind: "unit", unit: cat.limits.unit.min }])));
    } }, "Add row");

    var status;
    if (!eff.defined && !hasOriginal) status = "This item has no requirement record. Add a row to create one.";
    else if (eff.defined && !rows.length) status = hasOriginal ? "This mod empties the record, which removes it from the game." : "An empty record.";
    else if (!eff.defined && !rows.length) status = "The original record is empty.";

    var edited = h("div", null, [
      status ? h("p", { class: "empty-panel", dataset: { status: "" }, text: status }) : null,
      rows.length ? list : h("ol", { class: "rows", dataset: { field: fieldKey } }),
      h("div", { class: "toolbar" }, [addRow])
    ]);

    return h("div", { class: "requirements-panel", dataset: { record: fieldKey } }, [
      h("h2", { class: "panel-title" }, [
        F.nameTitle(app, { kind: KIND_OF_TYPE[type], id: id, prefix: TYPE_TEXT[type] + " " + id, fallback: TYPE_TEXT[type] + " " + id, extraHelp: KIND_OF_TYPE[type] === "tech" ? help.text("techShared") : null }),
        h("span", { class: "sub", text: eff.defined ? "This mod replaces the whole record" : hasOriginal ? "Original record" : "No original record" }),
        eff.defined
          ? F.withHelp(h("button", { type: "button", class: "small", dataset: { action: "revert-record" }, onclick: function () {
              app.edit(function (d) {
                return D.revertRequirement(d, cat, type, id);
              });
            } }, "Revert record"), help.text("revertItem"))
          : null,
        h("label", { class: "sub" }, [F.withHelp(showOriginal, help.text("showOriginal")), " Show original"])
      ]),
      app.state.showOriginal
        ? h("div", { class: "req-columns" }, [
            h("fieldset", null, [h("legend", { text: eff.defined ? "Edited" : "Record" }), edited]),
            h("fieldset", null, [h("legend", { text: "Original" }), originalView(cat, type, id, doc)])
          ])
        : h("fieldset", null, [h("legend", { text: "Rows" }), edited])
    ]);
  }

  // A record, copied over another. It can be pasted onto a record of
  // another type, where opcodes that type can't use show as problems.
  var recordCopy = AG.ui.copyPaste.make({
    stateKey: "recordClipboard",
    noun: "record",
    action: "req",
    chosen: function (app) {
      var key = app.selected("requirements");
      var k = key ? tree.parseKey(key) : null;
      return k && k.type && util.isInt(k.id) ? { type: k.type, id: k.id } : null;
    },
    label: function (app, r) {
      var name = D.requirementName(app.cat(), r.type, r.id, app.doc());
      return TYPE_TEXT[r.type] + " " + r.id + (name ? " " + name : "");
    },
    take: function (app, r) {
      return D.effectiveRequirement(app.doc(), app.cat(), r.type, r.id).list.slice();
    },
    put: function (d, app, r, list) {
      return D.setRequirement(d, app.cat(), r.type, r.id, list.slice());
    },
    pasteText: function (to, from) {
      return "Replace the record of " + to + " with the one copied from " + from;
    }
  });

  AG.ui.panels.requirements = panel;
  AG.ui.treeActions.requirements = recordCopy.buttons;
  AG.ui.clipboard.requirements = recordCopy;
})(AxeGraft);
