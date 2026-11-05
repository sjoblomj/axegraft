AxeGraft.registerModFixture({
  "scenario": "Button set numbering: Set shared by several entries",
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
            "disabled_string": 0
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
