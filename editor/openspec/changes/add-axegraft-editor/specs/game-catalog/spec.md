# Spec Delta

## Purpose

Defines the per-game data AxeGraft Editor reads: game content, engine behaviour names, limits, original values and per-build availability, and how bad catalogs are handled.

## ADDED Requirements

### Requirement: One catalog per game
The editor SHALL get everything specific to a game from that game's catalog, and SHALL offer one choice of game for each catalog present. Adding or replacing a catalog SHALL NOT need any other code change.

#### Scenario: New catalog data
- **WHEN** a catalog file is replaced with a more complete one in the same format
- **THEN** the editor shows the new data with no other change

### Requirement: Catalog contents
A catalog SHALL state its catalog format version, the mod format version and `game` it applies to, its builds, ID ranges, field limits, button fields, and which mod parts the game has.

#### Scenario: Game without requirements
- **WHEN** a catalog says its game has no requirement data
- **THEN** the editor shows no Requirements tab for that game

#### Scenario: Game-specific button field
- **WHEN** a catalog defines an additional button field, such as Warcraft II's highlighted order
- **THEN** the button editor shows that field and writes it to the mod under the name the catalog gives

### Requirement: Game content in the catalog
A catalog SHALL list units, button sets, upgrades, techs and orders by ID, with display names and tree positions. It SHALL list icon names and string names where they are known.

#### Scenario: ID with no known name
- **WHEN** a valid ID has no entry in the catalog, such as an icon added by an MPQ
- **THEN** the editor shows and accepts the numeric ID

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

#### Scenario: Original value differs between builds
- **WHEN** a property's original value differs between builds
- **THEN** the catalog records each build's value, and the editor shows them

### Requirement: Per-build availability in the catalog
A catalog SHALL record which builds lack each button set and function, and for each constant whether each build has it, doesn't apply, or is unknown.

#### Scenario: Forgotten build
- **WHEN** a constant's entry doesn't cover one of the catalog's builds
- **THEN** the catalog is treated as malformed

### Requirement: No addresses in the catalog
A catalog SHALL NOT need addresses, expected bytes or any other data that only the patcher's library uses.

#### Scenario: Reviewing a catalog
- **WHEN** a mod is edited using a catalog
- **THEN** no part of the editing relies on where a value is stored in any executable

### Requirement: Malformed catalogs
The editor SHALL check a catalog before offering its game. A catalog that is malformed, or of an unsupported format version, SHALL NOT be used, and the error SHALL name the catalog and each problem.

#### Scenario: Bad catalog
- **WHEN** one catalog is malformed and another is valid
- **THEN** the valid game can still be edited, and the error names the malformed catalog's problems

#### Scenario: Internal reference that doesn't resolve
- **WHEN** a catalog's original button names a condition the catalog doesn't list
- **THEN** the catalog is treated as malformed

### Requirement: Sample catalogs are marked
A catalog MAY declare itself a sample. While a sample catalog is in use, the editor SHALL show clearly that its data is incomplete, and mods made with it may not match the patcher.

#### Scenario: Editing with a sample
- **WHEN** a user edits a mod using a sample catalog
- **THEN** a persistent notice says the catalog is a sample

### Requirement: Catalog documentation
The catalog format SHALL be documented in the repository, precisely enough for a conversion tool to target it.

#### Scenario: Documented example
- **WHEN** the example in the documentation is run through the catalog check
- **THEN** it passes
