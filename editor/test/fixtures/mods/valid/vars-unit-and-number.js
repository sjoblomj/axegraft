AxeGraft.registerModFixture({
  "scenario": "Typed function variables",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "button_sets": [
      {
        "id": 0,
        "buttons": [
          {
            "position": 1,
            "icon": 228,
            "condition": "bf_building_ok",
            "action": "order_stop_build",
            "enabled_string": 664,
            "disabled_string": 0,
            "condition_variable": 227,
            "action_variable": 65535
          }
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
