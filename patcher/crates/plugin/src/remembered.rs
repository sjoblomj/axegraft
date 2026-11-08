//! The last mod file chosen, kept for the next MPQDraft session. Not being
//! able to read or write it never stops a mod.

use crate::text;
use std::path::PathBuf;

fn location() -> Option<PathBuf> {
    Some(PathBuf::from(std::env::var_os("APPDATA")?).join("AxeGraft Patcher").join("last-mod.txt"))
}

/// Saves a path, in the ANSI code page and without its NUL.
pub fn save(path: &[u8]) {
    let Some(file) = location() else { return };
    if let Some(folder) = file.parent() {
        let _ = std::fs::create_dir_all(folder);
    }
    let _ = std::fs::write(file, path);
}

/// The saved path, if it's shorter than `limit` and the file still exists.
pub fn load(limit: usize) -> Option<Vec<u8>> {
    let path = std::fs::read(location()?).ok()?;
    let usable = !path.is_empty() && path.len() < limit && !path.contains(&0) && text::path_from_ansi(&path).is_file();
    usable.then_some(path)
}
