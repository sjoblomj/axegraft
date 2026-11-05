AxeGraft.registerModFixture({
  "scenario": "Mod header: Unsupported format version",
  "mod": {
    "patcher": "AxeGraft",
    "format": 2,
    "game": "starcraft"
  },
  "expect": {
    "refused": true,
    "errors": [
      "format"
    ],
    "warnings": [],
    "messages": [
      "format version 2"
    ]
  }
});
