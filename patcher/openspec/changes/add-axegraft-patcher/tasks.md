# Tasks

Work test-first: for each task, write the failing tests, then the code. Groups 8-10 need the MPQDraft changes in `MPQDraft/TODO.md`; groups 1-7 don't.

## 1. Workspace

- [ ] 1.1 Create the Cargo workspace with `axegraft-patcher-core`, `axegraft-patcher-library` and `axegraft-patcher-plugin`, and verify `cargo test` passes on Linux and `cargo build --release --target i686-pc-windows-gnu` produces a DLL
- [ ] 1.2 Forbid `unsafe` code and Windows dependencies in `axegraft-patcher-core`, set the release profile to `panic = "unwind"`, and verify `cargo tree -p axegraft-patcher-core` lists only `serde` and `serde_json`
- [ ] 1.3 Add a `README.md` with build and test commands, and verify the documented commands run as written

## 2. Mod format

- [ ] 2.1 Define the typed mod model and a `Problem` type carrying input name, path and message, and verify with unit tests that problems format with all three
- [ ] 2.2 Parse the header and parts with strict fields and ignored labels, and verify the "Mod header", "Mod parts" and "Strict fields" scenarios pass as tests
- [ ] 2.3 Validate unit entries and ID ranges against a game vocabulary, and verify the "Unit entries" scenarios pass
- [ ] 2.4 Validate button set entries, button fields and positions, and verify the "Button set entries" and "Button fields" scenarios pass for both games
- [ ] 2.5 Validate typed function variables, and verify the "Typed function variables" scenarios pass, including the byte limit on StarCraft conditions
- [ ] 2.6 Validate requirement entries and lists, and verify the "Requirement entries" and "Requirement lists" scenarios pass, including the Zerg Carapace example
- [ ] 2.7 Validate constant entries, ranges and options, and verify the "Constant entries" scenarios pass
- [ ] 2.8 Reject duplicates within a mod and report all problems together, and verify the "No duplicates within a mod" and "All problems reported together" scenarios pass
- [ ] 2.9 Add property tests feeding arbitrary bytes, arbitrary JSON and deep nesting to the parser, and verify it never panics and always returns a mod or problems
- [ ] 2.10 Document the mod format in `docs/mod-format.md`, and verify each example in it passes through the parser in a test

## 3. Merging inputs

- [ ] 3.1 Merge non-overlapping mods, and verify the "Merging without overlaps" scenarios pass, with a property test showing input order doesn't matter
- [ ] 3.2 Detect overlaps at unit-field, button-set, requirement-record and constant level, and verify the "What counts as an overlap" scenarios pass
- [ ] 3.3 Report every overlap with input names, game mismatches and input-named errors, and verify the "Reporting overlaps", "Inputs must agree on the game" and "Errors name their input" scenarios pass
- [ ] 3.4 Treat having no inputs as an error, and verify the "No mod anywhere" scenario passes at core level

## 4. Library schema and checks

- [ ] 4.1 Define the library schema, including builds, tables, layouts, functions, set numbering, stream references, constants and the closed encoding set, and verify a small fixture deserializes in a test
- [ ] 4.2 Implement encoding of values for each encoding, and verify round-trip and range tests pass for all of them, including `neg8` and `byte_of`
- [ ] 4.3 Implement the library checks for availability, all-or-none locations, expected bytes, confirmed data, structural completeness and function names, and verify a deliberately bad fixture fails each one with a message naming the entry
- [ ] 4.4 Implement the checks for shared locations, range fit and stable scale, and verify the "No shared locations", "Value range fits every location" and "Stable scale across builds" scenarios pass with bad fixtures
- [ ] 4.5 Have `build.rs` validate data and generate static Rust, and verify that bad data fails `cargo build` and fixture data is reachable from the generated tables
- [ ] 4.6 Implement build identification from PE headers and the version resource, for both files and loaded images, and verify the "Build identification" scenarios with synthetic PE images
- [ ] 4.7 Document the library data schema in `docs/library-schema.md`, and verify the example in it passes the library checks in a test

## 5. Planning and applying

- [ ] 5.1 Define the `Memory` trait and a fake implementation with a non-standard default base, and verify its reads, writes, allocation and write tracking with unit tests
- [ ] 5.2 Plan constants, including all locations, expected bytes, skips and options, and verify the "Constant changes", "Skipping constants unavailable on a build" and "Same validation on every build" scenarios pass
- [ ] 5.3 Plan button sets, including layouts, function addresses, typed variables and set ID translation, and verify the "Button set changes" and "Translating IDs to the running build" scenarios pass
- [ ] 5.4 Plan unit assignments, status functions and status unit types, and verify the "Assigning button sets to units", "Status function changes" and "Status unit type changes" scenarios pass, including chained assignments
- [ ] 5.5 Decode and re-encode requirement streams, and verify a synthetic stream with upgrade sublists round-trips byte for byte, and that property tests round-trip generated records
- [ ] 5.6 Plan requirement changes, including replacing, removing and appending records and repointing references, and verify the "Requirement record changes" scenarios pass
- [ ] 5.7 Reject what can't be applied on the build and compare expected bytes, and verify the "Skipping is limited to constants" and "Checking expected bytes" scenarios pass
- [ ] 5.8 Implement the applier with pointer resolution and read-back, and verify the "Validate everything before writing", "Load address independence" and "Confirming the writes" scenarios pass, with no writes tracked when planning fails

## 6. Logging

- [ ] 6.1 Generate log lines for the header, inputs, changes, skips and errors, and verify the "Log header", "Logging inputs", "Logging changes", "Logging skips" and "Logging errors" scenarios with golden-text tests
- [ ] 6.2 Emit the plan through a log sink before any write, and verify with a fake memory that fails partway that the plan was already sent to the sink
- [ ] 6.3 Generate the on-screen error summary, and verify the "Many problems" scenario, showing the first problems, the number of others and the log's path

## 7. Starter data and checker

- [ ] 7.1 Build the `check` binary comparing library data with real executables, and verify with a synthetic executable that it reports matches, differences and "not checked"
- [ ] 7.2 Add a coverage listing to `check`, and verify the "Reporting gaps" scenario against a fixture
- [ ] 7.3 Extract structural data and functions for StarCraft 1.16.1 and 1.17 and Warcraft II BNE 2.02 from the reference documents, and verify `check` passes against each real executable
- [ ] 7.4 Add a small set of constants exercising each encoding, with no shared locations, and verify the library checks and `check` pass
- [ ] 7.5 Decode every requirement stream in the real StarCraft 1.16.1 and 1.17 executables, and verify re-encoding reproduces the original bytes exactly
- [ ] 7.6 Plan an example mod for each starter build with memory loaded from the real executable at a non-standard base, and verify the planned writes and expected bytes in a test
- [ ] 7.7 Add tests asserting real facts about the starter builds, including game ranges, button panel positions and a build loading away from its preferred address, and verify they fail when the matching library data is altered

## 8. Plugin

- [ ] 8.1 Spike a minimal plugin exporting the new entry point with its undecorated name, and verify with `i686-w64-mingw32-objdump -p` and a loader test under Wine
- [ ] 8.2 Implement the `abi` module for the new-style interface, and verify the identification, `CanPatchExecutable` and settings scenarios with a test host under Wine
- [ ] 8.3 Implement the `win32` module and real `Memory`, with protection restored and instruction cache flushed, and verify under Wine that writes to code and data work and protection is restored
- [ ] 8.4 Implement `InitializePlugin`, reading inputs and applying the mod in a single step, and verify the lifecycle scenarios with the test host, including the unsupported-build case and archives being reopened
- [ ] 8.5 Read inputs through `GetPatchMPQCount`, `ReadPatchFile` and `GetPluginModule`, and verify the "Mods in patch MPQs" and "Directly supplied mod" scenarios with the test host
- [ ] 8.6 Implement the failure path with `catch_unwind`, error dialog, log flush and `FALSE` return, and verify the "Failing closes the game" and "Internal faults stay contained" scenarios with the test host
- [ ] 8.7 Write the log to `%TEMP%\AxeGraftPatcher.log`, and verify under Wine that it replaces the old log, survives a forced exit during patching, and that an unwritable log doesn't stop a valid mod
- [ ] 8.8 Add the version resource, and verify with `i686-w64-mingw32-objdump -p` or a test host that the file reports its product name and version
- [ ] 8.9 Add footprint tests comparing `win32` declarations with an allowlist and scanning the DLL's imports for banned process and registry APIs, and verify that adding a banned import makes the test fail

## 9. End-to-end tests under Wine

- [ ] 9.1 Build a fake game with known tables and a fake `Storm.dll`, and verify a test can start it through a pinned MPQDraft from `AXEGRAFT_PATCHER_MPQDRAFT_DIR`, skipping visibly when that isn't set
- [ ] 9.2 Test an MPQ-based mod, a direct-file mod and both merged, and verify the fake game reports the expected table values
- [ ] 9.3 Test overlapping inputs and an invalid mod, and verify the game closes, the tables are unchanged and the log names the problems
- [ ] 9.4 Test a SEMPQ containing AxeGraft Patcher and a directly supplied mod, and verify the mod applies when the original file no longer exists

## 10. Real game verification

- [ ] 10.1 Run a mod changing one constant, one button set, one status function and one requirement on StarCraft 1.16.1 under Wine, and verify each change in the game and in `AxeGraftPatcher.log`
- [ ] 10.2 Repeat on StarCraft 1.17 under Wine, and verify the same changes and that the log's load address is used correctly
- [ ] 10.3 Run a mod changing one constant, one button set and one status function on Warcraft II BNE 2.02 under Wine, and verify each change in the game and in `AxeGraftPatcher.log`
- [ ] 10.4 Read back one value of each kind after reaching a game on each starter build, and record in `README.md` whether any was overwritten or read before patching

## Workflow follow-up

- Complete the MPQDraft changes in `MPQDraft/TODO.md` before starting groups 8-10.
- Follow up with the full data import, after deciding how the reference documents become machine-readable. Add tests there for the real per-build facts the specs now describe generally: builds sharing a PE timestamp or version string, shifted and absent button sets, functions absent on older builds, and requirement records that differ between builds.
- Archive the change after review.
