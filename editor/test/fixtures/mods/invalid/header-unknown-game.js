AxeGraft.registerModFixture({
  "scenario": "Mod header: Unknown game",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "diablo"
  },
  "expect": {
    "refused": true,
    "errors": [
      "game"
    ],
    "warnings": [],
    "messages": [
      "\"diablo\""
    ]
  }
});
