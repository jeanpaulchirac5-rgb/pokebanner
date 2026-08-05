import { describe, expect, it } from "vitest";
import * as audio from "../audio";
import * as engine from "../engine";
import * as fx from "../fx";
import * as i18n from "../i18n";
import * as presentation from "../presentation";
import * as sound from "../sound";
import * as storage from "../storage";
import {
  COVERAGE_MAP,
  coverageGaps,
  coveredFunctions,
  functionsForSuite,
  suitesForFunction,
  thinnestCoverage,
} from "../coverage-map";
import type { SuiteName } from "../coverage-map";

const MODULES: Record<string, Record<string, unknown>> = {
  audio: audio as unknown as Record<string, unknown>,
  engine: engine as unknown as Record<string, unknown>,
  fx: fx as unknown as Record<string, unknown>,
  i18n: i18n as unknown as Record<string, unknown>,
  sound: sound as unknown as Record<string, unknown>,
  storage: storage as unknown as Record<string, unknown>,
  presentation: presentation as unknown as Record<string, unknown>,
};

/** Functions exported by the pure modules that the map is expected to cover. */
function exportedFunctions(): string[] {
  const names = new Set<string>();
  for (const mod of Object.values(MODULES)) {
    for (const [name, value] of Object.entries(mod)) {
      if (typeof value === "function") names.add(name);
    }
  }
  return [...names].sort();
}

describe("coverage map integrity", () => {
  it("every mapped function resolves to a real exported function", () => {
    const missing: string[] = [];
    for (const fn of coveredFunctions()) {
      const found = Object.values(MODULES).some((mod) => typeof mod[fn] === "function");
      if (!found) missing.push(fn);
    }
    expect(missing).toEqual([]);
  });

  it("every pure engine/storage/presentation function is represented in the map (no silent gaps)", () => {
    const expected = exportedFunctions();
    const mapped = new Set(coveredFunctions());
    // Some exported symbols are data (constants) or re-exports — the map
    // intentionally covers the callable logic surface. Verify nothing callable
    // that lives in the game modules is entirely absent from the map.
    const absent = expected.filter(
      (fn) =>
        !mapped.has(fn) &&
        // re-exported aliases / type-only helpers are intentionally excluded
        fn !== "SPECIES_TABLE" &&
        fn !== "KANTO_151" &&
        fn !== "spriteId" &&
        fn !== "PIXEL_UI" &&
        !fn.startsWith("__"),
    );
    // NOTE: if you add a new pure function to engine/storage/presentation,
    // this test fails and lists it — add it to COVERAGE_MAP with its suites.
    expect(absent).toEqual([]);
  });

  it("flags gaps: no mapped function may have an empty suite list", () => {
    expect(coverageGaps()).toEqual([]);
  });

  it("thinnest coverage (single-suite functions) is a non-empty maintenance checklist", () => {
    const thin = thinnestCoverage();
    expect(thin.length).toBeGreaterThan(0);
    // The previously-thin functions were expanded to a second suite and must
    // have LEFT the checklist (see loop.test.ts cross-suite coverage block).
    expect(thin).not.toContain("captureBallMult");
    expect(thin).not.toContain("clearSave");
    expect(thin).not.toContain("timePhase");
    expect(thin).not.toContain("applyItemOn");
    // Still-thin functions that remain on the maintenance list
    expect(thin).toContain("dexSize");
    expect(thin).toContain("checksum");
  });

  it("every suite listed in the map is a known suite", () => {
    const known: SuiteName[] = [
      "engine",
      "storage",
      "loop",
      "fuzz",
      "presentation",
      "audio",
      "sound",
      "i18n",
      "fx",
      "v190",
    ];
    for (const suites of Object.values(COVERAGE_MAP)) {
      for (const s of suites) {
        expect(known).toContain(s);
      }
    }
  });

  it("per-suite drill-downs return consistent sets", () => {
    expect(functionsForSuite("engine")).toContain("rollDamage");
    expect(functionsForSuite("storage")).toContain("loadSave");
    expect(functionsForSuite("presentation")).toContain("urlSpriteCombat");
    expect(functionsForSuite("fuzz")).toContain("doBattleTick");
    expect(functionsForSuite("audio")).toContain("clampVolume");
    expect(functionsForSuite("sound")).toContain("noteToFrequency");
    expect(suitesForFunction("clearSave")).toEqual(["storage", "loop"]);
    expect(suitesForFunction("captureBallMult")).toEqual(["engine", "loop"]);
    expect(suitesForFunction("effectiveVolume")).toEqual(["audio"]);
  });
});
