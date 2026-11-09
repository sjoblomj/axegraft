AxeGraft.registerModFixture({
  "scenario": "Unit entry fields: Debug ID out of range",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 0,
        "debug_id": 228
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "units[0].debug_id"
    ],
    "warnings": []
  }
});
