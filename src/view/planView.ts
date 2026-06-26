// Plan view: the top-down "Interior View" mode. Toggling it on strips the tent roofs to reveal the
// cot-row interiors, shows any internal add-ons, locks the camera overhead, and draws the overall
// camp dimension lines. Read-only over the scene the editor builds; owns no model state.

import * as THREE from "three";
import type { Studio } from "./studio";
import type { CampDims } from "./campDims";

const FRAME_FACTOR = 1.08; // a little breathing room beyond the fitted extent
const DIM_PAD_FT = 12; // extra room for the camp dimension lines + labels outside the footprint
const MIN_DIST = 24; // ft, so a single small unit still frames sensibly
const LERP = 0.12; // camera ease toward the overhead pose

export interface PlanView {
  isEnabled: () => boolean;
  setEnabled: (on: boolean) => void;
  toggle: () => void;
  refresh: () => void; // re-apply after the camp group is rebuilt
  update: () => void; // per-frame: ease the camera + reproject dimension labels
}

export function setupPlanView(studio: Studio, campGroup: THREE.Group, campDims: CampDims): PlanView {
  let enabled = false;
  let animating = false;
  const desiredPos = new THREE.Vector3();
  const desiredTarget = new THREE.Vector3();

  /** Hide roofs / show interiors (and internal props) — or the reverse — across the whole camp. */
  function applyCutaway(on: boolean): void {
    campGroup.traverse((o) => {
      const part = o.userData["part"];
      if (part === "roof") o.visible = !on;
      else if (part === "interior") o.visible = on;
      if (o.userData["internal"]) o.visible = on;
    });
  }

  /** Frame the WHOLE camp from directly overhead: pick a height so the camp's footprint (plus room
   *  for the dimension annotation) fits inside the perspective camera's frustum, in both axes. */
  function computeOverhead(): void {
    const box = new THREE.Box3().setFromObject(campGroup);
    if (box.isEmpty()) {
      desiredTarget.set(0, 0, 0);
      desiredPos.set(0, MIN_DIST, 0.001);
      return;
    }
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const cam = studio.camera;
    const halfV = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    const halfX = (size.x / 2 + DIM_PAD_FT) * FRAME_FACTOR; // world half-extents to fit on screen
    const halfZ = (size.z / 2 + DIM_PAD_FT) * FRAME_FACTOR;
    const distForZ = halfZ / halfV; // z maps to the vertical screen axis
    const distForX = halfX / (halfV * cam.aspect); // x maps to the horizontal screen axis
    const dist = Math.max(MIN_DIST, distForZ, distForX);
    desiredTarget.set(center.x, 0, center.z);
    desiredPos.set(center.x, dist, center.z + 0.001); // tiny z so "up" stays well-defined
  }

  function setEnabled(on: boolean): void {
    if (on === enabled) return;
    enabled = on;
    if (on) {
      // Frame the whole camp from overhead on entry, then leave the camera free to orbit.
      computeOverhead();
      animating = true;
      applyCutaway(true);
      campDims.setVisible(true);
    } else {
      animating = false;
      applyCutaway(false);
      campDims.setVisible(false);
    }
  }

  // Re-apply the cutaway after a rebuild WITHOUT re-framing the camera, so the user keeps their orbit.
  function refresh(): void {
    applyCutaway(enabled);
  }

  function update(): void {
    if (enabled && animating) {
      studio.camera.position.lerp(desiredPos, LERP);
      studio.controls.target.lerp(desiredTarget, LERP);
      if (studio.camera.position.distanceTo(desiredPos) < 0.5) animating = false;
    }
    campDims.update();
  }

  return {
    isEnabled: () => enabled,
    setEnabled,
    toggle: () => setEnabled(!enabled),
    refresh,
    update,
  };
}
