AxeGraft.registerModFixture({
  "scenario": "Button set numbering: New set",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "button_sets": [
      {
        "id": 120,
        "buttons": [
          {
            "position": 0,
            "icon": 83,
            "condition": "w2_always",
            "action": "w2_move",
            "string": 400,
            "highlighted": 2
          }
        ]
      }
    ],
    "units": [
      {
        "id": 0,
        "button_set": 120
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
