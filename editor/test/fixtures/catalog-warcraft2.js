AxeGraft.registerFixtureCatalog({
  "application": "AxeGraft",
  "catalogFormat": 1,
  "modFormat": 1,
  "game": "warcraft2",
  "title": "Warcraft II fixture",
  "sample": true,
  "parts": ["units", "button_sets", "constants"],
  "versions": [
    { "id": "2.00", "label": "2.00" },
    { "id": "2.02", "label": "2.02" }
  ],
  "limits": {
    "unit": { "min": 0, "max": 109 },
    "buttonCard": { "min": 0, "max": 119 },
    "upgrade": { "min": 0, "max": 51 },
    "buttonSet": { "min": 0, "max": 999 },
    "newButtonSet": { "min": 120, "max": 999 },
    "icon": { "min": 0, "max": 65535 },
    "string": { "min": 0, "max": 65535 },
    "position": { "min": 0, "max": 8 },
    "conditionVariable": { "min": 0, "max": 255 },
    "actionVariable": { "min": 0, "max": 255 },
    "order": { "min": 0, "max": 60 }
  },
  "panel": { "columns": 3 },
  "buttonFields": [
    { "name": "position", "label": "Position", "kind": "position", "required": true, "help": "Slot in the panel." },
    { "name": "icon", "label": "Icon", "kind": "icon", "required": true, "help": "Icon number." },
    { "name": "condition", "label": "Condition", "kind": "condition", "required": true, "help": "Decides whether the button shows." },
    { "name": "condition_variable", "label": "Condition variable", "kind": "conditionVariable", "required": false, "help": "Passed to the condition." },
    { "name": "action", "label": "Action", "kind": "action", "required": true, "help": "Runs when the button is used." },
    { "name": "action_variable", "label": "Action variable", "kind": "actionVariable", "required": false, "help": "Passed to the action." },
    { "name": "string", "label": "String", "kind": "string", "required": true, "help": "Shown at the bottom of the screen." },
    {
      "name": "highlighted", "label": "Highlighted order", "kind": "choice", "required": true, "help": "Order the button highlights.",
      "options": [
        { "value": 0, "label": "None" }, { "value": 1, "label": "Stop" }, { "value": 2, "label": "Move" },
        { "value": 4, "label": "Patrol" }, { "value": 8, "label": "Attack" }, { "value": 16, "label": "Stand Ground" },
        { "value": 32, "label": "Attack Ground" }, { "value": 64, "label": "Harvest" },
        { "value": 128, "label": "Return with Goods" }, { "value": 256, "label": "Repair" }
      ]
    }
  ],
  "unitFields": [
    { "name": "button_set", "label": "Button set", "kind": "buttonSet", "help": "The set of buttons the entry shows." },
    { "name": "icon", "label": "Icon", "kind": "icon", "help": "The icon that stands for the unit." },
    { "name": "name_string", "label": "Name", "kind": "string", "help": "The unit's name." },
    { "name": "stats_frame", "label": "Stats panel frame", "kind": "choice", "options": [{ "value": 0, "label": "Frame 0" }, { "value": 1, "label": "Frame 1" }, { "value": 2, "label": "Frame 2" }, { "value": 3, "label": "Frame 3" }], "help": "The frame behind the stats." },
    { "name": "status_changed", "label": "Stats changed", "kind": "statusChanged", "help": "Decides whether to redraw the stats." },
    { "name": "display_function", "label": "Stats update", "kind": "displayFunction", "help": "Draws the stats." }
  ],
  "functions": {
    "conditions": [
      { "name": "w2_always", "label": "Always", "variable": null },
      { "name": "w2_has_upgrade", "label": "Has upgrade", "variable": "upgrade" }
    ],
    "actions": [
      { "name": "w2_move", "label": "Move", "variable": null },
      { "name": "w2_train", "label": "Train", "variable": "unit" },
      { "name": "w2_show_entry", "label": "Show button card", "variable": "buttonCard" },
      { "name": "order_spell", "label": "Cast spell", "variable": "order" }
    ],
    "statusChanged": [{ "name": "w2_stats_changed_unit", "label": "Unit", "variable": null }],
    "displayFunction": [{ "name": "w2_stats_update_unit", "label": "Unit", "variable": null }]
  },
  "units": [
    { "id": 0, "name": "Footman", "tree": ["Human", "Land Units"], "original": { "button_set": 0, "icon": 2, "stats_frame": 1, "name_string": 2, "status_changed": "w2_stats_changed_unit", "display_function": "w2_stats_update_unit" } },
    { "id": 2, "name": "Peasant", "tree": ["Human", "Land Units"], "original": { "button_set": 2, "icon": 0, "stats_frame": 1, "name_string": 4, "status_changed": "w2_stats_changed_unit", "display_function": "w2_stats_update_unit" } },
    { "id": 110, "name": "Blank", "tree": ["Other"], "original": { "button_set": null } },
    { "id": 111, "name": "Human Basic Build", "tree": ["Other"], "original": { "button_set": 111 } }
  ],
  "buttonSets": [
    {
      "id": 0, "name": "Footman", "tree": ["Human"], "entries": [0],
      "original": [{ "position": 0, "icon": 83, "condition": "w2_always", "action": "w2_move", "string": 400, "highlighted": 2 }]
    },
    {
      "id": 2, "name": "Peasant", "tree": ["Human"], "entries": [2],
      "original": [
        { "position": 0, "icon": 83, "condition": "w2_always", "action": "w2_move", "string": 400, "highlighted": 2 },
        { "position": 6, "icon": 90, "condition": "w2_always", "action": "w2_show_entry", "action_variable": 111, "string": 420, "highlighted": 0 }
      ]
    },
    {
      "id": 111, "name": "Human Basic Build", "tree": ["Other"], "entries": [111],
      "original": [{ "position": 8, "icon": 91, "condition": "w2_always", "action": "w2_show_entry", "action_variable": 110, "string": 430, "highlighted": 0 }]
    }
  ],
  "constants": [
    {
      "name": "mana_cycles", "label": "Cycles per mana point", "group": ["Game"], "kind": "number",
      "range": { "min": 0, "max": 255 }, "help": "Game cycles between mana points.",
      "availability": { "2.00": 40, "2.02": 40 }
    }
  ]
});
