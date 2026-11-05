AxeGraft.registerModFixture({
  "scenario": "Button fields: Position out of range",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "button_sets": [
      {
        "id": 0,
        "buttons": [
          {
            "position": 9,
            "icon": 83,
            "condition": "w2_always",
            "action": "w2_move",
            "string": 400,
            "highlighted": 2
          }
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "button_sets[0].buttons[0].position"
    ],
    "warnings": []
  }
});
