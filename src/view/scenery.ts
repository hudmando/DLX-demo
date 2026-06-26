// Ambient scale objects + backdrop for the urban and rural biomes (vehicles, people, portapotties,
// light poles, trees, hangars, control tower). Pure decoration: NOT in the camp model, never
// raycast for selection, never in the Bill — they exist only to make a biome read realistically and
// give a human/vehicle scale reference (1 unit = 1 ft), mirroring the DLX reference photos.
//
// Materials are created FRESH per build (not from the shared MAT library) so studio.setBiome can
// dispose the whole biome group on a swap without touching the tents' shared materials.

import * as THREE from "three";

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// --- material sets (fresh instances per biome build) ----------------------------------------
function urbanMats() {
  return {
    white: new THREE.MeshStandardMaterial({ color: 0xeef0f2, metalness: 0.1, roughness: 0.45 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xb3b8bf, metalness: 0.3, roughness: 0.4 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2a2e35, metalness: 0.3, roughness: 0.4 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x121620, metalness: 0.4, roughness: 0.15 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x141618, roughness: 0.8 }),
    pottyBlue: new THREE.MeshStandardMaterial({ color: 0x2f6cae, roughness: 0.55 }),
    pottyRoof: new THREE.MeshStandardMaterial({ color: 0xd2d7dc, roughness: 0.7 }),
    pottyDoor: new THREE.MeshStandardMaterial({ color: 0x24528a, roughness: 0.6 }),
    pole: new THREE.MeshStandardMaterial({ color: 0x3a3d42, metalness: 0.6, roughness: 0.5 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: 0xffe9a8, emissiveIntensity: 0.7, roughness: 0.4 }),
    building: new THREE.MeshStandardMaterial({ color: 0xc2c7cd, roughness: 0.85 }),
    buildingRoof: new THREE.MeshStandardMaterial({ color: 0x6f7780, roughness: 0.85 }),
    towerGlass: new THREE.MeshStandardMaterial({ color: 0x8fa6bc, metalness: 0.3, roughness: 0.2 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xc89a72, roughness: 0.7 }),
    hi: new THREE.MeshStandardMaterial({ color: 0xe5661a, roughness: 0.6 }), // hi-vis vest
    pants: new THREE.MeshStandardMaterial({ color: 0x2c3038, roughness: 0.8 }),
  };
}
type UrbanMats = ReturnType<typeof urbanMats>;

function ruralMats() {
  return {
    trunk: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 }),
    foliageA: new THREE.MeshStandardMaterial({ color: 0x3f6b34, roughness: 0.95 }),
    foliageB: new THREE.MeshStandardMaterial({ color: 0x4f7d3e, roughness: 0.95 }),
    foliageC: new THREE.MeshStandardMaterial({ color: 0x355c2c, roughness: 0.95 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xc89a72, roughness: 0.7 }),
    shirt: new THREE.MeshStandardMaterial({ color: 0x3d6b8e, roughness: 0.8 }),
    pants: new THREE.MeshStandardMaterial({ color: 0x42362a, roughness: 0.85 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x2a2c2f, metalness: 0.4, roughness: 0.55 }),
    truck: new THREE.MeshStandardMaterial({ color: 0x445a3e, metalness: 0.2, roughness: 0.5 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x121620, metalness: 0.4, roughness: 0.2 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x141618, roughness: 0.8 }),
    rock: new THREE.MeshStandardMaterial({ color: 0x8a8b86, roughness: 0.95 }),
  };
}
type RuralMats = ReturnType<typeof ruralMats>;

// --- prop builders (feet) -------------------------------------------------------------------
/** Car or van, length along local z, sitting on four wheels. */
function vehicle(body: THREE.Material, glass: THREE.Material, tire: THREE.Material, isVan: boolean): THREE.Group {
  const g = new THREE.Group();
  const r = 1.1;
  const L = isVan ? 17 : 15;
  const W = isVan ? 6.5 : 6.2;
  if (isVan) {
    const h = 5.6;
    const b = new THREE.Mesh(new THREE.BoxGeometry(W, h, L), body);
    b.position.y = r + h / 2;
    b.castShadow = b.receiveShadow = true;
    g.add(b);
    const win = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 1.5, L * 0.42), glass);
    win.position.set(0, r + h * 0.72, L * 0.2);
    g.add(win);
  } else {
    const lh = 2.0;
    const lower = new THREE.Mesh(new THREE.BoxGeometry(W, lh, L), body);
    lower.position.y = r + lh / 2;
    lower.castShadow = lower.receiveShadow = true;
    g.add(lower);
    const ch = 1.5;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, ch, L * 0.5), glass);
    cab.position.y = r + lh + ch / 2;
    g.add(cab);
  }
  const wheel = new THREE.CylinderGeometry(r, r, 0.7, 12);
  for (const sx of [-1, 1] as const)
    for (const sz of [-1, 1] as const) {
      const w = new THREE.Mesh(wheel, tire);
      w.rotation.z = Math.PI / 2; // axle along x
      w.position.set(sx * (W / 2 - 0.1), r, sz * (L / 2 - 2.2));
      g.add(w);
    }
  return g;
}

/** Simple standing figure (~5.8 ft) for human scale. */
function person(skin: THREE.Material, torso: THREE.Material, pants: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const legs = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.6, 0.7), pants);
  legs.position.y = 1.3;
  legs.castShadow = true;
  g.add(legs);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.9, 0.8), torso);
  body.position.y = 2.6 + 0.95;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), skin);
  head.position.y = 2.6 + 1.9 + 0.5;
  head.castShadow = true;
  g.add(head);
  return g;
}

function portapotty(m: UrbanMats): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4, 7, 4), m.pottyBlue);
  body.position.y = 3.5;
  body.castShadow = body.receiveShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.4, 4.3), m.pottyRoof);
  roof.position.y = 7.2;
  g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5.4, 0.12), m.pottyDoor);
  door.position.set(0, 3.1, 2.02);
  g.add(door);
  return g;
}

function lightPole(m: UrbanMats): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 1.3), m.pole);
  base.position.y = 0.4;
  g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 22, 10), m.pole);
  pole.position.y = 11;
  pole.castShadow = true;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 4), m.pole);
  arm.position.set(0, 21.4, 1.8);
  g.add(arm);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 1.1), m.lamp);
  lamp.position.set(0, 21.1, 3.6);
  g.add(lamp);
  return g;
}

function hangar(m: UrbanMats, w: number, d: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m.building);
  body.position.y = h / 2;
  body.castShadow = body.receiveShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 1.2, d + 1), m.buildingRoof);
  roof.position.y = h + 0.6;
  g.add(roof);
  return g;
}

function controlTower(m: UrbanMats): THREE.Group {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(8, 30, 8), m.building);
  shaft.position.y = 15;
  shaft.castShadow = true;
  g.add(shaft);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(13, 7, 13), m.towerGlass);
  cab.position.y = 33;
  cab.castShadow = true;
  g.add(cab);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(14, 1, 14), m.buildingRoof);
  roof.position.y = 37;
  g.add(roof);
  return g;
}

function tree(m: RuralMats, s: number): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * s, 0.75 * s, 6 * s, 7), m.trunk);
  trunk.position.y = 3 * s;
  trunk.castShadow = true;
  g.add(trunk);
  const foliage = [m.foliageA, m.foliageB, m.foliageC][(Math.random() * 3) | 0]!;
  const lower = new THREE.Mesh(new THREE.ConeGeometry(5 * s, 9 * s, 8), foliage);
  lower.position.y = 9.5 * s;
  lower.castShadow = true;
  g.add(lower);
  const upper = new THREE.Mesh(new THREE.ConeGeometry(3.6 * s, 6.5 * s, 8), foliage);
  upper.position.y = 14 * s;
  upper.castShadow = true;
  g.add(upper);
  return g;
}

// --- per-biome layouts ----------------------------------------------------------------------
/** Airport-apron context: parked vehicle rows, light poles, portapotties, hangars + tower, people. */
export function urbanScenery(): THREE.Group {
  const g = new THREE.Group();
  const m = urbanMats();
  const bodies = [m.white, m.white, m.white, m.silver, m.dark];

  // background hangars + control tower on the far (north, -z) side
  const h1 = hangar(m, 64, 28, 14);
  h1.position.set(-30, 0, -140);
  g.add(h1);
  const h2 = hangar(m, 70, 26, 12);
  h2.position.set(72, 0, -146);
  h2.rotation.y = 0.08;
  g.add(h2);
  const tower = controlTower(m);
  tower.position.set(26, 0, -118);
  g.add(tower);

  // two rows of parked vehicles along the side edges
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 12; i++) {
      const v = vehicle(bodies[(Math.random() * bodies.length) | 0]!, m.glass, m.tire, Math.random() < 0.55);
      v.position.set(side * rand(86, 92), 0, -66 + i * 12);
      g.add(v);
    }
  }

  // light poles at the corners
  for (const sx of [-1, 1] as const)
    for (const sz of [-1, 1] as const) {
      const p = lightPole(m);
      p.position.set(sx * 96, 0, sz * 96);
      p.rotation.y = rand(0, Math.PI * 2);
      g.add(p);
    }

  // a row of portapotties near one corner
  for (let i = 0; i < 4; i++) {
    const pp = portapotty(m);
    pp.position.set(-64, 0, 40 + i * 5);
    g.add(pp);
  }

  // a few people around the camp edge for human scale
  for (const [x, z] of [[10, 52], [20, 56], [-12, 50], [30, 44], [-26, 48]] as const) {
    const h = person(m.skin, Math.random() < 0.5 ? m.hi : m.dark, m.pants);
    h.position.set(x, 0, z);
    h.rotation.y = rand(0, Math.PI * 2);
    g.add(h);
  }
  return g;
}

/** Grassy-field context: a tree line ringing the camp, a couple of people, a truck + generator. */
export function ruralScenery(): THREE.Group {
  const g = new THREE.Group();
  const m = ruralMats();

  // tree line ring around the camp (with jitter)
  const N = 40;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = rand(96, 140);
    const t = tree(m, rand(0.7, 1.5));
    t.position.set(Math.cos(a) * r + rand(-10, 10), 0, Math.sin(a) * r + rand(-10, 10));
    t.rotation.y = rand(0, Math.PI * 2);
    g.add(t);
  }
  // a denser stand of woods across the back
  for (let i = 0; i < 16; i++) {
    const t = tree(m, rand(0.9, 1.6));
    t.position.set(-130 + i * 17 + rand(-6, 6), 0, -118 - rand(0, 34));
    g.add(t);
  }

  // a few scattered rocks, kept clear of the camp footprint
  for (let i = 0; i < 7; i++) {
    const a = rand(0, Math.PI * 2);
    const r = rand(62, 92);
    const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.8, 1.8)), m.rock);
    rk.position.set(Math.cos(a) * r, 0.4, Math.sin(a) * r);
    rk.castShadow = true;
    g.add(rk);
  }

  // people for scale near the camp edge
  for (const [x, z] of [[10, 50], [-14, 46]] as const) {
    const h = person(m.skin, m.shirt, m.pants);
    h.position.set(x, 0, z);
    h.rotation.y = rand(0, Math.PI * 2);
    g.add(h);
  }

  // an ambient generator box + a pickup on a worn approach
  const gen = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 3), m.metal);
  gen.position.set(48, 2, 30);
  gen.castShadow = true;
  g.add(gen);
  const truck = vehicle(m.truck, m.glass, m.tire, false);
  truck.position.set(66, 0, 56);
  truck.rotation.y = 0.7;
  g.add(truck);
  return g;
}
