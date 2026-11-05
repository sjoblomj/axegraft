AxeGraft.registerModFixture({
  "scenario": "Constant entries: Numeric constant in range",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "constants": [
      {
        "name": "max_supply",
        "value": 0
      },
      {
        "name": "web_duration",
        "value": 65535
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
