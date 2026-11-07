AxeGraft.registerModFixture({
  "scenario": "Editor labels: Labels are ignored",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "labels": {
      "units": {
        "0": "Rifleman",
        "33": "Unnamed entry"
      }
    },
    "units": [
      {
        "id": 0,
        "label": "Rifleman",
        "button_set": 5
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
