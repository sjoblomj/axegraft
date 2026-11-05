AxeGraft.registerModFixture({
  "scenario": "Mod header: Missing or wrong patcher value",
  "mod": {
    "format": 1,
    "game": "starcraft"
  },
  "expect": {
    "refused": true,
    "errors": [
      "patcher"
    ],
    "warnings": [],
    "messages": [
      "isn't an AxeGraft Patcher mod"
    ]
  }
});
