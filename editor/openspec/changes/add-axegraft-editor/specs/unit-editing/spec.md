# Spec Delta

## Purpose

Defines how AxeGraft Editor changes a unit's fields in a mod: its button set, its status functions and, in StarCraft, its status unit type.

## ADDED Requirements

### Requirement: Unit fields
The Units tab SHALL show the selected unit's `button_set`, `status_changed`, `status_update` and, for StarCraft, `status_unit_type`, each with its original value.

#### Scenario: StarCraft unit
- **WHEN** a StarCraft unit is selected
- **THEN** all four fields are shown

#### Scenario: Warcraft II unit
- **WHEN** a Warcraft II unit is selected
- **THEN** `status_unit_type` isn't shown

### Requirement: Choosing by name or ID
Button set and unit type fields SHALL accept either a selection from a named list or a typed ID, and the two SHALL stay in step.

#### Scenario: Typing a set ID
- **WHEN** a user types a set ID
- **THEN** the named list shows that set

### Requirement: Status functions by name
Status functions SHALL be chosen from the catalog's list by name. `status_changed` SHALL offer only the catalog's functions for that field, and `status_update` likewise.

#### Scenario: Changing one function
- **WHEN** a user changes only `status_update`
- **THEN** the saved entry holds only `status_update`

### Requirement: Showing the assigned set's buttons
The Units tab SHALL show a preview of the buttons the unit would have, using the mod's version of the assigned set.

#### Scenario: Unit assigned a replaced set
- **WHEN** a mod replaces set 7 and assigns set 7 to unit 0
- **THEN** unit 0's preview shows the replacement buttons

#### Scenario: Assignments don't chain
- **WHEN** a mod assigns set 5 to unit 0 and set 7 to unit 5
- **THEN** unit 0's preview shows set 5's buttons, not set 7's

### Requirement: Going to the assigned set
The Units tab SHALL offer a way to edit the set assigned to the unit.

#### Scenario: Unit assigned another set
- **WHEN** unit 0 is assigned set 5, and the user chooses to edit its set
- **THEN** the Button Sets tab opens on set 5
