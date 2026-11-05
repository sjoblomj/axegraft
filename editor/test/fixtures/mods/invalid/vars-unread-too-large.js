AxeGraft.registerModFixture({
  "scenario": "Typed function variables: Unread variable too large for its field",
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
            "condition": "bf_always",
            "action": "order_move",
            "enabled_string": 664,
            "disabled_string": 0,
            "action_variable": 65536
          }
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "button_sets[0].buttons[0].action_variable"
    ],
    "warnings": []
  }
});
