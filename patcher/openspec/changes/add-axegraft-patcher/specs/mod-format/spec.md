# Spec Delta

## Purpose

Defines the versioned JSON format mods are written in, and the rules that decide whether a mod is valid for a game, independent of any one game version.

## ADDED Requirements

### Requirement: Mod header
A mod SHALL be a JSON object with `patcher`, which is always `AxeGraft`, a `format` version and a `game`, which is `starcraft` or `warcraft2`. `patcher` tells anyone opening the file what it is. A mod SHALL NOT name a game version.

#### Scenario: Valid header
- **WHEN** a mod has `"patcher": "AxeGraft"`, `"format": 1` and `"game": "starcraft"`
- **THEN** its header is accepted

#### Scenario: Missing or wrong patcher value
- **WHEN** a mod has no `patcher`, or its value isn't exactly `AxeGraft`
- **THEN** the mod is rejected, with an error saying the file isn't an AxeGraft Patcher mod

#### Scenario: Unsupported format version
- **WHEN** a mod has a `format` this AxeGraft Patcher doesn't support
- **THEN** the mod is rejected, with an error naming the format version

#### Scenario: Unknown game
- **WHEN** a mod has a `game` other than `starcraft` or `warcraft2`
- **THEN** the mod is rejected, with an error naming the game

### Requirement: Mod information
A mod MAY contain a `mod` object, after `game`, describing the mod for people. In it, `name` and `version` MAY each be a string, and `authors` MAY be an array of strings. Any of them MAY be absent or empty. `mod` MAY also contain other properties, of any type, which SHALL be accepted. Nothing in `mod` SHALL have any effect on the result.

#### Scenario: Mod with information
- **WHEN** a mod has `"mod": {"name": "Faster Marines", "version": "1.2", "authors": ["Alice", "Bob"]}`
- **THEN** the mod is accepted, and produces the same changes as without them

#### Scenario: Mod without information
- **WHEN** a mod has no `mod`, or a `mod` without `name`, `version` and `authors`
- **THEN** the mod is accepted

#### Scenario: Other properties in the information
- **WHEN** a mod's `mod` has `"website": "example.org"` beside its name
- **THEN** the mod is accepted, and produces the same changes as without it

#### Scenario: Information of the wrong type
- **WHEN** a mod's `mod` isn't an object, or its `name` or `version` isn't a string, or its `authors` isn't an array of strings
- **THEN** the mod is rejected, with an error naming the field

### Requirement: Mod parts
A mod SHALL contain at most these parts, each an array: `units`, `button_sets`, `requirements` and `constants`. Any part MAY be absent. A format-1 Warcraft II mod SHALL NOT contain `requirements`, because that game has no requirement data.

#### Scenario: Only some parts present
- **WHEN** a mod contains only `constants`
- **THEN** the mod is accepted, and the other parts count as empty

#### Scenario: Requirements in a Warcraft II mod
- **WHEN** a `warcraft2` mod contains `requirements`
- **THEN** the mod is rejected

### Requirement: Strict fields
Every object in a mod SHALL contain only the fields defined for it, apart from the `mod` object, which MAY contain others (see "Mod information"), and `labels`, whose contents aren't checked (see "Editor labels"). Every entry of `units`, `button_sets`, `requirements` and `constants`, and every button, MAY also contain a string `label`, which SHALL have no effect on the result. The top level of a mod SHALL NOT contain a `label`; it MAY contain `labels`.

#### Scenario: Unknown field
- **WHEN** a mod contains a field that isn't defined for that object
- **THEN** the mod is rejected, with an error naming the field and where it is

#### Scenario: Label is ignored
- **WHEN** two mods differ only in their `label` values
- **THEN** they produce identical changes

#### Scenario: Label at the top level
- **WHEN** a mod has a `label` beside `patcher`, `format` and `game`
- **THEN** the mod is rejected, with an error naming the field

### Requirement: Editor labels
A mod MAY contain a `labels` object, after `mod`, holding the names an editor shows for items instead of their usual ones, such as `"labels": {"units": {"0": "Rifleman"}}`. AxeGraft Patcher SHALL ignore `labels` and everything in it, whatever its type or contents. It SHALL have no effect on the result.

#### Scenario: Labels are ignored
- **WHEN** two mods differ only in their `labels`
- **THEN** they produce identical changes

#### Scenario: Labels of any shape
- **WHEN** a mod's `labels` is an array, or has a unit ID beyond the button table, or gives a label that isn't a string
- **THEN** the mod is accepted

### Requirement: Identifying game content and engine behaviour
A mod SHALL refer to game content, meaning units, upgrades, techs, orders, button sets, icons and strings, by numeric ID. It SHALL refer to engine behaviour, meaning conditions, actions, status functions, opcodes and constants, by name. A mod SHALL NOT be able to supply an address or raw bytes.

#### Scenario: Unknown behaviour name
- **WHEN** a mod names a condition, action, status function, opcode or constant the game doesn't have
- **THEN** the mod is rejected, with an error naming it

#### Scenario: Number used for a function
- **WHEN** a mod gives a number where a condition, action or status function name is expected
- **THEN** the mod is rejected

### Requirement: Unit entries
A `units` entry SHALL have an `id`, which is an entry of the game's button table, and at least one of `button_set`, `status_changed`, `status_update`, in StarCraft only `equivalent_entry` and `status_unit_type`, and in Warcraft II only `icon`, `stats_frame` and `name_string`. A table entry beyond the game's unit range SHALL have only `button_set`.

#### Scenario: Change only the button set
- **WHEN** a unit entry has an `id` and a `button_set`
- **THEN** the entry is accepted, and the unit's status functions are left unchanged

#### Scenario: Change only one status function
- **WHEN** a unit entry has an `id` and a `status_update`
- **THEN** the entry is accepted, and the unit's `status_changed` function is left unchanged

#### Scenario: Entry with nothing to change
- **WHEN** a unit entry has only an `id`
- **THEN** the mod is rejected

#### Scenario: Table entry that isn't a unit
- **WHEN** a StarCraft unit entry has `id` 238, a worker build menu, and a `button_set`
- **THEN** the entry is accepted

#### Scenario: Status function on an entry that isn't a unit
- **WHEN** a StarCraft unit entry has `id` 238 and a `status_update`
- **THEN** the mod is rejected

#### Scenario: Unit ID out of range
- **WHEN** a unit entry has an `id` outside the game's button table
- **THEN** the mod is rejected

#### Scenario: Status unit type in a Warcraft II mod
- **WHEN** a `warcraft2` mod has a unit entry with a `status_unit_type`
- **THEN** the mod is rejected, because that game's unit data has no such field

#### Scenario: Unit icon in a StarCraft mod
- **WHEN** a `starcraft` mod has a unit entry with an `icon`
- **THEN** the mod is rejected, because that game's status entry has no icon

#### Scenario: Unit icon on an entry that isn't a unit
- **WHEN** a `warcraft2` unit entry has `id` 111, the Human Basic Build menu, and an `icon`
- **THEN** the mod is rejected

#### Scenario: Unit data fields in a StarCraft mod
- **WHEN** a `starcraft` mod has a unit entry with a `stats_frame` or a `name_string`
- **THEN** the mod is rejected

#### Scenario: Equivalent entry in a Warcraft II mod
- **WHEN** a `warcraft2` mod has a unit entry with an `equivalent_entry`
- **THEN** the mod is rejected, because that game's command list entries have no such field

### Requirement: Unit entry fields
Each field of a unit entry SHALL hold this value:

- `status_changed`: the function that decides whether the status panel needs redrawing. `status_update`: the function that draws it.
- `equivalent_entry`: the table entry treated as the same in a mixed group (`wSecondaryCard`), or `null` for none.
- `status_unit_type`: the unit ID in the unit's status entry.
- `icon`, `stats_frame`, `name_string`: the unit's Unit Data icon, stats panel frame (0 to 3) and name string.

#### Scenario: Status unit type out of range
- **WHEN** a unit entry has a `status_unit_type` outside the game's unit range
- **THEN** the mod is rejected

#### Scenario: Unit icon ID
- **WHEN** a `warcraft2` unit entry has an `icon` that fits the game's field size
- **THEN** it is accepted, even if it's beyond the game's original icons, because an MPQ can add icons

#### Scenario: Unit name string ID
- **WHEN** a `warcraft2` unit entry has a `name_string` that fits the game's field size
- **THEN** it is accepted, even if it's beyond the game's original strings, because an MPQ can add strings

#### Scenario: Stats panel frame out of range
- **WHEN** a `warcraft2` unit entry has a `stats_frame` of 4
- **THEN** the mod is rejected, because the stats panel graphic has frames 0 to 3

#### Scenario: No equivalent entry
- **WHEN** a `starcraft` unit entry has an `equivalent_entry` of `null`
- **THEN** it is accepted, and means none

#### Scenario: Equivalent entry out of range
- **WHEN** a `starcraft` unit entry has an `equivalent_entry` outside the game's button table
- **THEN** the mod is rejected

### Requirement: Button set entries
A `button_sets` entry SHALL have an `id` and a `buttons` array, which replaces that set's buttons entirely.

#### Scenario: Replace a set
- **WHEN** a mod defines button set 7 with two buttons
- **THEN** set 7 is defined by exactly those two buttons

#### Scenario: Empty set
- **WHEN** a mod defines a button set with an empty `buttons` array
- **THEN** the mod is accepted, and that set has no buttons

### Requirement: Button set numbering
A button set SHALL be one array of buttons in the game, which any number of table entries can share. Set IDs SHALL use one numbering for each game, independent of version. An original set's ID is the lowest table entry pointing at its array, with StarCraft's table numbered as it is from 1.12 onwards. A mod's new sets SHALL use IDs from the table's size, which is 250 in StarCraft and 120 in Warcraft II, up to 999.

#### Scenario: Set shared by several entries
- **WHEN** table entries 0 and 32 point at one array
- **THEN** that array is set 0, and there is no set 32

#### Scenario: Table entry used as a set ID
- **WHEN** a mod defines button set 32, and table entry 32 points at set 0's array
- **THEN** the mod is rejected, with an error saying entry 32 uses set 0

#### Scenario: New set
- **WHEN** a StarCraft mod defines button set 250
- **THEN** the entry is accepted as a new set

#### Scenario: Set ID out of range
- **WHEN** a button set `id` is above 999
- **THEN** the mod is rejected

### Requirement: Referring to button sets
A `button_set` SHALL name an original set or a set the mod defines, or be `null`, which means no buttons.

#### Scenario: New set the mod doesn't define
- **WHEN** a unit's `button_set` is 250, and the mod doesn't define set 250
- **THEN** the mod is rejected

#### Scenario: Table entry named as a set
- **WHEN** a unit's `button_set` is 32, and table entry 32 points at set 0's array
- **THEN** the mod is rejected, with an error saying entry 32 uses set 0

#### Scenario: No buttons
- **WHEN** a unit's `button_set` is `null`
- **THEN** the mod is accepted, and that unit has no buttons

### Requirement: Opening a table entry
A variable of type table entry SHALL be an entry of the game's button table. The game shows the buttons of whichever set that entry has once the mod is applied, so a button reaches a new set through an entry the mod assigns it to.

#### Scenario: Submenu with a new set
- **WHEN** a button's action opens table entry 228, and the mod assigns new set 250 to entry 228
- **THEN** the mod is accepted, and the button opens set 250's buttons

#### Scenario: Entry beyond the table
- **WHEN** a button's action opens table entry 250 in StarCraft
- **THEN** the mod is rejected

### Requirement: Button fields
A button SHALL have a `position`, an `icon`, a `condition` and an `action`, and MAY have a `condition_variable` and an `action_variable`. `condition` and `action` SHALL name functions. A StarCraft button SHALL also have an `enabled_string` and a `disabled_string`. A Warcraft II button SHALL also have a `string` and a `highlighted`. `highlighted` SHALL be the order the button highlights, as the game's flag value: 0 for none, or exactly one of 1, 2, 4, 8, 16, 32, 64, 128 and 256.

#### Scenario: Position out of range
- **WHEN** a button's `position` is outside the game's panel, which is 1-9 in StarCraft and 0-8 in Warcraft II
- **THEN** the mod is rejected

#### Scenario: Missing field
- **WHEN** a button omits a required field
- **THEN** the mod is rejected, with an error naming the button and the field

#### Scenario: Warcraft II button fields
- **WHEN** a `warcraft2` button has a `string` and a `highlighted` of 8
- **THEN** those fields are accepted

#### Scenario: Highlighted value that isn't one flag
- **WHEN** a button's `highlighted` is 3
- **THEN** the mod is rejected

#### Scenario: Another game's string fields
- **WHEN** a `warcraft2` button has an `enabled_string`, or a `starcraft` button has a `string` or a `highlighted`
- **THEN** the mod is rejected, with an error naming the field and where it is

#### Scenario: Condition and action with their variables
- **WHEN** a button's condition and action each read a variable, and the button has a different valid value for each
- **THEN** each function is accepted with its own variable

#### Scenario: Icon and string IDs
- **WHEN** an `icon` or string ID fits the game's field size
- **THEN** it is accepted, even if it's beyond the game's original data, because an MPQ can extend that data

### Requirement: Button order
In both games, the buttons of a set SHALL be in ascending position order, because the game fills its command panel by walking the list together with the panel's positions. Buttons MAY share a position.

#### Scenario: Buttons out of order
- **WHEN** a `warcraft2` set has a button at position 5 followed by one at position 3
- **THEN** the mod is rejected, with an error naming the set and the button

#### Scenario: Shared positions
- **WHEN** a `warcraft2` set has three buttons at position 1 in a row, such as the shield icons for each level
- **THEN** the set is accepted

#### Scenario: StarCraft buttons out of order
- **WHEN** a `starcraft` set has a button at position 5 followed by one at position 3
- **THEN** the mod is rejected, with an error naming the set and the button

### Requirement: Typed function variables
A function the library says reads a variable SHALL be given one, of the type the library states: unit, tech, upgrade, number or table entry. A function that doesn't read a variable MAY be given one, which only has to fit the game's field. When left out, it SHALL be 0.

#### Scenario: Variable of the wrong kind
- **WHEN** an action that takes a tech is given an `action_variable` outside the game's tech range
- **THEN** the mod is rejected

#### Scenario: Missing variable
- **WHEN** a function that reads a variable is given none
- **THEN** the mod is rejected

#### Scenario: Variable on a function that doesn't read it
- **WHEN** a function that doesn't read a variable is given one that fits the game's field
- **THEN** the variable is accepted, whatever its value

#### Scenario: Variable left out on a function that doesn't read it
- **WHEN** a function that doesn't read a variable is given none
- **THEN** the button is accepted, and that variable is 0

#### Scenario: Unread variable too large for its field
- **WHEN** a function that doesn't read a variable is given one that doesn't fit the game's field
- **THEN** the mod is rejected

#### Scenario: Variable too large for its field
- **WHEN** a `condition_variable` is above 255 in StarCraft, whose condition parameter is read as a byte
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
A `list` SHALL be a flat array in which a string is an opcode name and a number is a parameter or a bare unit ID.

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
