#!/usr/bin/env node
// Runs the editor's core and asset tests from the command line.
//
// A convenience only: the test page runs every test with nothing installed.
// This uses only Node's standard library. It loads the same classic scripts
// the test page lists, except the UI scripts and tests that need a browser,
// which it reports as not checked.
//
//   node test/run-node.js            run the tests
//   node test/run-node.js -v         also list every passing test
//   AXEGRAFT_EDITOR_GAME_DIR=/path/to/game node test/run-node.js
//                                    also run the read-only game file tests
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const testDir = __dirname;
const root = path.resolve(testDir, "..");
const verbose = process.argv.includes("-v");

function scriptsOf(htmlFile) {
  const html = fs.readFileSync(htmlFile, "utf8");
  const out = [];
  const re = /<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g;
  let m;
  while ((m = re.exec(html))) out.push(path.resolve(path.dirname(htmlFile), m[1]));
  return out;
}

// A file on disk that reads like a browser File: slice() reads only the
// bytes asked for.
class DiskFile {
  constructor(full, rel, start, end) {
    this.full = full;
    this.name = path.basename(full);
    this.webkitRelativePath = rel;
    const size = fs.statSync(full).size;
    this.start = start || 0;
    this.end = end === undefined ? size : Math.min(end, size);
    this.size = Math.max(0, this.end - this.start);
  }
  slice(a, b) {
    const s = Math.min(this.start + Math.max(0, a || 0), this.end);
    const e = b === undefined ? this.end : Math.min(this.start + Math.max(0, b), this.end);
    return new DiskFile(this.full, this.webkitRelativePath, s, Math.max(s, e));
  }
  arrayBuffer() {
    const buf = Buffer.alloc(this.size);
    if (this.size) {
      const fd = fs.openSync(this.full, "r");
      try {
        fs.readSync(fd, buf, 0, this.size, this.start);
      } finally {
        fs.closeSync(fd);
      }
    }
    return Promise.resolve(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  text() {
    return this.arrayBuffer().then((b) => new TextDecoder().decode(b));
  }
}

function walk(dir, base, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = base ? base + "/" + entry.name : entry.name;
    if (entry.isDirectory()) walk(full, rel, out);
    else if (entry.isFile()) out.push({ full, rel });
  }
  return out;
}

function sourceTree() {
  const files = walk(root, "", []).filter((f) => !f.rel.startsWith(".git/"));
  const byPath = new Map(files.map((f) => [f.rel, f.full]));
  return {
    paths: files.map((f) => f.rel).sort(),
    read: (p) => (byPath.has(p) ? Promise.resolve(fs.readFileSync(byPath.get(p), "utf8")) : Promise.reject(new Error("no file " + p))),
    // Outside the editor's folder, so a browser given that folder can't read it.
    guideMarkdown: () => fs.readFileSync(path.join(root, "..", "docs", "making-a-mod.md"), "utf8")
  };
}

function gameFiles() {
  const dir = process.env.AXEGRAFT_EDITOR_GAME_DIR;
  if (!dir) return null;
  if (!fs.existsSync(dir)) {
    console.error("AXEGRAFT_EDITOR_GAME_DIR doesn't exist: " + dir);
    process.exit(2);
  }
  const base = path.basename(path.resolve(dir));
  return { files: walk(dir, base, []).map((f) => new DiskFile(f.full, f.rel)) };
}

const context = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  queueMicrotask,
  TextDecoder,
  TextEncoder,
  CompressionStream: globalThis.CompressionStream,
  Blob: globalThis.Blob,
  Response: globalThis.Response,
  ReadableStream: globalThis.ReadableStream,
  structuredClone,
  performance,
  URL
});
context.globalThis = context;

const pageScripts = scriptsOf(path.join(testDir, "index.html"));
const skip = (file) => {
  const rel = path.relative(root, file).split(path.sep).join("/");
  return rel.startsWith("src/ui/") || rel === "test/page.js";
};
for (const file of pageScripts) {
  if (skip(file)) continue;
  // Scripts can learn their own file, as document.currentScript tells them in a browser.
  if (context.AxeGraft) context.AxeGraft.currentScript = file.split(path.sep).join("/");
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
}

const T = context.AxeGraft.testing;
const env = { sourceTree: sourceTree(), gameFiles: gameFiles() };
const mark = { pass: "PASS", fail: "FAIL", "not checked": "NOT CHECKED" };

T.run(env, (r) => {
  if (r.status !== "pass" || verbose) {
    console.log(mark[r.status].padEnd(12) + r.name + (r.message ? "\n    " + r.message.split("\n").join("\n    ") : ""));
  }
}).then((results) => {
  const s = T.summary(results);
  console.log("\n" + s.total + " tests: " + s.pass + " passed, " + s.fail + " failed, " + s.notChecked + " not checked");
  process.exitCode = s.fail ? 1 : 0;
});
