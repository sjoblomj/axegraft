// Writes src/ui/guide-text.js from ../docs/making-a-mod.md. A page opened from
// disk can't read a Markdown file, so the guide ships as a script. Run it with
// `node tools/build-guide.js` after changing the guide.
"use strict";

const fs = require("fs");
const path = require("path");

const editor = path.join(__dirname, "..");
const markdown = fs.readFileSync(path.join(editor, "..", "docs", "making-a-mod.md"), "utf8");
const lines = markdown.trimEnd().split(/\r?\n/).map((l) => "  " + JSON.stringify(l));

fs.writeFileSync(
  path.join(editor, "src", "ui", "guide-text.js"),
  '// Generated from docs/making-a-mod.md by tools/build-guide.js. Don\'t edit by hand.\n"use strict";\n\nAxeGraft.ui.guideText = [\n' + lines.join(",\n") + "\n];\n"
);
