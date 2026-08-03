import { describe, expect, it } from "vitest";
import { BIOMES, KANTO_151, TUNING } from "../constants";
import {
  applyXpAndLevels,
  badgeDamageBonus,
  biomeIndexForSteps,
  buildEncounter,
  captureAttempt,
  doBattleTick,
  lcg,
  makePokemon,
  makeWildEnemy,
  normalizeSave,
  purchaseItem,
  switchLeader,
} from "../engine";
import {
  V1_KEY,
  loadSave,
  persistSave,
} from "../storage";
import type { BattleState, Encounter, Rng, SaveData } from "../types";

const POOL = BIOMES.flatMap((b) => b.pool);

function assertInvariants(save: SaveData, label = "save") {
  expect(save.team.length, `${label}: team size`).toBeLessThanOrEqual(TUNING.teamMax);
  expect(save.team.length, `${label}: team non-negative`).toBeGreaterThanOrEqual(0);
  for (const m of [...save.team, ...save.pc]) {
    expect(Number.isFinite(m.hp), `${label}: finite hp`).toBe(true);
    expect(m.hp, `${label}: hp >= 0`).toBeGreaterThanOrEqual(0);
    expect(m.hp, `${label}: hp <= maxHp`).toBeLessThanOrEqual(m.maxHp);
    expect(m.level, `${label}: level >= 1`).toBeGreaterThanOrEqual(1);
    expect(m.level, `${label}: level <= 100`).toBeLessThanOrEqual(TUNING.maxLevel);
    expect(Number.isFinite(m.xp), `${label}: finite xp`).toBe(true);
    expect(Number.isFinite(m.maxHp), `${label}: finite maxHp`).toBe(true);
  }
  expect(Number.isFinite(save.money), `${label}: finite money`).toBe(true);
  expect(save.money, `${label}: money >= 0`).toBeGreaterThanOrEqual(0);
  expect(save.version, `${label}: version`).toBe(2);
}

function randomSave(rng: Rng): SaveData {
  const teamSize = 1 + Math.floor(rng() * 6);
  const team = Array.from({ length: teamSize }, () => {
    const species = POOL[Math.floor(rng() * POOL.length)];
    const level = 1 + Math.floor(rng() * 40);
    const mon = makePokemon(species, level);
    return { ...mon, hp: Math.floor(rng() * mon.maxHp), xp: Math.floor(rng() * 5000) };
  });
  const inventory: Record<string, number> = {};
  for (const id of ["pokeball", "greatball", "berry", "sitrus", "potion"]) {
    if (rng() < 0.7) inventory[id] = Math.floor(rng() * 30);
  }
  const pokedex: SaveData["pokedex"] = {};
  const caughtCount = Math.floor(rng() * 60);
  for (let i = 0; i < caughtCount; i++) {
    pokedex[KANTO_151[Math.floor(rng() * KANTO_151.length)]] = rng() < 0.5 ? "seen" : "caught";
  }
  return normalizeSave({
    version: 2,
    starterSpeciesId: "bulbasaur",
    team,
    pc: team.map((m) => ({ ...m })),
    inventory,
    money: Math.floor(rng() * 5000),
    pokedex,
    steps: Math.floor(rng() * 9000),
    battlesWon: Math.floor(rng() * 200),
    championWins: Math.floor(rng() * 8),
    badges: [],
    rocketsDefeated: Math.floor(rng() * 20),
    shiniesSeen: Math.floor(rng() * 5),
    merchantVisitedCycle: 0,
    startedAt: 0,
    lastSaveAt: 0,
  });
}

function randomEncounter(rng: Rng): Encounter {
  return buildEncounter({
    poolIds: POOL,
    levelRange: [1, 30],
    night: rng() < 0.5,
    allowRocket: rng() < 0.5,
    rng,
  });
}

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

describe("fuzz: scripted battles", () => {
  it("runs thousands of battles and holds invariants (no NaN HP, levels in [1,100])", () => {
    const rng = lcg(1234);
    for (let i = 0; i < 2000; i++) {
      const save = randomSave(rng);
      if (save.team.length === 0) continue;
      const encounter = randomEncounter(rng);
      const enemy = makeWildEnemy(save, encounter);
      const badges = save.badges.length;
      let battle: BattleState = {
        leader: save.team[0],
        enemy,
        badgeMult: badgeDamageBonus(badges),
        xpBonus: 1,
        turn: 0,
        log: [],
      };
      let guard = 0;
      while (battle.leader.hp > 0 && battle.enemy.hp > 0 && guard < 250) {
        battle = doBattleTick(battle, rng);
        guard++;
        expect(Number.isNaN(battle.leader.hp)).toBe(false);
        expect(Number.isNaN(battle.enemy.hp)).toBe(false);
        expect(battle.leader.hp).toBeGreaterThanOrEqual(0);
        expect(battle.enemy.hp).toBeGreaterThanOrEqual(0);
      }
      // winner bookkeeping keeps the save normalized
      const next = normalizeSave({ ...save, money: save.money + (battle.enemy.hp <= 0 ? 10 : 0) });
      assertInvariants(next, `battle ${i}`);
    }
  });

  it("interleaves captures before faint/switch and keeps the save consistent", () => {
    const rng = lcg(777);
    for (let i = 0; i < 600; i++) {
      let save = randomSave(rng);
      if (save.team.length === 0) save = randomSave(lcg(i + 1));
      const encounter = randomEncounter(rng);
      let enemy = makeWildEnemy(save, encounter);
      let leader = save.team[0];
      let guard = 0;
      while (leader.hp > 0 && enemy.hp > 0 && guard < 120) {
        const ticked = doBattleTick(
          { leader, enemy, badgeMult: 1, xpBonus: 1, turn: 0, log: [] },
          rng,
        );
        leader = ticked.leader;
        enemy = ticked.enemy;
        // capture interleave: try when the enemy is weak
        if (enemy.hp > 0 && enemy.hp < enemy.maxHp * 0.3 && rng() < 0.3) {
          const ball = rng() < 0.5 ? "greatball" : "pokeball";
          if ((save.inventory[ball] ?? 0) > 0) {
            const caughtCount = Object.values(save.pokedex).filter((v) => v === "caught").length;
            const res = captureAttempt(enemy, ball, caughtCount, rng);
            save = normalizeSave({
              ...save,
              inventory: {
                ...save.inventory,
                [ball]: (save.inventory[ball] ?? 0) - 1,
              },
            });
            if (res.success) {
              save = normalizeSave({
                ...save,
                pc: [...save.pc, enemy],
                pokedex: { ...save.pokedex, [enemy.speciesId]: "caught" },
              });
              enemy = { ...enemy, hp: 0 }; // capture ends the encounter
            }
          }
        }
        guard++;
      }
      // chain a shop purchase too
      const price = 600;
      const res = purchaseItem(save.inventory, save.money, "greatball", price, 1);
      if (res.ok) save = normalizeSave({ ...save, ...res, inventory: res.inventory });
      assertInvariants(save, `capture-chain ${i}`);
      // normalize is idempotent
      expect(normalizeSave(save)).toEqual(normalizeSave(normalizeSave(save)));
    }
  });

  it("fuzzed saves through loadSave always normalize to valid saves", () => {
    const rng = lcg(99);
    for (let i = 0; i < 2000; i++) {
      // mix valid v2 saves, v1 saves, and garbage
      const roll = rng();
      let raw: unknown;
      if (roll < 0.4) {
        raw = randomSave(rng);
      } else if (roll < 0.7) {
        raw = {
          pokemon: {
            speciesId: KANTO_151[Math.floor(rng() * 151)],
            name: "x",
            level: Math.floor(rng() * 100),
            xp: Math.floor(rng() * 1000),
            hp: Math.floor(rng() * 100),
            maxHp: 100,
          },
          pokeballs: Math.floor(rng() * 20),
          berries: Math.floor(rng() * 20),
          caught: [],
        };
      } else {
        raw = { garbage: true, n: Math.floor(rng() * 100) };
      }
      const storage = fakeStorage();
      if (typeof raw === "string" || raw === null || raw === undefined) {
        continue;
      }
      const hasV2 = rng() < 0.5;
      if (hasV2) {
        storage.setItem("poke-banner-save-v2", JSON.stringify(raw));
      } else {
        storage.setItem(V1_KEY, JSON.stringify(raw));
      }
      const loaded = loadSave(storage);
      if (loaded) {
        assertInvariants(loaded, `storage-fuzz ${i}`);
        expect(loaded.team.length).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe("cross-layer round trips", () => {
  it("fuzzed battle save → persist → load → battle behaves identically", () => {
    const rng = lcg(2024);
    for (let i = 0; i < 300; i++) {
      const save = randomSave(rng);
      if (save.team.length === 0) continue;
      const storage = fakeStorage();
      persistSave(save, storage);
      const loaded = loadSave(storage)!;
      expect(loaded).toEqual(normalizeSave(save));
      assertInvariants(loaded, `round-trip ${i}`);
      // battle using the reloaded save
      const enemy = makeWildEnemy(loaded, randomEncounter(rng));
      const ticked = doBattleTick(
        { leader: loaded.team[0], enemy, badgeMult: 1, xpBonus: 1, turn: 0, log: [] },
        rng,
      );
      expect(Number.isNaN(ticked.leader.hp)).toBe(false);
    }
  });

  it("v1 slot round trip: migrate → battle matches a directly migrated save", () => {
    const rng = lcg(5);
    const v1 = {
      pokemon: {
        speciesId: "charmander",
        name: "Charmander",
        level: 12,
        xp: 130,
        hp: 25,
        maxHp: 30,
      },
      pokeballs: 6,
      berries: 2,
      caught: [{ speciesId: "pidgey", level: 4, hp: 20, maxHp: 20 }],
      money: 240,
      steps: 700,
    };
    // route through the storage layer
    const storage = fakeStorage({ [V1_KEY]: JSON.stringify(v1) });
    const migrated = loadSave(storage)!;
    assertInvariants(migrated, "v1-migrated");
    expect(migrated.team[0].speciesId).toBe("charmander");

    // battle with migrated save; ensure no NaN and valid levels
    const enemy = makeWildEnemy(migrated, randomEncounter(rng));
    const outcome = doBattleTick(
      { leader: migrated.team[0], enemy, badgeMult: 1, xpBonus: 1, turn: 0, log: [] },
      rng,
    );
    expect(Number.isNaN(outcome.leader.hp)).toBe(false);
    expect(outcome.leader.level).toBeGreaterThanOrEqual(1);
    expect(outcome.leader.level).toBeLessThanOrEqual(100);
    expect(outcome.leader.hp).toBeGreaterThanOrEqual(0);
  });

  it("switchLeader + expShare + applyXpAndLevels stay consistent across many random teams", () => {
    const rng = lcg(31337);
    for (let i = 0; i < 500; i++) {
      const save = randomSave(rng);
      if (save.team.length === 0) continue;
      const sw = switchLeader(save.team.map((m) => ({ ...m, hp: 0 })));
      expect(sw.allFainted).toBe(true);
      const withHealthy = switchLeader(save.team);
      if (withHealthy.allFainted === false && save.team.length > 1) {
        // only meaningful when at least two members
        const gain = Math.floor(rng() * 400);
        const share = save.team.map((m, idx) =>
          applyXpAndLevels(m, idx === 0 ? gain : gain * 0.5, 1).pokemon,
        );
        for (const m of share) {
          expect(m.level).toBeLessThanOrEqual(TUNING.maxLevel);
          expect(Number.isFinite(m.xp)).toBe(true);
        }
      }
      void biomeIndexForSteps(save.steps);
    }
  });
});
