AxeGraft.registerModFixture({
  "scenario": "Referring to button sets: New set the mod doesn't define",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 0,
        "button_set": 250
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "units[0].button_set"
    ],
    "warnings": []
  }
});
