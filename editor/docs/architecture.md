# Architecture

How AxeGraft Editor is put together, why, and where it deliberately differs from FireGraft.

## Constraints

The editor has to keep working, and stay easy to change, for a long time. So it depends on nothing but a current browser:

- **Plain JavaScript, HTML and CSS, as classic scripts.** Browsers load neither ES modules nor local data with `fetch` from `file://`, so opening `index.html` from disk rules both out. Each script adds to one global, `AxeGraft`, in the order `index.html` lists them. A test checks that every script is listed, and that the test page loads them in the same order.
- **No library, framework, build step or package manager.** What runs is what's in the tree. TypeScript would need a compiler, and a server would need a runtime, so neither is used.
- **No network.** Mods and game files never leave the machine.
- **Tests run in a browser page**, with an optional Node runner that uses only Node's standard library.

## Layers

```
catalog/      Game data as JSON in one wrapper call each. See catalog-format.md
src/core/     Everything that decides whether a mod is right, with no DOM:
              catalog check, file reading, validation, the document and its
              edits, file output, undo, version compatibility, the item tree,
              requirement rows, storage
src/assets/   MPQ, explode, GRP, TBL, palette and PNG code, and the importer,
              with no DOM
src/ui/       Rendering and events: the window, the panels of each tab,
              dialogs, help for game-independent controls
assets/       Optional shipped icons and strings, one folder per game
```

Keeping `src/core` free of the DOM means the rules are tested from the command line as well as the page, and a different front end, such as a terminal one, could reuse it. The tree logic and selection rules live there for that reason.

## Main decisions

**One immutable document.** The mod is held as the parsed JSON of the file, and every edit returns a new document that shares its unchanged parts. There's no second model to keep in step, a value the catalog can't represent (such as an out-of-range ID from a file) is simply kept as written, and undo is a list of earlier documents. A problem's path, like `button_sets[3].buttons[2].action_variable`, links it to its field.

**Only differences are saved.** An entry that matches its original on every version is removed when an edit makes it match, and once when a file is opened. Unit fields are saved one by one, button sets and requirement records whole, as the format defines.

**Two stages of reading.** A file whose structure the editor can't hold (not JSON, wrong header, unknown property, a part or array of the wrong shape) is refused, and every problem found is listed with its location. Anything else opens, and bad values are shown as errors where they are. Errors are what the patcher's format rules reject, and block saving. Warnings are valid but suspicious, such as an ID beyond the loaded string table or something a version lacks, and never block saving. Only warnings may depend on loaded assets, so a mod's validity never depends on what's imported.

**Validation is tested with shared fixtures.** Every scenario of the patcher's `mod-format` spec has a mod in `test/fixtures/mods/valid` or `invalid`, with the expected problem paths and whether it's refused. The fixtures are plain JSON in a wrapper line, with their own small catalogs, so the patcher can run the same files later.

**Stable output.** Parts come in a fixed order, entries sorted by type and ID, fields in the catalog's order, with two-space indentation and flat objects on one line. The same mod always gives the same bytes, whatever order it was edited in.

**Rendering by rebuilding.** There's no virtual DOM: after a change, the window is rebuilt from the state, and focus and scroll position are restored by field. With about 250 units, 554 buttons and 300 constants this is fast enough, and there's no diffing to maintain. Standard controls (`select`, `input`, `fieldset`, `dialog`, `details`) carry keyboard use and accessibility. The item list follows the WAI-ARIA tree pattern.

**Help beside every control.** Each control is described (`aria-describedby`) by the text of a `?` button beside it, shown on hover and focus. Game-specific help comes from the catalog; help for controls every game shares is a table in `src/ui/help.js`. A test opens every item of every tab of both games and checks every control has a help text.

**Storage is a convenience.** Drafts and imported assets go in IndexedDB, behind a wrapper that falls back to memory for the session and says so. The saved file is always the real copy.

**Assets are decoded in the browser.** Archives are read through `File.slice`, so only their tables and the needed sectors are loaded. Every size and offset is bounds-checked. Decoding pauses between steps, so the page stays responsive without a Web Worker, which `file://` restricts. Icons are cached as PNG images, so ordinary `<img>` tags show them.

## Found while building it

- **StarCraft's icon colours** come from a tileset palette remapped through `unit\cmdbtns\ticon.pcx`, a 96-by-1 image. This reproduces FireGraft's `ticon.pal` exactly, for every tileset, so the catalog records the remap rather than a copied palette.
- **Warcraft II's icons** are `Art\unit\Portrait\portrait.grp` in `War2Dat.mpq`, 196 frames of 46 by 38, with one set per terrain. The forest set and `Art\bgs\Forest\forest.ppl`, a palette of 6-bit values, are used for the preview.
- **String tables** hold NULs inside strings: StarCraft's button strings put one between the hotkey and the text, and unit names separate their parts with them. A string therefore runs to where the next one starts, and the form shows the NULs as `<0>`, like any other control byte.
- **Archive locales.** In StarCraft 1.06 and 1.07, `Patch_rt.mpq` holds `stat_txt.tbl` only in German and Portuguese. The importer takes the US English or language-neutral copy and skips others, as the game does, so the strings come from `BrooDat.mpq` there.
- **Warcraft II's button data** isn't listed in `w2_exe.md`, so the sample catalog's buttons were read from the 2.00 and 2.02 executables at the offsets that document gives. Both versions hold the same values once functions are matched by table position. The function names in the sample are descriptive placeholders, because no source names them; the conversion change has to choose the library's names.
- **Catalog scripts that fail to run** don't fire `onerror`, and Chromium's error events don't name `file://` scripts. So at startup, any catalog `<script>` that didn't register a catalog is reported as broken.

## Compared with FireGraft

The layout follows FireGraft's: a menu bar, a tree of items on the left, a tab for each part of the mod on the right, grey panels with grouped fields, black lists and fields, and a coloured selection. The Button Sets tab has the same list, form and panel preview: clicking a filled position selects its button, and double-clicking an empty one creates a button there. The `→` jump from a variable to the item it names is kept.

Deliberate differences, and why:

| FireGraft                                                                 | AxeGraft Editor                                                                                                   | Why                                                                                                                                  |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Saves FGP projects, MPQs and self-executing patches                       | Saves a mod file in AxeGraft's format, holding only what changes                                                  | Applying the mod is AxeGraft Patcher's job; a small text file can be read, compared and merged                                        |
| A copy of the whole game state for one version                            | One document per game, no version named; a report shows what each version would do                                | Mods apply to every version the patcher supports                                                                                     |
| Exe Edits tab of 267 offsets, chosen by tree position                     | Constants tab of named constants, with their range, stored scale and availability on each version                  | Mods name behaviour, never addresses, so the catalog can hold no addresses                                                            |
| Requirements edited as the raw opcode list                                | Rows: an opcode and its parameter on one row; completed units and `must_have` as different rows; levels and `or` grouped | The flat list is easy to get wrong; rows show what the game reads, and structural mistakes are marked on the row                    |
| Button set chosen by unit, with the unit's ID as its set                  | Sets numbered by the lowest table entry pointing at them; new sets from the table's size; a list of who uses a set | A shared array is one set, so editing it shows everyone it affects, and a set ID can't be mistaken for a unit                        |
| Values written as typed                                                   | Every value checked as typed, errors beside the field, a problem list, and no saving with errors                   | A mod with errors would be rejected by the patcher                                                                                   |
| An autosave timer writes FGP files to a save folder                       | Undo and redo across tabs, and a draft in browser storage offered back after a crash                              | Nothing is written next to the user's files, and every change can be taken back                                                      |
| Icons and strings from the `data.mpq` it ships                            | Optional: imported from the user's own game files, shipped in `assets/`, or names and IDs                          | Blizzard's files aren't ours to ship as part of the code, and the editor must work with no game files at all                         |
| Plugins tab, button presets, update check, FGP import and the `Lock` box  | Not offered                                                                                                        | Plugins belong to the patcher; presets need data the catalog doesn't define; an update check would need the network                   |
| The `→` jump picks tech research or tech use from the function            | A tech variable leads to the tech's research record                                                               | The catalog doesn't say which record a function's tech refers to; the use record is one click away in the list                       |
| Windows controls and fonts                                                | System fonts and standard browser controls, styled to look close to FireGraft                                      | No fonts or assets can be bundled, and standard controls bring keyboard use and accessibility                                        |
| StarCraft only                                                            | StarCraft and Warcraft II, each from its catalog                                                                   | Everything game-specific is catalog data, including Warcraft II's `string` and `highlighted` fields                                  |

The visual comparison was made against FireGraft's documented behaviour and layout (`firegraft.md` and its readme files). A side-by-side look with FireGraft running is still to be done; see the README's list of checks done by hand.
