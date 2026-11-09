# Proposal

## Why

AxeGraft Patcher applies mods written as JSON, but writing that JSON by hand means knowing numeric IDs, function names and requirement opcodes, and retyping whole button sets and requirement records. Mod makers need a visual editor, in the spirit of FireGraft, that shows the original game data and produces a valid mod. It should still be easy to run in 20 years, so it has to depend on as little as possible.

## What Changes

- Add AxeGraft Editor, a web app written in plain JavaScript that runs by opening `index.html`. It has no server, build step, framework, library or package manager.
- Edit all four parts of a mod: Units, Button Sets, Requirements and Constants. The layout is close to FireGraft's: a unit tree on the left, a tab for each part on the right.
- Support StarCraft and Warcraft II BNE. Each game's differences come from its catalog, so Warcraft II has no Requirements tab.
- Create, open, validate and save format 1 mod files. A saved file contains only what differs from the original game. A malformed file is refused, while a file with bad values opens with those values marked as errors. A mod with errors is never saved.
- Show the original values, what the mod changes and, for each version, whether the mod would apply, be rejected or have constants skipped.
- Show real icons and strings, from assets shipped with the editor or read from the user's own game MPQs in the browser. The editor stays fully usable without any of them.
- Give each control in the tab panels a help text, shown from a `?` button beside it.
- Define the catalog format the editor reads. A small hand-written sample catalog for each game lets the editor be built and tested. (The complete catalogs, generated from the Rootstock, have since replaced the samples.)

Out of scope:

- Converting the StarCraft data file and the Warcraft II data file into complete catalogs, which is a separate prerequisite change for editing all game data. Until then, the editor marks sample catalogs clearly as incomplete. (That conversion is done: the Rootstock generates both catalogs.)
- A native application wrapper. The editor must not rule one out, but the browser comes first.
- Packing mods into MPQs, editing strings or icons, and running the game.
- Support for older browsers.

## Capabilities

### New Capabilities

- `editor-runtime`: How the editor starts and what it may depend on, so it keeps working over the long term.
- `game-catalog`: The per-game data the editor reads, and how a missing or malformed catalog is handled.
- `mod-files`: Creating, opening, validating and saving mods, plus drafts and undo.
- `editor-navigation`: The tabs, item tree, filtering, help for controls, and the marking of changed items, errors and warnings.
- `unit-editing`: Changing a unit's button set and status panel settings.
- `button-set-editing`: Changing a button set's buttons, with a preview of the panel.
- `requirement-editing`: Changing requirement records for StarCraft.
- `constant-editing`: Changing numeric constants and named options.
- `version-compatibility`: Reporting how a mod behaves on each version of its game.
- `game-assets`: Optional shipped icons and strings, and importing them from the user's game files.

### Modified Capabilities

None. This is the editor's first functionality.

## Impact

- **New code:** `editor/` holds only OpenSpec files so far. This adds the app, its tests and its documentation there.
- **Dependencies:** none at run time. A browser is all a user needs. Node is used only for the optional command-line test runner.
- **Mod format:** the editor implements the rules in the patcher's `mod-format` spec, in a second language. Shared test mods reduce the risk of the two drifting apart, because the patcher has no code yet to reuse.
- **Catalog names:** function, opcode and constant names must match the patcher's library, which doesn't exist yet. The conversion change needs to use one set of names for both.
- **Game files:** read only, and only when the user selects them. Nothing is uploaded.
- **Shipped assets:** any icons and strings in the repository are Blizzard's. They're publicly available, but that doesn't make them licensed for redistribution, so they stay in a separate folder that can be deleted.
