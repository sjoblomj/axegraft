AxeGraft.registerModFixture({
  "scenario": "Requirement lists: Missing level",
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
          132
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "requirements[0].list"
    ],
    "warnings": []
  }
});
