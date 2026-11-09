AxeGraft.registerModFixture({
  "scenario": "Identifying game content and engine behaviour: Number used for a function",
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
            "condition": 3,
            "action": "move",
            "enabled_string": 664,
            "disabled_string": 0
          }
        ]
      }
    ],
    "units": [
      {
        "id": 0,
        "status_changed": 2
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "button_sets[0].buttons[0].condition",
      "units[0].status_changed"
    ],
    "warnings": []
  }
});
