# Design

## Context

See `proposal.md` for motivation and the specs for required behaviour.

- **Repository:** `editor/` holds only OpenSpec files. The patcher in `../patcher` is also only specs so far, so there's no code or library data to reuse.
- **Mod format:** `../patcher/openspec/changes/add-axegraft-patcher/specs/mod-format/spec.md` is the source of the format rules. It isn't archived yet and may still change.
- **Reference data:** `~/axegraft/starcraft.md` has every button (Appendix A) and requirement record (Appendix B). `~/Downloads/war2/w2_exe.md` covers Warcraft II. Turning these into catalogs is a separate change.
- **Game files:** StarCraft uses `StarDat.mpq`, `BrooDat.mpq` and `Patch_rt.mpq`, with `unit\cmdbtns\cmdicons.grp` and `rez\stat_txt.tbl`. Warcraft II uses `War2Dat.mpq` and `War2Patch.mpq`, with `Art\unit\Portrait\*.grp` per terrain and `rez\stat_txt.tbl`.
- **Tools available:** Node 22 is installed but isn't required by the app. Real game files are available locally for checking the asset code.

## Goals / Non-Goals

**Goals:**
- Anyone with a browser can run, read and change the app, with nothing to install or build.
- Everything that decides whether a mod is correct is plain logic with no DOM, tested without a browser UI.
- Replacing a sample catalog with a complete one needs no code change.

**Non-Goals:**
- Supporting catalogs that aren't in the documented format, or reading the reference documents directly.
- Running the patcher's logic. The editor predicts results from catalog data, but it doesn't plan writes.
- FireGraft's update check, button presets, plugin tab, FGP import and `Lock` control.
- Merging several mods in the editor. That's the patcher's job.
- Virtualised lists or other optimisation beyond what about 250 units, 554 buttons and 300 constants need.

## Decisions

### 1. Plain JavaScript in classic scripts

```
editor/
  index.html        Lists every script in load order
  styles.css
  catalog/          One script per game
  src/core/         Catalog check, mod model, validation, file output, history, compatibility. No DOM
  src/assets/       MPQ, implode, GRP, TBL and palette decoding, cached in browser storage. No DOM
  src/ui/           Rendering, events and help text for game-independent controls
  assets/           Optional shipped icons and strings, one folder per game
  test/             Test page, Node runner, fixtures
  docs/             Catalog format and architecture notes
```

Browsers won't load ES modules or `fetch` local data from `file://`, so opening `index.html` directly rules both out. Classic `<script>` tags work, and each file adds to one `AxeGraft` global namespace.

*Alternatives considered:*
- **TypeScript:** browsers can't run it, so it would add a compiler, and with it the very build step this project avoids. JSDoc comments document types where they help.
- **ES modules with a small server:** cleaner imports, but needing a server is a worse trade than a global namespace with an explicit load order.
- **A tiny backend for assets:** all the decoding fits in the browser, so a backend adds a runtime and a port without removing any code.

### 2. Catalogs are JSON data in a script

A catalog file is a single call: `AxeGraft.registerCatalog({ ...JSON... });`. Its contents are strictly JSON, so a conversion tool can write it by adding one wrapper line, and any tool can read it by removing that line. The wrapper exists only because `fetch` doesn't work on `file://`.

`index.html` lists the catalog scripts. A script that's missing or fails to load only removes that game, and the error is reported.

Outline of the format, which `docs/catalog-format.md` documents fully:

```
application, catalogFormat, modFormat, game, title, sample
parts:        which mod parts the game has
versions:     [{ id, label }]
limits:       unit, tableEntry, tech, upgrade, order, buttonSet, newButtonSet, icon, string, position, conditionVariable, actionVariable
buttonFields: name, kind, required, help, for each button field
unitFields:   name, help, for each unit field
functions:    conditions, actions, statusChanged, statusUpdate: { name, label, variable, absentOn, help? }
opcodes:      { name, label, parameter, allowedIn, help? }
bareUnit:     { label, help }
units:        { id, name, tree, original: { button_set, status_changed, status_update, status_unit_type } }
buttonSets:   { id, name, tree, entries, absentOn, original: [button] }
upgrades, techs, orders: { id, name, tree }
requirements: { type, id, original: { default, perVersion } }
constants:    { name, label, group, note, help, kind, range or options, refers, availability: { version: value or state } }
icons, strings: { id: name }
assets:       archive priority, icon file, string file, palette
```

`units` lists every entry of the game's button table, including those that aren't units, such as StarCraft's worker build menus, which have only `button_set`. A set is one array of buttons in the game. An original set's `id` is the lowest table entry pointing at it, and `entries` lists every table entry pointing at it. An entry with no buttons has a `button_set` of `null`. A mod's new sets take IDs in the `newButtonSet` range, which starts at the table's size, so a set's ID is never mistaken for a unit's.

Original buttons and lists use the same shape as mod entries. Comparing and copying are therefore plain JSON comparisons, with no conversion.

Button fields are data, not code. Warcraft II's `string` and `highlighted`, and StarCraft's `enabled_string` and `disabled_string`, are only different lists in each catalog.

`application` is always `AxeGraft`. It's there to tell anyone reading the file what it's for, so the catalog check ignores it, and a catalog without it still loads.

### 3. One immutable mod document, with derived views

```
Mod document    Parsed JSON shape of the mod, never mutated
  edit(doc, change) --> new doc
  validate(doc, catalog, assets) --> errors and warnings, each with a path
  effective(doc, catalog, item) --> original or mod value
  compatibility(doc, catalog) --> per-version result
  serialize(doc) --> canonical bytes
```

The document is what's saved, with no parallel "editor model" to keep in sync. Undo is a bounded stack of earlier documents, which is cheap because unchanged parts are shared. A problem's path, like `button_sets[3].buttons[2].action_variable`, is also what links a problem to its field.

*Alternatives considered:* a full copy of the game state with a diff at save time. That adds a second model, with no natural place for a value the catalog can't represent, such as an out-of-range ID from an opened file.

### 4. Removing entries that match the original

An entry that matches its original on every version is removed. This applies when an edit makes it match, and once when a file is opened, so a mod never holds an entry that changes nothing. A variable of 0 on a function that doesn't read one is dropped in the same way.

A constant whose original varies between versions is removed only by an explicit revert.

### 5. Validation is table-driven and tested with shared mods

`validate` takes the catalog and reports all problems. Each `mod-format` rule has at least one mod in `test/fixtures/mods/valid` or `invalid`, with the expected problem paths, and whether the editor refuses the file, beside it. These fixtures are plain JSON with their own small fixture catalog, independent of any language.

*Alternative considered:* compiling the patcher's Rust validation to WebAssembly. One implementation is attractive, but it would add a compiler and binary to a project meant to have neither, and that code doesn't exist yet.

The fixtures are written so that the patcher can later run the same files, but this change doesn't alter the patcher.

### 6. Rendering with small functions and the DOM

There's no framework. A small `h(tag, attrs, children)` helper builds elements, and a panel is a function from state to elements. After a change, the active panel is rebuilt, and focus and scroll position are restored by field path. With data this size, full panel rebuilds are fast enough, and there's no diffing to maintain.

Standard controls do most of the work: `select`, `input`, `fieldset`, `dialog` and `details`. They bring keyboard behaviour and accessibility, and they're the least likely to change. The tree follows the WAI-ARIA tree pattern with its own arrow-key handling.

The styling is close to FireGraft's: grey panels with `fieldset` groups, black list and field backgrounds, and a coloured selected item, using system fonts. Colours are CSS variables. The layout targets desktop windows and scrolls below its minimum size.

### 7. Saving, drafts and storage

Opening uses `<input type=file>`, and saving always has a Blob download. Where `showSaveFilePicker` exists, Save writes straight to the chosen file. This matters for repeated test runs, and it's optional.

Drafts and imported assets go in IndexedDB, behind a small wrapper that falls back to memory for the session. `localStorage` is too small for icons. Each draft is written shortly after a change, with its catalog's game and the file name.

### 8. Assets are decoded in the browser and cached

```
Selected files --> find archives by name --> read needed files, in catalog priority order
  cmdicons.grp + palette --> one image per frame --> PNG blobs in IndexedDB
  stat_txt.tbl           --> array of strings      --> IndexedDB
```

`File.slice` reads only the archive header, tables and needed sectors, so large archives don't need to be loaded into memory. A folder comes from `<input webkitdirectory>`, which is widely supported, and picking individual files also works.

The decoders handle the MPQ header, encrypted hash and block tables, per-sector files and encrypted files. Zlib uses the browser's `DecompressionStream`, and PKWARE implode is a small hand-written decoder. Any other compression is a named error, unless checking real files shows it's needed.

Decoding yields to the event loop between steps, so the page stays responsive without a Web Worker, since workers are restricted on `file://`. Every length and offset read from a file is bounds-checked, so a bad file gives an error rather than a hang or huge allocation.

Only icons are cached as images, so the UI uses ordinary `<img>` tags with object URLs. Warcraft II's terrain-specific icons use the forest set for preview, as the catalog's `assets` names.

A `stat_txt.tbl` selected by itself goes straight to the TBL decoder, with no archive involved.

Shipped assets live in `assets/<game>/`: icons as image files, and strings as a classic script for the same `file://` reason as catalogs. Each lookup tries imported assets, then shipped ones, then a placeholder. A missing script or image only leads to the next step, so deleting the folder needs no other change.

### 9. Tests with no dependencies

A small harness provides `test`, `assertEqual` and a result list. `test/index.html` loads the app's scripts and all tests, including DOM tests against the real UI. This is the runner that needs nothing installed.

`test/run-node.js` runs core and asset tests from the command line, using only Node's standard library and `vm` to load the same classic scripts. It's a convenience: nothing requires it. It accepts `AXEGRAFT_EDITOR_GAME_DIR` for read-only checks against real game files, and it reports them as not checked when that isn't set.

Work is test-first, as in the patcher.

### 10. A wrapper stays possible

Because the app is static files that never call out, any later wrapper only has to open `index.html` in a web view. Nothing in the app assumes a wrapper, so none needs designing now.

### 11. Refused files, errors and warnings

Reading a file has two stages. The first checks the structure the editor needs in order to hold the file: JSON, header, property names and the shapes of arrays. Failing it refuses the file. Everything else goes into the document as written, so a bad value can be seen and fixed where it is, and `validate` reports it.

An error is anything the patcher's format rules reject, so errors block saving. A warning is valid for the format but looks wrong: an ID beyond the loaded assets, or something a game version lacks. Only warnings may depend on assets, which keeps a mod's validity independent of what's loaded.

### 12. Help text lives with what it describes

Game-specific help is in the catalog, because its wording depends on the game. Help for controls that are the same in every game is a table in `src/ui`, so it isn't repeated in each catalog or generated by the conversion tool. Each field and constant needs a help text. A function or opcode may add one for the current choice.

The `?` is a real `button` that shows the text on hover and on focus, which keeps it usable from the keyboard.

### 13. Keeping a later TUI possible

A terminal front end isn't planned, but this design shouldn't rule one out, as long as that doesn't make it clumsier. Two choices that are sensible anyway keep the option open: `src/core` holds what isn't about rendering, including building and filtering the tree, marking and selection, and storage sits behind a small wrapper. There's no generic UI description layer, because nothing needs one yet.

## Risks / Trade-offs

- **Two implementations of the mod format can drift** → The shared fixtures cover every `mod-format` scenario. The patcher running them is follow-up work, and until then, drift is caught only on the editor side.
- **The patcher spec may change before it's implemented** → Format limits and fields live in catalogs where possible, and rule changes affect only `src/core` and fixtures.
- **Catalog names may not match the patcher's** → Sample catalogs carry a visible notice. The conversion change has to produce both the catalog and the library's names from one source.
- **The prerequisite conversion may need format changes** → `catalogFormat` is versioned, and the catalog check is the single place that enforces it. The Appendix A and B formats were reviewed while designing this one.
- **A global namespace and manual script order are less tidy than modules** → This is accepted for `file://` support. A test checks that every source file is listed in `index.html`.
- **Browsers may restrict `file://` further in future** → Any static server gives the same app without a change, and the specs require that to keep working.
- **Browser storage can be cleared** → Assets can be imported again, and drafts are only a safety net: the saved file is the real copy.
- **Blizzard's MPQ variants may hold surprises** → Decoders are checked against the real archives during implementation, and failures are contained and named.
- **Icon colours may be wrong without the right palette** → This affects only the preview. See the open question.
- **Shipped assets aren't ours to license** → They stay optional and in one folder, so removing them means deleting that folder.
- **A mod's MPQ can extend the string table, so the loaded table may be too short** → That's why an ID beyond it is a warning, never an error, and users can import their own table.

## Open Questions

These can be answered during implementation without changing the specs, approach or tasks:

- **Palette source:** which game file gives the command icons their correct colours in each game. FireGraft ships its own `ticon.pal`, so the game may build this palette from another file. Task 8.6 checks this against real files, and the answer goes in the catalog's `assets`.
- **Exact archive set:** whether every supported version has all the archives listed in Context, or whether older versions need others. This is also catalog data.
