import { describe, expect, it } from "vitest";
import { DEX_META, KANTO_151 } from "../constants";
import { LANGS, dexFlavor } from "../i18n";

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

describe("codex: localized flavors", () => {
  it("every Kanto species plus Celebi has a non-empty flavor in all 5 languages", () => {
    for (const id of [...KANTO_151, "celebi"]) {
      for (const lang of LANGS) {
        const flavor = dexFlavor(id, lang);
        expect(flavor.length, id + ":" + lang).toBeGreaterThan(10);
      }
    }
  });

  it("translations differ from English for fr/de/es/ja", () => {
    for (const id of ["bulbasaur", "pikachu", "snorlax", "mewtwo"]) {
      expect(dexFlavor(id, "fr")).not.toBe(dexFlavor(id, "en"));
      expect(dexFlavor(id, "de")).not.toBe(dexFlavor(id, "en"));
      expect(dexFlavor(id, "es")).not.toBe(dexFlavor(id, "en"));
      expect(dexFlavor(id, "ja")).not.toBe(dexFlavor(id, "en"));
    }
  });

  it("unknown species fall back to the English flavor", () => {
    const en = dexFlavor("missingmon", "en");
    expect(en.length).toBeGreaterThan(10);
    expect(dexFlavor("missingmon", "fr")).toBe(en);
    expect(dexFlavor("missingmon", "ja")).toBe(en);
  });
});
