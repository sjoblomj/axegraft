AxeGraft.registerModFixture({
  "scenario": "Refusing malformed files: Part with the wrong shape",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": {
      "id": 0,
      "button_set": 5
    }
  },
  "expect": {
    "refused": true,
    "errors": [
      "units"
    ],
    "warnings": []
  }
});
