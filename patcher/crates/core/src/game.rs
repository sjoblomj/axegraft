//! Names shared by the mod format and the library.
//!
//! Enums here deserialize from the names the JSON formats use, and serialize
//! with their Rust names, which `build.rs` relies on when it writes the
//! library as Rust code.

use serde::{Deserialize, Serialize};
use std::fmt;

/// A game AxeGraft Patcher can patch.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum Game {
    #[serde(rename(deserialize = "starcraft"))]
    StarCraft,
    #[serde(rename(deserialize = "warcraft2"))]
    Warcraft2,
}

impl Game {
    /// The name a mod uses in its `game` field.
    pub fn id(self) -> &'static str {
        match self {
            Game::StarCraft => "starcraft",
            Game::Warcraft2 => "warcraft2",
        }
    }

    /// The game's name for people.
    pub fn title(self) -> &'static str {
        match self {
            Game::StarCraft => "StarCraft",
            Game::Warcraft2 => "Warcraft II",
        }
    }

    pub fn from_id(id: &str) -> Option<Game> {
        match id {
            "starcraft" => Some(Game::StarCraft),
            "warcraft2" => Some(Game::Warcraft2),
            _ => None,
        }
    }
}

impl fmt::Display for Game {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.title())
    }
}

/// What a function variable or an opcode parameter refers to.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all(deserialize = "snake_case"))]
pub enum VarKind {
    Unit,
    Tech,
    Upgrade,
    Order,
    Number,
    ButtonCard,
}

impl VarKind {
    pub fn name(self) -> &'static str {
        match self {
            VarKind::Unit => "unit",
            VarKind::Tech => "tech",
            VarKind::Upgrade => "upgrade",
            VarKind::Order => "order",
            VarKind::Number => "number",
            VarKind::ButtonCard => "button card",
        }
    }
}

/// The five kinds of requirement record in StarCraft.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all(deserialize = "snake_case"))]
pub enum ReqType {
    Unit,
    Upgrade,
    TechResearch,
    TechUse,
    Order,
}

impl ReqType {
    pub const ALL: [ReqType; 5] = [ReqType::Unit, ReqType::Upgrade, ReqType::TechResearch, ReqType::TechUse, ReqType::Order];

    /// The name a mod uses in a requirement entry's `type`.
    pub fn id(self) -> &'static str {
        match self {
            ReqType::Unit => "unit",
            ReqType::Upgrade => "upgrade",
            ReqType::TechResearch => "tech_research",
            ReqType::TechUse => "tech_use",
            ReqType::Order => "order",
        }
    }

    /// The name for people.
    pub fn title(self) -> &'static str {
        match self {
            ReqType::Unit => "unit",
            ReqType::Upgrade => "upgrade",
            ReqType::TechResearch => "tech research",
            ReqType::TechUse => "tech use",
            ReqType::Order => "order",
        }
    }

    pub fn from_id(id: &str) -> Option<ReqType> {
        ReqType::ALL.into_iter().find(|t| t.id() == id)
    }

    /// The kind of ID the record's own `id` is.
    pub fn id_kind(self) -> VarKind {
        match self {
            ReqType::Unit => VarKind::Unit,
            ReqType::Upgrade => VarKind::Upgrade,
            ReqType::TechResearch | ReqType::TechUse => VarKind::Tech,
            ReqType::Order => VarKind::Order,
        }
    }
}
