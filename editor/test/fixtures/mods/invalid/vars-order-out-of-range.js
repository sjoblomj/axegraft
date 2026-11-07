AxeGraft.registerModFixture({
  "scenario": "Typed function variables: Order out of range",
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
            "icon": 101,
            "condition": "w2_always",
            "action": "order_spell",
            "action_variable": 61,
            "string": 349,
            "highlighted": 0
          }
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "button_sets[0].buttons[0].action_variable"
    ],
    "warnings": []
  }
});
