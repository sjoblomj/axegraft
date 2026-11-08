//! Checks the compiled-in library against real executables, and lists its gaps.
//!
//! ```text
//! check [--executables FILE] [--coverage]
//! ```
//!
//! The executables are listed in a file, one per line: `<game> <version>
//! <path>`. It's `--executables`, or `AXEGRAFT_PATCHER_EXECUTABLES`, or
//! `executables.local.txt` in the current folder. A version without an
//! executable is reported as not checked, never as passed.
//!
//! Exits with 0 when every version was checked and passed, 1 when any
//! failed, and 2 when none failed but some weren't checked.

use axegraft_patcher_core::verify::{check_all, coverage, parse_executables};
use axegraft_patcher_library::library;
use std::path::PathBuf;
use std::process::ExitCode;

fn main() -> ExitCode {
    let mut list: Option<PathBuf> = std::env::var_os("AXEGRAFT_PATCHER_EXECUTABLES").map(PathBuf::from);
    let mut show_coverage = false;
    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        match a.as_str() {
            "--executables" => match args.next() {
                Some(p) => list = Some(PathBuf::from(p)),
                None => return usage("--executables needs a file"),
            },
            "--coverage" => show_coverage = true,
            "-h" | "--help" => return usage(""),
            other => return usage(&format!("unknown argument {other}")),
        }
    }
    let list = list.unwrap_or_else(|| PathBuf::from("executables.local.txt"));
    let exes = match std::fs::read_to_string(&list) {
        Ok(t) => match parse_executables(&t) {
            Ok(e) => e,
            Err(e) => {
                eprintln!("{}: {e}", list.display());
                return ExitCode::from(1);
            }
        },
        Err(e) => {
            println!("No executables listed ({}: {e}), so nothing can be checked.", list.display());
            Default::default()
        }
    };
    let run = check_all(library(), &exes);
    for l in &run.lines {
        println!("{l}");
    }
    if show_coverage {
        println!();
        for l in coverage(library()) {
            println!("{l}");
        }
    }
    if run.failed > 0 {
        ExitCode::from(1)
    } else if run.not_checked > 0 {
        ExitCode::from(2)
    } else {
        ExitCode::SUCCESS
    }
}

fn usage(problem: &str) -> ExitCode {
    if !problem.is_empty() {
        eprintln!("{problem}");
    }
    eprintln!("usage: check [--executables FILE] [--coverage]");
    ExitCode::from(if problem.is_empty() { 0 } else { 1 })
}
