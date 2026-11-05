AxeGraft.registerModFixture({
  "scenario": "Requirement lists: Dangling or",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "requirements": [
      {
        "type": "unit",
        "id": 0,
        "list": [
          111,
          "or",
          "or",
          112
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
