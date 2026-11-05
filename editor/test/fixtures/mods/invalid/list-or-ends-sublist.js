AxeGraft.registerModFixture({
  "scenario": "Requirement lists: Dangling or",
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
          "or",
          "end_sublist"
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
