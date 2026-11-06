AxeGraft.registerCatalog({
  "application": "AxeGraft",
  "catalogFormat": 1,
  "modFormat": 1,
  "game": "warcraft2",
  "title": "Warcraft II: Battle.net Edition",
  "sample": true,
  "parts": ["units", "button_sets", "constants"],
  "versions": [{"id": "2.00", "label": "2.00"}, {"id": "2.02", "label": "2.02"}],
  "limits": {
    "unit": {"min": 0, "max": 109},
    "tableEntry": {"min": 0, "max": 119},
    "buttonSet": {"min": 0, "max": 999},
    "newButtonSet": {"min": 120, "max": 999},
    "icon": {"min": 0, "max": 65535},
    "string": {"min": 0, "max": 65535},
    "position": {"min": 0, "max": 8},
    "conditionVariable": {"min": 0, "max": 255},
    "actionVariable": {"min": 0, "max": 255}
  },
  "panel": {"columns": 3},
  "buttonFields": [
    {
      "name": "position",
      "label": "Position",
      "kind": "position",
      "required": true,
      "help": "Where the button sits in the 3 by 3 command panel: 0 to 2 is the top row, 6 to 8 the bottom row. Several buttons may share a position, such as the shield icons for each armor level."
    },
    {"name": "icon", "label": "Icon", "kind": "icon", "required": true, "help": "The number of the icon to show, the same numbering as unit icons."},
    {
      "name": "condition",
      "label": "Condition",
      "kind": "condition",
      "required": true,
      "help": "The function that decides whether the command appears. It is called with the condition variable."
    },
    {
      "name": "condition_variable",
      "label": "Condition variable",
      "kind": "conditionVariable",
      "required": false,
      "help": "The byte passed to the condition, such as the upgrade level for icons that change with upgrades."
    },
    {"name": "action", "label": "Action", "kind": "action", "required": true, "help": "The function that tells the unit what to do when the command is used."},
    {
      "name": "action_variable",
      "label": "Action variable",
      "kind": "actionVariable",
      "required": false,
      "help": "The byte passed to the action: the unit, building or upgrade to make, or the table entry whose commands to show."
    },
    {
      "name": "string",
      "label": "String",
      "kind": "string",
      "required": true,
      "help": "The string shown at the bottom of the screen while the cursor is over the command."
    },
    {
      "name": "highlighted",
      "label": "Highlighted order",
      "kind": "choice",
      "required": true,
      "options": [
        {"value": 0, "label": "None"},
        {"value": 1, "label": "Stop"},
        {"value": 2, "label": "Move"},
        {"value": 4, "label": "Patrol"},
        {"value": 8, "label": "Attack"},
        {"value": 16, "label": "Stand Ground"},
        {"value": 32, "label": "Attack Ground"},
        {"value": 64, "label": "Harvest"},
        {"value": 128, "label": "Return with Goods"},
        {"value": 256, "label": "Repair"}
      ],
      "help": "The order this command gives, as the game's flag. The button is highlighted while the selected units carry out that order. None, or exactly one order."
    }
  ],
  "unitFields": [
    {
      "name": "button_set",
      "label": "Command list",
      "kind": "buttonSet",
      "help": "The set of commands this table entry shows. Several entries can share a set, so editing a set changes all of them. Choose no buttons to show none."
    },
    {
      "name": "status_changed",
      "label": "Stats changed",
      "kind": "statusChanged",
      "help": "The function that checks whether the stats shown for this unit have changed, such as hit points or food, and so need redrawing."
    },
    {
      "name": "status_update",
      "label": "Stats update",
      "kind": "statusUpdate",
      "help": "The function that decides which stats are shown when this unit is selected. Giving a Footman the Farm's function shows food grown and used."
    }
  ],
  "functions": {
    "conditions": [
      {"name": "always", "label": "Always", "variable": null, "help": "Always shows the button."},
      {
        "name": "armor_level",
        "label": "Armor upgrade level",
        "variable": "number",
        "help": "Shows the button only at the armor upgrade level given as the variable: 0 before any upgrade, 1 after the first and 2 after the second. The shield icons use it."
      },
      {
        "name": "weapon_level",
        "label": "Weapon upgrade level",
        "variable": "number",
        "help": "Shows the button only at the weapon upgrade level given as the variable: 0, 1 or 2. The sword icons use it."
      },
      {"name": "can_attack_ground", "label": "Can attack ground", "variable": null},
      {"name": "can_harvest", "label": "Can harvest", "variable": null},
      {"name": "carries_goods", "label": "Carries goods", "variable": null},
      {"name": "can_build_basic", "label": "Can build basic structures", "variable": null},
      {"name": "can_build_advanced", "label": "Can build advanced structures", "variable": null},
      {"name": "can_build_farm", "label": "Can build a Farm", "variable": null},
      {"name": "can_build_barracks", "label": "Can build Barracks", "variable": null},
      {"name": "can_build_town_hall", "label": "Can build a Town Hall", "variable": null},
      {"name": "can_build_lumber_mill", "label": "Can build a Lumber Mill", "variable": null},
      {"name": "can_build_blacksmith", "label": "Can build a Blacksmith", "variable": null},
      {"name": "can_build_tower", "label": "Can build a Scout Tower", "variable": null},
      {"name": "can_build_wall", "label": "Can build a Wall", "variable": null}
    ],
    "actions": [
      {"name": "move", "label": "Move", "variable": null},
      {"name": "stop", "label": "Stop", "variable": null},
      {"name": "attack", "label": "Attack", "variable": null},
      {"name": "patrol", "label": "Patrol", "variable": null},
      {"name": "stand_ground", "label": "Stand Ground", "variable": null},
      {"name": "attack_ground", "label": "Attack Ground", "variable": null},
      {"name": "repair", "label": "Repair", "variable": null},
      {"name": "harvest", "label": "Harvest", "variable": null},
      {"name": "return_goods", "label": "Return with Goods", "variable": null},
      {
        "name": "show_table_entry",
        "label": "Show table entry",
        "variable": "tableEntry",
        "help": "Shows the buttons of the table entry given as the variable instead, such as a build menu. Entry 110, Blank, shows the selected unit's own buttons again."
      },
      {"name": "build", "label": "Build", "variable": "unit", "help": "Starts placing the building whose unit number is given as the variable."}
    ],
    "statusChanged": [
      {"name": "stats_changed_unit", "label": "Most units", "variable": null},
      {"name": "stats_changed_worker", "label": "As the Peasant", "variable": null},
      {"name": "stats_changed_farm", "label": "As the Farm", "variable": null}
    ],
    "statusUpdate": [
      {"name": "stats_update_soldier", "label": "As the Footman", "variable": null},
      {"name": "stats_update_ballista", "label": "As the Ballista", "variable": null},
      {"name": "stats_update_plain", "label": "As unit 34", "variable": null},
      {"name": "stats_update_worker", "label": "As the Peasant", "variable": null},
      {"name": "stats_update_farm", "label": "As the Farm", "variable": null}
    ]
  },
  "units": [
    {
      "id": 0,
      "name": "Footman",
      "icon": 2,
      "tree": ["Human", "Land Units"],
      "original": {"button_set": 0, "status_changed": "stats_changed_unit", "status_update": "stats_update_soldier"}
    },
    {
      "id": 4,
      "name": "Ballista",
      "icon": 16,
      "tree": ["Human", "Land Units"],
      "original": {"button_set": 0, "status_changed": "stats_changed_unit", "status_update": "stats_update_ballista"}
    },
    {
      "id": 22,
      "name": "Kurdran and Sky'ree",
      "tree": ["Human", "Heroes"],
      "original": {"button_set": 0, "status_changed": "stats_changed_unit", "status_update": "stats_update_soldier"}
    },
    {
      "id": 36,
      "name": "Unused",
      "tree": ["Other", "Unused"],
      "original": {"button_set": 0, "status_changed": "stats_changed_unit", "status_update": "stats_update_plain"}
    },
    {
      "id": 42,
      "name": "Gryphon Rider",
      "icon": 30,
      "tree": ["Human", "Air Units"],
      "original": {"button_set": 0, "status_changed": "stats_changed_unit", "status_update": "stats_update_soldier"}
    },
    {
      "id": 46,
      "name": "Danath",
      "tree": ["Human", "Heroes"],
      "original": {"button_set": 0, "status_changed": "stats_changed_unit", "status_update": "stats_update_soldier"}
    },
    {
      "id": 2,
      "name": "Peasant",
      "icon": 0,
      "tree": ["Human", "Land Units"],
      "original": {"button_set": 2, "status_changed": "stats_changed_worker", "status_update": "stats_update_worker"}
    },
    {
      "id": 3,
      "name": "Peon",
      "icon": 1,
      "tree": ["Orc", "Land Units"],
      "original": {"button_set": 3, "status_changed": "stats_changed_worker", "status_update": "stats_update_worker"}
    },
    {
      "id": 58,
      "name": "Farm",
      "icon": 38,
      "tree": ["Human", "Buildings"],
      "original": {"button_set": null, "status_changed": "stats_changed_farm", "status_update": "stats_update_farm"}
    },
    {"id": 110, "name": "Blank", "tree": ["Other", "Menus"], "original": {"button_set": null}},
    {"id": 111, "name": "Human Basic Build", "tree": ["Other", "Menus"], "original": {"button_set": 111}}
  ],
  "buttonSets": [
    {
      "id": 0,
      "name": "Footman, Ballista and others",
      "tree": ["Human"],
      "entries": [0, 4, 22, 36, 42, 46],
      "original": [
        {"position": 0, "icon": 83, "condition": "always", "action": "move", "string": 392, "highlighted": 2},
        {"position": 1, "icon": 164, "condition": "armor_level", "condition_variable": 0, "action": "stop", "string": 393, "highlighted": 1},
        {"position": 1, "icon": 165, "condition": "armor_level", "condition_variable": 1, "action": "stop", "string": 393, "highlighted": 1},
        {"position": 1, "icon": 166, "condition": "armor_level", "condition_variable": 2, "action": "stop", "string": 393, "highlighted": 1},
        {"position": 2, "icon": 116, "condition": "weapon_level", "condition_variable": 0, "action": "attack", "string": 394, "highlighted": 8},
        {"position": 2, "icon": 117, "condition": "weapon_level", "condition_variable": 1, "action": "attack", "string": 394, "highlighted": 8},
        {"position": 2, "icon": 118, "condition": "weapon_level", "condition_variable": 2, "action": "attack", "string": 394, "highlighted": 8},
        {"position": 3, "icon": 178, "condition": "always", "action": "patrol", "string": 404, "highlighted": 4},
        {"position": 4, "icon": 180, "condition": "always", "action": "stand_ground", "string": 403, "highlighted": 16},
        {"position": 5, "icon": 182, "condition": "can_attack_ground", "action": "attack_ground", "string": 402, "highlighted": 32}
      ]
    },
    {
      "id": 2,
      "name": "Peasant",
      "tree": ["Human"],
      "entries": [2],
      "original": [
        {"position": 0, "icon": 83, "condition": "always", "action": "move", "string": 392, "highlighted": 2},
        {"position": 1, "icon": 164, "condition": "always", "action": "stop", "string": 393, "highlighted": 1},
        {"position": 2, "icon": 116, "condition": "always", "action": "attack", "string": 394, "highlighted": 8},
        {"position": 3, "icon": 85, "condition": "always", "action": "repair", "string": 395, "highlighted": 256},
        {"position": 4, "icon": 86, "condition": "can_harvest", "action": "harvest", "string": 396, "highlighted": 64},
        {"position": 5, "icon": 89, "condition": "carries_goods", "action": "return_goods", "string": 401, "highlighted": 128},
        {"position": 6, "icon": 87, "condition": "can_build_basic", "action": "show_table_entry", "action_variable": 111, "string": 398, "highlighted": 0},
        {"position": 7, "icon": 88, "condition": "can_build_advanced", "action": "show_table_entry", "action_variable": 112, "string": 399, "highlighted": 0}
      ]
    },
    {
      "id": 3,
      "name": "Peon",
      "tree": ["Orc"],
      "entries": [3],
      "original": [
        {"position": 0, "icon": 84, "condition": "always", "action": "move", "string": 392, "highlighted": 2},
        {"position": 1, "icon": 167, "condition": "always", "action": "stop", "string": 393, "highlighted": 1},
        {"position": 2, "icon": 119, "condition": "always", "action": "attack", "string": 394, "highlighted": 8},
        {"position": 3, "icon": 85, "condition": "always", "action": "repair", "string": 395, "highlighted": 256},
        {"position": 4, "icon": 86, "condition": "can_harvest", "action": "harvest", "string": 396, "highlighted": 64},
        {"position": 5, "icon": 90, "condition": "carries_goods", "action": "return_goods", "string": 401, "highlighted": 128},
        {"position": 6, "icon": 87, "condition": "can_build_basic", "action": "show_table_entry", "action_variable": 113, "string": 398, "highlighted": 0},
        {"position": 7, "icon": 88, "condition": "can_build_advanced", "action": "show_table_entry", "action_variable": 114, "string": 399, "highlighted": 0}
      ]
    },
    {
      "id": 111,
      "name": "Human Basic Build",
      "tree": ["Other"],
      "entries": [111],
      "original": [
        {"position": 0, "icon": 38, "condition": "can_build_farm", "action": "build", "action_variable": 58, "string": 306, "highlighted": 0},
        {"position": 1, "icon": 42, "condition": "can_build_barracks", "action": "build", "action_variable": 60, "string": 299, "highlighted": 0},
        {"position": 2, "icon": 40, "condition": "can_build_town_hall", "action": "build", "action_variable": 74, "string": 307, "highlighted": 0},
        {"position": 3, "icon": 44, "condition": "can_build_lumber_mill", "action": "build", "action_variable": 76, "string": 300, "highlighted": 0},
        {"position": 4, "icon": 46, "condition": "can_build_blacksmith", "action": "build", "action_variable": 82, "string": 314, "highlighted": 0},
        {"position": 6, "icon": 60, "condition": "can_build_tower", "action": "build", "action_variable": 64, "string": 303, "highlighted": 0},
        {"position": 7, "icon": 92, "condition": "can_build_wall", "action": "build", "action_variable": 103, "string": 312, "highlighted": 0},
        {"position": 8, "icon": 91, "condition": "always", "action": "show_table_entry", "action_variable": 110, "string": 407, "highlighted": 0}
      ]
    }
  ],
  "constants": [
    {
      "name": "mana_cycles",
      "label": "Game cycles between mana points",
      "group": ["Game mechanics", "Timers"],
      "kind": "number",
      "range": {"min": 1, "max": 255},
      "note": "Counted in game cycles, whose length depends on the game speed.",
      "help": "Spellcasters gain 1 mana every this many game cycles.",
      "availability": {"2.00": 40, "2.02": 40}
    },
    {
      "name": "decay_hit_points",
      "label": "Hit points lost by decaying units",
      "group": ["Game mechanics", "Decay"],
      "kind": "number",
      "range": {"min": 0, "max": 127},
      "note": "The game stores this twice, as 5 and as -5, and both change together.",
      "help": "Hit points a decaying unit, such as an Eye of Kilrogg or a skeleton, loses each time its decay counter runs out and it has no mana left.",
      "availability": {"2.00": 5, "2.02": 5}
    }
  ],
  "assets": {
    "archives": ["war2patch.mpq", "war2dat.mpq"],
    "icons": {"file": "Art\\unit\\Portrait\\portrait.grp", "palette": {"file": "Art\\bgs\\Forest\\forest.ppl", "format": "ppl"}},
    "strings": {"file": "rez\\stat_txt.tbl"}
  }
});
