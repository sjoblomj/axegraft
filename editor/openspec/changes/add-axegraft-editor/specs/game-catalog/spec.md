# Spec Delta

## Purpose

Defines the per-game data AxeGraft Editor reads: game content, engine behaviour names, limits, original values and per-version availability, and how bad catalogs are handled.

## ADDED Requirements

### Requirement: One catalog per game
The editor SHALL get everything specific to a game from that game's catalog, and SHALL offer one choice of game for each catalog present. Replacing a catalog SHALL NOT need any code change, and adding one SHALL need only registering it with the editor.

#### Scenario: New catalog data
- **WHEN** a catalog file is replaced with a more complete one in the same format
- **THEN** the editor shows the new data with no other change

### Requirement: Catalog contents
A catalog SHALL state its catalog format version, the mod format version and `game` it applies to, its versions, ID ranges, field limits, button fields, and which mod parts the game has. Beside its format version, it SHOULD have `application` with the value `AxeGraft`, to tell anyone reading the file what it's for. The editor SHALL NOT act on that value.

#### Scenario: Game without requirements
- **WHEN** a catalog says its game has no requirement data
- **THEN** the editor shows no Requirements tab for that game

#### Scenario: Game-specific button field
- **WHEN** a catalog defines a button field only its game has, such as Warcraft II's `highlighted`
- **THEN** the button editor shows that field and writes it to the mod under the name the catalog gives

#### Scenario: Catalog without an application value
- **WHEN** a catalog has no `application`, or a different value
- **THEN** the editor uses the catalog as normal

### Requirement: Game content in the catalog
A catalog SHALL list every entry of the game's button table, units and others, and the button sets, upgrades, techs, orders, missiles, spell sounds and sounds, by ID, with display names and tree positions. Each button set SHALL be one array of buttons in the game, with the mod format's ID and a list of the table entries that point at it. It SHALL list icon names and string names where they are known.

#### Scenario: ID with no known name
- **WHEN** a valid ID has no entry in the catalog, such as an icon added by an MPQ
- **THEN** the editor shows and accepts the numeric ID

#### Scenario: Set shared by several units
- **WHEN** the Marine and the Firebat use one array of buttons in the game
- **THEN** the catalog lists one set, with both units' original `button_set` naming it

#### Scenario: Table entry that isn't a unit
- **WHEN** StarCraft's catalog lists table entry 238, a worker build menu
- **THEN** it has only an original `button_set`

#### Scenario: Set and units that disagree
- **WHEN** a unit's original `button_set` names a set whose list of table entries doesn't include that unit
- **THEN** the catalog is treated as malformed

### Requirement: Engine behaviour in the catalog
A catalog SHALL list conditions, actions, status functions and opcodes by the names mods use, with a display name and any variable or parameter type.

#### Scenario: Function that reads a variable
- **WHEN** a catalog says an action reads a tech
- **THEN** the editor offers techs for that action's variable, and validates against the tech range

### Requirement: Original values in the catalog
A catalog SHALL hold the original value of every editable property: each unit's settings, each set's buttons, each requirement record and each constant.

#### Scenario: Comparing with the original
- **WHEN** an item is shown
- **THEN** the editor can tell which of its values differ from the original, without any game file

#### Scenario: Original value differs between versions
- **WHEN** the original of a button set, a requirement record or a constant differs between versions
- **THEN** the catalog records each version's value, and the editor shows them. A unit's fields have one original for every version.

### Requirement: Per-version availability in the catalog
A catalog SHALL record which versions lack each button set, table entry and function, and for each constant whether each version has it, doesn't apply, or is unknown.

#### Scenario: Forgotten version
- **WHEN** a constant's entry doesn't cover one of the catalog's versions
- **THEN** the catalog is treated as malformed

### Requirement: No addresses in the catalog
A catalog SHALL NOT need addresses, expected bytes or any other data that only the patcher's library uses.

#### Scenario: Reviewing a catalog
- **WHEN** a mod is edited using a catalog
- **THEN** no part of the editing relies on where a value is stored in any executable

### Requirement: Help text in the catalog
A catalog SHALL give a help text for each button field, unit field and constant, and for the bare unit row where the game has requirements. It MAY give one for each function and opcode.

#### Scenario: Missing help text
- **WHEN** a constant in a catalog has no help text
- **THEN** the catalog is treated as malformed

### Requirement: Malformed catalogs
The editor SHALL check a catalog before offering its game. A catalog that is malformed, or of an unsupported format version, SHALL NOT be used, and the error SHALL name the catalog and each problem.

#### Scenario: Bad catalog
- **WHEN** one catalog is malformed and another is valid
- **THEN** the valid game can still be edited, and the error names the malformed catalog's problems

#### Scenario: Internal reference that doesn't resolve
- **WHEN** a catalog's original button names a condition the catalog doesn't list
- **THEN** the catalog is treated as malformed

### Requirement: Sample catalogs are marked
A catalog MAY declare itself a sample. While a sample catalog is in use, the editor SHALL show clearly that its data is incomplete, and mods made with it may not match the patcher. A sample MAY list only some of the table's entries: the check that a catalog lists every entry from the lowest to the highest table entry ID SHALL NOT apply to it.

#### Scenario: Editing with a sample
- **WHEN** a user edits a mod using a sample catalog
- **THEN** a persistent notice says the catalog is a sample

#### Scenario: Sample with a few entries
- **WHEN** a sample catalog lists only some table entries
- **THEN** it loads without a problem about missing entries, while a complete catalog missing them is malformed

### Requirement: Catalog documentation
The catalog format SHALL be documented in the repository, precisely enough for a conversion tool to target it.

#### Scenario: Documented example
- **WHEN** the example in the documentation is run through the catalog check
- **THEN** it passes
