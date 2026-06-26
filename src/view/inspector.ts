// Per-unit inspector: click a placed unit -> raycast -> show its spec sheet + an orange selection
// box. Read-only; it reads userData tags set in sceneView and looks specs up from unitSpecs.
// No engine involvement, no scene editing.

import * as THREE from "three";
import type { Studio } from "./studio";
import type { Confidence } from "../engine";
import { unitSpec, type UnitSpec } from "./unitSpecs";
import { accessorySpec, type AccessorySpec } from "./accessoryCatalog";

const BRAND_ORANGE = 0xe5661a;
const DRAG_TOLERANCE_PX = 6; // pointer travel above this is treated as an orbit drag, not a click
const SELECT_BIAS_FT = 2; // prefer a prop over a tent within this depth margin (interior add-ons)

function confidenceBadge(c: Confidence): string {
  if (c === "verified") return "<span class='ok'>&#10003; verified</span>";
  if (c === "partial") return "<span class='est'>&#9680; partial</span>";
  return "<span class='est'>&#8776; estimated</span>";
}

function row(label: string, value: string): string {
  return `<div class="row"><span>${label}</span><b>${value}</b></div>`;
}

/** Spec card for a non-tent prop (equipment / interior add-on). */
function propSpecHtml(s: AccessorySpec): string {
  const kind = s.placement === "external" ? "Equipment" : "Interior add-on";
  const rows: string[] = [];
  if (s.footprintFt) rows.push(row("Footprint", `${s.footprintFt[0]} &times; ${s.footprintFt[1]} ft`));
  if (s.heightFt !== undefined) rows.push(row("Height", `${s.heightFt} ft`));
  if (s.weightLb !== undefined) rows.push(row("Weight", `${s.weightLb} lb`));
  if (s.powerKw !== undefined) rows.push(row("Output", `${s.powerKw} kW`));
  if (s.coolingTons !== undefined) rows.push(row("Cooling", `${s.coolingTons} ton`));
  if (s.stalls !== undefined) rows.push(row("Stalls", `${s.stalls}`));
  return (
    `<b>${s.name}</b><div class="sub">${kind}</div>` +
    rows.join("") +
    `<div class="conf">${confidenceBadge(s.confidence)}</div>`
  );
}

function specHtml(s: UnitSpec): string {
  const fam = s.family === "asap" ? "ASAP" : "X-Series";
  const rows: string[] = [];
  if (s.footprintFt) rows.push(row("Footprint", `${s.footprintFt[0]} &times; ${s.footprintFt[1]} ft`));
  if (s.areaFt2 !== undefined) rows.push(row("Area", `${s.areaFt2} ft&sup2;`));
  if (s.heightFt !== undefined) rows.push(row("Height", `${s.heightFt} ft`));
  if (s.weightLb !== undefined) rows.push(row("Weight", `${s.weightLb} lb`));
  if (s.category === "hub") {
    if (s.ports !== undefined) rows.push(row("Ports", `${s.ports}`));
    if (s.portFaceFt !== undefined) rows.push(row("Port face", `${s.portFaceFt} ft`));
    if (s.acceptsFamily) {
      rows.push(row("Accepts", s.acceptsFamily.map((f) => (f === "asap" ? "ASAP" : "X-Series")).join(" + ")));
    }
    if (s.standalone) rows.push(row("Standalone", "yes"));
  } else {
    if (s.matingFaceFt !== undefined) rows.push(row("Mating face", `${s.matingFaceFt} ft`));
    if (s.setupPersonnel !== undefined) rows.push(row("Crew", `${s.setupPersonnel}`));
    if (s.setupMinCanopy !== undefined && s.setupMinFull !== undefined) {
      rows.push(row("Setup", `${s.setupMinCanopy} / ${s.setupMinFull} min`));
    }
    if (s.operatingRangeF) rows.push(row("Operating", `${s.operatingRangeF[0]} to ${s.operatingRangeF[1]} &deg;F`));
  }
  return (
    `<b>${s.name}</b><div class="sub">${fam} &middot; ${s.category}</div>` +
    rows.join("") +
    `<div class="conf">${confidenceBadge(s.confidence)}</div>`
  );
}

/** Walk up from a hit object to the group carrying the given userData tag (set in sceneView). */
function taggedGroupOf(o: THREE.Object3D | null, key: string): THREE.Object3D | null {
  let node = o;
  while (node && node.userData[key] === undefined) node = node.parent;
  return node;
}

export interface Inspector {
  reset: () => void;
}

export function setupInspector(
  studio: Studio,
  group: THREE.Group,
  opts: { onRemove?: (ref: string) => void; onRemoveProp?: (ref: string) => void } = {},
): Inspector {
  const panel = document.getElementById("inspector");
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const dom = studio.renderer.domElement;
  let highlight: THREE.BoxHelper | null = null;
  let downX = 0;
  let downY = 0;

  function clearSelection(): void {
    if (highlight) {
      studio.scene.remove(highlight);
      highlight.geometry.dispose();
      highlight = null;
    }
    if (panel) {
      panel.style.opacity = "0";
      panel.style.pointerEvents = "none";
    }
  }

  function highlightBox(obj: THREE.Object3D): void {
    if (highlight) {
      studio.scene.remove(highlight);
      highlight.geometry.dispose();
    }
    highlight = new THREE.BoxHelper(obj, BRAND_ORANGE);
    studio.scene.add(highlight);
  }

  function showPanel(html: string, onRemove: () => void): void {
    if (!panel) return;
    panel.innerHTML = html + `<button class="removebtn">Remove section</button>`;
    panel.style.opacity = "1";
    panel.style.pointerEvents = "auto";
    panel.querySelector(".removebtn")?.addEventListener("click", onRemove);
  }

  function selectUnit(unit: THREE.Object3D): void {
    highlightBox(unit);
    const ref = String(unit.userData["unitRef"]);
    const spec = unitSpec(String(unit.userData["product"]));
    if (spec) showPanel(specHtml(spec), () => opts.onRemove?.(ref));
  }

  function selectProp(prop: THREE.Object3D): void {
    highlightBox(prop);
    const ref = String(prop.userData["propRef"]);
    const spec = accessorySpec(String(prop.userData["product"]));
    if (spec) showPanel(propSpecHtml(spec), () => opts.onRemoveProp?.(ref));
  }

  dom.addEventListener("pointerdown", (e) => {
    downX = e.clientX;
    downY = e.clientY;
  });

  dom.addEventListener("pointerup", (e) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > DRAG_TOLERANCE_PX) return; // orbit drag
    const rect = dom.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, studio.camera);
    // Find the nearest tent and the nearest prop under the cursor separately.
    let unit: THREE.Object3D | null = null;
    let prop: THREE.Object3D | null = null;
    let unitDist = Infinity;
    let propDist = Infinity;
    for (const h of raycaster.intersectObjects(group.children, true)) {
      if (!prop) {
        const pg = taggedGroupOf(h.object, "propRef");
        if (pg) {
          prop = pg;
          propDist = h.distance;
        }
      }
      if (!unit) {
        const ug = taggedGroupOf(h.object, "unitRef");
        if (ug) {
          unit = ug;
          unitDist = h.distance;
        }
      }
      if (prop && unit) break;
    }
    // Prefer a prop when one is under the cursor so add-ons INSIDE a tent are removable the same way
    // as anything else (a tent wall/floor no longer steals the click), unless a tent is clearly nearer.
    if (prop && propDist <= unitDist + SELECT_BIAS_FT) selectProp(prop);
    else if (unit) selectUnit(unit);
    else clearSelection();
  });

  return { reset: clearSelection };
}
