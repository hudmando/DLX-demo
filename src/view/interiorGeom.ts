// Plan-view interior: a floor + cot rows laid out inside a shelter's footprint, matching the DLX
// "Interior View" reference drawing (two columns of cots either side of a center aisle). Pure
// presentation in the shelter's LOCAL frame (length along z, width along x, centered at origin),
// built as a hidden child of the unit and revealed only in plan view. Carries no engine logic.

import * as THREE from "three";
import { MAT } from "./materials";
import { accessoryDims } from "./accessoryCatalog";
import { COT_AREA_FT2 } from "./constants";
import type { ViewDims } from "./viewDims";

const FLOOR_Y = 0.06; // sit the floor just above the ground grid
const COLUMNS = 2; // cots flank a central aisle (the reference layout)
const SIDE_MARGIN = 0.8; // ft clear between a cot end and the long wall
const END_MARGIN = 2; // ft clear at each gable end

/** Cot capacity: the shelter's estimated `cots`, else footprint area / COT_AREA_FT2 (never 0/NaN). */
function cotCount(d: ViewDims): number {
  if (d.cots && d.cots > 0) return Math.floor(d.cots);
  return Math.max(2, Math.round((d.L * d.W) / COT_AREA_FT2));
}

/**
 * Stall centers (the cot grid) in the shelter's LOCAL frame: two columns flanking the aisle, evenly
 * spread along the length. Shared by the cot decoration AND interior-add-on placement so a dropped
 * item lands exactly in a stall — one item per stall, never sideways or angled.
 */
export function interiorSlots(d: ViewDims): THREE.Vector3[] {
  const slots: THREE.Vector3[] = [];
  const cot = accessoryDims("cot");
  if (!cot) return slots;
  const colX = Math.max(0, d.W / 2 - cot.L / 2 - SIDE_MARGIN);
  const usableL = Math.max(cot.W, d.L - 2 * END_MARGIN);
  const total = cotCount(d);
  const perCol = Math.ceil(total / COLUMNS);

  let placed = 0;
  for (let row = 0; row < perCol && placed < total; row++) {
    const z = -usableL / 2 + ((row + 0.5) * usableL) / perCol;
    for (let col = 0; col < COLUMNS && placed < total; col++) {
      slots.push(new THREE.Vector3(col === 0 ? -colX : colX, 0, z));
      placed++;
    }
  }
  return slots;
}

/** A unit's floor slab, inset just inside the walls. Built for EVERY unit (ASAP, X, HUB) and always
 *  visible, so the floor reads the same in the normal view and the plan view. Cots/add-ons are
 *  placed by the user into the stall grid (interiorSlots). */
export function buildFloor(d: ViewDims): THREE.Mesh {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(d.W * 0.96, d.L * 0.96), MAT.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  floor.receiveShadow = true;
  return floor;
}
