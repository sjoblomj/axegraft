//! The scenarios of the mod-application spec, planned and applied on the toy
//! library with fake memory at a non-standard base.

mod common;

use axegraft_patcher_core::apply::apply;
use axegraft_patcher_core::library::{Availability, GameLibrary, Library, Version};
use axegraft_patcher_core::library_check::check_library;
use axegraft_patcher_core::memory::{FakeMemory, Memory, FAKE_BASE};
use axegraft_patcher_core::parse::parse_mod;
use axegraft_patcher_core::plan::{plan, Plan, SkipReason};
use axegraft_patcher_core::{Game, Problem};
use common::image::{memory, toy_streams};
use common::toy_library;
use serde_json::{json, Value};

const SC: u32 = 0x1000; // gCards
const BASE: u32 = FAKE_BASE;

fn lib() -> Library {
    toy_library()
}

fn gv<'a>(lib: &'a Library, version: &str) -> (&'a GameLibrary, &'a Version) {
    let game = if version == "2.02" { Game::Warcraft2 } else { Game::StarCraft };
    let g = lib.game(game).unwrap();
    (g, g.version(version).unwrap())
}

fn with_header(game: &str, parts: Value) -> Value {
    let mut m = json!({"patcher": "AxeGraft", "format": 1, "game": game});
    for (k, v) in parts.as_object().unwrap() {
        m[k] = v.clone();
    }
    m
}

/// Parses, then plans on an unmodified image, with `change` applied to the
/// memory first.
fn plan_on(version: &str, parts: Value, base: u32, change: impl FnOnce(&mut FakeMemory)) -> (Result<Plan, Vec<Problem>>, FakeMemory) {
    let lib = lib();
    let (g, v) = gv(&lib, version);
    let m = with_header(g.game.id(), parts);
    let parsed = parse_mod("mod.json", m.to_string().as_bytes(), &g.vocabulary()).unwrap_or_else(|p| panic!("the mod is invalid: {p:#?}"));
    let mut mem = memory(g, v, base);
    change(&mut mem);
    (plan("mod.json", &parsed, g, v, &mem), mem)
}

/// Plans and applies, and returns the plan and the memory afterwards.
#[track_caller]
fn applied(version: &str, parts: Value) -> (Plan, FakeMemory) {
    applied_at(version, parts, BASE)
}

#[track_caller]
fn applied_at(version: &str, parts: Value, base: u32) -> (Plan, FakeMemory) {
    let (p, mut mem) = plan_on(version, parts, base, |_| {});
    let p = p.unwrap_or_else(|e| panic!("planning failed: {e:#?}"));
    apply("mod.json", &p, &mut mem, &mut Vec::<String>::new()).unwrap_or_else(|e| panic!("applying failed: {e:#?}"));
    (p, mem)
}

#[track_caller]
fn rejected(version: &str, parts: Value, texts: &[&str]) -> FakeMemory {
    let (p, mem) = plan_on(version, parts, BASE, |_| {});
    let Err(problems) = p else { panic!("the mod was planned") };
    assert!(problems.iter().any(|p| texts.iter().all(|t| p.message.contains(t))), "no problem mentions all of {texts:?}: {problems:#?}");
    assert!(mem.writes.is_empty());
    mem
}

fn unmodified(version: &str) -> FakeMemory {
    let lib = lib();
    let (g, v) = gv(&lib, version);
    memory(g, v, BASE)
}

/// The count and pointer of a StarCraft button card, by its number on the version.
fn card(mem: &FakeMemory, number: u32) -> (u16, u32) {
    (mem.u16_at(SC + number * 12), mem.u32_at(SC + number * 12 + 4))
}

fn sc_button(over: Value) -> Value {
    let mut b = json!({"position": 1, "icon": 228, "condition": "bf_always", "action": "order_move", "enabled_string": 664, "disabled_string": 0});
    for (k, v) in over.as_object().unwrap() {
        b[k] = v.clone();
    }
    b
}

/// The image bytes that differ from an unmodified one.
fn changed_rvas(version: &str, mem: &FakeMemory) -> Vec<u32> {
    let orig = unmodified(version);
    (0..mem.image.len() as u32).filter(|&i| mem.image[i as usize] != orig.image[i as usize]).collect()
}

// ---- Constant changes

/// The toy library with max_supply_copy, stored exactly where max_supply is.
fn library_with_a_shared_location() -> Library {
    let mut l = lib();
    let g = l.games.iter_mut().find(|g| g.game == Game::StarCraft).unwrap();
    let mut copy = g.constants.iter().find(|c| c.name == "max_supply").unwrap().clone();
    copy.name = "max_supply_copy".to_string();
    g.constants.push(copy);
    l
}

fn plan_shared(first: i64, second: i64) -> Result<Plan, Vec<Problem>> {
    let l = library_with_a_shared_location();
    let (g, v) = gv(&l, "1.16.1");
    let m = with_header("starcraft", json!({"constants": [{"name": "max_supply", "value": first}, {"name": "max_supply_copy", "value": second}]}));
    let parsed = parse_mod("mod.json", m.to_string().as_bytes(), &g.vocabulary()).unwrap_or_else(|p| panic!("the mod is invalid: {p:#?}"));
    plan("mod.json", &parsed, g, v, &memory(g, v, BASE))
}

#[test]
fn constants_in_the_same_place_pass_the_library_check() {
    assert_eq!(check_library(&library_with_a_shared_location()), Vec::<String>::new());
}

#[test]
fn constants_in_the_same_place_with_different_expected_bytes_fail_the_library_check() {
    let mut l = library_with_a_shared_location();
    let g = l.games.iter_mut().find(|g| g.game == Game::StarCraft).unwrap();
    let copy = g.constants.iter_mut().find(|c| c.name == "max_supply_copy").unwrap();
    let Some(Availability::Locations { locations, .. }) = copy.versions.get_mut("1.16.1") else { panic!("max_supply has locations") };
    locations[0].expected[0] ^= 1;
    let problems = check_library(&l);
    assert!(problems.iter().any(|p| p.contains("max_supply_copy") && p.contains("overlap")), "{problems:#?}");
}

#[test]
fn a_mod_may_set_constants_in_the_same_place_to_one_value() {
    plan_shared(500, 500).unwrap_or_else(|e| panic!("planning failed: {e:#?}"));
}

#[test]
fn a_mod_cant_set_constants_in_the_same_place_to_different_values() {
    let problems = plan_shared(500, 600).unwrap_err();
    assert!(problems.iter().any(|p| p.message.contains("max_supply_copy") && p.message.contains("would both write")), "{problems:#?}");
}

#[test]
fn constant_with_several_locations() {
    let (_, mem) = applied("1.07", json!({"constants": [{"name": "max_supply", "value": 600}]}));
    assert_eq!((mem.u16_at(0x6000), mem.u16_at(0x6010)), (600, 600));
    let (_, mem) = applied("1.16.1", json!({"constants": [{"name": "max_supply", "value": 600}]}));
    assert_eq!((mem.u16_at(0x6000), mem.u16_at(0x6010)), (600, 0));
}

#[test]
fn named_option() {
    let (_, mem) = applied("1.16.1", json!({"constants": [{"name": "cloak_energy", "option": "regain"}]}));
    assert_eq!((mem.read(0x7000, 2).unwrap(), mem.read(0x7100, 2).unwrap()), (vec![0x90, 0x90], vec![0x0F, 0x85]));
    // Different code on different versions.
    let (_, mem) = applied("1.07", json!({"constants": [{"name": "cloak_energy", "option": "regain"}]}));
    assert_eq!((mem.read(0x7000, 2).unwrap(), mem.read(0x7100, 2).unwrap()), (vec![0x90, 0x90], vec![0xEB, 0x10]));
}

#[test]
fn original_option() {
    for v in ["1.16.1", "1.07"] {
        let (p, mem) = applied(v, json!({"constants": [{"name": "cloak_energy", "option": "original"}]}));
        assert_eq!(p.writes().count(), 2);
        assert_eq!(changed_rvas(v, &mem), Vec::<u32>::new(), "the original option changes nothing on {v}");
    }
}

#[test]
fn value_stored_in_two_forms() {
    let (_, mem) = applied("1.16.1", json!({"constants": [{"name": "spell_duration", "value": 60}]}));
    assert_eq!(mem.u16_at(0x6020), 60);
    assert_eq!(mem.u16_at(0x6024) as i16, -60);
}

#[test]
fn value_split_into_bytes() {
    let (_, mem) = applied("1.16.1", json!({"constants": [{"name": "start_minerals", "value": 0x1234}]}));
    assert_eq!((mem.image[0x6050], mem.image[0x6058]), (0x34, 0x12));
}

#[test]
fn signed_value() {
    let (_, mem) = applied("1.07", json!({"constants": [{"name": "sight_bonus", "value": -100}]}));
    assert_eq!(mem.image[0x6060] as i8, -100);
}

// ---- Skipping constants unavailable on a version

#[test]
fn unknown_on_this_version() {
    let (p, mem) = applied("1.16.1", json!({"constants": [{"name": "nuke_cost", "value": 9}, {"name": "max_supply", "value": 500}]}));
    assert_eq!(p.skips.len(), 1);
    assert_eq!((p.skips[0].constant.as_str(), p.skips[0].reason), ("nuke_cost", SkipReason::Unknown));
    assert_eq!(mem.u16_at(0x6000), 500, "the other changes are applied");
    let (p, mem) = applied("1.07", json!({"constants": [{"name": "nuke_cost", "value": 9}]}));
    assert!(p.skips.is_empty());
    assert_eq!(mem.image[0x6070], 9);
}

#[test]
fn code_doesnt_exist_on_this_version() {
    let (p, _) = applied("1.07", json!({"constants": [{"name": "team_multiplier", "value": 3}]}));
    assert_eq!(p.skips[0].reason, SkipReason::NotApplicable);
    assert_eq!(p.writes().count(), 0);
}

#[test]
fn same_validation_on_every_version() {
    let lib = lib();
    let (g, _) = gv(&lib, "1.16.1");
    let m = with_header("starcraft", json!({"constants": [{"name": "nuke_cost", "value": 300}]}));
    let e = parse_mod("mod.json", m.to_string().as_bytes(), &g.vocabulary()).unwrap_err();
    assert_eq!(e[0].path, "constants[0].value");
}

#[test]
fn value_differs_between_versions() {
    // The expected bytes are each version's own: 360 on 1.16.1, 900 on 1.07.
    let (p, _) = applied("1.16.1", json!({"constants": [{"name": "web_duration", "value": 1}]}));
    assert_eq!(p.changes[0].writes[0].expected, 360u16.to_le_bytes());
    let (p, _) = applied("1.07", json!({"constants": [{"name": "web_duration", "value": 1}]}));
    assert_eq!(p.changes[0].writes[0].expected, 900u16.to_le_bytes());
}

// ---- Button set changes

#[test]
fn set_shared_by_several_units() {
    let (p, mem) = applied("1.16.1", json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({})), sc_button(json!({"position": 2})), sc_button(json!({"position": 3}))]}]}));
    let blob = mem.allocations[0].0;
    assert_eq!(card(&mem, 0), (3, blob));
    assert_eq!(card(&mem, 2), (3, blob), "every entry holding the set points at the same memory");
    assert_eq!(p.blobs.len(), 1);
}

#[test]
fn button_card_that_isnt_a_unit() {
    let (_, mem) = applied("1.16.1", json!({"button_sets": [{"id": 4, "buttons": [sc_button(json!({}))]}]}));
    assert_eq!(card(&mem, 4), (1, mem.allocations[0].0));
}

#[test]
fn unit_assigned_away_from_a_replaced_set() {
    let (_, mem) = applied("1.16.1", json!({"button_sets": [{"id": 0, "buttons": []}], "units": [{"id": 2, "button_set": 1}]}));
    let orig = unmodified("1.16.1");
    assert_eq!(card(&mem, 2), card(&orig, 1), "unit 2 has set 1's buttons");
    assert_eq!(card(&mem, 0), (0, mem.allocations[0].0));
}

#[test]
fn giving_one_unit_its_own_set() {
    let (_, mem) = applied("1.16.1", json!({"button_sets": [{"id": 6, "buttons": [sc_button(json!({}))]}], "units": [{"id": 2, "button_set": 6}]}));
    let orig = unmodified("1.16.1");
    assert_eq!(card(&mem, 2), (1, mem.allocations[0].0));
    assert_eq!(card(&mem, 0), card(&orig, 0), "unit 0 is unchanged");
}

#[test]
fn new_set_nothing_uses() {
    let (_, mem) = applied("1.16.1", json!({"button_sets": [{"id": 6, "buttons": [sc_button(json!({}))]}]}));
    assert!(mem.writes.is_empty(), "no unit's buttons change");
}

#[test]
fn set_with_more_buttons_than_the_original() {
    let buttons: Vec<Value> = (1..=9).map(|p| sc_button(json!({"position": p}))).collect();
    let (_, mem) = applied("1.16.1", json!({"button_sets": [{"id": 1, "buttons": buttons}]}));
    let (count, ptr) = card(&mem, 1);
    assert_eq!(count, 9);
    assert_eq!(mem.allocation(ptr).unwrap().len(), 9 * 20);
}

#[test]
fn buttons_in_the_versions_layout() {
    let (_, mem) = applied(
        "1.16.1",
        json!({"button_sets": [{"id": 1, "buttons": [sc_button(json!({"position": 7, "icon": 300, "condition": "bf_research", "condition_variable": 2, "action": "order_research", "action_variable": 3, "enabled_string": 1000, "disabled_string": 1001}))]}]}),
    );
    let b = mem.allocations[0].1.clone();
    let lib = lib();
    let (_, v) = gv(&lib, "1.16.1");
    let f = |n: &str| (BASE + v.functions[n].unwrap()).to_le_bytes();
    let mut want = vec![7, 0, 0x2C, 0x01];
    want.extend(f("bf_research"));
    want.extend(f("order_research"));
    want.extend([2, 0, 3, 0, 0xE8, 0x03, 0xE9, 0x03]);
    assert_eq!(b, want);
}

#[test]
fn warcraft2_buttons_in_the_versions_layout() {
    let (_, mem) = applied(
        "2.02",
        json!({"button_sets": [{"id": 0, "buttons": [{"position": 4, "icon": 83, "condition": "bf_has_upgrade", "condition_variable": 1, "action": "order_spell", "action_variable": 60, "string": 392, "highlighted": 256}]}]}),
    );
    let b = &mem.allocations[0].1;
    assert_eq!(b.len(), 20);
    assert_eq!(&b[12..20], &[1, 60, 0x88, 0x01, 0x00, 0x01, 0, 0]);
    // The 8-byte command list entries of units 0 and 1 hold it.
    for e in [0u32, 1] {
        assert_eq!((mem.u32_at(0x1000 + e * 8), mem.u32_at(0x1000 + e * 8 + 4)), (1, mem.allocations[0].0));
    }
}

#[test]
fn variable_the_game_doesnt_read() {
    let (_, mem) = applied("1.16.1", json!({"button_sets": [{"id": 1, "buttons": [sc_button(json!({"condition_variable": 200, "action_variable": 60000}))]}]}));
    let b = &mem.allocations[0].1;
    assert_eq!(b[12], 200);
    assert_eq!(u16::from_le_bytes([b[14], b[15]]), 60000);
}

// ---- Translating IDs to the running version

#[test]
fn set_numbered_differently_on_this_version() {
    // Set 5 is entry 4 on 1.07.
    let (_, mem) = applied("1.07", json!({"button_sets": [{"id": 5, "buttons": [sc_button(json!({}))]}]}));
    assert_eq!(card(&mem, 4), (1, mem.allocations[0].0));
    let (_, mem) = applied("1.16.1", json!({"button_sets": [{"id": 5, "buttons": [sc_button(json!({}))]}]}));
    assert_eq!(card(&mem, 5), (1, mem.allocations[0].0));
}

#[test]
fn action_that_opens_a_button_card() {
    let opens5 = json!({"button_sets": [{"id": 1, "buttons": [sc_button(json!({"action": "statcmd_set_ctrl", "action_variable": 5}))]}]});
    let (_, mem) = applied("1.07", opens5.clone());
    assert_eq!(u16::from_le_bytes([mem.allocations[0].1[14], mem.allocations[0].1[15]]), 4);
    let (_, mem) = applied("1.16.1", opens5);
    assert_eq!(u16::from_le_bytes([mem.allocations[0].1[14], mem.allocations[0].1[15]]), 5);
}

#[test]
fn connected_unit_numbered_differently() {
    let (_, mem) = applied("1.07", json!({"units": [{"id": 3, "connected_unit": 5}]}));
    assert_eq!(mem.u16_at(SC + 3 * 12 + 8), 4);
}

// ---- Assigning button sets to units

#[test]
fn unit_uses_a_set_the_mod_replaced() {
    let (_, mem) = applied("1.16.1", json!({"button_sets": [{"id": 1, "buttons": [sc_button(json!({}))]}], "units": [{"id": 0, "button_set": 1}]}));
    let blob = mem.allocations[0].0;
    assert_eq!(card(&mem, 0), (1, blob));
    assert_eq!(card(&mem, 1), (1, blob));
}

#[test]
fn assignments_that_chain() {
    let (_, mem) = applied("1.16.1", json!({"units": [{"id": 0, "button_set": 1}, {"id": 1, "button_set": 0}]}));
    let orig = unmodified("1.16.1");
    assert_eq!(card(&mem, 0), card(&orig, 1));
    assert_eq!(card(&mem, 1), card(&orig, 0));
}

#[test]
fn removing_a_units_buttons() {
    let (_, mem) = applied("1.16.1", json!({"units": [{"id": 2, "button_set": null}]}));
    let orig = unmodified("1.16.1");
    assert_eq!(card(&mem, 2), (0, 0));
    assert_eq!(card(&mem, 0), card(&orig, 0));
}

// ---- Status functions, debug IDs, connected units, Unit Data

#[test]
fn only_one_status_function_set() {
    let (_, mem) = applied("1.16.1", json!({"units": [{"id": 1, "display_function": "statdraw_draw_none"}]}));
    let lib = lib();
    let (_, v) = gv(&lib, "1.16.1");
    assert_eq!(mem.u32_at(0x1100 + 12 + 8), BASE + v.functions["statdraw_draw_none"].unwrap());
    assert_eq!(changed_rvas("1.16.1", &mem).iter().map(|r| r & !3).collect::<std::collections::BTreeSet<_>>().len(), 1);
}

#[test]
fn functions_of_different_units() {
    let (_, mem) = applied("1.16.1", json!({"units": [{"id": 0, "status_changed": "statdraw_query_never", "display_function": "statdraw_draw_unit"}, {"id": 3, "display_function": "statdraw_draw_unit"}]}));
    let lib = lib();
    let (_, v) = gv(&lib, "1.16.1");
    assert_eq!(mem.u32_at(0x1100 + 4), BASE + v.functions["statdraw_query_never"].unwrap());
    assert_eq!(mem.u32_at(0x1100 + 3 * 12 + 8), BASE + v.functions["statdraw_draw_unit"].unwrap());
}

#[test]
fn only_the_debug_id_set() {
    let (_, mem) = applied("1.16.1", json!({"units": [{"id": 2, "debug_id": 3}]}));
    assert_eq!(mem.u32_at(0x1100 + 2 * 12), 3);
    assert_eq!(changed_rvas("1.16.1", &mem), vec![0x1100 + 24]);
}

#[test]
fn connected_unit_cleared() {
    let (_, mem) = applied("1.16.1", json!({"units": [{"id": 3, "connected_unit": null}]}));
    assert_eq!(mem.u16_at(SC + 3 * 12 + 8), 0xFFFF);
    assert_eq!(card(&mem, 3), card(&unmodified("1.16.1"), 3), "its buttons are unchanged");
}

#[test]
fn button_set_changed_without_the_connected_unit() {
    let (_, mem) = applied("1.16.1", json!({"units": [{"id": 3, "button_set": 0}]}));
    assert_eq!(mem.u16_at(SC + 3 * 12 + 8), 1, "it keeps its original connected unit");
}

#[test]
fn only_the_icon_set() {
    let (_, mem) = applied("2.02", json!({"units": [{"id": 1, "icon": 77}]}));
    assert_eq!(mem.u16_at(0x1100 + 16), 77);
    assert_eq!(changed_rvas("2.02", &mem), vec![0x1100 + 16]);
}

#[test]
fn name_string_set() {
    let (_, mem) = applied("2.02", json!({"units": [{"id": 2, "name_string": 900}]}));
    assert_eq!(mem.u16_at(0x1100 + 32 + 4), 900);
    assert_eq!(changed_rvas("2.02", &mem), vec![0x1100 + 32 + 4, 0x1100 + 32 + 5]);
    let (_, mem) = applied("2.02", json!({"units": [{"id": 2, "stats_frame": 3}]}));
    assert_eq!(mem.u16_at(0x1100 + 32 + 2), 3);
}

// ---- Requirement record changes

fn stream(mem: &FakeMemory, plan: &Plan, kind: &str) -> Vec<u16> {
    let i = plan.blobs.iter().position(|b| b.what.starts_with(kind)).unwrap();
    let addr = mem.allocations[i].0;
    mem.allocation(addr).unwrap().chunks(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect()
}

#[test]
fn record_differs_between_versions() {
    let m = json!({"requirements": [{"type": "order", "id": 3, "list": ["current_unit_is", 2]}]});
    let (p, mem) = applied("1.07", m.clone());
    assert_eq!(stream(&mem, &p, "order"), [0, 3, 0xFF02, 2, 0xFFFF, 7, 0xFF02, 1, 0xFFFF, 5, 2, 0xFFFF, 0xFFFF]);
    let (p, mem) = applied("1.16.1", m);
    assert_eq!(stream(&mem, &p, "order"), [0, 3, 0xFF02, 2, 0xFFFF, 5, 2, 0xFFFF, 0xFFFF]);
}

#[test]
fn stream_grows_and_every_reference_moves() {
    let (p, mem) = applied(
        "1.16.1",
        json!({"requirements": [{"type": "unit", "id": 2, "list": ["current_unit_is", 1, "or", "current_unit_is", 0, "must_have", 3, 1, 2]}, {"type": "unit", "id": 3, "list": [0]}]}),
    );
    let s = stream(&mem, &p, "unit");
    assert_eq!(s, [0, 1, 0xFF02, 0, 0xFFFF, 2, 0xFF02, 1, 0xFF01, 0xFF02, 0, 0xFF03, 3, 1, 2, 0xFFFF, 3, 0, 0xFFFF, 0xFFFF]);
    let blob = mem.allocations[0].0;
    assert_eq!((mem.u32_at(0x5000), mem.u32_at(0x5010)), (blob, blob));
    assert_eq!(mem.u32_at(0x5004), blob + 2);
    assert_eq!(mem.u32_at(0x5050), BASE + 0x4060, "other streams' references are untouched");
}

#[test]
fn removing_a_record() {
    let (p, mem) = applied("1.16.1", json!({"requirements": [{"type": "tech_use", "id": 0, "list": []}]}));
    assert_eq!(stream(&mem, &p, "tech use"), [0, 0xFFFF]);
}

#[test]
fn record_the_version_lacks() {
    let (p, mem) = applied("1.16.1", json!({"requirements": [{"type": "order", "id": 7, "list": ["current_unit_is", 1]}]}));
    assert_eq!(stream(&mem, &p, "order"), [0, 3, 0xFF02, 1, 0xFFFF, 5, 2, 0xFFFF, 7, 0xFF02, 1, 0xFFFF, 0xFFFF]);
}

#[test]
fn upgrade_levels_are_encoded_as_the_game_reads_them() {
    let (p, mem) = applied(
        "1.16.1",
        json!({"requirements": [{"type": "upgrade", "id": 2, "list": ["current_unit_is", 3, "upgrade_level_1", "end_sublist", "upgrade_level_2", 1, "end_sublist", "upgrade_level_3", 2, "or", 1]}]}),
    );
    assert_eq!(stream(&mem, &p, "upgrade"), [0, 2, 0xFF02, 3, 0xFF1F, 0xFFFF, 0xFF20, 1, 0xFFFF, 0xFF21, 2, 0xFF01, 1, 0xFFFF, 0xFFFF]);
}

#[test]
fn unchanged_records_survive_byte_for_byte() {
    let (p, mem) = applied("1.07", json!({"requirements": [{"type": "upgrade", "id": 2, "list": ["current_unit_is", 3, "upgrade_level_1", "end_sublist", "upgrade_level_2", 1, "end_sublist", "upgrade_level_3", 2]}]}));
    let want: Vec<u16> = axegraft_patcher_core::stream::encode(&toy_streams("1.07")[1].1).chunks(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
    assert_eq!(stream(&mem, &p, "upgrade"), want);
}

// ---- Skipping is limited to constants

#[test]
fn button_set_absent_on_this_version() {
    rejected("1.07", json!({"button_sets": [{"id": 4, "buttons": []}]}), &["Button set 4", "StarCraft 1.07"]);
}

#[test]
fn function_absent_on_this_version() {
    rejected("1.07", json!({"button_sets": [{"id": 1, "buttons": [sc_button(json!({"action": "order_replay"}))]}]}), &["order_replay", "StarCraft 1.07"]);
}

#[test]
fn status_function_absent_on_this_version() {
    let mem = unmodified("1.07");
    let mut lib = lib();
    let g = lib.games.iter_mut().find(|g| g.game == Game::StarCraft).unwrap();
    let v = g.versions.iter_mut().find(|v| v.id == "1.07").unwrap();
    v.functions.insert("statdraw_draw_none".into(), None);
    let (g, v) = gv(&lib, "1.07");
    let m = parse_mod("m", with_header("starcraft", json!({"units": [{"id": 0, "display_function": "statdraw_draw_none"}]})).to_string().as_bytes(), &g.vocabulary()).unwrap();
    let e = plan("m", &m, g, v, &mem).unwrap_err();
    assert!(e.iter().any(|p| p.message.contains("statdraw_draw_none") && p.message.contains("1.07")), "{e:#?}");
}

#[test]
fn unit_given_a_set_absent_on_this_version() {
    rejected("1.07", json!({"units": [{"id": 0, "button_set": 4}]}), &["Button set 4", "StarCraft 1.07"]);
}

#[test]
fn button_card_absent_on_this_version() {
    rejected("1.07", json!({"button_sets": [{"id": 1, "buttons": [sc_button(json!({"action": "statcmd_set_ctrl", "action_variable": 4}))]}]}), &["Button card 4", "StarCraft 1.07"]);
    rejected("1.07", json!({"units": [{"id": 4, "button_set": 0}]}), &["Button card 4", "StarCraft 1.07"]);
    rejected("1.07", json!({"units": [{"id": 3, "connected_unit": 4}]}), &["Button card 4", "StarCraft 1.07"]);
}

// ---- Checking expected bytes

#[test]
fn modified_executable() {
    let (p, mem) = plan_on("1.16.1", json!({"constants": [{"name": "max_supply", "value": 600}, {"name": "spell_duration", "value": 9}]}), BASE, |m| {
        m.image[0x6000] = 0x2C;
    });
    let e = p.unwrap_err();
    assert_eq!(e.len(), 1);
    let msg = &e[0].message;
    for t in ["max_supply", "0x6000", &format!("{:#x}", BASE + 0x6000), "90 01", "2C 01"] {
        assert!(msg.contains(t), "{msg} should mention {t}");
    }
    assert!(mem.writes.is_empty());
}

#[test]
fn modified_button_card_or_stream_reference() {
    let (p, _) = plan_on("1.16.1", json!({"units": [{"id": 2, "button_set": null}]}), BASE, |m| {
        m.image[(SC + 24 + 4) as usize] ^= 1;
    });
    assert!(p.unwrap_err()[0].message.contains("button card 2"));
    let (p, _) = plan_on("1.16.1", json!({"requirements": [{"type": "unit", "id": 1, "list": []}]}), BASE, |m| {
        m.image[0x5010] ^= 1;
    });
    assert!(p.unwrap_err()[0].message.contains("0x5010"));
    let (p, _) = plan_on("1.16.1", json!({"requirements": [{"type": "unit", "id": 1, "list": []}]}), BASE, |m| {
        m.image[0x4002] = 0xFF;
        m.image[0x4003] = 0xFF;
    });
    assert!(p.unwrap_err()[0].message.contains("unit requirement stream"));
}

// ---- Validate everything before writing

#[test]
fn one_bad_value_among_many() {
    let lib = lib();
    let (g, _) = gv(&lib, "1.16.1");
    let m = with_header("starcraft", json!({"constants": [{"name": "max_supply", "value": 1}, {"name": "web_duration", "value": 2}, {"name": "sight_bonus", "value": 500}], "units": [{"id": 0, "button_set": 1}]}));
    let e = parse_mod("mod.json", m.to_string().as_bytes(), &g.vocabulary()).unwrap_err();
    assert_eq!(e.len(), 1);
}

#[test]
fn no_writes_when_planning_fails() {
    let mem = rejected("1.07", json!({"constants": [{"name": "max_supply", "value": 1}], "button_sets": [{"id": 4, "buttons": []}]}), &["Button set 4"]);
    assert!(mem.writes.is_empty() && mem.allocations.is_empty());
}

// ---- Load address independence

#[test]
fn executable_not_at_its_preferred_base() {
    let m = json!({
        "button_sets": [{"id": 0, "buttons": [sc_button(json!({}))]}],
        "units": [{"id": 1, "display_function": "statdraw_draw_none"}, {"id": 2, "button_set": 1}],
        "requirements": [{"type": "unit", "id": 1, "list": []}]
    });
    let lib = lib();
    let (_, v) = gv(&lib, "1.16.1");
    for base in [0x400000, BASE, 0x7FFE_0000] {
        let (p, mem) = applied_at("1.16.1", m.clone(), base);
        assert_eq!(p.base, base);
        assert_eq!(mem.u32_at(0x1100 + 12 + 8), base + v.functions["statdraw_draw_none"].unwrap());
        assert_eq!(card(&mem, 2).1, base + 0x2028, "an original set's pointer is rebased");
        let b = &mem.allocations[0].1;
        assert_eq!(u32::from_le_bytes(b[4..8].try_into().unwrap()), base + v.functions["bf_always"].unwrap());
        // The expected pointers were rebased too, or planning would have failed.
        assert!(p.changes.iter().any(|c| c.writes.iter().any(|w| w.expected == (base + 0x4000).to_le_bytes())));
    }
}

// ---- Confirming the writes

#[test]
fn write_that_doesnt_take_effect() {
    let (p, mut mem) = plan_on("1.16.1", json!({"constants": [{"name": "max_supply", "value": 600}]}), BASE, |_| {});
    mem.ignore_writes_at = Some(0x6000);
    let e = apply("mod.json", &p.unwrap(), &mut mem, &mut Vec::<String>::new()).unwrap_err();
    assert!(e[0].message.contains("0x6000") && e[0].message.contains("58 02") && e[0].message.contains("90 01"), "{e:#?}");
}

#[test]
fn writes_are_read_back() {
    let (p, mem) = applied("1.16.1", json!({"constants": [{"name": "max_supply", "value": 600}], "units": [{"id": 0, "button_set": null}]}));
    assert_eq!(mem.writes.len(), p.writes().count());
}
