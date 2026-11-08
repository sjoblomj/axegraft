//! The log's lines, and the message the user sees when something fails.
//!
//! The log says what AxeGraft Patcher did, or why it refused: its own
//! version, the game and where it's loaded, the mod file, every change with
//! every location's old and new bytes, every skipped constant, and every
//! problem.

use crate::apply::resolve;
use crate::game::Game;
use crate::plan::{count, Hex, Plan, SkipReason};
use crate::problem::Problem;
use crate::PATCHER_VERSION;

/// Where log lines go. The plugin writes them to a file.
pub trait LogSink {
    fn line(&mut self, text: &str);
    /// Makes sure everything so far is on disk.
    fn flush(&mut self) {}
}

impl LogSink for Vec<String> {
    fn line(&mut self, text: &str) {
        self.push(text.to_string());
    }
}

/// The first lines: AxeGraft Patcher's version, and the game when it's known.
pub fn header(executable: &str, version: Option<(Game, &str)>, base: u32) -> Vec<String> {
    let mut out = vec![format!("AxeGraft Patcher {PATCHER_VERSION}"), format!("Executable: {executable}")];
    match version {
        Some((g, v)) => out.push(format!("Game: {} {v}", g.title())),
        None => out.push("Game: not a supported version".into()),
    }
    out.push(format!("Loaded at: {base:#010x}"));
    out
}

/// The mod file and where it came from.
pub fn input(path: &str) -> Vec<String> {
    vec![format!("Mod file: {path} (chosen in AxeGraft Patcher's configuration)")]
}

fn reason(r: SkipReason) -> &'static str {
    match r {
        SkipReason::Unknown => "unknown: its location on this version hasn't been found",
        SkipReason::NotApplicable => "not_applicable: the code doesn't exist on this version",
    }
}

/// The plan: new memory, every change with its locations, and the skips.
/// Pointers to new memory are shown as the addresses it was given.
pub fn plan(plan: &Plan, blob_addresses: &[u32]) -> Vec<String> {
    let mut out = Vec::new();
    let on = format!("{} {}", plan.game.title(), plan.version);
    let writes: usize = plan.changes.iter().map(|c| c.writes.len()).sum();
    out.push(format!(
        "Plan: {}, {}, {} skipped",
        count(plan.changes.len(), "change", "changes"),
        count(writes, "location", "locations"),
        count(plan.skips.len(), "constant", "constants")
    ));
    for (b, addr) in plan.blobs.iter().zip(blob_addresses) {
        out.push(format!("  New memory for the {}: {} bytes at {addr:#010x}", b.what, b.bytes.len()));
    }
    for c in &plan.changes {
        out.push(format!("  {}", c.what));
        for w in &c.writes {
            let new = resolve(&w.new, blob_addresses);
            out.push(format!("    {:#010x} (RVA {:#x}): {} -> {}", plan.base.wrapping_add(w.rva), w.rva, Hex(&w.expected), Hex(&new)));
        }
    }
    for s in &plan.skips {
        out.push(format!("  Skipped constant {} on {on}: {}", s.constant, reason(s.reason)));
    }
    out
}

/// Every problem, one per line.
pub fn problems(problems: &[Problem]) -> Vec<String> {
    let mut out = vec![format!("Failed with {}:", count(problems.len(), "problem", "problems"))];
    out.extend(problems.iter().map(|p| format!("  {p}")));
    out
}

/// The last line of a successful run.
pub fn applied(plan: &Plan) -> Vec<String> {
    vec![format!("Applied {} and confirmed every location.", count(plan.changes.len(), "change", "changes"))]
}

/// How many problems the error message shows.
pub const SHOWN: usize = 10;

/// The message the user sees when the game has to close. It shows at most
/// `SHOWN` problems, says how many more there are, and where the log is.
pub fn error_message(what: &str, problems: &[Problem], log: Option<&str>) -> String {
    let mut s = format!("{what}\n\n");
    for p in problems.iter().take(SHOWN) {
        s.push_str(&format!("- {p}\n"));
    }
    let more = problems.len().saturating_sub(SHOWN);
    match (more, log) {
        (0, Some(l)) => s.push_str(&format!("\nThe log has the details: {l}\n")),
        (n, Some(l)) => s.push_str(&format!("\n...and {n} more {}, listed in the log: {l}\n", if n == 1 { "problem" } else { "problems" })),
        (0, None) => s.push_str("\nNo log is available, because it couldn't be written.\n"),
        (n, None) => s.push_str(&format!("\n...and {n} more {}. No log is available, because it couldn't be written.\n", if n == 1 { "problem" } else { "problems" })),
    }
    s.push_str("\nThe game will now close.");
    s
}
