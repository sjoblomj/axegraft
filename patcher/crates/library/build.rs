//! Validates the library's data and compiles it into the crate.
//!
//! The data is read from `data/`, or from the folder named by
//! `AXEGRAFT_PATCHER_LIBRARY_DATA`. Entries the source doesn't vouch for are
//! left out as unknown. If the data breaks any of the library's guarantees,
//! the build fails and lists every problem. Otherwise the library is written
//! as Rust code, so nothing is parsed when the game starts.

use axegraft_patcher_core::library_check::check_library;
use axegraft_patcher_core::library_files::{data_files, load_dir};
use axegraft_patcher_core::library::Library;
use std::path::PathBuf;

fn main() {
    println!("cargo:rerun-if-env-changed=AXEGRAFT_PATCHER_LIBRARY_DATA");
    let manifest = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let dir = match std::env::var_os("AXEGRAFT_PATCHER_LIBRARY_DATA") {
        Some(d) => PathBuf::from(d),
        None => manifest.join("data"),
    };
    println!("cargo:rerun-if-changed={}", dir.display());
    for g in ["starcraft", "warcraft2"] {
        println!("cargo:rerun-if-changed={}", dir.join(g).display());
    }
    for f in data_files(&dir) {
        println!("cargo:rerun-if-changed={}", f.display());
    }
    println!("cargo:rustc-env=AXEGRAFT_PATCHER_LIBRARY_DATA_DIR={}", dir.display());

    let lib = match load_dir(&dir) {
        Ok(l) => l,
        Err(errors) => fail("can't be read", &errors),
    };
    let lib = lib.without_unreliable();
    let problems = check_library(&lib);
    if !problems.is_empty() {
        fail("breaks the library's guarantees", &problems);
    }
    let out = PathBuf::from(std::env::var("OUT_DIR").unwrap()).join("library.rs");
    std::fs::write(out, generate(&lib)).unwrap();
}

/// The library as Rust functions. Each version, and each of its sets, gets
/// a function of its own, because one huge expression is slow to compile.
fn generate(lib: &Library) -> String {
    let rust = |v: &dyn erased::Value| v.rust().unwrap_or_else(|e| panic!("the library can't be written as Rust: {e}"));
    let mut out = String::new();
    let mut games = Vec::new();
    for (gi, g) in lib.games.iter().enumerate() {
        let mut versions = Vec::new();
        for (vi, v) in g.versions.iter().enumerate() {
            let name = format!("version_{gi}_{vi}");
            let mut sets = String::new();
            for (si, (id, set)) in v.sets.iter().enumerate() {
                let f = format!("{name}_set_{si}");
                out.push_str(&format!("fn {f}() -> Option<SetOnVersion> {{ {} }}\n", rust(set)));
                sets.push_str(&format!("m.insert({id}, {f}());"));
            }
            let mut rest = v.clone();
            rest.sets = Default::default();
            rest.entries = Default::default();
            rest.units = Default::default();
            rest.functions = Default::default();
            out.push_str(&format!(
                "fn {name}() -> Version {{ let mut v = {}; v.entries = {}; v.units = {}; v.functions = {}; let mut m = ::std::collections::BTreeMap::new(); {sets} v.sets = m; v }}\n",
                rust(&rest),
                rust(&v.entries),
                rust(&v.units),
                rust(&v.functions)
            ));
            versions.push(format!("{name}()"));
        }
        let mut rest = g.clone();
        rest.versions = Vec::new();
        out.push_str(&format!("fn game_{gi}() -> GameLibrary {{ let mut g = {}; g.versions = vec![{}]; g }}\n", rust(&rest), versions.join(",")));
        games.push(format!("game_{gi}()"));
    }
    out.push_str(&format!("pub(crate) fn build() -> Library {{ Library {{ games: vec![{}] }} }}\n", games.join(",")));
    out
}

/// Lets `generate` write values of different types through one closure.
mod erased {
    pub trait Value {
        fn rust(&self) -> Result<String, axegraft_patcher_core::rust_code::Error>;
    }
    impl<T: serde::Serialize> Value for T {
        fn rust(&self) -> Result<String, axegraft_patcher_core::rust_code::Error> {
            axegraft_patcher_core::rust_code::to_rust(self)
        }
    }
}

fn fail(what: &str, problems: &[String]) -> ! {
    for p in problems {
        println!("cargo:warning={p}");
    }
    panic!("The library's data {what}, with {} problem(s):\n{}", problems.len(), problems.join("\n"));
}
