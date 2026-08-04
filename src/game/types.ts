// ---------------------------------------------------------------------------
// Shared types for the Poke-Banner game. Kept free of React/DOM so the whole
// engine can be unit-tested in a plain Node environment.
// ---------------------------------------------------------------------------

/** Supported game languages (in-game switcher, saved per save). */
export type Language = "en" | "fr" | "de" | "es" | "ja";

export type TypeName =
  | "normal"
  | "grass"
  | "fire"
  | "water"
  | "electric"
  | "bug"
  | "poison"
  | "ground"
  | "rock"
  | "flying"
  | "ghost"
  | "fighting"
  | "psychic";

/** The three care services offered by the Pokémon Center. */
export type CenterServiceId = "team" | "pc" | "revive";

export type StatusEffect = "none" | "sleep" | "leech" | "poison" | "paralysis";

/** A single species entry. */
export interface SpeciesDef {
  /** Lowercase english id, used directly in the Showdown sprite URL. */
  id: string;
  /** Human-readable display name. */
  name: string;
  types: TypeName[];
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  /** Gen-1 style 0..255 catch rate. */
  catchRate: number;
  /** XP yield baseline used for battle rewards. */
  xpYield: number;
  /** Only spawned while the time phase is night. */
  nightOnly?: boolean;
}

export interface MoveDef {
  id: string;
  name: string;
  type: TypeName;
  power: number;
  accuracy: number; // 0..100
  target: "enemy" | "self";
  /** Status applied on a successful hit (enemy-target moves only). */
  status?: StatusEffect;
  /** Self-target moves: heal this % of max HP. */
  healPct?: number;
  /** Leech moves also deal damage. */
  drain?: boolean;
}

export interface Pokemon {
  speciesId: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  xp: number;
  status: StatusEffect;
  statusTurns: number;
  shiny: boolean;
  nickname?: string;
}

export type EncounterKind = "wild" | "rocket" | "champion";

export interface Encounter {
  kind: EncounterKind;
  speciesId: string;
  level: number;
  shiny: boolean;
  isBoss?: boolean;
  championId?: string;
  hpScale?: number;
  atkScale?: number;
}

export interface Inventory {
  [itemId: string]: number;
}

export type PokedexStatus = "seen" | "caught";

export interface Pokedex {
  [speciesId: string]: PokedexStatus;
}

export interface SaveData {
  version: 2;
  starterSpeciesId: string;
  /** Active team, index 0 is the walking/battling leader. Max 6. */
  team: Pokemon[];
  /** Caught collection (the PC). Team members are mirrored here. */
  pc: Pokemon[];
  inventory: Inventory;
  money: number;
  pokedex: Pokedex;
  steps: number;
  battlesWon: number;
  championWins: number;
  badges: string[];
  rocketsDefeated: number;
  shiniesSeen: number;
  /** Merchant appears after every 10 victories; track which cycle was visited. */
  merchantVisitedCycle: number;
  /** Epoch ms anchor for the 5-minute day/night clock. */
  startedAt: number;
  lastSaveAt: number;
  /** N-hotkey preference: BGM loop on/off (SFX unaffected). Persisted with the save. */
  bgmEnabled: boolean;
  /** Settings toggle: footstep dust puffs behind walking Pokémon (default ON). */
  dustTrail: boolean;
  /** Selected display language ("en" | "fr" | "de" | "es" | "ja"). */
  language: Language;
}

/** Legacy shape used by the very first version of the game. */
export interface SaveV1 {
  version?: 1;
  pokemon: {
    speciesId: string;
    name: string;
    level: number;
    xp: number;
    hp: number;
    maxHp: number;
  };
  pokeballs: number;
  berries: number;
  caught: { speciesId: string; level: number; hp: number; maxHp: number }[];
  money?: number;
  steps?: number;
}

export interface TurnOutcome {
  attacker: Pokemon;
  defender: Pokemon;
  move: MoveDef;
  /** Damage dealt to the defender (0 on miss / self-target moves). */
  damage: number;
  crit: boolean;
  miss: boolean;
  /** Effective type multiplier for the hit. */
  mult: number;
  /** True when the move matched the attacker's type (STAB 1.5×). */
  stab: boolean;
  statusApplied: boolean;
  /** HP drained by leech seed on the defender this turn. */
  drained: number;
  /** True when the attacker skipped its turn (asleep). */
  skipped: boolean;
  messages: string[];
}

export interface BattleState {
  leader: Pokemon;
  enemy: Pokemon;
  /** Number of badges owned — adds +5% leader damage each. */
  badgeMult: number;
  /** Passive xp multiplier from Pokédex milestones. */
  xpBonus: number;
  turn: number;
  log: string[];
  /** Champion id (e.g. "brock") when fighting a gym boss — gives the boss
   *  its signature movepool instead of the generic wild set. */
  enemyChampionId?: string;
}

export type Rng = () => number;

export type TimePhase = "day" | "sunset" | "night";

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  price: number;
  healFlat?: number;
  healPct?: number;
  ballMult?: number;
}

export interface ChampionDef {
  id: string;
  name: string;
  title: string;
  speciesId: string;
  badge: string;
  /** Display color for the badge UI. */
  color: string;
}

export interface BiomeDef {
  id: string;
  name: string;
  pool: string[];
  /** Scenery colors for the pixel strip. */
  ground: string;
  grass: string;
  accent: string;
  /** Far silhouette layer (hills / canopy / cave rock). */
  hill: string;
  /** Darker sub-soil under the ground line. */
  soil: string;
  /** Biome props (flowers / mushrooms / crystals). */
  prop: string;
  /** Prop highlight (petal center / cap spot / crystal shine). */
  prop2: string;
}
