// The guide to making a mod, shown from the Help menu and the start screen.
// Its text is Markdown, and this reads the part of Markdown the guide uses:
// headings, paragraphs, lists, tables, bold, code and links.
"use strict";

(function (AG) {
  var h = AG.ui.h;

  var HEADING = /^(#{1,3})\s+(.*)$/;
  var ITEM = /^(\s*)(-|\d+\.)\s+(.*)$/;

  function inline(text) {
    var re = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
    var out = [];
    var last = 0;
    var m;
    while ((m = re.exec(text))) {
      out.push(text.slice(last, m.index));
      if (m[1] !== undefined) out.push(h("strong", { text: m[1] }));
      else if (m[2] !== undefined) out.push(h("code", { text: m[2] }));
      // In a new tab, so following it can't lose unsaved work.
      else out.push(h("a", { href: m[4], target: "_blank", rel: "noopener", text: m[3] }));
      last = re.lastIndex;
    }
    out.push(text.slice(last));
    return out;
  }

  // Reads the list starting at line i, and any lists nested in it.
  function list(lines, i, indent) {
    var el = h(/\d/.test(ITEM.exec(lines[i])[2]) ? "ol" : "ul");
    var item = null;
    while (i < lines.length) {
      var m = ITEM.exec(lines[i]);
      if (!m || m[1].length < indent) break;
      if (m[1].length > indent) {
        var nested = list(lines, i, m[1].length);
        item.appendChild(nested.el);
        i = nested.next;
      } else {
        item = h("li", null, inline(m[3]));
        el.appendChild(item);
        i++;
      }
    }
    return { el: el, next: i };
  }

  function cells(line) {
    return line
      .replace(/^\s*\||\|\s*$/g, "")
      .split("|")
      .map(function (c) {
        return c.trim();
      });
  }

  function row(line, tag) {
    return h("tr", null, cells(line).map(function (c) {
      return h(tag, null, inline(c));
    }));
  }

  // Reads the table starting at line i. Its second line only marks the header.
  function table(lines, i) {
    var head = row(lines[i], "th");
    var rows = [];
    i += 2;
    while (i < lines.length && lines[i].charAt(0) === "|") rows.push(row(lines[i++], "td"));
    return { el: h("table", null, [h("thead", null, [head]), h("tbody", null, rows)]), next: i };
  }

  // The elements for the Markdown in `lines`. A level 1 heading is the title,
  // which the dialog shows, so it isn't one of them.
  function render(lines) {
    var out = [];
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      var heading = HEADING.exec(line);
      var block = null;
      if (!line.trim()) i++;
      else if (heading) {
        if (heading[1].length > 1) out.push(h("h" + heading[1].length, null, inline(heading[2])));
        i++;
      } else if (line.charAt(0) === "|") block = table(lines, i);
      else if (ITEM.test(line)) block = list(lines, i, ITEM.exec(line)[1].length);
      else {
        out.push(h("p", null, inline(line)));
        i++;
      }
      if (block) {
        out.push(block.el);
        i = block.next;
      }
    }
    return out;
  }

  function title(lines) {
    var m = HEADING.exec(lines[0]);
    return m ? m[2] : "";
  }

  function show(app) {
    var lines = AG.ui.guideText;
    return AG.ui.dialogs.show(app.root, title(lines), render(lines), [{ label: "Close", value: "close" }], {
      name: "guide",
      className: "guide",
      // So the arrow and page keys scroll the text straight away.
      onOpen: function (dlg) {
        var body = dlg.querySelector(".body");
        body.tabIndex = 0;
        body.focus();
      }
    });
  }

  AG.ui.guide = { show: show, render: render };
})(AxeGraft);
