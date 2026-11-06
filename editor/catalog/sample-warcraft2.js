AxeGraft.registerCatalog({
  "application": "AxeGraft",
  "catalogFormat": 1,
  "modFormat": 1,
  "game": "warcraft2",
  "title": "Warcraft II: Battle.net Edition",
  "sample": true,
  "parts": ["units", "button_sets", "constants"],
  "versions": [
    {"id": "1.3", "label": "1.3"},
    {"id": "1.33", "label": "1.33"},
    {"id": "1.5", "label": "1.5"},
    {"id": "2.00", "label": "2.00"},
    {"id": "2.02", "label": "2.02"}
  ],
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
  "panel": {"columns": 3, "ascending": true},
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
      {"name": "bf_always", "label": "Always", "variable": null, "help": "Always shows the button."},
      {
        "name": "bf_has_Shields",
        "label": "Armor upgrade level",
        "variable": "number",
        "help": "Shows the button only at the armor upgrade level given as the variable: 0 before any upgrade, 1 after the first and 2 after the second. The shield icons use it."
      },
      {
        "name": "bf_has_Swords",
        "label": "Weapon upgrade level",
        "variable": "number",
        "help": "Shows the button only at the weapon upgrade level given as the variable: 0, 1 or 2. The sword icons use it."
      },
      {"name": "bf_attack_ground", "label": "Can attack ground", "variable": null},
      {"name": "bf_no_load", "label": "Can harvest", "variable": null},
      {"name": "bf_load", "label": "Carries goods", "variable": null},
      {"name": "bf_wood", "label": "Can build basic structures", "variable": null},
      {"name": "bf_stone", "label": "Can build advanced structures", "variable": null},
      {"name": "bf_farm_ok", "label": "Can build a Farm", "variable": null},
      {"name": "bf_barrack_ok", "label": "Can build Barracks", "variable": null},
      {"name": "bf_thall_ok", "label": "Can build a Town Hall", "variable": null},
      {"name": "bf_mill_ok", "label": "Can build a Lumber Mill", "variable": null},
      {"name": "bf_smith_ok", "label": "Can build a Blacksmith", "variable": null},
      {"name": "bf_tower_ok", "label": "Can build a Scout Tower", "variable": null},
      {"name": "bf_wall_ok", "label": "Can build a Wall", "variable": null},
      {
        "name": "bf_enhanced_mode",
        "label": "Enhanced mode",
        "variable": null,
        "absentOn": ["1.3", "1.33", "1.5"],
        "help": "Shows the button only in Enhanced mode. 2.00 and 2.02 use it for the Patrol button they add to the Dwarven Demolition Squad, Goblin Sappers, Gnomish Flying Machine, Goblin Zeppelin and Eye of Kilrogg."
      }
    ],
    "actions": [
      {"name": "order_move", "label": "Move", "variable": null},
      {"name": "order_guard", "label": "Stop", "variable": null},
      {"name": "order_attack", "label": "Attack", "variable": null},
      {"name": "order_patrol", "label": "Patrol", "variable": null},
      {"name": "order_stand_ground", "label": "Stand Ground", "variable": null},
      {"name": "order_attack_ground", "label": "Attack Ground", "variable": null},
      {"name": "order_repair", "label": "Repair", "variable": null},
      {"name": "order_harvest", "label": "Harvest", "variable": null},
      {"name": "order_return", "label": "Return with Goods", "variable": null},
      {"name": "order_demolish", "label": "Demolish", "variable": null},
      {
        "name": "status_set_card",
        "label": "Show table entry",
        "variable": "tableEntry",
        "help": "Shows the buttons of the table entry given as the variable instead, such as a build menu. Entry 110, Blank, shows the selected unit's own buttons again."
      },
      {"name": "order_place", "label": "Build", "variable": "unit", "help": "Starts placing the building whose unit number is given as the variable."}
    ],
    "statusChanged": [
      {"name": "statdraw_query_unit", "label": "Most units", "variable": null},
      {"name": "statdraw_query_peon", "label": "As the Peasant", "variable": null},
      {"name": "statdraw_query_farm", "label": "As the Farm", "variable": null}
    ],
    "statusUpdate": [
      {"name": "statdraw_draw_grunt", "label": "As the Footman", "variable": null},
      {"name": "statdraw_draw_catapult", "label": "As the Ballista", "variable": null},
      {"name": "statdraw_draw_unit", "label": "As unit 34", "variable": null},
      {"name": "statdraw_draw_peon", "label": "As the Peasant", "variable": null},
      {"name": "statdraw_draw_farm", "label": "As the Farm", "variable": null}
    ]
  },
  "units": [
    {
      "id": 0,
      "name": "Footman",
      "icon": 2,
      "tree": ["Human", "Land Units"],
      "original": {"button_set": 0, "status_changed": "statdraw_query_unit", "status_update": "statdraw_draw_grunt"}
    },
    {
      "id": 4,
      "name": "Ballista",
      "icon": 16,
      "tree": ["Human", "Land Units"],
      "original": {"button_set": 0, "status_changed": "statdraw_query_unit", "status_update": "statdraw_draw_catapult"}
    },
    {
      "id": 22,
      "name": "Kurdran and Sky'ree",
      "tree": ["Human", "Heroes"],
      "original": {"button_set": 0, "status_changed": "statdraw_query_unit", "status_update": "statdraw_draw_grunt"}
    },
    {
      "id": 36,
      "name": "Unused",
      "tree": ["Other", "Unused"],
      "original": {"button_set": 0, "status_changed": "statdraw_query_unit", "status_update": "statdraw_draw_unit"}
    },
    {
      "id": 42,
      "name": "Gryphon Rider",
      "icon": 30,
      "tree": ["Human", "Air Units"],
      "original": {"button_set": 0, "status_changed": "statdraw_query_unit", "status_update": "statdraw_draw_grunt"}
    },
    {
      "id": 46,
      "name": "Danath",
      "tree": ["Human", "Heroes"],
      "original": {"button_set": 0, "status_changed": "statdraw_query_unit", "status_update": "statdraw_draw_grunt"}
    },
    {
      "id": 2,
      "name": "Peasant",
      "icon": 0,
      "tree": ["Human", "Land Units"],
      "original": {"button_set": 2, "status_changed": "statdraw_query_peon", "status_update": "statdraw_draw_peon"}
    },
    {
      "id": 3,
      "name": "Peon",
      "icon": 1,
      "tree": ["Orc", "Land Units"],
      "original": {"button_set": 3, "status_changed": "statdraw_query_peon", "status_update": "statdraw_draw_peon"}
    },
    {
      "id": 14,
      "name": "Dwarven Demolition Squad",
      "tree": ["Human", "Land Units"],
      "original": {"button_set": 14, "status_changed": "statdraw_query_unit", "status_update": "statdraw_draw_grunt"}
    },
    {
      "id": 41,
      "name": "Goblin Zeppelin",
      "tree": ["Orc", "Air Units"],
      "original": {"button_set": 41, "status_changed": "statdraw_query_unit", "status_update": "statdraw_draw_grunt"}
    },
    {
      "id": 45,
      "name": "Eye of Kilrogg",
      "tree": ["Orc", "Summoned"],
      "original": {"button_set": 41, "status_changed": "statdraw_query_unit", "status_update": "statdraw_draw_grunt"}
    },
    {
      "id": 58,
      "name": "Farm",
      "icon": 38,
      "tree": ["Human", "Buildings"],
      "original": {"button_set": null, "status_changed": "statdraw_query_farm", "status_update": "statdraw_draw_farm"}
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
        {"position": 0, "icon": 83, "condition": "bf_always", "action": "order_move", "string": 392, "highlighted": 2},
        {"position": 1, "icon": 164, "condition": "bf_has_Shields", "condition_variable": 0, "action": "order_guard", "string": 393, "highlighted": 1},
        {"position": 1, "icon": 165, "condition": "bf_has_Shields", "condition_variable": 1, "action": "order_guard", "string": 393, "highlighted": 1},
        {"position": 1, "icon": 166, "condition": "bf_has_Shields", "condition_variable": 2, "action": "order_guard", "string": 393, "highlighted": 1},
        {"position": 2, "icon": 116, "condition": "bf_has_Swords", "condition_variable": 0, "action": "order_attack", "string": 394, "highlighted": 8},
        {"position": 2, "icon": 117, "condition": "bf_has_Swords", "condition_variable": 1, "action": "order_attack", "string": 394, "highlighted": 8},
        {"position": 2, "icon": 118, "condition": "bf_has_Swords", "condition_variable": 2, "action": "order_attack", "string": 394, "highlighted": 8},
        {"position": 3, "icon": 178, "condition": "bf_always", "action": "order_patrol", "string": 404, "highlighted": 4},
        {"position": 4, "icon": 180, "condition": "bf_always", "action": "order_stand_ground", "string": 403, "highlighted": 16},
        {"position": 5, "icon": 182, "condition": "bf_attack_ground", "action": "order_attack_ground", "string": 402, "highlighted": 32}
      ]
    },
    {
      "id": 2,
      "name": "Peasant",
      "tree": ["Human"],
      "entries": [2],
      "original": [
        {"position": 0, "icon": 83, "condition": "bf_always", "action": "order_move", "string": 392, "highlighted": 2},
        {"position": 1, "icon": 164, "condition": "bf_always", "action": "order_guard", "string": 393, "highlighted": 1},
        {"position": 2, "icon": 116, "condition": "bf_always", "action": "order_attack", "string": 394, "highlighted": 8},
        {"position": 3, "icon": 85, "condition": "bf_always", "action": "order_repair", "string": 395, "highlighted": 256},
        {"position": 4, "icon": 86, "condition": "bf_no_load", "action": "order_harvest", "string": 396, "highlighted": 64},
        {"position": 5, "icon": 89, "condition": "bf_load", "action": "order_return", "string": 401, "highlighted": 128},
        {"position": 6, "icon": 87, "condition": "bf_wood", "action": "status_set_card", "action_variable": 111, "string": 398, "highlighted": 0},
        {"position": 7, "icon": 88, "condition": "bf_stone", "action": "status_set_card", "action_variable": 112, "string": 399, "highlighted": 0}
      ]
    },
    {
      "id": 3,
      "name": "Peon",
      "tree": ["Orc"],
      "entries": [3],
      "original": [
        {"position": 0, "icon": 84, "condition": "bf_always", "action": "order_move", "string": 392, "highlighted": 2},
        {"position": 1, "icon": 167, "condition": "bf_always", "action": "order_guard", "string": 393, "highlighted": 1},
        {"position": 2, "icon": 119, "condition": "bf_always", "action": "order_attack", "string": 394, "highlighted": 8},
        {"position": 3, "icon": 85, "condition": "bf_always", "action": "order_repair", "string": 395, "highlighted": 256},
        {"position": 4, "icon": 86, "condition": "bf_no_load", "action": "order_harvest", "string": 396, "highlighted": 64},
        {"position": 5, "icon": 90, "condition": "bf_load", "action": "order_return", "string": 401, "highlighted": 128},
        {"position": 6, "icon": 87, "condition": "bf_wood", "action": "status_set_card", "action_variable": 113, "string": 398, "highlighted": 0},
        {"position": 7, "icon": 88, "condition": "bf_stone", "action": "status_set_card", "action_variable": 114, "string": 399, "highlighted": 0}
      ]
    },
    {
      "id": 14,
      "name": "Dwarven Demolition Squad",
      "tree": ["Human"],
      "entries": [14],
      "original": {
        "default": [
          {"position": 0, "icon": 83, "condition": "bf_always", "action": "order_move", "string": 392, "highlighted": 2},
          {"position": 1, "icon": 164, "condition": "bf_has_Shields", "condition_variable": 0, "action": "order_guard", "string": 393, "highlighted": 1},
          {"position": 1, "icon": 165, "condition": "bf_has_Shields", "condition_variable": 1, "action": "order_guard", "string": 393, "highlighted": 1},
          {"position": 1, "icon": 166, "condition": "bf_has_Shields", "condition_variable": 2, "action": "order_guard", "string": 393, "highlighted": 1},
          {"position": 2, "icon": 116, "condition": "bf_has_Swords", "condition_variable": 0, "action": "order_attack", "string": 394, "highlighted": 8},
          {"position": 2, "icon": 117, "condition": "bf_has_Swords", "condition_variable": 1, "action": "order_attack", "string": 394, "highlighted": 8},
          {"position": 2, "icon": 118, "condition": "bf_has_Swords", "condition_variable": 2, "action": "order_attack", "string": 394, "highlighted": 8},
          {"position": 3, "icon": 184, "condition": "bf_enhanced_mode", "action": "order_patrol", "string": 404, "highlighted": 4},
          {"position": 8, "icon": 142, "condition": "bf_always", "action": "order_demolish", "string": 406, "highlighted": 32}
        ],
        "perVersion": {
          "1.3": [
            {"position": 0, "icon": 83, "condition": "bf_always", "action": "order_move", "string": 392, "highlighted": 2},
            {"position": 1, "icon": 164, "condition": "bf_has_Shields", "condition_variable": 0, "action": "order_guard", "string": 393, "highlighted": 1},
            {"position": 1, "icon": 165, "condition": "bf_has_Shields", "condition_variable": 1, "action": "order_guard", "string": 393, "highlighted": 1},
            {"position": 1, "icon": 166, "condition": "bf_has_Shields", "condition_variable": 2, "action": "order_guard", "string": 393, "highlighted": 1},
            {"position": 2, "icon": 116, "condition": "bf_has_Swords", "condition_variable": 0, "action": "order_attack", "string": 394, "highlighted": 8},
            {"position": 2, "icon": 117, "condition": "bf_has_Swords", "condition_variable": 1, "action": "order_attack", "string": 394, "highlighted": 8},
            {"position": 2, "icon": 118, "condition": "bf_has_Swords", "condition_variable": 2, "action": "order_attack", "string": 394, "highlighted": 8},
            {"position": 8, "icon": 142, "condition": "bf_always", "action": "order_demolish", "string": 406, "highlighted": 32}
          ],
          "1.33": [
            {"position": 0, "icon": 83, "condition": "bf_always", "action": "order_move", "string": 392, "highlighted": 2},
            {"position": 1, "icon": 164, "condition": "bf_has_Shields", "condition_variable": 0, "action": "order_guard", "string": 393, "highlighted": 1},
            {"position": 1, "icon": 165, "condition": "bf_has_Shields", "condition_variable": 1, "action": "order_guard", "string": 393, "highlighted": 1},
            {"position": 1, "icon": 166, "condition": "bf_has_Shields", "condition_variable": 2, "action": "order_guard", "string": 393, "highlighted": 1},
            {"position": 2, "icon": 116, "condition": "bf_has_Swords", "condition_variable": 0, "action": "order_attack", "string": 394, "highlighted": 8},
            {"position": 2, "icon": 117, "condition": "bf_has_Swords", "condition_variable": 1, "action": "order_attack", "string": 394, "highlighted": 8},
            {"position": 2, "icon": 118, "condition": "bf_has_Swords", "condition_variable": 2, "action": "order_attack", "string": 394, "highlighted": 8},
            {"position": 8, "icon": 142, "condition": "bf_always", "action": "order_demolish", "string": 406, "highlighted": 32}
          ],
          "1.5": [
            {"position": 0, "icon": 83, "condition": "bf_always", "action": "order_move", "string": 392, "highlighted": 2},
            {"position": 1, "icon": 164, "condition": "bf_has_Shields", "condition_variable": 0, "action": "order_guard", "string": 393, "highlighted": 1},
            {"position": 1, "icon": 165, "condition": "bf_has_Shields", "condition_variable": 1, "action": "order_guard", "string": 393, "highlighted": 1},
            {"position": 1, "icon": 166, "condition": "bf_has_Shields", "condition_variable": 2, "action": "order_guard", "string": 393, "highlighted": 1},
            {"position": 2, "icon": 116, "condition": "bf_has_Swords", "condition_variable": 0, "action": "order_attack", "string": 394, "highlighted": 8},
            {"position": 2, "icon": 117, "condition": "bf_has_Swords", "condition_variable": 1, "action": "order_attack", "string": 394, "highlighted": 8},
            {"position": 2, "icon": 118, "condition": "bf_has_Swords", "condition_variable": 2, "action": "order_attack", "string": 394, "highlighted": 8},
            {"position": 8, "icon": 142, "condition": "bf_always", "action": "order_demolish", "string": 406, "highlighted": 32}
          ]
        }
      }
    },
    {
      "id": 41,
      "name": "Goblin Zeppelin and Eye of Kilrogg",
      "tree": ["Orc"],
      "entries": [41, 45],
      "original": {
        "default": [
          {"position": 0, "icon": 84, "condition": "bf_always", "action": "order_move", "string": 392, "highlighted": 2},
          {"position": 1, "icon": 167, "condition": "bf_has_Shields", "condition_variable": 0, "action": "order_guard", "string": 393, "highlighted": 1},
          {"position": 1, "icon": 168, "condition": "bf_has_Shields", "condition_variable": 1, "action": "order_guard", "string": 393, "highlighted": 1},
          {"position": 1, "icon": 169, "condition": "bf_has_Shields", "condition_variable": 2, "action": "order_guard", "string": 393, "highlighted": 1},
          {"position": 3, "icon": 185, "condition": "bf_enhanced_mode", "action": "order_patrol", "string": 404, "highlighted": 4}
        ],
        "perVersion": {
          "1.3": [
            {"position": 0, "icon": 84, "condition": "bf_always", "action": "order_move", "string": 392, "highlighted": 2},
            {"position": 1, "icon": 167, "condition": "bf_has_Shields", "condition_variable": 0, "action": "order_guard", "string": 393, "highlighted": 1},
            {"position": 1, "icon": 168, "condition": "bf_has_Shields", "condition_variable": 1, "action": "order_guard", "string": 393, "highlighted": 1},
            {"position": 1, "icon": 169, "condition": "bf_has_Shields", "condition_variable": 2, "action": "order_guard", "string": 393, "highlighted": 1}
          ],
          "1.33": [
            {"position": 0, "icon": 84, "condition": "bf_always", "action": "order_move", "string": 392, "highlighted": 2},
            {"position": 1, "icon": 167, "condition": "bf_has_Shields", "condition_variable": 0, "action": "order_guard", "string": 393, "highlighted": 1},
            {"position": 1, "icon": 168, "condition": "bf_has_Shields", "condition_variable": 1, "action": "order_guard", "string": 393, "highlighted": 1},
            {"position": 1, "icon": 169, "condition": "bf_has_Shields", "condition_variable": 2, "action": "order_guard", "string": 393, "highlighted": 1}
          ],
          "1.5": [
            {"position": 0, "icon": 84, "condition": "bf_always", "action": "order_move", "string": 392, "highlighted": 2},
            {"position": 1, "icon": 167, "condition": "bf_has_Shields", "condition_variable": 0, "action": "order_guard", "string": 393, "highlighted": 1},
            {"position": 1, "icon": 168, "condition": "bf_has_Shields", "condition_variable": 1, "action": "order_guard", "string": 393, "highlighted": 1},
            {"position": 1, "icon": 169, "condition": "bf_has_Shields", "condition_variable": 2, "action": "order_guard", "string": 393, "highlighted": 1}
          ]
        }
      }
    },
    {
      "id": 111,
      "name": "Human Basic Build",
      "tree": ["Other"],
      "entries": [111],
      "original": [
        {"position": 0, "icon": 38, "condition": "bf_farm_ok", "action": "order_place", "action_variable": 58, "string": 306, "highlighted": 0},
        {"position": 1, "icon": 42, "condition": "bf_barrack_ok", "action": "order_place", "action_variable": 60, "string": 299, "highlighted": 0},
        {"position": 2, "icon": 40, "condition": "bf_thall_ok", "action": "order_place", "action_variable": 74, "string": 307, "highlighted": 0},
        {"position": 3, "icon": 44, "condition": "bf_mill_ok", "action": "order_place", "action_variable": 76, "string": 300, "highlighted": 0},
        {"position": 4, "icon": 46, "condition": "bf_smith_ok", "action": "order_place", "action_variable": 82, "string": 314, "highlighted": 0},
        {"position": 6, "icon": 60, "condition": "bf_tower_ok", "action": "order_place", "action_variable": 64, "string": 303, "highlighted": 0},
        {"position": 7, "icon": 92, "condition": "bf_wall_ok", "action": "order_place", "action_variable": 103, "string": 312, "highlighted": 0},
        {"position": 8, "icon": 91, "condition": "bf_always", "action": "status_set_card", "action_variable": 110, "string": 407, "highlighted": 0}
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
      "availability": {"1.3": 40, "1.33": 40, "1.5": 40, "2.00": 40, "2.02": 40}
    },
    {
      "name": "decay_hit_points",
      "label": "Hit points lost by decaying units",
      "group": ["Game mechanics", "Decay"],
      "kind": "number",
      "range": {"min": 0, "max": 127},
      "note": "The game stores this twice, as 5 and as -5, and both change together.",
      "help": "Hit points a decaying unit, such as an Eye of Kilrogg or a skeleton, loses each time its decay counter runs out and it has no mana left.",
      "availability": {"1.3": 5, "1.33": 5, "1.5": 5, "2.00": 5, "2.02": 5}
    }
  ],
  "assets": {
    "archives": ["war2patch.mpq", "war2dat.mpq"],
    "icons": {"file": "Art\\unit\\Portrait\\portrait.grp", "palette": {"file": "Art\\bgs\\Forest\\forest.ppl", "format": "ppl"}},
    "strings": {"file": "rez\\stat_txt.tbl"}
  }
});
