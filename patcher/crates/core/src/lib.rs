//! AxeGraft Patcher's engine.
//!
//! Everything here is plain, safe Rust with no Windows dependencies, so it is
//! tested natively. The plugin crate is a thin layer over it.

#![forbid(unsafe_code)]

/// AxeGraft Patcher's own version, as written in the log header.
pub const PATCHER_VERSION: &str = env!("CARGO_PKG_VERSION");

pub mod apply;
pub mod encoding;
pub mod game;
pub mod input;
pub mod library;
pub mod library_check;
pub mod library_files;
pub mod memory;
pub mod model;
pub mod parse;
pub mod pe;
pub mod plan;
pub mod problem;
pub mod report;
pub mod rust_code;
pub mod stream;
pub mod verify;
pub mod vocab;

pub use game::{Game, ReqType, VarKind};
pub use model::Mod;
pub use parse::parse_mod;
pub use problem::Problem;
pub use vocab::Vocabulary;
pub use library::Library;
