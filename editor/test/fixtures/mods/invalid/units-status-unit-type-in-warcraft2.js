AxeGraft.registerModFixture({
  "scenario": "Unit entries: Debug ID in a Warcraft II mod",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "units": [
      {
        "id": 0,
        "debug_id": 0
      }
    ]
  },
  "expect": {
    "refused": true,
    "errors": [
      "units[0].debug_id"
    ],
    "warnings": []
  }
});
