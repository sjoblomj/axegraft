AxeGraft.registerModFixture({
  "scenario": "Requirement lists: Levels out of order",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "requirements": [
      {
        "type": "upgrade",
        "id": 3,
        "list": [
          "upgrade_level_2",
          "end_sublist",
          "upgrade_level_1",
          "end_sublist",
          "upgrade_level_3"
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "requirements[0].list[0]",
      "requirements[0].list[2]",
      "requirements[0].list[4]"
    ],
    "warnings": []
  }
});
