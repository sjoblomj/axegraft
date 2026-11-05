AxeGraft.registerModFixture({
  "scenario": "No duplicates within a mod",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "constants": [
      {
        "name": "max_supply",
        "value": 1
      },
      {
        "name": "max_supply",
        "value": 2
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "constants[1]"
    ],
    "warnings": []
  }
});
