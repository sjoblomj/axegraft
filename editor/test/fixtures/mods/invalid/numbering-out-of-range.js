AxeGraft.registerModFixture({
  "scenario": "Button set numbering: Set ID out of range",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "button_sets": [
      {
        "id": 1000,
        "buttons": []
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "button_sets[0].id"
    ],
    "warnings": []
  }
});
