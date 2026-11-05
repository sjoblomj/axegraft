AxeGraft.registerModFixture({
  "scenario": "Constant entries",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "constants": [
      {
        "name": "cloak_energy",
        "option": "regain"
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
