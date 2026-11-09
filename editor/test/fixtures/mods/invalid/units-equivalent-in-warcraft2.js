AxeGraft.registerModFixture({
  "scenario": "Unit entries: Connected unit in a Warcraft II mod",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "units": [
      {
        "id": 0,
        "connected_unit": null
      }
    ]
  },
  "expect": {
    "refused": true,
    "errors": [
      "units[0].connected_unit"
    ],
    "warnings": []
  }
});
