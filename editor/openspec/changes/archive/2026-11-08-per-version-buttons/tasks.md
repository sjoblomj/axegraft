# Tasks

Work test-first: for each task, write the failing tests, then the code.

## 1. Catalog

- [x] 1.1 Accept `{ "default", "perVersion" }` as a button set's `original` in `src/core/catalog.js`, checking every list as a plain list is checked now and rejecting unknown versions, and normalise both forms; verify with tests in `test/core/catalog.test.js` for the plain form, the per-version form and an unknown version
- [x] 1.2 Reject original lists out of order; verify with catalog tests for a sorted list, shared positions, and a list out of order
- [x] 1.3 Document both in `docs/catalog-format.md`, extend the example in it and `test/fixtures/catalog-example.js` with a per-version set, and verify the existing test that the two agree and pass still passes

## 2. Document model

- [x] 2.1 Add `originalButtons(cat, id, version)` and `originalButtonsByVersion(cat, id)` to `src/core/document.js`, and use them in `effectiveButtons`, `setButtons` and the tidying on load, so a set is dropped only when it matches every version; verify the mod-files scenarios in `test/core/document.test.js`
- [x] 2.2 Add the position-order error to `src/core/validate.js` naming the set and the first button out of order; verify the "Out of order in Warcraft II" and "Shared positions" scenarios, and that saving is blocked
- [x] 2.3 Add a stable sort-by-position operation as one undoable change; verify the "Sorting" scenario and undo in `test/core/document.test.js`

## 3. Button Sets tab

- [x] 3.1 Move the Requirements tab's grouping of versions with equal originals into a shared helper, and use it in both tabs; verify the existing requirements tests still pass
- [x] 3.2 Show the original of each version group in the Button Sets tab, and name the versions where a defined set differs from the original; verify the "Original buttons shown by version" and "Changes compared with every version's original" scenarios in `test/ui/units-sets.test.js`
- [x] 3.3 Revert a set whose original differs by version by removing it from the mod, so each version keeps its own original; verify the "Reverting a set that differs by version" scenario. (This replaced a version picker for "copy original", which went when the Button Sets tab's set actions moved under the item list.)
- [x] 3.4 Add Sort by position to the tab, shown only for a set out of order; verify in a UI test that it appears in both games only then, and fixes the error

## 4. Warcraft II catalog

- [x] 4.1 Update the Warcraft II catalog (then `catalog/sample-warcraft2.js`, since replaced by `catalog/warcraft2.js`, generated from the Rootstock): add versions 1.3, 1.33 and 1.5 before 2.00, use the reference's function names, and give a set that differs on the DOS versions its DOS list from the Warcraft II data file's appendix; verify it passes the catalog check and its values match the reference
- [x] 4.2 Check by hand in Firefox and Chromium that the Button Sets tab shows both originals for that set, that the compatibility report lists the DOS versions, and that the report's note about the patcher is visible

## Workflow follow-up

- Archive `add-axegraft-editor` before archiving this change, since this change adds requirements to its capabilities.
