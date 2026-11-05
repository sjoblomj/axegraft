AxeGraft.registerModFixture({
  "scenario": "Constant entries: Value out of range",
  "mod": {
    "patcher": "AxeGraft",
    "format": 1,
    "game": "starcraft",
    "constants": [
      {
        "name": "max_supply",
        "value": 65536
      }
    ]
  },
  "expect": {
    "refused": false,
    "errors": [
      "constants[0].value"
    ],
    "warnings": [],
    "messages": [
      "max_supply",
      "65536",
      "0-65535"
    ]
  }
});
