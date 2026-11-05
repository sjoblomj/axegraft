AxeGraft.registerModFixture({
  "scenario": "Button fields: Warcraft II button fields",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "button_sets": [
      {
        "id": 2,
        "buttons": [
          {
            "position": 0,
            "icon": 83,
            "condition": "w2_always",
            "action": "w2_move",
            "string": 400,
            "highlighted": 8
          },
          {
            "position": 1,
            "icon": 83,
            "condition": "w2_always",
            "action": "w2_move",
            "string": 401,
            "highlighted": 0
          }
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
