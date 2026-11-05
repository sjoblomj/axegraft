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
          "or"
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "requirements[0].list[1]"
    ],
    "warnings": []
  }
});
