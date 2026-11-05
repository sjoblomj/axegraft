AxeGraft.registerModFixture({
  "scenario": "Requirement lists: Valid list",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "requirements": [
      {
        "type": "unit",
        "id": 43,
        "list": [
          "current_unit_is",
          35,
          141,
          "or",
          "must_have",
          137
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
