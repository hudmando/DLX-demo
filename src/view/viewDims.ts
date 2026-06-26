// View-only geometry dimensions, read from the SAME src/data/catalog.json the engine loads.
// The engine's normalized Catalog intentionally drops footprint/height (it only needs faces for
// connector selection); the view needs the box sizes, so it reads them straight from the data file.
// No fact is duplicated — footprint_ft / height_ft live once, in catalog.json.

import rawCatalog from "../data/catalog.json";

// Schematic tent cross-section. The data gives footprint + height; the ridge/eave heights that
// shape the gable are NOT in any DLX spec — they are a rendering approximation.
// ESTIMATE — not DLX-verified: ridge ~= height, eave ~= ridge * EAVE_RATIO. Tune when real
// cross-sections arrive (overview verify-list #7).
const EAVE_RATIO = 0.625;

export interface ViewDims {
  /** Footprint length (runs along the unit's local length axis). */
  L: number;
  /** Footprint width (the mating-face span). */
  W: number;
  eave: number;
  ridge: number;
  category: "shelter" | "hub";
  /** Estimated cot capacity for the plan-view interior (shelters only; undefined for hubs). */
  cots?: number;
}

interface RawDimItem {
  id: string;
  category: string;
  footprint_ft: number[];
  height_ft: number;
  cots?: number;
}

const DIMS: Record<string, ViewDims> = {};
for (const raw of rawCatalog as RawDimItem[]) {
  const fp = raw.footprint_ft;
  const L = fp[0];
  const W = fp[1];
  if (L === undefined || W === undefined) continue; // malformed footprint — skip, never NaN
  const ridge = raw.height_ft;
  DIMS[raw.id] = {
    L,
    W,
    ridge,
    eave: ridge * EAVE_RATIO,
    category: raw.category === "hub" ? "hub" : "shelter",
    cots: raw.cots,
  };
}

export function viewDims(productId: string): ViewDims | undefined {
  return DIMS[productId];
}
