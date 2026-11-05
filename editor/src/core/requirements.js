// Requirement records as rows: one row for each opcode, with its parameter
// if it takes one, and one for each bare unit ID. The mod stores the flat
// list; the editor shows rows. Converting a list to rows and back gives the
// same list, whatever it holds.
"use strict";

(function (AG) {
  var util = AG.util;

  // Rows from a flat list. Each row is one of:
  //   { kind: "unit", unit, at }               a bare unit ID
  //   { kind: "op", op, at }                   an opcode without a parameter
  //   { kind: "op", op, param, at }            an opcode and its parameter
  // `at` is the index of the row's first token in the list. An opcode that
  // takes a parameter but isn't followed by a number has no `param`.
  function toRows(cat, list) {
    var rows = [];
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (typeof t === "number") {
        rows.push({ kind: "unit", unit: t, at: i });
        continue;
      }
      var op = cat.opcodes.get(t);
      var row = { kind: "op", op: t, at: i };
      if (op && op.parameter && typeof list[i + 1] === "number") {
        row.param = list[i + 1];
        i++;
      }
      rows.push(row);
    }
    return rows;
  }

  function toList(rows) {
    var out = [];
    rows.forEach(function (r) {
      if (r.kind === "unit") out.push(r.unit);
      else {
        out.push(r.op);
        if (util.has(r, "param") && r.param !== undefined) out.push(r.param);
      }
    });
    return out;
  }

  // How each row sits in the record's structure: inside an upgrade level,
  // an `or`, or one of the conditions an `or` joins.
  function structure(cat, rows) {
    var level = null;
    return rows.map(function (r, i) {
      var op = r.kind === "op" ? cat.opcodes.get(r.op) : null;
      var role = op ? op.role || null : null;
      var s = { role: role, level: null, alternative: false };
      if (role === "level") {
        level = r.op;
        s.level = level;
        return s;
      }
      s.level = level;
      if (role === "endSublist") level = null;
      if (role !== "or") {
        var prev = rows[i - 1];
        var next = rows[i + 1];
        function isOr(x) {
          return x && x.kind === "op" && cat.opcodes.get(x.op) && cat.opcodes.get(x.op).role === "or";
        }
        s.alternative = isOr(prev) || isOr(next);
      }
      return s;
    });
  }

  // The problems of a list, attached to the rows they're about.
  function rowProblems(cat, type, rows) {
    var list = toList(rows);
    var byRow = rows.map(function () {
      return [];
    });
    AG.core.validate.listProblems(cat, type, list).forEach(function (p) {
      var idx = 0;
      for (var i = 0; i < rows.length; i++) if (rows[i].at <= p.index) idx = i;
      if (p.index === null || !rows.length) idx = Math.max(0, rows.length - 1);
      if (rows.length) byRow[idx].push(p.message);
    });
    return byRow;
  }

  // Renumbers `at` after rows were added, removed or moved.
  function reindex(rows) {
    var at = 0;
    return rows.map(function (r) {
      var copy = Object.assign({}, r, { at: at });
      at += r.kind === "op" && util.has(r, "param") && r.param !== undefined ? 2 : 1;
      return copy;
    });
  }

  AG.core.requirements = {
    toRows: toRows,
    toList: toList,
    structure: structure,
    rowProblems: rowProblems,
    reindex: reindex
  };
})(AxeGraft);
