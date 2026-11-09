#!/usr/bin/env node
// Serves the editor's files and counts unique visitors. Only used for public
// hosting: the editor itself needs no server. Uses only Node's standard library.
//
// How visitors are counted, without knowing who they are:
// index.html is sent with an ETag holding the date it was sent, the same value
// for everyone that day. The browser sends that tag back when it next loads
// the page. A page load with no tag, or with an older date, is a browser that
// hasn't been here today, so it adds one to today's count.
//
// IP addresses are never read. No cookie or per-visitor ID exists, and access
// isn't logged. All that's stored is one number per day and per month.
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const zlib = require("zlib");

const PUBLIC = ["index.html", "styles.css", "catalog", "src", "assets", "images"];
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon"
};
const COMPRESSED = new Set([".html", ".css", ".js"]);
const BOTS = /bot|crawl|spider|slurp|headless|preview/i;
const INDEX_TAG = /^(?:W\/)?"([0-9a-f]+)-(\d{4}-\d{2}-\d{2})"$/;

function hash(body) {
  return crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
}

function addFile(site, root, rel) {
  const full = path.join(root, rel);
  if (fs.statSync(full).isDirectory()) {
    for (const name of fs.readdirSync(full)) addFile(site, root, rel + "/" + name);
    return;
  }
  const ext = path.extname(rel).toLowerCase();
  if (!TYPES[ext]) return;
  const body = fs.readFileSync(full);
  site.set("/" + rel, {
    body,
    gzip: COMPRESSED.has(ext) ? zlib.gzipSync(body, { level: 9 }) : null,
    type: TYPES[ext],
    hash: hash(body)
  });
}

// Reads every public file into memory. A request can only ever be answered
// from this map, so no request path reaches the file system.
function loadSite(root) {
  const site = new Map();
  for (const rel of PUBLIC) addFile(site, root, rel);
  if (!site.has("/index.html")) throw new Error("no index.html in " + root);
  return site;
}

function emptyCounts() {
  return { days: {}, months: {} };
}

function readCounts(file, log) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return emptyCounts();
    throw e;
  }
  try {
    const counts = JSON.parse(text);
    if (counts && counts.days && counts.months) return counts;
    throw new Error("unexpected contents");
  } catch (e) {
    const kept = file + ".unreadable-" + Date.now();
    fs.renameSync(file, kept);
    log("visitor counts couldn't be read (" + e.message + "), kept them as " + kept);
    return emptyCounts();
  }
}

function createCounter(file, log) {
  const counts = readCounts(file, log);
  return {
    counts,
    visit(day, newThisMonth) {
      const month = day.slice(0, 7);
      counts.days[day] = (counts.days[day] || 0) + 1;
      if (newThisMonth) counts.months[month] = (counts.months[month] || 0) + 1;
      log("visitors " + day + ": " + counts.days[day] + ", " + month + ": " + (counts.months[month] || 0));
      try {
        // Renamed into place, so stopping part way can't leave half a file.
        const temp = file + ".tmp";
        fs.writeFileSync(temp, JSON.stringify(counts, null, 1) + "\n");
        fs.renameSync(temp, file);
      } catch (e) {
        log("visitor counts couldn't be saved: " + e.message);
      }
    }
  };
}

// A real page load by a browser, rather than a crawler, a prefetch or a frame.
function isPageLoad(req) {
  return (
    req.method === "GET" &&
    req.headers["sec-fetch-dest"] === "document" &&
    !req.headers["sec-purpose"] &&
    !BOTS.test(req.headers["user-agent"] || "")
  );
}

function send(req, res, status, file, tag) {
  const headers = {
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
    ETag: tag
  };
  if (status === 304) {
    res.writeHead(304, headers);
    res.end();
    return;
  }
  const gzip = file.gzip && /\bgzip\b/.test(req.headers["accept-encoding"] || "");
  const body = gzip ? file.gzip : file.body;
  headers["Content-Type"] = file.type;
  headers["Content-Length"] = body.length;
  if (file.gzip) headers.Vary = "Accept-Encoding";
  if (gzip) headers["Content-Encoding"] = "gzip";
  res.writeHead(200, headers);
  res.end(req.method === "HEAD" ? undefined : body);
}

function plain(res, status, text, extra) {
  res.writeHead(status, Object.assign({ "Content-Type": "text/plain; charset=utf-8" }, extra));
  res.end(text);
}

function serveIndex(req, res, file, counter, now) {
  const today = now().toISOString().slice(0, 10);
  const match = INDEX_TAG.exec(req.headers["if-none-match"] || "");
  const lastDay = match ? match[2] : null;
  // Weak, because the same tag covers the compressed and plain forms.
  const tag = 'W/"' + file.hash + "-" + today + '"';

  if (lastDay !== today && isPageLoad(req)) {
    counter.visit(today, !lastDay || lastDay.slice(0, 7) !== today.slice(0, 7));
  }
  send(req, res, match && lastDay === today && match[1] === file.hash ? 304 : 200, file, tag);
}

function createServer(options) {
  const site = loadSite(options.root);
  const now = options.now || (() => new Date());
  const log = options.log || console.log;
  fs.mkdirSync(options.dataDir, { recursive: true });
  const counter = createCounter(path.join(options.dataDir, "visitors.json"), log);

  return http.createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      plain(res, 405, "Method not allowed\n", { Allow: "GET, HEAD" });
      return;
    }
    const url = req.url.split("?")[0];
    if (url === "/healthz") {
      plain(res, 200, "ok\n");
    } else if (url === "/" || url === "/index.html") {
      serveIndex(req, res, site.get("/index.html"), counter, now);
    } else if (site.has(url)) {
      const file = site.get(url);
      const tag = 'W/"' + file.hash + '"';
      send(req, res, req.headers["if-none-match"] === tag ? 304 : 200, file, tag);
    } else {
      plain(res, 404, "Not found\n");
    }
  });
}

// Fly mounts a volume as owned by root, so start as root only to take the
// data folder over, then run as the image's unprivileged user.
function dropRoot(dataDir) {
  if (!process.getuid || process.getuid() !== 0) return;
  fs.mkdirSync(dataDir, { recursive: true });
  fs.chownSync(dataDir, 1000, 1000);
  process.setgid(1000);
  process.setuid(1000);
}

if (require.main === module) {
  const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
  const port = Number(process.env.PORT) || 8080;
  dropRoot(dataDir);
  const server = createServer({ root: process.env.SITE_DIR || path.join(__dirname, ".."), dataDir });
  server.listen(port, "::", () => console.log("serving on port " + port));
  // As the container's first process, Node would otherwise ignore this.
  process.on("SIGTERM", () => process.exit(0));
  process.on("SIGINT", () => process.exit(0));
}

module.exports = { createServer };
