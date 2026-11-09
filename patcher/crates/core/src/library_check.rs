//! The guarantees the library's data must meet before it can ship.
//!
//! `build.rs` runs these on the real data, so bad data fails the build rather
//! than a game. Each message names the game, the version where it applies,
//! and the entry.

use crate::game::{Game, ReqType};
use crate::library::*;
use crate::vocab::{ConstantKind, StatusKind};
use std::collections::{BTreeMap, BTreeSet};

/// Every problem with the library's data. Empty means it can ship.
pub fn check_library(lib: &Library) -> Vec<String> {
    let mut out = Vec::new();
    let mut games = BTreeSet::new();
    let mut identities: BTreeMap<Identity, String> = BTreeMap::new();
    for g in &lib.games {
        if !games.insert(g.game) {
            out.push(format!("{}: the game is listed twice.", g.game.id()));
        }
        check_game(g, &mut out);
        for v in &g.versions {
            let name = format!("{} {}", g.game.id(), v.id);
            if let Some(other) = identities.insert(v.identity, name.clone()) {
                out.push(format!("{name}: has the same PE timestamp and product version as {other}, so the two can't be told apart."));
            }
        }
    }
    out
}

fn check_game(g: &GameLibrary, out: &mut Vec<String>) {
    let game = g.game.id();
    let mut err = |m: String| out.push(format!("{game}: {m}"));

    // Names.
    let mut names = BTreeSet::new();
    for n in g.function_names() {
        if !names.insert(n) {
            err(format!("function {n}: the name is used twice. Each function needs a name of its own."));
        }
    }
    let mut op_names = BTreeSet::new();
    let mut op_codes = BTreeSet::new();
    for o in &g.opcodes {
        if !op_names.insert(o.name.as_str()) {
            err(format!("opcode {}: the name is used twice.", o.name));
        }
        if !op_codes.insert(o.code) {
            err(format!("opcode {}: its code {:#06x} is used by another opcode.", o.name, o.code));
        }
    }
    if g.game == Game::Warcraft2 && !g.opcodes.is_empty() {
        err("Warcraft II has no requirement data, so it can't have opcodes.".into());
    }
    let mut const_names = BTreeSet::new();
    for c in &g.constants {
        if !const_names.insert(c.name.as_str()) {
            err(format!("constant {}: the name is used twice.", c.name));
        }
        if let ConstantKind::Options { options } = &c.kind {
            if !options.iter().any(|o| o == "original") {
                err(format!("constant {}: an option constant needs an option named original.", c.name));
            }
        }
        if let ConstantKind::Number { min, max } = c.kind {
            if min > max {
                err(format!("constant {}: its range {min}-{max} is empty.", c.name));
            }
        }
    }

    // Versions.
    let mut ids = BTreeSet::new();
    for v in &g.versions {
        if !known_versions(g.game).contains(&v.id.as_str()) {
            err(format!("version {}: isn't a version the library can describe. Supported versions are {}.", v.id, known_versions(g.game).join(", ")));
        }
        if !ids.insert(v.id.as_str()) {
            err(format!("version {}: is listed twice.", v.id));
        }
    }
    drop(err);
    for v in &g.versions {
        let mut verr = |m: String| out.push(format!("{game} {}: {m}", v.id));
        check_version(g, v, &mut verr);
    }
    for c in &g.constants {
        check_constant(g, c, out);
    }
    for v in &g.versions {
        check_shared_locations(g, v, out);
    }
}

fn check_version(g: &GameLibrary, v: &Version, err: &mut dyn FnMut(String)) {
    let sc = g.game == Game::StarCraft;
    let limits = &g.limits;

    // Layouts.
    let layouts_ok = match g.game {
        Game::StarCraft => v.button_table.card == CardLayout::StarCraft && v.button_table.button == ButtonLayout::StarCraft && v.status_table.layout == StatusLayout::StarCraft,
        Game::Warcraft2 => v.button_table.card == CardLayout::Warcraft2Bne && v.button_table.button == ButtonLayout::Warcraft2Bne && v.status_table.layout == StatusLayout::Warcraft2Bne,
    };
    if !layouts_ok {
        err(format!("button table and status table: the layouts aren't {}'s.", g.game.title()));
    }

    // Button cards.
    for id in 0..limits.button_cards {
        if !v.entries.contains_key(&id) {
            err(format!("button card {id}: missing. Every entry must be listed, with its number or as absent."));
        }
    }
    let mut numbers = BTreeMap::new();
    for (id, e) in &v.entries {
        if *id >= limits.button_cards {
            err(format!("button card {id}: is beyond the game's {} entries.", limits.button_cards));
        }
        let Some(e) = e else {
            if limits.unit.contains(*id as i128) {
                err(format!("button card {id}: is a unit, and units are never absent."));
            }
            continue;
        };
        if limits.unit.contains(*id as i128) && e.number != *id {
            err(format!("button card {id}: is a unit, so its number must be {id}, not {}.", e.number));
        }
        if e.number >= v.button_table.entries {
            err(format!("button card {id}: number {} is beyond this version's {} entries.", e.number, v.button_table.entries));
        }
        if let Some(other) = numbers.insert(e.number, *id) {
            err(format!("button cards {other} and {id}: both have number {} on this version.", e.number));
        }
        match (sc, e.connected_unit) {
            (false, Some(_)) => err(format!("button card {id}: Warcraft II entries have no connected unit.")),
            (true, Some(q)) if !matches!(v.entries.get(&q), Some(Some(_))) => err(format!("button card {id}: its connected unit {q} doesn't exist on this version.")),
            _ => {}
        }
    }
    if numbers.len() != v.button_table.entries as usize {
        err(format!("button table: has {} entries, but {} are listed.", v.button_table.entries, numbers.len()));
    }

    // Functions.
    let all: BTreeSet<&str> = g.function_names().into_iter().collect();
    for n in &all {
        if !v.functions.contains_key(*n) {
            err(format!("function {n}: missing. Every function must be listed, with its address or as absent."));
        }
    }
    for n in v.functions.keys() {
        if !all.contains(n.as_str()) {
            err(format!("function {n}: isn't one of the game's functions."));
        }
    }
    let present = |n: &str| matches!(v.functions.get(n), Some(Some(_)));
    let conditions: BTreeSet<&str> = g.conditions.iter().map(|f| f.name.as_str()).collect();
    let actions: BTreeSet<&str> = g.actions.iter().map(|f| f.name.as_str()).collect();
    let status: BTreeMap<&str, StatusKind> = g.status_functions.iter().map(|f| (f.name.as_str(), f.kind)).collect();

    // Sets.
    let mut owner: BTreeMap<u16, u16> = BTreeMap::new();
    let mut used: BTreeSet<&str> = BTreeSet::new();
    for (id, s) in &v.sets {
        let Some(s) = s else { continue };
        if *id >= limits.button_cards {
            err(format!("set {id}: an original set's ID is a button card, below {}.", limits.button_cards));
        }
        match s.entries.iter().min() {
            None => err(format!("set {id}: no button card points at it.")),
            Some(lowest) if lowest != id => err(format!("set {id}: its ID must be the lowest entry pointing at it, which is {lowest}.")),
            _ => {}
        }
        for e in &s.entries {
            if !matches!(v.entries.get(e), Some(Some(_))) {
                err(format!("set {id}: button card {e} points at it but doesn't exist on this version."));
            }
            if let Some(other) = owner.insert(*e, *id) {
                err(format!("set {id}: button card {e} also points at set {other}."));
            }
        }
        if s.buttons.len() > u16::MAX as usize {
            err(format!("set {id}: has too many buttons."));
        }
        for (k, b) in s.buttons.iter().enumerate() {
            let who = format!("set {id} button {k}");
            if !conditions.contains(b.condition.as_str()) {
                err(format!("{who}: {} isn't a condition.", b.condition));
            } else if !present(&b.condition) {
                err(format!("{who}: uses {}, which is absent on this version.", b.condition));
            }
            if !actions.contains(b.action.as_str()) {
                err(format!("{who}: {} isn't an action.", b.action));
            } else if !present(&b.action) {
                err(format!("{who}: uses {}, which is absent on this version.", b.action));
            }
            used.insert(b.condition.as_str());
            used.insert(b.action.as_str());
            let text_ok = if sc {
                b.enabled_string.is_some() && b.disabled_string.is_some() && b.string.is_none() && b.highlighted.is_none()
            } else {
                b.string.is_some() && b.highlighted.is_some() && b.enabled_string.is_none() && b.disabled_string.is_none()
            };
            if !text_ok {
                err(format!("{who}: doesn't have {}'s string fields.", g.game.title()));
            }
        }
    }

    // Units.
    let unit_count = (limits.unit.max + 1) as usize;
    if v.units.len() != unit_count {
        err(format!("units: {} are listed, but the game has {unit_count}.", v.units.len()));
    }
    for (i, u) in v.units.iter().enumerate() {
        for (name, kind) in [(&u.status_changed, StatusKind::StatusChanged), (&u.display_function, StatusKind::DisplayFunction)] {
            match status.get(name.as_str()) {
                None => err(format!("unit {i}: {name} isn't a status function.")),
                Some(k) if *k != kind => err(format!("unit {i}: {name} isn't a {} function.", kind.title())),
                _ if !present(name) => err(format!("unit {i}: uses {name}, which is absent on this version.")),
                _ => {}
            }
            used.insert(name.as_str());
        }
        let fields_ok = if sc {
            u.debug_id.is_some() && u.icon.is_none() && u.stats_frame.is_none() && u.name_string.is_none()
        } else {
            u.debug_id.is_none() && u.icon.is_some() && u.stats_frame.is_some() && u.name_string.is_some()
        };
        if !fields_ok {
            err(format!("unit {i}: doesn't have {}'s status entry fields.", g.game.title()));
        }
    }

    // Names sharing an address: a name the original data doesn't use must be
    // absent, so it can't stand for a function it isn't.
    let mut by_address: BTreeMap<u32, Vec<&str>> = BTreeMap::new();
    for (n, a) in &v.functions {
        if let Some(a) = a {
            by_address.entry(*a).or_default().push(n.as_str());
        }
    }
    for (a, ns) in by_address {
        if ns.len() > 1 {
            for n in &ns {
                if !used.contains(n) {
                    err(format!("function {n}: shares address {a:#x} with {}, but this version's original buttons and units don't use {n}, so it must be absent here.", others(&ns, n)));
                }
            }
        }
    }

    // Streams.
    if sc {
        for t in ReqType::ALL {
            match v.streams.get(&t) {
                None => err(format!("requirement stream {}: missing.", t.id())),
                Some(s) if s.length < 4 || s.length % 2 != 0 => err(format!("requirement stream {}: its length {} isn't a whole number of words, at least 2.", t.id(), s.length)),
                Some(s) if s.base_refs.is_empty() && s.plus2_refs.is_empty() => err(format!("requirement stream {}: no reference to it is listed.", t.id())),
                _ => {}
            }
        }
    } else if !v.streams.is_empty() {
        err("Warcraft II has no requirement streams.".into());
    }
}

fn others(ns: &[&str], n: &str) -> String {
    ns.iter().filter(|x| **x != n).copied().collect::<Vec<_>>().join(", ")
}

fn check_constant(g: &GameLibrary, c: &Constant, out: &mut Vec<String>) {
    let game = g.game.id();
    let versions: BTreeSet<&str> = g.versions.iter().map(|v| v.id.as_str()).collect();
    for v in &versions {
        if !c.versions.contains_key(*v) {
            out.push(format!("{game} {v}: constant {}: has no entry. Give its locations, or say not_applicable or unknown.", c.name));
        }
    }
    let mut scales: BTreeMap<u32, Vec<&str>> = BTreeMap::new();
    for (vid, a) in &c.versions {
        let mut err = |m: String| out.push(format!("{game} {vid}: constant {}: {m}", c.name));
        if !versions.contains(vid.as_str()) {
            err("isn't a supported version of the game.".into());
        }
        let r = a.reliability();
        if r.unconfirmed {
            err("is marked unconfirmed, so it must be left out as unknown.".into());
        }
        if r.incomplete {
            err("has locations that haven't been found, so it must be unknown.".into());
        }
        match (a, &c.kind) {
            (Availability::NotApplicable | Availability::Unknown, _) => {}
            (Availability::Locations { locations, .. }, ConstantKind::Number { min, max }) => {
                if locations.is_empty() {
                    err("lists no locations.".into());
                }
                for l in locations {
                    let at = format!("location {:#x}", l.rva);
                    if !l.encoding.is_valid() {
                        err(format!("{at}: the encoding {:?} isn't valid.", l.encoding));
                        continue;
                    }
                    if l.expected.is_empty() {
                        err(format!("{at}: has no expected bytes."));
                    } else if l.expected.len() != l.encoding.width() {
                        err(format!("{at}: has {} expected bytes, but {} stores {}.", l.expected.len(), l.encoding, l.encoding.width()));
                    }
                    if !l.encoding.fits(*min) || !l.encoding.fits(*max) {
                        let (lo, hi) = l.encoding.range();
                        err(format!("{at}: the range {min}-{max} doesn't fit, because {} holds {lo}-{hi}.", l.encoding));
                    }
                    if l.scale == 0 {
                        err(format!("{at}: the scale can't be 0."));
                    }
                    scales.entry(l.scale).or_default().push(vid.as_str());
                }
            }
            (Availability::Options { sites, options, .. }, ConstantKind::Options { options: names }) => {
                if sites.is_empty() {
                    err("lists no sites.".into());
                }
                for s in sites {
                    if s.expected.is_empty() {
                        err(format!("site {:#x}: has no expected bytes.", s.rva));
                    }
                }
                for n in names {
                    if !options.contains_key(n) {
                        err(format!("option {n}: has no bytes on this version."));
                    }
                }
                for (n, bytes) in options {
                    if !names.contains(n) {
                        err(format!("option {n}: isn't one of the constant's options."));
                    }
                    if bytes.len() != sites.len() {
                        err(format!("option {n}: gives bytes for {} of its {} sites. An option with a site missing makes the constant unknown on this version.", bytes.len(), sites.len()));
                        continue;
                    }
                    for (b, s) in bytes.iter().zip(sites) {
                        if b.len() != s.expected.len() {
                            err(format!("option {n}: site {:#x} has {} bytes, but its expected bytes are {}.", s.rva, b.len(), s.expected.len()));
                        }
                    }
                    if n == "original" && bytes.iter().zip(sites).any(|(b, s)| *b != s.expected) {
                        err("option original: isn't the expected bytes.".into());
                    }
                }
            }
            (Availability::Locations { .. }, _) => err("is an option constant, so it needs sites and options, not locations.".into()),
            (Availability::Options { .. }, _) => err("is a numeric constant, so it needs locations, not options.".into()),
        }
    }
    if scales.len() > 1 {
        let desc: Vec<String> = scales.iter().map(|(s, vs)| format!("scale {s} on {}", dedup(vs).join(", "))).collect();
        out.push(format!("{game}: constant {}: is stored in different scales ({}). Decide how to handle it before it can ship.", c.name, desc.join("; ")));
    }
}

fn dedup<'a>(v: &[&'a str]) -> Vec<&'a str> {
    let s: BTreeSet<&str> = v.iter().copied().collect();
    s.into_iter().collect()
}

/// The bytes each property can write on a version, by RVA.
pub fn written_ranges(g: &GameLibrary, v: &Version) -> Vec<(u32, u32, String)> {
    let mut r = Vec::new();
    for c in &g.constants {
        match c.versions.get(&v.id) {
            Some(Availability::Locations { locations, .. }) => {
                for l in locations {
                    r.push((l.rva, l.rva + l.encoding.width() as u32, format!("constant {}", c.name)));
                }
            }
            Some(Availability::Options { sites, .. }) => {
                for s in sites {
                    r.push((s.rva, s.rva + s.expected.len() as u32, format!("constant {}", c.name)));
                }
            }
            _ => {}
        }
    }
    let card = v.button_table.card;
    for (id, e) in &v.entries {
        let Some(e) = e else { continue };
        let at = v.button_table.rva + e.number as u32 * card.size();
        let (co, cw) = card.count();
        r.push((at + co, at + co + cw as u32, format!("button button card {id}")));
        r.push((at + card.pointer(), at + card.pointer() + 4, format!("button button card {id}")));
        if let Some(q) = card.connected_unit() {
            r.push((at + q, at + q + 2, format!("button button card {id}")));
        }
    }
    let layout = v.status_table.layout;
    for i in 0..v.units.len() as u32 {
        let at = v.status_table.rva + i * layout.size();
        for f in layout.fields() {
            let (o, w) = layout.field(*f).unwrap();
            r.push((at + o, at + o + w as u32, format!("status entry {i}")));
        }
    }
    for (t, s) in &v.streams {
        for a in s.base_refs.iter().chain(&s.plus2_refs) {
            r.push((*a, a + 4, format!("{} requirement stream reference", t.id())));
        }
    }
    r
}

/// The bytes a constant expects at a location on a version.
fn constant_expected<'a>(g: &'a GameLibrary, v: &Version, property: &str, rva: u32) -> Option<&'a [u8]> {
    let c = g.constants.iter().find(|c| property.strip_prefix("constant ") == Some(c.name.as_str()))?;
    match c.versions.get(&v.id)? {
        Availability::Locations { locations, .. } => locations.iter().find(|l| l.rva == rva).map(|l| l.expected.as_slice()),
        Availability::Options { sites, .. } => sites.iter().find(|s| s.rva == rva).map(|s| s.expected.as_slice()),
        _ => None,
    }
}

/// No two properties may write the same bytes, except constants that are
/// stored in exactly the same place on a version.
fn check_shared_locations(g: &GameLibrary, v: &Version, out: &mut Vec<String>) {
    let mut r = written_ranges(g, v);
    r.sort();
    let mut reported = BTreeSet::new();
    for i in 0..r.len() {
        for j in i + 1..r.len() {
            if r[j].0 >= r[i].1 {
                break;
            }
            let (a, b) = (&r[i].2, &r[j].2);
            let same_place = r[i].0 == r[j].0 && r[i].1 == r[j].1;
            if a != b && same_place && constant_expected(g, v, a, r[i].0).is_some_and(|x| Some(x) == constant_expected(g, v, b, r[i].0)) {
                continue;
            }
            if a != b && reported.insert((a.clone(), b.clone())) {
                out.push(format!("{} {}: {a} and {b} overlap at {:#x}. No two properties may write the same bytes.", g.game.id(), v.id, r[j].0));
            } else if a == b && reported.insert((a.clone(), a.clone())) {
                out.push(format!("{} {}: {a} has overlapping locations at {:#x}.", g.game.id(), v.id, r[j].0));
            }
        }
    }
}
