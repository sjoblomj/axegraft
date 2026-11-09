AxeGraft.registerModFixture({
  "scenario": "Unit entry fields: Status function of the wrong kind",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 0,
        "status_changed": "draw_unit",
        "display_function": "changed_unit"
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "units[0].display_function",
      "units[0].status_changed"
    ],
    "warnings": []
  }
});
