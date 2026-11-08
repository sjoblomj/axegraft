//! The library schema, read from a small fixture.

mod common;

use axegraft_patcher_core::encoding::Encoding;
use axegraft_patcher_core::library::*;
use axegraft_patcher_core::library_check::check_library;
use axegraft_patcher_core::{Game, ReqType, VarKind};
use common::toy_library;

#[test]
fn fixture_deserializes() {
    let lib = toy_library();
    let sc = lib.game(Game::StarCraft).unwrap();
    assert_eq!(sc.versions.len(), 2);
    let v = sc.version("1.16.1").unwrap();
    assert_eq!(v.identity.product_version, [1, 16, 1, 1]);
    assert_eq!(v.button_table, ButtonTable { rva: 0x1000, entries: 6, card: CardLayout::StarCraft, button: ButtonLayout::StarCraft });
    assert_eq!(v.status_table.layout, StatusLayout::StarCraft);
    assert_eq!(v.functions["statcmd_set_ctrl"], Some(0x3040));
    assert_eq!(sc.version("1.07").unwrap().functions["order_replay"], None);
    assert_eq!(sc.actions.iter().find(|f| f.name == "statcmd_set_ctrl").unwrap().variable, Some(VarKind::TableEntry));
    assert_eq!(v.sets[&0].as_ref().unwrap().entries, vec![0, 2]);
    assert_eq!(sc.version("1.07").unwrap().sets[&4], None);
    assert_eq!(sc.version("1.07").unwrap().entries[&5], Some(EntryOnVersion { number: 4, equivalent: None }));
    assert_eq!(v.entries[&3].unwrap().equivalent, Some(1));
    assert_eq!(v.streams[&ReqType::Order].base_refs, vec![0x5050, 0x5058]);
    assert_eq!(sc.opcode("end_sublist").unwrap().code, 0xFFFF);

    let spell = sc.constant("spell_duration").unwrap();
    let Availability::Locations { locations, reliability } = &spell.versions["1.16.1"] else { panic!() };
    assert_eq!(locations[1].encoding, Encoding::Neg16);
    assert!(reliability.is_reliable());
    let minerals = sc.constant("start_minerals").unwrap();
    let Availability::Locations { locations, .. } = &minerals.versions["1.07"] else { panic!() };
    assert_eq!(locations[1].encoding, Encoding::ByteOf { index: 1, width: 2 });
    assert_eq!(sc.constant("team_multiplier").unwrap().versions["1.07"], Availability::NotApplicable);
    assert_eq!(sc.constant("nuke_cost").unwrap().versions["1.16.1"], Availability::Unknown);
    let Availability::Options { options, sites, .. } = &sc.constant("cloak_energy").unwrap().versions["1.16.1"] else { panic!() };
    assert_eq!(options["original"][0], sites[0].expected);

    let w2 = lib.game(Game::Warcraft2).unwrap();
    let v = w2.version("2.02").unwrap();
    assert_eq!(v.status_table.layout, StatusLayout::Warcraft2Bne);
    assert_eq!(v.units[0].icon, Some(2));
    assert_eq!(v.sets[&0].as_ref().unwrap().buttons[0].highlighted, Some(2));
    assert!(v.streams.is_empty());
}

#[test]
fn fixture_passes_the_checks() {
    let problems = check_library(&toy_library());
    assert!(problems.is_empty(), "{problems:#?}");
}

#[test]
fn identify_by_timestamp_and_product_version() {
    let lib = toy_library();
    let (g, v) = lib.identify(&Identity { timestamp: 0x49658A5A, product_version: [1, 16, 1, 1] }).unwrap();
    assert_eq!((g.game, v.id.as_str()), (Game::StarCraft, "1.16.1"));
    assert!(lib.identify(&Identity { timestamp: 0x49658A5A, product_version: [1, 16, 1, 2] }).is_none());
    assert!(lib.identify(&Identity { timestamp: 0, product_version: [1, 16, 1, 1] }).is_none());
}

#[test]
fn vocabulary_from_the_library() {
    let lib = toy_library();
    let v = lib.game(Game::StarCraft).unwrap().vocabulary();
    assert_eq!(v.game, Game::StarCraft);
    let ids: Vec<u16> = v.sets.iter().map(|s| s.id).collect();
    assert_eq!(ids, [0, 1, 4, 5], "a set any version has is in the vocabulary");
    assert_eq!(v.sets[0].entries, [0, 2]);
    assert_eq!(v.opcodes.len(), 10);
    assert_eq!(v.constants.len(), 8);
}
