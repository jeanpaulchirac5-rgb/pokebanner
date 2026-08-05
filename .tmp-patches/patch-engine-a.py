p = "src/game/engine.ts"
s = open(p).read()

def sub(old, new, tag):
    global s
    n = s.count(old)
    assert n == 1, f"anchor {tag}: found {n}"
    s = s.replace(old, new)

# 1) constants import
sub(
"""import {
  BIOMES,
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
} from "./constants";""",
"""import {
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
} from "./constants";""",
"constants-import",
)

# 2) types import
sub(
"""import type {
  BattleState,
  CenterServiceId,
  DexRarity,
  Egg,
  Encounter,
  EncounterKind,
  Inventory,
  Language,
  LeagueMemberDef,
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
} from "./types";""",
"""import type {
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
} from "./types";""",
"types-import",
)

# 3) makePokemon opts + field
sub(
"""    nickname?: string;
    status?: Pokemon["status"];
    happiness?: number;
  } = {},
): Pokemon {""",
"""    nickname?: string;
    status?: Pokemon["status"];
    happiness?: number;
    aura?: AuraKind;
  } = {},
): Pokemon {""",
"makePokemon-opts",
)

sub(
"""    happiness: opts.happiness ?? TUNING.happinessStart,
  };
}""",
"""    happiness: opts.happiness ?? TUNING.happinessStart,
    aura: opts.aura,
  };
}""",
"makePokemon-field",
)

# 4) RollDamageOpts + rollDamage
sub(
"""export interface RollDamageOpts {
  badgeMult?: number;
  /** Friendship damage multiplier for the attacker (v1.9.0). */
  happyMult?: number;
}""",
"""export interface RollDamageOpts {
  badgeMult?: number;
  /** Friendship damage multiplier for the attacker (v1.9.0). */
  happyMult?: number;
  /** Team-wide damage multiplier from the attacker's Elemental Aura (v2.0.0). */
  auraMult?: number;
}""",
"rollopts",
)

sub(
"""  const happyMult = opts.happyMult ?? 1;
  const level = attacker.level;""",
"""  const happyMult = opts.happyMult ?? 1;
  const auraMult = opts.auraMult ?? 1;
  const level = attacker.level;""",
"rolldmg-mult",
)

sub(
"""let damage = Math.floor(base * variance * mult * stabMult * (crit ? 1.5 : 1) * badgeMult * happyMult);""",
"""let damage = Math.floor(base * variance * mult * stabMult * (crit ? 1.5 : 1) * badgeMult * happyMult * auraMult);""",
"rolldmg-formula",
)

# 5) executeTurn signature + rollDamage call
sub(
"""export function executeTurn(
  attacker: Pokemon,
  defender: Pokemon,
  moves: MoveDef[],
  rng: Rng,
  badgeMult = 1,
  happyMult = 1,
): TurnOutcome {""",
"""export function executeTurn(
  attacker: Pokemon,
  defender: Pokemon,
  moves: MoveDef[],
  rng: Rng,
  badgeMult = 1,
  happyMult = 1,
  auraMult = 1,
): TurnOutcome {""",
"exec-sig",
)

sub(
"""  const { damage, crit, hit, mult, stab } = rollDamage(a, defender, move, rng, {
    badgeMult,
    happyMult,
  });""",
"""  const { damage, crit, hit, mult, stab } = rollDamage(a, defender, move, rng, {
    badgeMult,
    happyMult,
    auraMult,
  });""",
"exec-roll",
)

# 6) doBattleTick threads state.auraMult
sub(
"""    const t = executeTurn(
      leader,
      enemy,
      leaderMovesFor(leader),
      rng,
      badgeMult,
      state.happyMult ?? 1,
    );""",
"""    const t = executeTurn(
      leader,
      enemy,
      leaderMovesFor(leader),
      rng,
      badgeMult,
      state.happyMult ?? 1,
      state.auraMult ?? 1,
    );""",
"battletick",
)

# 7) makeWildEnemy passes aura
sub(
"""export function makeWildEnemy(save: SaveData, encounter: Encounter): Pokemon {
  return makePokemon(encounter.speciesId, encounter.level, {
    hpScale: encounter.hpScale,
    atkScale: encounter.atkScale,
    shiny: encounter.shiny,
  });
}""",
"""export function makeWildEnemy(save: SaveData, encounter: Encounter): Pokemon {
  return makePokemon(encounter.speciesId, encounter.level, {
    hpScale: encounter.hpScale,
    atkScale: encounter.atkScale,
    shiny: encounter.shiny,
    aura: encounter.aura,
  });
}""",
"makewild",
)

open(p, "w").write(s)
print("patch-engine-a OK:", len(s), "chars")
