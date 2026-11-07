AxeGraft.registerModFixture({
  "scenario": "Unit entries: Unit data fields in a StarCraft mod",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 0,
        "stats_frame": 1,
        "name_string": 2
      }
    ]
  },
  "expect": {
    "refused": true,
    "errors": [
      "units[0].name_string",
      "units[0].stats_frame"
    ],
    "warnings": []
  }
});
