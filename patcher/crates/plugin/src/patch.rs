//! What happens when the plugin is loaded in the game: everything is done in
//! one step, before any game code runs.

use crate::log::FileLog;
use crate::memory::ProcessMemory;
use crate::text;
use crate::win32::*;
use axegraft_patcher_core::apply::apply;
use axegraft_patcher_core::input::{file_name, load_mod, InputError, ModFile};
use axegraft_patcher_core::memory::Memory;
use axegraft_patcher_core::pe::{self, Layout};
use axegraft_patcher_core::plan::plan;
use axegraft_patcher_core::report::{self, LogSink};
use axegraft_patcher_core::Problem;
use axegraft_patcher_library::library;
use std::any::Any;
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::Mutex;

/// Why the game has to close.
struct Failure {
    what: String,
    problems: Vec<Problem>,
}

/// The first call's result. The mod is applied once per process.
static RESULT: Mutex<Option<bool>> = Mutex::new(None);

/// Applies the mod, unless that has already been done, and says whether the
/// game may continue. `locate` gives the mod file's path, in the ANSI code
/// page.
pub fn run_once(locate: &mut dyn FnMut() -> Option<Vec<u8>>) -> bool {
    let mut result = RESULT.lock().unwrap_or_else(|e| e.into_inner());
    *result.get_or_insert_with(|| run(locate))
}

fn run(locate: &mut dyn FnMut() -> Option<Vec<u8>>) -> bool {
    let mut log = FileLog::create();
    let failure = match catch_unwind(AssertUnwindSafe(|| patch(locate, &mut log))) {
        Ok(Ok(())) => {
            log.close();
            return true;
        }
        Ok(Err(f)) => f,
        Err(payload) => internal_failure(payload),
    };
    for l in report::problems(&failure.problems) {
        log.line(&l);
    }
    // The log is complete and closed before the user is told about it.
    let path = log.close();
    show_error(&report::error_message(&failure.what, &failure.problems, path.as_deref()));
    false
}

fn internal_failure(payload: Box<dyn Any + Send>) -> Failure {
    Failure { what: "AxeGraft Patcher had an internal fault.".into(), problems: vec![Problem::new("", "", panic_text(&*payload))] }
}

/// The message of a caught panic.
pub fn panic_text(payload: &(dyn Any + Send)) -> String {
    payload.downcast_ref::<&str>().map(|s| s.to_string()).or_else(|| payload.downcast_ref::<String>().cloned()).unwrap_or_else(|| "an unknown fault".into())
}

fn patch(locate: &mut dyn FnMut() -> Option<Vec<u8>>, log: &mut FileLog) -> Result<(), Failure> {
    let cant_apply = |problems| Failure { what: "AxeGraft Patcher couldn't apply the mod.".into(), problems };

    let exe = executable_path();
    let exe_name = file_name(&exe).to_string();
    let unsupported = |reason: String| Failure {
        what: format!("AxeGraft Patcher can't patch {exe_name}."),
        problems: vec![Problem::new(exe_name.clone(), "", reason)],
    };

    let mut mem = match ProcessMemory::current() {
        Ok(m) => m,
        Err(e) => {
            log_lines(log, report::header(&exe, None, 0));
            return Err(unsupported(format!("It can't be identified: {e}.")));
        }
    };
    let identity = pe::identity(mem.image(), Layout::Image);
    let found = identity.as_ref().ok().and_then(|i| library().identify(i));
    let Some((game, version)) = found else {
        log_lines(log, report::header(&exe, None, mem.base()));
        return Err(unsupported(match identity {
            Err(e) => format!("It can't be identified: {e}."),
            Ok(_) => "It isn't a version AxeGraft Patcher supports.".to_string(),
        }));
    };
    log_lines(log, report::header(&exe, Some((game.game, &version.id)), mem.base()));

    let file = read_mod(locate);
    if let Ok(f) = &file {
        log_lines(log, report::input(&f.path));
        #[cfg(feature = "test-hooks")]
        assert!(!f.path.contains("__panic__"), "injected fault");
    }
    let name = file.as_ref().map_or(String::new(), |f| f.name().to_string());
    let parsed = load_mod(file, &game.vocabulary()).map_err(cant_apply)?;
    let planned = plan(&name, &parsed, game, version, &mem).map_err(cant_apply)?;
    apply(&name, &planned, &mut mem, log).map_err(cant_apply)?;
    log_lines(log, report::applied(&planned));
    Ok(())
}

fn log_lines(log: &mut FileLog, lines: Vec<String>) {
    for l in lines {
        log.line(&l);
    }
    log.flush();
}

fn read_mod(locate: &mut dyn FnMut() -> Option<Vec<u8>>) -> Result<ModFile, InputError> {
    let ansi = locate().ok_or(InputError::NotLocated)?;
    let path = text::path_from_ansi(&ansi);
    let shown = path.to_string_lossy().into_owned();
    match std::fs::read(&path) {
        Ok(bytes) => Ok(ModFile { path: shown, bytes }),
        Err(e) => Err(InputError::Unreadable { path: shown, reason: e.to_string() }),
    }
}

fn executable_path() -> String {
    let mut name = [0u16; 1024];
    // SAFETY: the buffer's length is passed, and a null module means the executable.
    let n = unsafe { GetModuleFileNameW(std::ptr::null_mut(), name.as_mut_ptr(), name.len() as u32) };
    String::from_utf16_lossy(&name[..n as usize])
}

/// Tells the user something went wrong.
pub fn show_error(message: &str) {
    let text = text::wide(message);
    let caption = text::wide("AxeGraft Patcher");
    // SAFETY: both strings are NUL-terminated and outlive the call.
    unsafe { MessageBoxW(std::ptr::null_mut(), text.as_ptr(), caption.as_ptr(), MB_ICONERROR | MB_TOPMOST | MB_SETFOREGROUND) };
}
