// Swappable ground environments ("biomes") for the scene: the default blueprint field, an urban
// hospital parking lot, and a rural grassy field. Each builds a self-contained group (ground +
// grid/markings) plus a background, so studio.ts can dispose one and add the next. Pure presentation
// — no engine or model involvement. Extracted ground/grid/background from the original studio.ts.

import * as THREE from "three";
import { urbanScenery, ruralScenery } from "./scenery";

export type BiomeId = "blueprint" | "urban" | "rural";

export interface BiomeDef {
  id: BiomeId;
  name: string; // toolbar label
}

// Cycle order for the toolbar button.
export const BIOMES: ReadonlyArray<BiomeDef> = [
  { id: "blueprint", name: "Field" },
  { id: "urban", name: "Urban" },
  { id: "rural", name: "Rural" },
];

export interface BuiltBiome {
  group: THREE.Group;
  background: THREE.Texture | THREE.Color;
}

const GROUND_FT = 640; // matches the original studio ground plane

function groundMesh(tex: THREE.Texture, roughness: number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_FT, GROUND_FT),
    new THREE.MeshStandardMaterial({ map: tex, roughness }),
  );
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

/** Faint sky->pale vertical gradient (the original studio background). */
function blueprintBackground(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 256;
  const x = c.getContext("2d")!;
  const grad = x.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#f6f7f9");
  grad.addColorStop(1, "#eceef1");
  x.fillStyle = grad;
  x.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function skyBackground(top: string, bottom: string): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 256;
  const x = c.getContext("2d")!;
  const grad = x.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  x.fillStyle = grad;
  x.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The default blueprint field: pale radial ground + 1 ft / 5 ft measured grid. */
function buildBlueprint(): BuiltBiome {
  const group = new THREE.Group();
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 360);
  grad.addColorStop(0, "#f4f4f4");
  grad.addColorStop(1, "#f1f1f1");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  group.add(groundMesh(tex, 0.99));

  const gMinor = new THREE.GridHelper(360, 360, 0xe1e6ec, 0xe1e6ec); // 1 ft minor
  gMinor.position.y = 0.03;
  const gMajor = new THREE.GridHelper(360, 72, 0xb7c0cd, 0xb7c0cd); // 5 ft major
  gMajor.position.y = 0.04;
  group.add(gMinor, gMajor);

  return { group, background: blueprintBackground() };
}

/** Urban: asphalt with painted parking stalls + a drive aisle — a hospital parking lot. */
function buildUrban(): BuiltBiome {
  const group = new THREE.Group();
  const N = 1024;
  // albedo
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const x = c.getContext("2d")!;
  x.fillStyle = "#3a3d42"; // asphalt base
  x.fillRect(0, 0, N, N);
  for (let i = 0; i < 6000; i++) {
    const g = 44 + Math.random() * 40;
    x.fillStyle = `rgba(${g | 0},${g | 0},${(g + 5) | 0},0.22)`;
    x.fillRect(Math.random() * N, Math.random() * N, 2, 2);
  }
  // concrete expansion joints (~20 ft slabs)
  const seam = Math.round((20 / GROUND_FT) * N);
  x.strokeStyle = "rgba(18,20,23,0.5)";
  x.lineWidth = 2;
  for (let p = seam; p < N; p += seam) {
    x.beginPath();
    x.moveTo(p, 0);
    x.lineTo(p, N);
    x.moveTo(0, p);
    x.lineTo(N, p);
    x.stroke();
  }

  // roughness map: dry asphalt is matte (light = rough), puddles are glossy (dark = smooth)
  const rc = document.createElement("canvas");
  rc.width = rc.height = N;
  const rx = rc.getContext("2d")!;
  rx.fillStyle = "#e6e6e6";
  rx.fillRect(0, 0, N, N);

  // wet puddles, drawn onto BOTH the albedo (dark sheen) and the roughness map (smooth)
  for (let i = 0; i < 18; i++) {
    const px = Math.random() * N;
    const py = Math.random() * N;
    const r = 30 + Math.random() * 90;
    const rot = Math.random() * 3;
    const ag = x.createRadialGradient(px, py, r * 0.2, px, py, r);
    ag.addColorStop(0, "rgba(20,24,30,0.55)");
    ag.addColorStop(1, "rgba(28,32,38,0)");
    x.fillStyle = ag;
    x.beginPath();
    x.ellipse(px, py, r, r * 0.7, rot, 0, 7);
    x.fill();
    const rg = rx.createRadialGradient(px, py, r * 0.2, px, py, r);
    rg.addColorStop(0, "rgba(16,16,16,0.92)");
    rg.addColorStop(1, "rgba(150,150,150,0)");
    rx.fillStyle = rg;
    rx.beginPath();
    rx.ellipse(px, py, r, r * 0.7, rot, 0, 7);
    rx.fill();
  }

  // white parking-stall ticks along the top and bottom edges
  const stall = Math.round((9 / GROUND_FT) * N);
  x.strokeStyle = "rgba(228,228,214,0.75)";
  x.lineWidth = 3;
  for (let p = 0; p < N; p += stall) {
    x.beginPath();
    x.moveTo(p, 0);
    x.lineTo(p, N * 0.16);
    x.moveTo(p, N * 0.84);
    x.lineTo(p, N);
    x.stroke();
  }
  // bold sweeping yellow taxi line (like the reference apron)
  x.strokeStyle = "rgba(224,184,52,0.92)";
  x.lineWidth = 8;
  x.lineCap = "round";
  x.beginPath();
  x.moveTo(N * 0.05, N * 0.78);
  x.quadraticCurveTo(N * 0.5, N * 0.42, N * 0.95, N * 0.7);
  x.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const rough = new THREE.CanvasTexture(rc);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_FT, GROUND_FT),
    new THREE.MeshStandardMaterial({ map: tex, roughnessMap: rough, roughness: 1.0, metalness: 0.25, envMapIntensity: 1.0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  group.add(urbanScenery());

  return { group, background: skyBackground("#cfd6dd", "#aab4bf") };
}

/** Rural: a grassy field worn to dirt where the camp sits, ringed by a tree line. */
function buildRural(): BuiltBiome {
  const group = new THREE.Group();
  const N = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const x = c.getContext("2d")!;
  x.fillStyle = "#577a37"; // grass base
  x.fillRect(0, 0, N, N);
  // mottled patches of lighter/darker grass
  for (let i = 0; i < 1400; i++) {
    const r = 8 + Math.random() * 46;
    const g = 92 + Math.random() * 70;
    x.fillStyle = `rgba(${(58 + Math.random() * 44) | 0},${g | 0},${(48 + Math.random() * 30) | 0},${0.05 + Math.random() * 0.08})`;
    x.beginPath();
    x.arc(Math.random() * N, Math.random() * N, r, 0, 7);
    x.fill();
  }
  // trampled dirt worn into the grass around the center (where the camp stands)
  for (let i = 0; i < 60; i++) {
    const ang = Math.random() * 7;
    const rad = Math.random() * N * 0.28;
    const px = N / 2 + Math.cos(ang) * rad;
    const py = N / 2 + Math.sin(ang) * rad;
    const r = 14 + Math.random() * 40;
    const grd = x.createRadialGradient(px, py, r * 0.2, px, py, r);
    grd.addColorStop(0, `rgba(150,128,86,${0.18 + Math.random() * 0.22})`);
    grd.addColorStop(1, "rgba(150,128,86,0)");
    x.fillStyle = grd;
    x.beginPath();
    x.arc(px, py, r, 0, 7);
    x.fill();
  }
  // a worn dirt path crossing the field
  x.strokeStyle = "rgba(150,128,86,0.4)";
  x.lineWidth = 26;
  x.lineCap = "round";
  x.beginPath();
  x.moveTo(N * 0.5, 0);
  x.quadraticCurveTo(N * 0.58, N * 0.5, N * 0.5, N);
  x.stroke();
  // fine blade noise
  x.globalAlpha = 0.05;
  x.strokeStyle = "#3f5e28";
  for (let i = 0; i < N; i += 3) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i + 2, N);
    x.stroke();
  }
  x.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; // mapped 1:1 so the worn dirt sits under the camp
  group.add(groundMesh(tex, 0.97));
  group.add(ruralScenery());

  return { group, background: skyBackground("#bcd2ec", "#dfeaf5") };
}

export function buildBiome(id: BiomeId): BuiltBiome {
  switch (id) {
    case "urban":
      return buildUrban();
    case "rural":
      return buildRural();
    case "blueprint":
      return buildBlueprint();
  }
}
