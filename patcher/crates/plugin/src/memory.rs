//! The running game's memory.

use crate::win32::*;
use axegraft_patcher_core::memory::{Memory, MemoryError};
use axegraft_patcher_core::pe;
use std::ffi::c_void;

const PAGE: u32 = 0x1000;

/// The image of the process's executable.
pub struct ProcessMemory {
    base: u32,
    size: u32,
}

impl ProcessMemory {
    pub fn current() -> Result<ProcessMemory, String> {
        // SAFETY: a null name asks for the executable's handle, which is its
        // base address. The first page of a loaded image is always readable.
        let base = unsafe { GetModuleHandleW(std::ptr::null()) } as u32;
        let first_page = unsafe { std::slice::from_raw_parts(base as usize as *const u8, PAGE as usize) };
        let headers = pe::headers(first_page)?;
        Ok(ProcessMemory { base, size: headers.size_of_image })
    }

    /// The whole loaded image.
    pub fn image(&self) -> &[u8] {
        // SAFETY: Windows maps the image's full size at its base, and the
        // executable is never unloaded while the process runs.
        unsafe { std::slice::from_raw_parts(self.base as usize as *const u8, self.size as usize) }
    }

    fn check(&self, rva: u32, len: usize) -> Result<(), MemoryError> {
        match (rva as usize).checked_add(len) {
            Some(end) if end <= self.size as usize => Ok(()),
            _ => Err(MemoryError(format!("{len} bytes at RVA {rva:#x} are outside the image"))),
        }
    }
}

impl Memory for ProcessMemory {
    fn base(&self) -> u32 {
        self.base
    }

    fn read(&self, rva: u32, len: usize) -> Result<Vec<u8>, MemoryError> {
        self.check(rva, len)?;
        Ok(self.image()[rva as usize..rva as usize + len].to_vec())
    }

    /// Writes one page at a time, since neighbouring pages can have different
    /// protections, and `VirtualProtect` only reports the first page's.
    fn write(&mut self, rva: u32, bytes: &[u8]) -> Result<(), MemoryError> {
        self.check(rva, bytes.len())?;
        let mut address = self.base.wrapping_add(rva);
        let mut rest = bytes;
        while !rest.is_empty() {
            let room = (PAGE - address % PAGE) as usize;
            let (now, later) = rest.split_at(room.min(rest.len()));
            // SAFETY: the range is inside the image, and writable for the
            // length of the copy.
            unsafe { write_page(address, now) }?;
            address = address.wrapping_add(now.len() as u32);
            rest = later;
        }
        Ok(())
    }

    /// New memory comes from the heap, so it's writable and not executable.
    /// Leaking it is the point: the game keeps using it until it exits.
    fn allocate(&mut self, bytes: &[u8]) -> Result<u32, MemoryError> {
        Ok(Box::leak(bytes.to_vec().into_boxed_slice()).as_ptr() as usize as u32)
    }
}

/// # Safety
/// `address` and the bytes after it are mapped, and within one page.
unsafe fn write_page(address: u32, bytes: &[u8]) -> Result<(), MemoryError> {
    let target = address as usize as *mut u8;
    let mut old = 0;
    if VirtualProtect(target as *mut c_void, bytes.len(), PAGE_READWRITE, &mut old) == 0 {
        return Err(MemoryError(format!("the memory at {address:#x} couldn't be made writable")));
    }
    std::ptr::copy_nonoverlapping(bytes.as_ptr(), target, bytes.len());
    let mut ignored = 0;
    if VirtualProtect(target as *mut c_void, bytes.len(), old, &mut ignored) == 0 {
        return Err(MemoryError(format!("the protection of the memory at {address:#x} couldn't be restored")));
    }
    FlushInstructionCache(GetCurrentProcess(), target as *const c_void, bytes.len());
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[repr(C)]
    struct Info {
        base: *mut c_void,
        allocation_base: *mut c_void,
        allocation_protect: u32,
        region_size: usize,
        state: u32,
        protect: u32,
        kind: u32,
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn VirtualQuery(address: *const c_void, info: *mut Info, size: usize) -> usize;
    }

    fn protection(address: u32) -> u32 {
        let mut info = unsafe { std::mem::zeroed::<Info>() };
        let got = unsafe { VirtualQuery(address as usize as *const c_void, &mut info, std::mem::size_of::<Info>()) };
        assert_ne!(got, 0);
        info.protect
    }

    // In a section of its own: a write makes its page non-executable for a
    // moment, so no code that's running can share that page.
    #[inline(never)]
    #[link_section = ".agcode"]
    fn never_called() -> u32 {
        std::hint::black_box(0x1234_5678)
    }

    // Two pages in a section of their own, so that the writes across their
    // boundary don't touch anything another test reads.
    #[link_section = ".agdata"]
    static DATA: [u8; 2 * PAGE as usize] = [7; 2 * PAGE as usize];

    /// Held by the tests that write to `DATA`. A write changes its page's
    /// protection for a moment, which another test would see.
    static DATA_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

    fn lock_data() -> std::sync::MutexGuard<'static, ()> {
        DATA_LOCK.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn check_write_restores_protection(mem: &mut ProcessMemory, rva: u32) {
        let before = protection(mem.base() + rva);
        let original = mem.read(rva, 4).unwrap();
        let changed: Vec<u8> = original.iter().map(|b| !b).collect();
        mem.write(rva, &changed).unwrap();
        assert_eq!(mem.read(rva, 4).unwrap(), changed);
        // Windows reports a written copy-on-write page as plain read-write.
        let after = protection(mem.base() + rva);
        assert!(after == before || (before == 0x08 && after == 0x04) || (before == 0x80 && after == 0x40), "{before:#x} became {after:#x}");
        mem.write(rva, &original).unwrap();
        assert_eq!(mem.read(rva, 4).unwrap(), original);
    }

    #[test]
    fn writes_to_code_and_restores_its_protection() {
        let mut mem = ProcessMemory::current().unwrap();
        let rva = never_called as usize as u32 - mem.base();
        assert_ne!(protection(mem.base() + rva) & 0xF0, 0, "the function should be in executable memory");
        check_write_restores_protection(&mut mem, rva);
    }

    #[test]
    fn writes_to_read_only_data_and_restores_its_protection() {
        let _data = lock_data();
        let mut mem = ProcessMemory::current().unwrap();
        let rva = DATA.as_ptr() as usize as u32 - mem.base();
        check_write_restores_protection(&mut mem, rva);
    }

    #[test]
    fn writes_across_a_page_boundary() {
        let _data = lock_data();
        let mut mem = ProcessMemory::current().unwrap();
        let rva = (DATA.as_ptr() as usize as u32 - mem.base()) & !(PAGE - 1);
        let rva = rva + PAGE - 2;
        let before = (protection(mem.base() + rva), protection(mem.base() + rva + 2));
        let original = mem.read(rva, 4).unwrap();
        let changed: Vec<u8> = original.iter().map(|b| !b).collect();
        mem.write(rva, &changed).unwrap();
        assert_eq!(mem.read(rva, 4).unwrap(), changed);
        mem.write(rva, &original).unwrap();
        let after = (protection(mem.base() + rva), protection(mem.base() + rva + 2));
        assert!(before.1 == after.1 || before.1 == 0x08, "{before:x?} became {after:x?}");
    }

    #[test]
    fn rejects_addresses_outside_the_image() {
        let mut mem = ProcessMemory::current().unwrap();
        let size = mem.image().len() as u32;
        assert!(mem.read(size - 1, 2).is_err());
        assert!(mem.read(u32::MAX, 2).is_err());
        assert!(mem.write(size, &[0]).is_err());
    }

    #[test]
    fn allocates_writable_memory_that_isnt_executable() {
        let mut mem = ProcessMemory::current().unwrap();
        let a = mem.allocate(&[1, 2, 3, 4]).unwrap();
        assert_eq!(unsafe { *(a as usize as *const [u8; 4]) }, [1, 2, 3, 4]);
        assert_eq!(protection(a), 0x04);
        unsafe { *(a as usize as *mut u8) = 9 };
    }

    #[test]
    fn finds_this_executable() {
        let mem = ProcessMemory::current().unwrap();
        assert_eq!(&mem.image()[..2], b"MZ");
        assert_eq!(mem.base() % 0x1000, 0);
    }
}
