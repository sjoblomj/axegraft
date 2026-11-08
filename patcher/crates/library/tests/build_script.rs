//! `build.rs` compiles good data in and refuses bad data.
//!
//! These build the crate again with other data, in a target folder of their
//! own, so they take a while the first time.

use std::path::{Path, PathBuf};
use std::process::Command;

fn toy() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../core/tests/fixtures/library/toy")
}

/// Runs `cargo <command> -p axegraft-patcher-library [-- <test args>]` with
/// the library built from `data`.
fn cargo(command: &[&str], test_args: &[&str], data: &Path) -> std::process::Output {
    let target = Path::new(env!("CARGO_TARGET_TMPDIR")).join("library-build");
    let mut c = Command::new(env!("CARGO"));
    c.args(command).args(["-p", "axegraft-patcher-library", "--offline", "--target-dir"]).arg(&target);
    if !test_args.is_empty() {
        c.arg("--").args(test_args);
    }
    c
        .env("AXEGRAFT_PATCHER_LIBRARY_DATA", data)
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .unwrap()
}

fn copy_dir(from: &Path, to: &Path) {
    std::fs::create_dir_all(to).unwrap();
    for e in std::fs::read_dir(from).unwrap() {
        let e = e.unwrap();
        if e.file_type().unwrap().is_dir() {
            copy_dir(&e.path(), &to.join(e.file_name()));
        } else {
            std::fs::copy(e.path(), to.join(e.file_name())).unwrap();
        }
    }
}

#[test]
fn fixture_data_is_compiled_in() {
    // The crate's own test compares what was compiled in with the data.
    let out = cargo(&["test", "--lib"], &["--nocapture"], &toy());
    let text = format!("{}{}", String::from_utf8_lossy(&out.stdout), String::from_utf8_lossy(&out.stderr));
    assert!(out.status.success(), "{text}");
    assert!(text.contains("2 game(s), 3 version(s)"), "{text}");
}

#[test]
fn bad_data_fails_the_build() {
    let dir = Path::new(env!("CARGO_TARGET_TMPDIR")).join("bad-library-data");
    let _ = std::fs::remove_dir_all(&dir);
    copy_dir(&toy(), &dir);
    let game = dir.join("starcraft/game.json");
    let mut g: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(&game).unwrap()).unwrap();
    let c = g["constants"].as_array_mut().unwrap().iter_mut().find(|c| c["name"] == "max_supply").unwrap();
    c["versions"].as_object_mut().unwrap().remove("1.07");
    std::fs::write(&game, g.to_string()).unwrap();

    let out = cargo(&["build"], &[], &dir);
    let text = String::from_utf8_lossy(&out.stderr);
    assert!(!out.status.success(), "the build succeeded with bad data");
    assert!(text.contains("starcraft 1.07: constant max_supply: has no entry"), "{text}");

    let v = dir.join("warcraft2/2.02.json");
    std::fs::write(&v, "{ not json").unwrap();
    let out = cargo(&["build"], &[], &dir);
    assert!(!out.status.success());
    assert!(String::from_utf8_lossy(&out.stderr).contains("2.02.json"));
}
