# Tasks

Work test-first: for each task, write the failing tests, then the code. Everything here works with sample catalogs. Complete catalogs come from the separate conversion change.

## 1. Skeleton and test harness

- [ ] 1.1 Create `index.html`, `styles.css`, the `AxeGraft` namespace and the `src/` and `catalog/` directories, and verify that opening `index.html` from disk in Firefox and Chromium shows an empty editor with no console errors
- [ ] 1.2 Build the test harness and `test/index.html`, and verify the page lists a deliberate pass and a deliberate failure correctly
- [ ] 1.3 Add `test/run-node.js`, using only Node's standard library to load the same classic scripts, and verify it reports the same core results as the page and reports game-file tests as not checked when `AXEGRAFT_EDITOR_GAME_DIR` isn't set
- [ ] 1.4 Add tests that every source file is listed in `index.html`, that the tree has no package manifest or lockfile, and that source contains no remote URLs, and verify each fails when deliberately violated
- [ ] 1.5 Add a `README.md` covering how to run the editor and tests, and verify its instructions work as written from a fresh copy

## 2. Game catalog

- [ ] 2.1 Implement `registerCatalog` and the catalog check, covering contents, internal references, per-version coverage, help texts and format versions, and verify a deliberately bad fixture fails each rule with a message naming the catalog and the problem, and that a missing `application` is accepted
- [ ] 2.2 Handle bad or missing catalogs at startup, and verify the "Bad catalog" scenario, with the valid game still editable
- [ ] 2.3 Write `catalog/sample-starcraft.js` by hand from `starcraft.md`, including a few units, a set several units share, a unit with no buttons, a table entry that isn't a unit, a set absent on older versions, every requirement type and one constant of each kind, and verify it passes the catalog check and its values match the reference document
- [ ] 2.4 Write `catalog/sample-warcraft2.js` by hand from `w2_exe.md`, with no requirements and with the `string` and `highlighted` button fields, and verify it passes the catalog check and its values match the reference document
- [ ] 2.5 Document the format in `docs/catalog-format.md`, and verify in a test that its example passes the catalog check

## 3. Mod validation

- [ ] 3.1 Implement parsing with safe handling of arbitrary bytes, invalid JSON, deep nesting and very large input, and validate the header, parts and strict fields with labels ignored, and verify the "Mod header", "Mod parts", "Strict fields" and "Untrusted input safety" scenarios of `mod-format` pass as fixtures
- [ ] 3.2 Validate unit entries and engine behaviour names, and verify the "Identifying game content and engine behaviour" and "Unit entries" scenarios pass as fixtures for both games
- [ ] 3.3 Validate button sets, button fields and typed function variables, and verify the "Button set entries", "Button set numbering", "Referring to button sets", "Opening a table entry", "Button fields" and "Typed function variables" scenarios pass as fixtures
- [ ] 3.4 Validate requirement entries and lists, and verify the "Requirement entries" and "Requirement lists" scenarios pass as fixtures, including the Zerg Carapace example
- [ ] 3.5 Validate constants, duplicates and collection of all problems, and verify the "Constant entries", "No duplicates within a mod" and "All problems reported together" scenarios pass as fixtures
- [ ] 3.6 Add randomized tests with a fixed seed that feed malformed values to the validator, and verify it always returns a mod or problems and never throws
- [ ] 3.7 Sort results into refused files, errors and warnings, and verify the "Refusing malformed files", "Opening a file with errors" and "Errors and warnings" scenarios, and that warnings never change whether a shared fixture is valid

## 4. Mod document

- [ ] 4.1 Implement the immutable document with field edits, `effective` lookups and entry removal when an item matches its original on every version, including entries from an opened file, and verify the "Only differences are saved" and "Reverting" scenarios
- [ ] 4.2 Implement canonical serialization, and verify the "Stable file output" scenarios, and that opening a saved file gives the same mod
- [ ] 4.3 Implement label handling, and verify the "Labels" scenarios
- [ ] 4.4 Implement bounded undo and redo over documents, and verify the "Undo across tabs" scenario at document level
- [ ] 4.5 Implement the version compatibility calculation, and verify the scenarios in `version-compatibility` for applying, rejected and skipped results, including sets named by `button_set` and table entries named by `action_variable`

## 5. Application shell and navigation

- [ ] 5.1 Implement the storage wrapper over IndexedDB with a memory fallback, and verify with a simulated failure that the editor continues and shows the "Storage blocked" notice
- [ ] 5.2 Build the main layout, the menu, per-game tabs, the sample catalog notice and the status bar, and verify with DOM tests the "StarCraft mod", "Warcraft II mod", "Editing with a sample" and "Unsaved mod" scenarios
- [ ] 5.3 Build the item tree with ID-first labels, numeric order and a search box, keeping the tree logic in `src/core`, and verify the "Item labels and order" and "Filtering the tree" scenarios with DOM tests
- [ ] 5.4 Give each tab its own selection, and verify the "Switching tabs", "Requirements list" and "Constants list" scenarios
- [ ] 5.5 Add markers for changes, errors and warnings, and filters for each, and verify the "Marking changes", "Marking problems" and "Filtering by problem" scenarios
- [ ] 5.6 Add keyboard navigation for the tree and tabs, and verify the "Tree navigation" scenario with simulated key events
- [ ] 5.7 Implement New, Open, Save and Save As, with a download fallback, and verify with DOM tests the "Creating a mod", "Opening a mod", "Refusing malformed files", "Opening a file with errors" and "Saving only mods without errors" scenarios, and check direct saving by hand in Chromium
- [ ] 5.8 Add the problem list, and undo and redo in the menu and on the keyboard, and verify the "Problem while editing" and "Undo across tabs" scenarios through the UI
- [ ] 5.9 Add drafts and the warning on closing, and verify the "Drafts" scenarios with DOM tests, and check by hand that a closed browser offers the work back
- [ ] 5.10 Add the `?` button and the help table for game-independent controls, and verify the "Help for every control" scenarios, including a DOM test that every control in every panel has a help text

## 6. Units and button sets

- [ ] 6.1 Build the Units tab with its fields for every table entry, combined name and ID controls and status function lists, and verify the "Unit fields", "Choosing by name or ID" and "Status functions by name" scenarios with DOM tests
- [ ] 6.2 Add the link from a unit to its assigned set, and giving a unit its own set, and verify the "Going to the assigned set" and "Giving a unit its own set" scenarios
- [ ] 6.3 Build the Button Sets tab's list with add, remove, reorder and clear, and verify the "Button list" scenarios
- [ ] 6.4 Build the button form from the catalog's button fields, and verify the "Button fields" and "Fields with a name and an ID" scenarios, including the Warcraft II fields
- [ ] 6.5 Make variable fields follow their function, and verify the "Variables follow their function" and "Variable omitted when unset" scenarios
- [ ] 6.6 Build the panel preview on the Button Sets tab and connect it to the button list, and verify the "Panel preview" scenarios, including creating a button and several buttons at one position
- [ ] 6.7 Add the used-by list with links to its units, new sets, and copying between sets, and verify the "Showing who uses a set", "New sets" and "Copying buttons" scenarios
- [ ] 6.8 Add links from reference fields to their items, and verify the "Jump from a variable" scenario

## 7. Requirements, constants and the compatibility report

- [ ] 7.1 Convert between flat lists and rows, and verify that every record in the sample catalog converts to rows and back unchanged, including `or` and upgrade sublists
- [ ] 7.2 Build the Requirements tab's row editor, with parameters in the same row as their opcode, bare units as a separate kind of row from `must_have`, and opcodes limited by record type, and verify the "Record editor", "Parameters follow their opcode", "Bare units" and "Opcodes limited by record type" scenarios
- [ ] 7.3 Show structure and row problems, and verify the "Showing structure" scenarios
- [ ] 7.4 Handle missing and emptied records, whole-record saving and viewing the original, and verify the "Records that don't exist originally", "Record replaced whole" and "Viewing the original record" scenarios
- [ ] 7.5 Build the Constants tab for numeric, referring and option constants, and verify the "Numeric constants", "Stored scale", "Constants that refer to game content", "Named options" and "Grouped display" scenarios
- [ ] 7.6 Show each constant's availability per version, and verify the "Showing availability" scenario
- [ ] 7.7 Build the compatibility report and field warnings, and verify the "Warnings don't block saving", "Warnings at the point of use" and "Limits of the report" scenarios with DOM tests

## 8. Game assets

- [ ] 8.1 Implement MPQ reading through `File.slice`, with header, encrypted tables, per-sector files and bounds checks, and verify it against synthetic archives, including truncated and corrupted ones
- [ ] 8.2 Implement decompression with `DecompressionStream` and a PKWARE implode decoder, and verify with synthetic data that an unsupported method gives a named error
- [ ] 8.3 Implement GRP and TBL decoding, and verify with synthetic files, including out-of-range frames and offsets
- [ ] 8.4 Implement the import dialog for folders, archives and a single `stat_txt.tbl`, with progress, archive priority and a persistent cache, and verify the "Importing from game files", "Importing a string table", "Patched assets take priority" and "Assets remembered" scenarios with synthetic archives
- [ ] 8.5 Show icons and strings in the preview, icon picker and string fields, with placeholders, and warn about IDs beyond the loaded data, and verify the "Assets don't affect validity", "Icon choice" and "String text" scenarios
- [ ] 8.6 Run the importer against the real game files for StarCraft and Warcraft II through `AXEGRAFT_EDITOR_GAME_DIR`, work out the correct palette and archive list for each, record them in the sample catalogs' `assets`, and verify by eye that known icons have the right colours, and that any further compression method these files need is added
- [ ] 8.7 Verify in a browser that importing from a real StarCraft folder keeps the page responsive and leaves the game files unchanged, using checksums taken before and after
- [ ] 8.8 Add loading of shipped assets from `assets/<game>/`, and verify the "Assets are optional" scenarios with a synthetic asset folder, including with that folder deleted

## 9. Integration

- [ ] 9.1 Add a test that takes a mod through the UI from new to saved for each game, touching every available tab, and verify that the file reopens identically and passes validation
- [ ] 9.2 Compare the app's look and workflow side by side with FireGraft, and record any deliberate differences in `docs/architecture.md` with the reasons for the main decisions
- [ ] 9.3 Run the test page in current Firefox, Chromium and, where available, Safari, opened from disk and served statically, with the network disabled, and verify the same results on each and no network requests, and record any browser not checked in `README.md`

## Workflow follow-up

- Propose the separate change converting `starcraft.md` and `w2_exe.md` into complete catalogs and library data, using one set of names for both.
- Have the patcher run the shared mod fixtures once its validation exists.
- Consider a native wrapper once the browser version is in use.
- Archive the change after review.
