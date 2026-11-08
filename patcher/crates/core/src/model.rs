//! A validated mod.
//!
//! Everything here has passed the format's rules for its game: IDs are in
//! range, names exist in the game's vocabulary, and nothing is defined twice.
//! The `mod` information and all labels are gone, because they have no effect.

use crate::game::{Game, ReqType};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Mod {
    pub game: Game,
    pub units: Vec<UnitChange>,
    pub button_sets: Vec<ButtonSet>,
    pub requirements: Vec<Requirement>,
    pub constants: Vec<ConstantSetting>,
}

/// One field of one table entry. A mod's unit entry with several fields
/// becomes one change for each.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UnitChange {
    /// The entry of the game's button table, in the game's own numbering.
    pub id: u16,
    pub field: UnitField,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum UnitField {
    /// The set to show, or `None` for no buttons.
    ButtonSet(Option<u16>),
    StatusChanged(String),
    StatusUpdate(String),
    /// StarCraft only: the entry treated as the same in a mixed group, or `None` for none.
    EquivalentEntry(Option<u16>),
    /// StarCraft only: the unit ID in the unit's status entry.
    StatusUnitType(u16),
    /// Warcraft II only: the Unit Data icon.
    Icon(u16),
    /// Warcraft II only: the stats panel frame, 0-3.
    StatsFrame(u16),
    /// Warcraft II only: the name string.
    NameString(u16),
}

impl UnitField {
    /// The field's name in the mod format.
    pub fn name(&self) -> &'static str {
        match self {
            UnitField::ButtonSet(_) => "button_set",
            UnitField::StatusChanged(_) => "status_changed",
            UnitField::StatusUpdate(_) => "status_update",
            UnitField::EquivalentEntry(_) => "equivalent_entry",
            UnitField::StatusUnitType(_) => "status_unit_type",
            UnitField::Icon(_) => "icon",
            UnitField::StatsFrame(_) => "stats_frame",
            UnitField::NameString(_) => "name_string",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ButtonSet {
    /// An original set's ID, or a new set's from the table's size up.
    pub id: u16,
    pub buttons: Vec<Button>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Button {
    pub position: u16,
    pub icon: u16,
    pub condition: String,
    pub condition_variable: u16,
    pub action: String,
    pub action_variable: u16,
    pub text: ButtonText,
}

/// The fields that differ between the games.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ButtonText {
    StarCraft { enabled_string: u16, disabled_string: u16 },
    Warcraft2 { string: u16, highlighted: u16 },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Requirement {
    pub kind: ReqType,
    pub id: u16,
    /// Empty for no record.
    pub list: Vec<ListItem>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ListItem {
    Opcode(String),
    /// A parameter, or a bare unit ID.
    Number(u16),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConstantSetting {
    pub name: String,
    pub value: ConstantValue,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConstantValue {
    Value(i64),
    Option(String),
}
