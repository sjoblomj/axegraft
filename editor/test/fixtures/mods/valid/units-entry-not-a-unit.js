AxeGraft.registerModFixture({
  "scenario": "Unit entries: Table entry that isn't a unit",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 238,
        "button_set": 5
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
