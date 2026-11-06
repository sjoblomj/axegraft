# Spec Delta

## ADDED Requirements

### Requirement: Original buttons by version
A button set's original buttons SHALL be either one list, the same on every version, or a default list with different lists for named versions. Each version's original SHALL be its own list, or the default where it has none.

#### Scenario: Same list everywhere
- **WHEN** a set's original is a plain list of buttons
- **THEN** every version has that list as its original

#### Scenario: List that differs on some versions
- **WHEN** Warcraft II's Dwarven Demolition Squad set has 2.02's nine buttons as its default and its own eight-button list for 1.3, 1.33 and 1.5
- **THEN** 2.00 and 2.02 have the nine buttons as their original, and the DOS versions the eight

#### Scenario: Unknown version in a per-version list
- **WHEN** a set's per-version originals name a version the catalog doesn't list
- **THEN** the catalog is treated as malformed

### Requirement: Ascending positions
A catalog MAY say that its game needs the buttons of a set in ascending position order. Buttons MAY share a position. Every original list in such a catalog SHALL be in that order.

#### Scenario: Original out of order
- **WHEN** a catalog that needs ascending positions has an original list with position 4 before position 2
- **THEN** the catalog is treated as malformed

#### Scenario: Game without the rule
- **WHEN** StarCraft's catalog doesn't ask for ascending positions
- **THEN** buttons may be in any order

### Requirement: Versions the patcher doesn't support
The editor SHALL treat every version a catalog lists alike, including versions that AxeGraft Patcher doesn't support, such as Warcraft II's DOS versions, so that mods can be edited and checked for them.

#### Scenario: DOS version in the Warcraft II catalog
- **WHEN** the Warcraft II catalog lists 1.5
- **THEN** the editor reports how a mod would apply on 1.5, and the report's note says the patcher decides which versions it supports
