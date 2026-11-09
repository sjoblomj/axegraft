//! StarCraft's requirement streams: decoding a version's stream into records,
//! and encoding records back into a stream.
//!
//! A stream is little-endian words:
//!
//! ```text
//! 0x0000
//! then, for each record: <id> <opcodes, parameters and unit IDs> 0xFFFF
//! 0xFFFF
//! ```
//!
//! An upgrade's levels end with `0xFFFF` too, the same word that ends a
//! record, and the last level is ended by the record's own end. So a `0xFFFF`
//! followed by a level opcode ends a level, and any other `0xFFFF` ends the
//! record. Record IDs are below `0xFF00`, so they never look like opcodes, and
//! two `0xFFFF` words in a row only ever end the stream.
//!
//! Decoding and encoding a real stream must give back its exact bytes.

use crate::library::Opcode;
use crate::vocab::OpcodeRole;

/// The word that ends a record, a level and the stream.
pub const END: u16 = 0xFFFF;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Word {
    /// An opcode, by its code. `end_sublist` is `Op(0xFFFF)`.
    Op(u16),
    /// A parameter, or a bare unit ID.
    Num(u16),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Record {
    pub id: u16,
    /// Everything between the ID and the record's end.
    pub items: Vec<Word>,
}

fn words(bytes: &[u8]) -> Result<Vec<u16>, String> {
    if bytes.len() % 2 != 0 {
        return Err(format!("its length, {} bytes, isn't a whole number of words", bytes.len()));
    }
    Ok(bytes.chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect())
}

/// Decodes a stream into its records, in order.
pub fn decode(bytes: &[u8], opcodes: &[Opcode]) -> Result<Vec<Record>, String> {
    let w = words(bytes)?;
    let takes_parameter = |code: u16| opcodes.iter().any(|o| o.code == code && o.parameter.is_some());
    let is_level = |code: u16| opcodes.iter().any(|o| o.code == code && o.role == OpcodeRole::Level);
    if w.first() != Some(&0) {
        return Err("it doesn't start with 0x0000".into());
    }
    let mut records = Vec::new();
    let mut i = 1;
    loop {
        let Some(&id) = w.get(i) else {
            return Err("it has no final 0xFFFF".into());
        };
        if id == END {
            if i + 1 != w.len() {
                return Err(format!("it continues after its end, at word {i}"));
            }
            return Ok(records);
        }
        if id >= 0xFF00 {
            return Err(format!("record {} starts with {id:#06x}, which isn't an ID", records.len()));
        }
        i += 1;
        let mut items = Vec::new();
        loop {
            let Some(&x) = w.get(i) else {
                return Err(format!("record for {id} has no end"));
            };
            if x == END {
                if w.get(i + 1).is_some_and(|&n| is_level(n)) {
                    items.push(Word::Op(END));
                    i += 1;
                    continue;
                }
                i += 1;
                break;
            }
            if x >= 0xFF00 {
                items.push(Word::Op(x));
                i += 1;
                if takes_parameter(x) {
                    let Some(&p) = w.get(i) else {
                        return Err(format!("record for {id} ends inside opcode {x:#06x}"));
                    };
                    items.push(Word::Num(p));
                    i += 1;
                }
            } else {
                items.push(Word::Num(x));
                i += 1;
            }
        }
        records.push(Record { id, items });
    }
}

/// Encodes records into a stream.
pub fn encode(records: &[Record]) -> Vec<u8> {
    let mut w = vec![0u16];
    for r in records {
        w.push(r.id);
        for i in &r.items {
            w.push(match i {
                Word::Op(c) | Word::Num(c) => *c,
            });
        }
        w.push(END);
    }
    w.push(END);
    w.into_iter().flat_map(|x| x.to_le_bytes()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::{ReqType, VarKind};

    fn op(name: &str, code: u16, parameter: Option<VarKind>, role: OpcodeRole) -> Opcode {
        Opcode { name: name.into(), code, parameter, role, allowed_in: ReqType::ALL.to_vec() }
    }

    fn opcodes() -> Vec<Opcode> {
        vec![
            op("or", 0xFF01, None, OpcodeRole::Or),
            op("current_unit_is", 0xFF02, Some(VarKind::Unit), OpcodeRole::Condition),
            op("must_have", 0xFF03, Some(VarKind::Unit), OpcodeRole::Condition),
            op("is_not_training_or_morphing", 0xFF07, None, OpcodeRole::Condition),
            op("upgrade_level_1", 0xFF1F, None, OpcodeRole::Level),
            op("upgrade_level_2", 0xFF20, None, OpcodeRole::Level),
            op("upgrade_level_3", 0xFF21, None, OpcodeRole::Level),
            op("is_researched", 0xFF25, Some(VarKind::Tech), OpcodeRole::Condition),
            op("end_sublist", 0xFFFF, None, OpcodeRole::EndSublist),
        ]
    }

    fn bytes(w: &[u16]) -> Vec<u8> {
        w.iter().flat_map(|x| x.to_le_bytes()).collect()
    }

    /// Zerg Carapace, a plain upgrade, and one whose levels are all empty,
    /// as the game stores them.
    const UPGRADES: [u16; 28] = [
        0x0000, //
        0x0003, 0xFF02, 139, 0xFF07, 0xFF1F, 0xFFFF, 0xFF20, 132, 0xFF01, 0xFF03, 133, 0xFFFF, 0xFF21, 133, 0xFFFF, //
        0x0004, 0xFF02, 139, 0xFFFF, //
        0x0005, 0xFF1F, 0xFFFF, 0xFF20, 0xFFFF, 0xFF21, 0xFFFF, //
        0xFFFF,
    ];

    #[test]
    fn upgrade_sublists_round_trip() {
        let b = bytes(&UPGRADES);
        let r = decode(&b, &opcodes()).unwrap();
        assert_eq!(r.len(), 3);
        assert_eq!(r[0].id, 3);
        assert_eq!(
            r[0].items,
            vec![
                Word::Op(0xFF02),
                Word::Num(139),
                Word::Op(0xFF07),
                Word::Op(0xFF1F),
                Word::Op(END),
                Word::Op(0xFF20),
                Word::Num(132),
                Word::Op(0xFF01),
                Word::Op(0xFF03),
                Word::Num(133),
                Word::Op(END),
                Word::Op(0xFF21),
                Word::Num(133)
            ]
        );
        assert_eq!(r[1], Record { id: 4, items: vec![Word::Op(0xFF02), Word::Num(139)] });
        assert_eq!(r[2].items, vec![Word::Op(0xFF1F), Word::Op(END), Word::Op(0xFF20), Word::Op(END), Word::Op(0xFF21)]);
        assert_eq!(encode(&r), b);
    }

    #[test]
    fn bare_unit_ids_and_parameters() {
        let b = bytes(&[0, 7, 0xFF02, 0xFF00 - 1, 141, 0xFF01, 0xFF25, 3, 0xFFFF, 0xFFFF]);
        let r = decode(&b, &opcodes()).unwrap();
        assert_eq!(r[0].items, vec![Word::Op(0xFF02), Word::Num(0xFEFF), Word::Num(141), Word::Op(0xFF01), Word::Op(0xFF25), Word::Num(3)]);
        assert_eq!(encode(&r), b);
    }

    #[test]
    fn empty_stream() {
        let b = bytes(&[0, 0xFFFF]);
        assert_eq!(decode(&b, &opcodes()).unwrap(), vec![]);
        assert_eq!(encode(&[]), b);
    }

    #[test]
    fn malformed_streams() {
        let ops = opcodes();
        assert!(decode(&[0], &ops).is_err());
        assert!(decode(&bytes(&[1, 0xFFFF]), &ops).is_err());
        assert!(decode(&bytes(&[0, 3, 0xFF02]), &ops).is_err());
        assert!(decode(&bytes(&[0, 3, 0xFF02, 5, 0xFFFF]), &ops).is_err());
        assert!(decode(&bytes(&[0, 0xFFFF, 0]), &ops).is_err());
        assert!(decode(&bytes(&[0, 0xFF02, 0xFFFF, 0xFFFF]), &ops).is_err());
    }

    mod properties {
        use super::*;
        use proptest::prelude::*;

        /// One condition: an opcode with its parameter, one without, a bare
        /// unit, or `or`. A parameter may be any word, even one that looks
        /// like an opcode, since the decoder knows which opcodes take one.
        fn condition() -> impl Strategy<Value = Vec<Word>> {
            prop_oneof![
                (prop_oneof![Just(0xFF02u16), Just(0xFF03), Just(0xFF25)], any::<u16>()).prop_map(|(o, p)| vec![Word::Op(o), Word::Num(p)]),
                prop_oneof![Just(0xFF01u16), Just(0xFF07)].prop_map(|o| vec![Word::Op(o)]),
                (0u16..0xFF00).prop_map(|u| vec![Word::Num(u)]),
            ]
        }

        fn conditions() -> impl Strategy<Value = Vec<Word>> {
            prop::collection::vec(condition(), 0..5).prop_map(|v| v.concat())
        }

        fn record() -> impl Strategy<Value = Record> {
            (0u16..0xFF00, conditions(), prop::option::of((conditions(), conditions(), conditions()))).prop_map(|(id, mut items, levels)| {
                if let Some((a, b, c)) = levels {
                    items.push(Word::Op(0xFF1F));
                    items.extend(a);
                    items.push(Word::Op(END));
                    items.push(Word::Op(0xFF20));
                    items.extend(b);
                    items.push(Word::Op(END));
                    items.push(Word::Op(0xFF21));
                    items.extend(c);
                }
                Record { id, items }
            })
        }

        proptest! {
            #[test]
            fn generated_records_round_trip(records in prop::collection::vec(record(), 0..12)) {
                let b = encode(&records);
                let back = decode(&b, &opcodes()).unwrap();
                prop_assert_eq!(&back, &records);
                prop_assert_eq!(encode(&back), b);
            }

            #[test]
            fn arbitrary_bytes_never_panic(b in prop::collection::vec(any::<u8>(), 0..200)) {
                if let Ok(r) = decode(&b, &opcodes()) {
                    prop_assert_eq!(encode(&r), b);
                }
            }
        }
    }
}
