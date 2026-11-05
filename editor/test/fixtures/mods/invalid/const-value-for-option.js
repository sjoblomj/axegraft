AxeGraft.registerModFixture({
  "scenario": "Constant entries",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "constants": [
      {
        "name": "cloak_energy",
        "value": 1
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
