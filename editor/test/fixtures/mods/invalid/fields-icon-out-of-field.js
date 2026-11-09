AxeGraft.registerModFixture({
  "scenario": "Button fields: Icon and string IDs",
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
            "icon": 65536,
            "condition": "always",
            "action": "move",
            "enabled_string": 664,
            "disabled_string": 0
          }
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "button_sets[0].buttons[0].icon"
    ],
    "warnings": []
  }
});
