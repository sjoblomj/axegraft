# Spec Delta

## Purpose

Defines how AxeGraft Editor creates, opens, validates and saves mod files, so what it produces is valid for AxeGraft Patcher, and how drafts and undo protect the user's work.

## ADDED Requirements

### Requirement: Creating a mod
The editor SHALL let the user create a new mod for a game they choose. A new mod SHALL change nothing.

#### Scenario: New StarCraft mod
- **WHEN** a user creates a new mod for StarCraft and saves it right away
- **THEN** the file holds only `"patcher": "AxeGraft"`, `"format": 1`, `"game": "starcraft"`, `"mod_name": ""`, `"mod_version": ""` and `"mod_authors": []`

### Requirement: Mod information
The editor SHALL always write `mod_name`, `mod_version` and `mod_authors` into a saved mod, empty when the user hasn't given them. The start screen SHALL have fields for them above the buttons that create a mod, and a new mod SHALL take what is in those fields. The File menu SHALL open a dialog for changing them in the current mod, as one undoable change. Authors SHALL be typed separated by commas. The information SHALL have no effect on validation, apart from its type, or on what the mod changes.

#### Scenario: Information on the start screen
- **WHEN** a user types a name, a version and the authors `Alice, Bob` on the start screen and creates a StarCraft mod
- **THEN** the new mod has that name and version, and `"mod_authors": ["Alice", "Bob"]`

#### Scenario: Changing the information
- **WHEN** a user changes the mod's name from the File menu and then undoes
- **THEN** the mod has its earlier name

#### Scenario: File without information
- **WHEN** a user opens a mod that has no `mod_name`, `mod_version` or `mod_authors`
- **THEN** the mod opens unchanged, and saving it writes them empty

### Requirement: Opening a mod
The editor SHALL open a JSON mod file chosen by the user, and SHALL select the game the file names.

#### Scenario: Opening a valid mod
- **WHEN** a user opens a valid Warcraft II mod while editing StarCraft, with no unsaved changes
- **THEN** the editor switches to Warcraft II and shows the mod's changes

#### Scenario: Unsaved changes when opening
- **WHEN** a user opens a file while the current mod has unsaved changes
- **THEN** the editor asks before discarding them

### Requirement: Refusing malformed files
The editor SHALL NOT load a malformed file, and SHALL list every problem it finds with the location of each. A file is malformed if it isn't valid JSON, if its `patcher`, `format` or `game` is missing or wrong, if any object has a property name the format doesn't define, if `mod_authors` isn't an array, or if a part, a `buttons` array or a `list` doesn't have the format's shape. Malformed input SHALL NOT crash the editor or disturb the current mod.

#### Scenario: File with an unknown property
- **WHEN** a file has an unknown property and an out-of-range unit ID
- **THEN** the file isn't loaded, both are listed with their locations, and the current mod is unchanged

#### Scenario: Part with the wrong shape
- **WHEN** a file's `units` isn't an array of objects
- **THEN** the file isn't loaded, and the problem is listed with its location

#### Scenario: Not a mod at all
- **WHEN** a user opens arbitrary bytes, invalid JSON, deeply nested JSON or a very large file
- **THEN** the editor reports an error naming the file, and stays usable

### Requirement: Opening a file with errors
The editor SHALL load any file that isn't malformed, even if it breaks other format rules. Each bad value SHALL be kept as written and shown as an error. An entry the item list can't show, such as one with an out-of-range ID or a second entry for the same item, SHALL be listed with the errors, and the user SHALL be able to remove it there.

#### Scenario: Value out of bounds
- **WHEN** a user opens a file where a button's `position` is out of range
- **THEN** the file loads, and the field shows that value with an error

#### Scenario: Entry with no matching item
- **WHEN** a user opens a file with an entry for a unit ID outside the game's range
- **THEN** the file loads, and the error list names the entry and offers to remove it

### Requirement: Same rules as the patcher
The editor SHALL apply the rules of the patcher's `mod-format` spec for format 1, using the limits in the catalog. A mod with no errors in the editor SHALL be accepted by the format rules, and a mod they reject SHALL be refused by the editor or have errors.

#### Scenario: Shared example mods
- **WHEN** the repository's example valid and invalid mods are validated
- **THEN** each has the expected result, including every scenario in `mod-format`

### Requirement: Errors and warnings
The editor SHALL show problems in the current mod as they arise, each as an error or a warning, and SHALL allow a mod with problems to stay open and be edited. Anything the format rules reject SHALL be an error. A value the format rules accept but that looks wrong SHALL be a warning.

#### Scenario: Problem while editing
- **WHEN** a user's edit leaves a button without a required variable
- **THEN** an error is shown beside the field and in a problem list, and selecting it in the list goes to the field

#### Scenario: Bad requirement list
- **WHEN** a user's edit ends a requirement list with `or`
- **THEN** that is an error

#### Scenario: String ID beyond the loaded table
- **WHEN** a user enters a string ID that fits the game's field but is beyond the loaded `stat_txt.tbl`
- **THEN** that is a warning

#### Scenario: No string table loaded
- **WHEN** a user enters a string ID that fits the game's field, and no string table is loaded
- **THEN** there's no warning

### Requirement: Saving only mods without errors
The editor SHALL NOT write a mod file that has errors. Warnings SHALL NOT prevent saving.

#### Scenario: Saving with errors
- **WHEN** a user saves a mod that has errors
- **THEN** no file is written, and the problem list is shown

#### Scenario: Saving with warnings
- **WHEN** a user saves a mod that has warnings and no errors
- **THEN** the file is written

### Requirement: Saving
The editor SHALL always be able to save by downloading a file. Where the browser allows, it SHALL also be able to save directly to the file that was opened or last saved.

#### Scenario: Save As
- **WHEN** a user chooses Save As with a valid mod
- **THEN** they get a JSON file holding the mod

#### Scenario: Output readable by the patcher
- **WHEN** a saved file is opened by the editor again
- **THEN** the mod is the same as the one saved

### Requirement: Only differences are saved
A saved mod SHALL contain only what the user changed: individual unit fields, whole button sets, whole requirement records and individual constants.

#### Scenario: Changed one button
- **WHEN** a user changes one button in a set
- **THEN** the file defines that whole set, and no other set

#### Scenario: Changed one unit field
- **WHEN** a user changes a unit's `status_update`
- **THEN** the file's entry for that unit holds that field and not the others

#### Scenario: Edited back to the original
- **WHEN** a user edits an item so it again matches its original value on every version
- **THEN** that entry is removed from the mod

#### Scenario: Value matching only some versions
- **WHEN** a user sets a constant to the original value of only some versions
- **THEN** the entry stays in the mod

#### Scenario: File sets a value to its original
- **WHEN** a file sets a constant to its original value on every game version, and the user opens and saves it
- **THEN** the saved file doesn't set that constant

### Requirement: Reverting
The editor SHALL let the user revert a field or a whole item to its original.

#### Scenario: Revert a button set
- **WHEN** a user reverts a button set
- **THEN** the set shows its original buttons, and the mod has no entry for it

### Requirement: Stable file output
Saving the same mod SHALL always produce identical bytes. Files SHALL be indented, with parts in a fixed order, and entries sorted by type and ID.

#### Scenario: Saving twice
- **WHEN** a mod is saved twice with no change in between
- **THEN** the two files are byte-identical

#### Scenario: Order of editing
- **WHEN** two users make the same changes in different orders
- **THEN** their files are byte-identical

### Requirement: Labels
The editor SHALL keep every `label` in an opened file. It SHALL give each new entry a label with the item's catalog name, so files are readable. Labels SHALL NOT affect validation.

#### Scenario: Existing label
- **WHEN** a file has an entry with a custom label, and the user edits that entry
- **THEN** the saved entry keeps the label

#### Scenario: New entry
- **WHEN** a user changes unit 0, named Terran Marine in the catalog
- **THEN** the saved entry has the label `Terran Marine`

### Requirement: Undo and redo
The editor SHALL undo and redo every change to the mod, across all tabs, from its menu and with the usual keyboard shortcuts.

#### Scenario: Undo across tabs
- **WHEN** a user changes a unit, then a constant, and undoes twice
- **THEN** both changes are gone, and the mod matches its earlier state

### Requirement: Drafts
The editor SHALL keep a draft of unsaved work in browser storage, and SHALL offer to restore it at the next start. It SHALL warn before closing with unsaved changes where the browser allows.

#### Scenario: Browser closed unexpectedly
- **WHEN** the browser closes with unsaved changes, and the user opens the editor again
- **THEN** the editor offers to restore that work

#### Scenario: Declining a draft
- **WHEN** the user declines to restore a draft
- **THEN** the draft is deleted
