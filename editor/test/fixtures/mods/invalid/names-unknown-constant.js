AxeGraft.registerModFixture({
  "scenario": "Identifying game content and engine behaviour: Unknown behaviour name",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "constants": [
      {
        "name": "gravity",
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
      "gravity"
    ]
  }
});
