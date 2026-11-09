# requirement-editing Specification

## Purpose
Defines how AxeGraft Editor edits StarCraft's requirement records for units, upgrades, tech research, tech use and orders, without the user having to write the opcode list.

## Requirements

### Requirement: Record editor
The Requirements tab SHALL show the selected item's record as a list of rows, one for each opcode or bare unit. An opcode and its parameter SHALL share one row. The tab SHALL let the user add, remove and reorder rows. An added row SHALL be a completed-unit row holding the lowest unit ID, which the user can change. Rows SHALL be reorderable both with Up and Down buttons and by dragging a row by its grip, which marks it as draggable. A record with one row SHALL show no grip. A row's Up, Down and Remove buttons SHALL be at the right of the row, and Remove SHALL show a trash can.

#### Scenario: Showing a record
- **WHEN** a record's list is `["current_unit_is", 111, "is_not_lifted_off"]`
- **THEN** there are two rows: one holding the first opcode and its unit, and one holding the other opcode

#### Scenario: Saving rows
- **WHEN** a user edits the rows
- **THEN** the saved `list` is the flat array that the mod format defines

#### Scenario: Dragging a row
- **WHEN** a record's list is `["current_unit_is", 111, "is_not_lifted_off"]` and a user drags the second row above the first
- **THEN** the saved `list` is `["is_not_lifted_off", "current_unit_is", 111]`

### Requirement: Parameters follow their opcode
A row's parameter SHALL be offered by the kind the catalog gives for its opcode, and a row with no parameter SHALL show none. An opcode that takes a parameter SHALL always have one, as the game stores it: changing a row to such an opcode SHALL keep the row's value when it's of the same kind, and otherwise use the lowest ID of that kind, and clearing the parameter SHALL keep its value.

#### Scenario: Changing opcode
- **WHEN** a user changes a row from an opcode with no parameter to one that takes a unit
- **THEN** the row shows a unit field holding the lowest unit ID, and has no problem

#### Scenario: Completed unit after a changed opcode
- **WHEN** a record's rows are `current_unit_is` 111, `is_not_lifted_off` and completed unit 112, and a user changes the second row to `must_have`
- **THEN** the record still has three rows, and the saved list is `["current_unit_is", 111, "must_have", 0, 112]`

### Requirement: Bare units
Rows SHALL match what the game stores. A bare unit ID, which requires a completed unit of that type, SHALL be its own kind of row, and SHALL be written as a number. The `must_have` opcode, which also counts a unit still in progress, SHALL be a separate kind of row. The editor SHALL NOT convert one into the other, or offer rows the game doesn't have.

#### Scenario: Adding a bare unit
- **WHEN** a user adds a completed-unit row for unit 112
- **THEN** the saved `list` holds the number 112 at that place

#### Scenario: Both kinds in one record
- **WHEN** a record's list is `[132, "or", "must_have", 133]`
- **THEN** unit 132 is shown as a completed-unit row, unit 133 as a `must_have` row, and the list saves unchanged

### Requirement: Showing structure
Rows SHALL show how the record is structured. An upgrade level's row SHALL be marked as a level, and each row after it in that level SHALL be indented under it with a line at its left. An `or` row SHALL be marked as one, and each condition an `or` joins SHALL have a line at its left of a different colour from a level's.

#### Scenario: Upgrade with levels
- **WHEN** an upgrade record has `upgrade_level_1`, `upgrade_level_2` and `upgrade_level_3` sublists
- **THEN** each level's row is marked as a level, and the rows after it, up to the next level, are indented under it

#### Scenario: Alternatives
- **WHEN** a record's list is `["must_have", 111, "or", "must_have", 112]`
- **THEN** the `or` row is marked as one, and both `must_have` rows have the alternatives' line

#### Scenario: Structural problem
- **WHEN** a row order leaves a dangling `or` or an unbalanced sublist
- **THEN** the affected row shows an error

### Requirement: Opcodes limited by record type
The rows offered SHALL be those the catalog allows for the record's type.

#### Scenario: Level opcode on a unit
- **WHEN** a user edits a unit's record
- **THEN** level opcodes aren't offered

### Requirement: Records that don't exist originally
The tab SHALL allow a record to be created for an item with no original record, and SHALL allow a record to be emptied, which removes it from the game.

#### Scenario: Item with no record
- **WHEN** an item has no original record, and the user adds a row
- **THEN** the mod defines that item's record

#### Scenario: Emptying a record
- **WHEN** a user removes every row of an item with an original record
- **THEN** the mod has that entry with an empty `list`

### Requirement: Record replaced whole
A saved requirement entry SHALL define the whole record, and SHALL be identified by `type` and `id`.

#### Scenario: One row changed
- **WHEN** a user changes one row of upgrade 3's record
- **THEN** the saved entry has `type` `upgrade`, `id` 3 and the whole record

### Requirement: Viewing the original record
The tab SHALL be able to show the item's original record alongside the edited one.

#### Scenario: Comparing
- **WHEN** a user has edited a record and asks to see the original
- **THEN** both are visible, and the original differs by version where the catalog says so

### Requirement: Copying a record
The Requirements tab SHALL have Copy and Paste buttons under the item list. Copy SHALL copy the chosen record, and Paste SHALL replace the chosen record with it, whatever the two records' types. Paste SHALL be disabled until a record has been copied. Ctrl+C and Ctrl+V (Cmd+C and Cmd+V on a Mac) SHALL do the same, except in a text field, and for Ctrl+C, with text selected.

#### Scenario: Pasting into a record of another type
- **WHEN** a user copies a unit's record and pastes it onto a tech use record
- **THEN** the tech use record holds the unit's rows, and any opcode a tech use record can't use is shown as a problem
