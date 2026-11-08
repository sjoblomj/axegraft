//! Checking library data against an executable, with a synthetic one built
//! from the toy library.

mod common;

use axegraft_patcher_core::library::Library;
use axegraft_patcher_core::verify::{check_all, check_file, coverage, expected, parse_executables, Executables};
use axegraft_patcher_core::Game;
use common::image::image;
use common::pe::Pe;
use common::toy_library;

/// The toy version as an executable file at the usual base.
fn exe(lib: &Library, version: &str) -> Vec<u8> {
    let game = if version == "2.02" { Game::Warcraft2 } else { Game::StarCraft };
    let g = lib.game(game).unwrap();
    let v = g.version(version).unwrap();
    let img = image(g, v, 0x400000);
    let mut pe = Pe::new(v.identity.timestamp, v.identity.product_version).section(".text", 0x1000, img[0x1000..0x6000].to_vec()).section(".data", 0x6000, img[0x6000..0x8000].to_vec());
    pe.image_base = 0x400000;
    pe.file()
}

fn tmp(name: &str, bytes: &[u8]) -> std::path::PathBuf {
    let p = std::path::Path::new(env!("CARGO_TARGET_TMPDIR")).join(name);
    std::fs::write(&p, bytes).unwrap();
    p
}

#[test]
fn data_matches_the_executable() {
    let lib = toy_library();
    let g = lib.game(Game::StarCraft).unwrap();
    let v = g.version("1.16.1").unwrap();
    let r = check_file(g, v, &exe(&lib, "1.16.1")).unwrap();
    assert!(r.passed(), "{:#?}", r);
    assert_eq!(r.matched, expected(g, v, 0x400000).len() + 1 + 5, "every location, the identity and the five streams");
}

#[test]
fn difference_names_the_property_and_location() {
    let lib = toy_library();
    let g = lib.game(Game::StarCraft).unwrap();
    let v = g.version("1.16.1").unwrap();
    let mut file = exe(&lib, "1.16.1");
    // RVA 0x6000 is the start of .data, which is stored after .text.
    let h = axegraft_patcher_core::pe::headers(&file).unwrap();
    let at = h.file_offset(0x6000).unwrap() as usize;
    assert_ne!(at, 0x6000);
    file[at] = 0x2C;
    let at = h.file_offset(0x2028 + 2).unwrap() as usize;
    file[at] = 0xAA;
    let r = check_file(g, v, &file).unwrap();
    assert!(!r.passed());
    let d: Vec<_> = r.differences.iter().map(|d| (d.what.as_str(), d.rva)).collect();
    assert_eq!(d, [("set 1 button 0 (bf_always, statcmd_set_ctrl)", 0x2028), ("constant max_supply", 0x6000)]);
    assert_eq!(r.differences[1].actual.as_deref(), Some(&[0x2C, 0x01][..]));
}

#[test]
fn wrong_version_or_damaged_stream() {
    let lib = toy_library();
    let g = lib.game(Game::StarCraft).unwrap();
    let r = check_file(g, g.version("1.07").unwrap(), &exe(&lib, "1.16.1")).unwrap();
    assert!(r.other.iter().any(|o| o.starts_with("identity")));
    let v = g.version("1.16.1").unwrap();
    let mut file = exe(&lib, "1.16.1");
    let h = axegraft_patcher_core::pe::headers(&file).unwrap();
    let at = h.file_offset(0x4000).unwrap() as usize;
    file[at] = 9;
    let r = check_file(g, v, &file).unwrap();
    assert!(r.other.iter().any(|o| o.contains("unit requirement stream")), "{:?}", r.other);
    assert!(check_file(g, v, b"not an exe").is_err());
}

#[test]
fn report_with_matches_differences_and_not_checked() {
    let lib = toy_library();
    let good = tmp("toy-1.16.1.exe", &exe(&lib, "1.16.1"));
    let mut bad = exe(&lib, "1.07");
    let h = axegraft_patcher_core::pe::headers(&bad).unwrap();
    let at = h.file_offset(0x6070).unwrap() as usize;
    bad[at] = 7;
    let bad = tmp("toy-1.07.exe", &bad);
    let list = format!("# toy executables\nstarcraft 1.16.1 {}\nstarcraft 1.07 {}\nwarcraft2 1.5 /nowhere/WAR2.EXE\n", good.display(), bad.display());
    let exes: Executables = parse_executables(&list).unwrap();
    let run = check_all(&lib, &exes);
    let text = run.lines.join("\n");
    assert!(text.contains("starcraft 1.16.1: passed:"), "{text}");
    assert!(text.contains("starcraft 1.07: FAILED: 1 difference(s)"), "{text}");
    assert!(text.contains("  constant nuke_cost: RVA 0x6070: expected 08, found 07"), "{text}");
    assert!(text.contains("warcraft2 2.02: not checked: no executable was given"), "{text}");
    assert!(text.contains("warcraft2 1.5: not checked: it isn't a supported version"), "{text}");
    assert!(!text.contains("warcraft2 2.02: passed"));
    assert_eq!((run.failed, run.not_checked), (1, 1));

    let missing = parse_executables("warcraft2 2.02 /nowhere/Warcraft II BNE.exe").unwrap();
    assert_eq!(missing[&(Game::Warcraft2, "2.02".to_string())], std::path::PathBuf::from("/nowhere/Warcraft II BNE.exe"));
    let run = check_all(&lib, &missing);
    assert!(run.lines.iter().any(|l| l.starts_with("warcraft2 2.02: not checked:") && l.contains("can't be read")));
    assert!(parse_executables("diablo 1.0 x").is_err());
}

#[test]
fn reporting_gaps() {
    let lines = coverage(&toy_library());
    assert_eq!(
        lines,
        [
            "starcraft 1.07: team_multiplier: not_applicable",
            "starcraft 1.16.1: nuke_cost: unknown",
            "starcraft: 14 of 16 constant entries have locations, 2 don't",
            "warcraft2: 1 of 1 constant entries have locations, 0 don't",
        ]
    );
}
