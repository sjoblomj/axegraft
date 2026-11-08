//! The MPQDraft plugin interface, kept in this one module.
//!
//! `IMPQDraftPlugin` and `IMPQDraftServer` are C++ classes with virtual
//! `WINAPI` methods: an object starts with a pointer to a table of `stdcall`
//! functions, in the order the header declares them, each taking the object
//! as its first argument.

use crate::patch;
use crate::remembered;
use crate::text;
use crate::win32::*;
use axegraft_patcher_core::pe::{self, Layout};
use axegraft_patcher_core::PATCHER_VERSION;
use axegraft_patcher_library::library;
use std::ffi::{c_char, CStr};
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::Mutex;

const FALSE: BOOL = 0;
const TRUE: BOOL = 1;

/// MPQDraft's limit on a module's path, including the NUL.
const MAX_PATH: usize = 264;

/// The plugin's globally unique ID: "AXGP" in memory.
const PLUGIN_ID: u32 = 0x5047_5841;
/// The mod file's module. MPQDraft gives the plugin itself module 0.
const MOD_MODULE: u32 = 1;

/// `MPQDRAFTPLUGINMODULE`.
#[repr(C, packed)]
pub struct Module {
    component: u32,
    module: u32,
    execute: BOOL,
    file_name: [u8; MAX_PATH],
}

/// `IMPQDraftServer`.
#[repr(C)]
pub struct Server {
    vtable: *const ServerVtable,
}

#[repr(C)]
struct ServerVtable {
    get_plugin_module: unsafe extern "stdcall" fn(*const Server, u32, u32, *mut u8) -> BOOL,
}

/// `IMPQDraftPlugin`.
#[repr(C)]
pub struct Plugin {
    vtable: *const PluginVtable,
}

// The object is immutable, and only ever handed out by address.
unsafe impl Sync for Plugin {}

#[repr(C)]
struct PluginVtable {
    identify: unsafe extern "stdcall" fn(*const Plugin, *mut u32) -> BOOL,
    get_plugin_name: unsafe extern "stdcall" fn(*const Plugin, *mut u8, u32) -> BOOL,
    can_patch_executable: unsafe extern "stdcall" fn(*const Plugin, *const c_char) -> BOOL,
    configure: unsafe extern "stdcall" fn(*const Plugin, HWND) -> BOOL,
    ready_for_patch: unsafe extern "stdcall" fn(*const Plugin) -> BOOL,
    get_modules: unsafe extern "stdcall" fn(*const Plugin, *mut Module, *mut u32) -> BOOL,
    initialize_plugin: unsafe extern "stdcall" fn(*const Plugin, *const Server) -> BOOL,
    terminate_plugin: unsafe extern "stdcall" fn(*const Plugin) -> BOOL,
}

static VTABLE: PluginVtable = PluginVtable { identify, get_plugin_name, can_patch_executable, configure, ready_for_patch, get_modules, initialize_plugin, terminate_plugin };
static PLUGIN: Plugin = Plugin { vtable: &VTABLE };

/// The mod file chosen in this MPQDraft session, in the ANSI code page and
/// without its NUL.
static CHOSEN: Mutex<Option<Vec<u8>>> = Mutex::new(None);

fn chosen() -> Option<Vec<u8>> {
    // MPQDraft's command line can't call Configure.
    #[cfg(feature = "test-hooks")]
    if let Some(path) = std::env::var_os("AXEGRAFT_PATCHER_TEST_MOD") {
        return Some(path.to_string_lossy().into_owned().into_bytes());
    }
    let held = CHOSEN.lock().unwrap_or_else(|e| e.into_inner()).clone();
    held.or_else(|| remembered::load(MAX_PATH))
}

/// Runs an entry point's work, so that a panic never unwinds into MPQDraft.
fn entry(work: impl FnOnce() -> BOOL) -> BOOL {
    catch_unwind(AssertUnwindSafe(work)).unwrap_or_else(|payload| {
        patch::show_error(&format!("AxeGraft Patcher had an internal fault: {}.", patch::panic_text(&*payload)));
        FALSE
    })
}

/// Gives MPQDraft the plugin's interface.
///
/// # Safety
/// `plugin` is null, or points to writable memory for a pointer.
#[no_mangle]
pub unsafe extern "stdcall" fn GetMPQDraftPlugin(plugin: *mut *const Plugin) -> BOOL {
    if plugin.is_null() {
        return FALSE;
    }
    plugin.write(&PLUGIN);
    TRUE
}

unsafe extern "stdcall" fn identify(_: *const Plugin, id: *mut u32) -> BOOL {
    if id.is_null() {
        return FALSE;
    }
    id.write_unaligned(PLUGIN_ID);
    TRUE
}

unsafe extern "stdcall" fn get_plugin_name(_: *const Plugin, name: *mut u8, length: u32) -> BOOL {
    entry(|| {
        let text = format!("AxeGraft Patcher v{PATCHER_VERSION}\0");
        if name.is_null() || text.len() > length as usize {
            return FALSE;
        }
        std::ptr::copy_nonoverlapping(text.as_ptr(), name, text.len());
        TRUE
    })
}

unsafe extern "stdcall" fn can_patch_executable(_: *const Plugin, file: *const c_char) -> BOOL {
    entry(|| {
        if file.is_null() {
            return FALSE;
        }
        let path = text::path_from_ansi(CStr::from_ptr(file).to_bytes());
        let supported = std::fs::read(path).ok().and_then(|bytes| pe::identity(&bytes, Layout::File).ok()).is_some_and(|i| library().identify(&i).is_some());
        supported as BOOL
    })
}

unsafe extern "stdcall" fn configure(_: *const Plugin, parent: HWND) -> BOOL {
    entry(|| {
        let mut file = [0u8; MAX_PATH];
        if let Some(path) = chosen().filter(|p| p.len() < MAX_PATH) {
            file[..path.len()].copy_from_slice(&path);
        }
        let mut dialog: OPENFILENAMEA = std::mem::zeroed();
        dialog.lStructSize = std::mem::size_of::<OPENFILENAMEA>() as u32;
        dialog.hwndOwner = parent;
        dialog.lpstrFilter = b"AxeGraft mods (*.json)\0*.json\0All files (*.*)\0*.*\0\0".as_ptr();
        dialog.lpstrFile = file.as_mut_ptr();
        dialog.nMaxFile = MAX_PATH as u32;
        dialog.lpstrTitle = b"Choose an AxeGraft mod\0".as_ptr();
        dialog.Flags = OFN_EXPLORER | OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST | OFN_HIDEREADONLY | OFN_NOCHANGEDIR;
        if GetOpenFileNameA(&mut dialog) == 0 {
            // No error means the user cancelled, which keeps the previous choice.
            return (CommDlgExtendedError() == 0) as BOOL;
        }
        let length = file.iter().position(|b| *b == 0).unwrap_or(MAX_PATH - 1);
        *CHOSEN.lock().unwrap_or_else(|e| e.into_inner()) = Some(file[..length].to_vec());
        remembered::save(&file[..length]);
        TRUE
    })
}

unsafe extern "stdcall" fn ready_for_patch(_: *const Plugin) -> BOOL {
    entry(|| chosen().is_some() as BOOL)
}

unsafe extern "stdcall" fn get_modules(_: *const Plugin, modules: *mut Module, count: *mut u32) -> BOOL {
    entry(|| {
        if count.is_null() {
            return FALSE;
        }
        let Some(path) = chosen() else {
            count.write_unaligned(0);
            return TRUE;
        };
        if !modules.is_null() {
            let mut file_name = [0u8; MAX_PATH];
            file_name[..path.len()].copy_from_slice(&path);
            modules.write_unaligned(Module { component: PLUGIN_ID, module: MOD_MODULE, execute: FALSE, file_name });
        }
        count.write_unaligned(1);
        TRUE
    })
}

unsafe extern "stdcall" fn initialize_plugin(_: *const Plugin, server: *const Server) -> BOOL {
    entry(|| {
        let mut locate = || locate_mod(server);
        patch::run_once(&mut locate) as BOOL
    })
}

/// Asks MPQDraft where the mod file is.
unsafe fn locate_mod(server: *const Server) -> Option<Vec<u8>> {
    if server.is_null() {
        return None;
    }
    let mut file = [0u8; MAX_PATH];
    if ((*(*server).vtable).get_plugin_module)(server, PLUGIN_ID, MOD_MODULE, file.as_mut_ptr()) == 0 {
        return None;
    }
    file[MAX_PATH - 1] = 0;
    let length = file.iter().position(|b| *b == 0)?;
    Some(file[..length].to_vec())
}

unsafe extern "stdcall" fn terminate_plugin(_: *const Plugin) -> BOOL {
    TRUE
}
