AxeGraft.registerModFixture({
  "scenario": "Button fields: Icon and string IDs",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "button_sets": [
      {
        "id": 0,
        "buttons": [
          {
            "position": 1,
            "icon": 60000,
            "condition": "bf_always",
            "action": "order_move",
            "enabled_string": 65535,
            "disabled_string": 2000
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
