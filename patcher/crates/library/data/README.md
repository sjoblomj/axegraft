# Library data

The game library, read by `build.rs`. Each game has a folder named by its `game` ID (`starcraft`, `warcraft2`), holding `game.json` and one file per supported version, named by the version. See [docs/library-schema.md](../../../docs/library-schema.md).

These files are generated from the Rootstock. Don't edit them by hand: change the Rootstock, and generate them again.
