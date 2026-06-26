// The locked "studio" render preset (render workflow §3) + tactical ground/grid. Extracted from
// reference/demo-engine.html. Returns the handles the app drives; owns no connection logic.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildBiome, type BiomeId } from "./biomes";

export interface Studio {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  /** Swap the ground environment (blueprint field / urban lot / rural field). */
  setBiome: (id: BiomeId) => void;
}

export function setupStudio(container: HTMLElement): Studio {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.AgXToneMapping ?? THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.add(new THREE.HemisphereLight(0xbcd2ec, 0xb6a47a, 0.55));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.7);
  sun.position.set(48, 50, 30);
  sun.target.position.set(0, 3, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 3;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 420;
  sun.shadow.camera.left = -140;
  sun.shadow.camera.right = 140;
  sun.shadow.camera.top = 140;
  sun.shadow.camera.bottom = -140;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xcdd9ec, 0.4);
  fill.position.set(-30, 22, -26);
  scene.add(fill);

  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 3000);
  camera.position.set(2, 36, 84);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 3.5, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 18;
  controls.maxDistance = 400;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.update();

  // ground environment ("biome") — swappable; disposed and replaced on setBiome.
  let biomeGroup: THREE.Group | null = null;
  function setBiome(id: BiomeId): void {
    if (biomeGroup) {
      scene.remove(biomeGroup);
      biomeGroup.traverse((o) => {
        const mesh = o as Partial<THREE.Mesh>;
        mesh.geometry?.dispose();
        const mat = mesh.material;
        if (mat) {
          for (const m of Array.isArray(mat) ? mat : [mat]) {
            const sm = m as THREE.MeshStandardMaterial;
            sm.map?.dispose();
            sm.roughnessMap?.dispose();
            m.dispose();
          }
        }
      });
    }
    const built = buildBiome(id);
    biomeGroup = built.group;
    scene.add(biomeGroup);
    scene.background = built.background;
  }
  setBiome("blueprint");

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  return { renderer, scene, camera, controls, setBiome };
}
