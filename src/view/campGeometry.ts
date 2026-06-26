// Geometry for the slot-based editor: where a unit's mating faces are, which are open, where the
// "+" markers sit, and where a newly-added unit lands. Mating faces are the gable ends for shelters
// (local ±z, the length axis) and all four sides for HUBs. Mirrors the conventions in sceneView.

import * as THREE from "three";
import { CONNECTOR_GAP_FT, LENGTH_ALONG_X } from "./constants";
import { viewDims } from "./viewDims";
import { accessoryDims } from "./accessoryCatalog";
import { newRef, type CampModel, type PlacedUnit } from "./campModel";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function worldYaw(rotationDeg: number): number {
  return LENGTH_ALONG_X + THREE.MathUtils.degToRad(rotationDeg);
}

/** Top-down (x east, y north) -> three world (x, 0, -y). */
export function centerOf(u: PlacedUnit): THREE.Vector3 {
  return V(u.x, 0, -u.y);
}

/** Mating-face local outward normals: shelter = 2 ends; HUB = 4 sides. */
export function faceNormals(product: string): THREE.Vector3[] {
  const cat = viewDims(product)?.category ?? "shelter";
  return cat === "hub"
    ? [V(0, 0, -1), V(0, 0, 1), V(-1, 0, 0), V(1, 0, 0)]
    : [V(0, 0, -1), V(0, 0, 1)];
}

/** Rotate a local vector into world about y by the unit's yaw. */
function toWorld(localN: THREE.Vector3, yaw: number): THREE.Vector3 {
  return V(
    localN.x * Math.cos(yaw) + localN.z * Math.sin(yaw),
    0,
    -localN.x * Math.sin(yaw) + localN.z * Math.cos(yaw),
  );
}

/** Distance from a unit's center to a face along that face's normal. */
function faceExtent(u: PlacedUnit, localN: THREE.Vector3): number {
  const d = viewDims(u.product);
  if (!d) return 0;
  return Math.abs(localN.z) > 0.5 ? d.L / 2 : d.W / 2; // end (length) vs side (width); hubs are square
}

/** World center of a unit's mating face. */
export function faceCenter(u: PlacedUnit, localN: THREE.Vector3): THREE.Vector3 {
  const yaw = worldYaw(u.rotation);
  return centerOf(u).addScaledVector(toWorld(localN, yaw), faceExtent(u, localN));
}

/** The local face normal of `u` pointing toward another unit (nearest cardinal). */
function localNormalToward(u: PlacedUnit, other: PlacedUnit): THREE.Vector3 {
  const dx = other.x - u.x;
  const dz = -other.y - -u.y;
  const yaw = worldYaw(u.rotation);
  const lx = dx * Math.cos(yaw) - dz * Math.sin(yaw); // world -> local
  const lz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
  return Math.abs(lx) >= Math.abs(lz) ? V(Math.sign(lx), 0, 0) : V(0, 0, Math.sign(lz));
}

/** Mating faces of `u` not already taken by a connected neighbor. */
export function openFaces(u: PlacedUnit, model: CampModel): THREE.Vector3[] {
  const occupied: THREE.Vector3[] = [];
  for (const e of model.edges) {
    const otherRef = e.from === u.ref ? e.to : e.to === u.ref ? e.from : null;
    if (!otherRef) continue;
    const other = model.units.find((x) => x.ref === otherRef);
    if (other) occupied.push(localNormalToward(u, other));
  }
  return faceNormals(u.product).filter((n) => !occupied.some((o) => o.dot(n) > 0.9));
}

/** Axis-aligned half-extents in world for an L×W footprint at a cardinal rotation. */
function aabbHalf(L: number, W: number, rotationDeg: number): { hx: number; hz: number } {
  const yaw = worldYaw(rotationDeg);
  const lengthDir = toWorld(V(0, 0, 1), yaw); // local +z (length)
  const widthDir = toWorld(V(1, 0, 0), yaw); // local +x (width)
  return {
    hx: Math.abs(lengthDir.x) * (L / 2) + Math.abs(widthDir.x) * (W / 2),
    hz: Math.abs(lengthDir.z) * (L / 2) + Math.abs(widthDir.z) * (W / 2),
  };
}

/** Axis-aligned footprint half-extents in world (rotations are cardinal, so the box is axis-aligned). */
export function footprintHalf(u: PlacedUnit): { hx: number; hz: number } {
  const d = viewDims(u.product);
  if (!d) return { hx: 0, hz: 0 };
  return aabbHalf(d.L, d.W, u.rotation);
}

/** Do two placed units' footprints overlap? (Gap-mated neighbors are 2 ft apart, so they don't.) */
export function unitsOverlap(a: PlacedUnit, b: PlacedUnit): boolean {
  const ca = centerOf(a);
  const cb = centerOf(b);
  const ha = footprintHalf(a);
  const hb = footprintHalf(b);
  const PEN = 0.1; // require real penetration; ignore faces that merely touch
  return Math.abs(ca.x - cb.x) < ha.hx + hb.hx - PEN && Math.abs(ca.z - cb.z) < ha.hz + hb.hz - PEN;
}

export function pointInUnit(p: THREE.Vector3, u: PlacedUnit, inflate: number): boolean {
  const c = centerOf(u);
  const h = footprintHalf(u);
  return Math.abs(p.x - c.x) <= h.hx + inflate && Math.abs(p.z - c.z) <= h.hz + inflate;
}

export interface Slot {
  parentRef: string;
  localN: THREE.Vector3;
  world: THREE.Vector3; // ground position for the "+" marker
}

/** Every open slot across the camp whose immediate space isn't already occupied by another unit. */
export function openSlots(model: CampModel): Slot[] {
  const slots: Slot[] = [];
  for (const u of model.units) {
    const yaw = worldYaw(u.rotation);
    for (const localN of openFaces(u, model)) {
      const n = toWorld(localN, yaw);
      const world = faceCenter(u, localN).addScaledVector(n, CONNECTOR_GAP_FT);
      // Hide a slot whose spot just beyond the face already sits inside another unit.
      const probe = faceCenter(u, localN).addScaledVector(n, CONNECTOR_GAP_FT + 1);
      const blocked = model.units.some((o) => o.ref !== u.ref && pointInUnit(probe, o, 0.5));
      if (!blocked) slots.push({ parentRef: u.ref, localN, world });
    }
  }
  return slots;
}

/** Build the new unit that attaches to `parent`'s `localN` face: positioned at the 2 ft gap,
 *  oriented so its own mating face points back at the parent. */
export function placeAtSlot(parent: PlacedUnit, localN: THREE.Vector3, product: string): PlacedUnit {
  const yaw = worldYaw(parent.rotation);
  const n = toWorld(localN, yaw); // outward world direction
  const pFace = faceCenter(parent, localN);
  const dims = viewDims(product);
  const isHub = dims?.category === "hub";

  // shelter: align its length with n (cardinal rotation); hub: square, rotation 0 already cardinal
  let rotationDeg = 0;
  if (!isHub) {
    rotationDeg = THREE.MathUtils.radToDeg(Math.atan2(n.x, n.z) + Math.PI / 2);
  }
  rotationDeg = (((Math.round(rotationDeg / 90) * 90) % 360) + 360) % 360;

  const nearExtent = isHub ? (dims?.W ?? 0) / 2 : (dims?.L ?? 0) / 2;
  const center = pFace.addScaledVector(n, CONNECTOR_GAP_FT + nearExtent);
  return { ref: newRef(), product, x: center.x, y: -center.z, rotation: rotationDeg };
}

// --- collision: keep tents off props (and props off everything) ------------------------------
const SIDE_SPACING_FT = 10; // a "+" every 10 ft along a tent's long side
const SIDE_GAP_FT = 3; // how far outside the wall a side-placed unit sits
const OVERLAP_PEN = 0.1; // require real penetration; merely touching is allowed

/** Axis-aligned world box (center + half-extents) for any placed thing. */
export interface Box2 {
  cx: number;
  cz: number;
  hx: number;
  hz: number;
}

/** Build a candidate box for a not-yet-placed product (tent or prop). Returns null if id unknown. */
export function boxFor(product: string, x: number, y: number, rotationDeg: number): Box2 | null {
  const d = viewDims(product) ?? accessoryDims(product);
  if (!d) return null;
  const h = aabbHalf(d.L, d.W, rotationDeg);
  return { cx: x, cz: -y, hx: h.hx, hz: h.hz };
}

function boxesOverlap(a: Box2, b: Box2): boolean {
  return (
    Math.abs(a.cx - b.cx) < a.hx + b.hx - OVERLAP_PEN &&
    Math.abs(a.cz - b.cz) < a.hz + b.hz - OVERLAP_PEN
  );
}

/** Does a candidate box overlap any tent or any EXTERNAL prop? (Internal/hosted props live inside a
 *  tent, so they never block placement.) */
export function collidesWithCamp(cand: Box2, model: CampModel, ignoreRef?: string): boolean {
  for (const u of model.units) {
    if (u.ref === ignoreRef) continue;
    const b = boxFor(u.product, u.x, u.y, u.rotation);
    if (b && boxesOverlap(cand, b)) return true;
  }
  for (const p of model.props) {
    if (p.host || p.ref === ignoreRef) continue;
    const b = boxFor(p.product, p.x, p.y, p.rotation);
    if (b && boxesOverlap(cand, b)) return true;
  }
  return false;
}

// --- side "+" slots: equipment attaches to a tent's long sides, not its ends ------------------
export interface SideSlot {
  parentRef: string;
  world: THREE.Vector3; // ground position for the "+" marker, just outside the wall
  rotationDeg: number; // orientation for the placed unit (aligned to the tent)
}

/** A "+" every SIDE_SPACING_FT along each long side of every shelter, spread evenly (count rounds
 *  down: floor(L / 6)). Hubs are excluded — equipment hangs off shelter sides. */
export function sideSlots(model: CampModel): SideSlot[] {
  const slots: SideSlot[] = [];
  for (const u of model.units) {
    const d = viewDims(u.product);
    if (!d || d.category === "hub") continue;
    const n = Math.floor(d.L / SIDE_SPACING_FT);
    if (n < 1) continue;
    const yaw = worldYaw(u.rotation);
    const rotationDeg = ((Math.round(u.rotation / 90) * 90) % 360 + 360) % 360;
    for (const sx of [-1, 1] as const) {
      const outDir = toWorld(V(sx, 0, 0), yaw); // long-side outward normal (local ±x)
      for (let i = 0; i < n; i++) {
        const t = -d.L / 2 + ((i + 0.5) * d.L) / n; // even spread along the length
        const onWall = centerOf(u).add(toWorld(V(sx * (d.W / 2), 0, t), yaw));
        slots.push({
          parentRef: u.ref,
          world: onWall.addScaledVector(outDir, SIDE_GAP_FT),
          rotationDeg,
        });
      }
    }
  }
  return slots;
}

/** World position of a tent-local point (e.g. an interior stall center). */
export function tentLocalToWorld(u: PlacedUnit, local: THREE.Vector3): THREE.Vector3 {
  return centerOf(u).add(toWorld(local, worldYaw(u.rotation)));
}
