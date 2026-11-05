AxeGraft.registerModFixture({
  "scenario": "Unit entries: Status unit type in a Warcraft II mod",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "units": [
      {
        "id": 0,
        "status_unit_type": 0
      }
    ]
  },
  "expect": {
    "refused": true,
    "errors": [
      "units[0].status_unit_type"
    ],
    "warnings": []
  }
});
