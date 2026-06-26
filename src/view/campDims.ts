// Plan-view camp dimension annotation: a black overall length x width measure framing the whole
// camp (like the bold dimension lines on the DLX camp diagrams). Read-only; shown only in plan
// view. Reuses the footprint math from campGeometry and the HTML-label projection pattern from
// hover.ts. No engine involvement.

import * as THREE from "three";
import type { Studio } from "./studio";
import { centerOf, footprintHalf } from "./campGeometry";
import type { CampModel } from "./campModel";

const LINE = 0x14181f; // bold black, matching the diagram dimension lines
const MARGIN = 4; // ft the measure line stands off the camp edge
const TICK = 1.2; // ft end-tick length
const Y = 0.12; // lift just above the ground grid

interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Axis-aligned world bounds over the camp's units (rotations are cardinal, so footprints align). */
function campBox(model: CampModel): Box | null {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const u of model.units) {
    const c = centerOf(u);
    const h = footprintHalf(u);
    minX = Math.min(minX, c.x - h.hx);
    maxX = Math.max(maxX, c.x + h.hx);
    minZ = Math.min(minZ, c.z - h.hz);
    maxZ = Math.max(maxZ, c.z + h.hz);
  }
  return Number.isFinite(minX) ? { minX, maxX, minZ, maxZ } : null;
}

function fmtFt(ft: number): string {
  const r = Math.round(ft * 10) / 10;
  return `${Number.isInteger(r) ? r : r.toFixed(1)} ft`;
}

export interface CampDims {
  rebuild: (model: CampModel) => void;
  setVisible: (v: boolean) => void;
  update: () => void;
  reset: () => void;
}

export function setupCampDims(studio: Studio): CampDims {
  const group = new THREE.Group();
  group.visible = false;
  studio.scene.add(group);
  const mat = new THREE.LineBasicMaterial({ color: LINE });
  const dom = studio.renderer.domElement;

  // two world-anchored labels (width along x, length along z)
  const labels = [makeLabel(), makeLabel()];
  for (const l of labels) document.body.appendChild(l.div);
  let anchors: THREE.Vector3[] = [];

  function makeLabel(): { div: HTMLDivElement } {
    const div = document.createElement("div");
    div.className = "campdimlabel";
    div.style.display = "none";
    return { div };
  }

  function clearLines(): void {
    for (const c of [...group.children]) {
      (c as Partial<THREE.Line>).geometry?.dispose();
      group.remove(c);
    }
  }

  function line(pts: THREE.Vector3[]): void {
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(geo, mat));
  }

  function rebuild(model: CampModel): void {
    clearLines();
    const b = campBox(model);
    if (!b) {
      anchors = [];
      for (const l of labels) l.div.style.display = "none";
      return;
    }
    const v = (x: number, z: number) => new THREE.Vector3(x, Y, z);

    // width measure (x-extent) along the south edge
    const zW = b.maxZ + MARGIN;
    line([v(b.minX, zW), v(b.maxX, zW)]);
    line([v(b.minX, zW - TICK), v(b.minX, zW + TICK)]);
    line([v(b.maxX, zW - TICK), v(b.maxX, zW + TICK)]);

    // length measure (z-extent) along the west edge
    const xL = b.minX - MARGIN;
    line([v(xL, b.minZ), v(xL, b.maxZ)]);
    line([v(xL - TICK, b.minZ), v(xL + TICK, b.minZ)]);
    line([v(xL - TICK, b.maxZ), v(xL + TICK, b.maxZ)]);

    anchors = [v((b.minX + b.maxX) / 2, zW + MARGIN), v(xL - MARGIN, (b.minZ + b.maxZ) / 2)];
    labels[0]!.div.textContent = fmtFt(b.maxX - b.minX);
    labels[1]!.div.textContent = fmtFt(b.maxZ - b.minZ);
  }

  function setVisible(visible: boolean): void {
    group.visible = visible;
    if (!visible) for (const l of labels) l.div.style.display = "none";
  }

  const p = new THREE.Vector3();
  function update(): void {
    if (!group.visible || !anchors.length) return;
    const rect = dom.getBoundingClientRect();
    anchors.forEach((a, i) => {
      p.copy(a).project(studio.camera);
      const div = labels[i]!.div;
      if (p.z > 1) {
        div.style.display = "none";
        return;
      }
      div.style.display = "block";
      div.style.left = `${rect.left + (p.x * 0.5 + 0.5) * rect.width}px`;
      div.style.top = `${rect.top + (-p.y * 0.5 + 0.5) * rect.height}px`;
    });
  }

  function reset(): void {
    clearLines();
    anchors = [];
    for (const l of labels) l.div.style.display = "none";
  }

  return { rebuild, setVisible, update, reset };
}
