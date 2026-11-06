// String table text: the raw form and clean names.
"use strict";

(function (AG) {
  var T = AG.testing;
  var S = AG.core.tbl;

  var STIM = "t\u0004Research S\u0003t\u0001im Pack Tech\n(Marine and Firebat ability)";
  var CANCEL_SC = "\u001b\u0000\u0003ESC\u0001 - Cancel";
  var CANCEL_W2 = "\u0010\u0000\u0004ESC\u0001 - CANCEL";
  var TRAIN_W2 = "p\u0001TRAIN \u0004P\u0001EON";

  T.test("string text: the raw form writes every control byte as its number, newlines included", function () {
    T.equal(S.raw(STIM), "t<4>Research S<3>t<1>im Pack Tech<10>(Marine and Firebat ability)");
    T.equal(S.raw(CANCEL_SC), "<27><0><3>ESC<1> - Cancel");
    T.equal(S.raw("Terran Marine\u0000*\u0000Ground Units"), "Terran Marine<0>*<0>Ground Units");
    T.equal(S.raw("a < b"), "a <60> b", "a literal < can't be mistaken for a control byte");
    T.equal(S.raw("Plain"), "Plain");
    T.equal(S.raw(""), "");
  });

  T.test("string names: button strings lose their hotkey, cost type and colour codes", function () {
    T.equal(S.name(STIM), "Research Stim Pack Tech (Marine and Firebat ability)");
    T.equal(S.name("o\u0000Tank M\u0003o\u0001de"), "Tank Mode");
    T.equal(S.name(CANCEL_SC), "ESC - Cancel");
    T.equal(S.name(CANCEL_W2), "ESC - CANCEL");
    T.equal(S.name(TRAIN_W2), "TRAIN PEON");
    T.ok(S.isButton(STIM) && S.isButton(CANCEL_W2) && S.isButton(TRAIN_W2));
  });

  T.test("string names: unit names keep the name and a subname, not the map editor group", function () {
    T.equal(S.name("Terran Marine\u0000*\u0000Ground Units"), "Terran Marine");
    T.equal(S.name("Sarah Kerrigan\u0000Ghost\u0000Heroes"), "Sarah Kerrigan (Ghost)");
    T.ok(!S.isButton("Terran Marine\u0000*\u0000Ground Units"));
  });

  T.test("string names: other strings lose colour codes and become one line", function () {
    T.equal(S.name("\u0006Disabled"), "Disabled");
    T.equal(S.name("Game Menu (\u0003F10\u0001)"), "Game Menu (F10)");
    T.equal(S.name("Upgrade\nSword\nStrength 1"), "Upgrade Sword Strength 1");
    T.equal(S.name(""), "");
    T.equal(S.name("\u0001\u0002"), "", "control bytes alone have no name");
  });
})(AxeGraft);
