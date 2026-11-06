# Design

## Context

Requirement records already have a per-version original: `{ "default", "perVersion" }`, checked in `src/core/catalog.js` and read through `originalRecord` and `originalRecords` in `src/core/document.js`. The Requirements tab groups versions that share a record and shows one record per group.

Button sets read `set.original` directly in three places in `document.js`: `effectiveButtons`, `setButtons` (which drops a set that matches its original), and the tidying done when a file is opened. The Button Sets tab's "copy from" takes the original from a blank document's `effectiveButtons`. `compat.js` looks only at sets a mod defines, so it needs no change: a set the mod leaves alone keeps each version's original.

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

**"Copy original" asks for the version only when it matters.** For a set with one original, the control is the existing checkbox. For a set whose original differs, a version picker appears next to it, starting with the default. This keeps the common case unchanged.

**Ascending order is a `panel` flag.** `panel.ascending: true` is a property of the game's command panel, like `columns`, so it lives there. The check is a validation error, not a warning, because a list out of order makes the game's panel fill wrongly: its fill loop walks the list together with the panel's buttons. The sort is stable, so buttons sharing a position, such as the shield icons for each level, keep their order. The catalog check rejects original lists out of order, which catches extraction mistakes.

**Sample catalog shows both.** `catalog/sample-warcraft2.js` lists the five versions with 2.02's lists as the default, gives the Goblin Zeppelin set (or another set that differs) its DOS list, and sets `panel.ascending`. The full catalog is generated elsewhere and replaces it later.

## Risks / Trade-offs

- [A mod made for the BNE only is shown as changed on DOS versions] → The tab names the versions where the set differs, and the compatibility report is unchanged, so the user can see that the difference is only on versions they may not care about.
- [Existing catalogs with an unsorted list fail once `ascending` is set] → Only catalogs that set the flag are checked, and the Warcraft II sample is sorted when the flag is added.

## Migration Plan

No migration. Catalog format stays 1, because the plain array still means the same thing. Mods are unaffected.
