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
            "condition": "can_create_or_morph",
            "action": "cancel_train",
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
