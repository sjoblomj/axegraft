//! The library's guarantees, each shown failing on a deliberately bad fixture.

use axegraft_patcher_core::library::{Availability, Identity, Library};
use axegraft_patcher_core::library_check::check_library;
use axegraft_patcher_core::Game;
use serde_json::{json, Value};

fn toy_json() -> Value {
    let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/library/toy");
    axegraft_patcher_core::library_files::load_dir_json(&dir).unwrap()
}

fn sc(v: &mut Value) -> &mut Value {
    &mut v["games"][0]
}

fn version<'a>(v: &'a mut Value, id: &str) -> &'a mut Value {
    sc(v)["versions"].as_array_mut().unwrap().iter_mut().find(|x| x["id"] == id).unwrap()
}

fn constant<'a>(v: &'a mut Value, name: &str) -> &'a mut Value {
    sc(v)["constants"].as_array_mut().unwrap().iter_mut().find(|x| x["name"] == name).unwrap()
}

fn library(v: Value) -> Library {
    serde_json::from_value(v).unwrap()
}

/// The problems of the toy library after a change.
fn problems_after(change: impl FnOnce(&mut Value)) -> Vec<String> {
    let mut v = toy_json();
    change(&mut v);
    check_library(&library(v))
}

/// Asserts some problem mentions all of the texts.
#[track_caller]
fn fails_with(problems: &[String], texts: &[&str]) {
    assert!(problems.iter().any(|p| texts.iter().all(|t| p.contains(t))), "no problem mentions all of {texts:?}: {problems:#?}");
}

#[test]
fn the_fixture_itself_passes() {
    assert_eq!(problems_after(|_| {}), Vec::<String>::new());
}

// ---- 4.3: availability, locations, expected bytes, confirmation, structure, names

#[test]
fn forgotten_version() {
    let p = problems_after(|v| {
        constant(v, "max_supply")["versions"].as_object_mut().unwrap().remove("1.07");
    });
    fails_with(&p, &["starcraft 1.07", "constant max_supply", "has no entry"]);
}

#[test]
fn constant_with_an_unlisted_copy() {
    let p = problems_after(|v| {
        constant(v, "max_supply")["versions"]["1.16.1"]["locations"]["reliability"] = json!({"incomplete": true});
    });
    fails_with(&p, &["starcraft 1.16.1", "constant max_supply", "must be unknown"]);
}

#[test]
fn entry_without_expected_bytes() {
    let p = problems_after(|v| {
        constant(v, "max_supply")["versions"]["1.16.1"]["locations"]["locations"][0]["expected"] = json!([]);
    });
    fails_with(&p, &["starcraft 1.16.1", "constant max_supply", "location 0x6000", "no expected bytes"]);
    let p = problems_after(|v| {
        constant(v, "max_supply")["versions"]["1.16.1"]["locations"]["locations"][0]["expected"] = json!([1]);
    });
    fails_with(&p, &["constant max_supply", "1 expected bytes"]);
    let p = problems_after(|v| {
        constant(v, "cloak_energy")["versions"]["1.07"]["options"]["sites"][0]["expected"] = json!([]);
    });
    fails_with(&p, &["starcraft 1.07", "constant cloak_energy", "site 0x7000", "no expected bytes"]);
}

#[test]
fn unconfirmed_entry() {
    let mut v = toy_json();
    constant(&mut v, "web_duration")["versions"]["1.07"]["locations"]["reliability"] = json!({"unconfirmed": true});
    let lib = library(v);
    fails_with(&check_library(&lib), &["starcraft 1.07", "constant web_duration", "unconfirmed"]);

    // Left out, it is unknown, and the library passes.
    let lib = lib.without_unreliable();
    assert_eq!(lib.game(Game::StarCraft).unwrap().constant("web_duration").unwrap().versions["1.07"], Availability::Unknown);
    assert_eq!(check_library(&lib), Vec::<String>::new());
}

#[test]
fn incomplete_entry_is_left_out_as_unknown() {
    let mut v = toy_json();
    constant(&mut v, "max_supply")["versions"]["1.07"]["locations"]["reliability"] = json!({"incomplete": true});
    let lib = library(v).without_unreliable();
    assert_eq!(lib.game(Game::StarCraft).unwrap().constant("max_supply").unwrap().versions["1.07"], Availability::Unknown);
    assert_eq!(check_library(&lib), Vec::<String>::new());
}

#[test]
fn missing_structural_data() {
    fails_with(&problems_after(|v| { version(v, "1.16.1")["functions"].as_object_mut().unwrap().remove("bf_research"); }), &["starcraft 1.16.1", "function bf_research", "missing"]);
    fails_with(&problems_after(|v| { version(v, "1.16.1")["entries"].as_object_mut().unwrap().remove("4"); }), &["starcraft 1.16.1", "table entry 4", "missing"]);
    fails_with(&problems_after(|v| { version(v, "1.07")["streams"].as_object_mut().unwrap().remove("tech_use"); }), &["starcraft 1.07", "requirement stream tech_use", "missing"]);
    fails_with(&problems_after(|v| { version(v, "1.16.1")["units"].as_array_mut().unwrap().pop(); }), &["starcraft 1.16.1", "units", "3 are listed", "has 4"]);
    fails_with(&problems_after(|v| { version(v, "1.16.1")["sets"]["0"]["entries"] = json!([2]); }), &["starcraft 1.16.1", "set 0", "lowest entry"]);
    fails_with(&problems_after(|v| { version(v, "1.16.1")["entries"]["2"] = Value::Null; }), &["starcraft 1.16.1", "table entry 2", "is a unit"]);
    fails_with(&problems_after(|v| { version(v, "1.16.1")["button_table"]["entries"] = json!(7); }), &["starcraft 1.16.1", "button table", "7 entries"]);
    fails_with(&problems_after(|v| { version(v, "1.16.1")["units"][1]["status_unit_type"] = Value::Null; }), &["starcraft 1.16.1", "unit 1", "status entry fields"]);
    fails_with(&problems_after(|v| { version(v, "1.16.1")["status_table"]["layout"] = json!("warcraft2_bne"); }), &["starcraft 1.16.1", "layouts"]);
}

#[test]
fn originals_must_use_functions_present_on_the_version() {
    let p = problems_after(|v| {
        version(v, "1.07")["sets"]["5"]["buttons"][0]["action"] = json!("order_replay");
    });
    fails_with(&p, &["starcraft 1.07", "set 5 button 0", "order_replay", "absent on this version"]);
}

#[test]
fn function_names_must_be_unique() {
    let p = problems_after(|v| {
        sc(v)["actions"].as_array_mut().unwrap().push(json!({"name": "bf_always", "variable": null}));
    });
    fails_with(&p, &["starcraft", "function bf_always", "used twice"]);
}

#[test]
fn version_without_data_or_for_dos() {
    let p = problems_after(|v| {
        v["games"][1]["versions"][0]["id"] = json!("1.5");
        v["games"][1]["constants"][0]["versions"] = json!({"1.5": {"locations": {"locations": [{"rva": 24576, "encoding": "u8", "expected": [40]}]}}});
    });
    fails_with(&p, &["warcraft2", "version 1.5", "isn't a version the library can describe"]);
    let lib = library(toy_json());
    assert!(lib.identify(&Identity { timestamp: 1, product_version: [1, 5, 0, 0] }).is_none());
}

#[test]
fn versions_must_be_told_apart() {
    let p = problems_after(|v| {
        let id = version(v, "1.16.1")["identity"].clone();
        version(v, "1.07")["identity"] = id;
    });
    fails_with(&p, &["can't be told apart", "1.07", "1.16.1"]);
}

#[test]
fn versions_sharing_a_timestamp_are_still_told_apart() {
    let mut v = toy_json();
    let ts = version(&mut v, "1.16.1")["identity"]["timestamp"].clone();
    version(&mut v, "1.07")["identity"]["timestamp"] = ts;
    let lib = library(v);
    assert_eq!(check_library(&lib), Vec::<String>::new());
    let a = lib.identify(&Identity { timestamp: 0x49658A5A, product_version: [1, 16, 1, 1] }).unwrap().1;
    let b = lib.identify(&Identity { timestamp: 0x49658A5A, product_version: [1, 0, 7, 1] }).unwrap().1;
    assert_eq!((a.id.as_str(), b.id.as_str()), ("1.16.1", "1.07"));
}

#[test]
fn unknown_encoding_fails_the_build() {
    let mut v = toy_json();
    constant(&mut v, "max_supply")["versions"]["1.16.1"]["locations"]["locations"][0]["encoding"] = json!("u24");
    let e = serde_json::from_value::<Library>(v).unwrap_err().to_string();
    assert!(e.contains("u24"), "{e}");
}

// ---- 4.4: shared locations, range fit, scale, options, shared addresses

#[test]
fn two_constants_on_one_offset() {
    let p = problems_after(|v| {
        constant(v, "web_duration")["versions"]["1.07"]["locations"]["locations"][0]["rva"] = json!(0x6011);
    });
    fails_with(&p, &["starcraft 1.07", "constant max_supply", "constant web_duration", "overlap"]);
}

#[test]
fn constant_overlapping_a_table() {
    let p = problems_after(|v| {
        constant(v, "team_multiplier")["versions"]["1.16.1"]["locations"]["locations"][0]["rva"] = json!(0x1000 + 12 * 2 + 4);
    });
    fails_with(&p, &["starcraft 1.16.1", "button table entry 2", "constant team_multiplier", "overlap"]);
}

#[test]
fn location_listed_twice() {
    let p = problems_after(|v| {
        let l = constant(v, "max_supply")["versions"]["1.07"]["locations"]["locations"][0].clone();
        constant(v, "max_supply")["versions"]["1.07"]["locations"]["locations"][1] = l;
    });
    fails_with(&p, &["starcraft 1.07", "constant max_supply", "overlapping locations"]);
}

#[test]
fn range_too_wide_for_a_location() {
    let p = problems_after(|v| {
        constant(v, "team_multiplier")["kind"] = json!({"number": {"min": 0, "max": 256}});
    });
    fails_with(&p, &["starcraft 1.16.1", "constant team_multiplier", "doesn't fit"]);
    let p = problems_after(|v| {
        constant(v, "spell_duration")["kind"] = json!({"number": {"min": 0, "max": 32769}});
    });
    fails_with(&p, &["constant spell_duration", "location 0x6024", "doesn't fit"]);
}

#[test]
fn scale_differs_between_versions() {
    let p = problems_after(|v| {
        constant(v, "web_duration")["versions"]["1.07"]["locations"]["locations"][0]["scale"] = json!(2);
    });
    fails_with(&p, &["constant web_duration", "different scales", "1.07", "1.16.1"]);
}

#[test]
fn option_with_a_location_missing_on_a_version() {
    let p = problems_after(|v| {
        constant(v, "cloak_energy")["versions"]["1.07"]["options"]["options"]["regain"] = json!([[0x90, 0x90]]);
    });
    fails_with(&p, &["starcraft 1.07", "constant cloak_energy", "option regain", "unknown"]);
}

#[test]
fn original_option_must_be_the_expected_bytes() {
    let p = problems_after(|v| {
        constant(v, "cloak_energy")["versions"]["1.16.1"]["options"]["options"]["original"][0] = json!([0x90, 0x90]);
    });
    fails_with(&p, &["starcraft 1.16.1", "constant cloak_energy", "option original"]);
    let p = problems_after(|v| {
        constant(v, "cloak_energy")["kind"] = json!({"options": {"options": ["regain"]}});
        for vid in ["1.16.1", "1.07"] {
            constant(v, "cloak_energy")["versions"][vid]["options"]["options"].as_object_mut().unwrap().remove("original");
        }
    });
    fails_with(&p, &["constant cloak_energy", "option named original"]);
}

#[test]
fn two_names_sharing_an_address() {
    // bf_can_attack is absent on 2.02: fine.
    assert_eq!(problems_after(|_| {}), Vec::<String>::new());

    // Present at bf_always's address while the original buttons use only
    // bf_always: rejected.
    let p = problems_after(|v| {
        v["games"][1]["versions"][0]["functions"]["bf_can_attack"] = json!(0x3000);
    });
    fails_with(&p, &["warcraft2 2.02", "function bf_can_attack", "shares address", "bf_always", "must be absent"]);

    // Both used by the original buttons: kept.
    let p = problems_after(|v| {
        let w = &mut v["games"][1]["versions"][0];
        w["functions"]["bf_can_attack"] = json!(0x3000);
        w["sets"]["2"]["buttons"][0]["condition"] = json!("bf_can_attack");
    });
    assert_eq!(p, Vec::<String>::new());
}
