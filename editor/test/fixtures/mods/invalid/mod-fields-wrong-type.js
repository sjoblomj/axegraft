AxeGraft.registerModFixture({
  "scenario": "Mod information: Information of the wrong type",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "mod": {
      "name": 5,
      "version": 1.2,
      "authors": [
        "Alice",
        2
      ]
    },
    "units": [
      {
        "id": 0,
        "button_set": 5
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "mod.authors[1]",
      "mod.name",
      "mod.version"
    ],
    "warnings": []
  }
});
