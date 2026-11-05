# Spec Delta

## Purpose

Defines how AxeGraft Editor shows real command icons and game strings by reading the user's own game files in the browser, without any game assets being stored in the repository.

## ADDED Requirements

### Requirement: No game assets in the repository
The repository SHALL NOT contain game files, or icons or strings extracted from them. Tests SHALL use synthetic archives.

#### Scenario: Fresh copy of the source tree
- **WHEN** the editor is opened with no imported assets
- **THEN** it shows names and IDs, and every editing feature works

### Requirement: Importing from game files
The user SHALL be able to import assets for the current game by selecting their game folder or its archive files. This SHALL NOT change those files.

#### Scenario: Selecting a folder
- **WHEN** a user selects their StarCraft folder
- **THEN** the editor finds its archives by name, and imports the icons and strings

#### Scenario: Files from the wrong game
- **WHEN** a user selects files that don't hold the current game's assets
- **THEN** the editor says which files it needed, and keeps any previously imported assets

### Requirement: Patched assets take priority
When several archives hold a file, the editor SHALL use the copy the game itself would use, in the archive order the catalog gives.

#### Scenario: File in a patch archive
- **WHEN** an icon file is in both a patch archive and a base archive
- **THEN** the patch archive's copy is used

### Requirement: Assets for preview only
Imported assets SHALL affect only what's displayed. They SHALL NOT affect validation, the saved mod or which IDs are accepted.

#### Scenario: Same mod with and without assets
- **WHEN** one mod is edited and saved with assets imported and again without
- **THEN** the saved files are identical

#### Scenario: Mod using an ID beyond the imported data
- **WHEN** a button uses an icon or string ID the imported data doesn't have
- **THEN** the editor shows a placeholder, and the ID remains valid

### Requirement: Assets remembered
Imported assets SHALL be kept in browser storage so the user doesn't need to select files at each start, and the user SHALL be able to delete them.

#### Scenario: Next start
- **WHEN** a user who imported assets opens the editor again
- **THEN** icons and strings appear without selecting any files

#### Scenario: Deleting assets
- **WHEN** a user deletes the imported assets
- **THEN** the editor goes back to showing names and IDs

### Requirement: Import failures are contained
Any failure while reading game files SHALL be reported to the user, naming the file and what failed, and SHALL NOT disturb the current mod or stop editing. Damaged or crafted files SHALL NOT crash the editor.

#### Scenario: Damaged archive
- **WHEN** a user selects a truncated or corrupted archive
- **THEN** the editor reports an error naming the file, and keeps working

#### Scenario: Unsupported compression
- **WHEN** a needed file uses a compression method the editor can't read
- **THEN** the error names the file and the method

### Requirement: Responsive during import
Importing SHALL show progress and SHALL leave the editor responsive, and SHALL read only the needed parts of the selected archives into memory.

#### Scenario: Large archive
- **WHEN** a user imports from an archive of hundreds of megabytes
- **THEN** the page stays responsive, and shows the import's progress
