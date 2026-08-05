// ---------------------------------------------------------------------------
// Pure game engine. Every function here is deterministic given its inputs and
// an injected RNG, so the full battle loop, capture flow, economy, and save
// handling can be unit-tested and fuzzed without React or a browser.
// ---------------------------------------------------------------------------

import {
  AURA_CHANCE,
  AURAS,
  BIOMES,
  CARD_ALPHABET,
  CENTER_SERVICES,
  CHAMPIONS,
  DEX_MILESTONES,
  EGG_POOL,
  EVOLUTIONS,
  FRIENDSHIP_EVOLUTIONS,
  GROUND_ITEM_WEIGHTS,
  ITEMS,
  KANTO_151,
  LEAGUE,
  LEGENDS,
  MARKET_TUNING,
  MOVES,
  PASS_THRESHOLDS,
  PASS_TIERS,
  PASS_TUNING,
  PVP_RANKS,
  PVP_TUNING,
  QUEST_POOL,
  QUEST_TUNING,
  RIVAL_POOL,
  ROCKET_POOL,
  SPECIES,
  TRAINER_NAMES,
  TRAINER_POOL,
  TUNING,
  TYPE_CHART,
  defaultMovesFor,
  getSpecies,
  starterMovesFor,
} from "./constants";
import type {
  AuraKind,
  BattleState,
  CenterServiceId,
  DailyQuests,
  DexRarity,
  Egg,
  Encounter,
  EncounterKind,
  Inventory,
  Language,
  LeagueMemberDef,
  MoveDef,
  PassReward,
  PhotoEntry,
  Pokemon,
  Pokedex,
  PvpRankDef,
  PvpRankId,
  QuestDef,
  QuestKind,
  Rng,
  SaveData,
  SaveV1,
  SpeciesDef,
  TimePhase,
  TrainerCard,
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
    happiness?: number;
    aura?: AuraKind;
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
    happiness: opts.happiness ?? TUNING.happinessStart,
    aura: opts.aura,
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
  /** Friendship damage multiplier for the attacker (v1.9.0). */
  happyMult?: number;
  /** Team-wide damage multiplier from the attacker's Elemental Aura (v2.0.0). */
  auraMult?: number;
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
  const happyMult = opts.happyMult ?? 1;
  const auraMult = opts.auraMult ?? 1;
  const level = attacker.level;
  const a = Math.max(1, attacker.atk);
  const d = Math.max(1, defender.def);
  const base =
    (Math.floor((2 * level) / 5 + 2) * move.power * a) / d / 50 + 2;
  const variance = 0.85 + rng() * 0.15;
  let damage = Math.floor(base * variance * mult * stabMult * (crit ? 1.5 : 1) * badgeMult * happyMult * auraMult);
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
  happyMult = 1,
  auraMult = 1,
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
    happyMult,
    auraMult,
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
    const t = executeTurn(
      leader,
      enemy,
      leaderMovesFor(leader),
      rng,
      badgeMult,
      state.happyMult ?? 1,
      state.auraMult ?? 1,
    );
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

/**
 * The full battle learnset for a Pokémon (v1.8.0): the species' default pool
 * regardless of any configured moves. Used by the move-configuration UI to
 * offer the player their pick of 2.
 */
export function learnsetFor(pokemon: Pokemon): MoveDef[] {
  if (EVOLUTIONS_STARTER[pokemon.speciesId] || STARTERS.includes(pokemon.speciesId)) {
    return starterMovesFor(pokemon.speciesId);
  }
  return defaultMovesFor(pokemon.speciesId);
}

export function leaderMovesFor(leader: Pokemon): MoveDef[] {
  // v1.8.0: player-configured moves (1–2 ids from the learnset) override the
  // species default — the configured set IS the battle kit.
  const configured = (leader.moves ?? [])
    .map((id) => MOVES[id])
    .filter((m): m is MoveDef => Boolean(m));
  if (configured.length > 0) return configured.slice(0, 2);
  return learnsetFor(leader);
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

// ---------------------------------------------------------------------------
// Happiness / friendship (v1.9.0)
// ---------------------------------------------------------------------------

export type HappinessTier = "neutral" | "friendly" | "happy" | "best";

/** Effective happiness for a Pokémon — old saves default to the start value. */
export function happinessOf(pokemon: Pokemon | undefined): number {
  return Math.min(255, Math.max(0, Math.floor(pokemon?.happiness ?? TUNING.happinessStart)));
}

/** Clamp a happiness delta into the 0–255 range. */
export function addHappiness(current: number | undefined, delta: number): number {
  return Math.min(255, Math.max(0, Math.floor(current ?? TUNING.happinessStart) + delta));
}

/** The friendship tier a rating falls into (drives UI + bonuses). */
export function happinessTier(happiness: number): HappinessTier {
  if (happiness >= TUNING.happinessBest) return "best";
  if (happiness >= TUNING.happinessHappy) return "happy";
  if (happiness >= TUNING.happinessFriendly) return "friendly";
  return "neutral";
}

/** XP multiplier from friendship: +5% friendly, +10% best friends. */
export function happinessXpBonus(happiness: number): number {
  if (happiness >= TUNING.happinessBest) return 1 + TUNING.happinessXpBest;
  if (happiness >= TUNING.happinessFriendly) return 1 + TUNING.happinessXpFriendly;
  return 1;
}

/** Damage multiplier from friendship: +5% happy, +10% best friends. */
export function happinessDamageBonus(happiness: number): number {
  if (happiness >= TUNING.happinessBest) return 1 + TUNING.happinessDmgBest;
  if (happiness >= TUNING.happinessHappy) return 1 + TUNING.happinessDmgHappy;
  return 1;
}

/**
 * Friendship evolutions (v1.9.0): the bond (happiness) replaces the level
 * requirement. Same shape as checkEvolution so the banner handles both flows.
 */
export function checkFriendshipEvolution(
  pokemon: Pokemon,
): { evolved: true; newSpeciesId: string; oldSpeciesId: string } | null {
  const evo = FRIENDSHIP_EVOLUTIONS[pokemon.speciesId];
  if (evo && happinessOf(pokemon) >= evo.atHappiness) {
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
    // v1.9.0: friendship grants a personal XP bonus on top of the shared one.
    const share =
      (i === 0 ? xpGain : xpGain * TUNING.expShareBench) *
      happinessXpBonus(happinessOf(m));
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
  // v1.9.0: one combined roll decides Rocket / Trainer / Rival / wild, so the
  // RNG stream stays byte-identical to v1.8.0 when allowRocket is true (the
  // 5% rocket threshold and everything below it is unchanged). Trainers and
  // the Rival are blocked by allowRocket: false exactly like Rockets were.
  if (opts.allowRocket) {
    const roll = rng();
    if (roll < TUNING.rocketChance) {
      const speciesId = pickFrom(rng, ROCKET_POOL);
      return {
        kind: "rocket",
        speciesId,
        level: levelRange[1] + 1,
        shiny: false,
      };
    }
    if (roll < TUNING.rocketChance + TUNING.trainerChance) {
      const trainerName = pickFrom(rng, TRAINER_NAMES);
      const speciesId = pickFrom(rng, TRAINER_POOL);
      const level = levelRange[0] + Math.floor(rng() * (levelRange[1] - levelRange[0] + 1));
      return {
        kind: "trainer",
        speciesId,
        level: Math.min(TUNING.maxLevel, level),
        shiny: false,
        trainerName,
      };
    }
    if (roll < TUNING.rocketChance + TUNING.trainerChance + TUNING.rivalChance) {
      const speciesId = pickFrom(rng, RIVAL_POOL);
      return {
        kind: "rival",
        speciesId,
        level: Math.min(TUNING.maxLevel, levelRange[1] + 2),
        shiny: false,
      };
    }
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
 * Active biome index for a save (v1.8.0): a player-chosen biome pins the
 * scenery; "auto" (default) keeps the classic every-500-steps rotation.
 */
export function biomeIndexForSave(save: Pick<SaveData, "biome" | "steps">): number {
  const chosen = BIOMES.findIndex((b) => b.id === save.biome);
  if (chosen >= 0) return chosen;
  return biomeIndexForSteps(save.steps);
}

/**
 * Legendary Boss encounter (v1.8.0). Spawned by Eclipse / Aurora weather
 * events: one of the four Kanto legends, boss-scaled, a few levels above the
 * leader. Rewards come from computeVictoryRewards' "legendary" branch.
 */
export function buildLegendaryEncounter(leaderLevel: number, rng: Rng): Encounter {
  const speciesId = pickFrom(rng, LEGENDS);
  return {
    kind: "legendary",
    speciesId,
    level: Math.min(TUNING.maxLevel, leaderLevel + 4 + Math.floor(rng() * 3)),
    shiny: false,
    isBoss: true,
    hpScale: 1.7,
    atkScale: 1.45,
  };
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
    aura: encounter.aura,
  });
}

// ---------------------------------------------------------------------------
// Indigo League (v1.9.0) — the Elite Four + League Champion gauntlet
// ---------------------------------------------------------------------------

/**
 * Builds the next League encounter: the member at `index` (rotating through
 * the five — four Elite Four + the Champion). Scales progressively: each
 * member sits a few levels above the leader, boss-scaled like gym leaders.
 */
export function setupLeagueMember(leaderLevel: number, index: number): Encounter {
  const member = LEAGUE[index % LEAGUE.length];
  const step = index % LEAGUE.length;
  return {
    kind: "elite",
    speciesId: member.speciesId,
    level: Math.min(TUNING.maxLevel, leaderLevel + 4 + step),
    shiny: false,
    isBoss: true,
    championId: member.id,
    hpScale: 2.0,
    atkScale: 1.6,
  };
}

/** True when a League encounter is the final Champion (Blue). */
export function isLeagueChampionMember(memberId: string | undefined): boolean {
  if (!memberId) return false;
  return LEAGUE.findIndex((m) => m.id === memberId) === LEAGUE.length - 1;
}

/**
 * League-win bookkeeping: advances leagueIndex/leagueWins and crowns the
 * player as League Champion on their first clear. Pure + unit-tested.
 */
export function leagueBookkeeping(
  save: SaveData,
  memberId: string | undefined,
): { save: SaveData; memberName: string | null; champion: boolean } {
  if (!memberId) return { save, memberName: null, champion: false };
  const member = LEAGUE.find((m) => m.id === memberId);
  if (!member) return { save, memberName: null, champion: false };
  const champion = isLeagueChampionMember(memberId);
  return {
    save: {
      ...save,
      leagueIndex: save.leagueIndex + 1,
      leagueWins: save.leagueWins + 1,
      leagueChampion: save.leagueChampion || champion,
    },
    memberName: member.name,
    champion,
  };
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
  } else if (encounter.kind === "legendary") {
    // Legendary Bosses pay a big flat purse, 2× XP, and often a Great Ball.
    xpGain = Math.floor(xpGain * TUNING.legendaryXpMult);
    moneyGain = TUNING.moneyPerLegendary;
    if (rng() < 0.5) itemAwarded = "greatball";
  } else if (encounter.kind === "trainer") {
    // Route trainers (v1.9.0): a healthy purse and boosted XP.
    xpGain = Math.floor(xpGain * TUNING.trainerXpMult);
    moneyGain = TUNING.moneyPerTrainer;
  } else if (encounter.kind === "rival") {
    // The Rival (v1.9.0): a proper boss purse + a Great Ball sometimes.
    xpGain = Math.floor(xpGain * TUNING.rivalXpMult);
    moneyGain = TUNING.moneyPerRival;
    if (rng() < 0.3) itemAwarded = "greatball";
  } else if (encounter.kind === "elite") {
    // Elite Four & League Champion (v1.9.0): the richest battles in the game.
    xpGain = Math.floor(xpGain * TUNING.eliteXpMult);
    moneyGain = isLeagueChampionMember(encounter.championId)
      ? TUNING.moneyPerLeagueChampion
      : TUNING.moneyPerElite;
  } else if (encounter.kind === "pvp") {
    // Ghost PvP duels (v2.0.0): a solid purse + boosted XP. Rank-ladder
    // bookkeeping (promotions, rank-up bonuses) lives in pvpBookkeeping.
    xpGain = Math.floor(xpGain * 1.8);
    moneyGain = PVP_TUNING.moneyPerWin;
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

/**
 * Builds a fresh incubating egg (v1.8.0) from the egg species pool with a
 * random incubation window inside the tuned 300–600 step range.
 */
export function randomEgg(rng: Rng): Egg {
  // pickWeighted returns the picked value itself (the species id string).
  const speciesId = pickWeighted(rng, EGG_POOL);
  const needed =
    TUNING.eggStepsMin + Math.floor(rng() * (TUNING.eggStepsMax - TUNING.eggStepsMin + 1));
  return { speciesId, steps: needed, needed };
}

/**
 * Advances every egg by one walking step. Eggs that reach 0 steps hatch and
 * are returned (and removed). Pure — the caller decides what hatching yields.
 */
export function advanceEggs(eggs: Egg[]): { eggs: Egg[]; hatched: Egg[] } {
  const hatched: Egg[] = [];
  const remaining: Egg[] = [];
  for (const egg of eggs) {
    const next = { ...egg, steps: Math.max(0, egg.steps - 1) };
    if (next.steps <= 0) hatched.push(egg);
    else remaining.push(next);
  }
  return { eggs: remaining, hatched };
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
  // v1.8.0: the Arena now has 8 badge-earning champions — earn them all.
  return save.badges.length >= CHAMPIONS.length && seen >= dexSize() && save.rocketsDefeated >= 1;
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
  // v1.8.0: weights now span six kinds — clear .44 · rain .22 · snow .12 ·
  // starry .10 · eclipse .06 · aurora .06. Starry & Aurora are night-only
  // (they resolve to clear during the day); Eclipse is a day-dimming event
  // and stays valid any phase.
  const kind: WeatherKind =
    roll < 0.44
      ? "clear"
      : roll < 0.66
        ? "rain"
        : roll < 0.78
          ? "snow"
          : roll < 0.88
            ? "starry"
            : roll < 0.94
              ? "eclipse"
              : "aurora";
  if (kind === "starry" && phase !== "night") return "clear";
  if (kind === "aurora" && phase !== "night") return "clear";
  return kind;
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
    biome: "auto",
    eggs: [],
    moneyEarned: 0,
    captures: 0,
    battlesLost: 0,
    eggsHatched: 0,
    legendariesDefeated: 0,
    leagueIndex: 0,
    leagueWins: 0,
    leagueChampion: false,
    trainersDefeated: 0,
    rivalDefeated: 0,
    // v2.0.0
    pvpWins: 0,
    pvpLosses: 0,
    passXp: 0,
    passClaimed: [],
    quests: null,
    auraSeen: 0,
    auraCaught: 0,
    photosTaken: 0,
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
    biome: typeof r.biome === "string" ? r.biome : "auto",
    eggs: Array.isArray(r.eggs)
      ? (r.eggs as Egg[]).map((e) => ({
          speciesId: String(e.speciesId ?? "clefairy"),
          steps: Math.max(0, Math.floor(Number(e.steps) || 0)),
          needed: Math.max(1, Math.floor(Number(e.needed) || 1)),
          shiny: Boolean(e.shiny),
        }))
      : [],
    moneyEarned: Math.max(0, Math.floor(Number(r.moneyEarned) || 0)),
    captures: Math.max(0, Math.floor(Number(r.captures) || 0)),
    battlesLost: Math.max(0, Math.floor(Number(r.battlesLost) || 0)),
    eggsHatched: Math.max(0, Math.floor(Number(r.eggsHatched) || 0)),
    legendariesDefeated: Math.max(0, Math.floor(Number(r.legendariesDefeated) || 0)),
    leagueIndex: Math.max(0, Math.floor(Number(r.leagueIndex) || 0)),
    leagueWins: Math.max(0, Math.floor(Number(r.leagueWins) || 0)),
    leagueChampion: Boolean(r.leagueChampion),
    trainersDefeated: Math.max(0, Math.floor(Number(r.trainersDefeated) || 0)),
    rivalDefeated: Math.max(0, Math.floor(Number(r.rivalDefeated) || 0)),
    // v2.0.0
    pvpWins: Math.max(0, Math.floor(Number(r.pvpWins) || 0)),
    pvpLosses: Math.max(0, Math.floor(Number(r.pvpLosses) || 0)),
    passXp: Math.max(0, Number(r.passXp) || 0),
    passClaimed: Array.isArray(r.passClaimed)
      ? (r.passClaimed as unknown[])
          .map((v) => Math.floor(Number(v)))
          .filter((v) => v >= 1 && v <= PASS_TIERS.length)
      : [],
    quests: normalizeDailyQuests(r.quests),
    auraSeen: Math.max(0, Math.floor(Number(r.auraSeen) || 0)),
    auraCaught: Math.max(0, Math.floor(Number(r.auraCaught) || 0)),
    photosTaken: Math.max(0, Math.floor(Number(r.photosTaken) || 0)),
  };
}

/** Internal: validate/repair a persisted DailyQuests payload (v2.0.0). */
function normalizeDailyQuests(raw: unknown): DailyQuests | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.date !== "string") return null;
  if (!Array.isArray(r.defs) || !Array.isArray(r.progress) || !Array.isArray(r.claimed)) {
    return null;
  }
  // Snapshot the arrays into locals BEFORE the map callback: TS narrows
  // property access on `r` only in the current scope, and closures lose the
  // narrowing (r.progress would be `unknown` inside the map below).
  const progressRaw = r.progress as unknown[];
  const claimedRaw = r.claimed as unknown[];
  const defs = (r.defs as unknown[]).slice(0, QUEST_TUNING.count).map((d) => {
    const q = (d ?? {}) as Record<string, unknown>;
    const kind = QUEST_POOL.find((p) => p.kind === q.kind)?.kind ?? "battle";
    return {
      id: typeof q.id === "string" ? q.id : kind,
      kind,
      target: Math.max(1, Math.floor(Number(q.target) || 1)),
      reward: Math.max(0, Math.floor(Number(q.reward) || 0)),
    } as QuestDef;
  });
  if (defs.length === 0) return null;
  return {
    date: r.date,
    defs,
    progress: defs.map((_, i) =>
      Math.min(defs[i].target, Math.max(0, Math.floor(Number(progressRaw[i]) || 0))),
    ),
    claimed: defs.map((_, i) => Boolean(claimedRaw[i])),
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
    moves: Array.isArray(p.moves)
      ? (p.moves as unknown[])
          .filter((m): m is string => typeof m === "string" && Boolean(MOVES[m]))
          .slice(0, 2)
      : undefined,
    happiness: happinessOf(p),
    aura: AURAS[p.aura as AuraKind] ? (p.aura as AuraKind) : undefined,
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

// ---------------------------------------------------------------------------
// v2.0.0 — Ghost PvP & Trainer Cards
// ---------------------------------------------------------------------------

const CARD_PREFIX = "PB2";

/** djb2 checksum for the card codec (deterministic, test-friendly). */
function cardChecksum(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36).toUpperCase().padStart(4, "0");
}

/** Each UTF-8 byte becomes two base-32 digits from the unambiguous alphabet.
 *  Bytes are 0-255, so the high digit (b/32 in 0-7) and the low digit
 *  (b % 32 in 0-31) both always land inside the 32-char alphabet — unlike the
 *  charCode scheme, this also round-trips any non-ASCII payload bytes. */
function base32Encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    out += CARD_ALPHABET[Math.floor(b / 32) % CARD_ALPHABET.length];
    out += CARD_ALPHABET[b % CARD_ALPHABET.length];
  }
  return out;
}

function base32Decode(text: string): string {
  const bytes: number[] = [];
  for (let i = 0; i + 1 < text.length; i += 2) {
    const a = CARD_ALPHABET.indexOf(text[i]);
    const b = CARD_ALPHABET.indexOf(text[i + 1]);
    if (a < 0 || b < 0) throw new Error("Bad card code.");
    bytes.push(a * 32 + b);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/** Builds a shareable Trainer Card from a team (strongest first, max 6).
 *  Fainted members are included with HP fully restored — a card advertises
 *  your roster, not your current injuries. */
export function cardFromTeam(
  team: Pokemon[],
  trainerName: string,
  wins: number,
): TrainerCard {
  const roster = [...team]
    .sort((a, b) => b.level - a.level)
    .slice(0, 6)
    .map((m) => ({ ...m, hp: m.maxHp, status: "none" as const, statusTurns: 0 }));
  return {
    trainerName: trainerName.slice(0, 16),
    rank: pvpRankFor(Math.max(0, Math.floor(wins))).id,
    wins: Math.max(0, Math.floor(wins)),
    team: roster,
  };
}

/** Rank ladder position for a lifetime win count (0-based index). */
export function pvpRankIndex(wins: number): number {
  let idx = 0;
  for (let i = 0; i < PVP_RANKS.length; i++) {
    if (wins >= PVP_RANKS[i].minWins) idx = i;
  }
  return idx;
}

export function pvpRankFor(wins: number): PvpRankDef {
  return PVP_RANKS[pvpRankIndex(wins)];
}

/**
 * Encodes a Trainer Card into a compact shareable code:
 * "PB2-<base32 payload>-<checksum>". Round-trips through decodeTrainerCard.
 */
export function encodeTrainerCard(card: TrainerCard): string {
  const team = card.team.slice(0, 6).map((m) => [
    m.speciesId,
    Math.min(TUNING.maxLevel, Math.max(1, Math.floor(m.level))),
    m.shiny ? 1 : 0,
    m.aura ?? "",
  ]);
  const payload = JSON.stringify({
    n: card.trainerName.slice(0, 16),
    r: card.rank,
    w: Math.max(0, Math.floor(card.wins)),
    t: team,
  });
  const body = base32Encode(payload);
  return `${CARD_PREFIX}-${body}-${cardChecksum(body)}`;
}

/** Decodes a Trainer Card code. Throws on any tampering / bad shape. */
export function decodeTrainerCard(code: string): TrainerCard {
  const clean = String(code).trim().toUpperCase();
  if (!clean.startsWith(`${CARD_PREFIX}-`)) throw new Error("Bad card code.");
  const rest = clean.slice(CARD_PREFIX.length + 1);
  const bar = rest.lastIndexOf("-");
  if (bar < 0) throw new Error("Bad card code.");
  const body = rest.slice(0, bar);
  const check = rest.slice(bar + 1);
  if (cardChecksum(body) !== check) throw new Error("Card checksum mismatch.");
  let json = "";
  try {
    json = base32Decode(body);
  } catch {
    throw new Error("Card payload invalid.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Card payload invalid.");
  }
  const p = parsed as { n?: unknown; r?: unknown; w?: unknown; t?: unknown };
  if (
    typeof p.n !== "string" ||
    typeof p.r !== "string" ||
    typeof p.w !== "number" ||
    !Array.isArray(p.t)
  ) {
    throw new Error("Card payload invalid.");
  }
  const team = (p.t as unknown[]).slice(0, 6).map((raw) => {
    const row = raw as [string, number, number, string];
    const speciesId = String(row?.[0] ?? "");
    const level = Math.min(TUNING.maxLevel, Math.max(1, Math.floor(Number(row?.[1]) || 1)));
    const aura = AURAS[row?.[3] as AuraKind] ? (row[3] as AuraKind) : undefined;
    if (!speciesId) throw new Error("Card team invalid.");
    return makePokemon(speciesId, level, { shiny: Boolean(row?.[2]), aura });
  });
  if (team.length === 0) throw new Error("Card team empty.");
  return {
    trainerName: p.n.slice(0, 16),
    rank: PVP_RANKS.some((r) => r.id === p.r) ? (p.r as PvpRankId) : "novice",
    wins: Math.max(0, Math.floor(p.w)),
    team,
  };
}

/** The ghost battle: the imported card's leader, scaled to the challenger. */
export function buildGhostEncounter(card: TrainerCard, leaderLevel: number): Encounter {
  const lead = card.team[0] ?? card.team[card.team.length - 1];
  const step = Math.min(4, pvpRankIndex(card.wins));
  return {
    kind: "pvp",
    speciesId: lead.speciesId,
    level: Math.min(TUNING.maxLevel, leaderLevel + PVP_TUNING.levelOffset + step),
    shiny: lead.shiny,
    isBoss: true,
    hpScale: PVP_TUNING.hpScale,
    atkScale: PVP_TUNING.atkScale,
    aura: lead.aura,
  };
}

/**
 * Ghost PvP win/loss bookkeeping: advances the ladder, pays the duel purse
 * (win only) and awards the rank-up bonus the moment a new rank is reached.
 */
export function pvpBookkeeping(
  save: SaveData,
  won: boolean,
): { save: SaveData; promoted: boolean; reward: number } {
  const before = pvpRankIndex(save.pvpWins);
  const pvpWins = won ? save.pvpWins + 1 : save.pvpWins;
  const after = pvpRankIndex(pvpWins);
  const promoted = won && after > before;
  const reward = promoted ? PVP_TUNING.rankUpMoney : 0;
  const purse = won ? PVP_TUNING.moneyPerWin : 0;
  return {
    save: {
      ...save,
      pvpWins,
      pvpLosses: won ? save.pvpLosses : save.pvpLosses + 1,
      money: save.money + purse + reward,
      moneyEarned: save.moneyEarned + purse + reward,
    },
    promoted,
    reward,
  };
}

// ---------------------------------------------------------------------------
// v2.0.0 — Daily quests & the League Pass
// ---------------------------------------------------------------------------

/** Local calendar-day key ("YYYY-MM-DD") a set of quests belongs to. */
export function dailyKeyFor(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The three daily quests for a date. Fully deterministic: the same date key
 * ALWAYS yields the same quests (seeded from a hash of the key), so the tab
 * can preview today's quests even before the first activity is recorded.
 */
export function questsForDate(dateKey: string): DailyQuests {
  const rng = lcg(hashString(dateKey) || 1);
  const pool = [...QUEST_POOL];
  const defs: QuestDef[] = [];
  for (let i = 0; i < QUEST_TUNING.count && pool.length > 0; i++) {
    const at = Math.floor(rng() * pool.length);
    defs.push(pool.splice(at, 1)[0]);
  }
  return {
    date: dateKey,
    defs,
    progress: defs.map(() => 0),
    claimed: defs.map(() => false),
  };
}

/** Today's quests for a save (re-creates them lazily on first use / new day). */
function freshQuests(save: SaveData, now = Date.now()): DailyQuests {
  const existing = save.quests;
  const today = dailyKeyFor(new Date(now));
  if (existing && existing.date === today && existing.defs.length > 0) return existing;
  return questsForDate(today);
}

/**
 * Records one unit of an activity: advances matching daily quests (capped at
 * their targets) and accrues League Pass XP. Pure + unit-tested.
 */
export function recordActivity(
  save: SaveData,
  kind: QuestKind,
  amount = 1,
): SaveData {
  const quests = freshQuests(save);
  const amt = Math.max(1, Math.floor(amount));
  const progress = quests.defs.map((def, i) =>
    def.kind === kind
      ? Math.min(def.target, (quests.progress[i] ?? 0) + amt)
      : quests.progress[i] ?? 0,
  );
  return {
    ...save,
    quests: { ...quests, progress },
    passXp: save.passXp + PASS_TUNING.xpPer[kind] * amt,
  };
}

/** Claims a completed quest's PokéDollar reward. Idempotent. */
export function claimQuest(
  save: SaveData,
  index: number,
): { save: SaveData; reward: number } {
  const quests = save.quests;
  if (!quests) return { save, reward: 0 };
  const def = quests.defs[index];
  if (!def || quests.claimed[index]) return { save, reward: 0 };
  if ((quests.progress[index] ?? 0) < def.target) return { save, reward: 0 };
  return {
    save: {
      ...save,
      quests: {
        ...quests,
        claimed: quests.claimed.map((c, i) => (i === index ? true : c)),
      },
      money: save.money + def.reward,
      moneyEarned: save.moneyEarned + def.reward,
    },
    reward: def.reward,
  };
}

/** Cumulative XP threshold that unlocks a given pass tier (1–30). */
export function passXpForTier(tier: number): number {
  const clamped = Math.min(PASS_TIERS.length, Math.max(1, Math.floor(tier)));
  return PASS_THRESHOLDS[clamped] ?? 0;
}

/** Current unlocked pass tier for an XP total (1 = always unlocked). */
export function passTierFor(xp: number): number {
  const x = Math.max(0, Math.floor(xp));
  let tier = 1;
  for (let t = 1; t <= PASS_TIERS.length; t++) {
    if (x >= PASS_THRESHOLDS[t]) tier = t;
  }
  return tier;
}

/**
 * Claims one unlocked, unclaimed pass tier. Grants the tier's reward into the
 * save (money / item / egg / aura on the first member without one). Returns
 * the reward for messaging. Idempotent.
 */
export function claimPassTier(
  save: SaveData,
  tier: number,
  rng: Rng = lcg(Date.now() >>> 0),
): { save: SaveData; reward: PassReward | null; appliedTo?: string } {
  const t = Math.floor(tier);
  if (t < 1 || t > PASS_TIERS.length) return { save, reward: null };
  if (t > passTierFor(save.passXp)) return { save, reward: null };
  if (save.passClaimed.includes(t)) return { save, reward: null };
  const reward = PASS_TIERS[t - 1].reward;
  let next: SaveData = { ...save, passClaimed: [...save.passClaimed, t] };
  let appliedTo: string | undefined;
  if (reward.kind === "money") {
    next = {
      ...next,
      money: next.money + (reward.amount ?? 0),
      moneyEarned: next.moneyEarned + (reward.amount ?? 0),
    };
  } else if (reward.kind === "item" && reward.itemId) {
    next = {
      ...next,
      inventory: {
        ...next.inventory,
        [reward.itemId]: (next.inventory[reward.itemId] ?? 0) + (reward.amount ?? 1),
      },
    };
  } else if (reward.kind === "egg") {
    next = { ...next, eggs: [...next.eggs, randomEgg(rng)] };
  } else if (reward.kind === "aura") {
    const auraKind = reward.aura;
    if (auraKind) {
      const idx = next.team.findIndex((m) => !m.aura);
      if (idx >= 0) {
        next = {
          ...next,
          team: next.team.map((m, i) => (i === idx ? { ...m, aura: auraKind } : m)),
          auraCaught: next.auraCaught + 1,
        };
        appliedTo = next.team[idx].speciesId;
      }
    }
  }
  return { save: next, reward, appliedTo };
}

// ---------------------------------------------------------------------------
// v2.0.0 — Elemental Auras
// ---------------------------------------------------------------------------

/** Ultra-rare aura roll: 1/64 → one of the three aura kinds, else null. */
export function rollAura(rng: Rng): AuraKind | null {
  if (rng() >= AURA_CHANCE) return null;
  const ids = Object.keys(AURAS) as AuraKind[];
  return ids[Math.min(ids.length - 1, Math.floor(rng() * ids.length))];
}

/** Team-wide multipliers granted by an aura (1× when none). */
export function auraBonus(aura: AuraKind | undefined): { dmgMult: number; xpMult: number } {
  if (!aura) return { dmgMult: 1, xpMult: 1 };
  const def = AURAS[aura];
  return def ? { dmgMult: def.dmgMult, xpMult: def.xpMult } : { dmgMult: 1, xpMult: 1 };
}

/** Tags an encounter with an aura variant (display + capture inheritance). */
export function applyAuraTo(encounter: Encounter, aura: AuraKind): Encounter {
  return { ...encounter, aura };
}

// ---------------------------------------------------------------------------
// v2.0.0 — Safari Photo mode (pure helpers; the DOM capture lives in the banner)
// ---------------------------------------------------------------------------

export interface PhotoStampOpts {
  mon: string;
  level: number;
  biome: string;
  phase: string;
  lang: string;
}

/** The caption burned into a Safari photo. */
export function photoStampText(opts: PhotoStampOpts): string {
  return `${opts.mon} Lv.${opts.level} · ${opts.biome} · ${opts.phase} · ${opts.lang.toUpperCase()}`;
}

export const PHOTO_SCALES: { id: string; mult: number; label: string }[] = [
  { id: "1x", mult: 1, label: "1X" },
  { id: "2x", mult: 2, label: "2X" },
  { id: "4x", mult: 4, label: "4X" },
];

/** Validates a scale id and resolves the pixel multiplier + label. */
export function photoScaleFor(scaleId: string): { mult: number; label: string } {
  const found = PHOTO_SCALES.find((s) => s.id === scaleId);
  return found ? { mult: found.mult, label: found.label } : { mult: 1, label: "1X" };
}

/** Adds a photo to the gallery, newest first, capped (dedupes by id). */
export function pushPhoto(photos: PhotoEntry[], entry: PhotoEntry, cap = 12): PhotoEntry[] {
  const rest = photos.filter((p) => p.id !== entry.id);
  return [entry, ...rest].slice(0, Math.max(1, cap));
}

/** Sanitized export filename for a photo entry. */
export function photoFilename(entry: PhotoEntry): string {
  const d = new Date(entry.at);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  const id = entry.id.replace(/[^a-z0-9-]/gi, "");
  return `poke-banner-${stamp}-${id}.png`;
}

