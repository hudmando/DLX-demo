// View entry point. three.js lives in the view only; the engine stays pure (view -> engine).
// Loads data at the trust boundary, sets up the studio, and hands the scene to the camp editor:
// the user builds by adding units at mating-face "+" slots, and the engine re-derives the Bill
// on every change. Connector selection is always the engine's; this file only draws the Bill text.

import * as THREE from "three";
import rawRules from "../data/rules.json";
import rawCatalog from "../data/catalog.json";
import rawConnectors from "../data/connectors.json";
import { loadRules, loadCatalog } from "../engine";
import type { BillResult, Confidence } from "../engine";
import { setupStudio } from "./studio";
import { setupEditor } from "./editor";
import { setupCampDims } from "./campDims";
import { setupPlanView } from "./planView";
import { accessorySpec } from "./accessoryCatalog";
import { BIOMES } from "./biomes";
import type { PlacedProp } from "./campModel";

// --- data at the boundary -------------------------------------------------
const rules = loadRules(rawRules);
const { catalog, rejected } = loadCatalog(rawCatalog);
if (rejected.length) console.warn("Catalog rejected records:", rejected);

// Display names + confidence for every bill line, sourced from the data files (no magic strings).
interface NamedRecord {
  id: string;
  name: string;
  confidence?: string;
}
const LABELS = new Map<string, { name: string; confidence: Confidence }>();
for (const r of [...(rawConnectors as NamedRecord[]), ...(rawCatalog as NamedRecord[])]) {
  LABELS.set(r.id, { name: r.name, confidence: (r.confidence as Confidence) ?? "estimated" });
}

// --- scene ----------------------------------------------------------------
const container = document.getElementById("app")!;
const studio = setupStudio(container);
const campGroup = new THREE.Group();
studio.scene.add(campGroup);

// --- Bill of Connectors panel (read-only; recomputed by the engine, never stored) ---------
function renderBill(result: BillResult, unitCount: number): void {
  const panel = document.getElementById("bill");
  if (!panel) return;
  if (unitCount === 0) {
    panel.innerHTML = `<b>BILL OF CONNECTORS</b><div class='sub'>Click the + to place your first shelter.</div>`;
    panel.style.opacity = "1";
    return;
  }
  const lines = Object.entries(result.bill).map(([id, count]) => {
    const meta = LABELS.get(id);
    const name = meta?.name ?? id;
    const mark = meta && meta.confidence !== "verified" ? " <span class='est'>&#8776;</span>" : "";
    return `<div>${count} &times; ${name}${mark}</div>`;
  });
  const body = lines.length ? lines.join("") : `<div class='sub'>No connectors yet.</div>`;
  panel.innerHTML =
    `<b>BILL OF CONNECTORS</b>` +
    body +
    `<div class='sub'>${unitCount} unit${unitCount === 1 ? "" : "s"} &middot; &#8776; = estimated</div>`;
  panel.style.opacity = "1";
}

// --- Equipment tally panel (placed props; never part of the Bill of Connectors) -----------
function renderEquipment(props: PlacedProp[]): void {
  const panel = document.getElementById("equipment");
  if (!panel) return;
  if (props.length === 0) {
    panel.style.opacity = "0";
    return;
  }
  const counts = new Map<string, number>();
  for (const p of props) counts.set(p.product, (counts.get(p.product) ?? 0) + 1);
  const lines = [...counts].map(
    ([id, n]) => `<div>${n} &times; ${accessorySpec(id)?.name ?? id}</div>`,
  );
  panel.innerHTML =
    `<b>EQUIPMENT</b>` +
    lines.join("") +
    `<div class='sub'>${props.length} item${props.length === 1 ? "" : "s"} &middot; not in bill</div>`;
  panel.style.opacity = "1";
}

// --- plan view: top-down cutaway + overall camp dimension lines -----------
const campDims = setupCampDims(studio);
const planView = setupPlanView(studio, campGroup, campDims);

// --- editor: build / edit the camp; hover for dimensions; click to inspect ---------------
const editor = setupEditor(studio, campGroup, catalog, rules, renderBill, (model) => {
  campDims.rebuild(model); // recompute the overall camp dimension annotation
  planView.refresh(); // re-apply the cutaway + reframe overhead after a rebuild
  renderEquipment(model.props); // refresh the equipment tally
});
editor.setPlanView(planView); // let the editor gate interior placement on plan-view mode

// --- plan view toggle button ----------------------------------------------
const planBtn = document.getElementById("planBtn");
function syncPlanBtn(): void {
  if (planBtn) planBtn.textContent = planView.isEnabled() ? "Plan view: on" : "Plan view: off";
}
planBtn?.addEventListener("click", () => {
  planView.toggle();
  syncPlanBtn();
});
syncPlanBtn();

// --- biome cycle button ---------------------------------------------------
const biomeBtn = document.getElementById("biomeBtn");
let biomeIdx = 0;
biomeBtn?.addEventListener("click", () => {
  biomeIdx = (biomeIdx + 1) % BIOMES.length;
  const b = BIOMES[biomeIdx]!;
  studio.setBiome(b.id);
  if (biomeBtn) biomeBtn.textContent = `Biome: ${b.name}`;
});

// --- render loop ----------------------------------------------------------
studio.renderer.setAnimationLoop(() => {
  studio.controls.update();
  planView.update(); // ease the camera toward the overhead pose + reproject dim labels
  studio.renderer.render(studio.scene, studio.camera);
  editor.update(); // reposition the "+" affordance + dimension labels after the camera settles
});
