AxeGraft.registerModFixture({
  "scenario": "Mod parts: Requirements in a Warcraft II mod",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "requirements": [
      {
        "type": "tech_use",
        "id": 44,
        "list": []
      }
    ]
  },
  "expect": {
    "refused": true,
    "errors": [
      "requirements"
    ],
    "warnings": []
  }
});
