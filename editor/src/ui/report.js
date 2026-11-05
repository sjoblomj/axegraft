// The version compatibility report: for each version, whether the mod
// would apply fully, apply with constants skipped, or be rejected.
"use strict";

(function (AG) {
  var h = AG.ui.h;

  var RESULT = { applies: "Applies", skipped: "Applies, with constants skipped", rejected: "Rejected" };

  function show(app) {
    var results = app.state.report;
    var close = null;
    function link(path, text) {
      return h("button", { type: "button", class: "link", dataset: { goto: path }, onclick: function () {
        close(null);
        app.goTo(path);
      } }, text);
    }
    var table = h("table", { class: "report-table", dataset: { report: "" } }, [
      h("thead", null, [h("tr", null, [h("th", { text: "Version" }), h("th", { text: "Result" }), h("th", { text: "Why" })])]),
      h(
        "tbody",
        null,
        results.map(function (r) {
          var why = r.causes
            .map(function (c) {
              return h("div", null, [link(c.path, c.message)]);
            })
            .concat(
              r.skipped.map(function (s) {
                return h("div", null, [link(s.path, "Skipped: " + s.message)]);
              })
            );
          return h("tr", { dataset: { version: r.version, result: r.result } }, [
            h("td", { text: r.label }),
            h("td", { class: "result-" + r.result, text: RESULT[r.result] }),
            h("td", null, why.length ? why : ["—"])
          ]);
        })
      )
    ]);
    var body = [
      h("p", { dataset: { reportNote: "" }, text: "These results are predictions from the " + app.cat().title + " catalog. AxeGraft Patcher decides for itself which versions it supports, and whether a game's file matches, when it runs. A version's result never stops the mod being saved." }),
      h("p", null, [h("strong", { text: AG.core.compat.summary(results) + "." })]),
      table
    ];
    return AG.ui.dialogs.show(app.root, "Version compatibility", body, [{ label: "Close", value: "close" }], {
      name: "report",
      onOpen: function (dlg, c) {
        close = c;
      }
    });
  }

  AG.ui.report = { show: show };
})(AxeGraft);
