// Procedural materials + textures for the schematic view. Extracted from reference/demo-engine.html.
// Pure presentation: colors/roughness are aesthetic tuning, not connection-rule facts.

import * as THREE from "three";

function fabricAlbedo(base: string): THREE.CanvasTexture {
  const N = 512;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const x = c.getContext("2d")!;
  x.fillStyle = base;
  x.fillRect(0, 0, N, N);
  for (let i = 0; i < 200; i++) {
    const r = 18 + Math.random() * 70;
    const a = 0.025 + Math.random() * 0.045;
    x.fillStyle = `rgba(${(150 + Math.random() * 55) | 0},${(122 + Math.random() * 42) | 0},${(74 + Math.random() * 38) | 0},${a})`;
    x.beginPath();
    x.arc(Math.random() * N, Math.random() * N, r, 0, 7);
    x.fill();
  }
  x.globalAlpha = 0.05;
  x.strokeStyle = "#86713f";
  for (let i = 0; i < N; i += 3) {
    x.beginPath();
    x.moveTo(0, i);
    x.lineTo(N, i);
    x.stroke();
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i, N);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

function fabricBump(): THREE.CanvasTexture {
  const N = 512;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const x = c.getContext("2d")!;
  x.fillStyle = "#808080";
  x.fillRect(0, 0, N, N);
  x.strokeStyle = "#9a9a9a";
  for (let i = 0; i < N; i += 4) {
    x.beginPath();
    x.moveTo(0, i);
    x.lineTo(N, i);
    x.stroke();
  }
  x.strokeStyle = "#666";
  for (let i = 2; i < N; i += 4) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i, N);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

const BMP = fabricBump();

/** The shared material library. Keyed for reuse across shelter + connector builders. */
export const MAT = {
  roof: new THREE.MeshPhysicalMaterial({ map: fabricAlbedo("#cdb88f"), bumpMap: BMP, bumpScale: 0.05, roughness: 0.95, sheen: 0.2, sheenRoughness: 0.85, envMapIntensity: 0.45, side: THREE.DoubleSide }),
  wall: new THREE.MeshPhysicalMaterial({ map: fabricAlbedo("#a3855a"), bumpMap: BMP, bumpScale: 0.05, roughness: 0.95, sheen: 0.18, sheenRoughness: 0.85, envMapIntensity: 0.45, side: THREE.DoubleSide }),
  conn: new THREE.MeshPhysicalMaterial({ color: 0x1b1b1d, roughness: 0.82, sheen: 0.25, sheenRoughness: 0.7, envMapIntensity: 0.5, side: THREE.DoubleSide }),
  seam: new THREE.MeshStandardMaterial({ color: 0x84693c, roughness: 0.92 }),
  screen: new THREE.MeshStandardMaterial({ color: 0x070708, roughness: 0.62, envMapIntensity: 0.1, side: THREE.DoubleSide }),
  doorway: new THREE.MeshStandardMaterial({ color: 0x121315, roughness: 0.7, side: THREE.DoubleSide }),
  ballast: new THREE.MeshPhysicalMaterial({ color: 0xe5661a, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4, envMapIntensity: 0.7 }),
  strap: new THREE.MeshStandardMaterial({ color: 0xea6e1f, roughness: 0.7 }),
  guard: new THREE.MeshStandardMaterial({ color: 0x161618, roughness: 0.9 }),
  // --- non-tent props (generators, HVAC, showers, interior add-ons) ---------------------------
  metalEquip: new THREE.MeshStandardMaterial({ color: 0x2a2c2f, roughness: 0.55, metalness: 0.4 }),
  equipAccent: new THREE.MeshStandardMaterial({ color: 0xe5661a, roughness: 0.5, metalness: 0.2 }),
  louver: new THREE.MeshStandardMaterial({ color: 0x16181a, roughness: 0.6, metalness: 0.5, side: THREE.DoubleSide }),
  mast: new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.5, metalness: 0.6 }),
  lamp: new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: 0xffe9a8, emissiveIntensity: 0.8, roughness: 0.4 }),
  showerSkin: new THREE.MeshStandardMaterial({ color: 0xf3c41b, roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide }), // DLX Water Logix yellow
  cotFabric: new THREE.MeshStandardMaterial({ color: 0x4d5a6b, roughness: 0.9, side: THREE.DoubleSide }),
  cotFrame: new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.6, metalness: 0.3 }),
  partition: new THREE.MeshStandardMaterial({ color: 0xcfd4da, roughness: 0.85, side: THREE.DoubleSide }),
  fanBlade: new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide }),
  floor: new THREE.MeshStandardMaterial({ color: 0xb8ad8c, roughness: 0.96 }),
} as const;
