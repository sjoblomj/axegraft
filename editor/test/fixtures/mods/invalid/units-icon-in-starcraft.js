AxeGraft.registerModFixture({
  "scenario": "Unit entries: Unit icon in a StarCraft mod",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 0,
        "icon": 5
      }
    ]
  },
  "expect": {
    "refused": true,
    "errors": [
      "units[0].icon"
    ],
    "warnings": []
  }
});
