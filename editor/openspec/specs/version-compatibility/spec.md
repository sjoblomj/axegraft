# version-compatibility Specification

## Purpose
Shows in AxeGraft Editor how the current mod would behave on each version of its game, since a mod names no version but what it uses may be absent on some versions.

## Requirements

### Requirement: Report for every version
The editor SHALL report, for each version in the catalog, whether the current mod would apply fully, apply with constants skipped, or be rejected. The report SHALL update as the mod changes.

#### Scenario: Mod using only common content
- **WHEN** a mod changes only what every version has
- **THEN** every version is reported as applying fully

### Requirement: Rejection on a version
A mod SHALL be reported as rejected on a version when it uses a button set, button card or function that version lacks, including a set named by a unit's `button_set` and a button card named by an `action_variable`. The report SHALL name each cause.

#### Scenario: Set absent on older versions
- **WHEN** a mod defines a button set that's absent before 1.12
- **THEN** versions before 1.12 are reported as rejected, naming the set

#### Scenario: Function absent on a version
- **WHEN** a button uses a condition a version lacks
- **THEN** that version is reported as rejected, naming the condition and button

#### Scenario: Requirements on every version
- **WHEN** a StarCraft mod changes requirement records, with any opcodes and bare unit IDs
- **THEN** no version is reported as rejected because of them, since every version's checkers handle every opcode and bare unit ID, and a record a version lacks is added there

### Requirement: Skipped constants on a version
A constant that's `unknown` or `not_applicable` on a version SHALL be reported as skipped there, with that reason, and SHALL NOT make the version count as rejected.

#### Scenario: Unknown constant
- **WHEN** a mod sets a constant that's `unknown` on one version
- **THEN** that version is reported as applying with that constant skipped

### Requirement: Warnings don't block saving
Version compatibility results SHALL NOT make a mod invalid, and SHALL NOT prevent saving. An entry that would make a mod rejected on some versions SHALL have a warning.

#### Scenario: Rejected on one version
- **WHEN** a mod is valid but rejected on one version
- **THEN** it can be saved, and the report still shows that version's result

#### Scenario: Entry that some versions lack
- **WHEN** a mod defines a button set that's absent on some versions
- **THEN** that set has a warning naming those versions

### Requirement: Warnings at the point of use
Choosing a set or function that some versions lack SHALL show which versions lack it, beside the field.

#### Scenario: Selecting a function
- **WHEN** a user chooses a condition that some versions lack
- **THEN** the form lists those versions

### Requirement: Limits of the report
The report SHALL say that it comes from catalog data, and that the patcher decides for itself which versions it supports and whether a game file matches when it runs.

#### Scenario: Reading the report
- **WHEN** a user opens the report
- **THEN** it says these results are predictions from the catalog
