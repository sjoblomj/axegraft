AxeGraft.registerModFixture({
  "scenario": "Unit entries: Status unit type out of range",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 0,
        "status_unit_type": 228
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "units[0].status_unit_type"
    ],
    "warnings": []
  }
});
