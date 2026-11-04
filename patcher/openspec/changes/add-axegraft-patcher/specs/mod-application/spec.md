# Spec Delta

## Purpose

Defines how a merged mod becomes changes to the running build, including what gets skipped or rejected, what is checked first, and how memory is changed.

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

### Requirement: Skipping constants unavailable on a build
A constant that's `unknown` or `not_applicable` on the running build SHALL be skipped and logged with its reason. The rest of the mod SHALL still be applied.

#### Scenario: Unknown on this build
- **WHEN** a mod sets a constant that's `unknown` on the running build
- **THEN** that constant is skipped, the log gives the reason, and the other changes are applied

#### Scenario: Code doesn't exist on this build
- **WHEN** a mod sets a constant that's `not_applicable` on the running build
- **THEN** that constant is skipped, and the log says the code doesn't exist on this build

### Requirement: Same validation on every build
A mod's values SHALL be validated the same way whether or not they will be skipped on the running build.

#### Scenario: Invalid value that would be skipped
- **WHEN** a constant is `unknown` on the running build and the mod's value is out of range
- **THEN** the mod is rejected

### Requirement: Skipping is limited to constants
Skipping SHALL apply only to constants. A unit, button set or requirement change that can't be made on the running build SHALL reject the mod.

#### Scenario: Button set absent on this build
- **WHEN** a mod defines a button set that doesn't exist on the running build
- **THEN** the mod is rejected, with an error naming the set and the build

#### Scenario: Function absent on this build
- **WHEN** a button uses a condition or action that doesn't exist on the running build
- **THEN** the mod is rejected, with an error naming the function and the build

#### Scenario: Action variable refers to an absent set
- **WHEN** a button's `action_variable` refers to a button set that doesn't exist on the running build
- **THEN** the mod is rejected

### Requirement: Checking expected bytes
Before changing anything, AxeGraft Patcher SHALL compare the current bytes at every location it will write with the bytes the library expects. Any difference SHALL reject the mod and SHALL NOT be treated as a skip.

#### Scenario: Modified executable
- **WHEN** the bytes at a location differ from those the library expects for this build
- **THEN** no memory is changed, and the error names the property, the location, and the expected and actual bytes

### Requirement: Translating IDs to the running build
AxeGraft Patcher SHALL translate button set IDs to the running build's own numbering, including those in `action_variable`.

#### Scenario: Set numbered differently on this build
- **WHEN** a mod defines a set that the running build numbers differently
- **THEN** the change is applied to the running build's ID for that set

#### Scenario: Action that opens a button set
- **WHEN** a button's action opens a set that the running build numbers differently
- **THEN** the written button uses the running build's ID for that set

### Requirement: Button set changes
Defining a button set SHALL change only that set. Buttons SHALL be built in the running build's layout, using that build's function addresses and the plugin's own memory, and other sets that shared the old array SHALL be unaffected.

#### Scenario: Original array shared by several sets
- **WHEN** a mod replaces one set whose original array is shared with other sets
- **THEN** only the replaced set changes

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
Setting a unit's `button_set` SHALL give that unit the buttons of the named set, including any replacement the mod defines. A set's contents SHALL NOT depend on `button_set` assignments in the same mod.

#### Scenario: Unit uses a set the mod replaced
- **WHEN** a mod replaces set 7 and also assigns set 7 to unit 0
- **THEN** unit 0 has the replacement buttons

#### Scenario: Assignments that chain
- **WHEN** a mod assigns set 5 to unit 0 and set 7 to unit 5
- **THEN** unit 0 has set 5's buttons, and unit 5 has set 7's buttons

### Requirement: Status function changes
Setting a unit's `status_changed` or `status_update` SHALL change only that function of that unit, to the named function's address on the running build.

#### Scenario: Only one function set
- **WHEN** a mod sets a unit's `status_update` and not its `status_changed`
- **THEN** only the unit's update function changes

#### Scenario: Different kinds of function
- **WHEN** a mod sets a unit's `status_changed` and `status_update` to functions of different kinds
- **THEN** each is applied as given

### Requirement: Status unit type changes
Setting a unit's `status_unit_type` SHALL change only that value in that unit's status entry, on StarCraft builds.

#### Scenario: Only the unit type set
- **WHEN** a mod sets a unit's `status_unit_type` and neither of its status functions
- **THEN** only the stored unit type changes

### Requirement: Requirement record changes
A requirement entry SHALL replace only that item's record in the running build's own stream. Records the mod doesn't define SHALL stay as they are on that build, and the game SHALL use the new stream in all places that refer to it.

#### Scenario: Record differs between builds
- **WHEN** a record the mod doesn't define exists on some builds but not others, and the mod changes a different record
- **THEN** the undefined record stays as each build has it

#### Scenario: Stream grows
- **WHEN** a mod's records make a stream larger than its original space
- **THEN** the game uses the complete new stream

#### Scenario: Removing a record
- **WHEN** a requirement entry has an empty `list`
- **THEN** that item's record isn't in the new stream

### Requirement: Constant changes
A constant SHALL be written to every location listed for the running build, using each location's own encoding.

#### Scenario: Several locations
- **WHEN** a constant has several locations on the running build
- **THEN** all of them are written

#### Scenario: Named option
- **WHEN** a mod selects a named option for a code-site constant
- **THEN** the bytes the running build lists for that option are written

### Requirement: Load address independence
AxeGraft Patcher SHALL work wherever the executable is loaded in memory, including pointers it compares and writes.

#### Scenario: Executable not at its preferred base
- **WHEN** a build loads at a different address from its preferred one
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
