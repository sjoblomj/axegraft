AxeGraft.registerModFixture({
  "scenario": "Refusing malformed files: Part with the wrong shape",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "button_sets": [
      {
        "id": 7,
        "buttons": [
          1,
          2
        ]
      }
    ]
  },
  "expect": {
    "refused": true,
    "errors": [
      "button_sets[0].buttons[0]",
      "button_sets[0].buttons[1]"
    ],
    "warnings": []
  }
});
