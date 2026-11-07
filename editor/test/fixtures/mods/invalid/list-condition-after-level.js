AxeGraft.registerModFixture({
  "scenario": "Requirement lists: Condition between levels",
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
          132,
          "upgrade_level_2",
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
