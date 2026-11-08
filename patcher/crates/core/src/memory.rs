//! The game's memory, as the planner and the applier see it.
//!
//! Addresses inside the executable are RVAs, relative to wherever it's
//! loaded. Addresses are always `u32`, as in the 32-bit game, so the same
//! code runs natively in tests. The plugin implements this trait over the
//! real process; tests use [`FakeMemory`].

use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MemoryError(pub String);

impl fmt::Display for MemoryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

pub trait Memory {
    /// Where the executable is loaded.
    fn base(&self) -> u32;
    /// Reads bytes of the executable's image.
    fn read(&self, rva: u32, len: usize) -> Result<Vec<u8>, MemoryError>;
    /// Writes bytes into the executable's image, making the memory writable
    /// only for as long as it takes.
    fn write(&mut self, rva: u32, bytes: &[u8]) -> Result<(), MemoryError>;
    /// Allocates writable, non-executable memory holding these bytes, which
    /// is never freed, and returns its address.
    fn allocate(&mut self, bytes: &[u8]) -> Result<u32, MemoryError>;
}

/// A default load address unlike any executable's preferred one, so code
/// that assumes `0x400000` fails ordinary tests.
pub const FAKE_BASE: u32 = 0x1234_0000;
const FAKE_HEAP: u32 = 0x5600_0000;

/// Memory for tests: an image at a chosen base, which records every write
/// and allocation, and can be made to fail.
#[derive(Debug, Clone)]
pub struct FakeMemory {
    pub base: u32,
    pub image: Vec<u8>,
    /// Every write, in order.
    pub writes: Vec<(u32, Vec<u8>)>,
    /// Every allocation: its address and contents.
    pub allocations: Vec<(u32, Vec<u8>)>,
    /// Fail every write after this many have succeeded.
    pub fail_after_writes: Option<usize>,
    /// Accept writes at this RVA but don't change the memory.
    pub ignore_writes_at: Option<u32>,
    next: u32,
}

impl FakeMemory {
    pub fn new(image: Vec<u8>) -> FakeMemory {
        FakeMemory::at(FAKE_BASE, image)
    }

    pub fn at(base: u32, image: Vec<u8>) -> FakeMemory {
        FakeMemory { base, image, writes: Vec::new(), allocations: Vec::new(), fail_after_writes: None, ignore_writes_at: None, next: FAKE_HEAP }
    }

    /// The contents of an allocation, by its address.
    pub fn allocation(&self, addr: u32) -> Option<&[u8]> {
        self.allocations.iter().find(|(a, _)| *a == addr).map(|(_, b)| b.as_slice())
    }

    pub fn u16_at(&self, rva: u32) -> u16 {
        u16::from_le_bytes(self.read(rva, 2).unwrap().try_into().unwrap())
    }

    pub fn u32_at(&self, rva: u32) -> u32 {
        u32::from_le_bytes(self.read(rva, 4).unwrap().try_into().unwrap())
    }

    fn range(&self, rva: u32, len: usize) -> Result<std::ops::Range<usize>, MemoryError> {
        let start = rva as usize;
        match start.checked_add(len) {
            Some(end) if end <= self.image.len() => Ok(start..end),
            _ => Err(MemoryError(format!("{len} bytes at RVA {rva:#x} are outside the image"))),
        }
    }
}

impl Memory for FakeMemory {
    fn base(&self) -> u32 {
        self.base
    }

    fn read(&self, rva: u32, len: usize) -> Result<Vec<u8>, MemoryError> {
        Ok(self.image[self.range(rva, len)?].to_vec())
    }

    fn write(&mut self, rva: u32, bytes: &[u8]) -> Result<(), MemoryError> {
        if self.fail_after_writes.is_some_and(|n| self.writes.len() >= n) {
            return Err(MemoryError(format!("the memory at RVA {rva:#x} couldn't be made writable")));
        }
        let r = self.range(rva, bytes.len())?;
        self.writes.push((rva, bytes.to_vec()));
        if self.ignore_writes_at != Some(rva) {
            self.image[r].copy_from_slice(bytes);
        }
        Ok(())
    }

    fn allocate(&mut self, bytes: &[u8]) -> Result<u32, MemoryError> {
        let addr = self.next;
        self.next += (bytes.len() as u32).div_ceil(16).max(1) * 16;
        self.allocations.push((addr, bytes.to_vec()));
        Ok(addr)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_base_is_not_the_usual_one() {
        let m = FakeMemory::new(vec![0; 16]);
        assert_eq!(m.base(), FAKE_BASE);
        assert_ne!(m.base(), 0x400000);
    }

    #[test]
    fn reads_and_writes() {
        let mut m = FakeMemory::new((0..32).collect());
        assert_eq!(m.read(4, 3).unwrap(), vec![4, 5, 6]);
        m.write(4, &[9, 9]).unwrap();
        assert_eq!(m.read(3, 4).unwrap(), vec![3, 9, 9, 6]);
        assert_eq!(m.u16_at(4), 0x0909);
        assert!(m.read(30, 3).is_err());
        assert!(m.read(u32::MAX, 2).is_err());
        assert!(m.write(31, &[1, 2]).is_err());
    }

    #[test]
    fn tracks_writes() {
        let mut m = FakeMemory::new(vec![0; 32]);
        m.write(1, &[1]).unwrap();
        m.write(8, &[2, 3]).unwrap();
        assert_eq!(m.writes, vec![(1, vec![1]), (8, vec![2, 3])]);
    }

    #[test]
    fn allocates_distinct_memory_outside_the_image() {
        let mut m = FakeMemory::new(vec![0; 32]);
        let a = m.allocate(&[1, 2, 3]).unwrap();
        let b = m.allocate(&[4; 40]).unwrap();
        assert_ne!(a, b);
        assert!(b >= a + 16);
        assert!(a < m.base() || a >= m.base() + 32);
        assert_eq!(m.allocation(a), Some(&[1, 2, 3][..]));
        assert_eq!(m.allocation(b).unwrap().len(), 40);
        assert!(m.writes.is_empty());
    }

    #[test]
    fn can_be_made_to_fail() {
        let mut m = FakeMemory::new(vec![0; 32]);
        m.fail_after_writes = Some(1);
        m.write(0, &[1]).unwrap();
        assert!(m.write(1, &[1]).is_err());
        assert_eq!(m.writes.len(), 1);

        let mut m = FakeMemory::new(vec![0; 32]);
        m.ignore_writes_at = Some(4);
        m.write(4, &[7]).unwrap();
        assert_eq!(m.read(4, 1).unwrap(), vec![0]);
        assert_eq!(m.writes, vec![(4, vec![7])]);
    }
}
