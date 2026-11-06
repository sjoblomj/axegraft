# Spec Delta

## Purpose

Defines how AxeGraft Editor changes a unit's fields in a mod: its button set, its status functions and, in StarCraft, its status unit type. The same tab sets the button set of table entries that aren't units.

## ADDED Requirements

### Requirement: Unit fields
The Units tab SHALL list every entry of the game's button table. It SHALL show the selected unit's `button_set`, `status_changed`, `status_update` and, for StarCraft, `status_unit_type`, with the original value of each changed field as `editor-navigation`'s "Marking changes" describes, and only `button_set` for an entry that isn't a unit.

#### Scenario: StarCraft unit
- **WHEN** a StarCraft unit is selected
- **THEN** all four fields are shown

#### Scenario: Warcraft II unit
- **WHEN** a Warcraft II unit is selected
- **THEN** `status_unit_type` isn't shown

#### Scenario: Table entry that isn't a unit
- **WHEN** StarCraft's table entry 238, a worker build menu, is selected
- **THEN** only `button_set` is shown

### Requirement: Choosing by name or ID
Button set and unit type fields SHALL accept either a selection from a named list or a typed ID, and the two SHALL stay in step. The button set field SHALL also offer no buttons, saved as `null`.

#### Scenario: Typing a set ID
- **WHEN** a user types a set ID
- **THEN** the named list shows that set

#### Scenario: Typing a table entry as a set ID
- **WHEN** a user types 32 for a set ID, and table entry 32 points at set 0's array
- **THEN** the field shows an error saying entry 32 uses set 0

#### Scenario: Removing a unit's buttons
- **WHEN** a user chooses no buttons for a unit
- **THEN** the saved entry has a `button_set` of `null`

### Requirement: Status functions by name
Status functions SHALL be chosen from the catalog's list by name. `status_changed` SHALL offer only the catalog's functions for that field, and `status_update` likewise.

#### Scenario: Changing one function
- **WHEN** a user changes only `status_update`
- **THEN** the saved entry holds only `status_update`

### Requirement: Going to the assigned set
The Units tab SHALL offer a way to edit the set assigned to the unit.

#### Scenario: Unit assigned another set
- **WHEN** unit 0 is assigned set 5, and the user chooses to edit its set
- **THEN** the Button Sets tab opens on set 5

#### Scenario: Assignments don't chain
- **WHEN** a mod assigns set 5 to unit 0 and set 7 to unit 5, and the user chooses to edit unit 0's set
- **THEN** the Button Sets tab opens on set 5

### Requirement: Giving a unit its own set
The Units tab SHALL let the user give a unit its own copy of its current set, so it can change without affecting units that share that set. The new set SHALL take the lowest unused new set ID.

#### Scenario: Separating the Firebat
- **WHEN** the Firebat, unit 32, uses set 0, and the user gives it its own set
- **THEN** the mod defines set 250 with set 0's current buttons and assigns it to unit 32, and the other units on set 0 are unchanged
