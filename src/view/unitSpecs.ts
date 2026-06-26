// Full display specs for a placed unit, read from the SAME src/data/catalog.json the engine loads.
// The engine's normalized Catalog keeps only what connector selection needs; the inspector wants
// the human-facing numbers (area, weight, setup, range), so it reads the data file directly.
// No fact is duplicated — these all live once, in catalog.json.

import rawCatalog from "../data/catalog.json";
import type { Confidence } from "../engine";

export interface UnitSpec {
  id: string;
  name: string;
  family: string;
  category: string;
  footprintFt?: [number, number];
  heightFt?: number;
  areaFt2?: number;
  weightLb?: number;
  matingFaceFt?: number;
  portFaceFt?: number;
  setupPersonnel?: number;
  setupMinCanopy?: number;
  setupMinFull?: number;
  operatingRangeF?: [number, number];
  ports?: number;
  acceptsFamily?: string[];
  standalone?: boolean;
  confidence: Confidence;
}

interface RawSpec {
  id: string;
  name?: string;
  family: string;
  category: string;
  footprint_ft?: number[];
  height_ft?: number;
  area_ft2?: number;
  weight_lb?: number;
  mating_face_ft?: number;
  port_face_ft?: number;
  setup_personnel?: number;
  setup_min_canopy?: number;
  setup_min_full?: number;
  operating_range_f?: number[];
  ports?: number;
  accepts_family?: string[];
  standalone?: boolean;
  confidence?: string;
}

function pair(a?: number[]): [number, number] | undefined {
  return a && a.length >= 2 ? [a[0]!, a[1]!] : undefined;
}

const SPECS: Record<string, UnitSpec> = {};
for (const r of rawCatalog as RawSpec[]) {
  SPECS[r.id] = {
    id: r.id,
    name: r.name ?? r.id,
    family: r.family,
    category: r.category,
    footprintFt: pair(r.footprint_ft),
    heightFt: r.height_ft,
    areaFt2: r.area_ft2,
    weightLb: r.weight_lb,
    matingFaceFt: r.mating_face_ft,
    portFaceFt: r.port_face_ft,
    setupPersonnel: r.setup_personnel,
    setupMinCanopy: r.setup_min_canopy,
    setupMinFull: r.setup_min_full,
    operatingRangeF: pair(r.operating_range_f),
    ports: r.ports,
    acceptsFamily: r.accepts_family,
    standalone: r.standalone,
    confidence: (r.confidence as Confidence) ?? "estimated",
  };
}

export function unitSpec(id: string): UnitSpec | undefined {
  return SPECS[id];
}
