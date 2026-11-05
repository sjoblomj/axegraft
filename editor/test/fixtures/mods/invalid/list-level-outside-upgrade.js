AxeGraft.registerModFixture({
  "scenario": "Requirement lists: Unbalanced sublists",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "requirements": [
      {
        "type": "unit",
        "id": 0,
        "list": [
          "upgrade_level_1",
          111
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "requirements[0].list[0]"
    ],
    "warnings": []
  }
});
