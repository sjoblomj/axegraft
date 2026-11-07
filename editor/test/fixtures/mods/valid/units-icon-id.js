AxeGraft.registerModFixture({
  "scenario": "Unit entry fields: Unit icon ID",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "units": [
      {
        "id": 0,
        "icon": 65535
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
