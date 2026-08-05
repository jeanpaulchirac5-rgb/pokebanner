// ---------------------------------------------------------------------------
// Presentation helpers: sprite URL building, offline placeholders, preloading,
// and the shared pixel UI constants. Pure enough to unit-test in Node.
// ---------------------------------------------------------------------------

import { EVOLUTIONS, MOVES, SPECIES, UI } from "./constants";
import type { BiomeDef, MoveDef, WeatherKind } from "./types";

/** Lowercases and normalizes a name into the Showdown sprite id format.
 *  Collapses runs of non-alphanumerics into a single dash and trims edges
 *  ("Mr. Mime" → "mr-mime", "NIDORAN-F" → "nidoran-f"). */
export function toEnglishId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Walking/idle sprite URL (Showdown animated GIF, lowercase id). */
export function urlSpriteWalking(speciesId: string): string {
  return `${UI.spriteBase}/${toEnglishId(speciesId)}.gif`;
}

/** Battle (front) sprite URL. Same asset for now — kept separate for swaps. */
export function urlSpriteCombat(speciesId: string): string {
  return `${UI.spriteBase}/${toEnglishId(speciesId)}.gif`;
}

/** Opponent sprite URL (mirrored in CSS). Kept separate so a back sprite
 *  (e.g. ani-back) can be swapped in later without touching call sites. */
export function urlSpriteOpponent(speciesId: string): string {
  return `${UI.spriteBase}/${toEnglishId(speciesId)}.gif`;
}

/** Shiny variant sprite URL — Showdown hosts animated shiny GIFs alongside
 *  the regular set. Falls back to the normal sprite on error in the UI. */
export function urlSpriteShiny(speciesId: string): string {
  return `${UI.spriteBase}-shiny/${toEnglishId(speciesId)}.gif`;
}

/** Species that have no evolution of their own but ARE someone's evolved form. */
const FINAL_EVOLUTION_FORMS = new Set(
  Object.values(EVOLUTIONS).map((e) => e.to),
);

/**
 * Render scale for a species, so evolution is visible at a glance: starter
 * mid-forms render 1.1× and final forms 1.2× their base size. Everything
 * outside the starter chains (wild Pokémon, legends) renders at 1×.
 */
export function spriteScaleFor(speciesId: string): number {
  const id = toEnglishId(speciesId);
  const step = EVOLUTIONS[id];
  if (step) {
    // Base forms of 3-stage chains stay small; mid forms render slightly bigger.
    return EVOLUTIONS[step.to] ? 1 : 1.1;
  }
  return FINAL_EVOLUTION_FORMS.has(id) ? 1.2 : 1;
}

/**
 * Per-species idle animation class, used while the leader stands still (the
 * turn-around pause at each edge, and the tray pause). Iconic species get
 * curated moves (Pikachu hops, Bulbasaur nods, Gengar floats…); everything
 * else falls back to an archetype from its types, then to the default sway.
 * The classes (idle-hop / idle-nod / idle-wobble / idle-float / idle-rock /
 * idle-flutter / idle-sway) live in index.css and all honor --flip.
 */
const IDLE_ANIM_CURATED: Record<string, string> = {
  // starters + their evolutions
  bulbasaur: "idle-nod", ivysaur: "idle-nod", venusaur: "idle-nod",
  charmander: "idle-hop", charmeleon: "idle-hop", charizard: "idle-flutter",
  squirtle: "idle-wobble", wartortle: "idle-wobble", blastoise: "idle-rock",
  // small bouncy mammals & rodents
  pikachu: "idle-hop", raichu: "idle-hop", eevee: "idle-hop",
  jolteon: "idle-hop", vaporeon: "idle-wobble", flareon: "idle-rock",
  rattata: "idle-hop", raticate: "idle-hop", sandshrew: "idle-hop",
  sandslash: "idle-hop", diglett: "idle-nod", dugtrio: "idle-nod",
  meowth: "idle-hop", persian: "idle-hop", growlithe: "idle-hop",
  arcanine: "idle-rock", ponyta: "idle-hop", rapidash: "idle-hop",
  mankey: "idle-hop", primeape: "idle-hop", doduo: "idle-hop",
  dodrio: "idle-hop", jigglypuff: "idle-hop", wigglytuff: "idle-hop",
  clefairy: "idle-hop", clefable: "idle-hop", voltorb: "idle-hop",
  electrode: "idle-hop", cubone: "idle-hop", marowak: "idle-rock",
  hitmonlee: "idle-hop", hitmonchan: "idle-hop", tauros: "idle-rock",
  // wobbly water dwellers
  poliwag: "idle-wobble", poliwhirl: "idle-wobble", poliwrath: "idle-rock",
  tentacool: "idle-wobble", tentacruel: "idle-wobble", shellder: "idle-wobble",
  cloyster: "idle-rock", horsea: "idle-wobble", seadra: "idle-wobble",
  goldeen: "idle-wobble", seaking: "idle-wobble", staryu: "idle-wobble",
  starmie: "idle-float", lapras: "idle-wobble", psyduck: "idle-wobble",
  golduck: "idle-wobble", slowpoke: "idle-wobble", slowbro: "idle-wobble",
  krabby: "idle-wobble", kingler: "idle-wobble", seel: "idle-wobble",
  dewgong: "idle-wobble", magikarp: "idle-wobble", gyarados: "idle-float",
  omanyte: "idle-wobble", omastar: "idle-rock", kabuto: "idle-wobble",
  kabutops: "idle-wobble",
  // leafy nodders & creeping bugs
  oddish: "idle-nod", gloom: "idle-nod", vileplume: "idle-nod",
  bellsprout: "idle-nod", weepinbell: "idle-nod", victreebel: "idle-nod",
  exeggcute: "idle-nod", exeggutor: "idle-nod", tangela: "idle-nod",
  caterpie: "idle-nod", metapod: "idle-nod", weedle: "idle-nod",
  kakuna: "idle-nod", paras: "idle-nod", parasect: "idle-nod",
  // levitators & spooks
  gastly: "idle-float", haunter: "idle-float", gengar: "idle-float",
  abra: "idle-float", kadabra: "idle-float", alakazam: "idle-float",
  magnemite: "idle-float", magneton: "idle-float", mewtwo: "idle-float",
  mew: "idle-float", celebi: "idle-float",
  // fluttering wings
  pidgey: "idle-flutter", pidgeotto: "idle-flutter", pidgeot: "idle-flutter",
  spearow: "idle-flutter", fearow: "idle-flutter", zubat: "idle-flutter",
  golbat: "idle-flutter", butterfree: "idle-flutter", beedrill: "idle-flutter",
  venomoth: "idle-flutter", scyther: "idle-flutter", farfetchd: "idle-flutter",
  aerodactyl: "idle-flutter",
  // heavyweights
  geodude: "idle-rock", graveler: "idle-rock", golem: "idle-rock",
  onix: "idle-rock", rhyhorn: "idle-rock", rhydon: "idle-rock",
  snorlax: "idle-rock", chansey: "idle-rock", kangaskhan: "idle-rock",
  machop: "idle-rock", machoke: "idle-rock", machamp: "idle-rock",
  nidoqueen: "idle-rock", nidoking: "idle-rock", pinsir: "idle-rock",
};

/** Per-species idle animation class (see IDLE_ANIM_CURATED + type fallback). */
export function idleAnimClass(speciesId: string): string {
  const id = toEnglishId(speciesId);
  const curated = IDLE_ANIM_CURATED[id];
  if (curated) return curated;
  const types = SPECIES[id]?.types ?? [];
  if (types.some((t) => t === "ghost" || t === "psychic")) return "idle-float";
  if (types.some((t) => t === "flying" || t === "bug")) return "idle-flutter";
  if (types.some((t) => t === "rock" || t === "ground")) return "idle-rock";
  if (types.some((t) => t === "water")) return "idle-wobble";
  if (types.some((t) => t === "grass")) return "idle-nod";
  if (types.some((t) => t === "electric" || t === "fire")) return "idle-hop";
  return "idle-sway";
}

// ---------------------------------------------------------------------------
// Per-species WALK animation — the gait the leader and approaching wild
// Pokémon use while MOVING (the idle classes above are for standing still).
// Every species gets its own signature stride: a Rattata scuttles, a Pidgey
// flutters, a Geodude lumbers, an Ekans slithers, a Voltorb bounces…
// The classes (walk-hop / walk-trot / walk-nod / walk-waddle / walk-glide /
// walk-rock / walk-shuffle / walk-flutter / walk-crawl / walk-slither /
// walk-strut / walk-bounce / walk-sway) live in index.css and honor --flip.
// ---------------------------------------------------------------------------

const WALK_ANIM_CURATED: Record<string, string> = {
  // starters + their evolutions
  bulbasaur: "walk-nod", ivysaur: "walk-nod", venusaur: "walk-nod",
  charmander: "walk-hop", charmeleon: "walk-hop", charizard: "walk-glide",
  squirtle: "walk-waddle", wartortle: "walk-waddle", blastoise: "walk-rock",
  // small bouncy mammals & rodents — quick two-step
  pikachu: "walk-hop", raichu: "walk-hop", eevee: "walk-hop",
  jolteon: "walk-hop", vaporeon: "walk-waddle", flareon: "walk-rock",
  rattata: "walk-hop", raticate: "walk-hop", sandshrew: "walk-hop",
  sandslash: "walk-hop", diglett: "walk-nod", dugtrio: "walk-nod",
  meowth: "walk-hop", persian: "walk-hop", growlithe: "walk-hop",
  arcanine: "walk-trot", ponyta: "walk-trot", rapidash: "walk-trot",
  mankey: "walk-hop", primeape: "walk-hop", doduo: "walk-nod",
  dodrio: "walk-nod", jigglypuff: "walk-waddle", wigglytuff: "walk-waddle",
  clefairy: "walk-waddle", clefable: "walk-waddle", voltorb: "walk-bounce",
  electrode: "walk-bounce", cubone: "walk-hop", marowak: "walk-rock",
  hitmonlee: "walk-strut", hitmonchan: "walk-strut", tauros: "walk-trot",
  "nidoran-f": "walk-hop", "nidoran-m": "walk-hop", nidorina: "walk-hop",
  nidorino: "walk-hop", vulpix: "walk-hop", ninetales: "walk-trot",
  // wobbly water dwellers
  poliwag: "walk-waddle", poliwhirl: "walk-waddle", poliwrath: "walk-rock",
  tentacool: "walk-waddle", tentacruel: "walk-waddle", shellder: "walk-waddle",
  cloyster: "walk-rock", horsea: "walk-waddle", seadra: "walk-waddle",
  goldeen: "walk-waddle", seaking: "walk-waddle", staryu: "walk-glide",
  starmie: "walk-glide", lapras: "walk-shuffle", psyduck: "walk-waddle",
  golduck: "walk-waddle", slowpoke: "walk-shuffle", slowbro: "walk-waddle",
  krabby: "walk-crawl", kingler: "walk-crawl", seel: "walk-waddle",
  dewgong: "walk-waddle", magikarp: "walk-crawl", gyarados: "walk-slither",
  omanyte: "walk-crawl", omastar: "walk-rock", kabuto: "walk-crawl",
  kabutops: "walk-strut",
  // leafy nodders & creeping bugs
  oddish: "walk-nod", gloom: "walk-nod", vileplume: "walk-nod",
  bellsprout: "walk-nod", weepinbell: "walk-nod", victreebel: "walk-nod",
  exeggcute: "walk-bounce", exeggutor: "walk-nod", tangela: "walk-crawl",
  caterpie: "walk-crawl", metapod: "walk-crawl", weedle: "walk-crawl",
  kakuna: "walk-crawl", paras: "walk-crawl", parasect: "walk-crawl",
  venonat: "walk-crawl",
  // levitators & spooks
  gastly: "walk-glide", haunter: "walk-glide", gengar: "walk-glide",
  abra: "walk-glide", kadabra: "walk-glide", alakazam: "walk-glide",
  magnemite: "walk-glide", magneton: "walk-glide", mewtwo: "walk-glide",
  mew: "walk-glide", celebi: "walk-glide", koffing: "walk-glide",
  weezing: "walk-glide", drowzee: "walk-shuffle", hypno: "walk-shuffle",
  // fluttering wings
  pidgey: "walk-flutter", pidgeotto: "walk-flutter", pidgeot: "walk-flutter",
  spearow: "walk-flutter", fearow: "walk-flutter", zubat: "walk-flutter",
  golbat: "walk-flutter", butterfree: "walk-flutter", beedrill: "walk-flutter",
  venomoth: "walk-flutter", scyther: "walk-flutter", farfetchd: "walk-strut",
  aerodactyl: "walk-flutter", articuno: "walk-flutter", zapdos: "walk-flutter",
  moltres: "walk-flutter",
  // heavyweights
  geodude: "walk-rock", graveler: "walk-rock", golem: "walk-rock",
  onix: "walk-rock", rhyhorn: "walk-rock", rhydon: "walk-rock",
  snorlax: "walk-shuffle", chansey: "walk-shuffle", kangaskhan: "walk-shuffle",
  machop: "walk-strut", machoke: "walk-strut", machamp: "walk-strut",
  nidoqueen: "walk-rock", nidoking: "walk-rock", pinsir: "walk-rock",
  lickitung: "walk-shuffle",
  // slithering serpents
  ekans: "walk-slither", arbok: "walk-slither", dratini: "walk-slither",
  dragonair: "walk-slither", dragonite: "walk-glide",
  // misc strutters & springers
  grimer: "walk-crawl", muk: "walk-crawl", ditto: "walk-bounce",
  "mr-mime": "walk-strut", jynx: "walk-strut", electabuzz: "walk-strut",
  magmar: "walk-strut", porygon: "walk-glide",
};

/** Per-species WALK animation class (see WALK_ANIM_CURATED + type fallback). */
export function walkAnimClass(speciesId: string): string {
  const id = toEnglishId(speciesId);
  const curated = WALK_ANIM_CURATED[id];
  if (curated) return curated;
  const types = SPECIES[id]?.types ?? [];
  if (types.some((t) => t === "ghost" || t === "psychic")) return "walk-glide";
  if (types.some((t) => t === "flying")) return "walk-flutter";
  if (types.some((t) => t === "bug")) return "walk-crawl";
  if (types.some((t) => t === "rock" || t === "ground")) return "walk-rock";
  if (types.some((t) => t === "poison")) return "walk-slither";
  if (types.some((t) => t === "water")) return "walk-waddle";
  if (types.some((t) => t === "grass")) return "walk-nod";
  if (types.some((t) => t === "electric" || t === "fire")) return "walk-hop";
  if (types.some((t) => t === "fighting")) return "walk-strut";
  return "walk-sway";
}

// ---------------------------------------------------------------------------
// Per-gait walking dust — every movement style kicks up its own footprint.
// A Gligar-style glider never touches the ground (no dust at all), a hopper
// scuffs small puffs, a slithering Ekans drags a steady medium trail, and
// the heavy/lurching gaits (Geodude lumbering, Snorlax shuffling, Tauros
// trotting) throw up big thudding clouds. The banner sizes each puff from
// the level and paces spawning from the interval.
// ---------------------------------------------------------------------------

export interface DustSpec {
  /** 0 = no dust (gliders/floaters), 1 = small, 2 = medium, 3 = large. */
  level: 0 | 1 | 2 | 3;
  /** How often (ms) a puff kicks up while that gait plays. */
  intervalMs: number;
}

const WALK_DUST: Record<string, DustSpec> = {
  // Hovering gaits never touch the ground — no dust at all.
  "walk-glide": { level: 0, intervalMs: 0 },
  // Light-footed: flyers barely brush the grass; hoppers land on their toes.
  "walk-flutter": { level: 1, intervalMs: 950 },
  "walk-hop": { level: 1, intervalMs: 800 },
  "walk-nod": { level: 1, intervalMs: 850 },
  "walk-waddle": { level: 1, intervalMs: 800 },
  // Ground-scraping bodies drag along, leaving a steady medium trail.
  "walk-crawl": { level: 2, intervalMs: 650 },
  "walk-slither": { level: 2, intervalMs: 600 },
  "walk-strut": { level: 2, intervalMs: 650 },
  // Heavy / lurching strides: big puffs, kicked up more often.
  "walk-rock": { level: 3, intervalMs: 550 },
  "walk-trot": { level: 3, intervalMs: 500 },
  "walk-shuffle": { level: 3, intervalMs: 600 },
  "walk-bounce": { level: 3, intervalMs: 450 },
  // Default gentle gait: light small puffs.
  "walk-sway": { level: 1, intervalMs: 800 },
};

/** Dust spec for a walk-gait class (default: light small puffs). */
export function walkDustFor(walkClass: string): DustSpec {
  return WALK_DUST[walkClass] ?? { level: 1, intervalMs: 800 };
}

/** Pixel size of a dust puff for a given level (0 = none rendered). */
export const DUST_LEVEL_PX: Record<DustSpec["level"], number> = {
  0: 0,
  1: 6,
  2: 8,
  3: 11,
};

// ---------------------------------------------------------------------------
// Per-species COMBAT pose — instead of standing rigidly in a single static
// stance, each species holds its own fighting pose during battle: a crouching
// Rattata coiled to spring, a rearing Rapidash, a hovering Gengar, a planted
// Snorlax. Iconic species get curated poses; everything else falls back to an
// archetype from its types, then to the ready stance. The classes
// (pose-ready / pose-crouch / pose-lean / pose-coil / pose-rear /
// pose-hover / pose-sway / pose-hunker) live in index.css and honor --flip.
// ---------------------------------------------------------------------------

const COMBAT_POSE_CURATED: Record<string, string> = {
  // starters + their evolutions
  bulbasaur: "pose-lean", ivysaur: "pose-lean", venusaur: "pose-hunker",
  charmander: "pose-rear", charmeleon: "pose-rear", charizard: "pose-hover",
  squirtle: "pose-crouch", wartortle: "pose-crouch", blastoise: "pose-hunker",
  // small bouncy mammals & rodents
  pikachu: "pose-ready", raichu: "pose-ready", eevee: "pose-ready",
  jolteon: "pose-ready", vaporeon: "pose-sway", flareon: "pose-rear",
  rattata: "pose-crouch", raticate: "pose-crouch", sandshrew: "pose-crouch",
  sandslash: "pose-crouch", diglett: "pose-crouch", dugtrio: "pose-crouch",
  meowth: "pose-crouch", persian: "pose-crouch", growlithe: "pose-crouch",
  arcanine: "pose-rear", ponyta: "pose-rear", rapidash: "pose-rear",
  mankey: "pose-ready", primeape: "pose-ready", doduo: "pose-ready",
  dodrio: "pose-ready", jigglypuff: "pose-sway", wigglytuff: "pose-sway",
  clefairy: "pose-sway", clefable: "pose-sway", cubone: "pose-ready",
  marowak: "pose-hunker", voltorb: "pose-ready", electrode: "pose-ready",
  tauros: "pose-rear", "nidoran-f": "pose-crouch", "nidoran-m": "pose-crouch",
  nidorina: "pose-crouch", nidorino: "pose-crouch", vulpix: "pose-ready",
  ninetales: "pose-rear",
  // wobbly water dwellers
  poliwag: "pose-sway", poliwhirl: "pose-sway", poliwrath: "pose-hunker",
  tentacool: "pose-sway", tentacruel: "pose-sway", shellder: "pose-crouch",
  cloyster: "pose-hunker", horsea: "pose-sway", seadra: "pose-sway",
  goldeen: "pose-sway", seaking: "pose-sway", staryu: "pose-sway",
  starmie: "pose-hover", lapras: "pose-sway", psyduck: "pose-sway",
  golduck: "pose-sway", slowpoke: "pose-sway", slowbro: "pose-sway",
  krabby: "pose-crouch", kingler: "pose-hunker", seel: "pose-sway",
  dewgong: "pose-sway", magikarp: "pose-sway", gyarados: "pose-coil",
  omanyte: "pose-sway", omastar: "pose-hunker", kabuto: "pose-crouch",
  kabutops: "pose-ready",
  // leafy nodders & creeping bugs
  oddish: "pose-lean", gloom: "pose-lean", vileplume: "pose-lean",
  bellsprout: "pose-lean", weepinbell: "pose-lean", victreebel: "pose-lean",
  exeggcute: "pose-ready", exeggutor: "pose-lean", tangela: "pose-coil",
  caterpie: "pose-crouch", metapod: "pose-hunker", weedle: "pose-crouch",
  kakuna: "pose-hunker", paras: "pose-crouch", parasect: "pose-crouch",
  venonat: "pose-crouch",
  // levitators & spooks
  gastly: "pose-hover", haunter: "pose-hover", gengar: "pose-hover",
  abra: "pose-hover", kadabra: "pose-hover", alakazam: "pose-hover",
  magnemite: "pose-hover", magneton: "pose-hover", mewtwo: "pose-hover",
  mew: "pose-hover", celebi: "pose-hover", koffing: "pose-hover",
  weezing: "pose-hover", drowzee: "pose-sway", hypno: "pose-sway",
  // fluttering wings
  pidgey: "pose-hover", pidgeotto: "pose-hover", pidgeot: "pose-hover",
  spearow: "pose-hover", fearow: "pose-hover", zubat: "pose-hover",
  golbat: "pose-hover", butterfree: "pose-hover", beedrill: "pose-hover",
  venomoth: "pose-hover", scyther: "pose-ready", farfetchd: "pose-ready",
  aerodactyl: "pose-hover", articuno: "pose-hover", zapdos: "pose-hover",
  moltres: "pose-hover", dragonite: "pose-hover",
  // heavyweights
  geodude: "pose-hunker", graveler: "pose-hunker", golem: "pose-hunker",
  onix: "pose-coil", rhyhorn: "pose-hunker", rhydon: "pose-hunker",
  snorlax: "pose-hunker", chansey: "pose-sway", kangaskhan: "pose-hunker",
  machop: "pose-ready", machoke: "pose-ready", machamp: "pose-ready",
  nidoqueen: "pose-hunker", nidoking: "pose-hunker", pinsir: "pose-ready",
  hitmonlee: "pose-ready", hitmonchan: "pose-ready",
  // slithering serpents
  ekans: "pose-coil", arbok: "pose-coil", dratini: "pose-coil",
  dragonair: "pose-coil",
  // misc strutters & springers
  grimer: "pose-crouch", muk: "pose-hunker", ditto: "pose-ready",
  "mr-mime": "pose-ready", jynx: "pose-ready", electabuzz: "pose-ready",
  magmar: "pose-ready", porygon: "pose-hover", lickitung: "pose-sway",
};

/** Per-species COMBAT pose class (see COMBAT_POSE_CURATED + type fallback). */
export function combatPoseClass(speciesId: string): string {
  const id = toEnglishId(speciesId);
  const curated = COMBAT_POSE_CURATED[id];
  if (curated) return curated;
  const types = SPECIES[id]?.types ?? [];
  if (types.some((t) => t === "ghost" || t === "psychic" || t === "flying"))
    return "pose-hover";
  if (types.some((t) => t === "rock" || t === "ground")) return "pose-hunker";
  if (types.some((t) => t === "fighting")) return "pose-ready";
  if (types.some((t) => t === "poison")) return "pose-coil";
  if (types.some((t) => t === "water")) return "pose-sway";
  if (types.some((t) => t === "grass")) return "pose-lean";
  if (types.some((t) => t === "fire" || t === "electric")) return "pose-rear";
  if (types.some((t) => t === "bug")) return "pose-crouch";
  return "pose-ready";
}
/**
 * Flinch animation for a critical hit — a brief, species-flavored recoil on
 * the sprite that takes the crit. Keyed off the species' combat pose (from
 * combatPoseClass), so a hovering Gengar wobbles, a hunkered Snorlax heaves,
 * and a springy Pikachu recoils. The classes (flinch-recoil / flinch-wobble /
 * flinch-heave / flinch-pitch) live in index.css and honor --flip.
 */
const POSE_FLINCH: Record<string, string> = {
  "pose-ready": "flinch-recoil",
  "pose-crouch": "flinch-recoil",
  "pose-hover": "flinch-wobble",
  "pose-sway": "flinch-wobble",
  "pose-hunker": "flinch-heave",
  "pose-coil": "flinch-heave",
  "pose-lean": "flinch-pitch",
  "pose-rear": "flinch-pitch",
};

/** Flinch animation class for a combat-pose class (default: sharp recoil). */
export function flinchClass(combatPose: string): string {
  return POSE_FLINCH[combatPose] ?? "flinch-recoil";
}

/**
 * Per-move-type attack FX: a flat color + a chunky glyph used by the banner's
 * impact burst animation. Pure and deterministic so tests can pin the map.
 */
const TYPE_FX: Record<string, { color: string; glyph: string }> = {
  normal: { color: "#9aa0a6", glyph: "✦" },
  grass: { color: "#4caf50", glyph: "❀" },
  fire: { color: "#ff5722", glyph: "★" },
  water: { color: "#2196f3", glyph: "❋" },
  electric: { color: "#ffeb3b", glyph: "⚡" },
  bug: { color: "#8bc34a", glyph: "✳" },
  poison: { color: "#9c27b0", glyph: "☠" },
  ground: { color: "#a16b2f", glyph: "◈" },
  rock: { color: "#795548", glyph: "◆" },
  flying: { color: "#90caf9", glyph: "✦" },
  ghost: { color: "#673ab7", glyph: "✧" },
  fighting: { color: "#e64a19", glyph: "✊" },
  psychic: { color: "#e91e63", glyph: "✪" },
};

export interface MoveFx {
  color: string;
  glyph: string;
}

/** Resolve a move id to its type-colored impact FX (generic fallback). */
export function moveFxById(moveId: string): MoveFx {
  return moveFxByMove(MOVES[moveId]);
}

/** Resolve a MoveDef to its type-colored impact FX (generic fallback). */
export function moveFxByMove(move: MoveDef | undefined): MoveFx {
  const fx = move ? TYPE_FX[move.type] : undefined;
  return fx ?? { color: "#9aa0a6", glyph: "✦" };
}

/** Resolve a move NAME (as it appears in battle-log messages like
 *  "Bulbasaur used Vine Whip") to its FX. Case-insensitive; falls back to the
 *  generic FX when the name doesn't match any registered move. */
export function moveFxByName(name: string): MoveFx {
  const target = name.trim().toLowerCase();
  for (const def of Object.values(MOVES)) {
    if (def.name.toLowerCase() === target) {
      return moveFxByMove(def);
    }
  }
  return { color: "#9aa0a6", glyph: "✦" };
}

/**
 * Pixel-art Nurse Joy sprite (data URI). A pink-haired nurse with a red-cross
 * hat — drawn as chunky rects with crispEdges so it reads as retro pixel art
 * next to the Showdown GIFs. Pure + deterministic for tests.
 */
export function nurseJoySprite(size = 32): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" shape-rendering="crispEdges">` +
    // hat (red cross on white)
    `<rect x="${Math.round(size * 0.25)}" y="${Math.round(size * 0.1)}" width="${Math.round(size * 0.5)}" height="${Math.round(size * 0.15)}" fill="#ffffff"/>` +
    `<rect x="${Math.round(size * 0.42)}" y="${Math.round(size * 0.12)}" width="${Math.round(size * 0.16)}" height="${Math.round(size * 0.1)}" fill="#e53935"/>` +
    `<rect x="${Math.round(size * 0.46)}" y="${Math.round(size * 0.1)}" width="${Math.round(size * 0.08)}" height="${Math.round(size * 0.15)}" fill="#e53935"/>` +
    // pink hair
    `<rect x="${Math.round(size * 0.22)}" y="${Math.round(size * 0.25)}" width="${Math.round(size * 0.56)}" height="${Math.round(size * 0.15)}" fill="#f06292"/>` +
    // face
    `<rect x="${Math.round(size * 0.3)}" y="${Math.round(size * 0.4)}" width="${Math.round(size * 0.4)}" height="${Math.round(size * 0.2)}" fill="#ffe0b2"/>` +
    // eyes
    `<rect x="${Math.round(size * 0.36)}" y="${Math.round(size * 0.44)}" width="${Math.round(size * 0.07)}" height="${Math.round(size * 0.07)}" fill="#111111"/>` +
    `<rect x="${Math.round(size * 0.57)}" y="${Math.round(size * 0.44)}" width="${Math.round(size * 0.07)}" height="${Math.round(size * 0.07)}" fill="#111111"/>` +
    // body (white uniform + red cross)
    `<rect x="${Math.round(size * 0.24)}" y="${Math.round(size * 0.6)}" width="${Math.round(size * 0.52)}" height="${Math.round(size * 0.3)}" fill="#ffffff"/>` +
    `<rect x="${Math.round(size * 0.43)}" y="${Math.round(size * 0.62)}" width="${Math.round(size * 0.14)}" height="${Math.round(size * 0.26)}" fill="#e53935"/>` +
    `<rect x="${Math.round(size * 0.47)}" y="${Math.round(size * 0.62)}" width="${Math.round(size * 0.06)}" height="${Math.round(size * 0.26)}" fill="#ffffff"/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Pixel placeholder used while a GIF loads or offline. Inline SVG data URI. */
export function placeholderSprite(speciesId: string, size = 32): string {
  const id = toEnglishId(speciesId);
  const hue = hashHue(id);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="hsl(${hue} 70% 45%)"/>` +
    `<rect x="${Math.round(size * 0.25)}" y="${Math.round(size * 0.2)}" width="${Math.round(size * 0.5)}" height="${Math.round(size * 0.45)}" fill="hsl(${(hue + 40) % 360} 70% 30%)"/>` +
    `<rect x="${Math.round(size * 0.3)}" y="${Math.round(size * 0.6)}" width="${Math.round(size * 0.4)}" height="${Math.round(size * 0.2)}" fill="hsl(${hue} 60% 65%)"/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function hashHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

export interface PreloadResult {
  urls: string[];
  /** How many were actually dispatched (0 when no Image API, e.g. Node). */
  dispatched: number;
}

/** Preloads animated sprites into the browser cache to avoid flicker. */
export function preloadSprites(speciesIds: string[], kind: "walk" | "combat" = "walk"): PreloadResult {
  const urls = speciesIds.map((id) =>
    kind === "walk" ? urlSpriteWalking(id) : urlSpriteCombat(id),
  );
  let dispatched = 0;
  if (typeof Image !== "undefined") {
    for (const url of urls) {
      const img = new Image();
      img.src = url;
      dispatched++;
    }
  }
  return { urls, dispatched };
}

// ---------------------------------------------------------------------------
// Pixel scenery generators — pure SVG data-URI tiles (128px wide, repeat-x).
// Three parallax layers per biome: a far silhouette, mid grass + biome props,
// and a near ground line. Deterministic for a given biome so tests can pin
// colors/layout, and cheap enough to regenerate on every render.
// ---------------------------------------------------------------------------

function svgUri(w: number, h: number, body: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" shape-rendering="crispEdges">` +
    body +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Columns of silhouettes: [heights...] drawn as stepped rects, 8px wide. */
function silhouette(heights: number[], fill: string, ridge: string, h: number): string {
  const parts: string[] = [];
  heights.forEach((height, i) => {
    const x = i * 8;
    if (height <= 0) return;
    parts.push(`<rect x="${x}" y="${h - height}" width="8" height="${height}" fill="${fill}"/>`);
    parts.push(`<rect x="${x}" y="${h - height}" width="8" height="1" fill="${ridge}"/>`);
  });
  return parts.join("");
}

/** Far layer: rolling hills (plains), treetop canopy (forest), rock spires (cave). */
export function backdropSvg(biome: BiomeDef): string {
  const H = 20;
  const hills: Record<string, number[]> = {
    plains: [0, 0, 2, 5, 8, 10, 12, 10, 8, 6, 4, 6, 9, 11, 9, 5],
    forest: [10, 14, 16, 14, 12, 14, 17, 15, 12, 13, 16, 14, 11, 13, 15, 12],
    cave: [14, 6, 16, 8, 12, 5, 15, 7, 13, 6, 16, 9, 11, 5, 14, 8],
  };
  const heights = hills[biome.id] ?? hills.plains;
  return svgUri(128, H, silhouette(heights, biome.hill, biome.soil, H));
}

/** Biome props placed on the mid layer, one per 32px slot. */
function propRects(biome: BiomeDef, x: number): string {
  if (biome.id === "forest") {
    // mushroom: soil stem + prop cap + prop2 spots
    return (
      `<rect x="${x + 13}" y="9" width="2" height="3" fill="${biome.soil}"/>` +
      `<rect x="${x + 11}" y="6" width="6" height="3" fill="${biome.prop}"/>` +
      `<rect x="${x + 12}" y="7" width="1" height="1" fill="${biome.prop2}"/>` +
      `<rect x="${x + 15}" y="6" width="1" height="1" fill="${biome.prop2}"/>`
    );
  }
  if (biome.id === "cave") {
    // crystal: prop shard with prop2 shine facet
    return (
      `<rect x="${x + 13}" y="4" width="2" height="2" fill="${biome.prop}"/>` +
      `<rect x="${x + 12}" y="6" width="4" height="4" fill="${biome.prop}"/>` +
      `<rect x="${x + 13}" y="10" width="2" height="2" fill="${biome.prop}"/>` +
      `<rect x="${x + 14}" y="5" width="1" height="4" fill="${biome.prop2}"/>`
    );
  }
  // plains: flower — accent stem, prop petals, prop2 center
  return (
    `<rect x="${x + 13}" y="8" width="1" height="4" fill="${biome.accent}"/>` +
    `<rect x="${x + 11}" y="5" width="5" height="3" fill="${biome.prop}"/>` +
    `<rect x="${x + 13}" y="5" width="1" height="1" fill="${biome.prop2}"/>`
  );
}

/** Mid layer: grass line, 3-blade tufts, biome props. */
export function scenerySvg(biome: BiomeDef): string {
  const parts: string[] = [];
  const H = 14;
  // base grass strip with a light top edge
  parts.push(`<rect width="128" height="4" y="${H - 4}" fill="${biome.grass}"/>`);
  parts.push(`<rect width="128" height="1" y="${H - 4}" fill="${biome.accent}"/>`);
  // tufts: three blades per 16px slot
  for (let i = 0; i < 8; i++) {
    const x = i * 16;
    parts.push(
      `<rect x="${x + 3}" y="${H - 6}" width="2" height="3" fill="${biome.grass}"/>`,
      `<rect x="${x + 5}" y="${H - 8}" width="2" height="4" fill="${biome.accent}"/>`,
      `<rect x="${x + 7}" y="${H - 5}" width="2" height="2" fill="${biome.grass}"/>`,
    );
  }
  // props every 32px
  for (let i = 0; i < 4; i++) {
    parts.push(propRects(biome, i * 32));
  }
  return svgUri(128, H, parts.join(""));
}

/** Near ground: dirt base, soil sub-band, pebbles, few grass blades. */
export function groundSvg(biome: BiomeDef): string {
  const H = 8;
  const parts: string[] = [];
  parts.push(`<rect width="128" height="${H}" fill="${biome.ground}"/>`);
  parts.push(`<rect width="128" height="3" y="${H - 3}" fill="${biome.soil}"/>`);
  for (let i = 0; i < 8; i++) {
    const x = i * 16;
    parts.push(
      `<rect x="${x + 3}" y="2" width="2" height="1" fill="${biome.accent}"/>`,
      `<rect x="${x + 9}" y="3" width="1" height="1" fill="${biome.accent}"/>`,
      `<rect x="${x + 13}" y="2" width="1" height="2" fill="${biome.grass}"/>`,
    );
  }
  return svgUri(128, H, parts.join(""));
}

/** Day/night phase for the sky tile — mirrors engine TimePhase. */
export type SkyPhase = "day" | "sunset" | "night";

/** Sky palettes per phase: cloud puff, under-shade, bird chevron (null = none). */
const SKY_PALETTE: Record<
  SkyPhase,
  { cloud: string; shade: string; bird: string | null }
> = {
  day: { cloud: "#ffffff", shade: "#cfd8dc", bird: "#1c1c1c" },
  sunset: { cloud: "#ffe0b3", shade: "#e8b878", bird: "#4a3a28" },
  night: { cloud: "#6b7280", shade: "#4b5563", bird: null },
};

/** Phase-aware sky gradient bands, top → horizon. The bottom band equals
 *  skyColorFor(phase) so the banner's flat backdrop blends with the tile. */
const SKY_BANDS: Record<SkyPhase, readonly string[]> = {
  day: ["#3f7fce", "#4f97de", "#5fb0ee", "#6ec4f8"],
  sunset: ["#c0804a", "#cc8f52", "#d89f5c", "#e3af66"],
  night: ["#1b2347", "#222c54", "#293561", "#303e6e"],
};

/** The flat sky color the banner paints behind the scenery for a phase, so
 *  the gradient tile and the backdrop never show a seam (day = bright pixel
 *  blue; sunset = warm amber; night = deep indigo). */
export function skyColorFor(phase: SkyPhase): string {
  const stack = SKY_BANDS[phase] ?? SKY_BANDS.day;
  return stack[stack.length - 1];
}

/** Sky tile: a blue pixel gradient (dark top → lighter horizon) with drifting
 *  pixel clouds + birds. The sky is real now — no more neon-green key color —
 *  and the bands shift with the phase: warm amber at sunset, deep indigo at
 *  night. Deterministic per (seed, phase) so tests can pin the layout; the
 *  banner passes a stable per-save seed (startedAt) so the tile doesn't churn
 *  while walking. At night the clouds gray out and the birds vanish; at sunset
 *  they take on a warm tint. 128px wide × 28px tall, repeat-x, slowest
 *  parallax. */
function skyTile(seed: number, phase: SkyPhase, withBands: boolean): string {
  const W = 256;
  const H = 28;
  const pal = SKY_PALETTE[phase] ?? SKY_PALETTE.day;
  const parts: string[] = [];
  // Sky backdrop: hard pixel bands so the banner has a real sky gradient
  // (not a flat key color). Skipped for the transparent desktop tile.
  if (withBands) {
    const stack = SKY_BANDS[phase] ?? SKY_BANDS.day;
    const bandH = Math.floor(H / stack.length);
    stack.forEach((fill, i) => {
      parts.push(`<rect width="${W}" height="${bandH}" y="${i * bandH}" fill="${fill}"/>`);
    });
  }
  // LCG so a given seed always paints the same clouds/birds
  let s = (seed >>> 0) || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  // five varied pixel clouds (14–26px puffs): a wider tile + more clouds so
  // the pattern isn't obviously repeating across the banner
  for (let i = 0; i < 5; i++) {
    const w = 14 + Math.floor(rnd() * 12);
    const x = Math.floor(rnd() * (W - w - 4));
    const y = 2 + Math.floor(rnd() * 12);
    parts.push(
      `<rect x="${x + 3}" y="${y}" width="${Math.floor(w * 0.6)}" height="3" fill="${pal.cloud}"/>`,
      `<rect x="${x}" y="${y + 2}" width="${w}" height="3" fill="${pal.cloud}"/>`,
      `<rect x="${x}" y="${y + 5}" width="${w}" height="1" fill="${pal.shade}"/>`,
    );
  }
  // three pixel birds: dark "~" chevrons (birds fly home after sunset)
  if (pal.bird) {
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(rnd() * (W - 18));
      const y = 3 + Math.floor(rnd() * 10);
      parts.push(
        `<rect x="${x}" y="${y}" width="5" height="1" fill="${pal.bird}"/>`,
        `<rect x="${x + 7}" y="${y}" width="5" height="1" fill="${pal.bird}"/>`,
        `<rect x="${x + 5}" y="${y + 1}" width="1" height="1" fill="${pal.bird}"/>`,
        `<rect x="${x + 11}" y="${y + 1}" width="1" height="1" fill="${pal.bird}"/>`,
      );
    }
  }
  return svgUri(W, H, parts.join(""));
}

/** Sky tile: a 256×28 pixel gradient (dark top → lighter horizon) with five
 *  drifting pixel clouds + three birds. The wide tile + the sky-drift
 *  animation (see index.css) mean the sky never looks like a static repeating
 *  stamp: the clouds visibly travel and only repeat every 256px. */
export function skySvg(seed = 0, phase: SkyPhase = "day"): string {
  return skyTile(seed, phase, true);
}

/**
 * Clouds-and-birds ONLY sky tile (transparent background). Used by the
 * Electron desktop shell: the strip there is a transparent window, so the
 * drifting pixel clouds float directly over the desktop wallpaper while the
 * browser keeps the full blue sky (skySvg). Same LCG + palette as skySvg so
 * a given seed paints the identical clouds in both modes.
 */
export function cloudsSvg(seed = 0, phase: SkyPhase = "day"): string {
  return skyTile(seed, phase, false);
}

/** The sky's vertical band gradient as a NON-repeating data URI (1×28,
 *  stretched to 100% width). The old sky background tiled every 256px and
 *  looked repetitive; this never tiles, and the clouds now drift as
 *  individual sprites (see skyClouds). */
export function skyGradientSvg(phase: SkyPhase = "day"): string {
  const stack = SKY_BANDS[phase] ?? SKY_BANDS.day;
  const bandH = Math.floor(28 / stack.length);
  const parts = stack.map(
    (fill, i) => `<rect width="1" height="${bandH}" y="${i * bandH}" fill="${fill}"/>`,
  );
  return svgUri(1, 28, parts.join(""));
}

/** A single pixel cloud (white puffs + under-shade), drawn at width w. */
function cloudShapeUri(w: number, cloud: string, shade: string): string {
  const h = 9;
  const parts = [
    `<rect x="${Math.floor(w * 0.18)}" y="0" width="${Math.floor(w * 0.5)}" height="3" fill="${cloud}"/>`,
    `<rect x="${Math.floor(w * 0.45)}" y="2" width="${Math.floor(w * 0.3)}" height="3" fill="${cloud}"/>`,
    `<rect x="0" y="3" width="${w}" height="4" fill="${cloud}"/>`,
    `<rect x="0" y="7" width="${w}" height="1" fill="${shade}"/>`,
  ];
  return svgUri(w, h, parts.join(""));
}

/** A tiny pixel bird ("~" chevron). */
function birdShapeUri(bird: string): string {
  return svgUri(8, 4, [
    `<rect x="0" y="1" width="4" height="1" fill="${bird}"/>`,
    `<rect x="2" y="2" width="2" height="1" fill="${bird}"/>`,
    `<rect x="4" y="1" width="4" height="1" fill="${bird}"/>`,
    `<rect x="4" y="2" width="2" height="1" fill="${bird}"/>`,
  ].join(""));
}

/** Individual drifting cloud + bird sprites — 12 clouds and 3 birds, each
 *  with its own size, height, speed (durSec) and spread (negative delay), so
 *  the sky never shows a repeating tile. Deterministic per seed. */
export interface SkyCloudSprite {
  key: string;
  uri: string;
  size: number;
  topPx: number;
  durSec: number;
  delaySec: number;
  kind: "cloud" | "bird";
}

export function skyClouds(seed = 0, phase: SkyPhase = "day"): SkyCloudSprite[] {
  let s = (seed >>> 0) || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const pal = SKY_PALETTE[phase] ?? SKY_PALETTE.day;
  const out: SkyCloudSprite[] = [];
  for (let i = 0; i < 12; i++) {
    const w = 14 + Math.floor(rnd() * 13); // 14–26px
    out.push({
      key: `cloud-${i}`,
      uri: cloudShapeUri(w, pal.cloud, pal.shade),
      size: w,
      topPx: 1 + Math.floor(rnd() * 17),
      durSec: 18 + Math.floor(rnd() * 28), // 18–45s
      delaySec: Math.floor(rnd() * 60), // spread along the drift path
      kind: "cloud",
    });
  }
  if (pal.bird) {
    for (let i = 0; i < 3; i++) {
      out.push({
        key: `bird-${i}`,
        uri: birdShapeUri(pal.bird),
        size: 6,
        topPx: 2 + Math.floor(rnd() * 10),
        durSec: 8 + Math.floor(rnd() * 9),
        delaySec: Math.floor(rnd() * 30),
        kind: "bird",
      });
    }
  }
  return out;
}

/** Small pixel sun — chunky disc with corner rays. Color shifts at sunset
 *  so the sun looks like it's sinking into the horizon glow. */
export function sunSvg(variant: "day" | "sunset" = "day"): string {
  const disc = variant === "sunset" ? "#ff9d3c" : "#ffd21f";
  const ray = variant === "sunset" ? "#ffb066" : "#ffe680";
  const core = variant === "sunset" ? "#ffb35c" : "#fff3b0";
  return svgUri(8, 8, [
    `<rect x="2" y="0" width="2" height="2" fill="${ray}"/>`,
    `<rect x="6" y="0" width="2" height="2" fill="${ray}"/>`,
    `<rect x="0" y="2" width="8" height="4" fill="${disc}"/>`,
    `<rect x="2" y="3" width="4" height="2" fill="${core}"/>`,
    `<rect x="2" y="6" width="2" height="2" fill="${ray}"/>`,
    `<rect x="6" y="6" width="2" height="2" fill="${ray}"/>`,
  ].join(""));
}

/** Small pixel crescent moon — lit on the right, pale with a crater pixel. */
export function moonSvg(): string {
  return svgUri(8, 8, [
    `<rect x="5" y="0" width="3" height="2" fill="#f0efe6"/>`,
    `<rect x="4" y="2" width="4" height="2" fill="#f0efe6"/>`,
    `<rect x="4" y="4" width="4" height="2" fill="#f0efe6"/>`,
    `<rect x="5" y="6" width="3" height="2" fill="#f0efe6"/>`,
    `<rect x="5" y="3" width="1" height="1" fill="#d8d6c8"/>`,
  ].join(""));
}

/** A placed celestial sprite (static in the sky, does not scroll). */
export interface CelestialSprite {
  uri: string;
  /** Horizontal anchor in the banner (0–100%). */
  leftPct: number;
  /** Vertical offset from the top of the banner, px. */
  topPx: number;
  /** Sprite pixel size (square). */
  size: number;
}

/** Where the sun/moon sits for a given phase. The sun arcs high by day,
 *  sinks low at sunset while the moon rises opposite, and at night only the
 *  moon remains, up high. Static (no parallax) so it never tiles/repeats. */
export function celestialForPhase(phase: SkyPhase): CelestialSprite[] {
  switch (phase) {
    case "night":
      return [{ uri: moonSvg(), leftPct: 14, topPx: 2, size: 8 }];
    case "sunset":
      return [
        { uri: sunSvg("sunset"), leftPct: 76, topPx: 14, size: 8 }, // sinking
        { uri: moonSvg(), leftPct: 18, topPx: 16, size: 8 }, // rising
      ];
    default:
      return [{ uri: sunSvg("day"), leftPct: 76, topPx: 2, size: 8 }];
  }
}

// ---------------------------------------------------------------------------
// Biome ambient particles — tiny always-animating pixel motes (pollen,
// falling leaves, rising crystal sparkles) that drift through the sky so the
// banner feels alive even when the Pokémon is idle. Deterministic per
// (biome, seed, phase) so the layout never churns between frames.
// ---------------------------------------------------------------------------

export interface AmbientParticle {
  /** Horizontal anchor in the banner (0–100%). */
  leftPct: number;
  /** Vertical anchor from the top of the banner, px. */
  topPx: number;
  /** Square pixel size of the mote. */
  sizePx: number;
  /** Solid pixel color. */
  color: string;
  /** Stagger so motes never all start at once. */
  delaySec: number;
  /** One full drift cycle length. */
  durSec: number;
  /** Horizontal sway amplitude (px), consumed via the --sway CSS var. */
  swayPx: number;
  /** Motion archetype → CSS animation class (ambient-fall/rise/drift). */
  kind: "fall" | "rise" | "drift";
}

const AMBIENT_MOTES: Record<
  string,
  {
    day: { colors: string[]; kind: AmbientParticle["kind"] };
    night: { colors: string[]; kind: AmbientParticle["kind"] };
  }
> = {
  plains: {
    day: { colors: ["#ffd54f", "#fff59d", "#ffffff"], kind: "fall" }, // drifting pollen
    night: { colors: ["#9fb4ff", "#cdd9ff"], kind: "drift" }, // fireflies
  },
  forest: {
    day: { colors: ["#7cb342", "#aed581", "#fff59d"], kind: "fall" }, // leaves + spores
    night: { colors: ["#8fae8f", "#b7c9b7"], kind: "fall" },
  },
  cave: {
    day: { colors: ["#4fc3f7", "#e1f5fe", "#81d4fa"], kind: "rise" }, // crystal sparkles
    night: { colors: ["#5fa8d3", "#9fd4f0"], kind: "rise" },
  },
};

/** Deterministic ambient motes for a biome/phase. Seeded so the layout never
 *  churns between frames; the banner passes the save's startedAt. */
export function ambientParticles(
  biomeId: string,
  seed = 0,
  phase: SkyPhase = "day",
): AmbientParticle[] {
  const spec = AMBIENT_MOTES[biomeId] ?? AMBIENT_MOTES.plains;
  const pal = phase === "night" ? spec.night : spec.day;
  let s = (seed >>> 0) || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const out: AmbientParticle[] = [];
  for (let i = 0; i < 10; i++) {
    out.push({
      leftPct: 3 + rnd() * 94,
      topPx: 2 + rnd() * 24,
      sizePx: rnd() < 0.35 ? 3 : 2,
      color: pal.colors[i % pal.colors.length],
      delaySec: +(rnd() * 8).toFixed(2),
      durSec: +(4 + rnd() * 6).toFixed(2),
      swayPx: 3 + Math.floor(rnd() * 4),
      kind: pal.kind,
    });
  }
  return out;
}

/** A single weather particle: rain streak, snow flake or twinkling star. */
export interface WeatherParticle {
  kind: "rain" | "snow" | "star";
  leftPct: number;
  topPx: number;
  width: number;
  height: number;
  delaySec: number;
  durSec: number;
  color: string;
  /** Horizontal drift in px — rain angles, snow sways, stars ignore it. */
  swayPx: number;
}

/** Full-scene atmosphere tint for a weather state (rgba overlay). Starry only
 *  ever occurs at night, so it deepens the night instead of brightening it.
 *  v1.8.0: Eclipse dims the world into a bronze twilight; Aurora washes the
 *  night in a faint boreal green. */
export function weatherTint(weather: WeatherKind): string {
  switch (weather) {
    case "rain":
      return "rgba(28,48,78,0.30)";
    case "snow":
      return "rgba(214,234,255,0.20)";
    case "starry":
      return "rgba(8,12,42,0.18)";
    case "eclipse":
      return "rgba(58,26,8,0.42)";
    case "aurora":
      return "rgba(20,70,52,0.24)";
    default:
      return "transparent";
  }
}

/**
 * Deterministic particle field for a weather state (LCG from the seed, like
 * ambientParticles). Rain = thin falling streaks, snow = slow swaying flakes,
 * starry = fixed twinkling stars, clear = nothing. The banner passes a stable
 * per-save seed (startedAt) so particles don't reshuffle every frame.
 */
export function weatherParticles(
  weather: WeatherKind,
  seed = 0,
  count = 16,
): WeatherParticle[] {
  if (weather === "clear") return [];
  let s = (seed >>> 0) || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const out: WeatherParticle[] = [];
  for (let i = 0; i < count; i++) {
    if (weather === "rain") {
      out.push({
        kind: "rain",
        leftPct: +(rnd() * 100).toFixed(2),
        topPx: -8 + rnd() * 10,
        width: 1,
        height: 4 + Math.floor(rnd() * 3),
        delaySec: +(rnd() * 1.4).toFixed(2),
        durSec: +(0.45 + rnd() * 0.35).toFixed(2),
        color: rnd() < 0.5 ? "#9db8d9" : "#c6d9f2",
        swayPx: 2 + Math.floor(rnd() * 3),
      });
    } else if (weather === "snow" || weather === "aurora") {
      // Aurora reuses the slow swaying flake field with boreal colors.
      const size = 2 + Math.floor(rnd() * 2);
      out.push({
        kind: "snow",
        leftPct: +(rnd() * 100).toFixed(2),
        topPx: -6 + rnd() * 12,
        width: size,
        height: size,
        delaySec: +(rnd() * 2.2).toFixed(2),
        durSec: +(1.8 + rnd() * 1.4).toFixed(2),
        color:
          weather === "aurora"
            ? rnd() < 0.5
              ? "#7fffd4"
              : "#67e8f9"
            : "#eef6ff",
        swayPx: 4 + Math.floor(rnd() * 5),
      });
    } else if (weather === "eclipse") {
      // Eclipse: dark embers drifting across the dimmed sky (star twinkle class).
      const size = 1 + Math.floor(rnd() * 2);
      out.push({
        kind: "star",
        leftPct: +(2 + rnd() * 96).toFixed(2),
        topPx: 2 + rnd() * 14,
        width: size,
        height: size,
        delaySec: +(rnd() * 2.6).toFixed(2),
        durSec: +(1.4 + rnd() * 1.6).toFixed(2),
        color: rnd() < 0.7 ? "#fff7c2" : "#cfe4ff",
        swayPx: 0,
      });
    } else if (weather === "starry") {
      // Starry nights: a twinkling star field (same star class as eclipse).
      const size = 1 + Math.floor(rnd() * 2);
      out.push({
        kind: "star",
        leftPct: +(2 + rnd() * 96).toFixed(2),
        topPx: 2 + rnd() * 14,
        width: size,
        height: size,
        delaySec: +(rnd() * 2.8).toFixed(2),
        durSec: +(1.6 + rnd() * 1.8).toFixed(2),
        color: rnd() < 0.8 ? "#ffffff" : "#cfe4ff",
        swayPx: 0,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Shared pixel UI constants (consumed by the banner and panels)
// ---------------------------------------------------------------------------

export const PIXEL_UI = {
  bannerHeight: UI.bannerHeight,
  skyBlue: UI.skyBlue,
  neonGreen: UI.neonGreen,
  bgWhite: UI.bgWhite,
  ink: UI.ink,
  yellow: UI.panelYellow,
  red: UI.panelRed,
  blue: UI.panelBlue,
  green: UI.panelGreen,
  font: UI.fontPixel,
  /** Neobrutalist button classes shared across the UI. */
  nbButton:
    "font-pixel text-[8px] px-2 py-1 border-2 border-ink bg-yellow-300 text-ink " +
    "shadow-[3px_3px_0_0_#111] hover:translate-x-[1px] hover:translate-y-[1px] " +
    "hover:shadow-[2px_2px_0_0_#111] active:translate-x-[3px] active:translate-y-[3px] " +
    "active:shadow-none transition-all select-none cursor-pointer",
  nbPanel:
    "font-pixel bg-white border-4 border-ink shadow-[6px_6px_0_0_#111]",
} as const;

export { toEnglishId as spriteId };
