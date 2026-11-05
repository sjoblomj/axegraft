AxeGraft.registerModFixture({
  "scenario": "Requirement lists: Parameter of the wrong kind",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "requirements": [
      {
        "type": "unit",
        "id": 0,
        "list": [
          "current_unit_is",
          228,
          "is_researched",
          44,
          300
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "requirements[0].list[1]",
      "requirements[0].list[3]",
      "requirements[0].list[4]"
    ],
    "warnings": []
  }
});
