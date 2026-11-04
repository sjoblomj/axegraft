# Spec Delta

## Purpose

Defines where AxeGraft Patcher reads mods from, how several inputs combine into one mod, and how overlaps between them are reported.

## ADDED Requirements

### Requirement: Mods in patch MPQs
AxeGraft Patcher SHALL read `axegraft\patch.json` from each loaded patch MPQ separately, so that a copy in one MPQ doesn't hide a copy in another. An MPQ without that file SHALL be ignored.

#### Scenario: File in several MPQs
- **WHEN** two loaded patch MPQs each contain `axegraft\patch.json`
- **THEN** both files are read as separate inputs

#### Scenario: File in only some MPQs
- **WHEN** one of two loaded patch MPQs contains `axegraft\patch.json`
- **THEN** that file is read, and the other MPQ doesn't cause an error

### Requirement: Directly supplied mod
AxeGraft Patcher SHALL offer one optional file setting for a mod, available in the GUI and on the CLI. When it's set, that file SHALL be another input, and it SHALL be packed into any SEMPQ made with it.

#### Scenario: File chosen in settings
- **WHEN** the user sets the mod file setting and starts the game
- **THEN** that file is read as an input

#### Scenario: SEMPQ with a chosen file
- **WHEN** a SEMPQ is created with the mod file setting set, and is run where the original file doesn't exist
- **THEN** the mod is still applied

### Requirement: At least one input
AxeGraft Patcher SHALL treat having no inputs as an error, because the plugin was selected but has nothing to do.

#### Scenario: No mod anywhere
- **WHEN** no patch MPQ contains `axegraft\patch.json` and the mod file setting isn't set
- **THEN** the user is told that no mod was found, and the game closes

### Requirement: Inputs must agree on the game
All inputs SHALL have the same `game`, and it SHALL be the game that's running.

#### Scenario: Inputs for different games
- **WHEN** one input is for `starcraft` and another is for `warcraft2`
- **THEN** the mod is rejected, with an error naming both inputs and their games

#### Scenario: Mod for another game
- **WHEN** a mod is for `warcraft2` and the running game is StarCraft
- **THEN** the mod is rejected, with an error naming the input and both games

### Requirement: Merging without overlaps
AxeGraft Patcher SHALL merge all inputs into one mod when they don't overlap. The result SHALL NOT depend on the order of the inputs.

#### Scenario: Separate changes
- **WHEN** one input changes constants and another changes button sets
- **THEN** both sets of changes are applied

#### Scenario: Input order
- **WHEN** the same non-overlapping inputs are merged in a different order
- **THEN** the resulting changes are identical

### Requirement: What counts as an overlap
Two inputs SHALL overlap when both define the same field of the same unit, the same button set, the same requirement record or the same constant. They SHALL overlap even if the values are identical.

#### Scenario: Different fields on one unit
- **WHEN** one input sets unit 5's `button_set` and another sets unit 5's `status_update`
- **THEN** the inputs don't overlap

#### Scenario: Different status functions on one unit
- **WHEN** one input sets unit 5's `status_changed` and another sets unit 5's `status_update`
- **THEN** the inputs don't overlap

#### Scenario: Same button set
- **WHEN** two inputs both define button set 7
- **THEN** the inputs overlap

#### Scenario: Identical values
- **WHEN** two inputs set the same constant to the same value
- **THEN** the inputs overlap

#### Scenario: Same mod loaded twice
- **WHEN** the same file is supplied directly and is also in a patch MPQ
- **THEN** the inputs overlap

### Requirement: Reporting overlaps
When inputs overlap, AxeGraft Patcher SHALL reject the mod and report every overlap, naming the inputs and the values that conflict. An input from an MPQ SHALL be named by that MPQ, and a directly supplied one by its file.

#### Scenario: Several overlaps
- **WHEN** two MPQs overlap on a constant, and one of them also overlaps with the directly supplied file on a button set
- **THEN** the error lists both overlaps, each naming its inputs and what they both define

### Requirement: Errors name their input
Parsing and validation errors SHALL name the input they came from, and every input SHALL be checked before reporting.

#### Scenario: Two invalid inputs
- **WHEN** two inputs each contain a different mistake
- **THEN** both mistakes are reported, each with the name of its input
