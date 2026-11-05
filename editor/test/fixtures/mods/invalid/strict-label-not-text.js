AxeGraft.registerModFixture({
  "scenario": "Strict fields: Label is ignored",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 0,
        "label": 5,
        "button_set": 5
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "units[0].label"
    ],
    "warnings": []
  }
});
