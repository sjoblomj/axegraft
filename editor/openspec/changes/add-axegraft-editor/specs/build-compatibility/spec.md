# Spec Delta

## Purpose

Shows in AxeGraft Editor how the current mod would behave on each build of its game, since a mod names no build but what it uses may be absent on some builds.

## ADDED Requirements

### Requirement: Report for every build
The editor SHALL report, for each build in the catalog, whether the current mod would apply fully, apply with constants skipped, or be rejected. The report SHALL update as the mod changes.

#### Scenario: Mod using only common content
- **WHEN** a mod changes only what every build has
- **THEN** every build is reported as applying fully

### Requirement: Rejection on a build
A mod SHALL be reported as rejected on a build when it uses a button set or function that build lacks, including a set named by an `action_variable` or a unit's `button_set`. The report SHALL name each cause.

#### Scenario: Set absent on older builds
- **WHEN** a mod defines a button set that's absent before 1.12
- **THEN** builds before 1.12 are reported as rejected, naming the set

#### Scenario: Function absent on a build
- **WHEN** a button uses a condition a build lacks
- **THEN** that build is reported as rejected, naming the condition and button

### Requirement: Skipped constants on a build
A constant that's `unknown` or `not_applicable` on a build SHALL be reported as skipped there, with that reason, and SHALL NOT make the build count as rejected.

#### Scenario: Unknown constant
- **WHEN** a mod sets a constant that's `unknown` on one build
- **THEN** that build is reported as applying with that constant skipped

### Requirement: Warnings don't block saving
Build compatibility results SHALL NOT make a mod invalid, and SHALL NOT prevent saving.

#### Scenario: Rejected on one build
- **WHEN** a mod is valid but rejected on one build
- **THEN** it can be saved, and the report still shows that build's result

### Requirement: Warnings at the point of use
Choosing a set or function that some builds lack SHALL show which builds lack it, beside the field.

#### Scenario: Selecting a function
- **WHEN** a user chooses a condition that some builds lack
- **THEN** the form lists those builds

### Requirement: Limits of the report
The report SHALL say that it comes from catalog data, and that the patcher decides for itself which builds it supports and whether a game file matches when it runs.

#### Scenario: Reading the report
- **WHEN** a user opens the report
- **THEN** it says these results are predictions from the catalog
