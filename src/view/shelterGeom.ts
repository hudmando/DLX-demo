// Parametric schematic shelter (and HUB, which is just a square shelter). Extracted from
// reference/demo-engine.html's buildShelter. Local frame: footprint length runs along +z,
// width (the mating face) along x, +y up. Detail literals (door/screen sizes) are schematic
// tuning, not connection-rule facts — the engine owns zero of this.

import * as THREE from "three";
import { MAT } from "./materials";
import { strip, sweptStrip } from "./geom";
import type { ViewDims } from "./viewDims";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function buildShelter(d: ViewDims): THREE.Group {
  const { W, L, eave, ridge } = d;
  const hw = W / 2;
  const g = new THREE.Group();
  const dH = Math.min(6.8, ridge - 0.6); // door height, clamped under the eave

  // roof gable + two side walls, swept along the length. The roof is tagged so plan view can strip
  // it to reveal the interior (the "Interior View" cutaway); walls stay.
  const roof = sweptStrip([[-hw, eave], [0, ridge], [hw, eave]], L, ridge, MAT.roof);
  roof.userData["part"] = "roof";
  g.add(roof);
  g.add(sweptStrip([[-hw, 0], [-hw, eave]], L, ridge, MAT.wall));
  g.add(sweptStrip([[hw, 0], [hw, eave]], L, ridge, MAT.wall));

  // end walls with a true-hole doorway (overview/render §6 proud-vs-hole rule: doorways are holes)
  function end(z: number): void {
    const sh = new THREE.Shape();
    sh.moveTo(-hw, 0);
    sh.lineTo(hw, 0);
    sh.lineTo(hw, eave);
    sh.lineTo(0, ridge);
    sh.lineTo(-hw, eave);
    sh.closePath();
    const ho = new THREE.Path();
    ho.moveTo(-1.75, 0);
    ho.lineTo(1.75, 0);
    ho.lineTo(1.75, dH);
    ho.lineTo(-1.75, dH);
    ho.closePath();
    sh.holes.push(ho);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), MAT.wall);
    m.position.z = z;
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    const dk = new THREE.Mesh(new THREE.PlaneGeometry(3.5, dH), MAT.doorway);
    dk.position.set(0, dH / 2, z + (z > 0 ? 0.04 : -0.04));
    if (z < 0) dk.rotation.y = Math.PI;
    g.add(dk);
  }
  end(-L / 2);
  end(L / 2);

  // proud window screens along each side (render §6: screens sit just outside the wall)
  const bays = Math.max(3, Math.round(L / 6));
  const z0 = -L / 2 + 1.5;
  const span = L - 3;
  for (let i = 0; i < bays; i++) {
    const z = z0 + (span * (i + 0.5)) / bays;
    for (const sx of [-1, 1] as const) {
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.2), MAT.screen);
      sc.position.set(sx * (hw + 0.04), Math.min(3.0, eave - 0.6), z);
      sc.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      g.add(sc);
    }
  }

  // seam welts on ridge + eaves
  const ridgeSeam = strip(V(0, ridge, -L / 2), V(0, ridge, L / 2), 0.07, MAT.seam);
  ridgeSeam.userData["part"] = "roof";
  g.add(ridgeSeam);
  for (const sx of [-1, 1] as const) {
    g.add(strip(V(sx * hw, eave, -L / 2), V(sx * hw, eave, L / 2), 0.07, MAT.seam));
  }

  // orange ballast bags + tie-down straps for instant field read + scale
  for (const z of [-L / 2 + 2.3, 0, L / 2 - 2.3]) {
    for (const sx of [-1, 1] as const) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(2.56, 1.12, 1.64), MAT.ballast);
      b.position.set(sx * (hw + 0.7), 0.56, z);
      b.castShadow = b.receiveShadow = true;
      g.add(b);
      g.add(strip(V(sx * hw, eave, z), V(sx * (hw + 0.7), 1.12, z), 0.05, MAT.strap));
    }
  }

  return g;
}

/**
 * A HUB: a SQUARE module with a quad-pitch (pyramidal/hip) roof so all four sides present an
 * identical mating face — it's a 4-port junction that accepts a shelter on any side (overview §4.3).
 * A gable roof would only resolve two faces; the hip roof makes the four sides symmetric.
 * Square side = footprint (W == L for hubs). Detail literals are schematic tuning.
 */
export function buildHub(d: ViewDims): THREE.Group {
  const S = d.W; // square side
  const hw = S / 2;
  const { eave, ridge } = d;
  const g = new THREE.Group();
  const dH = Math.min(6.8, eave - 0.3); // door height under the eave

  // four vertical walls, each carrying a doorway aperture (4-way mating)
  const sides: ReadonlyArray<{ px: number; pz: number; ry: number }> = [
    { px: 0, pz: -hw, ry: 0 },
    { px: 0, pz: hw, ry: Math.PI },
    { px: -hw, pz: 0, ry: -Math.PI / 2 },
    { px: hw, pz: 0, ry: Math.PI / 2 },
  ];
  for (const s of sides) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(S, eave), MAT.wall);
    wall.position.set(s.px, eave / 2, s.pz);
    wall.rotation.y = s.ry;
    wall.castShadow = wall.receiveShadow = true;
    g.add(wall);
    const out = new THREE.Vector3(s.px, 0, s.pz).normalize().multiplyScalar(0.05); // proud of wall
    const dk = new THREE.Mesh(new THREE.PlaneGeometry(3.5, dH), MAT.doorway);
    dk.position.set(s.px + out.x, dH / 2, s.pz + out.z);
    dk.rotation.y = s.ry;
    g.add(dk);
  }

  // Cross-gable (pavilion) roof: each side gables up to RIDGE height at its midpoint, so every
  // face's apex lines up with the connecting tent's ridge (a plain pyramid would only reach ridge
  // at the center and drop to eave level along the faces). Ridge runs along both centerlines;
  // valleys fall to the eave corners.
  const C = V(0, ridge, 0); // center apex
  const mid = [V(0, ridge, -hw), V(hw, ridge, 0), V(0, ridge, hw), V(-hw, ridge, 0)]; // side peaks (S,E,N,W)
  const corner = [V(-hw, eave, -hw), V(hw, eave, -hw), V(hw, eave, hw), V(-hw, eave, hw)]; // valley corners

  // 8 roof-slope triangles (two per quadrant: corner up to its two flanking side-peaks + center)
  const roofVerts: number[] = [];
  const push = (arr: number[], ...vs: THREE.Vector3[]) => vs.forEach((v) => arr.push(v.x, v.y, v.z));
  for (let i = 0; i < 4; i++) {
    const k = corner[i]!;
    const mA = mid[i]!; // side before the corner
    const mB = mid[(i + 3) % 4]!; // side after the corner
    push(roofVerts, C, mA, k);
    push(roofVerts, C, k, mB);
  }
  const roofGeo = new THREE.BufferGeometry();
  roofGeo.setAttribute("position", new THREE.Float32BufferAttribute(roofVerts, 3));
  roofGeo.computeVertexNormals();
  const roof = new THREE.Mesh(roofGeo, MAT.roof);
  roof.castShadow = roof.receiveShadow = true;
  roof.userData["part"] = "roof";
  g.add(roof);

  // 4 gable infill triangles above each wall (eave corners up to that side's ridge peak)
  const gableVerts: number[] = [];
  for (let i = 0; i < 4; i++) push(gableVerts, corner[i]!, mid[i]!, corner[(i + 1) % 4]!);
  const gableGeo = new THREE.BufferGeometry();
  gableGeo.setAttribute("position", new THREE.Float32BufferAttribute(gableVerts, 3));
  gableGeo.computeVertexNormals();
  const gable = new THREE.Mesh(gableGeo, MAT.wall);
  gable.castShadow = gable.receiveShadow = true;
  gable.userData["part"] = "roof"; // the upper infill lifts with the roof in plan view
  g.add(gable);

  // ridge seams (center -> each side peak) + eave perimeter seams
  for (const m of mid) {
    const arm = strip(C, m, 0.07, MAT.seam);
    arm.userData["part"] = "roof";
    g.add(arm);
  }
  for (let i = 0; i < 4; i++) g.add(strip(corner[i]!, corner[(i + 1) % 4]!, 0.06, MAT.seam));

  // corner ballast bags for scale/consistency with the shelters
  for (const c of corner) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.56, 1.12, 1.64), MAT.ballast);
    b.position.set(c.x + Math.sign(c.x) * 0.7, 0.56, c.z + Math.sign(c.z) * 0.7);
    b.castShadow = b.receiveShadow = true;
    g.add(b);
  }

  return g;
}
