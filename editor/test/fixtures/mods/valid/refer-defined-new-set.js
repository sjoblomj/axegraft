AxeGraft.registerModFixture({
  "scenario": "Referring to button sets",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "button_sets": [
      {
        "id": 251,
        "buttons": []
      }
    ],
    "units": [
      {
        "id": 5,
        "button_set": 251
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
