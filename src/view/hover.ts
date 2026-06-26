// Hover dimensions: mouse over a unit -> green 3D silhouette tracing its real edges + L/W/H
// dimension labels. Read-only; coexists with the click inspector. Floor edges on a mated side are
// hidden ("don't draw through matter"), and each unique length is labelled once.

import * as THREE from "three";
import type { Studio } from "./studio";
import { viewDims, type ViewDims } from "./viewDims";
import { unitSpec } from "./unitSpecs";

const GREEN = 0x2faa57;
const FLOOR_Y = 0.05; // lift floor edges just above the ground grid
const LABEL_OFFSET = 1.6; // how far outside the edge a dimension label floats (ft)

interface Edge {
  a: THREE.Vector3;
  b: THREE.Vector3;
  floorNormal?: THREE.Vector3; // present only on floor edges (the hideable ones)
}
interface DimLabel {
  ft: number;
  local: THREE.Vector3;
}
interface UnitOutline {
  lines: THREE.LineSegments;
  labels: DimLabel[];
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function isMated(normal: THREE.Vector3, mated: THREE.Vector3[]): boolean {
  return mated.some((m) => m.dot(normal) > 0.9);
}

function fmtFt(ft: number): string {
  return `${Number.isInteger(ft) ? ft : ft.toFixed(1)} ft`;
}

function linesFrom(edges: Edge[], mated: THREE.Vector3[]): THREE.LineSegments {
  const pos: number[] = [];
  for (const e of edges) {
    if (e.floorNormal && isMated(e.floorNormal, mated)) continue; // buried by a neighbor
    pos.push(e.a.x, e.a.y, e.a.z, e.b.x, e.b.y, e.b.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: GREEN }));
  lines.raycast = () => {}; // never block hover/selection raycasts
  return lines;
}

/** Keep one label per unique length value (the dedup rule). */
function dedupe(labels: DimLabel[]): DimLabel[] {
  const seen = new Set<number>();
  const out: DimLabel[] = [];
  for (const l of labels) {
    if (seen.has(l.ft)) continue;
    seen.add(l.ft);
    out.push(l);
  }
  return out;
}

function buildShelterOutline(d: ViewDims, heightFt: number, mated: THREE.Vector3[]): UnitOutline {
  const hw = d.W / 2;
  const hl = d.L / 2;
  const { eave, ridge } = d;
  const fy = FLOOR_Y;
  const fc = { mm: V(-hw, fy, -hl), pm: V(hw, fy, -hl), pp: V(hw, fy, hl), mp: V(-hw, fy, hl) };
  const ec = { mm: V(-hw, eave, -hl), pm: V(hw, eave, -hl), pp: V(hw, eave, hl), mp: V(-hw, eave, hl) };
  const rm = V(0, ridge, -hl);
  const rp = V(0, ridge, hl);

  const edges: Edge[] = [
    // floor (hideable)
    { a: fc.mm, b: fc.pm, floorNormal: V(0, 0, -1) }, // -z end, width
    { a: fc.pp, b: fc.mp, floorNormal: V(0, 0, 1) }, // +z end, width
    { a: fc.pm, b: fc.pp, floorNormal: V(1, 0, 0) }, // +x side, length
    { a: fc.mp, b: fc.mm, floorNormal: V(-1, 0, 0) }, // -x side, length
    // eaves + ridge + gable + verticals (frame)
    { a: ec.pm, b: ec.pp },
    { a: ec.mp, b: ec.mm },
    { a: rm, b: rp },
    { a: ec.mm, b: rm },
    { a: ec.pm, b: rm },
    { a: ec.mp, b: rp },
    { a: ec.pp, b: rp },
    { a: fc.mm, b: ec.mm },
    { a: fc.pm, b: ec.pm },
    { a: fc.pp, b: ec.pp },
    { a: fc.mp, b: ec.mp },
  ];

  // labels on visible faces: width + height on a non-mated end, length on a non-mated side
  const ends = [V(0, 0, -1), V(0, 0, 1)];
  const sides = [V(-1, 0, 0), V(1, 0, 0)];
  const visEnd = ends.find((n) => !isMated(n, mated)) ?? ends[0]!;
  const visSide = sides.find((n) => !isMated(n, mated)) ?? sides[0]!;
  const labels = dedupe([
    { ft: d.W, local: V(0, fy, visEnd.z * (hl + LABEL_OFFSET)) },
    { ft: d.L, local: V(visSide.x * (hw + LABEL_OFFSET), fy, 0) },
    { ft: heightFt, local: V(0, ridge * 0.55, visEnd.z * (hl + LABEL_OFFSET)) },
  ]);

  return { lines: linesFrom(edges, mated), labels };
}

function buildHubOutline(d: ViewDims, heightFt: number, mated: THREE.Vector3[]): UnitOutline {
  const s = d.W / 2; // square half-side
  const { eave, ridge } = d;
  const fy = FLOOR_Y;
  const fc = { mm: V(-s, fy, -s), pm: V(s, fy, -s), pp: V(s, fy, s), mp: V(-s, fy, s) };
  const ec = { mm: V(-s, eave, -s), pm: V(s, eave, -s), pp: V(s, eave, s), mp: V(-s, eave, s) };
  const peak = { S: V(0, ridge, -s), E: V(s, ridge, 0), N: V(0, ridge, s), W: V(-s, ridge, 0) };
  const C = V(0, ridge, 0);

  const edges: Edge[] = [
    // floor square (hideable)
    { a: fc.mm, b: fc.pm, floorNormal: V(0, 0, -1) },
    { a: fc.pp, b: fc.mp, floorNormal: V(0, 0, 1) },
    { a: fc.pm, b: fc.pp, floorNormal: V(1, 0, 0) },
    { a: fc.mp, b: fc.mm, floorNormal: V(-1, 0, 0) },
    // eave perimeter
    { a: ec.mm, b: ec.pm },
    { a: ec.pm, b: ec.pp },
    { a: ec.pp, b: ec.mp },
    { a: ec.mp, b: ec.mm },
    // cross ridge arms (center -> side peaks)
    { a: C, b: peak.S },
    { a: C, b: peak.E },
    { a: C, b: peak.N },
    { a: C, b: peak.W },
    // gable slopes (peak -> its two eave corners)
    { a: peak.S, b: ec.mm },
    { a: peak.S, b: ec.pm },
    { a: peak.E, b: ec.pm },
    { a: peak.E, b: ec.pp },
    { a: peak.N, b: ec.pp },
    { a: peak.N, b: ec.mp },
    { a: peak.W, b: ec.mp },
    { a: peak.W, b: ec.mm },
    // verticals
    { a: fc.mm, b: ec.mm },
    { a: fc.pm, b: ec.pm },
    { a: fc.pp, b: ec.pp },
    { a: fc.mp, b: ec.mp },
  ];

  const sides = [V(0, 0, -1), V(1, 0, 0), V(0, 0, 1), V(-1, 0, 0)];
  const vis = sides.find((n) => !isMated(n, mated)) ?? sides[0]!;
  const out = V(vis.x * (s + LABEL_OFFSET), fy, vis.z * (s + LABEL_OFFSET));
  const labels = dedupe([
    { ft: d.W, local: out }, // footprint side (square -> one value)
    { ft: heightFt, local: V(vis.x * (s + LABEL_OFFSET), ridge * 0.55, vis.z * (s + LABEL_OFFSET)) },
  ]);

  return { lines: linesFrom(edges, mated), labels };
}

function unitGroupOf(o: THREE.Object3D | null): THREE.Object3D | null {
  let node = o;
  while (node && node.userData["unitRef"] === undefined) node = node.parent;
  return node;
}

export interface Hover {
  update: () => void;
  reset: () => void;
}

export function setupHover(studio: Studio, group: THREE.Group): Hover {
  const dom = studio.renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hoveredRef: string | null = null;
  let outline: THREE.LineSegments | null = null;
  let host: THREE.Object3D | null = null;
  let labels: { local: THREE.Vector3; div: HTMLDivElement }[] = [];

  function clear(): void {
    if (outline && host) {
      host.remove(outline);
      outline.geometry.dispose();
    }
    outline = null;
    host = null;
    for (const l of labels) l.div.remove();
    labels = [];
    hoveredRef = null;
  }

  function setHover(unit: THREE.Object3D): void {
    const ref = String(unit.userData["unitRef"]);
    if (ref === hoveredRef) return;
    clear();
    hoveredRef = ref;
    const product = String(unit.userData["product"]);
    const dims = viewDims(product);
    const spec = unitSpec(product);
    if (!dims) return;
    const mated = (unit.userData["matedNormals"] as THREE.Vector3[] | undefined) ?? [];
    const heightFt = spec?.heightFt ?? dims.ridge;
    const built = dims.category === "hub"
      ? buildHubOutline(dims, heightFt, mated)
      : buildShelterOutline(dims, heightFt, mated);
    unit.add(built.lines);
    outline = built.lines;
    host = unit;
    for (const lab of built.labels) {
      const div = document.createElement("div");
      div.className = "dimlabel";
      div.textContent = fmtFt(lab.ft);
      document.body.appendChild(div);
      labels.push({ local: lab.local, div });
    }
  }

  dom.addEventListener("pointermove", (e) => {
    const rect = dom.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, studio.camera);
    const hits = raycaster.intersectObjects(group.children, true);
    const unit = unitGroupOf(hits[0]?.object ?? null);
    if (unit) setHover(unit);
    else clear();
  });
  dom.addEventListener("pointerleave", clear);

  const v = new THREE.Vector3();
  function update(): void {
    if (!host || !labels.length) return;
    host.updateWorldMatrix(true, false);
    const rect = dom.getBoundingClientRect();
    for (const l of labels) {
      v.copy(l.local).applyMatrix4(host.matrixWorld).project(studio.camera);
      if (v.z > 1) {
        l.div.style.display = "none";
        continue;
      }
      l.div.style.display = "block";
      l.div.style.left = `${rect.left + (v.x * 0.5 + 0.5) * rect.width}px`;
      l.div.style.top = `${rect.top + (-v.y * 0.5 + 0.5) * rect.height}px`;
    }
  }

  return { update, reset: clear };
}
