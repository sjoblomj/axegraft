AxeGraft.registerModFixture({
  "scenario": "Constant entries",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "constants": [
      {
        "name": "max_supply",
        "value": 1,
        "option": "regain"
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "constants[0]"
    ],
    "warnings": []
  }
});
