//! AxeGraft Patcher's game library: what it knows about each supported
//! version, checked and compiled in when the crate is built.

use std::sync::OnceLock;

pub use axegraft_patcher_core::library::*;

/// The library. It's built from compiled-in code the first time it's needed,
/// so nothing is parsed, and mods and other files can't change it.
pub fn library() -> &'static Library {
    static LIBRARY: OnceLock<Library> = OnceLock::new();
    LIBRARY.get_or_init(build)
}

fn build() -> Library {
    generated::build()
}

#[allow(clippy::all, unused_imports, unused_mut)]
mod generated {
    use axegraft_patcher_core::encoding::*;
    use axegraft_patcher_core::game::*;
    use axegraft_patcher_core::library::*;
    use axegraft_patcher_core::vocab::*;
    include!(concat!(env!("OUT_DIR"), "/library.rs"));
}

#[cfg(test)]
mod tests {
    use super::library;
    use axegraft_patcher_core::library_check::check_library;
    use axegraft_patcher_core::library_files::load_dir;
    use std::path::Path;

    /// The plugin builds the library on the game's thread, whose stack is
    /// small. This is an unoptimised build, whose frames are larger still.
    #[test]
    fn building_the_library_fits_a_small_stack() {
        let built = std::thread::Builder::new().stack_size(256 * 1024).spawn(|| library().games.len()).unwrap().join().unwrap();
        assert!(built > 0);
    }

    /// What was compiled in is exactly the data it was built from, with
    /// unreliable entries left out.
    #[test]
    fn compiled_library_matches_its_data() {
        let dir = Path::new(env!("AXEGRAFT_PATCHER_LIBRARY_DATA_DIR"));
        let source = load_dir(dir).unwrap().without_unreliable();
        assert_eq!(*library(), source);
        assert_eq!(check_library(library()), Vec::<String>::new());
        eprintln!("compiled library from {}: {} game(s), {} version(s)", dir.display(), source.games.len(), source.games.iter().map(|g| g.versions.len()).sum::<usize>());
    }
}
