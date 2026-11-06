AxeGraft.registerCatalog({
  "application": "AxeGraft",
  "catalogFormat": 1,
  "modFormat": 1,
  "game": "warcraft2",
  "title": "Warcraft II",
  "parts": ["units", "button_sets", "constants"],
  "versions": [
    {"id": "1.3", "label": "1.3 (DOS)"},
    {"id": "1.33", "label": "1.33 (DOS)"},
    {"id": "1.5", "label": "1.5 (DOS)"},
    {"id": "2.00", "label": "2.00 (Battle.net Edition)"},
    {"id": "2.02", "label": "2.02 (Battle.net Edition)"}
  ],
  "limits": {
    "unit": {"min": 0, "max": 109},
    "tableEntry": {"min": 0, "max": 119},
    "upgrade": {"min": 0, "max": 51},
    "buttonSet": {"min": 0, "max": 999},
    "icon": {"min": 0, "max": 65535},
    "string": {"min": 0, "max": 65535},
    "position": {"min": 0, "max": 8},
    "conditionVariable": {"min": 0, "max": 255},
    "actionVariable": {"min": 0, "max": 255},
    "newButtonSet": {"min": 120, "max": 999}
  },
  "panel": {"columns": 3, "ascending": true},
  "buttonFields": [
    {
      "name": "position",
      "label": "Position",
      "kind": "position",
      "required": true,
      "help": "Where the button sits in the 3 by 3 command panel: 0 to 2 is the top row, 6 to 8 the bottom row. Several buttons may share a position when their conditions exclude each other, such as the shield icons for each armor level. The buttons must be in ascending order of position, because the game fills the panel by walking the list together with the panel's buttons."
    },
    {
      "name": "icon",
      "label": "Icon",
      "kind": "icon",
      "required": true,
      "help": "The number of the icon to show, the same numbering as unit icons."
    },
    {
      "name": "condition",
      "label": "Condition",
      "kind": "condition",
      "required": true,
      "help": "The function that decides whether the command appears. It is called with the condition variable, and the command is shown if it returns non-zero."
    },
    {
      "name": "condition_variable",
      "label": "Condition variable",
      "kind": "conditionVariable",
      "required": false,
      "help": "The byte passed to the condition, such as the upgrade level for icons that change with upgrades, or a spell's bit."
    },
    {
      "name": "action",
      "label": "Action",
      "kind": "action",
      "required": true,
      "help": "The function that runs when the command is used."
    },
    {
      "name": "action_variable",
      "label": "Action variable",
      "kind": "actionVariable",
      "required": false,
      "help": "The byte passed to the action: the unit, building or upgrade to make, the spell's action, or the table entry whose commands to show."
    },
    {
      "name": "string",
      "label": "String",
      "kind": "string",
      "required": true,
      "help": "The string shown at the bottom of the screen while the cursor is over the command. Its first byte is the hotkey."
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
      "help": "The list of commands this table entry shows. Several entries can share a list, so editing a list changes all of them. Choose no buttons to show none."
    },
    {
      "name": "icon",
      "label": "Icon",
      "kind": "icon",
      "help": "The icon shown for this unit in the stats panel when it is selected. It is the unit's own icon, not the one on the button that trains it, though the two are usually the same."
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
      {
        "name": "bf_always",
        "label": "Always",
        "variable": null,
        "help": "Always 1. In 2.00 and 2.02 `bf_can_attack` is the same function."
      },
      {
        "name": "bf_single",
        "label": "One unit selected",
        "variable": null,
        "help": "1 if exactly one unit is selected."
      },
      {
        "name": "bf_not_comp",
        "label": "Under construction",
        "variable": null,
        "help": "1 if the selected unit is not complete (status flag 0x80 clear). Shows Cancel on a building under construction."
      },
      {
        "name": "bf_stop_upgrade",
        "label": "Researching or upgrading",
        "variable": null,
        "help": "1 if the selected unit is busy with something other than training a unit: researching, or upgrading itself."
      },
      {
        "name": "bf_stop_unit",
        "label": "Training a unit",
        "variable": null,
        "help": "1 if the selected unit is busy training a unit."
      },
      {
        "name": "bf_build_Arrows",
        "label": "Can research arrows",
        "variable": "number",
        "help": "Arrow upgrade (upgrade bits 0-1). See *Research* below."
      },
      {
        "name": "bf_has_Arrows",
        "label": "Arrow level",
        "variable": "number",
        "help": "1 if Me's arrow upgrade level equals the variable. Picks the icon for the current level."
      },
      {
        "name": "bf_build_Swords",
        "label": "Can research swords",
        "variable": "number",
        "help": "Sword upgrade (upgrade bits 2-3). See *Research* below."
      },
      {
        "name": "bf_build_catdmg",
        "label": "Can research catapult damage",
        "variable": "number",
        "help": "Ballista and catapult upgrade (upgrade bits 12-13). See *Research* below."
      },
      {
        "name": "bf_build_ranger",
        "label": "Can research Ranger or Berserker",
        "variable": "number",
        "help": "Ranger or Berserker training (upgrade bit 16). Also needs Me to have a keep, stronghold, castle or fortress. See *Research* below."
      },
      {
        "name": "bf_build_longbow",
        "label": "Can research Longbow or Lighter Axes",
        "variable": "number",
        "help": "Longbow or Lighter Axes (upgrade bit 17). Also needs Ranger or Berserker training. See *Research* below."
      },
      {
        "name": "bf_build_scouts",
        "label": "Can research Scouting",
        "variable": "number",
        "help": "Scouting (upgrade bit 18). Also needs Ranger or Berserker training. See *Research* below."
      },
      {
        "name": "bf_build_marks",
        "label": "Can research Marksmanship or Regeneration",
        "variable": "number",
        "help": "Marksmanship or Regeneration (upgrade bit 19). Also needs Ranger or Berserker training. See *Research* below."
      },
      {
        "name": "bf_can_attack",
        "label": "Can attack",
        "variable": null,
        "absentOn": ["2.00", "2.02"],
        "help": "Always 1. A separate function in 1.3, 1.33 and 1.5; in 2.00 and 2.02 the command lists point to `bf_always` instead. The PlayStation source has a check of the selected units here, but it is commented out."
      },
      {
        "name": "bf_has_Swords",
        "label": "Sword level",
        "variable": "number",
        "help": "1 if Me's sword upgrade level equals the variable."
      },
      {
        "name": "bf_build_Shields",
        "label": "Can research shields",
        "variable": "number",
        "help": "Shield upgrade (upgrade bits 4-5). See *Research* below."
      },
      {
        "name": "bf_has_Shields",
        "label": "Shield level",
        "variable": "number",
        "help": "1 if Me's shield upgrade level equals the variable."
      },
      {
        "name": "bf_build_boat_attack",
        "label": "Can research ship cannons",
        "variable": "number",
        "help": "Ship cannon upgrade (upgrade bits 6-7). See *Research* below."
      },
      {
        "name": "bf_has_boat_attack",
        "label": "Ship cannon level",
        "variable": "number",
        "help": "1 if Me's ship cannon upgrade level equals the variable."
      },
      {
        "name": "bf_build_boat_armor",
        "label": "Can research ship armor",
        "variable": "number",
        "help": "Ship armour upgrade (upgrade bits 8-9). See *Research* below."
      },
      {
        "name": "bf_has_boat_armor",
        "label": "Ship armor level",
        "variable": "number",
        "help": "1 if Me's ship armour upgrade level equals the variable."
      },
      {
        "name": "bf_attack_ground",
        "label": "Can attack ground",
        "variable": null,
        "help": "1 if any selected unit's type has Unit Flags bit 14 (Attack Ground) in the UDTA."
      },
      {
        "name": "bf_upgrade_townhall",
        "label": "Can upgrade town hall",
        "variable": "number",
        "help": "If the selected unit is a Town Hall or Great Hall: 1 if the variable is 0, the hall is complete and not busy, bit 27 (Keep) of Me's allowed units is set and Me has a barracks. If it is a Keep or Stronghold: 1 if the variable is 1, the keep is complete and not busy, bit 28 (Castle) is allowed and Me has stables (or an Ogre Mound), a lumber mill and a blacksmith. Otherwise 0."
      },
      {
        "name": "bf_upgrade_tower",
        "label": "Can upgrade tower",
        "variable": "number",
        "help": "If the selected unit is a Scout Tower or Watch Tower (64, 65): with 0, 1 if Me has a lumber mill (Guard Tower); with 1, 1 if Me has a blacksmith (Cannon Tower). It does not check the allowed units or whether the tower is busy."
      },
      {
        "name": "bf_build_Spell",
        "label": "Can research spell",
        "variable": "number",
        "help": "1 if the selected unit is not busy and the spell's bit is not in Researched(Me), is not being researched by Me, and is set in Me's allowed spells."
      },
      {
        "name": "bf_build_CSpell",
        "label": "Can research Paladin spell",
        "variable": "number",
        "help": "`bf_build_Spell`, and Researched(Me) bit 20 (Paladin) is set. Used for Healing, Exorcism, Bloodlust and Runes."
      },
      {
        "name": "bf_has_spell",
        "label": "Has spell",
        "variable": "number",
        "help": "1 if exactly one unit is selected and the spell's bit is set in Researched(Me). It does not look at the unit's mana; `order_spell` does."
      },
      {
        "name": "bf_peon_ok",
        "label": "Can train worker",
        "variable": null,
        "help": "The selected unit is complete (status flag 0x80, see [Status Flags](#status-flags)) and not busy training, researching or upgrading, and bit 1 (Peasant/Peon) of Me's allowed units is set. *Train*, below, means the same test for another bit."
      },
      {
        "name": "bf_sp_ok",
        "label": "Can train archer",
        "variable": null,
        "help": "*Train* bit 4 (Archer/Axethrower), Me has a lumber mill, and Ranger or Berserker training is not researched."
      },
      {
        "name": "bf_rang_ok",
        "label": "Can train Ranger or Berserker",
        "variable": null,
        "help": "*Train* bit 4, Me has a lumber mill, and Ranger or Berserker training is researched."
      },
      {
        "name": "bf_gr_ok",
        "label": "Can train Footman or Grunt",
        "variable": null,
        "help": "*Train* bit 0 (Footman/Grunt)."
      },
      {
        "name": "bf_cat_ok",
        "label": "Can train Ballista or Catapult",
        "variable": null,
        "help": "*Train* bit 2 (Ballista/Catapult), and Me has a blacksmith and a lumber mill."
      },
      {
        "name": "bf_kni_ok",
        "label": "Can train Knight or Ogre",
        "variable": null,
        "help": "*Train* bit 3 (Knight/Ogre), Me has a blacksmith and stables (or an Ogre Mound), and Researched(Me) bit 20 (Paladin) is clear."
      },
      {
        "name": "bf_cleric_ok",
        "label": "Can train Paladin or Ogre-Mage",
        "variable": null,
        "help": "The same as `bf_kni_ok`, but bit 20 must be set (Paladin/Ogre-Mage)."
      },
      {
        "name": "bf_wiz_ok",
        "label": "Can train Mage or Death Knight",
        "variable": null,
        "help": "*Train* bit 5 (Mage/Death Knight)."
      },
      {
        "name": "bf_tanker_ok",
        "label": "Can train Oil Tanker",
        "variable": null,
        "help": "*Train* bit 6 (Oil Tanker)."
      },
      {
        "name": "bf_destroyer_ok",
        "label": "Can train Destroyer",
        "variable": null,
        "help": "*Train* bit 7 (Destroyer)."
      },
      {
        "name": "bf_transport_ok",
        "label": "Can train Transport",
        "variable": null,
        "help": "*Train* bit 8 (Transport), and Me has a foundry."
      },
      {
        "name": "bf_battleship_ok",
        "label": "Can train Battleship or Juggernaught",
        "variable": null,
        "help": "*Train* bit 9 (Battleship/Juggernaught), and Me has a foundry."
      },
      {
        "name": "bf_sub_ok",
        "label": "Can train Submarine or Turtle",
        "variable": null,
        "help": "*Train* bit 10 (Gnomish Submarine/Giant Turtle), and Me has a Gnomish Inventor or Goblin Alchemist."
      },
      {
        "name": "bf_flyer_ok",
        "label": "Can train Flying Machine or Zeppelin",
        "variable": null,
        "help": "*Train* bit 11 (Flying Machine/Zeppelin), and Me has a lumber mill and an inventor or alchemist."
      },
      {
        "name": "bf_demoteam_ok",
        "label": "Can train Demolition Squad or Sappers",
        "variable": null,
        "help": "*Train* bit 14 (Demolition Squad/Sappers), and Me has an inventor or alchemist."
      },
      {
        "name": "bf_dragon_ok",
        "label": "Can train Gryphon Rider or Dragon",
        "variable": null,
        "help": "*Train* bit 12 (Gryphon Rider/Dragon), and Me has a Gryphon Aviary or Dragon Roost."
      },
      {
        "name": "bf_wall_ok",
        "label": "Can build Wall",
        "variable": null,
        "help": "1 in a multiplayer game if bit 31 (Wall) of Me's allowed units is set. In 2.00 and 2.02 it also needs Me's bit in the town hall byte (see below)."
      },
      {
        "name": "bf_thall_ok",
        "label": "Can build Town Hall",
        "variable": null,
        "help": "1 if bit 26 (Town Hall) of Me's allowed units is set."
      },
      {
        "name": "bf_mill_ok",
        "label": "Can build Lumber Mill",
        "variable": null,
        "help": "1 if bit 18 (Lumber Mill) is allowed. In 2.00 and 2.02 it also needs Me's bit in the town hall byte (see below)."
      },
      {
        "name": "bf_smith_ok",
        "label": "Can build Blacksmith",
        "variable": null,
        "help": "1 if bit 29 (Blacksmith) is allowed. In 2.00 and 2.02 it also needs Me's bit in the town hall byte (see below)."
      },
      {
        "name": "bf_farm_ok",
        "label": "Can build Farm",
        "variable": null,
        "help": "1 if bit 16 (Farm) is allowed. In 2.00 and 2.02 it also needs Me's bit in the town hall byte (see below)."
      },
      {
        "name": "bf_barrack_ok",
        "label": "Can build Barracks",
        "variable": null,
        "help": "1 if bit 17 (Barracks) is allowed. In 2.00 and 2.02 it also needs Me's bit in the town hall byte (see below)."
      },
      {
        "name": "bf_tower_ok",
        "label": "Can build Tower",
        "variable": null,
        "help": "1 if bit 25 (Tower) is allowed. In 2.00 and 2.02 it also needs Me's bit in the town hall byte (see below)."
      },
      {
        "name": "bf_wood",
        "label": "Can build a basic structure",
        "variable": null,
        "help": "Build Basic Structure: 1 if exactly one unit is selected and any of `bf_farm_ok`, `bf_barrack_ok`, `bf_thall_ok`, `bf_mill_ok`, `bf_smith_ok`, `bf_wall_ok` and `bf_tower_ok` would be 1."
      },
      {
        "name": "bf_shipyard_ok",
        "label": "Can build Shipyard",
        "variable": null,
        "help": "1 if bit 30 (Shipyard) is allowed and Me has a lumber mill. In 2.00 and 2.02 it also needs Me's bit in the town hall byte (see below)."
      },
      {
        "name": "bf_foundry_ok",
        "label": "Can build Foundry",
        "variable": null,
        "help": "1 if bit 21 (Foundry) is allowed and Me has a shipyard. In 2.00 and 2.02 it also needs Me's bit in the town hall byte (see below)."
      },
      {
        "name": "bf_refinery_ok",
        "label": "Can build Refinery",
        "variable": null,
        "help": "1 if bit 22 (Refinery) is allowed and Me has a shipyard. In 2.00 and 2.02 it also needs Me's bit in the town hall byte (see below)."
      },
      {
        "name": "bf_stable_ok",
        "label": "Can build Stables or Ogre Mound",
        "variable": null,
        "help": "1 if bit 19 (Stables/Ogre Mound) is allowed and Me has a keep, stronghold, castle or fortress."
      },
      {
        "name": "bf_inventor_ok",
        "label": "Can build Inventor or Alchemist",
        "variable": null,
        "help": "1 if bit 23 (Inventor/Alchemist) is allowed and Me has a keep, stronghold, castle or fortress."
      },
      {
        "name": "bf_church_ok",
        "label": "Can build Church or Altar of Storms",
        "variable": null,
        "help": "1 if bit 24 (Church/Altar of Storms) is allowed and Me has a castle or fortress."
      },
      {
        "name": "bf_wiz_tower_ok",
        "label": "Can build Mage Tower or Temple",
        "variable": null,
        "help": "1 if bit 20 (Mage Tower/Temple of the Damned) is allowed and Me has a castle or fortress."
      },
      {
        "name": "bf_aviary_ok",
        "label": "Can build Aviary or Roost",
        "variable": null,
        "help": "1 if bit 15 (Aviary/Dragon Roost) is allowed and Me has a castle or fortress."
      },
      {
        "name": "bf_stone",
        "label": "Can build an advanced structure",
        "variable": null,
        "help": "Build Advanced Structure: 1 if exactly one unit is selected and any of `bf_refinery_ok`, `bf_inventor_ok`, `bf_stable_ok`, `bf_foundry_ok`, `bf_church_ok`, `bf_aviary_ok`, `bf_wiz_tower_ok` and `bf_shipyard_ok` would be 1."
      },
      {
        "name": "bf_no_load",
        "label": "Can harvest",
        "variable": null,
        "help": "Goes through the selected units: 0 at the first unit whose type has neither Unit Flags bit 8 (Peon) nor bit 9 (Tanker) in the UDTA, 1 at the first that is not carrying goods, and 0 if all carry goods. Shows Harvest."
      },
      {
        "name": "bf_load",
        "label": "Carries goods",
        "variable": null,
        "help": "The same, but 1 at the first unit that is carrying goods. Shows Return with Goods."
      },
      {
        "name": "bf_trans_has_passenger",
        "label": "Has passengers",
        "variable": null,
        "help": "1 if exactly one unit is selected and any of its six passenger slots is used. Shows Unload Transport."
      },
      {
        "name": "bf_enhanced_mode",
        "label": "Enhanced mode",
        "variable": null,
        "absentOn": ["1.3", "1.33", "1.5"],
        "help": "2.00 and 2.02 only. Returns the Enhanced-mode flag, so the button is shown only in Enhanced mode. Used by the Patrol button that 2.00 and 2.02 add for units 14, 15, 40, 41 and 45."
      }
    ],
    "actions": [
      {
        "name": "bldg_build_tech",
        "label": "Research upgrade",
        "variable": "upgrade",
        "help": "Researches an upgrade: checks the cost of the upgrade for the selected building, and either shows why it cannot be paid or sends the order (build order 2)."
      },
      {
        "name": "bldg_build_spell",
        "label": "Research spell",
        "variable": "upgrade",
        "help": "Researches a spell, or the upgrade to Paladins or Ogre-Magi, in the same way (build order 1)."
      },
      {
        "name": "bldg_build_man",
        "label": "Train unit",
        "variable": "unit",
        "help": "Trains a unit in the same way (build order 0)."
      },
      {
        "name": "bldg_build_upgrade",
        "label": "Upgrade building",
        "variable": "unit",
        "help": "Upgrades the selected building to another unit type in the same way (build order 3): Keep, Castle, Guard Tower, Cannon Tower."
      },
      {
        "name": "order_stop_build",
        "label": "Cancel training or research",
        "variable": null,
        "help": "Cancels the training, research or upgrade of the selected building."
      },
      {
        "name": "order_kill",
        "label": "Cancel construction",
        "variable": null,
        "help": "Cancels the construction of the selected building."
      },
      {
        "name": "order_guard",
        "label": "Stop",
        "variable": null,
        "help": "Orders the selected units to Stop (action 2) at once."
      },
      {
        "name": "order_unload_all",
        "label": "Unload",
        "variable": null,
        "help": "If the selected transport's current or next action is 32 (Transport at Shore), orders Unload Passengers (action 29) at its own position at once. Otherwise lets the player pick the spot for action 29."
      },
      {
        "name": "order_patrol",
        "label": "Patrol",
        "variable": null,
        "help": "Lets the player pick the target for Patrol (action 5)."
      },
      {
        "name": "order_move",
        "label": "Move",
        "variable": null,
        "help": "Lets the player pick the target for Move (action 3)."
      },
      {
        "name": "order_attack_ground",
        "label": "Attack ground",
        "variable": null,
        "help": "Lets the player pick the target for Attack Ground (action 17)."
      },
      {
        "name": "order_stand_ground",
        "label": "Stand ground",
        "variable": null,
        "help": "Orders the selected units to Stand Ground (action 13) at once."
      },
      {
        "name": "order_attack",
        "label": "Attack",
        "variable": null,
        "help": "Lets the player pick the target for Attack (action 8)."
      },
      {
        "name": "order_demolish",
        "label": "Demolish",
        "variable": null,
        "help": "Lets the player pick the target for Demolish (action 19)."
      },
      {
        "name": "order_harvest",
        "label": "Harvest",
        "variable": null,
        "help": "Lets the player pick the target for Harvest (action 23)."
      },
      {
        "name": "order_repair",
        "label": "Repair",
        "variable": null,
        "help": "Lets the player pick the target for Repair (action 27)."
      },
      {
        "name": "order_return",
        "label": "Return with goods",
        "variable": null,
        "help": "If the selected unit has a place to return goods to, orders Return with Goods (action 24) at once; otherwise shows string 436 (\"Nowhere to return to...cannot return.\")."
      },
      {
        "name": "order_place",
        "label": "Build",
        "variable": "unit",
        "help": "Checks the cost of the building, and either shows why it cannot be paid or starts placing it."
      },
      {
        "name": "placebox_off",
        "label": "Cancel placing",
        "variable": "number",
        "help": "Stops placing a building (Cancel while placing)."
      },
      {
        "name": "order_spell",
        "label": "Cast spell",
        "variable": "number",
        "help": "Unless cheat flag 0x8 is on (`every little thing she does`), shows string 435 (\"Not enough mana to cast spell.\") if the selected unit has less mana than the casting cost of the action, when the unit is Me's. Otherwise orders Eye of Kilrogg (action 48) at once, and for any other spell lets the player pick the target."
      },
      {
        "name": "status_set_card",
        "label": "Show table entry",
        "variable": "tableEntry",
        "help": "Shows the command list entry given by the variable instead of the selected unit's own (see [Command Lists](#command-lists))."
      },
      {
        "name": "target_off",
        "label": "Cancel targeting",
        "variable": "number",
        "help": "Stops picking a target (Cancel while picking a target)."
      }
    ],
    "statusChanged": [
      {"name": "statdraw_query_none", "label": "Never", "variable": null, "help": "Always 0."},
      {
        "name": "statdraw_query_unit",
        "label": "Unit",
        "variable": null,
        "help": "1 if the hit points or mana of any selected unit have changed, or whether the progress bar is needed has changed."
      },
      {
        "name": "statdraw_query_bldg",
        "label": "Building",
        "variable": null,
        "help": "The same for the selected building."
      },
      {
        "name": "statdraw_query_peon",
        "label": "Worker",
        "variable": null,
        "help": "1 if the worker has picked up or delivered goods; otherwise as `statdraw_query_unit`."
      },
      {
        "name": "statdraw_query_tanker",
        "label": "Oil Tanker",
        "variable": null,
        "help": "The same as `statdraw_query_peon`."
      },
      {
        "name": "statdraw_query_transport",
        "label": "Transport",
        "variable": null,
        "help": "1 if the passengers have changed; otherwise as `statdraw_query_unit`."
      },
      {
        "name": "statdraw_query_farm",
        "label": "Farm",
        "variable": null,
        "help": "1 if Me's food used or food supply has changed; otherwise as `statdraw_query_bldg`. In 2.00 and 2.02, in Enhanced mode, the food supply is counted as at most 200."
      },
      {
        "name": "statdraw_query_mine",
        "label": "Gold Mine",
        "variable": null,
        "help": "1 if the gold left has changed; otherwise as `statdraw_query_bldg`."
      },
      {
        "name": "statdraw_query_barracks",
        "label": "Training building",
        "variable": null,
        "help": "1 if the unit being trained has changed; otherwise as `statdraw_query_bldg`."
      },
      {
        "name": "statdraw_query_oilrig",
        "label": "Oil Platform",
        "variable": null,
        "help": "1 if the oil left has changed; otherwise as `statdraw_query_bldg`."
      }
    ],
    "statusUpdate": [
      {"name": "statdraw_draw_none", "label": "Nothing", "variable": null, "help": "Nothing."},
      {
        "name": "statdraw_draw_unit",
        "label": "Name and hit points",
        "variable": null,
        "help": "Name, level and hit points only."
      },
      {
        "name": "statdraw_draw_grunt",
        "label": "Fighter",
        "variable": null,
        "help": "Armour, damage, range, sight and speed, counting the sword (or axe) and shield upgrades. Mana (\"Magic:\") only for unit types with Unit Flags bit 17 (Spellcaster) in the UDTA."
      },
      {
        "name": "statdraw_draw_catapult",
        "label": "Ballista or Catapult",
        "variable": null,
        "help": "Armour, damage, range, sight and speed, counting the ballista and catapult upgrade. No mana."
      },
      {
        "name": "statdraw_draw_archer",
        "label": "Archer",
        "variable": null,
        "help": "Armour, damage, range, sight and speed, counting the arrow and shield upgrades and the four ranger or berserker upgrades. No mana."
      },
      {
        "name": "statdraw_draw_bldg",
        "label": "Building",
        "variable": null,
        "help": "Name, and hit points for Me's buildings."
      },
      {
        "name": "statdraw_draw_peon",
        "label": "Worker",
        "variable": null,
        "help": "As `statdraw_draw_grunt` (workers)."
      },
      {
        "name": "statdraw_draw_transport",
        "label": "Transport",
        "variable": null,
        "help": "While it carries passengers, only name, level and hit points (as `statdraw_draw_unit`); otherwise the stats as `statdraw_draw_destroyer`, counting the ship armour upgrade."
      },
      {
        "name": "statdraw_draw_destroyer",
        "label": "Ship",
        "variable": null,
        "help": "Armour, damage, range, sight and speed, counting the ship cannon and ship armour upgrades."
      },
      {
        "name": "statdraw_draw_farm",
        "label": "Farm",
        "variable": null,
        "help": "Food usage (food used and grown, as in [String Numbers](#string-numbers))."
      },
      {"name": "statdraw_draw_mine", "label": "Gold Mine", "variable": null, "help": "Gold left."},
      {
        "name": "statdraw_draw_barracks",
        "label": "Barracks",
        "variable": null,
        "help": "The unit being trained."
      },
      {
        "name": "statdraw_draw_town_hall",
        "label": "Town Hall",
        "variable": null,
        "help": "The unit being trained or the upgrade in progress; otherwise gold, lumber and oil production."
      },
      {
        "name": "statdraw_draw_shipyard",
        "label": "Shipyard",
        "variable": null,
        "help": "The unit being trained."
      },
      {
        "name": "statdraw_draw_mill",
        "label": "Lumber Mill",
        "variable": null,
        "help": "The research in progress; otherwise lumber production."
      },
      {
        "name": "statdraw_draw_smith",
        "label": "Blacksmith or Foundry",
        "variable": null,
        "help": "The research in progress."
      },
      {
        "name": "statdraw_draw_church",
        "label": "Church",
        "variable": null,
        "help": "The research in progress."
      },
      {
        "name": "statdraw_draw_mage_tower",
        "label": "Mage Tower",
        "variable": null,
        "help": "The research or training in progress."
      },
      {
        "name": "statdraw_draw_scout_tower",
        "label": "Scout Tower",
        "variable": null,
        "help": "The upgrade in progress."
      },
      {
        "name": "statdraw_draw_attack_tower",
        "label": "Guard or Cannon Tower",
        "variable": null,
        "help": "Armour, damage, range and sight (guard and cannon towers). No upgrades are counted."
      },
      {"name": "statdraw_draw_refinery", "label": "Refinery", "variable": null, "help": "Oil production."},
      {"name": "statdraw_draw_oilrig", "label": "Oil Platform", "variable": null, "help": "Oil left."}
    ]
  },
  "units": [
    {
      "id": 0,
      "name": "Footman",
      "tree": ["Human", "Land Units"],
      "original": {
        "button_set": 0,
        "icon": 2,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 1,
      "name": "Grunt",
      "tree": ["Orc", "Land Units"],
      "original": {
        "button_set": 1,
        "icon": 3,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 2,
      "name": "Peasant",
      "tree": ["Human", "Land Units"],
      "original": {
        "button_set": 2,
        "icon": 0,
        "status_changed": "statdraw_query_peon",
        "status_update": "statdraw_draw_peon"
      }
    },
    {
      "id": 3,
      "name": "Peon",
      "tree": ["Orc", "Land Units"],
      "original": {
        "button_set": 3,
        "icon": 1,
        "status_changed": "statdraw_query_peon",
        "status_update": "statdraw_draw_peon"
      }
    },
    {
      "id": 4,
      "name": "Ballista",
      "tree": ["Human", "Land Units"],
      "original": {
        "button_set": 0,
        "icon": 16,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_catapult"
      }
    },
    {
      "id": 5,
      "name": "Catapult",
      "tree": ["Orc", "Land Units"],
      "original": {
        "button_set": 1,
        "icon": 17,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_catapult"
      }
    },
    {
      "id": 6,
      "name": "Knight",
      "tree": ["Human", "Land Units"],
      "original": {
        "button_set": 6,
        "icon": 8,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 7,
      "name": "Ogre",
      "tree": ["Orc", "Land Units"],
      "original": {
        "button_set": 7,
        "icon": 9,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 8,
      "name": "Elven Archer",
      "tree": ["Human", "Land Units"],
      "original": {
        "button_set": 8,
        "icon": 4,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_archer"
      }
    },
    {
      "id": 9,
      "name": "Troll Axethrower",
      "tree": ["Orc", "Land Units"],
      "original": {
        "button_set": 9,
        "icon": 5,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_archer"
      }
    },
    {
      "id": 10,
      "name": "Mage",
      "tree": ["Human", "Land Units"],
      "original": {
        "button_set": 10,
        "icon": 14,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 11,
      "name": "Death Knight",
      "tree": ["Orc", "Land Units"],
      "original": {
        "button_set": 11,
        "icon": 15,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 12,
      "name": "Paladin",
      "tree": ["Human", "Land Units"],
      "original": {
        "button_set": 12,
        "icon": 10,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 13,
      "name": "Ogre-Mage",
      "tree": ["Orc", "Land Units"],
      "original": {
        "button_set": 13,
        "icon": 11,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 14,
      "name": "Dwarven Demolition Squad",
      "tree": ["Human", "Land Units"],
      "original": {
        "button_set": 14,
        "icon": 12,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 15,
      "name": "Goblin Sappers",
      "tree": ["Orc", "Land Units"],
      "original": {
        "button_set": 15,
        "icon": 13,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 16,
      "name": "Attack Peasant",
      "tree": ["Human", "Land Units"],
      "original": {
        "button_set": 16,
        "icon": 0,
        "status_changed": "statdraw_query_peon",
        "status_update": "statdraw_draw_peon"
      }
    },
    {
      "id": 17,
      "name": "Attack Peon",
      "tree": ["Orc", "Land Units"],
      "original": {
        "button_set": 17,
        "icon": 1,
        "status_changed": "statdraw_query_peon",
        "status_update": "statdraw_draw_peon"
      }
    },
    {
      "id": 18,
      "name": "Ranger",
      "tree": ["Human", "Land Units"],
      "original": {
        "button_set": 8,
        "icon": 6,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_archer"
      }
    },
    {
      "id": 19,
      "name": "Berserker",
      "tree": ["Orc", "Land Units"],
      "original": {
        "button_set": 9,
        "icon": 7,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_archer"
      }
    },
    {
      "id": 20,
      "name": "Alleria",
      "tree": ["Human", "Heroes"],
      "original": {
        "button_set": 8,
        "icon": 187,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_archer"
      }
    },
    {
      "id": 21,
      "name": "Teron Gorefiend",
      "tree": ["Orc", "Heroes"],
      "original": {
        "button_set": 11,
        "icon": 189,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 22,
      "name": "Kurdran and Sky'ree",
      "tree": ["Human", "Heroes"],
      "original": {
        "button_set": 0,
        "icon": 191,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 23,
      "name": "Dentarg",
      "tree": ["Orc", "Heroes"],
      "original": {
        "button_set": 13,
        "icon": 194,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 24,
      "name": "Khadgar",
      "tree": ["Human", "Heroes"],
      "original": {
        "button_set": 10,
        "icon": 193,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 25,
      "name": "Grom Hellscream",
      "tree": ["Orc", "Heroes"],
      "original": {
        "button_set": 1,
        "icon": 190,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 26,
      "name": "Oil Tanker (human)",
      "tree": ["Human", "Sea Units"],
      "original": {
        "button_set": 26,
        "icon": 18,
        "status_changed": "statdraw_query_tanker",
        "status_update": "statdraw_draw_destroyer"
      }
    },
    {
      "id": 27,
      "name": "Oil Tanker (orc)",
      "tree": ["Orc", "Sea Units"],
      "original": {
        "button_set": 27,
        "icon": 19,
        "status_changed": "statdraw_query_tanker",
        "status_update": "statdraw_draw_destroyer"
      }
    },
    {
      "id": 28,
      "name": "Transport (human)",
      "tree": ["Human", "Sea Units"],
      "original": {
        "button_set": 28,
        "icon": 20,
        "status_changed": "statdraw_query_transport",
        "status_update": "statdraw_draw_transport"
      }
    },
    {
      "id": 29,
      "name": "Transport (orc)",
      "tree": ["Orc", "Sea Units"],
      "original": {
        "button_set": 29,
        "icon": 21,
        "status_changed": "statdraw_query_transport",
        "status_update": "statdraw_draw_transport"
      }
    },
    {
      "id": 30,
      "name": "Elven Destroyer",
      "tree": ["Human", "Sea Units"],
      "original": {
        "button_set": 30,
        "icon": 22,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_destroyer"
      }
    },
    {
      "id": 31,
      "name": "Troll Destroyer",
      "tree": ["Orc", "Sea Units"],
      "original": {
        "button_set": 31,
        "icon": 23,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_destroyer"
      }
    },
    {
      "id": 32,
      "name": "Battleship",
      "tree": ["Human", "Sea Units"],
      "original": {
        "button_set": 30,
        "icon": 24,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_destroyer"
      }
    },
    {
      "id": 33,
      "name": "Juggernaught",
      "tree": ["Orc", "Sea Units"],
      "original": {
        "button_set": 31,
        "icon": 25,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_destroyer"
      }
    },
    {
      "id": 34,
      "name": "Unused",
      "tree": ["Other", "Unused"],
      "original": {
        "button_set": 30,
        "icon": 0,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_unit"
      }
    },
    {
      "id": 35,
      "name": "Deathwing",
      "tree": ["Orc", "Heroes"],
      "original": {
        "button_set": 1,
        "icon": 192,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 36,
      "name": "Unused",
      "tree": ["Other", "Unused"],
      "original": {
        "button_set": 0,
        "icon": 0,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_unit"
      }
    },
    {
      "id": 37,
      "name": "Unused",
      "tree": ["Other", "Unused"],
      "original": {
        "button_set": 1,
        "icon": 0,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_unit"
      }
    },
    {
      "id": 38,
      "name": "Gnomish Submarine",
      "tree": ["Human", "Sea Units"],
      "original": {
        "button_set": 38,
        "icon": 26,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_destroyer"
      }
    },
    {
      "id": 39,
      "name": "Giant Turtle",
      "tree": ["Orc", "Sea Units"],
      "original": {
        "button_set": 39,
        "icon": 27,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_destroyer"
      }
    },
    {
      "id": 40,
      "name": "Gnomish Flying Machine",
      "tree": ["Human", "Air Units"],
      "original": {
        "button_set": 40,
        "icon": 28,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 41,
      "name": "Goblin Zeppelin",
      "tree": ["Orc", "Air Units"],
      "original": {
        "button_set": 41,
        "icon": 29,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 42,
      "name": "Gryphon Rider",
      "tree": ["Human", "Air Units"],
      "original": {
        "button_set": 0,
        "icon": 30,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 43,
      "name": "Dragon",
      "tree": ["Orc", "Air Units"],
      "original": {
        "button_set": 1,
        "icon": 31,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 44,
      "name": "Turalyon",
      "tree": ["Human", "Heroes"],
      "original": {
        "button_set": 12,
        "icon": 195,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 45,
      "name": "Eye of Kilrogg",
      "tree": ["Orc", "Air Units"],
      "original": {
        "button_set": 41,
        "icon": 111,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 46,
      "name": "Danath",
      "tree": ["Human", "Heroes"],
      "original": {
        "button_set": 0,
        "icon": 188,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 47,
      "name": "Korgath Bladefist",
      "tree": ["Orc", "Heroes"],
      "original": {
        "button_set": 1,
        "icon": 186,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 48,
      "name": "Unused",
      "tree": ["Other", "Unused"],
      "original": {
        "button_set": null,
        "icon": 0,
        "status_changed": "statdraw_query_none",
        "status_update": "statdraw_draw_none"
      }
    },
    {
      "id": 49,
      "name": "Cho'gall",
      "tree": ["Orc", "Heroes"],
      "original": {
        "button_set": 49,
        "icon": 36,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 50,
      "name": "Lothar",
      "tree": ["Human", "Heroes"],
      "original": {
        "button_set": 12,
        "icon": 32,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 51,
      "name": "Gul'dan",
      "tree": ["Orc", "Heroes"],
      "original": {
        "button_set": 11,
        "icon": 33,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 52,
      "name": "Uther Lightbringer",
      "tree": ["Human", "Heroes"],
      "original": {
        "button_set": 12,
        "icon": 34,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 53,
      "name": "Zul'jin",
      "tree": ["Orc", "Heroes"],
      "original": {
        "button_set": 9,
        "icon": 35,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_archer"
      }
    },
    {
      "id": 54,
      "name": "Unused",
      "tree": ["Other", "Unused"],
      "original": {
        "button_set": null,
        "icon": 0,
        "status_changed": "statdraw_query_none",
        "status_update": "statdraw_draw_none"
      }
    },
    {
      "id": 55,
      "name": "Skeleton",
      "tree": ["Orc", "Land Units"],
      "original": {
        "button_set": 1,
        "icon": 114,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_grunt"
      }
    },
    {
      "id": 56,
      "name": "Daemon",
      "tree": ["Neutral"],
      "original": {
        "button_set": 1,
        "icon": 37,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_unit"
      }
    },
    {
      "id": 57,
      "name": "Critter",
      "tree": ["Neutral"],
      "original": {
        "button_set": null,
        "icon": 115,
        "status_changed": "statdraw_query_unit",
        "status_update": "statdraw_draw_unit"
      }
    },
    {
      "id": 58,
      "name": "Farm",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": null,
        "icon": 38,
        "status_changed": "statdraw_query_farm",
        "status_update": "statdraw_draw_farm"
      }
    },
    {
      "id": 59,
      "name": "Pig Farm",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": null,
        "icon": 39,
        "status_changed": "statdraw_query_farm",
        "status_update": "statdraw_draw_farm"
      }
    },
    {
      "id": 60,
      "name": "Barracks (human)",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": 60,
        "icon": 42,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_barracks"
      }
    },
    {
      "id": 61,
      "name": "Barracks (orc)",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": 61,
        "icon": 43,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_barracks"
      }
    },
    {
      "id": 62,
      "name": "Church",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": 62,
        "icon": 62,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_church"
      }
    },
    {
      "id": 63,
      "name": "Altar of Storms",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": 63,
        "icon": 63,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_church"
      }
    },
    {
      "id": 64,
      "name": "Scout Tower (human)",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": 64,
        "icon": 60,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_scout_tower"
      }
    },
    {
      "id": 65,
      "name": "Watch Tower (orc)",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": 65,
        "icon": 61,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_scout_tower"
      }
    },
    {
      "id": 66,
      "name": "Stables",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": null,
        "icon": 56,
        "status_changed": "statdraw_query_bldg",
        "status_update": "statdraw_draw_bldg"
      }
    },
    {
      "id": 67,
      "name": "Ogre Mound",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": null,
        "icon": 57,
        "status_changed": "statdraw_query_bldg",
        "status_update": "statdraw_draw_bldg"
      }
    },
    {
      "id": 68,
      "name": "Gnomish Inventor",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": 68,
        "icon": 58,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_barracks"
      }
    },
    {
      "id": 69,
      "name": "Goblin Alchemist",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": 69,
        "icon": 59,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_barracks"
      }
    },
    {
      "id": 70,
      "name": "Gryphon Aviary",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": 70,
        "icon": 72,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_barracks"
      }
    },
    {
      "id": 71,
      "name": "Dragon Roost",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": 71,
        "icon": 73,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_barracks"
      }
    },
    {
      "id": 72,
      "name": "Shipyard (human)",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": 72,
        "icon": 48,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_shipyard"
      }
    },
    {
      "id": 73,
      "name": "Shipyard (orc)",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": 73,
        "icon": 49,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_shipyard"
      }
    },
    {
      "id": 74,
      "name": "Town Hall",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": 74,
        "icon": 40,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_town_hall"
      }
    },
    {
      "id": 75,
      "name": "Great Hall",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": 75,
        "icon": 41,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_town_hall"
      }
    },
    {
      "id": 76,
      "name": "Elven Lumber Mill",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": 76,
        "icon": 44,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_mill"
      }
    },
    {
      "id": 77,
      "name": "Troll Lumber Mill",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": 77,
        "icon": 45,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_mill"
      }
    },
    {
      "id": 78,
      "name": "Foundry (human)",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": 78,
        "icon": 52,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_smith"
      }
    },
    {
      "id": 79,
      "name": "Foundry (orc)",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": 79,
        "icon": 53,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_smith"
      }
    },
    {
      "id": 80,
      "name": "Mage Tower",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": 80,
        "icon": 64,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_mage_tower"
      }
    },
    {
      "id": 81,
      "name": "Temple of the Damned",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": 81,
        "icon": 65,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_mage_tower"
      }
    },
    {
      "id": 82,
      "name": "Blacksmith (human)",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": 82,
        "icon": 46,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_smith"
      }
    },
    {
      "id": 83,
      "name": "Blacksmith (orc)",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": 83,
        "icon": 47,
        "status_changed": "statdraw_query_barracks",
        "status_update": "statdraw_draw_smith"
      }
    },
    {
      "id": 84,
      "name": "Refinery (human)",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": null,
        "icon": 50,
        "status_changed": "statdraw_query_bldg",
        "status_update": "statdraw_draw_refinery"
      }
    },
    {
      "id": 85,
      "name": "Refinery (orc)",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": null,
        "icon": 51,
        "status_changed": "statdraw_query_bldg",
        "status_update": "statdraw_draw_refinery"
      }
    },
    {
      "id": 86,
      "name": "Oil Platform (human)",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": null,
        "icon": 54,
        "status_changed": "statdraw_query_oilrig",
        "status_update": "statdraw_draw_oilrig"
      }
    },
    {
      "id": 87,
      "name": "Oil Platform (orc)",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": null,
        "icon": 55,
        "status_changed": "statdraw_query_oilrig",
        "status_update": "statdraw_draw_oilrig"
      }
    },
    {
      "id": 88,
      "name": "Keep",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": 74,
        "icon": 66,
        "status_changed": "statdraw_query_bldg",
        "status_update": "statdraw_draw_town_hall"
      }
    },
    {
      "id": 89,
      "name": "Stronghold",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": 75,
        "icon": 67,
        "status_changed": "statdraw_query_bldg",
        "status_update": "statdraw_draw_town_hall"
      }
    },
    {
      "id": 90,
      "name": "Castle",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": 74,
        "icon": 70,
        "status_changed": "statdraw_query_bldg",
        "status_update": "statdraw_draw_town_hall"
      }
    },
    {
      "id": 91,
      "name": "Fortress",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": 75,
        "icon": 71,
        "status_changed": "statdraw_query_bldg",
        "status_update": "statdraw_draw_town_hall"
      }
    },
    {
      "id": 92,
      "name": "Gold Mine",
      "tree": ["Neutral"],
      "original": {
        "button_set": null,
        "icon": 74,
        "status_changed": "statdraw_query_mine",
        "status_update": "statdraw_draw_mine"
      }
    },
    {
      "id": 93,
      "name": "Oil Patch",
      "tree": ["Neutral"],
      "original": {
        "button_set": null,
        "icon": 79,
        "status_changed": "statdraw_query_oilrig",
        "status_update": "statdraw_draw_oilrig"
      }
    },
    {
      "id": 94,
      "name": "Human start location",
      "tree": ["Other", "Special"],
      "original": {
        "button_set": null,
        "icon": 0,
        "status_changed": "statdraw_query_none",
        "status_update": "statdraw_draw_none"
      }
    },
    {
      "id": 95,
      "name": "Orc start location",
      "tree": ["Other", "Special"],
      "original": {
        "button_set": null,
        "icon": 0,
        "status_changed": "statdraw_query_none",
        "status_update": "statdraw_draw_none"
      }
    },
    {
      "id": 96,
      "name": "Guard Tower (human)",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": 64,
        "icon": 75,
        "status_changed": "statdraw_query_bldg",
        "status_update": "statdraw_draw_attack_tower"
      }
    },
    {
      "id": 97,
      "name": "Guard Tower (orc)",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": 65,
        "icon": 77,
        "status_changed": "statdraw_query_bldg",
        "status_update": "statdraw_draw_attack_tower"
      }
    },
    {
      "id": 98,
      "name": "Cannon Tower (human)",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": 64,
        "icon": 76,
        "status_changed": "statdraw_query_bldg",
        "status_update": "statdraw_draw_attack_tower"
      }
    },
    {
      "id": 99,
      "name": "Cannon Tower (orc)",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": 65,
        "icon": 78,
        "status_changed": "statdraw_query_bldg",
        "status_update": "statdraw_draw_attack_tower"
      }
    },
    {
      "id": 100,
      "name": "Circle of Power",
      "tree": ["Neutral"],
      "original": {
        "button_set": null,
        "icon": 81,
        "status_changed": "statdraw_query_bldg",
        "status_update": "statdraw_draw_bldg"
      }
    },
    {
      "id": 101,
      "name": "Dark Portal",
      "tree": ["Neutral"],
      "original": {
        "button_set": null,
        "icon": 80,
        "status_changed": "statdraw_query_bldg",
        "status_update": "statdraw_draw_bldg"
      }
    },
    {
      "id": 102,
      "name": "Runestone",
      "tree": ["Neutral"],
      "original": {
        "button_set": null,
        "icon": 82,
        "status_changed": "statdraw_query_bldg",
        "status_update": "statdraw_draw_bldg"
      }
    },
    {
      "id": 103,
      "name": "Wall (human)",
      "tree": ["Human", "Buildings"],
      "original": {
        "button_set": null,
        "icon": 92,
        "status_changed": "statdraw_query_bldg",
        "status_update": "statdraw_draw_bldg"
      }
    },
    {
      "id": 104,
      "name": "Wall (orc)",
      "tree": ["Orc", "Buildings"],
      "original": {
        "button_set": null,
        "icon": 93,
        "status_changed": "statdraw_query_bldg",
        "status_update": "statdraw_draw_bldg"
      }
    },
    {
      "id": 105,
      "name": "Dead body",
      "tree": ["Other", "Special"],
      "original": {
        "button_set": null,
        "icon": 0,
        "status_changed": "statdraw_query_none",
        "status_update": "statdraw_draw_none"
      }
    },
    {
      "id": 106,
      "name": "Destroyed site (1x1)",
      "tree": ["Other", "Special"],
      "original": {
        "button_set": null,
        "icon": 0,
        "status_changed": "statdraw_query_none",
        "status_update": "statdraw_draw_none"
      }
    },
    {
      "id": 107,
      "name": "Destroyed site (2x2)",
      "tree": ["Other", "Special"],
      "original": {
        "button_set": null,
        "icon": 0,
        "status_changed": "statdraw_query_none",
        "status_update": "statdraw_draw_none"
      }
    },
    {
      "id": 108,
      "name": "Destroyed site (3x3)",
      "tree": ["Other", "Special"],
      "original": {
        "button_set": null,
        "icon": 0,
        "status_changed": "statdraw_query_none",
        "status_update": "statdraw_draw_none"
      }
    },
    {
      "id": 109,
      "name": "Destroyed site (4x4)",
      "tree": ["Other", "Special"],
      "original": {
        "button_set": null,
        "icon": 0,
        "status_changed": "statdraw_query_none",
        "status_update": "statdraw_draw_none"
      }
    },
    {"id": 110, "name": "Blank", "tree": ["Other", "Menus"], "original": {"button_set": null}},
    {"id": 111, "name": "Human Basic Build", "tree": ["Other", "Menus"], "original": {"button_set": 111}},
    {"id": 112, "name": "Human Advanced Build", "tree": ["Other", "Menus"], "original": {"button_set": 112}},
    {"id": 113, "name": "Orc Basic Build", "tree": ["Other", "Menus"], "original": {"button_set": 113}},
    {"id": 114, "name": "Orc Advanced Build", "tree": ["Other", "Menus"], "original": {"button_set": 114}},
    {"id": 115, "name": "Cancel (target)", "tree": ["Other", "Menus"], "original": {"button_set": 115}},
    {"id": 116, "name": "Cancel (placing)", "tree": ["Other", "Menus"], "original": {"button_set": 116}},
    {"id": 117, "name": "Cancel group", "tree": ["Other", "Menus"], "original": {"button_set": 117}},
    {"id": 118, "name": "Human group", "tree": ["Other", "Menus"], "original": {"button_set": 118}},
    {"id": 119, "name": "Orc group", "tree": ["Other", "Menus"], "original": {"button_set": 119}}
  ],
  "buttonSets": [
    {
      "id": 0,
      "name": "Footman",
      "tree": ["Human"],
      "entries": [0, 4, 22, 36, 42, 46],
      "original": [
        {
          "position": 0,
          "icon": 83,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 164,
          "condition": "bf_has_Shields",
          "condition_variable": 0,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 165,
          "condition": "bf_has_Shields",
          "condition_variable": 1,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 166,
          "condition": "bf_has_Shields",
          "condition_variable": 2,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 116,
          "condition": "bf_has_Swords",
          "condition_variable": 0,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 117,
          "condition": "bf_has_Swords",
          "condition_variable": 1,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 118,
          "condition": "bf_has_Swords",
          "condition_variable": 2,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 3,
          "icon": 178,
          "condition": "bf_always",
          "action": "order_patrol",
          "string": 404,
          "highlighted": 4
        },
        {
          "position": 4,
          "icon": 180,
          "condition": "bf_always",
          "action": "order_stand_ground",
          "string": 403,
          "highlighted": 16
        },
        {
          "position": 5,
          "icon": 182,
          "condition": "bf_attack_ground",
          "action": "order_attack_ground",
          "string": 402,
          "highlighted": 32
        }
      ]
    },
    {
      "id": 1,
      "name": "Grunt",
      "tree": ["Orc"],
      "entries": [1, 5, 25, 35, 37, 43, 47, 55, 56],
      "original": [
        {
          "position": 0,
          "icon": 84,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 167,
          "condition": "bf_has_Shields",
          "condition_variable": 0,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 168,
          "condition": "bf_has_Shields",
          "condition_variable": 1,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 169,
          "condition": "bf_has_Shields",
          "condition_variable": 2,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 119,
          "condition": "bf_has_Swords",
          "condition_variable": 0,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 120,
          "condition": "bf_has_Swords",
          "condition_variable": 1,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 121,
          "condition": "bf_has_Swords",
          "condition_variable": 2,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 3,
          "icon": 179,
          "condition": "bf_always",
          "action": "order_patrol",
          "string": 404,
          "highlighted": 4
        },
        {
          "position": 4,
          "icon": 181,
          "condition": "bf_always",
          "action": "order_stand_ground",
          "string": 403,
          "highlighted": 16
        },
        {
          "position": 5,
          "icon": 183,
          "condition": "bf_attack_ground",
          "action": "order_attack_ground",
          "string": 402,
          "highlighted": 32
        }
      ]
    },
    {
      "id": 2,
      "name": "Peasant",
      "tree": ["Human"],
      "entries": [2],
      "original": [
        {
          "position": 0,
          "icon": 83,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 164,
          "condition": "bf_always",
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 116,
          "condition": "bf_always",
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 3,
          "icon": 85,
          "condition": "bf_always",
          "action": "order_repair",
          "string": 395,
          "highlighted": 256
        },
        {
          "position": 4,
          "icon": 86,
          "condition": "bf_no_load",
          "action": "order_harvest",
          "string": 396,
          "highlighted": 64
        },
        {
          "position": 5,
          "icon": 89,
          "condition": "bf_load",
          "action": "order_return",
          "string": 401,
          "highlighted": 128
        },
        {
          "position": 6,
          "icon": 87,
          "condition": "bf_wood",
          "action": "status_set_card",
          "action_variable": 111,
          "string": 398,
          "highlighted": 0
        },
        {
          "position": 7,
          "icon": 88,
          "condition": "bf_stone",
          "action": "status_set_card",
          "action_variable": 112,
          "string": 399,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 3,
      "name": "Peon",
      "tree": ["Orc"],
      "entries": [3],
      "original": [
        {
          "position": 0,
          "icon": 84,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 167,
          "condition": "bf_always",
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 119,
          "condition": "bf_always",
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 3,
          "icon": 85,
          "condition": "bf_always",
          "action": "order_repair",
          "string": 395,
          "highlighted": 256
        },
        {
          "position": 4,
          "icon": 86,
          "condition": "bf_no_load",
          "action": "order_harvest",
          "string": 396,
          "highlighted": 64
        },
        {
          "position": 5,
          "icon": 90,
          "condition": "bf_load",
          "action": "order_return",
          "string": 401,
          "highlighted": 128
        },
        {
          "position": 6,
          "icon": 87,
          "condition": "bf_wood",
          "action": "status_set_card",
          "action_variable": 113,
          "string": 398,
          "highlighted": 0
        },
        {
          "position": 7,
          "icon": 88,
          "condition": "bf_stone",
          "action": "status_set_card",
          "action_variable": 114,
          "string": 399,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 6,
      "name": "Knight",
      "tree": ["Human"],
      "entries": [6],
      "original": [
        {
          "position": 0,
          "icon": 83,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 164,
          "condition": "bf_has_Shields",
          "condition_variable": 0,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 165,
          "condition": "bf_has_Shields",
          "condition_variable": 1,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 166,
          "condition": "bf_has_Shields",
          "condition_variable": 2,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 116,
          "condition": "bf_has_Swords",
          "condition_variable": 0,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 117,
          "condition": "bf_has_Swords",
          "condition_variable": 1,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 118,
          "condition": "bf_has_Swords",
          "condition_variable": 2,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 3,
          "icon": 178,
          "condition": "bf_always",
          "action": "order_patrol",
          "string": 404,
          "highlighted": 4
        },
        {
          "position": 4,
          "icon": 180,
          "condition": "bf_always",
          "action": "order_stand_ground",
          "string": 403,
          "highlighted": 16
        }
      ]
    },
    {
      "id": 7,
      "name": "Ogre",
      "tree": ["Orc"],
      "entries": [7],
      "original": [
        {
          "position": 0,
          "icon": 84,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 167,
          "condition": "bf_has_Shields",
          "condition_variable": 0,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 168,
          "condition": "bf_has_Shields",
          "condition_variable": 1,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 169,
          "condition": "bf_has_Shields",
          "condition_variable": 2,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 119,
          "condition": "bf_has_Swords",
          "condition_variable": 0,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 120,
          "condition": "bf_has_Swords",
          "condition_variable": 1,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 121,
          "condition": "bf_has_Swords",
          "condition_variable": 2,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 3,
          "icon": 179,
          "condition": "bf_always",
          "action": "order_patrol",
          "string": 404,
          "highlighted": 4
        },
        {
          "position": 4,
          "icon": 181,
          "condition": "bf_always",
          "action": "order_stand_ground",
          "string": 403,
          "highlighted": 16
        }
      ]
    },
    {
      "id": 8,
      "name": "Elven Archer",
      "tree": ["Human"],
      "entries": [8, 18, 20],
      "original": [
        {
          "position": 0,
          "icon": 83,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 164,
          "condition": "bf_has_Shields",
          "condition_variable": 0,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 165,
          "condition": "bf_has_Shields",
          "condition_variable": 1,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 166,
          "condition": "bf_has_Shields",
          "condition_variable": 2,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 124,
          "condition": "bf_has_Arrows",
          "condition_variable": 0,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 125,
          "condition": "bf_has_Arrows",
          "condition_variable": 1,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 126,
          "condition": "bf_has_Arrows",
          "condition_variable": 2,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 3,
          "icon": 178,
          "condition": "bf_always",
          "action": "order_patrol",
          "string": 404,
          "highlighted": 4
        },
        {
          "position": 4,
          "icon": 180,
          "condition": "bf_always",
          "action": "order_stand_ground",
          "string": 403,
          "highlighted": 16
        }
      ]
    },
    {
      "id": 9,
      "name": "Troll Axethrower",
      "tree": ["Orc"],
      "entries": [9, 19, 53],
      "original": [
        {
          "position": 0,
          "icon": 84,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 167,
          "condition": "bf_has_Shields",
          "condition_variable": 0,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 168,
          "condition": "bf_has_Shields",
          "condition_variable": 1,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 169,
          "condition": "bf_has_Shields",
          "condition_variable": 2,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 127,
          "condition": "bf_has_Arrows",
          "condition_variable": 0,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 128,
          "condition": "bf_has_Arrows",
          "condition_variable": 1,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 129,
          "condition": "bf_has_Arrows",
          "condition_variable": 2,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 3,
          "icon": 179,
          "condition": "bf_always",
          "action": "order_patrol",
          "string": 404,
          "highlighted": 4
        },
        {
          "position": 4,
          "icon": 181,
          "condition": "bf_always",
          "action": "order_stand_ground",
          "string": 403,
          "highlighted": 16
        }
      ]
    },
    {
      "id": 10,
      "name": "Mage",
      "tree": ["Human"],
      "entries": [10, 24],
      "original": [
        {
          "position": 0,
          "icon": 83,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 164,
          "condition": "bf_always",
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 99,
          "condition": "bf_always",
          "action": "order_attack",
          "string": 348,
          "highlighted": 8
        },
        {
          "position": 3,
          "icon": 101,
          "condition": "bf_has_spell",
          "condition_variable": 5,
          "action": "order_spell",
          "action_variable": 43,
          "string": 349,
          "highlighted": 0
        },
        {
          "position": 4,
          "icon": 94,
          "condition": "bf_has_spell",
          "condition_variable": 6,
          "action": "order_spell",
          "action_variable": 44,
          "string": 351,
          "highlighted": 0
        },
        {
          "position": 5,
          "icon": 100,
          "condition": "bf_has_spell",
          "condition_variable": 4,
          "action": "order_spell",
          "action_variable": 42,
          "string": 350,
          "highlighted": 0
        },
        {
          "position": 6,
          "icon": 95,
          "condition": "bf_has_spell",
          "condition_variable": 7,
          "action": "order_spell",
          "action_variable": 45,
          "string": 352,
          "highlighted": 0
        },
        {
          "position": 7,
          "icon": 115,
          "condition": "bf_has_spell",
          "condition_variable": 8,
          "action": "order_spell",
          "action_variable": 46,
          "string": 353,
          "highlighted": 0
        },
        {
          "position": 8,
          "icon": 105,
          "condition": "bf_has_spell",
          "condition_variable": 9,
          "action": "order_spell",
          "action_variable": 47,
          "string": 354,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 11,
      "name": "Death Knight",
      "tree": ["Orc"],
      "entries": [11, 21, 51],
      "original": {
        "default": [
          {
            "position": 0,
            "icon": 84,
            "condition": "bf_always",
            "action": "order_move",
            "string": 392,
            "highlighted": 2
          },
          {
            "position": 1,
            "icon": 167,
            "condition": "bf_always",
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 2,
            "icon": 102,
            "condition": "bf_always",
            "action": "order_attack",
            "string": 355,
            "highlighted": 8
          },
          {
            "position": 3,
            "icon": 108,
            "condition": "bf_has_spell",
            "condition_variable": 14,
            "action": "order_spell",
            "action_variable": 51,
            "string": 357,
            "highlighted": 0
          },
          {
            "position": 4,
            "icon": 96,
            "condition": "bf_has_spell",
            "condition_variable": 16,
            "action": "order_spell",
            "action_variable": 53,
            "string": 358,
            "highlighted": 0
          },
          {
            "position": 5,
            "icon": 114,
            "condition": "bf_has_spell",
            "condition_variable": 13,
            "action": "order_spell",
            "action_variable": 50,
            "string": 369,
            "highlighted": 0
          },
          {
            "position": 6,
            "icon": 104,
            "condition": "bf_has_spell",
            "condition_variable": 15,
            "action": "order_spell",
            "action_variable": 52,
            "string": 361,
            "highlighted": 0
          },
          {
            "position": 7,
            "icon": 98,
            "condition": "bf_has_spell",
            "condition_variable": 17,
            "action": "order_spell",
            "action_variable": 54,
            "string": 359,
            "highlighted": 0
          },
          {
            "position": 8,
            "icon": 103,
            "condition": "bf_has_spell",
            "condition_variable": 19,
            "action": "order_spell",
            "action_variable": 56,
            "string": 356,
            "highlighted": 0
          }
        ],
        "perVersion": {
          "1.3": [
            {
              "position": 0,
              "icon": 84,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 167,
              "condition": "bf_always",
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 2,
              "icon": 102,
              "condition": "bf_always",
              "action": "order_attack",
              "string": 355,
              "highlighted": 8
            },
            {
              "position": 3,
              "icon": 103,
              "condition": "bf_has_spell",
              "condition_variable": 14,
              "action": "order_spell",
              "action_variable": 51,
              "string": 357,
              "highlighted": 0
            },
            {
              "position": 4,
              "icon": 96,
              "condition": "bf_has_spell",
              "condition_variable": 16,
              "action": "order_spell",
              "action_variable": 53,
              "string": 358,
              "highlighted": 0
            },
            {
              "position": 5,
              "icon": 114,
              "condition": "bf_has_spell",
              "condition_variable": 13,
              "action": "order_spell",
              "action_variable": 50,
              "string": 369,
              "highlighted": 0
            },
            {
              "position": 6,
              "icon": 104,
              "condition": "bf_has_spell",
              "condition_variable": 15,
              "action": "order_spell",
              "action_variable": 52,
              "string": 361,
              "highlighted": 0
            },
            {
              "position": 7,
              "icon": 98,
              "condition": "bf_has_spell",
              "condition_variable": 17,
              "action": "order_spell",
              "action_variable": 54,
              "string": 359,
              "highlighted": 0
            },
            {
              "position": 8,
              "icon": 108,
              "condition": "bf_has_spell",
              "condition_variable": 19,
              "action": "order_spell",
              "action_variable": 56,
              "string": 356,
              "highlighted": 0
            }
          ],
          "1.33": [
            {
              "position": 0,
              "icon": 84,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 167,
              "condition": "bf_always",
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 2,
              "icon": 102,
              "condition": "bf_always",
              "action": "order_attack",
              "string": 355,
              "highlighted": 8
            },
            {
              "position": 3,
              "icon": 103,
              "condition": "bf_has_spell",
              "condition_variable": 14,
              "action": "order_spell",
              "action_variable": 51,
              "string": 357,
              "highlighted": 0
            },
            {
              "position": 4,
              "icon": 96,
              "condition": "bf_has_spell",
              "condition_variable": 16,
              "action": "order_spell",
              "action_variable": 53,
              "string": 358,
              "highlighted": 0
            },
            {
              "position": 5,
              "icon": 114,
              "condition": "bf_has_spell",
              "condition_variable": 13,
              "action": "order_spell",
              "action_variable": 50,
              "string": 369,
              "highlighted": 0
            },
            {
              "position": 6,
              "icon": 104,
              "condition": "bf_has_spell",
              "condition_variable": 15,
              "action": "order_spell",
              "action_variable": 52,
              "string": 361,
              "highlighted": 0
            },
            {
              "position": 7,
              "icon": 98,
              "condition": "bf_has_spell",
              "condition_variable": 17,
              "action": "order_spell",
              "action_variable": 54,
              "string": 359,
              "highlighted": 0
            },
            {
              "position": 8,
              "icon": 108,
              "condition": "bf_has_spell",
              "condition_variable": 19,
              "action": "order_spell",
              "action_variable": 56,
              "string": 356,
              "highlighted": 0
            }
          ],
          "1.5": [
            {
              "position": 0,
              "icon": 84,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 167,
              "condition": "bf_always",
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 2,
              "icon": 102,
              "condition": "bf_always",
              "action": "order_attack",
              "string": 355,
              "highlighted": 8
            },
            {
              "position": 3,
              "icon": 103,
              "condition": "bf_has_spell",
              "condition_variable": 14,
              "action": "order_spell",
              "action_variable": 51,
              "string": 357,
              "highlighted": 0
            },
            {
              "position": 4,
              "icon": 96,
              "condition": "bf_has_spell",
              "condition_variable": 16,
              "action": "order_spell",
              "action_variable": 53,
              "string": 358,
              "highlighted": 0
            },
            {
              "position": 5,
              "icon": 114,
              "condition": "bf_has_spell",
              "condition_variable": 13,
              "action": "order_spell",
              "action_variable": 50,
              "string": 369,
              "highlighted": 0
            },
            {
              "position": 6,
              "icon": 104,
              "condition": "bf_has_spell",
              "condition_variable": 15,
              "action": "order_spell",
              "action_variable": 52,
              "string": 361,
              "highlighted": 0
            },
            {
              "position": 7,
              "icon": 98,
              "condition": "bf_has_spell",
              "condition_variable": 17,
              "action": "order_spell",
              "action_variable": 54,
              "string": 359,
              "highlighted": 0
            },
            {
              "position": 8,
              "icon": 108,
              "condition": "bf_has_spell",
              "condition_variable": 19,
              "action": "order_spell",
              "action_variable": 56,
              "string": 356,
              "highlighted": 0
            }
          ]
        }
      }
    },
    {
      "id": 12,
      "name": "Paladin",
      "tree": ["Human"],
      "entries": [12, 44, 50, 52],
      "original": [
        {
          "position": 0,
          "icon": 83,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 164,
          "condition": "bf_has_Shields",
          "condition_variable": 0,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 165,
          "condition": "bf_has_Shields",
          "condition_variable": 1,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 166,
          "condition": "bf_has_Shields",
          "condition_variable": 2,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 116,
          "condition": "bf_has_Swords",
          "condition_variable": 0,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 117,
          "condition": "bf_has_Swords",
          "condition_variable": 1,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 118,
          "condition": "bf_has_Swords",
          "condition_variable": 2,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 3,
          "icon": 178,
          "condition": "bf_always",
          "action": "order_patrol",
          "string": 404,
          "highlighted": 4
        },
        {
          "position": 4,
          "icon": 180,
          "condition": "bf_always",
          "action": "order_stand_ground",
          "string": 403,
          "highlighted": 16
        },
        {
          "position": 6,
          "icon": 106,
          "condition": "bf_has_spell",
          "condition_variable": 0,
          "action": "order_spell",
          "action_variable": 38,
          "string": 362,
          "highlighted": 0
        },
        {
          "position": 7,
          "icon": 107,
          "condition": "bf_has_spell",
          "condition_variable": 1,
          "action": "order_spell",
          "action_variable": 39,
          "string": 363,
          "highlighted": 0
        },
        {
          "position": 8,
          "icon": 110,
          "condition": "bf_has_spell",
          "condition_variable": 3,
          "action": "order_spell",
          "action_variable": 41,
          "string": 365,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 13,
      "name": "Ogre-Mage",
      "tree": ["Orc"],
      "entries": [13, 23],
      "original": [
        {
          "position": 0,
          "icon": 84,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 167,
          "condition": "bf_has_Shields",
          "condition_variable": 0,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 168,
          "condition": "bf_has_Shields",
          "condition_variable": 1,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 169,
          "condition": "bf_has_Shields",
          "condition_variable": 2,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 119,
          "condition": "bf_has_Swords",
          "condition_variable": 0,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 120,
          "condition": "bf_has_Swords",
          "condition_variable": 1,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 121,
          "condition": "bf_has_Swords",
          "condition_variable": 2,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 3,
          "icon": 179,
          "condition": "bf_always",
          "action": "order_patrol",
          "string": 404,
          "highlighted": 4
        },
        {
          "position": 4,
          "icon": 181,
          "condition": "bf_always",
          "action": "order_stand_ground",
          "string": 403,
          "highlighted": 16
        },
        {
          "position": 6,
          "icon": 111,
          "condition": "bf_has_spell",
          "condition_variable": 10,
          "action": "order_spell",
          "action_variable": 48,
          "string": 366,
          "highlighted": 0
        },
        {
          "position": 7,
          "icon": 112,
          "condition": "bf_has_spell",
          "condition_variable": 11,
          "action": "order_spell",
          "action_variable": 49,
          "string": 367,
          "highlighted": 0
        },
        {
          "position": 8,
          "icon": 97,
          "condition": "bf_has_spell",
          "condition_variable": 18,
          "action": "order_spell",
          "action_variable": 55,
          "string": 360,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 14,
      "name": "Dwarven Demolition Squad",
      "tree": ["Human"],
      "entries": [14],
      "original": {
        "default": [
          {
            "position": 0,
            "icon": 83,
            "condition": "bf_always",
            "action": "order_move",
            "string": 392,
            "highlighted": 2
          },
          {
            "position": 1,
            "icon": 164,
            "condition": "bf_has_Shields",
            "condition_variable": 0,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 1,
            "icon": 165,
            "condition": "bf_has_Shields",
            "condition_variable": 1,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 1,
            "icon": 166,
            "condition": "bf_has_Shields",
            "condition_variable": 2,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 2,
            "icon": 116,
            "condition": "bf_has_Swords",
            "condition_variable": 0,
            "action": "order_attack",
            "string": 394,
            "highlighted": 8
          },
          {
            "position": 2,
            "icon": 117,
            "condition": "bf_has_Swords",
            "condition_variable": 1,
            "action": "order_attack",
            "string": 394,
            "highlighted": 8
          },
          {
            "position": 2,
            "icon": 118,
            "condition": "bf_has_Swords",
            "condition_variable": 2,
            "action": "order_attack",
            "string": 394,
            "highlighted": 8
          },
          {
            "position": 3,
            "icon": 184,
            "condition": "bf_enhanced_mode",
            "action": "order_patrol",
            "string": 404,
            "highlighted": 4
          },
          {
            "position": 8,
            "icon": 142,
            "condition": "bf_always",
            "action": "order_demolish",
            "string": 406,
            "highlighted": 32
          }
        ],
        "perVersion": {
          "1.3": [
            {
              "position": 0,
              "icon": 83,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 164,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 165,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 166,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 2,
              "icon": 116,
              "condition": "bf_has_Swords",
              "condition_variable": 0,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 2,
              "icon": 117,
              "condition": "bf_has_Swords",
              "condition_variable": 1,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 2,
              "icon": 118,
              "condition": "bf_has_Swords",
              "condition_variable": 2,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 8,
              "icon": 142,
              "condition": "bf_always",
              "action": "order_demolish",
              "string": 406,
              "highlighted": 32
            }
          ],
          "1.33": [
            {
              "position": 0,
              "icon": 83,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 164,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 165,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 166,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 2,
              "icon": 116,
              "condition": "bf_has_Swords",
              "condition_variable": 0,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 2,
              "icon": 117,
              "condition": "bf_has_Swords",
              "condition_variable": 1,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 2,
              "icon": 118,
              "condition": "bf_has_Swords",
              "condition_variable": 2,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 8,
              "icon": 142,
              "condition": "bf_always",
              "action": "order_demolish",
              "string": 406,
              "highlighted": 32
            }
          ],
          "1.5": [
            {
              "position": 0,
              "icon": 83,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 164,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 165,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 166,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 2,
              "icon": 116,
              "condition": "bf_has_Swords",
              "condition_variable": 0,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 2,
              "icon": 117,
              "condition": "bf_has_Swords",
              "condition_variable": 1,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 2,
              "icon": 118,
              "condition": "bf_has_Swords",
              "condition_variable": 2,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 8,
              "icon": 142,
              "condition": "bf_always",
              "action": "order_demolish",
              "string": 406,
              "highlighted": 32
            }
          ]
        }
      }
    },
    {
      "id": 15,
      "name": "Goblin Sappers",
      "tree": ["Orc"],
      "entries": [15],
      "original": {
        "default": [
          {
            "position": 0,
            "icon": 84,
            "condition": "bf_always",
            "action": "order_move",
            "string": 392,
            "highlighted": 2
          },
          {
            "position": 1,
            "icon": 167,
            "condition": "bf_has_Shields",
            "condition_variable": 0,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 1,
            "icon": 168,
            "condition": "bf_has_Shields",
            "condition_variable": 1,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 1,
            "icon": 169,
            "condition": "bf_has_Shields",
            "condition_variable": 2,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 2,
            "icon": 119,
            "condition": "bf_has_Swords",
            "condition_variable": 0,
            "action": "order_attack",
            "string": 394,
            "highlighted": 8
          },
          {
            "position": 2,
            "icon": 120,
            "condition": "bf_has_Swords",
            "condition_variable": 1,
            "action": "order_attack",
            "string": 394,
            "highlighted": 8
          },
          {
            "position": 2,
            "icon": 121,
            "condition": "bf_has_Swords",
            "condition_variable": 2,
            "action": "order_attack",
            "string": 394,
            "highlighted": 8
          },
          {
            "position": 3,
            "icon": 185,
            "condition": "bf_enhanced_mode",
            "action": "order_patrol",
            "string": 404,
            "highlighted": 4
          },
          {
            "position": 8,
            "icon": 143,
            "condition": "bf_always",
            "action": "order_demolish",
            "string": 406,
            "highlighted": 32
          }
        ],
        "perVersion": {
          "1.3": [
            {
              "position": 0,
              "icon": 84,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 167,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 168,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 169,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 2,
              "icon": 119,
              "condition": "bf_has_Swords",
              "condition_variable": 0,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 2,
              "icon": 120,
              "condition": "bf_has_Swords",
              "condition_variable": 1,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 2,
              "icon": 121,
              "condition": "bf_has_Swords",
              "condition_variable": 2,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 8,
              "icon": 143,
              "condition": "bf_always",
              "action": "order_demolish",
              "string": 406,
              "highlighted": 32
            }
          ],
          "1.33": [
            {
              "position": 0,
              "icon": 84,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 167,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 168,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 169,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 2,
              "icon": 119,
              "condition": "bf_has_Swords",
              "condition_variable": 0,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 2,
              "icon": 120,
              "condition": "bf_has_Swords",
              "condition_variable": 1,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 2,
              "icon": 121,
              "condition": "bf_has_Swords",
              "condition_variable": 2,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 8,
              "icon": 143,
              "condition": "bf_always",
              "action": "order_demolish",
              "string": 406,
              "highlighted": 32
            }
          ],
          "1.5": [
            {
              "position": 0,
              "icon": 84,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 167,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 168,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 169,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 2,
              "icon": 119,
              "condition": "bf_has_Swords",
              "condition_variable": 0,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 2,
              "icon": 120,
              "condition": "bf_has_Swords",
              "condition_variable": 1,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 2,
              "icon": 121,
              "condition": "bf_has_Swords",
              "condition_variable": 2,
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 8,
              "icon": 143,
              "condition": "bf_always",
              "action": "order_demolish",
              "string": 406,
              "highlighted": 32
            }
          ]
        }
      }
    },
    {
      "id": 16,
      "name": "Attack Peasant",
      "tree": ["Human"],
      "entries": [16],
      "original": [
        {
          "position": 0,
          "icon": 83,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 164,
          "condition": "bf_always",
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        }
      ]
    },
    {
      "id": 17,
      "name": "Attack Peon",
      "tree": ["Orc"],
      "entries": [17],
      "original": [
        {
          "position": 0,
          "icon": 84,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 167,
          "condition": "bf_always",
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        }
      ]
    },
    {
      "id": 26,
      "name": "Oil Tanker (human)",
      "tree": ["Human"],
      "entries": [26],
      "original": [
        {
          "position": 0,
          "icon": 157,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 153,
          "condition": "bf_has_boat_armor",
          "condition_variable": 0,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 154,
          "condition": "bf_has_boat_armor",
          "condition_variable": 1,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 155,
          "condition": "bf_has_boat_armor",
          "condition_variable": 2,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 3,
          "icon": 54,
          "condition": "bf_single",
          "action": "order_place",
          "action_variable": 86,
          "string": 309,
          "highlighted": 0
        },
        {
          "position": 4,
          "icon": 161,
          "condition": "bf_no_load",
          "action": "order_harvest",
          "string": 397,
          "highlighted": 64
        },
        {
          "position": 5,
          "icon": 158,
          "condition": "bf_load",
          "action": "order_return",
          "string": 401,
          "highlighted": 128
        }
      ]
    },
    {
      "id": 27,
      "name": "Oil Tanker (orc)",
      "tree": ["Orc"],
      "entries": [27],
      "original": [
        {
          "position": 0,
          "icon": 156,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 150,
          "condition": "bf_has_boat_armor",
          "condition_variable": 0,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 151,
          "condition": "bf_has_boat_armor",
          "condition_variable": 1,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 152,
          "condition": "bf_has_boat_armor",
          "condition_variable": 2,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 3,
          "icon": 55,
          "condition": "bf_single",
          "action": "order_place",
          "action_variable": 87,
          "string": 309,
          "highlighted": 0
        },
        {
          "position": 4,
          "icon": 160,
          "condition": "bf_no_load",
          "action": "order_harvest",
          "string": 397,
          "highlighted": 64
        },
        {
          "position": 5,
          "icon": 159,
          "condition": "bf_load",
          "action": "order_return",
          "string": 401,
          "highlighted": 128
        }
      ]
    },
    {
      "id": 28,
      "name": "Transport (human)",
      "tree": ["Human"],
      "entries": [28],
      "original": [
        {
          "position": 0,
          "icon": 157,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 153,
          "condition": "bf_has_boat_armor",
          "condition_variable": 0,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 154,
          "condition": "bf_has_boat_armor",
          "condition_variable": 1,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 155,
          "condition": "bf_has_boat_armor",
          "condition_variable": 2,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 162,
          "condition": "bf_trans_has_passenger",
          "action": "order_unload_all",
          "string": 405,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 29,
      "name": "Transport (orc)",
      "tree": ["Orc"],
      "entries": [29],
      "original": [
        {
          "position": 0,
          "icon": 156,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 150,
          "condition": "bf_has_boat_armor",
          "condition_variable": 0,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 151,
          "condition": "bf_has_boat_armor",
          "condition_variable": 1,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 152,
          "condition": "bf_has_boat_armor",
          "condition_variable": 2,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 163,
          "condition": "bf_trans_has_passenger",
          "action": "order_unload_all",
          "string": 405,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 30,
      "name": "Elven Destroyer",
      "tree": ["Human"],
      "entries": [30, 32, 34],
      "original": [
        {
          "position": 0,
          "icon": 157,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 153,
          "condition": "bf_has_boat_armor",
          "condition_variable": 0,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 154,
          "condition": "bf_has_boat_armor",
          "condition_variable": 1,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 155,
          "condition": "bf_has_boat_armor",
          "condition_variable": 2,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 144,
          "condition": "bf_has_boat_attack",
          "condition_variable": 0,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 145,
          "condition": "bf_has_boat_attack",
          "condition_variable": 1,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 146,
          "condition": "bf_has_boat_attack",
          "condition_variable": 2,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 3,
          "icon": 184,
          "condition": "bf_always",
          "action": "order_patrol",
          "string": 404,
          "highlighted": 4
        },
        {
          "position": 4,
          "icon": 180,
          "condition": "bf_always",
          "action": "order_stand_ground",
          "string": 403,
          "highlighted": 16
        },
        {
          "position": 5,
          "icon": 182,
          "condition": "bf_attack_ground",
          "action": "order_attack_ground",
          "string": 402,
          "highlighted": 32
        }
      ]
    },
    {
      "id": 31,
      "name": "Troll Destroyer",
      "tree": ["Orc"],
      "entries": [31, 33],
      "original": [
        {
          "position": 0,
          "icon": 156,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 150,
          "condition": "bf_has_boat_armor",
          "condition_variable": 0,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 151,
          "condition": "bf_has_boat_armor",
          "condition_variable": 1,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 152,
          "condition": "bf_has_boat_armor",
          "condition_variable": 2,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 147,
          "condition": "bf_has_boat_attack",
          "condition_variable": 0,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 148,
          "condition": "bf_has_boat_attack",
          "condition_variable": 1,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 149,
          "condition": "bf_has_boat_attack",
          "condition_variable": 2,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 3,
          "icon": 185,
          "condition": "bf_always",
          "action": "order_patrol",
          "string": 404,
          "highlighted": 4
        },
        {
          "position": 4,
          "icon": 181,
          "condition": "bf_always",
          "action": "order_stand_ground",
          "string": 403,
          "highlighted": 16
        },
        {
          "position": 5,
          "icon": 183,
          "condition": "bf_attack_ground",
          "action": "order_attack_ground",
          "string": 402,
          "highlighted": 32
        }
      ]
    },
    {
      "id": 38,
      "name": "Gnomish Submarine",
      "tree": ["Human"],
      "entries": [38],
      "original": [
        {
          "position": 0,
          "icon": 157,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 153,
          "condition": "bf_has_boat_armor",
          "condition_variable": 0,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 154,
          "condition": "bf_has_boat_armor",
          "condition_variable": 1,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 155,
          "condition": "bf_has_boat_armor",
          "condition_variable": 2,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 144,
          "condition": "bf_has_boat_attack",
          "condition_variable": 0,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 145,
          "condition": "bf_has_boat_attack",
          "condition_variable": 1,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 146,
          "condition": "bf_has_boat_attack",
          "condition_variable": 2,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 3,
          "icon": 184,
          "condition": "bf_always",
          "action": "order_patrol",
          "string": 404,
          "highlighted": 4
        },
        {
          "position": 4,
          "icon": 180,
          "condition": "bf_always",
          "action": "order_stand_ground",
          "string": 403,
          "highlighted": 16
        }
      ]
    },
    {
      "id": 39,
      "name": "Giant Turtle",
      "tree": ["Orc"],
      "entries": [39],
      "original": [
        {
          "position": 0,
          "icon": 156,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 150,
          "condition": "bf_has_boat_armor",
          "condition_variable": 0,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 151,
          "condition": "bf_has_boat_armor",
          "condition_variable": 1,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 152,
          "condition": "bf_has_boat_armor",
          "condition_variable": 2,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 147,
          "condition": "bf_has_boat_attack",
          "condition_variable": 0,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 148,
          "condition": "bf_has_boat_attack",
          "condition_variable": 1,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 149,
          "condition": "bf_has_boat_attack",
          "condition_variable": 2,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 3,
          "icon": 185,
          "condition": "bf_always",
          "action": "order_patrol",
          "string": 404,
          "highlighted": 4
        },
        {
          "position": 4,
          "icon": 181,
          "condition": "bf_always",
          "action": "order_stand_ground",
          "string": 403,
          "highlighted": 16
        }
      ]
    },
    {
      "id": 40,
      "name": "Gnomish Flying Machine",
      "tree": ["Human"],
      "entries": [40],
      "original": {
        "default": [
          {
            "position": 0,
            "icon": 83,
            "condition": "bf_always",
            "action": "order_move",
            "string": 392,
            "highlighted": 2
          },
          {
            "position": 1,
            "icon": 164,
            "condition": "bf_has_Shields",
            "condition_variable": 0,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 1,
            "icon": 165,
            "condition": "bf_has_Shields",
            "condition_variable": 1,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 1,
            "icon": 166,
            "condition": "bf_has_Shields",
            "condition_variable": 2,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 3,
            "icon": 184,
            "condition": "bf_enhanced_mode",
            "action": "order_patrol",
            "string": 404,
            "highlighted": 4
          }
        ],
        "perVersion": {
          "1.3": [
            {
              "position": 0,
              "icon": 83,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 164,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 165,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 166,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            }
          ],
          "1.33": [
            {
              "position": 0,
              "icon": 83,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 164,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 165,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 166,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            }
          ],
          "1.5": [
            {
              "position": 0,
              "icon": 83,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 164,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 165,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 166,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            }
          ]
        }
      }
    },
    {
      "id": 41,
      "name": "Goblin Zeppelin",
      "tree": ["Orc"],
      "entries": [41, 45],
      "original": {
        "default": [
          {
            "position": 0,
            "icon": 84,
            "condition": "bf_always",
            "action": "order_move",
            "string": 392,
            "highlighted": 2
          },
          {
            "position": 1,
            "icon": 167,
            "condition": "bf_has_Shields",
            "condition_variable": 0,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 1,
            "icon": 168,
            "condition": "bf_has_Shields",
            "condition_variable": 1,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 1,
            "icon": 169,
            "condition": "bf_has_Shields",
            "condition_variable": 2,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 3,
            "icon": 185,
            "condition": "bf_enhanced_mode",
            "action": "order_patrol",
            "string": 404,
            "highlighted": 4
          }
        ],
        "perVersion": {
          "1.3": [
            {
              "position": 0,
              "icon": 84,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 167,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 168,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 169,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            }
          ],
          "1.33": [
            {
              "position": 0,
              "icon": 84,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 167,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 168,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 169,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            }
          ],
          "1.5": [
            {
              "position": 0,
              "icon": 84,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 167,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 168,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 169,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            }
          ]
        }
      }
    },
    {
      "id": 49,
      "name": "Cho'gall",
      "tree": ["Orc"],
      "entries": [49],
      "original": [
        {
          "position": 0,
          "icon": 84,
          "condition": "bf_always",
          "action": "order_move",
          "string": 392,
          "highlighted": 2
        },
        {
          "position": 1,
          "icon": 167,
          "condition": "bf_has_Shields",
          "condition_variable": 0,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 168,
          "condition": "bf_has_Shields",
          "condition_variable": 1,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 1,
          "icon": 169,
          "condition": "bf_has_Shields",
          "condition_variable": 2,
          "action": "order_guard",
          "string": 393,
          "highlighted": 1
        },
        {
          "position": 2,
          "icon": 119,
          "condition": "bf_has_Swords",
          "condition_variable": 0,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 120,
          "condition": "bf_has_Swords",
          "condition_variable": 1,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 2,
          "icon": 121,
          "condition": "bf_has_Swords",
          "condition_variable": 2,
          "action": "order_attack",
          "string": 394,
          "highlighted": 8
        },
        {
          "position": 3,
          "icon": 179,
          "condition": "bf_always",
          "action": "order_patrol",
          "string": 404,
          "highlighted": 4
        },
        {
          "position": 4,
          "icon": 181,
          "condition": "bf_always",
          "action": "order_stand_ground",
          "string": 403,
          "highlighted": 16
        },
        {
          "position": 6,
          "icon": 111,
          "condition": "bf_always",
          "condition_variable": 10,
          "action": "order_spell",
          "action_variable": 48,
          "string": 366,
          "highlighted": 0
        },
        {
          "position": 7,
          "icon": 112,
          "condition": "bf_always",
          "condition_variable": 11,
          "action": "order_spell",
          "action_variable": 49,
          "string": 367,
          "highlighted": 0
        },
        {
          "position": 8,
          "icon": 97,
          "condition": "bf_always",
          "condition_variable": 18,
          "action": "order_spell",
          "action_variable": 55,
          "string": 360,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 60,
      "name": "Barracks (human)",
      "tree": ["Human"],
      "entries": [60],
      "original": [
        {
          "position": 0,
          "icon": 2,
          "condition": "bf_gr_ok",
          "condition_variable": 1,
          "action": "bldg_build_man",
          "action_variable": 0,
          "string": 283,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 4,
          "condition": "bf_sp_ok",
          "condition_variable": 1,
          "action": "bldg_build_man",
          "action_variable": 8,
          "string": 272,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 6,
          "condition": "bf_rang_ok",
          "condition_variable": 1,
          "action": "bldg_build_man",
          "action_variable": 18,
          "string": 273,
          "highlighted": 0
        },
        {
          "position": 2,
          "icon": 16,
          "condition": "bf_cat_ok",
          "condition_variable": 1,
          "action": "bldg_build_man",
          "action_variable": 4,
          "string": 284,
          "highlighted": 0
        },
        {
          "position": 3,
          "icon": 8,
          "condition": "bf_kni_ok",
          "condition_variable": 1,
          "action": "bldg_build_man",
          "action_variable": 6,
          "string": 275,
          "highlighted": 0
        },
        {
          "position": 3,
          "icon": 10,
          "condition": "bf_cleric_ok",
          "condition_variable": 1,
          "action": "bldg_build_man",
          "action_variable": 12,
          "string": 277,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 61,
      "name": "Barracks (orc)",
      "tree": ["Orc"],
      "entries": [61],
      "original": [
        {
          "position": 0,
          "icon": 3,
          "condition": "bf_gr_ok",
          "condition_variable": 1,
          "action": "bldg_build_man",
          "action_variable": 1,
          "string": 282,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 5,
          "condition": "bf_sp_ok",
          "condition_variable": 1,
          "action": "bldg_build_man",
          "action_variable": 9,
          "string": 271,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 7,
          "condition": "bf_rang_ok",
          "condition_variable": 1,
          "action": "bldg_build_man",
          "action_variable": 19,
          "string": 274,
          "highlighted": 0
        },
        {
          "position": 2,
          "icon": 17,
          "condition": "bf_cat_ok",
          "condition_variable": 1,
          "action": "bldg_build_man",
          "action_variable": 5,
          "string": 285,
          "highlighted": 0
        },
        {
          "position": 3,
          "icon": 9,
          "condition": "bf_kni_ok",
          "condition_variable": 1,
          "action": "bldg_build_man",
          "action_variable": 7,
          "string": 276,
          "highlighted": 0
        },
        {
          "position": 3,
          "icon": 11,
          "condition": "bf_cleric_ok",
          "condition_variable": 1,
          "action": "bldg_build_man",
          "action_variable": 13,
          "string": 278,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 62,
      "name": "Church",
      "tree": ["Human"],
      "entries": [62],
      "original": [
        {
          "position": 0,
          "icon": 10,
          "condition": "bf_build_Spell",
          "condition_variable": 20,
          "action": "bldg_build_spell",
          "action_variable": 33,
          "string": 370,
          "highlighted": 0
        },
        {
          "position": 0,
          "icon": 107,
          "condition": "bf_build_CSpell",
          "condition_variable": 1,
          "action": "bldg_build_spell",
          "action_variable": 35,
          "string": 385,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 110,
          "condition": "bf_build_CSpell",
          "condition_variable": 3,
          "action": "bldg_build_spell",
          "action_variable": 36,
          "string": 387,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 63,
      "name": "Altar of Storms",
      "tree": ["Orc"],
      "entries": [63],
      "original": [
        {
          "position": 0,
          "icon": 11,
          "condition": "bf_build_Spell",
          "condition_variable": 20,
          "action": "bldg_build_spell",
          "action_variable": 32,
          "string": 371,
          "highlighted": 0
        },
        {
          "position": 0,
          "icon": 112,
          "condition": "bf_build_CSpell",
          "condition_variable": 11,
          "action": "bldg_build_spell",
          "action_variable": 44,
          "string": 389,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 97,
          "condition": "bf_build_CSpell",
          "condition_variable": 18,
          "action": "bldg_build_spell",
          "action_variable": 50,
          "string": 382,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 64,
      "name": "Scout Tower (human)",
      "tree": ["Human"],
      "entries": [64, 96, 98],
      "original": [
        {
          "position": 0,
          "icon": 75,
          "condition": "bf_upgrade_tower",
          "condition_variable": 0,
          "action": "bldg_build_upgrade",
          "action_variable": 96,
          "string": 319,
          "highlighted": 0
        },
        {
          "position": 0,
          "icon": 76,
          "condition": "bf_upgrade_tower",
          "condition_variable": 1,
          "action": "bldg_build_upgrade",
          "action_variable": 98,
          "string": 320,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 65,
      "name": "Watch Tower (orc)",
      "tree": ["Orc"],
      "entries": [65, 97, 99],
      "original": [
        {
          "position": 0,
          "icon": 77,
          "condition": "bf_upgrade_tower",
          "condition_variable": 0,
          "action": "bldg_build_upgrade",
          "action_variable": 97,
          "string": 319,
          "highlighted": 0
        },
        {
          "position": 0,
          "icon": 78,
          "condition": "bf_upgrade_tower",
          "condition_variable": 1,
          "action": "bldg_build_upgrade",
          "action_variable": 99,
          "string": 320,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 68,
      "name": "Gnomish Inventor",
      "tree": ["Human"],
      "entries": [68],
      "original": [
        {
          "position": 0,
          "icon": 28,
          "condition": "bf_flyer_ok",
          "action": "bldg_build_man",
          "action_variable": 40,
          "string": 294,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 12,
          "condition": "bf_demoteam_ok",
          "action": "bldg_build_man",
          "action_variable": 14,
          "string": 297,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 69,
      "name": "Goblin Alchemist",
      "tree": ["Orc"],
      "entries": [69],
      "original": [
        {
          "position": 0,
          "icon": 29,
          "condition": "bf_flyer_ok",
          "action": "bldg_build_man",
          "action_variable": 41,
          "string": 293,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 13,
          "condition": "bf_demoteam_ok",
          "action": "bldg_build_man",
          "action_variable": 15,
          "string": 298,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 70,
      "name": "Gryphon Aviary",
      "tree": ["Human"],
      "entries": [70],
      "original": [
        {
          "position": 0,
          "icon": 30,
          "condition": "bf_dragon_ok",
          "action": "bldg_build_man",
          "action_variable": 42,
          "string": 295,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 71,
      "name": "Dragon Roost",
      "tree": ["Orc"],
      "entries": [71],
      "original": [
        {
          "position": 0,
          "icon": 31,
          "condition": "bf_dragon_ok",
          "action": "bldg_build_man",
          "action_variable": 43,
          "string": 296,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 72,
      "name": "Shipyard (human)",
      "tree": ["Human"],
      "entries": [72],
      "original": [
        {
          "position": 0,
          "icon": 18,
          "condition": "bf_tanker_ok",
          "action": "bldg_build_man",
          "action_variable": 26,
          "string": 286,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 22,
          "condition": "bf_destroyer_ok",
          "action": "bldg_build_man",
          "action_variable": 30,
          "string": 287,
          "highlighted": 0
        },
        {
          "position": 2,
          "icon": 20,
          "condition": "bf_transport_ok",
          "action": "bldg_build_man",
          "action_variable": 28,
          "string": 288,
          "highlighted": 0
        },
        {
          "position": 3,
          "icon": 24,
          "condition": "bf_battleship_ok",
          "action": "bldg_build_man",
          "action_variable": 32,
          "string": 289,
          "highlighted": 0
        },
        {
          "position": 4,
          "icon": 26,
          "condition": "bf_sub_ok",
          "action": "bldg_build_man",
          "action_variable": 38,
          "string": 291,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 73,
      "name": "Shipyard (orc)",
      "tree": ["Orc"],
      "entries": [73],
      "original": [
        {
          "position": 0,
          "icon": 19,
          "condition": "bf_tanker_ok",
          "action": "bldg_build_man",
          "action_variable": 27,
          "string": 286,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 23,
          "condition": "bf_destroyer_ok",
          "action": "bldg_build_man",
          "action_variable": 31,
          "string": 287,
          "highlighted": 0
        },
        {
          "position": 2,
          "icon": 21,
          "condition": "bf_transport_ok",
          "action": "bldg_build_man",
          "action_variable": 29,
          "string": 288,
          "highlighted": 0
        },
        {
          "position": 3,
          "icon": 25,
          "condition": "bf_battleship_ok",
          "action": "bldg_build_man",
          "action_variable": 33,
          "string": 290,
          "highlighted": 0
        },
        {
          "position": 4,
          "icon": 27,
          "condition": "bf_sub_ok",
          "action": "bldg_build_man",
          "action_variable": 39,
          "string": 292,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 74,
      "name": "Town Hall",
      "tree": ["Human"],
      "entries": [74, 88, 90],
      "original": [
        {
          "position": 0,
          "icon": 0,
          "condition": "bf_peon_ok",
          "condition_variable": 1,
          "action": "bldg_build_man",
          "action_variable": 2,
          "string": 270,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 66,
          "condition": "bf_upgrade_townhall",
          "condition_variable": 0,
          "action": "bldg_build_upgrade",
          "action_variable": 88,
          "string": 317,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 68,
          "condition": "bf_upgrade_townhall",
          "condition_variable": 1,
          "action": "bldg_build_upgrade",
          "action_variable": 90,
          "string": 315,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 75,
      "name": "Great Hall",
      "tree": ["Orc"],
      "entries": [75, 89, 91],
      "original": [
        {
          "position": 0,
          "icon": 1,
          "condition": "bf_peon_ok",
          "condition_variable": 1,
          "action": "bldg_build_man",
          "action_variable": 3,
          "string": 269,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 67,
          "condition": "bf_upgrade_townhall",
          "condition_variable": 0,
          "action": "bldg_build_upgrade",
          "action_variable": 89,
          "string": 318,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 69,
          "condition": "bf_upgrade_townhall",
          "condition_variable": 1,
          "action": "bldg_build_upgrade",
          "action_variable": 91,
          "string": 316,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 76,
      "name": "Elven Lumber Mill",
      "tree": ["Human"],
      "entries": [76],
      "original": [
        {
          "position": 0,
          "icon": 125,
          "condition": "bf_build_Arrows",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 4,
          "string": 332,
          "highlighted": 0
        },
        {
          "position": 0,
          "icon": 126,
          "condition": "bf_build_Arrows",
          "condition_variable": 1,
          "action": "bldg_build_tech",
          "action_variable": 5,
          "string": 332,
          "highlighted": 0
        },
        {
          "position": 3,
          "icon": 6,
          "condition": "bf_build_ranger",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 24,
          "string": 338,
          "highlighted": 0
        },
        {
          "position": 3,
          "icon": 133,
          "condition": "bf_build_scouts",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 26,
          "string": 340,
          "highlighted": 0
        },
        {
          "position": 4,
          "icon": 132,
          "condition": "bf_build_longbow",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 25,
          "string": 339,
          "highlighted": 0
        },
        {
          "position": 5,
          "icon": 134,
          "condition": "bf_build_marks",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 27,
          "string": 341,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 77,
      "name": "Troll Lumber Mill",
      "tree": ["Orc"],
      "entries": [77],
      "original": [
        {
          "position": 0,
          "icon": 128,
          "condition": "bf_build_Arrows",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 6,
          "string": 330,
          "highlighted": 0
        },
        {
          "position": 0,
          "icon": 129,
          "condition": "bf_build_Arrows",
          "condition_variable": 1,
          "action": "bldg_build_tech",
          "action_variable": 7,
          "string": 330,
          "highlighted": 0
        },
        {
          "position": 3,
          "icon": 7,
          "condition": "bf_build_ranger",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 28,
          "string": 342,
          "highlighted": 0
        },
        {
          "position": 3,
          "icon": 136,
          "condition": "bf_build_scouts",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 30,
          "string": 344,
          "highlighted": 0
        },
        {
          "position": 4,
          "icon": 135,
          "condition": "bf_build_longbow",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 29,
          "string": 343,
          "highlighted": 0
        },
        {
          "position": 5,
          "icon": 137,
          "condition": "bf_build_marks",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 31,
          "string": 345,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 78,
      "name": "Foundry (human)",
      "tree": ["Human"],
      "entries": [78],
      "original": [
        {
          "position": 0,
          "icon": 145,
          "condition": "bf_build_boat_attack",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 12,
          "string": 335,
          "highlighted": 0
        },
        {
          "position": 0,
          "icon": 146,
          "condition": "bf_build_boat_attack",
          "condition_variable": 1,
          "action": "bldg_build_tech",
          "action_variable": 13,
          "string": 335,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 154,
          "condition": "bf_build_boat_armor",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 16,
          "string": 336,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 155,
          "condition": "bf_build_boat_armor",
          "condition_variable": 1,
          "action": "bldg_build_tech",
          "action_variable": 17,
          "string": 336,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 79,
      "name": "Foundry (orc)",
      "tree": ["Orc"],
      "entries": [79],
      "original": [
        {
          "position": 0,
          "icon": 148,
          "condition": "bf_build_boat_attack",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 14,
          "string": 335,
          "highlighted": 0
        },
        {
          "position": 0,
          "icon": 149,
          "condition": "bf_build_boat_attack",
          "condition_variable": 1,
          "action": "bldg_build_tech",
          "action_variable": 15,
          "string": 335,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 151,
          "condition": "bf_build_boat_armor",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 18,
          "string": 336,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 152,
          "condition": "bf_build_boat_armor",
          "condition_variable": 1,
          "action": "bldg_build_tech",
          "action_variable": 19,
          "string": 336,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 80,
      "name": "Mage Tower",
      "tree": ["Human"],
      "entries": [80],
      "original": [
        {
          "position": 0,
          "icon": 14,
          "condition": "bf_wiz_ok",
          "condition_variable": 1,
          "action": "bldg_build_man",
          "action_variable": 10,
          "string": 281,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 94,
          "condition": "bf_build_Spell",
          "condition_variable": 6,
          "action": "bldg_build_spell",
          "action_variable": 39,
          "string": 374,
          "highlighted": 0
        },
        {
          "position": 2,
          "icon": 100,
          "condition": "bf_build_Spell",
          "condition_variable": 4,
          "action": "bldg_build_spell",
          "action_variable": 37,
          "string": 373,
          "highlighted": 0
        },
        {
          "position": 3,
          "icon": 95,
          "condition": "bf_build_Spell",
          "condition_variable": 7,
          "action": "bldg_build_spell",
          "action_variable": 40,
          "string": 375,
          "highlighted": 0
        },
        {
          "position": 4,
          "icon": 115,
          "condition": "bf_build_Spell",
          "condition_variable": 8,
          "action": "bldg_build_spell",
          "action_variable": 41,
          "string": 376,
          "highlighted": 0
        },
        {
          "position": 5,
          "icon": 105,
          "condition": "bf_build_Spell",
          "condition_variable": 9,
          "action": "bldg_build_spell",
          "action_variable": 42,
          "string": 377,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 81,
      "name": "Temple of the Damned",
      "tree": ["Orc"],
      "entries": [81],
      "original": {
        "default": [
          {
            "position": 0,
            "icon": 15,
            "condition": "bf_wiz_ok",
            "condition_variable": 1,
            "action": "bldg_build_man",
            "action_variable": 11,
            "string": 279,
            "highlighted": 0
          },
          {
            "position": 1,
            "icon": 96,
            "condition": "bf_build_Spell",
            "condition_variable": 16,
            "action": "bldg_build_spell",
            "action_variable": 48,
            "string": 380,
            "highlighted": 0
          },
          {
            "position": 2,
            "icon": 114,
            "condition": "bf_build_Spell",
            "condition_variable": 13,
            "action": "bldg_build_spell",
            "action_variable": 45,
            "string": 391,
            "highlighted": 0
          },
          {
            "position": 3,
            "icon": 104,
            "condition": "bf_build_Spell",
            "condition_variable": 15,
            "action": "bldg_build_spell",
            "action_variable": 47,
            "string": 383,
            "highlighted": 0
          },
          {
            "position": 4,
            "icon": 98,
            "condition": "bf_build_Spell",
            "condition_variable": 17,
            "action": "bldg_build_spell",
            "action_variable": 49,
            "string": 381,
            "highlighted": 0
          },
          {
            "position": 5,
            "icon": 103,
            "condition": "bf_build_Spell",
            "condition_variable": 19,
            "action": "bldg_build_spell",
            "action_variable": 51,
            "string": 378,
            "highlighted": 0
          }
        ],
        "perVersion": {
          "1.3": [
            {
              "position": 0,
              "icon": 15,
              "condition": "bf_wiz_ok",
              "condition_variable": 1,
              "action": "bldg_build_man",
              "action_variable": 11,
              "string": 279,
              "highlighted": 0
            },
            {
              "position": 1,
              "icon": 96,
              "condition": "bf_build_Spell",
              "condition_variable": 16,
              "action": "bldg_build_spell",
              "action_variable": 48,
              "string": 380,
              "highlighted": 0
            },
            {
              "position": 2,
              "icon": 114,
              "condition": "bf_build_Spell",
              "condition_variable": 13,
              "action": "bldg_build_spell",
              "action_variable": 45,
              "string": 391,
              "highlighted": 0
            },
            {
              "position": 3,
              "icon": 104,
              "condition": "bf_build_Spell",
              "condition_variable": 15,
              "action": "bldg_build_spell",
              "action_variable": 47,
              "string": 383,
              "highlighted": 0
            },
            {
              "position": 4,
              "icon": 98,
              "condition": "bf_build_Spell",
              "condition_variable": 17,
              "action": "bldg_build_spell",
              "action_variable": 49,
              "string": 381,
              "highlighted": 0
            },
            {
              "position": 5,
              "icon": 108,
              "condition": "bf_build_Spell",
              "condition_variable": 19,
              "action": "bldg_build_spell",
              "action_variable": 51,
              "string": 378,
              "highlighted": 0
            }
          ],
          "1.33": [
            {
              "position": 0,
              "icon": 15,
              "condition": "bf_wiz_ok",
              "condition_variable": 1,
              "action": "bldg_build_man",
              "action_variable": 11,
              "string": 279,
              "highlighted": 0
            },
            {
              "position": 1,
              "icon": 96,
              "condition": "bf_build_Spell",
              "condition_variable": 16,
              "action": "bldg_build_spell",
              "action_variable": 48,
              "string": 380,
              "highlighted": 0
            },
            {
              "position": 2,
              "icon": 114,
              "condition": "bf_build_Spell",
              "condition_variable": 13,
              "action": "bldg_build_spell",
              "action_variable": 45,
              "string": 391,
              "highlighted": 0
            },
            {
              "position": 3,
              "icon": 104,
              "condition": "bf_build_Spell",
              "condition_variable": 15,
              "action": "bldg_build_spell",
              "action_variable": 47,
              "string": 383,
              "highlighted": 0
            },
            {
              "position": 4,
              "icon": 98,
              "condition": "bf_build_Spell",
              "condition_variable": 17,
              "action": "bldg_build_spell",
              "action_variable": 49,
              "string": 381,
              "highlighted": 0
            },
            {
              "position": 5,
              "icon": 108,
              "condition": "bf_build_Spell",
              "condition_variable": 19,
              "action": "bldg_build_spell",
              "action_variable": 51,
              "string": 378,
              "highlighted": 0
            }
          ],
          "1.5": [
            {
              "position": 0,
              "icon": 15,
              "condition": "bf_wiz_ok",
              "condition_variable": 1,
              "action": "bldg_build_man",
              "action_variable": 11,
              "string": 279,
              "highlighted": 0
            },
            {
              "position": 1,
              "icon": 96,
              "condition": "bf_build_Spell",
              "condition_variable": 16,
              "action": "bldg_build_spell",
              "action_variable": 48,
              "string": 380,
              "highlighted": 0
            },
            {
              "position": 2,
              "icon": 114,
              "condition": "bf_build_Spell",
              "condition_variable": 13,
              "action": "bldg_build_spell",
              "action_variable": 45,
              "string": 391,
              "highlighted": 0
            },
            {
              "position": 3,
              "icon": 104,
              "condition": "bf_build_Spell",
              "condition_variable": 15,
              "action": "bldg_build_spell",
              "action_variable": 47,
              "string": 383,
              "highlighted": 0
            },
            {
              "position": 4,
              "icon": 98,
              "condition": "bf_build_Spell",
              "condition_variable": 17,
              "action": "bldg_build_spell",
              "action_variable": 49,
              "string": 381,
              "highlighted": 0
            },
            {
              "position": 5,
              "icon": 108,
              "condition": "bf_build_Spell",
              "condition_variable": 19,
              "action": "bldg_build_spell",
              "action_variable": 51,
              "string": 378,
              "highlighted": 0
            }
          ]
        }
      }
    },
    {
      "id": 82,
      "name": "Blacksmith (human)",
      "tree": ["Human"],
      "entries": [82],
      "original": [
        {
          "position": 0,
          "icon": 117,
          "condition": "bf_build_Swords",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 0,
          "string": 329,
          "highlighted": 0
        },
        {
          "position": 0,
          "icon": 118,
          "condition": "bf_build_Swords",
          "condition_variable": 1,
          "action": "bldg_build_tech",
          "action_variable": 1,
          "string": 329,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 165,
          "condition": "bf_build_Shields",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 8,
          "string": 333,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 166,
          "condition": "bf_build_Shields",
          "condition_variable": 1,
          "action": "bldg_build_tech",
          "action_variable": 9,
          "string": 333,
          "highlighted": 0
        },
        {
          "position": 2,
          "icon": 140,
          "condition": "bf_build_catdmg",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 22,
          "string": 347,
          "highlighted": 0
        },
        {
          "position": 2,
          "icon": 141,
          "condition": "bf_build_catdmg",
          "condition_variable": 1,
          "action": "bldg_build_tech",
          "action_variable": 23,
          "string": 347,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 83,
      "name": "Blacksmith (orc)",
      "tree": ["Orc"],
      "entries": [83],
      "original": [
        {
          "position": 0,
          "icon": 120,
          "condition": "bf_build_Swords",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 2,
          "string": 331,
          "highlighted": 0
        },
        {
          "position": 0,
          "icon": 121,
          "condition": "bf_build_Swords",
          "condition_variable": 1,
          "action": "bldg_build_tech",
          "action_variable": 3,
          "string": 331,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 168,
          "condition": "bf_build_Shields",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 10,
          "string": 334,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 169,
          "condition": "bf_build_Shields",
          "condition_variable": 1,
          "action": "bldg_build_tech",
          "action_variable": 11,
          "string": 334,
          "highlighted": 0
        },
        {
          "position": 2,
          "icon": 138,
          "condition": "bf_build_catdmg",
          "condition_variable": 0,
          "action": "bldg_build_tech",
          "action_variable": 20,
          "string": 346,
          "highlighted": 0
        },
        {
          "position": 2,
          "icon": 139,
          "condition": "bf_build_catdmg",
          "condition_variable": 1,
          "action": "bldg_build_tech",
          "action_variable": 21,
          "string": 346,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 111,
      "name": "Human Basic Build",
      "tree": ["Other"],
      "entries": [111],
      "original": [
        {
          "position": 0,
          "icon": 38,
          "condition": "bf_farm_ok",
          "action": "order_place",
          "action_variable": 58,
          "string": 306,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 42,
          "condition": "bf_barrack_ok",
          "action": "order_place",
          "action_variable": 60,
          "string": 299,
          "highlighted": 0
        },
        {
          "position": 2,
          "icon": 40,
          "condition": "bf_thall_ok",
          "action": "order_place",
          "action_variable": 74,
          "string": 307,
          "highlighted": 0
        },
        {
          "position": 3,
          "icon": 44,
          "condition": "bf_mill_ok",
          "action": "order_place",
          "action_variable": 76,
          "string": 300,
          "highlighted": 0
        },
        {
          "position": 4,
          "icon": 46,
          "condition": "bf_smith_ok",
          "action": "order_place",
          "action_variable": 82,
          "string": 314,
          "highlighted": 0
        },
        {
          "position": 6,
          "icon": 60,
          "condition": "bf_tower_ok",
          "action": "order_place",
          "action_variable": 64,
          "string": 303,
          "highlighted": 0
        },
        {
          "position": 7,
          "icon": 92,
          "condition": "bf_wall_ok",
          "action": "order_place",
          "action_variable": 103,
          "string": 312,
          "highlighted": 0
        },
        {
          "position": 8,
          "icon": 91,
          "condition": "bf_always",
          "action": "status_set_card",
          "action_variable": 110,
          "string": 407,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 112,
      "name": "Human Advanced Build",
      "tree": ["Other"],
      "entries": [112],
      "original": [
        {
          "position": 0,
          "icon": 48,
          "condition": "bf_shipyard_ok",
          "action": "order_place",
          "action_variable": 72,
          "string": 313,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 52,
          "condition": "bf_foundry_ok",
          "action": "order_place",
          "action_variable": 78,
          "string": 311,
          "highlighted": 0
        },
        {
          "position": 2,
          "icon": 50,
          "condition": "bf_refinery_ok",
          "action": "order_place",
          "action_variable": 84,
          "string": 310,
          "highlighted": 0
        },
        {
          "position": 3,
          "icon": 58,
          "condition": "bf_inventor_ok",
          "action": "order_place",
          "action_variable": 68,
          "string": 321,
          "highlighted": 0
        },
        {
          "position": 4,
          "icon": 56,
          "condition": "bf_stable_ok",
          "action": "order_place",
          "action_variable": 66,
          "string": 301,
          "highlighted": 0
        },
        {
          "position": 5,
          "icon": 62,
          "condition": "bf_church_ok",
          "action": "order_place",
          "action_variable": 62,
          "string": 304,
          "highlighted": 0
        },
        {
          "position": 6,
          "icon": 64,
          "condition": "bf_wiz_tower_ok",
          "action": "order_place",
          "action_variable": 80,
          "string": 325,
          "highlighted": 0
        },
        {
          "position": 7,
          "icon": 72,
          "condition": "bf_aviary_ok",
          "action": "order_place",
          "action_variable": 70,
          "string": 323,
          "highlighted": 0
        },
        {
          "position": 8,
          "icon": 91,
          "condition": "bf_always",
          "action": "status_set_card",
          "action_variable": 110,
          "string": 407,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 113,
      "name": "Orc Basic Build",
      "tree": ["Other"],
      "entries": [113],
      "original": [
        {
          "position": 0,
          "icon": 39,
          "condition": "bf_farm_ok",
          "action": "order_place",
          "action_variable": 59,
          "string": 306,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 43,
          "condition": "bf_barrack_ok",
          "action": "order_place",
          "action_variable": 61,
          "string": 299,
          "highlighted": 0
        },
        {
          "position": 2,
          "icon": 41,
          "condition": "bf_thall_ok",
          "action": "order_place",
          "action_variable": 75,
          "string": 308,
          "highlighted": 0
        },
        {
          "position": 3,
          "icon": 45,
          "condition": "bf_mill_ok",
          "action": "order_place",
          "action_variable": 77,
          "string": 300,
          "highlighted": 0
        },
        {
          "position": 4,
          "icon": 47,
          "condition": "bf_smith_ok",
          "action": "order_place",
          "action_variable": 83,
          "string": 314,
          "highlighted": 0
        },
        {
          "position": 6,
          "icon": 61,
          "condition": "bf_tower_ok",
          "action": "order_place",
          "action_variable": 65,
          "string": 303,
          "highlighted": 0
        },
        {
          "position": 7,
          "icon": 93,
          "condition": "bf_wall_ok",
          "action": "order_place",
          "action_variable": 104,
          "string": 312,
          "highlighted": 0
        },
        {
          "position": 8,
          "icon": 91,
          "condition": "bf_always",
          "action": "status_set_card",
          "action_variable": 110,
          "string": 407,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 114,
      "name": "Orc Advanced Build",
      "tree": ["Other"],
      "entries": [114],
      "original": [
        {
          "position": 0,
          "icon": 49,
          "condition": "bf_shipyard_ok",
          "action": "order_place",
          "action_variable": 73,
          "string": 313,
          "highlighted": 0
        },
        {
          "position": 1,
          "icon": 53,
          "condition": "bf_foundry_ok",
          "action": "order_place",
          "action_variable": 79,
          "string": 311,
          "highlighted": 0
        },
        {
          "position": 2,
          "icon": 51,
          "condition": "bf_refinery_ok",
          "action": "order_place",
          "action_variable": 85,
          "string": 310,
          "highlighted": 0
        },
        {
          "position": 3,
          "icon": 59,
          "condition": "bf_inventor_ok",
          "action": "order_place",
          "action_variable": 69,
          "string": 322,
          "highlighted": 0
        },
        {
          "position": 4,
          "icon": 57,
          "condition": "bf_stable_ok",
          "action": "order_place",
          "action_variable": 67,
          "string": 302,
          "highlighted": 0
        },
        {
          "position": 5,
          "icon": 63,
          "condition": "bf_church_ok",
          "action": "order_place",
          "action_variable": 63,
          "string": 305,
          "highlighted": 0
        },
        {
          "position": 6,
          "icon": 65,
          "condition": "bf_wiz_tower_ok",
          "action": "order_place",
          "action_variable": 81,
          "string": 326,
          "highlighted": 0
        },
        {
          "position": 7,
          "icon": 73,
          "condition": "bf_aviary_ok",
          "action": "order_place",
          "action_variable": 71,
          "string": 324,
          "highlighted": 0
        },
        {
          "position": 8,
          "icon": 91,
          "condition": "bf_always",
          "action": "status_set_card",
          "action_variable": 110,
          "string": 407,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 115,
      "name": "Cancel (target)",
      "tree": ["Other"],
      "entries": [115],
      "original": [
        {
          "position": 8,
          "icon": 91,
          "condition": "bf_always",
          "action": "target_off",
          "action_variable": 1,
          "string": 407,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 116,
      "name": "Cancel (placing)",
      "tree": ["Other"],
      "entries": [116],
      "original": [
        {
          "position": 8,
          "icon": 91,
          "condition": "bf_always",
          "action": "placebox_off",
          "action_variable": 1,
          "string": 407,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 117,
      "name": "Cancel group",
      "tree": ["Other"],
      "entries": [117],
      "original": [
        {
          "position": 8,
          "icon": 91,
          "condition": "bf_not_comp",
          "action": "order_kill",
          "string": 408,
          "highlighted": 0
        },
        {
          "position": 8,
          "icon": 91,
          "condition": "bf_stop_upgrade",
          "action": "order_stop_build",
          "string": 410,
          "highlighted": 0
        },
        {
          "position": 8,
          "icon": 91,
          "condition": "bf_stop_unit",
          "action": "order_stop_build",
          "string": 409,
          "highlighted": 0
        }
      ]
    },
    {
      "id": 118,
      "name": "Human group",
      "tree": ["Other"],
      "entries": [118],
      "original": {
        "default": [
          {
            "position": 0,
            "icon": 83,
            "condition": "bf_always",
            "action": "order_move",
            "string": 392,
            "highlighted": 2
          },
          {
            "position": 1,
            "icon": 164,
            "condition": "bf_has_Shields",
            "condition_variable": 0,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 1,
            "icon": 165,
            "condition": "bf_has_Shields",
            "condition_variable": 1,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 1,
            "icon": 166,
            "condition": "bf_has_Shields",
            "condition_variable": 2,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 2,
            "icon": 116,
            "condition": "bf_always",
            "action": "order_attack",
            "string": 394,
            "highlighted": 8
          },
          {
            "position": 3,
            "icon": 178,
            "condition": "bf_always",
            "action": "order_patrol",
            "string": 404,
            "highlighted": 4
          },
          {
            "position": 4,
            "icon": 180,
            "condition": "bf_always",
            "action": "order_stand_ground",
            "string": 403,
            "highlighted": 16
          },
          {
            "position": 5,
            "icon": 182,
            "condition": "bf_attack_ground",
            "action": "order_attack_ground",
            "string": 402,
            "highlighted": 32
          }
        ],
        "perVersion": {
          "1.3": [
            {
              "position": 0,
              "icon": 83,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 164,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 165,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 166,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 2,
              "icon": 116,
              "condition": "bf_can_attack",
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 3,
              "icon": 178,
              "condition": "bf_can_attack",
              "action": "order_patrol",
              "string": 404,
              "highlighted": 4
            },
            {
              "position": 4,
              "icon": 180,
              "condition": "bf_can_attack",
              "action": "order_stand_ground",
              "string": 403,
              "highlighted": 16
            },
            {
              "position": 5,
              "icon": 182,
              "condition": "bf_attack_ground",
              "action": "order_attack_ground",
              "string": 402,
              "highlighted": 32
            }
          ],
          "1.33": [
            {
              "position": 0,
              "icon": 83,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 164,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 165,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 166,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 2,
              "icon": 116,
              "condition": "bf_can_attack",
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 3,
              "icon": 178,
              "condition": "bf_can_attack",
              "action": "order_patrol",
              "string": 404,
              "highlighted": 4
            },
            {
              "position": 4,
              "icon": 180,
              "condition": "bf_can_attack",
              "action": "order_stand_ground",
              "string": 403,
              "highlighted": 16
            },
            {
              "position": 5,
              "icon": 182,
              "condition": "bf_attack_ground",
              "action": "order_attack_ground",
              "string": 402,
              "highlighted": 32
            }
          ],
          "1.5": [
            {
              "position": 0,
              "icon": 83,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 164,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 165,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 166,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 2,
              "icon": 116,
              "condition": "bf_can_attack",
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 3,
              "icon": 178,
              "condition": "bf_can_attack",
              "action": "order_patrol",
              "string": 404,
              "highlighted": 4
            },
            {
              "position": 4,
              "icon": 180,
              "condition": "bf_can_attack",
              "action": "order_stand_ground",
              "string": 403,
              "highlighted": 16
            },
            {
              "position": 5,
              "icon": 182,
              "condition": "bf_attack_ground",
              "action": "order_attack_ground",
              "string": 402,
              "highlighted": 32
            }
          ]
        }
      }
    },
    {
      "id": 119,
      "name": "Orc group",
      "tree": ["Other"],
      "entries": [119],
      "original": {
        "default": [
          {
            "position": 0,
            "icon": 84,
            "condition": "bf_always",
            "action": "order_move",
            "string": 392,
            "highlighted": 2
          },
          {
            "position": 1,
            "icon": 167,
            "condition": "bf_has_Shields",
            "condition_variable": 0,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 1,
            "icon": 168,
            "condition": "bf_has_Shields",
            "condition_variable": 1,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 1,
            "icon": 169,
            "condition": "bf_has_Shields",
            "condition_variable": 2,
            "action": "order_guard",
            "string": 393,
            "highlighted": 1
          },
          {
            "position": 2,
            "icon": 119,
            "condition": "bf_always",
            "action": "order_attack",
            "string": 394,
            "highlighted": 8
          },
          {
            "position": 3,
            "icon": 179,
            "condition": "bf_always",
            "action": "order_patrol",
            "string": 404,
            "highlighted": 4
          },
          {
            "position": 4,
            "icon": 181,
            "condition": "bf_always",
            "action": "order_stand_ground",
            "string": 403,
            "highlighted": 16
          },
          {
            "position": 5,
            "icon": 183,
            "condition": "bf_attack_ground",
            "action": "order_attack_ground",
            "string": 402,
            "highlighted": 32
          }
        ],
        "perVersion": {
          "1.3": [
            {
              "position": 0,
              "icon": 84,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 167,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 168,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 169,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 2,
              "icon": 119,
              "condition": "bf_can_attack",
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 3,
              "icon": 179,
              "condition": "bf_can_attack",
              "action": "order_patrol",
              "string": 404,
              "highlighted": 4
            },
            {
              "position": 4,
              "icon": 181,
              "condition": "bf_can_attack",
              "action": "order_stand_ground",
              "string": 403,
              "highlighted": 16
            },
            {
              "position": 5,
              "icon": 183,
              "condition": "bf_attack_ground",
              "action": "order_attack_ground",
              "string": 402,
              "highlighted": 32
            }
          ],
          "1.33": [
            {
              "position": 0,
              "icon": 84,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 167,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 168,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 169,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 2,
              "icon": 119,
              "condition": "bf_can_attack",
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 3,
              "icon": 179,
              "condition": "bf_can_attack",
              "action": "order_patrol",
              "string": 404,
              "highlighted": 4
            },
            {
              "position": 4,
              "icon": 181,
              "condition": "bf_can_attack",
              "action": "order_stand_ground",
              "string": 403,
              "highlighted": 16
            },
            {
              "position": 5,
              "icon": 183,
              "condition": "bf_attack_ground",
              "action": "order_attack_ground",
              "string": 402,
              "highlighted": 32
            }
          ],
          "1.5": [
            {
              "position": 0,
              "icon": 84,
              "condition": "bf_always",
              "action": "order_move",
              "string": 392,
              "highlighted": 2
            },
            {
              "position": 1,
              "icon": 167,
              "condition": "bf_has_Shields",
              "condition_variable": 0,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 168,
              "condition": "bf_has_Shields",
              "condition_variable": 1,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 1,
              "icon": 169,
              "condition": "bf_has_Shields",
              "condition_variable": 2,
              "action": "order_guard",
              "string": 393,
              "highlighted": 1
            },
            {
              "position": 2,
              "icon": 119,
              "condition": "bf_can_attack",
              "action": "order_attack",
              "string": 394,
              "highlighted": 8
            },
            {
              "position": 3,
              "icon": 179,
              "condition": "bf_can_attack",
              "action": "order_patrol",
              "string": 404,
              "highlighted": 4
            },
            {
              "position": 4,
              "icon": 181,
              "condition": "bf_can_attack",
              "action": "order_stand_ground",
              "string": 403,
              "highlighted": 16
            },
            {
              "position": 5,
              "icon": 183,
              "condition": "bf_attack_ground",
              "action": "order_attack_ground",
              "string": 402,
              "highlighted": 32
            }
          ]
        }
      }
    }
  ],
  "upgrades": [
    {"id": 0, "name": "Sword 1", "tree": ["Upgrades"]},
    {"id": 1, "name": "Sword 2", "tree": ["Upgrades"]},
    {"id": 2, "name": "Axe 1", "tree": ["Upgrades"]},
    {"id": 3, "name": "Axe 2", "tree": ["Upgrades"]},
    {"id": 4, "name": "Arrow 1", "tree": ["Upgrades"]},
    {"id": 5, "name": "Arrow 2", "tree": ["Upgrades"]},
    {"id": 6, "name": "Throwing Axes 1 (Spear 1)", "tree": ["Upgrades"]},
    {"id": 7, "name": "Throwing Axes 2 (Spear 2)", "tree": ["Upgrades"]},
    {"id": 8, "name": "Human Shield 1", "tree": ["Upgrades"]},
    {"id": 9, "name": "Human Shield 2", "tree": ["Upgrades"]},
    {"id": 10, "name": "Orc Shield 1", "tree": ["Upgrades"]},
    {"id": 11, "name": "Orc Shield 2", "tree": ["Upgrades"]},
    {"id": 12, "name": "Human Ship Cannon 1", "tree": ["Upgrades"]},
    {"id": 13, "name": "Human Ship Cannon 2", "tree": ["Upgrades"]},
    {"id": 14, "name": "Orc Ship Cannon 1", "tree": ["Upgrades"]},
    {"id": 15, "name": "Orc Ship Cannon 2", "tree": ["Upgrades"]},
    {"id": 16, "name": "Human Ship Armor 1", "tree": ["Upgrades"]},
    {"id": 17, "name": "Human Ship Armor 2", "tree": ["Upgrades"]},
    {"id": 18, "name": "Orc Ship Armor 1", "tree": ["Upgrades"]},
    {"id": 19, "name": "Orc Ship Armor 2", "tree": ["Upgrades"]},
    {"id": 20, "name": "Catapult 1", "tree": ["Upgrades"]},
    {"id": 21, "name": "Catapult 2", "tree": ["Upgrades"]},
    {"id": 22, "name": "Ballista 1", "tree": ["Upgrades"]},
    {"id": 23, "name": "Ballista 2", "tree": ["Upgrades"]},
    {"id": 24, "name": "Elven Ranger Training", "tree": ["Upgrades"]},
    {"id": 25, "name": "Longbow", "tree": ["Upgrades"]},
    {"id": 26, "name": "Ranger Scouting", "tree": ["Upgrades"]},
    {"id": 27, "name": "Ranger Marksmanship", "tree": ["Upgrades"]},
    {"id": 28, "name": "Troll Berserker Training", "tree": ["Upgrades"]},
    {"id": 29, "name": "Lighter Axes", "tree": ["Upgrades"]},
    {"id": 30, "name": "Berserker Scouting", "tree": ["Upgrades"]},
    {"id": 31, "name": "Berserker Regeneration", "tree": ["Upgrades"]},
    {"id": 32, "name": "Upgrade Ogres to Ogre-Mages", "tree": ["Spells"]},
    {"id": 33, "name": "Upgrade Knights to Paladins", "tree": ["Spells"]},
    {"id": 34, "name": "Holy Vision", "tree": ["Spells"]},
    {"id": 35, "name": "Healing", "tree": ["Spells"]},
    {"id": 36, "name": "Exorcism", "tree": ["Spells"]},
    {"id": 37, "name": "Flame Shield", "tree": ["Spells"]},
    {"id": 38, "name": "Fireball", "tree": ["Spells"]},
    {"id": 39, "name": "Slow", "tree": ["Spells"]},
    {"id": 40, "name": "Invisibility", "tree": ["Spells"]},
    {"id": 41, "name": "Polymorph", "tree": ["Spells"]},
    {"id": 42, "name": "Blizzard", "tree": ["Spells"]},
    {"id": 43, "name": "Eye of Kilrogg", "tree": ["Spells"]},
    {"id": 44, "name": "Bloodlust", "tree": ["Spells"]},
    {"id": 45, "name": "Raise Dead", "tree": ["Spells"]},
    {"id": 46, "name": "Death Coil", "tree": ["Spells"]},
    {"id": 47, "name": "Whirlwind", "tree": ["Spells"]},
    {"id": 48, "name": "Haste", "tree": ["Spells"]},
    {"id": 49, "name": "Unholy Armor", "tree": ["Spells"]},
    {"id": 50, "name": "Runes", "tree": ["Spells"]},
    {"id": 51, "name": "Death and Decay", "tree": ["Spells"]}
  ],
  "icons": {
    "0": "BTN_H_PEON",
    "1": "BTN_O_PEON",
    "2": "BTN_H_GRUNT",
    "3": "BTN_O_GRUNT",
    "4": "BTN_H_SPEAR",
    "5": "BTN_O_SPEAR",
    "6": "BTN_H_RANGER",
    "7": "BTN_O_BERSERKER",
    "8": "BTN_H_KNIGHT",
    "9": "BTN_O_OGRE",
    "10": "BTN_H_CLERIC",
    "11": "BTN_O_CLERIC",
    "12": "BTN_H_DWARVES",
    "13": "BTN_O_GOBLINS",
    "14": "BTN_H_WIZARD",
    "15": "BTN_O_WIZARD",
    "16": "BTN_H_CATAPULT",
    "17": "BTN_O_CATAPULT",
    "18": "BTN_H_TANKER",
    "19": "BTN_O_TANKER",
    "20": "BTN_H_TRANSPORT",
    "21": "BTN_O_TRANSPORT",
    "22": "BTN_H_DESTROYER",
    "23": "BTN_O_DESTROYER",
    "24": "BTN_H_BATTLESHIP",
    "25": "BTN_O_BATTLESHIP",
    "26": "BTN_H_SUB",
    "27": "BTN_O_SUB",
    "28": "BTN_H_FLYER",
    "29": "BTN_O_BALLOON",
    "30": "BTN_H_GRIFFON",
    "31": "BTN_O_DRAGON",
    "38": "BTN_H_FARM",
    "39": "BTN_O_FARM",
    "40": "BTN_H_TOWNHALL",
    "41": "BTN_O_TOWNHALL",
    "42": "BTN_H_BARRACKS",
    "43": "BTN_O_BARRACKS",
    "44": "BTN_H_LUMBER",
    "45": "BTN_O_LUMBER",
    "46": "BTN_H_BLACK",
    "47": "BTN_O_BLACK",
    "48": "BTN_H_SHIPYARD",
    "49": "BTN_O_SHIPYARD",
    "50": "BTN_H_REFINERY",
    "51": "BTN_O_REFINERY",
    "52": "BTN_H_FOUNDRY",
    "53": "BTN_O_FOUNDRY",
    "54": "BTN_H_OILRIG",
    "55": "BTN_O_OILRIG",
    "56": "BTN_H_STABLES",
    "57": "BTN_O_OGRECAMP",
    "58": "BTN_H_INVENTOR",
    "59": "BTN_O_INVENTOR",
    "60": "BTN_H_TOWER",
    "61": "BTN_O_TOWER",
    "62": "BTN_H_CHURCH",
    "63": "BTN_O_TEMPLE",
    "64": "BTN_H_WIZARD_TOWER",
    "65": "BTN_O_DEATH_TOWER",
    "66": "BTN_H_KEEP",
    "67": "BTN_O_KEEP",
    "68": "BTN_H_CASTLE",
    "69": "BTN_O_CASTLE",
    "72": "BTN_H_AVIARY",
    "73": "BTN_O_AVIARY",
    "75": "BTN_H_ARROW_TOWER",
    "76": "BTN_H_CANNON_TOWER",
    "77": "BTN_O_ARROW_TOWER",
    "78": "BTN_O_CANNON_TOWER",
    "83": "BTN_H_MOVE",
    "84": "BTN_O_MOVE",
    "85": "BTN_REPAIR",
    "86": "BTN_HARVEST",
    "87": "BTN_BLDWDN",
    "88": "BTN_BLDSTN",
    "89": "BTN_RETURN",
    "90": "BTN_ORETURN",
    "91": "BTN_CANCEL",
    "92": "BTN_BLD_HWALL",
    "93": "BTN_BLD_OWALL",
    "94": "BTN_SLOW",
    "95": "BTN_INVIS",
    "96": "BTN_HASTE",
    "97": "BTN_RUNES",
    "98": "BTN_ARMOR",
    "99": "BTN_LIGHTNING",
    "100": "BTN_FIRESHIELD",
    "101": "BTN_FIREBALL",
    "102": "BTN_TOUCHOF",
    "103": "BTN_DRAINLIFE",
    "104": "BTN_WHIRLWIND",
    "105": "BTN_BLIZZARD",
    "106": "BTN_VISION",
    "107": "BTN_HEAL",
    "108": "BTN_DECAY",
    "110": "BTN_EXORCISM",
    "111": "BTN_EYEOF",
    "112": "BTN_BLOODLUST",
    "114": "BTN_RAISEDEAD",
    "115": "BTN_POLYMORPH",
    "116": "BTN_UP_SWORD0",
    "117": "BTN_UP_SWORD1",
    "118": "BTN_UP_SWORD2",
    "119": "BTN_UP_AXE0",
    "120": "BTN_UP_AXE1",
    "121": "BTN_UP_AXE2",
    "124": "BTN_UP_ARROW0",
    "125": "BTN_UP_ARROW1",
    "126": "BTN_UP_ARROW2",
    "127": "BTN_UP_SPEAR0",
    "128": "BTN_UP_SPEAR1",
    "129": "BTN_UP_SPEAR2",
    "132": "BTN_UP_LONGBOW",
    "133": "BTN_UP_HSCOUTS",
    "134": "BTN_UP_HMARKS",
    "135": "BTN_UP_LIGHTAXE",
    "136": "BTN_UP_OSCOUTS",
    "137": "BTN_UP_OMARKS",
    "138": "BTN_UP_CATDMG1",
    "139": "BTN_UP_CATDMG2",
    "140": "BTN_UP_BALDMG1",
    "141": "BTN_UP_BALDMG2",
    "142": "BTN_BLOW_DWARF",
    "143": "BTN_BLOW_GOBLIN",
    "144": "BTN_H_BOAT_ATK0",
    "145": "BTN_H_BOAT_ATK1",
    "146": "BTN_H_BOAT_ATK2",
    "147": "BTN_O_BOAT_ATK0",
    "148": "BTN_O_BOAT_ATK1",
    "149": "BTN_O_BOAT_ATK2",
    "150": "BTN_O_BOAT_ARM0",
    "151": "BTN_O_BOAT_ARM1",
    "152": "BTN_O_BOAT_ARM2",
    "153": "BTN_H_BOAT_ARM0",
    "154": "BTN_H_BOAT_ARM1",
    "155": "BTN_H_BOAT_ARM2",
    "156": "BTN_O_BOAT_MOVE",
    "157": "BTN_H_BOAT_MOVE",
    "158": "BTN_H_RETURN_OIL",
    "159": "BTN_O_RETURN_OIL",
    "160": "BTN_O_TRANSP_OIL",
    "161": "BTN_H_TRANSP_OIL",
    "162": "BTN_H_DEBARK",
    "163": "BTN_O_DEBARK",
    "164": "BTN_H_SHIELD0",
    "165": "BTN_H_SHIELD1",
    "166": "BTN_H_SHIELD2",
    "167": "BTN_O_SHIELD0",
    "168": "BTN_O_SHIELD1",
    "169": "BTN_O_SHIELD2",
    "178": "BTN_H_PATROL",
    "179": "BTN_O_PATROL",
    "180": "BTN_H_STAND",
    "181": "BTN_O_STAND",
    "182": "BTN_H_ATK_GROUND",
    "183": "BTN_O_ATK_GROUND",
    "184": "BTN_H_BOAT_PATROL",
    "185": "BTN_O_BOAT_PATROL"
  },
  "strings": {
    "269": "TRAIN PEON",
    "270": "TRAIN PEASANT",
    "271": "TRAIN AXETHROWER",
    "272": "TRAIN ARCHER",
    "273": "TRAIN RANGER",
    "274": "TRAIN BERSERKER",
    "275": "TRAIN KNIGHT",
    "276": "TRAIN TWO-HEADED OGRE",
    "277": "TRAIN PALADIN",
    "278": "TRAIN OGRE-MAGE",
    "279": "TRAIN DEATH KNIGHT",
    "281": "TRAIN MAGE",
    "282": "TRAIN GRUNT",
    "283": "TRAIN FOOTMAN",
    "284": "BUILD BALLISTA",
    "285": "BUILD CATAPULT",
    "286": "BUILD OIL TANKER",
    "287": "BUILD DESTROYER",
    "288": "BUILD TRANSPORT",
    "289": "BUILD BATTLESHIP",
    "290": "BUILD JUGGERNAUGHT",
    "291": "BUILD GNOMISH SUBMARINE",
    "292": "TRAIN GIANT TURTLE",
    "293": "BUILD GOBLIN ZEPPELIN",
    "294": "BUILD FLYING MACHINE",
    "295": "TRAIN GRYPHON RIDER",
    "296": "BUILD DRAGON",
    "297": "TRAIN DWARVEN DEMOLITION SQUAD",
    "298": "TRAIN GOBLIN SAPPERS",
    "299": "BUILD BARRACKS",
    "300": "BUILD LUMBER MILL",
    "301": "BUILD STABLES",
    "302": "BUILD OGRE MOUND",
    "303": "BUILD TOWER",
    "304": "BUILD CHURCH",
    "305": "BUILD ALTAR OF STORMS",
    "306": "BUILD FARM",
    "307": "BUILD A TOWN HALL",
    "308": "BUILD A GREAT HALL",
    "309": "BUILD OIL PLATFORM",
    "310": "BUILD OIL REFINERY",
    "311": "BUILD FOUNDRY",
    "312": "BUILD WALL",
    "313": "BUILD SHIPYARD",
    "314": "BUILD BLACKSMITH",
    "315": "UPGRADE TO CASTLE",
    "316": "UPGRADE TO FORTRESS",
    "317": "UPGRADE TO KEEP",
    "318": "UPGRADE TO STRONGHOLD",
    "319": "UPGRADE TO GUARD TOWER",
    "320": "UPGRADE TO CANNON TOWER",
    "321": "BUILD GNOMISH INVENTOR",
    "322": "BUILD GOBLIN ALCHEMIST",
    "323": "BUILD GRYPHON AVIARY",
    "324": "MAKE DRAGON ROOST",
    "325": "BUILD MAGE TOWER",
    "326": "BUILD TEMPLE OF THE DAMNED",
    "329": "UPGRADE SWORDS (Damage +2)",
    "330": "UPGRADE THROWING AXES (Damage +1)",
    "331": "UPGRADE WEAPONS (Damage +2)",
    "332": "UPGRADE ARROWS (Damage +1)",
    "333": "UPGRADE SHIELDS (Armor +2)",
    "334": "UPGRADE SHIELDS (Armor +2)",
    "335": "UPGRADE CANNONS (Damage +5)",
    "336": "UPGRADE SHIP ARMOR (Armor +5)",
    "338": "ELVEN RANGER TRAINING",
    "339": "RESEARCH LONGBOW (Range +1)",
    "340": "RANGER SCOUTING (Sight:9)",
    "341": "RANGER MARKSMANSHIP (Damage +3)",
    "342": "TROLL BERSERKER TRAINING",
    "343": "RESEARCH LIGHTER AXES (Range +1)",
    "344": "BERSERKER SCOUTING (Sight:9)",
    "345": "BERSERKER REGENERATION",
    "346": "UPGRADE CATAPULTS (Damage +15)",
    "347": "UPGRADE BALLISTAS (Damage +15)",
    "348": "LIGHTNING ATTACK",
    "349": "FIREBALL",
    "350": "FLAME SHIELD",
    "351": "SLOW",
    "352": "INVISIBILITY",
    "353": "POLYMORPH",
    "354": "BLIZZARD",
    "355": "TOUCH OF DARKNESS",
    "356": "DEATH AND DECAY",
    "357": "DEATH COIL",
    "358": "HASTE",
    "359": "UNHOLY ARMOR",
    "360": "RUNES",
    "361": "WHIRLWIND",
    "362": "HOLY VISION",
    "363": "HEALING (per 1 HP)",
    "365": "EXORCISM",
    "366": "EYE OF KILROGG",
    "367": "BLOODLUST",
    "369": "RAISE DEAD",
    "370": "UPGRADE KNIGHTS TO PALADINS",
    "371": "UPGRADE OGRES TO MAGES",
    "373": "RESEARCH FLAME SHIELD",
    "374": "RESEARCH SLOW",
    "375": "RESEARCH INVISIBILITY",
    "376": "RESEARCH POLYMORPH",
    "377": "RESEARCH BLIZZARD",
    "378": "RESEARCH DEATH AND DECAY",
    "380": "RESEARCH HASTE",
    "381": "RESEARCH UNHOLY ARMOR",
    "382": "RESEARCH RUNES",
    "383": "RESEARCH WHIRLWIND",
    "385": "RESEARCH HEALING",
    "387": "RESEARCH EXORCISM",
    "389": "RESEARCH BLOODLUST",
    "391": "RESEARCH RAISE DEAD",
    "392": "MOVE",
    "393": "STOP",
    "394": "ATTACK",
    "395": "REPAIR",
    "396": "HARVEST LUMBER/MINE GOLD",
    "397": "HAUL OIL",
    "398": "BUILD BASIC STRUCTURE",
    "399": "BUILD ADVANCED STRUCTURE",
    "401": "RETURN WITH GOODS",
    "402": "ATTACK GROUND",
    "403": "STAND GROUND",
    "404": "PATROL",
    "405": "UNLOAD TRANSPORT",
    "406": "DEMOLISH",
    "407": "ESC - CANCEL",
    "408": "ESC - CANCEL CONSTRUCTION",
    "409": "ESC - CANCEL UNIT TRAINING",
    "410": "ESC - CANCEL UPGRADE"
  },
  "constants": [
    {
      "name": "flame_shield_duration",
      "label": "Flame Shield duration",
      "group": ["Spells", "Flame Shield"],
      "kind": "number",
      "range": {"min": 0, "max": 65535},
      "note": "Counted in game cycles, whose length depends on the game speed.",
      "help": "How long Flame Shield lasts.",
      "availability": {"1.3": 500, "1.33": 500, "1.5": 500, "2.00": 500, "2.02": 500}
    },
    {
      "name": "slow_duration",
      "label": "Slow duration",
      "group": ["Spells", "Slow"],
      "kind": "number",
      "range": {"min": 0, "max": 32767},
      "note": "Counted in game cycles, whose length depends on the game speed.",
      "help": "How long Slow lasts. Slow and Haste share one timer on the unit: it is below zero while the unit is slowed and above zero while it is hasted, so slowing a hasted unit first uses up what is left of the Haste.",
      "availability": {"1.3": 1000, "1.33": 1000, "1.5": 1000, "2.00": 1000, "2.02": 1000}
    },
    {
      "name": "invisibility_duration",
      "label": "Invisibility duration",
      "group": ["Spells", "Invisibility"],
      "kind": "number",
      "range": {"min": 0, "max": 65535},
      "note": "Counted in game cycles, whose length depends on the game speed.",
      "help": "How long Invisibility lasts.",
      "availability": {"1.3": 2000, "1.33": 2000, "1.5": 2000, "2.00": 2000, "2.02": 2000}
    },
    {
      "name": "bloodlust_duration",
      "label": "Bloodlust duration",
      "group": ["Spells", "Bloodlust"],
      "kind": "number",
      "range": {"min": 0, "max": 65535},
      "note": "Counted in game cycles, whose length depends on the game speed.",
      "help": "How long Bloodlust lasts.",
      "availability": {"1.3": 1000, "1.33": 1000, "1.5": 1000, "2.00": 1000, "2.02": 1000}
    },
    {
      "name": "whirlwind_duration",
      "label": "Whirlwind duration",
      "group": ["Spells", "Whirlwind"],
      "kind": "number",
      "range": {"min": 0, "max": 65535},
      "help": "How long the tornado lasts. Counted down by one each time the tornado moves.",
      "availability": {"1.3": 800, "1.33": 800, "1.5": 800, "2.00": 800, "2.02": 800}
    },
    {
      "name": "haste_duration",
      "label": "Haste duration",
      "group": ["Spells", "Haste"],
      "kind": "number",
      "range": {"min": 0, "max": 32767},
      "note": "Counted in game cycles, whose length depends on the game speed.",
      "help": "How long Haste lasts. Slow and Haste share one timer on the unit (see Slow duration).",
      "availability": {"1.3": 1000, "1.33": 1000, "1.5": 1000, "2.00": 1000, "2.02": 1000}
    },
    {
      "name": "unholy_armor_duration",
      "label": "Unholy Armor duration",
      "group": ["Spells", "Unholy Armor"],
      "kind": "number",
      "range": {"min": 0, "max": 65535},
      "note": "Counted in game cycles, whose length depends on the game speed.",
      "help": "How long Unholy Armor lasts.",
      "availability": {"1.3": 500, "1.33": 500, "1.5": 500, "2.00": 500, "2.02": 500}
    },
    {
      "name": "rune_duration",
      "label": "Runes duration",
      "group": ["Spells", "Runes"],
      "kind": "number",
      "range": {"min": 0, "max": 65535},
      "help": "How long a rune lasts before it disappears. Counted down by one each game cycle.",
      "availability": {"1.3": 2048, "1.33": 2048, "1.5": 2048, "2.00": 2048, "2.02": 2048}
    },
    {
      "name": "heal_amount",
      "label": "Healing: most hit points per cast",
      "group": ["Spells", "Healing"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "The most hit points one cast of Healing restores. The caster's mana can limit it further.",
      "availability": {"1.3": 40, "1.33": 40, "1.5": 40, "2.00": 40, "2.02": 40}
    },
    {
      "name": "flame_shield_damage",
      "label": "Flame Shield damage",
      "group": ["Spells", "Flame Shield"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Damage of each Flame Shield hit, done as area damage around the shielded unit. In 2.00 and 2.02 the same byte is also the missile number (4, Flame Shield), so changing it changes the missile too.",
      "availability": {"1.3": 4, "1.33": 4, "1.5": 4, "2.00": 4, "2.02": 4}
    },
    {
      "name": "fireball_damage",
      "label": "Fireball damage",
      "group": ["Spells", "Fireball"],
      "kind": "number",
      "range": {"min": 0, "max": 127},
      "help": "Fireball damage. A Gryphon Hammer or Dragon Breath/Fireball missile with exactly this damage is taken to be the Fireball spell, and keeps going for 40 calls near the end of its path instead of 25, so a unit whose damage equals this value gets the longer path too. In 1.3, 1.33 and 1.5 the value can be at most 127.",
      "availability": {"1.3": 40, "1.33": 40, "1.5": 40, "2.00": 40, "2.02": 40}
    },
    {
      "name": "blizzard_damage",
      "label": "Blizzard damage",
      "group": ["Spells", "Blizzard"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Blizzard damage per missile.",
      "availability": {"1.3": 10, "1.33": 10, "1.5": 10, "2.00": 10, "2.02": 10}
    },
    {
      "name": "blizzard_repeats",
      "label": "Blizzard repeats",
      "group": ["Spells", "Blizzard"],
      "kind": "number",
      "range": {"min": 0, "max": 127},
      "help": "Repeats given to each of Blizzard's five Ice Shards: with 10, 11 shards fall on each of the five spots. In 2.00 and 2.02 the value can be at most 127.",
      "availability": {"1.3": 10, "1.33": 10, "1.5": 10, "2.00": 10, "2.02": 10}
    },
    {
      "name": "death_coil_damage",
      "label": "Death Coil damage",
      "group": ["Spells", "Death Coil"],
      "kind": "number",
      "range": {"min": 0, "max": 127},
      "help": "Total Death Coil damage. The units hit are sorted with the fewest hit points first, and their hit points are added up one by one while the total stays at most this; these units die outright. The next unit takes what is left. The value can be at most 127.",
      "availability": {"1.3": 50, "1.33": 50, "1.5": 50, "2.00": 50, "2.02": 50}
    },
    {
      "name": "whirlwind_damage",
      "label": "Whirlwind damage",
      "group": ["Spells", "Whirlwind"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Tornado damage, done as area damage on every second move.",
      "availability": {"1.3": 4, "1.33": 4, "1.5": 4, "2.00": 4, "2.02": 4}
    },
    {
      "name": "rune_damage",
      "label": "Runes damage",
      "group": ["Spells", "Runes"],
      "kind": "number",
      "range": {"min": 0, "max": 127},
      "help": "Rune damage: a unit that sets off a rune dies if it has this many hit points or fewer, and otherwise loses this many. Armour is ignored. The value can be at most 127.",
      "availability": {"1.3": 50, "1.33": 50, "1.5": 50, "2.00": 50, "2.02": 50}
    },
    {
      "name": "rune_refund_count",
      "label": "Runes mana refund: rune count",
      "group": ["Spells", "Runes"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Mana refund, the first 5 in: (5 - runes placed) × (casting cost ÷ 5). Raising it gives back more mana; it does not change how many runes are placed, which is always the target spot and the four squares next to it.",
      "availability": {"1.3": 5, "1.33": 5, "1.5": 5, "2.00": 5, "2.02": 5}
    },
    {
      "name": "rune_refund_divisor",
      "label": "Runes mana refund: divisor",
      "group": ["Spells", "Runes"],
      "kind": "number",
      "range": {"min": 1, "max": 255},
      "help": "Mana refund, the second 5 in: (5 - runes placed) × (casting cost ÷ 5). 2.00 and 2.02 do the same calculation, but there the compiler turned \"÷ 5\" into a multiplication by 0x66666667 and a shift, so the 5 is not stored anywhere and cannot be changed by editing one value.",
      "availability": {"1.3": 5, "1.33": 5, "1.5": 5, "2.00": "not_applicable", "2.02": "not_applicable"}
    },
    {
      "name": "death_and_decay_damage",
      "label": "Death and Decay damage",
      "group": ["Spells", "Death and Decay"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Death and Decay damage per missile.",
      "availability": {"1.3": 10, "1.33": 10, "1.5": 10, "2.00": 10, "2.02": 10}
    },
    {
      "name": "death_and_decay_duration",
      "label": "Death and Decay hits per missile",
      "group": ["Spells", "Death and Decay"],
      "kind": "number",
      "range": {"min": 0, "max": 127},
      "help": "Time given to each of the five Death and Decay missiles: the number of times each one does area damage. In 2.00 and 2.02 the value can be at most 127.",
      "availability": {"1.3": 10, "1.33": 10, "1.5": 10, "2.00": 10, "2.02": 10}
    },
    {
      "name": "polymorph_unit",
      "label": "Polymorph: new unit",
      "group": ["Spells", "Polymorph"],
      "kind": "number",
      "range": {"min": 0, "max": 109},
      "refers": "unit",
      "help": "The unit into which Polymorph transforms units.",
      "availability": {"1.3": 57, "1.33": 57, "1.5": 57, "2.00": 57, "2.02": 57}
    },
    {
      "name": "polymorph_player",
      "label": "Polymorph: owner of the new unit",
      "group": ["Spells", "Polymorph"],
      "kind": "number",
      "range": {"min": 0, "max": 15},
      "help": "The player the critter is given to.",
      "availability": {"1.3": 15, "1.33": 15, "1.5": 15, "2.00": 15, "2.02": 15}
    },
    {
      "name": "eye_of_kilrogg_unit",
      "label": "Eye of Kilrogg: unit",
      "group": ["Spells", "Eye of Kilrogg"],
      "kind": "number",
      "range": {"min": 0, "max": 109},
      "refers": "unit",
      "help": "Which unit to summon when Eye of Kilrogg is cast.",
      "availability": {"1.3": 45, "1.33": 45, "1.5": 45, "2.00": 45, "2.02": 45}
    },
    {
      "name": "raise_dead_unit",
      "label": "Raise Dead: new unit",
      "group": ["Spells", "Raise Dead"],
      "kind": "number",
      "range": {"min": 0, "max": 109},
      "refers": "unit",
      "help": "The unit raised by Raise Dead.",
      "availability": {"1.3": 55, "1.33": 55, "1.5": 55, "2.00": 55, "2.02": 55}
    },
    {
      "name": "raise_dead_corpse",
      "label": "Raise Dead: dead body",
      "group": ["Spells", "Raise Dead"],
      "kind": "number",
      "range": {"min": 0, "max": 109},
      "refers": "unit",
      "help": "The unit that can be raised.",
      "availability": {"1.3": 105, "1.33": 105, "1.5": 105, "2.00": 105, "2.02": 105}
    },
    {
      "name": "holy_vision_up",
      "label": "Holy Vision: squares up",
      "group": ["Spells", "Holy Vision"],
      "kind": "number",
      "range": {"min": 0, "max": 127},
      "help": "How far above the target spot Holy Vision reveals: 8 squares up.",
      "availability": {"1.3": 8, "1.33": 8, "1.5": 8, "2.00": 8, "2.02": 8}
    },
    {
      "name": "holy_vision_down",
      "label": "Holy Vision: squares down",
      "group": ["Spells", "Holy Vision"],
      "kind": "number",
      "range": {"min": 0, "max": 127},
      "help": "How far below the target spot Holy Vision reveals: 8 squares down.",
      "availability": {"1.3": 8, "1.33": 8, "1.5": 8, "2.00": 8, "2.02": 8}
    },
    {
      "name": "holy_vision_side_y",
      "label": "Holy Vision: side places, squares up and down",
      "group": ["Spells", "Holy Vision"],
      "kind": "number",
      "range": {"min": 0, "max": 127},
      "help": "How far up or down the four places to the left and right are.",
      "availability": {"1.3": 4, "1.33": 4, "1.5": 4, "2.00": 4, "2.02": 4}
    },
    {
      "name": "holy_vision_side_x",
      "label": "Holy Vision: side places, squares left and right",
      "group": ["Spells", "Holy Vision"],
      "kind": "number",
      "range": {"min": 0, "max": 127},
      "help": "How far left or right those four places are.",
      "availability": {"1.3": 6, "1.33": 6, "1.5": 6, "2.00": 6, "2.02": 6}
    },
    {
      "name": "exorcism_radius",
      "label": "Exorcism radius",
      "group": ["Spells", "Exorcism"],
      "kind": "number",
      "range": {"min": 0, "max": 127},
      "note": "Give the radius. 2.00 and 2.02 store 1 minus the radius (-2 for a radius of 3), and the patcher converts it.",
      "help": "Radius in squares: the rings of squares around the target spot that are searched, from the spot itself (ring 0) out to this ring.",
      "availability": {"1.3": 3, "1.33": 3, "1.5": 3, "2.00": 3, "2.02": 3}
    },
    {
      "name": "blizzard_spread",
      "label": "Blizzard spread",
      "group": ["Spells", "Blizzard"],
      "kind": "number",
      "range": {"min": 1, "max": 127},
      "help": "Spread: each missile lands a random number of squares below this value, minus 2, from the target spot, across and down, so up to 2 squares away.",
      "availability": {"1.3": 5, "1.33": 5, "1.5": 5, "2.00": 5, "2.02": 5}
    },
    {
      "name": "raise_dead_range",
      "label": "Raise Dead range",
      "group": ["Spells", "Raise Dead"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Range: a dead body is raised if its distance from the target spot in squares, squared (x² + y²), is at most this (36, i.e. 6 squares).",
      "availability": {"1.3": 36, "1.33": 36, "1.5": 36, "2.00": 36, "2.02": 36}
    },
    {
      "name": "death_coil_offset",
      "label": "Death Coil area: squares left and up",
      "group": ["Spells", "Death Coil"],
      "kind": "number",
      "range": {"min": 0, "max": 127},
      "help": "Where the area hit by Death Coil starts: 2 squares left of and above the target spot.",
      "availability": {"1.3": 2, "1.33": 2, "1.5": 2, "2.00": 2, "2.02": 2}
    },
    {
      "name": "death_coil_size",
      "label": "Death Coil area: width and height",
      "group": ["Spells", "Death Coil"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Width and height of the area hit by Death Coil, in squares.",
      "availability": {"1.3": 5, "1.33": 5, "1.5": 5, "2.00": 5, "2.02": 5}
    },
    {
      "name": "death_and_decay_spread",
      "label": "Death and Decay spread",
      "group": ["Spells", "Death and Decay"],
      "kind": "number",
      "range": {"min": 1, "max": 127},
      "help": "Spread, as for Blizzard.",
      "availability": {"1.3": 5, "1.33": 5, "1.5": 5, "2.00": 5, "2.02": 5}
    },
    {
      "name": "spell_sound_base",
      "label": "Spell sound base",
      "group": ["Spells", "All spells"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Number added to a spell sound to get its number in the sound list. Spell sounds 0-16 are, in order: Bloodlust, Death and Decay, Death Coil, Exorcism, Flame Shield, Haste, Healing, Holy Vision, Blizzard, Invisibility, Eye of Kilrogg, Polymorph, Slow, Raise Dead, Runes, Unholy Armor and Whirlwind.",
      "availability": {"1.3": 69, "1.33": 69, "1.5": 69, "2.00": 69, "2.02": 69}
    },
    {
      "name": "holy_vision_missile",
      "label": "Holy Vision missile",
      "group": ["Spells", "Holy Vision"],
      "kind": "number",
      "range": {"min": 0, "max": 29},
      "note": "A missile number from 0 to 28; 29 is none.",
      "help": "Missile shown at each revealed place.",
      "availability": {"1.3": 22, "1.33": 22, "1.5": 22, "2.00": 22, "2.02": 22}
    },
    {
      "name": "holy_vision_sound",
      "label": "Holy Vision sound",
      "group": ["Spells", "Holy Vision"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "A spell sound from 0 (Bloodlust) to 16 (Whirlwind), to which the Spell sound base is added.",
      "help": "Spell sound.",
      "availability": {"1.3": 7, "1.33": 7, "1.5": 7, "2.00": 7, "2.02": 7}
    },
    {
      "name": "heal_missile",
      "label": "Healing missile",
      "group": ["Spells", "Healing"],
      "kind": "number",
      "range": {"min": 0, "max": 29},
      "note": "A missile number from 0 to 28; 29 is none.",
      "help": "Missile shown on the healed unit.",
      "availability": {"1.3": 9, "1.33": 9, "1.5": 9, "2.00": 9, "2.02": 9}
    },
    {
      "name": "heal_sound",
      "label": "Healing sound",
      "group": ["Spells", "Healing"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "A spell sound from 0 (Bloodlust) to 16 (Whirlwind), to which the Spell sound base is added.",
      "help": "Spell sound.",
      "availability": {"1.3": 6, "1.33": 6, "1.5": 6, "2.00": 6, "2.02": 6}
    },
    {
      "name": "exorcism_missile",
      "label": "Exorcism missile",
      "group": ["Spells", "Exorcism"],
      "kind": "number",
      "range": {"min": 0, "max": 29},
      "note": "A missile number from 0 to 28; 29 is none.",
      "help": "Missile shown on each unit hit.",
      "availability": {"1.3": 8, "1.33": 8, "1.5": 8, "2.00": 8, "2.02": 8}
    },
    {
      "name": "exorcism_sound",
      "label": "Exorcism sound",
      "group": ["Spells", "Exorcism"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "A spell sound from 0 (Bloodlust) to 16 (Whirlwind), to which the Spell sound base is added.",
      "help": "Spell sound. Played for each unit hit.",
      "availability": {"1.3": 3, "1.33": 3, "1.5": 3, "2.00": 3, "2.02": 3}
    },
    {
      "name": "flame_shield_cast_missile",
      "label": "Flame Shield missile",
      "group": ["Spells", "Flame Shield"],
      "kind": "number",
      "range": {"min": 0, "max": 29},
      "note": "A missile number from 0 to 28; 29 is none.",
      "help": "Missile that flies from the caster to the target.",
      "availability": {"1.3": 3, "1.33": 3, "1.5": 3, "2.00": 3, "2.02": 3}
    },
    {
      "name": "flame_shield_sound",
      "label": "Flame Shield sound",
      "group": ["Spells", "Flame Shield"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "A spell sound from 0 (Bloodlust) to 16 (Whirlwind), to which the Spell sound base is added.",
      "help": "Spell sound.",
      "availability": {"1.3": 4, "1.33": 4, "1.5": 4, "2.00": 4, "2.02": 4}
    },
    {
      "name": "fireball_missile",
      "label": "Fireball missile",
      "group": ["Spells", "Fireball"],
      "kind": "number",
      "range": {"min": 0, "max": 29},
      "note": "A missile number from 0 to 28; 29 is none.",
      "help": "Missile fired. In 2.00 and 2.02 the same byte is also stored in another missile field, so changing it changes that too.",
      "availability": {"1.3": 2, "1.33": 2, "1.5": 2, "2.00": 2, "2.02": 2}
    },
    {
      "name": "slow_missile",
      "label": "Slow missile",
      "group": ["Spells", "Slow"],
      "kind": "number",
      "range": {"min": 0, "max": 29},
      "note": "A missile number from 0 to 28; 29 is none.",
      "help": "Missile shown on the target.",
      "availability": {"1.3": 22, "1.33": 22, "1.5": 22, "2.00": 22, "2.02": 22}
    },
    {
      "name": "slow_sound",
      "label": "Slow sound",
      "group": ["Spells", "Slow"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "A spell sound from 0 (Bloodlust) to 16 (Whirlwind), to which the Spell sound base is added.",
      "help": "Spell sound.",
      "availability": {"1.3": 12, "1.33": 12, "1.5": 12, "2.00": 12, "2.02": 12}
    },
    {
      "name": "invisibility_missile",
      "label": "Invisibility missile",
      "group": ["Spells", "Invisibility"],
      "kind": "number",
      "range": {"min": 0, "max": 29},
      "note": "A missile number from 0 to 28; 29 is none.",
      "help": "Missile shown on the target.",
      "availability": {"1.3": 22, "1.33": 22, "1.5": 22, "2.00": 22, "2.02": 22}
    },
    {
      "name": "invisibility_sound",
      "label": "Invisibility sound",
      "group": ["Spells", "Invisibility"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "A spell sound from 0 (Bloodlust) to 16 (Whirlwind), to which the Spell sound base is added.",
      "help": "Spell sound.",
      "availability": {"1.3": 9, "1.33": 9, "1.5": 9, "2.00": 9, "2.02": 9}
    },
    {
      "name": "polymorph_missile",
      "label": "Polymorph missile",
      "group": ["Spells", "Polymorph"],
      "kind": "number",
      "range": {"min": 0, "max": 29},
      "note": "A missile number from 0 to 28; 29 is none.",
      "help": "Missile shown on the critter.",
      "availability": {"1.3": 22, "1.33": 22, "1.5": 22, "2.00": 22, "2.02": 22}
    },
    {
      "name": "polymorph_sound",
      "label": "Polymorph sound",
      "group": ["Spells", "Polymorph"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "A spell sound from 0 (Bloodlust) to 16 (Whirlwind), to which the Spell sound base is added.",
      "help": "Spell sound.",
      "availability": {"1.3": 11, "1.33": 11, "1.5": 11, "2.00": 11, "2.02": 11}
    },
    {
      "name": "blizzard_missile",
      "label": "Blizzard missile",
      "group": ["Spells", "Blizzard"],
      "kind": "number",
      "range": {"min": 0, "max": 29},
      "note": "A missile number from 0 to 28; 29 is none.",
      "help": "Missile dropped.",
      "availability": {"1.3": 5, "1.33": 5, "1.5": 5, "2.00": 5, "2.02": 5}
    },
    {
      "name": "blizzard_sound",
      "label": "Blizzard sound",
      "group": ["Spells", "Blizzard"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "A spell sound from 0 (Bloodlust) to 16 (Whirlwind), to which the Spell sound base is added.",
      "help": "Spell sound.",
      "availability": {"1.3": 8, "1.33": 8, "1.5": 8, "2.00": 8, "2.02": 8}
    },
    {
      "name": "eye_of_kilrogg_sound",
      "label": "Eye of Kilrogg sound",
      "group": ["Spells", "Eye of Kilrogg"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "A spell sound from 0 (Bloodlust) to 16 (Whirlwind), to which the Spell sound base is added.",
      "help": "Spell sound.",
      "availability": {"1.3": 10, "1.33": 10, "1.5": 10, "2.00": "not_applicable", "2.02": "not_applicable"}
    },
    {
      "name": "eye_of_kilrogg_sound_number",
      "label": "Eye of Kilrogg sound number",
      "group": ["Spells", "Eye of Kilrogg"],
      "kind": "number",
      "range": {"min": 0, "max": 350},
      "help": "Sound number: the entry in the sound list itself (346, Gamesfx\\misc\\Eye of Killrog.wav), not a spell sound.",
      "availability": {"1.3": "not_applicable", "1.33": "not_applicable", "1.5": "not_applicable", "2.00": 346, "2.02": 346}
    },
    {
      "name": "bloodlust_missile",
      "label": "Bloodlust missile",
      "group": ["Spells", "Bloodlust"],
      "kind": "number",
      "range": {"min": 0, "max": 29},
      "note": "A missile number from 0 to 28; 29 is none.",
      "help": "Missile shown on the target.",
      "availability": {"1.3": 22, "1.33": 22, "1.5": 22, "2.00": 22, "2.02": 22}
    },
    {
      "name": "bloodlust_sound",
      "label": "Bloodlust sound",
      "group": ["Spells", "Bloodlust"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "A spell sound from 0 (Bloodlust) to 16 (Whirlwind), to which the Spell sound base is added.",
      "help": "Spell sound. 1.3, 1.33 and 1.5 set it to 0 with xor, so there is no value to change.",
      "availability": {"1.3": "not_applicable", "1.33": "not_applicable", "1.5": "not_applicable", "2.00": 0, "2.02": 0}
    },
    {
      "name": "raise_dead_missile",
      "label": "Raise Dead missile",
      "group": ["Spells", "Raise Dead"],
      "kind": "number",
      "range": {"min": 0, "max": 29},
      "note": "A missile number from 0 to 28; 29 is none.",
      "help": "Missile shown on each skeleton.",
      "availability": {"1.3": 22, "1.33": 22, "1.5": 22, "2.00": 22, "2.02": 22}
    },
    {
      "name": "raise_dead_sound",
      "label": "Raise Dead sound",
      "group": ["Spells", "Raise Dead"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "A spell sound from 0 (Bloodlust) to 16 (Whirlwind), to which the Spell sound base is added.",
      "help": "Spell sound.",
      "availability": {"1.3": 13, "1.33": 13, "1.5": 13, "2.00": "not_applicable", "2.02": "not_applicable"}
    },
    {
      "name": "raise_dead_sound_number",
      "label": "Raise Dead sound number",
      "group": ["Spells", "Raise Dead"],
      "kind": "number",
      "range": {"min": 0, "max": 350},
      "help": "Sound number: the entry in the sound list itself (348, Gamesfx\\misc\\Raise Dead.wav), not a spell sound.",
      "availability": {"1.3": "not_applicable", "1.33": "not_applicable", "1.5": "not_applicable", "2.00": 348, "2.02": 348}
    },
    {
      "name": "death_coil_sound",
      "label": "Death Coil sound",
      "group": ["Spells", "Death Coil"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "A spell sound from 0 (Bloodlust) to 16 (Whirlwind), to which the Spell sound base is added.",
      "help": "Spell sound. In 1.3, 1.33 and 1.5 the same register is first passed to the function that fires the caster's missile at each unit.",
      "availability": {"1.3": 2, "1.33": 2, "1.5": 2, "2.00": 2, "2.02": 2}
    },
    {
      "name": "whirlwind_missile",
      "label": "Whirlwind missile",
      "group": ["Spells", "Whirlwind"],
      "kind": "number",
      "range": {"min": 0, "max": 29},
      "note": "A missile number from 0 to 28; 29 is none.",
      "help": "Missile created.",
      "availability": {"1.3": 12, "1.33": 12, "1.5": 12, "2.00": 12, "2.02": 12}
    },
    {
      "name": "whirlwind_sound",
      "label": "Whirlwind sound",
      "group": ["Spells", "Whirlwind"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "A spell sound from 0 (Bloodlust) to 16 (Whirlwind), to which the Spell sound base is added.",
      "help": "Spell sound.",
      "availability": {"1.3": 16, "1.33": 16, "1.5": 16, "2.00": 16, "2.02": 16}
    },
    {
      "name": "haste_missile",
      "label": "Haste missile",
      "group": ["Spells", "Haste"],
      "kind": "number",
      "range": {"min": 0, "max": 29},
      "note": "A missile number from 0 to 28; 29 is none.",
      "help": "Missile shown on the target.",
      "availability": {"1.3": 22, "1.33": 22, "1.5": 22, "2.00": 22, "2.02": 22}
    },
    {
      "name": "haste_sound",
      "label": "Haste sound",
      "group": ["Spells", "Haste"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "A spell sound from 0 (Bloodlust) to 16 (Whirlwind), to which the Spell sound base is added.",
      "help": "Spell sound.",
      "availability": {"1.3": 5, "1.33": 5, "1.5": 5, "2.00": 5, "2.02": 5}
    },
    {
      "name": "unholy_armor_missile",
      "label": "Unholy Armor missile",
      "group": ["Spells", "Unholy Armor"],
      "kind": "number",
      "range": {"min": 0, "max": 29},
      "note": "A missile number from 0 to 28; 29 is none.",
      "help": "Missile shown on the target.",
      "availability": {"1.3": 22, "1.33": 22, "1.5": 22, "2.00": 22, "2.02": 22}
    },
    {
      "name": "unholy_armor_sound",
      "label": "Unholy Armor sound",
      "group": ["Spells", "Unholy Armor"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "A spell sound from 0 (Bloodlust) to 16 (Whirlwind), to which the Spell sound base is added.",
      "help": "Spell sound.",
      "availability": {"1.3": 15, "1.33": 15, "1.5": 15, "2.00": 15, "2.02": 15}
    },
    {
      "name": "rune_missile",
      "label": "Runes missile",
      "group": ["Spells", "Runes"],
      "kind": "number",
      "range": {"min": 0, "max": 29},
      "note": "A missile number from 0 to 28; 29 is none.",
      "help": "Missile that shows a rune, where it is placed and again when it is redrawn just before it disappears.",
      "availability": {"1.3": 11, "1.33": 11, "1.5": 11, "2.00": 11, "2.02": 11}
    },
    {
      "name": "rune_explosion_missile",
      "label": "Runes explosion missile",
      "group": ["Spells", "Runes"],
      "kind": "number",
      "range": {"min": 0, "max": 29},
      "note": "A missile number from 0 to 28; 29 is none.",
      "help": "Missile shown when a rune is set off.",
      "availability": {"1.3": 23, "1.33": 23, "1.5": 23, "2.00": 23, "2.02": 23}
    },
    {
      "name": "rune_sound",
      "label": "Runes sound",
      "group": ["Spells", "Runes"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "A spell sound from 0 (Bloodlust) to 16 (Whirlwind), to which the Spell sound base is added.",
      "help": "Spell sound.",
      "availability": {"1.3": 14, "1.33": 14, "1.5": 14, "2.00": "not_applicable", "2.02": "not_applicable"}
    },
    {
      "name": "rune_sound_number",
      "label": "Runes sound number",
      "group": ["Spells", "Runes"],
      "kind": "number",
      "range": {"min": 0, "max": 350},
      "help": "Sound number: the entry in the sound list itself (349, Gamesfx\\misc\\Runes.wav), not a spell sound.",
      "availability": {"1.3": "not_applicable", "1.33": "not_applicable", "1.5": "not_applicable", "2.00": 349, "2.02": 349}
    },
    {
      "name": "death_and_decay_missile",
      "label": "Death and Decay missile",
      "group": ["Spells", "Death and Decay"],
      "kind": "number",
      "range": {"min": 0, "max": 29},
      "note": "A missile number from 0 to 28; 29 is none.",
      "help": "Missile dropped.",
      "availability": {"1.3": 6, "1.33": 6, "1.5": 6, "2.00": 6, "2.02": 6}
    },
    {
      "name": "death_and_decay_sound",
      "label": "Death and Decay sound",
      "group": ["Spells", "Death and Decay"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "A spell sound from 0 (Bloodlust) to 16 (Whirlwind), to which the Spell sound base is added.",
      "help": "Spell sound.",
      "availability": {"1.3": 1, "1.33": 1, "1.5": 1, "2.00": 1, "2.02": 1}
    },
    {
      "name": "area_damage_reach",
      "label": "Area damage reach",
      "group": ["Missiles", "Area damage"],
      "kind": "number",
      "range": {"min": 0, "max": 2147483647},
      "help": "Area damage reach. Area damage never hits the unit that fired the missile. For each other unit, the larger of its horizontal and vertical distance in pixels from where the missile lands is squared; if that is more than this value (more than 42 pixels), the unit is not hit.",
      "availability": {"1.3": 1791, "1.33": 1791, "1.5": 1791, "2.00": 1791, "2.02": 1791}
    },
    {
      "name": "area_damage_full_reach",
      "label": "Area damage full-damage reach",
      "group": ["Missiles", "Area damage"],
      "kind": "number",
      "range": {"min": 0, "max": 2147483647},
      "help": "Area damage full-damage reach (i.e. up to 22 pixels). A unit farther away than this, but within the area damage reach, takes a quarter of the damage.",
      "availability": {"1.3": 511, "1.33": 511, "1.5": 511, "2.00": 511, "2.02": 511}
    },
    {
      "name": "repair_hit_points",
      "label": "Hit points per repair step",
      "group": ["Game mechanics", "Workers"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Hit points a target gets on each Repair step.",
      "availability": {"1.3": 4, "1.33": 4, "1.5": 4, "2.00": 4, "2.02": 4}
    },
    {
      "name": "repair_payment_steps",
      "label": "Repair steps per payment",
      "group": ["Game mechanics", "Workers"],
      "kind": "number",
      "range": {"min": 1, "max": 127},
      "help": "Repair steps per payment: with 2, the player pays 1 gold and 1 lumber every second step.",
      "availability": {"1.3": 2, "1.33": 2, "1.5": 2, "2.00": 2, "2.02": 2}
    },
    {
      "name": "oil_per_trip_refinery",
      "label": "Oil per trip with a refinery",
      "group": ["Game mechanics", "Workers"],
      "kind": "number",
      "range": {"min": 0, "max": 2147483647},
      "help": "Oil delivered per trip when the player has a refinery.",
      "availability": {"1.3": 125, "1.33": 125, "1.5": 125, "2.00": "not_applicable", "2.02": "not_applicable"}
    },
    {
      "name": "oil_bonus_per_trip_refinery",
      "label": "Extra oil per trip with a refinery",
      "group": ["Game mechanics", "Workers"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Oil delivered per trip on top of the normal amount when the player has a refinery.",
      "availability": {"1.3": "not_applicable", "1.33": "not_applicable", "1.5": "not_applicable", "2.00": 25, "2.02": 25}
    },
    {
      "name": "oil_per_trip",
      "label": "Oil per trip",
      "group": ["Game mechanics", "Workers"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Oil delivered per trip.",
      "availability": {"1.3": 100, "1.33": 100, "1.5": 100, "2.00": 100, "2.02": 100}
    },
    {
      "name": "gold_per_trip_castle",
      "label": "Gold per trip with a castle",
      "group": ["Game mechanics", "Workers"],
      "kind": "number",
      "range": {"min": 0, "max": 2147483647},
      "help": "Gold delivered per trip when the player has a castle or fortress. This is the full amount in every version.",
      "availability": {"1.3": 120, "1.33": 120, "1.5": 120, "2.00": 120, "2.02": 120}
    },
    {
      "name": "gold_per_trip_keep",
      "label": "Gold per trip with a keep",
      "group": ["Game mechanics", "Workers"],
      "kind": "number",
      "range": {"min": 0, "max": 2147483647},
      "help": "Gold delivered per trip when the player has a keep or stronghold.",
      "availability": {"1.3": 110, "1.33": 110, "1.5": 110, "2.00": "not_applicable", "2.02": "not_applicable"}
    },
    {
      "name": "gold_bonus_per_trip_keep",
      "label": "Extra gold per trip with a keep",
      "group": ["Game mechanics", "Workers"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Gold delivered per trip on top of the normal amount when the player has a keep or stronghold.",
      "availability": {"1.3": "not_applicable", "1.33": "not_applicable", "1.5": "not_applicable", "2.00": 10, "2.02": 10}
    },
    {
      "name": "gold_per_trip",
      "label": "Gold per trip",
      "group": ["Game mechanics", "Workers"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Gold delivered per trip.",
      "availability": {"1.3": 100, "1.33": 100, "1.5": 100, "2.00": 100, "2.02": 100}
    },
    {
      "name": "lumber_per_trip_mill",
      "label": "Lumber per trip with a lumber mill",
      "group": ["Game mechanics", "Workers"],
      "kind": "number",
      "range": {"min": 0, "max": 2147483647},
      "help": "Lumber delivered per trip when the player has a lumber mill.",
      "availability": {"1.3": 125, "1.33": 125, "1.5": 125, "2.00": "not_applicable", "2.02": "not_applicable"}
    },
    {
      "name": "lumber_bonus_per_trip_mill",
      "label": "Extra lumber per trip with a lumber mill",
      "group": ["Game mechanics", "Workers"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Lumber delivered per trip on top of the normal amount when the player has a lumber mill.",
      "availability": {"1.3": "not_applicable", "1.33": "not_applicable", "1.5": "not_applicable", "2.00": 25, "2.02": 25}
    },
    {
      "name": "lumber_per_trip",
      "label": "Lumber per trip",
      "group": ["Game mechanics", "Workers"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Lumber delivered per trip.",
      "availability": {"1.3": 100, "1.33": 100, "1.5": 100, "2.00": 100, "2.02": 100}
    },
    {
      "name": "worker_inside_cycles",
      "label": "Time a worker stays inside",
      "group": ["Game mechanics", "Workers"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "note": "Counted in game cycles, whose length depends on the game speed.",
      "help": "Game cycles a worker stays inside a gold mine, an oil platform or a building it delivers goods to. Also set when a peasant or peon goes into a building it constructs.",
      "availability": {"1.3": 150, "1.33": 150, "1.5": 150, "2.00": 150, "2.02": 150}
    },
    {
      "name": "mana_cycles",
      "label": "Game cycles between mana points",
      "group": ["Game mechanics", "Timers"],
      "kind": "number",
      "range": {"min": 1, "max": 255},
      "note": "Counted in game cycles, whose length depends on the game speed.",
      "help": "Game cycles between mana points. A unit with Unit Flags bit 17 (Spellcaster) in the UDTA (in the default UDTA, the spellcasters: Mages, Death Knights, Paladins, Ogre-Mages and their heroes) gains 1 mana every 40 game cycles, up to 255.",
      "availability": {"1.3": 40, "1.33": 40, "1.5": 40, "2.00": 40, "2.02": 40}
    },
    {
      "name": "berserker_regeneration_cycles",
      "label": "Game cycles between Berserker regeneration",
      "group": ["Game mechanics", "Timers"],
      "kind": "number",
      "range": {"min": 1, "max": 255},
      "note": "Counted in game cycles, whose length depends on the game speed.",
      "help": "Game cycles between hit points for Berserkers. A Berserker (unit 19) of a player who has researched Regeneration gains 1 hit point every 240 game cycles, up to its maximum. The count is kept in the unit's mana byte.",
      "availability": {"1.3": 240, "1.33": 240, "1.5": 240, "2.00": 240, "2.02": 240}
    },
    {
      "name": "decay_hit_points",
      "label": "Hit points lost by decaying units",
      "group": ["Game mechanics", "Decay"],
      "kind": "number",
      "range": {"min": 0, "max": 127},
      "help": "Hit points a decaying unit loses each time its decay counter runs out and it has no mana left.",
      "availability": {"1.3": 5, "1.33": 5, "1.5": 5, "2.00": 5, "2.02": 5}
    },
    {
      "name": "demolition_unit_1",
      "label": "Dies when invisible: first unit",
      "group": ["Game mechanics", "Explosions"],
      "kind": "number",
      "range": {"min": 0, "max": 109},
      "refers": "unit",
      "help": "A unit type that dies at once while it is invisible or has Unholy Armor: the Dwarven Demolition Squad.",
      "availability": {"1.3": 14, "1.33": 14, "1.5": 14, "2.00": 14, "2.02": 14}
    },
    {
      "name": "demolition_unit_2",
      "label": "Dies when invisible: second unit",
      "group": ["Game mechanics", "Explosions"],
      "kind": "number",
      "range": {"min": 0, "max": 109},
      "refers": "unit",
      "help": "A unit type that dies at once while it is invisible or has Unholy Armor: the Goblin Sappers.",
      "availability": {"1.3": 15, "1.33": 15, "1.5": 15, "2.00": 15, "2.02": 15}
    },
    {
      "name": "demolition_damage",
      "label": "Demolition damage",
      "group": ["Game mechanics", "Explosions"],
      "kind": "number",
      "range": {"min": 0, "max": 2147483647},
      "help": "Damage of the explosion of a Dwarven Demolition Squad or Goblin Sapper, to each unit on the 8 squares around it (each unit once, also big ones). Armour is ignored. Air units are not hit: they are kept on a separate map grid, and only the grid for land and sea units is checked.",
      "availability": {"1.3": 200, "1.33": 200, "1.5": 200, "2.00": 200, "2.02": 200}
    },
    {
      "name": "demolition_second_damage",
      "label": "Demolition second hit",
      "group": ["Game mechanics", "Explosions"],
      "kind": "number",
      "range": {"min": 0, "max": 2147483647},
      "help": "Second hit of the same explosion: if a unit is still on the square after the first hit, it is hit again.",
      "availability": {"1.3": 200, "1.33": 200, "1.5": 200, "2.00": 200, "2.02": 200}
    },
    {
      "name": "critter_explode_clicks",
      "label": "Clicks before a critter explodes",
      "group": ["Game mechanics", "Critters"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Clicks in a row on a critter before it explodes. In a multiplayer game the critter does not explode; its sound is played instead.",
      "availability": {"1.3": 10, "1.33": 10, "1.5": 10, "2.00": 10, "2.02": 10}
    },
    {
      "name": "farm_food",
      "label": "Food per farm",
      "group": ["Game mechanics", "Food"],
      "kind": "option",
      "options": [
        {"name": "food_1", "label": "1 food"},
        {"name": "food_2", "label": "2 food"},
        {"name": "food_4", "label": "4 food"},
        {"name": "food_8", "label": "8 food"}
      ],
      "note": "1.3, 1.33 and 1.5 store a power of 2 and 2.00 and 2.02 one of four instruction bytes, so only these four amounts are offered on every version.",
      "help": "Food from a farm: 1, 2, 4 or 8.",
      "availability": {"1.3": "food_4", "1.33": "food_4", "1.5": "food_4", "2.00": "food_4", "2.02": "food_4"}
    },
    {
      "name": "dark_portal_unit",
      "label": "Dark Portal: unit",
      "group": ["Built-in levels", "Dark Portal"],
      "kind": "number",
      "range": {"min": 0, "max": 109},
      "refers": "unit",
      "help": "The Dark Portal. In the built-in levels 1450, 1452 and 1468 (the expansion's human levels 3, 4 and 12), only Khadgar can damage it. Not checked in custom scenarios or multiplayer games (the game keeps a flag for each; both are checked).",
      "availability": {"1.3": 101, "1.33": 101, "1.5": 101, "2.00": 101, "2.02": 101}
    },
    {
      "name": "dark_portal_attacker",
      "label": "Dark Portal: attacker",
      "group": ["Built-in levels", "Dark Portal"],
      "kind": "number",
      "range": {"min": 0, "max": 109},
      "refers": "unit",
      "help": "The unit that can damage the Dark Portal in those levels.",
      "availability": {"1.3": 24, "1.33": 24, "1.5": 24, "2.00": 24, "2.02": 24}
    },
    {
      "name": "dark_portal_level_1",
      "label": "Dark Portal: first level",
      "group": ["Built-in levels", "Dark Portal"],
      "kind": "number",
      "range": {"min": 0, "max": 45535},
      "note": "Give the level number. 2.00 and 2.02 store it plus 20000 (21450), and the patcher converts it.",
      "help": "The first level where only Khadgar can damage the Dark Portal: 1450, the expansion's human level 3.",
      "availability": {"1.3": 1450, "1.33": 1450, "1.5": 1450, "2.00": 1450, "2.02": 1450}
    },
    {
      "name": "dark_portal_level_2",
      "label": "Dark Portal: second level",
      "group": ["Built-in levels", "Dark Portal"],
      "kind": "number",
      "range": {"min": 0, "max": 45535},
      "note": "Give the level number. 2.00 and 2.02 store it plus 20000 (21452), and the patcher converts it.",
      "help": "The second such level: 1452, the expansion's human level 4.",
      "availability": {"1.3": 1452, "1.33": 1452, "1.5": 1452, "2.00": 1452, "2.02": 1452}
    },
    {
      "name": "dark_portal_level_3",
      "label": "Dark Portal: third level",
      "group": ["Built-in levels", "Dark Portal"],
      "kind": "number",
      "range": {"min": 0, "max": 45535},
      "note": "Give the level number. 2.00 and 2.02 store it plus 20000 (21468), and the patcher converts it.",
      "help": "The third such level: 1468, the expansion's human level 12.",
      "availability": {"1.3": 1468, "1.33": 1468, "1.5": 1468, "2.00": 1468, "2.02": 1468}
    },
    {
      "name": "check_interval",
      "label": "Time between victory checks",
      "group": ["Victory conditions", "Checks"],
      "kind": "number",
      "range": {"min": 0, "max": 65535},
      "note": "Counted in game cycles, whose length depends on the game speed.",
      "help": "The countdown set after each victory check. The check runs every (this value + 1) game cycles.",
      "availability": {"1.3": 200, "1.33": 200, "1.5": 200, "2.00": 200, "2.02": 200}
    },
    {
      "name": "check_first_countdown",
      "label": "Time before the first victory check",
      "group": ["Victory conditions", "Checks"],
      "kind": "number",
      "range": {"min": 0, "max": 65535},
      "note": "Counted in game cycles, whose length depends on the game speed.",
      "help": "The countdown set when a level starts. The first victory check runs after (this value + 1) game cycles. In 1.3, 1.33 and 1.5 only the low word is stored, so the value can be at most 65535.",
      "availability": {"1.3": 1, "1.33": 1, "1.5": 1, "2.00": 1, "2.02": 1}
    },
    {
      "name": "demo_check_countdown",
      "label": "Length of the title screen demo",
      "group": ["Victory conditions", "Checks"],
      "kind": "number",
      "range": {"min": 0, "max": 65535},
      "note": "Counted in game cycles, whose length depends on the game speed.",
      "help": "The countdown for the attract-mode demo, the game that plays by itself at the title screen. It goes back to the main menu after (this value + 1) game cycles. In 1.3, 1.33 and 1.5 only the low word is stored, so the value can be at most 65535.",
      "availability": {"1.3": 1400, "1.33": 1400, "1.5": 1400, "2.00": 1400, "2.02": 1400}
    },
    {
      "name": "standard_check_gold",
      "label": "Standard check: gold",
      "group": ["Victory conditions", "Values in the checks"],
      "kind": "number",
      "range": {"min": 0, "max": 2147483647},
      "help": "Gold below which a player without units loses, in the standard check.",
      "availability": {"1.3": 400, "1.33": 400, "1.5": 400, "2.00": 400, "2.02": 400}
    },
    {
      "name": "vicond_00_farms",
      "label": "Human 1 and Orc 1: farms",
      "group": ["Victory conditions", "Values in the checks"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Complete farms the player needs, with a barracks, to win in vicond 0x00 (Human 1 and Orc 1).",
      "availability": {"1.3": 4, "1.33": 4, "1.5": 4, "2.00": 4, "2.02": 4}
    },
    {
      "name": "vicond_01_oil_platforms",
      "label": "Human 3 and Orc 3: oil platforms",
      "group": ["Victory conditions", "Values in the checks"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Complete oil platforms the player needs to win in vicond 0x01 (Human 3 and Orc 3).",
      "availability": {"1.3": 4, "1.33": 4, "1.5": 4, "2.00": 4, "2.02": 4}
    },
    {
      "name": "vicond_0f_shipyards",
      "label": "Orc 7x: shipyards",
      "group": ["Victory conditions", "Values in the checks"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Complete shipyards the player needs to win in vicond 0x0F (Orc 7x).",
      "availability": {"1.3": 5, "1.33": 5, "1.5": 5, "2.00": 5, "2.02": 5}
    },
    {
      "name": "vicond_18_shipyards",
      "label": "Human 5x: shipyards",
      "group": ["Victory conditions", "Values in the checks"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "Complete shipyards the player needs to win in vicond 0x18 (Human 5x).",
      "availability": {"1.3": 3, "1.33": 3, "1.5": 3, "2.00": 3, "2.02": 3}
    },
    {
      "name": "vicond_1b_runestone_hit_points",
      "label": "Human 9x: Runestone hit points",
      "group": ["Victory conditions", "Values in the checks"],
      "kind": "number",
      "range": {"min": 0, "max": 65535},
      "help": "Hit points given to Runestones when vicond 0x1B (Human 9x) starts. In 2.00 and 2.02 only the low word is stored, so the value can be at most 65535.",
      "availability": {"1.3": 400, "1.33": 400, "1.5": 400, "2.00": 400, "2.02": 400}
    },
    {
      "name": "vicond_1c_gold",
      "label": "Human 10x: gold",
      "group": ["Victory conditions", "Values in the checks"],
      "kind": "number",
      "range": {"min": 0, "max": 2147483647},
      "help": "Gold below which the other players must be to win in vicond 0x1C (Human 10x).",
      "availability": {"1.3": 400, "1.33": 400, "1.5": 400, "2.00": 400, "2.02": 400}
    },
    {
      "name": "circle_area_vicond",
      "label": "Level that finds the Circle of Power",
      "group": ["Victory conditions", "Values in the checks"],
      "kind": "number",
      "range": {"min": 0, "max": 255},
      "help": "The vicond for which loading a map stores the area of the Circle of Power (CircleArea), which that level's check uses: 0x0A, Orc 9.",
      "availability": {"1.3": 10, "1.33": 10, "1.5": 10, "2.00": 10, "2.02": 10}
    },
    {
      "name": "food_usage_label",
      "label": "Food Usage heading",
      "group": ["Interface", "Food stats"],
      "kind": "number",
      "range": {"min": 0, "max": 65535},
      "help": "String number of \"Food Usage\", the heading of a farm's food stats.",
      "availability": {"1.3": 419, "1.33": 419, "1.5": 419, "2.00": 419, "2.02": 419}
    },
    {
      "name": "food_used_label",
      "label": "Food used label",
      "group": ["Interface", "Food stats"],
      "kind": "number",
      "range": {"min": 0, "max": 65535},
      "help": "String number of \"Used:\", before the food used.",
      "availability": {"1.3": 421, "1.33": 421, "1.5": 421, "2.00": 421, "2.02": 421}
    },
    {
      "name": "food_grown_label",
      "label": "Food grown label",
      "group": ["Interface", "Food stats"],
      "kind": "number",
      "range": {"min": 0, "max": 65535},
      "help": "String number of \"Grown:\", before the food grown.",
      "availability": {"1.3": 420, "1.33": 420, "1.5": 420, "2.00": 420, "2.02": 420}
    }
  ],
  "assets": {
    "archives": ["war2patch.mpq", "war2dat.mpq"],
    "icons": {
      "file": "Art\\unit\\Portrait\\portrait.grp",
      "palette": {"file": "Art\\bgs\\Forest\\forest.ppl", "format": "ppl"}
    },
    "strings": {"file": "rez\\stat_txt.tbl"}
  }
});
