AxeGraft.registerModFixture({
  "scenario": "Untrusted input safety: Malformed input",
  "bytes": [
    255,
    254,
    0,
    65,
    128,
    129,
    195,
    40,
    123,
    125
  ],
  "expect": {
    "refused": true,
    "errors": [
      ""
    ],
    "warnings": []
  }
});
