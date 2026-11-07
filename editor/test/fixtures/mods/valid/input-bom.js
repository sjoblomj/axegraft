AxeGraft.registerModFixture({
  "scenario": "Untrusted input safety: Byte order mark",
  "text": "﻿{\"patcher\": \"AxeGraft\", \"format\": 1, \"game\": \"warcraft2\"}",
  "expect": {
    "refused": false,
    "errors": [],
    "warnings": []
  }
});
