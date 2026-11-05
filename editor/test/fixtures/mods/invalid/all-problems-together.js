AxeGraft.registerModFixture({
  "scenario": "All problems reported together: Several mistakes",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 400,
        "button_set": 0
      }
    ],
    "constants": [
      {
        "name": "gravity",
        "value": 1
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "constants[0].name",
      "units[0].id"
    ],
    "warnings": []
  }
});
