AxeGraft.registerModFixture({
  "scenario": "Button order: StarCraft buttons out of order",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "button_sets": [
      {
        "id": 0,
        "buttons": [
          {
            "position": 5,
            "icon": 228,
            "condition": "always",
            "action": "move",
            "enabled_string": 664,
            "disabled_string": 0
          },
          {
            "position": 3,
            "icon": 228,
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
      "button_sets[0].buttons[1].position"
    ],
    "warnings": []
  }
});
