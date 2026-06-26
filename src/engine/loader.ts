import type {
  Rules,
  Catalog,
  CatalogItem,
  Family,
  ConnectorId,
  Confidence,
} from "./types";

// Alias resolution (overview §4.2): the old "shelter-connector" id -> asap-x-connector.
const CONNECTOR_ALIASES: Record<string, ConnectorId> = {
  "shelter-connector": "asap-x-connector",
};

export function resolveConnectorId(id: string): ConnectorId {
  return (CONNECTOR_ALIASES[id] ?? id) as ConnectorId;
}

interface RawRules {
  join_model: string;
  families: Record<
    string,
    { mating_face_ft: number; self_connector: string; direct_join_allowed: boolean }
  >;
  cross_family_connector: string;
  hub: { ports: number; accepts_family: string[]; standalone: boolean };
}

/** Normalize the rules block (snake_case JSON) into the engine's typed Rules. */
export function loadRules(raw: RawRules): Rules {
  const families = {} as Rules["families"];
  for (const [fam, r] of Object.entries(raw.families)) {
    families[fam as Family] = {
      matingFaceFt: r.mating_face_ft,
      selfConnector: resolveConnectorId(r.self_connector),
      directJoinAllowed: r.direct_join_allowed,
    };
  }
  return {
    joinModel: raw.join_model,
    families,
    crossFamilyConnector: resolveConnectorId(raw.cross_family_connector),
    hub: {
      ports: raw.hub.ports,
      acceptsFamily: raw.hub.accepts_family as Family[],
      standalone: raw.hub.standalone,
    },
  };
}

interface RawCatalogItem {
  id?: string;
  name?: string;
  family?: string;
  category?: string;
  mating_face_ft?: number;
  port_face_ft?: number;
  accepts_family?: string[];
  ports?: number;
  confidence?: string;
}

// Minimal schema (engineering principles §2.1). A node needs an id, family, category, and a face.
function isValid(r: RawCatalogItem): boolean {
  if (!r.id || !r.family || !r.category) return false;
  return r.mating_face_ft !== undefined || r.port_face_ft !== undefined;
}

/**
 * Validate + normalize the catalog at the trust boundary. Bad records are QUARANTINED
 * (returned in `rejected`), never thrown and never instantiated downstream.
 */
export function loadCatalog(raw: RawCatalogItem[]): { catalog: Catalog; rejected: string[] } {
  const catalog: Catalog = {};
  const rejected: string[] = [];
  for (const r of raw) {
    if (!isValid(r)) {
      rejected.push(r.id ?? "<no-id>");
      continue;
    }
    const item: CatalogItem = {
      id: r.id!,
      name: r.name ?? r.id!,
      family: r.family as Family,
      category: r.category as CatalogItem["category"],
      confidence: (r.confidence as Confidence) ?? "estimated",
    };
    if (r.mating_face_ft !== undefined) item.matingFaceFt = r.mating_face_ft;
    if (r.port_face_ft !== undefined) item.portFaceFt = r.port_face_ft;
    if (r.accepts_family) item.acceptsFamily = r.accepts_family as Family[];
    if (r.ports !== undefined) item.ports = r.ports;
    catalog[item.id] = item;
  }
  return { catalog, rejected };
}
