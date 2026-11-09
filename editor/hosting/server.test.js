// Tests the hosting server. Needs only Node: node --test hosting/server.test.js
"use strict";

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { after, before, beforeEach, test } = require("node:test");
const { createServer } = require("./server.js");

const BROWSER = { "sec-fetch-dest": "document", "user-agent": "Mozilla/5.0 Firefox/150.0" };

let root;
let dataDir;
let clock;
let logged;
let server;

function get(pathname, headers, method) {
  return new Promise((resolve, reject) => {
    const req = http.request({ port: server.address().port, path: pathname, headers, method: method || "GET" }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on("error", reject);
    req.end();
  });
}

function saved() {
  return JSON.parse(fs.readFileSync(path.join(dataDir, "visitors.json"), "utf8"));
}

function setDay(day) {
  clock = new Date(day + "T12:00:00Z");
}

function start() {
  return new Promise((resolve) => {
    server = createServer({ root, dataDir, now: () => clock, log: (l) => logged.push(l) });
    server.listen(0, "127.0.0.1", resolve);
  });
}

function stop() {
  return new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  });
}

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "axegraft-site-"));
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><title>page</title>");
  fs.writeFileSync(path.join(root, "styles.css"), "body {}");
  fs.writeFileSync(path.join(root, "secret.js"), "not public");
  for (const dir of ["catalog", "src", "images"]) fs.mkdirSync(path.join(root, dir));
  fs.mkdirSync(path.join(root, "assets"));
  fs.writeFileSync(path.join(root, "assets", "README.md"), "not a served type");
  fs.writeFileSync(path.join(root, "src", "a.js"), "var a = 1;");
});

after(() => fs.rmSync(root, { recursive: true }));

beforeEach(async (t) => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "axegraft-data-"));
  logged = [];
  setDay("2026-11-09");
  await start();
  t.after(async () => {
    await stop();
    fs.rmSync(dataDir, { recursive: true });
  });
});

test("a new browser is counted once a day", async () => {
  const first = await get("/", BROWSER);
  assert.equal(first.status, 200);
  assert.match(first.headers.etag, /-2026-11-09"$/);
  assert.equal(first.headers["cache-control"], "no-cache");

  const again = await get("/", { ...BROWSER, "if-none-match": first.headers.etag });
  assert.equal(again.status, 304);

  assert.deepEqual(saved(), { days: { "2026-11-09": 1 }, months: { "2026-11": 1 } });
});

test("two browsers count as two", async () => {
  await get("/", BROWSER);
  await get("/index.html", BROWSER);
  assert.deepEqual(saved(), { days: { "2026-11-09": 2 }, months: { "2026-11": 2 } });
});

test("a returning browser counts for the new day but not again for the month", async () => {
  const first = await get("/", BROWSER);
  setDay("2026-11-10");
  const next = await get("/", { ...BROWSER, "if-none-match": first.headers.etag });
  assert.equal(next.status, 200);
  assert.match(next.headers.etag, /-2026-11-10"$/);
  assert.deepEqual(saved(), { days: { "2026-11-09": 1, "2026-11-10": 1 }, months: { "2026-11": 1 } });
});

test("a returning browser counts again in a new month", async () => {
  const first = await get("/", BROWSER);
  setDay("2026-12-01");
  await get("/", { ...BROWSER, "if-none-match": first.headers.etag });
  assert.deepEqual(saved().months, { "2026-11": 1, "2026-12": 1 });
});

test("a new deployment sends the new page without counting today's visitor again", async () => {
  const stale = 'W/"00000000-2026-11-09"';
  const res = await get("/", { ...BROWSER, "if-none-match": stale });
  assert.equal(res.status, 200);
  assert.equal(fs.existsSync(path.join(dataDir, "visitors.json")), false);
});

test("crawlers, prefetches, frames, HEAD and plain clients aren't counted", async () => {
  await get("/", { ...BROWSER, "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" });
  await get("/", { ...BROWSER, "sec-purpose": "prefetch" });
  await get("/", { ...BROWSER, "sec-fetch-dest": "iframe" });
  await get("/", BROWSER, "HEAD");
  await get("/", { "user-agent": "curl/8" });
  assert.equal(fs.existsSync(path.join(dataDir, "visitors.json")), false);
});

test("nothing about the visitor is logged or saved", async () => {
  await get("/", { ...BROWSER, "x-forwarded-for": "203.0.113.7", "fly-client-ip": "203.0.113.7" });
  const everything = logged.join("\n") + fs.readFileSync(path.join(dataDir, "visitors.json"), "utf8");
  assert.doesNotMatch(everything, /203\.0\.113|127\.0\.0\.1|Firefox|Mozilla/);
});

test("counts survive a restart", async () => {
  await get("/", BROWSER);
  await stop();
  await start();
  await get("/", BROWSER);
  assert.equal(saved().days["2026-11-09"], 2);
});

test("unreadable counts are kept aside and the site still starts", async () => {
  await stop();
  fs.writeFileSync(path.join(dataDir, "visitors.json"), "{ broken");
  await start();
  assert.equal((await get("/", BROWSER)).status, 200);
  assert.equal(saved().days["2026-11-09"], 1);
  assert.equal(fs.readdirSync(dataDir).filter((f) => f.includes(".unreadable-")).length, 1);
});

test("files are served with revalidation and compression", async () => {
  const js = await get("/src/a.js", { "accept-encoding": "gzip" });
  assert.equal(js.status, 200);
  assert.equal(js.headers["content-encoding"], "gzip");
  assert.match(js.headers["content-type"], /^text\/javascript/);
  assert.equal((await get("/src/a.js", { "if-none-match": js.headers.etag })).status, 304);
  assert.equal((await get("/src/a.js?v=1")).body.toString(), "var a = 1;");
});

test("only public files can be reached", async () => {
  for (const p of ["/secret.js", "/assets/README.md", "/../secret.js", "/src/../secret.js", "/%2e%2e/secret.js", "/visitors.json", "/src"]) {
    assert.equal((await get(p)).status, 404, p);
  }
  assert.equal((await get("/", {}, "POST")).status, 405);
  assert.equal((await get("/healthz")).status, 200);
});
