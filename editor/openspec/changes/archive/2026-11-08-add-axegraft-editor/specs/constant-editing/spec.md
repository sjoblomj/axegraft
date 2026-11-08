# Spec Delta

## Purpose

Defines how AxeGraft Editor edits numeric constants and named options, using the ranges and choices the catalog gives for each.

## ADDED Requirements

### Requirement: Numeric constants
The Constants tab SHALL edit a numeric constant as a number, and SHALL show its allowed range and, once changed, its original value, as `editor-navigation`'s "Marking changes" describes.

#### Scenario: Value in range
- **WHEN** a user enters a value within the constant's range
- **THEN** the saved entry has that `value`

#### Scenario: Value out of range
- **WHEN** a user enters a value outside the range
- **THEN** the field shows an error that names the range

### Requirement: Stored scale
The editor SHALL edit and save a constant's value in the scale the game stores it in. It MAY show a catalog-supplied note explaining that scale, and SHALL NOT convert the saved value.

#### Scenario: Value with a note
- **WHEN** a catalog notes that a constant is stored in frames
- **THEN** the note is shown, and the saved `value` is the number the user entered

### Requirement: Constants that refer to game content
A constant the catalog says holds a unit, tech, upgrade or similar ID SHALL offer those items by name as well as by ID.

#### Scenario: Starting building
- **WHEN** a user edits a constant that holds a unit ID
- **THEN** they can choose the unit by name, and the saved `value` is its ID

### Requirement: Named options
The tab SHALL edit an option constant as a choice among its named options, and SHALL save the chosen `option`.

#### Scenario: Choosing an option
- **WHEN** a user chooses a named option
- **THEN** the saved entry has that `option`, and no `value`

### Requirement: Showing availability
Each constant SHALL show which versions have it, which it doesn't apply to, and which are unknown, along with its original value on each version where that varies.

#### Scenario: Constant unknown on a version
- **WHEN** a constant is `unknown` on a version
- **THEN** the tab lists that version as unknown, and says the patcher will skip the constant there

### Requirement: Grouped display
Constants SHALL appear in the list under the catalog's groups, using the catalog's display names, while the saved entry SHALL use the constant's `name`.

#### Scenario: Saved name
- **WHEN** a user changes a constant shown under a group with a display name
- **THEN** the saved entry's `name` is the name mods use, not the display name
