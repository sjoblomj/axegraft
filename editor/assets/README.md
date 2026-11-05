# Shipped assets

This folder can hold icons and strings for each game, so the editor can show them before a user imports their own. It's optional: every feature works without it, and deleting the whole folder needs no other change.

Anything here would be Blizzard's, taken from the games' own files. They're publicly available, but that doesn't make them licensed for redistribution, which is why they're kept apart from the code. The folders now hold icons and strings taken from StarCraft 1.17 and Warcraft II: Battle.net Edition 2.02. Replacing a game's `assets.js` with `AxeGraft.registerShippedAssets({ "game": "<game>" });` and deleting its `icons/` folder ships nothing again.

Each game's folder has:

- `assets.js`, one call holding JSON, like a catalog:

  ```js
  AxeGraft.registerShippedAssets({
    "game": "starcraft",
    "icons": { "count": 390, "path": "icons/" },
    "strings": ["Terran Marine", "..."]
  });
  ```

  `strings` lists the string table, where ID 1 is the first string. Both `icons` and `strings` may be left out.

- `icons/<id>.png`, one image for each icon from 0 to `count` - 1.

Icons and strings a user imports take priority over these.
