// View-only catalog for non-tent products (generators, HVAC, showers, interior add-ons), read from
// src/data/accessories.json. These are SCENE PROPS, not engine nodes: they have no mating face, are
// never passed to buildBillOfConnectors, and never appear in the Bill of Connectors. The engine
// (src/engine/) must never import this module — dependency arrow stays view -> data only.
//
// Mirrors viewDims.ts / unitSpecs.ts: one source file, no duplicated facts. Every record is
// confidence-flagged (dimensions are DLX-estimated; the website lists names, not sizes).

import rawAccessories from "../data/accessories.json";
import type { Confidence } from "../engine";

export type AccessoryCategory = "equipment" | "interior";
export type Placement = "external" | "internal";
export type Mount = "ground" | "wall" | "ceiling" | "mast";

/** Box dimensions for placing/rendering a prop (1 unit = 1 ft). */
export interface AccessoryDims {
  /** Footprint length (local length axis). */
  L: number;
  /** Footprint width (the local x span). */
  W: number;
  /** Box height. */
  H: number;
  category: AccessoryCategory;
  placement: Placement;
  mount: Mount;
}

/** Human-facing spec sheet for the inspector. */
export interface AccessorySpec {
  id: string;
  name: string;
  category: AccessoryCategory;
  placement: Placement;
  footprintFt?: [number, number];
  heightFt?: number;
  weightLb?: number;
  powerKw?: number;
  coolingTons?: number;
  stalls?: number;
  mount: Mount;
  confidence: Confidence;
}

interface RawAccessory {
  id: string;
  name?: string;
  category: string;
  placement: string;
  footprint_ft?: number[];
  height_ft?: number;
  weight_lb?: number;
  power_kw?: number;
  cooling_tons?: number;
  stalls?: number;
  mount?: string;
  confidence?: string;
}

function pair(a?: number[]): [number, number] | undefined {
  return a && a.length >= 2 ? [a[0]!, a[1]!] : undefined;
}

const DIMS: Record<string, AccessoryDims> = {};
const SPECS: Record<string, AccessorySpec> = {};

for (const r of rawAccessories as RawAccessory[]) {
  const fp = r.footprint_ft;
  const L = fp?.[0];
  const W = fp?.[1];
  if (L === undefined || W === undefined || r.height_ft === undefined) continue; // malformed — skip, never NaN
  const category: AccessoryCategory = r.category === "interior" ? "interior" : "equipment";
  const placement: Placement = r.placement === "internal" ? "internal" : "external";
  const mount = (["wall", "ceiling", "mast"].includes(r.mount ?? "") ? r.mount : "ground") as Mount;
  DIMS[r.id] = { L, W, H: r.height_ft, category, placement, mount };
  SPECS[r.id] = {
    id: r.id,
    name: r.name ?? r.id,
    category,
    placement,
    footprintFt: pair(r.footprint_ft),
    heightFt: r.height_ft,
    weightLb: r.weight_lb,
    powerKw: r.power_kw,
    coolingTons: r.cooling_tons,
    stalls: r.stalls,
    mount,
    confidence: (r.confidence as Confidence) ?? "estimated",
  };
}

export function accessoryDims(id: string): AccessoryDims | undefined {
  return DIMS[id];
}

export function accessorySpec(id: string): AccessorySpec | undefined {
  return SPECS[id];
}

/** All external equipment ids (for the add-menu's Equipment section), in declared order. */
export function equipmentIds(): string[] {
  return Object.values(SPECS).filter((s) => s.placement === "external").map((s) => s.id);
}

/** Internal add-on ids for the plan-view interior menu. Ceiling-mounted items (e.g. the overhead
 *  fan) don't sit in a floor stall, so they aren't offered for placement. */
export function interiorIds(): string[] {
  return Object.values(SPECS)
    .filter((s) => s.placement === "internal" && s.mount !== "ceiling")
    .map((s) => s.id);
}
