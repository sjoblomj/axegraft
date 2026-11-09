//! The scenarios of the mod-format spec, one test each.

mod common;

use axegraft_patcher_core::model::*;
use axegraft_patcher_core::{Game, ReqType};
use common::*;
use serde_json::json;

// ---- Mod header

#[test]
fn header_valid() {
    let m = accepted(&json!({"patcher": "AxeGraft", "format": 1, "game": "starcraft"}));
    assert_eq!(m.game, Game::StarCraft);
}

#[test]
fn header_property_order_doesnt_matter() {
    let m = parse_bytes(br#"{"game": "starcraft", "format": 1, "patcher": "AxeGraft"}"#);
    assert!(m.is_ok());
}

#[test]
fn header_missing_patcher() {
    let ps = rejected_at(&json!({"format": 1, "game": "starcraft"}), &["patcher"]);
    mentions(&ps, &["isn't an AxeGraft Patcher mod"]);
}

#[test]
fn header_wrong_patcher() {
    let ps = rejected_at(&json!({"patcher": "FireGraft", "format": 1, "game": "starcraft"}), &["patcher"]);
    mentions(&ps, &["isn't an AxeGraft Patcher mod"]);
    rejected_at(&json!({"patcher": "axegraft", "format": 1, "game": "starcraft"}), &["patcher"]);
}

#[test]
fn header_unsupported_format() {
    let ps = rejected_at(&json!({"patcher": "AxeGraft", "format": 2, "game": "starcraft"}), &["format"]);
    mentions(&ps, &["format version 2"]);
}

#[test]
fn header_unknown_game() {
    let ps = rejected_at(&json!({"patcher": "AxeGraft", "format": 1, "game": "diablo"}), &["game"]);
    mentions(&ps, &["\"diablo\""]);
}

#[test]
fn header_with_game_version_is_rejected() {
    rejected_at(&json!({"patcher": "AxeGraft", "format": 1, "game": "starcraft", "version": "1.16.1"}), &["version"]);
}

// ---- Mod information

#[test]
fn mod_with_information_changes_nothing() {
    let with = accepted(&sc_mod(json!({"mod": {"name": "Faster Marines", "version": "1.2", "authors": ["Alice", "Bob"]}, "constants": [{"name": "max_supply", "value": 10}]})));
    let without = accepted(&sc_mod(json!({"constants": [{"name": "max_supply", "value": 10}]})));
    assert_eq!(with, without);
}

#[test]
fn mod_without_information() {
    accepted(&sc_mod(json!({})));
    accepted(&sc_mod(json!({"mod": {}})));
    accepted(&sc_mod(json!({"mod": {"name": "", "version": "", "authors": []}})));
}

#[test]
fn mod_information_other_properties() {
    let with = accepted(&sc_mod(json!({"mod": {"name": "X", "website": "example.org", "nested": {"a": [1]}}})));
    assert_eq!(with, accepted(&sc_mod(json!({}))));
}

#[test]
fn mod_information_of_wrong_type() {
    rejected_at(&sc_mod(json!({"mod": "Faster Marines"})), &["mod"]);
    rejected_at(&sc_mod(json!({"mod": {"name": 5, "version": 1.2, "authors": ["Alice", 2]}})), &["mod.authors[1]", "mod.name", "mod.version"]);
    rejected_at(&sc_mod(json!({"mod": {"authors": "Alice"}})), &["mod.authors"]);
}

// ---- Mod parts

#[test]
fn only_some_parts_present() {
    let m = accepted(&sc_mod(json!({"constants": [{"name": "max_supply", "value": 400}]})));
    assert!(m.units.is_empty() && m.button_sets.is_empty() && m.requirements.is_empty());
    assert_eq!(m.constants.len(), 1);
}

#[test]
fn requirements_in_warcraft2_mod() {
    rejected_at(&w2_mod(json!({"requirements": []})), &["requirements"]);
}

#[test]
fn part_that_isnt_an_array() {
    rejected_at(&sc_mod(json!({"units": {"id": 0}})), &["units"]);
    rejected_at(&sc_mod(json!({"units": [5, {"id": 0, "button_set": 5}]})), &["units[0]"]);
}

// ---- Strict fields

#[test]
fn unknown_field() {
    let ps = rejected_at(&sc_mod(json!({"units": [{"id": 0, "buttonset": 5}]})), &["units[0].buttonset"]);
    mentions(&ps, &["buttonset"]);
    rejected_at(&sc_mod(json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({"hotkey": "m"}))]}]})), &["button_sets[0].buttons[0].hotkey"]);
}

#[test]
fn mod_cant_give_a_location_or_encoding() {
    rejected_at(&sc_mod(json!({"constants": [{"name": "max_supply", "value": 1, "offset": 4096}]})), &["constants[0].offset"]);
    rejected_at(&sc_mod(json!({"constants": [{"name": "max_supply", "value": 1, "encoding": "u8"}]})), &["constants[0].encoding"]);
}

#[test]
fn label_is_ignored() {
    let a = accepted(&sc_mod(json!({
        "units": [{"id": 0, "label": "Marine", "button_set": 5}],
        "button_sets": [{"id": 5, "label": "Tank", "buttons": [sc_button(json!({"label": "Move"}))]}],
        "requirements": [{"type": "unit", "id": 0, "label": "x", "list": []}],
        "constants": [{"name": "max_supply", "label": "y", "value": 1}]
    })));
    let b = accepted(&sc_mod(json!({
        "units": [{"id": 0, "label": "Something else", "button_set": 5}],
        "button_sets": [{"id": 5, "buttons": [sc_button(json!({}))]}],
        "requirements": [{"type": "unit", "id": 0, "list": []}],
        "constants": [{"name": "max_supply", "value": 1}]
    })));
    assert_eq!(a, b);
}

#[test]
fn label_at_top_level() {
    rejected_at(&sc_mod(json!({"label": "My mod"})), &["label"]);
}

#[test]
fn label_that_isnt_text() {
    rejected_at(&sc_mod(json!({"units": [{"id": 0, "label": 5, "button_set": 5}]})), &["units[0].label"]);
}

// ---- Editor labels

#[test]
fn labels_are_ignored() {
    let a = accepted(&sc_mod(json!({"labels": {"units": {"0": "Rifleman"}}, "units": [{"id": 0, "button_set": 5}]})));
    let b = accepted(&sc_mod(json!({"labels": {"units": {"0": "Space Marine", "33": "x"}}, "units": [{"id": 0, "button_set": 5}]})));
    let c = accepted(&sc_mod(json!({"units": [{"id": 0, "button_set": 5}]})));
    assert_eq!(a, b);
    assert_eq!(a, c);
}

#[test]
fn labels_of_any_shape() {
    accepted(&sc_mod(json!({"labels": [1, 2]})));
    accepted(&sc_mod(json!({"labels": {"units": {"9999": "Beyond the table", "0": 5}, "upgrades": []}})));
    accepted(&sc_mod(json!({"labels": "text"})));
}

// ---- Identifying game content and engine behaviour

#[test]
fn unknown_behaviour_names() {
    let ps = rejected_at(&sc_mod(json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({"condition": "bf_sometimes"}))]}]})), &["button_sets[0].buttons[0].condition"]);
    mentions(&ps, &["bf_sometimes"]);
    let ps = rejected_at(&sc_mod(json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({"action": "order_dance"}))]}]})), &["button_sets[0].buttons[0].action"]);
    mentions(&ps, &["order_dance"]);
    let ps = rejected_at(&sc_mod(json!({"units": [{"id": 0, "display_function": "statdraw_draw_mystery"}]})), &["units[0].display_function"]);
    mentions(&ps, &["statdraw_draw_mystery"]);
    let ps = rejected_at(&sc_mod(json!({"requirements": [{"type": "unit", "id": 0, "list": ["can_fly"]}]})), &["requirements[0].list[0]"]);
    mentions(&ps, &["can_fly"]);
    let ps = rejected_at(&sc_mod(json!({"constants": [{"name": "gravity", "value": 1}]})), &["constants[0].name"]);
    mentions(&ps, &["gravity"]);
}

#[test]
fn number_used_for_a_function() {
    rejected_at(
        &sc_mod(json!({
            "units": [{"id": 0, "status_changed": 4377984}],
            "button_sets": [{"id": 0, "buttons": [sc_button(json!({"condition": 4352720}))]}]
        })),
        &["button_sets[0].buttons[0].condition", "units[0].status_changed"],
    );
}

// ---- Unit entries

#[test]
fn change_only_the_button_set() {
    let m = accepted(&sc_mod(json!({"units": [{"id": 0, "button_set": 5}]})));
    assert_eq!(m.units, vec![UnitChange { id: 0, field: UnitField::ButtonSet(Some(5)) }]);
}

#[test]
fn change_only_one_status_function() {
    let m = accepted(&sc_mod(json!({"units": [{"id": 0, "display_function": "statdraw_draw_none"}]})));
    assert_eq!(m.units, vec![UnitChange { id: 0, field: UnitField::DisplayFunction("statdraw_draw_none".into()) }]);
}

#[test]
fn entry_with_nothing_to_change() {
    rejected_at(&sc_mod(json!({"units": [{"id": 0}]})), &["units[0]"]);
    rejected_at(&sc_mod(json!({"units": [{"id": 0, "label": "only a label"}]})), &["units[0]"]);
}

#[test]
fn button_card_that_isnt_a_unit() {
    accepted(&sc_mod(json!({"units": [{"id": 238, "button_set": 0}]})));
}

#[test]
fn status_function_on_entry_that_isnt_a_unit() {
    let ps = rejected_at(&sc_mod(json!({"units": [{"id": 238, "display_function": "statdraw_draw_unit"}]})), &["units[0].display_function"]);
    mentions(&ps, &["isn't a unit"]);
}

#[test]
fn unit_id_out_of_range() {
    rejected_at(&sc_mod(json!({"units": [{"id": 250, "button_set": 0}]})), &["units[0].id"]);
    rejected_at(&sc_mod(json!({"units": [{"id": -1, "button_set": 0}]})), &["units[0].id"]);
    rejected_at(&w2_mod(json!({"units": [{"id": 120, "button_set": 0}]})), &["units[0].id"]);
}

#[test]
fn debug_id_in_warcraft2_mod() {
    rejected_at(&w2_mod(json!({"units": [{"id": 0, "debug_id": 0}]})), &["units[0].debug_id"]);
}

#[test]
fn unit_icon_in_starcraft_mod() {
    let ps = rejected_at(&sc_mod(json!({"units": [{"id": 0, "icon": 5}]})), &["units[0].icon"]);
    mentions(&ps, &["no icon"]);
}

#[test]
fn unit_icon_on_entry_that_isnt_a_unit() {
    rejected_at(&w2_mod(json!({"units": [{"id": 111, "icon": 5}]})), &["units[0].icon"]);
}

#[test]
fn unit_data_fields_in_starcraft_mod() {
    rejected_at(&sc_mod(json!({"units": [{"id": 0, "stats_frame": 1, "name_string": 2}]})), &["units[0].name_string", "units[0].stats_frame"]);
}

#[test]
fn connected_unit_in_warcraft2_mod() {
    rejected_at(&w2_mod(json!({"units": [{"id": 0, "connected_unit": 1}]})), &["units[0].connected_unit"]);
}

#[test]
fn warcraft2_unit_fields() {
    let m = accepted(&w2_mod(json!({"units": [{"id": 0, "button_set": 2, "icon": 7, "stats_frame": 2, "name_string": 9, "status_changed": "statdraw_query_unit", "display_function": "statdraw_draw_unit"}]})));
    assert_eq!(m.units.len(), 6);
    assert!(m.units.contains(&UnitChange { id: 0, field: UnitField::StatsFrame(2) }));
}

// ---- Unit entry fields

#[test]
fn status_function_of_the_wrong_kind() {
    let ps = rejected_at(
        &sc_mod(json!({"units": [{"id": 0, "status_changed": "statdraw_draw_unit", "display_function": "statdraw_query_unit"}]})),
        &["units[0].status_changed", "units[0].display_function"],
    );
    mentions(&ps, &["status_changed", "display_function"]);
}

#[test]
fn debug_id_out_of_range() {
    rejected_at(&sc_mod(json!({"units": [{"id": 0, "debug_id": 228}]})), &["units[0].debug_id"]);
    accepted(&sc_mod(json!({"units": [{"id": 0, "debug_id": 227}]})));
}

#[test]
fn unit_icon_id_beyond_original_icons() {
    let m = accepted(&w2_mod(json!({"units": [{"id": 0, "icon": 65535}]})));
    assert_eq!(m.units[0].field, UnitField::Icon(65535));
    rejected_at(&w2_mod(json!({"units": [{"id": 0, "icon": 65536}]})), &["units[0].icon"]);
}

#[test]
fn unit_name_string_beyond_original_strings() {
    accepted(&w2_mod(json!({"units": [{"id": 0, "name_string": 60000}]})));
    rejected_at(&w2_mod(json!({"units": [{"id": 0, "name_string": 65536}]})), &["units[0].name_string"]);
}

#[test]
fn stats_panel_frame_out_of_range() {
    rejected_at(&w2_mod(json!({"units": [{"id": 0, "stats_frame": 4}]})), &["units[0].stats_frame"]);
    accepted(&w2_mod(json!({"units": [{"id": 0, "stats_frame": 3}]})));
}

#[test]
fn no_connected_unit() {
    let m = accepted(&sc_mod(json!({"units": [{"id": 16, "connected_unit": null}]})));
    assert_eq!(m.units[0].field, UnitField::ConnectedUnit(None));
}

#[test]
fn connected_unit_out_of_range() {
    rejected_at(&sc_mod(json!({"units": [{"id": 16, "connected_unit": 250}]})), &["units[0].connected_unit"]);
    accepted(&sc_mod(json!({"units": [{"id": 16, "connected_unit": 249}]})));
}

// ---- Button set entries

#[test]
fn replace_a_set() {
    let m = accepted(&sc_mod(json!({"button_sets": [{"id": 7, "buttons": [sc_button(json!({"position": 1})), sc_button(json!({"position": 2, "action": "statcmd_set_ctrl", "action_variable": 238}))]}]})));
    assert_eq!(m.button_sets.len(), 1);
    assert_eq!(m.button_sets[0].id, 7);
    assert_eq!(m.button_sets[0].buttons.len(), 2);
    assert_eq!(m.button_sets[0].buttons[1].action_variable, 238);
}

#[test]
fn empty_set() {
    let m = accepted(&sc_mod(json!({"button_sets": [{"id": 7, "buttons": []}]})));
    assert!(m.button_sets[0].buttons.is_empty());
}

#[test]
fn set_without_buttons_array() {
    rejected_at(&sc_mod(json!({"button_sets": [{"id": 7}]})), &["button_sets[0]"]);
    rejected_at(&sc_mod(json!({"button_sets": [{"id": 7, "buttons": [1, "x"]}]})), &["button_sets[0].buttons[0]", "button_sets[0].buttons[1]"]);
}

// ---- Button set numbering

#[test]
fn set_shared_by_several_entries() {
    accepted(&sc_mod(json!({"button_sets": [{"id": 0, "buttons": []}]})));
}

#[test]
fn button_card_used_as_a_set_id() {
    let ps = rejected_at(&sc_mod(json!({"button_sets": [{"id": 32, "buttons": []}]})), &["button_sets[0].id"]);
    mentions(&ps, &["entry 32 uses set 0"]);
}

#[test]
fn new_set() {
    accepted(&sc_mod(json!({"button_sets": [{"id": 250, "buttons": []}]})));
    accepted(&w2_mod(json!({"button_sets": [{"id": 120, "buttons": []}]})));
    rejected_at(&w2_mod(json!({"button_sets": [{"id": 119, "buttons": []}]})), &["button_sets[0].id"]);
}

#[test]
fn set_id_out_of_range() {
    rejected_at(&sc_mod(json!({"button_sets": [{"id": 1000, "buttons": []}]})), &["button_sets[0].id"]);
    accepted(&sc_mod(json!({"button_sets": [{"id": 999, "buttons": []}]})));
}

// ---- Referring to button sets

#[test]
fn new_set_the_mod_doesnt_define() {
    rejected_at(&sc_mod(json!({"units": [{"id": 0, "button_set": 250}]})), &["units[0].button_set"]);
}

#[test]
fn new_set_the_mod_defines() {
    accepted(&sc_mod(json!({"units": [{"id": 0, "button_set": 250}], "button_sets": [{"id": 250, "buttons": []}]})));
}

#[test]
fn button_card_named_as_a_set() {
    let ps = rejected_at(&sc_mod(json!({"units": [{"id": 0, "button_set": 32}]})), &["units[0].button_set"]);
    mentions(&ps, &["entry 32 uses set 0"]);
}

#[test]
fn no_buttons() {
    let m = accepted(&sc_mod(json!({"units": [{"id": 32, "button_set": null}]})));
    assert_eq!(m.units[0].field, UnitField::ButtonSet(None));
}

// ---- Opening a button card

#[test]
fn submenu_with_a_new_set() {
    accepted(&sc_mod(json!({
        "button_sets": [
            {"id": 250, "buttons": [sc_button(json!({}))]},
            {"id": 7, "buttons": [sc_button(json!({"action": "statcmd_set_ctrl", "action_variable": 228}))]}
        ],
        "units": [{"id": 228, "button_set": 250}]
    })));
}

#[test]
fn entry_beyond_the_table() {
    rejected_at(
        &sc_mod(json!({"button_sets": [{"id": 7, "buttons": [sc_button(json!({"action": "statcmd_set_ctrl", "action_variable": 250}))]}]})),
        &["button_sets[0].buttons[0].action_variable"],
    );
}

// ---- Button fields

#[test]
fn position_out_of_range() {
    rejected_at(
        &sc_mod(json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({"position": 0})), sc_button(json!({"position": 10}))]}]})),
        &["button_sets[0].buttons[0].position", "button_sets[0].buttons[1].position"],
    );
    rejected_at(&w2_mod(json!({"button_sets": [{"id": 0, "buttons": [w2_button(json!({"position": 9}))]}]})), &["button_sets[0].buttons[0].position"]);
    accepted(&w2_mod(json!({"button_sets": [{"id": 0, "buttons": [w2_button(json!({"position": 0})), w2_button(json!({"position": 8}))]}]})));
}

#[test]
fn missing_field() {
    let ps = rejected_at(
        &sc_mod(json!({"button_sets": [{"id": 5, "buttons": [sc_button(json!({})), sc_button(json!({"position": 2, "-icon": null}))]}]})),
        &["button_sets[0].buttons[1]"],
    );
    mentions(&ps, &["Button 1 of set 5 has no icon"]);
}

#[test]
fn warcraft2_button_fields() {
    let m = accepted(&w2_mod(json!({"button_sets": [{"id": 0, "buttons": [w2_button(json!({"string": 401, "highlighted": 8}))]}]})));
    assert_eq!(m.button_sets[0].buttons[0].text, ButtonText::Warcraft2 { string: 401, highlighted: 8 });
}

#[test]
fn highlighted_value_that_isnt_one_flag() {
    rejected_at(&w2_mod(json!({"button_sets": [{"id": 0, "buttons": [w2_button(json!({"highlighted": 3}))]}]})), &["button_sets[0].buttons[0].highlighted"]);
    rejected_at(&w2_mod(json!({"button_sets": [{"id": 0, "buttons": [w2_button(json!({"highlighted": 512}))]}]})), &["button_sets[0].buttons[0].highlighted"]);
    for h in [0, 1, 2, 4, 8, 16, 32, 64, 128, 256] {
        accepted(&w2_mod(json!({"button_sets": [{"id": 0, "buttons": [w2_button(json!({"highlighted": h}))]}]})));
    }
}

#[test]
fn another_games_string_fields() {
    let ps = rejected_at(&w2_mod(json!({"button_sets": [{"id": 0, "buttons": [w2_button(json!({"enabled_string": 1}))]}]})), &["button_sets[0].buttons[0].enabled_string"]);
    mentions(&ps, &["enabled_string"]);
    rejected_at(&sc_mod(json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({"string": 1}))]}]})), &["button_sets[0].buttons[0].string"]);
    rejected_at(&sc_mod(json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({"highlighted": 0}))]}]})), &["button_sets[0].buttons[0].highlighted"]);
}

#[test]
fn condition_and_action_with_their_variables() {
    let m = accepted(&sc_mod(json!({"button_sets": [{"id": 5, "buttons": [sc_button(json!({"condition": "bf_research", "condition_variable": 5, "action": "order_build", "action_variable": 7}))]}]})));
    let b = &m.button_sets[0].buttons[0];
    assert_eq!((b.condition_variable, b.action_variable), (5, 7));
}

#[test]
fn icon_and_string_ids() {
    accepted(&sc_mod(json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({"icon": 65535, "enabled_string": 65535, "disabled_string": 60000}))]}]})));
    rejected_at(&sc_mod(json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({"icon": 65536}))]}]})), &["button_sets[0].buttons[0].icon"]);
}

// ---- Button order

#[test]
fn buttons_out_of_order() {
    rejected_at(
        &w2_mod(json!({"button_sets": [{"id": 0, "buttons": [w2_button(json!({"position": 5})), w2_button(json!({"position": 3}))]}]})),
        &["button_sets[0].buttons[1].position"],
    );
}

#[test]
fn shared_positions() {
    accepted(&w2_mod(json!({"button_sets": [{"id": 0, "buttons": [w2_button(json!({"position": 1})), w2_button(json!({"position": 1})), w2_button(json!({"position": 1}))]}]})));
}

#[test]
fn starcraft_buttons_out_of_order() {
    let ps = rejected_at(
        &sc_mod(json!({"button_sets": [{"id": 5, "buttons": [sc_button(json!({"position": 5})), sc_button(json!({"position": 3}))]}]})),
        &["button_sets[0].buttons[1].position"],
    );
    mentions(&ps, &["Set 5", "button 1"]);
}

// ---- Typed function variables

#[test]
fn variable_of_the_wrong_kind() {
    rejected_at(
        &sc_mod(json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({"action": "order_research", "action_variable": 44}))]}]})),
        &["button_sets[0].buttons[0].action_variable"],
    );
    rejected_at(
        &sc_mod(json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({"condition": "bf_building_ok", "condition_variable": 228}))]}]})),
        &["button_sets[0].buttons[0].condition_variable"],
    );
}

#[test]
fn warcraft2_tech_is_a_spell_bit() {
    accepted(&w2_mod(json!({"button_sets": [{"id": 0, "buttons": [w2_button(json!({"action": "order_research_spell", "action_variable": 20}))]}]})));
    rejected_at(
        &w2_mod(json!({"button_sets": [{"id": 0, "buttons": [w2_button(json!({"action": "order_research_spell", "action_variable": 21}))]}]})),
        &["button_sets[0].buttons[0].action_variable"],
    );
}

#[test]
fn order_out_of_range() {
    rejected_at(
        &w2_mod(json!({"button_sets": [{"id": 0, "buttons": [w2_button(json!({"action": "order_spell", "action_variable": 61}))]}]})),
        &["button_sets[0].buttons[0].action_variable"],
    );
    accepted(&w2_mod(json!({"button_sets": [{"id": 0, "buttons": [w2_button(json!({"action": "order_spell", "action_variable": 60}))]}]})));
}

#[test]
fn missing_variable() {
    rejected_at(&sc_mod(json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({"condition": "bf_upgrade"}))]}]})), &["button_sets[0].buttons[0].condition_variable"]);
}

#[test]
fn variable_on_function_that_doesnt_read_it() {
    let m = accepted(&sc_mod(json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({"condition_variable": 200, "action_variable": 60000}))]}]})));
    let b = &m.button_sets[0].buttons[0];
    assert_eq!((b.condition_variable, b.action_variable), (200, 60000));
}

#[test]
fn variable_left_out_is_zero() {
    let m = accepted(&sc_mod(json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({}))]}]})));
    let b = &m.button_sets[0].buttons[0];
    assert_eq!((b.condition_variable, b.action_variable), (0, 0));
}

#[test]
fn unread_variable_too_large_for_its_field() {
    rejected_at(&sc_mod(json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({"action_variable": 65536}))]}]})), &["button_sets[0].buttons[0].action_variable"]);
    rejected_at(&w2_mod(json!({"button_sets": [{"id": 0, "buttons": [w2_button(json!({"action_variable": 256}))]}]})), &["button_sets[0].buttons[0].action_variable"]);
}

#[test]
fn condition_variable_is_a_byte_in_starcraft() {
    rejected_at(&sc_mod(json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({"condition_variable": 256}))]}]})), &["button_sets[0].buttons[0].condition_variable"]);
    accepted(&sc_mod(json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({"condition_variable": 255}))]}]})));
}

#[test]
fn number_variable_takes_the_fields_range() {
    accepted(&sc_mod(json!({"button_sets": [{"id": 0, "buttons": [sc_button(json!({"action": "order_stop_build", "action_variable": 65535}))]}]})));
}

// ---- Requirement entries

#[test]
fn replace_a_record() {
    let m = accepted(&sc_mod(json!({"requirements": [{"type": "upgrade", "id": 3, "list": ["current_unit_is", 139]}]})));
    assert_eq!(m.requirements, vec![Requirement { kind: ReqType::Upgrade, id: 3, list: vec![ListItem::Opcode("current_unit_is".into()), ListItem::Number(139)] }]);
}

#[test]
fn empty_list() {
    let m = accepted(&sc_mod(json!({"requirements": [{"type": "order", "id": 73, "list": []}]})));
    assert!(m.requirements[0].list.is_empty());
}

#[test]
fn requirement_entry_shape() {
    rejected_at(&sc_mod(json!({"requirements": [{"type": "spell", "id": 0, "list": []}]})), &["requirements[0].type"]);
    rejected_at(&sc_mod(json!({"requirements": [{"type": "tech_use", "id": 44, "list": []}]})), &["requirements[0].id"]);
    rejected_at(&sc_mod(json!({"requirements": [{"type": "unit", "id": 0}]})), &["requirements[0]"]);
    rejected_at(&sc_mod(json!({"requirements": [{"type": "unit", "id": 0, "list": ["or", [1]]}]})), &["requirements[0].list[1]"]);
}

// ---- Requirement lists

fn list_problem_paths(kind: &str, id: u16, list: serde_json::Value) -> Vec<String> {
    paths(&parse(&sc_mod(json!({"requirements": [{"type": kind, "id": id, "list": list}]}))))
}

#[test]
fn valid_list() {
    accepted(&sc_mod(json!({"requirements": [{"type": "upgrade", "id": 3, "list": ["current_unit_is", 139, "is_not_training_or_morphing", "upgrade_level_1", "end_sublist", "upgrade_level_2", 132, "or", "must_have", 133, "end_sublist", "upgrade_level_3", 133]}]})));
}

#[test]
fn bare_unit_and_or() {
    accepted(&sc_mod(json!({"requirements": [{"type": "unit", "id": 43, "list": ["current_unit_is", 35, 141, "or", "must_have", 137]}]})));
}

#[test]
fn opcode_the_type_doesnt_handle() {
    let ps = rejected_at(&sc_mod(json!({"requirements": [{"type": "upgrade", "id": 0, "list": ["must_have_addon", 111]}]})), &["requirements[0].list[0]"]);
    mentions(&ps, &["must_have_addon", "upgrade"]);
}

#[test]
fn missing_parameter() {
    rejected_at(
        &sc_mod(json!({"requirements": [{"type": "unit", "id": 0, "list": ["current_unit_is", "is_not_lifted_off"]}, {"type": "unit", "id": 32, "list": ["must_have"]}]})),
        &["requirements[0].list[0]", "requirements[1].list[0]"],
    );
}

#[test]
fn parameter_of_the_wrong_kind() {
    assert_eq!(list_problem_paths("unit", 0, json!(["current_unit_is", 228, "is_researched", 44, 300])), ["requirements[0].list[1]", "requirements[0].list[3]", "requirements[0].list[4]"]);
}

#[test]
fn dangling_or() {
    assert_eq!(list_problem_paths("unit", 0, json!(["or", 111])), ["requirements[0].list[0]"]);
    assert_eq!(list_problem_paths("unit", 0, json!([111, "or"])), ["requirements[0].list[1]"]);
    assert_eq!(list_problem_paths("unit", 0, json!([111, "or", "or", 112])), ["requirements[0].list[2]"]);
    assert_eq!(list_problem_paths("upgrade", 3, json!(["upgrade_level_1", "or", 132, "end_sublist", "upgrade_level_2", "end_sublist", "upgrade_level_3"])), ["requirements[0].list[1]"]);
    assert_eq!(list_problem_paths("upgrade", 3, json!(["upgrade_level_1", 132, "or", "end_sublist", "upgrade_level_2", "end_sublist", "upgrade_level_3"])), ["requirements[0].list[2]"]);
}

#[test]
fn unbalanced_sublists() {
    assert_eq!(list_problem_paths("upgrade", 3, json!(["current_unit_is", 139, "end_sublist"])), ["requirements[0].list[2]"]);
    assert_eq!(list_problem_paths("upgrade", 3, json!(["upgrade_level_1", 132, "upgrade_level_2", 133, "end_sublist", "upgrade_level_3"])), ["requirements[0].list[2]"]);
    assert_eq!(list_problem_paths("unit", 0, json!(["upgrade_level_1", 111])), ["requirements[0].list[0]"]);
}

#[test]
fn levels_out_of_order() {
    assert_eq!(
        list_problem_paths("upgrade", 3, json!(["upgrade_level_2", "end_sublist", "upgrade_level_1", "end_sublist", "upgrade_level_3"])),
        ["requirements[0].list[0]", "requirements[0].list[2]", "requirements[0].list[4]"]
    );
}

#[test]
fn missing_level() {
    assert_eq!(list_problem_paths("upgrade", 3, json!(["upgrade_level_1", "end_sublist", "upgrade_level_2", 132])), ["requirements[0].list"]);
}

#[test]
fn repeated_level() {
    assert_eq!(
        list_problem_paths("upgrade", 3, json!(["upgrade_level_1", "end_sublist", "upgrade_level_1", "end_sublist", "upgrade_level_2", "end_sublist", "upgrade_level_3"])),
        ["requirements[0].list[2]"]
    );
}

#[test]
fn last_level_ended() {
    assert_eq!(
        list_problem_paths("upgrade", 3, json!(["upgrade_level_1", "end_sublist", "upgrade_level_2", "end_sublist", "upgrade_level_3", 133, "end_sublist"])),
        ["requirements[0].list[6]"]
    );
}

#[test]
fn condition_between_levels() {
    assert_eq!(list_problem_paths("upgrade", 3, json!(["upgrade_level_1", "end_sublist", 132, "upgrade_level_2", "end_sublist", "upgrade_level_3"])), ["requirements[0].list[2]"]);
}

// ---- Constant entries

#[test]
fn numeric_constant_in_range() {
    let m = accepted(&sc_mod(json!({"constants": [{"name": "max_supply", "value": 0}, {"name": "web_duration", "value": 65535}]})));
    assert_eq!(m.constants[1], ConstantSetting { name: "web_duration".into(), value: ConstantValue::Value(65535) });
}

#[test]
fn value_that_isnt_a_whole_number() {
    rejected_at(&sc_mod(json!({"constants": [{"name": "max_supply", "value": 1.5}]})), &["constants[0].value"]);
    rejected_at(&sc_mod(json!({"constants": [{"name": "max_supply", "value": "5"}]})), &["constants[0].value"]);
}

#[test]
fn value_out_of_range() {
    let ps = rejected_at(&sc_mod(json!({"constants": [{"name": "max_supply", "value": 65536}]})), &["constants[0].value"]);
    mentions(&ps, &["max_supply", "65536", "0-65535"]);
}

#[test]
fn unknown_option() {
    rejected_at(&sc_mod(json!({"constants": [{"name": "cloak_energy", "option": "sometimes"}]})), &["constants[0].option"]);
    let m = accepted(&sc_mod(json!({"constants": [{"name": "cloak_energy", "option": "regain"}]})));
    assert_eq!(m.constants[0].value, ConstantValue::Option("regain".into()));
}

#[test]
fn unknown_constant() {
    let ps = rejected_at(&sc_mod(json!({"constants": [{"name": "max_supplies", "value": 1}]})), &["constants[0].name"]);
    mentions(&ps, &["max_supplies"]);
}

#[test]
fn exactly_one_of_value_and_option() {
    rejected_at(&sc_mod(json!({"constants": [{"name": "cloak_energy", "value": 1, "option": "regain"}]})), &["constants[0]"]);
    rejected_at(&sc_mod(json!({"constants": [{"name": "max_supply"}]})), &["constants[0]"]);
    rejected_at(&sc_mod(json!({"constants": [{"name": "cloak_energy", "value": 1}]})), &["constants[0].value"]);
    rejected_at(&sc_mod(json!({"constants": [{"name": "max_supply", "option": "original"}]})), &["constants[0].option"]);
}

// ---- No duplicates within a mod

#[test]
fn same_unit_twice_with_different_fields() {
    let m = accepted(&sc_mod(json!({"units": [{"id": 5, "button_set": 0}, {"id": 5, "display_function": "statdraw_draw_none"}]})));
    assert_eq!(m.units.len(), 2);
}

#[test]
fn same_unit_field_twice() {
    rejected_at(&sc_mod(json!({"units": [{"id": 5, "button_set": 0}, {"id": 5, "button_set": 5}]})), &["units[1].button_set"]);
}

#[test]
fn same_button_set_twice() {
    let ps = rejected_at(&sc_mod(json!({"button_sets": [{"id": 7, "buttons": []}, {"id": 7, "buttons": []}]})), &["button_sets[1]"]);
    mentions(&ps, &["Button set 7"]);
}

#[test]
fn same_record_or_constant_twice() {
    rejected_at(&sc_mod(json!({"requirements": [{"type": "unit", "id": 0, "list": []}, {"type": "unit", "id": 0, "list": [111]}]})), &["requirements[1]"]);
    accepted(&sc_mod(json!({"requirements": [{"type": "unit", "id": 0, "list": []}, {"type": "order", "id": 0, "list": []}]})));
    rejected_at(&sc_mod(json!({"constants": [{"name": "max_supply", "value": 1}, {"name": "max_supply", "value": 1}]})), &["constants[1]"]);
}

// ---- All problems reported together

#[test]
fn several_mistakes() {
    rejected_at(&sc_mod(json!({"units": [{"id": 300, "button_set": 0}], "constants": [{"name": "gravity", "value": 1}]})), &["constants[0].name", "units[0].id"]);
}

#[test]
fn unknown_field_and_bad_id_together() {
    rejected_at(&sc_mod(json!({"units": [{"id": 300, "button_set": 5}, {"id": 0, "colour": "red", "button_set": 5}]})), &["units[0].id", "units[1].colour"]);
}

#[test]
fn problems_name_their_input() {
    let Err(ps) = parse(&sc_mod(json!({"units": [{"id": 300, "button_set": 0}]}))) else { panic!() };
    assert!(ps.iter().all(|p| p.input == "test.json"));
}
