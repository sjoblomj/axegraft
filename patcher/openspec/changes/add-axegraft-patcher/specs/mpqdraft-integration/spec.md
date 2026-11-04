# Spec Delta

## Purpose

Defines how AxeGraft Patcher appears in MPQDraft, what it does at each point in its lifecycle, and how failures reach the user.

## ADDED Requirements

### Requirement: Loaded as an MPQDraft plugin
AxeGraft Patcher SHALL be a 32-bit MPQDraft plugin that uses MPQDraft's new-style plugin interface, with a stable plugin ID and a name that includes its version.

#### Scenario: Plugin appears in MPQDraft
- **WHEN** MPQDraft loads the AxeGraft Patcher plugin file
- **THEN** AxeGraft Patcher is available as a plugin, shown with its name and version

#### Scenario: MPQDraft without the new interface
- **WHEN** a version of MPQDraft without the new-style interface loads the plugin
- **THEN** that MPQDraft refuses the plugin rather than running it without its callbacks

### Requirement: Offered only for supported games
AxeGraft Patcher SHALL report that it can patch an executable only if that executable is a supported build.

#### Scenario: Supported executable
- **WHEN** MPQDraft asks about a supported StarCraft or Warcraft II BNE executable
- **THEN** AxeGraft Patcher says it can patch it

#### Scenario: Unsupported executable
- **WHEN** MPQDraft asks about an executable that isn't a supported build
- **THEN** AxeGraft Patcher says it can't patch it

#### Scenario: Unreadable executable
- **WHEN** the executable can't be opened or read
- **THEN** AxeGraft Patcher says it can't patch it, without crashing

### Requirement: Settings through MPQDraft
AxeGraft Patcher SHALL declare its settings as data, and SHALL show no dialogs of its own during setup. The only setting SHALL be the optional mod file.

#### Scenario: Setting offered
- **WHEN** MPQDraft asks for the plugin's settings
- **THEN** AxeGraft Patcher declares one optional file setting for a mod

### Requirement: Ready without a mod file
AxeGraft Patcher SHALL report itself as ready to patch even when no mod file is set, because a mod may be in an MPQ it can't see during setup.

#### Scenario: No file chosen
- **WHEN** MPQDraft asks whether AxeGraft Patcher is ready and no mod file is set
- **THEN** AxeGraft Patcher reports that it's ready

### Requirement: Checking the build before game code runs
When first loaded in the game, before game code runs, AxeGraft Patcher SHALL identify the running build.

#### Scenario: Unsupported build at launch
- **WHEN** a SEMPQ containing AxeGraft Patcher launches an unsupported build
- **THEN** the user gets an error naming the executable, and the game closes before any game code runs

### Requirement: Applying the mod when patch MPQs are ready
AxeGraft Patcher SHALL read, validate and apply mods when MPQDraft reports that the patch MPQs are loaded, and only once per process.

#### Scenario: Normal launch
- **WHEN** MPQDraft reports that the patch MPQs are loaded
- **THEN** AxeGraft Patcher reads the inputs, and applies the merged mod before returning control

#### Scenario: Run without patch MPQs
- **WHEN** the only input is the directly supplied file
- **THEN** the mod is still applied

### Requirement: Failing closes the game
Any failure to identify the build, or to read, validate or apply a mod, SHALL show the user an error and close the game. The game SHALL NOT continue unmodified.

#### Scenario: Invalid mod
- **WHEN** a mod fails validation
- **THEN** the user sees an error, and the game closes

#### Scenario: MPQDraft doesn't add its own error
- **WHEN** AxeGraft Patcher has shown an error and asked for the game to close
- **THEN** the user doesn't also see a generic message from MPQDraft inside the game

### Requirement: Clear error messages
Error messages SHALL say what went wrong and where to find the log. If there are too many problems to show, the message SHALL show the first ones and say how many more are in the log.

#### Scenario: Many problems
- **WHEN** a mod has more problems than fit in the message
- **THEN** the message shows the first problems, the number of others, and the log's path

### Requirement: Internal faults stay contained
An internal fault in AxeGraft Patcher SHALL NOT unwind into MPQDraft or the game. It SHALL be treated like any other failure.

#### Scenario: Unexpected internal fault
- **WHEN** an unexpected fault occurs inside a call from MPQDraft
- **THEN** the user sees an error, and the game closes

### Requirement: No undo on shutdown
AxeGraft Patcher SHALL NOT try to undo its changes on shutdown, because they end with the process. Shutdown calls SHALL succeed and do nothing harmful.

#### Scenario: Game exits normally
- **WHEN** MPQDraft calls the plugin's termination function, or doesn't
- **THEN** the game exits normally, with no errors from AxeGraft Patcher
