//! Checking the library against real executables, and listing its gaps.
//!
//! Every byte the library expects (button cards, original buttons, status
//! entries, requirement stream references, constants) is compared with the
//! executable file, which is read as it is stored, at its preferred base.
//! Streams are decoded and encoded again, which must give back their bytes.
//! No game file is stored anywhere: the executables are given when the check
//! runs, and a version without one is reported as not checked.

use crate::game::Game;
use crate::library::*;
use crate::pe::{self, Layout};
use crate::plan::{encode_button, Hex};
use crate::stream;
use std::collections::BTreeMap;
use std::path::PathBuf;

/// One sequence of bytes the library expects, and where.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Expected {
    pub what: String,
    pub rva: u32,
    pub bytes: Vec<u8>,
}

/// Everything the library expects of a version's image loaded at `base`.
pub fn expected(g: &GameLibrary, v: &Version, base: u32) -> Vec<Expected> {
    let mut out = Vec::new();
    let mut push = |what: String, rva: u32, bytes: Vec<u8>| out.push(Expected { what, rva, bytes });
    let f = |n: &str| v.functions.get(n).copied().flatten().map_or(0, |r| base.wrapping_add(r));
    let card = v.button_table.card;

    for (e, on) in &v.entries {
        let Some(on) = on else { continue };
        let at = v.button_table.rva + on.number as u32 * card.size();
        let set = v.sets.iter().find(|(_, s)| s.as_ref().is_some_and(|s| s.entries.contains(e)));
        let (count, ptr, set_text) = match set {
            Some((id, Some(s))) => (s.buttons.len() as u32, base.wrapping_add(s.array), format!("set {id}")),
            _ => (0, 0, "no buttons".to_string()),
        };
        let (co, cw) = card.count();
        let count = if cw == 2 { (count as u16).to_le_bytes().to_vec() } else { count.to_le_bytes().to_vec() };
        push(format!("button card {e}: button count ({set_text})"), at + co, count);
        push(format!("button card {e}: button pointer ({set_text})"), at + card.pointer(), ptr.to_le_bytes().to_vec());
        if let Some(q) = card.connected_unit() {
            let n = on.connected_unit.and_then(|q| v.entries.get(&q).copied().flatten()).map_or(0xFFFF, |x| x.number);
            push(format!("button card {e}: connected unit"), at + q, n.to_le_bytes().to_vec());
        }
    }
    for (id, s) in &v.sets {
        let Some(s) = s else { continue };
        for (k, b) in s.buttons.iter().enumerate() {
            let text = match v.button_table.button {
                ButtonLayout::StarCraft => (b.enabled_string.unwrap_or(0), b.disabled_string.unwrap_or(0)),
                ButtonLayout::Warcraft2Bne => (b.string.unwrap_or(0), b.highlighted.unwrap_or(0)),
            };
            let bytes = encode_button(v.button_table.button, b.position, b.icon, f(&b.condition), f(&b.action), b.condition_variable, b.action_variable, text);
            push(format!("set {id} button {k} ({}, {})", b.condition, b.action), s.array + 20 * k as u32, bytes);
        }
    }
    let layout = v.status_table.layout;
    for (i, u) in v.units.iter().enumerate() {
        let at = v.status_table.rva + i as u32 * layout.size();
        for field in layout.fields() {
            let (o, w) = layout.field(*field).unwrap();
            let (name, value) = match field {
                StatusField::DebugId => ("debug ID", u.debug_id.unwrap_or(0)),
                StatusField::Changed => ("status changed function", f(&u.status_changed)),
                StatusField::Display => ("display function", f(&u.display_function)),
                StatusField::Icon => ("icon", u.icon.unwrap_or(0) as u32),
                StatusField::StatsFrame => ("stats frame", u.stats_frame.unwrap_or(0) as u32),
                StatusField::NameString => ("name string", u.name_string.unwrap_or(0) as u32),
            };
            let bytes = value.to_le_bytes()[..w].to_vec();
            let shown = match field {
                StatusField::Changed => format!("{name} {}", u.status_changed),
                StatusField::Display => format!("{name} {}", u.display_function),
                _ => name.to_string(),
            };
            push(format!("unit {i}: {shown}"), at + o, bytes);
        }
    }
    for (t, s) in &v.streams {
        for r in &s.base_refs {
            push(format!("{} requirement stream reference", t.id()), *r, base.wrapping_add(s.rva).to_le_bytes().to_vec());
        }
        for r in &s.plus2_refs {
            push(format!("{} requirement stream reference (+2)", t.id()), *r, base.wrapping_add(s.rva + 2).to_le_bytes().to_vec());
        }
    }
    for c in &g.constants {
        match c.versions.get(&v.id) {
            Some(Availability::Locations { locations, .. }) => {
                for l in locations {
                    push(format!("constant {}", c.name), l.rva, l.expected.clone());
                }
            }
            Some(Availability::Options { sites, .. }) => {
                for s in sites {
                    push(format!("constant {}", c.name), s.rva, s.expected.clone());
                }
            }
            _ => {}
        }
    }
    out
}

/// A difference between the library and the executable.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Difference {
    pub what: String,
    pub rva: u32,
    pub expected: Vec<u8>,
    /// `None` if the file doesn't hold that RVA.
    pub actual: Option<Vec<u8>>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VersionReport {
    pub matched: usize,
    pub differences: Vec<Difference>,
    /// Problems that aren't a single location, such as a stream that doesn't decode.
    pub other: Vec<String>,
}

impl VersionReport {
    pub fn passed(&self) -> bool {
        self.differences.is_empty() && self.other.is_empty()
    }
}

/// Compares a version's library data with its executable file.
pub fn check_file(g: &GameLibrary, v: &Version, file: &[u8]) -> Result<VersionReport, String> {
    let h = pe::headers(file)?;
    let mut report = VersionReport { matched: 0, differences: Vec::new(), other: Vec::new() };
    match pe::identity(file, Layout::File) {
        Ok(id) if id == v.identity => report.matched += 1,
        Ok(id) => report.other.push(format!(
            "identity: the file's PE timestamp {:#x} and product version {:?} aren't {:#x} and {:?}",
            id.timestamp, id.product_version, v.identity.timestamp, v.identity.product_version
        )),
        Err(e) => report.other.push(format!("identity: {e}")),
    }
    for e in expected(g, v, h.image_base) {
        let actual = pe::at_rva(file, &h, Layout::File, e.rva, e.bytes.len() as u32).map(<[u8]>::to_vec);
        if actual.as_deref() == Some(&e.bytes[..]) {
            report.matched += 1;
        } else {
            report.differences.push(Difference { what: e.what, rva: e.rva, expected: e.bytes, actual });
        }
    }
    for (t, s) in &v.streams {
        match pe::at_rva(file, &h, Layout::File, s.rva, s.length) {
            None => report.other.push(format!("{} requirement stream: RVA {:#x} isn't in the file", t.id(), s.rva)),
            Some(b) => match stream::decode(b, &g.opcodes) {
                Ok(records) if stream::encode(&records) == b => report.matched += 1,
                Ok(_) => report.other.push(format!("{} requirement stream: encoding its records doesn't give back its bytes", t.id())),
                Err(e) => report.other.push(format!("{} requirement stream at RVA {:#x}: {e}", t.id(), s.rva)),
            },
        }
    }
    Ok(report)
}

/// The executables a check uses, by game and version.
pub type Executables = BTreeMap<(Game, String), PathBuf>;

/// Reads a list of executables: one per line, `<game> <version> <path>`.
/// Blank lines and lines starting with `#` are ignored.
pub fn parse_executables(text: &str) -> Result<Executables, String> {
    let mut out = BTreeMap::new();
    for (n, line) in text.lines().enumerate() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let mut parts = line.splitn(3, char::is_whitespace);
        let (Some(game), Some(version), Some(path)) = (parts.next(), parts.next(), parts.next()) else {
            return Err(format!("line {}: expected <game> <version> <path>", n + 1));
        };
        let game = Game::from_id(game).ok_or_else(|| format!("line {}: unknown game {game}", n + 1))?;
        out.insert((game, version.to_string()), PathBuf::from(path.trim()));
    }
    Ok(out)
}

/// The outcome of checking every version.
pub struct CheckRun {
    pub lines: Vec<String>,
    pub failed: usize,
    pub not_checked: usize,
}

/// Checks every version of the library that has an executable, and reports
/// the others as not checked.
pub fn check_all(lib: &Library, exes: &Executables) -> CheckRun {
    let mut run = CheckRun { lines: Vec::new(), failed: 0, not_checked: 0 };
    for g in &lib.games {
        for v in &g.versions {
            let name = format!("{} {}", g.game.id(), v.id);
            let Some(path) = exes.get(&(g.game, v.id.clone())) else {
                run.not_checked += 1;
                run.lines.push(format!("{name}: not checked: no executable was given"));
                continue;
            };
            let file = match std::fs::read(path) {
                Ok(f) => f,
                Err(e) => {
                    run.not_checked += 1;
                    run.lines.push(format!("{name}: not checked: {} can't be read: {e}", path.display()));
                    continue;
                }
            };
            match check_file(g, v, &file) {
                Err(e) => {
                    run.failed += 1;
                    run.lines.push(format!("{name}: FAILED: {} isn't usable: {e}", path.display()));
                }
                Ok(r) if r.passed() => run.lines.push(format!("{name}: passed: {} checks match {}", r.matched, path.display())),
                Ok(r) => {
                    run.failed += 1;
                    run.lines.push(format!("{name}: FAILED: {} difference(s), {} other problem(s), {} checks match {}", r.differences.len(), r.other.len(), r.matched, path.display()));
                    for d in &r.differences {
                        let actual = d.actual.as_deref().map_or("nothing, it's outside the file".to_string(), |a| Hex(a).to_string());
                        run.lines.push(format!("  {}: RVA {:#x}: expected {}, found {actual}", d.what, d.rva, Hex(&d.expected)));
                    }
                    for o in &r.other {
                        run.lines.push(format!("  {o}"));
                    }
                }
            }
        }
    }
    for ((game, version), path) in exes {
        if lib.game(*game).and_then(|g| g.version(version)).is_none() {
            run.lines.push(format!("{} {version}: not checked: it isn't a supported version ({})", game.id(), path.display()));
        }
    }
    run
}

/// Every constant that's `unknown` or `not_applicable` somewhere, per
/// constant and per version.
pub fn coverage(lib: &Library) -> Vec<String> {
    let mut out = Vec::new();
    for g in &lib.games {
        let mut gaps = 0;
        for c in &g.constants {
            for v in &g.versions {
                let state = match c.versions.get(&v.id) {
                    Some(Availability::Unknown) => "unknown",
                    Some(Availability::NotApplicable) => "not_applicable",
                    None => "missing",
                    _ => continue,
                };
                gaps += 1;
                out.push(format!("{} {}: {}: {state}", g.game.id(), v.id, c.name));
            }
        }
        let cells = g.constants.len() * g.versions.len();
        out.push(format!("{}: {} of {cells} constant entries have locations, {gaps} don't", g.game.id(), cells - gaps));
    }
    out
}
