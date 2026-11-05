AxeGraft.registerModFixture({
  "scenario": "Strict fields: Unknown field",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 0,
        "button_set": 5,
        "buttonset": 5
      }
    ]
  },
  "expect": {
    "refused": true,
    "errors": [
      "units[0].buttonset"
    ],
    "warnings": [],
    "messages": [
      "buttonset"
    ]
  }
});
