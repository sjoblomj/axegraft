AxeGraft.registerModFixture({
  "scenario": "Requirement entries: Replace a record",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "requirements": [
      {
        "type": "upgrade",
        "id": 3,
        "list": [
          "current_unit_is",
          139
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
