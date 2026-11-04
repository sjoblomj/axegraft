# Spec Delta

## Purpose

Limits what the plugin may do on the user's machine, so its behaviour stays narrow, explainable and unlikely to look suspicious.

## ADDED Requirements

### Requirement: Own process only
AxeGraft Patcher SHALL NOT read or write the memory of any other process, start threads in another process, or enumerate processes. MPQDraft is responsible for loading the plugin into the game.

#### Scenario: Calling a banned process API
- **WHEN** AxeGraft Patcher's own code is checked for calls to `WriteProcessMemory`, `CreateRemoteThread`, `OpenProcess` or process enumeration APIs
- **THEN** none are found

### Requirement: No network, persistence or external programs
AxeGraft Patcher SHALL NOT make network calls, write to the registry, set up anything to run automatically, or start other programs. The only file it SHALL write is its log.

#### Scenario: Checking the footprint
- **WHEN** the plugin's own code is checked for network, registry, autostart and process creation calls
- **THEN** none are found

#### Scenario: Files after a run
- **WHEN** a game has run with AxeGraft Patcher
- **THEN** the only file AxeGraft Patcher has created or changed is its log

### Requirement: No hidden code
Release builds SHALL NOT be packed, encrypted or obfuscated, and AxeGraft Patcher SHALL NOT resolve APIs by hash or allocate executable memory.

#### Scenario: Inspecting a release
- **WHEN** a release plugin file is inspected
- **THEN** its imports are visible in its import table, and its library data isn't compressed or encrypted

#### Scenario: Allocating memory for game data
- **WHEN** AxeGraft Patcher allocates memory for button sets or requirement streams
- **THEN** that memory isn't executable

### Requirement: Mods are data only
A mod SHALL NOT be able to make AxeGraft Patcher write to a chosen address or run code. Anything a mod causes to be written SHALL come through a library entry.

#### Scenario: Function value
- **WHEN** a mod selects a function for a button
- **THEN** the address written comes from the library, chosen by the function's name

### Requirement: One stable binary
All mods SHALL use the same plugin file, so that a release's reputation can build up. Mods SHALL NOT need a mod-specific plugin build.

#### Scenario: Two different mods
- **WHEN** two different mods are used
- **THEN** both run with the same, unchanged plugin file

### Requirement: Identifiable binary
The plugin file SHALL have a version resource with a clear product name, description and version.

#### Scenario: Viewing file properties
- **WHEN** a user views the plugin file's properties
- **THEN** it identifies itself as AxeGraft Patcher, with its version
