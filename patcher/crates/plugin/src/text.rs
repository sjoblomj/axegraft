//! Windows strings. MPQDraft gives and takes paths in the ANSI code page.

use crate::win32::*;
use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use std::path::PathBuf;

/// A NUL-terminated UTF-16 copy.
pub fn wide(text: &str) -> Vec<u16> {
    text.encode_utf16().chain(Some(0)).collect()
}

/// A path given in the ANSI code page, without its NUL.
pub fn path_from_ansi(ansi: &[u8]) -> PathBuf {
    let mut buffer = vec![0u16; ansi.len()];
    // SAFETY: both lengths are those of the buffers. No conversion makes more
    // UTF-16 units than there are bytes.
    let n = unsafe { MultiByteToWideChar(CP_ACP, 0, ansi.as_ptr(), ansi.len() as i32, buffer.as_mut_ptr(), buffer.len() as i32) };
    buffer.truncate(n.max(0) as usize);
    PathBuf::from(OsString::from_wide(&buffer))
}
