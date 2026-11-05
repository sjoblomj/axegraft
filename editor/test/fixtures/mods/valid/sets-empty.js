AxeGraft.registerModFixture({
  "scenario": "Button set entries: Empty set",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "button_sets": [
      {
        "id": 7,
        "buttons": []
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
