//! A fake game image that matches the toy library, for planning tests.
//!
//! Everything the library describes is put where it says, so a plan for an
//! unmodified image passes its checks. Buttons are encoded here
//! independently of the planner, so the planner's layout is checked against
//! this one.

use axegraft_patcher_core::library::*;
use axegraft_patcher_core::memory::FakeMemory;
use axegraft_patcher_core::stream::{encode, Record, Word};
use axegraft_patcher_core::ReqType;

pub const IMAGE_SIZE: usize = 0x8000;

fn put(img: &mut [u8], at: u32, b: &[u8]) {
    img[at as usize..at as usize + b.len()].copy_from_slice(b);
}

fn rec(id: u16, items: &[Word]) -> Record {
    Record { id, items: items.to_vec() }
}

use Word::{Num as N, Op as O};

/// The toy versions' requirement streams. 1.07 has a record for order 7,
/// which 1.16.1 lacks.
pub fn toy_streams(version: &str) -> Vec<(ReqType, Vec<Record>)> {
    let mut order = vec![rec(3, &[O(0xFF02), N(1)])];
    if version == "1.07" {
        order.push(rec(7, &[O(0xFF02), N(1)]));
    }
    order.push(rec(5, &[N(2)]));
    vec![
        (ReqType::Unit, vec![rec(1, &[O(0xFF02), N(0)])]),
        (ReqType::Upgrade, vec![rec(2, &[O(0xFF02), N(3), O(0xFF1F), O(0xFFFF), O(0xFF20), N(1), O(0xFFFF), O(0xFF21), N(2)])]),
        (ReqType::TechResearch, vec![rec(1, &[O(0xFF02), N(1)])]),
        (ReqType::TechUse, vec![rec(0, &[O(0xFF02), N(0), O(0xFF01), O(0xFF02), N(2)])]),
        (ReqType::Order, order),
    ]
}

/// A button as `layout` stores it, with function addresses for this base.
pub fn button_bytes(b: &OriginalButton, layout: ButtonLayout, fns: &dyn Fn(&str) -> u32) -> Vec<u8> {
    let mut out = vec![0u8; 20];
    out[0..2].copy_from_slice(&b.position.to_le_bytes());
    out[2..4].copy_from_slice(&b.icon.to_le_bytes());
    out[4..8].copy_from_slice(&fns(&b.condition).to_le_bytes());
    out[8..12].copy_from_slice(&fns(&b.action).to_le_bytes());
    out[12] = b.condition_variable as u8;
    match layout {
        ButtonLayout::StarCraft => {
            out[14..16].copy_from_slice(&b.action_variable.to_le_bytes());
            out[16..18].copy_from_slice(&b.enabled_string.unwrap().to_le_bytes());
            out[18..20].copy_from_slice(&b.disabled_string.unwrap().to_le_bytes());
        }
        ButtonLayout::Warcraft2Bne => {
            out[13] = b.action_variable as u8;
            out[14..16].copy_from_slice(&b.string.unwrap().to_le_bytes());
            out[16..18].copy_from_slice(&b.highlighted.unwrap().to_le_bytes());
        }
    }
    out
}

/// An unmodified image of a version, loaded at `base`.
pub fn image(g: &GameLibrary, v: &Version, base: u32) -> Vec<u8> {
    let mut img = vec![0u8; IMAGE_SIZE];
    let fns = |n: &str| base + v.functions[n].unwrap();
    let card = v.button_table.card;

    for (e, on) in &v.entries {
        let Some(on) = on else { continue };
        let at = v.button_table.rva + on.number as u32 * card.size();
        let set = v.sets.values().flatten().find(|s| s.entries.contains(e));
        let (count, ptr) = set.map_or((0, 0), |s| (s.buttons.len() as u32, base + s.array));
        match card {
            CardLayout::StarCraft => {
                put(&mut img, at, &(count as u16).to_le_bytes());
                put(&mut img, at + 4, &ptr.to_le_bytes());
                let q = on.connected_unit.map_or(0xFFFF, |q| v.entries[&q].unwrap().number);
                put(&mut img, at + 8, &q.to_le_bytes());
            }
            CardLayout::Warcraft2Bne => {
                put(&mut img, at, &count.to_le_bytes());
                put(&mut img, at + 4, &ptr.to_le_bytes());
            }
        }
    }
    for s in v.sets.values().flatten() {
        for (k, b) in s.buttons.iter().enumerate() {
            put(&mut img, s.array + 20 * k as u32, &button_bytes(b, v.button_table.button, &fns));
        }
    }
    let layout = v.status_table.layout;
    for (i, u) in v.units.iter().enumerate() {
        let at = v.status_table.rva + i as u32 * layout.size();
        match layout {
            StatusLayout::StarCraft => {
                put(&mut img, at, &u.debug_id.unwrap().to_le_bytes());
                put(&mut img, at + 4, &fns(&u.status_changed).to_le_bytes());
                put(&mut img, at + 8, &fns(&u.display_function).to_le_bytes());
            }
            StatusLayout::Warcraft2Bne => {
                put(&mut img, at, &u.icon.unwrap().to_le_bytes());
                put(&mut img, at + 2, &u.stats_frame.unwrap().to_le_bytes());
                put(&mut img, at + 4, &u.name_string.unwrap().to_le_bytes());
                put(&mut img, at + 8, &fns(&u.status_changed).to_le_bytes());
                put(&mut img, at + 12, &fns(&u.display_function).to_le_bytes());
            }
        }
    }
    if g.game == axegraft_patcher_core::Game::StarCraft {
        for (t, records) in toy_streams(&v.id) {
            let s = &v.streams[&t];
            let bytes = encode(&records);
            assert_eq!(bytes.len() as u32, s.length, "toy stream {t:?} on {} has the wrong length", v.id);
            put(&mut img, s.rva, &bytes);
            for r in &s.base_refs {
                put(&mut img, *r, &(base + s.rva).to_le_bytes());
            }
            for r in &s.plus2_refs {
                put(&mut img, *r, &(base + s.rva + 2).to_le_bytes());
            }
        }
    }
    for c in &g.constants {
        match c.versions.get(&v.id) {
            Some(Availability::Locations { locations, .. }) => {
                for l in locations {
                    put(&mut img, l.rva, &l.expected);
                }
            }
            Some(Availability::Options { sites, .. }) => {
                for s in sites {
                    put(&mut img, s.rva, &s.expected);
                }
            }
            _ => {}
        }
    }
    img
}

/// Fake memory holding an unmodified version at `base`.
pub fn memory(g: &GameLibrary, v: &Version, base: u32) -> FakeMemory {
    FakeMemory::at(base, image(g, v, base))
}
