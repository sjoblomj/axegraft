// Dragging to move things: rows of a list to another place in it, and
// buttons of the preview to another position. Built on pointer events, so
// it works with a mouse, a pen or a finger, and on <button> elements.
//
// A press only becomes a drag once the pointer has moved a few pixels, so a
// click still works as before. The click that ends a drag is swallowed.
"use strict";

(function (AG) {
  var h = AG.ui.h;
  var THRESHOLD = 4;

  // The handle that marks something as draggable: six dots, drawn by the
  // style sheet so they aren't part of the row's text.
  function grip(title) {
    return h("span", { class: "grip", "aria-hidden": "true", title: title || "Drag to move" });
  }

  // The element under the pointer. A finger's pointer events stay with the
  // element they started on, so ask the document; synthetic events, as in
  // the tests, may come from outside the viewport, so fall back on the target.
  function under(e, within) {
    var el = typeof document.elementFromPoint === "function" ? document.elementFromPoint(e.clientX, e.clientY) : null;
    if (!el || !within.contains(el)) el = e.target;
    return el && el.nodeType === 1 ? el : null;
  }

  // A copy of `el` that follows the pointer. A list row goes inside a bare
  // copy of its list, so the list's styles still apply.
  function makeGhost(el) {
    var rect = el.getBoundingClientRect();
    var parent = el.parentNode;
    var copy = el.cloneNode(true);
    Array.prototype.forEach.call([copy].concat(Array.prototype.slice.call(copy.querySelectorAll("[id]"))), function (n) {
      n.removeAttribute("id");
    });
    var from = el.querySelectorAll("select");
    Array.prototype.forEach.call(copy.querySelectorAll("select"), function (s, i) {
      s.selectedIndex = from[i].selectedIndex;
    });
    var ghost = copy;
    if (parent.tagName === "UL" || parent.tagName === "OL") {
      ghost = document.createElement(parent.tagName);
      ghost.className = parent.className;
      ghost.appendChild(copy);
    }
    ghost.classList.add("drag-ghost");
    ghost.style.width = rect.width + "px";
    ghost.style.left = rect.left + "px";
    ghost.style.top = rect.top + "px";
    // Inside the editor, so its theme applies.
    (el.closest("[data-theme]") || document.body).appendChild(ghost);
    return { el: ghost, dx: rect.left, dy: rect.top };
  }

  // Follows a press on `handle`. `opts`:
  //   source     the element being dragged, dimmed while it is
  //   area       the element drops are looked for in
  //   target(el, e) the drop target for the element under the pointer,
  //              which may be null, and the pointer event; or null
  //   mark(t, e) shows where a drop on target t would go
  //   unmark()   hides it
  //   drop(t, e) does the move
  //   beside     puts the copy that follows the pointer beside it, not under
  //              it, where it would hide marks drawn at the pointer
  function track(handle, opts) {
    handle.addEventListener("dragstart", function (e) {
      e.preventDefault();
    });
    handle.addEventListener("pointerdown", function (down) {
      if (down.button !== 0 || down.ctrlKey || down.metaKey || down.shiftKey || down.altKey) return;
      var dragging = false;
      var ghost = null;
      var target = null;
      var doc = handle.ownerDocument;

      function move(e) {
        if (e.pointerId !== down.pointerId) return;
        if (!dragging) {
          if (Math.abs(e.clientX - down.clientX) < THRESHOLD && Math.abs(e.clientY - down.clientY) < THRESHOLD) return;
          dragging = true;
          if (opts.source.isConnected && opts.source.getBoundingClientRect().width) {
            ghost = makeGhost(opts.source);
            ghost.ox = opts.beside ? -12 : down.clientX - ghost.dx;
            ghost.oy = opts.beside ? -12 : down.clientY - ghost.dy;
          }
          opts.source.classList.add("drag-source");
          doc.documentElement.classList.add("dragging");
        }
        e.preventDefault();
        if (ghost) {
          ghost.el.style.left = e.clientX - ghost.ox + "px";
          ghost.el.style.top = e.clientY - ghost.oy + "px";
        }
        var t = opts.target(under(e, opts.area), e);
        opts.unmark();
        target = t;
        if (t) opts.mark(t, e);
      }

      function up(e) {
        if (e.pointerId !== down.pointerId) return;
        finish();
        if (!dragging || e.type === "pointercancel") return;
        // The click that follows the release would select or create.
        var swallow = function (c) {
          c.stopPropagation();
          c.preventDefault();
        };
        doc.addEventListener("click", swallow, true);
        setTimeout(function () {
          doc.removeEventListener("click", swallow, true);
        }, 0);
        var el = under(e, opts.area);
        var t = opts.target(el, e);
        if (!t && !el) t = target;
        if (t) opts.drop(t, e);
      }

      function key(e) {
        if (e.key !== "Escape") return;
        e.preventDefault();
        dragging = false;
        finish();
      }

      function finish() {
        doc.removeEventListener("pointermove", move, true);
        doc.removeEventListener("pointerup", up, true);
        doc.removeEventListener("pointercancel", up, true);
        doc.removeEventListener("keydown", key, true);
        opts.unmark();
        opts.source.classList.remove("drag-source");
        doc.documentElement.classList.remove("dragging");
        if (ghost && ghost.el.parentNode) ghost.el.parentNode.removeChild(ghost.el);
        ghost = null;
      }

      doc.addEventListener("pointermove", move, true);
      doc.addEventListener("pointerup", up, true);
      doc.addEventListener("pointercancel", up, true);
      doc.addEventListener("keydown", key, true);
    });
  }

  // Lets the rows of `list` be dragged to another place in it. `rows` are
  // the row elements in order. `handleOf(row)` is the part that starts a drag,
  // the row itself by default. `onMove(from, to)` gets the row's index and the
  // index it should have afterwards.
  function list(listEl, rows, onMove, handleOf) {
    function unmark() {
      rows.forEach(function (r) {
        r.classList.remove("drop-before", "drop-after");
      });
    }
    function target(el) {
      var row = el && el.closest ? el.closest("li") : null;
      while (row && row.parentNode !== listEl) row = row.parentNode.closest ? row.parentNode.closest("li") : null;
      return row && rows.indexOf(row) >= 0 ? row : null;
    }
    function place(row, e) {
      var r = row.getBoundingClientRect();
      var after = r.height ? e.clientY > r.top + r.height / 2 : false;
      return { row: row, after: after };
    }
    rows.forEach(function (row, from) {
      track(handleOf ? handleOf(row) : row, {
        source: row,
        area: listEl,
        target: target,
        mark: function (t, e) {
          t.classList.add(place(t, e).after ? "drop-after" : "drop-before");
        },
        unmark: unmark,
        drop: function (t, e) {
          var p = place(t, e);
          var to = rows.indexOf(t) + (p.after ? 1 : 0);
          if (to > from) to -= 1;
          if (to !== from) onMove(from, to);
        }
      });
    });
  }

  AG.ui.drag = { grip: grip, track: track, list: list };
})(AxeGraft);
