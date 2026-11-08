#![allow(dead_code)]

pub mod catalog;
pub mod image;
pub mod pe;

use axegraft_patcher_core::{parse_mod, Mod, Problem, Vocabulary};
use serde_json::Value;

pub fn vocab(game: &str) -> Vocabulary {
    let path = format!("{}/tests/fixtures/{game}.vocab.json", env!("CARGO_MANIFEST_DIR"));
    serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap()
}

pub fn sc() -> Vocabulary {
    vocab("starcraft")
}

pub fn w2() -> Vocabulary {
    vocab("warcraft2")
}

/// Parses a mod given as JSON, with the vocabulary of the game it names
/// (StarCraft if it names none).
pub fn parse(m: &Value) -> Result<Mod, Vec<Problem>> {
    let v = if m.get("game").and_then(Value::as_str) == Some("warcraft2") { w2() } else { sc() };
    parse_mod("test.json", m.to_string().as_bytes(), &v)
}

pub fn parse_bytes(bytes: &[u8]) -> Result<Mod, Vec<Problem>> {
    parse_mod("test.json", bytes, &sc())
}

/// A StarCraft mod with the given parts.
pub fn sc_mod(parts: Value) -> Value {
    with_header("starcraft", parts)
}

pub fn w2_mod(parts: Value) -> Value {
    with_header("warcraft2", parts)
}

fn with_header(game: &str, parts: Value) -> Value {
    let mut m = serde_json::json!({"patcher": "AxeGraft", "format": 1, "game": game});
    if let Value::Object(p) = parts {
        for (k, v) in p {
            m[k] = v;
        }
    }
    m
}

/// The paths of a rejected mod's problems, sorted.
pub fn paths(r: &Result<Mod, Vec<Problem>>) -> Vec<String> {
    match r {
        Ok(_) => Vec::new(),
        Err(ps) => {
            let mut v: Vec<_> = ps.iter().map(|p| p.path.clone()).collect();
            v.sort();
            v.dedup();
            v
        }
    }
}

#[track_caller]
pub fn accepted(m: &Value) -> Mod {
    match parse(m) {
        Ok(m) => m,
        Err(ps) => panic!("expected the mod to be accepted, but: {ps:#?}"),
    }
}

/// Asserts the mod is rejected with problems at exactly these paths, and
/// returns the problems.
#[track_caller]
pub fn rejected_at(m: &Value, expected: &[&str]) -> Vec<Problem> {
    let r = parse(m);
    let mut want: Vec<String> = expected.iter().map(|s| s.to_string()).collect();
    want.sort();
    assert!(r.is_err(), "expected the mod to be rejected");
    assert_eq!(paths(&r), want, "problems: {:#?}", r.as_ref().err());
    r.unwrap_err()
}

/// Asserts some problem's message contains each of the texts.
#[track_caller]
pub fn mentions(problems: &[Problem], texts: &[&str]) {
    for t in texts {
        assert!(problems.iter().any(|p| p.message.contains(t)), "no message mentions {t:?}: {problems:#?}");
    }
}

/// A valid StarCraft button with the given overrides.
pub fn sc_button(overrides: Value) -> Value {
    let mut b = serde_json::json!({"position": 1, "icon": 228, "condition": "bf_always", "action": "order_move", "enabled_string": 664, "disabled_string": 0});
    merge(&mut b, overrides);
    b
}

pub fn w2_button(overrides: Value) -> Value {
    let mut b = serde_json::json!({"position": 0, "icon": 83, "condition": "bf_always", "action": "order_move", "string": 400, "highlighted": 2});
    merge(&mut b, overrides);
    b
}

pub fn merge(target: &mut Value, overrides: Value) {
    if let Value::Object(o) = overrides {
        for (k, v) in o {
            if v.is_null() && k.starts_with('-') {
                target.as_object_mut().unwrap().remove(&k[1..]);
            } else {
                target[k] = v;
            }
        }
    }
}

pub fn toy_library() -> axegraft_patcher_core::Library {
    let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/library/toy");
    axegraft_patcher_core::library_files::load_dir(&dir).unwrap()
}
