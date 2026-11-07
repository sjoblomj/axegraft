# Proposal

## Why

The full Warcraft II catalog will cover the DOS versions (1.3, 1.33 and 1.5) as well as the Battle.net Edition (2.00 and 2.02), and the original command lists differ between them. 2.00 and 2.02 add a Patrol button to four lists, change two icons and use another condition in the two group lists. Catalog format 1 gives a button set one original list, so it can't record that. The references also confirm that both games need each command list in ascending position order, which neither the format nor the editor checks yet.

## What Changes

- A button set's `original` may hold a per-version form, `{ "default": [...], "perVersion": { "<version>": [...] } }`, like requirement records. The plain array stays valid and means the same list on every version, so existing catalogs keep working.
- The editor compares, reverts and reports against each version's own original list. A set that a mod defines is kept in the mod unless it matches the original on every version.
- The Button Sets tab shows the original list of each group of versions where they differ, as the Requirements tab already does for records.
- The buttons of a set must be in ascending position order (equal positions allowed), in every game. A set that isn't is an error, with a way to sort it.
- The format document describes both, and the Warcraft II sample catalog shows them: 2.02's lists are the default, the DOS versions are listed, and the sets that differ give them their own lists.
- Supporting a version in the catalog doesn't mean AxeGraft Patcher supports it. The DOS versions are for editing only, and the compatibility report's existing note about this stays.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `game-catalog`: original buttons may differ by version; original buttons must be in ascending position order.
- `button-set-editing`: the tab shows per-version originals and enforces and fixes ascending order.
- `mod-files`: a defined set is dropped only when it matches the original on every version.

These capabilities are defined in the in-progress change `add-axegraft-editor`, which hasn't been archived. This change adds requirements to them, so it should be archived after that one.

## Impact

- `src/core/catalog.js`: checking the new `original` form and the position order of original lists.
- `src/core/document.js`: an original-buttons lookup by version, used where `set.original` is read now (`effectiveButtons`, `setButtons`, tidying on load).
- `src/core/validate.js`: the position-order error.
- `src/ui/buttonsets-tab.js`: per-version original display and a Sort by position action.
- `docs/catalog-format.md`, `catalog/sample-warcraft2.js`, `test/fixtures/catalog-example.js` and tests.
- Mods don't change: they never name a version, and the mod format stays at 1.
