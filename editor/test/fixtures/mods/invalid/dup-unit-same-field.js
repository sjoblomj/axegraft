AxeGraft.registerModFixture({
  "scenario": "No duplicates within a mod",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 5,
        "button_set": 0
      },
      {
        "id": 5,
        "button_set": 7
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "units[1].button_set"
    ],
    "warnings": []
  }
});
