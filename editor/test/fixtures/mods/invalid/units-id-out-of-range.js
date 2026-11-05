AxeGraft.registerModFixture({
  "scenario": "Unit entries: Unit ID out of range",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 250,
        "button_set": 0
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "units[0].id"
    ],
    "warnings": []
  }
});
