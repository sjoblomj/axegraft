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
use std::collections::HashMap;
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

/// The library as Rust functions, each building a small part of it: a
/// compiled-in expression is built on the stack, so one huge expression would
/// overflow it on the game's thread, and is slow to compile. Parts that are
/// the same on several versions, such as button lists, are built by one
/// function.
fn generate(lib: &Library) -> String {
    let rust = |v: &dyn erased::Value| v.rust().unwrap_or_else(|e| panic!("the library can't be written as Rust: {e}"));
    let mut out = Functions::default();
    let mut games = Vec::new();
    for g in &lib.games {
        let mut versions = String::new();
        for v in &g.versions {
            let mut sets = String::new();
            for (id, set) in &v.sets {
                let f = match set {
                    None => out.add("Option<SetOnVersion>", "None".to_string()),
                    Some(s) => {
                        let buttons = out.add("Vec<OriginalButton>", rust(&s.buttons));
                        let mut rest = s.clone();
                        rest.buttons = Vec::new();
                        out.add("Option<SetOnVersion>", format!("let mut s = {}; s.buttons = {buttons}(); Some(s)", rust(&rest)))
                    }
                };
                sets.push_str(&format!("m.insert({id}, {f}());"));
            }
            let entries = out.add("::std::collections::BTreeMap<u16, Option<EntryOnVersion>>", rust(&v.entries));
            let units = out.add("Vec<UnitOriginal>", rust(&v.units));
            let functions = out.add("::std::collections::BTreeMap<String, Option<u32>>", rust(&v.functions));
            let mut rest = v.clone();
            rest.sets = Default::default();
            rest.entries = Default::default();
            rest.units = Default::default();
            rest.functions = Default::default();
            let f = out.add(
                "Version",
                format!("let mut v = {}; v.entries = {entries}(); v.units = {units}(); v.functions = {functions}(); let mut m = ::std::collections::BTreeMap::new(); {sets} v.sets = m; v", rust(&rest)),
            );
            versions.push_str(&format!("g.versions.push({f}());"));
        }
        let mut constants = String::new();
        for c in &g.constants {
            let mut inserts = String::new();
            for (id, a) in &c.versions {
                let f = out.add("Availability", rust(a));
                inserts.push_str(&format!("c.versions.insert({}, {f}());", rust(id)));
            }
            let mut rest = c.clone();
            rest.versions = Default::default();
            let f = out.add("Constant", format!("let mut c = {}; {inserts} c", rust(&rest)));
            constants.push_str(&format!("g.constants.push({f}());"));
        }
        let mut rest = g.clone();
        rest.versions = Vec::new();
        rest.constants = Vec::new();
        games.push(out.add("GameLibrary", format!("let mut g = {}; {constants} {versions} g", rust(&rest))));
    }
    let build: Vec<String> = games.iter().map(|g| format!("{g}()")).collect();
    let mut text = out.text;
    text.push_str(&format!("pub(crate) fn build() -> Library {{ Library {{ games: vec![{}] }} }}\n", build.join(",")));
    text
}

/// The generated functions. A body written twice gets one function.
#[derive(Default)]
struct Functions {
    text: String,
    names: HashMap<(String, String), String>,
}

impl Functions {
    /// The name of the function with this return type and body.
    fn add(&mut self, ty: &str, body: String) -> String {
        let next = format!("part_{}", self.names.len());
        let text = &mut self.text;
        self.names
            .entry((ty.to_string(), body))
            .or_insert_with_key(|(ty, body)| {
                text.push_str(&format!("fn {next}() -> {ty} {{ {body} }}\n"));
                next
            })
            .clone()
    }
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
