//! Planning: turning a validated mod into the exact changes for the running
//! version, or every reason it can't be applied there.
//!
//! The planner reads memory but never writes it. A plan lists every location
//! to write, with the bytes expected there and the new bytes, and the new
//! memory to allocate for button sets and requirement streams. The applier
//! carries it out. This way nothing is written unless the whole mod can be.

use crate::game::{Game, ReqType, VarKind};
use crate::library::*;
use crate::memory::Memory;
use crate::model::*;
use crate::problem::Problem;
use crate::stream::{self, Record, Word};
use std::collections::{BTreeMap, BTreeSet};
use std::fmt;

/// New memory to allocate.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Blob {
    pub what: String,
    pub bytes: Vec<u8>,
}

/// What a write puts at its location.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum New {
    Bytes(Vec<u8>),
    /// The address of a blob, plus an offset into it, as 4 bytes.
    Pointer { blob: usize, offset: u32 },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Write {
    pub rva: u32,
    /// The bytes there in the unmodified version.
    pub expected: Vec<u8>,
    pub new: New,
}

/// One change the mod makes, with every location it writes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Change {
    pub what: String,
    pub writes: Vec<Write>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SkipReason {
    Unknown,
    NotApplicable,
}

impl SkipReason {
    pub fn id(self) -> &'static str {
        match self {
            SkipReason::Unknown => "unknown",
            SkipReason::NotApplicable => "not_applicable",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Skip {
    pub constant: String,
    pub reason: SkipReason,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Plan {
    pub game: Game,
    pub version: String,
    /// Where the executable is loaded.
    pub base: u32,
    pub blobs: Vec<Blob>,
    pub changes: Vec<Change>,
    pub skips: Vec<Skip>,
}

impl Plan {
    pub fn writes(&self) -> impl Iterator<Item = &Write> {
        self.changes.iter().flat_map(|c| c.writes.iter())
    }
}

/// A button as a layout stores it. `text` is StarCraft's enabled and
/// disabled strings, or Warcraft II's string and highlighted order.
#[allow(clippy::too_many_arguments)]
pub fn encode_button(layout: ButtonLayout, position: u16, icon: u16, condition: u32, action: u32, condition_variable: u16, action_variable: u16, text: (u16, u16)) -> Vec<u8> {
    let mut out = vec![0u8; 20];
    out[0..2].copy_from_slice(&position.to_le_bytes());
    out[2..4].copy_from_slice(&icon.to_le_bytes());
    out[4..8].copy_from_slice(&condition.to_le_bytes());
    out[8..12].copy_from_slice(&action.to_le_bytes());
    out[12] = condition_variable as u8;
    match layout {
        ButtonLayout::StarCraft => out[14..16].copy_from_slice(&action_variable.to_le_bytes()),
        ButtonLayout::Warcraft2Bne => out[13] = action_variable as u8,
    }
    let (a, b) = match layout {
        ButtonLayout::StarCraft => (16, 18),
        ButtonLayout::Warcraft2Bne => (14, 16),
    };
    out[a..a + 2].copy_from_slice(&text.0.to_le_bytes());
    out[b..b + 2].copy_from_slice(&text.1.to_le_bytes());
    out
}

/// "1 button", "2 buttons".
pub fn count(n: usize, one: &str, many: &str) -> String {
    format!("{n} {}", if n == 1 { one } else { many })
}

/// Bytes in hex, as the log and messages show them.
pub struct Hex<'a>(pub &'a [u8]);

impl fmt::Display for Hex<'_> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        for (i, b) in self.0.iter().enumerate() {
            if i > 0 {
                f.write_str(" ")?;
            }
            write!(f, "{b:02X}")?;
        }
        Ok(())
    }
}

struct Planner<'a> {
    input: &'a str,
    g: &'a GameLibrary,
    v: &'a Version,
    base: u32,
    problems: Vec<Problem>,
    blobs: Vec<Blob>,
    changes: Vec<Change>,
    skips: Vec<Skip>,
}

/// A set as a table entry holds it: its button count, and where its buttons are.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Target {
    /// An address in the executable, as stored.
    Address(u32),
    Blob(usize),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Held {
    count: u32,
    target: Target,
}

const NO_BUTTONS: Held = Held { count: 0, target: Target::Address(0) };

fn le32(v: u32) -> Vec<u8> {
    v.to_le_bytes().to_vec()
}

fn le16(v: u16) -> Vec<u8> {
    v.to_le_bytes().to_vec()
}

/// Plans a mod for the running version. `input` names the mod in problems.
pub fn plan(input: &str, m: &Mod, g: &GameLibrary, v: &Version, mem: &dyn Memory) -> Result<Plan, Vec<Problem>> {
    let mut p = Planner { input, g, v, base: mem.base(), problems: Vec::new(), blobs: Vec::new(), changes: Vec::new(), skips: Vec::new() };
    if m.game != g.game {
        p.problem(format!("The mod is for {}, but the running game is {}.", m.game.title(), g.game.title()));
        return Err(p.problems);
    }
    p.constants(m);
    p.button_sets_and_units(m);
    p.requirements(m, mem);
    p.check_expected(mem);
    if p.problems.is_empty() {
        Ok(Plan { game: g.game, version: v.id.clone(), base: p.base, blobs: p.blobs, changes: p.changes, skips: p.skips })
    } else {
        Err(p.problems)
    }
}

impl Planner<'_> {
    fn problem(&mut self, message: String) {
        self.problems.push(Problem::new(self.input, "", message));
    }

    fn on(&self) -> String {
        format!("{} {}", self.g.game.title(), self.v.id)
    }

    fn change(&mut self, what: String, writes: Vec<Write>) {
        self.changes.push(Change { what, writes });
    }

    fn address(&self, rva: u32) -> u32 {
        self.base.wrapping_add(rva)
    }

    /// The address of a function on this version.
    fn function(&mut self, name: &str) -> Option<u32> {
        match self.v.functions.get(name) {
            Some(Some(rva)) => Some(self.address(*rva)),
            _ => {
                let on = self.on();
                self.problem(format!("{name} doesn't exist on {on}."));
                None
            }
        }
    }

    /// A table entry's number on this version.
    fn entry(&mut self, entry: u16, what: &str) -> Option<u16> {
        match self.v.entries.get(&entry) {
            Some(Some(e)) => Some(e.number),
            _ => {
                let on = self.on();
                self.problem(format!("Table entry {entry}, {what}, doesn't exist on {on}."));
                None
            }
        }
    }

    // ---- Constants

    fn constants(&mut self, m: &Mod) {
        for s in &m.constants {
            let Some(c) = self.g.constant(&s.name) else {
                self.problem(format!("{} has no constant called {}.", self.g.game.title(), s.name));
                continue;
            };
            let what = match &s.value {
                ConstantValue::Value(n) => format!("constant {} = {n}", s.name),
                ConstantValue::Option(o) => format!("constant {} = {o}", s.name),
            };
            match (c.versions.get(&self.v.id), &s.value) {
                (None | Some(Availability::Unknown), _) => self.skips.push(Skip { constant: s.name.clone(), reason: SkipReason::Unknown }),
                (Some(Availability::NotApplicable), _) => self.skips.push(Skip { constant: s.name.clone(), reason: SkipReason::NotApplicable }),
                (Some(Availability::Locations { locations, .. }), ConstantValue::Value(n)) => {
                    let mut writes = Vec::new();
                    for l in locations {
                        match l.encoding.encode(*n) {
                            Some(b) => writes.push(Write { rva: l.rva, expected: l.expected.clone(), new: New::Bytes(b) }),
                            None => {
                                let on = self.on();
                                self.problem(format!("The constant {} can't hold {n} at {:#x} on {on}, which stores {}.", s.name, l.rva, l.encoding));
                            }
                        }
                    }
                    self.change(what, writes);
                }
                (Some(Availability::Options { sites, options, .. }), ConstantValue::Option(o)) => match options.get(o) {
                    Some(bytes) => {
                        let writes = sites.iter().zip(bytes).map(|(site, b)| Write { rva: site.rva, expected: site.expected.clone(), new: New::Bytes(b.clone()) }).collect();
                        self.change(what, writes);
                    }
                    None => {
                        let on = self.on();
                        self.problem(format!("The constant {} has no option {o} on {on}.", s.name));
                    }
                },
                _ => self.problem(format!("The constant {} is given the wrong kind of value.", s.name)),
            }
        }
    }

    // ---- Button sets and table entries

    /// The original set an entry points at on this version.
    fn original_set_of(&self, entry: u16) -> Option<(u16, &SetOnVersion)> {
        self.v.sets.iter().find_map(|(id, s)| s.as_ref().filter(|s| s.entries.contains(&entry)).map(|s| (*id, s)))
    }

    fn held_original(&self, entry: u16) -> Held {
        match self.original_set_of(entry) {
            Some((_, s)) => Held { count: s.buttons.len() as u32, target: Target::Address(self.address(s.array)) },
            None => NO_BUTTONS,
        }
    }

    /// The writes that make a table entry hold a set.
    fn entry_writes(&self, number: u16, held: Held, expected: Held) -> Vec<Write> {
        let card = self.v.button_table.card;
        let at = self.v.button_table.rva + number as u32 * card.size();
        let (co, cw) = card.count();
        let count = |c: u32| if cw == 2 { le16(c as u16) } else { le32(c) };
        let exp_ptr = match expected.target {
            Target::Address(a) => le32(a),
            Target::Blob(_) => unreachable!("an original entry never points at new memory"),
        };
        let new_ptr = match held.target {
            Target::Address(a) => New::Bytes(le32(a)),
            Target::Blob(b) => New::Pointer { blob: b, offset: 0 },
        };
        vec![
            Write { rva: at + co, expected: count(expected.count), new: New::Bytes(count(held.count)) },
            Write { rva: at + card.pointer(), expected: exp_ptr, new: new_ptr },
        ]
    }

    /// A button as the version stores it.
    fn button_bytes(&mut self, b: &Button) -> Option<Vec<u8>> {
        let cond = self.function(&b.condition);
        let act = self.function(&b.action);
        let cv = self.variable(&b.condition, b.condition_variable, true);
        let av = self.variable(&b.action, b.action_variable, false);
        let (cond, act, cv, av) = (cond?, act?, cv?, av?);
        let text = match (self.v.button_table.button, &b.text) {
            (ButtonLayout::StarCraft, ButtonText::StarCraft { enabled_string, disabled_string }) => (*enabled_string, *disabled_string),
            (ButtonLayout::Warcraft2Bne, ButtonText::Warcraft2 { string, highlighted }) => (*string, *highlighted),
            _ => {
                self.problem(format!("A button's fields don't match {}'s button layout.", self.g.game.title()));
                return None;
            }
        };
        Some(encode_button(self.v.button_table.button, b.position, b.icon, cond, act, cv, av, text))
    }

    /// A function's variable, with a table entry in this version's numbering.
    fn variable(&mut self, function: &str, value: u16, condition: bool) -> Option<u16> {
        let list = if condition { &self.g.conditions } else { &self.g.actions };
        let kind = list.iter().find(|f| f.name == function).and_then(|f| f.variable);
        if kind == Some(VarKind::TableEntry) {
            self.entry(value, &format!("opened by a button's {function}"))
        } else {
            Some(value)
        }
    }

    fn button_sets_and_units(&mut self, m: &Mod) {
        // The sets as the mod leaves them: each replaced or new set becomes
        // new memory, and the rest stay as they are.
        let mut resolved: BTreeMap<u16, Held> = BTreeMap::new();
        for s in &m.button_sets {
            let original = s.id < self.g.limits.table_entries;
            if original && !matches!(self.v.sets.get(&s.id), Some(Some(_))) {
                let on = self.on();
                self.problem(format!("Button set {} doesn't exist on {on}.", s.id));
                continue;
            }
            let mut bytes = Vec::new();
            let mut ok = true;
            for b in &s.buttons {
                match self.button_bytes(b) {
                    Some(x) => bytes.extend(x),
                    None => ok = false,
                }
            }
            if !ok {
                continue;
            }
            let blob = self.blobs.len();
            self.blobs.push(Blob { what: format!("button set {} ({})", s.id, count(s.buttons.len(), "button", "buttons")), bytes });
            resolved.insert(s.id, Held { count: s.buttons.len() as u32, target: Target::Blob(blob) });
        }

        let assigned: BTreeSet<u16> = m.units.iter().filter(|u| matches!(u.field, UnitField::ButtonSet(_))).map(|u| u.id).collect();

        // A replaced original set reaches every entry that pointed at it,
        // except entries the mod assigns another set.
        for s in &m.button_sets {
            let (Some(held), Some(Some(orig))) = (resolved.get(&s.id).copied(), self.v.sets.get(&s.id)) else { continue };
            for e in orig.entries.clone() {
                if assigned.contains(&e) {
                    continue;
                }
                let Some(n) = self.entry(e, "of a replaced set") else { continue };
                let w = self.entry_writes(n, held, self.held_original(e));
                self.change(format!("table entry {e}: set {} replaced", s.id), w);
            }
        }

        for u in &m.units {
            match &u.field {
                UnitField::ButtonSet(set) => self.assign(u.id, *set, &resolved),
                UnitField::StatusChanged(f) | UnitField::StatusUpdate(f) => {
                    let field = if matches!(u.field, UnitField::StatusChanged(_)) { StatusField::Changed } else { StatusField::Update };
                    let Some(orig) = self.v.units.get(u.id as usize) else { continue };
                    let orig_name = if field == StatusField::Changed { orig.status_changed.clone() } else { orig.status_update.clone() };
                    let (Some(new), Some(old)) = (self.function(f), self.function(&orig_name)) else { continue };
                    self.status_write(u.id, field, le32(old), le32(new), format!("unit {}: {} = {f}", u.id, u.field.name()));
                }
                UnitField::StatusUnitType(t) => {
                    let old = self.v.units.get(u.id as usize).and_then(|o| o.status_unit_type).unwrap_or(0);
                    self.status_write(u.id, StatusField::UnitType, le32(old), le32(*t as u32), format!("unit {}: status_unit_type = {t}", u.id));
                }
                UnitField::Icon(x) | UnitField::StatsFrame(x) | UnitField::NameString(x) => {
                    let orig = self.v.units.get(u.id as usize);
                    let (field, old) = match u.field {
                        UnitField::Icon(_) => (StatusField::Icon, orig.and_then(|o| o.icon)),
                        UnitField::StatsFrame(_) => (StatusField::StatsFrame, orig.and_then(|o| o.stats_frame)),
                        _ => (StatusField::NameString, orig.and_then(|o| o.name_string)),
                    };
                    self.status_write(u.id, field, le16(old.unwrap_or(0)), le16(*x), format!("unit {}: {} = {x}", u.id, u.field.name()));
                }
                UnitField::EquivalentEntry(q) => self.equivalent(u.id, *q),
            }
        }
    }

    fn assign(&mut self, entry: u16, set: Option<u16>, resolved: &BTreeMap<u16, Held>) {
        let Some(n) = self.entry(entry, "given a button set") else { return };
        let held = match set {
            None => NO_BUTTONS,
            Some(s) => match resolved.get(&s) {
                Some(h) => *h,
                None => match self.v.sets.get(&s) {
                    Some(Some(orig)) => Held { count: orig.buttons.len() as u32, target: Target::Address(self.address(orig.array)) },
                    _ => {
                        let on = self.on();
                        self.problem(format!("Button set {s}, given to table entry {entry}, doesn't exist on {on}."));
                        return;
                    }
                },
            },
        };
        let w = self.entry_writes(n, held, self.held_original(entry));
        let what = match set {
            Some(s) => format!("table entry {entry}: button_set = {s}"),
            None => format!("table entry {entry}: button_set = none"),
        };
        self.change(what, w);
    }

    fn status_write(&mut self, unit: u16, field: StatusField, expected: Vec<u8>, new: Vec<u8>, what: String) {
        let layout = self.v.status_table.layout;
        let Some((off, _)) = layout.field(field) else {
            self.problem(format!("{}'s status entries have no such field.", self.g.game.title()));
            return;
        };
        let rva = self.v.status_table.rva + unit as u32 * layout.size() + off;
        self.change(what, vec![Write { rva, expected, new: New::Bytes(new) }]);
    }

    fn equivalent(&mut self, unit: u16, q: Option<u16>) {
        let card = self.v.button_table.card;
        let Some(off) = card.equivalent() else {
            self.problem(format!("{}'s table entries have no equivalent entry.", self.g.game.title()));
            return;
        };
        let Some(n) = self.entry(unit, "given an equivalent entry") else { return };
        let new = match q {
            None => Some(0xFFFF),
            Some(e) => self.entry(e, &format!("the equivalent entry of {unit}")),
        };
        let orig = self.v.entries.get(&unit).copied().flatten().and_then(|e| e.equivalent);
        let old = match orig {
            None => 0xFFFF,
            Some(e) => self.v.entries.get(&e).copied().flatten().map_or(0xFFFF, |x| x.number),
        };
        let Some(new) = new else { return };
        let rva = self.v.button_table.rva + n as u32 * card.size() + off;
        let shown = q.map_or("none".to_string(), |e| e.to_string());
        self.change(format!("table entry {unit}: equivalent_entry = {shown}"), vec![Write { rva, expected: le16(old), new: New::Bytes(le16(new)) }]);
    }

    // ---- Requirements

    fn requirements(&mut self, m: &Mod, mem: &dyn Memory) {
        for t in ReqType::ALL {
            let mine: Vec<&Requirement> = m.requirements.iter().filter(|r| r.kind == t).collect();
            if mine.is_empty() {
                continue;
            }
            let Some(s) = self.v.streams.get(&t) else {
                let on = self.on();
                self.problem(format!("There is no {} requirement stream on {on}.", t.title()));
                continue;
            };
            let bytes = match mem.read(s.rva, s.length as usize) {
                Ok(b) => b,
                Err(e) => {
                    self.problem(format!("The {} requirement stream couldn't be read: {e}.", t.title()));
                    continue;
                }
            };
            let mut records = match stream::decode(&bytes, &self.g.opcodes) {
                Ok(r) => r,
                Err(e) => {
                    let on = self.on();
                    self.problem(format!("The {} requirement stream at {:#x} on {on} isn't as expected: {e}. The executable may be modified.", t.title(), s.rva));
                    continue;
                }
            };
            let mut what = Vec::new();
            for r in &mine {
                let mut items = Vec::new();
                for i in &r.list {
                    match i {
                        ListItem::Number(n) => items.push(Word::Num(*n)),
                        ListItem::Opcode(name) => match self.g.opcode(name) {
                            Some(o) => items.push(Word::Op(o.code)),
                            None => self.problem(format!("{} has no opcode called {name}.", self.g.game.title())),
                        },
                    }
                }
                let at = records.iter().position(|x| x.id == r.id);
                match (at, r.list.is_empty()) {
                    (Some(k), true) => {
                        records.remove(k);
                        what.push(format!("{} removed", r.id));
                    }
                    (None, true) => what.push(format!("{} has no record", r.id)),
                    (Some(k), false) => {
                        records[k].items = items;
                        what.push(format!("{} replaced", r.id));
                    }
                    (None, false) => {
                        records.push(Record { id: r.id, items });
                        what.push(format!("{} added", r.id));
                    }
                }
            }
            let new = stream::encode(&records);
            let blob = self.blobs.len();
            self.blobs.push(Blob { what: format!("{} requirement stream ({})", t.title(), count(records.len(), "record", "records")), bytes: new });
            let old = self.address(s.rva);
            let mut writes = Vec::new();
            for r in &s.base_refs {
                writes.push(Write { rva: *r, expected: le32(old), new: New::Pointer { blob, offset: 0 } });
            }
            for r in &s.plus2_refs {
                writes.push(Write { rva: *r, expected: le32(old.wrapping_add(2)), new: New::Pointer { blob, offset: 2 } });
            }
            self.change(format!("{} requirements: {}", t.title(), what.join(", ")), writes);
        }
    }

    // ---- Checks before anything is written

    fn check_expected(&mut self, mem: &dyn Memory) {
        let on = self.on();
        let mut seen: BTreeMap<u32, &str> = BTreeMap::new();
        let mut problems = Vec::new();
        for c in &self.changes {
            for w in &c.writes {
                for k in 0..w.expected.len() as u32 {
                    if let Some(other) = seen.insert(w.rva + k, &c.what) {
                        if other != c.what {
                            problems.push(format!("{} and {other} would both write {:#x}.", c.what, w.rva + k));
                        }
                        break;
                    }
                }
                match mem.read(w.rva, w.expected.len()) {
                    Ok(actual) if actual == w.expected => {}
                    Ok(actual) => problems.push(format!(
                        "{}: the bytes at RVA {:#x} (address {:#x}) should be {} on {on}, but are {}. The executable may be modified.",
                        c.what,
                        w.rva,
                        self.base.wrapping_add(w.rva),
                        Hex(&w.expected),
                        Hex(&actual)
                    )),
                    Err(e) => problems.push(format!("{}: the bytes at RVA {:#x} couldn't be read: {e}.", c.what, w.rva)),
                }
            }
        }
        for m in problems {
            self.problem(m);
        }
    }
}
