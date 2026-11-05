AxeGraft.registerModFixture({
  "scenario": "Constant entries",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "constants": [
      {
        "name": "max_supply",
        "value": 1.5
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "constants[0].value"
    ],
    "warnings": []
  }
});
