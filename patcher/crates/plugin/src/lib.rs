#![allow(non_snake_case)] // The crate is named AxeGraftPatcher so the DLL is AxeGraftPatcher.dll.

//! AxeGraft Patcher, an MPQDraft plugin.
//!
//! The Windows-facing parts are compiled only for Windows targets. Everything
//! else is in `axegraft-patcher-core`.

#[cfg(windows)]
mod abi;
#[cfg(windows)]
mod log;
#[cfg(windows)]
mod memory;
#[cfg(windows)]
mod patch;
#[cfg(windows)]
mod remembered;
#[cfg(windows)]
mod text;
#[cfg(windows)]
mod win32;
