AxeGraft.registerModFixture({
  "scenario": "Unit entry fields: Equivalent entry out of range",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 0,
        "equivalent_entry": 1000
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "units[0].equivalent_entry"
    ],
    "warnings": []
  }
});
