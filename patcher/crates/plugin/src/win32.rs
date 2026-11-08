//! Every Windows function the plugin's own code calls, declared by hand so
//! the list is easy to review. A test compares it with an allowlist.

#![allow(clippy::upper_case_acronyms)]

use std::ffi::c_void;

pub type BOOL = i32;
pub type HANDLE = *mut c_void;
pub type HMODULE = *mut c_void;
pub type HWND = *mut c_void;

pub const PAGE_READWRITE: u32 = 0x04;
pub const CP_ACP: u32 = 0;

pub const MB_ICONERROR: u32 = 0x10;
pub const MB_SETFOREGROUND: u32 = 0x1_0000;
pub const MB_TOPMOST: u32 = 0x4_0000;

pub const OFN_HIDEREADONLY: u32 = 0x4;
pub const OFN_NOCHANGEDIR: u32 = 0x8;
pub const OFN_PATHMUSTEXIST: u32 = 0x800;
pub const OFN_FILEMUSTEXIST: u32 = 0x1000;
pub const OFN_EXPLORER: u32 = 0x8_0000;

#[repr(C)]
pub struct OPENFILENAMEA {
    pub lStructSize: u32,
    pub hwndOwner: HWND,
    pub hInstance: HMODULE,
    pub lpstrFilter: *const u8,
    pub lpstrCustomFilter: *mut u8,
    pub nMaxCustFilter: u32,
    pub nFilterIndex: u32,
    pub lpstrFile: *mut u8,
    pub nMaxFile: u32,
    pub lpstrFileTitle: *mut u8,
    pub nMaxFileTitle: u32,
    pub lpstrInitialDir: *const u8,
    pub lpstrTitle: *const u8,
    pub Flags: u32,
    pub nFileOffset: u16,
    pub nFileExtension: u16,
    pub lpstrDefExt: *const u8,
    pub lCustData: isize,
    pub lpfnHook: *const c_void,
    pub lpTemplateName: *const u8,
    pub pvReserved: *const c_void,
    pub dwReserved: u32,
    pub FlagsEx: u32,
}

#[link(name = "kernel32")]
extern "system" {
    pub fn FlushInstructionCache(process: HANDLE, address: *const c_void, size: usize) -> BOOL;
    pub fn GetCurrentProcess() -> HANDLE;
    pub fn GetModuleFileNameW(module: HMODULE, name: *mut u16, size: u32) -> u32;
    pub fn GetModuleHandleW(name: *const u16) -> HMODULE;
    pub fn MultiByteToWideChar(code_page: u32, flags: u32, text: *const u8, length: i32, wide: *mut u16, wide_length: i32) -> i32;
    pub fn VirtualProtect(address: *mut c_void, size: usize, protect: u32, old: *mut u32) -> BOOL;
}

#[link(name = "user32")]
extern "system" {
    pub fn MessageBoxW(parent: HWND, text: *const u16, caption: *const u16, kind: u32) -> i32;
}

#[link(name = "comdlg32")]
extern "system" {
    pub fn CommDlgExtendedError() -> u32;
    pub fn GetOpenFileNameA(dialog: *mut OPENFILENAMEA) -> BOOL;
}
