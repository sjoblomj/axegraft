AxeGraft.registerFixtureCatalog({
  "application": "AxeGraft",
  "catalogFormat": 1,
  "modFormat": 1,
  "game": "starcraft",
  "title": "StarCraft fixture",
  "sample": true,
  "parts": ["units", "button_sets", "requirements", "constants"],
  "versions": [
    { "id": "1.07", "label": "1.07" },
    { "id": "1.12", "label": "1.12" },
    { "id": "1.16.1", "label": "1.16.1" }
  ],
  "limits": {
    "unit": { "min": 0, "max": 227 },
    "buttonCard": { "min": 0, "max": 249 },
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
    { "name": "position", "label": "Position", "kind": "position", "required": true, "help": "Slot in the panel." },
    { "name": "icon", "label": "Icon", "kind": "icon", "required": true, "help": "Frame of the icon file." },
    { "name": "condition", "label": "Condition", "kind": "condition", "required": true, "help": "Decides whether the button shows." },
    { "name": "condition_variable", "label": "Condition variable", "kind": "conditionVariable", "required": false, "help": "Passed to the condition." },
    { "name": "action", "label": "Action", "kind": "action", "required": true, "help": "Runs when the button is used." },
    { "name": "action_variable", "label": "Action variable", "kind": "actionVariable", "required": false, "help": "Passed to the action." },
    { "name": "enabled_string", "label": "Enabled string", "kind": "string", "required": true, "help": "Shown while the button is enabled." },
    { "name": "disabled_string", "label": "Disabled string", "kind": "string", "required": true, "help": "Shown while the button is disabled." }
  ],
  "unitFields": [
    { "name": "button_set", "label": "Button set", "kind": "buttonSet", "help": "The set of buttons the entry shows." },
    { "name": "connected_unit", "label": "Connected unit", "kind": "buttonCard", "help": "The entry treated as the same in a mixed group." },
    { "name": "status_changed", "label": "Status changed", "kind": "statusChanged", "help": "Decides whether to redraw the status panel." },
    { "name": "display_function", "label": "Display function", "kind": "displayFunction", "help": "Draws the status panel." },
    { "name": "debug_id", "label": "Debug ID", "kind": "unit", "help": "Unit ID in the status entry." }
  ],
  "functions": {
    "conditions": [
      { "name": "always", "label": "Always", "variable": null },
      { "name": "can_research_tech", "label": "Can research", "variable": "tech" },
      { "name": "can_upgrade", "label": "Can upgrade", "variable": "upgrade" },
      { "name": "can_create_or_morph", "label": "Can build", "variable": "unit" },
      { "name": "is_watching_replay", "label": "Replay playing", "variable": null, "absentOn": ["1.07"] }
    ],
    "actions": [
      { "name": "move", "label": "Move", "variable": null },
      { "name": "research_tech", "label": "Research", "variable": "tech" },
      { "name": "upgrade", "label": "Upgrade", "variable": "upgrade" },
      { "name": "train", "label": "Build", "variable": "unit" },
      { "name": "cancel_train", "label": "Stop building", "variable": "number" },
      { "name": "show_button_card", "label": "Open button card", "variable": "buttonCard" },
      { "name": "play_pause_replay", "label": "Replay play", "variable": null, "absentOn": ["1.07"] }
    ],
    "statusChanged": [
      { "name": "changed_unit", "label": "Unit", "variable": null },
      { "name": "changed_never", "label": "Never", "variable": null }
    ],
    "displayFunction": [
      { "name": "draw_unit", "label": "Unit", "variable": null },
      { "name": "draw_none", "label": "None", "variable": null }
    ]
  },
  "opcodes": [
    { "name": "or", "label": "Or", "parameter": null, "role": "or", "allowedIn": ["unit", "upgrade", "tech_research", "tech_use", "order"] },
    { "name": "current_unit_is", "label": "Current unit is", "parameter": "unit", "allowedIn": ["unit", "upgrade", "tech_research", "tech_use", "order"] },
    { "name": "must_have", "label": "Must have", "parameter": "unit", "allowedIn": ["unit", "upgrade", "tech_research", "tech_use", "order"] },
    { "name": "is_not_lifted_off", "label": "Not lifted off", "parameter": null, "allowedIn": ["unit", "upgrade", "tech_research", "tech_use", "order"] },
    { "name": "must_have_addon", "label": "Must have addon", "parameter": "unit", "allowedIn": ["unit"] },
    { "name": "is_not_training_or_morphing", "label": "Not training or morphing", "parameter": null, "allowedIn": ["unit", "upgrade", "tech_research", "tech_use", "order"] },
    { "name": "is_researched", "label": "Is researched", "parameter": "tech", "allowedIn": ["unit", "upgrade", "tech_research", "tech_use", "order"] },
    { "name": "upgrade_level_1", "label": "Level 1 requires", "parameter": null, "role": "level", "allowedIn": ["upgrade"] },
    { "name": "upgrade_level_2", "label": "Level 2 requires", "parameter": null, "role": "level", "allowedIn": ["upgrade"] },
    { "name": "upgrade_level_3", "label": "Level 3 requires", "parameter": null, "role": "level", "allowedIn": ["upgrade"] },
    { "name": "end_sublist", "label": "End of upgrade level", "parameter": null, "role": "endSublist", "allowedIn": ["upgrade"] }
  ],
  "bareUnit": { "label": "Completed unit", "help": "A unit of this type must exist and be complete." },
  "units": [
    { "id": 0, "name": "Terran Marine", "tree": ["Terran", "Ground Units"], "original": { "button_set": 0, "connected_unit": null, "status_changed": "changed_unit", "display_function": "draw_unit", "debug_id": 0 } },
    { "id": 4, "name": "Goliath Turret", "tree": ["Terran", "Special"], "original": { "button_set": null, "connected_unit": null, "status_changed": "changed_never", "display_function": "draw_none", "debug_id": 4 } },
    { "id": 5, "name": "Terran Siege Tank", "tree": ["Terran", "Ground Units"], "original": { "button_set": 5, "connected_unit": null, "status_changed": "changed_unit", "display_function": "draw_unit", "debug_id": 5 } },
    { "id": 7, "name": "Terran SCV", "tree": ["Terran", "Ground Units"], "original": { "button_set": 7, "connected_unit": null, "status_changed": "changed_unit", "display_function": "draw_unit", "debug_id": 7 } },
    { "id": 10, "name": "Gui Montag", "tree": ["Terran", "Heroes"], "original": { "button_set": 0, "connected_unit": null, "status_changed": "changed_unit", "display_function": "draw_unit", "debug_id": 10 } },
    { "id": 20, "name": "Jim Raynor", "tree": ["Terran", "Heroes"], "original": { "button_set": 0, "connected_unit": null, "status_changed": "changed_unit", "display_function": "draw_unit", "debug_id": 20 } },
    { "id": 32, "name": "Terran Firebat", "tree": ["Terran", "Ground Units"], "original": { "button_set": 0, "connected_unit": null, "status_changed": "changed_unit", "display_function": "draw_unit", "debug_id": 32 } },
    { "id": 228, "name": "No unit", "tree": ["Other"], "original": { "button_set": null } },
    { "id": 232, "name": "Cancel building with rally", "tree": ["Other"], "absentOn": ["1.07"], "original": { "button_set": 232 } },
    { "id": 238, "name": "Zerg basic buildings", "tree": ["Other"], "original": { "button_set": 238 } }
  ],
  "buttonSets": [
    {
      "id": 0, "name": "Marine", "tree": ["Terran"], "entries": [0, 10, 20, 32],
      "original": [
        { "position": 1, "icon": 228, "condition": "always", "action": "move", "enabled_string": 664, "disabled_string": 0 },
        { "position": 7, "icon": 237, "condition": "can_research_tech", "condition_variable": 0, "action": "move", "enabled_string": 334, "disabled_string": 346 }
      ]
    },
    {
      "id": 5, "name": "Siege Tank", "tree": ["Terran"], "entries": [5],
      "original": [
        { "position": 7, "icon": 245, "condition": "can_research_tech", "condition_variable": 5, "action": "research_tech", "action_variable": 5, "enabled_string": 338, "disabled_string": 349 },
        { "position": 7, "icon": 246, "condition": "can_research_tech", "condition_variable": 5, "action": "move", "enabled_string": 339, "disabled_string": 0 }
      ]
    },
    {
      "id": 7, "name": "SCV", "tree": ["Terran"], "entries": [7],
      "original": [
        { "position": 7, "icon": 234, "condition": "always", "action": "show_button_card", "action_variable": 238, "enabled_string": 678, "disabled_string": 0 }
      ]
    },
    {
      "id": 232, "name": "Cancel building with rally", "tree": ["Other"], "entries": [232], "absentOn": ["1.07"],
      "original": [
        { "position": 9, "icon": 236, "condition": "always", "action": "move", "enabled_string": 689, "disabled_string": 0 }
      ]
    },
    {
      "id": 238, "name": "Zerg basic buildings", "tree": ["Other"], "entries": [238],
      "original": [
        { "position": 1, "icon": 131, "condition": "can_create_or_morph", "condition_variable": 131, "action": "train", "action_variable": 131, "enabled_string": 613, "disabled_string": 0 },
        { "position": 9, "icon": 236, "condition": "always", "action": "show_button_card", "action_variable": 228, "enabled_string": 688, "disabled_string": 0 }
      ]
    }
  ],
  "upgrades": [{ "id": 3, "name": "Zerg Carapace", "tree": ["Zerg"] }],
  "techs": [
    { "id": 0, "name": "Stim Packs", "tree": ["Terran"] },
    { "id": 5, "name": "Siege Mode", "tree": ["Terran"] }
  ],
  "orders": [
    { "id": 7, "name": "Reaver stop", "tree": ["Orders"] },
    { "id": 73, "name": "Drone lift off", "tree": ["Orders"] }
  ],
  "requirements": [
    { "type": "unit", "id": 0, "original": { "default": ["current_unit_is", 111, "is_not_lifted_off"] } },
    {
      "type": "upgrade", "id": 3,
      "original": { "default": ["current_unit_is", 139, "is_not_training_or_morphing", "upgrade_level_1", "end_sublist", "upgrade_level_2", 132, "or", "must_have", 133, "end_sublist", "upgrade_level_3", 133] }
    },
    { "type": "tech_use", "id": 0, "original": { "default": ["current_unit_is", 0, "or", "current_unit_is", 32] } },
    { "type": "order", "id": 73, "original": { "default": ["current_unit_is", 41], "perVersion": { "1.16.1": null } } }
  ],
  "constants": [
    {
      "name": "max_supply", "label": "Maximum supply", "group": ["Game", "Supply"], "kind": "number",
      "range": { "min": 0, "max": 65535 }, "note": "Stored in half supply units.", "help": "Supply cap per player.",
      "availability": { "1.07": 400, "1.12": 400, "1.16.1": 400 }
    },
    {
      "name": "terran_start_building", "label": "Terran start building", "group": ["Game", "Start"], "kind": "number",
      "range": { "min": 0, "max": 227 }, "refers": "unit", "help": "Building each Terran player starts with.",
      "availability": { "1.07": 106, "1.12": 106, "1.16.1": 106 }
    },
    {
      "name": "web_duration", "label": "Disruption Web duration", "group": ["Tech"], "kind": "number",
      "range": { "min": 0, "max": 65535 }, "note": "Stored in game frames.", "help": "How long the web lasts.",
      "availability": { "1.07": 900, "1.12": 360, "1.16.1": 360 }
    },
    {
      "name": "team_multiplier", "label": "Team supply multiplier", "group": ["Game", "Supply"], "kind": "number",
      "range": { "min": 0, "max": 65535 }, "help": "Team supply multiplier.",
      "availability": { "1.07": "not_applicable", "1.12": "unknown", "1.16.1": 400 }
    },
    {
      "name": "cloak_energy", "label": "Permanent cloak energy", "group": ["Units"], "kind": "option",
      "options": [
        { "name": "no_regain", "label": "Don't regain energy" },
        { "name": "regain", "label": "Regain energy" }
      ],
      "help": "Whether permanently cloaked units regain energy.",
      "availability": { "1.07": "no_regain", "1.12": "no_regain", "1.16.1": "no_regain" }
    }
  ],
  "icons": { "228": "Move", "236": "Cancel" },
  "strings": { "664": "Move" }
});
