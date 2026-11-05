AxeGraft.registerModFixture({
  "scenario": "Refusing malformed files: File with an unknown property",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 300,
        "button_set": 5
      },
      {
        "id": 0,
        "colour": "red",
        "button_set": 5
      }
    ]
  },
  "expect": {
    "refused": true,
    "errors": [
      "units[0].id",
      "units[1].colour"
    ],
    "warnings": []
  }
});
