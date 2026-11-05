AxeGraft.registerExampleCatalog({
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
      "original": [
        { "position": 1, "icon": 228, "condition": "bf_always", "action": "order_move", "enabled_string": 664, "disabled_string": 0 },
        { "position": 7, "icon": 237, "condition": "bf_has_spell", "condition_variable": 0, "action": "order_stim", "enabled_string": 334, "disabled_string": 346 }
      ]
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
});
