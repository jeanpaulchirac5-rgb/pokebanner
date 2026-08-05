// ---------------------------------------------------------------------------
// v1.9.0 "The Master's Path" — test suite.
//
// Covers the four pillars of the update end-to-end at the pure-engine level:
//   1. Indigo League & the Elite Four (gauntlet + Champion crown)
//   2. Route Trainers & the Rival (encounter rolls + rewards)
//   3. Happiness & Friendship (tiers, bonuses, bond evolutions)
//   4. Save Export / Import (JSON codec, checksums, v1 migration, round-trips)
//
// Everything is deterministic: rng is injected (lcg or scripted sequences) and
// every save flows through normalizeSave, so no test depends on the wall clock
// or Math.random.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";

import {
  LEAGUE,
  RIVAL_POOL,
  TRAINER_NAMES,
  TRAINER_POOL,
  TUNING,
  getSpecies,
} from "./constants";
import { LANGS, localizedLeagueName } from "./i18n";
import {
  addHappiness,
  buildEncounter,
  checkFriendshipEvolution,
  computeVictoryRewards,
  createSave,
  expShare,
  happinessDamageBonus,
  happinessOf,
  happinessTier,
  happinessXpBonus,
  isLeagueChampionMember,
  leaderMovesFor,
  leagueBookkeeping,
  lcg,
  makePokemon,
  normalizePokemon,
  normalizeSave,
  rollDamage,
  setupLeagueMember,
} from "./engine";
import {
  checksum,
  exportSave,
  importSave,
  loadSave,
  roundTrip,
  type StorageLike,
} from "./storage";
import type { Encounter, Rng, SaveV1 } from "./types";

/** Scripted rng: returns vals[i] for call i, clamping at the last value. */
const seq = (vals: number[]): Rng => {
  let i = 0;
  return () => vals[Math.min(i++, vals.length - 1)];
};

/** Fresh in-memory storage double (mirrors the StorageLike contract). */
const fakeStorage = (): StorageLike => {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
};

// ---------------------------------------------------------------------------
// 1. Elite Four & Pokémon League
// ---------------------------------------------------------------------------

describe("v1.9.0 · Indigo League & Elite Four", () => {
  it("has the canonical five-member gauntlet (four Elite Four + Blue)", () => {
    expect(LEAGUE).toHaveLength(5);
    expect(LEAGUE.map((m) => m.name)).toEqual([
      "Lorelei",
      "Bruno",
      "Agatha",
      "Lance",
      "Blue",
    ]);
    expect(LEAGUE[4].title).toContain("Champion");
  });

  it("setupLeagueMember builds each member boss-scaled, one step harder per slot", () => {
    LEAGUE.forEach((member, i) => {
      const enc = setupLeagueMember(20, i);
      expect(enc.kind).toBe("elite");
      expect(enc.speciesId).toBe(member.speciesId);
      expect(enc.championId).toBe(member.id);
      expect(enc.level).toBe(20 + 4 + i);
      expect(enc.isBoss).toBe(true);
      expect(enc.hpScale).toBe(2.0);
      expect(enc.atkScale).toBe(1.6);
    });
  });

  it("setupLeagueMember rotation wraps back to Lorelei after a clear", () => {
    const enc = setupLeagueMember(20, 5); // index 5 → LEAGUE[0]
    expect(enc.speciesId).toBe(LEAGUE[0].speciesId);
    expect(enc.level).toBe(24); // step resets to 0
  });

  it("localizedLeagueName resolves every member in all five languages", () => {
    for (const member of LEAGUE) {
      for (const lang of LANGS) {
        const name = localizedLeagueName(member.id, lang);
        expect(name.length).toBeGreaterThan(0);
        expect(name).not.toBe(member.id); // a real localized string, not a fallback
      }
    }
  });

  it("isLeagueChampionMember flags only the final member", () => {
    for (const m of LEAGUE) {
      expect(isLeagueChampionMember(m.id)).toBe(m.id === "blue");
    }
    expect(isLeagueChampionMember(undefined)).toBe(false);
    expect(isLeagueChampionMember("bogus")).toBe(false);
  });

  it("leagueBookkeeping advances the rotation, counts wins, and crowns the Champion", () => {
    const save = createSave("bulbasaur");
    const r1 = leagueBookkeeping(save, "lorelei");
    expect(r1.save.leagueIndex).toBe(1);
    expect(r1.save.leagueWins).toBe(1);
    expect(r1.save.leagueChampion).toBe(false);
    expect(r1.memberName).toBe("Lorelei");
    expect(r1.champion).toBe(false);

    const r2 = leagueBookkeeping(r1.save, "blue");
    expect(r2.save.leagueIndex).toBe(2);
    expect(r2.save.leagueWins).toBe(2);
    expect(r2.champion).toBe(true);
    expect(r2.save.leagueChampion).toBe(true); // latches permanently
  });

  it("leagueBookkeeping ignores unknown member ids", () => {
    const save = createSave("bulbasaur");
    const r = leagueBookkeeping(save, "not-a-member");
    expect(r.save.leagueIndex).toBe(0);
    expect(r.save.leagueWins).toBe(0);
    expect(r.memberName).toBeNull();
    expect(r.champion).toBe(false);
  });

  it("elite victories pay the richest purses — Champion out-earns the Four", () => {
    const rng = lcg(7); // elite branch never consumes the rng
    const four: Encounter = {
      kind: "elite",
      speciesId: "gengar",
      level: 30,
      shiny: false,
      isBoss: true,
      championId: "agatha",
    };
    const champ: Encounter = {
      kind: "elite",
      speciesId: "charizard",
      level: 32,
      shiny: false,
      isBoss: true,
      championId: "blue",
    };
    const elite = computeVictoryRewards(four, rng);
    const final = computeVictoryRewards(champ, rng);
    expect(elite.moneyGain).toBe(TUNING.moneyPerElite);
    expect(final.moneyGain).toBe(TUNING.moneyPerLeagueChampion);
    expect(final.moneyGain).toBeGreaterThan(elite.moneyGain);
    // Both elites share the same ×3 XP multiplier; the Champion's higher
    // level yields a slightly bigger baseline before the multiplier.
    expect(final.xpGain).toBeGreaterThan(elite.xpGain);
  });
});

// ---------------------------------------------------------------------------
// 2. Route Trainers & the Rival
// ---------------------------------------------------------------------------

describe("v1.9.0 · Route Trainers & the Rival", () => {
  it("buildEncounter rolls a trainer inside its probability band", () => {
    const enc = buildEncounter({
      poolIds: TRAINER_POOL,
      levelRange: [8, 12],
      night: false,
      allowRocket: true,
      rng: seq([0.06, 0.5, 0.5, 0.5]),
    });
    expect(enc.kind).toBe("trainer");
    expect(TRAINER_NAMES).toContain(enc.trainerName);
    expect(TRAINER_POOL).toContain(enc.speciesId);
    expect(enc.level).toBeGreaterThanOrEqual(8);
    expect(enc.level).toBeLessThanOrEqual(12);
  });

  it("buildEncounter rolls the Rival above trainers, a cut higher in level", () => {
    const enc = buildEncounter({
      poolIds: TRAINER_POOL,
      levelRange: [8, 12],
      night: false,
      allowRocket: true,
      rng: seq([0.18, 0.5]),
    });
    expect(enc.kind).toBe("rival");
    expect(RIVAL_POOL).toContain(enc.speciesId);
    expect(enc.level).toBe(14); // levelRange max + 2
  });

  it("trainers and the Rival are suppressed when allowRocket is false (v1.8.0 compat)", () => {
    const enc = buildEncounter({
      poolIds: TRAINER_POOL,
      levelRange: [8, 12],
      night: false,
      allowRocket: false,
      rng: seq([0.06, 0.5, 0.5]),
    });
    expect(enc.kind).toBe("wild");
  });

  it("trainer wins pay a purse and boosted XP", () => {
    const enc: Encounter = {
      kind: "trainer",
      speciesId: "geodude",
      level: 10,
      shiny: false,
      trainerName: "Hiker",
    };
    const r = computeVictoryRewards(enc, lcg(3));
    const base = Math.floor(TUNING.xpPerWildBase + 10 * 4 + getSpecies("geodude").xpYield / 3);
    expect(r.moneyGain).toBe(TUNING.moneyPerTrainer);
    expect(r.xpGain).toBe(Math.floor(base * TUNING.trainerXpMult));
    expect(r.badgeAwarded).toBeNull();
  });

  it("rival wins pay a boss purse, boosted XP, and sometimes a Great Ball", () => {
    const enc: Encounter = { kind: "rival", speciesId: "pikachu", level: 12, shiny: false };
    const r = computeVictoryRewards(enc, lcg(3));
    const base = Math.floor(TUNING.xpPerWildBase + 12 * 4 + getSpecies("pikachu").xpYield / 3);
    expect(r.moneyGain).toBe(TUNING.moneyPerRival);
    expect(r.xpGain).toBe(Math.floor(base * TUNING.rivalXpMult));
    expect([null, "greatball"]).toContain(r.itemAwarded);

    const lucky = computeVictoryRewards(enc, seq([0.1]));
    expect(lucky.itemAwarded).toBe("greatball");
  });

  it("trainer/rival encounters build into real enemies with the same stats", () => {
    const enc = buildEncounter({
      poolIds: TRAINER_POOL,
      levelRange: [8, 12],
      night: false,
      allowRocket: true,
      rng: seq([0.06, 0.5, 0.5, 0.5]),
    });
    const mon = makePokemon(enc.speciesId, enc.level, {});
    expect(mon.speciesId).toBe(enc.speciesId);
    expect(mon.level).toBe(enc.level);
    expect(mon.maxHp).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Happiness & Friendship
// ---------------------------------------------------------------------------

describe("v1.9.0 · Happiness & Friendship", () => {
  it("happinessOf defaults old saves and clamps into 0..255", () => {
    expect(happinessOf(undefined)).toBe(TUNING.happinessStart);
    expect(happinessOf(makePokemon("pikachu", 10))).toBe(TUNING.happinessStart);
    expect(happinessOf(makePokemon("pikachu", 10, { happiness: 999 }))).toBe(255);
    expect(happinessOf(makePokemon("pikachu", 10, { happiness: -5 }))).toBe(0);
  });

  it("addHappiness clamps into 0..255", () => {
    expect(addHappiness(TUNING.happinessStart, 30)).toBe(TUNING.happinessStart + 30);
    expect(addHappiness(undefined, 30)).toBe(TUNING.happinessStart + 30);
    expect(addHappiness(250, 10)).toBe(255);
    expect(addHappiness(10, -20)).toBe(0);
  });

  it("happinessTier buckets by friendship", () => {
    expect(happinessTier(0)).toBe("neutral");
    expect(happinessTier(TUNING.happinessFriendly - 1)).toBe("neutral");
    expect(happinessTier(TUNING.happinessFriendly)).toBe("friendly");
    expect(happinessTier(TUNING.happinessHappy)).toBe("happy");
    expect(happinessTier(TUNING.happinessBest)).toBe("best");
  });

  it("friendship grants XP and damage multipliers at the tuned thresholds", () => {
    expect(happinessXpBonus(0)).toBe(1);
    expect(happinessXpBonus(TUNING.happinessFriendly)).toBe(1 + TUNING.happinessXpFriendly);
    expect(happinessXpBonus(TUNING.happinessBest)).toBe(1 + TUNING.happinessXpBest);
    expect(happinessDamageBonus(0)).toBe(1);
    expect(happinessDamageBonus(TUNING.happinessHappy)).toBe(1 + TUNING.happinessDmgHappy);
    expect(happinessDamageBonus(TUNING.happinessBest)).toBe(1 + TUNING.happinessDmgBest);
  });

  it("the friendship damage multiplier flows into rollDamage", () => {
    const attacker = makePokemon("charmander", 25);
    const defender = makePokemon("pikachu", 25, { defScale: 2 });
    const move = leaderMovesFor(attacker).find((m) => m.power > 0);
    expect(move).toBeDefined();
    const noop = rollDamage(attacker, defender, move!, seq([0.5, 0.99, 0.5]), { happyMult: 1 });
    const base = rollDamage(attacker, defender, move!, seq([0.5, 0.99, 0.5]), {});
    const boosted = rollDamage(attacker, defender, move!, seq([0.5, 0.99, 0.5]), {
      happyMult: 1.1,
    });
    expect(noop.damage).toBe(base.damage); // happyMult 1 ≡ default
    expect(boosted.damage).toBeGreaterThanOrEqual(base.damage);
    expect(base.damage).toBeGreaterThan(0);
  });

  it("checkFriendshipEvolution evolves from the bond alone", () => {
    const justShy = makePokemon("pikachu", 30, { happiness: 149 });
    expect(checkFriendshipEvolution(justShy)).toBeNull();

    const bonded = { ...justShy, happiness: 150 };
    const res = checkFriendshipEvolution(bonded);
    expect(res?.evolved).toBe(true);
    expect(res?.newSpeciesId).toBe("raichu");

    // Level is irrelevant — a level-5 bonded pikachu still evolves.
    const early = makePokemon("pikachu", 5, { happiness: 150 });
    expect(checkFriendshipEvolution(early)?.newSpeciesId).toBe("raichu");
  });

  it("normalizePokemon backfills happiness for pre-v1.9.0 mons", () => {
    const legacy = normalizePokemon({
      speciesId: "pikachu",
      name: "Pikachu",
      level: 10,
      hp: 25,
      maxHp: 25,
      atk: 12,
      def: 11,
      xp: 0,
      status: "none",
      statusTurns: 0,
      shiny: false,
    });
    expect(legacy.happiness).toBe(TUNING.happinessStart);
  });

  it("expShare applies the per-member friendship XP bonus", () => {
    const team = [
      makePokemon("pikachu", 5, { happiness: 220 }), // best → ×1.1
      makePokemon("bulbasaur", 5, { happiness: 60 }), // friendly → ×1.05
      makePokemon("squirtle", 5, { happiness: 10 }), // neutral → ×1
    ];
    const res = expShare(team, 100, 1);
    expect(res.team[0].xp).toBe(110); // 100 × 1.1
    expect(res.team[1].xp).toBe(52); // 100 × 0.5 × 1.05 = 52.5 → floor
    expect(res.team[2].xp).toBe(50); // 100 × 0.5
    expect(res.leveled).toEqual([]);
    expect(res.evolved).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4. Save Export / Import (JSON)
// ---------------------------------------------------------------------------

describe("v1.9.0 · Save Export / Import", () => {
  it("fresh saves seed every Master's Path field", () => {
    const save = createSave("rowlet");
    expect(save.leagueIndex).toBe(0);
    expect(save.leagueWins).toBe(0);
    expect(save.leagueChampion).toBe(false);
    expect(save.trainersDefeated).toBe(0);
    expect(save.rivalDefeated).toBe(0);
    expect(save.team[0].happiness).toBe(TUNING.happinessStart);
  });

  it("exportSave → importSave round-trips a full save", () => {
    const save = createSave("rowlet");
    const text = exportSave(save);
    expect(text.startsWith("POKEBANNER|v2|")).toBe(true);
    const restored = importSave(text);
    expect(restored).toEqual(normalizeSave(save));
  });

  it("the codec survives '|' characters inside nickname fields", () => {
    const save = createSave("rowlet");
    save.team[0].nickname = "Ricky|Dangerous";
    const restored = importSave(exportSave(save));
    expect(restored.team[0].nickname).toBe("Ricky|Dangerous");
  });

  it("importSave rejects tampered payloads via the checksum", () => {
    const text = exportSave(createSave("rowlet"));
    const flip = text.endsWith("0") ? "1" : "0";
    const tampered = text.slice(0, -1) + flip;
    expect(() => importSave(tampered)).toThrow(/checksum/i);
  });

  it("importSave rejects unknown formats and invalid payloads", () => {
    expect(() => importSave("not-a-save")).toThrow(/format/i);
    expect(() => importSave("POKEBANNER|v2|{}|00000000")).toThrow();
    expect(() => importSave("POKEBANNER|v1|{}|00000000")).toThrow(/format/i);
  });

  it("roundTrip through storage preserves the v1.9.0 fields", () => {
    const save = createSave("rowlet");
    save.trainersDefeated = 3;
    save.rivalDefeated = 1;
    save.leagueWins = 4;
    save.leagueChampion = true;
    const rt = roundTrip(save, fakeStorage());
    expect(rt.trainersDefeated).toBe(3);
    expect(rt.rivalDefeated).toBe(1);
    expect(rt.leagueWins).toBe(4);
    expect(rt.leagueChampion).toBe(true);
  });

  it("loadSave migrates a v1 save and backfills the new fields", () => {
    const v1: SaveV1 = {
      version: 1,
      pokemon: { speciesId: "charmander", name: "Charmander", level: 7, xp: 20, hp: 30, maxHp: 32 },
      pokeballs: 4,
      berries: 2,
      caught: [{ speciesId: "pidgey", level: 4, hp: 20, maxHp: 20 }],
      money: 120,
      steps: 300,
    };
    const storage = fakeStorage();
    storage.setItem("poke-banner-save", JSON.stringify(v1));
    const migrated = loadSave(storage);
    expect(migrated).not.toBeNull();
    expect(migrated!.version).toBe(2);
    expect(migrated!.trainersDefeated).toBe(0);
    expect(migrated!.rivalDefeated).toBe(0);
    expect(migrated!.leagueIndex).toBe(0);
    expect(migrated!.leagueChampion).toBe(false);
    expect(migrated!.team[0].happiness).toBe(TUNING.happinessStart);
    expect(migrated!.money).toBe(120);
  });

  it("checksum is deterministic and change-sensitive", () => {
    expect(checksum("hello")).toBe(checksum("hello"));
    expect(checksum("hello")).not.toBe(checksum("hellp"));
    expect(checksum("")).toBe("1505"); // djb2 of the empty string
  });
});
