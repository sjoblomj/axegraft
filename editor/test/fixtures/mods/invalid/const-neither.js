AxeGraft.registerModFixture({
  "scenario": "Constant entries",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "constants": [
      {
        "name": "max_supply"
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
