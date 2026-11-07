AxeGraft.registerModFixture({
  "scenario": "Mod information: Information of the wrong type",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "mod": "Faster Marines",
    "units": [
      {
        "id": 0,
        "button_set": 5
      }
    ]
  },
  "expect": {
    "refused": true,
    "errors": [
      "mod"
    ],
    "warnings": []
  }
});
