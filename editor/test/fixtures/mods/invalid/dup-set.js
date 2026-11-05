AxeGraft.registerModFixture({
  "scenario": "No duplicates within a mod: Same button set twice",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "button_sets": [
      {
        "id": 7,
        "buttons": []
      },
      {
        "id": 7,
        "buttons": [
          {
            "position": 1,
            "icon": 228,
            "condition": "bf_always",
            "action": "order_move",
            "enabled_string": 664,
            "disabled_string": 0
          }
        ]
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "button_sets[1]"
    ],
    "warnings": [],
    "messages": [
      "Button set 7"
    ]
  }
});
