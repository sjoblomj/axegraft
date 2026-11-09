AxeGraft.registerModFixture({
  "scenario": "Button set numbering: Button card used as a set ID",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "button_sets": [
      {
        "id": 32,
        "buttons": []
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "button_sets[0].id"
    ],
    "warnings": [],
    "messages": [
      "entry 32 uses set 0"
    ]
  }
});
