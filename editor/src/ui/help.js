// Help for controls: a `?` button beside each control that shows its text
// on hover and on keyboard focus. Help for controls that are the same in
// every game is in this table; help for what's specific to a game comes
// from its catalog.
"use strict";

(function (AG) {
  var h = AG.ui.h;

  var TEXT = {
    revertField: "Puts this field back to its original value.",
    itemName: "The name AxeGraft shows for this {item}, here, in the item list and wherever else it's named. It is only used inside AxeGraft's editor and makes no changes to the game itself. Leave it empty to show the original name.",
    itemRelabelled: "This {item} was relabelled inside the mod. The name is only used in AxeGraft's editor and makes no changes to the game itself. Relabel it to the empty string to give it back its original name.",
    newSetName: "The name AxeGraft shows for this new set, here, in the item list and wherever else it's named. It is only used inside AxeGraft's editor and makes no changes to the game itself. Leave it empty to show it as Set and its ID.",
    newSetRelabelled: "This new set was named inside the mod. The name is only used in AxeGraft's editor and makes no changes to the game itself. Relabel it to the empty string to show it as Set and its ID.",
    techShared: "A tech has one name, shared by its research and use requirements.",
    revertItem: "Removes every change this mod makes to this item, so it's as in the original game.",
    goToSet: "Opens the Button Sets tab on the set this entry shows, as the mod currently assigns it.",
    ownSet: "Gives this entry its own copy of its current set, as a new set, so its buttons can change without changing other entries that share the set.",
    idInput: "Type an ID. Any ID within the field's range is accepted, even one with no name in the catalog.",
    nameSelect: "Choose by name. The list and the ID box stay in step.",
    noButtons: "Shows no buttons. The mod saves the button set as null.",
    buttonList: "The buttons of this set, in the order the game stores them. Select one to edit it. When several buttons share a position, the first one whose condition shows it is used. Drag a button onto another, and it joins that button's position. Drag it between two, and it takes the lower one's position, as in the preview: the buttons from there up to the next empty position move one position on, and are outlined while you drag. Alt+Up and Alt+Down move the selected button one place, as if dragged there. A button whose position changes moves to its place in the list, after any others at that position.",
    preview: "The command panel as the game lays it out. Click a filled position to select its button, double-click an empty one to create a button there, or drag a button to another position. Dropped on a position, the button goes there, joining any buttons already there. Dropped between two positions, it takes the second, and the buttons from there up to the next empty position move one position on to make room; those that would move are outlined. With no empty position, the last position's buttons stay where they are and are joined by the ones before them. A number shows how many buttons share a position.",
    usedBy: "The table entries that show this set, counting what this mod assigns. Editing the set changes all of them.",
    addSet: "Adds a new set with no buttons, using the lowest new set ID this mod doesn't use.",
    newSetId: "The ID for the new set. New sets use IDs from the size of the button table up.",
    removeSet: "Removes this new set from the mod. Entries still assigned to it will show an error until they get another set.",
    copyTo: "Copies the buttons of this set, as they are now, to the sets you tick. Each of those sets is then defined in the mod with the same buttons.",
    copyFrom: "Replaces the buttons of this set with those of the chosen set, as the mod has it or as in the original game. The source isn't changed.",
    copySource: "The set to copy buttons from.",
    copyOriginal: "Copy the source set's original buttons, ignoring what this mod changes in it.",
    copyVersion: "The source set's original buttons differ between versions. Choose the version whose original to copy. The first choice is the catalog's default list.",
    sortButtons: "Sorts this set's buttons by position, lowest first. Buttons at the same position keep their order.",
    jump: "Goes to the item this field refers to.",
    pickIcon: "Shows the icons, to choose one by sight.",
    rowList: "The rows of this requirement record. A row holds an opcode and its parameter, or a completed unit. Rows between a level and its end, and alternatives joined by or, are grouped.",
    rowKind: "What this row is: a completed unit, which the game stores as a bare unit ID, or an opcode.",
    rowParameter: "The number that follows the opcode, of the kind the opcode takes.",
    showOriginal: "Shows the original record beside the edited one, for each version where it differs.",
    constantValue: "The value in the scale the game stores it in. It's saved as entered; where the game stores it negated or offset, the patcher converts it.",
    constantOption: "The named behaviour to use.",
    removeEntry: "Removes this entry from the mod. Use it for entries the item list can't show.",
    goToProblem: "Shows the field with this problem.",
    modName: "The mod's name, for people using it. It doesn't change what the mod does.",
    modVersion: "The mod's version, written as you like, such as 1.0. It doesn't change what the mod does.",
    modAuthors: "Who made the mod, separated by commas. It doesn't change what the mod does.",
    importFolder: "Choose your game folder. The editor finds the game's archives in it by name and reads only the icons and strings. Nothing is changed or sent anywhere.",
    importFiles: "Choose the game's archive files, or a stat_txt.tbl file on its own."
  };

  var counter = 0;

  // Shows `tip` beside `host` while the host is hovered or focused.
  // The text is placed in window coordinates, so scrolling panels can't
  // clip it, and kept inside the window. It hides when anything scrolls,
  // since it would no longer be beside its host.
  function attachTip(host, tip) {
    function show() {
      host.classList.add("show");
      place(host, tip);
      window.addEventListener("scroll", hide, true);
      window.addEventListener("resize", hide);
    }
    function hide() {
      host.classList.remove("show");
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    }
    host.addEventListener("mouseenter", show);
    host.addEventListener("mouseleave", hide);
    host.addEventListener("focus", show);
    host.addEventListener("blur", hide);
  }

  function tipEl(text) {
    return h("span", { class: "tip", role: "tooltip", id: "help-" + ++counter, text: text });
  }

  // A `?` button that shows `text`.
  function helpButton(text) {
    var tip = tipEl(text);
    var b = h("button", { type: "button", class: "help", "aria-label": "Help", "aria-describedby": tip.id }, ["?", tip]);
    attachTip(b, tip);
    return b;
  }

  // The mark beside a changed field's label. Hovering or focusing it says
  // the value changed, and what it was, when that's known.
  function changedMark(original) {
    var text = "Value changed." + (original !== undefined && original !== null ? " Original: " + original : "");
    var tip = tipEl(text);
    var m = h("span", { class: "changed-mark", tabindex: "0", role: "img", "aria-label": text, "aria-describedby": tip.id }, [tip]);
    attachTip(m, tip);
    return m;
  }

  // The mark beside an item's title when the mod relabels it. Hovering or
  // focusing it shows `text`.
  function relabelledMark(text) {
    var tip = tipEl(text);
    var m = h("span", { class: "relabelled-mark", tabindex: "0", role: "img", "aria-label": text, "aria-describedby": tip.id, dataset: { relabelled: "" } }, ["\u270E", tip]);
    attachTip(m, tip);
    return m;
  }

  var MARGIN = 4;

  // Below the button and lined up with its right edge where there's room,
  // otherwise moved left, or above, to stay in the window.
  function place(b, tip) {
    var vw = document.documentElement.clientWidth || window.innerWidth;
    var vh = document.documentElement.clientHeight || window.innerHeight;
    tip.style.maxWidth = Math.max(120, Math.min(320, vw - 2 * MARGIN)) + "px";
    var r = b.getBoundingClientRect();
    var w = tip.offsetWidth;
    var th = tip.offsetHeight;
    var left = Math.max(MARGIN, Math.min(r.right - w, vw - w - MARGIN));
    var top = r.bottom + 4;
    if (top + th > vh - MARGIN && r.top - 4 - th >= MARGIN) top = r.top - 4 - th;
    top = Math.max(MARGIN, Math.min(top, vh - th - MARGIN));
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }

  // Returns [control, ?-button], with the control described by the help text.
  function described(control, text) {
    var b = helpButton(text);
    control.setAttribute("aria-describedby", b.getAttribute("aria-describedby"));
    return [control, b];
  }

  // The text for `key`, with {item} replaced by `item` when given.
  function text(key, item) {
    if (!TEXT[key]) throw new Error("no help text for " + key);
    return item === undefined ? TEXT[key] : TEXT[key].replace(/\{item\}/g, item);
  }

  AG.ui.help = {
    TEXT: TEXT,
    text: text,
    button: helpButton,
    changedMark: changedMark,
    relabelledMark: relabelledMark,
    described: described
  };
})(AxeGraft);
