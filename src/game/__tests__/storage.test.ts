import { describe, expect, it } from "vitest";
import { createSave } from "../engine";
import {
  V1_KEY,
  V2_KEY,
  checksum,
  clearSave,
  exportSave,
  importSave,
  isValidSave,
  loadSave,
  persistSave,
  roundTrip,
} from "../storage";
import type { SaveData, SaveV1 } from "../types";

/** In-memory StorageLike used to fake localStorage. */
function fakeStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function v1Save(): SaveV1 {
  return {
    pokemon: {
      speciesId: "squirtle",
      name: "Squirtle",
      level: 9,
      xp: 55,
      hp: 24,
      maxHp: 27,
    },
    pokeballs: 3,
    berries: 1,
    caught: [{ speciesId: "rattata", level: 4, hp: 18, maxHp: 18 }],
    money: 120,
    steps: 340,
  };
}

describe("storage: load/persist", () => {
  it("loadSave returns null on empty storage", () => {
    expect(loadSave(fakeStorage())).toBeNull();
  });

  it("persistSave → loadSave round-trips the full save", () => {
    const storage = fakeStorage();
    const save = createSave("charmander");
    persistSave(save, storage);
    const loaded = loadSave(storage);
    expect(loaded).toEqual(save);
  });

  it("persistSave normalizes (clamps) before writing", () => {
    const storage = fakeStorage();
    const save = createSave("bulbasaur");
    const broken = {
      ...save,
      team: [{ ...save.team[0], level: 999, hp: -10, maxHp: 20 }],
    };
    persistSave(broken as unknown as SaveData, storage);
    const loaded = loadSave(storage)!;
    expect(loaded.team[0].level).toBe(100);
    expect(loaded.team[0].hp).toBe(0);
  });

  it("loadSave ignores corrupt v2 data and falls back to v1", () => {
    const storage = fakeStorage({ [V2_KEY]: "{not json", [V1_KEY]: JSON.stringify(v1Save()) });
    const loaded = loadSave(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.team[0].speciesId).toBe("squirtle");
  });
});

describe("storage: v1 → v2 migration", () => {
  it("migrates a v1 save into a full v2 save on load", () => {
    const storage = fakeStorage({ [V1_KEY]: JSON.stringify(v1Save()) });
    const loaded = loadSave(storage)!;
    expect(loaded.version).toBe(2);
    expect(loaded.team[0].speciesId).toBe("squirtle");
    expect(loaded.team[0].level).toBe(9);
    expect(loaded.inventory.pokeball).toBe(3);
    expect(loaded.inventory.berry).toBe(1);
    expect(loaded.money).toBe(120);
    expect(loaded.steps).toBe(340);
    expect(loaded.pokedex.squirtle).toBe("caught");
    expect(loaded.pokedex.rattata).toBe("caught");
    expect(loaded.pc.some((p) => p.speciesId === "rattata")).toBe(true);
  });

  it("persists the migrated v2 save so the next load skips migration", () => {
    const storage = fakeStorage({ [V1_KEY]: JSON.stringify(v1Save()) });
    loadSave(storage);
    expect(storage.getItem(V2_KEY)).not.toBeNull();
  });
});

describe("storage: export/import codec", () => {
  it("export → import round-trips identically", () => {
    const save = createSave("squirtle");
    save.badges = ["Boulder Badge"];
    save.money = 4321;
    save.pokedex.pidgey = "seen";
    const imported = importSave(exportSave(save));
    expect(imported).toEqual(normalize(save));
  });

  it("export → import preserves the bgmEnabled preference", () => {
    const save = createSave("charmander");
    save.bgmEnabled = false;
    expect(importSave(exportSave(save)).bgmEnabled).toBe(false);
    save.bgmEnabled = true;
    expect(importSave(exportSave(save)).bgmEnabled).toBe(true);
  });

  it("importSave rejects a corrupted checksum", () => {
    const text = exportSave(createSave("bulbasaur"));
    const tampered = text.slice(0, -4) + "0000";
    expect(() => importSave(tampered)).toThrow(/checksum/i);
  });

  it("importSave rejects unknown formats", () => {
    expect(() => importSave("hello")).toThrow();
    expect(() => importSave("POKEBANNER|v1|{}|abcd")).toThrow();
  });

  it("importSave rejects non-v2 payloads", () => {
    expect(() => importSave("POKEBANNER|v2|{}|abcd")).toThrow();
  });

  it("checksum is deterministic", () => {
    expect(checksum("abc")).toBe(checksum("abc"));
    expect(checksum("abc")).not.toBe(checksum("abd"));
  });

  it("isValidSave rejects garbage", () => {
    expect(isValidSave(null)).toBe(false);
    expect(isValidSave({ version: 1 })).toBe(false);
    expect(isValidSave(createSave("bulbasaur"))).toBe(true);
  });
});

describe("storage: clear & cross-layer round trip", () => {
  it("clearSave wipes both keys", () => {
    const storage = fakeStorage({
      [V1_KEY]: JSON.stringify(v1Save()),
      [V2_KEY]: JSON.stringify(createSave("bulbasaur")),
    });
    clearSave(storage);
    expect(storage.getItem(V1_KEY)).toBeNull();
    expect(storage.getItem(V2_KEY)).toBeNull();
  });

  it("roundTrip survives persist → load and stays battle-ready", () => {
    const storage = fakeStorage();
    const save = createSave("charmander");
    const loaded = roundTrip(save, storage);
    expect(loaded).toEqual(save);
    expect(loaded.team[0].hp).toBe(loaded.team[0].maxHp);
  });

  it("roundTrip keeps the persisted bgmEnabled flag", () => {
    const storage = fakeStorage();
    const save = { ...createSave("bulbasaur"), bgmEnabled: false };
    expect(roundTrip(save, storage).bgmEnabled).toBe(false);
  });
});

describe("storage: export/import codec edge cases", () => {
  it("importSave round-trips a save whose nickname contains a pipe character", () => {
    // Regression: the codec used to split on every "|", so a pipe inside a
    // JSON string field broke the "POKEBANNER|v2|<json>|<checksum>" format.
    const save = createSave("bulbasaur");
    const withPipe = {
      ...save,
      pc: [{ ...save.pc[0], nickname: "Ricky|Dangerous" }],
    };
    const imported = importSave(exportSave(withPipe));
    expect(imported.pc[0].nickname).toBe("Ricky|Dangerous");
    expect(imported.team[0].speciesId).toBe("bulbasaur");
  });

  it("importSave still rejects malformed payloads", () => {
    expect(() => importSave("garbage")).toThrow(/unrecognized/i);
    expect(() => importSave("POKEBANNER|v2|{}|abc")).toThrow(/checksum/i);
    expect(() => importSave("POKEBANNER|v2|{}")).toThrow(/unrecognized/i);
  });
});

function normalize<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}
