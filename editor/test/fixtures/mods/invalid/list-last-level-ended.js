AxeGraft.registerModFixture({
  "scenario": "Requirement lists: Last level ended",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "requirements": [
      {
        "type": "upgrade",
        "id": 3,
        "list": [
          "upgrade_level_1",
          "end_sublist",
          "upgrade_level_2",
          "end_sublist",
          "upgrade_level_3",
          133,
          "end_sublist"
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "requirements[0].list[6]"
    ],
    "warnings": []
  }
});
