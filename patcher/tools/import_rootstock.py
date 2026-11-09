#!/usr/bin/env python3
"""Generates AxeGraft Patcher's library data from the Rootstock.

    python3 tools/import_rootstock.py [--rootstock DIR] [--out DIR]

The Rootstock (default: rootstock/ in the root of this repository) is the
source of everything here, as it is for AxeGraft Editor's catalogs:

- catalogs/<game>.js, which the Rootstock builds, gives each game's
  vocabulary: its limits, functions with their variables, opcodes and
  constants with their ranges, options and availability.
- data/<game>/*.json gives the tables: button sets, table entries, units,
  function addresses, the numbering of table entries across builds, constants'
  offsets, how each is stored and the bytes of each code site.
- starcraft.md and w2_exe.md give what's only in their tables: each version's
  identity, and StarCraft's section mapping, table and stream locations and
  stream references, and Warcraft II's table locations.

Every version the patcher can run on is imported: all of StarCraft's, and
Warcraft II's Battle.net Edition. Warcraft II's DOS versions aren't Windows
programs, so the patcher can't run on them. Run `cargo run -p
axegraft-patcher-library --bin check` afterwards to compare the result with
the real executables.
"""

import argparse
import datetime
import json
import os
import re
import sys

# Warcraft II's Windows versions. 1.3, 1.33 and 1.5 are DOS programs.
WARCRAFT2_VERSIONS = ["2.00", "2.02"]

BASE = 0x400000
ALL_TYPES = ["unit", "upgrade", "tech_research", "tech_use", "order"]
VARIABLES = {"unit": "unit", "tech": "tech", "upgrade": "upgrade", "order": "order", "number": "number", "tableEntry": "table_entry"}
STREAMS = {"sgTree": "unit", "sgUpgradeTree": "upgrade", "sgResearchTree": "tech_research", "sgTechUseTree": "tech_use", "sgOrderTree": "order"}


class ImportError_(Exception):
    pass


def fail(msg):
    raise ImportError_(msg)


# -- Reading the Rootstock


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_catalog(rootstock, game):
    with open(os.path.join(rootstock, "catalogs", game + ".js"), encoding="utf-8") as f:
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
    return list(value.to_bytes(width, "little", signed=signed))


def encoding_name(stored, value, width, signed):
    bits = 8 * width
    if stored == -value and value != 0:
        return "neg%d" % bits, True
    return ("i%d" % bits, True) if signed else ("u%d" % bits, False)


def stored_encoding(storage):
    """(the library's encoding, the bytes of a value) for a storage.json entry."""
    width, signed, kind = storage["width"], storage["signed"], storage["encoding"]
    bits = 8 * width
    if kind == "plain":
        return ("i%d" % bits if signed else "u%d" % bits), lambda value: encode(value, width, signed)
    if kind == "negated":
        return "neg%d" % bits, lambda value: encode(-value, width, True)
    if kind not in ("minus_one", "relative"):
        fail("unknown storage encoding %r" % kind)
    base = 1 if kind == "minus_one" else storage["base"]
    return {"offset": {"width": width, "signed": signed, "base": base}}, lambda value: encode(value - base, width, signed)


# -- StarCraft


class StarCraft:
    def __init__(self, rootstock):
        self.rootstock = rootstock
        self.d = os.path.join(rootstock, "data", "starcraft")
        with open(os.path.join(rootstock, "starcraft.md"), encoding="utf-8") as f:
            self.md = f.read()
        self.cat = load_catalog(rootstock, "starcraft")
        self.versions = [x["id"] for x in self.cat["versions"]]
        self.entries = load_json(os.path.join(self.d, "entries.json"))
        self.set_ids = load_json(os.path.join(self.d, "set_ids.json"))
        self.entry_variables = {f["name"] for fs in self.cat["functions"].values() for f in fs if f["variable"] == "tableEntry"}
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

    def span(self, text):
        """The versions of "1.05–1.07" or "1.17"."""
        if "–" not in text:
            return [text]
        a, b = text.split("–")
        return self.versions[self.versions.index(a):self.versions.index(b) + 1]

    def numbering(self, v):
        """{table entry above the units, in the game's numbering: its number on v, or None}."""
        out = {}
        for s in self.set_ids:
            out[s["id"]] = s["id"]
            for group, number in s["ids"].items():
                if v in self.span(group):
                    out[s["id"]] = number
        return out

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
        entries = self.entries
        numbers = self.numbering(v)

        def number(entry):
            return numbers.get(entry, entry)

        def here(entry, what):
            n = number(entry)
            if n is None:
                fail("starcraft %s: %s uses table entry %d, which this version lacks" % (v, what, entry))
            return n

        out_entries = {}
        for e in entries:
            n = number(e["id"])
            out_entries[str(e["id"])] = None if n is None else {"number": n, "equivalent": None if e["secondary"] is None else here(e["secondary"], "entry %d" % e["id"])}
        present = sum(1 for e in out_entries.values() if e)
        if present != entries_count:
            fail("starcraft %s: %d table entries are present, but its table has %d" % (v, present, entries_count))

        sets = {}
        for s in load_json(os.path.join(self.d, "button_sets.json")):
            sid = min(s["used_by"])
            off = s["offsets"].get(v)
            if off is None:
                sets[str(sid)] = None
                continue
            used_by = sorted(e for e in s["used_by"] if number(e) is not None)
            if sid not in used_by:
                fail("starcraft %s: set %d is present without its lowest entry" % (v, sid))

            def variable(x, field, function):
                return here(x[field], "set %d" % sid) if x[function] in self.entry_variables else x[field]

            buttons = [{
                "position": x["position"], "icon": x["icon"], "condition": x["condition"], "condition_variable": variable(x, "condition_variable", "condition"),
                "action": x["action"], "action_variable": variable(x, "action_variable", "action"), "enabled_string": x["string"], "disabled_string": x["disabled_string"],
            } for x in s["buttons"]]
            for e in used_by:
                if entries[e]["buttons"] != len(buttons):
                    fail("starcraft %s: entry %d has %d buttons, but its set has %d" % (v, e, entries[e]["buttons"], len(buttons)))
            sets[str(sid)] = {"array": self.rva(v, off), "entries": used_by, "buttons": buttons}
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
    DAMAGE_RE = re.compile(r"damage table \+0x([0-9a-fA-F]+)")
    COPIES = "5.2 Other copies of the lifetime constants"

    def rows(self, data):
        """{row name: (the row, its offset in each version or None)}, as the catalog names them."""
        rows = {}
        for r in data["rows"]:
            key = "%s / %s › %s" % (r["section"], r["group"], r["label"])
            rows[key] = (r, data["offsets"].get(r["section"], {}).get("%s › %s" % (r["group"], r["label"])))
        for c in data["copies"]:
            name = "Lifetime › " + c["copy"]
            rows["%s / %s" % (self.COPIES, name)] = (c, data["offsets"][self.COPIES][name])
        return rows

    def number_locations(self, name, v, value, row_names, rows, storage):
        locations = []
        for rn in row_names:
            r, offs = rows[rn]
            if offs is None:
                m = self.DAMAGE_RE.fullmatch(r["instruction"].replace("`", ""))
                if not m:
                    fail("starcraft: %s: %s has no offset and isn't in the damage table" % (name, rn))
                offset = hexint(self.tables[v]["Damage table"]) + hexint(m.group(1))
            elif offs[v] == "N/A":
                continue
            else:
                offset = offs[v]
            encoding, encoded = stored_encoding(storage[rn][v])
            location = {"rva": self.rva(v, offset), "encoding": encoding, "expected": encoded(value)}
            # A row can be the same place as another of the constant's rows on some builds.
            if location not in locations:
                locations.append(location)
        return locations

    def option_sites(self, name, v, row_names, rows, replacements):
        sites, changed = [], []
        for rn in row_names:
            r, offs = rows[rn]
            if offs[v] == "N/A":
                continue
            pieces = [x for x in replacements.get("%s › %s" % (r["group"], r["label"]), []) if v in x["versions"]]
            if not pieces:
                fail("starcraft %s: %s: %s has no bytes for this build" % (v, name, rn))
            for x in sorted(pieces, key=lambda x: x["at"]):
                sites.append({"rva": self.rva(v, offs[v] + x["at"]), "expected": [hexint(b) for b in x["expect"].split()]})
                changed.append([hexint(b) for b in x["write"].split()])
        return sites, changed

    def constants(self):
        data = load_json(os.path.join(self.d, "constants.json"))
        rows = self.rows(data)
        storage = load_json(os.path.join(self.d, "storage.json"))
        replacements = {}
        for x in data["replacements"]:
            replacements.setdefault(x["row"], []).append(x)
        overlay = {c["name"]: c for c in load_json(os.path.join(self.d, "catalog.json"))["constants"]}
        out = []
        for cat in self.cat["constants"]:
            name = cat["name"]
            versions = {}
            for v in self.versions:
                avail = cat["availability"][v]
                if avail in ("unknown", "not_applicable"):
                    versions[v] = avail
                elif cat["kind"] == "option":
                    sites, changed = self.option_sites(name, v, overlay[name]["rows"], rows, replacements)
                    versions[v] = {"options": {"sites": sites, "options": {"original": [s["expected"] for s in sites], "changed": changed}}}
                else:
                    versions[v] = {"locations": {"locations": self.number_locations(name, v, avail, overlay[name]["rows"], rows, storage)}}
            out.append({"name": name, "kind": self.kind(cat), "versions": versions})
        return out

    @staticmethod
    def kind(cat):
        if cat["kind"] == "option":
            names = [o["name"] for o in cat["options"]]
            return {"options": {"options": names if "original" in names else ["original"] + names}}
        return {"number": {"min": cat["range"]["min"], "max": cat["range"]["max"]}}


# -- Warcraft II


class Warcraft2:
    def __init__(self, rootstock):
        self.rootstock = rootstock
        self.d = os.path.join(rootstock, "data", "warcraft2")
        with open(os.path.join(rootstock, "w2_exe.md"), encoding="utf-8") as f:
            self.md = f.read()
        self.cat = load_catalog(rootstock, "warcraft2")
        self.columns = ["1.3", "1.33", "1.5", "2.00", "2.02"]
        self.versions = WARCRAFT2_VERSIONS
        self.identities = {r["Version"]: r for r in table_rows(md_tables(self.md, "### Version Info")[0])}

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
        row = self.identities["v" + v]
        identity = {"timestamp": hexint(row["PE timestamp"].split()[0]), "product_version": [int(x) for x in row["Fixed product version"].split(".")]}
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

    @staticmethod
    def sites(rows, v):
        """[(offset, stored value, width)] of a constant's rows on v."""
        widths = {"Byte": 1, "Word": 2, "Dword": 4}
        out = []
        for r in rows:
            if r["offsets"][v] in (None, "N/A"):
                continue
            offsets, values = r["offsets"][v], r["original"][v]
            if len(values) == 1:
                values = values * len(offsets)
            if len(offsets) != len(values):
                fail("warcraft2 %s: %s has %d offsets and %d values" % (v, r["name"], len(offsets), len(values)))
            out += [(off, stored, widths[r["type"][v]]) for off, stored in zip(offsets, values)]
        return out

    def constants(self):
        data = load_json(os.path.join(self.d, "constants.json"))
        rows = [r for table in data.values() for r in table]
        overlay = {c["name"]: c for c in load_json(os.path.join(self.d, "catalog.json"))["constants"]}
        out = []
        for cat in self.cat["constants"]:
            name = cat["name"]
            mine = [r for r in rows if r["name"] == name]
            versions = {}
            for v in self.versions:
                avail = cat["availability"][v]
                if avail in ("unknown", "not_applicable"):
                    versions[v] = avail
                    continue
                sites = self.sites(mine, v)
                if cat["kind"] == "option":
                    bytes_of = lambda value, width: encode(value, width, value < 0)
                    opts = {o["name"]: [bytes_of(o["stored"][v], w) for _, _, w in sites] for o in overlay[name]["options"]}
                    expected = [bytes_of(stored, w) for _, stored, w in sites]
                    opts.setdefault("original", expected)
                    versions[v] = {"options": {"sites": [{"rva": off, "expected": e} for (off, _, _), e in zip(sites, expected)], "options": opts}}
                    continue
                locations = []
                for off, stored, width in sites:
                    if v in overlay[name].get("original", {}):
                        locations.append({"rva": off, "encoding": {"reflected": {"width": width, "base": stored + avail}}, "expected": encode(stored, width, True)})
                        continue
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
    ap.add_argument("--rootstock", default=os.path.join(here, "..", "..", "rootstock"))
    ap.add_argument("--out", default=os.path.join(here, "..", "crates", "library", "data"))
    a = ap.parse_args()
    try:
        games = {"starcraft": StarCraft(a.rootstock), "warcraft2": Warcraft2(a.rootstock)}
        for name, g in games.items():
            write(os.path.join(a.out, name, "game.json"), g.game())
            for v in g.versions:
                write(os.path.join(a.out, name, v + ".json"), g.version(v))
                print("wrote %s %s" % (name, v))
    except ImportError_ as e:
        sys.exit("import_rootstock: " + str(e))


if __name__ == "__main__":
    main()
