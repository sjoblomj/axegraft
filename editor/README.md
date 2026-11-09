# AxeGraft Editor

A visual editor for AxeGraft Patcher mods, in the spirit of FireGraft. It edits a mod's units, button sets, requirements and constants for StarCraft: Brood War and Warcraft II: Battle.net Edition, and saves a mod file that holds only what differs from the original game.

It's plain JavaScript, HTML and CSS. There's no server, build step, framework, library or package manager, so a web browser is all it needs.

## Running the editor

Open `index.html` in a current Firefox, Chromium-based browser or Safari. Opening the file straight from disk works: double-click it, or drag it into a browser window.

The same files can also be served by any static web server, for example `python3 -m http.server` run in this folder, and then opened at `http://localhost:8000/`. The editor behaves the same way either way.

The editor makes no network requests. Mods you open and game files you import stay on your machine.

## Hosting on Fly.io

The editor still needs no server. `hosting/server.js` only serves the same files publicly and counts visitors, using nothing but Node's standard library. The first deployment, from this folder:

```sh
fly auth login
fly apps create axegraft-editor                                # the name must be free on Fly; match it in fly.toml
fly volumes create visitor_data --region arn --size 1 --yes
fly deploy --ha=false
```

Later deployments need only `fly deploy`. Keep it to one Machine, because the counts live on that Machine's volume.

**Visitor numbers.** `fly ssh console -C "cat /data/visitors.json"` prints unique visitors per day and per month, by UTC date. The Machine stops when idle, so open the site first if that command can't connect. `fly logs` shows the running totals as visits happen.

The server marks each browser's copy of `index.html` with an ETag holding the date it was sent, the same value for everyone that day. A page load with no tag or an older date counts as a new visitor for that day. The server never reads IP addresses, sets no cookies, keeps no per-visitor ID and logs no requests, and the page itself is unchanged. The numbers count browsers, so a private window, a cleared cache or a hard reload counts again.

The server's tests run with `node --test hosting/server.test.js`.

## Running the tests

**In a browser.** Open `test/index.html`. Every test runs, and the page lists passes, failures and tests that weren't checked.

Two kinds of test read files that a page opened from disk can't read by itself. They're listed as not checked until you choose a folder at the top of the page:

- **Editor folder:** choose this folder to check the source tree itself, for example that every script is listed in `index.html`.
- **Game folder:** choose a StarCraft or Warcraft II folder to run read-only checks against real game files. The tests never change these files.

**From the command line.** This is optional, and needs Node.js 22 or later. It runs every test that doesn't need a browser, using only Node's standard library:

```sh
node test/run-node.js        # add -v to list passing tests too
AXEGRAFT_EDITOR_GAME_DIR="/path/to/StarCraft" node test/run-node.js
```

Without `AXEGRAFT_EDITOR_GAME_DIR`, the game file tests are reported as not checked. The command exits with status 1 if any test fails.

## Layout

```
index.html        Lists every script in load order
styles.css
catalog/          One catalog per game, the game data the editor reads
src/core/         Catalog check, mod model, validation, file output, history, compatibility. No DOM
src/assets/       MPQ, implode, GRP and TBL decoding, and the asset cache. No DOM
src/ui/           Rendering, events and help text for game-independent controls
assets/           Optional shipped icons and strings, one folder per game
images/           The editor's own images, such as the logo
test/             Test page, Node runner, tests and fixtures
docs/             Catalog format and architecture notes
hosting/          Server for public hosting, which counts visitors. Not part of the editor
```

Scripts are classic `<script>` tags that each add to one global, `AxeGraft`, because browsers load neither ES modules nor local data with `fetch` from `file://`. When you add a script, list it in `index.html` and in the same place in `test/index.html`. A test checks this.

## Browsers checked

On 2026-11-08 the whole test page was run in headless Chromium, opened from disk and served by a static server, with no folders chosen:

| Browser                        | From disk         | Served statically | Notes                                                                                                                               |
| ------------------------------ | ----------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Chromium 156 (Linux, headless) | 524 passed, 5 not checked | 524 passed, 5 not checked | The 5 not checked are the source tree and game file tests, whose folders weren't chosen; every other test passed |
| Firefox 159 (Linux)            | Not re-run        | Not re-run        | On 2026-11-05, with 382 tests, every test passed but the 5 that need a folder                                                       |
| Safari                         | Not checked       | Not checked       | No Safari was available                                                                                                             |

On 2026-11-05 the page was also run with the network cut off and every request logged, and no request left the machine. That hasn't been repeated since.

### Checked by hand

Some behaviour depends on the browser's own dialogs, so it can't be checked by the test page:

- **Saving straight to the opened file**, through the browser's file picker, where it has one (Chromium). Checked by hand in Chromium on 2026-11-08: Save As asked for a file, and Save then wrote to it without asking again. Saving by download works everywhere.
- **Restoring unsaved work after the browser closes**: checked in Chromium by killing the browser after an edit and starting it again on the same profile. The editor offered the work back.
- **Importing from a real game folder**: checked in Chromium with a StarCraft folder of 120 MB. It took about half a second, the page never stalled for more than 133 ms, and checksums of all 243 files were the same before and after.
- **Looking at FireGraft side by side**: done on 2026-11-08, with no differences beyond those `docs/architecture.md` lists.
- **Originals that differ by version**: checked in Firefox and Chromium on 2026-11-08 with Warcraft II's Goblin Zeppelin set. Both originals were shown side by side, and the compatibility report listed the DOS versions and showed its note about the patcher.
