#!/usr/bin/env python3
"""Generates AxeGraft Patcher's library data from the knowledge base.

    python3 tools/import_kb.py [--kb DIR] [--executables FILE] [--out DIR]

The knowledge base (default ~/axegraft/knowledge_base) is the source of
everything here, as it is for AxeGraft Editor's catalogs:

- catalogs/<game>.js, which the knowledge base builds, gives each game's
  vocabulary: its limits, functions with their variables, opcodes and
  constants with their ranges and options.
- data/<game>/*.json gives the tables: button sets, table entries, units,
  function addresses, constants' offsets and requirement opcodes.
- starcraft.md and w2_exe.md give what's only in their tables: StarCraft's
  identities, section mapping, table and stream locations and stream
  references, and Warcraft II's table locations.

w2_exe.md doesn't record a Warcraft II executable's PE timestamp or fixed
product version, so those two are read from the executable listed for the
version in the executables file (the same file `check` reads). Nothing else
is read from an executable.

Only the starter versions and a small set of constants are imported, as
STARTER and CONSTANTS say. Run `cargo run -p axegraft-patcher-library --bin
check` afterwards to compare the result with the real executables.
"""

import argparse
import datetime
import json
import os
import re
import struct
import sys

STARTER = {"starcraft": ["1.16.1", "1.17"], "warcraft2": ["2.02"]}

# The constants imported, chosen so that the starter versions exercise the
# encodings they actually use.
CONSTANTS = {
    "starcraft": [
        "start_building_zerg",  # u8
        "max_supply",  # u16
        "energy_regen",  # i8
        "recharge_shields_amount",  # i32. Not burn_damage: its width depends on the version, and per-version widths aren't imported yet.
        "mineral_field_reduce",  # neg8
        "permanent_cloak_energy",  # option
    ],
    "warcraft2": [
        "flame_shield_damage",  # u8
        "flame_shield_duration",  # u16
        "haste_duration",  # u16 and u32
        "slow_duration",  # neg16 and neg32
        "rune_damage",  # u16 and neg8
        "farm_food",  # option
    ],
}

BASE = 0x400000
ALL_TYPES = ["unit", "upgrade", "tech_research", "tech_use", "order"]
VARIABLES = {"unit": "unit", "tech": "tech", "upgrade": "upgrade", "order": "order", "number": "number", "tableEntry": "table_entry"}
STREAMS = {"sgTree": "unit", "sgUpgradeTree": "upgrade", "sgResearchTree": "tech_research", "sgTechUseTree": "tech_use", "sgOrderTree": "order"}


class ImportError_(Exception):
    pass


def fail(msg):
    raise ImportError_(msg)


# -- Reading the knowledge base


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_catalog(kb, game):
    with open(os.path.join(kb, "catalogs", game + ".js"), encoding="utf-8") as f:
        text = f.read()
    return json.loads(text[text.index("(") + 1:text.rindex(")")])


def md_tables(md, heading):
    """The pipe tables under a heading, up to the next heading of its level
    or above, as lists of rows of cells with backticks removed."""
    lines = md.split("\n")
    level = heading.split(" ")[0]
    try:
        start = lines.index(heading)
    except ValueError:
        fail("no heading %r" % heading)
    tables, current = [], None
    for line in lines[start + 1:]:
        if line.startswith("#") and len(line.split(" ")[0]) <= len(level):
            break
        if line.startswith("|"):
            cells = [c.strip().replace("`", "") for c in line.strip().strip("|").split("|")]
            if all(re.fullmatch(r":?-+:?", c) for c in cells):
                continue
            if current is None:
                current = []
                tables.append(current)
            current.append(cells)
        else:
            current = None
    return tables


def table_rows(table):
    """A table as dicts by header; repeated headers get the column number."""
    header = table[0]
    names = [h if header.count(h) == 1 else "%s#%d" % (h, i) for i, h in enumerate(header)]
    return [dict(zip(names, row)) for row in table[1:]]


def hexint(s):
    return int(s, 16)


# -- Executables, for Warcraft II's identities


def read_executables(path):
    out = {}
    if not path or not os.path.exists(path):
        return out
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            game, version, exe = line.split(None, 2)
            out[(game, version)] = exe
    return out


def pe_identity(path):
    """The PE timestamp and fixed product version of an executable."""
    with open(path, "rb") as f:
        b = f.read()
    pe = struct.unpack_from("<I", b, 0x3C)[0]
    ts = struct.unpack_from("<I", b, pe + 8)[0]
    i = b.find(struct.pack("<I", 0xFEEF04BD))
    if i < 0:
        fail("%s has no fixed version information" % path)
    ms, ls = struct.unpack_from("<II", b, i + 16)
    return {"timestamp": ts, "product_version": [ms >> 16, ms & 0xFFFF, ls >> 16, ls & 0xFFFF]}


# -- Shared


def vocabulary(cat):
    lim = cat["limits"]

    def rng(k):
        return {"min": lim[k]["min"], "max": lim[k]["max"]} if k in lim else None

    limits = {
        "unit": rng("unit"),
        "table_entries": lim["tableEntry"]["max"] + 1,
        "max_set_id": lim["buttonSet"]["max"],
        "tech": rng("tech"),
        "upgrade": rng("upgrade"),
        "order": rng("order"),
        "position": rng("position"),
        "icon": rng("icon"),
        "string": rng("string"),
        "condition_variable": rng("conditionVariable"),
        "action_variable": rng("actionVariable"),
    }

    def fns(key):
        return [{"name": f["name"], "variable": VARIABLES[f["variable"]] if f["variable"] else None} for f in cat["functions"][key]]

    status = [{"name": f["name"], "kind": "status_changed"} for f in cat["functions"]["statusChanged"]]
    status += [{"name": f["name"], "kind": "status_update"} for f in cat["functions"]["statusUpdate"]]
    return limits, fns("conditions"), fns("actions"), status


def resolve_shared_addresses(functions, used, where):
    """Where two names have one address, a name the version's original data
    doesn't use is absent there."""
    by_addr = {}
    for n, a in functions.items():
        if a is not None:
            by_addr.setdefault(a, []).append(n)
    for a, names in by_addr.items():
        if len(names) > 1:
            for n in names:
                if n not in used:
                    functions[n] = None
            if not any(n in used for n in names):
                fail("%s: none of %s, at %#x, is used by the original data" % (where, names, a))


def encode(value, width, signed):
    fmt = {1: "b", 2: "h", 4: "i"}[width] if signed else {1: "B", 2: "H", 4: "I"}[width]
    return list(struct.pack("<" + fmt, value))


def encoding_name(stored, value, width, signed):
    bits = 8 * width
    if stored == -value and value != 0:
        return "neg%d" % bits, True
    return ("i%d" % bits, True) if signed else ("u%d" % bits, False)


def unused_names(functions, used):
    return sorted(n for n, a in functions.items() if a is not None and n not in used)


# -- StarCraft


class StarCraft:
    def __init__(self, kb):
        self.kb = kb
        self.d = os.path.join(kb, "data", "starcraft")
        with open(os.path.join(kb, "starcraft.md"), encoding="utf-8") as f:
            self.md = f.read()
        self.cat = load_catalog(kb, "starcraft")
        self.builds = {r["Version"]: r for r in table_rows(md_tables(self.md, "### 1.1 Builds")[0])}
        self.sections = {}
        for row in md_tables(self.md, "### 1.2 Section mapping")[0][1:]:
            v = row[0]
            secs = []
            for k in range(3):
                va, file_off, delta = row[1 + 3 * k], row[2 + 3 * k], row[3 + 3 * k]
                lo, hi = [hexint(x) for x in va.split("–")]
                secs.append((lo - BASE, hi - BASE, hexint(file_off), hexint(delta)))
            self.sections[v] = secs
        self.tables = {r["Version"]: r for r in table_rows(md_tables(self.md, "### 1.3 Table locations")[0])}
        loc = md_tables(self.md, "### 4.2 Stream locations")
        self.stream_locs = {r["Version"]: r for r in table_rows(next(t for t in loc if t[0][0] == "Version"))}
        self.refs = {}
        for r in table_rows(md_tables(self.md, "### 4.3 Code that references each stream")[0]):
            self.refs[(r["Version"], r["Stream"])] = r

    def rva(self, v, file_off):
        for lo, hi, f0, delta in self.sections[v]:
            if f0 <= file_off <= f0 + (hi - lo):
                return file_off + delta
        fail("starcraft %s: file offset %#x is in no section" % (v, file_off))

    def game(self):
        limits, conditions, actions, status = vocabulary(self.cat)
        names = load_json(os.path.join(self.d, "catalog.json"))["opcodes"]
        codes = {o["symbol"]: o["code"] for o in load_json(os.path.join(self.d, "opcodes.json"))}
        code_by_name = {names[s]["name"]: codes[s] for s in names if s in codes}
        roles = {"or": "or", "level": "level", "endSublist": "end_sublist"}
        opcodes = []
        for o in self.cat["opcodes"]:
            role = roles.get(o.get("role"), "condition")
            code = 0xFFFF if role == "end_sublist" else code_by_name.get(o["name"])
            if code is None:
                fail("starcraft: no code for opcode %s" % o["name"])
            opcodes.append({"name": o["name"], "code": code, "parameter": VARIABLES[o["parameter"]] if o["parameter"] else None, "role": role, "allowed_in": o["allowedIn"]})
        return {"game": "starcraft", "limits": limits, "conditions": conditions, "actions": actions, "status_functions": status, "opcodes": opcodes, "constants": self.constants()}

    def version(self, v):
        b = self.builds[v]
        when = datetime.datetime.strptime(b["PE timestamp"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=datetime.timezone.utc)
        identity = {"timestamp": int(when.timestamp()), "product_version": [int(x) for x in b["Fixed product version"].split(".")]}
        t = self.tables[v]
        entries_count = int(t["Entries"])
        if entries_count != 250:
            fail("starcraft %s: only versions with the 1.12 numbering are imported so far" % v)
        entries = load_json(os.path.join(self.d, "entries.json"))
        sets_data = load_json(os.path.join(self.d, "button_sets.json"))

        out_entries = {str(e["id"]): {"number": e["id"], "equivalent": e["secondary"]} for e in entries}
        sets = {}
        for s in sets_data:
            sid = min(s["used_by"])
            off = s["offsets"].get(v)
            if off is None:
                sets[str(sid)] = None
                continue
            buttons = [{
                "position": x["position"], "icon": x["icon"], "condition": x["condition"], "condition_variable": x["condition_variable"],
                "action": x["action"], "action_variable": x["action_variable"], "enabled_string": x["string"], "disabled_string": x["disabled_string"],
            } for x in s["buttons"]]
            for e in s["used_by"]:
                if entries[e]["buttons"] != len(buttons):
                    fail("starcraft %s: entry %d has %d buttons, but its set has %d" % (v, e, entries[e]["buttons"], len(buttons)))
            sets[str(sid)] = {"array": self.rva(v, off), "entries": sorted(s["used_by"]), "buttons": buttons}
        units = [{"status_changed": e["status_changed"], "status_update": e["status_update"], "status_unit_type": e["status_unit_type"]} for e in entries[:228]]

        functions = {}
        for group in ("conditions", "actions", "status_changed", "status_update"):
            for f in load_json(os.path.join(self.d, "functions.json"))[group]:
                va = f["va"].get(v)
                functions[f["name"]] = hexint(va) - BASE if va else None
        used = {x[k] for s in sets.values() if s for x in s["buttons"] for k in ("condition", "action")}
        used |= {u[k] for u in units for k in ("status_changed", "status_update")}
        resolve_shared_addresses(functions, used, "starcraft " + v)

        streams = {}
        locs = self.stream_locs[v]
        for sym, kind in STREAMS.items():
            start, end = [hexint(x) for x in locs[sym].split("–")]
            ref = self.refs[(v, sym)]
            rva = self.rva(v, start)
            if hexint(ref["Base VA"]) != BASE + rva:
                fail("starcraft %s: %s is at %#x by its file offset, but %s by its references" % (v, sym, BASE + rva, ref["Base VA"]))
            streams[kind] = {
                "rva": rva,
                "length": end - start,
                "base_refs": [self.rva(v, hexint(x)) for x in ref["Refs to base VA"].split()],
                "plus2_refs": [self.rva(v, hexint(x)) for x in ref["Refs to base VA + 2"].split()],
            }
        return {
            "id": v, "identity": identity,
            "button_table": {"rva": self.rva(v, hexint(t["gCards"])), "entries": entries_count, "card": "starcraft", "button": "starcraft"},
            "status_table": {"rva": self.rva(v, hexint(t["gTypeFcns"])), "layout": "starcraft"},
            "entries": out_entries, "sets": sets, "units": units, "functions": functions, "streams": streams,
        }

    VALUE_RE = re.compile(r"(-?\d+)( \(signed\))?(?: \((-?\d+) in (\S+)\))?(?: = `?(\w+)`?)?")

    def constants(self):
        data = load_json(os.path.join(self.d, "constants.json"))
        rows = {}
        for r in data["rows"]:
            key = "%s / %s › %s" % (r["section"], r["group"], r["label"])
            rows[key] = (r, data["offsets"].get(r["section"], {}).get("%s › %s" % (r["group"], r["label"])))
        overlay = {c["name"]: c for c in load_json(os.path.join(self.d, "catalog.json"))["constants"]}
        out = []
        for name in CONSTANTS["starcraft"]:
            cat = next(c for c in self.cat["constants"] if c["name"] == name)
            kind, versions = self.kind(cat), {}
            for v in STARTER["starcraft"]:
                avail = cat["availability"][v]
                if avail in ("unknown", "not_applicable"):
                    versions[v] = avail
                    continue
                if cat["kind"] == "option":
                    sites, changed = [], []
                    for rn in overlay[name]["rows"]:
                        r, offs = rows[rn]
                        orig = [hexint(x) for x in r["bytes"].replace("`", "").split()]
                        new = re.fullmatch(r"→ ((?:[0-9a-fA-F]{2} ?)+)(?: \(\w+\))?", r["value"].replace("`", ""))
                        if not new:
                            fail("starcraft: %s: can't read the change %r" % (name, r["value"]))
                        patch = [hexint(x) for x in new.group(1).split()]
                        sites.append({"rva": self.rva(v, offs[v]), "expected": orig})
                        changed.append(patch + orig[len(patch):])
                    versions[v] = {"options": {"sites": sites, "options": {"original": [s["expected"] for s in sites], "changed": changed}}}
                    continue
                locations = []
                for rn in overlay[name]["rows"]:
                    r, offs = rows[rn]
                    m = self.VALUE_RE.fullmatch(r["value"])
                    if not m:
                        fail("starcraft: %s: can't read the value %r" % (name, r["value"]))
                    stored, signed = int(m.group(1)), bool(m.group(2))
                    if m.group(3) is not None:
                        fail("starcraft: %s: values that differ between versions aren't imported yet" % name)
                    width = int(r["len"])
                    enc, signed = encoding_name(stored, avail, width, signed)
                    if abs(stored) != avail:
                        fail("starcraft %s: %s's row stores %d, not %d" % (v, name, stored, avail))
                    locations.append({"rva": self.rva(v, offs[v]), "encoding": enc, "expected": encode(stored, width, signed)})
                versions[v] = {"locations": {"locations": locations}}
            out.append({"name": name, "kind": kind, "versions": versions})
        return out

    @staticmethod
    def kind(cat):
        if cat["kind"] == "option":
            names = [o["name"] for o in cat["options"]]
            return {"options": {"options": names if "original" in names else ["original"] + names}}
        return {"number": {"min": cat["range"]["min"], "max": cat["range"]["max"]}}


# -- Warcraft II


class Warcraft2:
    def __init__(self, kb, executables):
        self.kb = kb
        self.exes = executables
        self.d = os.path.join(kb, "data", "warcraft2")
        with open(os.path.join(kb, "w2_exe.md"), encoding="utf-8") as f:
            self.md = f.read()
        self.cat = load_catalog(kb, "warcraft2")
        self.columns = ["1.3", "1.33", "1.5", "2.00", "2.02"]

    def offset(self, heading, v):
        row = md_tables(self.md, heading)[0][1]
        return int(row[self.columns.index(v)])

    def game(self):
        limits, conditions, actions, status = vocabulary(self.cat)
        return {"game": "warcraft2", "limits": limits, "conditions": conditions, "actions": actions, "status_functions": status, "opcodes": [], "constants": self.constants()}

    @staticmethod
    def versioned_buttons(cl, v):
        """The document's list is the DOS one; 2.00 and 2.02 apply bne_changes."""
        buttons = [dict(b) for b in cl["buttons"]]
        if v in ("2.00", "2.02"):
            for c in cl["bne_changes"]:
                if c["op"] == "insert":
                    buttons.insert(c["n"], dict(c["button"]))
            for c in cl["bne_changes"]:
                if c["op"] == "set":
                    buttons[c["n"]][c["field"]] = c["value"]
        return buttons

    def version(self, v):
        exe = self.exes.get(("warcraft2", v))
        if not exe:
            fail("warcraft2 %s: w2_exe.md has no PE timestamp or product version, so list its executable in the executables file" % v)
        identity = pe_identity(exe)
        sets = {}
        for cl in load_json(os.path.join(self.d, "command_lists.json")):
            sid = min(cl["used_by"])
            off = cl["offsets"].get(v)
            if off in (None, "N/A"):
                sets[str(sid)] = None
                continue
            buttons = [{
                "position": b["pos"], "icon": b["icon"], "condition": b["req"], "condition_variable": b["req_var"],
                "action": b["act"], "action_variable": b["act_var"], "string": b["string"], "highlighted": b["order"],
            } for b in self.versioned_buttons(cl, v)]
            sets[str(sid)] = {"array": off, "entries": sorted(cl["used_by"]), "buttons": buttons}
        units = [{"status_changed": u["status_changed"], "status_update": u["status_update"], "icon": u["icon"], "stats_frame": u["stats_frame"], "name_string": u["name_string"]}
                 for u in load_json(os.path.join(self.d, "units.json"))[:110]]
        functions = {}
        fdata = load_json(os.path.join(self.d, "functions.json"))
        for group in ("conditions", "actions", "status_changed", "status_update"):
            for f in fdata[group]:
                off = f["offsets"].get(v)
                functions[f["name"]] = None if off in (None, "N/A") else off
        used = {x[k] for s in sets.values() if s for x in s["buttons"] for k in ("condition", "action")}
        used |= {u[k] for u in units for k in ("status_changed", "status_update")}
        resolve_shared_addresses(functions, used, "warcraft2 " + v)
        return {
            "id": v, "identity": identity,
            "button_table": {"rva": self.offset("### Command Lists", v), "entries": 120, "card": "warcraft2_bne", "button": "warcraft2_bne"},
            "status_table": {"rva": self.offset("### Unit Data", v), "layout": "warcraft2_bne"},
            "entries": {str(i): {"number": i, "equivalent": None} for i in range(120)},
            "sets": sets, "units": units, "functions": functions,
        }

    def constants(self):
        data = load_json(os.path.join(self.d, "constants.json"))
        rows = [r for table in data.values() for r in table]
        overlay = {c["name"]: c for c in load_json(os.path.join(self.d, "catalog.json"))["constants"]}
        widths = {"Byte": 1, "Word": 2, "Dword": 4}
        out = []
        for name in CONSTANTS["warcraft2"]:
            cat = next(c for c in self.cat["constants"] if c["name"] == name)
            mine = [r for r in rows if r["name"] == name]
            versions = {}
            for v in STARTER["warcraft2"]:
                avail = cat["availability"][v]
                if avail in ("unknown", "not_applicable"):
                    versions[v] = avail
                    continue
                if cat["kind"] == "option":
                    if len(mine) != 1 or len(mine[0]["offsets"][v]) != 1 or widths[mine[0]["type"][v]] != 1:
                        fail("warcraft2: %s: only one-byte option sites are imported" % name)
                    r = mine[0]
                    orig = r["original"][v][0]
                    opts = {o["name"]: [[o["stored"][v]]] for o in overlay[name]["options"]}
                    opts.setdefault("original", [[orig]])
                    versions[v] = {"options": {"sites": [{"rva": r["offsets"][v][0], "expected": [orig]}], "options": opts}}
                    continue
                locations = []
                for r in mine:
                    width = widths[r["type"][v]]
                    for off, stored in zip(r["offsets"][v], r["original"][v]):
                        if abs(stored) != avail:
                            fail("warcraft2 %s: %s stores %d at %d, not %d" % (v, name, stored, off, avail))
                        enc, signed = encoding_name(stored, avail, width, stored < 0)
                        locations.append({"rva": off, "encoding": enc, "expected": encode(stored, width, signed)})
                versions[v] = {"locations": {"locations": locations}}
            out.append({"name": name, "kind": StarCraft.kind(cat), "versions": versions})
        return out


# -- Writing


def write(path, value):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(value, f, indent=1, ensure_ascii=False)
        f.write("\n")


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--kb", default=os.path.expanduser("~/axegraft/knowledge_base"))
    ap.add_argument("--executables", default=os.environ.get("AXEGRAFT_PATCHER_EXECUTABLES", os.path.join(here, "..", "executables.local.txt")))
    ap.add_argument("--out", default=os.path.join(here, "..", "crates", "library", "data"))
    a = ap.parse_args()
    try:
        games = {"starcraft": StarCraft(a.kb), "warcraft2": Warcraft2(a.kb, read_executables(a.executables))}
        for name, g in games.items():
            write(os.path.join(a.out, name, "game.json"), g.game())
            for v in STARTER[name]:
                write(os.path.join(a.out, name, v + ".json"), g.version(v))
                print("wrote %s %s" % (name, v))
    except ImportError_ as e:
        sys.exit("import_kb: " + str(e))


if __name__ == "__main__":
    main()
