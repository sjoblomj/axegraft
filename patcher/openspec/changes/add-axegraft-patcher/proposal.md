# Proposal

## Why

Mod makers want to change what units and buildings can do in Warcraft II: Battle.net Edition and StarCraft: their buttons, status panels, requirements and game constants. These values live in the game executables, at locations that differ between versions, so each mod would otherwise need per-version knowledge. AxeGraft Patcher lets a mod state what should change as data, and works out how to apply that to the running version.

## What Changes

- Add AxeGraft Patcher, a 32-bit MPQDraft plugin written in Rust and built test-first, using MPQDraft's existing plugin interface.
- Define a versioned JSON mod format with four parts: Units, Button Sets, Requirements and Constants. A mod refers to game content by numeric ID and to engine behaviour by name, and can't contain addresses or raw bytes.
- Read one mod, from a file the user chooses in the plugin's configuration in MPQDraft.
- Add a game library, compiled into the plugin, that describes each supported version: how to identify it, where each property lives, how it's encoded and which bytes are expected there. It covers StarCraft 1.05-1.17 and Warcraft II BNE 2.00 and 2.02.
- Apply a mod in memory only, after validating everything first. A problem closes the game with an error, and nothing is half-applied. A known constant whose location is unknown or doesn't exist on the running version is skipped and logged.
- Write a plain text log of every input, change, skip and error.
- Keep the plugin's behaviour narrow and easy to explain, so it doesn't look suspicious.

This change also defines the library's data schema and includes a small starter data set. Importing the complete data from the reference documents is follow-up work, as is reading mods from `axegraft\patch.json` in patch MPQs and merging several mods, changing Warcraft II levels and victory conditions, and adding new game behaviour.

## Capabilities

### New Capabilities

- `mod-format`: The JSON mod format, and the rules that decide whether a mod is valid for a game.
- `mod-inputs`: Where the mod is read from, and the checks on it as an input.
- `game-library`: Supported games and versions, the data describing each property per version, and the guarantees that data must meet.
- `mod-application`: Turning a mod into changes for the running version, including skipping, rejecting, verifying and writing.
- `mpqdraft-integration`: How the plugin appears in MPQDraft, what it does at each point in its lifecycle, and how failures reach the user.
- `patch-logging`: The contents, location and timing of the log.
- `plugin-footprint`: Limits on what the plugin may do on the user's machine.

### Modified Capabilities

None. This is the project's first functionality.

## Impact

- **New code:** a Rust workspace in `patcher/`, targeting `i686-pc-windows-gnu`, with most logic testable natively on Linux. No code exists yet.
- **New dependencies:** `serde` and `serde_json`, plus `proptest` for tests.
- **MPQDraft:** the plugin uses MPQDraft's current plugin interface, and needs none of the changes in `~/code/MPQDraft/TODO.md`. Reading patch MPQs later will need them.
- **Reference data:** `~/axegraft/starcraft.md` and `~/Downloads/war2/w2_exe.md`. Both are still being written.
- **Users:** AxeGraft Patcher works with current MPQDraft, from its GUI and from SEMPQs. MPQDraft's CLI can't configure old-style plugins, so it can't be used there yet.
- **Platform:** the default build officially needs Windows 10 or later. Windows 7 support is best effort, and there's no real Windows machine to test on, only Wine.
