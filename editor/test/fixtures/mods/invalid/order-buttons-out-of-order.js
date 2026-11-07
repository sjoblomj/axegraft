AxeGraft.registerModFixture({
  "scenario": "Button order: Buttons out of order",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "button_sets": [
      {
        "id": 0,
        "buttons": [
          {
            "position": 5,
            "icon": 83,
            "condition": "w2_always",
            "action": "w2_move",
            "string": 400,
            "highlighted": 0
          },
          {
            "position": 3,
            "icon": 84,
            "condition": "w2_always",
            "action": "w2_move",
            "string": 400,
            "highlighted": 0
          }
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "button_sets[0].buttons[1].position"
    ],
    "warnings": []
  }
});
