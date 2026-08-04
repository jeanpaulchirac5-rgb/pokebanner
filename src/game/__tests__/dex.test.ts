import { describe, expect, it } from "vitest";
import { DEX_META, KANTO_151 } from "../constants";

describe("codex: dex metadata table", () => {
  it("covers every Kanto species plus Celebi with real size and flavor", () => {
    for (const id of [...KANTO_151, "celebi"]) {
      const meta = DEX_META[id];
      expect(meta, id).toBeDefined();
      expect(meta.heightM, id).toBeGreaterThan(0);
      expect(meta.weightKg, id).toBeGreaterThan(0);
      expect(meta.flavor.length, id).toBeGreaterThan(10);
    }
  });

  it("decorates the starters and a few legendaries with their canonical sizes", () => {
    expect(DEX_META.bulbasaur.heightM).toBeCloseTo(0.7, 1);
    expect(DEX_META.snorlax.weightKg).toBeCloseTo(460, 0);
    expect(DEX_META.onix.heightM).toBeCloseTo(8.8, 1);
  });
});
