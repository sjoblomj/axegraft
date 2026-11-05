// Help for controls: a `?` button beside each control that shows its text
// on hover and on keyboard focus. Help for controls that are the same in
// every game is in this table; help for what's specific to a game comes
// from its catalog.
"use strict";

(function (AG) {
  var h = AG.ui.h;

  var TEXT = {
    search: "Shows only the items whose label contains this text, ignoring case. Labels start with the item's ID, so you can search by ID or by name.",
    tree: "The items of this tab. Use the arrow keys to move, Right and Left to open and close groups. The yellow mark shows changed items, the red mark errors and the orange mark warnings.",
    filterChanged: "Shows only the items this mod changes.",
    filterErrors: "Shows only the items with errors. A mod with errors can't be saved.",
    filterWarnings: "Shows only the items with warnings. Warnings don't stop a mod being saved.",
    revertField: "Puts this field back to its original value.",
    revertItem: "Removes every change this mod makes to this item, so it's as in the original game.",
    goToSet: "Opens the Button Sets tab on the set this entry shows, as the mod currently assigns it.",
    ownSet: "Gives this entry its own copy of its current set, as a new set, so its buttons can change without changing other entries that share the set.",
    idInput: "Type an ID. Any ID within the field's range is accepted, even one with no name in the catalog.",
    nameSelect: "Choose by name. The list and the ID box stay in step.",
    noButtons: "Shows no buttons. The mod saves the button set as null.",
    buttonList: "The buttons of this set, in the order the game stores them. Select one to edit it. When several buttons share a position, the first one whose condition shows it is used.",
    addButton: "Adds a button with valid default values, at the first free position.",
    removeButton: "Removes the selected button.",
    moveUp: "Moves the selected button one place earlier.",
    moveDown: "Moves the selected button one place later.",
    clearSet: "Removes every button of this set. The mod defines the set with no buttons.",
    preview: "The command panel as the game lays it out. Click a filled position to select its button, double-click an empty one to create a button there. A number shows how many buttons share a position.",
    usedBy: "The table entries that show this set, counting what this mod assigns. Editing the set changes all of them.",
    addSet: "Adds a new set with no buttons, using the lowest new set ID this mod doesn't use.",
    newSetId: "The ID for the new set. New sets use IDs from the size of the button table up.",
    removeSet: "Removes this new set from the mod. Entries still assigned to it will show an error until they get another set.",
    copyTo: "Copies the buttons of this set, as they are now, to the sets you tick. Each of those sets is then defined in the mod with the same buttons.",
    copyFrom: "Replaces the buttons of this set with those of the chosen set, as the mod has it or as in the original game. The source isn't changed.",
    copySource: "The set to copy buttons from.",
    copyOriginal: "Copy the source set's original buttons, ignoring what this mod changes in it.",
    jump: "Goes to the item this field refers to.",
    pickIcon: "Shows the icons, to choose one by sight.",
    rowList: "The rows of this requirement record. A row holds an opcode and its parameter, or a completed unit. Rows between a level and its end, and alternatives joined by or, are grouped.",
    rowKind: "What this row is: a completed unit, which the game stores as a bare unit ID, or an opcode.",
    rowParameter: "The number that follows the opcode, of the kind the opcode takes.",
    addRow: "Adds a row at the end of the record.",
    removeRow: "Removes this row.",
    rowUp: "Moves this row one place earlier.",
    rowDown: "Moves this row one place later.",
    showOriginal: "Shows the original record beside the edited one, for each version where it differs.",
    constantValue: "The value in the scale the game stores it in. It's saved exactly as entered.",
    constantOption: "The named behaviour to use.",
    removeEntry: "Removes this entry from the mod. Use it for entries the item list can't show.",
    goToProblem: "Shows the field with this problem.",
    importFolder: "Choose your game folder. The editor finds the game's archives in it by name and reads only the icons and strings. Nothing is changed or sent anywhere.",
    importFiles: "Choose the game's archive files, or a stat_txt.tbl file on its own.",
    tabs: "The parts of the mod this game has. Use Left and Right to move between tabs."
  };

  var counter = 0;

  // A `?` button that shows `text`.
  function helpButton(text) {
    var id = "help-" + ++counter;
    var tip = h("span", { class: "tip", role: "tooltip", id: id, text: text });
    var b = h("button", { type: "button", class: "help", "aria-label": "Help", "aria-describedby": id }, ["?", tip]);
    // CSS shows the text on :hover and :focus; these do the same where a
    // window without focus doesn't match :focus.
    function show() {
      b.classList.add("show");
    }
    function hide() {
      b.classList.remove("show");
    }
    b.addEventListener("mouseenter", show);
    b.addEventListener("mouseleave", hide);
    b.addEventListener("focus", show);
    b.addEventListener("blur", hide);
    return b;
  }

  // Returns [control, ?-button], with the control described by the help text.
  function described(control, text) {
    var b = helpButton(text);
    control.setAttribute("aria-describedby", b.getAttribute("aria-describedby"));
    return [control, b];
  }

  function text(key) {
    if (!TEXT[key]) throw new Error("no help text for " + key);
    return TEXT[key];
  }

  AG.ui.help = {
    TEXT: TEXT,
    text: text,
    button: helpButton,
    described: described
  };
})(AxeGraft);
