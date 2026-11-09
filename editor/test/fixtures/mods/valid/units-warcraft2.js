AxeGraft.registerModFixture({
  "scenario": "Unit entries",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "units": [
      {
        "id": 0,
        "button_set": 2
      },
      {
        "id": 2,
        "display_function": "w2_stats_update_unit"
      },
      {
        "id": 111,
        "button_set": null
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
