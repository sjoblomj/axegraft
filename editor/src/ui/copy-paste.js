// Copying an item and pasting it over another, with Copy and Paste buttons
// under the item list and Ctrl+C and Ctrl+V (Cmd+C and Cmd+V on a Mac).
// What was copied is kept in the editor, not on the system clipboard, for
// the session and for the game it came from, so it can be pasted into
// another mod of that game.
"use strict";

(function (AG) {
  var h = AG.ui.h;

  // A shortcut as the platform writes it: Cmd on a Mac, Ctrl elsewhere.
  function shortcut(k) {
    var p = typeof navigator !== "undefined" ? navigator.platform || "" : "";
    return (/^Mac|^iP/.test(p) ? "⌘" : "Ctrl+") + k;
  }

  // A small button that stays focusable when disabled, so its tooltip can
  // say why.
  function actionButton(action, label, title, disabled, onclick) {
    return h("button", {
      type: "button",
      class: "small",
      title: title,
      "aria-disabled": disabled ? "true" : null,
      dataset: { action: action, focus: action, plain: "" },
      onclick: function () {
        if (!disabled) onclick();
      }
    }, label);
  }

  // Copying and pasting one kind of item. `o` has:
  //   stateKey   where in app.state the copy is kept
  //   discard    other state keys cleared on copying, as only one thing is
  //              copied at a time
  //   noun       what the item is called, as "unit"
  //   action     the prefix of the buttons' data-action, as "unit"
  //   chosen(app)          the chosen item, or null
  //   label(app, item)     the item's name, for tooltips
  //   take(app, item)      what is copied of it
  //   put(doc, app, item, data)  the document with data pasted over item
  //   pasteText(to, from)  what Paste does, for its tooltip
  function make(o) {
    function clip(app) {
      var c = app.state[o.stateKey];
      return c && c.game === app.state.game ? c : null;
    }
    function copy(app) {
      var item = o.chosen(app);
      if (!item) return false;
      app.state[o.stateKey] = { game: app.state.game, name: o.label(app, item), data: o.take(app, item) };
      (o.discard || []).forEach(function (k) {
        app.state[k] = null;
      });
      app.render();
      return true;
    }
    function paste(app) {
      var item = o.chosen(app);
      var c = clip(app);
      if (!item || !c) return false;
      app.edit(function (d) {
        return o.put(d, app, item, c.data);
      });
      return true;
    }
    function buttons(app) {
      var item = o.chosen(app);
      var c = clip(app);
      var name = item ? o.label(app, item) : "";
      var none = "No " + o.noun + " is chosen";
      return [
        actionButton(o.action + "-copy", "Copy", item ? "Copy " + name + " (" + shortcut("C") + ")" : none, !item, function () {
          copy(app);
        }),
        actionButton(o.action + "-paste", "Paste", !c ? "Copy a " + o.noun + " first, to paste it here" : !item ? none : o.pasteText(name, c.name) + " (" + shortcut("V") + ")", !c || !item, function () {
          paste(app);
        })
      ];
    }
    return { clip: clip, copy: copy, paste: paste, buttons: buttons };
  }

  AG.ui.copyPaste = { make: make, actionButton: actionButton, shortcut: shortcut };
  // Per tab: the buttons under the item list, and what Ctrl+C and Ctrl+V
  // do, as { copy(app, area), paste(app), areaOf(target) }, areaOf being
  // optional.
  AG.ui.treeActions = AG.ui.treeActions || {};
  AG.ui.clipboard = AG.ui.clipboard || {};
})(AxeGraft);
