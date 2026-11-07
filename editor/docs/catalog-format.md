# Catalog format

A catalog holds everything AxeGraft Editor knows about one game: its versions, ID ranges, button fields, engine behaviour names, game content, original values and help texts. The editor has no game-specific code, so replacing a catalog with a more complete one in this format needs no other change.

This document is precise enough for a conversion tool to target. `src/core/catalog.js` is the one place that enforces it, and its messages name the catalog and each problem.

## The file

A catalog is a classic script holding one call:

```js
AxeGraft.registerCatalog({ ...JSON... });
```

Everything between the parentheses is strictly JSON: double-quoted names, no comments, no trailing commas and no JavaScript expressions. A tool can write a catalog by adding the wrapper around JSON, and read one by removing the leading `AxeGraft.registerCatalog(` and the trailing `);`. The wrapper exists only because browsers don't let a page `fetch` local files opened from `file://`.

`index.html` lists each catalog script with an error handler:

```html
<script src="catalog/starcraft.js" onerror="AxeGraft.catalogMissing(this.src)"></script>
```

A catalog that is missing, can't be run or fails the check only removes its game. The editor reports the catalog's name and every problem, and the other games stay usable. Only one catalog per game may be loaded.

## Format version 1

The editor reads `catalogFormat` 1 for mods of `modFormat` 1. A catalog of another format is refused as a whole, with no further checks.

### Top level

| Property        | Required                   | Meaning                                                                                                                   |
| --------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `application`   | No                         | Always `"AxeGraft"`. It tells anyone reading the file what it's for. The editor ignores it.                               |
| `catalogFormat` | Yes                        | `1`.                                                                                                                      |
| `modFormat`     | Yes                        | The mod format the catalog describes: `1`.                                                                                |
| `game`          | Yes                        | The mod's `game`: `"starcraft"` or `"warcraft2"`.                                                                         |
| `title`         | Yes                        | The game's name as the editor shows it.                                                                                   |
| `sample`        | No                         | `true` for a catalog that holds only part of the game. The editor shows a notice while it's used. Defaults to `false`.    |
| `parts`         | Yes                        | The mod parts the game has, from `"units"`, `"button_sets"`, `"requirements"` and `"constants"`. One tab is shown for each. |
| `versions`      | Yes                        | Every version, oldest first, as `{ "id", "label" }`. Mods never name a version; the editor uses these for its compatibility report. |
| `limits`        | Yes                        | ID ranges and field limits. See [Limits](#limits).                                                                        |
| `panel`         | Yes                        | `{ "columns": n, "ascending": true }`: the command panel's width, and whether the game needs each set's buttons in ascending position order. Positions fill it row by row, from the lowest position. See [Button sets](#button-sets). |
| `buttonFields`  | Yes                        | The fields of a button. See [Button fields](#button-fields).                                                              |
| `unitFields`    | Yes                        | The fields of a unit entry. See [Unit fields](#unit-fields).                                                              |
| `functions`     | Yes                        | Conditions, actions and status functions. See [Functions](#functions).                                                    |
| `opcodes`       | With requirements          | Requirement opcodes. See [Requirements](#requirements).                                                                   |
| `bareUnit`      | With requirements          | `{ "label", "help" }` for the row that holds a bare unit ID.                                                              |
| `units`         | Yes                        | Every entry of the button table. See [Units](#units).                                                                     |
| `buttonSets`    | Yes                        | Every original button set. See [Button sets](#button-sets).                                                               |
| `upgrades`, `techs`, `orders` | No           | Named items: `{ "id", "name", "tree" }`. An ID with no entry is still valid within its range, and is shown by number.     |
| `requirements`  | With requirements          | Original requirement records. See [Requirements](#requirements).                                                          |
| `constants`     | With constants             | See [Constants](#constants).                                                                                              |
| `icons`, `strings` | No                      | Names by ID, as `{ "228": "Move" }`. IDs without a name are still valid within the field's limit.                         |
| `assets`        | No                         | Where the game keeps its icons and strings. See [Assets](#assets).                                                        |

Any other property is an error, so a misspelt name is caught rather than ignored.

A `tree` is a list of group names, from the outermost, such as `["Terran", "Ground Units"]`. The editor's item list uses it.

### Limits

Each limit is `{ "min", "max" }`, inclusive, with whole numbers.

| Limit               | Required                         | Meaning                                                                          |
| ------------------- | -------------------------------- | -------------------------------------------------------------------------------- |
| `unit`              | Yes                              | Unit IDs. Table entries in this range are units and have status fields.          |
| `tableEntry`        | Yes                              | Entries of the button table. `unit` must lie within it.                          |
| `buttonSet`         | Yes                              | Every button set ID a mod may use.                                               |
| `newButtonSet`      | Yes                              | IDs for sets a mod adds. It starts at the table's size, `tableEntry.max + 1`, and ends within `buttonSet`. |
| `icon`, `string`    | Yes                              | The field sizes of icon and string IDs. Any ID within them is valid, named or not. |
| `position`          | Yes                              | Button positions.                                                                |
| `conditionVariable`, `actionVariable` | Yes            | The field sizes of the two variables.                                            |
| `tech`, `upgrade`, `order` | When used                 | Needed by any function variable, opcode parameter, named list, requirement record or constant that refers to them. A game with requirements needs all three. |

### Button fields

`buttonFields` lists a button's fields, in the order the editor shows them and saves them. Each is:

```json
{ "name": "enabled_string", "label": "Enabled string", "kind": "string", "required": true, "help": "..." }
```

`name` is the name mods use. `kind` is one of:

| Kind                | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| `position`          | A position within `limits.position`.                                       |
| `icon`              | An icon ID within `limits.icon`.                                           |
| `string`            | A string ID within `limits.string`. A game may have several string fields. |
| `condition`         | A condition's name.                                                        |
| `conditionVariable` | The condition's variable. Never required: left out, it's 0.                |
| `action`            | An action's name.                                                          |
| `actionVariable`    | The action's variable. Never required: left out, it's 0.                   |
| `choice`            | One of `options`, each `{ "value", "label" }`, such as Warcraft II's `highlighted`. |

There must be exactly one field of each kind except `string` and `choice`. Every field needs a `label` and a `help` text.

### Unit fields

`unitFields` lists the fields of a unit entry, each `{ "name", "label", "kind", "help" }`. `kind` is one of these, each at most once, and `buttonSet` is required:

- `buttonSet`: the set of buttons the entry shows, or `null` for none.
- `tableEntry`: another table entry, or `null` for none, such as the entry StarCraft treats as equivalent in a mixed group.
- `statusChanged`, `statusUpdate`: a status function, by name.
- `unit`: a unit ID.
- `icon`: an icon ID, within `limits.icon`.
- `string`: a string ID, within `limits.string`.
- `choice`: one of the field's `options`, each `{ "value", "label" }` with a whole number value.

A table entry outside `limits.unit` has only the `buttonSet` field. The editor shows `buttonSet` and `tableEntry` fields as the button table entry, and the others as the status panel.

### Functions

`functions` has four lists, `conditions`, `actions`, `statusChanged` and `statusUpdate`. Each function is:

```json
{ "name": "order_research", "label": "Research", "variable": "tech", "absentOn": ["1.05"], "help": "..." }
```

- `name` is the name mods use. Names must be unique within a list, and should be unique across all four, as the patcher's library requires.
- `variable` is the type the function reads: `"unit"`, `"tech"`, `"upgrade"`, `"number"`, `"tableEntry"`, or `null` for none. Status functions read none. A function that reads a variable must be given one in a mod, within the range of its type. For `number` that's the variable field's own limit.
- `absentOn`, optional, lists the versions that lack the function.
- `help`, optional, explains the function when it's chosen.

### Units

`units` lists every entry of the button table, including those that aren't units:

```json
{ "id": 0, "name": "Terran Marine", "tree": ["Terran", "Ground Units"], "icon": 0, "absentOn": [],
  "original": { "button_set": 0, "status_changed": "statdraw_query_unit", "status_update": "statdraw_draw_unit", "status_unit_type": 0 } }
```

`icon`, optional, is the icon that shows the unit, such as on the button that trains it. The editor shows it beside the unit's name when icons are available. In StarCraft it's the unit's ID. A game whose unit entries hold the icon, as Warcraft II's do, has a unit field of kind `icon` instead, and its icon is that field's original value; the editor then shows it with the field rather than beside the name.

`original` holds the original value of each unit field, by the field's name. An entry outside `limits.unit` has only the button set field. A `button_set` of `null` means no buttons. `absentOn`, optional, lists the versions that lack the entry.

A catalog that isn't a sample must list every entry from `limits.tableEntry.min` to `max`.

### Button sets

A button set is one array of buttons in the game. Any number of table entries can point at it.

```json
{ "id": 0, "name": "Marine", "tree": ["Terran"], "entries": [0, 10, 20, 32], "absentOn": [],
  "original": [ { "position": 1, "icon": 228, "condition": "bf_always", "action": "order_move", "enabled_string": 664, "disabled_string": 0 } ] }
```

- `id` is the lowest entry in `entries`, which lists every table entry that points at this array.
- Each entry in `entries` must be in `units`, with this set as its original button set, and every unit's original set must list it back.
- `original` holds the buttons in the same shape as a mod's buttons, so comparing and copying are plain JSON comparisons. A variable of 0 on a function that reads none is left out.
- `absentOn`, optional, lists the versions that lack the set.

When the original buttons differ between versions, `original` takes the same form as a requirement record's, instead of a list:

```json
"original": { "default": [ ... ], "perVersion": { "1.07": [ ... ] } }
```

`default` is the list on every version that `perVersion` doesn't name. `perVersion`, optional, gives a different list for the versions it names, which must be listed in `versions`. A plain list means the same as `{ "default": list }`. Mods don't change: a mod's set holds one list, applied on every version, and it counts as unchanged only if it matches the original on every version.

`panel.ascending`, optional, is `true` for a game whose command panel fills from a set in list order and needs its buttons in ascending position order, such as Warcraft II. Buttons may share a position. Every original list must then be in that order, and the editor treats a mod's set out of order as an error. It defaults to `false`, and buttons may be in any order.

### Requirements

A game with `requirements` in `parts` needs `opcodes`, `bareUnit` and `requirements`.

Each opcode is:

```json
{ "name": "current_unit_is", "label": "Current unit is", "parameter": "unit", "allowedIn": ["unit", "upgrade"], "role": "or", "help": "..." }
```

- `parameter` is the kind of the number that follows it: `"unit"`, `"tech"`, `"upgrade"`, `"order"`, or `null` for none.
- `allowedIn` lists the record types it may be used in: `"unit"`, `"upgrade"`, `"tech_research"`, `"tech_use"` and `"order"`.
- `role`, optional, marks the opcodes that give a list its structure. Exactly one has `"or"` and exactly one has `"endSublist"`. Those with `"level"` start an upgrade level's sublist, which runs to the `endSublist` opcode or to the end of the record. Opcodes with a role take no parameter.
- `help` is optional.

`bareUnit` describes a number on its own in a list, which the game reads as "a completed unit of this type must exist".

Each original record is:

```json
{ "type": "order", "id": 73, "original": { "default": ["current_unit_is", 41], "perVersion": { "1.16": null } } }
```

`default` is the record as a mod's `list` would hold it, or `null` if the item has no record. `perVersion`, optional, gives a different record, or `null`, for the versions listed. An item with no entry has no record on any version.

### Constants

Each constant is:

```json
{ "name": "max_supply", "label": "Maximum supply", "group": ["Game", "Supply"], "kind": "number",
  "range": { "min": 0, "max": 65535 }, "refers": "unit", "note": "...", "help": "...",
  "availability": { "1.05": 400, "1.10": "unknown", "1.11": "not_applicable" } }
```

- `name` is the name mods use, and `label` the name the editor shows, under the groups in `group`.
- `kind` is `"number"`, with a `range`, or `"option"`, with at least two `options`, each `{ "name", "label", "help" }`. `help` is optional for an option.
- `refers`, optional for a number, says the value is an ID: `"unit"`, `"tech"`, `"upgrade"`, `"order"` or `"tableEntry"`. The editor then offers those items by name.
- `note`, optional, explains the stored scale, such as half supply units, or how the game stores the value where some places hold it negated or offset. Values are always edited and saved in the stored scale; converting them for those places is the patcher's business.
- `availability` must name every version. Its value is the original value there, the original option's name for an option, `"unknown"` when the constant hasn't been found on that version, or `"not_applicable"` when the code doesn't exist there. The patcher skips the constant on those last two.

A catalog holds no addresses, expected bytes or encodings. Those are the patcher's library's business.

### Assets

```json
{ "archives": ["patch_rt.mpq", "broodat.mpq", "stardat.mpq"],
  "icons": {
    "file": "unit\\cmdbtns\\cmdicons.grp",
    "palette": { "file": "tileset\\badlands.wpe", "format": "wpe", "remap": "unit\\cmdbtns\\ticon.pcx" }
  },
  "strings": { "file": "rez\\stat_txt.tbl" } }
```

- `archives` lists the archive names to look for when importing from a game folder, highest priority first, as the game searches them. Within an archive, the US English copy of a file is used, else the language-neutral one; copies in other languages are skipped, as the game skips them.
- `icons.file` is a GRP file inside those archives, and `strings.file` a string table.
- `icons.palette` says which palette colours the icons. `format` is `pal` (768 bytes of RGB), `wpe` (1024 bytes of RGB and padding), `ppl` (768 bytes of 6-bit RGB, as Warcraft II stores them) or `pcx` (the palette at the end of a PCX image).
- `icons.palette.remap`, optional, names an 8-bit PCX image whose first row maps the icons' colours to the palette: colour *i* is palette entry *remap[i]*. StarCraft colours its command icons this way, through `unit\cmdbtns\ticon.pcx`.

Which files these are was found by reading the real archives:

| Game                       | Archives, highest priority first          | Icons                                   | Palette                                                         | Strings             |
| -------------------------- | ----------------------------------------- | --------------------------------------- | --------------------------------------------------------------- | ------------------- |
| StarCraft: Brood War       | `patch_rt.mpq`, `broodat.mpq`, `stardat.mpq` | `unit\cmdbtns\cmdicons.grp`, 36 by 34   | `tileset\badlands.wpe`, remapped by `unit\cmdbtns\ticon.pcx`  | `rez\stat_txt.tbl` |
| Warcraft II: Battle.net Edition | `war2patch.mpq`, `war2dat.mpq`        | `Art\unit\Portrait\portrait.grp`, 46 by 38 | `Art\bgs\Forest\forest.ppl`                               | `rez\stat_txt.tbl` |

Every StarCraft tileset palette gives the command icons the same colours, which also match FireGraft's `ticon.pal`. Warcraft II keeps one set of icons per terrain (`portrait.grp` for forest, and `l_port.grp`, `s_port.grp` and `x_port.grp`); the editor shows the forest set. Both games' string IDs count from 1, and a string runs to where the next one starts, because button strings hold a NUL between their hotkey and their text.

### Help texts

Every button field, unit field and constant needs a `help` text, and so does `bareUnit` where the game has requirements. Functions, opcodes and options may have one. Help for controls that are the same in every game is part of the editor, not the catalog.

## Example

This small catalog passes the check. The same JSON is in `test/fixtures/catalog-example.js`, and a test checks that the two agree and that it passes.

<!-- example:start -->
```json
{
  "application": "AxeGraft",
  "catalogFormat": 1,
  "modFormat": 1,
  "game": "starcraft",
  "title": "StarCraft example",
  "sample": true,
  "parts": ["units", "button_sets", "requirements", "constants"],
  "versions": [
    { "id": "1.07", "label": "1.07" },
    { "id": "1.16.1", "label": "1.16.1" }
  ],
  "limits": {
    "unit": { "min": 0, "max": 227 },
    "tableEntry": { "min": 0, "max": 249 },
    "tech": { "min": 0, "max": 43 },
    "upgrade": { "min": 0, "max": 60 },
    "order": { "min": 0, "max": 188 },
    "buttonSet": { "min": 0, "max": 999 },
    "newButtonSet": { "min": 250, "max": 999 },
    "icon": { "min": 0, "max": 65535 },
    "string": { "min": 0, "max": 65535 },
    "position": { "min": 1, "max": 9 },
    "conditionVariable": { "min": 0, "max": 255 },
    "actionVariable": { "min": 0, "max": 65535 }
  },
  "panel": { "columns": 3 },
  "buttonFields": [
    { "name": "position", "label": "Position", "kind": "position", "required": true, "help": "Slot 1-9 in the 3 by 3 panel." },
    { "name": "icon", "label": "Icon", "kind": "icon", "required": true, "help": "Frame of cmdicons.grp." },
    { "name": "condition", "label": "Condition", "kind": "condition", "required": true, "help": "Decides whether the button shows." },
    { "name": "condition_variable", "label": "Condition variable", "kind": "conditionVariable", "required": false, "help": "Passed to the condition, as a byte." },
    { "name": "action", "label": "Action", "kind": "action", "required": true, "help": "Runs when the button is used." },
    { "name": "action_variable", "label": "Action variable", "kind": "actionVariable", "required": false, "help": "Passed to the action." },
    { "name": "enabled_string", "label": "Enabled string", "kind": "string", "required": true, "help": "Tooltip of the button." },
    { "name": "disabled_string", "label": "Disabled string", "kind": "string", "required": true, "help": "Shown when the button is greyed out." }
  ],
  "unitFields": [
    { "name": "button_set", "label": "Button set", "kind": "buttonSet", "help": "The buttons this entry shows." },
    { "name": "status_changed", "label": "Status changed", "kind": "statusChanged", "help": "Decides whether to redraw the status panel." },
    { "name": "status_update", "label": "Status update", "kind": "statusUpdate", "help": "Draws the status panel." },
    { "name": "status_unit_type", "label": "Status unit type", "kind": "unit", "help": "Unit ID in the status entry." }
  ],
  "functions": {
    "conditions": [
      { "name": "bf_always", "label": "Always", "variable": null },
      { "name": "bf_has_spell", "label": "Has tech", "variable": "tech", "help": "Shows the button once the tech is researched." }
    ],
    "actions": [
      { "name": "order_move", "label": "Move", "variable": null },
      { "name": "order_stim", "label": "Stim", "variable": null },
      { "name": "statcmd_set_ctrl", "label": "Show table entry", "variable": "tableEntry" }
    ],
    "statusChanged": [{ "name": "statdraw_query_unit", "label": "Unit", "variable": null }],
    "statusUpdate": [{ "name": "statdraw_draw_unit", "label": "Unit", "variable": null }]
  },
  "opcodes": [
    { "name": "or", "label": "Or", "parameter": null, "role": "or", "allowedIn": ["unit", "upgrade", "tech_research", "tech_use", "order"] },
    { "name": "current_unit_is", "label": "Current unit is", "parameter": "unit", "allowedIn": ["unit", "upgrade", "tech_research", "tech_use", "order"] },
    { "name": "must_have", "label": "Must have", "parameter": "unit", "allowedIn": ["unit", "upgrade", "tech_research", "tech_use", "order"] },
    { "name": "upgrade_level_1", "label": "Level 1 requires", "parameter": null, "role": "level", "allowedIn": ["upgrade"] },
    { "name": "end_sublist", "label": "End of level", "parameter": null, "role": "endSublist", "allowedIn": ["upgrade"] }
  ],
  "bareUnit": { "label": "Completed unit", "help": "A completed unit of this type must exist." },
  "units": [
    {
      "id": 0, "name": "Terran Marine", "tree": ["Terran", "Ground Units"],
      "original": { "button_set": 0, "status_changed": "statdraw_query_unit", "status_update": "statdraw_draw_unit", "status_unit_type": 0 }
    },
    {
      "id": 32, "name": "Terran Firebat", "tree": ["Terran", "Ground Units"],
      "original": { "button_set": 0, "status_changed": "statdraw_query_unit", "status_update": "statdraw_draw_unit", "status_unit_type": 32 }
    },
    { "id": 228, "name": "No buttons", "tree": ["Other"], "original": { "button_set": null } }
  ],
  "buttonSets": [
    {
      "id": 0, "name": "Marine", "tree": ["Terran"], "entries": [0, 32],
      "original": {
        "default": [
          { "position": 1, "icon": 228, "condition": "bf_always", "action": "order_move", "enabled_string": 664, "disabled_string": 0 },
          { "position": 7, "icon": 237, "condition": "bf_has_spell", "condition_variable": 0, "action": "order_stim", "enabled_string": 334, "disabled_string": 346 }
        ],
        "perVersion": {
          "1.07": [
            { "position": 1, "icon": 228, "condition": "bf_always", "action": "order_move", "enabled_string": 664, "disabled_string": 0 }
          ]
        }
      }
    }
  ],
  "techs": [{ "id": 0, "name": "Stim Packs", "tree": ["Terran"] }],
  "requirements": [
    { "type": "unit", "id": 0, "original": { "default": ["current_unit_is", 111, "or", "must_have", 112] } },
    { "type": "order", "id": 73, "original": { "default": ["current_unit_is", 41], "perVersion": { "1.16.1": null } } }
  ],
  "constants": [
    {
      "name": "max_supply", "label": "Maximum supply", "group": ["Game", "Supply"], "kind": "number",
      "range": { "min": 0, "max": 65535 }, "note": "Stored in half supply units.", "help": "The supply cap of each player.",
      "availability": { "1.07": 400, "1.16.1": 400 }
    },
    {
      "name": "permanent_cloak_energy", "label": "Cloaked units regain energy", "group": ["Units"], "kind": "option",
      "options": [{ "name": "no_regain", "label": "Don't regain energy" }, { "name": "regain_energy", "label": "Regain energy" }],
      "help": "Whether permanently cloaked units regain energy.",
      "availability": { "1.07": "unknown", "1.16.1": "no_regain" }
    }
  ],
  "icons": { "228": "Move", "237": "Use Stim Packs" },
  "strings": { "664": "Move" },
  "assets": { "archives": ["patch_rt.mpq", "broodat.mpq", "stardat.mpq"], "strings": { "file": "rez\\stat_txt.tbl" } }
}
```
<!-- example:end -->
