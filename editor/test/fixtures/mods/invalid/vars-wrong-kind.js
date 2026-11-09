AxeGraft.registerModFixture({
  "scenario": "Typed function variables: Variable of the wrong kind",
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
            "action": "research_tech",
            "enabled_string": 664,
            "disabled_string": 0,
            "action_variable": 44
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
