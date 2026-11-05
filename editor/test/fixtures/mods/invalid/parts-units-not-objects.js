AxeGraft.registerModFixture({
  "scenario": "Refusing malformed files: Part with the wrong shape",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      5
    ]
  },
  "expect": {
    "refused": true,
    "errors": [
      "units[0]"
    ],
    "warnings": []
  }
});
