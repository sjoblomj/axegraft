# Design

## Context

Requirement records already have a per-version original: `{ "default", "perVersion" }`, checked in `src/core/catalog.js` and read through `originalRecord` and `originalRecords` in `src/core/document.js`. The Requirements tab groups versions that share a record and shows one record per group.

Button sets read `set.original` directly in three places in `document.js`: `effectiveButtons`, `setButtons` (which drops a set that matches its original), and the tidying done when a file is opened. `compat.js` looks only at sets a mod defines, so it needs no change: a set the mod leaves alone keeps each version's original.

## Goals / Non-Goals

**Goals:**
- One way to read a set's original for a version, used everywhere `set.original` is read now.
- The same shape and the same version grouping as requirement records, so the format has one pattern.

**Non-Goals:**
- Per-version unit fields or table entries. No game needs them yet.
- Showing in the editor which versions the patcher supports. The compatibility report keeps its note that the patcher decides.

## Decisions

**Same shape as requirement records.** `original` is either an array or `{ "default": [...], "perVersion": { "<version>": [...] } }`. The plain array stays, so StarCraft's catalog, which has no differing sets, doesn't change. A separate `originalPerVersion` property was considered, but it would give one idea two shapes in the format.

**Normalised when the catalog is loaded.** `catalog.js` turns both forms into one internal form: a default list and a map by version. `document.js` gets `originalButtons(cat, id, version)` and `originalButtonsByVersion(cat, id)`, mirroring `originalRecord` and `originalRecords`. Code that asks "is this the original?" compares against every version, so a set matching only some versions stays defined (the mod-files delta).

**Grouping shared with the Requirements tab.** The tab already groups consecutive versions with equal records. That grouping moves to a small helper that both tabs use, so the two show versions the same way.

**Reverting removes the set.** Reverting a set whose original differs by version removes it from the mod, so each version keeps its own original, rather than asking which version's list to copy. An earlier draft offered a version picker for "copy original"; it went when the tab's set actions moved under the item list.

**Ascending order applies to every game.** Both StarCraft and Warcraft II fill the command panel by walking a set's list together with the panel's positions, so the rule isn't a catalog setting. An earlier draft made it a `panel.ascending` flag; it was removed once the StarCraft executables showed the same fill loop. The check is a validation error, not a warning, because a list out of order makes the game's panel fill wrongly: its fill loop walks the list together with the panel's buttons. The sort is stable, so buttons sharing a position, such as the shield icons for each level, keep their order. The catalog check rejects original lists out of order, which catches extraction mistakes.

**The Warcraft II catalog shows both.** The catalog generated from the Rootstock lists the five versions with 2.02's lists as the default, and gives the sets that differ their DOS lists. It replaced the hand-written sample catalog this change first updated; the test fixture `test/fixtures/catalog-warcraft2.js` keeps that role in tests.

## Risks / Trade-offs

- [A mod made for the BNE only is shown as changed on DOS versions] → The tab names the versions where the set differs, and the compatibility report is unchanged, so the user can see that the difference is only on versions they may not care about.
- [Existing catalogs with an unsorted list fail once the order is checked] → Both generated catalogs are sorted, and the Rootstock's build runs the editor's catalog check.

## Migration Plan

No migration. Catalog format stays 1, because the plain array still means the same thing. Mods are unaffected.
