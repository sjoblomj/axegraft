AxeGraft.registerModFixture({
  "scenario": "Button set entries: Replace a set",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "button_sets": [
      {
        "id": 7,
        "buttons": [
          {
            "position": 1,
            "icon": 228,
            "condition": "always",
            "action": "move",
            "enabled_string": 664,
            "disabled_string": 0
          },
          {
            "position": 2,
            "icon": 229,
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
    "errors": [],
    "warnings": []
  }
});
