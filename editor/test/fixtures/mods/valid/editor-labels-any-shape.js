AxeGraft.registerModFixture({
  "scenario": "Editor labels: Labels of any shape",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "labels": {
      "units": {
        "9999": "Beyond the table",
        "0": 5
      },
      "upgrades": []
    }
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": [
      "labels.units.0",
      "labels.units.9999",
      "labels.upgrades"
    ]
  }
});
