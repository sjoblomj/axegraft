AxeGraft.registerModFixture({
  "scenario": "Strict fields: Label is ignored",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "units": [
      {
        "id": 0,
        "label": "Anything at all",
        "button_set": 5
      }
    ],
    "button_sets": [
      {
        "id": 5,
        "label": "",
        "buttons": [
          {
            "position": 1,
            "icon": 228,
            "condition": "bf_always",
            "action": "order_move",
            "enabled_string": 664,
            "disabled_string": 0,
            "label": "Move"
          }
        ]
      }
    ],
    "constants": [
      {
        "name": "max_supply",
        "label": "Supply",
        "value": 600
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
