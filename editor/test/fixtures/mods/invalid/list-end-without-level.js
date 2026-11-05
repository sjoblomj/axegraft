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
          "current_unit_is",
          139,
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
