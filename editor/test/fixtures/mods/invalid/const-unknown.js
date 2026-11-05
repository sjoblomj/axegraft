AxeGraft.registerModFixture({
  "scenario": "Constant entries: Unknown constant",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "constants": [
      {
        "name": "max_supplies",
        "value": 1
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "constants[0].name"
    ],
    "warnings": [],
    "messages": [
      "max_supplies"
    ]
  }
});
