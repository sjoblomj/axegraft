AxeGraft.registerModFixture({
  "scenario": "Strict fields: Unknown field",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "version": "1.16.1"
  },
  "expect": {
    "refused": true,
    "errors": [
      "version"
    ],
    "warnings": []
  }
});
