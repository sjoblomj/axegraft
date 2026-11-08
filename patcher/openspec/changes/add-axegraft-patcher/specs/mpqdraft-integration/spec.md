# Spec Delta

## Purpose

Defines how AxeGraft Patcher appears in MPQDraft, what it does at each point in its lifecycle, and how failures reach the user.

## ADDED Requirements

### Requirement: Loaded as an MPQDraft plugin
AxeGraft Patcher SHALL be a 32-bit MPQDraft plugin that uses MPQDraft's existing plugin interface: it exports `GetMPQDraftPlugin` and implements `IMPQDraftPlugin`. It SHALL have a stable plugin ID and a name that includes its version.

#### Scenario: Plugin appears in MPQDraft
- **WHEN** MPQDraft loads the AxeGraft Patcher plugin file
- **THEN** AxeGraft Patcher is available as a plugin, shown with its name and version

#### Scenario: Current MPQDraft
- **WHEN** a release of MPQDraft without the plugin interface changes planned in its TODO loads the plugin
- **THEN** AxeGraft Patcher is available and works

### Requirement: Offered only for supported games
AxeGraft Patcher SHALL report that it can patch an executable only if that executable is a supported version.

#### Scenario: Supported executable
- **WHEN** MPQDraft asks about a supported StarCraft or Warcraft II BNE executable
- **THEN** AxeGraft Patcher says it can patch it

#### Scenario: Unsupported executable
- **WHEN** MPQDraft asks about an executable that isn't a supported version
- **THEN** AxeGraft Patcher says it can't patch it

#### Scenario: Unreadable executable
- **WHEN** the executable can't be opened or read
- **THEN** AxeGraft Patcher says it can't patch it, without crashing

### Requirement: Choosing the mod file
When MPQDraft calls `Configure`, AxeGraft Patcher SHALL show a file-open dialog for choosing the mod file, and SHALL show no other dialogs during setup. The choice SHALL be kept only in memory, for as long as MPQDraft has the plugin loaded, and SHALL NOT be saved to the registry or to any file. `GetModules` SHALL return the plugin itself and the chosen mod file, so that MPQDraft passes the file to the game and packs it into SEMPQs.

#### Scenario: File chosen
- **WHEN** the user clicks Configure and chooses a `.json` file
- **THEN** that file is the mod, and `GetModules` returns it beside the plugin

#### Scenario: Dialog cancelled
- **WHEN** the user clicks Configure and cancels the dialog
- **THEN** the previous choice, if any, is kept, and `Configure` succeeds

#### Scenario: Choosing again
- **WHEN** the user clicks Configure again and chooses another file
- **THEN** the new file replaces the previous choice

### Requirement: Ready only with a mod file
AxeGraft Patcher SHALL report itself as ready to patch only when a mod file is chosen.

#### Scenario: No file chosen
- **WHEN** MPQDraft asks whether AxeGraft Patcher is ready and no mod file is chosen
- **THEN** AxeGraft Patcher reports that it isn't ready

#### Scenario: File chosen
- **WHEN** MPQDraft asks whether AxeGraft Patcher is ready and a mod file is chosen
- **THEN** AxeGraft Patcher reports that it's ready

### Requirement: Checking the version before game code runs
When first loaded in the game, before game code runs, AxeGraft Patcher SHALL identify the running version.

#### Scenario: Unsupported version at launch
- **WHEN** a SEMPQ containing AxeGraft Patcher launches an unsupported version
- **THEN** the user gets an error naming the executable, and the game closes before any game code runs

### Requirement: Applying the mod before game code runs
AxeGraft Patcher SHALL read, validate and apply the mod in `InitializePlugin`, which MPQDraft calls when it first loads the plugin in the game, before game code runs. It SHALL do so only once per process. It SHALL locate the mod file through the server's `GetPluginModule`.

#### Scenario: Normal launch
- **WHEN** MPQDraft loads AxeGraft Patcher in the game
- **THEN** AxeGraft Patcher reads the mod file, and applies the mod before any game code runs

#### Scenario: Run without patch MPQs
- **WHEN** the game is started with AxeGraft Patcher and no patch MPQs
- **THEN** the mod is still applied

### Requirement: Failing closes the game
Any failure to identify the version, or to read, validate or apply a mod, SHALL show the user an error and close the game. The game SHALL NOT continue unmodified.

#### Scenario: Invalid mod
- **WHEN** a mod fails validation
- **THEN** the user sees an error, and the game closes

#### Scenario: AxeGraft Patcher's error comes first
- **WHEN** AxeGraft Patcher fails in `InitializePlugin`
- **THEN** it shows its own error, naming the log, and has flushed and closed the log, before returning `FALSE`. MPQDraft may then show its generic message that the plugins couldn't be loaded, and closes the game

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
