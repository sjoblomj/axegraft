AxeGraft.registerModFixture({
  "scenario": "Requirement lists: Unbalanced sublists",
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
          132,
          "upgrade_level_2",
          133,
          "end_sublist",
          "upgrade_level_3"
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "requirements[0].list[2]"
    ],
    "warnings": []
  }
});
