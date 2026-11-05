AxeGraft.registerModFixture({
  "scenario": "Refusing malformed files: Part with the wrong shape",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "button_sets": [
      {
        "id": 7
      }
    ]
  },
  "expect": {
    "refused": true,
    "errors": [
      "button_sets[0]"
    ],
    "warnings": []
  }
});
