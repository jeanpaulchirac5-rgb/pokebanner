import type {
  BiomeDef,
  CenterServiceId,
  ChampionDef,
  ItemDef,
  MoveDef,
  SpeciesDef,
  TypeName,
} from "./types";

// ---------------------------------------------------------------------------
// Static game data. Pure data — no logic, no timers, no DOM.
// ---------------------------------------------------------------------------

/** Every species in the game (a representative Kanto 151). */
export const KANTO_151: string[] = [
  "bulbasaur", "ivysaur", "venusaur", "charmander", "charmeleon", "charizard",
  "squirtle", "wartortle", "blastoise", "caterpie", "metapod", "butterfree",
  "weedle", "kakuna", "beedrill", "pidgey", "pidgeotto", "pidgeot",
  "rattata", "raticate", "spearow", "fearow", "ekans", "arbok", "pikachu",
  "raichu", "sandshrew", "sandslash", "nidoran-f", "nidorina", "nidoqueen",
  "nidoran-m", "nidorino", "nidoking", "clefairy", "clefable", "vulpix",
  "ninetales", "jigglypuff", "wigglytuff", "zubat", "golbat", "oddish",
  "gloom", "vileplume", "paras", "parasect", "venonat", "venomoth", "diglett",
  "dugtrio", "meowth", "persian", "psyduck", "golduck", "mankey", "primeape",
  "growlithe", "arcanine", "poliwag", "poliwhirl", "poliwrath", "abra",
  "kadabra", "alakazam", "machop", "machoke", "machamp", "bellsprout",
  "weepinbell", "victreebel", "tentacool", "tentacruel", "geodude", "graveler",
  "golem", "ponyta", "rapidash", "slowpoke", "slowbro", "magnemite",
  "magneton", "farfetchd", "doduo", "dodrio", "seel", "dewgong", "grimer",
  "muk", "shellder", "cloyster", "gastly", "haunter", "gengar", "onix",
  "drowzee", "hypno", "krabby", "kingler", "voltorb", "electrode", "exeggcute",
  "exeggutor", "cubone", "marowak", "hitmonlee", "hitmonchan", "lickitung",
  "koffing", "weezing", "rhyhorn", "rhydon", "chansey", "tangela", "kangaskhan",
  "horsea", "seadra", "goldeen", "seaking", "staryu", "starmie", "mr-mime",
  "scyther", "jynx", "electabuzz", "magmar", "pinsir", "tauros", "magikarp",
  "gyarados", "lapras", "ditto", "eevee", "vaporeon", "jolteon", "flareon",
  "porygon", "omanyte", "omastar", "kabuto", "kabutops", "aerodactyl",
  "snorlax", "articuno", "zapdos", "moltres", "dratini", "dragonair",
  "dragonite", "mewtwo", "mew",
];

const base = (id: string, name: string, types: TypeName[], hp: number, atk: number, def: number, catchRate: number, xpYield: number, extra: Partial<SpeciesDef> = {}): SpeciesDef => ({
  id,
  name,
  types,
  baseHp: hp,
  baseAtk: atk,
  baseDef: def,
  catchRate,
  xpYield,
  ...extra,
});

/** Stats for species that actually appear in the game. */
export const SPECIES: Record<string, SpeciesDef> = Object.fromEntries(
  [
    base("bulbasaur", "Bulbasaur", ["grass", "poison"], 45, 49, 49, 45, 64),
    base("ivysaur", "Ivysaur", ["grass", "poison"], 60, 62, 63, 45, 142),
    base("venusaur", "Venusaur", ["grass", "poison"], 80, 82, 83, 45, 236),
    base("charmander", "Charmander", ["fire"], 39, 52, 43, 45, 62),
    base("charmeleon", "Charmeleon", ["fire"], 58, 64, 58, 45, 142),
    base("charizard", "Charizard", ["fire", "flying"], 78, 84, 78, 45, 240),
    base("squirtle", "Squirtle", ["water"], 44, 48, 65, 45, 63),
    base("wartortle", "Wartortle", ["water"], 59, 63, 80, 45, 142),
    base("blastoise", "Blastoise", ["water"], 79, 83, 100, 45, 239),
    base("pidgey", "Pidgey", ["normal", "flying"], 40, 45, 40, 255, 50),
    base("rattata", "Rattata", ["normal"], 30, 56, 35, 255, 51),
    base("spearow", "Spearow", ["normal", "flying"], 40, 60, 30, 255, 52),
    base("ekans", "Ekans", ["poison"], 35, 60, 44, 255, 58),
    base("pikachu", "Pikachu", ["electric"], 35, 55, 40, 190, 82),
    base("oddish", "Oddish", ["grass", "poison"], 45, 50, 55, 255, 60),
    base("meowth", "Meowth", ["normal"], 40, 45, 35, 255, 58),
    base("caterpie", "Caterpie", ["bug"], 45, 30, 35, 255, 39),
    base("metapod", "Metapod", ["bug"], 50, 20, 55, 255, 72),
    base("weedle", "Weedle", ["bug", "poison"], 40, 35, 30, 255, 39),
    base("zubat", "Zubat", ["poison", "flying"], 40, 45, 35, 255, 49, { nightOnly: true }),
    base("geodude", "Geodude", ["rock", "ground"], 40, 80, 100, 255, 60),
    base("diglett", "Diglett", ["ground"], 10, 55, 25, 255, 53),
    base("onix", "Onix", ["rock", "ground"], 35, 45, 160, 45, 77),
    base("staryu", "Staryu", ["water"], 30, 45, 55, 225, 68),
    base("raichu", "Raichu", ["electric"], 60, 90, 55, 75, 122),
    // post-game champions & richer wild variety
    base("vileplume", "Vileplume", ["grass", "poison"], 75, 80, 85, 45, 216),
    base("weezing", "Weezing", ["poison"], 65, 90, 120, 60, 172),
    base("rhydon", "Rhydon", ["ground", "rock"], 105, 130, 120, 60, 170),
    base("nidoran-f", "Nidoran♀", ["poison"], 55, 47, 52, 235, 59),
    base("mankey", "Mankey", ["fighting"], 40, 80, 35, 190, 61),
    base("growlithe", "Growlithe", ["fire"], 55, 70, 45, 190, 70),
    base("ponyta", "Ponyta", ["fire"], 50, 85, 55, 190, 82),
    base("tentacool", "Tentacool", ["water", "poison"], 40, 40, 35, 190, 67),
    // Mythical easter egg — Celebi, the time traveler (beyond the 151)
    base("celebi", "Celebi", ["psychic", "grass"], 100, 100, 100, 3, 400, { nightOnly: false }),
  ].map((s) => [s.id, s]),
);

/** Fallback stats for dex entries that never appear in the wild. */
export const DEFAULT_STATS: Omit<SpeciesDef, "id" | "name" | "types"> = {
  baseHp: 50,
  baseAtk: 48,
  baseDef: 45,
  catchRate: 120,
  xpYield: 60,
};

export function getSpecies(id: string): SpeciesDef {
  return (
    SPECIES[id] ?? {
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      types: ["normal"],
      ...DEFAULT_STATS,
    }
  );
}

// ---------------------------------------------------------------------------
// Moves
// ---------------------------------------------------------------------------

export const MOVES: Record<string, MoveDef> = {
  tackle: { id: "tackle", name: "Tackle", type: "normal", power: 40, accuracy: 100, target: "enemy" },
  "quick-attack": { id: "quick-attack", name: "Quick Attack", type: "normal", power: 40, accuracy: 100, target: "enemy" },
  scratch: { id: "scratch", name: "Scratch", type: "normal", power: 40, accuracy: 100, target: "enemy" },
  bite: { id: "bite", name: "Bite", type: "normal", power: 60, accuracy: 100, target: "enemy" },
  "vine-whip": { id: "vine-whip", name: "Vine Whip", type: "grass", power: 45, accuracy: 100, target: "enemy" },
  "leech-seed": { id: "leech-seed", name: "Leech Seed", type: "grass", power: 20, accuracy: 90, target: "enemy", status: "leech", drain: true },
  "sleep-powder": { id: "sleep-powder", name: "Sleep Powder", type: "grass", power: 0, accuracy: 75, target: "enemy", status: "sleep" },
  ember: { id: "ember", name: "Ember", type: "fire", power: 40, accuracy: 100, target: "enemy" },
  "fire-fang": { id: "fire-fang", name: "Fire Fang", type: "fire", power: 65, accuracy: 95, target: "enemy" },
  "flame-charge": { id: "flame-charge", name: "Flame Charge", type: "fire", power: 0, accuracy: 100, target: "self", healPct: 20 },
  "water-gun": { id: "water-gun", name: "Water Gun", type: "water", power: 40, accuracy: 100, target: "enemy" },
  withdraw: { id: "withdraw", name: "Withdraw", type: "water", power: 0, accuracy: 100, target: "self", healPct: 25 },
  "thunder-shock": { id: "thunder-shock", name: "Thunder Shock", type: "electric", power: 40, accuracy: 100, target: "enemy" },
  thunderbolt: { id: "thunderbolt", name: "Thunderbolt", type: "electric", power: 90, accuracy: 100, target: "enemy" },
  "rock-throw": { id: "rock-throw", name: "Rock Throw", type: "rock", power: 50, accuracy: 90, target: "enemy" },
  "rock-slide": { id: "rock-slide", name: "Rock Slide", type: "rock", power: 75, accuracy: 90, target: "enemy" },
  "gust": { id: "gust", name: "Gust", type: "flying", power: 40, accuracy: 100, target: "enemy" },
  "poison-sting": { id: "poison-sting", name: "Poison Sting", type: "poison", power: 15, accuracy: 100, target: "enemy" },
  // wild-variety moves covering the types the generic fallback can't reach
  peck: { id: "peck", name: "Peck", type: "flying", power: 35, accuracy: 100, target: "enemy" },
  "bug-bite": { id: "bug-bite", name: "Bug Bite", type: "bug", power: 60, accuracy: 100, target: "enemy" },
  "mud-slap": { id: "mud-slap", name: "Mud-Slap", type: "ground", power: 20, accuracy: 100, target: "enemy" },
  "karate-chop": { id: "karate-chop", name: "Karate Chop", type: "fighting", power: 50, accuracy: 100, target: "enemy" },
  acid: { id: "acid", name: "Acid", type: "poison", power: 40, accuracy: 100, target: "enemy" },
  "string-shot": { id: "string-shot", name: "String Shot", type: "bug", power: 10, accuracy: 100, target: "enemy" },
  // status moves: poison & paralysis make the wild-type variety change battle state
  "poison-powder": { id: "poison-powder", name: "Poison Powder", type: "poison", power: 0, accuracy: 75, target: "enemy", status: "poison" },
  "stun-spore": { id: "stun-spore", name: "Stun Spore", type: "grass", power: 0, accuracy: 75, target: "enemy", status: "paralysis" },
  "thunder-wave": { id: "thunder-wave", name: "Thunder Wave", type: "electric", power: 0, accuracy: 90, target: "enemy", status: "paralysis" },
  sludge: { id: "sludge", name: "Sludge", type: "poison", power: 65, accuracy: 100, target: "enemy", status: "poison" },
  // psychic moves for Celebi & future mythicals
  confusion: { id: "confusion", name: "Confusion", type: "psychic", power: 50, accuracy: 100, target: "enemy" },
  "psybeam": { id: "psybeam", name: "Psybeam", type: "psychic", power: 65, accuracy: 100, target: "enemy" },
  "ancient-power": { id: "ancient-power", name: "Ancient Power", type: "rock", power: 60, accuracy: 100, target: "enemy" },
};

const STARTER_MOVES: Record<string, string[]> = {
  bulbasaur: ["tackle", "vine-whip", "leech-seed", "sleep-powder"],
  charmander: ["scratch", "ember", "fire-fang", "flame-charge"],
  squirtle: ["tackle", "water-gun", "bite", "withdraw"],
};

/** Evolutions only need to be defined for the starter chains. */
export const EVOLUTIONS: Record<string, { to: string; atLevel: number }> = {
  bulbasaur: { to: "ivysaur", atLevel: 16 },
  ivysaur: { to: "venusaur", atLevel: 32 },
  charmander: { to: "charmeleon", atLevel: 16 },
  charmeleon: { to: "charizard", atLevel: 36 },
  squirtle: { to: "wartortle", atLevel: 16 },
  wartortle: { to: "blastoise", atLevel: 36 },
};

const STAB_FALLBACK: Record<TypeName, string> = {
  normal: "tackle",
  grass: "vine-whip",
  fire: "ember",
  water: "water-gun",
  electric: "thunder-shock",
  bug: "tackle",
  poison: "poison-sting",
  ground: "rock-throw",
  rock: "rock-throw",
  flying: "gust",
  ghost: "tackle",
  fighting: "tackle",
  psychic: "confusion",
};

const CHAMPION_MOVES: Record<string, string[]> = {
  onix: ["rock-throw", "rock-slide", "tackle"],
  staryu: ["water-gun", "tackle", "quick-attack"],
  raichu: ["thunder-shock", "thunderbolt", "thunder-wave", "quick-attack"],
  vileplume: ["vine-whip", "leech-seed", "sleep-powder", "poison-powder"],
  weezing: ["sludge", "poison-sting", "rock-slide", "tackle"],
  rhydon: ["rock-throw", "rock-slide", "tackle"],
};

/**
 * Per-species wild learnsets (3–4 moves each) so every encounter has real
 * type variety instead of the generic STAB+tackle fallback. Keyed by the
 * lowercase species id; every id must resolve in MOVES (validated by tests).
 */
export const WILD_MOVES: Record<string, string[]> = {
  pidgey: ["tackle", "gust", "quick-attack", "peck"],
  rattata: ["tackle", "quick-attack", "bite"],
  spearow: ["peck", "gust", "quick-attack"],
  ekans: ["bite", "poison-sting", "acid"],
  pikachu: ["thunder-shock", "thunder-wave", "quick-attack", "scratch"],
  oddish: ["acid", "vine-whip", "leech-seed", "sleep-powder"],
  meowth: ["scratch", "bite", "quick-attack"],
  caterpie: ["string-shot", "bug-bite", "tackle"],
  metapod: ["string-shot", "bug-bite", "tackle"],
  weedle: ["string-shot", "bug-bite", "poison-sting"],
  zubat: ["bite", "gust", "poison-sting", "quick-attack"],
  geodude: ["rock-throw", "mud-slap", "tackle"],
  diglett: ["mud-slap", "scratch", "tackle"],
  "nidoran-f": ["poison-sting", "tackle", "bite", "acid"],
  mankey: ["karate-chop", "scratch", "tackle"],
  growlithe: ["ember", "bite", "quick-attack", "fire-fang"],
  ponyta: ["ember", "quick-attack", "tackle", "flame-charge"],
  tentacool: ["water-gun", "acid", "poison-sting"],
};

export function starterMovesFor(speciesId: string): MoveDef[] {
  const ids = STARTER_MOVES[speciesId] ?? ["tackle"];
  return ids.map((id) => MOVES[id]).filter(Boolean);
}

export function defaultMovesFor(speciesId: string, championId?: string): MoveDef[] {
  if (championId) {
    // CHAMPION_MOVES is keyed by the boss's SPECIES id ("onix"), so resolve
    // the champion id ("brock") to its species before looking up the pool.
    const champ = CHAMPIONS.find((c) => c.id === championId);
    const bossSpecies = champ ? champ.speciesId : championId;
    if (CHAMPION_MOVES[bossSpecies]) {
      return CHAMPION_MOVES[bossSpecies].map((id) => MOVES[id]).filter(Boolean);
    }
  }
  // Wild species with a real learnset use it; anything else falls back to the
  // generic STAB + tackle pair so no species ever fights without moves.
  const learnset = WILD_MOVES[speciesId];
  if (learnset) {
    return learnset.map((id) => MOVES[id]).filter(Boolean);
  }
  const def = getSpecies(speciesId);
  const stab = STAB_FALLBACK[def.types[0]] ?? "tackle";
  const ids = [stab, "tackle"];
  return ids.map((id) => MOVES[id]).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Type chart (offensive multiplier, defender side lists each type once)
// ---------------------------------------------------------------------------

export const TYPE_CHART: Record<TypeName, Partial<Record<TypeName, number>>> = {
  normal: { rock: 0.5, ghost: 0 },
  grass: { fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, water: 2, ground: 2, rock: 2 },
  fire: { fire: 0.5, water: 0.5, rock: 0.5, grass: 2, bug: 2 },
  water: { water: 0.5, grass: 0.5, fire: 2, ground: 2, rock: 2 },
  electric: { electric: 0.5, grass: 0.5, ground: 0, water: 2, flying: 2 },
  bug: { fire: 0.5, grass: 2, poison: 2, flying: 0.5, ghost: 0.5, fighting: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5 },
  ground: { fire: 2, electric: 2, poison: 2, rock: 2, grass: 0.5, bug: 0.5, flying: 0 },
  rock: { fire: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5 },
  flying: { grass: 2, bug: 2, fighting: 2, electric: 0.5, rock: 0.5 },
  ghost: { normal: 0 },
  fighting: { normal: 2, rock: 2, ghost: 0 },
  psychic: { poison: 2, fighting: 2, psychic: 0.5, ghost: 0.5 },
};

// ---------------------------------------------------------------------------
// Biomes, time cycle, champions, shop, items
// ---------------------------------------------------------------------------

export const BIOMES: BiomeDef[] = [
  {
    id: "plains",
    name: "Route 1",
    pool: [
      "pidgey",
      "rattata",
      "caterpie",
      "oddish",
      "meowth",
      "spearow",
      // post-variety additions: the species added for the wild-type pass
      "nidoran-f",
      "mankey",
      "growlithe",
      "ponyta",
    ],
    ground: "#b5834a",
    grass: "#4caf50",
    accent: "#2e7d32",
    hill: "#8bc34a",
    soil: "#8a5a2b",
    prop: "#ffd54f",
    prop2: "#fff59d",
  },
  {
    id: "forest",
    name: "Viridian Forest",
    pool: ["pikachu", "metapod", "weedle", "oddish", "caterpie"],
    ground: "#8a5a2b",
    grass: "#3a8f3a",
    accent: "#1f5e1f",
    hill: "#2e7d32",
    soil: "#6e4520",
    prop: "#ff7043",
    prop2: "#ffd0a8",
  },
  {
    id: "cave",
    name: "The Cave",
    pool: ["zubat", "geodude", "diglett", "zubat"],
    ground: "#6e6e78",
    grass: "#4a4a55",
    accent: "#33333d",
    hill: "#565660",
    soil: "#4b4b55",
    prop: "#4fc3f7",
    prop2: "#b3e5fc",
  },
];

export const ROCKET_POOL = ["rattata", "ekans", "zubat", "mankey"];

/** The three Pokémon Center care services. */
export const CENTER_SERVICES: Record<
  CenterServiceId,
  { id: CenterServiceId; name: string; desc: string; price: number }
> = {
  team: { id: "team", name: "Heal Team", desc: "Restores the whole party's HP for free.", price: 0 },
  pc: { id: "pc", name: "Full PC Care", desc: "Heals your team AND every boxed Pokémon.", price: 150 },
  revive: { id: "revive", name: "Revive & Restore", desc: "Revives fainted party members and fully heals all.", price: 400 },
};

/** Market pricing formula knobs for selling/listing Pokémon. */
export const MARKET_TUNING = {
  basePrice: 50,
  pricePerLevel: 12,
  shinyBonus: 500,
  /** Buy-back factor when the local market buys one of your Pokémon. */
  localSellFactor: 0.75,
};

export const CHAMPIONS: ChampionDef[] = [
  { id: "brock", name: "Brock", title: "Gym Leader · Pewter", speciesId: "onix", badge: "Boulder Badge", color: "#8d6e63" },
  { id: "misty", name: "Misty", title: "Gym Leader · Cerulean", speciesId: "staryu", badge: "Cascade Badge", color: "#4fc3f7" },
  { id: "surge", name: "Lt. Surge", title: "Gym Leader · Vermilion", speciesId: "raichu", badge: "Thunder Badge", color: "#ffd54f" },
  { id: "erika", name: "Erika", title: "Gym Leader · Celadon", speciesId: "vileplume", badge: "Rainbow Badge", color: "#3ddc3d" },
  { id: "koga", name: "Koga", title: "Gym Leader · Fuchsia", speciesId: "weezing", badge: "Soul Badge", color: "#9b59b6" },
  { id: "giovanni", name: "Giovanni", title: "Gym Leader · Viridian", speciesId: "rhydon", badge: "Earth Badge", color: "#8d6e63" },
];

export const ITEMS: Record<string, ItemDef> = {
  pokeball: { id: "pokeball", name: "Poké Ball", desc: "Standard capture ball.", price: 200, ballMult: 1 },
  greatball: { id: "greatball", name: "Great Ball", desc: "Better catch rate.", price: 600, ballMult: 1.5 },
  berry: { id: "berry", name: "Oran Berry", desc: "Restores 20 HP instantly.", price: 300, healFlat: 20 },
  sitrus: { id: "sitrus", name: "Sitrus Berry", desc: "Restores 25% of max HP.", price: 500, healPct: 0.25 },
  potion: { id: "potion", name: "Potion", desc: "Restores 20 HP.", price: 300, healFlat: 20 },
  hyperpotion: { id: "hyperpotion", name: "Hyper Potion", desc: "Restores 200 HP.", price: 1200, healFlat: 200 },
};

export const GROUND_ITEM_WEIGHTS: [string, number][] = [
  ["berry", 0.4],
  ["pokeball", 0.35],
  ["sitrus", 0.15],
  ["potion", 0.1],
];

// ---------------------------------------------------------------------------
// Game tuning knobs
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Release version — shown on the landing page, the in-game Save tab, and the
// packaged desktop installer filename (kept in sync with desktop/package.json).
// ---------------------------------------------------------------------------

export const GAME_VERSION = "1.3.0";

export const TUNING = {
  bannerHeight: 60,
  /** The banner's day sky — a bright retro pixel blue (#6ec4f8). The old
   *  neon-green chroma key is long gone: the browser paints this blue sky,
   *  and the desktop shell window is truly transparent (see desktop/).
   *  `neonGreen` remains only as a legacy constant pinned by tests. */
  skyBlue: "#6ec4f8",
  neonGreen: "#00ff00",
  battleIntervalMs: 2000,
  // Wild encounters roll a completely random delay inside this window each
  // time one ends, so encounters never tick like clockwork.
  encounterMinMs: 5000,
  encounterMaxMs: 20000,
  xpToNext: (level: number) => Math.max(30, level * 30),
  xpPerWildBase: 30,
  moneyPerWild: 10,
  moneyPerRocketBase: 1500,
  moneyPerChampion: 3000,
  championXpMult: 2.5,
  rocketXpMult: 1.2,
  benchXpShare: 0.5,
  shinyChance: 0.01,
  rocketChance: 0.05,
  critChance: 1 / 16,
  minDamage: 1,
  sleepWakeChance: 0.5,
  leechDrainFraction: 1 / 8,
  /** Chance a paralyzed attacker is fully paralyzed and skips its turn. */
  paralysisSkipChance: 0.25,
  /** Fraction of max HP lost to poison each round. */
  poisonTickFraction: 1 / 8,
  catchMilestoneCount: 10,
  catchMilestoneBonus: 0.1,
  xpMilestoneStep: 20,
  biomeStepSize: 500,
  cycleMs: 5 * 60 * 1000,
  badgeDamageBonus: 0.05,
  maxLevel: 100,
  teamMax: 6,
  expShareBench: 0.5,
  /** Same-Type Attack Bonus — matching the attacker's type deals 1.5×. */
  stabMult: 1.5,
};

export const UI = {
  bannerHeight: 60,
  skyBlue: "#6ec4f8",
  /** Legacy chroma-key color — kept only for PIXEL_UI parity tests. */
  neonGreen: "#00ff00",
  fontPixel: '"Press Start 2P", ui-monospace, monospace',
  spriteBase: "https://play.pokemonshowdown.com/sprites/ani",
  bgWhite: "#ffffff",
  ink: "#111111",
  panelYellow: "#ffde00",
  panelRed: "#ff4d4d",
  panelBlue: "#2d6cff",
  panelGreen: "#3ddc3d",
};
