AxeGraft.registerModFixture({
  "scenario": "Button order: Shared positions",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "button_sets": [
      {
        "id": 0,
        "buttons": [
          {
            "position": 1,
            "icon": 83,
            "condition": "w2_always",
            "action": "w2_move",
            "string": 400,
            "highlighted": 0
          },
          {
            "position": 1,
            "icon": 84,
            "condition": "w2_always",
            "action": "w2_move",
            "string": 400,
            "highlighted": 0
          },
          {
            "position": 1,
            "icon": 85,
            "condition": "w2_always",
            "action": "w2_move",
            "string": 400,
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
