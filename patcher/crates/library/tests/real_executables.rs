//! The library against the real executables, and facts about the real
//! games that the data must keep.
//!
//! The executables are listed as for `check`: `AXEGRAFT_PATCHER_EXECUTABLES`,
//! or `executables.local.txt` at the repository's root. A test whose
//! executable isn't listed says so and passes; the facts that need no
//! executable always run.

use axegraft_patcher_core::apply::apply;
use axegraft_patcher_core::memory::{FakeMemory, Memory};
use axegraft_patcher_core::parse::parse_mod;
use axegraft_patcher_core::pe::{self, Layout};
use axegraft_patcher_core::plan::{plan, New};
use axegraft_patcher_core::stream;
use axegraft_patcher_core::verify::{expected, parse_executables};
use axegraft_patcher_core::{Game, ReqType};
use axegraft_patcher_library::{library, Availability, Library};
use serde_json::json;
use std::path::PathBuf;

fn executable(game: Game, version: &str) -> Option<Vec<u8>> {
    let list = std::env::var_os("AXEGRAFT_PATCHER_EXECUTABLES").map(PathBuf::from).unwrap_or_else(|| PathBuf::from(concat!(env!("CARGO_MANIFEST_DIR"), "/../../executables.local.txt")));
    let exes = parse_executables(&std::fs::read_to_string(list).ok()?).ok()?;
    let found = exes.get(&(game, version.to_string())).and_then(|p| std::fs::read(p).ok());
    if found.is_none() {
        eprintln!("SKIPPED: no executable for {} {version}; list it in executables.local.txt to run this check.", game.id());
    }
    found
}

fn version<'a>(lib: &'a Library, game: Game, v: &str) -> (&'a axegraft_patcher_library::GameLibrary, &'a axegraft_patcher_library::Version) {
    let g = lib.game(game).unwrap();
    (g, g.version(v).unwrap_or_else(|| panic!("{} {v} isn't in the library", game.id())))
}

// ---- 7.5: every requirement stream decodes and encodes back exactly

#[test]
fn requirement_streams_round_trip() {
    // Records per stream, from starcraft.md §4.2: order 73's record is gone from 1.16 on.
    let records = [(ReqType::Unit, 91), (ReqType::Upgrade, 51), (ReqType::TechResearch, 26), (ReqType::TechUse, 33), (ReqType::Order, 112)];
    for v in library().game(Game::StarCraft).unwrap().versions.iter().map(|v| v.id.as_str()) {
        let Some(file) = executable(Game::StarCraft, v) else { continue };
        let counted = matches!(v, "1.16" | "1.16.1" | "1.17");
        let (g, ver) = version(library(), Game::StarCraft, v);
        let h = pe::headers(&file).unwrap();
        for (t, count) in records {
            let s = &ver.streams[&t];
            let bytes = pe::at_rva(&file, &h, Layout::File, s.rva, s.length).unwrap();
            let decoded = stream::decode(bytes, &g.opcodes).unwrap_or_else(|e| panic!("{v} {t:?}: {e}"));
            assert_eq!(stream::encode(&decoded), bytes, "{v} {t:?} doesn't encode back to its bytes");
            if !counted {
                continue;
            }
            assert_eq!(decoded.len(), count, "{v} {t:?}");
            if t == ReqType::Order {
                assert!(decoded.iter().all(|r| r.id != 73), "{v} has no record for order 73");
            }
            if t == ReqType::Upgrade {
                let carapace = decoded.iter().find(|r| r.id == 3).unwrap();
                assert!(carapace.items.contains(&stream::Word::Op(0xFF1F)), "Zerg Carapace has upgrade levels");
            }
        }
    }
}

// ---- 7.6: planning example mods on memory loaded from the real executables

/// Where each version is loaded. 1.17 is the only starter version with
/// relocations, so it's the only one Windows can load elsewhere, and it's
/// loaded elsewhere here. The others can only be at 0x400000.
fn base_for(v: &str) -> u32 {
    if v == "1.17" {
        0x0A50_0000
    } else {
        0x0040_0000
    }
}

fn loaded(game: Game, v: &str) -> Option<FakeMemory> {
    let file = executable(game, v)?;
    let base = base_for(v);
    if base == 0x400000 {
        assert!(pe::load(&file, 0x0A50_0000).is_err(), "{v} has no relocations, so it can't be loaded elsewhere");
    }
    Some(FakeMemory::at(base, pe::load(&file, base).unwrap()))
}

fn sc_mod() -> serde_json::Value {
    json!({
        "patcher": "AxeGraft", "format": 1, "game": "starcraft",
        "constants": [{"name": "max_supply", "value": 600}, {"name": "permanent_cloak_energy", "option": "changed"}],
        "button_sets": [{"id": 0, "buttons": [
            {"position": 1, "icon": 228, "condition": "bf_always", "action": "order_move", "enabled_string": 664, "disabled_string": 0},
            {"position": 2, "icon": 229, "condition": "bf_always", "action": "order_stop", "enabled_string": 665, "disabled_string": 0}
        ]}],
        "units": [{"id": 7, "status_update": "statdraw_draw_none"}, {"id": 16, "equivalent_entry": null}],
        "requirements": [{"type": "upgrade", "id": 3, "list": ["current_unit_is", 131, "not_training_or_morphing", "upgrade_level_1", "end_sublist", "upgrade_level_2", 132, "end_sublist", "upgrade_level_3", 133]}]
    })
}

#[test]
fn plan_example_mods_on_starcraft() {
    for v in ["1.16.1", "1.17"] {
        let Some(mut mem) = loaded(Game::StarCraft, v) else { continue };
        let base = mem.base();
        let (g, ver) = version(library(), Game::StarCraft, v);
        let m = parse_mod("example.json", sc_mod().to_string().as_bytes(), &g.vocabulary()).unwrap();
        let p = plan("example.json", &m, g, ver, &mem).unwrap_or_else(|e| panic!("{v}: {e:#?}"));
        assert_eq!(p.base, base);

        // max_supply: 400, as the executable stores it.
        let Availability::Locations { locations, .. } = &g.constant("max_supply").unwrap().versions[v] else { panic!() };
        let c = p.changes.iter().find(|c| c.what == "constant max_supply = 600").unwrap();
        assert_eq!(c.writes[0].rva, locations[0].rva);
        assert_eq!(c.writes[0].expected, 400u16.to_le_bytes());

        // Set 0 reaches the Marine, Gui Montag, Jim Raynor and the Firebat.
        let set0 = ver.sets[&0].as_ref().unwrap();
        assert_eq!(set0.entries, [0, 10, 20, 32]);
        let replaced: Vec<_> = p.changes.iter().filter(|c| c.what.ends_with("set 0 replaced")).collect();
        assert_eq!(replaced.len(), 4);
        for c in &replaced {
            assert_eq!(c.writes[0].expected, (set0.buttons.len() as u16).to_le_bytes());
            assert_eq!(c.writes[1].expected, (base + set0.array).to_le_bytes(), "{v}: the pointer is rebased");
            assert!(matches!(c.writes[1].new, New::Pointer { .. }));
        }

        // The SCV's status update function, and Kerrigan's equivalent entry, 1.
        let scv = p.changes.iter().find(|c| c.what.starts_with("unit 7:")).unwrap();
        assert_eq!(scv.writes[0].expected, (base + ver.functions["statdraw_draw_unit"].unwrap()).to_le_bytes());
        let kerrigan = p.changes.iter().find(|c| c.what.starts_with("table entry 16:")).unwrap();
        assert_eq!((kerrigan.writes[0].expected.as_slice(), kerrigan.writes[0].new.clone()), (&1u16.to_le_bytes()[..], New::Bytes(0xFFFFu16.to_le_bytes().to_vec())));

        // The upgrade stream's references.
        let s = &ver.streams[&ReqType::Upgrade];
        let refs = p.changes.iter().find(|c| c.what.starts_with("upgrade requirements")).unwrap();
        assert_eq!(refs.writes.len(), s.base_refs.len() + s.plus2_refs.len());
        assert!(refs.writes.iter().all(|w| w.expected == (base + s.rva).to_le_bytes() || w.expected == (base + s.rva + 2).to_le_bytes()));

        let applied = apply("example.json", &p, &mut mem, &mut Vec::<String>::new()).unwrap();
        let blob = applied.blob_addresses[0];
        assert_eq!(mem.u32_at(ver.button_table.rva + 32 * 12 + 4), blob, "{v}: the Firebat has the new buttons");
        let new_stream = mem.allocation(applied.blob_addresses[1]).unwrap();
        let records = stream::decode(new_stream, &g.opcodes).unwrap();
        assert_eq!(records.len(), 51);
        assert_eq!(records.iter().find(|r| r.id == 3).unwrap().items[1], stream::Word::Num(131));
    }
}

#[test]
fn plan_example_mod_on_warcraft2() {
    let v = "2.02";
    let Some(mut mem) = loaded(Game::Warcraft2, v) else { return };
    let (g, ver) = version(library(), Game::Warcraft2, v);
    let m = json!({
        "patcher": "AxeGraft", "format": 1, "game": "warcraft2",
        "constants": [{"name": "slow_duration", "value": 500}, {"name": "farm_food", "option": "food_8"}],
        "button_sets": [{"id": 2, "buttons": [{"position": 0, "icon": 83, "condition": "bf_always", "action": "order_move", "string": 392, "highlighted": 2}]}],
        "units": [{"id": 0, "icon": 3, "status_update": "statdraw_draw_unit"}]
    });
    let m = parse_mod("example.json", m.to_string().as_bytes(), &g.vocabulary()).unwrap();
    let p = plan("example.json", &m, g, ver, &mem).unwrap_or_else(|e| panic!("{e:#?}"));
    let slow = p.changes.iter().find(|c| c.what == "constant slow_duration = 500").unwrap();
    assert_eq!(slow.writes.len(), 2);
    assert_eq!(slow.writes[0].expected, (-1000i16).to_le_bytes());
    assert_eq!(slow.writes[1].expected, (-1000i32).to_le_bytes());
    let food = p.changes.iter().find(|c| c.what == "constant farm_food = food_8").unwrap();
    assert_eq!((food.writes[0].expected.as_slice(), food.writes[0].new.clone()), (&[141u8][..], New::Bytes(vec![205])));
    let footman = p.changes.iter().find(|c| c.what == "unit 0: icon = 3").unwrap();
    assert_eq!(footman.writes[0].expected, 2u16.to_le_bytes());
    assert_eq!(footman.writes[0].rva, ver.status_table.rva);

    apply("example.json", &p, &mut mem, &mut Vec::<String>::new()).unwrap();
    assert_eq!(mem.u16_at(ver.status_table.rva), 3);
    let at = slow.writes[1].rva;
    assert_eq!(mem.u32_at(at) as i32, -500);
    // The Peasant's 8-byte command list entry holds the new set.
    let peasant = ver.button_table.rva + 2 * 8;
    assert_eq!(mem.u32_at(peasant), 1);
}

// ---- 7.7: facts about the real games

type Fact = (&'static str, fn(&Library) -> Result<(), String>);

fn ensure(ok: bool, what: &str) -> Result<(), String> {
    if ok {
        Ok(())
    } else {
        Err(what.to_string())
    }
}

fn facts() -> Vec<Fact> {
    vec![
        ("StarCraft has units 0-227 and 250 table entries", |l| {
            let g = l.game(Game::StarCraft).unwrap();
            ensure(g.limits.unit.min == 0 && g.limits.unit.max == 227 && g.limits.table_entries == 250, "StarCraft's ranges")
        }),
        ("Warcraft II has units 0-109 and 120 table entries", |l| {
            let g = l.game(Game::Warcraft2).unwrap();
            ensure(g.limits.unit.max == 109 && g.limits.table_entries == 120, "Warcraft II's ranges")
        }),
        ("Button positions are 1-9 in StarCraft and 0-8 in Warcraft II", |l| {
            let (s, w) = (&l.game(Game::StarCraft).unwrap().limits.position, &l.game(Game::Warcraft2).unwrap().limits.position);
            ensure((s.min, s.max, w.min, w.max) == (1, 9, 0, 8), "button positions")
        }),
        ("StarCraft's condition variable is a byte, its action variable a word", |l| {
            let g = l.game(Game::StarCraft).unwrap();
            ensure(g.limits.condition_variable.max == 255 && g.limits.action_variable.max == 65535, "variable fields")
        }),
        ("Set 0 is the Marine's, shared with Gui Montag, Jim Raynor and the Firebat", |l| {
            let g = l.game(Game::StarCraft).unwrap();
            ensure(g.versions.iter().all(|v| v.sets[&0].as_ref().is_some_and(|s| s.entries == [0, 10, 20, 32])), "set 0's entries")
        }),
        ("Entry 247, which isn't a unit, uses set 37", |l| {
            let g = l.game(Game::StarCraft).unwrap();
            ensure(g.versions.iter().all(|v| v.sets[&37].as_ref().is_some_and(|s| s.entries.contains(&247))), "entry 247's set")
        }),
        ("Sarah Kerrigan's equivalent entry is the Ghost", |l| {
            let g = l.game(Game::StarCraft).unwrap();
            ensure(g.versions.iter().all(|v| v.entries[&16].unwrap().equivalent == Some(1)), "unit 16's equivalent entry")
        }),
        ("StarCraft has 94 sets and 544 buttons up to 1.07, 96 and 550 up to 1.11b, and 98 and 554 from 1.12 on", |l| {
            let g = l.game(Game::StarCraft).unwrap();
            ensure(
                g.versions.iter().all(|v| {
                    let expected = match v.button_table.entries {
                        246 => (94, 544),
                        248 => (96, 550),
                        _ => (98, 554),
                    };
                    (v.sets.values().flatten().count(), v.sets.values().flatten().map(|s| s.buttons.len()).sum::<usize>()) == expected
                }),
                "StarCraft's sets",
            )
        }),
        ("Warcraft II has 58 command lists in 2.02", |l| ensure(l.game(Game::Warcraft2).unwrap().version("2.02").unwrap().sets.values().flatten().count() == 58, "Warcraft II's sets")),
        ("bf_can_attack is bf_always in 2.02, whose buttons use only bf_always", |l| {
            let v = l.game(Game::Warcraft2).unwrap().version("2.02").unwrap();
            ensure(v.functions["bf_can_attack"].is_none() && v.functions["bf_always"].is_some(), "bf_can_attack's absence")
        }),
        ("1.17's tables aren't where 1.16.1's are", |l| {
            let g = l.game(Game::StarCraft).unwrap();
            ensure(g.version("1.17").unwrap().button_table.rva != g.version("1.16.1").unwrap().button_table.rva, "1.17's gCards")
        }),
    ]
}

#[test]
fn facts_about_the_games() {
    for (what, f) in facts() {
        f(library()).unwrap_or_else(|e| panic!("{what}: {e}"));
    }
}

fn version_mut<'a>(l: &'a mut Library, game: usize, id: &str) -> &'a mut axegraft_patcher_library::Version {
    l.games[game].versions.iter_mut().find(|v| v.id == id).unwrap()
}

/// Each fact fails when the data it's about is altered.
#[test]
fn facts_fail_on_altered_data() {
    let alterations: Vec<fn(&mut Library)> = vec![
        |l| l.games[0].limits.unit.max = 228,
        |l| l.games[1].limits.table_entries = 119,
        |l| l.games[1].limits.position.min = 1,
        |l| l.games[0].limits.condition_variable.max = 65535,
        |l| l.games[0].versions[0].sets.get_mut(&0).unwrap().as_mut().unwrap().entries.pop().map(|_| ()).unwrap(),
        |l| l.games[0].versions[1].sets.get_mut(&37).unwrap().as_mut().unwrap().entries.retain(|e| *e != 247),
        |l| l.games[0].versions[0].entries.get_mut(&16).unwrap().as_mut().unwrap().equivalent = None,
        |l| l.games[0].versions[1].sets.get_mut(&0).unwrap().as_mut().unwrap().buttons.pop().map(|_| ()).unwrap(),
        |l| *version_mut(l, 1, "2.02").sets.get_mut(&2).unwrap() = None,
        |l| *version_mut(l, 1, "2.02").functions.get_mut("bf_can_attack").unwrap() = Some(0x1000),
        |l| {
            let rva = version_mut(l, 0, "1.16.1").button_table.rva;
            version_mut(l, 0, "1.17").button_table.rva = rva;
        },
    ];
    let facts = facts();
    assert_eq!(alterations.len(), facts.len());
    for ((what, f), alter) in facts.into_iter().zip(alterations) {
        let mut l = library().clone();
        assert_eq!(l.games[0].game, Game::StarCraft);
        alter(&mut l);
        assert!(f(&l).is_err(), "\"{what}\" still holds after its data was altered");
    }
}

#[test]
fn version_loading_away_from_its_preferred_address() {
    let Some(file) = executable(Game::StarCraft, "1.17") else { return };
    let (g, v) = version(library(), Game::StarCraft, "1.17");
    let h = pe::headers(&file).unwrap();
    assert_eq!(h.image_base, 0x400000);
    assert!(h.relocations.is_some(), "1.17 has relocations");
    let base = 0x0A50_0000;
    let img = pe::load(&file, base).unwrap();
    let check = |lib_expected: Vec<axegraft_patcher_core::verify::Expected>| lib_expected.iter().filter(|e| img[e.rva as usize..e.rva as usize + e.bytes.len()] != e.bytes[..]).count();
    assert_eq!(check(expected(g, v, base)), 0, "every pointer the library expects is right at the new base");
    assert!(check(expected(g, v, 0x400000)) > 1000, "and wrong at the preferred base");

    let mut altered = v.clone();
    altered.sets.get_mut(&0).unwrap().as_mut().unwrap().array += 4;
    assert!(check(expected(g, &altered, base)) > 0, "a wrong array address is caught");
}
