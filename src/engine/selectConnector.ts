import type { Face, Rules, ConnectorId } from "./types";

/**
 * The single authoritative connector-selection rule (overview §4.4 / §4.5).
 *
 *   equal mating faces (same family) -> that family's self_connector
 *                                        (null if direct_join_allowed)
 *   unequal faces (16 vs 21.5 ft)     -> cross-family connector
 *
 * `directJoinAllowed` is read ONLY here. Never branch on it elsewhere — flipping a
 * family's flag must change every Bill of Connectors with no other code change.
 */
export function selectConnector(a: Face, b: Face, rules: Rules): ConnectorId | null {
  if (a.family === b.family) {
    const fam = rules.families[a.family];
    return fam.directJoinAllowed ? null : fam.selfConnector;
  }
  return rules.crossFamilyConnector;
}
