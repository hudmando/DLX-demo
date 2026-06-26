// Schematic geometry for non-tent props (generators, HVAC, showers, interior add-ons). Pure
// presentation built from primitives + the shared MAT library — carries ZERO connection-rule logic
// and is never seen by the engine. Local frame matches the shelters: footprint length runs along
// +z, width along x, +y up, with the box base sitting on the ground (y = 0).

import * as THREE from "three";
import { MAT } from "./materials";
import type { AccessoryDims } from "./accessoryCatalog";

/** A box sitting on the ground: W (x) by H (y) by L (z), base at y = 0. */
function box(w: number, h: number, l: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat);
  m.position.y = h / 2;
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Generator / power array: dark metal cabinet with a louvered end panel + an orange accent strip. */
function equipmentBox(d: AccessoryDims): THREE.Group {
  const g = new THREE.Group();
  g.add(box(d.W, d.H, d.L, MAT.metalEquip));
  // louver slats on the +z end face
  const slats = Math.max(3, Math.round(d.H * 2));
  for (let i = 0; i < slats; i++) {
    const y = (d.H * (i + 0.5)) / slats;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(d.W * 0.8, d.H / slats * 0.6), MAT.louver);
    s.position.set(0, y, d.L / 2 + 0.02);
    g.add(s);
  }
  const accent = new THREE.Mesh(new THREE.BoxGeometry(d.W + 0.04, 0.22, d.L * 0.5), MAT.equipAccent);
  accent.position.set(0, d.H * 0.78, 0);
  g.add(accent);
  return g;
}

/** HVAC unit: metal cabinet with a grille face and a round top fan. */
function hvacBox(d: AccessoryDims): THREE.Group {
  const g = new THREE.Group();
  g.add(box(d.W, d.H, d.L, MAT.metalEquip));
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(d.W * 0.8, d.H * 0.7), MAT.louver);
  grille.position.set(0, d.H * 0.5, d.L / 2 + 0.02);
  g.add(grille);
  const fan = new THREE.Mesh(new THREE.CircleGeometry(Math.min(d.W, d.L) * 0.32, 16), MAT.louver);
  fan.rotation.x = -Math.PI / 2;
  fan.position.set(0, d.H + 0.02, 0);
  g.add(fan);
  return g;
}

/** Scene-lighting mast: a small base, a tall pole, and a lamp head. */
function lightMast(d: AccessoryDims): THREE.Group {
  const g = new THREE.Group();
  g.add(box(d.W, 0.6, d.L, MAT.metalEquip)); // base
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, d.H, 10), MAT.mast);
  pole.position.y = d.H / 2;
  pole.castShadow = true;
  g.add(pole);
  const head = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.9), MAT.lamp);
  head.position.set(0, d.H, 0);
  g.add(head);
  return g;
}

/** Shower module: a light paneled enclosure with a flat roof cap. */
function showerBox(d: AccessoryDims): THREE.Group {
  const g = new THREE.Group();
  g.add(box(d.W, d.H, d.L, MAT.showerSkin));
  const roof = new THREE.Mesh(new THREE.BoxGeometry(d.W + 0.2, 0.18, d.L + 0.2), MAT.metalEquip);
  roof.position.y = d.H + 0.09;
  roof.castShadow = roof.receiveShadow = true;
  g.add(roof);
  return g;
}

/** Cot: a low fabric deck on a tube frame. Length (L) runs along local x so it seats correctly in a
 *  stall (head to the wall, foot to the aisle) instead of lying sideways down the tent. */
function cot(d: AccessoryDims): THREE.Group {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(d.L, 0.12, d.W), MAT.cotFabric);
  deck.position.y = d.H * 0.6;
  deck.castShadow = deck.receiveShadow = true;
  g.add(deck);
  for (const sz of [-1, 1] as const) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(d.L, d.H * 0.6, 0.12), MAT.cotFrame);
    rail.position.set(0, d.H * 0.3, sz * (d.W / 2 - 0.06));
    g.add(rail);
  }
  return g;
}

/** Wall-style partition / stall divider: a thin tall panel. */
function panel(d: AccessoryDims): THREE.Group {
  const g = new THREE.Group();
  g.add(box(d.W, d.H, Math.max(d.L, 0.3), MAT.partition));
  return g;
}

/** Overhead fan: a small hub with four blades (built low; reads as a disc from the plan view above). */
function ceilingFan(d: AccessoryDims): THREE.Group {
  const g = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12), MAT.cotFrame);
  hub.position.y = d.H;
  g.add(hub);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(d.W / 2, 0.06, 0.7), MAT.fanBlade);
    blade.position.set(0, d.H, 0);
    blade.rotation.y = (i * Math.PI) / 2;
    blade.translateX(d.W / 4);
    g.add(blade);
  }
  return g;
}

/** Build the schematic mesh for a prop id. Falls back to a plain box for unknown shapes. */
export function buildProp(id: string, d: AccessoryDims): THREE.Group {
  switch (id) {
    case "generator":
    case "convoy-array":
      return equipmentBox(d);
    case "hvac-125":
    case "hvac-30":
      return hvacBox(d);
    case "scene-light":
      return lightMast(d);
    case "shower-6stall":
    case "shower-freestanding":
    case "shower-single":
    case "shower-x-single":
      return showerBox(d);
    case "cot":
      return cot(d);
    case "modular-stall":
      return panel(d);
    case "fan-overhead":
      return ceilingFan(d);
    default: {
      const g = new THREE.Group();
      g.add(box(d.W, d.H, d.L, MAT.metalEquip));
      return g;
    }
  }
}
