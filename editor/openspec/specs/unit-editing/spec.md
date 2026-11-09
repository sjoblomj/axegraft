# unit-editing Specification

## Purpose
Defines how AxeGraft Editor changes a unit's fields in a mod: its button set and its status functions; in StarCraft, its connected unit and debug ID; in Warcraft II, its icon, stats panel frame and name. The same tab sets the button set of button cards that aren't units.

## Requirements

### Requirement: Unit fields
The Units tab SHALL list every entry of the game's button table. It SHALL show the selected unit's fields that its catalog's `unitFields` list, with the original value of each changed field as `editor-navigation`'s "Marking changes" describes, and only `button_set` for an entry that isn't a unit. The fields SHALL be shown in two boxes, following the game's structures: the button button card, holding `button_set` and, in StarCraft, `connected_unit`; and the status panel, holding the rest.

#### Scenario: StarCraft unit
- **WHEN** a StarCraft unit is selected
- **THEN** `button_set` and `connected_unit` are shown as the button button card, and `status_changed`, `display_function` and `debug_id` as the status panel

#### Scenario: Warcraft II unit
- **WHEN** a Warcraft II unit is selected
- **THEN** `button_set` is shown as the button button card, and `icon`, `stats_frame`, `name_string`, `status_changed` and `display_function` as the status panel, in the order of the game's Unit Data entry

#### Scenario: Fields of the other game
- **WHEN** a Warcraft II unit is selected
- **THEN** `connected_unit` and `debug_id` aren't shown, and for a StarCraft unit `icon`, `stats_frame` and `name_string` aren't shown

#### Scenario: Button card that isn't a unit
- **WHEN** StarCraft's button card 238, a worker build menu, is selected
- **THEN** only `button_set` is shown

### Requirement: Unit icon
For a game whose units have no `icon` field, the Units tab SHALL show the unit's icon beside the selected unit's name when its catalog entry names one and that icon's image is available. Without either, the name SHALL be shown alone. For a game whose units have an `icon` field, the icon SHALL be shown with that field instead, as an image beside the ID, with the same icon picker as a button's icon.

#### Scenario: Unit with an icon
- **WHEN** a StarCraft unit whose catalog entry has an `icon` is selected, with icons available
- **THEN** its icon is shown beside its name

#### Scenario: Unit with an icon field
- **WHEN** a Warcraft II unit is selected, with icons available
- **THEN** no icon is shown beside its name, and its `icon` field shows the icon and offers to choose one by sight

#### Scenario: Changing a unit's icon
- **WHEN** a user changes a Warcraft II unit's icon
- **THEN** the saved entry holds only `icon`, and the buttons that train the unit keep their own icons

#### Scenario: No icons
- **WHEN** no icons are shipped or imported
- **THEN** the unit's name is shown without an icon, and all editing works

### Requirement: Choosing by name or ID
Button set, button card, unit type, icon and string fields SHALL accept either a selection from a named list or a typed ID, and the two SHALL stay in step. The button set field SHALL also offer no buttons, and the connected unit field none, each saved as `null`. A field with a fixed set of values, such as the stats panel frame, SHALL be chosen from a list.

#### Scenario: Typing a set ID
- **WHEN** a user types a set ID
- **THEN** the named list shows that set

#### Scenario: Typing a button card as a set ID
- **WHEN** a user types 32 for a set ID, and button card 32 points at set 0's array
- **THEN** the field shows an error saying entry 32 uses set 0

#### Scenario: Removing a unit's buttons
- **WHEN** a user chooses no buttons for a unit
- **THEN** the saved entry has a `button_set` of `null`

#### Scenario: Choosing a connected unit
- **WHEN** a user types 5 as a StarCraft unit's connected unit
- **THEN** the named list shows entry 5 with the set it currently has, and the field offers to go to entry 5

#### Scenario: Name from the string table
- **WHEN** a user picks a Warcraft II unit's name, with a string table loaded
- **THEN** the list shows the table's strings, and the saved entry holds the string's ID as `name_string`

### Requirement: Status functions by name
Status functions SHALL be chosen from the catalog's list by name. `status_changed` SHALL offer only the catalog's functions for that field, and `display_function` likewise.

#### Scenario: Changing one function
- **WHEN** a user changes only `display_function`
- **THEN** the saved entry holds only `display_function`

### Requirement: Going to the assigned set
The Units tab SHALL offer a "Go to →" button beside the unit's set, which opens the Button Sets tab on the set assigned to the unit. Beside a StarCraft entry's connected unit, when it names another entry in the catalog, it SHALL offer a "Go to →" button that selects that entry.

#### Scenario: Unit assigned another set
- **WHEN** unit 0 is assigned set 5, and the user chooses to edit its set
- **THEN** the Button Sets tab opens on set 5

#### Scenario: Going to the connected unit
- **WHEN** unit 16's connected unit is 1, and the user chooses "Go to →" beside it
- **THEN** the Units tab selects entry 1

#### Scenario: Assignments don't chain
- **WHEN** a mod assigns set 5 to unit 0 and set 7 to unit 5, and the user chooses to edit unit 0's set
- **THEN** the Button Sets tab opens on set 5

### Requirement: Unit names
Button cards SHALL be renamed as "Item names" in `editor-navigation` describes, whether the mod changes them or not, and the name SHALL be saved under `labels.units` by the entry's ID.

#### Scenario: Renaming an unchanged unit
- **WHEN** a mod doesn't change unit 7, and the user renames it Worker
- **THEN** the mod has `"labels": {"units": {"7": "Worker"}}` and no entry for unit 7, the title and the item list show `7 Worker`, and unit 7 isn't marked as changed

#### Scenario: Going back to the catalog's name
- **WHEN** unit 7 is named Worker, and the user saves an empty name
- **THEN** the mod has no `labels`, and the title shows `7 Terran SCV`

#### Scenario: Cancelling
- **WHEN** the user edits the name and presses Escape
- **THEN** the name is unchanged

#### Scenario: Name used elsewhere
- **WHEN** unit 0 is named Rifleman
- **THEN** the lists of units in other tabs, such as the requirements list and a set's used-by list, show `0 Rifleman`

### Requirement: Copying a unit
The Units tab SHALL have Copy and Paste buttons under the item list. Copy SHALL copy the chosen button card's fields, and Paste SHALL set the chosen entry's fields to the copied ones, for the fields both entries have. Names given in AxeGraft SHALL NOT be copied. Paste SHALL be disabled until an entry has been copied. Ctrl+C and Ctrl+V (Cmd+C and Cmd+V on a Mac) SHALL do the same, except in a text field, and for Ctrl+C, with text selected.

#### Scenario: Pasting a unit
- **WHEN** a user copies unit 4 and pastes it onto unit 5
- **THEN** unit 5 has every field of unit 4

#### Scenario: Pasting an entry that isn't a unit
- **WHEN** a user copies a button card that isn't a unit and pastes it onto a unit
- **THEN** only the unit's button set changes
