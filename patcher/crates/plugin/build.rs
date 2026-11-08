//! Links the version resource into the plugin.

use std::path::PathBuf;
use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    if !std::env::var("TARGET").unwrap().contains("windows") {
        return;
    }
    let version = std::env::var("CARGO_PKG_VERSION").unwrap();
    let numbers = format!("{},{},{},0", std::env::var("CARGO_PKG_VERSION_MAJOR").unwrap(), std::env::var("CARGO_PKG_VERSION_MINOR").unwrap(), std::env::var("CARGO_PKG_VERSION_PATCH").unwrap());
    let out = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    let rc = out.join("version.rc");
    let object = out.join("version.o");
    std::fs::write(
        &rc,
        format!(
            r#"1 VERSIONINFO
FILEVERSION {numbers}
PRODUCTVERSION {numbers}
FILEOS 0x40004
FILETYPE 2
BEGIN
  BLOCK "StringFileInfo"
  BEGIN
    BLOCK "040904B0"
    BEGIN
      VALUE "ProductName", "AxeGraft Patcher\0"
      VALUE "FileDescription", "AxeGraft Patcher, an MPQDraft plugin\0"
      VALUE "ProductVersion", "{version}\0"
      VALUE "FileVersion", "{version}\0"
      VALUE "OriginalFilename", "AxeGraftPatcher.qdp\0"
    END
  END
  BLOCK "VarFileInfo"
  BEGIN
    VALUE "Translation", 0x409, 1200
  END
END
"#
        ),
    )
    .unwrap();
    let status = Command::new("i686-w64-mingw32-windres").args(["-F", "pe-i386", "-O", "coff", "-o"]).arg(&object).arg(&rc).status().expect("windres runs");
    assert!(status.success(), "windres failed");
    println!("cargo:rustc-cdylib-link-arg={}", object.display());
}
