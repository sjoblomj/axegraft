AxeGraft.registerModFixture({
  "scenario": "Mod information: Mod with information",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "mod": {
      "name": "Faster Marines",
      "version": "1.2",
      "authors": [
        "Alice",
        "Bob"
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
    "errors": [],
    "warnings": []
  }
});
