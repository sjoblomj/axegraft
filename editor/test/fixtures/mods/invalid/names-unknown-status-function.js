AxeGraft.registerModFixture({
  "scenario": "Identifying game content and engine behaviour: Unknown behaviour name",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 0,
        "status_update": "statdraw_draw_mystery"
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
      "statdraw_draw_mystery"
    ]
  }
});
