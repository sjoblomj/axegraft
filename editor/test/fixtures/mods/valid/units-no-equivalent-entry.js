AxeGraft.registerModFixture({
  "scenario": "Unit entry fields: No equivalent entry",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 0,
        "equivalent_entry": null
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
