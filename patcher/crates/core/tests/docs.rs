//! Every example in `docs/mod-format.md` passes through the parser.
//!
//! Full mods are checked against the vocabularies of AxeGraft Editor's
//! shipped catalogs, which hold the real games' names. A block tagged
//! `json list:<type>` is a requirement list, checked as that type's record.

mod common;

use axegraft_patcher_core::parse::parse_mod;
use axegraft_patcher_core::Game;
use common::catalog::{editor_dir, shipped};
use serde_json::{json, Value};

/// The fenced code blocks of a Markdown file, with their info strings.
fn code_blocks(markdown: &str) -> Vec<(String, String)> {
    let mut out = Vec::new();
    let mut current: Option<(String, String)> = None;
    for line in markdown.lines() {
        match (&mut current, line.strip_prefix("```")) {
            (None, Some(info)) => current = Some((info.trim().to_string(), String::new())),
            (Some(_), Some(_)) => out.push(current.take().unwrap()),
            (Some((_, body)), None) => {
                body.push_str(line);
                body.push('\n');
            }
            (None, None) => {}
        }
    }
    out
}

#[test]
fn mod_format_examples() {
    let Some(editor) = editor_dir() else {
        eprintln!("SKIPPED: AxeGraft Editor not found; set AXEGRAFT_EDITOR to its folder to run this test.");
        return;
    };
    let sc = shipped(&editor, "starcraft");
    let w2 = shipped(&editor, "warcraft2");
    let doc = std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/../../docs/mod-format.md")).unwrap();

    let mut checked = 0;
    for (info, body) in code_blocks(&doc) {
        let mut words = info.split_whitespace();
        if words.next() != Some("json") {
            continue;
        }
        let v: Value = serde_json::from_str(&body).unwrap_or_else(|e| panic!("example isn't JSON ({e}):\n{body}"));
        let (m, vocab) = match words.next().and_then(|w| w.strip_prefix("list:")) {
            Some(kind) => (json!({"patcher": "AxeGraft", "format": 1, "game": "starcraft", "requirements": [{"type": kind, "id": 3, "list": v}]}), &sc),
            None => {
                let vocab = if v["game"] == Game::Warcraft2.id() { &w2 } else { &sc };
                (v, vocab)
            }
        };
        if let Err(ps) = parse_mod("example", m.to_string().as_bytes(), vocab) {
            panic!("an example in docs/mod-format.md is rejected:\n{body}\n{ps:#?}");
        }
        checked += 1;
    }
    assert!(checked >= 6, "expected at least 6 examples, found {checked}");
}

/// The example in `docs/library-schema.md` is a complete library that passes
/// every check.
#[test]
fn library_schema_example() {
    use axegraft_patcher_core::library_check::check_library;
    use axegraft_patcher_core::library_files::load_dir;

    let doc = std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/../../docs/library-schema.md")).unwrap();
    let dir = std::path::Path::new(env!("CARGO_TARGET_TMPDIR")).join("library-schema-example");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(dir.join("starcraft")).unwrap();
    let mut files = 0;
    for (info, body) in code_blocks(&doc) {
        let mut words = info.split_whitespace();
        if let (Some("json"), Some(name)) = (words.next(), words.next()) {
            std::fs::write(dir.join("starcraft").join(name), body).unwrap();
            files += 1;
        }
    }
    assert_eq!(files, 2);
    let lib = load_dir(&dir).unwrap_or_else(|e| panic!("{e:#?}")).without_unreliable();
    assert_eq!(check_library(&lib), Vec::<String>::new());
    assert_eq!(lib.games[0].versions[0].id, "1.16.1");
}
