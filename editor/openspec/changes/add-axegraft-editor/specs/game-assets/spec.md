# Spec Delta

## Purpose

Defines how AxeGraft Editor shows real command icons and game strings, from assets shipped with it or read from the user's own game files in the browser, and how it stays fully usable without any of them.

## ADDED Requirements

### Requirement: Assets are optional
The repository MAY ship icons and strings, in a folder separate from the code. Every feature SHALL work without them, and deleting that folder SHALL need no other change. Imported assets SHALL take priority over shipped ones. The repository SHALL NOT contain game executables or MPQ archives, and tests SHALL use synthetic data. Shipped strings MAY be a whole extracted string table.

#### Scenario: No assets at all
- **WHEN** the editor is opened with no shipped and no imported assets
- **THEN** it shows names and IDs, and every editing feature works

#### Scenario: Shipped assets only
- **WHEN** the editor is opened with shipped assets and nothing imported
- **THEN** it shows the shipped icons and strings

#### Scenario: Imported and shipped assets
- **WHEN** a user imports assets while shipped ones are present
- **THEN** the imported ones are shown

### Requirement: Importing from game files
The user SHALL be able to import assets for the current game by selecting their game folder or its archive files. This SHALL NOT change those files.

#### Scenario: Selecting a folder
- **WHEN** a user selects their StarCraft folder
- **THEN** the editor finds its archives by name, and imports the icons and strings

#### Scenario: Files from the wrong game
- **WHEN** a user selects files that don't hold the current game's assets
- **THEN** the editor says which files it needed, and keeps any previously imported assets

### Requirement: Importing a string table
The user SHALL be able to import their own `stat_txt.tbl` file by itself, without an archive, to use in place of the current string table.

#### Scenario: Selecting a string table
- **WHEN** a user selects a `stat_txt.tbl` file
- **THEN** the editor shows that file's strings

### Requirement: Patched assets take priority
When several archives hold a file, the editor SHALL use the copy the game itself would use, in the archive order the catalog gives.

#### Scenario: File in a patch archive
- **WHEN** an icon file is in both a patch archive and a base archive
- **THEN** the patch archive's copy is used

### Requirement: Assets don't affect validity
Shipped and imported assets SHALL affect only what's displayed and which warnings appear. They SHALL NOT cause errors, or affect the saved mod or which IDs are accepted.

#### Scenario: Same mod with and without assets
- **WHEN** one mod is edited and saved with assets imported and again without
- **THEN** the saved files are identical

#### Scenario: Mod using an ID beyond the imported data
- **WHEN** a button uses an icon or string ID the imported data doesn't have
- **THEN** the editor shows a placeholder and a warning, and the ID remains valid

### Requirement: Assets remembered
Imported assets SHALL be kept in browser storage so the user doesn't need to select files at each start, and the user SHALL be able to delete them.

#### Scenario: Next start
- **WHEN** a user who imported assets opens the editor again
- **THEN** icons and strings appear without selecting any files

#### Scenario: Deleting assets
- **WHEN** a user deletes the imported assets
- **THEN** the editor goes back to the shipped assets if there are any, and otherwise to names and IDs

### Requirement: Import failures are contained
Any failure while reading game files SHALL be reported to the user, naming the file and what failed, and SHALL NOT disturb the current mod or stop editing. It SHALL NOT be listed among the mod's errors and warnings, or appear in the item list. Damaged or crafted files SHALL NOT crash the editor.

#### Scenario: Damaged archive
- **WHEN** a user selects a truncated or corrupted archive
- **THEN** the editor reports an error naming the file, and keeps working

#### Scenario: Damaged string table
- **WHEN** a user selects a damaged `stat_txt.tbl`
- **THEN** the failure is reported as an import failure, and the mod's errors and warnings don't change

#### Scenario: Unsupported compression
- **WHEN** a needed file uses a compression method the editor can't read
- **THEN** the error names the file and the method

### Requirement: Responsive during import
Importing SHALL show progress and SHALL leave the editor responsive, and SHALL read only the needed parts of the selected archives into memory.

#### Scenario: Large archive
- **WHEN** a user imports from an archive of hundreds of megabytes
- **THEN** the page stays responsive, and shows the import's progress
