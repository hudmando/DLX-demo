// DLX engine — type contract. PURE: no three.js, no DOM.
// Canonical connection model: docs/dlx-project-overview.md §4.
// This contract is consumed by BOTH surfaces (schematic planner + render export §7.7).

export type Family = "asap" | "x-series";

export type ConnectorId = "asap-connector" | "x-connector" | "asap-x-connector";
export type HubId = "asap-hub" | "x-hub";

export type Confidence = "verified" | "partial" | "estimated";

/** A face presented at a join: its family + mating-face width in feet (1 unit = 1 ft). */
export interface Face {
  family: Family;
  matingFaceFt: number;
}

/** Per-family rule block, normalized from docs/dlx-spec-sheet.md / overview §4.5. */
export interface FamilyRule {
  matingFaceFt: number;
  selfConnector: ConnectorId;
  /** The one toggle. Read ONLY inside selectConnector. */
  directJoinAllowed: boolean;
}

export interface Rules {
  joinModel: string;
  families: Record<Family, FamilyRule>;
  crossFamilyConnector: ConnectorId;
  hub: { ports: number; acceptsFamily: Family[]; standalone: boolean };
}

/** A placed node: shelter or HUB. Connectors are NEVER nodes — they are computed edges. */
export interface CatalogItem {
  id: string;
  name: string;
  family: Family;
  category: "shelter" | "hub";
  matingFaceFt?: number; // shelters
  portFaceFt?: number; // hubs
  acceptsFamily?: Family[]; // hubs (overview §4.3: both families)
  ports?: number; // hubs
  confidence: Confidence;
}

export type Catalog = Record<string, CatalogItem>;

/** Untrusted scene input — validated at the boundary before the engine touches it. */
export interface SceneNode {
  ref: string;
  product: string;
}
export interface SceneConnection {
  from: string;
  to: string;
}
export interface Scene {
  units: SceneNode[];
  connections: SceneConnection[];
}

/** One computed join (edge). confidence rides through from the joined nodes. */
export interface Join {
  a: string;
  b: string;
  connector: ConnectorId;
  facePair: [Family, Family];
  confidence: Confidence;
}

export interface Issue {
  code: "unknown-id" | "missing-face" | "cycle" | "unmatched-face" | "bounds";
  ref: string;
  message: string;
}

/** Bill of Connectors: HUB node counts + connector edge counts, typed. Always derived. */
export type Bill = Partial<Record<ConnectorId | HubId, number>>;

export interface BillResult {
  status: "ok" | "invalid";
  joins: Join[];
  bill: Bill;
  issues: Issue[];
}
