# CLAUDE.md — DLX Field Planner

## What this is
Interactive 3D web tool for configuring modular DLX (Deployed Logix) shelter camps. The
differentiator is the **connection-validation engine**: given a camp layout, it computes the
exact connector hardware needed to physically realize it — the **Bill of Connectors**.
Audience: emergency managers, military / expeditionary logistics planners, DLX sales reps.
Client-side only, no backend.

Two workstreams share one data model. **Only the schematic Field Planner is in scope for v1.**
The photoreal Render Workflow is deferred — build nothing from it unless explicitly asked.

## Authority hierarchy (read in this order; on conflict, higher wins)
1. `docs/dlx-project-overview.md` — **canonical.** §4 is the single source of truth for the
   connection model and units. Where any other doc disagrees on connections or units, §4 wins.
2. `docs/dlx-engineering-principles.txt` — owns *how* code is written: the engine contract (§4),
   the definition of done (§5), and the three values (efficiency / security / effectiveness).
3. `docs/dlx-spec-sheet.md` — owns the data: shelter/connector dimensions and the JSON the app
   loads. ~70% of specs are estimated; every record carries a `confidence` flag.
4. `docs/dlx-camp-presets.md` — the three demo camps. These are the **regression suite**.
5. `docs/dlx-field-planner-brief.txt` — UX / visual direction only. Reconciled to §4 in v3;
   if any residual difference remains, §4 still wins.
6. `docs/dlx-render-workflow.md` — deferred workstream. Reference only; out of scope for v1.

## The existing prototype
A working single-file prototype belongs at `reference/prototype.html` (drop it in). **Extract
from it — do not rewrite from scratch, and do not keep editing it in place.** Its proven,
DOM-free `selectConnector` and derived Bill of Connectors are already lifted into `src/engine/`;
use its three.js scene as the seed for `src/view/`. Source product data from the spec-sheet JSON,
not any copy embedded in the HTML. Preserve the engine's *semantics* exactly (the presets
regression-test this); the view layer may be restructured freely.

## Non-negotiable rules
- **1 world unit = 1 ft**, everywhere.
- **Zero magic numbers in logic.** No `16`, `21.5`, or connector-id string literals in code —
  every fact comes from the rules block (overview §4.5 / spec-sheet JSON). Model ids as the
  `ConnectorId` / `HubId` / `Family` literal unions so a typo is a compile error.
- **`selectConnector(faceA, faceB, rules)` is the single authoritative selection function.**
  Everything that needs a connector calls it; nothing re-derives the rule.
- **`directJoinAllowed` is read ONLY inside `selectConnector`.** Never branch on it elsewhere.
  Flipping a family's flag must change output with no other code change.
- **Bill of Connectors is derived on every call** — never stored, cached, or hand-maintained.
- **The engine is pure: zero three.js / zero DOM.** It runs headless under `node`/vitest. `three`
  is a package dependency of the *view* only; `src/engine/` must never import it. Dependency
  direction is one-way: view → engine.
- **Nodes vs edges, fixed:** shelters and HUBs are placed **nodes**; connectors are computed
  **edges**. Bill = (HUB nodes) + (connector edges, typed by face pair). Never expect a
  connector as a placed node.
- **Total functions.** Every input returns a typed result (`status: "ok" | "invalid"`). Never
  throw into the UI; never emit `NaN`.
- **Treat all scene input as untrusted** (presets, drag/drop, pasted/URL state): validate at the
  boundary, whitelist ids against the catalog, bound graph traversal (detect cycles, cap counts).
  No `eval` / `new Function()` on data. TypeScript types erase at runtime — they do **not**
  validate external input; keep the runtime checks in the loader.
- **Normalize once at load:** resolve aliases (`shelter-connector` → `asap-x-connector`) and
  defaults in `loader.ts`, so downstream code never sees both spellings or missing fields.
- **`confidence` propagates** from every record through to each join in the bill output.

## Connection model (one-liner; full rules in overview §4.4–4.5)
For each adjacency: equal mating faces → that family's `selfConnector` (or `null` if
`directJoinAllowed`); unequal faces (16 vs 21.5 ft) → `asap-x-connector`. A HUB exposes 4 ports
and accepts **either family on any side**; each used port consumes the connector for its face
pair. Every join consumes exactly one connector.

## Repo layout
```
src/engine/*.ts   pure TS: types, selectConnector, buildBillOfConnectors, loader, index (NO three.js)
src/data/*.json   rules.json, catalog.json, connectors.json
src/view/*.ts     three.js 0.161 schematic view (imports engine)
tests/*.test.ts   preset regression tests + fixtures
docs/             the six governing docs (see authority hierarchy)
reference/        prototype.html (extract from; do not edit)
```

## Build order (overview §7)
1. **Validation engine first**, in 2D, headless, off overview §4.5 — done; keep it pure.
2. Presets wired as regression tests — done (`tests/presets.test.ts`).
3. Add the three.js view layer on top of the working engine (extract from the prototype).
4. Then free-placement / snapping / graph-state management (the next milestone).

## Tech stack
- **Language: TypeScript**, `strict` (+ `noUncheckedIndexedAccess` to enforce guarded lookups).
- **Engine:** TS with **no runtime dependencies** — so it tests headless under vitest.
- **View:** TS + `three@0.161` (OrbitControls, RoomEnvironment, AgX tone mapping), bundled by Vite.
- **Client-side only.** No backend; the data file + serialized scene are the trust boundary.

## Commands
- Install: `npm install`
- Typecheck: `npm run typecheck`  (`tsc --noEmit`)
- Test (engine, headless — no three.js import): `npm test`  (`vitest run`)
- Dev server: `npm run dev`  (`vite`)

## Definition of done (a slice ships only when ALL pass — engineering principles §5)
- [ ] No magic numbers / hardcoded ids in logic — all from data.
- [ ] Bill is derived, not stored; flipping `directJoinAllowed` changes output with no code edit.
- [ ] Engine runs headless (no three.js import) and reproduces all three presets' bills.
- [ ] Invalid / unknown / malformed input returns a typed result; zero throws, zero NaN.
- [ ] Graph traversal is bounded and cycle-safe.
- [ ] `confidence` is present on every join in the output.

## Before relying on any Bill of Connectors
Resolve verify-list item #1 (overview §7.3): does ASAP↔ASAP need a connector, or butt-join
directly? It is a single `direct_join_allowed` flag flip in `src/data/rules.json` — but it
changes a whole class of bills, so confirm with DLX before shipping a bill to a customer.
