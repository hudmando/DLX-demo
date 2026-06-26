import type {
  Scene,
  Catalog,
  CatalogItem,
  Rules,
  BillResult,
  Join,
  Issue,
  Bill,
  Face,
  Confidence,
  HubId,
} from "./types";
import { selectConnector } from "./selectConnector";

// Security: bound the graph so a malformed scene can't hang anything.
const MAX_NODES = 1000;
const MAX_EDGES = 4000;

const RANK: Record<Confidence, number> = { verified: 2, partial: 1, estimated: 0 };
function weaker(a: Confidence, b: Confidence): Confidence {
  return RANK[a] <= RANK[b] ? a : b;
}

function faceOf(item: CatalogItem): Face | null {
  const ft = item.matingFaceFt ?? item.portFaceFt;
  if (ft === undefined) return null;
  return { family: item.family, matingFaceFt: ft };
}

/**
 * Derive the Bill of Connectors from a scene. NEVER stored or cached — computed every call.
 * Total function: returns a typed result for any input, valid or not. Never throws; never NaN.
 *
 * Bill = (HUB nodes) + (connector edges, typed by face pair) — overview §4.4.
 */
export function buildBillOfConnectors(scene: Scene, catalog: Catalog, rules: Rules): BillResult {
  const issues: Issue[] = [];
  const joins: Join[] = [];
  const bill: Bill = {};

  if (scene.units.length > MAX_NODES || scene.connections.length > MAX_EDGES) {
    return {
      status: "invalid",
      joins: [],
      bill: {},
      issues: [{ code: "bounds", ref: "scene", message: "Scene exceeds node/edge limits." }],
    };
  }

  // Index placed nodes; whitelist product ids against the catalog. Count HUB nodes here
  // (connectors are edges, never placed nodes).
  const nodes = new Map<string, CatalogItem>();
  for (const u of scene.units) {
    const item = catalog[u.product];
    if (!item) {
      issues.push({ code: "unknown-id", ref: u.ref, message: `Unknown product '${u.product}'.` });
      continue;
    }
    nodes.set(u.ref, item);
    if (item.category === "hub") {
      const id = item.id as HubId;
      bill[id] = (bill[id] ?? 0) + 1;
    }
  }

  // One connector per connection, typed by face pair.
  for (const c of scene.connections) {
    const A = nodes.get(c.from);
    const B = nodes.get(c.to);
    if (!A || !B) {
      issues.push({
        code: "unknown-id",
        ref: `${c.from}->${c.to}`,
        message: "Connection references an unknown node.",
      });
      continue;
    }
    const fa = faceOf(A);
    const fb = faceOf(B);
    if (!fa || !fb) {
      issues.push({
        code: "missing-face",
        ref: `${c.from}->${c.to}`,
        message: "A joined node is missing a mating face.",
      });
      continue;
    }
    const connector = selectConnector(fa, fb, rules);
    if (connector === null) continue; // direct_join_allowed -> no part emitted
    joins.push({
      a: c.from,
      b: c.to,
      connector,
      facePair: [fa.family, fb.family],
      confidence: weaker(A.confidence, B.confidence),
    });
    bill[connector] = (bill[connector] ?? 0) + 1;
  }

  return { status: issues.length === 0 ? "ok" : "invalid", joins, bill, issues };
}
