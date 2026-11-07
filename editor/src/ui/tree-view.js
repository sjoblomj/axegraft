// The item list: a tree following the WAI-ARIA tree pattern. Focus stays on
// the tree, and aria-activedescendant names the current row, which moves
// with the arrow keys. Moving onto an item selects it.
"use strict";

(function (AG) {
  var h = AG.ui.h;

  function marks(node) {
    var out = [];
    if (node.changed) out.push(h("span", { class: "mark changed", title: "Changed", "aria-label": "changed", text: "•" }));
    if (node.error) out.push(h("span", { class: "mark error", title: "Error", "aria-label": "error", text: "!" }));
    if (node.warning) out.push(h("span", { class: "mark warning", title: "Warning", "aria-label": "warning", text: "!" }));
    return out.length ? h("span", { class: "marks" }, out) : null;
  }

  function rowId(prefix, key) {
    return prefix + "-" + key.replace(/[^A-Za-z0-9_-]/g, "_");
  }

  // Renders the tree. `view` has:
  //   nodes, expanded (keys), cursor (key), selected (key), idPrefix,
  //   onSelect(key), onToggle(key, open), onCursor(key), and optionally
  //   flat (true for a list without groups), title (its tooltip) and onType(char), called when a
  //   printable character is typed while the tree has focus.
  function render(view) {
    var rows = AG.core.tree.visible(view.nodes, view.expanded);
    var byKey = {};
    rows.forEach(function (r) {
      byKey[r.node.key] = r;
    });
    var cursor = view.cursor && byKey[view.cursor] ? view.cursor : view.selected && byKey[view.selected] ? view.selected : rows.length ? rows[0].node.key : null;

    function li(n, depth) {
      var r = byKey[n.key];
      var isGroup = n.type === "group";
      var open = r && r.open;
      var attrs = {
        role: "treeitem",
        id: rowId(view.idPrefix, n.key),
        "aria-level": depth + 1,
        "aria-selected": n.type === "item" ? String(n.key === view.selected) : null,
        "aria-expanded": isGroup ? String(!!open) : null,
        dataset: { key: n.key, cursor: n.key === cursor ? "true" : null }
      };
      var label = h("span", { class: "row", style: { "--depth": String(depth) } }, [
        h("span", { class: "twisty", "aria-hidden": "true", text: isGroup ? (open ? "▾" : "▸") : "" }),
        h("span", { class: "text", text: n.label }),
        marks(n)
      ]);
      label.addEventListener("click", function () {
        if (isGroup) view.onToggle(n.key, !open);
        else view.onSelect(n.key);
        view.onCursor(n.key);
      });
      var el = h("li", attrs, [label]);
      if (isGroup && open) el.appendChild(h("ul", { role: "group" }, n.children.map(function (c) {
        return li(c, depth + 1);
      })));
      if (n.key === cursor) el.classList.add("cursor");
      return el;
    }

    var tree = h(
      "ul",
      {
        class: view.flat ? "tree flat" : "tree",
        role: "tree",
        tabindex: "0",
        "aria-label": view.label || "Items",
        title: view.title || null,
        "aria-activedescendant": cursor ? rowId(view.idPrefix, cursor) : null,
        dataset: { focus: "tree" }
      },
      view.nodes.length ? view.nodes.map(function (n) {
        return li(n, 0);
      }) : [h("li", { class: "empty", role: "none", text: view.emptyText || "Nothing matches." })]
    );

    tree.addEventListener("keydown", function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var i = -1;
      rows.forEach(function (r, j) {
        if (r.node.key === cursor) i = j;
      });
      if (i < 0 && rows.length) i = 0;
      var r = rows[i];
      function moveTo(j) {
        var target = rows[j];
        if (!target) return;
        view.onCursor(target.node.key);
        if (target.node.type === "item") view.onSelect(target.node.key);
      }
      var handled = true;
      switch (e.key) {
        case "ArrowDown":
          moveTo(Math.min(i + 1, rows.length - 1));
          break;
        case "ArrowUp":
          moveTo(Math.max(i - 1, 0));
          break;
        case "Home":
          moveTo(0);
          break;
        case "End":
          moveTo(rows.length - 1);
          break;
        case "ArrowRight":
          if (r && r.node.type === "group") {
            if (!r.open) view.onToggle(r.node.key, true);
            else if (r.node.children.length) moveTo(i + 1);
          }
          break;
        case "ArrowLeft":
          if (r && r.node.type === "group" && r.open && !r.node.forced) view.onToggle(r.node.key, false);
          else if (r && r.parent) {
            for (var j = i - 1; j >= 0; j--)
              if (rows[j].node.key === r.parent) {
                view.onCursor(rows[j].node.key);
                break;
              }
          }
          break;
        case "Enter":
        case " ":
          if (r && r.node.type === "group") view.onToggle(r.node.key, !r.open);
          else if (r) view.onSelect(r.node.key);
          break;
        default:
          // Typing starts a search. The character is passed on rather than
          // left to the browser, since focus moves while the key is down.
          if (view.onType && e.key.length === 1 && e.key !== " ") view.onType(e.key);
          else handled = false;
      }
      if (handled) e.preventDefault();
    });
    return tree;
  }

  AG.ui.treeView = { render: render, rowId: rowId };
})(AxeGraft);
