AxeGraft.registerModFixture({
  "scenario": "Mod parts: Only some parts present",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "constants": [
      {
        "name": "max_supply",
        "value": 600
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
