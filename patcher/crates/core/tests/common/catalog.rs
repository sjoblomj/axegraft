//! AxeGraft Editor's catalogs and fixtures, read by tests.
//!
//! The editor is found at `AXEGRAFT_EDITOR`, or next to this repository's
//! `patcher` folder.

use axegraft_patcher_core::game::{Game, ReqType, VarKind};
use axegraft_patcher_core::vocab::*;
use serde_json::Value;
use std::path::{Path, PathBuf};

pub fn editor_dir() -> Option<PathBuf> {
    let dir = match std::env::var_os("AXEGRAFT_EDITOR") {
        Some(d) => PathBuf::from(d),
        None => Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../editor"),
    };
    dir.join("test/fixtures/mods").is_dir().then_some(dir)
}

/// The object passed to `AxeGraft.registerXxx(...)` in a fixture file.
pub fn registered(path: &Path) -> Value {
    let text = std::fs::read_to_string(path).unwrap();
    let start = text.find('(').expect("a register call") + 1;
    let end = text.rfind(')').expect("a closing parenthesis");
    serde_json::from_str(&text[start..end]).unwrap_or_else(|e| panic!("{}: {e}", path.display()))
}

fn range(v: &Value) -> Range {
    Range::new(v["min"].as_i64().unwrap(), v["max"].as_i64().unwrap())
}

fn var_kind(v: &Value) -> Option<VarKind> {
    Some(match v.as_str()? {
        "unit" => VarKind::Unit,
        "tech" => VarKind::Tech,
        "upgrade" => VarKind::Upgrade,
        "order" => VarKind::Order,
        "number" => VarKind::Number,
        "tableEntry" => VarKind::TableEntry,
        other => panic!("unknown variable kind {other}"),
    })
}

/// A vocabulary from an editor catalog.
pub fn vocabulary(cat: &Value) -> Vocabulary {
    let l = &cat["limits"];
    let opt = |k: &str| l.get(k).map(range);
    let functions = |k: &str| -> Vec<FunctionInfo> {
        cat["functions"][k].as_array().unwrap().iter().map(|f| FunctionInfo { name: f["name"].as_str().unwrap().into(), variable: var_kind(&f["variable"]) }).collect()
    };
    let mut status_functions = Vec::new();
    for (k, kind) in [("statusChanged", StatusKind::StatusChanged), ("statusUpdate", StatusKind::StatusUpdate)] {
        for f in cat["functions"][k].as_array().unwrap() {
            status_functions.push(StatusFunctionInfo { name: f["name"].as_str().unwrap().into(), kind });
        }
    }
    let opcodes = cat.get("opcodes").and_then(Value::as_array).map_or(Vec::new(), |ops| {
        ops.iter()
            .map(|o| OpcodeInfo {
                name: o["name"].as_str().unwrap().into(),
                parameter: var_kind(&o["parameter"]),
                role: match o.get("role").and_then(Value::as_str) {
                    None => OpcodeRole::Condition,
                    Some("or") => OpcodeRole::Or,
                    Some("level") => OpcodeRole::Level,
                    Some("endSublist") => OpcodeRole::EndSublist,
                    Some(r) => panic!("unknown role {r}"),
                },
                allowed_in: o["allowedIn"].as_array().unwrap().iter().map(|t| ReqType::from_id(t.as_str().unwrap()).unwrap()).collect(),
            })
            .collect()
    });
    let sets = cat["buttonSets"]
        .as_array()
        .unwrap()
        .iter()
        .map(|s| SetInfo { id: s["id"].as_u64().unwrap() as u16, entries: s["entries"].as_array().unwrap().iter().map(|e| e.as_u64().unwrap() as u16).collect() })
        .collect();
    let constants = cat["constants"]
        .as_array()
        .unwrap()
        .iter()
        .map(|c| ConstantInfo {
            name: c["name"].as_str().unwrap().into(),
            kind: match c["kind"].as_str().unwrap() {
                "number" => ConstantKind::Number { min: c["range"]["min"].as_i64().unwrap(), max: c["range"]["max"].as_i64().unwrap() },
                "option" => ConstantKind::Options { options: c["options"].as_array().unwrap().iter().map(|o| o["name"].as_str().unwrap().into()).collect() },
                k => panic!("unknown constant kind {k}"),
            },
        })
        .collect();
    Vocabulary {
        game: Game::from_id(cat["game"].as_str().unwrap()).unwrap(),
        limits: Limits {
            unit: range(&l["unit"]),
            table_entries: (l["tableEntry"]["max"].as_i64().unwrap() + 1) as u16,
            max_set_id: l["buttonSet"]["max"].as_i64().unwrap() as u16,
            tech: opt("tech"),
            upgrade: opt("upgrade"),
            order: opt("order"),
            position: range(&l["position"]),
            icon: range(&l["icon"]),
            string: range(&l["string"]),
            condition_variable: range(&l["conditionVariable"]),
            action_variable: range(&l["actionVariable"]),
        },
        conditions: functions("conditions"),
        actions: functions("actions"),
        status_functions,
        opcodes,
        sets,
        constants,
    }
}

/// The editor's shipped catalog of a game, as a vocabulary.
pub fn shipped(editor: &Path, game: &str) -> Vocabulary {
    vocabulary(&registered(&editor.join("catalog").join(format!("{game}.js"))))
}
