//! The game library's schema: what AxeGraft Patcher knows about each
//! supported version.
//!
//! Every difference between versions is data here, so the planner has no
//! per-version logic. Addresses are RVAs, `u32`, relative to wherever the
//! executable is loaded. The library is validated and compiled into the
//! plugin when it is built; see [`crate::library_check`].

use crate::encoding::Encoding;
use crate::game::{Game, ReqType, VarKind};
use crate::vocab::{ConstantInfo, ConstantKind, FunctionInfo, Limits, OpcodeInfo, OpcodeRole, SetInfo, StatusFunctionInfo, Vocabulary};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

/// The versions the schema can describe. Others, such as Warcraft II for DOS,
/// can't be supported.
pub fn known_versions(game: Game) -> &'static [&'static str] {
    match game {
        Game::StarCraft => &[
            "1.05", "1.06", "1.07", "1.08", "1.08b", "1.09", "1.09b", "1.10", "1.11", "1.11b", "1.12", "1.12b", "1.13", "1.13b", "1.13c", "1.13d", "1.13e",
            "1.13f", "1.14", "1.15.0", "1.15.1", "1.15.2", "1.15.3", "1.16", "1.16.1", "1.17",
        ],
        Game::Warcraft2 => &["2.00", "2.02"],
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Library {
    pub games: Vec<GameLibrary>,
}

/// One game: its game-level facts and its supported versions.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GameLibrary {
    pub game: Game,
    pub limits: Limits,
    pub conditions: Vec<FunctionInfo>,
    pub actions: Vec<FunctionInfo>,
    pub status_functions: Vec<StatusFunctionInfo>,
    /// StarCraft's requirement opcodes. Empty for Warcraft II.
    #[serde(default)]
    pub opcodes: Vec<Opcode>,
    #[serde(default)]
    pub constants: Vec<Constant>,
    pub versions: Vec<Version>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Opcode {
    pub name: String,
    /// The word stored in the stream. `end_sublist` is stored as `0xFFFF`.
    pub code: u16,
    pub parameter: Option<VarKind>,
    pub role: OpcodeRole,
    pub allowed_in: Vec<ReqType>,
}

/// How a version identifies itself, in the file and in memory alike.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct Identity {
    /// The PE header's `TimeDateStamp`.
    pub timestamp: u32,
    /// The version resource's fixed product version, most significant part first.
    pub product_version: [u16; 4],
}

/// The layout of a button button card.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all(deserialize = "snake_case"))]
pub enum CardLayout {
    #[serde(rename(deserialize = "starcraft"))]
    /// StarCraft's `TCard`, 12 bytes: `u16` count, padding, `u32` pointer, `u16` connected unit, padding.
    StarCraft,
    /// Warcraft II BNE's command list entry, 8 bytes: `u32` count, `u32` pointer.
    Warcraft2Bne,
}

impl CardLayout {
    pub fn size(self) -> u32 {
        match self {
            CardLayout::StarCraft => 12,
            CardLayout::Warcraft2Bne => 8,
        }
    }
    /// The offset and width of the button count.
    pub fn count(self) -> (u32, usize) {
        match self {
            CardLayout::StarCraft => (0, 2),
            CardLayout::Warcraft2Bne => (0, 4),
        }
    }
    pub fn pointer(self) -> u32 {
        4
    }
    /// The connected unit, StarCraft only.
    pub fn connected_unit(self) -> Option<u32> {
        match self {
            CardLayout::StarCraft => Some(8),
            CardLayout::Warcraft2Bne => None,
        }
    }
}

/// The layout of a button.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all(deserialize = "snake_case"))]
pub enum ButtonLayout {
    #[serde(rename(deserialize = "starcraft"))]
    /// StarCraft's `TButton`, 20 bytes.
    StarCraft,
    /// Warcraft II BNE's command, 20 bytes, the last 2 unused.
    Warcraft2Bne,
}

impl ButtonLayout {
    pub fn size(self) -> u32 {
        20
    }
}

/// The layout of a unit's status entry.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all(deserialize = "snake_case"))]
pub enum StatusLayout {
    #[serde(rename(deserialize = "starcraft"))]
    /// StarCraft's `TStatus`, 12 bytes: `u32` unit type, `u32` changed, `u32` update.
    StarCraft,
    /// Warcraft II BNE's Unit Data, 16 bytes: `u16` icon, `u16` stats frame,
    /// `u16` name string, unused `u16`, `u32` changed, `u32` update.
    Warcraft2Bne,
}

/// A field of a status entry, with its offset and width.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum StatusField {
    DebugId,
    Changed,
    Display,
    Icon,
    StatsFrame,
    NameString,
}

impl StatusLayout {
    pub fn size(self) -> u32 {
        match self {
            StatusLayout::StarCraft => 12,
            StatusLayout::Warcraft2Bne => 16,
        }
    }

    pub fn field(self, f: StatusField) -> Option<(u32, usize)> {
        use StatusField::*;
        match (self, f) {
            (StatusLayout::StarCraft, DebugId) => Some((0, 4)),
            (StatusLayout::StarCraft, Changed) => Some((4, 4)),
            (StatusLayout::StarCraft, Display) => Some((8, 4)),
            (StatusLayout::Warcraft2Bne, Icon) => Some((0, 2)),
            (StatusLayout::Warcraft2Bne, StatsFrame) => Some((2, 2)),
            (StatusLayout::Warcraft2Bne, NameString) => Some((4, 2)),
            (StatusLayout::Warcraft2Bne, Changed) => Some((8, 4)),
            (StatusLayout::Warcraft2Bne, Display) => Some((12, 4)),
            _ => None,
        }
    }

    pub fn fields(self) -> &'static [StatusField] {
        use StatusField::*;
        match self {
            StatusLayout::StarCraft => &[DebugId, Changed, Display],
            StatusLayout::Warcraft2Bne => &[Icon, StatsFrame, NameString, Changed, Display],
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct ButtonTable {
    pub rva: u32,
    /// The number of entries on this version.
    pub entries: u16,
    pub card: CardLayout,
    pub button: ButtonLayout,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct StatusTable {
    pub rva: u32,
    pub layout: StatusLayout,
}

/// A button card of the game's numbering, as it is on one version.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct EntryOnVersion {
    /// The entry's number on this version.
    pub number: u16,
    /// StarCraft: the original connected unit, in the game's numbering, or `None` for `0xFFFF`.
    #[serde(default)]
    pub connected_unit: Option<u16>,
}

/// An original button as stored on a version. StarCraft buttons have
/// `enabled_string` and `disabled_string`, Warcraft II buttons `string` and
/// `highlighted`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OriginalButton {
    pub position: u16,
    pub icon: u16,
    pub condition: String,
    pub condition_variable: u16,
    pub action: String,
    pub action_variable: u16,
    #[serde(default)]
    pub enabled_string: Option<u16>,
    #[serde(default)]
    pub disabled_string: Option<u16>,
    #[serde(default)]
    pub string: Option<u16>,
    #[serde(default)]
    pub highlighted: Option<u16>,
}

/// A button set as it is on one version.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SetOnVersion {
    /// The RVA of the set's array.
    pub array: u32,
    /// The button cards that point at the array, in the game's numbering.
    pub entries: Vec<u16>,
    pub buttons: Vec<OriginalButton>,
}

/// A unit's original status entry. StarCraft units have `debug_id`;
/// Warcraft II units have `icon`, `stats_frame` and `name_string`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UnitOriginal {
    pub status_changed: String,
    pub display_function: String,
    #[serde(default)]
    pub debug_id: Option<u32>,
    #[serde(default)]
    pub icon: Option<u16>,
    #[serde(default)]
    pub stats_frame: Option<u16>,
    #[serde(default)]
    pub name_string: Option<u16>,
}

/// A StarCraft requirement stream on one version.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Stream {
    pub rva: u32,
    /// The stream's length in bytes, up to and including its final `0xFFFF`.
    pub length: u32,
    /// Where code holds the stream's address. Each is a 4-byte pointer.
    pub base_refs: Vec<u32>,
    /// Where code holds the address of the first record, the stream's address plus 2.
    pub plus2_refs: Vec<u32>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Version {
    pub id: String,
    pub identity: Identity,
    pub button_table: ButtonTable,
    pub status_table: StatusTable,
    /// Every button card of the game's numbering: its number here, or `None`
    /// if this version lacks it.
    pub entries: BTreeMap<u16, Option<EntryOnVersion>>,
    /// Every set of the game's numbering, or `None` if this version lacks it.
    pub sets: BTreeMap<u16, Option<SetOnVersion>>,
    /// The original status entry of each unit, by unit ID.
    pub units: Vec<UnitOriginal>,
    /// Every condition, action and status function: its RVA, or `None` if
    /// this version lacks it.
    pub functions: BTreeMap<String, Option<u32>>,
    /// StarCraft's five requirement streams. Empty for Warcraft II.
    #[serde(default)]
    pub streams: BTreeMap<ReqType, Stream>,
}

/// One place a numeric constant is stored.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Location {
    pub rva: u32,
    pub encoding: Encoding,
    /// The stored scale, for checking that it's the same everywhere. A value
    /// is always written as the mod gives it.
    #[serde(default = "one")]
    pub scale: u32,
    /// The bytes there in the unmodified version.
    pub expected: Vec<u8>,
}

fn one() -> u32 {
    1
}

/// One place an option constant writes, and the bytes there originally.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Site {
    pub rva: u32,
    pub expected: Vec<u8>,
}

/// What the source data says about how reliable an entry is.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct Reliability {
    /// The source marks the entry as unconfirmed.
    #[serde(default)]
    pub unconfirmed: bool,
    /// The value is known to be stored in more places than are listed.
    #[serde(default)]
    pub incomplete: bool,
}

impl Reliability {
    pub fn is_reliable(self) -> bool {
        !self.unconfirmed && !self.incomplete
    }
}

/// A constant on one version.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all(deserialize = "snake_case"))]
pub enum Availability {
    /// The code doesn't exist on this version.
    NotApplicable,
    /// The locations haven't been found.
    Unknown,
    /// A numeric constant's locations, all of which are written.
    Locations {
        locations: Vec<Location>,
        #[serde(default)]
        reliability: Reliability,
    },
    /// An option constant's sites, and the bytes each option writes at each
    /// site, in the same order. One option is `original`.
    Options {
        sites: Vec<Site>,
        options: BTreeMap<String, Vec<Vec<u8>>>,
        #[serde(default)]
        reliability: Reliability,
    },
}

impl Availability {
    pub fn reliability(&self) -> Reliability {
        match self {
            Availability::Locations { reliability, .. } | Availability::Options { reliability, .. } => *reliability,
            _ => Reliability::default(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Constant {
    pub name: String,
    pub kind: ConstantKind,
    /// Every supported version of the game.
    pub versions: BTreeMap<String, Availability>,
}

impl Library {
    pub fn game(&self, game: Game) -> Option<&GameLibrary> {
        self.games.iter().find(|g| g.game == game)
    }

    /// The supported version with this identity, if any.
    pub fn identify(&self, identity: &Identity) -> Option<(&GameLibrary, &Version)> {
        self.games.iter().find_map(|g| g.versions.iter().find(|v| v.identity == *identity).map(|v| (g, v)))
    }

    /// The same library with every entry the source doesn't vouch for turned
    /// into `unknown`, so it isn't available to mods.
    pub fn without_unreliable(mut self) -> Library {
        for g in &mut self.games {
            for c in &mut g.constants {
                for a in c.versions.values_mut() {
                    if !a.reliability().is_reliable() {
                        *a = Availability::Unknown;
                    }
                }
            }
        }
        self
    }
}

impl GameLibrary {
    pub fn version(&self, id: &str) -> Option<&Version> {
        self.versions.iter().find(|v| v.id == id)
    }

    pub fn constant(&self, name: &str) -> Option<&Constant> {
        self.constants.iter().find(|c| c.name == name)
    }

    pub fn opcode(&self, name: &str) -> Option<&Opcode> {
        self.opcodes.iter().find(|o| o.name == name)
    }

    /// All function names, conditions first, then actions, then status functions.
    pub fn function_names(&self) -> Vec<&str> {
        self.conditions.iter().map(|f| f.name.as_str()).chain(self.actions.iter().map(|f| f.name.as_str())).chain(self.status_functions.iter().map(|f| f.name.as_str())).collect()
    }

    /// What a mod for this game is validated against. A set belongs to the
    /// vocabulary if any supported version has it; its entries are those
    /// pointing at it on any version.
    pub fn vocabulary(&self) -> Vocabulary {
        let mut sets: BTreeMap<u16, BTreeSet<u16>> = BTreeMap::new();
        for v in &self.versions {
            for (id, s) in &v.sets {
                if let Some(s) = s {
                    sets.entry(*id).or_default().extend(s.entries.iter().copied());
                }
            }
        }
        Vocabulary {
            game: self.game,
            limits: self.limits.clone(),
            conditions: self.conditions.clone(),
            actions: self.actions.clone(),
            status_functions: self.status_functions.clone(),
            opcodes: self.opcodes.iter().map(|o| OpcodeInfo { name: o.name.clone(), parameter: o.parameter, role: o.role, allowed_in: o.allowed_in.clone() }).collect(),
            sets: sets.into_iter().map(|(id, e)| SetInfo { id, entries: e.into_iter().collect() }).collect(),
            constants: self.constants.iter().map(|c| ConstantInfo { name: c.name.clone(), kind: c.kind.clone() }).collect(),
        }
    }
}
