import { describe, it, expect } from "vitest";
import rawRules from "../src/data/rules.json";
import rawCatalog from "../src/data/catalog.json";
import presets from "./fixtures/presets.json";
import { loadRules, loadCatalog } from "../src/engine/loader";
import { buildBillOfConnectors } from "../src/engine/buildBillOfConnectors";
import type { Scene } from "../src/engine/types";

const rules = loadRules(rawRules);
const { catalog, rejected } = loadCatalog(rawCatalog);

function sceneOf(p: (typeof presets)[number]): Scene {
  return {
    units: p.units.map((u) => ({ ref: u.ref, product: u.product })),
    connections: p.connections.map((c) => ({ from: c.from, to: c.to })),
  };
}

describe("catalog loads clean", () => {
  it("rejects no records", () => {
    expect(rejected).toEqual([]);
  });
});

describe("preset regression suite (engineering principles §3.5)", () => {
  for (const p of presets) {
    it(`${p.name} -> documented Bill of Connectors`, () => {
      const result = buildBillOfConnectors(sceneOf(p), catalog, rules);
      expect(result.status).toBe("ok");
      expect(result.issues).toEqual([]);
      expect(result.bill).toEqual(p.bill_of_connectors);
      // confidence propagates to every join (DoD)
      for (const j of result.joins) expect(j.confidence).toBeDefined();
    });
  }
});

describe("the direct_join_allowed toggle (overview §4.5)", () => {
  it("flipping asap to direct stops emitting asap-connector on a direct run", () => {
    const flipped = loadRules({
      ...rawRules,
      families: {
        ...rawRules.families,
        asap: { ...rawRules.families.asap, direct_join_allowed: true },
      },
    });
    const decon = presets.find((p) => p.id === "decon-lane")!;
    const result = buildBillOfConnectors(sceneOf(decon), catalog, flipped);
    expect(result.bill["asap-connector"]).toBeUndefined();
    expect(result.joins).toHaveLength(0);
  });
});

describe("untrusted input is a total function (no throw, typed result)", () => {
  it("unknown product id -> invalid status + issue, never a throw", () => {
    const scene: Scene = {
      units: [{ ref: "x", product: "not-a-real-product" }],
      connections: [],
    };
    const result = buildBillOfConnectors(scene, catalog, rules);
    expect(result.status).toBe("invalid");
    expect(result.issues[0]?.code).toBe("unknown-id");
  });
});
