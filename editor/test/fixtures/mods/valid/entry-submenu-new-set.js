AxeGraft.registerModFixture({
  "scenario": "Opening a button card: Submenu with a new set",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "button_sets": [
      {
        "id": 250,
        "buttons": [
          {
            "position": 1,
            "icon": 228,
            "condition": "always",
            "action": "move",
            "enabled_string": 664,
            "disabled_string": 0
          }
        ]
      },
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
            "action_variable": 228
          }
        ]
      }
    ],
    "units": [
      {
        "id": 228,
        "button_set": 250
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
