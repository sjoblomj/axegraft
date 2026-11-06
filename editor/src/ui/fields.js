// Building blocks for the forms: a field row with its label, controls,
// original value, problems and ? button, and the common controls.
"use strict";

(function (AG) {
  var h = AG.ui.h;
  var help = AG.ui.help;
  var util = AG.util;

  var uid = 0;
  function nextId() {
    return "ctl-" + ++uid;
  }

  // Parses what's typed in a number box: a whole number if it is one,
  // otherwise the text as typed, which validation then reports.
  function parseNumber(text) {
    var t = String(text).trim();
    if (/^-?\d+$/.test(t)) return parseInt(t, 10);
    return t;
  }

  function showValue(v) {
    if (v === undefined) return "";
    if (typeof v === "string") return v;
    return JSON.stringify(v);
  }

  // A text box for a number. It shows whatever value the mod has, even one
  // that isn't a number, and commits on change.
  function numberInput(value, onChange, attrs) {
    var input = h("input", Object.assign({ type: "text", inputmode: "numeric", class: "ctl num", value: showValue(value), autocomplete: "off", size: 7 }, attrs || {}));
    input.addEventListener("change", function () {
      onChange(input.value.trim() === "" ? undefined : parseNumber(input.value));
    });
    return input;
  }

  // A select. A value not among the options is shown as written, marked as
  // not in the list, so a bad value from a file stays visible.
  function select(options, value, onChange, attrs) {
    var found = options.some(function (o) {
      return util.equal(o.value, value);
    });
    var all = options.slice();
    // A missing value isn't shown as the first option.
    if (!found) all.unshift({ value: value, label: value === undefined ? "(choose)" : showValue(value) + " (not in the list)" });
    var sel = h(
      "select",
      Object.assign({ class: "ctl" }, attrs || {}),
      all.map(function (o, i) {
        return h("option", { value: String(i), selected: util.equal(o.value, value), disabled: o.disabled }, o.label);
      })
    );
    sel.addEventListener("change", function () {
      onChange(all[+sel.value].value);
    });
    return sel;
  }

  // A name list and an ID box that stay in step. `items` are { id, label }.
  // With `allowNone`, a "no buttons" choice is offered, giving null.
  function idPicker(items, value, onChange, options) {
    options = options || {};
    var list = items.slice();
    var opts = [];
    if (options.allowNone) opts.push({ value: null, label: options.noneLabel || "No buttons" });
    list.forEach(function (it) {
      opts.push({ value: it.id, label: it.label });
    });
    var known = opts.some(function (o) {
      return o.value === value;
    });
    if (!known && util.isInt(value)) opts.push({ value: value, label: value + " (no name in the catalog)" });
    var input = numberInput(value === null ? "" : value, function (v) {
      if (v === undefined && options.allowNone) onChange(null);
      else onChange(v === undefined ? "" : v);
    }, { "aria-label": (options.label || "ID") + " as a number", dataset: { role: "id" } });
    if (value === null) input.placeholder = "none";
    var sel = select(opts, value, onChange, { class: "ctl wide", "aria-label": (options.label || "ID") + " by name", dataset: { role: "name" } });
    return [sel, input];
  }

  // A field row. Options:
  //   label, help (text), controls (elements), key (data-field),
  //   changed, problems ([{ severity, message }]), original (text, shown
  //   by the changed mark's tooltip),
  //   note (text), revert (function), extra (elements after the controls)
  function field(o) {
    var controls = [].concat(o.controls || []);
    var helpBtn = help.button(o.help);
    var helpId = helpBtn.getAttribute("aria-describedby");
    var firstId = null;
    controls.forEach(function (c) {
      describe(c, helpId);
      var target = c.matches && c.matches("input, select, textarea") ? c : c.querySelector && c.querySelector("input, select, textarea");
      if (target && !firstId) {
        if (!target.id) target.id = nextId();
        firstId = target.id;
      }
    });
    var problems = o.problems || [];
    var errors = problems.filter(function (p) {
      return p.severity === "error";
    });
    // Notes, such as an unused variable, aren't warnings and get no outline.
    var warnings = problems.filter(function (p) {
      return p.severity === "warning";
    });
    var row = h("div", {
      class: ["field", o.changed ? "changed" : null, errors.length ? "has-error" : null, !errors.length && warnings.length ? "has-warning" : null],
      dataset: { field: o.key || null }
    });
    row.appendChild(
      h("div", { class: "label-cell" }, [
        o.changed ? help.changedMark(o.original) : null,
        firstId ? h("label", { for: firstId, text: o.label }) : h("span", { class: "label", text: o.label })
      ])
    );
    var ctlBox = h("div", { class: "controls" }, controls);
    (o.extra || []).forEach(function (x) {
      ctlBox.appendChild(x);
    });
    if (o.revert && o.changed) {
      ctlBox.appendChild(
        withHelp(
          h("button", { type: "button", class: "small", dataset: { action: "revert" }, onclick: o.revert, text: "Revert" }),
          help.text("revertField")
        )
      );
    }
    row.appendChild(ctlBox);
    row.appendChild(helpBtn);
    if (o.note) row.appendChild(h("div", { class: "note", text: o.note }));
    problems.forEach(function (p) {
      row.appendChild(h("div", { class: "problem " + (p.severity === "error" ? "error" : p.kind === "unused" ? "unused" : "warning"), role: p.severity === "error" ? "alert" : null, text: p.message }));
    });
    return row;
  }

  // Points a control, and any controls inside it, at a help text.
  function describe(el, helpId) {
    if (!el || el.nodeType !== 1) return;
    var all = el.matches("input, select, textarea, button") ? [el] : Array.prototype.slice.call(el.querySelectorAll("input, select, textarea, button"));
    all.forEach(function (c) {
      if (c.classList.contains("help") || c.closest(".help")) return;
      if (!c.getAttribute("aria-describedby")) c.setAttribute("aria-describedby", helpId);
    });
  }

  // A control with its own ? button beside it.
  function withHelp(control, text) {
    var pair = help.described(control, text);
    return h("span", { class: "with-help" }, pair);
  }

  AG.ui.fields = {
    parseNumber: parseNumber,
    showValue: showValue,
    numberInput: numberInput,
    select: select,
    idPicker: idPicker,
    field: field,
    withHelp: withHelp,
    describe: describe,
    nextId: nextId
  };
})(AxeGraft);
