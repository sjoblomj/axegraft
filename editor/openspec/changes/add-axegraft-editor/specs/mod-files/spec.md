# Spec Delta

## Purpose

Defines how AxeGraft Editor creates, opens, validates and saves mod files, so what it produces is valid for AxeGraft Patcher, and how drafts and undo protect the user's work.

## ADDED Requirements

### Requirement: Creating a mod
The editor SHALL let the user create a new mod for a game they choose. A new mod SHALL change nothing.

#### Scenario: New StarCraft mod
- **WHEN** a user creates a new mod for StarCraft and saves it right away
- **THEN** the file holds only `"patcher": "AxeGraft"`, `"format": 1` and `"game": "starcraft"`

### Requirement: Opening a mod
The editor SHALL open a JSON mod file chosen by the user, and SHALL select the game the file names.

#### Scenario: Opening a valid mod
- **WHEN** a user opens a valid Warcraft II mod while editing StarCraft, with no unsaved changes
- **THEN** the editor switches to Warcraft II and shows the mod's changes

#### Scenario: Unsaved changes when opening
- **WHEN** a user opens a file while the current mod has unsaved changes
- **THEN** the editor asks before discarding them

### Requirement: Rejecting invalid files
The editor SHALL NOT load a file that fails validation, and SHALL list every problem it finds with the location of each. Malformed input SHALL NOT crash the editor or disturb the current mod.

#### Scenario: File with several mistakes
- **WHEN** a file has an unknown field and an out-of-range unit ID
- **THEN** both are listed with their locations, and the current mod is unchanged

#### Scenario: Not a mod at all
- **WHEN** a user opens arbitrary bytes, invalid JSON, deeply nested JSON or a very large file
- **THEN** the editor reports an error naming the file, and stays usable

### Requirement: Same rules as the patcher
The editor SHALL apply the rules of the patcher's `mod-format` spec for format 1, using the limits in the catalog. A mod the editor accepts SHALL be accepted by the format rules, and a mod they reject SHALL be rejected by the editor.

#### Scenario: Shared example mods
- **WHEN** the repository's example valid and invalid mods are validated
- **THEN** each has the expected result, including every scenario in `mod-format`

### Requirement: Validating while editing
The editor SHALL show problems in the current mod as they arise, and SHALL allow an invalid mod to stay open and be edited.

#### Scenario: Problem while editing
- **WHEN** a user's edit leaves a button without a required variable
- **THEN** the problem is shown beside the field and in a problem list, and selecting it in the list goes to the field

### Requirement: Saving only valid mods
The editor SHALL NOT write a mod file that fails validation.

#### Scenario: Saving with problems
- **WHEN** a user saves a mod that has problems
- **THEN** no file is written, and the problem list is shown

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
- **WHEN** a user edits an item so it again matches its original value on every build
- **THEN** that entry is removed from the mod

#### Scenario: Value matching only some builds
- **WHEN** a user sets a constant to the original value of only some builds
- **THEN** the entry stays in the mod

### Requirement: Explicit entries from a file are kept
An entry in an opened file that equals the original SHALL stay in the mod until the user changes or reverts it, because defining a value matters when mods are merged.

#### Scenario: File sets a constant to its original value
- **WHEN** a file sets a constant to its original value, and the user opens and saves it without touching that constant
- **THEN** the saved file still sets it

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
