# DLX Camp Presets (add at Layer 2/3)

> Drop this in **after** the configurator + connection engine exist. Each preset loads units
> onto the plane and pre-wires connections so the demo opens on a real camp, not a blank grid.
> **Connection logic is canonical in `dlx-project-overview.md` §4.**

**Model (updated):** **shelters and HUBs are the placed nodes** in `units`. **Connectors are
edges**, not nodes — each `connection` carries a `connector` chosen by the face pair
(overview §4.4). The **Bill of Connectors** = count of HUB nodes + count of connector edges,
typed. (This replaces the old "connectors are nodes you place" model so the presets match the
render workflow's edge-based schema.)

**Coordinates:** feet, top-down. `x` = east, `y` = north, both to the unit's center.
`rotation` in degrees (0 = footprint length along x). Positions are **approximate anchors** —
the app re-snaps units to mating faces (across the connector gap) on load.

**Join types:** `native` = same-family faces, joined by that family's connector ·
`bridge` = cross-family, joined by the ASAP-to-X-Series connector.

---

## Preset 1 — "Rapid Triage Cluster" (ASAP-only · radial)
The 4-port HUB pattern. One ASAP-HUB feeds four ASAP shelters — the classic "first in, build
out" layout. All native ASAP joins; each spoke consumes one **ASAP Connector** at its HUB port.

## Preset 2 — "Decon Lane" (ASAP-only · linear · hub-free)  *(reframed)*
Three ASAP-18s in a straight staging → decon → post-decon run. **The contrast it now teaches:
linear vs. radial — a hub-free inline run.** Two inline ASAP Connectors join the three units;
no HUB is needed for a straight line. *(Originally this preset showed "zero hardware." Under
the connector-required model it carries 2× ASAP Connector. If DLX confirms ASAP butt-joins
need no part, set `asap.direct_join_allowed: true` in the rules and this returns to a true
zero-hardware run automatically — overview §4.5.)*

## Preset 3 — "Mixed Field Hospital" (cross-family · the showcase)
The full compatibility story in one camp: an X-Series ward (X-32 + X-24 via X-HUB) bridged to
an ASAP triage cluster (3× ASAP-18 via ASAP-HUB) through a single cross-family connector.
Demonstrates all three connector types at once — and produces the richest Bill of Connectors,
which is the whole point of the tool. *(Optional simplification now available: since a HUB
accepts either family on any side (verified), you could bridge straight off an X-HUB port with
one `asap-x-connector` instead of a separate ASAP-HUB — kept as two hubs here to show both.)*

---

```json
[
  {
    "id": "rapid-triage-cluster",
    "name": "Rapid Triage Cluster",
    "description": "ASAP-HUB feeding four shelters — radial, all native ASAP joins.",
    "units": [
      { "ref": "h1", "product": "asap-hub", "x": 0,   "y": 0,   "rotation": 0 },
      { "ref": "s1", "product": "asap-18",  "x": 17,  "y": 0,   "rotation": 0 },
      { "ref": "s2", "product": "asap-18",  "x": -17, "y": 0,   "rotation": 180 },
      { "ref": "s3", "product": "asap-18",  "x": 0,   "y": 17,  "rotation": 90 },
      { "ref": "s4", "product": "asap-12",  "x": 0,   "y": -14, "rotation": 270 }
    ],
    "connections": [
      { "from": "h1", "to": "s1", "join": "native", "connector": "asap-connector" },
      { "from": "h1", "to": "s2", "join": "native", "connector": "asap-connector" },
      { "from": "h1", "to": "s3", "join": "native", "connector": "asap-connector" },
      { "from": "h1", "to": "s4", "join": "native", "connector": "asap-connector" }
    ],
    "bill_of_connectors": { "asap-hub": 1, "asap-connector": 4 }
  },

  {
    "id": "decon-lane",
    "name": "Decon Lane",
    "description": "Three ASAP-18s end-to-end: staging, 2-lane decon, post-decon. Linear, hub-free; two inline ASAP Connectors.",
    "units": [
      { "ref": "s1", "product": "asap-18", "x": 0,  "y": 0, "rotation": 0 },
      { "ref": "s2", "product": "asap-18", "x": 18, "y": 0, "rotation": 0 },
      { "ref": "s3", "product": "asap-18", "x": 36, "y": 0, "rotation": 0 }
    ],
    "connections": [
      { "from": "s1", "to": "s2", "join": "native", "connector": "asap-connector" },
      { "from": "s2", "to": "s3", "join": "native", "connector": "asap-connector" }
    ],
    "bill_of_connectors": { "asap-connector": 2 }
  },

  {
    "id": "mixed-field-hospital",
    "name": "Mixed Field Hospital",
    "description": "X-Series ward (X-32 + X-24 via X-HUB) bridged to an ASAP triage cluster (3x ASAP-18 via ASAP-HUB) through one ASAP-to-X-Series connector. Shows native X, native ASAP, and cross-family bridge.",
    "units": [
      { "ref": "x1",  "product": "x-32",     "x": 0,     "y": 0,   "rotation": 0 },
      { "ref": "xh1", "product": "x-hub",    "x": 26.75, "y": 0,   "rotation": 0 },
      { "ref": "x2",  "product": "x-24",     "x": 49.5,  "y": 0,   "rotation": 0 },
      { "ref": "ah1", "product": "asap-hub", "x": -32,   "y": 0,   "rotation": 0 },
      { "ref": "a1",  "product": "asap-18",  "x": -49,   "y": 0,   "rotation": 180 },
      { "ref": "a2",  "product": "asap-18",  "x": -32,   "y": 17,  "rotation": 90 },
      { "ref": "a3",  "product": "asap-18",  "x": -32,   "y": -17, "rotation": 270 }
    ],
    "connections": [
      { "from": "x1",  "to": "xh1", "join": "native", "connector": "x-connector" },
      { "from": "xh1", "to": "x2",  "join": "native", "connector": "x-connector" },
      { "from": "x1",  "to": "ah1", "join": "bridge", "connector": "asap-x-connector" },
      { "from": "ah1", "to": "a1",  "join": "native", "connector": "asap-connector" },
      { "from": "ah1", "to": "a2",  "join": "native", "connector": "asap-connector" },
      { "from": "ah1", "to": "a3",  "join": "native", "connector": "asap-connector" }
    ],
    "bill_of_connectors": { "x-hub": 1, "asap-hub": 1, "x-connector": 2, "asap-x-connector": 1, "asap-connector": 3 }
  }
]
```

---

**Open the demo on Preset 3.** It's the one that proves the whole thesis — a planner can't
eyeball that joining those two clusters takes exactly one cross-family connector *plus* the
per-join adapters, and the Bill of Connectors spells out all of it. Presets 1 and 2 are the
"quick start" options that teach the radial and linear patterns first.

> **Note:** All three bills assume `direct_join_allowed: false` (same-family joins need a
> connector). They recompute automatically if that flag flips — don't hand-maintain them; let
> the engine derive each bill from the connections so they always match the rules.
