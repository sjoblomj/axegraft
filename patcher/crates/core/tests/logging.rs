//! The log's contents, as golden text, and when it's written.

mod common;

use axegraft_patcher_core::apply::apply;
use axegraft_patcher_core::memory::{FakeMemory, FAKE_BASE};
use axegraft_patcher_core::parse::parse_mod;
use axegraft_patcher_core::plan::{plan, Plan};
use axegraft_patcher_core::report::{self, LogSink};
use axegraft_patcher_core::{Game, Problem};
use common::image::memory;
use common::toy_library;
use serde_json::json;

fn planned(version: &str, parts: serde_json::Value) -> (Plan, FakeMemory) {
    let lib = toy_library();
    let g = lib.game(Game::StarCraft).unwrap();
    let v = g.version(version).unwrap();
    let mut m = json!({"patcher": "AxeGraft", "format": 1, "game": "starcraft"});
    for (k, val) in parts.as_object().unwrap() {
        m[k] = val.clone();
    }
    let m = parse_mod("m.json", m.to_string().as_bytes(), &g.vocabulary()).unwrap();
    let mem = memory(g, v, FAKE_BASE);
    (plan("m.json", &m, g, v, &mem).unwrap(), mem)
}

#[track_caller]
fn golden(got: &[String], want: &str) {
    assert_eq!(got.join("\n"), want.trim_matches('\n'));
}

#[test]
fn log_header() {
    golden(
        &report::header(r"C:\Games\StarCraft\StarCraft.exe", Some((Game::StarCraft, "1.17")), 0x00A50000),
        &format!(
            r"
AxeGraft Patcher {}
Executable: C:\Games\StarCraft\StarCraft.exe
Game: StarCraft 1.17
Loaded at: 0x00a50000
",
            axegraft_patcher_core::PATCHER_VERSION
        ),
    );
    let h = report::header(r"C:\x\game.exe", None, 0x400000);
    assert_eq!(h[2], "Game: not a supported version");
}

#[test]
fn logging_inputs() {
    golden(&report::input(r"C:\Mods\Faster Marines\patch.json"), r"Mod file: C:\Mods\Faster Marines\patch.json (chosen in AxeGraft Patcher's configuration)");
}

#[test]
fn logging_changes() {
    let (p, mut mem) = planned(
        "1.07",
        json!({
            "constants": [{"name": "max_supply", "value": 600}],
            "button_sets": [{"id": 1, "buttons": [{"position": 1, "icon": 228, "condition": "bf_always", "action": "order_move", "enabled_string": 664, "disabled_string": 0}]}],
            "requirements": [{"type": "tech_use", "id": 0, "list": []}]
        }),
    );
    let mut log = Vec::new();
    apply("m.json", &p, &mut mem, &mut log).unwrap();
    log.extend(report::applied(&p));
    golden(
        &log,
        r"
Plan: 3 changes, 6 locations, 0 constants skipped
  New memory for the button set 1 (1 button): 20 bytes at 0x56000000
  New memory for the tech use requirement stream (0 records): 4 bytes at 0x56000020
  constant max_supply = 600
    0x12346000 (RVA 0x6000): 90 01 -> 58 02
    0x12346010 (RVA 0x6010): 90 01 -> 58 02
  button card 1: set 1 replaced
    0x1234100c (RVA 0x100c): 01 00 -> 01 00
    0x12341010 (RVA 0x1010): 28 20 34 12 -> 00 00 00 56
  tech use requirements: 0 removed
    0x12345040 (RVA 0x5040): 40 40 34 12 -> 20 00 00 56
    0x12345044 (RVA 0x5044): 42 40 34 12 -> 22 00 00 56
Applied 3 changes and confirmed every location.
",
    );
}

#[test]
fn logging_skips() {
    let (p, _) = planned("1.07", json!({"constants": [{"name": "team_multiplier", "value": 3}]}));
    let (q, _) = planned("1.16.1", json!({"constants": [{"name": "nuke_cost", "value": 3}]}));
    let lines: Vec<String> = report::plan(&p, &[]).into_iter().chain(report::plan(&q, &[])).collect();
    golden(
        &lines,
        r"
Plan: 0 changes, 0 locations, 1 constant skipped
  Skipped constant team_multiplier on StarCraft 1.07: not_applicable: the code doesn't exist on this version
Plan: 0 changes, 0 locations, 1 constant skipped
  Skipped constant nuke_cost on StarCraft 1.16.1: unknown: its location on this version hasn't been found
",
    );
}

fn many(n: usize) -> Vec<Problem> {
    (0..n).map(|i| Problem::new("m.json", format!("units[{i}].id"), format!("Unit ID {} is outside the game's button table, 0-249.", 300 + i))).collect()
}

#[test]
fn logging_errors() {
    let probs = many(13);
    let log = report::problems(&probs);
    assert_eq!(log.len(), 14, "the log has every problem, even when the message shows only some");
    golden(
        &log[..3],
        r"
Failed with 13 problems:
  m.json: units[0].id: Unit ID 300 is outside the game's button table, 0-249.
  m.json: units[1].id: Unit ID 301 is outside the game's button table, 0-249.
",
    );
    assert_eq!(log[13], "  m.json: units[12].id: Unit ID 312 is outside the game's button table, 0-249.");
}

/// A sink that records what had been flushed when each write happened.
#[derive(Default)]
struct Recorder {
    lines: Vec<String>,
    flushed: usize,
}

impl LogSink for Recorder {
    fn line(&mut self, t: &str) {
        self.lines.push(t.into());
    }
    fn flush(&mut self) {
        self.flushed = self.lines.len();
    }
}

#[test]
fn plan_is_logged_before_any_write() {
    let (p, mut mem) = planned("1.07", json!({"constants": [{"name": "max_supply", "value": 600}, {"name": "spell_duration", "value": 7}]}));
    mem.fail_after_writes = Some(2);
    let mut log = Recorder::default();
    let e = apply("m.json", &p, &mut mem, &mut log).unwrap_err();
    assert!(e[0].message.contains("failed"), "{e:?}");
    assert_eq!(mem.writes.len(), 2, "it failed part way");
    let planned = report::plan(&p, &[]);
    assert_eq!(log.lines, planned, "the whole plan was logged");
    assert_eq!(log.flushed, planned.len(), "and flushed before writing");
    assert!(log.lines.iter().any(|l| l.contains("RVA 0x6024")), "including the locations never reached");
}

#[test]
fn many_problems() {
    let msg = report::error_message("AxeGraft Patcher couldn't apply m.json.", &many(13), Some(r"C:\Users\me\AppData\Local\Temp\AxeGraftPatcher.log"));
    assert_eq!(
        msg,
        r"AxeGraft Patcher couldn't apply m.json.

- m.json: units[0].id: Unit ID 300 is outside the game's button table, 0-249.
- m.json: units[1].id: Unit ID 301 is outside the game's button table, 0-249.
- m.json: units[2].id: Unit ID 302 is outside the game's button table, 0-249.
- m.json: units[3].id: Unit ID 303 is outside the game's button table, 0-249.
- m.json: units[4].id: Unit ID 304 is outside the game's button table, 0-249.
- m.json: units[5].id: Unit ID 305 is outside the game's button table, 0-249.
- m.json: units[6].id: Unit ID 306 is outside the game's button table, 0-249.
- m.json: units[7].id: Unit ID 307 is outside the game's button table, 0-249.
- m.json: units[8].id: Unit ID 308 is outside the game's button table, 0-249.
- m.json: units[9].id: Unit ID 309 is outside the game's button table, 0-249.

...and 3 more problems, listed in the log: C:\Users\me\AppData\Local\Temp\AxeGraftPatcher.log

The game will now close."
    );
}

#[test]
fn few_problems_and_no_log() {
    let msg = report::error_message("AxeGraft Patcher couldn't apply m.json.", &many(2), None);
    assert!(msg.contains("units[1]") && !msg.contains("more"));
    assert!(msg.contains("No log is available"));
    let msg = report::error_message("X", &many(11), Some("log"));
    assert!(msg.contains("...and 1 more problem, listed in the log: log"));
}
