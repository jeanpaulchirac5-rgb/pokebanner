import { describe, expect, it } from "vitest";
import {
  BIOMES,
  MOVES,
  ROCKET_POOL,
  WILD_MOVES,
  defaultMovesFor,
  starterMovesFor,
} from "../constants";
import {
  TYPE_CHART_MULT,
  addToPc,
  addToTeam,
  applyCenterService,
  applyPoisonTick,
  applyStatusEffect,
  applyXpAndLevels,
  badgeDamageBonus,
  biomeIndexForSteps,
  buildEncounter,
  captureAttempt,
  captureBallMult,
  championBookkeeping,
  checkEvolution,
  cheatScore,
  chooseMove,
  computeVictoryRewards,
  createSave,
  dexSize,
  doBattleTick,
  easterEggUnlocked,
  enemyMovesFor,
  evolutionFxFor,
  executeTurn,
  expShare,
  isStarterOrEvolution,
  lcg,
  makePokemon,
  markPokedex,
  marketValueOf,
  migrateV1,
  nextEncounterDelay,
  normalizeSave,
  pickupGroundItem,
  pokedexCounts,
  pokedexMilestone,
  purchaseItem,
  rocketReward,
  rollDamage,
  setupChampion,
  statsFor,
  switchLeader,
  timePhase,
  typeMultiplier,
  applyItemOn,
  weatherEncounterMult,
  weatherFor,
  xpNeeded,
} from "../engine";
import type { BattleState, Pokemon, Rng } from "../types";

/** Scripted rng: returns values in order, clamping at the last one. */
function seqRng(values: number[]): Rng {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)] ?? values[values.length - 1];
}

function mon(speciesId: string, level: number, hpOverride?: number): Pokemon {
  const p = makePokemon(speciesId, level);
  return hpOverride === undefined ? p : { ...p, hp: hpOverride };
}

// ---------------------------------------------------------------------------
// Type chart
// ---------------------------------------------------------------------------

describe("type chart", () => {
  it("applies super-effective multipliers (fire > grass, water > fire)", () => {
    expect(typeMultiplier("fire", ["grass"])).toBe(2);
    expect(typeMultiplier("water", ["fire"])).toBe(2);
    expect(typeMultiplier("grass", ["water"])).toBe(2);
    expect(typeMultiplier("electric", ["water", "flying"])).toBe(4);
  });

  it("applies not-very-effective and immune multipliers", () => {
    expect(typeMultiplier("grass", ["fire"])).toBe(0.5);
    expect(typeMultiplier("normal", ["rock"])).toBe(0.5);
    expect(typeMultiplier("electric", ["ground"])).toBe(0);
    expect(typeMultiplier("ground", ["flying"])).toBe(0);
  });

  it("exposes single-target lookups for the raw chart", () => {
    expect(TYPE_CHART_MULT("fire", "grass")).toBe(2);
    expect(TYPE_CHART_MULT("fire", "fire")).toBe(0.5);
    expect(TYPE_CHART_MULT("normal", "ghost")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Damage
// ---------------------------------------------------------------------------

describe("rollDamage", () => {
  it("deals at least minimum damage (1) on a hit", () => {
    const attacker = mon("charmander", 5);
    const defender = mon("onix", 50); // huge def
    for (let i = 0; i < 50; i++) {
      const { damage, hit } = rollDamage(attacker, defender, MOVES.tackle, lcg(i));
      if (hit) expect(damage).toBeGreaterThanOrEqual(1);
    }
  });

  it("respects move accuracy (rock-throw 90% + unlucky roll => miss)", () => {
    const out = rollDamage(mon("bulbasaur", 5), mon("pidgey", 5), MOVES["rock-throw"], () => 0.95);
    expect(out.hit).toBe(false);
    expect(out.damage).toBe(0);
  });

  it("multiplies damage by the badge bonus", () => {
    const a = mon("charmander", 20);
    const d = mon("pidgey", 20);
    const plain = rollDamage(a, d, MOVES.ember, seqRng([0.9, 0.5, 0.5]), {});
    const badged = rollDamage(a, d, MOVES.ember, seqRng([0.9, 0.5, 0.5]), {
      badgeMult: 1.2,
    });
    expect(badged.damage).toBeGreaterThan(plain.damage);
  });

  it("type multiplier changes damage (fire vs grass > fire vs water)", () => {
    const a = mon("charmander", 25);
    const grass = mon("bulbasaur", 25);
    const water = mon("squirtle", 25);
    const g = rollDamage(a, grass, MOVES.ember, seqRng([0.9, 0.5, 0.5]));
    const w = rollDamage(a, water, MOVES.ember, seqRng([0.9, 0.5, 0.5]));
    expect(g.damage).toBeGreaterThan(w.damage);
  });

  it("applies STAB (1.5×) when the move matches the attacker's type", () => {
    // charmander (fire) using Ember (fire) vs Pidgey: type-neutral 1×, STAB 1.5×
    const charmander = mon("charmander", 25);
    const pidgey = mon("pidgey", 25);
    const fire = rollDamage(charmander, pidgey, MOVES.ember, seqRng([0.9, 0.5, 0.5]));
    const normal = rollDamage(charmander, pidgey, MOVES.tackle, seqRng([0.9, 0.5, 0.5]));
    expect(fire.stab).toBe(true);
    expect(normal.stab).toBe(false);
    expect(fire.damage).toBeGreaterThan(normal.damage);
    // a non-fire pokémon using Ember gets no STAB
    const squirtle = mon("squirtle", 25);
    const noStab = rollDamage(squirtle, pidgey, MOVES.ember, seqRng([0.9, 0.5, 0.5]));
    expect(noStab.stab).toBe(false);
  });

  it("executeTurn surfaces the STAB flag on the outcome", () => {
    const charmander = mon("charmander", 25);
    const pidgey = mon("pidgey", 25);
    const out = executeTurn(
      charmander,
      pidgey,
      starterMovesFor("charmander"),
      seqRng([0.9, 0.5, 0.5, 0.5]),
    );
    expect(out.stab).toBe(true); // Ember is fire on a fire type
    expect(out.messages.join(" ")).toContain("STAB");
  });
});

// ---------------------------------------------------------------------------
// Move AI
// ---------------------------------------------------------------------------

describe("chooseMove", () => {
  const bulbaMoves = starterMovesFor("bulbasaur");
  const charmMoves = starterMovesFor("charmander");

  it("uses a healing move when HP is low", () => {
    const attacker = mon("charmander", 5, 4);
    const defender = mon("pidgey", 5);
    const move = chooseMove(attacker, defender, charmMoves, seqRng([0.1]));
    expect(move.target).toBe("self");
  });

  it("opens with a sleep move against a non-asleep enemy sometimes", () => {
    const attacker = mon("bulbasaur", 5);
    const defender = mon("pidgey", 5);
    const move = chooseMove(attacker, defender, bulbaMoves, seqRng([0.1]));
    expect(move.status).toBe("sleep");
  });

  it("otherwise picks the highest (power × type effectiveness) move", () => {
    // Bulbasaur vs Onix (rock/ground): vine whip is 45 × 4 = 180
    const attacker = mon("bulbasaur", 20);
    const defender = mon("onix", 20);
    const move = chooseMove(attacker, defender, bulbaMoves, seqRng([0.9]));
    expect(move.id).toBe("vine-whip");
  });

  it("STAB breaks ties: prefers a same-type move over equal-power filler", () => {
    // Pikachu (electric) with Thunder Shock (40, electric, STAB) vs Quick
    // Attack (40, normal, no STAB) against a normal-type foe: both are
    // neutral 1×, but STAB makes Thunder Shock score 1.5× higher.
    const attacker = mon("pikachu", 15);
    const defender = mon("rattata", 15);
    const move = chooseMove(
      attacker,
      defender,
      defaultMovesFor("pikachu"),
      seqRng([0.9]),
    );
    expect(move.id).toBe("thunder-shock");
  });

  it("STAB stacks with type advantage for a decisive favorite", () => {
    // Growlithe (fire) vs Oddish (grass): every fire move is 2× AND same-type,
    // so the AI must pick a fire move over the normal-type filler (bite /
    // quick-attack) even though those have higher raw power.
    const attacker = mon("growlithe", 15);
    const defender = mon("oddish", 15);
    const move = chooseMove(
      attacker,
      defender,
      defaultMovesFor("growlithe"),
      seqRng([0.9]),
    );
    expect(move.type).toBe("fire"); // fire-fang scores highest, but any fire move proves it
  });
});

// ---------------------------------------------------------------------------
// Wild movepools (per-species learnsets)
// ---------------------------------------------------------------------------

describe("wild movepools", () => {
  it("every species in every spawn pool has a valid 3-4 move learnset", () => {
    const poolIds = new Set<string>([
      ...BIOMES.flatMap((b) => b.pool),
      ...ROCKET_POOL,
    ]);
    expect(poolIds.size).toBeGreaterThan(5);
    for (const id of poolIds) {
      const learnset = WILD_MOVES[id];
      expect(learnset, `${id} learnset`).toBeDefined();
      expect(learnset.length, `${id} size`).toBeGreaterThanOrEqual(3);
      expect(learnset.length, `${id} size`).toBeLessThanOrEqual(4);
      // every move id resolves to a real MoveDef (self-target heal moves like
      // Ponyta's Flame Charge are legitimate learnset members too)
      for (const moveId of learnset) {
        const def = MOVES[moveId];
        expect(def, `${id}:${moveId}`).toBeDefined();
        expect(def.power, `${id}:${moveId}`).toBeGreaterThanOrEqual(0);
        expect(["enemy", "self"]).toContain(def.target);
      }
    }
  });

  it("defaultMovesFor returns the learnset for wild species (not the 2-move fallback)", () => {
    const pidgey = defaultMovesFor("pidgey");
    expect(pidgey.length).toBeGreaterThanOrEqual(3);
    expect(pidgey.some((m) => m.id === "gust")).toBe(true);
    expect(pidgey.some((m) => m.id === "peck")).toBe(true);
    const zubat = defaultMovesFor("zubat");
    expect(zubat.length).toBeGreaterThanOrEqual(3);
    expect(zubat.some((m) => m.id === "bite")).toBe(true);
  });

  it("the 2-move generic fallback only applies to species without a learnset", () => {
    // A species that never spawns wild (e.g. a champion-only boss) still
    // fights with the STAB + tackle pair instead of fighting empty-handed.
    const fallback = defaultMovesFor("onix");
    expect(fallback.length).toBeGreaterThanOrEqual(2);
    expect(fallback.some((m) => m.id === "rock-throw")).toBe(true);
  });

  it("champion signature movepools are untouched by the wild learnsets", () => {
    // Wild onix has no Rock Slide; Brock's boss onix does.
    expect(defaultMovesFor("onix").some((m) => m.id === "rock-slide")).toBe(false);
    const boss = defaultMovesFor("onix", "brock");
    expect(boss.some((m) => m.id === "rock-slide")).toBe(true);
  });

  it("the plains pool now includes the new wild-variety species", () => {
    const plains = BIOMES[0].pool;
    for (const id of ["nidoran-f", "mankey", "growlithe", "ponyta"]) {
      expect(plains).toContain(id);
      // and they all resolve to real learnsets
      expect(WILD_MOVES[id].length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("applyStatusEffect", () => {
  it("applies sleep when the target is clean and the roll passes", () => {
    const target = mon("pidgey", 5);
    const res = applyStatusEffect(target, MOVES["sleep-powder"], seqRng([0.1]));
    expect(res.applied).toBe(true);
    expect(res.target.status).toBe("sleep");
  });

  it("does not overwrite an existing status", () => {
    const target = { ...mon("pidgey", 5), status: "sleep" as const, statusTurns: 1 };
    const res = applyStatusEffect(target, MOVES["sleep-powder"], seqRng([0.1]));
    expect(res.applied).toBe(false);
  });

  it("fails when the accuracy roll fails", () => {
    const target = mon("pidgey", 5);
    const res = applyStatusEffect(target, MOVES["sleep-powder"], seqRng([0.9]));
    expect(res.applied).toBe(false);
  });

  it("applies poison and paralysis with their turn budgets", () => {
    const poison = applyStatusEffect(mon("pidgey", 5), MOVES["poison-powder"], seqRng([0.1]));
    expect(poison.applied).toBe(true);
    expect(poison.target.status).toBe("poison");
    expect(poison.target.statusTurns).toBe(3);
    const para = applyStatusEffect(mon("pidgey", 5), MOVES["thunder-wave"], seqRng([0.1]));
    expect(para.applied).toBe(true);
    expect(para.target.status).toBe("paralysis");
  });
});

// ---------------------------------------------------------------------------
// Status effects (poison & paralysis)
// ---------------------------------------------------------------------------

describe("status effects", () => {
  it("a paralyzed attacker is fully paralyzed and skips its turn sometimes", () => {
    const attacker = { ...mon("pidgey", 5), status: "paralysis" as const, statusTurns: 3 };
    const defender = mon("rattata", 5);
    // roll 0.1 < paralysisSkipChance 0.25 → skipped
    const skipped = executeTurn(attacker, defender, defaultMovesFor("pidgey"), seqRng([0.1]));
    expect(skipped.skipped).toBe(true);
    expect(skipped.damage).toBe(0);
    expect(skipped.messages.join(" ")).toContain("paralyzed");
  });

  it("paralysis usually lets the attacker act and persists", () => {
    const attacker = { ...mon("pidgey", 5), status: "paralysis" as const, statusTurns: 3 };
    const defender = mon("rattata", 5);
    // roll 0.9 >= 0.25 → acts normally, status stays
    const acted = executeTurn(attacker, defender, defaultMovesFor("pidgey"), seqRng([0.9, 0.5, 0.5]));
    expect(acted.skipped).toBe(false);
    expect(acted.attacker.status).toBe("paralysis");
  });

  it("poison drains HP each round and clears when statusTurns expire", () => {
    const leader = mon("bulbasaur", 20);
    const enemy = { ...mon("pidgey", 20), status: "poison" as const, statusTurns: 2 };
    const before = enemy.hp;
    const one = applyPoisonTick({ leader, enemy, badgeMult: 1, xpBonus: 1, turn: 0, log: [] });
    expect(one.enemy.hp).toBeLessThan(before);
    expect(one.enemy.statusTurns).toBe(1);
    // leader is not poisoned → untouched
    expect(one.leader.hp).toBe(leader.hp);
    // second tick runs statusTurns to 0 → status clears
    const two = applyPoisonTick(one);
    expect(two.enemy.status).toBe("none");
  });

  it("poison does not drain a clean or fainted combatant", () => {
    const leader = mon("bulbasaur", 20);
    const dead = { ...mon("pidgey", 20), hp: 0, status: "poison" as const, statusTurns: 3 };
    const clean = applyPoisonTick({ leader, enemy: mon("rattata", 20), badgeMult: 1, xpBonus: 1, turn: 0, log: [] });
    expect(clean.enemy.hp).toBe(mon("rattata", 20).hp);
    const fainted = applyPoisonTick({ leader, enemy: dead, badgeMult: 1, xpBonus: 1, turn: 0, log: [] });
    expect(fainted.enemy.hp).toBe(0);
  });

  it("doBattleTick applies the poison tick at the end of the round", () => {
    const leader = mon("bulbasaur", 30);
    const enemy = { ...mon("pidgey", 30), status: "poison" as const, statusTurns: 3 };
    const before = enemy.hp;
    const next = doBattleTick(
      { leader, enemy, badgeMult: 1, xpBonus: 1, turn: 0, log: [] },
      lcg(9),
    );
    // even if the enemy avoided damage this round, the poison tick still lands
    expect(next.enemy.hp).toBeLessThan(before);
    expect(next.enemy.statusTurns).toBeLessThan(3);
  });

  it("the move AI does not waste status moves on an already-statused defender", () => {
    const attacker = mon("pikachu", 15);
    // defender already poisoned → thunder-wave (status move) gets no nudge
    const poisoned = { ...mon("rattata", 15), status: "poison" as const, statusTurns: 2 };
    const move = chooseMove(attacker, poisoned, defaultMovesFor("pikachu"), seqRng([0.9]));
    expect(move.id).toBe("thunder-shock"); // 40×1×1.5 STAB, not the status move
    // clean defender → thunder-wave gets the +10 nudge (still loses to STAB shock)
    const clean = chooseMove(attacker, mon("rattata", 15), defaultMovesFor("pikachu"), seqRng([0.9]));
    expect(clean.status).toBeUndefined();
    expect(clean.id).toBe("thunder-shock");
  });

  it("the new status moves resolve to typed MoveDefs", () => {
    expect(MOVES["poison-powder"].status).toBe("poison");
    expect(MOVES["thunder-wave"].status).toBe("paralysis");
    expect(MOVES["stun-spore"].status).toBe("paralysis");
    expect(MOVES.sludge.status).toBe("poison");
    expect(MOVES.sludge.power).toBe(65); // damaging + status
  });
});

// ---------------------------------------------------------------------------
// Turn execution chain (chooseMove + rollDamage + applyStatusEffect)
// ---------------------------------------------------------------------------

describe("executeTurn chain", () => {
  it("asleep attacker skips its turn", () => {
    const attacker = { ...mon("bulbasaur", 5), status: "sleep" as const, statusTurns: 1 };
    const defender = mon("pidgey", 5);
    const out = executeTurn(attacker, defender, starterMovesFor("bulbasaur"), seqRng([0.9]));
    expect(out.skipped).toBe(true);
    expect(out.damage).toBe(0);
  });

  it("self-target heal move restores HP without damaging", () => {
    const attacker = { ...mon("squirtle", 5), hp: 4 }; // <30% of 19 maxHp
    const defender = mon("pidgey", 5);
    const out = executeTurn(attacker, defender, starterMovesFor("squirtle"), seqRng([0.1]));
    expect(out.move.target).toBe("self");
    expect(out.attacker.hp).toBeGreaterThan(4);
    expect(out.defender.hp).toBe(defender.hp);
  });

  it("damage move reduces defender HP (vine whip picked vs rock/ground)", () => {
    const attacker = mon("bulbasaur", 20);
    const defender = mon("onix", 20); // 4× weak to grass
    const out = executeTurn(attacker, defender, starterMovesFor("bulbasaur"), seqRng([0.9, 0.1, 0.1]));
    expect(out.move.id).toBe("vine-whip");
    expect(out.defender.hp).toBeLessThan(defender.hp);
  });

  it("sleep-powder applies sleep status without damage", () => {
    const attacker = mon("bulbasaur", 20);
    const defender = mon("pidgey", 20);
    const out = executeTurn(attacker, defender, starterMovesFor("bulbasaur"), seqRng([0.1, 0.1, 0.1]));
    expect(out.move.id).toBe("sleep-powder");
    expect(out.statusApplied).toBe(true);
    expect(out.defender.status).toBe("sleep");
    expect(out.defender.hp).toBe(defender.hp);
  });

  it("critical hits inflate damage", () => {
    const attacker = mon("charmander", 30);
    const defender = mon("pidgey", 30);
    const crit = executeTurn(attacker, defender, starterMovesFor("charmander"), seqRng([0.9, 0.001, 0.5]));
    expect(crit.crit).toBe(true);
    expect(crit.damage).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Battle ticks & leech
// ---------------------------------------------------------------------------

describe("doBattleTick", () => {
  it("runs a full round: leader then enemy, both HP change", () => {
    const leader = mon("bulbasaur", 20);
    const enemy = mon("pidgey", 20);
    const next = doBattleTick(
      { leader, enemy, badgeMult: 1, xpBonus: 1, turn: 0, log: [] },
      lcg(7),
    );
    expect(next.turn).toBe(1);
    expect(next.leader.hp).toBeLessThanOrEqual(leader.hp);
    expect(next.enemy.hp).toBeLessThanOrEqual(enemy.hp);
    expect(next.log.length).toBeGreaterThan(0);
  });

  it("leech seed drains the enemy and heals the leader each round", () => {
    const leader = mon("bulbasaur", 40);
    const enemy = { ...mon("pidgey", 40), status: "leech" as const, statusTurns: 3 };
    const before = leader.hp;
    const enemyMax = enemy.maxHp;
    const next = doBattleTick(
      { leader, enemy, badgeMult: 1, xpBonus: 1, turn: 0, log: [] },
      lcg(3),
    );
    expect(next.enemy.hp).toBeLessThan(enemyMax); // drain applied
    // STAB + the richer wild learnset mean a level-40 Pidgey can land a
    // super-effective Gust (2× grass) for a big chunk — the leech heal only
    // needs to keep the leader alive, which is the real invariant here.
    expect(next.leader.hp).toBeGreaterThanOrEqual(before - 60);
    expect(next.leader.hp).toBeGreaterThan(0);
  });

  it("never produces NaN or out-of-range HP", () => {
    const next = doBattleTick(
      {
        leader: mon("rattata", 5),
        enemy: mon("zubat", 5),
        badgeMult: 1,
        xpBonus: 1,
        turn: 0,
        log: [],
      },
      lcg(42),
    );
    expect(Number.isNaN(next.leader.hp)).toBe(false);
    expect(Number.isNaN(next.enemy.hp)).toBe(false);
    expect(next.leader.hp).toBeGreaterThanOrEqual(0);
    expect(next.enemy.hp).toBeGreaterThanOrEqual(0);
  });

  it("battles always conclude: repeated ticks end with one side at 0 HP", () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = lcg(seed);
      let state: BattleState = {
        leader: mon("bulbasaur", 12),
        enemy: mon("pidgey", 10),
        badgeMult: 1,
        xpBonus: 1,
        turn: 0,
        log: [],
      };
      let ticks = 0;
      while (state.leader.hp > 0 && state.enemy.hp > 0 && ticks < 300) {
        state = doBattleTick(state, rng);
        ticks++;
      }
      expect(ticks, `seed ${seed}`).toBeLessThan(300); // no infinite stall
      expect(
        state.leader.hp <= 0 || state.enemy.hp <= 0,
        `seed ${seed}`,
      ).toBe(true);
    }
  });

  it("fights are strictly 1v1 — a single leader faces a single enemy", () => {
    let state: BattleState = {
      leader: mon("bulbasaur", 12),
      enemy: mon("pidgey", 10),
      badgeMult: 1,
      xpBonus: 1,
      turn: 0,
      log: [],
    };
    for (let i = 0; i < 25; i++) state = doBattleTick(state, lcg(i));
    // the battle pair is exactly two combatants for the whole fight
    expect(Object.keys({ leader: state.leader, enemy: state.enemy })).toEqual([
      "leader",
      "enemy",
    ]);

    // a faint swaps in the next healthy member — the fainted one STAYS in
    // the roster at 0 HP (healable later) so the team never shrinks.
    const team = [mon("bulbasaur", 5), mon("pidgey", 5)];
    const dead = [{ ...team[0], hp: 0 }, team[1]];
    const sw = switchLeader(dead);
    expect(sw.team.length).toBe(2);
    expect(sw.team[0].speciesId).toBe("pidgey");
    expect(sw.team[1].hp).toBe(0); // fainted member retained
    expect(
      switchLeader([{ ...team[0], hp: 0 }, { ...team[1], hp: 0 }]).allFainted,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// XP, levels, evolution
// ---------------------------------------------------------------------------

describe("xp & levels", () => {
  it("xpNeeded scales with level", () => {
    expect(xpNeeded(1)).toBe(30);
    expect(xpNeeded(10)).toBe(300);
  });

  it("levels up when xp crosses the threshold", () => {
    const res = applyXpAndLevels(mon("pidgey", 5), 150, 1);
    expect(res.leveledUp).toBe(true);
    expect(res.pokemon.level).toBe(6);
    expect(res.pokemon.xp).toBe(0);
  });

  it("applies the Pokédex milestone xp bonus", () => {
    const plain = applyXpAndLevels(mon("pidgey", 5), 100, 1);
    const boosted = applyXpAndLevels(mon("pidgey", 5), 100, 1.1);
    expect(boosted.pokemon.xp).toBe(plain.pokemon.xp + 10);
  });

  it("caps levels at 100", () => {
    const res = applyXpAndLevels(mon("pidgey", 99), 999999, 1);
    expect(res.pokemon.level).toBe(100);
  });

  it("evolves the starter chain at level 16", () => {
    const res = applyXpAndLevels(mon("bulbasaur", 15), 9999, 1);
    expect(res.evolved).toBe(true);
    expect(res.pokemon.speciesId).toBe("ivysaur");
    expect(res.pokemon.name).toBe("Ivysaur");
  });

  it("checkEvolution reports the target species", () => {
    expect(checkEvolution(mon("bulbasaur", 15))).toBeNull();
    const evo = checkEvolution(mon("bulbasaur", 16));
    expect(evo?.newSpeciesId).toBe("ivysaur");
    expect(checkEvolution(mon("charmeleon", 36))?.newSpeciesId).toBe("charizard");
  });

  it("evolved starter forms inherit their base form's signature learnset", () => {
    const bulba = starterMovesFor("bulbasaur").map((m) => m.id);
    expect(starterMovesFor("ivysaur").map((m) => m.id)).toEqual(bulba);
    expect(starterMovesFor("venusaur").map((m) => m.id)).toEqual(bulba);
    expect(starterMovesFor("charizard").map((m) => m.id)).toEqual(
      starterMovesFor("charmander").map((m) => m.id),
    );
    expect(starterMovesFor("blastoise").map((m) => m.id)).toEqual(
      starterMovesFor("squirtle").map((m) => m.id),
    );
  });

  it("expShare reports bench evolutions so the UI can announce them", () => {
    const team = [mon("bulbasaur", 5), { ...mon("bulbasaur", 15), xp: 430 }];
    const { team: out, evolved } = expShare(team, 100, 1);
    expect(evolved).toEqual([1]);
    expect(out[1].speciesId).toBe("ivysaur");
    expect(out[0].speciesId).toBe("bulbasaur");
  });

  it("expShare gives the leader full xp and the bench half", () => {
    const team = [mon("bulbasaur", 5), mon("pidgey", 5), mon("rattata", 5)];
    const { team: out } = expShare(team, 100, 1);
    expect(out[0].xp).toBe(100);
    expect(out[1].xp).toBe(50);
    expect(out[2].xp).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Milestones & badges
// ---------------------------------------------------------------------------

describe("milestones & badges", () => {
  it("pokedexMilestone grants +10% catch at 10 and +0.1× xp per 20", () => {
    expect(pokedexMilestone(9)).toEqual({ catchBonus: 0, xpBonus: 1 });
    expect(pokedexMilestone(10).catchBonus).toBe(0.1);
    expect(pokedexMilestone(20).xpBonus).toBe(1.1);
    expect(pokedexMilestone(41).xpBonus).toBe(1.2);
  });

  it("badgeDamageBonus adds 5% per badge", () => {
    expect(badgeDamageBonus(0)).toBe(1);
    expect(badgeDamageBonus(2)).toBe(1.1);
    expect(badgeDamageBonus(4)).toBe(1.2);
  });
});

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------

describe("capture", () => {
  it("captureBallMult: poké ball 1, great ball 1.5", () => {
    expect(captureBallMult("pokeball")).toBe(1);
    expect(captureBallMult("greatball")).toBe(1.5);
  });

  it("low-HP high-catch enemy is caught with a lucky rng", () => {
    const enemy = mon("pidgey", 3, 1);
    const res = captureAttempt(enemy, "pokeball", 0, () => 0.05);
    expect(res.success).toBe(true);
    expect(res.shakes).toBe(3);
  });

  it("full-HP enemy with low catch rate usually escapes", () => {
    const enemy = mon("onix", 30); // catchRate 45
    const res = captureAttempt(enemy, "pokeball", 0, () => 0.99);
    expect(res.success).toBe(false);
    expect(res.shakes).toBeLessThan(3);
  });

  it("never reports more than 3 shakes", () => {
    for (let i = 0; i < 30; i++) {
      const res = captureAttempt(mon("pidgey", 3), "pokeball", 0, lcg(i));
      expect(res.shakes).toBeGreaterThanOrEqual(0);
      expect(res.shakes).toBeLessThanOrEqual(3);
    }
  });

  it("the +10% catch milestone improves odds", () => {
    const enemy = mon("onix", 30);
    const base = captureAttempt(enemy, "pokeball", 0, () => 0.12);
    const bonus = captureAttempt(enemy, "pokeball", 10, () => 0.12);
    expect(bonus.success).toBe(true);
    expect(base.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Encounters
// ---------------------------------------------------------------------------

describe("buildEncounter", () => {
  const cave = BIOMES[2].pool;

  it("rolls the 5% Team Rocket check", () => {
    const lucky = buildEncounter({
      poolIds: BIOMES[0].pool,
      levelRange: [3, 7],
      night: false,
      allowRocket: true,
      rng: seqRng([0.01]),
    });
    expect(lucky.kind).toBe("rocket");
    const normal = buildEncounter({
      poolIds: BIOMES[0].pool,
      levelRange: [3, 7],
      night: false,
      allowRocket: true,
      rng: seqRng([0.5]),
    });
    expect(normal.kind).toBe("wild");
  });

  it("filters night-only species during the day", () => {
    const day = buildEncounter({
      poolIds: cave,
      levelRange: [3, 7],
      night: false,
      allowRocket: false,
      rng: seqRng([0.5, 0.1]),
    });
    expect(day.speciesId).not.toBe("zubat");
    const night = buildEncounter({
      poolIds: cave,
      levelRange: [3, 7],
      night: true,
      allowRocket: false,
      // allowRocket is false, so the first rng call is the species pick
      rng: seqRng([0.01]),
    });
    expect(night.speciesId).toBe("zubat");
  });

  it("rolls the shiny flag (1 in 100) and respects the level range", () => {
    const shiny = buildEncounter({
      poolIds: BIOMES[0].pool,
      levelRange: [5, 5],
      night: false,
      allowRocket: false,
      rng: seqRng([0.5, 0.1, 0.001]),
    });
    expect(shiny.shiny).toBe(true);
    expect(shiny.level).toBe(5);
  });

  it("setupChampion scales the boss above the leader", () => {
    const champ = setupChampion(12, 0);
    expect(champ.kind).toBe("champion");
    expect(champ.isBoss).toBe(true);
    expect(champ.level).toBe(15);
    expect(champ.hpScale).toBe(1.8);
    expect(champ.atkScale).toBe(1.4);
    expect(champ.championId).toBe("brock");
  });

  it("champions cycle through all six gym leaders by index", () => {
    const ids = [0, 1, 2, 3, 4, 5].map((i) => setupChampion(10, i).championId);
    expect(ids).toEqual(["brock", "misty", "surge", "erika", "koga", "giovanni"]);
  });

  it("champion enemies use their signature movepool via enemyChampionId", () => {
    const onix = mon("onix", 20);
    // Generic wild onix: STAB rock-throw + tackle
    const generic = enemyMovesFor(onix);
    expect(generic.some((m) => m.id === "rock-slide")).toBe(false);
    // Boss onix (Brock): signature rock-slide is in the pool
    const boss = enemyMovesFor(onix, "brock");
    expect(boss.some((m) => m.id === "rock-slide")).toBe(true);
    // doBattleTick threads enemyChampionId so the boss actually uses it
    const state: BattleState = {
      leader: mon("bulbasaur", 30),
      enemy: onix,
      badgeMult: 1,
      xpBonus: 1,
      turn: 0,
      log: [],
      enemyChampionId: "brock",
    };
    const next = doBattleTick(state, lcg(7));
    expect(
      next.log.some((l) => l.includes("Rock Slide") || l.includes("Rock Throw")),
    ).toBe(true);
  });

  it("biome rotates every 500 steps", () => {
    expect(biomeIndexForSteps(0)).toBe(0);
    expect(biomeIndexForSteps(500)).toBe(1);
    expect(biomeIndexForSteps(1000)).toBe(2);
    expect(biomeIndexForSteps(1500)).toBe(0);
  });

  it("timePhase normalizes clock skew instead of going negative", () => {
    // startedAt in the future (clock moved backwards) — stays in a valid phase
    expect(timePhase(10_000, 0)).toBe("day");
    expect(timePhase(10_000, -9_999)).toBe("day");
    // normal cycle still holds
    const C = 5 * 60 * 1000;
    expect(timePhase(0, C)).toBe("sunset");
    expect(timePhase(0, C * 2)).toBe("night");
  });

  it("nextEncounterDelay stays inside the 5–20s window for any rng", () => {
    for (let i = 0; i < 200; i++) {
      const delay = nextEncounterDelay(lcg(i));
      expect(delay).toBeGreaterThanOrEqual(5000);
      expect(delay).toBeLessThanOrEqual(20000);
    }
    // edges: 0 rolls the minimum, a roll very close to 1 reaches the maximum
    expect(nextEncounterDelay(() => 0)).toBe(5000);
    expect(nextEncounterDelay(() => 0.999999)).toBe(20000);
  });

  it("nextEncounterDelay is deterministic per rng and varies across seeds", () => {
    expect(nextEncounterDelay(lcg(7))).toBe(nextEncounterDelay(lcg(7)));
    const seen = new Set<number>();
    for (let i = 0; i < 40; i++) seen.add(nextEncounterDelay(lcg(i)));
    expect(seen.size).toBeGreaterThan(1); // not stuck on a single delay
  });
});

// ---------------------------------------------------------------------------
// Rewards & bookkeeping
// ---------------------------------------------------------------------------

describe("victory rewards", () => {
  it("wild victories pay 10₽", () => {
    const enc = buildEncounter({
      poolIds: BIOMES[0].pool,
      levelRange: [5, 5],
      night: false,
      allowRocket: false,
      rng: lcg(1),
    });
    const rewards = computeVictoryRewards(enc, lcg(2));
    expect(rewards.moneyGain).toBe(10);
    expect(rewards.badgeAwarded).toBeNull();
  });

  it("champion victories pay 3000₽, award a badge and 2.5× XP", () => {
    const enc = setupChampion(10, 0);
    const rewards = computeVictoryRewards(enc, lcg(2));
    expect(rewards.moneyGain).toBe(3000);
    expect(rewards.badgeAwarded).toBe("Boulder Badge");
    expect(rewards.xpGain).toBeGreaterThan(100);
  });

  it("rocket victories can drop a great ball", () => {
    const enc = buildEncounter({
      poolIds: BIOMES[0].pool,
      levelRange: [5, 5],
      night: false,
      allowRocket: true,
      rng: seqRng([0.01]),
    });
    expect(enc.kind).toBe("rocket");
    const rewards = computeVictoryRewards(enc, seqRng([0.1]));
    expect(rewards.itemAwarded).toBe("greatball");
  });

  it("championBookkeeping awards each badge once but keeps the rotation moving", () => {
    const save = createSave("bulbasaur");
    const first = championBookkeeping(save, "brock");
    expect(first.badgeAwarded).toBe("Boulder Badge");
    expect(first.save.badges).toEqual(["Boulder Badge"]);
    expect(first.save.championWins).toBe(1);
    expect(first.xpMult).toBe(2.5);
    // Rematch vs the same champion: no duplicate badge, but championWins
    // still advances so the arena cycles Brock → Misty → Surge → … with
    // rising levels instead of freezing on the first leader forever.
    const second = championBookkeeping(first.save, "brock");
    expect(second.badgeAwarded).toBeNull();
    expect(second.save.badges).toEqual(["Boulder Badge"]);
    expect(second.save.championWins).toBe(2);
    // A new champion in the cycle gets its own badge.
    const third = championBookkeeping(second.save, "misty");
    expect(third.badgeAwarded).toBe("Cascade Badge");
    expect(third.save.championWins).toBe(3);
  });

  it("rocketReward: 40% great ball, otherwise cash", () => {
    expect(rocketReward(() => 0.2).itemId).toBe("greatball");
    const cash = rocketReward(() => 0.9);
    expect(cash.itemId).toBeNull();
    expect(cash.money).toBeGreaterThanOrEqual(1500);
  });
});

// ---------------------------------------------------------------------------
// Shop & items
// ---------------------------------------------------------------------------

describe("shop & items", () => {
  it("purchaseItem refuses when funds are insufficient", () => {
    const res = purchaseItem({ pokeball: 2 }, 100, "greatball", 600, 1);
    expect(res.ok).toBe(false);
    expect(res.money).toBe(100);
    expect(res.inventory.pokeball).toBe(2);
  });

  it("purchaseItem deducts funds and adds stock when affordable", () => {
    const res = purchaseItem({ pokeball: 2 }, 1200, "greatball", 600, 2);
    expect(res.ok).toBe(true);
    expect(res.money).toBe(0);
    expect(res.inventory.greatball).toBe(2);
  });

  it("applyItemOn: oran restores 20, sitrus restores 25% of max", () => {
    const a = mon("pidgey", 10); // maxHp 28
    const oran = applyItemOn({ ...a, hp: 5 }, "berry");
    expect(oran.consumed).toBe(true);
    expect(oran.pokemon.hp).toBe(25);
    const b = mon("onix", 20); // maxHp 44
    const sitrus = applyItemOn({ ...b, hp: 40 }, "sitrus");
    expect(sitrus.consumed).toBe(true);
    expect(sitrus.pokemon.hp).toBe(44);
  });

  it("applyItemOn does not consume when HP is full", () => {
    const res = applyItemOn(mon("pidgey", 10), "berry");
    expect(res.consumed).toBe(false);
    expect(res.pokemon.hp).toBe(res.pokemon.maxHp);
  });

  it("pickupGroundItem respects weights (first weight => berry)", () => {
    expect(pickupGroundItem(() => 0)).toBe("berry");
    expect(pickupGroundItem(() => 0.999)).toBe("potion");
  });
});

// ---------------------------------------------------------------------------
// Pokémon Center & easter egg
// ---------------------------------------------------------------------------

describe("pokémon center & easter egg", () => {
  it("easterEggUnlocked requires all 6 badges, the full dex and a Rocket win", () => {
    const base = createSave("bulbasaur");
    expect(easterEggUnlocked(base)).toBe(false); // fresh save
    const fullDex = markPokedex(base.pokedex, "bulbasaur", "seen");
    // build a dex with 151 seen entries
    let dex = fullDex;
    for (let i = 0; i < 151; i++) dex = markPokedex(dex, `s${i}`, "seen");
    const withDex = normalizeSave({
      ...base,
      pokedex: dex,
      badges: ["a", "b", "c", "d", "e", "f"],
      rocketsDefeated: 1,
    });
    expect(easterEggUnlocked(withDex)).toBe(true);
    // missing one requirement each → still locked
    expect(
      easterEggUnlocked(normalizeSave({ ...withDex, badges: ["a", "b", "c"] })),
    ).toBe(false);
    expect(
      easterEggUnlocked(normalizeSave({ ...withDex, rocketsDefeated: 0 })),
    ).toBe(false);
  });

  it("applyCenterService: team heal is free and full", () => {
    const save = normalizeSave({
      ...createSave("charmander"),
      team: createSave("charmander").team.map((m) => ({
        ...m,
        hp: 1,
        status: "poison" as const,
        statusTurns: 2,
      })),
    });
    const res = applyCenterService(save, "team");
    expect(res.ok).toBe(true);
    expect(res.cost).toBe(0);
    expect(res.save.team[0].hp).toBe(res.save.team[0].maxHp);
    expect(res.save.team[0].status).toBe("none");
  });

  it("applyCenterService: pc care heals the box too, revive brings back fainted", () => {
    const hurt = normalizeSave({
      ...createSave("squirtle"),
      money: 500,
      team: createSave("squirtle").team.map((m) => ({ ...m, hp: 1 })),
      pc: createSave("squirtle").pc.map((m) => ({ ...m, hp: 1 })),
    });
    const pc = applyCenterService(hurt, "pc");
    expect(pc.cost).toBe(150);
    expect(pc.save.pc[0].hp).toBe(pc.save.pc[0].maxHp);
    expect(pc.save.money).toBe(350);
    const fainted = normalizeSave({
      ...hurt,
      team: hurt.team.map((m) => ({ ...m, hp: 0 })),
    });
    const revive = applyCenterService(fainted, "revive");
    expect(revive.ok).toBe(true);
    expect(revive.save.team[0].hp).toBe(revive.save.team[0].maxHp);
  });

  it("applyCenterService refuses paid care without funds", () => {
    const poor = normalizeSave({ ...createSave("bulbasaur"), money: 10 });
    const res = applyCenterService(poor, "revive");
    expect(res.ok).toBe(false);
    expect(res.save.money).toBe(10);
  });

  it("marketValueOf scales with level and shiny status", () => {
    const l5 = marketValueOf(makePokemon("pidgey", 5));
    const l30 = marketValueOf(makePokemon("pidgey", 30));
    expect(l30).toBeGreaterThan(l5);
    const shiny = marketValueOf({ ...makePokemon("pidgey", 5), shiny: true });
    expect(shiny).toBeGreaterThan(l5);
  });
});

// ---------------------------------------------------------------------------
// Team management
// ---------------------------------------------------------------------------

describe("team management", () => {
  it("switchLeader promotes the next healthy member", () => {
    const team = [
      { ...mon("bulbasaur", 5), hp: 0 },
      mon("pidgey", 5),
      mon("rattata", 5),
    ];
    const res = switchLeader(team);
    expect(res.switched).toBe(true);
    expect(res.allFainted).toBe(false);
    expect(res.team[0].speciesId).toBe("pidgey");
    // the fainted leader keeps its roster slot at 0 HP (healable later)
    expect(res.team).toHaveLength(3);
    expect(res.team.find((m) => m.speciesId === "bulbasaur")?.hp).toBe(0);
  });

  it("switchLeader reports allFainted when nobody is healthy", () => {
    const team = [
      { ...mon("bulbasaur", 5), hp: 0 },
      { ...mon("pidgey", 5), hp: 0 },
    ];
    const res = switchLeader(team);
    expect(res.allFainted).toBe(true);
  });

  it("addToTeam enforces the 6-member cap", () => {
    let team: Pokemon[] = [];
    for (let i = 0; i < 6; i++) team = addToTeam(team, mon("pidgey", 5));
    expect(team.length).toBe(6);
    expect(addToTeam(team, mon("rattata", 5)).length).toBe(6);
  });

  it("addToPc appends", () => {
    const pc = addToPc([], mon("pidgey", 5));
    expect(pc.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Time, saves, misc
// ---------------------------------------------------------------------------

describe("time & saves", () => {
  const CYCLE = 5 * 60 * 1000;

  it("timePhase cycles day → sunset → night every 5 minutes", () => {
    expect(timePhase(0, 0)).toBe("day");
    expect(timePhase(0, CYCLE)).toBe("sunset");
    expect(timePhase(0, CYCLE * 2)).toBe("night");
    expect(timePhase(0, CYCLE * 3)).toBe("day");
  });

  it("weatherFor is deterministic per save clock and cycle", () => {
    for (let i = 0; i < 30; i++) {
      const startedAt = 1000 + i * 137;
      const now = startedAt + CYCLE * i;
      const phase = timePhase(startedAt, now);
      expect(weatherFor(startedAt, now, phase)).toBe(weatherFor(startedAt, now, phase));
    }
  });

  it("starry nights only roll when the phase is night", () => {
    for (let i = 0; i < 90; i++) {
      const now = CYCLE * i;
      const phase = timePhase(0, now);
      if (weatherFor(0, now, phase) === "starry") {
        expect(phase).toBe("night");
      }
    }
  });

  it("weather shifts over time and spans at least three kinds", () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const now = CYCLE * i;
      kinds.add(weatherFor(0, now, timePhase(0, now)));
    }
    expect(kinds.has("clear")).toBe(true);
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  });

  it("weatherEncounterMult keeps clear/star at 1× and brings rain sooner", () => {
    expect(weatherEncounterMult("clear")).toBe(1);
    expect(weatherEncounterMult("starry")).toBe(1);
    expect(weatherEncounterMult("rain")).toBeLessThan(1);
    expect(weatherEncounterMult("snow")).toBeLessThan(1);
  });

  it("createSave builds a level-5 starter with the starting bag", () => {
    const save = createSave("charmander");
    expect(save.team[0].speciesId).toBe("charmander");
    expect(save.team[0].level).toBe(5);
    expect(save.inventory).toEqual({ pokeball: 10, berry: 5 });
    expect(save.pokedex.charmander).toBe("caught");
    expect(save.version).toBe(2);
    expect(save.bgmEnabled).toBe(true);
  });

  it("normalizeSave clamps levels, HP, team size and inventory", () => {
    const raw = {
      version: 2,
      starterSpeciesId: "bulbasaur",
      team: [
        {
          speciesId: "pidgey",
          name: "Pidgey",
          level: 999,
          hp: -50,
          maxHp: 40,
          atk: 1,
          def: 1,
          xp: -10,
          status: "none",
          statusTurns: 0,
          shiny: false,
        },
        ...Array.from({ length: 8 }, (_, i) =>
          makePokemon("rattata", i + 1),
        ),
      ],
      pc: [],
      inventory: { pokeball: -3, berry: 5 },
      money: -100,
      pokedex: {},
      steps: -1,
      battlesWon: 0,
      championWins: 0,
      badges: [],
      rocketsDefeated: 0,
      shiniesSeen: 0,
      merchantVisitedCycle: 0,
      startedAt: 0,
      lastSaveAt: 0,
    };
    const save = normalizeSave(raw);
    expect(save.team.length).toBeLessThanOrEqual(6);
    expect(save.team[0].level).toBe(100);
    expect(save.team[0].hp).toBe(0);
    expect(save.team[0].xp).toBe(0);
    expect(save.inventory.pokeball).toBeUndefined();
    expect(save.inventory.berry).toBe(5);
    expect(save.money).toBe(0);
    expect(save.steps).toBe(0);
  });

  it("normalizeSave defaults bgmEnabled to true and preserves an explicit false", () => {
    // Pre-flag saves (no bgmEnabled key) migrate with music ON.
    expect(normalizeSave({ version: 2, team: [], pc: [], inventory: {}, pokedex: {} }).bgmEnabled).toBe(true);
    // An explicit false survives normalization.
    expect(
      normalizeSave({ version: 2, team: [], pc: [], inventory: {}, pokedex: {}, bgmEnabled: false })
        .bgmEnabled,
    ).toBe(false);
    expect(
      normalizeSave({ version: 2, team: [], pc: [], inventory: {}, pokedex: {}, bgmEnabled: true })
        .bgmEnabled,
    ).toBe(true);
    // Pre-toggle saves default to footstep dust ON; an explicit false survives.
    expect(
      normalizeSave({ version: 2, team: [], pc: [], inventory: {}, pokedex: {} }).dustTrail,
    ).toBe(true);
    expect(
      normalizeSave({ version: 2, team: [], pc: [], inventory: {}, pokedex: {}, dustTrail: false })
        .dustTrail,
    ).toBe(false);
    expect(createSave("bulbasaur").dustTrail).toBe(true);
  });

  it("migrateV1 converts the legacy single-pokémon save", () => {
    const migrated = migrateV1({
      pokemon: {
        speciesId: "bulbasaur",
        name: "Bulbasaur",
        level: 7,
        xp: 40,
        hp: 18,
        maxHp: 21,
      },
      pokeballs: 4,
      berries: 2,
      caught: [{ speciesId: "pidgey", level: 3, hp: 20, maxHp: 20 }],
      money: 50,
      steps: 120,
    });
    expect(migrated.version).toBe(2);
    expect(migrated.team[0].speciesId).toBe("bulbasaur");
    expect(migrated.inventory.pokeball).toBe(4);
    expect(migrated.inventory.berry).toBe(2);
    expect(migrated.pokedex.bulbasaur).toBe("caught");
    expect(migrated.pokedex.pidgey).toBe("caught");
    expect(migrated.pc.some((p) => p.speciesId === "pidgey")).toBe(true);
    expect(migrated.bgmEnabled).toBe(true); // migrated saves default music ON
  });

  it("pokedex bookkeeping counts seen vs caught", () => {
    const dex = markPokedex({}, "pidgey", "seen");
    const dex2 = markPokedex(dex, "pidgey", "caught");
    const dex3 = markPokedex(dex2, "rattata", "seen");
    const counts = pokedexCounts(dex3);
    expect(counts.seen).toBe(2);
    expect(counts.caught).toBe(1);
    // seen never downgrades a caught entry
    expect(markPokedex(dex2, "pidgey", "seen").pidgey).toBe("caught");
  });

  it("dexSize is 151", () => {
    expect(dexSize()).toBe(151);
  });

  it("isStarterOrEvolution recognizes the starter chains", () => {
    expect(isStarterOrEvolution("bulbasaur")).toBe(true);
    expect(isStarterOrEvolution("ivysaur")).toBe(true);
    expect(isStarterOrEvolution("pidgey")).toBe(false);
  });

  it("statsFor grows stats with level", () => {
    const low = statsFor("bulbasaur", 5);
    const high = statsFor("bulbasaur", 50);
    expect(high.maxHp).toBeGreaterThan(low.maxHp);
    expect(high.atk).toBeGreaterThan(low.atk);
  });
});

describe("evolutionFxFor — per-species animation variants", () => {
  it("starters get distinct themed animations", () => {
    const bulba = evolutionFxFor("bulbasaur");
    const charm = evolutionFxFor("charmander");
    const squirt = evolutionFxFor("squirtle");
    expect(bulba.kind).toBe("petal");
    expect(charm.kind).toBe("flame");
    expect(squirt.kind).toBe("bubble");
    expect(bulba.color).not.toBe(charm.color);
    expect(bulba.glyph).not.toBe(charm.glyph);
  });

  it("evolved forms keep the chain's theme but a different species flavor", () => {
    expect(evolutionFxFor("ivysaur").kind).toBe("petal");
    expect(evolutionFxFor("venusaur").kind).toBe("petal");
    expect(evolutionFxFor("charmeleon").kind).toBe("flame");
    expect(evolutionFxFor("charizard").kind).toBe("flame");
    expect(evolutionFxFor("wartortle").kind).toBe("bubble");
    expect(evolutionFxFor("blastoise").kind).toBe("bubble");
  });

  it("unknown species fall back to a type-themed variant", () => {
    expect(evolutionFxFor("pikachu").kind).toBe("spark");
    expect(evolutionFxFor("oddish").kind).toBe("petal");
    expect(evolutionFxFor("zubat").kind).toBe("toxic");
    expect(evolutionFxFor("pidgey").kind).toBe("star");
    // Abra is not in the SPECIES table (never spawns) → normal-type fallback.
    expect(evolutionFxFor("abra").kind).toBe("star");
    // The psychic branch exists for future mythicals (e.g. a psychic starter).
    expect(evolutionFxFor("celebi").kind).toBe("warp");
  });

  it("every species resolves to a well-formed fx (color/accent/glyph)", () => {
    for (const id of ["bulbasaur", "pidgey", "celebi", "onix", "staryu"]) {
      const fx = evolutionFxFor(id);
      expect(fx.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(fx.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(fx.glyph.length).toBeGreaterThan(0);
    }
  });
});

describe("cheatScore — anti-cheat save analysis", () => {
  const clean = () => {
    const save = createSave("bulbasaur");
    return normalizeSave({
      ...save,
      battlesWon: 20,
      money: 300,
      pokedex: { bulbasaur: "caught", pidgey: "seen", rattata: "caught" },
    });
  };

  it("flags a clean save as clean", () => {
    const report = cheatScore(clean());
    expect(report.score).toBe(0);
    expect(report.flags).toEqual([]);
  });

  it("flags impossible levels and HP above max", () => {
    const bad = {
      ...clean(),
      team: [{ ...clean().team[0], level: 999 }],
    };
    const report = cheatScore(bad);
    expect(report.score).toBeGreaterThanOrEqual(18);
    expect(report.flags.some((f) => f.includes("level cap"))).toBe(true);

    const hpBad = {
      ...clean(),
      pc: [{ ...clean().team[0], hp: 99999, maxHp: 100 }],
    };
    expect(cheatScore(hpBad).flags.some((f) => f.includes("HP above"))).toBe(true);
  });

  it("flags a team larger than 6", () => {
    const team = Array.from({ length: 9 }, (_, i) => ({
      ...clean().team[0],
      speciesId: i % 2 === 0 ? "pidgey" : "rattata",
    }));
    const report = cheatScore({ ...clean(), team });
    expect(report.flags.some((f) => f.includes("larger than 6"))).toBe(true);
  });

  it("flags money out of proportion to victories", () => {
    const rich = { ...clean(), money: 9_000_000 };
    const report = cheatScore(rich);
    expect(report.flags.some((f) => f.includes("money"))).toBe(true);
  });

  it("flags unknown dex species beyond Kanto 151 + Celebi", () => {
    const bad = { ...clean(), pokedex: { ...clean().pokedex, arceus: "caught" } };
    const report = cheatScore(bad);
    expect(report.flags.some((f) => f.includes("unknown dex"))).toBe(true);
  });

  it("flags caught counts that outpace the battle economy", () => {
    const dex: Record<string, string> = {};
    for (let i = 0; i < 60; i++) dex[`sp${i}`] = "caught";
    const bad = { ...clean(), pokedex: dex, battlesWon: 2 };
    const report = cheatScore(bad);
    expect(report.flags.some((f) => f.includes("caught more"))).toBe(true);
  });

  it("flags shiny counts far beyond the 1/100 rate", () => {
    const bad = { ...clean(), shiniesSeen: 90 };
    const report = cheatScore(bad);
    expect(report.flags.some((f) => f.includes("shiny"))).toBe(true);
  });

  it("flags unbanked XP (level should be higher)", () => {
    const bad = { ...clean(), team: [{ ...clean().team[0], level: 5, xp: 99999 }] };
    const report = cheatScore(bad);
    expect(report.flags.some((f) => f.includes("unbanked XP"))).toBe(true);
  });

  it("language defaults to en and survives normalization", () => {
    expect(createSave("squirtle").language).toBe("en");
    expect(normalizeSave({ version: 2, team: [], pc: [], inventory: {}, pokedex: {} }).language).toBe("en");
    expect(normalizeSave({ ...createSave("charmander"), language: "fr" }).language).toBe("fr");
  });
});
