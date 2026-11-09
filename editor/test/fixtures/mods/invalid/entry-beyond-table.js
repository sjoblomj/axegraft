AxeGraft.registerModFixture({
  "scenario": "Opening a button card: Entry beyond the table",
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
            "action": "show_button_card",
            "enabled_string": 664,
            "disabled_string": 0,
            "action_variable": 250
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
