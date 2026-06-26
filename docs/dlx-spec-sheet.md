# DLX Spec Sheet & Compatibility Data

> Data source for both workstreams. The JSON arrays at the bottom are what the app loads.
> **Connection rules live in `dlx-project-overview.md` §4 (canonical).** This sheet carries the
> *dimensions and the data array*; where connection logic is restated here it mirrors §4.

**Confidence legend:** ✅ = verified from deployedlogix.com · ≈ = estimated (demo placeholder, confirm with DLX)

Only **ASAP-18** and **X-32** are fully site-verified. ASAP-12 and ASAP-24 footprints/areas are
verified; their weights and setup figures are estimated. All X-16/24/40 figures except the
family width are estimated by scaling from X-32. **Connector *products* are now verified
(Jun 2026); connector *dimensions* remain estimated.**

---

## Shelters

| Model | Family | Footprint L×W (ft) | Height (ft) | Area (ft²) | Weight (lb) | Mating face (ft) | Crew | Setup (canopy/full, min) |
|---|---|---|---|---|---|---|---|---|
| ASAP-12 | ASAP | 12 × 16 ✅ | 8 ≈ | 192 ✅ | 161 ≈ | 16 | 2 ≈ | 1 / 8 ≈ |
| ASAP-18 | ASAP | 18 × 16 ✅ | 8 ✅ | 288 ✅ | 241 ✅ | 16 | 2 ✅ | 1 / 10 ✅ |
| ASAP-24 | ASAP | 24 × 16 ≈ | 8 ≈ | 384 ≈ | 321 ≈ | 16 | 2 ≈ | 1 / 12 ≈ |
| X-16 | X-Series | 16 × 21.5 ≈ | 10.25 ≈ | 344 ≈ | 417 ≈ | 21.5 | 3 ≈ | 10 / 20 ≈ |
| X-24 | X-Series | 24 × 21.5 ≈ | 10.25 ≈ | 516 ≈ | 626 ≈ | 21.5 | 4 ≈ | 12 / 25 ≈ |
| X-32 | X-Series | 32 × 21.5 ✅ | 10.25 ✅ | 688 ✅ | 834 ✅ | 21.5 | 5 ✅ | 15 / 30 ✅ |
| X-40 | X-Series | 40 × 21.5 ≈ | 10.25 ≈ | 860 ≈ | 1043 ≈ | 21.5 | 5 ≈ | 18 / 35 ≈ |

All shelters: operating range **-40 to 130 °F** ✅, exterior **Grade A MIL-PRF-4410 blackout vinyl, NFPA, fire/mold resistant** ✅. X-Series setup is tool-free ✅.

## Connectors (the compatibility hardware)

> Reconciled with the DLX product line (Jun 2026). Three connectors now model **every** join;
> the two same-family connectors are new vs. the original sheet. See overview §4.2.

| Item | id | Role | Joins | Footprint (ft) | Status |
|---|---|---|---|---|---|
| **X-Series Connector** | `x-connector` | Spanning connector for two X-Series faces | X ↔ X | short tunnel ≈ | ✅ product verified, dims ≈ |
| **ASAP-to-X-Series Connector** | `asap-x-connector` | Cross-family bridge (16 ↔ 21.5) | ASAP ↔ X | short tunnel ≈ | ✅ product verified, dims ≈ |
| **ASAP Connector** | `asap-connector` | Spanning connector for two ASAP faces | ASAP ↔ ASAP | short tunnel ≈ | ⚠️ assumed, confirm with DLX |
| **ASAP-HUB®** | `asap-hub` | Square 4-port junction; standalone-capable | any family, per port | 16 × 16 ≈ | dims ≈ |
| **X-HUB** | `x-hub` | Square 4-port junction; standalone-capable | any family, per port | 21.5 × 21.5 ≈ | dims ≈ |

## Connection rules (plain language — mirrors overview §4)
- Every physical join is a **dedicated connector product spanning a gap**, hook-and-loop
  attached (no shelter drop / no added framing — ✅ verified). No faked flush butt seams.
- Two **ASAP** faces join via an **ASAP Connector**; two **X-Series** faces via an **X-Series
  Connector**; an **ASAP** and an **X-Series** face via the **ASAP-to-X-Series Connector**.
- A **HUB** exposes **4 ports and accepts either family on any side** (✅ verified). Each used
  port consumes the connector for that face pair (same-family or `asap-x-connector`).
- **Toggle:** if DLX confirms a family can butt-join directly with no part, set that family's
  `direct_join_allowed: true` (overview §4.5) and direct runs stop emitting a connector.

---

## JSON data array — shelters & hubs (app loads this)

```json
[
  { "id": "asap-12", "name": "ASAP-12", "family": "asap", "category": "shelter",
    "footprint_ft": [12, 16], "height_ft": 8, "area_ft2": 192, "weight_lb": 161,
    "mating_face_ft": 16, "self_connector": "asap-connector", "cross_connector": "asap-x-connector",
    "setup_personnel": 2, "setup_min_canopy": 1, "setup_min_full": 8,
    "operating_range_f": [-40, 130], "confidence": "partial" },

  { "id": "asap-18", "name": "ASAP-18", "family": "asap", "category": "shelter",
    "footprint_ft": [18, 16], "height_ft": 8, "area_ft2": 288, "weight_lb": 241,
    "mating_face_ft": 16, "self_connector": "asap-connector", "cross_connector": "asap-x-connector",
    "setup_personnel": 2, "setup_min_canopy": 1, "setup_min_full": 10,
    "operating_range_f": [-40, 130], "confidence": "verified" },

  { "id": "asap-24", "name": "ASAP-24", "family": "asap", "category": "shelter",
    "footprint_ft": [24, 16], "height_ft": 8, "area_ft2": 384, "weight_lb": 321,
    "mating_face_ft": 16, "self_connector": "asap-connector", "cross_connector": "asap-x-connector",
    "setup_personnel": 2, "setup_min_canopy": 1, "setup_min_full": 12,
    "operating_range_f": [-40, 130], "confidence": "estimated" },

  { "id": "x-16", "name": "X-16", "family": "x-series", "category": "shelter",
    "footprint_ft": [16, 21.5], "height_ft": 10.25, "area_ft2": 344, "weight_lb": 417,
    "mating_face_ft": 21.5, "self_connector": "x-connector", "cross_connector": "asap-x-connector",
    "setup_personnel": 3, "setup_min_canopy": 10, "setup_min_full": 20,
    "operating_range_f": [-40, 130], "confidence": "estimated" },

  { "id": "x-24", "name": "X-24", "family": "x-series", "category": "shelter",
    "footprint_ft": [24, 21.5], "height_ft": 10.25, "area_ft2": 516, "weight_lb": 626,
    "mating_face_ft": 21.5, "self_connector": "x-connector", "cross_connector": "asap-x-connector",
    "setup_personnel": 4, "setup_min_canopy": 12, "setup_min_full": 25,
    "operating_range_f": [-40, 130], "confidence": "estimated" },

  { "id": "x-32", "name": "X-32", "family": "x-series", "category": "shelter",
    "footprint_ft": [32, 21.5], "height_ft": 10.25, "area_ft2": 688, "weight_lb": 834,
    "mating_face_ft": 21.5, "self_connector": "x-connector", "cross_connector": "asap-x-connector",
    "setup_personnel": 5, "setup_min_canopy": 15, "setup_min_full": 30,
    "operating_range_f": [-40, 130], "confidence": "verified" },

  { "id": "x-40", "name": "X-40", "family": "x-series", "category": "shelter",
    "footprint_ft": [40, 21.5], "height_ft": 10.25, "area_ft2": 860, "weight_lb": 1043,
    "mating_face_ft": 21.5, "self_connector": "x-connector", "cross_connector": "asap-x-connector",
    "setup_personnel": 5, "setup_min_canopy": 18, "setup_min_full": 35,
    "operating_range_f": [-40, 130], "confidence": "estimated" },

  { "id": "asap-hub", "name": "ASAP-HUB", "family": "asap", "category": "hub",
    "footprint_ft": [16, 16], "height_ft": 8, "ports": 4, "port_face_ft": 16,
    "accepts_family": ["asap", "x-series"], "standalone": true, "confidence": "partial",
    "_note": "accepts_family corrected to both families (verified DLX, Jun 2026); footprint still estimated" },

  { "id": "x-hub", "name": "X-HUB", "family": "x-series", "category": "hub",
    "footprint_ft": [21.5, 21.5], "height_ft": 10.25, "ports": 4, "port_face_ft": 21.5,
    "accepts_family": ["asap", "x-series"], "standalone": true, "confidence": "partial",
    "_note": "accepts_family corrected to both families (verified DLX, Jun 2026); footprint still estimated" }
]
```

## JSON data array — connectors (computed per join, not placed as nodes)

```json
[
  { "id": "asap-connector", "name": "ASAP Connector", "category": "connector",
    "joins": ["asap", "asap"], "render_type": "asap",
    "signature": "welded V-gutter + floor strip", "confidence": "estimated",
    "_note": "Product not confirmed by name on DLX site — see overview verify-list #1" },

  { "id": "x-connector", "name": "X-Series Connector", "category": "connector",
    "joins": ["x-series", "x-series"], "render_type": "xseries", "config": ["open", "door"],
    "signature": "rain fly + trip guard", "confidence": "verified" },

  { "id": "asap-x-connector", "name": "ASAP-to-X-Series Connector", "category": "connector",
    "aliases": ["shelter-connector"], "joins": ["asap", "x-series"], "render_type": "asap-x",
    "bridge_faces_ft": [16, 21.5], "signature": "outer awnings absorbing 16<->21.5 mismatch",
    "attach": "hook-and-loop, no shelter drop / no added framing", "confidence": "verified" }
]
```

## Compatibility rules (machine-readable — canonical copy in overview §4.5)

```json
{
  "join_model": "gap+spanning-connector",
  "families": {
    "asap":     { "mating_face_ft": 16,   "self_connector": "asap-connector", "direct_join_allowed": false },
    "x-series": { "mating_face_ft": 21.5, "self_connector": "x-connector",    "direct_join_allowed": false }
  },
  "cross_family_connector": "asap-x-connector",
  "hub": { "ports": 4, "accepts_family": ["asap", "x-series"], "standalone": true },
  "rule": "Equal mating faces -> that family's self_connector. Unequal -> asap-x-connector. Every join consumes one connector unless direct_join_allowed is true for that family."
}
```
