AxeGraft.registerModFixture({
  "scenario": "Identifying game content and engine behaviour: Unknown behaviour name",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "warcraft2",
    "button_sets": [
      {
        "id": 0,
        "buttons": [
          {
            "position": 0,
            "icon": 83,
            "condition": "w2_always",
            "action": "order_move",
            "string": 400,
            "highlighted": 2
          }
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "button_sets[0].buttons[0].action"
    ],
    "warnings": []
  }
});
