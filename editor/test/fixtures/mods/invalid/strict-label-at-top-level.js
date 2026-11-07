AxeGraft.registerModFixture({
  "scenario": "Strict fields: Label at the top level",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "label": "A mod"
  },
  "expect": {
    "refused": true,
    "errors": [
      "label"
    ],
    "warnings": []
  }
});
