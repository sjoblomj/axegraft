# Spec Delta

## Purpose

Defines the versioned JSON format mods are written in, and the rules that decide whether a mod is valid for a game, independent of any one build.

## ADDED Requirements

### Requirement: Mod header
A mod SHALL be a JSON object with a `format` version and a `game`, which is `starcraft` or `warcraft2`. It SHALL NOT name a game build.

#### Scenario: Valid header
- **WHEN** a mod has `"format": 1` and `"game": "starcraft"`
- **THEN** its header is accepted

#### Scenario: Unsupported format version
- **WHEN** a mod has a `format` this AxeGraft Patcher doesn't support
- **THEN** the mod is rejected, with an error naming the format version

#### Scenario: Unknown game
- **WHEN** a mod has a `game` other than `starcraft` or `warcraft2`
- **THEN** the mod is rejected, with an error naming the game

### Requirement: Mod parts
A mod SHALL contain at most these parts, each an array: `units`, `button_sets`, `requirements` and `constants`. Any part MAY be absent. A format-1 Warcraft II mod SHALL NOT contain `requirements`, because that game has no requirement data.

#### Scenario: Only some parts present
- **WHEN** a mod contains only `constants`
- **THEN** the mod is accepted, and the other parts count as empty

#### Scenario: Requirements in a Warcraft II mod
- **WHEN** a `warcraft2` mod contains `requirements`
- **THEN** the mod is rejected

### Requirement: Strict fields
Every object in a mod SHALL contain only the fields defined for it. Any object MAY also contain a string `label`, which SHALL have no effect on the result.

#### Scenario: Unknown field
- **WHEN** a mod contains a field that isn't defined for that object
- **THEN** the mod is rejected, with an error naming the field and where it is

#### Scenario: Label is ignored
- **WHEN** two mods differ only in their `label` values
- **THEN** they produce identical changes

### Requirement: Identifying game content and engine behaviour
A mod SHALL refer to game content, meaning units, upgrades, techs, orders, button sets, icons and strings, by numeric ID. It SHALL refer to engine behaviour, meaning conditions, actions, status functions, opcodes and constants, by name. A mod SHALL NOT be able to supply an address or raw bytes.

#### Scenario: Unknown behaviour name
- **WHEN** a mod names a condition, action, status function, opcode or constant the game doesn't have
- **THEN** the mod is rejected, with an error naming it

#### Scenario: Number used for a function
- **WHEN** a mod gives a number where a condition, action or status function name is expected
- **THEN** the mod is rejected

### Requirement: Unit entries
A `units` entry SHALL have an `id` and at least one of `button_set`, `status_changed` and `status_update`. `status_changed` SHALL name the function that decides whether the status panel needs redrawing, and `status_update` SHALL name the function that draws it. These are separate fields.

#### Scenario: Change only the button set
- **WHEN** a unit entry has an `id` and a `button_set`
- **THEN** the entry is accepted, and the unit's status functions are left unchanged

#### Scenario: Change only one status function
- **WHEN** a unit entry has an `id` and a `status_update`
- **THEN** the entry is accepted, and the unit's `status_changed` function is left unchanged

#### Scenario: Entry with nothing to change
- **WHEN** a unit entry has only an `id`
- **THEN** the mod is rejected

#### Scenario: Unit ID out of range
- **WHEN** a unit entry has an `id` outside the game's unit range
- **THEN** the mod is rejected

### Requirement: Button set entries
A `button_sets` entry SHALL have an `id` and a `buttons` array, which replaces that set's buttons entirely. Button set IDs SHALL use one numbering for each game, independent of build. For StarCraft, that is the numbering used from 1.12 onwards.

#### Scenario: Replace a set
- **WHEN** a mod defines button set 7 with two buttons
- **THEN** set 7 is defined by exactly those two buttons

#### Scenario: Empty set
- **WHEN** a mod defines a button set with an empty `buttons` array
- **THEN** the mod is accepted, and that set has no buttons

#### Scenario: Set ID out of range
- **WHEN** a button set `id` is outside the game's numbering
- **THEN** the mod is rejected

### Requirement: Button fields
A button SHALL have a `position`, an `icon`, an `enabled_string`, a `disabled_string`, a `requirement` and an `action`. A `requirement` SHALL name a condition, and an `action` SHALL name an action function. Warcraft II buttons SHALL also state the order they highlight.

#### Scenario: Position out of range
- **WHEN** a button's `position` is outside the game's panel, which is 1-9 in StarCraft and 0-8 in Warcraft II
- **THEN** the mod is rejected

#### Scenario: Missing field
- **WHEN** a button omits a required field
- **THEN** the mod is rejected, with an error naming the button and the field

#### Scenario: Icon and string IDs
- **WHEN** an `icon` or string ID fits the game's field size
- **THEN** it is accepted, even if it's beyond the game's original data, because an MPQ can extend that data

### Requirement: Typed function values
A condition or action function SHALL take a `value` only if the library says it reads one, and the value's type SHALL be the one the library gives it: unit, tech, upgrade, number or button set.

#### Scenario: Value of the wrong kind
- **WHEN** an action that takes a tech is given a tech ID outside the game's tech range
- **THEN** the mod is rejected

#### Scenario: Missing value
- **WHEN** a function that reads a value is given none
- **THEN** the mod is rejected

#### Scenario: Unexpected value
- **WHEN** a function that doesn't read a value is given one
- **THEN** the mod is rejected

#### Scenario: Value too large for its field
- **WHEN** a condition value is above 255 in StarCraft, whose condition parameter is read as a byte
- **THEN** the mod is rejected

### Requirement: Requirement entries
A `requirements` entry SHALL have a `type`, which is `unit`, `upgrade`, `tech_research`, `tech_use` or `order`, an `id` in that type's range, and a `list`. The entry SHALL define that item's whole requirement record.

#### Scenario: Replace a record
- **WHEN** a mod has a requirement entry for upgrade 3
- **THEN** the entry defines upgrade 3's whole record

#### Scenario: Empty list
- **WHEN** a requirement entry has an empty `list`
- **THEN** that item has no requirement record

### Requirement: Requirement lists
A `list` SHALL be a flat array in which a string is an opcode name and a number is a parameter or a bare unit ID. The closing end-of-list marker SHALL NOT be written in the list.

#### Scenario: Valid list
- **WHEN** a list is `["current_unit_is", 139, "not_training_or_morphing", "upgrade_level_1", "end_sublist", "upgrade_level_2", 132, "or", "must_have", 133, "end_sublist", "upgrade_level_3", 133]`
- **THEN** the list is accepted for an upgrade

#### Scenario: Missing parameter
- **WHEN** an opcode that takes a parameter isn't followed by a number
- **THEN** the mod is rejected

#### Scenario: Parameter of the wrong kind
- **WHEN** an opcode's parameter is outside the range of the kind it takes, such as a unit ID above the unit range
- **THEN** the mod is rejected

#### Scenario: Dangling or
- **WHEN** `or` is the first or last element of a list or sublist, or directly follows another `or`
- **THEN** the mod is rejected

#### Scenario: Unbalanced sublists
- **WHEN** an `end_sublist` has no matching level opcode, or level opcodes appear outside an upgrade record
- **THEN** the mod is rejected

### Requirement: Constant entries
A `constants` entry SHALL have a `name` and exactly one of `value` and `option`. `value` SHALL be a number and `option` a named behaviour choice. Which of the two applies, and the allowed range or options, SHALL come from the library.

#### Scenario: Numeric constant in range
- **WHEN** a constant is given a `value` within its allowed range
- **THEN** the entry is accepted

#### Scenario: Value out of range
- **WHEN** a constant is given a `value` outside its allowed range
- **THEN** the mod is rejected, with an error naming the constant, the value and the range

#### Scenario: Unknown option
- **WHEN** a code-site constant is given an `option` it doesn't have
- **THEN** the mod is rejected

#### Scenario: Unknown constant
- **WHEN** a constant's `name` isn't in the library for that game
- **THEN** the mod is rejected, with an error naming the constant

### Requirement: Stored scale for constants
A constant's `value` SHALL use the scale the game stores it in, not a scale converted for display. Sign and width differences between storage locations SHALL NOT affect the mod's value.

#### Scenario: Value stored in two forms
- **WHEN** one constant is stored as `50` at one location and `-50` at another, and a mod sets it to 60
- **THEN** the first location receives `60` and the second receives `-60`

### Requirement: No duplicates within a mod
A single mod SHALL NOT define the same field of the same item twice.

#### Scenario: Same unit twice with different fields
- **WHEN** a mod has two entries for unit 5, one with `button_set` and one with `status_update`
- **THEN** the mod is accepted

#### Scenario: Same button set twice
- **WHEN** a mod has two entries for the same button set
- **THEN** the mod is rejected, with an error naming the set

### Requirement: All problems reported together
Validation SHALL report every problem it finds in a mod, rather than stopping at the first.

#### Scenario: Several mistakes
- **WHEN** a mod has an unknown constant and an out-of-range unit ID
- **THEN** the errors list both problems

### Requirement: Untrusted input safety
Parsing and validating any input SHALL produce either a valid mod or errors. It SHALL NOT crash.

#### Scenario: Malformed input
- **WHEN** the input is arbitrary bytes, invalid JSON or deeply nested JSON
- **THEN** an error is returned, naming the input
