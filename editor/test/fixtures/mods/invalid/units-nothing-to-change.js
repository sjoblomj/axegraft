AxeGraft.registerModFixture({
  "scenario": "Unit entries: Entry with nothing to change",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 0
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "units[0]"
    ],
    "warnings": []
  }
});
