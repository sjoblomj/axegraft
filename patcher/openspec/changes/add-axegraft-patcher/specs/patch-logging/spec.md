# Spec Delta

## Purpose

Defines the plain text log that lets users and mod makers see exactly what AxeGraft Patcher did, or why it refused, on each launch.

## ADDED Requirements

### Requirement: Log location
AxeGraft Patcher SHALL write its log to `AxeGraftPatcher.log` in the user's temporary folder, replacing the previous launch's log.

#### Scenario: New launch
- **WHEN** a game is started with AxeGraft Patcher and a log already exists
- **THEN** the new log replaces it

### Requirement: Log header
The log SHALL start with AxeGraft Patcher's version, the game, the game version and the address the executable is loaded at.

#### Scenario: Header contents
- **WHEN** AxeGraft Patcher identifies the running version
- **THEN** the log records its own version, the game, the game version and the load address

### Requirement: Logging inputs
The log SHALL list every input with its source, and every MPQ where the mod file wasn't found.

#### Scenario: Inputs from two sources
- **WHEN** a mod comes from one MPQ and the directly supplied file
- **THEN** the log names both, and says where each came from

### Requirement: Logging changes
The log SHALL list each change the mod makes, and every location written, with its old and new bytes.

#### Scenario: Constant with several locations
- **WHEN** a constant is written to several locations
- **THEN** the log has the constant and its value, followed by each location with its old and new bytes

### Requirement: Logging skips
The log SHALL list each skipped constant with its reason.

#### Scenario: Skipped constant
- **WHEN** a constant is skipped on the running version
- **THEN** the log names the constant and the version, and says whether it's `unknown` or `not_applicable`

### Requirement: Logging errors
The log SHALL contain every error, even when the on-screen message shows only some of them.

#### Scenario: More errors than shown
- **WHEN** an on-screen message shows only the first problems
- **THEN** the log contains all of them

### Requirement: Log survives a crash
AxeGraft Patcher SHALL write the planned changes to disk before it changes any game memory, and SHALL flush the log before closing the game.

#### Scenario: Crash during patching
- **WHEN** the process dies while changes are being written
- **THEN** the log already contains the planned changes

#### Scenario: Closing after an error
- **WHEN** AxeGraft Patcher closes the game because of an error
- **THEN** the complete error list is on disk first

### Requirement: Logging failure isn't fatal
Being unable to write the log SHALL NOT stop a valid mod from being applied.

#### Scenario: Log can't be created
- **WHEN** the log file can't be created
- **THEN** the mod is still applied, and any error message says that no log is available
