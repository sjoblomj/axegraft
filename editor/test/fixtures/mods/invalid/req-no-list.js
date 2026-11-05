AxeGraft.registerModFixture({
  "scenario": "Refusing malformed files: Part with the wrong shape",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "requirements": [
      {
        "type": "unit",
        "id": 0
      }
    ]
  },
  "expect": {
    "refused": true,
    "errors": [
      "requirements[0]"
    ],
    "warnings": []
  }
});
