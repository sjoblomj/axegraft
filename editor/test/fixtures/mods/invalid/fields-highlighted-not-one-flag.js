AxeGraft.registerModFixture({
  "scenario": "Button fields: Highlighted value that isn't one flag",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "button_sets": [
      {
        "id": 2,
        "buttons": [
          {
            "position": 0,
            "icon": 83,
            "condition": "w2_always",
            "action": "w2_move",
            "string": 400,
            "highlighted": 3
          }
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "button_sets[0].buttons[0].highlighted"
    ],
    "warnings": []
  }
});
