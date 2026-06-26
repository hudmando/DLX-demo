# DLX Field Planner — Project Overview & Integration Map

> **Read this first.** This is the master document for the DLX project. It defines how every
> other doc fits together, the conventions they all share, and the **single canonical
> connection model** that both workstreams build against. Where any other doc disagrees with
> this one on the connection model or units, **this doc wins.**

---

## 1. The two workstreams

The project is **two deliverables that share one data model**, not one tool. Keeping them
separate is deliberate — they answer different questions and have opposite visual targets.

| | **Field Planner** (schematic) | **Render Workflow** (photoreal) |
|---|---|---|
| **Question it answers** | *What connects to what, and what hardware does that take?* | *What does a given camp actually look like?* |
| **Visual target** | Tactical CAD / blueprint — extruded footprints, dimension callouts, color-coded by family | ~90–94% photoreal "studio look" — canvas weave, daylight rig, ballast bags |
| **Primary doc** | `dlx-field-planner-brief.txt` | `dlx-render-workflow.md` |
| **Core feature** | Connection-validation engine → **Bill of Connectors** | Procedural Three.js geometry from a reference photo |
| **Interaction** | Drag/snap/validate, top-down first | Authored declarative layout, orbit camera |

They meet at the **data model** (§3) and the **connection model** (§4): the Planner *enforces*
the connection rules; the Render Workflow *draws* the connectors those rules require. Same
truth, two surfaces.

---

## 2. Document map — who owns what

| Document | Role | Source of truth for |
|---|---|---|
| **`dlx-project-overview.md`** (this) | Master / glue | Units, the connection model, reconciliation decisions, the DLX verify checklist |
| `dlx-field-planner-brief.txt` | Schematic-planner spec | Planner UX, the 3-layer build order, visual direction |
| `dlx-spec-sheet.md` | Data | Shelter & connector dimensions, the JSON the app loads, confidence flags |
| `dlx-camp-presets.md` | Demo data | The three preset camp layouts + their Bills of Connectors |
| `dlx-render-workflow.md` | Render method | Photoreal geometry-by-construction, materials, connector anatomy |

> **Note on the brief:** `dlx-field-planner-brief.txt` is current as the schematic-planner
> spec, **except** its plain-language compatibility matrix, which is superseded by §4 below
> (the brief predates the same-family-connector decision and the verified HUB behavior). Treat
> §4 here as authoritative and the brief's matrix as illustrative. Flag if you want the brief
> regenerated to match.

---

## 3. Shared conventions (both workstreams)

- **Units: FEET, everywhere.** The data is in feet; the planner displays feet (with a ft/m
  display toggle); the render workflow authors geometry in feet. **1 world unit = 1 ft.**
  (The render doc was originally metric — it has been converted; see its header.)
- **Coordinates:** top-down, feet. `x` = east, `y`/`z` = north, measured to a unit's center.
  `rotation` in degrees, `0` = footprint length along x.
- **No backend, no asset files.** Client-side JSON for data; procedural Three.js geometry.
- **Confidence is data.** Every record carries a `confidence` flag. ~70% of specs are still
  estimated — see §6.

---

## 4. The canonical connection model  ⚙️ *(single source of truth)*

Both workstreams reason about connections the same way. This supersedes the connection
sections of every other doc.

### 4.1 Core principle — every join is a connector product

DLX shelters are **not** docked by overlapping them. They sit at a small **gap** and a
**dedicated connector product spans it**, attached by **hook & loop** (no shelter drop, no
added framing — verified against deployedlogix.com, Jun 2026). This is true even for
same-family joins. The connector is its own object/SKU, never a faked flush butt seam.

### 4.2 Connector roster

| Connector | id | Joins | Status | Render signature (render doc §7.4) |
|---|---|---|---|---|
| **X-Series Connector** | `x-connector` | X ↔ X | ✅ verified real DLX product | rain fly + trip guard; `open`/`door` config |
| **ASAP-to-X-Series Connector** | `asap-x-connector` | ASAP ↔ X | ✅ verified real DLX product (was "Shelter Connector") | outer awnings absorbing the 16↔21.5 ft mismatch |
| **ASAP Connector** | `asap-connector` | ASAP ↔ ASAP | ⚠️ **assumed** — not confirmed by name on DLX site | welded V-gutter + floor strip |

> `asap-x-connector` is the same part the spec sheet and presets previously called
> `shelter-connector`. The id was renamed to match the actual DLX product name. Keep
> `shelter-connector` as an accepted alias in the loader if convenient.

### 4.3 The HUB — corrected & verified

ASAP-HUB and X-HUB are **complete square shelters with four connectable faces** that can also
stand alone. **Verified correction:** a HUB connects to **any DLX shelter — ASAP *or*
X-Series — on any of its four sides** (deployedlogix.com, Jun 2026). The spec sheet's old
`accepts_family: ["asap"]` / `["x-series"]` was **wrong** and has been fixed to accept both.

A HUB port seats a face using the connector for that face pair:
- same-family face → that family's connector (`asap-connector` / `x-connector`)
- cross-family face → `asap-x-connector`

This makes the HUB a true family-agnostic junction and is *good news* for the validation
engine: a single X-HUB can anchor a mixed cluster, and the engine surfaces the right adapter
per port.

### 4.4 Selection rule (what the engine enforces)

```
For each adjacency (faceA, faceB):
  if both faces are HUB-or-shelter of the SAME family   -> family connector
  if the two faces are DIFFERENT families (16 vs 21.5)  -> asap-x-connector
A HUB exposes 4 such ports. Count every connector. Count every HUB node.
Bill of Connectors = {HUB nodes} + {connector edges, typed by face pair}.
```

### 4.5 Machine-readable rules (app loads this)

```json
{
  "join_model": "gap+spanning-connector",
  "families": {
    "asap":     { "mating_face_ft": 16,   "self_connector": "asap-connector", "direct_join_allowed": false },
    "x-series": { "mating_face_ft": 21.5, "self_connector": "x-connector",    "direct_join_allowed": false }
  },
  "cross_family_connector": "asap-x-connector",
  "hub": { "ports": 4, "accepts_family": ["asap", "x-series"], "standalone": true },
  "rule": "Equal mating faces -> that family's self_connector. Unequal -> asap-x-connector. Every join consumes one connector."
}
```

> **The `direct_join_allowed` flag is the toggle.** It defaults to `false` (every same-family
> join needs a connector — the photo-to-3d position). If DLX confirms ASAP or X shelters can
> butt-join directly with no part, flip that family's flag to `true` and the engine stops
> emitting `asap-connector` / `x-connector` for direct runs — **no other code changes.** This
> is how we absorb the single biggest open question (§6, item 1) without committing to it.

---

## 5. Reconciliation decision log

The conflicts between the original docs and how each was resolved. Rule applied: **default to
the photo-to-3d (render) doc, except units → feet.**

| Conflict | Field Planner docs said | Render doc said | **Decision** |
|---|---|---|---|
| **Units** | feet | meters | **Feet** (the one exception — render doc converted) |
| **Aesthetic** | schematic only | photoreal only | **Both** — two workstreams, not a conflict |
| **Same-family join** | direct, no hardware | dedicated connector | **Connector required** (render doc) — and *verified* for X↔X; assumed for ASAP↔ASAP, behind the toggle |
| **Connection representation** | abstract graph edge | physical connector anatomy | **Physical** model is canonical; planner still renders it schematically |
| **HUB family scope** | same-family only | (n/a) | **Any family** — verified correction from DLX, overrides both |
| **Scope (trailers/containers/ISU)** | out of scope | in scope | **In scope** for the render workflow; still deferred for the planner v1 |
| **Connector = node vs edge** | node (presets) | edge (render schema) | **Edge** — connectors are computed per join; only shelters & HUBs are placed nodes |

### ⚠️ Downstream impact you should know about

- **"Decon Lane" preset lost its original thesis.** It existed to show the engine *doesn't*
  force hardware when faces already mate. Under the connector-required model it now needs
  2× `asap-connector`. The preset has been **reframed** (presets doc) to demonstrate
  *linear vs. radial topology — a hub-free inline run* instead. If you flip
  `asap.direct_join_allowed = true`, the original "zero hardware" version returns automatically.
- **Every Bill of Connectors grew.** More SKUs per camp. This is arguably a *feature* — the
  Bill of Connectors is the money output, and it now surfaces the per-join adapters a buyer
  genuinely can't infer from product pages. Presets updated accordingly.

---

## 6. Consolidated DLX verification checklist

The project's central risk is that ~70% of specs are estimated. This is the one list to take
to DLX. Ordered by impact on the validation engine (the part users trust least if it's wrong).

| # | Item | Current state | Why it matters |
|---|---|---|---|
| 1 | **Does ASAP↔ASAP need a connector, or do they butt-join directly?** | Assumed connector (`direct_join_allowed:false`) | Flips a whole class of Bills of Connectors; controlled by one flag |
| 2 | **X-Series Connector** — open vs door configs, gap distance, dimensions | Product ✅ confirmed; dims estimated | Drives render geometry + any footprint math |
| 3 | **ASAP-to-X-Series Connector** dimensions (the 16↔21.5 bridge) | Product ✅ confirmed; dims estimated | The cross-family showcase; needs real tunnel size |
| 4 | **HUB footprints + port face sizes** | Cross-family behavior ✅ verified; dims estimated | Snapping + Bill accuracy |
| 5 | **Per-model weights / setup crew & times** (all but ASAP-18 & X-32) | Estimated | Camp readout totals |
| 6 | **X-Series width** = 21.5 ft constant across X-16/24/40? | Verified on X-32 only | Cross-family fit + snapping |
| 7 | Which face actually mates (end vs side); is the connector a fixed-size tunnel? | Open | Geometry + topology |

Authoritative source for 2–4: the **product sheets on the DLX support portal**
(deployedlogix.com/support) — each connector has an English product sheet PDF.

---

## 7. Suggested read / build order

1. This overview → **2.** spec sheet (data) → **3.** field-planner brief (planner build) →
   **4.** camp presets (demo data) → **5.** render workflow (when you want the photoreal view).
2. Build the **validation engine first**, in 2D, off §4.5 — it's the differentiator and the
   riskiest logic. Everything else is presentation on top of it.
3. Resolve verify-list item #1 before you ship any Bill of Connectors to a customer.
