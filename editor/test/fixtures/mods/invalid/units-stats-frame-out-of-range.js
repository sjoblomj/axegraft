AxeGraft.registerModFixture({
  "scenario": "Unit entry fields: Stats panel frame out of range",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "units": [
      {
        "id": 0,
        "stats_frame": 4
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "units[0].stats_frame"
    ],
    "warnings": []
  }
});
