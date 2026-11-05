AxeGraft.registerModFixture({
  "scenario": "Unit entries: Status function on an entry that isn't a unit",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 238,
        "status_update": "statdraw_draw_unit"
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "units[0].status_update"
    ],
    "warnings": [],
    "messages": [
      "isn't a unit"
    ]
  }
});
