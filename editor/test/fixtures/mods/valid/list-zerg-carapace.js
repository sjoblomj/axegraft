AxeGraft.registerModFixture({
  "scenario": "Requirement lists: Valid list",
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
          139,
          "not_training_or_morphing",
          "upgrade_level_1",
          "end_sublist",
          "upgrade_level_2",
          132,
          "or",
          "must_have",
          133,
          "end_sublist",
          "upgrade_level_3",
          133
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
