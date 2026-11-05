AxeGraft.registerModFixture({
  "scenario": "Constant entries: Unknown option",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "constants": [
      {
        "name": "cloak_energy",
        "option": "sometimes"
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "constants[0].option"
    ],
    "warnings": []
  }
});
