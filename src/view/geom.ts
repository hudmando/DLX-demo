// View-layer geometry helpers. three.js lives in the view only (dependency arrow: view -> engine).
// Extracted verbatim (logic-preserving) from reference/demo-engine.html: strip / sweptStrip / loftStrip.
// These build schematic tent/tunnel surfaces; they carry no connection-rule logic.

import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0);

/** A cylinder welt from a to b (seams, straps, ridge lines). */
export function strip(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material): THREE.Mesh {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.clone().normalize());
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Sweep a 2D profile (points in the x/y plane) along z by length L, with a gentle ridge sag. */
export function sweptStrip(
  pts: ReadonlyArray<readonly [number, number]>,
  L: number,
  ridge: number,
  mat: THREE.Material,
  sagAmp = 0.16,
): THREE.Mesh {
  const P = pts.length;
  const cd: number[] = [0];
  for (let p = 1; p < P; p++) {
    const cur = pts[p]!;
    const prev = pts[p - 1]!;
    cd[p] = cd[p - 1]! + Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
  }
  const NZ = Math.max(2, Math.round(L * 1.2));
  const verts: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  for (let s = 0; s < NZ; s++) {
    const t = s / (NZ - 1);
    const z = -L / 2 + t * L;
    const sg = -sagAmp * Math.sin(Math.PI * t);
    for (let p = 0; p < P; p++) {
      const pt = pts[p]!;
      const y = pt[1];
      verts.push(pt[0], y + sg * (y / ridge), z);
      uvs.push(z, cd[p]!);
    }
  }
  for (let s = 0; s < NZ - 1; s++) {
    for (let p = 0; p < P - 1; p++) {
      const a = s * P + p;
      const b = s * P + p + 1;
      const c = (s + 1) * P + p + 1;
      const d = (s + 1) * P + p;
      idx.push(a, b, c, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Loft between two equal-length profiles (A at the -z end, B at the +z end) — the cross-family taper. */
export function loftStrip(
  A: ReadonlyArray<readonly [number, number]>,
  B: ReadonlyArray<readonly [number, number]>,
  L: number,
  mat: THREE.Material,
): THREE.Mesh {
  const P = A.length;
  const NZ = Math.max(2, Math.round(L * 3));
  const verts: number[] = [];
  const idx: number[] = [];
  for (let s = 0; s < NZ; s++) {
    const t = s / (NZ - 1);
    const z = -L / 2 + t * L;
    for (let p = 0; p < P; p++) {
      const a = A[p]!;
      const b = B[p]!;
      verts.push(THREE.MathUtils.lerp(a[0], b[0], t), THREE.MathUtils.lerp(a[1], b[1], t), z);
    }
  }
  for (let s = 0; s < NZ - 1; s++) {
    for (let p = 0; p < P - 1; p++) {
      const a = s * P + p;
      const b = s * P + p + 1;
      const c = (s + 1) * P + p + 1;
      const d = (s + 1) * P + p;
      idx.push(a, b, c, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}
