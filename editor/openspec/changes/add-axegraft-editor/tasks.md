# Tasks

Work test-first: for each task, write the failing tests, then the code. Everything here was built with sample catalogs. The complete catalogs, generated from the knowledge base, have since replaced them, and the fixtures in `test/fixtures/catalog-*.js` keep the samples' role in tests.

## 1. Skeleton and test harness

- [x] 1.1 Create `index.html`, `styles.css`, the `AxeGraft` namespace and the `src/` and `catalog/` directories, and verify that opening `index.html` from disk in Firefox and Chromium shows an empty editor with no console errors
- [x] 1.2 Build the test harness and `test/index.html`, and verify the page lists a deliberate pass and a deliberate failure correctly
- [x] 1.3 Add `test/run-node.js`, using only Node's standard library to load the same classic scripts, and verify it reports the same core results as the page and reports game-file tests as not checked when `AXEGRAFT_EDITOR_GAME_DIR` isn't set
- [x] 1.4 Add tests that every source file is listed in `index.html`, that the tree has no package manifest or lockfile, and that source contains no remote URLs, and verify each fails when deliberately violated
- [x] 1.5 Add a `README.md` covering how to run the editor and tests, and verify its instructions work as written from a fresh copy

## 2. Game catalog

- [x] 2.1 Implement `registerCatalog` and the catalog check, covering contents, internal references, per-version coverage, help texts and format versions, and verify a deliberately bad fixture fails each rule with a message naming the catalog and the problem, and that a missing `application` is accepted
- [x] 2.2 Handle bad or missing catalogs at startup, and verify the "Bad catalog" scenario, with the valid game still editable
- [x] 2.3 (Since replaced by the generated `catalog/starcraft.js`.) Write `catalog/sample-starcraft.js` by hand from `starcraft.md`, including a few units, a set several units share, a unit with no buttons, a table entry that isn't a unit, a set absent on older versions, every requirement type and one constant of each kind, and verify it passes the catalog check and its values match the reference document
- [x] 2.4 (Since replaced by the generated `catalog/warcraft2.js`.) Write `catalog/sample-warcraft2.js` by hand from `w2_exe.md`, with no requirements and with the `string` and `highlighted` button fields, and verify it passes the catalog check and its values match the reference document
- [x] 2.5 Document the format in `docs/catalog-format.md`, and verify in a test that its example passes the catalog check

## 3. Mod validation

- [x] 3.1 Implement parsing with safe handling of arbitrary bytes, invalid JSON, deep nesting and very large input, and validate the header, parts and strict fields with labels ignored, and verify the "Mod header", "Mod parts", "Strict fields" and "Untrusted input safety" scenarios of `mod-format` pass as fixtures
- [x] 3.2 Validate unit entries and engine behaviour names, and verify the "Identifying game content and engine behaviour" and "Unit entries" scenarios pass as fixtures for both games
- [x] 3.3 Validate button sets, button fields and typed function variables, and verify the "Button set entries", "Button set numbering", "Referring to button sets", "Opening a table entry", "Button fields" and "Typed function variables" scenarios pass as fixtures
- [x] 3.4 Validate requirement entries and lists, and verify the "Requirement entries" and "Requirement lists" scenarios pass as fixtures, including the Zerg Carapace example
- [x] 3.5 Validate constants, duplicates and collection of all problems, and verify the "Constant entries", "No duplicates within a mod" and "All problems reported together" scenarios pass as fixtures
- [x] 3.6 Add randomized tests with a fixed seed that feed malformed values to the validator, and verify it always returns a mod or problems and never throws
- [x] 3.7 Sort results into refused files, errors and warnings, and verify the "Refusing malformed files", "Opening a file with errors" and "Errors and warnings" scenarios, and that warnings never change whether a shared fixture is valid

## 4. Mod document

- [x] 4.1 Implement the immutable document with field edits, `effective` lookups and entry removal when an item matches its original on every version, including entries from an opened file, and verify the "Only differences are saved" and "Reverting" scenarios
- [x] 4.2 Implement canonical serialization, and verify the "Stable file output" scenarios, and that opening a saved file gives the same mod
- [x] 4.3 Implement label handling, and verify the "Labels" scenarios
- [x] 4.4 Implement bounded undo and redo over documents, and verify the "Undo across tabs" scenario at document level
- [x] 4.5 Implement the version compatibility calculation, and verify the scenarios in `version-compatibility` for applying, rejected and skipped results, including sets named by `button_set` and table entries named by `action_variable`

## 5. Application shell and navigation

- [x] 5.1 Implement the storage wrapper over IndexedDB with a memory fallback, and verify with a simulated failure that the editor continues and shows the "Storage blocked" notice
- [x] 5.2 Build the main layout, the menu, per-game tabs, the sample catalog notice and the status bar, and verify with DOM tests the "StarCraft mod", "Warcraft II mod", "Editing with a sample" and "Unsaved mod" scenarios
- [x] 5.3 Build the item tree with ID-first labels, numeric order and a search box, keeping the tree logic in `src/core`, and verify the "Item labels and order" and "Filtering the tree" scenarios with DOM tests
- [x] 5.4 Give each tab its own selection, and verify the "Switching tabs", "Requirements list" and "Constants list" scenarios
- [x] 5.5 Add markers for changes, errors and warnings, and filters for each, and verify the "Marking changes", "Marking problems" and "Filtering by problem" scenarios
- [x] 5.6 Add keyboard navigation for the tree and tabs, and verify the "Tree navigation" scenario with simulated key events
- [ ] 5.7 Implement New, Open, Save and Save As, with a download fallback, and verify with DOM tests the "Creating a mod", "Opening a mod", "Refusing malformed files", "Opening a file with errors" and "Saving only mods without errors" scenarios, and check direct saving by hand in Chromium
- [x] 5.8 Add the problem list, and undo and redo in the menu and on the keyboard, and verify the "Problem while editing" and "Undo across tabs" scenarios through the UI
- [x] 5.9 Add drafts and the warning on closing, and verify the "Drafts" scenarios with DOM tests, and check by hand that a closed browser offers the work back
- [x] 5.10 Add the `?` button and the help table for game-independent controls, and verify the "Help for controls" scenarios, including a DOM test that every control in every tab panel has a help text, that the item list and tabs have none, and that help text stays inside the window
- [x] 5.11 Add the Dark and Classic themes, chosen from the View menu and remembered per browser, and verify the "Themes" scenarios
- [x] 5.12 Make an open menu follow the pointer to another menu, and close on a click outside it or Escape, and verify the "Menu bar" scenarios
- [x] 5.13 Show a changed field's original value in its mark's tooltip instead of under the field, show the item list's keyboard cursor on groups, and verify the "Original value of a changed field" and "Moving onto a group" scenarios

## 6. Units and button sets

- [x] 6.1 Build the Units tab with its fields for every table entry, combined name and ID controls and status function lists, and verify the "Unit fields", "Choosing by name or ID" and "Status functions by name" scenarios with DOM tests
- [x] 6.2 Add the link from a unit to its assigned set, and verify the "Going to the assigned set" scenarios
- [x] 6.3 Build the Button Sets tab's list with add, remove and reorder, and verify the "Button list" scenarios
- [x] 6.4 Build the button form from the catalog's button fields, and verify the "Button fields" and "Fields with a name and an ID" scenarios, including the Warcraft II fields
- [x] 6.5 Make variable fields follow their function, and verify the "Variables follow their function" and "Variable omitted when unset" scenarios
- [x] 6.6 Build the panel preview on the Button Sets tab and connect it to the button list, and verify the "Panel preview" scenarios, including creating a button and several buttons at one position
- [x] 6.7 Add the used-by list with links to its units, new sets, and copying between sets, and verify the "Showing who uses a set", "New sets" and "Copying buttons" scenarios
- [x] 6.8 Add links from reference fields to their items, and verify the "Jump from a variable" and "Jump in a game without requirements" scenarios
- [x] 6.9 Add the icon, string, choice and table entry kinds of unit field, show the fields as the button table entry and the status panel, and verify the "Unit fields", "Unit icon" and "Choosing by name or ID" scenarios, including Warcraft II's icon, stats panel frame and name, and StarCraft's equivalent entry
- [x] 6.10 Add renaming units in the mod's `labels`, shown wherever the editor names a unit, with labels following the name, and verify the "Unit names" scenarios and the "Renamed unit" scenario of "Labels"
- [x] 6.11 Extend renaming to sets, upgrades, techs, orders and constants from the panel titles of every tab, with a relabelled mark on renamed titles and unnamed sets shown as `Set` and their ID, and verify the "Item names" scenarios, the "Adding a set" scenario and the "Renamed constant" scenario of "Labels"

## 7. Requirements, constants and the compatibility report

- [x] 7.1 Convert between flat lists and rows, and verify that every record in the sample catalog converts to rows and back unchanged, including `or` and upgrade sublists
- [x] 7.2 Build the Requirements tab's row editor, with parameters in the same row as their opcode, bare units as a separate kind of row from `must_have`, and opcodes limited by record type, and verify the "Record editor", "Parameters follow their opcode", "Bare units" and "Opcodes limited by record type" scenarios
- [x] 7.3 Show structure and row problems, and verify the "Showing structure" scenarios
- [x] 7.4 Handle missing and emptied records, whole-record saving and viewing the original, and verify the "Records that don't exist originally", "Record replaced whole" and "Viewing the original record" scenarios
- [x] 7.5 Build the Constants tab for numeric, referring and option constants, and verify the "Numeric constants", "Stored scale", "Constants that refer to game content", "Named options" and "Grouped display" scenarios
- [x] 7.6 Show each constant's availability per version, and verify the "Showing availability" scenario
- [x] 7.7 Build the compatibility report and field warnings, and verify the "Warnings don't block saving", "Warnings at the point of use" and "Limits of the report" scenarios with DOM tests

## 8. Game assets

- [x] 8.1 Implement MPQ reading through `File.slice`, with header, encrypted tables, per-sector files and bounds checks, and verify it against synthetic archives, including truncated and corrupted ones
- [x] 8.2 Implement decompression with a PKWARE implode decoder, and verify with synthetic data that an unsupported method gives a named error
- [x] 8.3 Implement GRP and TBL decoding, and verify with synthetic files, including out-of-range frames and offsets
- [x] 8.4 Implement the import dialog for folders, archives and a single `stat_txt.tbl`, with progress, archive priority and a persistent cache, and verify the "Importing from game files", "Importing a string table", "Patched assets take priority" and "Assets remembered" scenarios with synthetic archives
- [x] 8.5 Show icons and strings in the preview, icon picker and string fields, with placeholders, and warn about IDs beyond the loaded data, and verify the "Assets don't affect validity", "Icon choice" and "String text" scenarios
- [x] 8.6 Run the importer against the real game files for StarCraft and Warcraft II through `AXEGRAFT_EDITOR_GAME_DIR`, work out the correct palette and archive list for each, record them in the catalogs' `assets`, and verify by eye that known icons have the right colours, and that any further compression method these files need is added
- [x] 8.7 Verify in a browser that importing from a real StarCraft folder keeps the page responsive and leaves the game files unchanged, using checksums taken before and after
- [x] 8.8 Add loading of shipped assets from `assets/<game>/`, and verify the "Assets are optional" scenarios with a synthetic asset folder, including with that folder deleted

## 9. Integration

- [x] 9.1 Add a test that takes a mod through the UI from new to saved for each game, touching every available tab, and verify that the file reopens identically and passes validation
- [ ] 9.2 Compare the app's look and workflow side by side with FireGraft, and record any deliberate differences in `docs/architecture.md` with the reasons for the main decisions
- [x] 9.3 Run the test page in current Firefox, Chromium and, where available, Safari, opened from disk and served statically, with the network disabled, and verify the same results on each and no network requests, and record any browser not checked in `README.md`

## Workflow follow-up

- Propose the separate change converting `starcraft.md` and `w2_exe.md` into complete catalogs and library data, using one set of names for both.
- Have the patcher run the shared mod fixtures once its validation exists.
- Show a breakdown under a string field's raw text: hotkey, cost type and lines.
- Consider a native wrapper once the browser version is in use.
- Archive the change after review.
