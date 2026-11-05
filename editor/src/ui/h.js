// Builds DOM elements: h(tag, attrs, children).
//
// `attrs` keys starting with "on" become event listeners, `class` and `text`
// are shortcuts, `dataset` and `style` take objects, and any other key is
// set as an attribute, or as a property for value, checked, selected,
// disabled and hidden. Children may be nested arrays, strings or null.
"use strict";

(function (AG) {
  var PROPS = { value: 1, checked: 1, selected: 1, disabled: 1, hidden: 1, indeterminate: 1 };

  function append(el, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) {
      child.forEach(function (c) {
        append(el, c);
      });
    } else if (typeof child === "string" || typeof child === "number") {
      el.appendChild(el.ownerDocument.createTextNode(String(child)));
    } else {
      el.appendChild(child);
    }
  }

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var v = attrs[key];
        if (v === undefined || v === null || v === false) return;
        if (key.slice(0, 2) === "on" && typeof v === "function") {
          el.addEventListener(key.slice(2).toLowerCase(), v);
        } else if (key === "class") {
          el.className = Array.isArray(v) ? v.filter(Boolean).join(" ") : v;
        } else if (key === "text") {
          el.textContent = v;
        } else if (key === "dataset") {
          Object.keys(v).forEach(function (d) {
            if (v[d] !== undefined && v[d] !== null) el.dataset[d] = v[d];
          });
        } else if (key === "style" && typeof v === "object") {
          Object.keys(v).forEach(function (s) {
            el.style.setProperty(s, v[s]);
          });
        } else if (PROPS[key]) {
          el[key] = v;
        } else {
          el.setAttribute(key, v === true ? "" : String(v));
        }
      });
    }
    append(el, children);
    return el;
  }

  AG.ui.h = h;
})(AxeGraft);
