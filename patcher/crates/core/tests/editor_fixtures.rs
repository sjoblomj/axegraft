//! AxeGraft Editor's shared example mods, run through the patcher's parser.
//!
//! The editor keeps example mods in `test/fixtures/mods`, each with what the
//! format's rules expect of it, and fixture catalogs describing a small part
//! of each game. This test builds a vocabulary from each fixture catalog and
//! checks that every example is accepted or rejected as its file expects, with
//! problems at the same paths and messages containing the texts it names.
//!
//! Without the editor the test says so and passes.

mod common;

use axegraft_patcher_core::game::Game;
use axegraft_patcher_core::parse::{parse_mod, peek_game};
use common::catalog::{editor_dir, registered, vocabulary};
use serde_json::Value;
use std::path::PathBuf;

#[test]
fn editor_example_mods() {
    let Some(editor) = editor_dir() else {
        eprintln!("SKIPPED: AxeGraft Editor not found; set AXEGRAFT_EDITOR to its folder to run this test.");
        return;
    };
    let fixtures = editor.join("test/fixtures");
    let sc = vocabulary(&registered(&fixtures.join("catalog-starcraft.js")));
    let w2 = vocabulary(&registered(&fixtures.join("catalog-warcraft2.js")));

    let mut files: Vec<PathBuf> = Vec::new();
    for kind in ["valid", "invalid"] {
        for e in std::fs::read_dir(fixtures.join("mods").join(kind)).unwrap() {
            files.push(e.unwrap().path());
        }
    }
    files.sort();
    assert!(files.len() > 100, "expected the editor's example mods, found {}", files.len());

    let mut failures = Vec::new();
    for path in &files {
        let fx = registered(path);
        let name = path.strip_prefix(fixtures.join("mods")).unwrap().display().to_string();
        let bytes: Vec<u8> = if let Some(m) = fx.get("mod") {
            m.to_string().into_bytes()
        } else if let Some(Value::Array(b)) = fx.get("bytes") {
            b.iter().map(|x| x.as_u64().unwrap() as u8).collect()
        } else {
            fx["text"].as_str().unwrap().as_bytes().to_vec()
        };
        let vocab = if peek_game(&bytes) == Some(Game::Warcraft2) { &w2 } else { &sc };
        let expect = &fx["expect"];
        let mut want: Vec<String> = expect["errors"].as_array().unwrap().iter().map(|e| e.as_str().unwrap().to_string()).collect();
        want.sort();
        let should_reject = expect["refused"].as_bool().unwrap() || !want.is_empty();

        match parse_mod(&name, &bytes, vocab) {
            Ok(_) if should_reject => failures.push(format!("{name}: accepted, but expected problems at {want:?}")),
            Ok(_) => {}
            Err(ps) if !should_reject => failures.push(format!("{name}: rejected, but expected to be accepted: {ps:#?}")),
            Err(ps) => {
                let mut got: Vec<String> = ps.iter().map(|p| p.path.clone()).collect();
                got.sort();
                got.dedup();
                if got != want {
                    failures.push(format!("{name}: problems at {got:?}, expected {want:?}: {ps:#?}"));
                }
                for m in expect.get("messages").and_then(Value::as_array).into_iter().flatten() {
                    let m = m.as_str().unwrap();
                    if !ps.iter().any(|p| p.message.contains(m)) {
                        failures.push(format!("{name}: no message mentions {m:?}: {ps:#?}"));
                    }
                }
            }
        }
    }
    assert!(failures.is_empty(), "{} of {} example mods failed:\n{}", failures.len(), files.len(), failures.join("\n"));
}
