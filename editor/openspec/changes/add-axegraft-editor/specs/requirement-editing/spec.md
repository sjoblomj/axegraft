# Spec Delta

## Purpose

Defines how AxeGraft Editor edits StarCraft's requirement records for units, upgrades, tech research, tech use and orders, without the user having to write the opcode list.

## ADDED Requirements

### Requirement: Record editor
The Requirements tab SHALL show the selected item's record as a list of rows, one for each opcode or bare unit, each with its parameter, and SHALL let the user add, remove and reorder rows.

#### Scenario: Showing a record
- **WHEN** a record's list is `["current_unit_is", 106, "not_lifted_off"]`
- **THEN** there are two rows: one for the opcode with its unit, and one for the other opcode

#### Scenario: Saving rows
- **WHEN** a user edits the rows
- **THEN** the saved `list` is the flat array that the mod format defines

### Requirement: Parameters follow their opcode
A row's parameter SHALL be offered by the kind the catalog gives for its opcode, and a row with no parameter SHALL show none.

#### Scenario: Changing opcode
- **WHEN** a user changes a row from an opcode with no parameter to one that takes a unit
- **THEN** the row shows a unit field, and a problem until it's filled

### Requirement: Bare units
The editor SHALL show a bare unit ID in a list as a "must have this unit" row, and SHALL write it as a number.

#### Scenario: Adding a bare unit
- **WHEN** a user adds a must-have row for unit 112
- **THEN** the saved `list` holds the number 112 at that place

### Requirement: Showing structure
Rows SHALL be shown with `or` alternatives and upgrade level sublists visibly grouped.

#### Scenario: Upgrade with levels
- **WHEN** an upgrade record has `upgrade_level_1`, `upgrade_level_2` and `upgrade_level_3` sublists
- **THEN** each level's rows are visibly grouped under it

#### Scenario: Structural problem
- **WHEN** a row order leaves a dangling `or` or an unbalanced sublist
- **THEN** the affected row shows the problem

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
- **THEN** both are visible, and the original differs by build where the catalog says so
