// ---------------------------------------------------------------------------
// Presentation helpers: sprite URL building, offline placeholders, preloading,
// and the shared pixel UI constants. Pure enough to unit-test in Node.
// ---------------------------------------------------------------------------

import { MOVES, SPECIES, UI } from "./constants";
import type { BiomeDef, MoveDef } from "./types";

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
export function skySvg(seed = 0, phase: SkyPhase = "day"): string {
  const W = 128;
  const H = 28;
  const pal = SKY_PALETTE[phase] ?? SKY_PALETTE.day;
  const parts: string[] = [];
  // Sky backdrop: hard pixel bands so the banner has a real sky gradient
  // (not a flat key color). Band fills avoid the cloud/under-shade palette so
  // tests that inspect cloud geometry stay unambiguous.
  const stack = SKY_BANDS[phase] ?? SKY_BANDS.day;
  const bandH = Math.floor(H / stack.length);
  stack.forEach((fill, i) => {
    parts.push(`<rect width="${W}" height="${bandH}" y="${i * bandH}" fill="${fill}"/>`);
  });
  // LCG so a given seed always paints the same clouds/birds
  let s = (seed >>> 0) || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  // three pixel clouds: puffs with a soft under-shade
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(rnd() * (W - 26));
    const y = 2 + Math.floor(rnd() * 12);
    parts.push(
      `<rect x="${x + 3}" y="${y}" width="12" height="3" fill="${pal.cloud}"/>`,
      `<rect x="${x}" y="${y + 2}" width="18" height="3" fill="${pal.cloud}"/>`,
      `<rect x="${x}" y="${y + 5}" width="18" height="1" fill="${pal.shade}"/>`,
    );
  }
  // two pixel birds: dark "~" chevrons (birds fly home after sunset)
  if (pal.bird) {
    for (let i = 0; i < 2; i++) {
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

/**
 * Clouds-and-birds ONLY sky tile (transparent background). Used by the
 * Electron desktop shell: the strip there is a transparent window, so the
 * drifting pixel clouds float directly over the desktop wallpaper while the
 * browser keeps the full blue sky (skySvg). Same LCG + palette as skySvg so
 * a given seed paints the identical clouds in both modes.
 */
export function cloudsSvg(seed = 0, phase: SkyPhase = "day"): string {
  const W = 128;
  const H = 28;
  const pal = SKY_PALETTE[phase] ?? SKY_PALETTE.day;
  const parts: string[] = [];
  // LCG so a given seed always paints the same clouds/birds (mirrors skySvg)
  let s = (seed >>> 0) || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  // three pixel clouds: puffs with a soft under-shade
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(rnd() * (W - 26));
    const y = 2 + Math.floor(rnd() * 12);
    parts.push(
      `<rect x="${x + 3}" y="${y}" width="12" height="3" fill="${pal.cloud}"/>`,
      `<rect x="${x}" y="${y + 2}" width="18" height="3" fill="${pal.cloud}"/>`,
      `<rect x="${x}" y="${y + 5}" width="18" height="1" fill="${pal.shade}"/>`,
    );
  }
  // two pixel birds: dark "~" chevrons (birds fly home after sunset)
  if (pal.bird) {
    for (let i = 0; i < 2; i++) {
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
