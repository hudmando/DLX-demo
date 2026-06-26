// Curated "what usually goes here" hints for the add-"+" affordance. Hovering the "+" surfaces two
// context-relevant suggestions (e.g. a crowd shower + generator hookup beside a shelter, cots +
// partitions inside a tent). This is a tunable data map only — placement still goes through the
// editor's normal addProduct / addProp paths, so the engine and Bill are unaffected.
//
// Each id is either a catalog shelter/HUB id (placed as a unit) or an accessories.json id (placed as
// a prop); the editor decides which by looking the id up. Keep the lists short — two per context.

export type SuggestKey = "first" | "shelter-slot" | "hub-slot" | "side" | "interior";

const MAP: Record<SuggestKey, [string, string]> = {
  // empty camp: nudge toward a common shelter + the hub that anchors a cluster
  first: ["x-32", "x-hub"],
  // open shelter end: the next tents most often mated on
  "shelter-slot": ["x-24", "asap-hub"],
  // open hub face: another shelter on the cluster
  "hub-slot": ["x-32", "asap-24"],
  // a tent side: the external equipment most often hung off a shelter (power + climate hookups)
  side: ["generator", "hvac-30"],
  // inside a tent (plan view): the fit-out items that lay out the interior
  interior: ["cot", "modular-stall"],
};

/** The (up to two) suggested product ids for a context. */
export function suggestionsFor(key: SuggestKey): string[] {
  return MAP[key] ?? [];
}
