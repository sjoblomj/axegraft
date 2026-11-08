//! Tests of the real plugin DLL, run under Wine by a host compiled as C++.
//!
//! Most use the release DLL. Applying a mod needs a running game the library
//! recognises, so those tests build a second DLL from the toy library, with
//! the `test-hooks` feature, and a host that is that game. The end-to-end
//! tests at the end start a fake game through a real MPQDraft, named by
//! `AXEGRAFT_PATCHER_MPQDRAFT_DIR`, and are skipped when that isn't set.
//!
//! When Wine or MinGW isn't installed, each test says so and passes.

use axegraft_patcher_core::library_files::load_dir;
use axegraft_patcher_core::pe::{self, Layout};
use axegraft_patcher_core::{Game, Library};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Mutex, OnceLock};

#[allow(dead_code)]
#[path = "../../core/tests/common/image.rs"]
mod image;

const TARGET: &str = "i686-pc-windows-gnu";
const PLUGIN_ID: &str = "50475841";
const GAME_BASE: u32 = 0x400000;
const GAME_VERSION: &str = "1.16.1";
const SUPPLY_RVA: &str = "6000";

fn manifest() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn root() -> PathBuf {
    manifest().join("../..").canonicalize().unwrap()
}

fn have(tool: &str) -> bool {
    Command::new(tool).arg("--version").output().is_ok_and(|o| o.status.success())
}

/// The tools are there, or the test should say so and stop.
fn tools() -> bool {
    let missing: Vec<_> = ["wine", "i686-w64-mingw32-g++", "i686-w64-mingw32-objdump", "i686-w64-mingw32-windres"].into_iter().filter(|t| !have(t)).collect();
    if !missing.is_empty() {
        eprintln!("SKIPPED: {} not installed", missing.join(", "));
    }
    missing.is_empty()
}

fn run(cmd: &mut Command) -> String {
    let o = cmd.output().unwrap_or_else(|e| panic!("{cmd:?}: {e}"));
    let out = String::from_utf8_lossy(&o.stdout).into_owned();
    assert!(o.status.success(), "{cmd:?} failed\n{out}\n{}", String::from_utf8_lossy(&o.stderr));
    out
}

fn work_dir() -> PathBuf {
    let d = root().join("target/wine-tests");
    std::fs::create_dir_all(&d).unwrap();
    d
}

fn cargo() -> Command {
    let mut c = Command::new(std::env::var("CARGO").unwrap());
    c.current_dir(root());
    c
}

/// The release DLL, as shipped, built once per test run.
fn dll() -> &'static Path {
    static DLL: OnceLock<PathBuf> = OnceLock::new();
    DLL.get_or_init(|| {
        run(cargo().args(["build", "--release", "-p", "axegraft-patcher-plugin", "--target", TARGET]));
        root().join("target").join(TARGET).join("release/AxeGraftPatcher.dll")
    })
}

fn toy() -> PathBuf {
    manifest().join("../core/tests/fixtures/library/toy")
}

/// A DLL built from the toy library, with faults that can be injected.
fn fixture_dll() -> &'static Path {
    static DLL: OnceLock<PathBuf> = OnceLock::new();
    DLL.get_or_init(|| {
        let target_dir = work_dir().join("fixture-build");
        run(cargo()
            .args(["build", "--release", "-p", "axegraft-patcher-plugin", "--features", "test-hooks", "--target", TARGET, "--target-dir"])
            .arg(&target_dir)
            .env("AXEGRAFT_PATCHER_LIBRARY_DATA", toy()));
        target_dir.join(TARGET).join("release/AxeGraftPatcher.dll")
    })
}

fn gpp() -> Command {
    let mut c = Command::new("i686-w64-mingw32-g++");
    c.args(["-static", "-Wall"]);
    c.arg(manifest().join("tests/host/host.cpp"));
    c.arg("-lcomdlg32").arg("-lversion");
    c
}

fn host() -> &'static Path {
    static HOST: OnceLock<PathBuf> = OnceLock::new();
    HOST.get_or_init(|| {
        let out = work_dir().join("host.exe");
        run(gpp().arg("-o").arg(&out));
        out
    })
}

fn toy_library() -> Library {
    load_dir(&toy()).unwrap().without_unreliable()
}

/// A host that the toy library recognises as StarCraft 1.16.1, holding an
/// unmodified image of that version's tables at the library's RVAs.
fn game() -> &'static Path {
    static GAME: OnceLock<PathBuf> = OnceLock::new();
    GAME.get_or_init(|| {
        let dir = work_dir().join("game");
        std::fs::create_dir_all(&dir).unwrap();
        let lib = toy_library();
        let g = lib.game(Game::StarCraft).unwrap();
        let v = g.version(GAME_VERSION).unwrap();
        let img = image::image(g, v, GAME_BASE);

        let bytes: Vec<String> = img[0x1000..0x8000].iter().map(u8::to_string).collect();
        let header = format!("__attribute__((used, section(\".game\"))) const unsigned char game_image[0x7000] = {{{}}};\n", bytes.join(","));
        std::fs::write(dir.join("game_image.h"), header).unwrap();

        let [a, b, c, d] = v.identity.product_version;
        let rc = format!(
            "1 VERSIONINFO FILEVERSION {a},{b},{c},{d} PRODUCTVERSION {a},{b},{c},{d}\nBEGIN\n BLOCK \"StringFileInfo\"\n BEGIN\n  BLOCK \"040904B0\"\n  BEGIN\n   VALUE \"ProductName\", \"Fake Game\\0\"\n  END\n END\n BLOCK \"VarFileInfo\"\n BEGIN\n  VALUE \"Translation\", 0x409, 1200\n END\nEND\n"
        );
        std::fs::write(dir.join("game.rc"), rc).unwrap();
        run(Command::new("i686-w64-mingw32-windres").args(["-F", "pe-i386", "-O", "coff", "-o"]).arg(dir.join("game_res.o")).arg(dir.join("game.rc")));

        let out = dir.join("game.exe");
        run(gpp()
            .arg("-DGAME")
            .arg("-I")
            .arg(&dir)
            .arg(dir.join("game_res.o"))
            .args(["-Wl,--section-start=.game=0x401000", "-Wl,--section-start=.text=0x410000", "-Wl,--disable-dynamicbase", "-o"])
            .arg(&out));

        // The linker can't be told what timestamp to write.
        let mut exe = std::fs::read(&out).unwrap();
        let pe_at = u32::from_le_bytes(exe[0x3C..0x40].try_into().unwrap()) as usize;
        exe[pe_at + 8..pe_at + 12].copy_from_slice(&v.identity.timestamp.to_le_bytes());
        std::fs::write(&out, exe).unwrap();
        out
    })
}

fn prefix(c: &mut Command) -> &mut Command {
    c.env("WINEPREFIX", work_dir().join("prefix")).env("WINEDEBUG", "-all").env("WINEDLLOVERRIDES", "mscoree,mshtml=")
}

struct Run {
    out: String,
    status: Option<i32>,
    stderr: String,
}

impl Run {
    fn get(&self, key: &str) -> Option<&str> {
        self.out.lines().find_map(|l| l.strip_prefix(key)?.strip_prefix('='))
    }

    #[track_caller]
    fn is(&self, key: &str, want: &str) {
        assert_eq!(self.get(key), Some(want), "{key}\n{}\n{}", self.out, self.stderr);
    }

    fn message_box(&self) -> &str {
        self.get("message_box").unwrap_or_else(|| panic!("no message box\n{}", self.out))
    }
}

fn exec(exe: &Path, dll: &Path, ops: &[String]) -> Run {
    let o = prefix(Command::new("wine").arg(exe).arg(dll).args(ops)).output().expect("wine runs");
    let run = Run { out: String::from_utf8_lossy(&o.stdout).replace('\r', ""), status: o.status.code(), stderr: String::from_utf8_lossy(&o.stderr).into_owned() };
    run
}

fn ops(list: &[&str]) -> Vec<String> {
    list.iter().map(|s| s.to_string()).collect()
}

/// The release DLL, in a host that isn't a supported game.
#[track_caller]
fn release(list: &[&str]) -> Run {
    let r = exec(host(), dll(), &ops(list));
    assert_eq!(r.status, Some(0), "{}\n{}", r.out, r.stderr);
    r
}

/// The fixture DLL, in a host that is its game.
fn in_game(list: &[String]) -> Run {
    exec(game(), fixture_dll(), list)
}

/// A clean folder for one test, with a temp folder for the log.
struct Sandbox(PathBuf);

impl Sandbox {
    fn new(name: &str) -> Sandbox {
        let d = work_dir().join("runs").join(name);
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(d.join("temp")).unwrap();
        Sandbox(d)
    }

    fn temp(&self) -> String {
        format!("temp:{}", windows_path(&self.0.join("temp")))
    }

    fn log(&self) -> PathBuf {
        self.0.join("temp/AxeGraftPatcher.log")
    }

    fn log_text(&self) -> String {
        std::fs::read_to_string(self.log()).unwrap_or_else(|e| panic!("no log: {e}"))
    }

    /// Writes a mod file, and returns the operation that applies it.
    fn init(&self, name: &str, text: &str) -> String {
        let f = self.0.join(name);
        std::fs::create_dir_all(f.parent().unwrap()).unwrap();
        std::fs::write(&f, text).unwrap();
        format!("init:{}", windows_path(&f))
    }
}

fn windows_path(p: &Path) -> String {
    format!("Z:{}", p.display().to_string().replace('/', "\\"))
}

fn supply_mod(value: u32) -> String {
    format!(r#"{{"patcher": "AxeGraft", "format": 1, "game": "starcraft", "constants": [{{"name": "max_supply", "value": {value}}}]}}"#)
}

fn objdump(dll: &Path) -> String {
    run(Command::new("i686-w64-mingw32-objdump").arg("-p").arg(dll))
}

/// The names in the DLL's export table.
fn exports(dump: &str) -> Vec<String> {
    let table = dump.split("[Ordinal/Name Pointer] Table").nth(1).unwrap_or("");
    table.lines().skip(2).take_while(|l| l.trim_start().starts_with('[')).filter_map(|l| l.split_whitespace().last().map(str::to_string)).collect()
}

macro_rules! needs_tools {
    () => {
        if !tools() {
            return;
        }
    };
}

// 8.1

#[test]
fn exports_only_the_undecorated_entry_point() {
    needs_tools!();
    assert_eq!(exports(&objdump(dll())), vec!["GetMPQDraftPlugin"]);
}

#[test]
fn imports_only_system_libraries() {
    needs_tools!();
    let dump = objdump(dll());
    let names: Vec<_> = dump.lines().filter_map(|l| l.trim().strip_prefix("DLL Name: ")).map(str::to_ascii_lowercase).collect();
    assert!(!names.is_empty());
    for n in names {
        assert!(!n.contains("gcc") && !n.contains("stdc++") && !n.contains("winpthread"), "the plugin needs {n}, which isn't part of Windows");
    }
}

#[test]
fn loads_under_wine() {
    needs_tools!();
    let r = release(&["load"]);
    for k in ["loaded", "export", "get_plugin", "interface"] {
        r.is(k, "1");
    }
}

// 8.2

#[test]
fn identifies_itself_with_a_stable_id_and_its_version() {
    needs_tools!();
    let r = release(&["identify", "name", "name_short"]);
    r.is("identify", "1");
    r.is("plugin_id", PLUGIN_ID);
    r.is("name_ok", "1");
    r.is("name", &format!("AxeGraft Patcher v{}", env!("CARGO_PKG_VERSION")));
    r.is("name_short", "0");
}

#[test]
fn offered_only_for_supported_executables() {
    needs_tools!();
    // The toy library recognises the game host, and only that.
    let g = windows_path(game());
    let h = windows_path(host());
    let r = exec(host(), fixture_dll(), &[format!("can_patch:{g}")]);
    r.is("can_patch", "1");
    let r = exec(host(), fixture_dll(), &[format!("can_patch:{h}")]);
    r.is("can_patch", "0");
    // The real library doesn't recognise the fixture game.
    let r = release(&[&format!("can_patch:{g}")]);
    r.is("can_patch", "0");
}

#[test]
fn unreadable_executable_cant_be_patched() {
    needs_tools!();
    let r = release(&["can_patch:Z:\\no\\such\\game.exe", "alive"]);
    r.is("can_patch", "0");
    r.is("alive", "1");
}

#[test]
fn real_executables_can_be_patched() {
    needs_tools!();
    let Ok(list) = std::fs::read_to_string(root().join("executables.local.txt")) else {
        eprintln!("SKIPPED: no executables.local.txt");
        return;
    };
    let mut checked = 0;
    for line in list.lines().filter(|l| !l.starts_with('#')) {
        let mut parts = line.splitn(3, ' ');
        let (Some(_), Some(_), Some(path)) = (parts.next(), parts.next(), parts.next()) else { continue };
        if !Path::new(path).exists() {
            continue;
        }
        let r = release(&[&format!("can_patch:{}", windows_path(Path::new(path)))]);
        r.is("can_patch", "1");
        checked += 1;
    }
    assert!(checked > 0 || list.is_empty(), "no listed executable exists");
}

#[test]
fn ready_only_with_a_mod_file() {
    needs_tools!();
    let r = release(&["ready", "modules"]);
    r.is("ready", "0");
    r.is("modules_ok", "1");
    r.is("modules_count", "0");
}

#[test]
fn the_mod_file_is_the_only_module() {
    needs_tools!();
    let r = release(&["pick:C:\\Mods\\a.json", "ready", "modules"]);
    r.is("ready", "1");
    r.is("modules_count", "1");
    r.is("modules_list_ok", "1");
    r.is("modules_returned", "1");
    r.is("module", &format!("{PLUGIN_ID}:1:0:C:\\Mods\\a.json"));
}

#[test]
fn shutdown_succeeds() {
    needs_tools!();
    release(&["terminate"]).is("terminate", "1");
}

// 8.3

#[test]
fn real_memory_under_wine() {
    needs_tools!();
    let mut c = cargo();
    c.args(["test", "--lib", "-p", "axegraft-patcher-plugin", "--target", TARGET]).env("CARGO_TARGET_I686_PC_WINDOWS_GNU_RUNNER", "wine");
    let out = run(prefix(&mut c));
    assert!(out.contains("test memory::tests::"), "the memory tests didn't run\n{out}");
}

// 8.4

#[test]
fn choosing_a_file() {
    needs_tools!();
    let r = release(&["pick:C:\\a.json", "modules"]);
    r.is("configure", "1");
    r.is("dialog_filter_json", "1");
    r.is("module", &format!("{PLUGIN_ID}:1:0:C:\\a.json"));
    assert!(r.get("message_box").is_none());
}

#[test]
fn cancelling_keeps_the_previous_choice() {
    needs_tools!();
    let r = release(&["cancel", "ready", "pick:C:\\a.json", "cancel", "ready", "modules"]);
    assert_eq!(r.out.matches("configure=1").count(), 3, "{}", r.out);
    assert_eq!(r.out.lines().filter(|l| l.starts_with("ready=")).collect::<Vec<_>>(), vec!["ready=0", "ready=1"]);
    r.is("module", &format!("{PLUGIN_ID}:1:0:C:\\a.json"));
}

#[test]
fn choosing_again_replaces_the_choice() {
    needs_tools!();
    let r = release(&["pick:C:\\a.json", "pick:C:\\b.json", "modules"]);
    r.is("modules_count", "1");
    r.is("module", &format!("{PLUGIN_ID}:1:0:C:\\b.json"));
}

/// A mod file for the remembering tests, by its path as MPQDraft gives it.
fn existing_mod(s: &Sandbox, name: &str) -> String {
    let f = s.0.join(name);
    std::fs::write(&f, "{}").unwrap();
    windows_path(&f)
}

#[test]
fn the_choice_is_remembered_in_the_next_session() {
    needs_tools!();
    let s = Sandbox::new("remembered");
    let appdata = format!("appdata:{}", windows_path(&s.0.join("appdata")));
    let a = existing_mod(&s, "a.json");
    release(&[&appdata, &format!("pick:{a}")]).is("configure", "1");

    let r = release(&[&appdata, "ready", "modules"]);
    r.is("ready", "1");
    r.is("module", &format!("{PLUGIN_ID}:1:0:{a}"));

    // The dialog starts on it, and cancelling leaves it remembered.
    let r = release(&[&appdata, "cancel", "ready"]);
    r.is("dialog_initial", &a);
    r.is("ready", "1");

    let b = existing_mod(&s, "b.json");
    release(&[&appdata, &format!("pick:{b}")]);
    release(&[&appdata, "modules"]).is("module", &format!("{PLUGIN_ID}:1:0:{b}"));
}

#[test]
fn a_remembered_file_that_is_gone_is_not_used() {
    needs_tools!();
    let s = Sandbox::new("remembered_gone");
    let appdata = format!("appdata:{}", windows_path(&s.0.join("appdata")));
    let a = existing_mod(&s, "a.json");
    release(&[&appdata, &format!("pick:{a}")]);
    std::fs::remove_file(s.0.join("a.json")).unwrap();

    let r = release(&[&appdata, "ready", "modules", "cancel"]);
    r.is("ready", "0");
    r.is("modules_count", "0");
    r.is("dialog_initial", "");
}

// 8.5

#[test]
fn applies_a_mod_in_initialize() {
    needs_tools!();
    let s = Sandbox::new("applies");
    let init = s.init("my mod.json", &supply_mod(600));
    let r = in_game(&[s.temp(), format!("peek:{SUPPLY_RVA}:2"), init, format!("peek:{SUPPLY_RVA}:2"), "terminate".into()]);
    assert_eq!(r.status, Some(0), "{}\n{}", r.out, r.stderr);
    r.is("server_asked", &format!("{PLUGIN_ID}:1"));
    r.is("init", "1");
    r.is("terminate", "1");
    assert!(r.get("message_box").is_none(), "{}", r.out);
    assert_eq!(r.out.lines().filter(|l| l.starts_with("peek=")).collect::<Vec<_>>(), vec!["peek=9001", "peek=5802"]);

    let log = s.log_text();
    assert!(log.contains(&format!("AxeGraft Patcher {}", env!("CARGO_PKG_VERSION"))), "{log}");
    assert!(log.contains("Game: StarCraft 1.16.1"), "{log}");
    assert!(log.contains("Loaded at: 0x00400000"), "{log}");
    assert!(log.contains("my mod.json"), "{log}");
    assert!(log.contains("90 01 -> 58 02") || log.contains("9001 -> 5802"), "{log}");
    assert!(log.contains("Applied 1 change"), "{log}");
}

#[test]
fn applies_only_once() {
    needs_tools!();
    let s = Sandbox::new("once");
    let init = s.init("m.json", &supply_mod(600));
    let r = in_game(&[s.temp(), init.clone(), init]);
    assert_eq!(r.out.matches("init=1").count(), 2, "{}", r.out);
    assert_eq!(r.out.matches("server_asked=").count(), 1, "{}", r.out);
}

#[test]
fn mod_file_in_a_folder_with_a_non_ascii_name() {
    needs_tools!();
    let s = Sandbox::new("non-ascii");
    let init = s.init("Sjöblom/m.json", &supply_mod(600));
    let r = in_game(&[s.temp(), init]);
    r.is("init", "1");
    assert!(s.log_text().contains("Sjöblom"), "{}", s.log_text());
}

#[test]
fn unsupported_version_at_launch() {
    needs_tools!();
    let s = Sandbox::new("unsupported");
    let r = exec(host(), dll(), &[s.temp(), "init:C:\\m.json".into()]);
    r.is("init", "0");
    assert!(r.message_box().contains("host.exe"), "{}", r.out);
    assert!(s.log_text().contains("not a supported version"), "{}", s.log_text());
}

#[test]
fn mod_file_that_cant_be_read() {
    needs_tools!();
    let s = Sandbox::new("unreadable");
    let r = in_game(&[s.temp(), "init:Z:\\no\\such\\mod.json".into(), format!("peek:{SUPPLY_RVA}:2")]);
    r.is("init", "0");
    r.is("peek", "9001");
    assert!(r.message_box().contains("couldn't be read"), "{}", r.out);
    assert!(r.message_box().contains("mod.json"), "{}", r.out);
}

#[test]
fn mod_file_that_cant_be_located() {
    needs_tools!();
    let s = Sandbox::new("unlocated");
    let r = in_game(&[s.temp(), "init_unlocated".into()]);
    r.is("init", "0");
    assert!(r.message_box().contains("No mod file"), "{}", r.out);
}

// 8.6

#[test]
fn invalid_mod_closes_the_game_with_the_log_first() {
    needs_tools!();
    let s = Sandbox::new("invalid");
    let init = s.init("bad.json", &supply_mod(70000));
    let r = in_game(&[s.temp(), init, format!("peek:{SUPPLY_RVA}:2")]);
    r.is("init", "0");
    r.is("peek", "9001");
    let message = r.message_box();
    assert!(message.contains("bad.json"), "{message}");
    assert!(message.contains("AxeGraftPatcher.log"), "{message}");
    // The log was complete and closed when the user was told.
    r.is("log_closed_at_box", "1");
    let log = s.log_text();
    r.is("log_bytes_at_box", &log.len().to_string());
    assert!(log.contains("Failed with 1 problem"), "{log}");
}

#[test]
fn a_panic_stays_inside_the_plugin() {
    needs_tools!();
    let s = Sandbox::new("panic");
    let init = s.init("__panic__.json", &supply_mod(600));
    let r = in_game(&[s.temp(), init, "alive".into()]);
    assert_eq!(r.status, Some(0), "{}\n{}", r.out, r.stderr);
    r.is("init", "0");
    r.is("alive", "1");
    assert!(r.message_box().contains("internal"), "{}", r.out);
    r.is("log_closed_at_box", "1");
    assert!(s.log_text().contains("injected fault"), "{}", s.log_text());
}

#[test]
fn memory_that_cant_be_written_is_a_failure() {
    needs_tools!();
    let s = Sandbox::new("write-fails");
    let init = s.init("m.json", &supply_mod(600));
    let r = in_game(&[s.temp(), "protect_fail".into(), init]);
    r.is("init", "0");
    assert!(s.log_text().contains("Plan:"), "{}", s.log_text());
    assert!(s.log_text().contains("Failed with"), "{}", s.log_text());
}

// 8.7

#[test]
fn the_log_replaces_the_previous_one() {
    needs_tools!();
    let s = Sandbox::new("replaces");
    std::fs::write(s.log(), "OLD LOG ".repeat(1000)).unwrap();
    let init = s.init("m.json", &supply_mod(600));
    in_game(&[s.temp(), init]).is("init", "1");
    assert!(!s.log_text().contains("OLD LOG"));
}

#[test]
fn the_plan_survives_a_forced_exit_while_patching() {
    needs_tools!();
    let s = Sandbox::new("forced-exit");
    let init = s.init("m.json", &supply_mod(600));
    let r = in_game(&[s.temp(), "protect_kill".into(), init]);
    assert_eq!(r.status, Some(7), "{}\n{}", r.out, r.stderr);
    let log = s.log_text();
    assert!(log.contains("Plan: 1 change"), "{log}");
    assert!(log.contains("0x00406000"), "{log}");
}

#[test]
fn an_unwritable_log_doesnt_stop_a_valid_mod() {
    needs_tools!();
    let s = Sandbox::new("no-log");
    std::fs::create_dir(s.log()).unwrap();
    let init = s.init("m.json", &supply_mod(600));
    let r = in_game(&[s.temp(), init, format!("peek:{SUPPLY_RVA}:2")]);
    r.is("init", "1");
    r.is("peek", "5802");
}

#[test]
fn errors_say_when_there_is_no_log() {
    needs_tools!();
    let s = Sandbox::new("no-log-error");
    std::fs::create_dir(s.log()).unwrap();
    let init = s.init("m.json", &supply_mod(70000));
    let r = in_game(&[s.temp(), init]);
    r.is("init", "0");
    assert!(r.message_box().contains("No log is available"), "{}", r.out);
}

// 8.8

#[test]
fn the_file_identifies_itself() {
    needs_tools!();
    let mut v = env!("CARGO_PKG_VERSION").split('.').map(|p| p.parse::<u16>().unwrap());
    let want = [v.next().unwrap(), v.next().unwrap(), v.next().unwrap(), 0];
    let bytes = std::fs::read(dll()).unwrap();
    assert_eq!(pe::identity(&bytes, Layout::File).unwrap().product_version, want);

    let r = release(&["version"]);
    r.is("ProductName", "AxeGraft Patcher");
    r.is("FileDescription", "AxeGraft Patcher, an MPQDraft plugin");
    r.is("ProductVersion", env!("CARGO_PKG_VERSION"));
}

// 8.9

/// Everything the plugin's own code may call.
const ALLOWED: &[&str] = &[
    "CommDlgExtendedError",
    "FlushInstructionCache",
    "GetCurrentProcess",
    "GetModuleFileNameW",
    "GetModuleHandleW",
    "GetOpenFileNameA",
    "MessageBoxW",
    "MultiByteToWideChar",
    "VirtualProtect",
];

const BANNED: &[&str] = &[
    "WriteProcessMemory",
    "ReadProcessMemory",
    "CreateRemoteThread",
    "CreateRemoteThreadEx",
    "OpenProcess",
    "CreateToolhelp32Snapshot",
    "Process32First",
    "Process32FirstW",
    "Process32Next",
    "Process32NextW",
    "EnumProcesses",
    "K32EnumProcesses",
    "VirtualAllocEx",
    "WinExec",
    "ShellExecuteA",
    "ShellExecuteW",
    "ShellExecuteExA",
    "ShellExecuteExW",
];

const BANNED_PREFIXES: &[&str] = &["RegOpenKey", "RegCreateKey", "RegSetValue", "RegSetKeyValue", "RegDeleteKey", "RegDeleteValue", "RegQueryValue", "CreateProcess"];

/// Banned functions that Rust's standard library and MinGW's runtime leave in
/// the import table. The plugin's own code can't reach them: `win32.rs` doesn't
/// declare them, and the import table can't be trimmed on stable Rust.
const INHERITED: &[&str] = &["CreateProcessW", "CreateToolhelp32Snapshot", "OpenProcess"];

/// The banned functions in the text of an import table, other than the
/// inherited ones.
fn banned_imports(dump: &str) -> Vec<String> {
    let imports = dump.split("The Import Tables").nth(1).unwrap_or("");
    let imports = imports.split("The Export Tables").next().unwrap_or(imports);
    let mut found: Vec<String> = imports.split_whitespace().filter(|w| !INHERITED.contains(w) && (BANNED.contains(w) || BANNED_PREFIXES.iter().any(|p| w.starts_with(p)))).map(str::to_string).collect();
    found.sort();
    found.dedup();
    found
}

/// The functions `win32.rs` declares.
fn declared(source: &str) -> Vec<String> {
    let mut names: Vec<String> = source
        .lines()
        .filter_map(|l| l.trim().strip_prefix("pub fn ").or_else(|| l.trim().strip_prefix("fn ")))
        .map(|l| l.split('(').next().unwrap().to_string())
        .collect();
    names.sort();
    names
}

#[test]
fn own_code_declares_only_allowed_functions() {
    let source = std::fs::read_to_string(manifest().join("src/win32.rs")).unwrap();
    let names = declared(&source);
    assert_eq!(names, ALLOWED, "src/win32.rs and the allowlist differ");
    let added = format!("{source}\n    pub fn WriteProcessMemory(p: HANDLE);\n");
    assert_ne!(declared(&added), ALLOWED, "an added declaration must be noticed");
}

#[test]
fn only_win32_declares_windows_functions() {
    for e in std::fs::read_dir(manifest().join("src")).unwrap() {
        let p = e.unwrap().path();
        if p.file_name().unwrap() == "win32.rs" {
            continue;
        }
        let s = std::fs::read_to_string(&p).unwrap();
        let production = s.split("#[cfg(test)]").next().unwrap();
        assert!(!production.contains("#[link("), "{} declares Windows functions", p.display());
    }
}

#[test]
fn no_banned_imports() {
    needs_tools!();
    assert_eq!(banned_imports(&objdump(dll())), Vec::<String>::new());
}

#[test]
fn a_banned_import_is_noticed() {
    let dump = "The Import Tables (interpreted .idata section contents)\n\tDLL Name: KERNEL32.dll\n\t1234 56 WriteProcessMemory\n\t1238 57 RegOpenKeyExW\n\t123c 58 Sleep\n\t1240 59 CreateProcessW\n\t1244 5a CreateProcessA\n\nThe Export Tables\n";
    assert_eq!(banned_imports(dump), vec!["CreateProcessA", "RegOpenKeyExW", "WriteProcessMemory"]);
}

// 9. End to end, through a real MPQDraft.

/// The pinned MPQDraft: the variable names its executable, or a folder
/// holding `MPQDraft.exe`.
fn mpqdraft() -> Option<PathBuf> {
    let Some(v) = std::env::var_os("AXEGRAFT_PATCHER_MPQDRAFT_DIR") else {
        eprintln!("SKIPPED: AXEGRAFT_PATCHER_MPQDRAFT_DIR isn't set");
        return None;
    };
    let p = PathBuf::from(v);
    let exe = if p.is_dir() { p.join("MPQDraft.exe") } else { p };
    assert!(exe.is_file(), "AXEGRAFT_PATCHER_MPQDRAFT_DIR doesn't lead to MPQDraft: {}", exe.display());
    Some(exe)
}

/// Compiled once: the fake game, identified as the toy StarCraft 1.16.1, and
/// a fake Storm.dll.
fn fake_game_dir() -> &'static Path {
    static DIR: OnceLock<PathBuf> = OnceLock::new();
    DIR.get_or_init(|| {
        game(); // Writes game_image.h and the version resource.
        let from = work_dir().join("game");
        let dir = work_dir().join("fake-game");
        std::fs::create_dir_all(&dir).unwrap();
        let src = manifest().join("tests/host");
        run(Command::new("i686-w64-mingw32-g++")
            .args(["-static", "-shared", "-Wall", "-o"])
            .arg(dir.join("Storm.dll"))
            .arg(src.join("fakestorm.cpp"))
            .arg(src.join("fakestorm.def"))
            .arg(format!("-Wl,--out-implib,{}", dir.join("libStorm.a").display()))
            .arg("-Wl,--image-base=0x15000000"));
        let exe = dir.join("game.exe");
        run(Command::new("i686-w64-mingw32-g++")
            .args(["-static", "-Wall", "-I"])
            .arg(&from)
            .arg(src.join("fakegame.cpp"))
            .arg(from.join("game_res.o"))
            .arg("-L")
            .arg(&dir)
            .args(["-lStorm", "-Wl,--section-start=.game=0x401000", "-Wl,--section-start=.text=0x410000", "-Wl,--disable-dynamicbase", "-o"])
            .arg(&exe));
        let lib = toy_library();
        let timestamp = lib.game(Game::StarCraft).unwrap().version(GAME_VERSION).unwrap().identity.timestamp;
        let mut bytes = std::fs::read(&exe).unwrap();
        let pe_at = u32::from_le_bytes(bytes[0x3C..0x40].try_into().unwrap()) as usize;
        bytes[pe_at + 8..pe_at + 12].copy_from_slice(&timestamp.to_le_bytes());
        std::fs::write(&exe, bytes).unwrap();
        dir
    })
}

/// One end-to-end run at a time: they share the Wine prefix's temp folder.
static E2E: Mutex<()> = Mutex::new(());

struct EndToEnd {
    dir: PathBuf,
    mpqdraft: PathBuf,
}

fn logs_in_prefix(dir: &Path, found: &mut Vec<PathBuf>) {
    let Ok(entries) = std::fs::read_dir(dir) else { return };
    for e in entries.flatten() {
        let p = e.path();
        if p.is_symlink() {
            continue;
        }
        if p.is_dir() {
            logs_in_prefix(&p, found);
        } else if p.file_name().unwrap() == "AxeGraftPatcher.log" {
            found.push(p);
        }
    }
}

fn prefix_logs() -> Vec<PathBuf> {
    let mut found = Vec::new();
    logs_in_prefix(&work_dir().join("prefix/drive_c/users"), &mut found);
    found
}

impl EndToEnd {
    fn new(name: &str) -> Option<EndToEnd> {
        if !tools() {
            return None;
        }
        let mpqdraft = mpqdraft()?;
        let dir = work_dir().join("runs").join(name);
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        for f in ["game.exe", "Storm.dll"] {
            std::fs::copy(fake_game_dir().join(f), dir.join(f)).unwrap();
        }
        std::fs::copy(fixture_dll(), dir.join("AxeGraftPatcher.qdp")).unwrap();
        for l in prefix_logs() {
            std::fs::remove_file(l).unwrap();
        }
        Some(EndToEnd { dir, mpqdraft })
    }

    fn path(&self, name: &str) -> String {
        windows_path(&self.dir.join(name))
    }

    fn write(&self, name: &str, text: &str) -> String {
        std::fs::write(self.dir.join(name), text).unwrap();
        self.path(name)
    }

    fn wine(&self, program: &Path, args: &[String], mod_file: &str) -> std::process::Output {
        let mut c = Command::new("timeout");
        c.args(["90", "wine"]).arg(program).args(args).env("AXEGRAFT_PATCHER_TEST_MOD", mod_file).env("AXEGRAFT_FAKE_REPORT", self.path("report.txt"));
        prefix(&mut c).output().expect("wine runs")
    }

    fn mpqdraft(&self, args: &[&str], mod_file: &str) -> std::process::Output {
        let args: Vec<String> = args.iter().map(|s| s.to_string()).collect();
        self.wine(&self.mpqdraft, &args, mod_file)
    }

    fn patch(&self, extra: &[&str], mod_file: &str) -> std::process::Output {
        let (target, plugin) = (self.path("game.exe"), self.path("AxeGraftPatcher.qdp"));
        let mut args = vec!["patch", "--target", &target, "--plugin", &plugin];
        args.extend_from_slice(extra);
        self.mpqdraft(&args, mod_file)
    }

    fn report(&self) -> String {
        std::fs::read_to_string(self.dir.join("report.txt")).unwrap_or_default().replace('\r', "")
    }

    fn log(&self) -> String {
        let logs = prefix_logs();
        assert_eq!(logs.len(), 1, "expected one log: {logs:?}\nreport: {}", self.report());
        std::fs::read_to_string(&logs[0]).unwrap()
    }
}

fn describe(o: &std::process::Output) -> String {
    format!("status {:?}\n{}\n{}", o.status.code(), String::from_utf8_lossy(&o.stdout), String::from_utf8_lossy(&o.stderr))
}

#[test]
fn fake_game_starts_through_mpqdraft() {
    let _one = E2E.lock().unwrap_or_else(|e| e.into_inner());
    let Some(e) = EndToEnd::new("e2e-start") else { return };
    let m = e.write("m.json", &supply_mod(400));
    let o = e.patch(&[], &m);
    assert!(e.report().contains("reached=1"), "{}\nreport: {}", describe(&o), e.report());
    assert!(e.report().contains("loaded_at=00400000"), "{}", e.report());
    assert!(!e.report().contains("box="), "{}", e.report());
}

#[test]
fn chosen_mod_applies_and_a_mod_in_a_patch_mpq_has_no_effect() {
    let _one = E2E.lock().unwrap_or_else(|e| e.into_inner());
    let Some(e) = EndToEnd::new("e2e-chosen") else { return };
    let m = e.write("m.json", &supply_mod(600));
    let mpq = e.write("patch.mpq", &format!("axegraft\\patch.json={}\n", supply_mod(500)));
    let o = e.patch(&["--mpq", &mpq], &m);
    assert!(e.report().contains("reached=1"), "{}\nreport: {}", describe(&o), e.report());
    assert!(e.report().contains("supply=5802"), "{}", e.report());
    let log = e.log();
    assert!(log.contains("Applied 1 change"), "{log}");
    assert!(log.contains("m.json"), "{log}");
    assert!(!log.contains("patch.json"), "{log}");
}

#[test]
fn invalid_mod_closes_the_game() {
    let _one = E2E.lock().unwrap_or_else(|e| e.into_inner());
    let Some(e) = EndToEnd::new("e2e-invalid") else { return };
    let m = e.write("bad.json", &supply_mod(70000));
    let o = e.patch(&[], &m);
    let report = e.report();
    assert!(!report.contains("reached=1"), "the game ran\n{}\n{report}", describe(&o));
    assert!(report.contains("box=") && report.contains("bad.json") && report.contains("AxeGraftPatcher.log"), "{}\nreport: {report}", describe(&o));
    let log = e.log();
    assert!(log.contains("Failed with 1 problem"), "{log}");
    assert!(log.contains("bad.json"), "{log}");
    assert!(!log.contains("Plan:"), "nothing should have been planned or written\n{log}");
}

#[test]
fn sempq_applies_its_mod_when_the_original_file_is_gone() {
    let _one = E2E.lock().unwrap_or_else(|e| e.into_inner());
    let Some(e) = EndToEnd::new("e2e-sempq") else { return };
    let m = e.write("m.json", &supply_mod(600));
    let (out, target, plugin) = (e.path("mod.exe"), e.path("game.exe"), e.path("AxeGraftPatcher.qdp"));
    let o = e.mpqdraft(&["sempq", "--output", &out, "--name", "Test Mod", "--plugin", &plugin, "--target", &target], &m);
    assert!(e.dir.join("mod.exe").is_file(), "{}", describe(&o));
    std::fs::remove_file(e.dir.join("m.json")).unwrap();
    let o = e.wine(&e.dir.join("mod.exe"), &[], "Z:\\the\\environment\\is\\not\\used\\here.json");
    assert!(e.report().contains("reached=1"), "{}\nreport: {}", describe(&o), e.report());
    assert!(e.report().contains("supply=5802"), "{}", e.report());
}
