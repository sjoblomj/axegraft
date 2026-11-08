# Spec Delta

## Purpose

Defines where AxeGraft Patcher reads its mod from, and the checks on that mod as an input. In this first version, there is one input: a file the user chooses. Reading mods from patch MPQs, and merging several inputs, are later work.

## ADDED Requirements

### Requirement: Mod file chosen in the configuration
AxeGraft Patcher SHALL read exactly one mod, from a file the user chooses in the plugin's configuration in MPQDraft. That file SHALL be packed into any SEMPQ made with it. AxeGraft Patcher SHALL NOT look for mods in patch MPQs.

#### Scenario: File chosen
- **WHEN** the user chooses a mod file in the plugin's configuration and starts the game
- **THEN** that file is read as the mod

#### Scenario: SEMPQ with a chosen file
- **WHEN** a SEMPQ is created with a mod file chosen, and is run where the original file doesn't exist
- **THEN** the mod is still applied

#### Scenario: Mod file in a patch MPQ
- **WHEN** a loaded patch MPQ contains `axegraft\patch.json`
- **THEN** that file isn't read, and has no effect

### Requirement: Mod file missing at launch
AxeGraft Patcher SHALL treat a mod file that can't be found or read at launch as an error.

#### Scenario: Mod file can't be read
- **WHEN** the game starts, and the chosen mod file can't be located through MPQDraft or can't be read
- **THEN** the user is told that the mod file couldn't be read, naming it where known, and the game closes

### Requirement: Mod must be for the running game
The mod's `game` SHALL be the game that's running.

#### Scenario: Mod for another game
- **WHEN** a mod is for `warcraft2` and the running game is StarCraft
- **THEN** the mod is rejected, with an error naming the input and both games

### Requirement: Errors name their input
Parsing and validation errors SHALL name the mod file they came from.

#### Scenario: Invalid mod
- **WHEN** the mod file contains a mistake
- **THEN** the error names the mod file, along with where the mistake is
