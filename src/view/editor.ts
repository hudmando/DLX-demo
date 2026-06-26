// The camp editor: build by adding units at open mating-face "+" slots, hang equipment off tent
// SIDES via per-6ft side "+" markers, drop interior add-ons into tent stalls (plan view), remove
// sections, clear. Owns the editable model and orchestrates rebuilds; the engine still derives the
// Bill on every change (via buildSceneView with snap=false, since units are placed at exact spots).

import * as THREE from "three";
import type { Studio } from "./studio";
import type { Catalog, Rules, BillResult } from "../engine";
import { buildSceneView } from "./sceneView";
import { setupInspector } from "./inspector";
import { setupHover } from "./hover";
import { emptyCamp, newRef, removeUnit, removeProp, MENU_ITEMS, type CampModel } from "./campModel";
import {
  openSlots,
  placeAtSlot,
  pointInUnit,
  sideSlots,
  tentLocalToWorld,
  boxFor,
  collidesWithCamp,
  type Slot,
} from "./campGeometry";
import { interiorSlots } from "./interiorGeom";
import { equipmentIds, interiorIds, accessorySpec } from "./accessoryCatalog";
import { viewDims } from "./viewDims";
import { suggestionsFor, type SuggestKey } from "./suggestions";
import { unitSpec } from "./unitSpecs";
import type { PlanView } from "./planView";

const SLOT_HOVER_RADIUS = 9; // ft — how near the ground cursor must be to reveal a mating-face "+"
const SIDE_OCCUPIED_FT = 3; // hide a side "+" (and block placement) when a unit already sits there
const STALL_OCCUPIED_FT = 3; // one interior add-on per stall — deny a second within this radius

export interface Editor {
  update: () => void;
  setPlanView: (pv: PlanView) => void;
}

interface AddContext {
  kind: "first" | "slot" | "side" | "interior";
  world: THREE.Vector3;
  parentRef?: string;
  localN?: THREE.Vector3;
  host?: string; // for "interior": the tent the add-on is dropped into
  local?: THREE.Vector3; // for "interior": the snapped stall center in the tent's local frame
  rotationDeg?: number; // for "side": orientation aligned to the tent
}

function unitGroupOf(o: THREE.Object3D | null): THREE.Object3D | null {
  let node = o;
  while (node && node.userData["unitRef"] === undefined) node = node.parent;
  return node;
}

function disposeChildren(g: THREE.Group): void {
  for (const child of [...g.children]) {
    child.traverse((o) => (o as Partial<THREE.Mesh>).geometry?.dispose());
    g.remove(child);
  }
}

export function setupEditor(
  studio: Studio,
  campGroup: THREE.Group,
  catalog: Catalog,
  rules: Rules,
  onResult: (result: BillResult, unitCount: number) => void,
  onRebuild?: (model: CampModel) => void,
): Editor {
  const model: CampModel = emptyCamp();
  const dom = studio.renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const plus = document.createElement("div");
  plus.id = "addplus";
  plus.textContent = "+";
  document.body.appendChild(plus);

  const menu = document.createElement("div");
  menu.id = "addmenu";
  menu.style.display = "none";
  document.body.appendChild(menu);

  // Two curated suggestion bubbles that flank the hovered "+".
  const bubbles = [0, 1].map(() => {
    const b = document.createElement("div");
    b.className = "suggest";
    document.body.appendChild(b);
    return b;
  });
  let bubblesShown = false;
  let bubbleCtx: AddContext | null = null; // which affordance the bubbles belong to
  let bubbleHideTimer = 0;

  // A pool of side "+" markers (equipment hangs off tent sides, one per 6 ft).
  const sidePluses: HTMLDivElement[] = [];

  const toast = document.createElement("div");
  toast.id = "toast";
  document.body.appendChild(toast);
  let toastTimer = 0;
  function showToast(msg: string): void {
    toast.textContent = msg;
    toast.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (toast.style.opacity = "0"), 1500);
  }

  const inspector = setupInspector(studio, campGroup, {
    onRemove: (ref) => {
      removeUnit(model, ref);
      rebuild();
    },
    onRemoveProp: (ref) => {
      removeProp(model, ref);
      rebuild();
    },
  });
  const hover = setupHover(studio, campGroup);

  let ctx: AddContext | null = null;
  let hoverSlot: Slot | null = null;
  let hoverInterior: { host: string; world: THREE.Vector3; local: THREE.Vector3 } | null = null;
  let menuOpen = false;
  let planView: PlanView | null = null;

  function rebuild(): void {
    disposeChildren(campGroup);
    const built = buildSceneView(
      { id: "camp", name: "Camp", units: model.units, connections: model.edges, props: model.props },
      catalog,
      rules,
      { snap: false },
    );
    while (built.group.children.length) campGroup.add(built.group.children[0]!);
    inspector.reset();
    hover.reset();
    onResult(built.result, model.units.length);
    onRebuild?.(model);
  }

  // --- placing tents (nodes the engine sees) --------------------------------------------------
  function addProduct(productId: string): void {
    if (ctx?.kind === "first") {
      const box = boxFor(productId, 0, 0, 0);
      if (box && collidesWithCamp(box, model)) return blocked();
      model.units.push({ ref: newRef(), product: productId, x: 0, y: 0, rotation: 0 });
    } else if (ctx?.kind === "slot" && ctx.parentRef && ctx.localN) {
      const parent = model.units.find((u) => u.ref === ctx!.parentRef);
      if (!parent) return;
      const unit = placeAtSlot(parent, ctx.localN, productId);
      const box = boxFor(unit.product, unit.x, unit.y, unit.rotation);
      if (box && collidesWithCamp(box, model)) return blocked(); // also rejects sitting on a prop
      model.units.push(unit);
      model.edges.push({ from: parent.ref, to: unit.ref });
    } else {
      return;
    }
    closeMenu();
    rebuild();
  }

  // --- placing props (never seen by the engine) -----------------------------------------------
  function addProp(productId: string): void {
    if (!ctx) return;
    if (ctx.kind === "interior" && ctx.host) {
      const host = model.units.find((u) => u.ref === ctx!.host);
      if (!host) return;
      const world = ctx.world; // already snapped to the stall center
      // one item per stall, axis-aligned to the tent (no sideways / angled placement)
      const occupied = model.props.some(
        (p) => p.host === ctx!.host && Math.hypot(p.x - world.x, -p.y - world.z) < STALL_OCCUPIED_FT,
      );
      if (occupied) return blocked("Stall occupied");
      model.props.push({
        ref: newRef(),
        product: productId,
        x: world.x,
        y: -world.z,
        rotation: host.rotation,
        host: ctx.host,
      });
    } else if (ctx.kind === "side") {
      const rot = ctx.rotationDeg ?? 0;
      const box = boxFor(productId, ctx.world.x, -ctx.world.z, rot);
      if (box && collidesWithCamp(box, model)) return blocked();
      model.props.push({ ref: newRef(), product: productId, x: ctx.world.x, y: -ctx.world.z, rotation: rot });
    } else {
      return; // equipment is only placeable from a side or interior "+"
    }
    closeMenu();
    rebuild();
  }

  function blocked(msg = "No room there"): void {
    showToast(msg);
    closeMenu();
  }

  function addMenuButton(label: string, cls: string, onClick: () => void): void {
    const b = document.createElement("button");
    b.className = `menuitem ${cls}`;
    b.textContent = label;
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
    menu.appendChild(b);
  }

  // Menu contents follow the affordance: a tent end offers shelters + HUBs; a tent side offers
  // external equipment; inside a tent (plan view) offers interior add-ons.
  function populateMenu(kind: AddContext["kind"]): void {
    while (menu.firstChild) menu.removeChild(menu.firstChild);
    if (kind === "interior") {
      for (const id of interiorIds()) addMenuButton(accessorySpec(id)?.name ?? id, "fam-interior", () => addProp(id));
    } else if (kind === "side") {
      for (const id of equipmentIds()) addMenuButton(accessorySpec(id)?.name ?? id, "fam-equip", () => addProp(id));
    } else {
      for (const item of MENU_ITEMS) {
        addMenuButton(item.name, item.family === "asap" ? "fam-asap" : "fam-x", () => addProduct(item.id));
      }
    }
  }

  function openMenu(): void {
    menuOpen = true;
    populateMenu(ctx?.kind ?? "first");
    menu.style.display = "flex";
    hideBubbles();
  }
  function closeMenu(): void {
    menuOpen = false;
    menu.style.display = "none";
  }

  // --- suggestion bubbles ---------------------------------------------------------------------
  function displayName(id: string): string {
    return unitSpec(id)?.name ?? accessorySpec(id)?.name ?? id;
  }

  /** Place a suggested id through the normal paths (from the affordance the bubbles belong to). */
  function placeSuggestion(id: string): void {
    if (bubbleCtx) ctx = bubbleCtx;
    if (accessorySpec(id)) addProp(id);
    else addProduct(id);
  }

  function suggestKey(c: AddContext): SuggestKey {
    if (c.kind === "interior") return "interior";
    if (c.kind === "side") return "side";
    if (c.kind === "first") return "first";
    const parent = model.units.find((u) => u.ref === c.parentRef);
    return viewDims(parent?.product ?? "")?.category === "hub" ? "hub-slot" : "shelter-slot";
  }

  function showBubbles(forCtx: AddContext): void {
    if (menuOpen) return;
    bubbleCtx = forCtx;
    const ids = suggestionsFor(suggestKey(forCtx));
    bubbles.forEach((el, i) => {
      const id = ids[i];
      if (!id) {
        el.style.display = "none";
        return;
      }
      el.innerHTML = `<span class="stag">suggested</span>${displayName(id)}`;
      el.onclick = (e) => {
        e.stopPropagation();
        placeSuggestion(id);
      };
      el.style.display = "block";
    });
    bubblesShown = bubbles.some((el) => el.style.display === "block");
  }

  function hideBubbles(): void {
    bubblesShown = false;
    bubbleCtx = null;
    for (const el of bubbles) el.style.display = "none";
  }

  function scheduleHideBubbles(): void {
    clearTimeout(bubbleHideTimer);
    bubbleHideTimer = window.setTimeout(hideBubbles, 160);
  }
  function cancelHideBubbles(): void {
    clearTimeout(bubbleHideTimer);
  }

  function positionBubbles(): void {
    if (!bubblesShown || !bubbleCtx) return;
    const s = project(bubbleCtx.world);
    if (!s.visible) {
      hideBubbles();
      return;
    }
    const dx = 60; // flank the "+" left and right
    bubbles[0]!.style.left = `${s.x - dx}px`;
    bubbles[0]!.style.top = `${s.y - 4}px`;
    bubbles[1]!.style.left = `${s.x + dx}px`;
    bubbles[1]!.style.top = `${s.y - 4}px`;
  }

  plus.addEventListener("pointerenter", () => {
    cancelHideBubbles();
    if (ctx) showBubbles(ctx);
  });
  plus.addEventListener("pointerleave", scheduleHideBubbles);
  for (const el of bubbles) {
    el.addEventListener("pointerenter", cancelHideBubbles);
    el.addEventListener("pointerleave", scheduleHideBubbles);
  }

  plus.addEventListener("click", (e) => {
    e.stopPropagation();
    openMenu();
  });
  document.getElementById("clearBtn")?.addEventListener("click", () => {
    model.units = [];
    model.edges = [];
    model.props = [];
    rebuild();
  });
  document.addEventListener("pointerdown", (e) => {
    const t = e.target as Node;
    const onAffordance = menu.contains(t) || plus.contains(t) || sidePluses.some((el) => el.contains(t));
    if (menuOpen && !onAffordance) closeMenu();
  });

  function setNdc(e: PointerEvent): void {
    const rect = dom.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  dom.addEventListener("pointermove", (e) => {
    if (menuOpen) return;
    setNdc(e);
    raycaster.setFromCamera(ndc, studio.camera);

    // Plan view: the "+" snaps to the nearest STALL inside the tent under the cursor.
    if (planView?.isEnabled()) {
      hoverSlot = null;
      const p = new THREE.Vector3();
      hoverInterior = null;
      if (raycaster.ray.intersectPlane(ground, p)) {
        const host = model.units.find((u) => pointInUnit(p, u, 0));
        const d = host ? viewDims(host.product) : undefined;
        if (host && d) {
          let bestLocal: THREE.Vector3 | null = null;
          let bestWorld = p.clone();
          let bestD = Infinity;
          for (const local of interiorSlots(d)) {
            const w = tentLocalToWorld(host, local);
            const dist = Math.hypot(w.x - p.x, w.z - p.z);
            if (dist < bestD) {
              bestD = dist;
              bestWorld = w;
              bestLocal = local;
            }
          }
          if (bestLocal) hoverInterior = { host: host.ref, world: bestWorld, local: bestLocal };
        }
      }
      return;
    }

    // Normal view: the "+" lands at the nearest open mating-face slot on open ground.
    hoverInterior = null;
    if (model.units.length === 0) return;
    const overUnit = raycaster
      .intersectObjects(campGroup.children, true)
      .some((h) => unitGroupOf(h.object));
    if (overUnit) {
      hoverSlot = null;
      return;
    }
    const p = new THREE.Vector3();
    hoverSlot = raycaster.ray.intersectPlane(ground, p) ? nearestSlot(p) : null;
  });

  function nearestSlot(groundPoint: THREE.Vector3): Slot | null {
    let best: Slot | null = null;
    let bestD = SLOT_HOVER_RADIUS;
    for (const s of openSlots(model)) {
      const d = Math.hypot(s.world.x - groundPoint.x, s.world.z - groundPoint.z);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  function project(world: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const v = world.clone().project(studio.camera);
    const rect = dom.getBoundingClientRect();
    return {
      x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (-v.y * 0.5 + 0.5) * rect.height,
      visible: v.z < 1,
    };
  }

  function positionAffordances(): void {
    if (!ctx) {
      plus.style.display = "none";
      return;
    }
    const s = project(ctx.world);
    // a "side" context already has its own persistent marker, so the main "+" stays hidden for it
    const showMain = ctx.kind !== "side" && s.visible;
    plus.style.display = showMain ? "block" : "none";
    plus.style.left = `${s.x}px`;
    plus.style.top = `${s.y}px`;
    menu.style.left = `${s.x}px`;
    menu.style.top = `${s.y + 16}px`;
  }

  const elCtx = new WeakMap<HTMLDivElement, AddContext>();

  /** Persistent side "+" markers along every shelter's long sides (one per 6 ft). */
  function positionSidePluses(): void {
    const hidden = menuOpen || !!planView?.isEnabled();
    const slots = hidden
      ? []
      : sideSlots(model).filter(
          (s) => !model.props.some((p) => !p.host && Math.hypot(p.x - s.world.x, -p.y - s.world.z) < SIDE_OCCUPIED_FT),
        );
    while (sidePluses.length < slots.length) {
      const el = document.createElement("div");
      el.className = "sideplus";
      el.textContent = "+";
      el.addEventListener("pointerenter", () => {
        cancelHideBubbles();
        const c = elCtx.get(el);
        if (c) showBubbles(c);
      });
      el.addEventListener("pointerleave", scheduleHideBubbles);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const c = elCtx.get(el);
        if (!c) return;
        ctx = c;
        openMenu();
      });
      document.body.appendChild(el);
      sidePluses.push(el);
    }
    slots.forEach((slot, i) => {
      const el = sidePluses[i]!;
      elCtx.set(el, { kind: "side", world: slot.world, parentRef: slot.parentRef, rotationDeg: slot.rotationDeg });
      const s = project(slot.world);
      el.style.display = s.visible ? "block" : "none";
      el.style.left = `${s.x}px`;
      el.style.top = `${s.y}px`;
    });
    for (let i = slots.length; i < sidePluses.length; i++) sidePluses[i]!.style.display = "none";
  }

  function update(): void {
    hover.update();
    if (!menuOpen) {
      if (planView?.isEnabled()) {
        ctx = hoverInterior
          ? { kind: "interior", world: hoverInterior.world, host: hoverInterior.host, local: hoverInterior.local }
          : null;
      } else if (model.units.length === 0) {
        ctx = { kind: "first", world: new THREE.Vector3(0, 0, 0) };
      } else if (hoverSlot) {
        ctx = { kind: "slot", world: hoverSlot.world, parentRef: hoverSlot.parentRef, localN: hoverSlot.localN };
      } else {
        ctx = null;
      }
    }
    positionAffordances();
    positionSidePluses();
    positionBubbles();
  }

  rebuild();
  return {
    update,
    setPlanView: (pv) => {
      planView = pv;
    },
  };
}
