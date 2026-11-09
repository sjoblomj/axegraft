AxeGraft.registerModFixture({
  "scenario": "Unit entries: Status function on an entry that isn't a unit",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 238,
        "display_function": "draw_unit"
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
      "isn't a unit"
    ]
  }
});
