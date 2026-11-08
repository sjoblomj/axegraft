//! Reading the library's data files.
//!
//! The data is a folder with one subfolder per game, named by its `game` ID.
//! Each holds `game.json`, with the game-level facts and the constants, and
//! one file per supported version, named by the version, such as
//! `1.16.1.json`.

use crate::game::Game;
use crate::library::{known_versions, Library};

use serde_json::Value;
use std::path::{Path, PathBuf};

/// Every file the library is read from, for `build.rs` to watch.
pub fn data_files(dir: &Path) -> Vec<PathBuf> {
    let mut out = Vec::new();
    for g in [Game::StarCraft, Game::Warcraft2] {
        if let Ok(rd) = std::fs::read_dir(dir.join(g.id())) {
            for e in rd.flatten() {
                out.push(e.path());
            }
        }
    }
    out.sort();
    out
}

/// Reads the library from its folder. A game without a folder isn't in it.
pub fn load_dir(dir: &Path) -> Result<Library, Vec<String>> {
    let v = load_dir_json(dir)?;
    serde_json::from_value(v).map_err(|e| vec![format!("{}: {e}", dir.display())])
}

/// The library's data as one JSON value, in the form [`Library`] reads.
pub fn load_dir_json(dir: &Path) -> Result<Value, Vec<String>> {
    let mut games = Vec::new();
    let mut errors = Vec::new();
    for g in [Game::StarCraft, Game::Warcraft2] {
        let gdir = dir.join(g.id());
        if !gdir.is_dir() {
            continue;
        }
        let read = |p: &Path| -> Result<Value, String> {
            let text = std::fs::read_to_string(p).map_err(|e| format!("{}: {e}", p.display()))?;
            serde_json::from_str(&text).map_err(|e| format!("{}: {e}", p.display()))
        };
        let mut game = match read(&gdir.join("game.json")) {
            Ok(v) => v,
            Err(e) => {
                errors.push(e);
                continue;
            }
        };
        let mut versions: Vec<(usize, Value)> = Vec::new();
        let mut files: Vec<PathBuf> = std::fs::read_dir(&gdir).map(|rd| rd.flatten().map(|e| e.path()).collect()).unwrap_or_default();
        files.sort();
        for p in files {
            let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("");
            let Some(id) = name.strip_suffix(".json") else {
                errors.push(format!("{}: isn't a .json file.", p.display()));
                continue;
            };
            if id == "game" {
                continue;
            }
            match read(&p) {
                Ok(v) => {
                    if v.get("id").and_then(Value::as_str) != Some(id) {
                        errors.push(format!("{}: the file's name must be its version's id.", p.display()));
                    }
                    let order = known_versions(g).iter().position(|k| *k == id).unwrap_or(usize::MAX);
                    versions.push((order, v));
                }
                Err(e) => errors.push(e),
            }
        }
        versions.sort_by_key(|(o, _)| *o);
        if game.get("game").and_then(Value::as_str) != Some(g.id()) {
            errors.push(format!("{}: its game must be {}.", gdir.join("game.json").display(), g.id()));
        }
        if let Value::Object(m) = &mut game {
            m.insert("versions".into(), Value::Array(versions.into_iter().map(|(_, v)| v).collect()));
        }
        if let Err(e) = serde_json::from_value::<crate::library::GameLibrary>(game.clone()) {
            errors.push(format!("{}: {e}", gdir.display()));
        }
        games.push(game);
    }
    if errors.is_empty() {
        Ok(serde_json::json!({ "games": games }))
    } else {
        Err(errors)
    }
}
