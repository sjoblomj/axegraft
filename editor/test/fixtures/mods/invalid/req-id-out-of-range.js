AxeGraft.registerModFixture({
  "scenario": "Requirement entries",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "requirements": [
      {
        "type": "tech_use",
        "id": 44,
        "list": []
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "requirements[0].id"
    ],
    "warnings": []
  }
});
