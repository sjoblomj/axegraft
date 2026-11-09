# AxeGraft Patcher

An MPQDraft plugin that applies AxeGraft mods to StarCraft and Warcraft II: Battle.net Edition in memory, before any game code runs.

A mod is a JSON file describing what to change: units, button sets, requirements and constants. The plugin looks up where each of these lives in the running version, checks the whole mod, and only then writes anything. See [docs/mod-format.md](docs/mod-format.md) for the format.

## Layout

| Crate | What it holds |
| --- | --- |
| `crates/core` | The engine: mod parsing and validation, library schema and checks, planning, applying and logging. No Windows code and no `unsafe`, so it is tested natively. |
| `crates/library` | The game library: data for each supported version in `data/`, validated and compiled into static Rust by `build.rs`. Also the `check` tool. |
| `crates/plugin` | The 32-bit MPQDraft plugin, a thin layer over the other two. |

## Requirements

- Rust 1.90 or later, with the `i686-pc-windows-gnu` target (`rustup target add i686-pc-windows-gnu`)
- MinGW-w64 for 32-bit Windows (`i686-w64-mingw32-gcc`), used as the linker
- Wine, for the plugin's tests under Windows

## Building and testing

Run the tests natively:

```sh
cargo test
```

This includes tests of the real plugin DLL under Wine, which say `SKIPPED` when Wine or MinGW isn't installed. The end-to-end tests also start a fake game through a real MPQDraft, named by `AXEGRAFT_PATCHER_MPQDRAFT_DIR` as either its executable or a folder holding `MPQDraft.exe`. It's set in `.cargo/config.toml`, and a variable in the environment takes precedence.

Build the plugin:

```sh
cargo build --release --target i686-pc-windows-gnu
```

The plugin is `target/i686-pc-windows-gnu/release/AxeGraftPatcher.dll`. MPQDraft looks for plugins with the `.qdp` extension, so ship it as `AxeGraftPatcher.qdp`:

```sh
cp target/i686-pc-windows-gnu/release/AxeGraftPatcher.dll AxeGraftPatcher.qdp
```

Check that the engine has no dependencies beyond `serde` and `serde_json`:

```sh
cargo tree -p axegraft-patcher-core -e normal --depth 1
```

## The game library

The library's data, in `crates/library/data`, is generated from the Rootstock in `../rootstock`, the same data AxeGraft Editor's catalogs come from. Don't edit it by hand. Generate it again with:

```sh
python3 tools/import_rootstock.py
```

`build.rs` checks the data whenever the library is built, and fails the build if any of the library's guarantees is broken. See [docs/library-schema.md](docs/library-schema.md).

No game files are stored in this repository. To compare the library with real executables, list them in `executables.local.txt` at the repository's root, one per line, as `<game> <version> <path>`:

```text
starcraft 1.16.1 /games/StarCraft 1.16.1/StarCraft.exe
starcraft 1.17 /games/StarCraft 1.17/StarCraft.exe
warcraft2 2.02 /games/Warcraft II BNE 2.02/Warcraft II BNE.exe
```

Then run:

```sh
cargo run -p axegraft-patcher-library --bin check -- --coverage
```

It reports each version as passed, failed with every difference, or not checked when its executable isn't listed, and lists the constants that are `unknown` or `not_applicable` per version. It exits with 0 only when every version was checked and passed. The importer reads the same file, because the Warcraft II reference doesn't record an executable's PE timestamp and product version. The tests that use real executables read it too, and say they're skipped when one isn't listed.
