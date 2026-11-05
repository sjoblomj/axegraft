AxeGraft.registerModFixture({
  "scenario": "No duplicates within a mod",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "requirements": [
      {
        "type": "unit",
        "id": 0,
        "list": []
      },
      {
        "type": "unit",
        "id": 0,
        "list": [
          111
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "requirements[1]"
    ],
    "warnings": []
  }
});
