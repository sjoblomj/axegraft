# Spec Delta

## Purpose

Defines the supported games and builds, what the library records about each property per build, and the guarantees that data must meet before it can ship.

## ADDED Requirements

### Requirement: Supported builds
The library schema SHALL support StarCraft 1.05-1.17 and Warcraft II BNE 2.00 and 2.02. A build SHALL count as supported only once the library has complete data for it, and AxeGraft Patcher SHALL treat every other executable as unsupported.

#### Scenario: Build with complete data
- **WHEN** the library has complete data for a build
- **THEN** AxeGraft Patcher reports that build as supported

#### Scenario: Build without data
- **WHEN** an executable isn't in the library, such as StarCraft 1.18 or a Warcraft II DOS version
- **THEN** AxeGraft Patcher reports it as unsupported

### Requirement: Build identification
AxeGraft Patcher SHALL identify a build from properties of the running executable that are unique across all supported builds, without relying on a version string alone.

#### Scenario: Builds sharing a PE timestamp
- **WHEN** the executable is StarCraft 1.05 or 1.06, which share a PE timestamp
- **THEN** they're identified as different builds

#### Scenario: Builds sharing a version string
- **WHEN** the executable is StarCraft 1.08 or 1.08b, which share a `ProductVersion` string
- **THEN** they're identified as different builds

### Requirement: Complete structural data per build
A supported build SHALL have complete data for its button sets, status functions and, in StarCraft, requirement streams. If any of this is unknown, that build SHALL NOT be supported.

#### Scenario: Missing structural table
- **WHEN** the data for a build lacks the location of a structural table
- **THEN** the library check fails

### Requirement: Constant availability per build
Every constant SHALL state one of three things for every supported build of its game: its locations, `not_applicable` when the code doesn't exist there, or `unknown` when it hasn't been found. A build SHALL NOT be left out.

#### Scenario: Forgotten build
- **WHEN** a constant has no entry for a supported build
- **THEN** the library check fails

#### Scenario: Reporting gaps
- **WHEN** the library's coverage is listed
- **THEN** each `unknown` and `not_applicable` entry is listed, per constant and per build

### Requirement: All locations or none
A constant's entry for a build SHALL list every location that must change for the edit to work. A constant known to have other locations that haven't been found SHALL be `unknown` for that build.

#### Scenario: Constant with an unlisted copy
- **WHEN** a constant is known to have a second copy on a build, and that copy's location isn't known
- **THEN** the constant is `unknown` on that build, and no location is listed

#### Scenario: Different number of locations per build
- **WHEN** a constant has two locations on one build and one on another
- **THEN** the library records two and one locations respectively, and the mod's constant is unchanged

### Requirement: Expected original bytes
Every location the library can change SHALL record the bytes expected there in that build.

#### Scenario: Entry without expected bytes
- **WHEN** a location has no expected bytes
- **THEN** the library check fails

#### Scenario: Value differs between builds
- **WHEN** a constant's original value is one value on one build and another value on another build
- **THEN** each build's entry records its own expected bytes

### Requirement: No shared locations
No two properties SHALL write to the same location, or to overlapping bytes, on any build. This SHALL be checked when the library is built, not when a mod runs.

#### Scenario: Two constants on one offset
- **WHEN** two constants have overlapping locations on any build
- **THEN** the library check fails, naming both constants and the build

### Requirement: Value range fits every location
A numeric constant SHALL have one allowed range per game, and every value in that range SHALL fit every location on every build where the constant is available.

#### Scenario: Range too wide for a location
- **WHEN** a constant's range goes up to 300 but one build stores it in one byte
- **THEN** the library check fails, naming the constant and the build

### Requirement: Stable scale across builds
A numeric constant's stored scale SHALL be the same on every build where it's available. Sign and width MAY differ, but a build that stores a different scale SHALL fail the library check until that case has been decided.

#### Scenario: Scale differs between builds
- **WHEN** a constant is stored as whole units on one build and half-units on another
- **THEN** the library check fails, naming the constant and the builds

### Requirement: Named options per build
A code-site constant SHALL list, for each build where it's available, the bytes that each named option writes. The same option MAY have different bytes on different builds.

#### Scenario: Inverted branch
- **WHEN** a constant's option replaces a `jne` on one build and a `je` on another
- **THEN** each build records its own bytes for that option

### Requirement: Function tables per build
The library SHALL give each condition, action and status function a unique name, and SHALL record its address per build and the type of value it reads. A function that doesn't exist on a build SHALL be recorded as absent there.

#### Scenario: Function shared under one source symbol
- **WHEN** several distinct game functions share a single symbol in a reference source
- **THEN** each has its own unique name in the library

#### Scenario: Function absent on older builds
- **WHEN** a replay function doesn't exist before StarCraft 1.08
- **THEN** the library records it as absent on those builds

### Requirement: Button set numbering per build
The library SHALL map each game's button set numbering to each build's own IDs, and SHALL record which sets are absent on a build.

#### Scenario: Shifted set ID
- **WHEN** a set is 233 in the numbering from 1.12 on and 232 in 1.11b
- **THEN** the library maps 233 to 232 on 1.11b

#### Scenario: Absent set
- **WHEN** set 232 doesn't exist before StarCraft 1.12
- **THEN** the library records it as absent on those builds

### Requirement: Confirmed data only
The library SHALL exclude anything marked as unconfirmed in its source data.

#### Scenario: Unconfirmed entry
- **WHEN** an entry in the data has an unconfirmed status
- **THEN** it isn't available to mods, and it's treated as `unknown`

### Requirement: Library compiled into the plugin
The library SHALL be built into the plugin. Mods and other files at run time SHALL NOT be able to add or change locations, encodings or expected bytes.

#### Scenario: Mod tries to define a location
- **WHEN** a mod contains a field giving a location or encoding
- **THEN** the mod is rejected as having an unknown field

### Requirement: Fixed set of encodings
Library entries SHALL use a fixed set of encodings, and a mod SHALL NOT be able to cause any computation beyond them.

#### Scenario: Unknown encoding in data
- **WHEN** a library entry names an encoding that isn't in the set
- **THEN** the library build fails

### Requirement: Checking against real executables
It SHALL be possible to check all library data for a build against that build's real executable, without storing any game files in the repository.

#### Scenario: Data matches the executable
- **WHEN** the check runs with a build's executable available
- **THEN** every expected byte sequence is compared with the file, and any difference fails the check, naming the property and the location

#### Scenario: Executable not available
- **WHEN** the check is requested for a build whose executable isn't available
- **THEN** the check reports that build as not checked, and doesn't report it as passed
