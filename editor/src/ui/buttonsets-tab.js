// The Button Sets tab: a set's buttons, the form for the selected button,
// a preview of the command panel, who uses the set, new sets and copying.
"use strict";

(function (AG) {
  var h = AG.ui.h;
  var help = AG.ui.help;
  var F = AG.ui.fields;
  var D = AG.core.doc;
  var util = AG.util;
  var tree = AG.core.tree;
  var drag = AG.ui.drag;

  // ---- Names and media

  function iconName(cat, id) {
    return cat.icons[id] || null;
  }

  // An icon's image if assets are loaded, otherwise a placeholder with its
  // name or ID.
  function iconEl(app, id) {
    var url = app.assets && app.assets.iconURL ? app.assets.iconURL(app.state.game, id) : null;
    if (url) return h("img", { class: "icon-img", src: url, alt: iconName(app.cat(), id) || "Icon " + id, dataset: { icon: id } });
    var name = util.isInt(id) ? iconName(app.cat(), id) : null;
    return h("span", { class: "icon-ph", title: name || "Icon " + id, dataset: { icon: id, placeholder: "" }, text: name ? name.slice(0, 8) : util.isInt(id) ? String(id) : "?" });
  }

  function stringText(app, id) {
    return app.assets && app.assets.string ? app.assets.string(app.state.game, id) : null;
  }

  // The choices for a string field: 0 for no string, then every string of
  // the table in use by its clean name. Without a table, the catalog's names.
  // Kept per table, since a table holds over a thousand strings.
  var stringItemCache = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  function stringItems(app) {
    var cat = app.cat();
    var list = app.assets && app.assets.strings ? app.assets.strings(app.state.game) : null;
    if (!list) return mapItems(cat.strings);
    if (stringItemCache && stringItemCache.has(list)) return stringItemCache.get(list);
    var lim = cat.limits.string;
    var items = [];
    if (util.inRange(0, lim)) items.push({ id: 0, label: "0 (no string)" });
    list.forEach(function (text, i) {
      var id = i + 1;
      if (!util.inRange(id, lim)) return;
      var n = AG.core.tbl.name(text);
      items.push({ id: id, label: id + " " + (n || "(empty)") });
    });
    if (stringItemCache) stringItemCache.set(list, items);
    return items;
  }

  // ---- Lists offered by name

  // Items of the catalog's `list`, by the mod's names when `doc` gives them.
  function namedItems(list, cat, kind, doc) {
    return (list || [])
      .map(function (x) {
        return { id: x.id, label: x.id + " " + (doc ? D.itemName(cat, kind, x.id, doc) : x.name) };
      })
      .sort(function (a, b) {
        return a.id - b.id;
      });
  }

  function mapItems(obj) {
    return Object.keys(obj || {})
      .map(function (k) {
        return { id: +k, label: k + " " + obj[k] };
      })
      .sort(function (a, b) {
        return a.id - b.id;
      });
  }

  // Table entries, each with the set it has in the mod.
  function entryItems(app) {
    var cat = app.cat();
    var bs = cat.unitKind.buttonSet.name;
    return cat.raw.units
      .map(function (u) {
        var s = D.effectiveUnit(app.doc(), cat, u.id)[bs].value;
        return { id: u.id, label: u.id + " " + D.itemName(cat, "unit", u.id, app.doc()) + " — " + (s === null ? "no buttons" : "set " + s) };
      })
      .sort(function (a, b) {
        return a.id - b.id;
      });
  }

  function variableItems(app, type) {
    var cat = app.cat();
    if (type === "unit") return AG.ui.unitsTab.unitItems(app);
    if (type === "tech") return namedItems(cat.raw.techs, cat, "tech", app.doc());
    if (type === "upgrade") return namedItems(cat.raw.upgrades, cat, "upgrade", app.doc());
    if (type === "order") return namedItems(cat.raw.orders, cat, "order", app.doc());
    if (type === "tableEntry") return entryItems(app);
    return null;
  }

  // Where a variable's "Go to" leads, or null when the game has no place for
  // it, such as Warcraft II, which has no requirements.
  function variableTarget(cat, type, v) {
    if (!util.isInt(v)) return null;
    var hasReq = cat.parts.indexOf("requirements") >= 0;
    var hasUnits = cat.parts.indexOf("units") >= 0;
    if (hasReq) {
      if (type === "unit") return { tab: "requirements", key: tree.key.req("unit", v), label: "Requirements of unit " + v };
      if (type === "tech") return { tab: "requirements", key: tree.key.req("tech_research", v), label: "Research requirements of tech " + v };
      if (type === "upgrade") return { tab: "requirements", key: tree.key.req("upgrade", v), label: "Requirements of upgrade " + v };
      if (type === "order") return { tab: "requirements", key: tree.key.req("order", v), label: "Requirements of order " + v };
    }
    if (hasUnits && type === "unit" && util.inRange(v, cat.limits.unit)) return { tab: "units", key: tree.key.unit(v), label: "Unit " + v };
    if (hasUnits && type === "tableEntry") return { tab: "units", key: tree.key.unit(v), label: "Table entry " + v };
    return null;
  }

  function functionOptions(cat, list) {
    var out = [];
    cat.functions[list].forEach(function (fn) {
      out.push({ value: fn.name, label: fn.label + " (" + fn.name + ")" });
    });
    return out;
  }

  function positionOptions(cat) {
    var r = cat.limits.position;
    var cols = cat.panel.columns;
    var out = [];
    for (var p = r.min; p <= r.max; p++) {
      var i = p - r.min;
      out.push({ value: p, label: p + " (row " + (Math.floor(i / cols) + 1) + ", column " + ((i % cols) + 1) + ")" });
    }
    return out;
  }

  // ---- Who uses a set

  // Table entries showing this set, counting what the mod assigns. Includes
  // entries the catalog doesn't name but the mod assigns.
  function usedBy(app, setId) {
    var cat = app.cat();
    var bs = cat.unitKind.buttonSet.name;
    var ids = {};
    cat.raw.units.forEach(function (u) {
      ids[u.id] = true;
    });
    D.entries(app.doc(), "units").forEach(function (e) {
      if (util.isObject(e) && util.isInt(e.id) && util.inRange(e.id, cat.limits.tableEntry)) ids[e.id] = true;
    });
    return Object.keys(ids)
      .map(Number)
      .sort(util.byNumber)
      .filter(function (id) {
        return D.effectiveUnit(app.doc(), cat, id)[bs].value === setId;
      });
  }

  // Defaults for a new button: valid values the user can change.
  function newButton(cat, buttons, position) {
    var r = cat.limits.position;
    if (position === undefined) {
      position = r.min;
      var used = buttons.map(function (b) {
        return b && b[cat.buttonKind.position.name];
      });
      for (var p = r.min; p <= r.max; p++)
        if (used.indexOf(p) < 0) {
          position = p;
          break;
        }
    }
    function plain(list) {
      var fn = null;
      cat.functions[list].forEach(function (f) {
        if (!fn && !f.variable) fn = f;
      });
      return (fn || cat.functionLists[list][0]).name;
    }
    var b = {};
    cat.buttonFields.forEach(function (f) {
      if (f.kind === "position") b[f.name] = position;
      else if (f.kind === "icon") b[f.name] = cat.limits.icon.min;
      else if (f.kind === "string") b[f.name] = cat.limits.string.min;
      else if (f.kind === "condition") b[f.name] = plain("conditions");
      else if (f.kind === "action") b[f.name] = plain("actions");
      else if (f.kind === "choice") b[f.name] = f.options[0].value;
    });
    return b;
  }

  // ---- The panel

  function panel(app, key) {
    var cat = app.cat();
    var doc = app.doc();
    var id = tree.parseKey(key).id;
    var set = cat.sets.get(id);
    var eff = D.effectiveButtons(doc, cat, id);
    var buttons = eff.buttons;
    var sel = app.state.button[key];
    if (!util.isInt(sel) || sel >= buttons.length) sel = buttons.length ? 0 : null;
    if (sel !== null && sel < 0) sel = 0;
    app.state.button[key] = sel;

    function editButtons(fn) {
      app.edit(function (d) {
        var list = D.effectiveButtons(d, cat, id).buttons.slice();
        var next = fn(list);
        return D.setButtons(d, cat, id, next || list);
      });
    }
    function selectButton(i) {
      app.state.button[key] = i;
      app.render();
    }
    // Replaces the list with a moved one, `{ buttons, index }`, selecting the
    // moved button. Nothing happens if nothing moved.
    function applyMove(fn) {
      editButtons(function (l) {
        var r = fn(l);
        app.state.button[key] = r.index;
        return r.buttons;
      });
      if (app.state.button[key] !== sel) selectButton(app.state.button[key]);
    }
    // A new button, at the first unused position or the one given, put in
    // order by its position.
    function addButton(position) {
      applyMove(function (l) {
        l.push(newButton(cat, l, position));
        return D.placeButton(cat, l, l.length - 1);
      });
    }
    // Button i dropped in the list, as `D.dropInList` says, where the game
    // needs ascending positions. Elsewhere the list is in any order, and a
    // drop between buttons only moves it there.
    function listDrop(l, i, drop) {
      if (cat.panel.ascending) return D.dropInList(cat, l, i, drop);
      if (drop.on !== undefined || drop.before < 0 || drop.before > l.length) return null;
      var to = drop.before > i ? drop.before - 1 : drop.before;
      if (to === i) return null;
      var next = l.slice();
      next.splice(to, 0, next.splice(i, 1)[0]);
      return { buttons: next, index: to, pushed: [] };
    }
    function dropButton(i, drop) {
      if (!listDrop(buttons, i, drop)) return;
      applyMove(function (l) {
        return listDrop(l, i, drop);
      });
    }

    var problems = app.problemsAt(function (l) {
      return l.key === key;
    });
    function buttonProblems(i, field) {
      return problems.filter(function (p) {
        var l = tree.locate(doc, cat, p.path);
        return l.button === i && (field === undefined || l.field === field);
      });
    }
    // A button is changed when the mod defines the set and the button
    // matches no original button on any version.
    var originalLists = eff.originals
      ? cat.versionIds.map(function (v) {
          return eff.originals[v] || [];
        })
      : [];
    function buttonChanged(b) {
      if (!eff.defined) return false;
      return !originalLists.some(function (list) {
        return list.some(function (o) {
          return D.sameButtons(cat, [b], [o]);
        });
      });
    }
    var setProblems = problems.filter(function (p) {
      var l = tree.locate(doc, cat, p.path);
      return l.button === null || l.button === undefined;
    });

    // Header
    var header = h("h2", { class: "panel-title" }, [
      F.nameTitle(app, { kind: "set", id: id, prefix: id, fallback: "Set " + id }),
      h("span", { class: "sub", text: eff.isNew ? "New set, added by this mod" : eff.defined ? "Original set, replaced by this mod" : "Original set" }),
      set && eff.defined
        ? F.withHelp(h("button", { type: "button", class: "small", dataset: { action: "revert-set" }, onclick: function () {
            app.edit(function (d) {
              return D.revertSet(d, cat, id);
            });
          } }, "Revert set"), help.text("revertItem"))
        : null,
      eff.isNew
        ? F.withHelp(h("button", { type: "button", class: "small", dataset: { action: "remove-set" }, onclick: function () {
            app.edit(function (d) {
              return D.revertSet(d, cat, id);
            });
            app.state.selection.button_sets = null;
            app.render();
          } }, "Remove set"), help.text("removeSet"))
        : null
    ]);

    // A set whose original differs by version can match some and not others.
    var differs = null;
    if (set && eff.defined && eff.differsOn.length && eff.differsOn.length < cat.versionIds.length) {
      var same = cat.versionIds.filter(function (v) {
        return eff.differsOn.indexOf(v) < 0;
      });
      differs = h("p", {
        class: "differs-on",
        dataset: { differsOn: eff.differsOn.join(",") },
        text: "Differs from the original on " + AG.core.compat.versionText(cat, eff.differsOn) + ". The same as the original on " + AG.core.compat.versionText(cat, same) + "."
      });
    }

    // Who uses it
    var users = usedBy(app, id);
    var usedEl = h("div", { class: "used-by", dataset: { field: "set:" + id + ":used" } }, [
      h("div", null, [
        h("strong", { text: users.length ? "Used by " + users.length + (users.length === 1 ? " table entry" : " table entries") : "No table entry uses this set." }),
        users.length > 1 ? h("span", { text: " Editing this set changes all of them." }) : users.length === 1 ? h("span", { text: " Editing this set changes it." }) : null,
        " ",
        help.button(help.text("usedBy"))
      ]),
      users.length
        ? h(
            "ul",
            { dataset: { usedBy: "" } },
            users.map(function (u) {
              var name = D.itemName(cat, "unit", u, app.doc());
              return h("li", null, [
                h("button", { type: "button", class: "link", dataset: { unit: u }, "aria-describedby": null, onclick: function () {
                  app.select("units", tree.key.unit(u));
                } }, u + (name ? " " + name : ""))
              ]);
            })
          )
        : null
    ]);
    Array.prototype.forEach.call(usedEl.querySelectorAll("button.link"), function (b) {
      b.setAttribute("aria-describedby", usedEl.querySelector(".help").getAttribute("aria-describedby"));
    });

    // Button list and toolbar
    var list = h(
      "ul",
      { class: "button-list", role: "listbox", tabindex: "0", "aria-label": "Buttons", dataset: { focus: "buttons:" + id } },
      buttons.length
        ? buttons.map(function (b, i) {
            var pos = util.isObject(b) ? b[cat.buttonKind.position.name] : "?";
            var actionFn = util.isObject(b) ? cat.functions.actions.get(b[cat.buttonKind.action.name]) : null;
            var firstString = cat.buttonFields.filter(function (f) {
              return f.kind === "string";
            })[0];
            var text = firstString && util.isObject(b) ? stringText(app, b[firstString.name]) : null;
            var probs = buttonProblems(i);
            var hasError = probs.some(function (p) {
              return p.severity === "error";
            });
            var hasWarning = probs.some(function (p) {
              return p.severity !== "error";
            });
            return h("li", { role: "option", "aria-selected": String(i === sel), dataset: { index: i }, onclick: function () {
              selectButton(i);
            } }, [
              drag.grip("Drag to move this button in the list"),
              h("span", { class: "pos", text: String(pos) }),
              util.isObject(b) ? iconEl(app, b[cat.buttonKind.icon.name]) : null,
              h("span", { text: buttonTitle(actionFn ? actionFn.label : util.isObject(b) ? String(b[cat.buttonKind.action.name]) : "?", text) }),
              buttonChanged(b) || hasError || hasWarning
                ? h("span", { class: "marks" }, [
                    buttonChanged(b) ? h("span", { class: "mark changed", title: "Changed", "aria-label": "changed", text: "•" }) : null,
                    hasError ? h("span", { class: "mark error", title: "Error", "aria-label": "error", text: "!" }) : null,
                    hasWarning ? h("span", { class: "mark warning", title: "Warning", "aria-label": "warning", text: "!" }) : null
                  ])
                : null
            ]);
          })
        : [h("li", { class: "empty", text: "No buttons." })]
    );
    if (buttons.length > 1) dragInList(cat, list, buttons, listDrop, dropButton);
    list.addEventListener("keydown", function (e) {
      if (!buttons.length) return;
      var cur = sel === null ? 0 : sel;
      // Alt and an arrow drops the selected button one place on, as if
      // dragged there: between the two buttons before it, or after it.
      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        if (sel !== null) dropButton(sel, { before: e.key === "ArrowUp" ? sel - 1 : sel + 2 });
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowDown") selectButton(Math.min(cur + 1, buttons.length - 1));
      else if (e.key === "ArrowUp") selectButton(Math.max(cur - 1, 0));
      else if (e.key === "Home") selectButton(0);
      else if (e.key === "End") selectButton(buttons.length - 1);
      else return;
      e.preventDefault();
    });
    var listWithHelp = h("div", { class: "button-list-row", style: { display: "flex", gap: "4px", "align-items": "start" } }, [h("div", { style: { flex: "1", "min-width": "0" } }, [list])].concat([help.described(list, help.text("buttonList"))[1]]));

    // Add and Remove say what they do, and have no help. Sorting is only
    // offered for a set that's out of order, which only a mod opened that way
    // can be, as every edit keeps the order.
    function tool(label, action, onclick, disabled) {
      return h("button", { type: "button", class: "small", dataset: { action: action, plain: "" }, disabled: !!disabled, onclick: onclick }, label);
    }
    // Copy and Paste stay focusable when disabled, so their tooltips can
    // say why.
    var buttonClip = clipboard(app, "buttonClipboard");
    function clipTool(label, action, title, disabled, onclick) {
      return h("button", { type: "button", class: "small", title: title, "aria-disabled": disabled ? "true" : null, dataset: { action: action, focus: action, plain: "" }, onclick: function () {
        if (!disabled) onclick();
      } }, label);
    }
    var outOfOrder = cat.panel.ascending && AG.core.catalog.firstOutOfOrder(buttons.filter(util.isObject), cat.buttonKind.position.name) >= 0;
    var toolbar = h("div", { class: "toolbar" }, [
      tool("Add", "add-button", function () {
        addButton();
      }),
      tool("Remove", "remove-button", function () {
        editButtons(function (l) {
          l.splice(sel, 1);
        });
      }, sel === null),
      clipTool("Copy", "copy-button", sel === null ? "No button is chosen" : "Copy button " + (sel + 1) + " (" + shortcut("C") + ")", sel === null, function () {
        copyButton(app);
      }),
      clipTool("Paste", "paste-button", !buttonClip ? "Copy a button first, to paste it here" : sel === null ? "No button is chosen" : "Replace button " + (sel + 1) + " with " + buttonClip.name + ", keeping its position (" + shortcut("V") + ")", !buttonClip || sel === null, function () {
        pasteButton(app);
      }),
      outOfOrder
        ? F.withHelp(h("button", { type: "button", class: "small", dataset: { action: "sort-buttons" }, onclick: function () {
            app.edit(function (d) {
              return D.sortButtons(d, cat, id);
            });
          } }, "Sort by position"), help.text("sortButtons"))
        : null
    ]);

    var form = sel === null ? h("p", { class: "empty-panel", text: "This set has no buttons. Add one, or double-click a position in the preview." }) : buttonForm(app, id, key, sel, buttons[sel], buttonProblems, editButtons, applyMove);

    return h("div", { class: "buttonset-panel", dataset: { set: id } }, [
      header,
      differs,
      setProblems.length
        ? h("div", { class: "field" }, setProblems.map(function (p) {
            return h("div", { class: "problem " + (p.severity === "error" ? "error" : "warning"), text: p.message });
          }))
        : null,
      h("div", { class: "buttonset-layout" }, [
        h("fieldset", { class: "buttons-box" }, [h("legend", { text: "Buttons" }), toolbar, listWithHelp]),
        h("div", { class: "preview-box" }, [preview(app, key, buttons, sel, applyMove, addButton)])
      ]),
      form,
      set ? originalSection(app, id) : null,
      usedEl
    ]);
  }

  // The original buttons of a catalog set. Where they differ between
  // versions, each group of versions that shares a list gets a column, with
  // the buttons lined up: a button missing from a group is red, one that only
  // some groups have is green, and one that differs between groups is yellow.
  function originalSection(app, id) {
    var cat = app.cat();
    var originals = D.originalButtonsByVersion(cat, id);
    var groups = AG.core.compat.groupVersions(cat, function (v) {
      return originals[v];
    });
    var firstString = cat.buttonFields.filter(function (f) {
      return f.kind === "string";
    })[0];
    function buttonContent(b) {
      var fn = cat.functions.actions.get(b[cat.buttonKind.action.name]);
      var text = firstString ? stringText(app, b[firstString.name]) : null;
      return [
        h("span", { class: "pos", text: String(b[cat.buttonKind.position.name]) }),
        iconEl(app, b[cat.buttonKind.icon.name]),
        h("span", { text: buttonTitle(fn ? fn.label : String(b[cat.buttonKind.action.name]), text) })
      ];
    }
    var body;
    if (groups.length > 1) {
      var rows = D.alignButtons(cat, groups.map(function (g) {
        return g.value;
      }));
      var cls = { same: function () {
        return null;
      }, changed: function () {
        return "diff-changed";
      }, partial: function (b) {
        return b ? "diff-added" : "diff-missing";
      } };
      body = h("div", { class: "original-diff-wrap" }, [
        h("table", { class: "original-diff" }, [
          h("thead", null, [h("tr", null, groups.map(function (g) {
            return h("th", { scope: "col", dataset: { versions: g.versions.join(",") }, text: AG.core.compat.groupLabel(cat, groups, g) });
          }))]),
          h("tbody", null, rows.map(function (r) {
            return h("tr", { dataset: { state: r.state } }, r.cells.map(function (b, k) {
              var label = r.state === "partial" ? (b ? "Only in some versions" : "Not in " + AG.core.compat.versionText(cat, groups[k].versions)) : r.state === "changed" ? "Differs between versions" : null;
              return h("td", { class: cls[r.state](b), title: label }, b ? [h("div", { class: "cell" }, buttonContent(b))] : []);
            }));
          }))
        ]),
        h("p", { class: "diff-key" }, [
          h("span", { class: "diff-added", text: "Only in some versions" }),
          " ",
          h("span", { class: "diff-missing", text: "Missing" }),
          " ",
          h("span", { class: "diff-changed", text: "Differs" })
        ])
      ]);
    } else {
      var g = groups[0];
      body = h("div", { dataset: { versions: g.versions.join(",") } }, [
        h("h3", { style: { "font-size": "13px", margin: "4px 0" }, text: AG.core.compat.groupLabel(cat, groups, g) + ":" }),
        g.value.length
          ? h("ol", { class: "original-list" }, g.value.map(function (b) {
              return h("li", null, buttonContent(b));
            }))
          : h("p", { text: "No buttons." })
      ]);
    }
    return h("details", { class: "original-buttons", open: groups.length > 1, dataset: { originalButtons: "" } }, [
      h("summary", { text: groups.length > 1 ? "Original buttons, which differ between versions" : "Original buttons" }),
      body
    ]);
  }

  // How far into a row, from its top or bottom, a drop counts as between it
  // and its neighbour rather than on it.
  var ROW_EDGE = 0.25;

  // Dragging buttons in the list, by the whole row. `listDrop(list, i, drop)`
  // says what a drop does, or null for nothing; `dropButton(i, drop)` does it.
  // A drop onto a row outlines it. A drop between rows marks the space, and
  // outlines the rows whose buttons it would push on.
  function dragInList(cat, list, buttons, listDrop, dropButton) {
    var rows = Array.prototype.slice.call(list.children);
    var posField = cat.buttonKind.position.name;
    function dropAt(i, e) {
      for (var k = 0; k < rows.length; k++) {
        var r = rows[k].getBoundingClientRect();
        if (!r.height || e.clientY < r.top || e.clientY >= r.bottom) continue;
        var f = (e.clientY - r.top) / r.height;
        var drop = f < ROW_EDGE ? { before: k } : f > 1 - ROW_EDGE ? { before: k + 1 } : { on: k };
        var result = listDrop(buttons, i, drop);
        return result ? { drop: drop, result: result } : null;
      }
      return null;
    }
    function unmark() {
      rows.forEach(function (r) {
        r.classList.remove("drop-before", "drop-after", "drop-target", "drop-pushed");
      });
    }
    rows.forEach(function (row, i) {
      drag.track(row, {
        source: row,
        area: list,
        beside: true,
        target: function (el, e) {
          return dropAt(i, e);
        },
        mark: function (t) {
          if (t.drop.on !== undefined) {
            rows[t.drop.on].classList.add("drop-target");
            return;
          }
          var k = t.drop.before;
          if (k < rows.length) rows[k].classList.add("drop-before");
          else rows[k - 1].classList.add("drop-after");
          buttons.forEach(function (b, j) {
            if (j !== i && util.isObject(b) && t.result.pushed.indexOf(b[posField]) >= 0) rows[j].classList.add("drop-pushed");
          });
        },
        unmark: unmark,
        drop: function (t) {
          dropButton(i, t.drop);
        }
      });
    });
  }

  // A button's title in a list: its action, then its string's name, which is
  // left out when it only repeats the action.
  function buttonTitle(action, text) {
    if (!text) return action;
    var name = AG.core.tbl.name(text);
    if (name.trim().toLowerCase() === action.trim().toLowerCase()) return action;
    return action + " — " + shortName(text);
  }

  function shortName(text) {
    var s = AG.core.tbl.name(text);
    return s.length > 40 ? s.slice(0, 40) + "…" : s;
  }

  // The string as stored. Control bytes, newlines included, and a literal <
  // are shown as their number, such as <3>.
  function showString(text) {
    return AG.core.tbl.tokens(text).map(function (t) {
      return t.text !== undefined ? t.text : h("span", { class: "ctrl", text: "<" + t.code + ">" });
    });
  }

  function buttonForm(app, id, key, i, b, buttonProblems, editButtons, applyMove) {
    var cat = app.cat();
    var original = D.effectiveButtons(D.create(cat.game), cat, id).buttons;
    if (!util.isObject(b)) return h("p", { class: "notice error", text: "This button isn't an object." });
    function setField(name, v) {
      editButtons(function (l) {
        var copy = Object.assign({}, l[i]);
        if (v === undefined) delete copy[name];
        else copy[name] = v;
        l[i] = copy;
      });
    }
    var fns = {
      condition: cat.functions.conditions.get(b[cat.buttonKind.condition.name]) || null,
      action: cat.functions.actions.get(b[cat.buttonKind.action.name]) || null
    };
    var rows = cat.buttonFields.map(function (f) {
      var v = b[f.name];
      var fieldKey = "set:" + id + ":" + i + ":" + f.name;
      var probs = buttonProblems(i, f.name);
      var controls;
      var extra = [];
      var helpText = f.help;
      var note = null;
      var set = function (x) {
        setField(f.name, x);
      };
      if (f.kind === "position") {
        // A new position puts the button in order among the others.
        controls = [F.select(positionOptions(cat), v, function (x) {
          applyMove(function (l) {
            return D.moveButtonTo(cat, l, i, x);
          });
        }, { class: "ctl", "aria-label": f.label })];
      } else if (f.kind === "icon") {
        controls = F.idPicker(mapItems(cat.icons), v, set, { label: f.label });
        helpText += " " + help.text("nameSelect") + " " + help.text("idInput");
        extra.push(h("span", { class: "icon-preview" }, [iconEl(app, v)]));
        if (AG.ui.iconPicker && app.assets && app.assets.hasIcons && app.assets.hasIcons(app.state.game)) {
          extra.push(F.withHelp(h("button", { type: "button", class: "small", dataset: { action: "pick-icon" }, onclick: function () {
            AG.ui.iconPicker.show(app, v, set);
          } }, "Choose icon..."), help.text("pickIcon")));
        }
      } else if (f.kind === "string") {
        var hasTable = !!(app.assets && app.assets.strings && app.assets.strings(app.state.game));
        controls = F.idPicker(stringItems(app), v, set, { label: f.label, unknownLabel: hasTable ? "(not in the string table)" : null });
        helpText += " " + help.text("nameSelect") + " " + help.text("idInput");
      } else if (f.kind === "condition" || f.kind === "action") {
        var list = f.kind === "condition" ? "conditions" : "actions";
        controls = [F.select(functionOptions(cat, list), v, set, { class: "ctl wide", "aria-label": f.label })];
        var fn = fns[f.kind];
        if (fn && fn.help) helpText += " " + fn.help;
        if (fn && fn.absentOn && fn.absentOn.length) note = "Not in " + AG.core.compat.versionText(cat, fn.absentOn) + ".";
      } else if (f.kind === "conditionVariable" || f.kind === "actionVariable") {
        var owner = fns[f.kind === "conditionVariable" ? "condition" : "action"];
        var type = owner ? owner.variable : null;
        var items = type ? variableItems(app, type) : null;
        if (items) {
          controls = F.idPicker(items, v, function (x) {
            set(x === "" ? undefined : x);
          }, { label: f.label });
          helpText += " " + help.text("nameSelect") + " " + help.text("idInput");
        } else {
          controls = [F.numberInput(v, set, { "aria-label": f.label, placeholder: "0" })];
        }
        if (owner && !type) {
          probs = probs.concat([{ severity: "info", kind: "unused", message: owner.name + " doesn't read this variable. It may hold any value that fits the field, " + util.rangeText(cat.limits[f.kind]) + ", and is left out of the file when it's 0." }]);
        } else if (type) {
          helpText += " " + owner.name + " reads a " + AG.core.validate.VARIABLE_NAME[type] + ".";
        }
        var target = type ? variableTarget(cat, type, v) : null;
        if (target) {
          extra.push(F.withHelp(h("button", { type: "button", class: "small", dataset: { action: "jump" }, title: target.label, onclick: function () {
            app.select(target.tab, target.key);
          } }, "Go to →"), help.text("jump")));
        }
      } else if (f.kind === "choice") {
        controls = [F.select(f.options.map(function (o) {
          return { value: o.value, label: o.value + " " + o.label };
        }), v, set, { class: "ctl", "aria-label": f.label })];
      }
      var origB = original && original[i];
      var origText = null;
      if (util.isObject(origB) && util.has(origB, f.name)) origText = F.showValue(origB[f.name]);
      var row = F.field({
        label: f.label,
        help: helpText,
        controls: controls,
        extra: extra,
        key: fieldKey,
        changed: !!(origB && !util.equal(origB[f.name], v)) || (!origB && v !== undefined),
        problems: probs,
        original: origText,
        note: note
      });
      if (f.kind === "string" && util.isInt(v)) {
        var t = stringText(app, v);
        if (t !== null && t !== undefined) row.appendChild(h("div", { class: "string-text", dataset: { stringText: v } }, showString(t)));
      }
      return row;
    });
    var general = buttonProblems(i).filter(function (p) {
      var l = tree.locate(app.doc(), cat, p.path);
      return !l.field;
    });
    return h("fieldset", { class: "button-form", dataset: { field: "set:" + id + ":" + i + ":" } }, [h("legend", { text: "Button " + (i + 1) })]
      .concat(general.map(function (p) {
        return h("div", { class: "problem error", role: "alert", text: p.message });
      }))
      .concat(rows));
  }

  // How far into a position, from either side, a drop counts as between it
  // and its neighbour rather than on it.
  var GAP_EDGE = 0.25;

  function preview(app, key, buttons, sel, applyMove, addButton) {
    var cat = app.cat();
    var r = cat.limits.position;
    var posField = cat.buttonKind.position.name;
    var cells = [];
    var drags = [];
    for (var p = r.min; p <= r.max; p++) {
      (function (pos) {
        var at = [];
        buttons.forEach(function (b, i) {
          if (util.isObject(b) && b[posField] === pos) at.push(i);
        });
        var first = at.length ? buttons[at[0]] : null;
        var cell = h("button", {
          type: "button",
          class: ["slot", at.length ? "filled draggable" : null, at.indexOf(sel) >= 0 ? "selected" : null],
          dataset: { position: pos, buttons: at.join(",") },
          "aria-label": "Position " + pos + (at.length ? ": " + at.length + (at.length === 1 ? " button" : " buttons") : ", empty"),
          title: at.length > 1 ? "Buttons " + at.join(", ") + " share this position" : null
        }, [
          first ? iconEl(app, first[cat.buttonKind.icon.name]) : null,
          at.length > 1 ? h("span", { class: "count", text: String(at.length) }) : null,
          h("span", { class: "slotpos", text: String(pos) })
        ]);
        cell.addEventListener("click", function () {
          if (!at.length) return;
          // Clicking again cycles through buttons that share the position.
          var next = at.indexOf(sel) >= 0 ? at[(at.indexOf(sel) + 1) % at.length] : at[0];
          app.state.button[key] = next;
          app.render();
        });
        cell.addEventListener("dblclick", function () {
          if (!at.length) addButton(pos);
        });
        cell.addEventListener("keydown", function (e) {
          if (e.key === "Enter" && !at.length) {
            e.preventDefault();
            addButton(pos);
          }
        });
        cells.push(cell);
        // A drag from here moves the selected button if it's here, otherwise
        // the first.
        if (at.length) drags.push({ cell: cell, pos: pos, index: at.indexOf(sel) >= 0 ? sel : at[0] });
      })(p);
    }
    var grid = h("div", { class: "preview", style: { "--cols": String(cat.panel.columns) }, role: "group", "aria-label": "Command panel preview" }, cells);

    function cellAt(pos) {
      return cells[pos - r.min];
    }
    // What a drop at the pointer would do: put the button on a position, or
    // between two, pushing those from the second on along. Null where
    // nothing would change.
    function dropAt(d, e) {
      for (var k = 0; k < cells.length; k++) {
        var pos = r.min + k;
        var b = cells[k].getBoundingClientRect();
        if (!b.width || e.clientX < b.left - 2 || e.clientX >= b.right + 2 || e.clientY < b.top - 2 || e.clientY >= b.bottom + 2) continue;
        var f = (e.clientX - b.left) / b.width;
        var t = f < GAP_EDGE ? { between: true, pos: pos } : f > 1 - GAP_EDGE && pos < r.max ? { between: true, pos: pos + 1 } : { between: false, pos: pos };
        if (!t.between && t.pos === d.pos) return null;
        t.move = function (list) {
          return t.between ? D.pushButtonTo(cat, list, d.index, t.pos) : D.moveButtonTo(cat, list, d.index, t.pos);
        };
        if (util.equal(t.move(buttons).buttons, buttons)) return null;
        t.pushed = t.between ? D.pushedPositions(cat, buttons, d.index, t.pos) : [];
        return t;
      }
      return null;
    }

    // A bar in the space between two positions, or beside one at a row's end.
    var bars = [];
    function bar(x, rect) {
      var g = grid.getBoundingClientRect();
      var el = h("div", { class: "drop-gap", "aria-hidden": "true", style: {
        left: x - g.left - grid.clientLeft - 1.5 + "px",
        top: rect.top - g.top - grid.clientTop + "px",
        height: rect.height + "px"
      } });
      grid.appendChild(el);
      bars.push(el);
    }
    function markBetween(pos) {
      var y = cellAt(pos).getBoundingClientRect();
      var x = pos > r.min ? cellAt(pos - 1).getBoundingClientRect() : null;
      if (x && Math.abs(x.top - y.top) < 1) {
        bar((x.right + y.left) / 2, y);
      } else {
        bar(y.left - 3, y);
        if (x) bar(x.right + 3, x);
      }
    }

    drags.forEach(function (d) {
      drag.track(d.cell, {
        source: d.cell,
        area: grid,
        beside: true,
        target: function (el, e) {
          return dropAt(d, e);
        },
        mark: function (t) {
          if (!t.between) {
            cellAt(t.pos).classList.add("drop-target");
            return;
          }
          markBetween(t.pos);
          t.pushed.forEach(function (p) {
            cellAt(p).classList.add("drop-pushed");
          });
        },
        unmark: function () {
          cells.forEach(function (c) {
            c.classList.remove("drop-target", "drop-pushed");
          });
          bars.forEach(function (b) {
            if (b.parentNode) b.parentNode.removeChild(b);
          });
          bars = [];
        },
        drop: function (t) {
          applyMove(t.move);
        }
      });
    });
    var helpBtn = help.button(help.text("preview"));
    cells.forEach(function (c) {
      c.setAttribute("aria-describedby", helpBtn.getAttribute("aria-describedby"));
    });
    return h("fieldset", null, [h("legend", null, ["Preview ", helpBtn]), grid]);
  }

  // ---- Copying and pasting sets and buttons
  //
  // What was copied is kept for the session, for the game it came from, so
  // it can be pasted into another mod of that game. Only one of a set and a
  // button is copied at a time.

  // The chosen set's ID, or null.
  function chosenSet(app) {
    var key = app.selected("button_sets");
    var id = key ? tree.parseKey(key).id : null;
    return util.isInt(id) ? id : null;
  }

  // What was copied, a set or a button by `which`, if it's for this mod's
  // game.
  function clipboard(app, which) {
    var clip = app.state[which || "setClipboard"];
    return clip && clip.game === app.state.game ? clip : null;
  }

  // Copies the chosen set's buttons, discarding a copied button. False if
  // no set is chosen.
  function copySet(app) {
    var id = chosenSet(app);
    if (id === null) return false;
    var cat = app.cat();
    var doc = app.doc();
    app.state.setClipboard = { game: app.state.game, id: id, name: D.setText(cat, id, doc), buttons: D.effectiveButtons(doc, cat, id).buttons.slice() };
    app.state.buttonClipboard = null;
    app.render();
    return true;
  }

  // Replaces the chosen set's buttons with the copied ones. False if
  // nothing was copied or no set is chosen.
  function pasteSet(app) {
    var id = chosenSet(app);
    var clip = clipboard(app);
    if (id === null || !clip) return false;
    var cat = app.cat();
    app.edit(function (d) {
      return D.setButtons(d, cat, id, clip.buttons.slice());
    });
    return true;
  }

  // The chosen set and button, as { id, index, button }, or null.
  function chosenButton(app) {
    var id = chosenSet(app);
    if (id === null) return null;
    var i = app.state.button[app.selected("button_sets")];
    var buttons = D.effectiveButtons(app.doc(), app.cat(), id).buttons;
    if (!util.isInt(i) || i < 0 || i >= buttons.length || !util.isObject(buttons[i])) return null;
    return { id: id, index: i, button: buttons[i] };
  }

  // Copies the chosen button, discarding a copied set. False if no button
  // is chosen.
  function copyButton(app) {
    var c = chosenButton(app);
    if (!c) return false;
    app.state.buttonClipboard = { game: app.state.game, name: "button " + (c.index + 1) + " of " + D.setText(app.cat(), c.id, app.doc()), button: Object.assign({}, c.button) };
    app.state.setClipboard = null;
    app.render();
    return true;
  }

  // Replaces the chosen button with the copied one, keeping the chosen
  // button's position, so the set's order is unchanged. False if nothing
  // was copied or no button is chosen.
  function pasteButton(app) {
    var c = chosenButton(app);
    var clip = clipboard(app, "buttonClipboard");
    if (!c || !clip) return false;
    var cat = app.cat();
    var pos = cat.buttonKind.position.name;
    app.edit(function (d) {
      var list = D.effectiveButtons(d, cat, c.id).buttons.slice();
      var b = Object.assign({}, clip.button);
      b[pos] = c.button[pos];
      list[c.index] = b;
      return D.setButtons(d, cat, c.id, list);
    });
    return true;
  }

  // What a click or focus on `target` makes Copy act on: "button" on the
  // button list, the preview or the button's fields, "set" on the item
  // list, and null elsewhere.
  function areaOf(target) {
    if (!target || !target.closest) return null;
    if (target.closest(".buttons-box, .preview-box, .button-form")) return "button";
    if (target.closest(".sidebar")) return "set";
    return null;
  }

  // A shortcut as the platform writes it: Cmd on a Mac, Ctrl elsewhere.
  function shortcut(k) {
    var p = typeof navigator !== "undefined" ? navigator.platform || "" : "";
    return (/^Mac|^iP/.test(p) ? "\u2318" : "Ctrl+") + k;
  }

  // The buttons under the item list: add a set, remove a new one, and copy
  // and paste a set.
  function treeActions(app) {
    var cat = app.cat();
    var doc = app.doc();
    var id = chosenSet(app);
    var has = id !== null;
    var eff = has ? D.effectiveButtons(doc, cat, id) : null;
    var clip = clipboard(app);
    var nextId = D.nextNewSet(doc, cat);
    var name = has ? D.setText(cat, id, doc) : "";

    function button(action, label, title, disabled, onclick) {
      return h("button", {
        type: "button",
        class: "small",
        title: title,
        "aria-disabled": disabled ? "true" : null,
        dataset: { action: action, focus: action },
        onclick: function () {
          if (!disabled) onclick();
        }
      }, label);
    }

    return [
      button("set-add", "Add", nextId === null ? "Every new set ID is in use" : "Add a new set with no buttons, as set " + nextId, nextId === null, function () {
        var made = null;
        app.edit(function (d) {
          made = D.addSet(d, cat, null);
          return made.doc;
        });
        if (made) app.select("button_sets", tree.key.set(made.id));
      }),
      button("set-remove", "Remove", !has ? "No set is chosen" : eff.isNew ? "Remove " + name + " from the mod. Entries still assigned to it will show an error until they get another set." : "Only sets this mod adds can be removed", !has || !eff.isNew, function () {
        app.edit(function (d) {
          return D.revertSet(d, cat, id);
        });
        app.state.selection.button_sets = null;
        app.render();
      }),
      button("set-copy", "Copy", has ? "Copy the buttons of " + name + " (" + shortcut("C") + ")" : "No set is chosen", !has, function () {
        copySet(app);
      }),
      button("set-paste", "Paste", !clip ? "Copy a set first, to paste its buttons here" : !has ? "No set is chosen" : "Replace the buttons of " + name + " with those copied from " + clip.name + " (" + shortcut("V") + ")", !clip || !has, function () {
        pasteSet(app);
      })
    ];
  }

  AG.ui.panels.button_sets = panel;
  AG.ui.treeActions = AG.ui.treeActions || {};
  AG.ui.treeActions.button_sets = treeActions;
  AG.ui.clipboard = AG.ui.clipboard || {};
  AG.ui.clipboard.button_sets = {
    areaOf: areaOf,
    copy: function (app, area) {
      return area === "button" ? copyButton(app) : copySet(app);
    },
    // Only one of a set and a button is ever copied, so paste is whichever.
    paste: function (app) {
      return clipboard(app, "buttonClipboard") ? pasteButton(app) : pasteSet(app);
    }
  };
  AG.ui.buttonSets = { usedBy: usedBy, newButton: newButton, iconEl: iconEl, mapItems: mapItems, stringItems: stringItems, showString: showString, entryItems: entryItems };
})(AxeGraft);
