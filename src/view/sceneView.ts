// The bridge from engine -> 3D. This module is the ONLY place the view derives connectors, and it
// does so by calling the engine's buildBillOfConnectors — it never re-derives connector logic.
// Connector meshes are placed strictly from result.joins (the engine's typed output).
//
// Layout: units are snapped face-to-face (a small BFS) so every mating face sits exactly the
// connector gap apart, and each connector is seated in that gap. The connection is assumed
// end-to-end along each unit's length axis; the support function below projects the ORIENTED
// footprint, so if DLX confirms side-face mating (verify-item #7) the geometry still follows.

import * as THREE from "three";
import { buildBillOfConnectors } from "../engine";
import type { Catalog, Rules, BillResult } from "../engine";
import { buildShelter, buildHub } from "./shelterGeom";
import { buildConnector } from "./connectorGeom";
import { buildProp } from "./propGeom";
import { buildFloor } from "./interiorGeom";
import { viewDims } from "./viewDims";
import { accessoryDims } from "./accessoryCatalog";
import { CONNECTOR_GAP_FT, LENGTH_ALONG_X } from "./constants";

const Z_AXIS = new THREE.Vector3(0, 0, 1);

export interface LayoutUnit {
  ref: string;
  product: string;
  x: number;
  y: number;
  rotation: number;
}
export interface LayoutConnection {
  from: string;
  to: string;
}
export interface LayoutProp {
  ref: string;
  product: string; // an accessories.json id
  x: number;
  y: number;
  rotation: number;
  host?: string;
}
export interface PresetLayout {
  id: string;
  name: string;
  units: LayoutUnit[];
  connections: LayoutConnection[];
  props?: LayoutProp[];
}

/** Top-down feet (x east, y north) -> three world (x east, z = -north, y up). 1 unit = 1 ft. */
function worldPos(u: LayoutUnit): THREE.Vector3 {
  return new THREE.Vector3(u.x, 0, -u.y);
}

/** World rotation about y for a unit (base turn + its authored rotation). */
function worldYaw(u: LayoutUnit): number {
  return LENGTH_ALONG_X + THREE.MathUtils.degToRad(u.rotation);
}

/**
 * Half-extent of a unit's oriented footprint along a world axis (the support function of the
 * rotated rectangle): how far its face stands from its center in direction `axis`. End-to-end
 * joins project the length; a 90°-rotated spoke projects the same way without special-casing.
 */
function supportExtent(u: LayoutUnit, axis: THREE.Vector3): number {
  const dims = viewDims(u.product);
  if (!dims) return 0;
  const a = worldYaw(u);
  const lengthDir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)); // local +z in world
  const widthDir = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)); // local +x in world
  return (dims.L / 2) * Math.abs(lengthDir.dot(axis)) + (dims.W / 2) * Math.abs(widthDir.dot(axis));
}

function axisFromTo(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 {
  const v = new THREE.Vector3().subVectors(to, from);
  v.y = 0;
  return v.lengthSq() < 1e-9 ? new THREE.Vector3(1, 0, 0) : v.normalize();
}

/** The local outward face normal (cardinal: ±x or ±z) pointing from one center toward another. */
function localMatedNormal(self: THREE.Vector3, neighbor: THREE.Vector3, yaw: number): THREE.Vector3 {
  const dx = neighbor.x - self.x;
  const dz = neighbor.z - self.z;
  const lx = dx * Math.cos(yaw) - dz * Math.sin(yaw); // world -> local (rotate by -yaw)
  const lz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
  return Math.abs(lx) >= Math.abs(lz)
    ? new THREE.Vector3(Math.sign(lx), 0, 0)
    : new THREE.Vector3(0, 0, Math.sign(lz));
}

export interface SceneView {
  group: THREE.Group;
  result: BillResult;
}

export interface SceneViewOpts {
  /** false = trust the layout's exact x/y (editor mode); true = BFS re-snap from anchors (presets). */
  snap?: boolean;
}

export function buildSceneView(
  layout: PresetLayout,
  catalog: Catalog,
  rules: Rules,
  opts: SceneViewOpts = {},
): SceneView {
  const snap = opts.snap ?? true;
  // Engine input is just nodes + edges; the engine owns connector selection + the bill.
  const result = buildBillOfConnectors(
    {
      units: layout.units.map((u) => ({ ref: u.ref, product: u.product })),
      connections: layout.connections.map((c) => ({ from: c.from, to: c.to })),
    },
    catalog,
    rules,
  );

  const group = new THREE.Group();

  // Index renderable units (those with known dims; unknown ids are already in result.issues).
  const unitByRef = new Map<string, LayoutUnit>();
  for (const u of layout.units) {
    if (viewDims(u.product)) unitByRef.set(u.ref, u);
  }

  // Undirected adjacency over renderable units.
  const adj = new Map<string, string[]>();
  for (const c of layout.connections) {
    if (!unitByRef.has(c.from) || !unitByRef.has(c.to)) continue;
    (adj.get(c.from) ?? adj.set(c.from, []).get(c.from)!).push(c.to);
    (adj.get(c.to) ?? adj.set(c.to, []).get(c.to)!).push(c.from);
  }

  // Centers: in editor mode (snap=false) trust the layout's exact positions. In preset mode
  // (snap=true) BFS from each component root (kept at its anchor) and reposition each child so its
  // mating face sits CONNECTOR_GAP_FT from its parent's face, along the authored anchor direction.
  const anchor = new Map<string, THREE.Vector3>();
  for (const u of unitByRef.values()) anchor.set(u.ref, worldPos(u));
  const center = new Map<string, THREE.Vector3>();

  if (!snap) {
    for (const u of unitByRef.values()) center.set(u.ref, worldPos(u));
  } else {
    const visited = new Set<string>();
    for (const root of unitByRef.values()) {
      if (visited.has(root.ref)) continue;
      center.set(root.ref, anchor.get(root.ref)!.clone());
      visited.add(root.ref);
      const queue = [root.ref];
      while (queue.length) {
        const pRef = queue.shift()!;
        const pUnit = unitByRef.get(pRef)!;
        const pCenter = center.get(pRef)!;
        for (const cRef of adj.get(pRef) ?? []) {
          if (visited.has(cRef)) continue;
          visited.add(cRef);
          const cUnit = unitByRef.get(cRef)!;
          const axis = axisFromTo(anchor.get(pRef)!, anchor.get(cRef)!); // intended direction
          const pFace = pCenter.clone().addScaledVector(axis, supportExtent(pUnit, axis));
          const cCenter = pFace.addScaledVector(axis, CONNECTOR_GAP_FT + supportExtent(cUnit, axis));
          center.set(cRef, cCenter);
          queue.push(cRef);
        }
      }
    }
  }

  // Place nodes at their snapped centers. Shelters get a gable; HUBs get a quad-pitch hip roof.
  for (const u of unitByRef.values()) {
    const dims = viewDims(u.product)!;
    const mesh = dims.category === "hub" ? buildHub(dims) : buildShelter(dims);
    mesh.position.copy(center.get(u.ref)!);
    mesh.rotation.y = worldYaw(u);
    mesh.userData["unitRef"] = u.ref; // tag for the inspector raycaster
    mesh.userData["product"] = u.product;
    // Which local faces are mated to a neighbor — so the hover outline can hide buried floor edges.
    const yaw = worldYaw(u);
    const selfCenter = center.get(u.ref)!;
    mesh.userData["matedNormals"] = (adj.get(u.ref) ?? [])
      .map((nb) => center.get(nb))
      .filter((c): c is THREE.Vector3 => !!c)
      .map((nb) => localMatedNormal(selfCenter, nb, yaw));
    // Floor slab — every unit (ASAP, X, HUB) gets one, as a child so it inherits position + yaw.
    // Always visible (normal view and plan view alike).
    mesh.add(buildFloor(dims));
    group.add(mesh);
  }

  // Connector edges: one mesh per engine join, typed by the engine, seated in the gap between
  // the two snapped mating faces and stretched to fill it. (Type is the engine's; we only draw it.)
  for (const join of result.joins) {
    const ca = center.get(join.a);
    const cb = center.get(join.b);
    if (!ca || !cb) continue;
    const axis = axisFromTo(ca, cb);
    const faceA = ca.clone().addScaledVector(axis, supportExtent(unitByRef.get(join.a)!, axis));
    const faceB = cb.clone().addScaledVector(axis, -supportExtent(unitByRef.get(join.b)!, axis));
    const span = new THREE.Vector3().subVectors(faceB, faceA);
    const len = span.length();
    const conn = buildConnector(join.connector, Math.max(len, 0.2));
    conn.position.copy(faceA).add(faceB).multiplyScalar(0.5);
    // Orient along the join. The cross-family connector is asymmetric (local +z = ASAP end,
    // -z = X end per connectorGeom), so steer it by FAMILY, not by a/b order: flip when `a` is
    // the ASAP side so the X end always faces the X unit.
    const orient = span.clone();
    if (join.connector === "asap-x-connector" && join.facePair[0] === "asap") orient.negate();
    if (len > 1e-6) conn.quaternion.setFromUnitVectors(Z_AXIS, orient.normalize());
    group.add(conn);
  }

  // Non-tent props (equipment + interior add-ons). Pure scene decoration — NOT in the engine input
  // above, so they never affect the Bill. Internal (hosted) props start hidden; plan view shows them.
  for (const p of layout.props ?? []) {
    const d = accessoryDims(p.product);
    if (!d) continue; // unknown id — skip silently (untrusted input; never throw, never NaN)
    const prop = buildProp(p.product, d);
    prop.position.set(p.x, 0, -p.y);
    prop.rotation.y = LENGTH_ALONG_X + THREE.MathUtils.degToRad(p.rotation);
    prop.userData["propRef"] = p.ref;
    prop.userData["product"] = p.product;
    if (p.host) {
      prop.userData["internal"] = true;
      prop.visible = false;
    }
    group.add(prop);
  }

  return { group, result };
}
