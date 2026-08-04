// ---------------------------------------------------------------------------
// Pure game engine. Every function here is deterministic given its inputs and
// an injected RNG, so the full battle loop, capture flow, economy, and save
// handling can be unit-tested and fuzzed without React or a browser.
// ---------------------------------------------------------------------------

import {
  BIOMES,
  CENTER_SERVICES,
  CHAMPIONS,
  DEX_MILESTONES,
  EVOLUTIONS,
  GROUND_ITEM_WEIGHTS,
  ITEMS,
  KANTO_151,
  MARKET_TUNING,
  ROCKET_POOL,
  SPECIES,
  TUNING,
  TYPE_CHART,
  defaultMovesFor,
  getSpecies,
  starterMovesFor,
} from "./constants";
import type {
  BattleState,
  CenterServiceId,
  DexRarity,
  Encounter,
  EncounterKind,
  Inventory,
  Language,
  MoveDef,
  Pokemon,
  Pokedex,
  Rng,
  SaveData,
  SaveV1,
  SpeciesDef,
  TimePhase,
  TurnOutcome,
  TypeName,
  WeatherKind,
} from "./types";

// ---------------------------------------------------------------------------
// RNG helpers
// ---------------------------------------------------------------------------

export function randomRng(): Rng {
  return Math.random;
}

/** Deterministic LCG for tests / fuzzing. */
export function lcg(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pickWeighted<T>(rng: Rng, entries: [T, number][]): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

function pickFrom<T>(rng: Rng, arr: T[]): T {
  return arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];
}

// ---------------------------------------------------------------------------
// Stats & Pokémon construction
// ---------------------------------------------------------------------------

/** Standard-ish stat growth: maxHp/atk/def scale with level. */
export function statsFor(speciesId: string, level: number) {
  const s = getSpecies(speciesId);
  return {
    maxHp: Math.floor(((2 * s.baseHp * level) / 100) + level + 10),
    atk: Math.floor(((2 * s.baseAtk * level) / 100) + 5),
    def: Math.floor(((2 * s.baseDef * level) / 100) + 5),
  };
}

export function makePokemon(
  speciesId: string,
  level: number,
  opts: {
    hpScale?: number;
    atkScale?: number;
    defScale?: number;
    shiny?: boolean;
    nickname?: string;
    status?: Pokemon["status"];
  } = {},
): Pokemon {
  const stats = statsFor(speciesId, level);
  const scale = (n: number, mult = 1) => Math.max(1, Math.round(n * mult));
  const maxHp = scale(stats.maxHp, opts.hpScale ?? 1);
  const atk = scale(stats.atk, opts.atkScale ?? 1);
  const def = scale(stats.def, opts.defScale ?? 1);
  return {
    speciesId,
    name: getSpecies(speciesId).name,
    level: Math.min(TUNING.maxLevel, Math.max(1, level)),
    hp: maxHp,
    maxHp,
    atk,
    def,
    xp: 0,
    status: opts.status ?? "none",
    statusTurns: opts.status === "sleep" ? 2 : 0,
    shiny: opts.shiny ?? false,
    nickname: opts.nickname,
  };
}

// ---------------------------------------------------------------------------
// Type chart
// ---------------------------------------------------------------------------

export function typeMultiplier(moveType: TypeName, defenderTypes: TypeName[]): number {
  let mult = 1;
  for (const t of defenderTypes) {
    const m = TYPE_CHART_MULT(moveType, t);
    if (m !== 1) mult *= m;
  }
  return mult;
}

/** Raw single-target lookup, kept separate for direct chart tests. */
export function TYPE_CHART_MULT(moveType: TypeName, defenderType: TypeName): number {
  const row = TYPE_CHART[moveType];
  return row?.[defenderType] ?? 1;
}

// ---------------------------------------------------------------------------
// Damage & turn math
// ---------------------------------------------------------------------------

export interface RollDamageOpts {
  badgeMult?: number;
}

/**
 * Rolls damage for one attack. Returns 0 damage on a miss.
 * STAB: a move matching one of the attacker's own types deals 1.5× (the
 * classic same-type attack bonus). Exposed on the result for tests/UI.
 */
export function rollDamage(
  attacker: Pokemon,
  defender: Pokemon,
  move: MoveDef,
  rng: Rng,
  opts: RollDamageOpts = {},
): { damage: number; crit: boolean; hit: boolean; mult: number; stab: boolean } {
  if (rng() * 100 >= move.accuracy) {
    return { damage: 0, crit: false, hit: false, mult: 1, stab: false };
  }
  const crit = rng() < TUNING.critChance;
  const mult = typeMultiplier(move.type, getSpecies(defender.speciesId).types);
  const stab = getSpecies(attacker.speciesId).types.includes(move.type);
  const stabMult = stab ? TUNING.stabMult : 1;
  const badgeMult = opts.badgeMult ?? 1;
  const level = attacker.level;
  const a = Math.max(1, attacker.atk);
  const d = Math.max(1, defender.def);
  const base =
    (Math.floor((2 * level) / 5 + 2) * move.power * a) / d / 50 + 2;
  const variance = 0.85 + rng() * 0.15;
  let damage = Math.floor(base * variance * mult * stabMult * (crit ? 1.5 : 1) * badgeMult);
  if (damage < 1) damage = TUNING.minDamage;
  return { damage, crit, hit: true, mult, stab };
}

/**
 * Move-picking AI:
 * - below 30% HP it prefers a self-heal move when available
 * - against a non-asleep enemy it sometimes opens with a sleep move
 * - otherwise it picks the highest expected (power × type multiplier) move
 */
export function chooseMove(
  attacker: Pokemon,
  defender: Pokemon,
  moves: MoveDef[],
  rng: Rng,
): MoveDef {
  const healMoves = moves.filter((m) => m.target === "self" && m.healPct);
  const lowHp = attacker.hp / attacker.maxHp < 0.3;
  if (lowHp && healMoves.length > 0 && rng() < 0.6) {
    return healMoves[0];
  }
  const sleepMoves = moves.filter(
    (m) => m.status === "sleep" && m.target === "enemy",
  );
  if (sleepMoves.length > 0 && defender.status !== "sleep" && rng() < 0.35) {
    return sleepMoves[0];
  }
  const enemyTypes = getSpecies(defender.speciesId).types;
  // STAB-aware scoring: a move matching the attacker's own type deals 1.5×,
  // so the AI genuinely prefers its signature moves over off-type filler.
  const attackerTypes = getSpecies(attacker.speciesId).types;
  const defenderStatused = defender.status !== "none";
  let best: MoveDef | null = null;
  let bestScore = -1;
  for (const m of moves) {
    if (m.target !== "enemy") continue;
    const stab = attackerTypes.includes(m.type) ? TUNING.stabMult : 1;
    // Status moves get a scoring nudge only when the defender is clean — no
    // point re-applying poison/paralysis to an already-statused target.
    const statusBonus = m.status && !defenderStatused ? 10 : 0;
    const score =
      m.power * typeMultiplier(m.type, enemyTypes) * stab + statusBonus;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best ?? moves[0];
}

/** Applies a move's status effect to the target (accuracy already rolled). */
export function applyStatusEffect(
  target: Pokemon,
  move: MoveDef,
  rng: Rng,
): { target: Pokemon; applied: boolean } {
  if (!move.status || move.target !== "enemy" || target.status !== "none") {
    return { target, applied: false };
  }
  if (rng() * 100 >= move.accuracy) {
    return { target, applied: false };
  }
  return {
    target: {
      ...target,
      status: move.status,
      statusTurns: move.status === "sleep" ? 2 : 3,
    },
    applied: true,
  };
}

/**
 * Executes one side's full turn: sleep check → chooseMove → damage/status/heal.
 * Fully chained so tests can script chooseMove + rollDamage + applyStatusEffect.
 */
export function executeTurn(
  attacker: Pokemon,
  defender: Pokemon,
  moves: MoveDef[],
  rng: Rng,
  badgeMult = 1,
): TurnOutcome {
  const messages: string[] = [];
  let a = attacker;
  // Sleep check
  if (a.status === "sleep") {
    if (rng() < TUNING.sleepWakeChance) {
      a = { ...a, status: "none", statusTurns: 0 };
      messages.push(`${a.name} woke up!`);
    } else {
      messages.push(`${a.name} is fast asleep.`);
      return {
        attacker: a,
        defender,
        move: moves[0],
        damage: 0,
        crit: false,
        miss: true,
        mult: 1,
        stab: false,
        statusApplied: false,
        drained: 0,
        skipped: true,
        messages,
      };
    }
  }
  // Paralysis check: fully paralyzed skips the turn, otherwise acts normally.
  if (a.status === "paralysis") {
    if (rng() < TUNING.paralysisSkipChance) {
      messages.push(`${a.name} is fully paralyzed and can't move!`);
      return {
        attacker: a,
        defender,
        move: moves[0],
        damage: 0,
        crit: false,
        miss: true,
        mult: 1,
        stab: false,
        statusApplied: false,
        drained: 0,
        skipped: true,
        messages,
      };
    }
    // otherwise acts normally; paralysis persists (it never wears off on its own)
  }
  const move = chooseMove(a, defender, moves, rng);

  if (move.target === "self") {
    const heal = Math.round((a.maxHp * (move.healPct ?? 0)) / 100);
    const healed = Math.min(heal, a.maxHp - a.hp);
    a = { ...a, hp: Math.min(a.maxHp, a.hp + healed) };
    messages.push(`${a.name} used ${move.name} and recovered ${healed} HP!`);
    return {
      attacker: a,
      defender,
      move,
      damage: 0,
      crit: false,
      miss: false,
      mult: 1,
      stab: false,
      statusApplied: false,
      drained: 0,
      skipped: false,
      messages,
    };
  }

  let d = defender;

  // Pure status moves (e.g. Sleep Powder, power 0) deal NO damage.
  if (move.power === 0) {
    const status = applyStatusEffect(d, move, rng);
    if (status.applied) {
      d = status.target;
      messages.push(`${a.name} used ${move.name} — ${d.name} was inflicted with ${move.status}!`);
      return {
        attacker: a,
        defender: d,
        move,
        damage: 0,
        crit: false,
        miss: false,
        mult: 1,
        stab: false,
        statusApplied: true,
        drained: 0,
        skipped: false,
        messages,
      };
    }
    messages.push(`${a.name}'s ${move.name} missed!`);
    return {
      attacker: a,
      defender: d,
      move,
      damage: 0,
      crit: false,
      miss: true,
      mult: 1,
      stab: false,
      statusApplied: false,
      drained: 0,
      skipped: false,
      messages,
    };
  }

  const { damage, crit, hit, mult, stab } = rollDamage(a, defender, move, rng, {
    badgeMult,
  });
  let drained = 0;
  if (hit && damage > 0) {
    d = { ...d, hp: Math.max(0, d.hp - damage) };
    messages.push(
      `${a.name} used ${move.name}${crit ? " — critical hit!" : ""}${
        mult > 1 ? " — super effective!" : mult < 1 ? " — not very effective..." : ""
      }${stab ? " (STAB!)" : ""}`,
    );
  } else if (!hit) {
    messages.push(`${a.name}'s ${move.name} missed!`);
  }
  if (move.drain && hit) {
    drained = Math.max(1, Math.floor(damage * 0.5));
    a = { ...a, hp: Math.min(a.maxHp, a.hp + drained) };
  }
  const status = applyStatusEffect(d, move, rng);
  if (status.applied) {
    d = status.target;
    messages.push(`${d.name} was inflicted with ${move.status}!`);
  }
  return {
    attacker: a,
    defender: d,
    move,
    damage,
    crit,
    miss: !hit,
    mult,
    stab,
    statusApplied: status.applied,
    drained,
    skipped: false,
    messages,
  };
}

/** Leech seed drain at the end of a round. */
export function applyLeechTick(state: BattleState): BattleState {
  let { leader, enemy } = state;
  if (enemy.status === "leech") {
    const drain = Math.max(1, Math.floor(enemy.maxHp * TUNING.leechDrainFraction));
    enemy = { ...enemy, hp: Math.max(0, enemy.hp - drain), statusTurns: enemy.statusTurns - 1 };
    leader = { ...leader, hp: Math.min(leader.maxHp, leader.hp + drain) };
    if (enemy.statusTurns <= 0) enemy = { ...enemy, status: "none" };
  } else if (leader.status === "leech") {
    const drain = Math.max(1, Math.floor(leader.maxHp * TUNING.leechDrainFraction));
    leader = { ...leader, hp: Math.max(0, leader.hp - drain), statusTurns: leader.statusTurns - 1 };
    enemy = { ...enemy, hp: Math.min(enemy.maxHp, enemy.hp + drain) };
    if (leader.statusTurns <= 0) leader = { ...leader, status: "none" };
  }
  return { ...state, leader, enemy };
}

/**
 * Poison drain at the end of a round: a poisoned combatant loses HP but the
 * attacker gains nothing (unlike leech seed). Clears when statusTurns runs out.
 */
export function applyPoisonTick(state: BattleState): BattleState {
  let { leader, enemy } = state;
  const tick = (mon: Pokemon): Pokemon => {
    if (mon.status !== "poison" || mon.hp <= 0) return mon;
    const drain = Math.max(1, Math.floor(mon.maxHp * TUNING.poisonTickFraction));
    const next = { ...mon, hp: Math.max(0, mon.hp - drain), statusTurns: mon.statusTurns - 1 };
    return next.statusTurns <= 0 ? { ...next, status: "none" as const } : next;
  };
  leader = tick(leader);
  enemy = tick(enemy);
  return { ...state, leader, enemy };
}

/** One full round of auto-battle: leader attacks, then enemy attacks. */
export function doBattleTick(state: BattleState, rng: Rng): BattleState {
  const badgeMult = state.badgeMult;
  let leader = state.leader;
  let enemy = state.enemy;
  const log: string[] = [];
  if (leader.hp > 0) {
    const t = executeTurn(leader, enemy, leaderMovesFor(leader), rng, badgeMult);
    leader = t.attacker;
    enemy = t.defender;
    log.push(...t.messages);
  }
  if (enemy.hp > 0 && leader.hp > 0) {
    // Champions use their signature movepool (enemyChampionId threaded through).
    const t = executeTurn(enemy, leader, enemyMovesFor(enemy, state.enemyChampionId), rng, 1);
    enemy = t.attacker;
    leader = t.defender;
    log.push(...t.messages);
  }
  let next = { ...state, leader, enemy, turn: state.turn + 1, log: [...state.log, ...log] };
  next = applyLeechTick(next);
  next = applyPoisonTick(next);
  return next;
}

export function leaderMovesFor(leader: Pokemon): MoveDef[] {
  if (EVOLUTIONS_STARTER[leader.speciesId] || STARTERS.includes(leader.speciesId)) {
    return starterMovesFor(leader.speciesId);
  }
  return defaultMovesFor(leader.speciesId);
}

export function enemyMovesFor(enemy: Pokemon, championId?: string): MoveDef[] {
  return defaultMovesFor(enemy.speciesId, championId);
}

// ---------------------------------------------------------------------------
// Evolution animation variants — each species gets its own themed sequence.
// The banner reads these to pick a per-Pokémon particle/color animation when
// the "evolving" sequence plays (grass = petals, fire = flames, water =
// bubbles, electric = sparks, poison = toxic haze, psychic = warp, else star).
// ---------------------------------------------------------------------------

export type EvolutionFxKind =
  | "petal"
  | "flame"
  | "bubble"
  | "spark"
  | "toxic"
  | "warp"
  | "star";

export interface EvolutionFx {
  kind: EvolutionFxKind;
  /** Primary particle color for the animation. */
  color: string;
  /** Secondary accent color. */
  accent: string;
  /** A glyph shown beside the message (used by UI + tests). */
  glyph: string;
}

/** Per-species evolution animations (starter chains + common bosses). */
const EVOLUTION_FX_BY_SPECIES: Record<string, EvolutionFx> = {
  bulbasaur: { kind: "petal", color: "#4caf50", accent: "#8bc34a", glyph: "❀" },
  ivysaur: { kind: "petal", color: "#2e7d32", accent: "#66bb6a", glyph: "❁" },
  venusaur: { kind: "petal", color: "#1b5e20", accent: "#aed581", glyph: "✿" },
  charmander: { kind: "flame", color: "#ff9800", accent: "#ffc107", glyph: "🔥" },
  charmeleon: { kind: "flame", color: "#f44336", accent: "#ffb300", glyph: "♨" },
  charizard: { kind: "flame", color: "#d32f2f", accent: "#ff7043", glyph: "🔥" },
  squirtle: { kind: "bubble", color: "#29b6f6", accent: "#4fc3f7", glyph: "❋" },
  wartortle: { kind: "bubble", color: "#0288d1", accent: "#81d4fa", glyph: "❆" },
  blastoise: { kind: "bubble", color: "#01579b", accent: "#4fc3f7", glyph: "❋" },
  onix: { kind: "star", color: "#8d6e63", accent: "#a1887f", glyph: "◆" },
  staryu: { kind: "warp", color: "#4fc3f7", accent: "#b3e5fc", glyph: "✧" },
  raichu: { kind: "spark", color: "#ffd54f", accent: "#ffe082", glyph: "⚡" },
  vileplume: { kind: "toxic", color: "#9c27b0", accent: "#ce93d8", glyph: "☠" },
  weezing: { kind: "toxic", color: "#6d4c41", accent: "#a1887f", glyph: "☁" },
  rhydon: { kind: "star", color: "#795548", accent: "#a1887f", glyph: "◆" },
  celebi: { kind: "warp", color: "#4dd0e1", accent: "#81c784", glyph: "✪" },
};

/**
 * Evolution animation for a species. Species-specific when known, otherwise
 * themed by the Pokémon's primary type so every evolution still animates
 * differently from its peers.
 */
export function evolutionFxFor(speciesId: string): EvolutionFx {
  const known = EVOLUTION_FX_BY_SPECIES[speciesId];
  if (known) return known;
  const def = getSpecies(speciesId);
  const type = def.types[0];
  switch (type) {
    case "grass":
      return { kind: "petal", color: "#4caf50", accent: "#8bc34a", glyph: "❀" };
    case "fire":
      return { kind: "flame", color: "#ff9800", accent: "#ffc107", glyph: "🔥" };
    case "water":
      return { kind: "bubble", color: "#29b6f6", accent: "#4fc3f7", glyph: "❋" };
    case "electric":
      return { kind: "spark", color: "#ffd54f", accent: "#ffe082", glyph: "⚡" };
    case "poison":
      return { kind: "toxic", color: "#9c27b0", accent: "#ce93d8", glyph: "☠" };
    case "psychic":
      return { kind: "warp", color: "#e91e63", accent: "#f48fb1", glyph: "✪" };
    default:
      return { kind: "star", color: "#ffd21f", accent: "#ffe680", glyph: "✦" };
  }
}

// ---------------------------------------------------------------------------
// XP, levels, evolution
// ---------------------------------------------------------------------------

export function xpNeeded(level: number): number {
  return TUNING.xpToNext(level);
}

export function pokedexMilestone(caughtCount: number): {
  catchBonus: number;
  xpBonus: number;
} {
  return {
    catchBonus:
      caughtCount >= TUNING.catchMilestoneCount ? TUNING.catchMilestoneBonus : 0,
    xpBonus: 1 + 0.1 * Math.floor(caughtCount / TUNING.xpMilestoneStep),
  };
}

export function badgeDamageBonus(badgeCount: number): number {
  return 1 + badgeCount * TUNING.badgeDamageBonus;
}

export function checkEvolution(
  pokemon: Pokemon,
): { evolved: true; newSpeciesId: string; oldSpeciesId: string } | null {
  const evo = EVOLUTIONS[pokemon.speciesId];
  if (evo && pokemon.level >= evo.atLevel) {
    return { evolved: true, newSpeciesId: evo.to, oldSpeciesId: pokemon.speciesId };
  }
  return null;
}

/**
 * Adds XP (after the passive Pokédex bonus is applied) and processes level-ups
 * and evolution. Returns the resulting pokémon plus flags for UI sequences.
 */
export function applyXpAndLevels(
  pokemon: Pokemon,
  xpGain: number,
  xpBonus: number,
): { pokemon: Pokemon; leveledUp: boolean; evolved: boolean; xpGained: number } {
  let p: Pokemon = { ...pokemon, xp: pokemon.xp + Math.floor(xpGain * xpBonus) };
  let leveledUp = false;
  while (p.level < TUNING.maxLevel && p.xp >= xpNeeded(p.level)) {
    p = {
      ...p,
      xp: p.xp - xpNeeded(p.level),
      level: p.level + 1,
      ...statsFor(p.speciesId, p.level + 1),
    };
    leveledUp = true;
  }
  if (p.level >= TUNING.maxLevel) p = { ...p, xp: Math.min(p.xp, xpNeeded(p.level)) };
  const evo = checkEvolution(p);
  let evolved = false;
  if (evo) {
    const next = statsFor(evo.newSpeciesId, p.level);
    p = {
      ...p,
      speciesId: evo.newSpeciesId,
      name: getSpecies(evo.newSpeciesId).name,
      maxHp: next.maxHp,
      atk: next.atk,
      def: next.def,
      hp: Math.min(p.maxHp, p.hp + (next.maxHp - p.maxHp)),
    };
    p = { ...p, maxHp: next.maxHp, hp: Math.min(next.maxHp, p.hp) };
    evolved = true;
  }
  return { pokemon: p, leveledUp, evolved, xpGained: Math.floor(xpGain * xpBonus) };
}

/** Exp Share: leader gets full XP, bench gets half. Evolutions apply to all. */
export function expShare(
  team: Pokemon[],
  xpGain: number,
  xpBonus: number,
): { team: Pokemon[]; leveled: number[]; evolved: number[] } {
  const leveled: number[] = [];
  const evolved: number[] = [];
  const out = team.map((m, i) => {
    if (m.hp <= 0) return m;
    const share = i === 0 ? xpGain : xpGain * TUNING.expShareBench;
    const res = applyXpAndLevels(m, share, xpBonus);
    if (res.leveledUp) leveled.push(i);
    if (res.evolved) evolved.push(i);
    return res.pokemon;
  });
  return { team: out, leveled, evolved };
}

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------

export function captureBallMult(ballType: string): number {
  return ITEMS[ballType]?.ballMult ?? 1;
}

/**
 * Classic-ish capture check. Low HP massively improves the odds; the catch
 * milestone (+10% at 10 caught) and ball multiplier are folded in.
 */
export function captureAttempt(
  enemy: Pokemon,
  ballType: string,
  pokedexCaughtCount: number,
  rng: Rng,
): { success: boolean; shakes: number } {
  const hpRatio = Math.max(0, (3 * enemy.maxHp - 2 * enemy.hp) / (3 * enemy.maxHp));
  const rate = getSpecies(enemy.speciesId).catchRate / 255;
  const chance =
    Math.min(1, hpRatio * rate * captureBallMult(ballType)) +
    pokedexMilestone(pokedexCaughtCount).catchBonus;
  let shakes = 0;
  for (let i = 0; i < 3; i++) {
    if (rng() < chance) {
      shakes++;
    } else {
      break;
    }
  }
  return { success: shakes === 3, shakes };
}

// ---------------------------------------------------------------------------
// Encounters (wild / rocket / champion)
// ---------------------------------------------------------------------------

export interface EncounterOpts {
  poolIds: string[];
  levelRange: [number, number];
  night: boolean;
  allowRocket?: boolean;
  rng: Rng;
}

/**
 * Pure encounter setup: rolls the 5% Team Rocket check, the level roll, and
 * the 1-in-100 shiny roll. Extracted so the odds can be tested deterministically.
 */
export function buildEncounter(opts: EncounterOpts): Encounter {
  const { poolIds, levelRange, night, rng } = opts;
  if (opts.allowRocket && rng() < TUNING.rocketChance) {
    const speciesId = pickFrom(rng, ROCKET_POOL);
    return {
      kind: "rocket",
      speciesId,
      level: levelRange[1] + 1,
      shiny: false,
    };
  }
  const filtered = poolIds.filter((id) => {
    const def = getSpecies(id);
    return !def.nightOnly || night;
  });
  const pool = filtered.length > 0 ? filtered : poolIds;
  const speciesId = pickFrom(rng, pool);
  const level = levelRange[0] + Math.floor(rng() * (levelRange[1] - levelRange[0] + 1));
  return {
    kind: "wild",
    speciesId,
    level: Math.min(TUNING.maxLevel, level),
    shiny: rng() < TUNING.shinyChance,
  };
}

export function biomeIndexForSteps(steps: number): number {
  return Math.floor(steps / TUNING.biomeStepSize) % BIOMES.length;
}

/**
 * Rolls the next wild-encounter delay in milliseconds, uniformly inside the
 * tuned 5–20s window. Pure + rng-injected so the randomness is testable.
 */
export function nextEncounterDelay(rng: Rng): number {
  const min = TUNING.encounterMinMs;
  const max = TUNING.encounterMaxMs;
  return min + Math.floor(rng() * (max - min + 1));
}

/** Champions scale with the leader's level (boss HP/attack multipliers). */
export function setupChampion(leaderLevel: number, championIndex: number): Encounter {
  const champ = CHAMPIONS[championIndex % CHAMPIONS.length];
  return {
    kind: "champion",
    speciesId: champ.speciesId,
    level: Math.min(TUNING.maxLevel, leaderLevel + 3),
    shiny: false,
    isBoss: true,
    championId: champ.id,
    hpScale: 1.8,
    atkScale: 1.4,
  };
}

export function makeWildEnemy(save: SaveData, encounter: Encounter): Pokemon {
  return makePokemon(encounter.speciesId, encounter.level, {
    hpScale: encounter.hpScale,
    atkScale: encounter.atkScale,
    shiny: encounter.shiny,
  });
}

/** Marks a species as seen (and caught when flag set). Pure + returns new dex. */
export function markPokedex(
  pokedex: Pokedex,
  speciesId: string,
  status: "seen" | "caught",
): Pokedex {
  const current = pokedex[speciesId];
  if (status === "seen" && current === "caught") return pokedex;
  return { ...pokedex, [speciesId]: status };
}

/** Adds a species id to the shiny-caught list (dedupes). Pure. */
export function markShinyCaught(shinyCaught: string[], speciesId: string): string[] {
  return shinyCaught.includes(speciesId) ? shinyCaught : [...shinyCaught, speciesId];
}

/** Milestone pcts earned so far for a caught count. Pure + monotonic. */
export function dexMilestonesEarned(caught: number): number[] {
  const total = dexSize();
  const pct = total > 0 ? Math.floor((caught / total) * 100) : 0;
  return DEX_MILESTONES.filter((m) => pct >= m.pct).map((m) => m.pct);
}

/** Rarity band derived from the gen-1 catch rate (higher = easier = common). */
export function dexRarity(catchRate: number): DexRarity {
  if (catchRate >= 200) return "common";
  if (catchRate >= 120) return "uncommon";
  if (catchRate >= 45) return "rare";
  return "mythic";
}

// ---------------------------------------------------------------------------
// Battle outcome bookkeeping
// ---------------------------------------------------------------------------

export interface WinRewards {
  xpGain: number;
  moneyGain: number;
  badgeAwarded: string | null;
  itemAwarded: string | null;
}

/** Pure reward math shared by victory handling in the UI and tests.
 *  NOTE: the Pokédex milestone xp bonus is intentionally NOT applied here —
 *  it flows through applyXpAndLevels/expShare so the two are composable. */
export function computeVictoryRewards(encounter: Encounter, rng: Rng): WinRewards {
  const species = getSpecies(encounter.speciesId);
  let xpGain = Math.floor(TUNING.xpPerWildBase + encounter.level * 4 + species.xpYield / 3);
  let moneyGain = TUNING.moneyPerWild;
  let badgeAwarded: string | null = null;
  let itemAwarded: string | null = null;
  if (encounter.kind === "rocket") {
    xpGain = Math.floor(xpGain * TUNING.rocketXpMult);
    const reward = rocketReward(rng);
    if (reward.itemId) itemAwarded = reward.itemId;
    moneyGain = reward.money;
  } else if (encounter.kind === "champion") {
    xpGain = Math.floor(xpGain * TUNING.championXpMult);
    moneyGain = TUNING.moneyPerChampion;
    const champ = CHAMPIONS.find((c) => c.id === encounter.championId);
    badgeAwarded = champ ? champ.badge : null;
  }
  return { xpGain, moneyGain, badgeAwarded, itemAwarded };
}

/**
 * Champion-win bookkeeping: awards the badge, bumps championWins and the
 * applied XP multiplier. Pure and unit-tested.
 */
export function championBookkeeping(
  save: SaveData,
  championId: string | undefined,
): { save: SaveData; badgeAwarded: string | null; xpMult: number } {
  if (!championId) return { save, badgeAwarded: null, xpMult: 1 };
  const champ = CHAMPIONS.find((c) => c.id === championId);
  if (!champ) return { save, badgeAwarded: null, xpMult: 1 };
  const alreadyOwned = save.badges.includes(champ.badge);
  return {
    save: {
      ...save,
      // Every champion victory advances the rotation (championWins grows even
      // after all 6 badges are owned) so the arena keeps cycling with rising
      // levels instead of freezing on the first leader forever.
      badges: alreadyOwned ? save.badges : [...save.badges, champ.badge],
      championWins: save.championWins + 1,
    },
    badgeAwarded: alreadyOwned ? null : champ.badge,
    xpMult: TUNING.championXpMult,
  };
}

export function rocketReward(rng: Rng): { itemId: string | null; money: number } {
  if (rng() < 0.4) {
    return { itemId: "greatball", money: 0 };
  }
  return { itemId: null, money: TUNING.moneyPerRocketBase + Math.floor(rng() * 1500) };
}

// ---------------------------------------------------------------------------
// Items & economy
// ---------------------------------------------------------------------------

export function purchaseItem(
  inventory: Inventory,
  money: number,
  itemId: string,
  price: number,
  qty = 1,
): { ok: boolean; inventory: Inventory; money: number } {
  const cost = price * qty;
  if (money < cost) {
    return { ok: false, inventory, money };
  }
  return {
    ok: true,
    inventory: { ...inventory, [itemId]: (inventory[itemId] ?? 0) + qty },
    money: money - cost,
  };
}

export function applyItemOn(
  pokemon: Pokemon,
  itemId: string,
): { pokemon: Pokemon; consumed: boolean } {
  const item = ITEMS[itemId];
  if (!item) return { pokemon, consumed: false };
  let heal = 0;
  if (item.healFlat) heal = item.healFlat;
  else if (item.healPct) heal = Math.round(pokemon.maxHp * item.healPct);
  const effective = Math.min(heal, pokemon.maxHp - pokemon.hp);
  if (effective <= 0) return { pokemon, consumed: false };
  return {
    pokemon: { ...pokemon, hp: Math.min(pokemon.maxHp, pokemon.hp + effective) },
    consumed: true,
  };
}

export function pickupGroundItem(rng: Rng): string {
  return pickWeighted(rng, GROUND_ITEM_WEIGHTS);
}

// ---------------------------------------------------------------------------
// Pokémon Center & marketplace (pure economy helpers)
// ---------------------------------------------------------------------------

/**
 * True when the hidden easter egg becomes available: every badge earned, all
 * 151 Kanto species registered (seen OR caught), and at least one Team Rocket
 * grunt defeated. Celebi — the time traveler — then hatches from its egg.
 */
export function easterEggUnlocked(save: SaveData): boolean {
  const { seen } = pokedexCounts(save.pokedex);
  return save.badges.length >= 6 && seen >= dexSize() && save.rocketsDefeated >= 1;
}

/**
 * The three Poké Center care services.
 *  - "team":   restore every team member's HP (free)
 *  - "pc":     restore team AND boxed Pokémon (fee)
 *  - "revive": revive fainted members and fully restore everyone (fee)
 * Returns the updated save, whether it succeeded (money check for paid
 * services), the cost, and how many Pokémon were healed.
 */
export function applyCenterService(
  save: SaveData,
  serviceId: CenterServiceId,
): { save: SaveData; ok: boolean; cost: number; healed: number } {
  const service = CENTER_SERVICES[serviceId];
  if (!service) return { save, ok: false, cost: 0, healed: 0 };
  if (save.money < service.price) {
    return { save, ok: false, cost: service.price, healed: 0 };
  }
  const heal = (m: Pokemon): Pokemon =>
    m.hp <= 0
      ? serviceId === "revive"
        ? { ...m, hp: m.maxHp, status: "none" as const, statusTurns: 0 }
        : m
      : { ...m, hp: m.maxHp, status: "none" as const, statusTurns: 0 };
  const team = save.team.map(heal);
  const pc = serviceId === "team" ? save.pc : save.pc.map(heal);
  const healed = [...team, ...pc].filter((m, i) => {
    const before =
      i < team.length ? save.team[i] : save.pc[i - team.length];
    return m.hp > before.hp || m.status !== before.status;
  }).length;
  return {
    save: normalizeSave({
      ...save,
      team,
      pc,
      money: save.money - service.price,
    }),
    ok: true,
    cost: service.price,
    healed,
  };
}

/** Listing/selling price for a Pokémon at the marketplace. */
export function marketValueOf(mon: Pokemon): number {
  const base =
    MARKET_TUNING.basePrice + mon.level * MARKET_TUNING.pricePerLevel;
  const shiny = mon.shiny ? MARKET_TUNING.shinyBonus : 0;
  return Math.max(1, base + shiny);
}

// ---------------------------------------------------------------------------
// Team management
// ---------------------------------------------------------------------------

/**
 * Rotates the roster so the next healthy member leads. CRITICAL: the fainted
 * member STAYS in the team at 0 HP (healable later) — the old implementation
 * filtered it out, permanently shrinking the team every time the leader fell.
 */
export function switchLeader(team: Pokemon[]): {
  team: Pokemon[];
  switched: boolean;
  allFainted: boolean;
} {
  if (team.length === 0) return { team, switched: false, allFainted: true };
  const firstHealthy = team.findIndex((m) => m.hp > 0);
  if (firstHealthy === -1) return { team, switched: false, allFainted: true };
  if (firstHealthy === 0) return { team, switched: false, allFainted: false };
  // Promote the first healthy member to the leader slot; fainted members keep
  // their roster spot (0 HP) so the team never shrinks from a KO.
  const reordered = [
    team[firstHealthy],
    ...team.slice(0, firstHealthy),
    ...team.slice(firstHealthy + 1),
  ];
  return { team: reordered, switched: true, allFainted: false };
}

/** Add a caught pokémon to the PC (dedupes by reference-ish identity). */
export function addToPc(pc: Pokemon[], caught: Pokemon): Pokemon[] {
  return [...pc, caught];
}

/** Promotes a pc member into the team if there is room (max 6). */
export function addToTeam(team: Pokemon[], mon: Pokemon): Pokemon[] {
  if (team.length >= TUNING.teamMax) return team;
  return [...team, mon];
}

// ---------------------------------------------------------------------------
// Time, biomes, misc
// ---------------------------------------------------------------------------

export function timePhase(startedAt: number, now: number): TimePhase {
  // Clamp negative elapsed (clock skew / future startedAt) to day so a tiny
  // backwards clock jump never flips the sky to sunset/night.
  const elapsed = Math.max(0, now - startedAt);
  const phase = Math.floor(elapsed / TUNING.cycleMs) % 3;
  return phase === 1 ? "sunset" : phase === 2 ? "night" : "day";
}

/**
 * Dynamic weather (v1.5.0). Deterministic: the 5-minute cycle index is hashed
 * so the same (startedAt, now) ALWAYS yields the same weather — stable across
 * re-renders and unit-testable. Starry only rolls at night; a starry roll
 * during day/sunset resolves to a clear sky instead.
 * Weights: clear 0.50 · rain 0.25 · snow 0.15 · starry 0.10.
 */
export function weatherFor(
  startedAt: number,
  now: number,
  phase: TimePhase,
): WeatherKind {
  const elapsed = Math.max(0, now - startedAt);
  const cycle = Math.floor(elapsed / TUNING.cycleMs);
  let s = ((cycle * 2654435761) >>> 0) || 1;
  s = (s * 1664525 + 1013904223) >>> 0;
  const roll = s / 0xffffffff;
  const kind: WeatherKind =
    roll < 0.5 ? "clear" : roll < 0.75 ? "rain" : roll < 0.9 ? "snow" : "starry";
  return kind === "starry" && phase !== "night" ? "clear" : kind;
}

/** Encounter-frequency multiplier per weather (rain = wild Pokémon come out). */
export function weatherEncounterMult(weather: WeatherKind): number {
  return TUNING.weatherEncounterMult[weather];
}

// ---------------------------------------------------------------------------
// Anti-cheat — static save analysis for the shared leaderboard. Returns a
// suspicion score 0..100 plus the reasons. The server-side submitScore
// rejects submissions above a threshold; the client can also surface it.
// ---------------------------------------------------------------------------

export interface CheatReport {
  score: number;
  flags: string[];
}

const CHEAT_MAX_SCORE = 100;

export function cheatScore(raw: unknown): CheatReport {
  const flags: string[] = [];
  const r = (raw ?? {}) as Record<string, unknown>;

  // 1. Impossibly high level (only after we know it wasn't normalized)
  const allMons: Array<Record<string, unknown>> = [
    ...(Array.isArray(r.team) ? (r.team as Record<string, unknown>[]) : []),
    ...(Array.isArray(r.pc) ? (r.pc as Record<string, unknown>[]) : []),
  ];
  for (const m of allMons) {
    if (typeof m.level === "number" && m.level > TUNING.maxLevel) {
      flags.push("pokémon above the level cap");
      break;
    }
    if (typeof m.maxHp === "number" && typeof m.hp === "number" && m.hp > m.maxHp) {
      flags.push("HP above max HP");
      break;
    }
  }

  // 2. Team bigger than the cap
  if (Array.isArray(r.team) && r.team.length > TUNING.teamMax) {
    flags.push("team larger than 6");
  }

  // 3. Money wildly out of proportion to victories. Each wild win pays ~10₽,
  //    rocket up to ~3000₽, champion 3000₽. A generous ceiling: even if every
  //    win were a champion, 10 * battlesWon is suspicious; use 3000 * wins + 500.
  const wins = Math.max(0, Math.floor(Number(r.battlesWon) || 0));
  const money = Math.max(0, Math.floor(Number(r.money) || 0));
  const plausibleMoney = wins * 3000 + 500 + wins * 10;
  if (wins > 0 && money > plausibleMoney) {
    flags.push("money exceeds the battle economy");
  }

  // 4. Pokédex beyond Kanto 151 + Celebi (the only allowed extras)
  const dex = (r.pokedex ?? {}) as Record<string, unknown>;
  const known = new Set([...KANTO_151, "celebi"]);
  for (const id of Object.keys(dex)) {
    if (!known.has(id)) {
      flags.push(`unknown dex species: ${id}`);
      break;
    }
  }

  // 5. Caught count outpaces what the battle/capture economy allows
  const caught = Object.values(dex).filter((v) => v === "caught").length;
  if (caught > wins * 4 + 1 + (Array.isArray(r.team) ? r.team.length : 0)) {
    flags.push("caught more than battles could provide");
  }

  // 6. Shinies seen outpace the 1/100 rate
  const shinies = Math.max(0, Math.floor(Number(r.shiniesSeen) || 0));
  if (wins > 0 && shinies > Math.ceil(wins * 0.15)) {
    flags.push("shiny rate beyond 1/100");
  }

  // 7. XP that would have leveled already
  for (const m of allMons) {
    const level = Math.floor(Number(m.level) || 1);
    const xp = Math.floor(Number(m.xp) || 0);
    if (level < TUNING.maxLevel && xp >= xpNeeded(level)) {
      flags.push("unbanked XP (level should be higher)");
      break;
    }
  }

  const unique = [...new Set(flags)];
  const score = Math.min(CHEAT_MAX_SCORE, unique.length * 18 + (unique.length > 0 ? 8 : 0));
  return { score, flags: unique };
}

// ---------------------------------------------------------------------------
// Save lifecycle
// ---------------------------------------------------------------------------

export function createSave(starterSpeciesId: string): SaveData {
  const starter = makePokemon(starterSpeciesId, 5);
  return {
    version: 2,
    starterSpeciesId,
    team: [starter],
    pc: [{ ...starter }],
    inventory: { pokeball: 10, berry: 5 },
    money: 0,
    pokedex: { [starterSpeciesId]: "caught" },
    shinyCaught: [],
    steps: 0,
    battlesWon: 0,
    championWins: 0,
    badges: [],
    rocketsDefeated: 0,
    shiniesSeen: 0,
    merchantVisitedCycle: 0,
    startedAt: Date.now(),
    lastSaveAt: Date.now(),
    bgmEnabled: true,
    dustTrail: true,
    language: "en",
  };
}

/** Hard normalization: clamps levels, HP, team size, inventory, money. */
export function normalizeSave(raw: unknown): SaveData {
  const r = (raw ?? {}) as Record<string, unknown>;
  const teamRaw = Array.isArray(r.team) ? (r.team as Pokemon[]) : [];
  const pcRaw = Array.isArray(r.pc) ? (r.pc as Pokemon[]) : [];
  const team = teamRaw.slice(0, TUNING.teamMax).map(normalizePokemon);
  const pc = pcRaw.map(normalizePokemon);
  const inventory: Inventory = {};
  if (r.inventory && typeof r.inventory === "object") {
    for (const [k, v] of Object.entries(r.inventory as Record<string, unknown>)) {
      if (typeof v === "number" && v > 0) inventory[k] = Math.floor(v);
    }
  }
  const dex = (r.pokedex ?? {}) as Pokedex;
  const pokedex: Pokedex = {};
  for (const [k, v] of Object.entries(dex)) {
    if (v === "seen" || v === "caught") pokedex[k] = v;
  }
  return {
    version: 2,
    starterSpeciesId: (r.starterSpeciesId as string) ?? "bulbasaur",
    team,
    pc,
    inventory,
    money: Math.max(0, Math.floor(Number(r.money) || 0)),
    pokedex,
    steps: Math.max(0, Math.floor(Number(r.steps) || 0)),
    battlesWon: Math.max(0, Math.floor(Number(r.battlesWon) || 0)),
    championWins: Math.max(0, Math.floor(Number(r.championWins) || 0)),
    badges: Array.isArray(r.badges) ? (r.badges as string[]) : [],
    rocketsDefeated: Math.max(0, Math.floor(Number(r.rocketsDefeated) || 0)),
    shiniesSeen: Math.max(0, Math.floor(Number(r.shiniesSeen) || 0)),
    shinyCaught: Array.isArray(r.shinyCaught)
      ? (r.shinyCaught as unknown[]).filter((s): s is string => typeof s === "string")
      : [],
    merchantVisitedCycle: Math.max(0, Math.floor(Number(r.merchantVisitedCycle) || 0)),
    startedAt: Number(r.startedAt) || Date.now(),
    lastSaveAt: Number(r.lastSaveAt) || Date.now(),
    // Old saves predate the flag: default to music ON (matches fresh games).
    bgmEnabled: r.bgmEnabled !== false,
    // Old saves predate the toggle: default footstep dust ON.
    dustTrail: r.dustTrail !== false,
    language: (r.language as Language) ?? "en",
  };
}

export function normalizePokemon(p: Pokemon): Pokemon {
  const maxHp = Math.max(1, Number(p.maxHp) || 1);
  const level = Math.min(TUNING.maxLevel, Math.max(1, Math.floor(Number(p.level) || 1)));
  const stats = statsFor(p.speciesId, level);
  return {
    speciesId: p.speciesId,
    name: p.name ?? getSpecies(p.speciesId).name,
    level,
    hp: Math.min(maxHp, Math.max(0, Math.floor(Number(p.hp) || 0))),
    maxHp,
    atk: Number(p.atk) > 0 ? Number(p.atk) : stats.atk,
    def: Number(p.def) > 0 ? Number(p.def) : stats.def,
    xp: Math.max(0, Math.floor(Number(p.xp) || 0)),
    status: p.status ?? "none",
    statusTurns: Number(p.statusTurns) || 0,
    shiny: Boolean(p.shiny),
    nickname: p.nickname,
  };
}

/** v1 → v2 migration: single pokémon becomes team[0], bag counts map to items. */
export function migrateV1(raw: SaveV1): SaveData {
  const mon = raw.pokemon;
  const starter = normalizePokemon({
    speciesId: mon.speciesId,
    name: mon.name,
    level: mon.level,
    hp: mon.hp,
    maxHp: mon.maxHp,
    atk: statsFor(mon.speciesId, mon.level).atk,
    def: statsFor(mon.speciesId, mon.level).def,
    xp: mon.xp,
    status: "none",
    statusTurns: 0,
    shiny: false,
  });
  const pokedex: Pokedex = {};
  for (const c of raw.caught) pokedex[c.speciesId] = "caught";
  pokedex[mon.speciesId] = "caught";
  return normalizeSave({
    version: 2,
    starterSpeciesId: mon.speciesId,
    team: [starter],
    pc: [
      starter,
      ...raw.caught.map((c) =>
        normalizePokemon({
          speciesId: c.speciesId,
          name: getSpecies(c.speciesId).name,
          level: c.level,
          hp: c.hp,
          maxHp: c.maxHp,
          atk: statsFor(c.speciesId, c.level).atk,
          def: statsFor(c.speciesId, c.level).def,
          xp: 0,
          status: "none",
          statusTurns: 0,
          shiny: false,
        }),
      ),
    ],
    inventory: { pokeball: raw.pokeballs, berry: raw.berries },
    money: raw.money ?? 0,
    pokedex,
    steps: raw.steps ?? 0,
    battlesWon: 0,
    championWins: 0,
    badges: [],
    rocketsDefeated: 0,
    shiniesSeen: 0,
    merchantVisitedCycle: 0,
    startedAt: Date.now(),
    lastSaveAt: Date.now(),
    language: "en",
  });
}

export function pokedexCounts(pokedex: Pokedex): { seen: number; caught: number } {
  let seen = 0;
  let caught = 0;
  for (const v of Object.values(pokedex)) {
    if (v === "seen" || v === "caught") seen++;
    if (v === "caught") caught++;
  }
  return { seen, caught };
}

/** Convenience: total Kanto dex size used by the progress tracker. */
export function dexSize(): number {
  return KANTO_151.length;
}

export { KANTO_151, SPECIES as SPECIES_TABLE };

// Internal: starter chain membership helper (avoids circular import noise).
const STARTERS = ["bulbasaur", "charmander", "squirtle"];
const EVOLUTIONS_STARTER: Record<string, true> = {
  bulbasaur: true,
  charmander: true,
  squirtle: true,
  ivysaur: true,
  charmeleon: true,
  wartortle: true,
};

export function isStarterOrEvolution(speciesId: string): boolean {
  return Boolean(EVOLUTIONS_STARTER[speciesId]) || STARTERS.includes(speciesId);
}

export type { SpeciesDef, EncounterKind };
