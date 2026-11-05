AxeGraft.registerModFixture({
  "scenario": "Identifying game content and engine behaviour: Unknown behaviour name",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "requirements": [
      {
        "type": "unit",
        "id": 0,
        "list": [
          "can_fly"
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "requirements[0].list[0]"
    ],
    "warnings": [],
    "messages": [
      "can_fly"
    ]
  }
});
