AxeGraft.registerModFixture({
  "scenario": "Unit entry fields: Status function of the wrong kind",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 0,
        "status_changed": "statdraw_draw_unit",
        "status_update": "statdraw_query_unit"
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "units[0].status_changed",
      "units[0].status_update"
    ],
    "warnings": []
  }
});
