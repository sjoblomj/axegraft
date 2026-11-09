AxeGraft.registerModFixture({
  "scenario": "Identifying game content and engine behaviour: Unknown behaviour name",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 0,
        "display_function": "statdraw_draw_mystery"
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "units[0].display_function"
    ],
    "warnings": [],
    "messages": [
      "statdraw_draw_mystery"
    ]
  }
});
