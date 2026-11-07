AxeGraft.registerModFixture({
  "scenario": "Requirement lists: Opcode the record's type doesn't handle",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "requirements": [
      {
        "type": "upgrade",
        "id": 0,
        "list": [
          "must_have_addon",
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
