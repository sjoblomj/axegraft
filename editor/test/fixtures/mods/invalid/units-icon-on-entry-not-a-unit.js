AxeGraft.registerModFixture({
  "scenario": "Unit entries: Unit icon on an entry that isn't a unit",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "units": [
      {
        "id": 111,
        "icon": 5
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "units[0].icon"
    ],
    "warnings": []
  }
});
