AxeGraft.registerModFixture({
  "scenario": "No duplicates within a mod: Same unit twice with different fields",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 5,
        "button_set": 0
      },
      {
        "id": 5,
        "status_update": "statdraw_draw_none"
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
