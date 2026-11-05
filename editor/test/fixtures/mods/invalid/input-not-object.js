AxeGraft.registerModFixture({
  "scenario": "Untrusted input safety: Malformed input",
  "text": "[1, 2, 3]",
  "expect": {
    "refused": true,
    "errors": [
      ""
    ],
    "warnings": []
  }
});
