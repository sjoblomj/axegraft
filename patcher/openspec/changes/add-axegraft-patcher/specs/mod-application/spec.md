# Spec Delta

## Purpose

Defines how a merged mod becomes changes to the running version, including what gets skipped or rejected, what is checked first, and how memory is changed.

## ADDED Requirements

### Requirement: Validate everything before writing
AxeGraft Patcher SHALL finish all validation and planning before changing any game memory. If any problem is found, it SHALL change nothing.

#### Scenario: One bad value among many
- **WHEN** a mod has many valid changes and one invalid value
- **THEN** no game memory is changed, and the problem is reported

### Requirement: Memory-only changes
AxeGraft Patcher SHALL change only the memory of the game process it runs in. It SHALL NOT change any game file on disk.

#### Scenario: After the game exits
- **WHEN** a modded game has exited
- **THEN** the game's files are unchanged, and running it without AxeGraft Patcher is unmodified

### Requirement: Skipping constants unavailable on a version
A constant that's `unknown` or `not_applicable` on the running version SHALL be skipped and logged with its reason. The rest of the mod SHALL still be applied.

#### Scenario: Unknown on this version
- **WHEN** a mod sets a constant that's `unknown` on the running version
- **THEN** that constant is skipped, the log gives the reason, and the other changes are applied

#### Scenario: Code doesn't exist on this version
- **WHEN** a mod sets a constant that's `not_applicable` on the running version
- **THEN** that constant is skipped, and the log says the code doesn't exist on this version

### Requirement: Same validation on every version
A mod's values SHALL be validated the same way whether or not they will be skipped on the running version.

#### Scenario: Invalid value that would be skipped
- **WHEN** a constant is `unknown` on the running version and the mod's value is out of range
- **THEN** the mod is rejected

### Requirement: Skipping is limited to constants
Skipping SHALL apply only to constants. A unit, button set or requirement change that can't be made on the running version SHALL reject the mod.

#### Scenario: Button set absent on this version
- **WHEN** a mod defines a button set that doesn't exist on the running version
- **THEN** the mod is rejected, with an error naming the set and the version

#### Scenario: Function absent on this version
- **WHEN** a button uses a condition or action, or a unit entry a status function, that doesn't exist on the running version
- **THEN** the mod is rejected, with an error naming the function and the version

#### Scenario: Unit given a set absent on this version
- **WHEN** a unit entry's `button_set` is a set that doesn't exist on the running version
- **THEN** the mod is rejected, with an error naming the set and the version

#### Scenario: Table entry absent on this version
- **WHEN** a button's `condition_variable` or `action_variable`, a unit entry's `id`, or a unit entry's `equivalent_entry`, is a table entry that doesn't exist on the running version
- **THEN** the mod is rejected, with an error naming the entry and the version

### Requirement: Checking expected bytes
Before changing anything, AxeGraft Patcher SHALL compare the current bytes at every location it will write with the bytes the library expects. Any difference SHALL reject the mod and SHALL NOT be treated as a skip.

#### Scenario: Modified executable
- **WHEN** the bytes at a location differ from those the library expects for this version
- **THEN** no memory is changed, and the error names the property, the location, and the expected and actual bytes

### Requirement: Translating IDs to the running version
AxeGraft Patcher SHALL translate button set IDs and table entries to the running version's own numbering, including table entries in `action_variable` and `equivalent_entry`.

#### Scenario: Set numbered differently on this version
- **WHEN** a mod defines a set that the running version numbers differently
- **THEN** the change is applied to the running version's ID for that set

#### Scenario: Action that opens a table entry
- **WHEN** a button's action opens a table entry that the running version numbers differently
- **THEN** the written button uses the running version's number for that entry

### Requirement: Button set changes
Replacing an original set SHALL change every table entry that originally pointed at its array, except entries the mod assigns another set. A new set SHALL reach only the entries assigned to it. Buttons SHALL be built in the running version's layout, using that version's function addresses and the plugin's own memory, and every entry holding a set SHALL point at the same memory.

#### Scenario: Set shared by several units
- **WHEN** a mod replaces set 0, whose array units 0, 10, 20 and 32 point at
- **THEN** all four units have the new buttons

#### Scenario: Table entry that isn't a unit
- **WHEN** a mod replaces a set whose array is also pointed at by a table entry with no unit
- **THEN** that entry holds the new buttons too

#### Scenario: Unit assigned away from a replaced set
- **WHEN** a mod replaces set 0 and assigns set 5 to unit 32
- **THEN** unit 32 has set 5's buttons, and units 0, 10 and 20 have the new buttons

#### Scenario: Giving one unit its own set
- **WHEN** a mod defines new set 250 and assigns it to unit 32
- **THEN** unit 32 has those buttons, and units 0, 10 and 20 are unchanged

#### Scenario: New set nothing uses
- **WHEN** a mod defines new set 250 and assigns it to no entry
- **THEN** no unit's buttons change

#### Scenario: Set with more buttons than the original
- **WHEN** a mod defines a set with more buttons than the original
- **THEN** all its buttons are available in the game

#### Scenario: Variable the game doesn't read
- **WHEN** a button gives a variable to a function that doesn't read it
- **THEN** the value is written as given

#### Scenario: Game writes to its buttons
- **WHEN** the game writes to a button of a replaced set while running
- **THEN** the write succeeds

### Requirement: Assigning button sets to units
Setting a unit entry's `button_set` SHALL give that table entry the buttons of the named set, including any replacement the mod defines, or no buttons for `null`. A set's contents SHALL NOT depend on `button_set` assignments in the same mod.

#### Scenario: Unit uses a set the mod replaced
- **WHEN** a mod replaces set 7 and also assigns set 7 to unit 0
- **THEN** unit 0 has the replacement buttons

#### Scenario: Assignments that chain
- **WHEN** a mod assigns set 5 to unit 0 and set 7 to unit 5
- **THEN** unit 0 has set 5's buttons, and unit 5 has set 7's buttons

#### Scenario: Removing a unit's buttons
- **WHEN** a mod sets unit 32's `button_set` to `null`
- **THEN** unit 32 has no buttons, and units 0, 10 and 20 are unchanged

### Requirement: Status function changes
Setting a unit's `status_changed` or `status_update` SHALL change only that function of that unit, to the named function's address on the running version.

#### Scenario: Only one function set
- **WHEN** a mod sets a unit's `status_update` and not its `status_changed`
- **THEN** only the unit's update function changes

#### Scenario: Functions of different units
- **WHEN** a mod sets a unit's `status_changed` and `status_update` to functions the game uses for different kinds of unit, such as a building's update function on a unit
- **THEN** each is applied as given

### Requirement: Status unit type changes
Setting a unit's `status_unit_type` SHALL change only that value in that unit's status entry, on StarCraft versions.

#### Scenario: Only the unit type set
- **WHEN** a mod sets a unit's `status_unit_type` and neither of its status functions
- **THEN** only the stored unit type changes

### Requirement: Unit Data changes
Setting a unit's `icon`, `stats_frame` or `name_string` SHALL change only that value in that unit's Unit Data entry, on Warcraft II versions, in the entry's layout on the running version: 14 bytes in 1.3, 1.33 and 1.5, and 16 bytes in 2.00 and 2.02. The other values in the entry SHALL stay as they are unless the mod sets them.

#### Scenario: Only the icon set
- **WHEN** a mod sets a Warcraft II unit's `icon` and nothing else
- **THEN** only the unit's icon changes, and the buttons that train it keep their own icons

#### Scenario: Name string set
- **WHEN** a mod sets a Warcraft II unit's `name_string`
- **THEN** the unit's name shown in the stats panel changes, and its icon, frame and status functions are unchanged

### Requirement: Equivalent entry changes
Setting a unit's `equivalent_entry` SHALL change only that value in the unit's button table entry, on StarCraft versions, writing `0xFFFF` for `null`. The entry's button count and button pointer SHALL be set only by `button_set` and button set changes.

#### Scenario: Equivalent entry cleared
- **WHEN** a mod sets unit 16's `equivalent_entry` to `null`
- **THEN** unit 16's entry stores `0xFFFF`, and its buttons are unchanged

#### Scenario: Button set changed without the equivalent entry
- **WHEN** a mod sets unit 16's `button_set` and not its `equivalent_entry`
- **THEN** the entry keeps its original equivalent entry, 1

### Requirement: Requirement record changes
A requirement entry SHALL replace only that item's record in the running version's own stream. Records the mod doesn't define SHALL stay as they are on that version, and the game SHALL use the new stream in all places that refer to it.

#### Scenario: Record differs between versions
- **WHEN** a record the mod doesn't define exists on some versions but not others, and the mod changes a different record
- **THEN** the undefined record stays as each version has it

#### Scenario: Stream grows
- **WHEN** a mod's records make a stream larger than its original space
- **THEN** the game uses the complete new stream

#### Scenario: Removing a record
- **WHEN** a requirement entry has an empty `list`
- **THEN** that item's record isn't in the new stream

### Requirement: Constant changes
A constant SHALL be written to every location listed for the running version, using each location's own encoding.

#### Scenario: Several locations
- **WHEN** a constant has several locations on the running version
- **THEN** all of them are written

#### Scenario: Named option
- **WHEN** a mod selects a named option for a code-site constant
- **THEN** the bytes the running version lists for that option are written

### Requirement: Load address independence
AxeGraft Patcher SHALL work wherever the executable is loaded in memory, including pointers it compares and writes.

#### Scenario: Executable not at its preferred base
- **WHEN** a version loads at a different address from its preferred one
- **THEN** locations, expected pointers and written pointers are all correct for that address

### Requirement: Restoring memory protection
AxeGraft Patcher SHALL restore the original protection of any memory it had to make writable, and it SHALL NOT leave memory both writable and executable.

#### Scenario: Patching code
- **WHEN** a constant in code is written
- **THEN** that memory has its original protection afterwards, and the CPU sees the new instructions

### Requirement: Confirming the writes
After writing, AxeGraft Patcher SHALL read back what it wrote and treat any difference as an error.

#### Scenario: Write didn't take effect
- **WHEN** a location doesn't hold the intended bytes after writing
- **THEN** the user gets an error naming the location, and the game closes
