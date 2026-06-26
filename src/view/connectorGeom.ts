// Connector geometry, selected by the ConnectorId the ENGINE resolved. This file never imports
// or calls selectConnector and never branches on family — it only renders the part the engine
// already named. (Non-negotiable: selectConnector is the single authoritative selector.)
// Local frame: tunnel spans along z by `len` (the actual gap); +y up. Each connector matches the
// cross-section of the shelter(s) it joins, so the roofline stays continuous and no side air-gap
// shows. Profile constants are schematic geometry (not connection-rule facts), still DLX-estimated.

import * as THREE from "three";
import type { ConnectorId } from "../engine";
import { MAT } from "./materials";
import { sweptStrip, loftStrip } from "./geom";

// Family cross-sections, matched to the tents (shelterGeom: eave = height*0.625, ridge = height).
const ASAP = { hw: 8, eave: 5, ridge: 8 }; // ASAP-* 16 ft face, 8 ft tall
const X = { hw: 10.75, eave: 6.4, ridge: 10.25 }; // X-* 21.5 ft face, 10.25 ft tall

/** Dark vinyl tunnel walls + gable roof matching a family profile, spanning the gap. */
function tunnel(p: { hw: number; eave: number; ridge: number }, len: number): THREE.Group {
  const g = new THREE.Group();
  g.add(sweptStrip([[-p.hw, p.eave], [0, p.ridge], [p.hw, p.eave]], len, p.ridge, MAT.conn, 0));
  g.add(sweptStrip([[-p.hw, 0], [-p.hw, p.eave]], len, p.ridge, MAT.conn, 0));
  g.add(sweptStrip([[p.hw, 0], [p.hw, p.eave]], len, p.ridge, MAT.conn, 0));
  return g;
}

function floorGuard(width: number, len: number): THREE.Mesh {
  const fl = new THREE.Mesh(new THREE.BoxGeometry(width, 0.26, len), MAT.guard);
  fl.position.set(0, 0.13, 0);
  fl.receiveShadow = true;
  return fl;
}

/** ASAP <-> ASAP: ASAP-profile tunnel + welded V-gutter ridge cap + floor trip guard. (render §7.4) */
function asapTunnel(len: number): THREE.Group {
  const g = tunnel(ASAP, len);
  const gut = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, len), MAT.conn); // V-gutter signature
  gut.position.set(0, ASAP.ridge + 0.12, 0);
  gut.rotation.z = Math.PI / 4;
  gut.castShadow = true;
  g.add(gut);
  g.add(floorGuard(4, len));
  return g;
}

/** X <-> X: clean X-profile tunnel (its roof is the cover) + floor trip guard. (render §7.4) */
function xTunnel(len: number): THREE.Group {
  const g = tunnel(X, len);
  g.add(floorGuard(5, len));
  return g;
}

/** ASAP(16) <-> X(21.5): lofted bridge whose walls + roof absorb the face mismatch. (render §7.4) */
function crossTunnel(len: number): THREE.Group {
  const aR: [number, number][] = [[-ASAP.hw, ASAP.eave], [0, ASAP.ridge], [ASAP.hw, ASAP.eave]];
  const xR: [number, number][] = [[-X.hw, X.eave], [0, X.ridge], [X.hw, X.eave]];
  const aL: [number, number][] = [[-ASAP.hw, 0], [-ASAP.hw, ASAP.eave]];
  const xL: [number, number][] = [[-X.hw, 0], [-X.hw, X.eave]];
  const aRt: [number, number][] = [[ASAP.hw, 0], [ASAP.hw, ASAP.eave]];
  const xRt: [number, number][] = [[X.hw, 0], [X.hw, X.eave]];
  const g = new THREE.Group(); // A (-z) = X end, B (+z) = ASAP end
  g.add(loftStrip(xR, aR, len, MAT.conn));
  g.add(loftStrip(xL, aL, len, MAT.conn));
  g.add(loftStrip(xRt, aRt, len, MAT.conn));
  g.add(floorGuard(5, len));
  return g;
}

/** Render the connector the engine chose. Exhaustive over ConnectorId — a new id is a compile error. */
export function buildConnector(id: ConnectorId, len: number): THREE.Group {
  switch (id) {
    case "asap-connector":
      return asapTunnel(len);
    case "x-connector":
      return xTunnel(len);
    case "asap-x-connector":
      return crossTunnel(len);
  }
}
