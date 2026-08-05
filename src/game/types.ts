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
  | "ice"
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
  /** Optional player-configured battle moves (1–2 ids from the learnset).
   *  When set, the leader uses exactly these in battle instead of the
   *  species default learnset (v1.8.0 move configuration). */
  moves?: string[];
  /** Friendship / happiness rating 0–255 (v1.9.0). Grows from battles won,
   *  healing items and walking; high values unlock bonuses and friendship
   *  evolutions. Missing on old saves — normalizeSave defaults it. */
  happiness?: number;
  /** Elemental Aura variant (v2.0.0): flame / bolt / aurora. Ultra-rare, gives
   *  the whole team a passive combat or XP bonus while this mon is owned. */
  aura?: AuraKind;
}

export type EncounterKind =
  | "wild"
  | "rocket"
  | "champion"
  | "legendary"
  | "trainer"
  | "rival"
  | "elite"
  | "pvp";

export interface Encounter {
  kind: EncounterKind;
  speciesId: string;
  level: number;
  shiny: boolean;
  isBoss?: boolean;
  championId?: string;
  /** Route trainer name when kind === "trainer" (v1.9.0). */
  trainerName?: string;
  hpScale?: number;
  atkScale?: number;
  /** Elemental Aura variant (v2.0.0) — ultra-rare wild/ghost encounters. */
  aura?: AuraKind;
}

export interface Inventory {
  [itemId: string]: number;
}

export type PokedexStatus = "seen" | "caught";

export interface Pokedex {
  [speciesId: string]: PokedexStatus;
}

export interface DexEntry {
  /** Height in meters. */
  heightM: number;
  /** Weight in kilograms. */
  weightKg: number;
  /** Short Pokédex flavor line (English flavor data). */
  flavor: string;
}

export type DexRarity = "common" | "uncommon" | "rare" | "mythic";

/** One incubating egg (v1.8.0). Steps tick down while the leader walks. */
export interface Egg {
  speciesId: string;
  /** Remaining steps before this egg hatches. */
  steps: number;
  /** Total steps required to hatch (progress bar denominator). */
  needed: number;
  shiny?: boolean;
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
  /** Species ids caught in their Shiny variant (Codex tracking). */
  shinyCaught: string[];
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
  /** Active biome id, or "auto" to rotate with steps (v1.8.0). */
  biome: string;
  /** Incubating eggs — tick down with steps while walking (v1.8.0). */
  eggs: Egg[];
  /** Lifetime career stats (v1.8.0). */
  moneyEarned: number;
  captures: number;
  battlesLost: number;
  eggsHatched: number;
  legendariesDefeated: number;
  /** Elite Four & League progress (v1.9.0): index of the next member to
   *  face (0–4; 5+ means the League has been cleared once). */
  leagueIndex: number;
  /** Total League members defeated (v1.9.0). */
  leagueWins: number;
  /** True once the League Champion has been beaten (v1.9.0). */
  leagueChampion: boolean;
  /** Route trainers defeated (v1.9.0). */
  trainersDefeated: number;
  /** Rival defeats (v1.9.0). */
  rivalDefeated: number;
  /** Ghost PvP ladder (v2.0.0) — lifetime wins drive the rank. */
  pvpWins: number;
  pvpLosses: number;
  /** Today's daily quests (v2.0.0) — lazily created, null before activity. */
  quests: DailyQuests | null;
  /** League Pass XP and claimed tiers (v2.0.0). */
  passXp: number;
  passClaimed: number[];
  /** Elemental Aura encounters seen / caught (v2.0.0). */
  auraSeen: number;
  auraCaught: number;
  /** Safari photos taken (v2.0.0). */
  photosTaken: number;
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
  /** Friendship damage bonus multiplier for the leader (v1.9.0). */
  happyMult?: number;
  /** Team-wide damage multiplier from the leader's Elemental Aura (v2.0.0). */
  auraMult?: number;
}

export type Rng = () => number;

export type TimePhase = "day" | "sunset" | "night";

/** Dynamic weather states (v1.5.0+) — rolls once per 5-minute cycle.
 *  v1.8.0 adds the rare Eclipse (day) and Aurora (night) events that lure
 *  out Legendary Bosses. */
export type WeatherKind =
  | "clear"
  | "rain"
  | "snow"
  | "starry"
  | "eclipse"
  | "aurora";

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

/** One member of the Indigo League gauntlet (v1.9.0): the four Elite Four
 *  members plus the League Champion. */
export interface LeagueMemberDef {
  id: string;
  name: string;
  /** Display title, e.g. "Elite Four · Ice". */
  title: string;
  speciesId: string;
  /** Display color for the League UI. */
  color: string;
}


// ---------------------------------------------------------------------------
// v2.0.0 — Champions & Légendes: Elemental Auras, Ghost PvP, daily quests,
// the League Pass, and the 8-bit Safari photo gallery.
// ---------------------------------------------------------------------------

/** Ultra-rare Elemental Aura variants (v2.0.0). */
export type AuraKind = "flame" | "bolt" | "aurora";

export interface AuraDef {
  id: AuraKind;
  name: string;
  /** Brand color used by the aura badge / photo stamp. */
  color: string;
  /** Team-wide damage multiplier while a member owns this aura. */
  dmgMult: number;
  /** Team-wide XP multiplier while a member owns this aura. */
  xpMult: number;
}

/** The seven daily quest categories (v2.0.0). */
export type QuestKind =
  | "battle"
  | "capture"
  | "steps"
  | "rocket"
  | "trainer"
  | "pvp"
  | "heal";

export interface QuestDef {
  id: string;
  kind: QuestKind;
  /** Amount needed to complete the quest. */
  target: number;
  /** PokéDollar reward on claim. */
  reward: number;
}

/** The three daily quests for one calendar day (v2.0.0). */
export interface DailyQuests {
  /** Local "YYYY-MM-DD" key the quests belong to. */
  date: string;
  defs: QuestDef[];
  progress: number[];
  claimed: boolean[];
}

/** A single League Pass (Battle Pass) reward (v2.0.0). */
export interface PassReward {
  kind: "money" | "item" | "egg" | "aura";
  amount?: number;
  itemId?: string;
  aura?: AuraKind;
}

export interface PassTierDef {
  /** 1–30. */
  tier: number;
  reward: PassReward;
}

/** Ghost PvP rank ladder (v2.0.0) — driven by lifetime pvp wins. */
export type PvpRankId =
  | "novice"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "master";

export interface PvpRankDef {
  id: PvpRankId;
  /** Wins required to hold this rank. */
  minWins: number;
  color: string;
}

/** A shareable Trainer Card (v2.0.0): the codec payload for Ghost PvP. */
export interface TrainerCard {
  trainerName: string;
  rank: PvpRankId;
  wins: number;
  /** Up to 6 Pokémon, strongest first. */
  team: Pokemon[];
}

/** One entry in the Safari photo gallery (v2.0.0). */
export interface PhotoEntry {
  id: string;
  /** Epoch ms when the photo was taken. */
  at: number;
  /** Pixel multiplier used to render the photo (1 | 2 | 4). */
  scale: number;
  /** Featured species in the frame. */
  speciesId: string;
  /** Localized caption stamp burned into the image. */
  stamp: string;
  /** PNG data URL. */
  dataUrl: string;
}
