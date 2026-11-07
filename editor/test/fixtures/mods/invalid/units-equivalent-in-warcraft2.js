AxeGraft.registerModFixture({
  "scenario": "Unit entries: Equivalent entry in a Warcraft II mod",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "units": [
      {
        "id": 0,
        "equivalent_entry": null
      }
    ]
  },
  "expect": {
    "refused": true,
    "errors": [
      "units[0].equivalent_entry"
    ],
    "warnings": []
  }
});
