AxeGraft.registerModFixture({
  "scenario": "Typed function variables: Missing variable",
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
            "condition": "bf_upgrade",
            "action": "order_move",
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
      "button_sets[0].buttons[0].condition_variable"
    ],
    "warnings": []
  }
});
