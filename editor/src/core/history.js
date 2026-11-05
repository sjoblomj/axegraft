// Undo and redo: a bounded list of earlier documents. Documents share their
// unchanged parts, so keeping many is cheap.
"use strict";

(function (AG) {
  var LIMIT = 200;

  function create(doc, limit) {
    return { past: [], present: doc, future: [], limit: limit || LIMIT };
  }

  // Records a new document. A document equal to the present one isn't a change.
  function push(h, doc) {
    if (doc === h.present || AG.util.equal(doc, h.present)) return h;
    var past = h.past.concat([h.present]);
    if (past.length > h.limit) past = past.slice(past.length - h.limit);
    return { past: past, present: doc, future: [], limit: h.limit };
  }

  function undo(h) {
    if (!h.past.length) return h;
    return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present].concat(h.future), limit: h.limit };
  }

  function redo(h) {
    if (!h.future.length) return h;
    return { past: h.past.concat([h.present]), present: h.future[0], future: h.future.slice(1), limit: h.limit };
  }

  AG.core.history = {
    LIMIT: LIMIT,
    create: create,
    push: push,
    undo: undo,
    redo: redo,
    canUndo: function (h) {
      return h.past.length > 0;
    },
    canRedo: function (h) {
      return h.future.length > 0;
    }
  };
})(AxeGraft);
