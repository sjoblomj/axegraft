AxeGraft.registerModFixture({
  "scenario": "Unit entry fields: Connected unit out of range",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 0,
        "connected_unit": 1000
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "units[0].connected_unit"
    ],
    "warnings": []
  }
});
