// The editable camp: placed units + the connections between them. This is the user's INPUT (like a
// preset's units/connections) — the engine still DERIVES the Bill from it. No three.js here.

import rawCatalog from "../data/catalog.json";

export interface PlacedUnit {
  ref: string;
  product: string;
  x: number; // top-down feet, east
  y: number; // top-down feet, north
  rotation: number; // degrees, 0 = footprint length along x
}

export interface CampEdge {
  from: string;
  to: string;
}

/** A placed non-tent prop (generator/HVAC/shower/interior add-on). Pure scene decoration: it never
 *  enters `units`/`edges`, so the engine never sees it and it never appears in the Bill of Connectors. */
export interface PlacedProp {
  ref: string;
  product: string; // an accessories.json id
  x: number; // top-down feet, east
  y: number; // top-down feet, north
  rotation: number; // degrees, 0 = footprint length along x
  host?: string; // for internal add-ons: the unit ref whose interior it sits in
}

export interface CampModel {
  units: PlacedUnit[];
  edges: CampEdge[];
  props: PlacedProp[];
}

export function emptyCamp(): CampModel {
  return { units: [], edges: [], props: [] };
}

let seq = 0;
export function newRef(): string {
  return `u${++seq}`;
}

interface RawMenuItem {
  id: string;
  name?: string;
  family: string;
  category: string;
}

export interface MenuItem {
  id: string;
  name: string;
  family: string;
  category: string;
}

// The add-menu offers every shelter + HUB; cross-family joins get their adapter auto-derived by the
// engine. Order: ASAP shelters, ASAP-HUB, X shelters, X-HUB — grouped for a readable dropdown.
const ORDER = ["asap-12", "asap-18", "asap-24", "asap-hub", "x-16", "x-24", "x-32", "x-40", "x-hub"];

export const MENU_ITEMS: MenuItem[] = ORDER.map((id) => {
  const r = (rawCatalog as RawMenuItem[]).find((c) => c.id === id);
  return { id, name: r?.name ?? id, family: r?.family ?? "asap", category: r?.category ?? "shelter" };
});

/** Remove a unit, every edge touching it, and any internal props it hosted. */
export function removeUnit(model: CampModel, ref: string): void {
  model.units = model.units.filter((u) => u.ref !== ref);
  model.edges = model.edges.filter((e) => e.from !== ref && e.to !== ref);
  model.props = model.props.filter((p) => p.host !== ref);
}

/** Remove a single placed prop. */
export function removeProp(model: CampModel, ref: string): void {
  model.props = model.props.filter((p) => p.ref !== ref);
}
