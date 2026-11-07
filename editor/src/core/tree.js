// The item list of each tab: building the tree from the catalog and the
// mod, marking changes and problems, filtering, and finding where a problem
// belongs. No DOM, so a different front end could use it too.
"use strict";

(function (AG) {
  var util = AG.util;
  var isObject = util.isObject;
  var isInt = util.isInt;

  var TABS = [
    { id: "units", part: "units", label: "Units" },
    { id: "button_sets", part: "button_sets", label: "Button Sets" },
    { id: "requirements", part: "requirements", label: "Requirements" },
    { id: "constants", part: "constants", label: "Constants" }
  ];

  var REQ_GROUPS = [
    { type: "unit", label: "Units", kind: "unit" },
    { type: "upgrade", label: "Upgrades", kind: "upgrade" },
    { type: "tech_research", label: "Tech research", kind: "tech" },
    { type: "tech_use", label: "Tech use", kind: "tech" },
    { type: "order", label: "Orders", kind: "order" }
  ];

  function tabsFor(cat) {
    return TABS.filter(function (t) {
      return cat.has(t.part);
    });
  }

  function idLabel(id, name) {
    return name ? id + " " + name : String(id);
  }

  // Item keys identify an item within its tab.
  var key = {
    unit: function (id) {
      return "unit:" + id;
    },
    set: function (id) {
      return "set:" + id;
    },
    req: function (type, id) {
      return "req:" + type + ":" + id;
    },
    constant: function (name) {
      return "const:" + name;
    }
  };

  function parseKey(k) {
    var m;
    if ((m = /^unit:(\d+)$/.exec(k))) return { tab: "units", id: +m[1] };
    if ((m = /^set:(\d+)$/.exec(k))) return { tab: "button_sets", id: +m[1] };
    if ((m = /^req:([a-z_]+):(\d+)$/.exec(k))) return { tab: "requirements", type: m[1], id: +m[2] };
    if ((m = /^const:(.+)$/.exec(k))) return { tab: "constants", name: m[1] };
    return null;
  }

  // Where a problem's path belongs: the tab, the item and the field.
  // Returns null for an entry the item list can't show.
  function locate(doc, cat, path) {
    var m = /^(units|button_sets|requirements|constants)\[(\d+)\](.*)$/.exec(path || "");
    if (!m) return null;
    var e = AG.core.doc.entries(doc, m[1])[+m[2]];
    if (!isObject(e)) return null;
    var rest = m[3];
    var field = /^\.([a-z_]+)/.exec(rest);
    if (m[1] === "units") {
      if (!isInt(e.id) || !util.inRange(e.id, cat.limits.tableEntry)) return null;
      return { tab: "units", key: key.unit(e.id), field: field ? field[1] : null };
    }
    if (m[1] === "button_sets") {
      if (!isInt(e.id) || !(cat.sets.has(e.id) || util.inRange(e.id, cat.limits.newButtonSet))) return null;
      var b = /^\.buttons\[(\d+)\](?:\.([a-z_]+))?/.exec(rest);
      return { tab: "button_sets", key: key.set(e.id), button: b ? +b[1] : null, field: b ? b[2] || null : field ? field[1] : null };
    }
    if (m[1] === "requirements") {
      var lim = cat.limits[AG.core.validate.TYPE_LIMIT[e.type]];
      if (!lim || !isInt(e.id) || !util.inRange(e.id, lim)) return null;
      var t = /^\.list\[(\d+)\]/.exec(rest);
      return { tab: "requirements", key: key.req(e.type, e.id), token: t ? +t[1] : null, field: field ? field[1] : null };
    }
    if (typeof e.name !== "string" || !cat.constants.has(e.name)) return null;
    return { tab: "constants", key: key.constant(e.name), field: field ? field[1] : null };
  }

  // The keys of every item the mod changes, by tab.
  function changedKeys(doc, cat) {
    var out = { units: {}, button_sets: {}, requirements: {}, constants: {} };
    AG.core.doc.entries(doc, "units").forEach(function (e, i) {
      var l = locate(doc, cat, "units[" + i + "]");
      if (l) out.units[l.key] = true;
    });
    AG.core.doc.entries(doc, "button_sets").forEach(function (e, i) {
      var l = locate(doc, cat, "button_sets[" + i + "]");
      if (l) out.button_sets[l.key] = true;
    });
    AG.core.doc.entries(doc, "requirements").forEach(function (e, i) {
      var l = locate(doc, cat, "requirements[" + i + "]");
      if (l) out.requirements[l.key] = true;
    });
    AG.core.doc.entries(doc, "constants").forEach(function (e, i) {
      var l = locate(doc, cat, "constants[" + i + "]");
      if (l) out.constants[l.key] = true;
    });
    return out;
  }

  // Markers for every item: { tab: { key: { changed, error, warning } } },
  // and the problems no item can show.
  function marks(doc, cat, problems) {
    var changed = changedKeys(doc, cat);
    var out = {};
    var orphans = [];
    TABS.forEach(function (t) {
      out[t.id] = {};
      Object.keys(changed[t.id]).forEach(function (k) {
        out[t.id][k] = { changed: true, error: false, warning: false };
      });
    });
    (problems || []).forEach(function (p) {
      var l = locate(doc, cat, p.path);
      if (!l) {
        if (/^(units|button_sets|requirements|constants)\[\d+\]/.test(p.path || "")) orphans.push(p);
        return;
      }
      var m = out[l.tab][l.key] || (out[l.tab][l.key] = { changed: false, error: false, warning: false });
      if (p.severity === "error") m.error = true;
      else m.warning = true;
    });
    return { items: out, orphans: orphans };
  }

  // Inserts an item under the groups in `tree`, creating them as needed.
  function placer(root) {
    var groups = {};
    return function (tree, item) {
      var parent = root;
      var path = "";
      (tree || []).forEach(function (name) {
        path += "/" + name;
        var g = groups[path];
        if (!g) {
          g = { type: "group", key: "group:" + path, label: name, children: [] };
          groups[path] = g;
          parent.children.push(g);
        }
        parent = g;
      });
      parent.children.push(item);
    };
  }

  function sortGroup(node, numeric) {
    if (!node.children) return;
    if (numeric) {
      // Groups keep the catalog's order; items within a group sort by ID.
      var items = node.children.filter(function (c) {
        return c.type === "item";
      });
      items.sort(function (a, b) {
        return a.id - b.id;
      });
      var i = 0;
      node.children = node.children.map(function (c) {
        return c.type === "item" ? items[i++] : c;
      });
    }
    node.children.forEach(function (c) {
      sortGroup(c, numeric);
    });
  }

  function item(k, id, label, extra) {
    var it = { type: "item", key: k, id: id, label: label };
    if (extra)
      Object.keys(extra).forEach(function (x) {
        it[x] = extra[x];
      });
    return it;
  }

  // Builds the tree for a tab. Items from the catalog come first, under its
  // groups; valid IDs the mod uses that the catalog doesn't name follow.
  function build(tab, doc, cat) {
    var root = { type: "group", key: "group:", label: "", children: [] };
    var place = placer(root);
    var seen = {};
    if (tab === "units") {
      cat.raw.units.forEach(function (u) {
        seen[u.id] = true;
        place(u.tree, item(key.unit(u.id), u.id, idLabel(u.id, AG.core.doc.unitLabel(doc, u.id) || u.name)));
      });
      AG.core.doc.entries(doc, "units").forEach(function (e) {
        if (isObject(e) && isInt(e.id) && util.inRange(e.id, cat.limits.tableEntry) && !seen[e.id]) {
          seen[e.id] = true;
          place(["Not in the catalog"], item(key.unit(e.id), e.id, idLabel(e.id, AG.core.doc.unitLabel(doc, e.id))));
        }
      });
      sortGroup(root, true);
    } else if (tab === "button_sets") {
      cat.raw.buttonSets.forEach(function (s) {
        seen[s.id] = true;
        place(s.tree, item(key.set(s.id), s.id, idLabel(s.id, s.name)));
      });
      AG.core.doc.entries(doc, "button_sets").forEach(function (e) {
        if (isObject(e) && isInt(e.id) && util.inRange(e.id, cat.limits.newButtonSet) && !seen[e.id]) {
          seen[e.id] = true;
          place(["New sets"], item(key.set(e.id), e.id, idLabel(e.id, typeof e.label === "string" && e.label ? e.label : "New set"), { isNew: true }));
        }
      });
      sortGroup(root, true);
    } else if (tab === "requirements") {
      REQ_GROUPS.forEach(function (g) {
        var group = { type: "group", key: "group:/" + g.label, label: g.label, children: [] };
        root.children.push(group);
        var gplace = placer(group);
        var ids = {};
        var named = { unit: cat.raw.units, upgrade: cat.raw.upgrades, tech: cat.raw.techs, order: cat.raw.orders }[g.kind] || [];
        named.forEach(function (x) {
          if (g.kind === "unit" && !util.inRange(x.id, cat.limits.unit)) return;
          ids[x.id] = true;
          gplace(x.tree, item(key.req(g.type, x.id), x.id, idLabel(x.id, x.name), { reqType: g.type }));
        });
        var extra = [];
        cat.requirements.forEach(function (r) {
          if (r.type === g.type && !ids[r.id]) {
            ids[r.id] = true;
            extra.push(r.id);
          }
        });
        AG.core.doc.entries(doc, "requirements").forEach(function (e) {
          var lim = cat.limits[AG.core.validate.TYPE_LIMIT[g.type]];
          if (isObject(e) && e.type === g.type && isInt(e.id) && lim && util.inRange(e.id, lim) && !ids[e.id]) {
            ids[e.id] = true;
            extra.push(e.id);
          }
        });
        extra.forEach(function (id) {
          gplace(["Other"], item(key.req(g.type, id), id, idLabel(id, null), { reqType: g.type }));
        });
      });
      sortGroup(root, true);
    } else if (tab === "constants") {
      cat.constantList.forEach(function (c) {
        place(c.group, item(key.constant(c.name), null, c.label, { name: c.name }));
      });
    }
    return root.children;
  }

  // Copies the tree with markers on items and the groups that hold them.
  function mark(nodes, itemMarks) {
    return nodes.map(function (n) {
      if (n.type === "item") {
        var m = itemMarks[n.key] || {};
        var copy = Object.assign({}, n);
        copy.changed = !!m.changed;
        copy.error = !!m.error;
        copy.warning = !!m.warning;
        return copy;
      }
      var children = mark(n.children, itemMarks);
      var g = Object.assign({}, n, { children: children });
      g.changed = children.some(function (c) {
        return c.changed;
      });
      g.error = children.some(function (c) {
        return c.error;
      });
      g.warning = children.some(function (c) {
        return c.warning;
      });
      return g;
    });
  }

  // Keeps the items whose label contains `text` (ignoring case) and that pass
  // `only`, with the groups that hold them. `only` is "changed", "errors" or
  // "warnings", or a list of them that must all hold.
  function filter(nodes, text, only) {
    var needle = (text || "").trim().toLowerCase();
    var conds = (Array.isArray(only) ? only : only ? [only] : []).filter(Boolean);
    if (!needle && !conds.length) return nodes;
    var FLAG = { changed: "changed", errors: "error", warnings: "warning" };
    function keep(n) {
      if (needle && n.label.toLowerCase().indexOf(needle) < 0) return false;
      return conds.every(function (c) {
        return n[FLAG[c]];
      });
    }
    function walk(list) {
      var out = [];
      list.forEach(function (n) {
        if (n.type === "item") {
          if (keep(n)) out.push(n);
        } else {
          var children = walk(n.children);
          if (children.length) out.push(Object.assign({}, n, { children: children, forced: true }));
        }
      });
      return out;
    }
    return walk(nodes);
  }

  // Every item of the tree, without its groups, for the list view. Items
  // with IDs are in ID order (requirements by type first); others keep the
  // tree's order.
  function flatten(nodes) {
    var items = [];
    (function walk(list) {
      list.forEach(function (n) {
        if (n.type === "item") items.push(n);
        else walk(n.children);
      });
    })(nodes);
    var numeric = items.every(function (n) {
      return isInt(n.id);
    });
    if (!numeric) return items;
    var typeOrder = {};
    REQ_GROUPS.forEach(function (g, i) {
      typeOrder[g.type] = i;
    });
    return items
      .map(function (n, i) {
        return { n: n, i: i };
      })
      .sort(function (a, b) {
        var ta = typeOrder[a.n.reqType] || 0;
        var tb = typeOrder[b.n.reqType] || 0;
        return ta - tb || a.n.id - b.n.id || a.i - b.i;
      })
      .map(function (x) {
        return x.n;
      });
  }

  // The rows shown, in order, with their depth and parent. A group is open
  // when it's expanded or when a filter forced it open.
  function visible(nodes, expanded) {
    var rows = [];
    function walk(list, depth, parent) {
      list.forEach(function (n) {
        var open = n.type === "group" && (n.forced || !!expanded[n.key]);
        rows.push({ node: n, depth: depth, parent: parent, open: open });
        if (open) walk(n.children, depth + 1, n.key);
      });
    }
    walk(nodes, 0, null);
    return rows;
  }

  // The keys of the groups that hold an item, so it can be shown.
  function groupsOf(nodes, itemKey) {
    var found = null;
    function walk(list, trail) {
      list.forEach(function (n) {
        if (found) return;
        if (n.type === "item" && n.key === itemKey) found = trail;
        else if (n.type === "group") walk(n.children, trail.concat([n.key]));
      });
    }
    walk(nodes, []);
    return found;
  }

  function firstItem(nodes) {
    var found = null;
    (function walk(list) {
      list.some(function (n) {
        if (n.type === "item") found = n;
        else walk(n.children);
        return !!found;
      });
    })(nodes);
    return found;
  }

  AG.core.tree = {
    TABS: TABS,
    REQ_GROUPS: REQ_GROUPS,
    tabsFor: tabsFor,
    key: key,
    parseKey: parseKey,
    locate: locate,
    marks: marks,
    build: build,
    mark: mark,
    filter: filter,
    flatten: flatten,
    visible: visible,
    groupsOf: groupsOf,
    firstItem: firstItem,
    idLabel: idLabel
  };
})(AxeGraft);
