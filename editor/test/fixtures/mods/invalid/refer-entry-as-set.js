AxeGraft.registerModFixture({
  "scenario": "Referring to button sets: Button card named as a set",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 0,
        "button_set": 32
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "units[0].button_set"
    ],
    "warnings": [],
    "messages": [
      "entry 32 uses set 0"
    ]
  }
});
