//! Carrying out a plan: allocating new memory, writing, and reading back.
//!
//! Everything was checked when the plan was made, so applying it can only
//! fail if the memory itself does, and any failure is reported.

use crate::memory::Memory;
use crate::plan::{Hex, New, Plan};
use crate::problem::Problem;
use crate::report::{self, LogSink};

/// What applying a plan did.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Applied {
    /// The address of each blob, in the plan's order.
    pub blob_addresses: Vec<u32>,
    /// Every write: its RVA, and the bytes written.
    pub written: Vec<(u32, Vec<u8>)>,
}

/// The bytes a write puts at its location, once the blobs have addresses.
pub fn resolve(new: &New, blob_addresses: &[u32]) -> Vec<u8> {
    match new {
        New::Bytes(b) => b.clone(),
        New::Pointer { blob, offset } => blob_addresses[*blob].wrapping_add(*offset).to_le_bytes().to_vec(),
    }
}

/// Applies a plan, then reads back every location and treats any difference
/// as an error. `input` names the mod in problems.
///
/// The plan goes to the log, and the log is flushed, before anything in the
/// game is written, so a crash part way leaves the plan on disk. Allocating
/// new memory comes first, because it changes nothing the game uses, and
/// lets the log show where pointers will point.
pub fn apply(input: &str, plan: &Plan, mem: &mut dyn Memory, log: &mut dyn LogSink) -> Result<Applied, Vec<Problem>> {
    let problem = |m: String| vec![Problem::new(input, "", m)];
    let mut blob_addresses = Vec::new();
    for b in &plan.blobs {
        match mem.allocate(&b.bytes) {
            Ok(a) => blob_addresses.push(a),
            Err(e) => return Err(problem(format!("Memory for the {} couldn't be allocated: {e}.", b.what))),
        }
    }
    for l in report::plan(plan, &blob_addresses) {
        log.line(&l);
    }
    log.flush();
    let mut written = Vec::new();
    for c in &plan.changes {
        for w in &c.writes {
            let bytes = resolve(&w.new, &blob_addresses);
            if let Err(e) = mem.write(w.rva, &bytes) {
                return Err(problem(format!("{}: writing RVA {:#x} (address {:#x}) failed: {e}.", c.what, w.rva, plan.base.wrapping_add(w.rva))));
            }
            written.push((w.rva, bytes));
        }
    }
    let mut problems = Vec::new();
    for (c, (rva, bytes)) in plan.changes.iter().flat_map(|c| c.writes.iter().map(move |_| c)).zip(&written) {
        match mem.read(*rva, bytes.len()) {
            Ok(back) if back == *bytes => {}
            Ok(back) => problems.push(Problem::new(
                input,
                "",
                format!("{}: RVA {rva:#x} (address {:#x}) should hold {} after writing, but holds {}.", c.what, plan.base.wrapping_add(*rva), Hex(bytes), Hex(&back)),
            )),
            Err(e) => problems.push(Problem::new(input, "", format!("{}: RVA {rva:#x} couldn't be read back: {e}.", c.what))),
        }
    }
    if problems.is_empty() {
        Ok(Applied { blob_addresses, written })
    } else {
        Err(problems)
    }
}
