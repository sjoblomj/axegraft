//! The scenarios of the mod-inputs spec that the core decides.
//!
//! Choosing the file, packing it into SEMPQs and ignoring patch MPQs are the
//! plugin's part, and are tested with it.

mod common;

use axegraft_patcher_core::input::{load_mod, InputError, ModFile};
use common::*;
use serde_json::json;

fn file(path: &str, m: serde_json::Value) -> Result<ModFile, InputError> {
    Ok(ModFile { path: path.into(), bytes: m.to_string().into_bytes() })
}

#[test]
fn mod_file_read() {
    let m = load_mod(file(r"C:\Mods\supply.json", sc_mod(json!({"constants": [{"name": "max_supply", "value": 600}]}))), &sc()).unwrap();
    assert_eq!(m.constants.len(), 1);
}

#[test]
fn mod_file_cant_be_located() {
    let ps = load_mod(Err(InputError::NotLocated), &sc()).unwrap_err();
    assert_eq!(ps.len(), 1);
    assert!(ps[0].message.contains("No mod file was found"), "{ps:?}");
}

#[test]
fn mod_file_cant_be_read() {
    let ps = load_mod(Err(InputError::Unreadable { path: r"C:\Mods\gone.json".into(), reason: "The system cannot find the file specified".into() }), &sc()).unwrap_err();
    assert_eq!(ps.len(), 1);
    assert_eq!(ps[0].input, "gone.json");
    assert!(ps[0].message.contains(r"C:\Mods\gone.json"));
    assert!(ps[0].message.contains("cannot find the file"));
}

#[test]
fn mod_for_another_game() {
    let ps = load_mod(file(r"C:\Mods\orcs.json", w2_mod(json!({}))), &sc()).unwrap_err();
    assert_eq!(ps.len(), 1);
    assert_eq!(ps[0].input, "orcs.json");
    assert_eq!(ps[0].path, "game");
    assert!(ps[0].message.contains("Warcraft II") && ps[0].message.contains("StarCraft"), "{ps:?}");
}

#[test]
fn invalid_mod_names_the_file() {
    let ps = load_mod(file("/home/me/mods/bad.json", sc_mod(json!({"units": [{"id": 300, "button_set": 0}], "constants": [{"name": "gravity", "value": 1}]}))), &sc()).unwrap_err();
    assert_eq!(ps.len(), 2);
    for p in &ps {
        assert_eq!(p.input, "bad.json");
        assert!(p.to_string().starts_with("bad.json: "));
    }
}
