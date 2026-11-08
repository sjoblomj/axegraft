//! Untrusted input safety: whatever the bytes, parsing returns a mod or
//! problems, and never panics.

mod common;

use axegraft_patcher_core::{parse_mod, Problem};
use common::*;
use proptest::prelude::*;
use serde_json::{json, Value};

fn outcome_is_sound(r: &Result<axegraft_patcher_core::Mod, Vec<Problem>>) {
    if let Err(ps) = r {
        assert!(!ps.is_empty(), "a rejection must name at least one problem");
        assert!(ps.iter().all(|p| p.input == "fuzz.json"), "every problem names its input");
    }
}

fn arb_json() -> impl Strategy<Value = Value> {
    let leaf = prop_oneof![
        Just(Value::Null),
        any::<bool>().prop_map(Value::Bool),
        any::<i64>().prop_map(|n| json!(n)),
        any::<u64>().prop_map(|n| json!(n)),
        (-1e20f64..1e20).prop_map(|f| json!(f)),
        prop_oneof![
            Just("AxeGraft".to_string()),
            Just("starcraft".to_string()),
            Just("warcraft2".to_string()),
            Just("bf_always".to_string()),
            Just("or".to_string()),
            Just("upgrade_level_1".to_string()),
            Just("end_sublist".to_string()),
            ".{0,12}",
        ]
        .prop_map(Value::String),
    ];
    leaf.prop_recursive(6, 64, 8, |inner| {
        prop_oneof![
            prop::collection::vec(inner.clone(), 0..8).prop_map(Value::Array),
            prop::collection::btree_map(
                prop_oneof![
                    Just("id".to_string()),
                    Just("list".to_string()),
                    Just("buttons".to_string()),
                    Just("position".to_string()),
                    Just("button_set".to_string()),
                    Just("name".to_string()),
                    Just("value".to_string()),
                    Just("type".to_string()),
                    "[a-z_]{1,10}",
                ],
                inner,
                0..8
            )
            .prop_map(|m| Value::Object(m.into_iter().collect())),
        ]
    })
}

/// A mod with a valid header and arbitrary parts, which reaches the
/// validators rather than stopping at the header.
fn arb_mod() -> impl Strategy<Value = Value> {
    (
        prop_oneof![Just("starcraft"), Just("warcraft2")],
        prop::collection::btree_map(
            prop_oneof![Just("units"), Just("button_sets"), Just("requirements"), Just("constants"), Just("mod"), Just("labels")],
            prop::collection::vec(arb_json(), 0..6).prop_map(Value::Array),
            0..6,
        ),
    )
        .prop_map(|(game, parts)| {
            let mut m = json!({"patcher": "AxeGraft", "format": 1, "game": game});
            for (k, v) in parts {
                m[k] = v;
            }
            m
        })
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(512))]

    #[test]
    fn arbitrary_bytes(bytes in prop::collection::vec(any::<u8>(), 0..512)) {
        let r = parse_mod("fuzz.json", &bytes, &sc());
        outcome_is_sound(&r);
    }

    #[test]
    fn arbitrary_json(v in arb_json()) {
        let r = parse_mod("fuzz.json", v.to_string().as_bytes(), &sc());
        outcome_is_sound(&r);
    }

    #[test]
    fn arbitrary_parts_with_a_valid_header(m in arb_mod()) {
        let vocab = if m["game"] == "warcraft2" { w2() } else { sc() };
        let r = parse_mod("fuzz.json", m.to_string().as_bytes(), &vocab);
        outcome_is_sound(&r);
    }

    #[test]
    fn arbitrary_requirement_lists(list in prop::collection::vec(prop_oneof![
        prop_oneof![Just("or"), Just("current_unit_is"), Just("must_have"), Just("upgrade_level_1"), Just("upgrade_level_2"), Just("upgrade_level_3"), Just("end_sublist"), Just("is_researched")].prop_map(|s| json!(s)),
        (-5i64..300).prop_map(|n| json!(n)),
    ], 0..20), kind in prop_oneof![Just("unit"), Just("upgrade"), Just("order")]) {
        let m = sc_mod(json!({"requirements": [{"type": kind, "id": 3, "list": list}]}));
        let r = parse_mod("fuzz.json", m.to_string().as_bytes(), &sc());
        outcome_is_sound(&r);
    }
}

#[test]
fn byte_order_mark() {
    let mut bytes = b"\xEF\xBB\xBF".to_vec();
    bytes.extend_from_slice(br#"{"patcher": "AxeGraft", "format": 1, "game": "warcraft2", "constants": [{"name": "mana_cycles", "value": 30}]}"#);
    let r = parse_mod("bom.json", &bytes, &w2());
    assert!(r.is_ok(), "{r:?}");
}

#[test]
fn malformed_input_names_the_input() {
    let cases: [&[u8]; 6] = [
        &[255, 254, 0, 65, 128, 129, 195, 40, 123, 125],
        b"",
        b"   ",
        br#"{"patcher": "AxeGraft", "format": 1,"#,
        b"[1, 2, 3]",
        b"\xEF\xBB\xBF",
    ];
    for bytes in cases {
        let Err(ps) = parse_mod("bad.json", bytes, &sc()) else { panic!("{bytes:?} was accepted") };
        assert_eq!(ps.len(), 1);
        assert_eq!(ps[0].input, "bad.json");
        assert_eq!(ps[0].path, "");
        assert!(ps[0].to_string().starts_with("bad.json: "));
    }
}

#[test]
fn deeply_nested_json() {
    for depth in [200usize, 10_000, 1_000_000] {
        let text = format!("{}{}", "[".repeat(depth), "]".repeat(depth));
        let Err(ps) = parse_mod("deep.json", text.as_bytes(), &sc()) else { panic!() };
        assert!(ps[0].message.contains("nested"), "{ps:?}");

        let inner = format!(r#"{{"patcher": "AxeGraft", "format": 1, "game": "starcraft", "labels": {}{}}}"#, "[".repeat(depth), "]".repeat(depth));
        let Err(ps) = parse_mod("deep.json", inner.as_bytes(), &sc()) else { panic!() };
        assert!(ps[0].message.contains("nested"), "{ps:?}");
    }
}

#[test]
fn huge_numbers() {
    for v in ["1e400", "-1e400", "18446744073709551616", "99999999999999999999999", "1e18", "-0.0", "5.0"] {
        let text = format!(r#"{{"patcher": "AxeGraft", "format": 1, "game": "starcraft", "constants": [{{"name": "max_supply", "value": {v}}}]}}"#);
        let r = parse_mod("n.json", text.as_bytes(), &sc());
        outcome_is_sound(&Result::map_err(r.clone(), |ps| ps.into_iter().map(|mut p| { p.input = "fuzz.json".into(); p }).collect()));
    }
    let r = parse_mod("n.json", br#"{"patcher": "AxeGraft", "format": 1, "game": "starcraft", "constants": [{"name": "max_supply", "value": 5.0}]}"#, &sc());
    assert!(r.is_ok());
}
