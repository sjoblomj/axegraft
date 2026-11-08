# Game library schema

The game library is what AxeGraft Patcher knows about each supported game version: how to recognise it, where each table and function is, how each value is stored, and which bytes should be there. A mod never contains any of this. It names things, and the library says where they are on the running version.

The library's data is JSON, in `crates/library/data`. `build.rs` reads it, checks every guarantee below, and compiles it into the plugin as Rust code. Data that breaks a guarantee fails the build, so it never reaches a game, and nothing is parsed when the game starts. The data is generated from the knowledge base, so don't edit it by hand.

## Files

```text
data/
  starcraft/
    game.json       game-level facts and constants
    1.16.1.json     one file for each supported version, named by its id
    1.17.json
  warcraft2/
    game.json
    2.02.json
```

A game with no folder isn't supported. A version is supported once it has a file, and its file must be complete.

## Conventions

- **Addresses are RVAs**: offsets from the start of the loaded executable, as decimal numbers. The planner adds the address the executable is actually loaded at, so the library works wherever Windows loads it.
- **Bytes** are arrays of numbers, `[144, 1]`, in the order they're stored.
- **The game's numbering.** Table entries and button sets use one numbering per game, the same on every version: StarCraft's as from 1.12 on. Each version file says how its own numbers differ. Unit, upgrade, tech and order IDs never move.
- **Every list is complete.** Where something exists on some versions and not others, each version says so explicitly, with `null`. Nothing is left out to mean "absent".

## `game.json`

| Field | What it holds |
| --- | --- |
| `game` | `starcraft` or `warcraft2`. |
| `limits` | The ranges of IDs and fields, below. |
| `conditions`, `actions` | The functions a button can use: `{"name", "variable"}`. `variable` is what the function reads its variable as: `unit`, `tech`, `upgrade`, `order`, `number`, `table_entry`, or `null` for nothing. |
| `status_functions` | `{"name", "kind"}`, where `kind` is `status_changed` or `status_update`. |
| `opcodes` | StarCraft only. Requirement opcodes, below. |
| `constants` | The constants, below. |

Every function has a name of its own across the three lists. StarCraft's names are StarSource's (`bf_*`, `order_*`, `statdraw_*`); Warcraft II's are those of the PlayStation source's `statbtn.c`.

### `limits`

| Field | What it holds |
| --- | --- |
| `unit` | `{"min", "max"}` of unit IDs. Units are the first entries of the button table. |
| `table_entries` | The number of entries in the button table. New button sets start here. |
| `max_set_id` | The highest set ID a mod may use. |
| `tech`, `upgrade`, `order` | Their ID ranges, or `null` if the game has none. |
| `position` | Button positions in the command panel. |
| `icon`, `string` | Icon and string IDs. |
| `condition_variable`, `action_variable` | What a button's variable fields can hold. |

### `opcodes`

| Field | What it holds |
| --- | --- |
| `name` | The name mods use, such as `current_unit_is`. |
| `code` | The word stored in the stream, such as `65282` (`0xFF02`). `end_sublist` is stored as `65535` (`0xFFFF`). |
| `parameter` | The kind of the word after it, or `null`. |
| `role` | `condition`, `or`, `level` or `end_sublist`. Levels are listed in their order. |
| `allowed_in` | The record types whose checker handles it: `unit`, `upgrade`, `tech_research`, `tech_use`, `order`. |

### `constants`

| Field | What it holds |
| --- | --- |
| `name` | The name mods use. |
| `kind` | `{"number": {"min", "max"}}`, the range a mod may give, or `{"options": {"options": [...]}}`, the names of the choices. A choice always has `original`. |
| `versions` | An entry for every supported version, by version id. |

A version's entry is one of:

- `"not_applicable"`: the code doesn't exist on this version.
- `"unknown"`: the locations haven't been found.
- `{"locations": {"locations": [...]}}`: for a number, every place it's stored. Each is `{"rva", "encoding", "scale", "expected"}`.
- `{"options": {"sites": [...], "options": {...}}}`: for a choice, the places it writes, each `{"rva", "expected"}`, and for each option the bytes it writes at each site, in the same order.

Either of the last two may have `"reliability": {"unconfirmed": true}`, if the source marks it unconfirmed, or `{"incomplete": true}`, if the value is known to be stored in more places than are listed. The build turns both into `unknown`, so mods can't use them, and a mod that sets the constant skips it on that version.

A constant whose entry is `unknown` or `not_applicable` on the running version is skipped and logged. A mod's value is checked against the constant's range all the same.

**Encodings.** A location's `encoding` is one of a fixed set:

| Encoding | Stored as |
| --- | --- |
| `u8`, `u16`, `u32` | Unsigned, 1, 2 or 4 bytes. |
| `i8`, `i16`, `i32` | Signed. |
| `neg8`, `neg16`, `neg32` | The value negated, signed: a mod's 50 is stored as -50. |
| `{"byte_of": {"index", "width"}}` | One byte of a value `width` bytes wide, byte 0 being the lowest. Each byte is a location of its own. |

A mod's value is always in the game's stored scale, and is written as it is at every location, in that location's encoding. `scale` records the stored scale (1 if left out). It must be the same everywhere a constant is stored.

## Version files

| Field | What it holds |
| --- | --- |
| `id` | The version, such as `1.16.1`. Only the versions the schema knows can be listed: StarCraft 1.05 to 1.17, and Warcraft II: Battle.net Edition 2.00 and 2.02. |
| `identity` | `{"timestamp", "product_version"}`: the PE header's `TimeDateStamp`, and the version resource's fixed product version as four numbers. Together they must tell every version apart. |
| `button_table` | `{"rva", "entries", "card", "button"}`: where the button table is, how many entries it has on this version, and the layouts of an entry and of a button. |
| `status_table` | `{"rva", "layout"}`: StarCraft's `gTypeFcns`, or Warcraft II's Unit Data. |
| `entries` | Every table entry of the game's numbering: `{"number", "equivalent"}`, its number here and, in StarCraft, its original equivalent entry, or `null` if this version lacks the entry. |
| `sets` | Every original button set, by ID: `{"array", "entries", "buttons"}`, or `null` if this version lacks it. |
| `units` | Each unit's original status entry, in order of unit ID. |
| `functions` | Every condition, action and status function: its RVA, or `null` if this version lacks it. |
| `streams` | StarCraft only. The five requirement streams. |

**Layouts** are chosen from a fixed set for each game:

| Layout | Game | Size and fields |
| --- | --- | --- |
| `card`: `starcraft` | StarCraft | 12 bytes: `u16` button count, padding, `u32` pointer to the buttons, `u16` equivalent entry, padding. |
| `card`: `warcraft2_bne` | Warcraft II | 8 bytes: `u32` count, `u32` pointer. |
| `button`: `starcraft` | StarCraft | 20 bytes. |
| `button`: `warcraft2_bne` | Warcraft II | 20 bytes, the last 2 unused. |
| `status`: `starcraft` | StarCraft | 12 bytes: `u32` unit type, `u32` status changed function, `u32` status update function. |
| `status`: `warcraft2_bne` | Warcraft II | 16 bytes: `u16` icon, `u16` stats panel frame, `u16` name string, unused `u16`, `u32` status changed function, `u32` status update function. |

**Sets.** A set's `entries` are the table entries that point at its array on this version, in the game's numbering, and the set's ID is the lowest of them. `buttons` are its original buttons as stored, so a variable that is a table entry is in this version's own numbering. A StarCraft button has `enabled_string` and `disabled_string`; a Warcraft II button has `string` and `highlighted`.

**Units.** A StarCraft unit has `status_changed`, `status_update` and `status_unit_type`. A Warcraft II unit has `status_changed`, `status_update`, `icon`, `stats_frame` and `name_string`.

**Functions.** Where two names are one function on a version, a name that version's original buttons and units don't use must be `null` there, so that it can't stand for a function it isn't. A name they do use is kept, so two names may share an address.

**Streams.** Each of `unit`, `upgrade`, `tech_research`, `tech_use` and `order` has `{"rva", "length", "base_refs", "plus2_refs"}`: where the stream is, its length in bytes up to and including its final `0xFFFF`, and where code holds the stream's address and the address of its first record. A mod's records are merged into the version's own stream, which is written to new memory, and every reference is pointed at it.

## Guarantees

The build fails, naming the game, version and entry, unless:

- Each game, version and identity is listed once, and every version is one the schema knows.
- Function, opcode and constant names are each unique, and opcode codes are too.
- Every version lists every table entry, set, unit, function and, in StarCraft, stream. Units are never absent and keep their own numbers.
- Each set's ID is its lowest entry, and no entry points at two sets.
- Original buttons and units use only functions of the right kind that exist on that version.
- Two names share an address only where the version's original data uses both.
- Every constant has an entry for every version. Every location has expected bytes of its encoding's width, and every value in the constant's range fits every location. A constant has one scale everywhere.
- An option constant has `original`, whose bytes are the expected bytes, and every option gives bytes for every site.
- No two properties write the same bytes on any version: constants, button table entries, status entries and stream references.
- Nothing unconfirmed or incomplete is left in.

## Example

A tiny StarCraft library with two units and a menu, on one version. `data/starcraft/game.json`:

```json game.json
{
  "game": "starcraft",
  "limits": {
    "unit": {"min": 0, "max": 1}, "table_entries": 3, "max_set_id": 999,
    "tech": {"min": 0, "max": 43}, "upgrade": {"min": 0, "max": 60}, "order": {"min": 0, "max": 188},
    "position": {"min": 1, "max": 9}, "icon": {"min": 0, "max": 65535}, "string": {"min": 0, "max": 65535},
    "condition_variable": {"min": 0, "max": 255}, "action_variable": {"min": 0, "max": 65535}
  },
  "conditions": [{"name": "bf_always", "variable": null}],
  "actions": [
    {"name": "order_move", "variable": null},
    {"name": "statcmd_set_ctrl", "variable": "table_entry"}
  ],
  "status_functions": [
    {"name": "statdraw_query_unit", "kind": "status_changed"},
    {"name": "statdraw_draw_unit", "kind": "status_update"}
  ],
  "opcodes": [
    {"name": "or", "code": 65281, "parameter": null, "role": "or", "allowed_in": ["unit", "upgrade", "tech_research", "tech_use", "order"]},
    {"name": "current_unit_is", "code": 65282, "parameter": "unit", "role": "condition", "allowed_in": ["unit", "upgrade", "tech_research", "tech_use", "order"]}
  ],
  "constants": [
    {
      "name": "max_supply",
      "kind": {"number": {"min": 0, "max": 32767}},
      "versions": {
        "1.16.1": {"locations": {"locations": [
          {"rva": 24576, "encoding": "u16", "expected": [144, 1]},
          {"rva": 24580, "encoding": "neg16", "expected": [112, 254]}
        ]}}
      }
    },
    {
      "name": "permanent_cloak_energy",
      "kind": {"options": {"options": ["original", "changed"]}},
      "versions": {
        "1.16.1": {"options": {
          "sites": [{"rva": 28672, "expected": [116, 5]}],
          "options": {"original": [[116, 5]], "changed": [[144, 144]]}
        }}
      }
    }
  ]
}
```

`data/starcraft/1.16.1.json`. Units 0 and 1 share set 0, and the menu, entry 2, has its own:

```json 1.16.1.json
{
  "id": "1.16.1",
  "identity": {"timestamp": 1231391178, "product_version": [1, 16, 1, 1]},
  "button_table": {"rva": 4096, "entries": 3, "card": "starcraft", "button": "starcraft"},
  "status_table": {"rva": 4132, "layout": "starcraft"},
  "entries": {
    "0": {"number": 0, "equivalent": null},
    "1": {"number": 1, "equivalent": 0},
    "2": {"number": 2, "equivalent": null}
  },
  "sets": {
    "0": {"array": 8192, "entries": [0, 1], "buttons": [
      {"position": 1, "icon": 228, "condition": "bf_always", "condition_variable": 0, "action": "order_move", "action_variable": 0, "enabled_string": 664, "disabled_string": 0},
      {"position": 9, "icon": 236, "condition": "bf_always", "condition_variable": 0, "action": "statcmd_set_ctrl", "action_variable": 2, "enabled_string": 678, "disabled_string": 0}
    ]},
    "2": {"array": 8232, "entries": [2], "buttons": []}
  },
  "units": [
    {"status_changed": "statdraw_query_unit", "status_update": "statdraw_draw_unit", "status_unit_type": 0},
    {"status_changed": "statdraw_query_unit", "status_update": "statdraw_draw_unit", "status_unit_type": 1}
  ],
  "functions": {
    "bf_always": 12288, "order_move": 12304, "statcmd_set_ctrl": 12320,
    "statdraw_query_unit": 12336, "statdraw_draw_unit": 12352
  },
  "streams": {
    "unit": {"rva": 16384, "length": 4, "base_refs": [20480], "plus2_refs": [20484]},
    "upgrade": {"rva": 16388, "length": 4, "base_refs": [20488], "plus2_refs": []},
    "tech_research": {"rva": 16392, "length": 4, "base_refs": [20492], "plus2_refs": []},
    "tech_use": {"rva": 16396, "length": 4, "base_refs": [20496], "plus2_refs": []},
    "order": {"rva": 16400, "length": 4, "base_refs": [20500], "plus2_refs": []}
  }
}
```

`max_supply` is stored twice here, once as itself and once negated, so a mod's 500 is written as 500 at the first location and as -500 at the second.
