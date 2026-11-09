# AxeGraft mod format

An AxeGraft mod is a JSON file that says what to change in StarCraft or Warcraft II: Battle.net Edition: which buttons units have, how their status panels are drawn, what they require, and the game's constants. AxeGraft Patcher reads the mod when the game starts, works out where each change goes in the running version, checks the whole mod, and only then changes the game's memory. It never changes files on disk.

This is format version 1. AxeGraft Editor reads and writes it.

## A first mod

```json
{
  "patcher": "AxeGraft",
  "format": 1,
  "game": "starcraft",
  "mod": {"name": "Bigger armies", "version": "1.0", "authors": ["Alice"]},
  "constants": [
    {"name": "max_supply", "value": 600}
  ]
}
```

This raises StarCraft's supply limit. The value is in the game's own unit, which for supply is half a supply point, so 600 is a limit of 300.

## The rules in short

- A mod refers to **game content** (units, upgrades, techs, orders, button sets, icons and strings) by number, and to **engine behaviour** (conditions, actions, status functions, requirement opcodes and constants) by name.
- A mod never contains addresses or bytes. Where each change goes on each game version is known to AxeGraft Patcher, not to the mod, so one mod works on every supported version.
- Every object may hold only the fields this document defines. An unknown field is an error, so a misspelt field is never silently ignored.
- AxeGraft Patcher checks everything before changing anything, and reports every problem it finds, each with where it is, such as `button_sets[0].buttons[2].action_variable`. If there's any problem, the game closes and nothing is changed.

## The file

The file is UTF-8 JSON. A byte order mark at the start is allowed, as Notepad writes one. The top level is an object, and the order of its properties doesn't matter.

| Property | Required | What it holds |
| --- | --- | --- |
| `patcher` | yes | Always `"AxeGraft"`, so that anyone opening the file can tell what it is. |
| `format` | yes | The format version, `1`. |
| `game` | yes | `"starcraft"` or `"warcraft2"`. A mod never names a game version. |
| `mod` | no | Information about the mod for people. |
| `labels` | no | Names an editor shows. AxeGraft Patcher ignores it. |
| `units` | no | Changes to entries of the game's button table. |
| `button_sets` | no | Button sets to replace or add. |
| `requirements` | no | StarCraft only. Requirement records to replace. |
| `constants` | no | Constants to change. |

Any of the four parts may be left out, which is the same as an empty array.

### `mod`

`name` and `version` are strings and `authors` an array of strings. Any of them may be missing or empty, and `mod` may hold other properties of any kind, such as a website. Nothing in `mod` has any effect.

### `label` and `labels`

Every entry of the four parts, and every button, may have a string `label` that describes it. Labels have no effect. The top level may not have a `label`.

`labels` holds the names an editor shows for items in place of their usual ones, such as `"labels": {"units": {"0": "Rifleman"}}`. AxeGraft Patcher doesn't look inside it, so its contents may be anything.

## Button cards and button sets

Each game has a button table: StarCraft has 250 entries, `gCards`, and Warcraft II has 120 command lists. Entries 0 to 227 in StarCraft, and 0 to 109 in Warcraft II, are units. The others are menus and special cases, such as StarCraft's worker build menus (entries 238 to 243) and Warcraft II's build menus (111 to 114).

Each entry points at an array of buttons, and several entries can point at the same array. A **button set** is one such array. An original set's ID is the lowest entry that points at it: StarCraft's Marine set is set 0, and entries 0, 10, 20 and 32 (the Marine, Gui Montag, Jim Raynor and the Firebat) all use it, so there is no set 10, 20 or 32. StarCraft's entries are numbered as they are from 1.12 on; AxeGraft Patcher translates the numbers for older versions.

A mod's new sets take IDs from the table's size up to 999: 250 to 999 in StarCraft, and 120 to 999 in Warcraft II. A new set's ID never looks like a unit's entry.

## `units`

Each entry changes some fields of one button card.

| Field | Games | What it holds |
| --- | --- | --- |
| `id` | both | The button card. Required. |
| `button_set` | both | The set whose buttons this entry shows: an original set, a set this mod defines, or `null` for no buttons. |
| `status_changed` | both | The function that decides whether the status panel needs redrawing. It must be a status changed function. |
| `display_function` | both | The function that draws the status panel. It must be a display function. |
| `connected_unit` | StarCraft | The entry treated as the same in a mixed group, or `null` for none. |
| `debug_id` | StarCraft | The unit ID in the unit's status entry. |
| `icon` | Warcraft II | The unit's icon, 0 to 65535. |
| `stats_frame` | Warcraft II | The frame shown behind the stats, 0 to 3. |
| `name_string` | Warcraft II | The string shown as the unit's name, 0 to 65535. |

An entry must change at least one field. Entries that aren't units, such as the build menus, can only have `button_set`. Fields left out keep their original values. Two entries may change the same unit as long as they change different fields.

`button_set` takes the set as the mod defines it, if the mod replaces it. Assignments don't affect each other: giving unit 0 set 5 and unit 5 set 7 gives unit 0 set 5's buttons, whatever unit 5 gets.

Icons and strings beyond the game's originals are allowed, because an MPQ can add more.

## `button_sets`

Each entry replaces a set's buttons entirely, or defines a new set.

| Field | What it holds |
| --- | --- |
| `id` | An original set's ID, or a new set's, from the table's size up to 999. |
| `buttons` | The set's buttons, in ascending order of position. May be empty. |

Replacing an original set changes every entry that uses it, unless the mod gives that entry another set. A new set reaches only the entries the mod assigns it to. A set may have more buttons than the original.

### Buttons

| Field | Games | What it holds |
| --- | --- | --- |
| `position` | both | The slot in the command panel: 1 to 9 in StarCraft, 0 to 8 in Warcraft II, left to right and top to bottom. |
| `icon` | both | The icon, 0 to 65535. |
| `condition` | both | The function that decides whether the button shows. |
| `condition_variable` | both | The value passed to the condition. 0 to 255. |
| `action` | both | The function that runs when the button is used. |
| `action_variable` | both | The value passed to the action. 0 to 65535 in StarCraft, 0 to 255 in Warcraft II. |
| `enabled_string` | StarCraft | The string shown while the button is enabled, 0 to 65535. |
| `disabled_string` | StarCraft | The string shown while it's disabled, or 0 for none. |
| `string` | Warcraft II | The string shown at the bottom of the screen, 0 to 65535. |
| `highlighted` | Warcraft II | The order the button highlights while units carry it out: 0 for none, or exactly one of 1 (Stop), 2 (Move), 4 (Patrol), 8 (Attack), 16 (Stand Ground), 32 (Attack Ground), 64 (Harvest), 128 (Return with Goods) and 256 (Repair). |

All are required except the two variables.

**Variables.** Some functions read their variable as a unit, tech, upgrade, order, number or button card. Such a function must be given a variable of that kind: `research_tech` needs a tech, and StarCraft's `show_button_card`, which opens another menu, needs a button card. A function that doesn't read its variable may be given any value that fits the field, which is written as given, and a variable left out is 0. StarCraft reads the condition variable as a byte, so it can't be above 255. In Warcraft II, a tech is a spell bit, 0 to 20, and an order is an action, 0 to 60.

**Opening a menu.** A button that opens another set of buttons names a button card, because that's what the game reads. To open a new set, assign it to an entry and open that entry.

**Order.** The game fills its command panel by walking the set's buttons and the panel's slots together, so the buttons must be in ascending order of position. Several buttons may share a position, such as Warcraft II's shield icons, of which the one for the current upgrade level shows.

## `requirements`

StarCraft only. Each entry defines one item's whole requirement record, replacing the original.

| Field | What it holds |
| --- | --- |
| `type` | `unit`, `upgrade`, `tech_research`, `tech_use` or `order`. |
| `id` | The item's ID, in that type's range. |
| `list` | The record, as a flat array. An empty list removes the record, so the item has no requirements. |

In a list, a string is an opcode, and a number is the parameter of the opcode before it, or else a bare unit ID, which means that unit must exist and be complete. `or` joins the conditions on either side, so it can't come first or last, or follow another `or`.

```json list:unit
["current_unit_is", 106, "or", "current_unit_is", 116, "is_researched", 0]
```

The game checks unit records with one checker and the other four types with another, and each handles only some opcodes, so an opcode must be one its record's type allows. `must_have_addon`, for instance, is for unit records only.

**Upgrade levels.** An upgrade's list either has no level opcodes, or has its other conditions first, followed by `upgrade_level_1`, `upgrade_level_2` and `upgrade_level_3`, each once and in that order. Each level but the last ends with `end_sublist`, and the end of the record ends the last one. The game finds each level by scanning on from `upgrade_level_1`, so any other shape makes it read past the record:

```json list:upgrade
["current_unit_is", 139, "is_not_training_or_morphing",
 "upgrade_level_1", "end_sublist",
 "upgrade_level_2", 132, "or", "must_have", 133, "end_sublist",
 "upgrade_level_3", 133]
```

Records the mod doesn't define stay as each version has them. A mod can also define a record the running version lacks.

## `constants`

Each entry sets one constant.

| Field | What it holds |
| --- | --- |
| `name` | The constant. |
| `value` | For a number: a whole number in the constant's range. |
| `option` | For a choice: the name of one of its options. |

Give exactly one of `value` and `option`, as the constant takes. A number is in the scale the game stores it in, not one converted for display: supply is in half points, and times in game frames or cycles. Where the game stores the value in several places, or stores it negated somewhere, AxeGraft Patcher writes each place in its own form.

Every choice has an option `original`, which gives the original behaviour on every version.

A constant whose location isn't known on the running version, or whose code doesn't exist there, is skipped and logged, and the rest of the mod is still applied. Its value is checked all the same.

## Examples

A StarCraft mod that gives the Marine and its heroes a smaller set, and the Firebat its own:

```json
{
  "patcher": "AxeGraft",
  "format": 1,
  "game": "starcraft",
  "mod": {"name": "Marine drill", "version": "0.1"},
  "button_sets": [
    {
      "id": 0,
      "label": "Marine, Firebat and heroes",
      "buttons": [
        {"position": 1, "icon": 228, "condition": "always", "action": "move", "enabled_string": 664, "disabled_string": 0},
        {"position": 2, "icon": 229, "condition": "always", "action": "stop", "enabled_string": 665, "disabled_string": 0}
      ]
    },
    {
      "id": 250,
      "label": "Firebat",
      "buttons": [
        {"position": 1, "icon": 228, "condition": "always", "action": "move", "enabled_string": 664, "disabled_string": 0}
      ]
    }
  ],
  "units": [
    {"id": 32, "label": "Firebat", "button_set": 250},
    {"id": 16, "connected_unit": null}
  ]
}
```

A StarCraft mod that lets Zerg Carapace start at the Hatchery and changes a status panel:

```json
{
  "patcher": "AxeGraft",
  "format": 1,
  "game": "starcraft",
  "requirements": [
    {
      "type": "upgrade",
      "id": 3,
      "list": ["current_unit_is", 131, "is_not_training_or_morphing",
               "upgrade_level_1", "end_sublist",
               "upgrade_level_2", 132, "or", "must_have", 133, "end_sublist",
               "upgrade_level_3", 133]
    }
  ],
  "units": [
    {"id": 7, "display_function": "draw_none"}
  ]
}
```

A Warcraft II mod:

```json
{
  "patcher": "AxeGraft",
  "format": 1,
  "game": "warcraft2",
  "units": [
    {"id": 2, "label": "Peasant, shown as a Peon", "icon": 1, "name_string": 5}
  ],
  "button_sets": [
    {
      "id": 0,
      "buttons": [
        {"position": 0, "icon": 83, "condition": "bf_always", "action": "order_move", "string": 392, "highlighted": 2},
        {"position": 2, "icon": 116, "condition": "bf_always", "action": "order_attack", "string": 394, "highlighted": 8}
      ]
    }
  ],
  "constants": [
    {"name": "heal_amount", "value": 2}
  ]
}
```

## Errors

Each problem names the file, where in it the problem is, and what's wrong:

```text
my_mod.json: units[0].id: Unit ID 300 is outside the game's button table, 0-249.
my_mod.json: button_sets[1].id: There's no original set 32: entry 32 uses set 0. New sets start at 250.
my_mod.json: constants[0].value: The constant max_supply is 65536, outside its range, 0-65535.
```

The full list is in AxeGraft Patcher's log, `AxeGraftPatcher.log` in the user's temporary folder.
