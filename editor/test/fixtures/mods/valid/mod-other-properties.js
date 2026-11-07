AxeGraft.registerModFixture({
  "scenario": "Mod information: Other properties in the information",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "mod": {
      "name": "Faster Marines",
      "website": "example.org"
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
