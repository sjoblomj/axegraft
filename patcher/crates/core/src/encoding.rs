//! The fixed set of ways a constant's value is stored.
//!
//! A mod's value is always in the game's stored scale. An encoding only
//! decides how many bytes hold it, whether they're signed, and whether the
//! game stores it negated. Nothing a mod gives can cause any other
//! computation.

use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all(deserialize = "snake_case"))]
pub enum Encoding {
    U8,
    U16,
    U32,
    I8,
    I16,
    I32,
    /// The value negated, as a signed byte: a mod's 50 is stored as -50.
    Neg8,
    Neg16,
    Neg32,
    /// One byte of a value whose whole is `width` bytes, unsigned, little-endian.
    /// Byte 0 is the lowest. The other bytes are separate locations.
    ByteOf { index: u8, width: u8 },
}

impl Encoding {
    /// How many bytes the location holds.
    pub fn width(self) -> usize {
        match self {
            Encoding::U8 | Encoding::I8 | Encoding::Neg8 | Encoding::ByteOf { .. } => 1,
            Encoding::U16 | Encoding::I16 | Encoding::Neg16 => 2,
            Encoding::U32 | Encoding::I32 | Encoding::Neg32 => 4,
        }
    }

    /// Whether the encoding itself is well formed. Only `byte_of` can fail.
    pub fn is_valid(self) -> bool {
        match self {
            Encoding::ByteOf { index, width } => (1..=4).contains(&width) && index < width,
            _ => true,
        }
    }

    /// The values that can be stored, as a mod gives them.
    pub fn range(self) -> (i64, i64) {
        match self {
            Encoding::U8 => (0, u8::MAX as i64),
            Encoding::U16 => (0, u16::MAX as i64),
            Encoding::U32 => (0, u32::MAX as i64),
            Encoding::I8 => (i8::MIN as i64, i8::MAX as i64),
            Encoding::I16 => (i16::MIN as i64, i16::MAX as i64),
            Encoding::I32 => (i32::MIN as i64, i32::MAX as i64),
            Encoding::Neg8 => (-(i8::MAX as i64), -(i8::MIN as i64)),
            Encoding::Neg16 => (-(i16::MAX as i64), -(i16::MIN as i64)),
            Encoding::Neg32 => (-(i32::MAX as i64), -(i32::MIN as i64)),
            Encoding::ByteOf { width, .. } => (0, (1i64 << (8 * width.min(4) as u32)) - 1),
        }
    }

    pub fn fits(self, value: i64) -> bool {
        let (lo, hi) = self.range();
        self.is_valid() && value >= lo && value <= hi
    }

    /// The bytes stored for a value, or `None` if it doesn't fit.
    pub fn encode(self, value: i64) -> Option<Vec<u8>> {
        if !self.fits(value) {
            return None;
        }
        Some(match self {
            Encoding::U8 | Encoding::I8 => vec![value as u8],
            Encoding::U16 | Encoding::I16 => (value as u16).to_le_bytes().to_vec(),
            Encoding::U32 | Encoding::I32 => (value as u32).to_le_bytes().to_vec(),
            Encoding::Neg8 => vec![(-value) as i8 as u8],
            Encoding::Neg16 => ((-value) as i16).to_le_bytes().to_vec(),
            Encoding::Neg32 => ((-value) as i32).to_le_bytes().to_vec(),
            Encoding::ByteOf { index, .. } => vec![((value >> (8 * index as u32)) & 0xFF) as u8],
        })
    }

    /// The value stored in some bytes, as a mod would give it. For `byte_of`,
    /// this is that byte's part of the value only.
    pub fn decode(self, bytes: &[u8]) -> Option<i64> {
        if bytes.len() != self.width() || !self.is_valid() {
            return None;
        }
        let b = bytes;
        Some(match self {
            Encoding::U8 => b[0] as i64,
            Encoding::U16 => u16::from_le_bytes([b[0], b[1]]) as i64,
            Encoding::U32 => u32::from_le_bytes([b[0], b[1], b[2], b[3]]) as i64,
            Encoding::I8 => b[0] as i8 as i64,
            Encoding::I16 => i16::from_le_bytes([b[0], b[1]]) as i64,
            Encoding::I32 => i32::from_le_bytes([b[0], b[1], b[2], b[3]]) as i64,
            Encoding::Neg8 => -(b[0] as i8 as i64),
            Encoding::Neg16 => -(i16::from_le_bytes([b[0], b[1]]) as i64),
            Encoding::Neg32 => -(i32::from_le_bytes([b[0], b[1], b[2], b[3]]) as i64),
            Encoding::ByteOf { index, .. } => (b[0] as i64) << (8 * index as u32),
        })
    }
}

impl fmt::Display for Encoding {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Encoding::ByteOf { index, width } => write!(f, "byte {index} of {width}"),
            other => write!(f, "{}", format!("{other:?}").to_lowercase()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Encoding::{self, *};

    const ALL: [Encoding; 13] =
        [U8, U16, U32, I8, I16, I32, Neg8, Neg16, Neg32, ByteOf { index: 0, width: 1 }, ByteOf { index: 0, width: 2 }, ByteOf { index: 1, width: 2 }, ByteOf { index: 3, width: 4 }];

    #[test]
    fn round_trip_at_the_ends_and_middle() {
        for e in ALL {
            let (lo, hi) = e.range();
            for v in [lo, hi, (lo + hi) / 2, lo + 1, hi - 1] {
                let bytes = e.encode(v).unwrap_or_else(|| panic!("{e:?} {v}"));
                assert_eq!(bytes.len(), e.width());
                if let ByteOf { index, .. } = e {
                    assert_eq!(e.decode(&bytes), Some(v & (0xFF << (8 * index as u32))), "{e:?} {v}");
                } else {
                    assert_eq!(e.decode(&bytes), Some(v), "{e:?} {v}");
                }
            }
        }
    }

    #[test]
    fn out_of_range_values_dont_encode() {
        for e in ALL {
            let (lo, hi) = e.range();
            assert_eq!(e.encode(lo - 1), None, "{e:?}");
            assert_eq!(e.encode(hi + 1), None, "{e:?}");
        }
    }

    #[test]
    fn ranges() {
        assert_eq!(U8.range(), (0, 255));
        assert_eq!(I16.range(), (-32768, 32767));
        assert_eq!(Neg8.range(), (-127, 128));
        assert_eq!(Neg16.range(), (-32767, 32768));
        assert_eq!(ByteOf { index: 1, width: 2 }.range(), (0, 65535));
    }

    #[test]
    fn negated_values() {
        assert_eq!(Neg8.encode(50), Some(vec![0xCE]));
        assert_eq!(Neg8.encode(128), Some(vec![0x80]));
        assert_eq!(Neg8.encode(-127), Some(vec![0x7F]));
        assert_eq!(Neg16.encode(1000), Some((-1000i16).to_le_bytes().to_vec()));
        assert_eq!(Neg32.decode(&(-60i32).to_le_bytes()), Some(60));
        assert_eq!(Neg8.decode(&[0xCE]), Some(50));
    }

    #[test]
    fn byte_of() {
        let lo = ByteOf { index: 0, width: 2 };
        let hi = ByteOf { index: 1, width: 2 };
        assert_eq!(lo.encode(0x1234), Some(vec![0x34]));
        assert_eq!(hi.encode(0x1234), Some(vec![0x12]));
        assert_eq!(hi.encode(0x10000), None);
        assert_eq!(hi.decode(&[0x12]), Some(0x1200));
        assert!(!ByteOf { index: 2, width: 2 }.is_valid());
        assert!(!ByteOf { index: 0, width: 5 }.is_valid());
        assert_eq!(ByteOf { index: 2, width: 2 }.encode(1), None);
    }

    #[test]
    fn little_endian() {
        assert_eq!(U16.encode(0x0102), Some(vec![0x02, 0x01]));
        assert_eq!(U32.encode(0x01020304), Some(vec![4, 3, 2, 1]));
        assert_eq!(I32.encode(-1), Some(vec![0xFF; 4]));
        assert_eq!(I8.decode(&[0xFF]), Some(-1));
        assert_eq!(U8.decode(&[0xFF, 0]), None);
    }
}
