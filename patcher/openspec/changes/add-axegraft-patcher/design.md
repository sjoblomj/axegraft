# Design

## Context

See `proposal.md` for motivation and the specs for required behaviour.

- **Repository:** `patcher/` holds no code yet. Rust 1.90 stable, the `i686-pc-windows-gnu` target, MinGW and Wine are installed. There's no Windows machine and no git remote.
- **Reference data:** `~/axegraft/starcraft.md` and `~/Downloads/war2/w2_exe.md` hold the data for all 28 versions. Both are static analysis, and neither has been fully checked in a running game.
- **Prior work:** an earlier prototype and `patcher.md` exist in `~/axegraft`. They are deliberately not inputs to this design.
- **MPQDraft:** the plugin relies on the interfaces listed in `~/code/MPQDraft/TODO.md`, which don't exist yet.

## Goals / Non-Goals

**Goals:**
- Keep version differences in data, so the engine has no per-version logic.
- Run almost all tests natively on Linux, using a fake memory.
- Guarantee that nothing is written unless the whole mod is valid.
- Build the first version with the real library schema, so importing all the data later doesn't change the engine.

**Non-Goals:**
- Importing all data from the reference documents. The knowledge base that the data comes from is separate work.
- Warcraft II levels and victory conditions, file names and other tables beyond the four parts.
- New game behaviour, including plugin functions behind game pointers.
- Patches inside maps, which needs detecting map starts, undoing changes and patching a running game.
- Handling problems seen only in menus or from the game overwriting edits, until they're actually observed.
- Implementing the MPQDraft changes, which are separate work in that repository.
- CI, because this repository has no remote yet.

## Decisions

### 1. Three crates, split at the Windows boundary

```
axegraft-patcher-core      No Windows dependencies, no unsafe code, tested on Linux
  model            Typed mod, problems and library schema
  parse/validate   JSON --> typed mod, or problems
  merge            Typed mods --> one mod, or overlap problems
  plan             Mod + library + image --> plan, or problems
  apply            Carries out a plan through the Memory trait
  report           Log lines from all of the above

axegraft-patcher-library   Library data, generated into static Rust by build.rs
  data/*.json      One file per game or version
  bin: check       Compares data with real executables, lists coverage

axegraft-patcher-plugin    Thin 32-bit DLL, built as AxeGraftPatcher.qdp
  abi              The MPQDraft interface, kept in one module
  win32            Every Windows function the plugin declares
  memory           The real Memory implementation
```

The planner takes a `&Library`, so tests can use small fixtures rather than real game data. *Alternative considered:* a single crate with `cfg` blocks. Splitting makes it impossible for core logic to reach Windows APIs by accident.

### 2. Planning is separate from applying

The planner reads memory but never writes it. It returns a complete plan, or every problem it found:

```
Plan
  blobs:  new memory to allocate (button arrays, requirement streams)
  writes: { location, expected, new, property }
          new is either bytes or a pointer to a blob
  skips:  { constant, reason }
```

The applier logs the plan, allocates blobs, resolves pointers, writes and reads back. This gives "nothing written unless all valid" a single place to live and test. *Alternative considered:* validating as it goes, with a rollback, which would add complexity and an extra failure path.

### 3. Addresses are `u32` RVAs behind a `Memory` trait

Library entries use RVAs, and the trait exposes the image base, reading, writing and allocating. Addresses are always `u32`, never `usize`, so native 64-bit tests behave the same as the 32-bit DLL. Fake memory in tests defaults to a non-standard base, because Wine can't be relied on to relocate the executable. That way, a hard-coded `0x400000` fails an ordinary unit test.

Expected pointers are stored as RVAs and rebased before comparing, which covers 1.17's relocations.

### 4. Library schema expresses every version difference as data

| Version difference          | Representation |
| --------------------------- | -------------- |
| Version identity              | PE timestamp plus fixed product version. The same parser reads a file during setup and the loaded image in the game. |
| Table locations and layouts | Per-version table RVA, with a layout chosen from a fixed set for each game |
| Function addresses          | Per-version RVA for each uniquely named function, or absent |
| Variable types               | Per-function variable type: none, unit, tech, upgrade, number or table entry |
| Set numbering               | Per-version map from each game's own numbering of sets and table entries to the version's numbers, plus the table entries that point at each set's array |
| Stream references           | Per-version lists of references to the stream base and to base + 2 |
| Constants                   | Per-version: locations, `not_applicable` or `unknown` |

Encodings are a closed enum: `u8`, `u16`, `u32`, `i8`, `i16`, `i32`, `neg8`, `neg16`, `neg32`, `byte_of(n)` for one byte of a wider stored value, and `option` for per-version bytes.

The data is JSON, because it's easy to generate, and whatever eventually converts the documents can target it. `build.rs` validates it and generates static Rust, so bad data fails the version and nothing is parsed at game startup. *Alternative considered:* parsing embedded JSON at startup, which is simpler but delays data errors to run time.

**Function names.** StarCraft's functions are named as in StarSource (`bf_*`, `order_*`, `statdraw_*`). Warcraft II's are named as in the PlayStation source's `statbtn.c`, which `w2_exe.md` also uses. Functions that source lacks get a name in the same style, such as `bf_enhanced_mode` for the condition that 2.00 and 2.02 add for Enhanced mode. Where two names are one function on a version, a name that version's original buttons don't use is absent there; a name they use is kept, so two names may share an address.

**Constants follow the game's freedom.** A value the game lets differ is its own constant, copies it needs to agree are one constant, and code sites that only work together are one option constant whose options write several locations. This gives a modder every independent choice and none that the game can't handle.

**Versions beyond the patcher.** AxeGraft Editor's catalogs may list versions the patcher doesn't support. Warcraft II 1.3, 1.33 and 1.5 are listed there for editing only. Patching them is outside the scope of this patcher and will require a separate mechanism.

### 5. Library guarantees are enforced in the build

The specs' library rules run in `build.rs` and in tests over fixtures: every version listed, every location having expected bytes, no overlapping locations, ranges fitting every location, stable scale, confirmed data only. The checks live in `axegraft-patcher-core`, so they can be tested with deliberately bad fixtures.

### 6. Requirement streams are decoded, merged and re-encoded

The planner decodes the running version's stream into records, using the opcode table to tell parameters from unit IDs. It then replaces, removes or appends the mod's records, re-encodes the stream to a blob, and repoints every listed reference. Other records stay untouched, so per-version differences like order 73's survive.

Upgrades need special decoding, because their sublists end with the same word as records do. Decoding every stream in a real executable and re-encoding it must reproduce the original bytes exactly, which is a strong test of the decoder.

### 7. Button sets are resolved before they're assigned

The game has two kinds of number here: table entries, which units and a few other entries such as the worker build menus use, and the arrays they point at. A set is an array. In StarCraft, the 250 entries point at 98 arrays from 1.12 on, and 89 entries have no buttons. An original set's ID is the lowest entry pointing at it, which leaves 63 entries as other references to the same arrays. One of those isn't a unit: entry 247 points at set 37's array. Warcraft II BNE works the same way, with 58 arrays in its 120 entries.

New sets get IDs from the table's size up, so a set's ID never looks like the entry of a unit using it. A button that opens a submenu names a table entry, because that's what the game reads, and reaches a new set through an entry the mod assigns it to. This keeps the format close to the game, with no rule tying a set's ID to a unit.

The planner first takes a snapshot of each set, meaning its count and pointer, from the unmodified table. It then applies the mod's `button_sets` over that snapshot as new blobs, and writes every table entry the library lists for a replaced set. Finally, each unit entry's `button_set` copies a resolved set's count and pointer into that table entry, or writes an empty entry for `null`, so an assignment overrides a replacement.

FireGraft uses the same two kinds of number. Its patch files number arrays by address, which depends on the version, and an entry it has no record for keeps its original pointer, so a replaced set reaches only the entries its editor also lists. The library's per-set entry lists and version-independent IDs avoid both.

Assignments only read the resolved sets, so they can't chain or depend on order. Entries sharing a set share one blob, so the game's runtime writes to a button still reach every unit using it, as they do in the original. Other fields in an entry, like StarCraft's secondary set ID, aren't changed. Blobs live in writable plugin memory that's never freed, because the game can write to buttons and keeps using them until it exits.

### 8. Everything happens in `InitializePlugin`

```
InitializePlugin    identify version; unsupported --> error, close
  (patch MPQs open) read inputs --> parse --> merge --> plan
                    log plan --> apply --> read back --> flush log
                    any problem --> log, flush, error, return FALSE
```

MPQDraft opens the patch MPQs before loading plugins, so a single step can read every input and patch before any game code runs. That also means the game can't have read a value before it's patched. *Alternative considered:* a second callback at the game's first archive open, which would have meant patching after some game code had run, plus once-only, locking and "never fired" handling in MPQDraft. Reading comes from `GetPatchMPQCount` and `ReadPatchFile`, and the direct file through `GetPluginModule` and ordinary file reads.

Each ABI entry point wraps its work in `catch_unwind`, so release builds use `panic = "unwind"`. A panic becomes the normal error path.

### 9. Direct Windows declarations in one module

`win32` declares by hand the few functions the plugin calls. A test compares that list with an allowlist, which makes it easy to review what the plugin's own code can call. *Alternative considered:* `windows-sys`, which is safe and thorough, but it makes the list of callable functions much less obvious.

### 10. Keep `std`, and check the footprint in two ways

Nothing suggests `std` fails on Windows 10+ or Wine, so the plugin uses it. `std` itself may add imports like `WS2_32.dll` that the plugin never calls, so footprint tests work like this:
- **Own code:** the `win32` allowlist above covers every function the plugin declares.
- **Built DLL:** a test inspects its import table and fails on banned process and registry APIs.

Windows 7 stays best effort, using `i686-win7-windows-gnu` only if that turns out to be cheap.

### 11. Test layers

Everything is written test-first.

| Layer                        | How | Runs on |
| ---------------------------- | --- | ------- |
| Parsing, validation, merging | Example tests per rule, property tests on arbitrary bytes and JSON | Linux |
| Planning, applying           | Fixture library, fake memory | Linux |
| Library checks               | Deliberately bad fixtures | Linux |
| Library data                 | `check` binary against real executables, reporting "not checked" when one is missing, and never passing silently | Local, with executables |
| Plugin ABI                   | C++-style test host calling the real DLL | Wine |
| End to end                   | Real DLL, pinned MPQDraft, fake game with known tables, then real games by hand | Wine |

Paths come from `AXEGRAFT_PATCHER_MPQDRAFT_DIR` and a per-version executable list. Wine tests are skipped visibly when MPQDraft isn't available.

### 12. Starter data set

The first version ships complete structural data for StarCraft 1.16.1, StarCraft 1.17 and Warcraft II BNE 2.02, plus a small set of constants that exercises every encoding. StarCraft 1.17 is included because it's the version most unlike the others, with relocations and non-zero file offset deltas. The data is generated from the knowledge base in `~/axegraft/knowledge_base`, the same data AxeGraft Editor's catalogs are generated from, then checked against the real executables. Until the full import, other versions are unsupported.

## Risks / Trade-offs

- **Reference data lists rows sharing an offset** → `starcraft.md` has rows that share a location on some versions, such as maximum and minimum supply. The "no shared locations" rule rejects these, so importing them needs a per-row choice: one combined constant, or leaving them out. The starter set avoids them, and the library check catches them.
- **MPQDraft interfaces don't exist yet** → `axegraft-patcher-core` and `axegraft-patcher-library` don't depend on them. The `abi` module is written last and stays small, so interface changes stay contained.
- **Opening patch MPQs early may not work on every game** → a game might set up Storm in its own code before its first open. MPQDraft will spike this on real games first. If some games fail, MPQDraft falls back to an opt-in flag for new-style plugins, which AxeGraft Patcher would set, but a game it supports could still misbehave. The early open has only been seen working under Wine, in runs that stopped during startup, so tasks 10.1-10.4 play real games with it.
- **The game may overwrite an edit** → patching before game code runs means a table the game fills during startup would lose the edit. Task 10.4 reads values back in a running game.
- **Rearranging may need more than data** → some game rules may have no data form. Named options in Constants cover code-site checks. Rules needing a plugin function are out of scope, and would be added as named, fixed features.
- **Wine differs from Windows** → in particular, relocation and error dialogs may not behave the same. Unit tests cover relocation, and the footprint is checked by inspection. Real Windows behaviour remains untested for now.
- **Antivirus false positives** → MPQDraft's injection is the likelier trigger. AxeGraft Patcher only keeps its own behaviour narrow.
- **Library documents change** → the schema is owned here, and an extraction step targets it, so document changes don't reach the engine.

## Open Questions

These can be answered later without changing the approach:

- **MPQDraft interface form:** a struct of function pointers or a vtable. This only affects the `abi` module.
