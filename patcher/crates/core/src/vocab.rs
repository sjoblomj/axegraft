//! What a mod is checked against: the game-level facts of one game.
//!
//! A vocabulary doesn't depend on the game version. Whether something exists
//! on the running version is decided later, when the mod is planned. The
//! library produces one vocabulary per game; tests build small ones.

use crate::game::{Game, ReqType, VarKind};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

/// An inclusive range of whole numbers.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Range {
    pub min: i64,
    pub max: i64,
}

impl Range {
    pub const fn new(min: i64, max: i64) -> Range {
        Range { min, max }
    }

    pub fn contains(&self, v: i128) -> bool {
        v >= self.min as i128 && v <= self.max as i128
    }
}

impl std::fmt::Display for Range {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}-{}", self.min, self.max)
    }
}

/// The ranges of the IDs and fields a mod uses.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Limits {
    /// Unit IDs.
    pub unit: Range,
    /// The number of entries in the button table, which is also the first new set ID.
    pub table_entries: u16,
    /// The highest set ID a mod may use.
    pub max_set_id: u16,
    pub tech: Option<Range>,
    pub upgrade: Option<Range>,
    pub order: Option<Range>,
    /// Button positions in the command panel.
    pub position: Range,
    pub icon: Range,
    pub string: Range,
    /// What the button's condition variable field can hold.
    pub condition_variable: Range,
    /// What the button's action variable field can hold.
    pub action_variable: Range,
}

impl Limits {
    pub fn table_entry(&self) -> Range {
        Range::new(0, self.table_entries as i64 - 1)
    }

    pub fn new_set(&self) -> Range {
        Range::new(self.table_entries as i64, self.max_set_id as i64)
    }

    pub fn set_id(&self) -> Range {
        Range::new(0, self.max_set_id as i64)
    }

    /// The range of a kind of ID, if the game has that kind. Numbers have no
    /// range of their own: the field they're in limits them.
    pub fn of(&self, kind: VarKind) -> Option<Range> {
        match kind {
            VarKind::Unit => Some(self.unit),
            VarKind::Tech => self.tech,
            VarKind::Upgrade => self.upgrade,
            VarKind::Order => self.order,
            VarKind::TableEntry => Some(self.table_entry()),
            VarKind::Number => None,
        }
    }
}

/// A condition or action function, and what its variable is.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FunctionInfo {
    pub name: String,
    pub variable: Option<VarKind>,
}

/// The two kinds of status function.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all(deserialize = "snake_case"))]
pub enum StatusKind {
    /// Decides whether the status panel needs redrawing.
    StatusChanged,
    /// Draws the status panel.
    StatusUpdate,
}

impl StatusKind {
    pub fn field(self) -> &'static str {
        match self {
            StatusKind::StatusChanged => "status_changed",
            StatusKind::StatusUpdate => "status_update",
        }
    }

    pub fn title(self) -> &'static str {
        match self {
            StatusKind::StatusChanged => "status changed",
            StatusKind::StatusUpdate => "status update",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StatusFunctionInfo {
    pub name: String,
    pub kind: StatusKind,
}

/// What an opcode does to a requirement list's structure.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all(deserialize = "snake_case"))]
pub enum OpcodeRole {
    /// A condition, which may take a parameter.
    Condition,
    /// Joins the conditions on either side.
    Or,
    /// Starts an upgrade level. Levels come in the order they're listed.
    Level,
    /// Ends an upgrade level.
    EndSublist,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct OpcodeInfo {
    pub name: String,
    pub parameter: Option<VarKind>,
    pub role: OpcodeRole,
    /// The record types whose checker handles this opcode.
    pub allowed_in: Vec<ReqType>,
}

/// An original button set, and the table entries that point at its array.
/// The set's ID is the lowest of them.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SetInfo {
    pub id: u16,
    pub entries: Vec<u16>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all(deserialize = "snake_case"))]
pub enum ConstantKind {
    Number { min: i64, max: i64 },
    Options { options: Vec<String> },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ConstantInfo {
    pub name: String,
    pub kind: ConstantKind,
}

/// The game-level facts a mod is validated against.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Vocabulary {
    pub game: Game,
    pub limits: Limits,
    pub conditions: Vec<FunctionInfo>,
    pub actions: Vec<FunctionInfo>,
    pub status_functions: Vec<StatusFunctionInfo>,
    pub opcodes: Vec<OpcodeInfo>,
    pub sets: Vec<SetInfo>,
    pub constants: Vec<ConstantInfo>,
}

/// Lookups over a vocabulary.
pub(crate) struct Index<'v> {
    pub vocab: &'v Vocabulary,
    pub conditions: BTreeMap<&'v str, &'v FunctionInfo>,
    pub actions: BTreeMap<&'v str, &'v FunctionInfo>,
    pub status: BTreeMap<&'v str, StatusKind>,
    pub opcodes: BTreeMap<&'v str, &'v OpcodeInfo>,
    pub levels: Vec<&'v str>,
    pub sets: BTreeSet<u16>,
    /// For each table entry that points at a set's array, that set.
    pub entry_set: BTreeMap<u16, u16>,
    pub constants: BTreeMap<&'v str, &'v ConstantInfo>,
}

impl<'v> Index<'v> {
    pub fn new(vocab: &'v Vocabulary) -> Self {
        let mut entry_set = BTreeMap::new();
        for s in &vocab.sets {
            for &e in &s.entries {
                entry_set.insert(e, s.id);
            }
        }
        Index {
            vocab,
            conditions: vocab.conditions.iter().map(|f| (f.name.as_str(), f)).collect(),
            actions: vocab.actions.iter().map(|f| (f.name.as_str(), f)).collect(),
            status: vocab.status_functions.iter().map(|f| (f.name.as_str(), f.kind)).collect(),
            opcodes: vocab.opcodes.iter().map(|o| (o.name.as_str(), o)).collect(),
            levels: vocab.opcodes.iter().filter(|o| o.role == OpcodeRole::Level).map(|o| o.name.as_str()).collect(),
            sets: vocab.sets.iter().map(|s| s.id).collect(),
            entry_set,
            constants: vocab.constants.iter().map(|c| (c.name.as_str(), c)).collect(),
        }
    }

    pub fn limits(&self) -> &'v Limits {
        &self.vocab.limits
    }

    /// What an entry of the button table points at, for messages.
    pub fn entry_text(&self, entry: u16) -> String {
        match self.entry_set.get(&entry) {
            Some(s) => format!("entry {entry} uses set {s}"),
            None => format!("entry {entry} has no buttons"),
        }
    }
}
