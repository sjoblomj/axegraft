AxeGraft.registerModFixture({
  "scenario": "Strict fields: Unknown field",
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
            "condition": "always",
            "action": "move",
            "enabled_string": 664,
            "disabled_string": 0,
            "hotkey": 77
          }
        ]
      }
    ]
  },
  "expect": {
    "refused": true,
    "errors": [
      "button_sets[0].buttons[0].hotkey"
    ],
    "warnings": []
  }
});
