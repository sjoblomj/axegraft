# Spec Delta

## Purpose

Defines the supported games and versions, what the library records about each property per version, and the guarantees that data must meet before it can ship.

## ADDED Requirements

### Requirement: Supported versions
The library schema SHALL support StarCraft 1.05-1.17 and Warcraft II BNE 2.00 and 2.02. A version SHALL count as supported only once the library has complete data for it, and AxeGraft Patcher SHALL treat every other executable as unsupported.

#### Scenario: Version with complete data
- **WHEN** the library has complete data for a version
- **THEN** AxeGraft Patcher reports that version as supported

#### Scenario: Version without data
- **WHEN** an executable isn't in the library
- **THEN** AxeGraft Patcher reports it as unsupported

#### Scenario: Warcraft II for DOS
- **WHEN** a Warcraft II 1.3, 1.33 or 1.5 executable is checked, although AxeGraft Editor's catalog lists those versions
- **THEN** AxeGraft Patcher reports it as unsupported

### Requirement: Version identification
AxeGraft Patcher SHALL identify a version from properties of the running executable that are unique across all supported versions, without relying on a version string alone.

#### Scenario: Versions sharing a PE timestamp
- **WHEN** two supported versions have the same PE timestamp
- **THEN** they're identified as different versions

#### Scenario: Versions sharing a `ProductVersion` string
- **WHEN** two supported versions have the same `ProductVersion` string
- **THEN** they're identified as different versions

### Requirement: Complete structural data per version
A supported version SHALL have complete data for its button sets, status functions, unit entries and, in StarCraft, requirement streams. Unit entries means the location and layout of the button table's entries and of each unit's status entry: in StarCraft `gCards`, with its equivalent entry, and the status table; in Warcraft II the command lists and the Unit Data, with its icon, stats panel frame and name string. If any of this is unknown, that version SHALL NOT be supported.

#### Scenario: Missing structural table
- **WHEN** the data for a version lacks the location of a structural table
- **THEN** the library check fails

#### Scenario: Entry layouts that differ by version
- **WHEN** a table's entries have different layouts on different supported versions
- **THEN** the library records each version's layout, and a field is written at its offset in the running version's layout. The supported versions known so far share one layout per table: StarCraft's tables parse with 1.15.0's layouts in every build, and Warcraft II's Unit Data has 16-byte entries in both 2.00 and 2.02

### Requirement: Constant availability per version
Every constant SHALL state one of three things for every supported version of its game: its locations, `not_applicable` when the code doesn't exist there, or `unknown` when it hasn't been found. A version SHALL NOT be left out.

#### Scenario: Forgotten version
- **WHEN** a constant has no entry for a supported version
- **THEN** the library check fails

#### Scenario: Reporting gaps
- **WHEN** the library's coverage is listed
- **THEN** each `unknown` and `not_applicable` entry is listed, per constant and per version

### Requirement: All locations or none
A constant's entry for a version SHALL list every location that must change for the edit to work. A constant known to have other locations that haven't been found SHALL be `unknown` for that version.

#### Scenario: Constant with an unlisted copy
- **WHEN** a constant is known to have a second copy on a version, and that copy's location isn't known
- **THEN** the constant is `unknown` on that version, and no location is listed

#### Scenario: Different number of locations per version
- **WHEN** a constant has two locations on one version and one on another
- **THEN** the library records two and one locations respectively, and the mod's constant is unchanged

### Requirement: Expected original bytes
Every location the library can change SHALL record the bytes expected there in that version.

#### Scenario: Entry without expected bytes
- **WHEN** a location has no expected bytes
- **THEN** the library check fails

#### Scenario: Value differs between versions
- **WHEN** a constant's original value is one value on one version and another value on another version
- **THEN** each version's entry records its own expected bytes

### Requirement: No shared locations
No two properties SHALL write to the same location, or to overlapping bytes, on any version, except constants that the game stores in exactly the same place on that version, with the same expected bytes. This SHALL be checked when the library is built, not when a mod runs.

#### Scenario: Two constants on overlapping bytes
- **WHEN** two constants have locations that overlap without being exactly the same place on any version
- **THEN** the library check fails, naming both constants and the version

#### Scenario: Two constants stored in the same place
- **WHEN** two constants are stored in exactly the same place on a version, with the same expected bytes
- **THEN** the library check passes, and a mod may set both to the same value on that version

#### Scenario: A mod gives constants in the same place different values
- **WHEN** a mod sets two constants stored in the same place on the running version to different values
- **THEN** planning fails, naming both, and nothing is written

### Requirement: Grouping locations into constants
Each value the game lets differ SHALL be its own constant. Locations that hold one value the game needs to agree SHALL be one constant, and code sites that only work together SHALL be one option constant whose options write all of them.

#### Scenario: Copies that may differ
- **WHEN** StarCraft spawns four starting workers through four separate immediates
- **THEN** each is its own constant

#### Scenario: Copies that must agree
- **WHEN** a team supply multiplier is used once in a comparison and once in the stored value
- **THEN** both locations belong to one constant

#### Scenario: Sites that only work together
- **WHEN** the hero cloak requirement can use no tech, Cloaking Field or Personnel Cloaking, each by changing a different jump
- **THEN** it is one option constant with three options

### Requirement: Value range fits every location
A numeric constant SHALL have one allowed range per game, and every value in that range SHALL fit every location on every version where the constant is available.

#### Scenario: Range too wide for a location
- **WHEN** a constant's range includes values that one of its locations can't store
- **THEN** the library check fails, naming the constant and the version

### Requirement: Stable scale across versions
A numeric constant's stored scale SHALL be the same on every version where it's available. Sign and width MAY differ, but a version that stores a different scale SHALL fail the library check until that case has been decided.

#### Scenario: Scale differs between versions
- **WHEN** a constant is stored as whole units on one version and half-units on another
- **THEN** the library check fails, naming the constant and the versions

### Requirement: Named options per version
A code-site constant SHALL list, for each version where it's available, the bytes that each named option writes. Every code-site constant SHALL have an option named `original`, whose bytes on each version are that version's original bytes, so a mod can ask for the original behaviour on every version. The same option MAY have different bytes on different versions. An option MAY write several locations. They SHALL be written together, and the constant SHALL be available on a version only when all of them are known there.

#### Scenario: Original option
- **WHEN** a mod gives a code-site constant `"option": "original"`
- **THEN** each version's own original bytes are written, which on a version already holding them changes nothing

#### Scenario: Different code on different versions
- **WHEN** a constant's option replaces different instructions on different versions
- **THEN** each version records its own bytes for that option

#### Scenario: Option writing several locations
- **WHEN** the hero cloak requirement's option "Personnel Cloaking" changes jumps in two functions
- **THEN** each version records the bytes for both locations, and applying the option writes both

#### Scenario: Option with a location missing on a version
- **WHEN** one of an option's locations isn't known on a version
- **THEN** the constant is `unknown` on that version

### Requirement: Function tables per version
The library SHALL give each condition, action and status function a unique name, and SHALL record its address per version and the type of variable it reads: none, unit, tech, upgrade, order, number or table entry. It SHALL record whether each status function is a status changed or a status update function, and, for each requirement opcode, the parameter it takes and the record types whose checker handles it. A function that doesn't exist on a version SHALL be recorded as absent there.

#### Scenario: Function shared under one source symbol
- **WHEN** several distinct game functions share a single symbol in a reference source
- **THEN** each has its own unique name in the library

#### Scenario: Function absent on a version
- **WHEN** a function doesn't exist on a supported version
- **THEN** the library records it as absent on that version

#### Scenario: Two names for one function, one unused
- **WHEN** two named functions are the same function on a version, and that version's original buttons use only one name, as with `bf_can_attack` and `bf_always` in Warcraft II 2.00 and 2.02, whose command lists use `bf_always`
- **THEN** the library records the unused name, `bf_can_attack`, as absent on that version

#### Scenario: Two names for one function, both used
- **WHEN** two named functions are the same function on a version, and that version's original buttons use both names, as with `bf_scv_can_repair` and `bf_scv_can_move` in StarCraft 1.17
- **THEN** the library keeps both names on that version, at the same address

### Requirement: Button set numbering per version
The library SHALL map each game's numbering of button sets and table entries to each version's own numbers, and SHALL record which sets and entries are absent on a version and which table entries point at each set's array.

#### Scenario: Set numbered differently on a version
- **WHEN** a set has a different ID on a version than in the game's own numbering
- **THEN** the library maps the game's numbering to that version's ID

#### Scenario: Absent set
- **WHEN** a set in the game's numbering doesn't exist on a version
- **THEN** the library records it as absent on that version

#### Scenario: Table entry numbered differently on a version
- **WHEN** a table entry beyond the unit range has a different number on a version
- **THEN** the library maps the game's numbering to that version's number

#### Scenario: Table entries that don't match
- **WHEN** the library's list of entries for a set differs from the pointers in a version's table
- **THEN** the check against that version's executable fails, naming the set

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
It SHALL be possible to check all library data for a version against that version's real executable, without storing any game files in the repository.

#### Scenario: Data matches the executable
- **WHEN** the check runs with a version's executable available
- **THEN** every expected byte sequence is compared with the file, and any difference fails the check, naming the property and the location

#### Scenario: Executable not available
- **WHEN** the check is requested for a version whose executable isn't available
- **THEN** the check reports that version as not checked, and doesn't report it as passed
