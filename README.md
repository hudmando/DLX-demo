# DLX Field Planner

Interactive 3D planner for modular DLX (Deployed Logix) shelter camps. The centerpiece is the
**connection-validation engine**: given a camp layout, it derives the exact connector hardware
needed to realize it — the **Bill of Connectors**.

## Read first
- **`CLAUDE.md`** — project constitution for Claude Code: authority hierarchy, non-negotiables,
  build order, definition of done.
- **`docs/dlx-project-overview.md` §4** — the canonical connection model (single source of truth).

## Layout
```
src/engine/   pure TS logic — selectConnector, buildBillOfConnectors, loader (NO three.js)
src/data/     rules.json + catalog.json + connectors.json (loaded + normalized at the boundary)
src/view/     three.js 0.161 schematic view (imports the engine; one-way dependency)
tests/        preset regression suite (the three demo camps + the toggle)
docs/         the six governing documents
reference/    drop prototype.html here to extract from
```

## Commands
```
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest — engine runs headless, no three.js import
npm run dev         # vite dev server (view)
```

## State
The engine is implemented and green against all three preset bills, the `direct_join_allowed`
toggle, and untrusted-input handling. The view is a placeholder — first build task is to
extract the scene from `reference/prototype.html`. See `CLAUDE.md` for the build order.
