AxeGraft.registerModFixture({
  "scenario": "Unit entry fields: Unit name string ID",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "units": [
      {
        "id": 0,
        "name_string": 65535
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
