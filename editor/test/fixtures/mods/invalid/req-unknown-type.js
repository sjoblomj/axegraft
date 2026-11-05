AxeGraft.registerModFixture({
  "scenario": "Requirement entries",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "requirements": [
      {
        "type": "spell",
        "id": 0,
        "list": []
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "requirements[0].type"
    ],
    "warnings": []
  }
});
