AxeGraft.registerModFixture({
  "scenario": "Button fields: Condition and action with their variables",
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
            "condition": "can_research_tech",
            "action": "upgrade",
            "enabled_string": 664,
            "disabled_string": 0,
            "condition_variable": 5,
            "action_variable": 3
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
