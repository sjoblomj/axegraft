AxeGraft.registerModFixture({
  "scenario": "Button fields: Another game's string fields",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "button_sets": [
      {
        "id": 0,
        "buttons": [
          {
            "position": 0,
            "icon": 83,
            "condition": "w2_always",
            "action": "w2_move",
            "string": 400,
            "highlighted": 2,
            "enabled_string": 1
          }
        ]
      }
    ]
  },
  "expect": {
    "refused": true,
    "errors": [
      "button_sets[0].buttons[0].enabled_string"
    ],
    "warnings": []
  }
});
