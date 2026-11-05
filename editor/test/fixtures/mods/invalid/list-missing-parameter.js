AxeGraft.registerModFixture({
  "scenario": "Requirement lists: Missing parameter",
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
          "not_lifted_off"
        ]
      },
      {
        "type": "unit",
        "id": 32,
        "list": [
          "must_have"
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "requirements[0].list[0]",
      "requirements[1].list[0]"
    ],
    "warnings": []
  }
});
