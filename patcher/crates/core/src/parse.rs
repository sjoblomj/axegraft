//! Reading a mod: bytes in, a validated [`Mod`] or every problem out.
//!
//! The input is untrusted. Whatever it holds, parsing returns a mod or
//! problems, and never panics. Validation reports every problem it finds
//! rather than stopping at the first, each with a path into the file.

use crate::game::{Game, ReqType, VarKind};
use crate::model::*;
use crate::problem::{Problem, Problems};
use crate::vocab::{ConstantKind, FunctionInfo, Index, OpcodeRole, Range, StatusKind, Vocabulary};
use serde_json::{Map, Value};
use std::collections::BTreeSet;

/// The format versions this AxeGraft Patcher reads.
pub const FORMATS: [i64; 1] = [1];

const PARTS: [&str; 4] = ["units", "button_sets", "requirements", "constants"];

/// Reads and validates a mod for the running game.
///
/// `input` names the file in every problem. `vocab` is the running game's
/// vocabulary: a mod for another game is rejected.
pub fn parse_mod(input: &str, bytes: &[u8], vocab: &Vocabulary) -> Result<Mod, Vec<Problem>> {
    let mut p = Problems::new(input);
    let value = match read_json(bytes) {
        Ok(v) => v,
        Err(message) => {
            p.add("", message);
            return Err(p.list);
        }
    };
    let result = check(&value, vocab, &mut p);
    match result {
        Some(m) if p.is_empty() => Ok(m),
        _ => Err(p.list),
    }
}

/// Reads the game a mod's header names, if it names a known one. This lets a
/// caller with several vocabularies pick the right one.
pub fn peek_game(bytes: &[u8]) -> Option<Game> {
    let v = read_json(bytes).ok()?;
    Game::from_id(v.get("game")?.as_str()?)
}

fn read_json(bytes: &[u8]) -> Result<Value, String> {
    let bytes = bytes.strip_prefix(b"\xEF\xBB\xBF").unwrap_or(bytes);
    if bytes.iter().all(|b| b.is_ascii_whitespace()) {
        return Err("The file is empty, so it isn't an AxeGraft Patcher mod.".into());
    }
    serde_json::from_slice::<Value>(bytes).map_err(|e| {
        let text = e.to_string();
        if text.contains("recursion limit") {
            format!("The file is nested too deeply to be a mod (line {}, column {}).", e.line(), e.column())
        } else {
            format!("The file isn't valid JSON: {text}.")
        }
    })
}

// ---- Value helpers

/// A JSON number as a whole number, if it is one. Numbers written with a
/// fraction of zero, such as `5.0`, count as whole.
fn int(v: &Value) -> Option<i128> {
    let n = v.as_number()?;
    if let Some(i) = n.as_i64() {
        return Some(i as i128);
    }
    if let Some(u) = n.as_u64() {
        return Some(u as i128);
    }
    let f = n.as_f64()?;
    if f.is_finite() && f.fract() == 0.0 && f.abs() < 1e18 {
        Some(f as i128)
    } else {
        None
    }
}

fn type_name(v: &Value) -> &'static str {
    match v {
        Value::Null => "null",
        Value::Bool(_) => "a boolean",
        Value::Number(_) => "a number",
        Value::String(_) => "text",
        Value::Array(_) => "an array",
        Value::Object(_) => "an object",
    }
}

/// A value as it appears in the file, shortened for messages.
fn show(v: &Value) -> String {
    let s = v.to_string();
    if s.chars().count() > 40 {
        let cut: String = s.chars().take(37).collect();
        format!("{cut}...")
    } else {
        s
    }
}

fn idx(path: &str, i: usize) -> String {
    format!("{path}[{i}]")
}

fn field(path: &str, name: &str) -> String {
    if path.is_empty() {
        name.to_string()
    } else {
        format!("{path}.{name}")
    }
}

// ---- The mod as a whole

struct Ctx<'v, 'p> {
    ix: Index<'v>,
    game: Game,
    p: &'p mut Problems,
    defined_sets: BTreeSet<i128>,
}

fn check(value: &Value, vocab: &Vocabulary, p: &mut Problems) -> Option<Mod> {
    let obj = match value.as_object() {
        Some(o) => o,
        None => {
            p.add("", format!("The file isn't an AxeGraft Patcher mod: it holds {}, not a JSON object.", type_name(value)));
            return None;
        }
    };

    // Header.
    match obj.get("patcher") {
        Some(Value::String(s)) if s == "AxeGraft" => {}
        None => p.add("patcher", "The file isn't an AxeGraft Patcher mod: it has no patcher."),
        Some(v) => p.add("patcher", format!("The file isn't an AxeGraft Patcher mod: its patcher is {}, not \"AxeGraft\".", show(v))),
    }
    match obj.get("format") {
        None => p.add("format", "The mod has no format version."),
        Some(v) if int(v).is_some_and(|f| FORMATS.iter().any(|&x| x as i128 == f)) => {}
        Some(v) => p.add(
            "format",
            format!("The mod's format version {} isn't supported. This AxeGraft Patcher reads format {}.", show(v), FORMATS.map(|f| f.to_string()).join(", ")),
        ),
    }
    let game = match obj.get("game") {
        None => {
            p.add("game", "The mod doesn't name its game.");
            None
        }
        Some(v) => match v.as_str().and_then(Game::from_id) {
            Some(g) => Some(g),
            None => {
                p.add("game", format!("The mod's game {} isn't starcraft or warcraft2.", show(v)));
                None
            }
        },
    };
    if let Some(g) = game {
        if g != vocab.game {
            p.add("game", format!("The mod is for {} ({}), but the running game is {} ({}).", g.title(), g.id(), vocab.game.title(), vocab.game.id()));
        }
    }

    // Properties at the top level.
    for (k, v) in obj {
        match k.as_str() {
            "patcher" | "format" | "game" | "labels" => {}
            "mod" => check_info(v, p),
            part if PARTS.contains(&part) => {
                if part == "requirements" && game == Some(Game::Warcraft2) {
                    p.add(part, "A Warcraft II mod can't contain requirements, because the game has no requirement data.");
                } else if !v.is_array() {
                    p.add(part, format!("{part} must be an array of objects, but it's {}.", type_name(v)));
                }
            }
            other => p.add(other, format!("The mod has a property the format doesn't define: {other}.")),
        }
    }
    if header_failed(p) {
        return None;
    }
    let game = game?;

    let mut ctx = Ctx { ix: Index::new(vocab), game, p, defined_sets: BTreeSet::new() };
    let part = |name: &str| -> Vec<(usize, &Map<String, Value>)> {
        let mut out = Vec::new();
        if let Some(Value::Array(a)) = obj.get(name) {
            for (i, e) in a.iter().enumerate() {
                if let Value::Object(o) = e {
                    out.push((i, o));
                }
            }
        }
        out
    };
    for name in PARTS {
        if let Some(Value::Array(a)) = obj.get(name) {
            if name == "requirements" && game == Game::Warcraft2 {
                continue;
            }
            for (i, e) in a.iter().enumerate() {
                if !e.is_object() {
                    ctx.p.add(idx(name, i), format!("Each entry of {name} must be an object, but this is {}.", type_name(e)));
                }
            }
        }
    }
    for (_, e) in part("button_sets") {
        if let Some(id) = e.get("id").and_then(int) {
            ctx.defined_sets.insert(id);
        }
    }

    let units: Vec<_> = part("units").into_iter().map(|(i, e)| check_unit(&mut ctx, e, &idx("units", i))).collect();
    check_unit_duplicates(&mut ctx, &part("units"));

    let sets: Vec<_> = part("button_sets").into_iter().map(|(i, e)| check_button_set(&mut ctx, e, &idx("button_sets", i))).collect();
    check_duplicates(&mut ctx, "button_sets", &part("button_sets"), |e| e.get("id").and_then(int).map(|i| i.to_string()), |e| {
        format!("Button set {} is defined twice in this mod.", show(&e["id"]))
    });

    let reqs: Vec<_> = if game == Game::StarCraft {
        part("requirements").into_iter().map(|(i, e)| check_requirement(&mut ctx, e, &idx("requirements", i))).collect()
    } else {
        Vec::new()
    };
    if game == Game::StarCraft {
        check_duplicates(
            &mut ctx,
            "requirements",
            &part("requirements"),
            |e| match (e.get("type").and_then(Value::as_str), e.get("id").and_then(int)) {
                (Some(t), Some(i)) => Some(format!("{t}:{i}")),
                _ => None,
            },
            |e| {
                let t = e["type"].as_str().and_then(ReqType::from_id).map(|t| t.title()).unwrap_or("?");
                format!("The {t} {} requirement record is defined twice in this mod.", show(&e["id"]))
            },
        );
    }

    let consts: Vec<_> = part("constants").into_iter().map(|(i, e)| check_constant(&mut ctx, e, &idx("constants", i))).collect();
    check_duplicates(&mut ctx, "constants", &part("constants"), |e| e.get("name").and_then(Value::as_str).map(str::to_string), |e| {
        format!("The constant {} is set twice in this mod.", e["name"].as_str().unwrap_or("?"))
    });

    if !ctx.p.is_empty() {
        return None;
    }
    Some(Mod {
        game,
        units: units.into_iter().flatten().flatten().collect(),
        button_sets: sets.into_iter().flatten().collect(),
        requirements: reqs.into_iter().flatten().collect(),
        constants: consts.into_iter().flatten().collect(),
    })
}

fn header_failed(p: &Problems) -> bool {
    p.list.iter().any(|x| x.path == "patcher" || x.path == "format" || x.path == "game")
}

fn check_info(info: &Value, p: &mut Problems) {
    let Some(info) = info.as_object() else {
        p.add("mod", format!("mod must be an object, but it's {}.", type_name(info)));
        return;
    };
    for (f, what) in [("name", "The mod's name"), ("version", "The mod's version")] {
        if let Some(v) = info.get(f) {
            if !v.is_string() {
                p.add(format!("mod.{f}"), format!("{what} must be text, but it's {}.", type_name(v)));
            }
        }
    }
    match info.get("authors") {
        None => {}
        Some(Value::Array(a)) => {
            for (i, v) in a.iter().enumerate() {
                if !v.is_string() {
                    p.add(format!("mod.authors[{i}]"), format!("Each of the mod's authors must be text, but this is {}.", type_name(v)));
                }
            }
        }
        Some(v) => p.add("mod.authors", format!("The mod's authors must be an array of names, but it's {}.", type_name(v))),
    }
}

/// Checks that an object has only the given fields, plus a text `label`.
fn known_fields(ctx: &mut Ctx, e: &Map<String, Value>, allowed: &[&str], path: &str, what: &str) {
    for (k, v) in e {
        if k == "label" {
            if !v.is_string() {
                ctx.p.add(field(path, "label"), format!("A label must be text, but this is {}.", type_name(v)));
            }
            continue;
        }
        if !allowed.contains(&k.as_str()) {
            let other = other_game_field(ctx.game, what, k);
            let note = match other {
                Some(reason) => format!(" {reason}"),
                None => String::new(),
            };
            ctx.p.add(field(path, k), format!("{what} has a field the format doesn't define: {k}.{note}"));
        }
    }
}

/// Explains fields that belong to the other game.
fn other_game_field(game: Game, what: &str, name: &str) -> Option<String> {
    let unit = what.starts_with("A unit entry");
    let reason = match (game, unit, name) {
        (Game::StarCraft, true, "icon") => "StarCraft's status entry has no icon; it's a Warcraft II field.",
        (Game::StarCraft, true, "stats_frame" | "name_string") => "It's a field of Warcraft II's Unit Data, which StarCraft doesn't have.",
        (Game::Warcraft2, true, "status_unit_type") => "Warcraft II's unit data has no such field; it's a StarCraft field.",
        (Game::Warcraft2, true, "equivalent_entry") => "Warcraft II's command list entries have no such field; it's a StarCraft field.",
        (Game::StarCraft, false, "string" | "highlighted") => "It's a field of Warcraft II buttons. StarCraft buttons have enabled_string and disabled_string.",
        (Game::Warcraft2, false, "enabled_string" | "disabled_string") => "It's a field of StarCraft buttons. Warcraft II buttons have string and highlighted.",
        _ => return None,
    };
    Some(reason.to_string())
}

fn check_duplicates(
    ctx: &mut Ctx,
    name: &str,
    entries: &[(usize, &Map<String, Value>)],
    key: impl Fn(&Map<String, Value>) -> Option<String>,
    message: impl Fn(&Map<String, Value>) -> String,
) {
    let mut seen = BTreeSet::new();
    for (i, e) in entries {
        if let Some(k) = key(e) {
            if !seen.insert(k) {
                ctx.p.add(idx(name, *i), message(e));
            }
        }
    }
}

// ---- Shared value checks

/// A whole number in a range, or a problem at `path`.
fn ranged(ctx: &mut Ctx, v: &Value, path: &str, name: &str, r: Range, what: &str) -> Option<i128> {
    match int(v) {
        None => {
            ctx.p.add(path, format!("{name} must be a whole number, but it's {}.", show(v)));
            None
        }
        Some(n) if !r.contains(n) => {
            ctx.p.add(path, format!("{name} {n} is outside {what}, {r}."));
            None
        }
        Some(n) => Some(n),
    }
}

/// A function name from one of the lists, or a problem.
fn function<'v>(ctx: &mut Ctx<'v, '_>, v: &Value, path: &str, field_name: &str, condition: bool) -> Option<&'v FunctionInfo> {
    let what = if condition { "condition" } else { "action" };
    let Some(name) = v.as_str() else {
        ctx.p.add(path, format!("{field_name} must name a {what}, but it's {}.", show(v)));
        return None;
    };
    let list = if condition { &ctx.ix.conditions } else { &ctx.ix.actions };
    match list.get(name) {
        Some(f) => Some(*f),
        None => {
            ctx.p.add(path, format!("{} has no {what} called \"{name}\".", ctx.game.title()));
            None
        }
    }
}

fn status_function(ctx: &mut Ctx, v: &Value, path: &str, kind: StatusKind) -> Option<String> {
    let Some(name) = v.as_str() else {
        ctx.p.add(path, format!("{} must name a status function, but it's {}.", kind.field(), show(v)));
        return None;
    };
    match ctx.ix.status.get(name) {
        Some(k) if *k == kind => Some(name.to_string()),
        Some(k) => {
            ctx.p.add(path, format!("{} must be a {} function, but \"{name}\" is a {} function.", kind.field(), kind.title(), k.title()));
            None
        }
        None => {
            ctx.p.add(path, format!("{} has no status function called \"{name}\".", ctx.game.title()));
            None
        }
    }
}

// ---- Units

const SC_UNIT_FIELDS: [&str; 5] = ["button_set", "equivalent_entry", "status_changed", "status_update", "status_unit_type"];
const W2_UNIT_FIELDS: [&str; 6] = ["button_set", "icon", "name_string", "stats_frame", "status_changed", "status_update"];

fn unit_fields(game: Game) -> &'static [&'static str] {
    match game {
        Game::StarCraft => &SC_UNIT_FIELDS,
        Game::Warcraft2 => &W2_UNIT_FIELDS,
    }
}

fn check_unit(ctx: &mut Ctx, e: &Map<String, Value>, path: &str) -> Option<Vec<UnitChange>> {
    let before = ctx.p.count();
    let fields = unit_fields(ctx.game);
    let mut allowed = vec!["id"];
    allowed.extend_from_slice(fields);
    known_fields(ctx, e, &allowed, path, "A unit entry");
    let limits = ctx.ix.limits();

    let id = match e.get("id") {
        None => {
            ctx.p.add(path, "A unit entry has no id.");
            None
        }
        Some(v) => match int(v) {
            None => {
                ctx.p.add(field(path, "id"), format!("A unit entry's id must be a whole number, but it's {}.", show(v)));
                None
            }
            Some(n) if !limits.table_entry().contains(n) => {
                ctx.p.add(field(path, "id"), format!("Unit ID {n} is outside the game's button table, {}.", limits.table_entry()));
                None
            }
            Some(n) => Some(n),
        },
    };
    if !e.keys().any(|k| k != "id" && k != "label") {
        let who = match id {
            Some(n) => format!("Unit entry {n}"),
            None => "A unit entry".into(),
        };
        ctx.p.add(path, format!("{who} has nothing to change. Give it at least one of {}.", fields.join(", ")));
    }
    let is_unit = id.is_some_and(|n| limits.unit.contains(n));

    let mut out = Vec::new();
    for &name in fields {
        let Some(v) = e.get(name) else { continue };
        let fp = field(path, name);
        if let Some(n) = id {
            if !is_unit && name != "button_set" {
                ctx.p.add(&fp, format!("Table entry {n} isn't a unit, so only button_set can be set."));
                continue;
            }
        }
        let f = match name {
            "button_set" => set_reference(ctx, v, &fp).map(UnitField::ButtonSet),
            "status_changed" => status_function(ctx, v, &fp, StatusKind::StatusChanged).map(UnitField::StatusChanged),
            "status_update" => status_function(ctx, v, &fp, StatusKind::StatusUpdate).map(UnitField::StatusUpdate),
            "equivalent_entry" => {
                if v.is_null() {
                    Some(UnitField::EquivalentEntry(None))
                } else {
                    match int(v) {
                        None => {
                            ctx.p.add(&fp, format!("equivalent_entry must be a table entry ID, or null for none, but it's {}.", show(v)));
                            None
                        }
                        Some(n) if !limits.table_entry().contains(n) => {
                            ctx.p.add(&fp, format!("equivalent_entry {n} is outside the game's button table, {}.", limits.table_entry()));
                            None
                        }
                        Some(n) => Some(UnitField::EquivalentEntry(Some(n as u16))),
                    }
                }
            }
            "status_unit_type" => ranged(ctx, v, &fp, name, limits.unit, "the unit range").map(|n| UnitField::StatusUnitType(n as u16)),
            "icon" => ranged(ctx, v, &fp, name, limits.icon, "its range").map(|n| UnitField::Icon(n as u16)),
            "name_string" => ranged(ctx, v, &fp, name, limits.string, "its range").map(|n| UnitField::NameString(n as u16)),
            "stats_frame" => match int(v) {
                Some(n @ 0..=3) => Some(UnitField::StatsFrame(n as u16)),
                _ => {
                    ctx.p.add(&fp, format!("stats_frame {} isn't one of 0, 1, 2, 3, the frames of the stats panel graphic.", show(v)));
                    None
                }
            },
            _ => None,
        };
        if let (Some(f), Some(n)) = (f, id) {
            out.push(UnitChange { id: n as u16, field: f });
        }
    }
    (ctx.p.count() == before).then_some(out)
}

/// Two entries for one unit may set different fields, but not the same one.
fn check_unit_duplicates(ctx: &mut Ctx, entries: &[(usize, &Map<String, Value>)]) {
    let mut seen = BTreeSet::new();
    for (i, e) in entries {
        let Some(id) = e.get("id").and_then(int) else { continue };
        for &f in unit_fields(ctx.game) {
            if e.contains_key(f) && !seen.insert((id, f)) {
                ctx.p.add(field(&idx("units", *i), f), format!("Unit {id}'s {f} is set twice in this mod."));
            }
        }
    }
}

/// A unit's `button_set`: an original set, a set the mod defines, or null.
fn set_reference(ctx: &mut Ctx, v: &Value, path: &str) -> Option<Option<u16>> {
    if v.is_null() {
        return Some(None);
    }
    let limits = ctx.ix.limits();
    let Some(n) = int(v) else {
        ctx.p.add(path, format!("A button set must be a set ID, or null for no buttons, but it's {}.", show(v)));
        return None;
    };
    if limits.set_id().contains(n) && ctx.ix.sets.contains(&(n as u16)) {
        return Some(Some(n as u16));
    }
    if limits.new_set().contains(n) {
        if ctx.defined_sets.contains(&n) {
            return Some(Some(n as u16));
        }
        ctx.p.add(path, format!("Set {n} is a new set, but this mod doesn't define it."));
        return None;
    }
    if limits.table_entry().contains(n) {
        let text = ctx.ix.entry_text(n as u16);
        ctx.p.add(path, format!("There's no set {n}: {text}."));
    } else {
        ctx.p.add(path, format!("Set {n} is outside the set range, {}.", limits.set_id()));
    }
    None
}

// ---- Button sets

fn check_button_set(ctx: &mut Ctx, e: &Map<String, Value>, path: &str) -> Option<ButtonSet> {
    let before = ctx.p.count();
    known_fields(ctx, e, &["id", "buttons"], path, "A button set entry");
    let limits = ctx.ix.limits();
    let id = match e.get("id") {
        None => {
            ctx.p.add(path, "A button set entry has no id.");
            None
        }
        Some(v) => match int(v) {
            None => {
                ctx.p.add(field(path, "id"), format!("A button set's id must be a whole number, but it's {}.", show(v)));
                None
            }
            Some(n) if !limits.set_id().contains(n) => {
                ctx.p.add(field(path, "id"), format!("Set ID {n} is outside the set range, {}.", limits.set_id()));
                None
            }
            Some(n) if !ctx.ix.sets.contains(&(n as u16)) && !limits.new_set().contains(n) => {
                let text = ctx.ix.entry_text(n as u16);
                ctx.p.add(field(path, "id"), format!("There's no original set {n}: {text}. New sets start at {}.", limits.table_entries));
                None
            }
            Some(n) => Some(n as u16),
        },
    };
    let who_set = id.map(|n| n.to_string()).unwrap_or_else(|| "?".into());
    let buttons = match e.get("buttons") {
        None => {
            ctx.p.add(path, format!("Button set {who_set} has no buttons array. Use [] for a set with no buttons."));
            return None;
        }
        Some(Value::Array(a)) => a,
        Some(v) => {
            ctx.p.add(field(path, "buttons"), format!("buttons must be an array of objects, but it's {}.", type_name(v)));
            return None;
        }
    };
    let mut out = Vec::new();
    for (j, b) in buttons.iter().enumerate() {
        let bp = idx(&field(path, "buttons"), j);
        match b.as_object() {
            None => ctx.p.add(&bp, format!("Each button must be an object, but this is {}.", type_name(b))),
            Some(o) => {
                if let Some(btn) = check_button(ctx, o, &bp, &format!("Button {j} of set {who_set}")) {
                    out.push(btn);
                }
            }
        }
    }

    // The game fills its panel walking the list together with the panel's
    // positions, so positions must not go down.
    let positions: Option<Vec<i128>> = buttons.iter().map(|b| b.get("position").and_then(int)).collect();
    if let Some(pos) = positions {
        if let Some(bad) = (1..pos.len()).find(|&k| pos[k] < pos[k - 1]) {
            ctx.p.add(
                field(&idx(&field(path, "buttons"), bad), "position"),
                format!(
                    "Set {who_set} isn't in ascending position order: button {bad} is at position {}, after position {}. The game needs each set's buttons sorted by position, lowest first.",
                    pos[bad],
                    pos[bad - 1]
                ),
            );
        }
    }
    let id = id?;
    (ctx.p.count() == before).then_some(ButtonSet { id, buttons: out })
}

fn button_fields(game: Game) -> &'static [&'static str] {
    match game {
        Game::StarCraft => &["position", "icon", "condition", "condition_variable", "action", "action_variable", "enabled_string", "disabled_string"],
        Game::Warcraft2 => &["position", "icon", "condition", "condition_variable", "action", "action_variable", "string", "highlighted"],
    }
}

/// The order flags a Warcraft II button can highlight: none, or one flag.
const HIGHLIGHTED: [i128; 10] = [0, 1, 2, 4, 8, 16, 32, 64, 128, 256];

fn check_button(ctx: &mut Ctx, b: &Map<String, Value>, path: &str, who: &str) -> Option<Button> {
    let before = ctx.p.count();
    let game = ctx.game;
    let fields = button_fields(game);
    known_fields(ctx, b, fields, path, who);
    let limits = ctx.ix.limits();

    for &f in fields {
        if !f.ends_with("_variable") && !b.contains_key(f) {
            ctx.p.add(path, format!("{who} has no {f}."));
        }
    }
    let num = |ctx: &mut Ctx, name: &str, r: Range| b.get(name).and_then(|v| ranged(ctx, v, &field(path, name), name, r, "its range"));
    let position = num(ctx, "position", limits.position);
    let icon = num(ctx, "icon", limits.icon);
    let (s1, s2) = match game {
        Game::StarCraft => (num(ctx, "enabled_string", limits.string), num(ctx, "disabled_string", limits.string)),
        Game::Warcraft2 => {
            let s = num(ctx, "string", limits.string);
            let h = b.get("highlighted").and_then(|v| match int(v) {
                Some(n) if HIGHLIGHTED.contains(&n) => Some(n),
                _ => {
                    ctx.p.add(
                        field(path, "highlighted"),
                        format!("highlighted {} isn't 0 or a single order flag (1, 2, 4, 8, 16, 32, 64, 128 or 256).", show(v)),
                    );
                    None
                }
            });
            (s, h)
        }
    };
    let condition = b.get("condition").and_then(|v| function(ctx, v, &field(path, "condition"), "condition", true));
    let action = b.get("action").and_then(|v| function(ctx, v, &field(path, "action"), "action", false));
    let cv = variable(ctx, b, path, "condition_variable", limits.condition_variable, condition);
    let av = variable(ctx, b, path, "action_variable", limits.action_variable, action);

    if ctx.p.count() != before {
        return None;
    }
    let text = match game {
        Game::StarCraft => ButtonText::StarCraft { enabled_string: s1? as u16, disabled_string: s2? as u16 },
        Game::Warcraft2 => ButtonText::Warcraft2 { string: s1? as u16, highlighted: s2? as u16 },
    };
    Some(Button {
        position: position? as u16,
        icon: icon? as u16,
        condition: condition?.name.clone(),
        condition_variable: cv?,
        action: action?.name.clone(),
        action_variable: av?,
        text,
    })
}

/// A button's variable. It must fit its field, and a function that reads one
/// must be given one of the kind it reads. Left out, it's 0.
fn variable(ctx: &mut Ctx, b: &Map<String, Value>, path: &str, name: &str, field_range: Range, f: Option<&FunctionInfo>) -> Option<u16> {
    let fp = field(path, name);
    let given = match b.get(name) {
        None => None,
        Some(v) => match int(v) {
            None => {
                ctx.p.add(&fp, format!("{name} must be a whole number, but it's {}.", show(v)));
                return None;
            }
            Some(n) if !field_range.contains(n) => {
                ctx.p.add(&fp, format!("{name} {n} doesn't fit its field, {field_range}."));
                return None;
            }
            Some(n) => Some(n),
        },
    };
    let kind = f.and_then(|f| f.variable.map(|k| (f, k)));
    match (given, kind) {
        (None, None) => Some(0),
        (None, Some((f, k))) => {
            ctx.p.add(&fp, format!("{} reads a {}, but {name} is missing.", f.name, k.name()));
            None
        }
        (Some(n), None) => Some(n as u16),
        (Some(n), Some((f, k))) => {
            let r = if k == VarKind::Number { Some(field_range) } else { ctx.ix.limits().of(k) };
            match r {
                Some(r) if !r.contains(n) => {
                    ctx.p.add(&fp, format!("{} reads a {}, and {n} is outside that range, {r}.", f.name, k.name()));
                    None
                }
                _ => Some(n as u16),
            }
        }
    }
}

// ---- Requirements

fn check_requirement(ctx: &mut Ctx, e: &Map<String, Value>, path: &str) -> Option<Requirement> {
    let before = ctx.p.count();
    known_fields(ctx, e, &["type", "id", "list"], path, "A requirement entry");
    let limits = ctx.ix.limits();
    let kind = match e.get("type") {
        None => {
            ctx.p.add(path, "A requirement entry has no type.");
            None
        }
        Some(v) => match v.as_str().and_then(ReqType::from_id) {
            Some(t) => Some(t),
            None => {
                let all: Vec<_> = ReqType::ALL.iter().map(|t| t.id()).collect();
                ctx.p.add(field(path, "type"), format!("A requirement type must be one of {}, but it's {}.", all.join(", "), show(v)));
                None
            }
        },
    };
    let id = match e.get("id") {
        None => {
            ctx.p.add(path, "A requirement entry has no id.");
            None
        }
        Some(v) => match (int(v), kind) {
            (None, _) => {
                ctx.p.add(field(path, "id"), format!("A requirement entry's id must be a whole number, but it's {}.", show(v)));
                None
            }
            (Some(n), Some(t)) => match limits.of(t.id_kind()) {
                Some(r) if r.contains(n) => Some(n as u16),
                Some(r) => {
                    ctx.p.add(field(path, "id"), format!("The {} ID {n} is outside its range, {r}.", t.title()));
                    None
                }
                None => {
                    ctx.p.add(field(path, "id"), format!("{} has no {} IDs.", ctx.game.title(), t.id_kind().name()));
                    None
                }
            },
            (Some(_), None) => None,
        },
    };
    let list = match e.get("list") {
        None => {
            ctx.p.add(path, "A requirement entry has no list. Use [] for no requirements.");
            return None;
        }
        Some(Value::Array(a)) => a,
        Some(v) => {
            ctx.p.add(field(path, "list"), format!("list must be a flat array of opcode names and numbers, but it's {}.", type_name(v)));
            return None;
        }
    };
    let lp = field(path, "list");
    let mut flat = true;
    for (k, t) in list.iter().enumerate() {
        if !t.is_string() && !t.is_number() {
            ctx.p.add(idx(&lp, k), format!("A list holds only opcode names and numbers, but this is {}.", type_name(t)));
            flat = false;
        }
    }
    if !flat {
        return None;
    }
    for (index, message) in list_problems(&ctx.ix, kind, list) {
        let at = match index {
            Some(k) => idx(&lp, k),
            None => lp.clone(),
        };
        ctx.p.add(at, message);
    }
    if ctx.p.count() != before {
        return None;
    }
    let items = list
        .iter()
        .map(|t| match t {
            Value::String(s) => ListItem::Opcode(s.clone()),
            other => ListItem::Number(int(other).unwrap_or(0) as u16),
        })
        .collect();
    Some(Requirement { kind: kind?, id: id?, list: items })
}

/// The problems of a flat requirement list, each with the index of the item
/// it's about, or `None` for the list as a whole.
///
/// The game's checker relies on this shape: an upgrade's levels come after its
/// other conditions, once each and in order, and every level but the last ends
/// with `end_sublist`, because the game scans for each level's block from the
/// first level, and two end markers in a row end its index of the stream.
fn list_problems(ix: &Index, kind: Option<ReqType>, list: &[Value]) -> Vec<(Option<usize>, String)> {
    let mut out = Vec::new();
    let limits = ix.limits();
    let levels = &ix.levels;
    let mut level_open = false;
    let mut next_level = 0usize;
    let mut seen: BTreeSet<&str> = BTreeSet::new();
    let mut after_end = false;
    let mut at_start = true;
    let mut last_or: Option<usize> = None;
    let mut pending: Option<(usize, &crate::vocab::OpcodeInfo)> = None;

    for (k, t) in list.iter().enumerate() {
        if let Some((pk, op)) = pending.take() {
            if t.is_number() {
                let param = op.parameter.unwrap_or(VarKind::Number);
                match int(t) {
                    None => out.push((Some(k), format!("{} needs a whole number, but it's {}.", op.name, show(t)))),
                    Some(n) => {
                        let r = limits.of(param).unwrap_or(Range::new(0, 65535));
                        if !r.contains(n) {
                            out.push((Some(k), format!("{} takes a {}, and {n} is outside that range, {r}.", op.name, param.name())));
                        }
                    }
                }
                continue;
            }
            out.push((Some(pk), format!("{} needs a {} after it.", op.name, op.parameter.map(|p| p.name()).unwrap_or("number"))));
        }
        let expected = levels.get(next_level).copied();
        if after_end {
            after_end = false;
            let is_level = t.as_str().is_some_and(|s| levels.contains(&s));
            if !is_level {
                out.push((Some(k), format!("Only {} can follow the end of a level.", expected.unwrap_or("a level"))));
            }
        }
        if t.is_number() {
            match int(t) {
                None => out.push((Some(k), format!("A unit ID must be a whole number, but it's {}.", show(t)))),
                Some(n) if !limits.unit.contains(n) => {
                    out.push((Some(k), format!("Unit {n} is outside the unit range, {}.", limits.unit)));
                }
                _ => {}
            }
            at_start = false;
            last_or = None;
            continue;
        }
        let name = t.as_str().unwrap_or("");
        let Some(op) = ix.opcodes.get(name).copied() else {
            out.push((Some(k), format!("{} has no opcode called \"{name}\".", ix.vocab.game.title())));
            at_start = false;
            last_or = None;
            continue;
        };
        if let Some(kind) = kind {
            if !op.allowed_in.contains(&kind) {
                out.push((Some(k), format!("{} can't be used in a {} record.", op.name, kind.title())));
            }
        }
        match op.role {
            OpcodeRole::Or => {
                if at_start {
                    out.push((Some(k), format!("or can't start a {}.", if level_open { "level" } else { "list" })));
                } else if last_or.is_some() {
                    out.push((Some(k), "or can't follow another or.".into()));
                }
                last_or = Some(k);
            }
            OpcodeRole::Level => {
                if let Some(o) = last_or {
                    out.push((Some(o), "or can't end a list or level.".into()));
                }
                if level_open {
                    out.push((Some(k), format!("{} starts a level before the previous level has ended.", op.name)));
                } else if Some(op.name.as_str()) != expected {
                    out.push((
                        Some(k),
                        match expected {
                            Some(x) => format!("Levels come once each, in order: {x} should be here, not {}.", op.name),
                            None => format!("{} comes after the last level.", op.name),
                        },
                    ));
                }
                next_level = levels.iter().position(|l| *l == op.name).map_or(levels.len(), |p| p + 1);
                seen.insert(op.name.as_str());
                level_open = true;
                at_start = true;
                last_or = None;
            }
            OpcodeRole::EndSublist => {
                if let Some(o) = last_or {
                    out.push((Some(o), "or can't end a list or level.".into()));
                }
                if !level_open {
                    out.push((Some(k), format!("{} has no level to end.", op.name)));
                } else if next_level >= levels.len() {
                    out.push((
                        Some(k),
                        format!(
                            "The last level isn't ended with {}: the end of the record ends it, and the game would read this as the end of its list of records.",
                            op.name
                        ),
                    ));
                } else {
                    after_end = true;
                }
                level_open = false;
                at_start = false;
                last_or = None;
            }
            OpcodeRole::Condition => {
                if op.parameter.is_some() {
                    pending = Some((k, op));
                }
                at_start = false;
                last_or = None;
            }
        }
    }
    if let Some((pk, op)) = pending {
        out.push((Some(pk), format!("{} needs a {} after it.", op.name, op.parameter.map(|p| p.name()).unwrap_or("number"))));
    }
    if let Some(o) = last_or {
        out.push((Some(o), "or can't end a list or level.".into()));
    }
    let levels_allowed = match (kind, levels.first()) {
        (None, Some(_)) => true,
        (Some(t), Some(first)) => ix.opcodes.get(first).is_some_and(|o| o.allowed_in.contains(&t)),
        (_, None) => false,
    };
    let missing: Vec<_> = levels.iter().filter(|l| !seen.contains(**l)).collect();
    if levels_allowed && !missing.is_empty() && missing.len() < levels.len() {
        out.push((None, format!("A record with upgrade levels needs all {} of them, and {} is missing.", levels.len(), missing[0])));
    }
    out
}

// ---- Constants

fn check_constant(ctx: &mut Ctx, e: &Map<String, Value>, path: &str) -> Option<ConstantSetting> {
    let before = ctx.p.count();
    known_fields(ctx, e, &["name", "value", "option"], path, "A constant entry");
    let name = match e.get("name") {
        None => {
            ctx.p.add(path, "A constant entry has no name.");
            return None;
        }
        Some(Value::String(s)) => s,
        Some(v) => {
            ctx.p.add(field(path, "name"), format!("A constant's name must be text, but it's {}.", show(v)));
            return None;
        }
    };
    let Some(c) = ctx.ix.constants.get(name.as_str()).copied() else {
        ctx.p.add(field(path, "name"), format!("{} has no constant called \"{name}\".", ctx.game.title()));
        return None;
    };
    let (value, option) = (e.get("value"), e.get("option"));
    if value.is_some() && option.is_some() {
        ctx.p.add(path, format!("The constant {name} has both a value and an option. Give exactly one."));
        return None;
    }
    let setting = match &c.kind {
        ConstantKind::Number { min, max } => {
            let r = Range::new(*min, *max);
            if option.is_some() {
                ctx.p.add(field(path, "option"), format!("The constant {name} is a number, so it takes a value, not an option."));
                None
            } else {
                match value {
                    None => {
                        ctx.p.add(path, format!("The constant {name} has no value."));
                        None
                    }
                    Some(v) => match int(v) {
                        None => {
                            ctx.p.add(field(path, "value"), format!("The constant {name} must be a whole number, but it's {}.", show(v)));
                            None
                        }
                        Some(n) if !r.contains(n) => {
                            ctx.p.add(field(path, "value"), format!("The constant {name} is {n}, outside its range, {r}."));
                            None
                        }
                        Some(n) => Some(ConstantValue::Value(n as i64)),
                    },
                }
            }
        }
        ConstantKind::Options { options } => {
            if value.is_some() {
                ctx.p.add(field(path, "value"), format!("The constant {name} is a choice of options, so it takes an option, not a value."));
                None
            } else {
                match option {
                    None => {
                        ctx.p.add(path, format!("The constant {name} has no option."));
                        None
                    }
                    Some(Value::String(o)) if options.contains(o) => Some(ConstantValue::Option(o.clone())),
                    Some(v) => {
                        ctx.p.add(field(path, "option"), format!("The constant {name} has no option {}. Its options are {}.", show(v), options.join(", ")));
                        None
                    }
                }
            }
        }
    };
    if ctx.p.count() != before {
        return None;
    }
    Some(ConstantSetting { name: name.clone(), value: setting? })
}
