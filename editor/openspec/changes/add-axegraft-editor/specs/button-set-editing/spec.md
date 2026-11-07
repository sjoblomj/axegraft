# Spec Delta

## Purpose

Defines how AxeGraft Editor edits the buttons of a button set, and previews them as the game's command panel would show them.

## ADDED Requirements

### Requirement: Button list
The Button Sets tab SHALL list the selected set's buttons, and SHALL let the user add, remove and reorder them. Add and Remove SHALL be above the list. Buttons SHALL be reorderable by dragging them in the list, and from the keyboard with Alt+Up and Alt+Down while the list has the focus, which drop the selected button one place on as if dragged there. Each button SHALL show a grip marking it as draggable.

A drop in the list SHALL keep the buttons in ascending position order, and SHALL do what the same drop does in the preview. A drop onto a button SHALL put the dragged button at that button's position, last of those there, and outline that button while dragging. A drop between buttons x and y SHALL put it at y's position and push as a drop between positions in the preview does, marking the space while dragging and outlining every button that would be pushed; after the last button, it SHALL take the position after x's. Where x and y share a position, or the dragged button already has x's or y's, it SHALL only move in the list, keeping or taking that position. A drop just above or below the button itself SHALL change nothing. Each button SHALL be titled by its action and the clean name of its first string field, and the name SHALL be left out when it equals the action, ignoring case.

#### Scenario: Button title
- **WHEN** a button's action is Move, and its string's clean name is `Move`
- **THEN** the list titles it `Move`, not `Move — Move`, and a button whose string is `Stim Packs` is titled `Move — Stim Packs`

#### Scenario: Adding a button
- **WHEN** a user adds a button
- **THEN** it starts with valid default values that the user can change

#### Scenario: Dragging in the list
- **WHEN** in StarCraft a set's buttons are at positions 1 and 7, and a user drags the second above the first
- **THEN** the saved `buttons` array has the dragged button first at position 1 and the other at position 2, and the dragged button is selected

#### Scenario: Moving from the keyboard
- **WHEN** in StarCraft a set's buttons are at positions 1 and 7, the list has the focus, the first button is selected, and a user presses Alt+Down
- **THEN** it's the second button, at position 8, it's still selected, and the list keeps the focus

#### Scenario: Dropping onto a button in the list
- **WHEN** in Warcraft II a set's buttons are at positions 0, 1, 2 and 4, and a user drags the last onto the second
- **THEN** the buttons are at 0, 1, 1 and 2, the dragged one third

#### Scenario: Dropping between buttons in the list
- **WHEN** in Warcraft II a set's buttons are at positions 0, 1, 2 and 4, and a user drags the last between the first two
- **THEN** while dragging, the space is marked and the buttons at 1 and 2 are outlined, and after the drop the buttons are at 0, 1, 2 and 3, the dragged one at 1

### Requirement: Button fields
The form SHALL show every button field the catalog lists for the game, including position, icon, strings, condition and its variable, and action and its variable.

#### Scenario: Warcraft II button
- **WHEN** a Warcraft II button is selected
- **THEN** the form shows `string` and `highlighted`, and not `enabled_string` or `disabled_string`

#### Scenario: StarCraft button
- **WHEN** a StarCraft button is selected
- **THEN** the form shows `enabled_string` and `disabled_string`, and not `string` or `highlighted`

### Requirement: Fields with a name and an ID
Icon and string fields SHALL accept a typed ID or a selection by name, and SHALL accept any ID within the field's limit, even one with no known name.

#### Scenario: Icon beyond the original data
- **WHEN** a user types an icon ID the catalog doesn't name, within the field's limit
- **THEN** the ID is accepted, and the preview shows a placeholder if no image is available

#### Scenario: Choosing a string by name
- **WHEN** a string table is available and a user opens a string field's list
- **THEN** it offers 0 for no string and every string of the table within the field's limit, each by its ID and clean name, and without a table it offers the catalog's names

#### Scenario: String beyond the loaded table
- **WHEN** a user types a string ID within the field's limit but beyond the loaded string table
- **THEN** the ID is accepted, with a warning that says how many strings the table holds

### Requirement: Variables follow their function
Choosing a condition or action SHALL change its variable field to suit that function's type: unit, tech, upgrade, order, number, table entry or none.

#### Scenario: Action reading a tech
- **WHEN** a user chooses an action that reads a tech
- **THEN** the variable field lists techs

#### Scenario: Action opening a table entry
- **WHEN** a user chooses an action that opens a table entry, such as a worker build menu
- **THEN** the variable field lists table entries, each with the set it has in the mod

#### Scenario: Function that reads no variable
- **WHEN** a user chooses a function that reads no variable
- **THEN** the field stays editable, within the game's limit, and is shown as unused by the function

#### Scenario: Type changes
- **WHEN** a user changes to a function reading a different type, and the old value isn't valid for it
- **THEN** the field shows a problem until a valid value is chosen

### Requirement: Variable omitted when unset
A variable on a function that doesn't read one SHALL be left out of the saved button when it's 0.

#### Scenario: Default variable
- **WHEN** a button's action reads no variable, and the variable is 0
- **THEN** the saved button has no `action_variable`

### Requirement: Panel preview
The preview SHALL show a grid with the game's panel layout, with each button at its position. A filled position's button SHALL be draggable onto a position, or between two. Where several buttons share the position, the selected one SHALL be dragged if it's among them, otherwise the first. After a drop, the dragged button SHALL be selected.

A drop between positions x and y SHALL put the button at y, and move the buttons from y up to the first empty position one position on. The position the dragged button leaves SHALL count as empty. If no position is empty, the buttons at the last position SHALL stay, joined by those from the one before. Between the last position of one row and the first of the next counts as between those two positions.

While dragging, the preview SHALL mark where the button would go: a position it would go on SHALL be outlined; for a drop between positions, the space between them SHALL be marked, and every position whose buttons would be pushed outlined. A drop that would change nothing SHALL show no mark.

#### Scenario: Selecting from the preview
- **WHEN** a user clicks a filled position in the preview
- **THEN** that position's button is selected in the list and form

#### Scenario: Creating from the preview
- **WHEN** a user double-clicks an empty position in the preview
- **THEN** a new button is created at that position

#### Scenario: Dropping on an empty position
- **WHEN** a user drags the button at position 1 onto empty position 6
- **THEN** that button's position is 6, and no other button changes

#### Scenario: Dropping on a filled position
- **WHEN** a user drags the button at position 1 onto position 2, which holds another button
- **THEN** both buttons are at position 2, and no other button changes

#### Scenario: Dropping between positions
- **WHEN** a set's buttons are at positions 0, 1, 2 and 4, and a user drags the one at 4 between positions 0 and 1
- **THEN** while dragging, the space between 0 and 1 is marked and positions 1 and 2 are outlined, and after the drop the buttons are at 0, 1, 2 and 3, the dragged one at 1

#### Scenario: Dropping between positions with none empty
- **WHEN** every position holds a button, and a user drags a button from the last position, which holds two, between the second and third positions
- **THEN** the dragged button takes the third position, the buttons from there on move one position on, and the last position holds the button it kept and the one from the position before

#### Scenario: Several buttons at one position
- **WHEN** several buttons of a set use one position
- **THEN** the preview shows that they share it, and each is reachable from the list

### Requirement: Icon choice
The icon field SHALL offer a visual picker when game assets are imported, and a list of names and IDs otherwise.

#### Scenario: Without game assets
- **WHEN** no game assets are imported
- **THEN** the preview and icon field show names and IDs, and all editing works

### Requirement: String text
Where a string table is available, the form SHALL show each string field's text verbatim as stored, with no preview of how the game formats it. Every control byte, newlines included, SHALL appear as its number, such as `<3>` or `<10>`, and a literal `<` as `<60>`.

Lists, such as a string field's choices and the button list, SHALL instead show a clean name on one line: a button string without its hotkey, cost type and colour codes, and a unit name without its map editor group.

#### Scenario: String with a hotkey
- **WHEN** a button's string is `t<4>Research S<3>t<1>im Pack Tech<10>(Marine and Firebat ability)` as stored
- **THEN** the form shows exactly that, and lists show `Research Stim Pack Tech (Marine and Firebat ability)`

#### Scenario: Unit name
- **WHEN** a string is `Sarah Kerrigan<0>Ghost<0>Heroes` as stored
- **THEN** lists show `Sarah Kerrigan (Ghost)`

#### Scenario: No string table
- **WHEN** no string table is available
- **THEN** the field shows the ID, and all editing works

### Requirement: Showing who uses a set
The tab SHALL list the table entries that use this set, counting what the mod assigns, and SHALL say that editing the set changes all of them.

#### Scenario: Set shared by several units
- **WHEN** set 0 is selected, and units 0, 10, 20 and 32 use it
- **THEN** the tab lists all four, and says that editing the set changes all of them

#### Scenario: Unit assigned in the mod
- **WHEN** a mod assigns set 5 to unit 0
- **THEN** set 5's list includes unit 0, and unit 0's original set no longer lists it

#### Scenario: Going to a unit
- **WHEN** a user follows a unit in the list
- **THEN** the Units tab opens on that unit

### Requirement: New sets
The tab SHALL let the user add a set, and remove one the mod added, with buttons under the item list. Remove SHALL be disabled for original sets. A new set SHALL take the lowest unused new set ID. The item list SHALL show each set the mod adds alongside the original sets. A new set SHALL have no name until the user gives it one, and SHALL be shown as `Set` and its ID until then.

#### Scenario: Adding a set
- **WHEN** a user adds a set to a StarCraft mod with no new sets
- **THEN** it's set 250, with no buttons, shown as `Set 250`

#### Scenario: Removing a set still in use
- **WHEN** a user removes a new set that a table entry is assigned to
- **THEN** that entry shows an error until it's given another set

### Requirement: Copying a button
The button list SHALL have Copy and Paste beside Add and Remove. Copy SHALL copy the chosen button, and Paste SHALL replace the chosen button with the copied one, keeping the chosen button's position. Paste SHALL be disabled until a button has been copied. Only one of a set and a button SHALL be copied at a time: copying either SHALL discard the other. Ctrl+C (Cmd+C on a Mac) SHALL copy the button when the button list, the preview or the button's fields have focus, or were last clicked, and the set otherwise. Ctrl+V (Cmd+V) SHALL paste whichever was copied.

#### Scenario: Copying a button discards a copied set
- **WHEN** a user copies a set, then copies a button
- **THEN** only the button can be pasted, and the set's Paste is disabled

#### Scenario: Pasting a button into another set
- **WHEN** a user copies a button and pastes it over a button in another set
- **THEN** that button takes the copied button's fields, keeps its own position, and the source set is unchanged

### Requirement: Copying buttons
The tab SHALL let the user copy the chosen set's buttons with a Copy button under the item list, and paste them over another set's buttons with a Paste button. Paste SHALL be disabled until a set has been copied. Ctrl+C and Ctrl+V, and Cmd+C and Cmd+V on a Mac, SHALL do the same, except while typing in a text field or with text selected for copying. What was copied SHALL be the buttons as they were when copied.

#### Scenario: Pasting into another set
- **WHEN** a user copies a set and pastes into another set
- **THEN** that set is defined in the mod with the copied buttons, and the source is unchanged

#### Scenario: Keyboard shortcuts
- **WHEN** a user presses Ctrl+C (Cmd+C on a Mac) on one set and Ctrl+V (Cmd+V) on another, with focus outside a text field
- **THEN** the second set holds the first set's buttons

#### Scenario: Nothing copied
- **WHEN** no set has been copied
- **THEN** Paste is disabled
