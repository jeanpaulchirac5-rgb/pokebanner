import { describe, expect, it } from "vitest";
import { BIOMES, KANTO_151, MOVES } from "../constants";
import {
  PIXEL_UI,
  ambientParticles,
  backdropSvg,
  celestialForPhase,
  cloudsSvg,
  combatPoseClass,
  flinchClass,
  groundSvg,
  idleAnimClass,
  walkAnimClass,
  walkDustFor,
  DUST_LEVEL_PX,
  moonSvg,
  moveFxById,
  moveFxByMove,
  moveFxByName,
  nurseJoySprite,
  placeholderSprite,
  preloadSprites,
  scenerySvg,
  skyClouds,
  skyColorFor,
  skyGradientSvg,
  skySvg,
  spriteId,
  spriteScaleFor,
  sunSvg,
  toEnglishId,
  urlSpriteCombat,
  urlSpriteOpponent,
  urlSpriteShiny,
  urlSpriteWalking,
  weatherParticles,
  weatherTint,
} from "../presentation";

describe("spriteScaleFor — evolved forms render larger", () => {
  it("base forms and wild species stay at 1×", () => {
    expect(spriteScaleFor("bulbasaur")).toBe(1);
    expect(spriteScaleFor("charmander")).toBe(1);
    expect(spriteScaleFor("squirtle")).toBe(1);
    expect(spriteScaleFor("pidgey")).toBe(1);
  });

  it("mid forms render 1.1× and final forms 1.2×", () => {
    expect(spriteScaleFor("ivysaur")).toBe(1.1);
    expect(spriteScaleFor("charmeleon")).toBe(1.1);
    expect(spriteScaleFor("wartortle")).toBe(1.1);
    expect(spriteScaleFor("venusaur")).toBe(1.2);
    expect(spriteScaleFor("charizard")).toBe(1.2);
    expect(spriteScaleFor("blastoise")).toBe(1.2);
  });
});

describe("dynamic weather visuals", () => {
  it("weatherTint returns a translucent atmosphere overlay per weather", () => {
    expect(weatherTint("clear")).toBe("transparent");
    expect(weatherTint("rain")).toContain("rgba(");
    expect(weatherTint("snow")).toContain("rgba(");
    expect(weatherTint("starry")).toContain("rgba(");
  });

  it("weatherParticles are deterministic per seed and kind", () => {
    expect(weatherParticles("clear", 7)).toEqual([]);
    const rain = weatherParticles("rain", 7, 12);
    expect(rain.length).toBe(12);
    expect(rain.every((p) => p.kind === "rain")).toBe(true);
    const snow = weatherParticles("snow", 7, 9);
    expect(snow.length).toBe(9);
    expect(snow.every((p) => p.kind === "snow")).toBe(true);
    const stars = weatherParticles("starry", 7, 14);
    expect(stars.length).toBe(14);
    expect(stars.every((p) => p.kind === "star")).toBe(true);
    expect(weatherParticles("rain", 7, 12)).toEqual(rain);
  });
});

describe("sprite URLs", () => {
  it("urlSpriteWalking uses the lowercase Showdown ani URL", () => {
    expect(urlSpriteWalking("Bulbasaur")).toBe(
      "https://play.pokemonshowdown.com/sprites/ani/bulbasaur.gif",
    );
    expect(urlSpriteWalking("pidgey")).toBe(
      "https://play.pokemonshowdown.com/sprites/ani/pidgey.gif",
    );
  });

  it("urlSpriteCombat and urlSpriteOpponent share the same asset base", () => {
    expect(urlSpriteCombat("Charmander")).toBe(
      "https://play.pokemonshowdown.com/sprites/ani/charmander.gif",
    );
    expect(urlSpriteOpponent("Charmander")).toBe(
      "https://play.pokemonshowdown.com/sprites/ani/charmander.gif",
    );
  });

  it("urlSpriteShiny uses the Showdown ani-shiny folder with the normalized id", () => {
    expect(urlSpriteShiny("Pikachu")).toBe(
      "https://play.pokemonshowdown.com/sprites/ani-shiny/pikachu.gif",
    );
    expect(urlSpriteShiny("MR. MIME")).toBe(
      "https://play.pokemonshowdown.com/sprites/ani-shiny/mr-mime.gif",
    );
  });

  it("moveFxById resolves a move to its type-colored FX with a generic fallback", () => {
    expect(moveFxById("ember")).toEqual({ color: "#ff5722", glyph: "★" }); // fire
    expect(moveFxById("water-gun")).toEqual({ color: "#2196f3", glyph: "❋" }); // water
    expect(moveFxById("does-not-exist")).toEqual({ color: "#9aa0a6", glyph: "✦" });
  });

  it("moveFxByMove works from a MoveDef and moveFxByName from battle-log names", () => {
    expect(moveFxByMove(MOVES["thunder-shock"])).toEqual({
      color: "#ffeb3b",
      glyph: "⚡",
    });
    // battle logs read "Bulbasaur used Vine Whip — ..."; name lookup is
    // case-insensitive and resolves the grass palette
    expect(moveFxByName("Vine Whip")).toEqual({ color: "#4caf50", glyph: "❀" });
    expect(moveFxByName("mystery")).toEqual({ color: "#9aa0a6", glyph: "✦" });
  });

  it("toEnglishId lowercases and normalizes spaces/symbols", () => {
    expect(toEnglishId("Mr. Mime")).toBe("mr-mime");
    expect(toEnglishId("NIDORAN-F")).toBe("nidoran-f");
    expect(spriteId("Pikachu")).toBe("pikachu");
  });
});

describe("nurse joy sprite", () => {
  it("returns a deterministic pixel data URI", () => {
    const a = nurseJoySprite(32);
    const b = nurseJoySprite(32);
    expect(a).toBe(b);
    expect(a.startsWith("data:image/svg+xml")).toBe(true);
    expect(a).toContain("crispEdges");
  });

  it("scales with the size parameter", () => {
    const small = nurseJoySprite(16);
    const big = nurseJoySprite(48);
    expect(big.length).toBeGreaterThan(small.length);
  });
});

describe("placeholder sprites", () => {
  it("returns an inline SVG data URI sized for the display", () => {
    const uri = placeholderSprite("bulbasaur", 32);
    expect(uri.startsWith("data:image/svg+xml")).toBe(true);
    expect(uri).toContain("32");
    expect(uri.length).toBeGreaterThan(100);
  });

  it("produces a deterministic-ish valid URI for any species", () => {
    for (const id of ["onix", "staryu", "raichu", "mewtwo"]) {
      const uri = placeholderSprite(id);
      expect(uri.startsWith("data:image/svg+xml")).toBe(true);
      expect(decodeURIComponent(uri).includes("<svg")).toBe(true);
    }
  });
});

describe("preloadSprites", () => {
  it("returns the URL list and dispatches 0 images in Node (no Image API)", () => {
    const res = preloadSprites(["bulbasaur", "pidgey"], "walk");
    expect(res.urls).toHaveLength(2);
    expect(res.urls[0]).toContain("bulbasaur.gif");
    expect(res.dispatched).toBe(0);
  });

  it("supports combat-kind preloading", () => {
    const res = preloadSprites(["onix"], "combat");
    expect(res.urls[0]).toContain("onix.gif");
  });
});

describe("pixel scenery generators", () => {
  it("all three layers return valid SVG data URIs for every biome", () => {
    for (const biome of BIOMES) {
      for (const tile of [backdropSvg(biome), scenerySvg(biome), groundSvg(biome)]) {
        expect(tile.startsWith("data:image/svg+xml")).toBe(true);
        expect(decodeURIComponent(tile)).toContain("<svg");
      }
    }
  });

  it("each layer uses its biome's palette colors", () => {
    for (const biome of BIOMES) {
      const far = decodeURIComponent(backdropSvg(biome));
      const mid = decodeURIComponent(scenerySvg(biome));
      const near = decodeURIComponent(groundSvg(biome));
      expect(far, biome.id).toContain(biome.hill);
      expect(mid, biome.id).toContain(biome.grass);
      expect(mid, biome.id).toContain(biome.prop); // biome props present
      expect(near, biome.id).toContain(biome.ground);
      expect(near, biome.id).toContain(biome.soil);
    }
  });

  it("tiles are 128px wide and deterministic per biome", () => {
    for (const biome of BIOMES) {
      const far = decodeURIComponent(backdropSvg(biome));
      expect(far).toContain('width="128"');
      expect(backdropSvg(biome)).toBe(backdropSvg(biome));
      expect(scenerySvg(biome)).toBe(scenerySvg(biome));
      expect(groundSvg(biome)).toBe(groundSvg(biome));
    }
  });

  it("biomes look distinct: silhouettes and props differ", () => {
    const plains = backdropSvg(BIOMES[0]);
    const cave = backdropSvg(BIOMES[2]);
    expect(plains).not.toBe(cave);
    // cave has no grass-tuft flowers; plains has no crystal shards
    expect(decodeURIComponent(scenerySvg(BIOMES[0]))).toContain(BIOMES[0].prop);
    expect(decodeURIComponent(scenerySvg(BIOMES[2]))).toContain(BIOMES[2].prop);
  });
});

describe("idle animation classes", () => {
  it("gives iconic species curated moves", () => {
    expect(idleAnimClass("pikachu")).toBe("idle-hop");
    expect(idleAnimClass("bulbasaur")).toBe("idle-nod");
    expect(idleAnimClass("squirtle")).toBe("idle-wobble");
    expect(idleAnimClass("gengar")).toBe("idle-float");
    expect(idleAnimClass("pidgey")).toBe("idle-flutter");
    expect(idleAnimClass("onix")).toBe("idle-rock");
    expect(idleAnimClass("charmander")).toBe("idle-hop");
  });

  it("falls back by type for species without a curated entry", () => {
    expect(idleAnimClass("koffing")).toBe("idle-sway"); // poison
    expect(idleAnimClass("dratini")).toBe("idle-sway"); // dragon
    expect(idleAnimClass("ekans")).toBe("idle-sway"); // poison
    expect(idleAnimClass("ditto")).toBe("idle-sway"); // normal
  });

  it("normalizes ids (mixed case, spaces)", () => {
    expect(idleAnimClass("Pikachu")).toBe("idle-hop");
    // Species without a SPECIES entry (or unknown ids) fall back to sway.
    expect(idleAnimClass("Mr. Mime")).toBe("idle-sway");
    expect(idleAnimClass("missingmon")).toBe("idle-sway");
  });

  it("covers every Kanto species with a valid animation class", () => {
    const valid = new Set([
      "idle-sway",
      "idle-hop",
      "idle-nod",
      "idle-wobble",
      "idle-float",
      "idle-rock",
      "idle-flutter",
    ]);
    for (const id of KANTO_151) {
      expect(valid.has(idleAnimClass(id))).toBe(true);
    }
  });
});

describe("walk animation classes (per-species gait)", () => {
  it("gives iconic species distinct signature strides", () => {
    expect(walkAnimClass("pikachu")).toBe("walk-hop");
    expect(walkAnimClass("bulbasaur")).toBe("walk-nod");
    expect(walkAnimClass("squirtle")).toBe("walk-waddle");
    expect(walkAnimClass("gengar")).toBe("walk-glide");
    expect(walkAnimClass("pidgey")).toBe("walk-flutter");
    expect(walkAnimClass("onix")).toBe("walk-rock");
    expect(walkAnimClass("charmander")).toBe("walk-hop");
  });

  it("walk gaits differ from the idle classes (movement ≠ standing)", () => {
    // Same species, different animation while walking vs standing still.
    expect(walkAnimClass("squirtle")).not.toBe(idleAnimClass("squirtle"));
    expect(walkAnimClass("gengar")).not.toBe(idleAnimClass("gengar"));
    expect(walkAnimClass("pidgey")).not.toBe(idleAnimClass("pidgey"));
    expect(walkAnimClass("onix")).not.toBe(idleAnimClass("onix"));
    expect(walkAnimClass("charmander")).not.toBe(idleAnimClass("charmander"));
  });

  it("distinct species get distinct walks (not one universal sway)", () => {
    // The user request: no universal animation — each species moves its own
    // way. Iconic species must not all collapse to the fallback sway.
    const iconic = [
      "pikachu",
      "rattata",
      "pidgey",
      "zubat",
      "geodude",
      "ekans",
      "voltorb",
      "gyarados",
      "snorlax",
      "hitmonlee",
    ];
    const classes = new Set(iconic.map((id) => walkAnimClass(id)));
    expect(classes.size).toBeGreaterThan(4);
    expect(classes.has("walk-sway")).toBe(false); // none fall back
  });

  it("falls back by type for species without a curated gait", () => {
    // Poison → slither, water → waddle, flying → flutter, rock → rock.
    expect(walkAnimClass("missingmon")).toBe("walk-sway");
    // These are curated in WALK_ANIM_CURATED, so they should NOT fall back.
    expect(walkAnimClass("ekans")).toBe("walk-slither");
    expect(walkAnimClass("dratini")).toBe("walk-slither");
    expect(walkAnimClass("ditto")).toBe("walk-bounce");
    expect(walkAnimClass("koffing")).toBe("walk-glide");
  });

  it("covers every Kanto species with a valid walk class", () => {
    const valid = new Set([
      "walk-sway",
      "walk-hop",
      "walk-trot",
      "walk-nod",
      "walk-waddle",
      "walk-glide",
      "walk-rock",
      "walk-shuffle",
      "walk-flutter",
      "walk-crawl",
      "walk-slither",
      "walk-strut",
      "walk-bounce",
    ]);
    for (const id of KANTO_151) {
      expect(valid.has(walkAnimClass(id))).toBe(true);
    }
  });
});

describe("walk dust by gait (per-movement-style puffs)", () => {
  it("gliders and floaters kick up no dust at all", () => {
    expect(walkDustFor("walk-glide").level).toBe(0);
  });

  it("light-footed gaits leave small puffs", () => {
    for (const gait of ["walk-hop", "walk-nod", "walk-waddle", "walk-flutter", "walk-sway"]) {
      expect(walkDustFor(gait).level).toBe(1);
    }
  });

  it("ground-scraping gaits drag a medium trail", () => {
    for (const gait of ["walk-crawl", "walk-slither", "walk-strut"]) {
      expect(walkDustFor(gait).level).toBe(2);
    }
  });

  it("heavy/lurching gaits throw large puffs", () => {
    for (const gait of ["walk-rock", "walk-trot", "walk-shuffle", "walk-bounce"]) {
      expect(walkDustFor(gait).level).toBe(3);
    }
  });

  it("unknown gaits fall back to light dust", () => {
    expect(walkDustFor("walk-nonexistent")).toEqual({ level: 1, intervalMs: 800 });
  });

  it("puff pixel sizes scale with the dust level", () => {
    expect(DUST_LEVEL_PX[0]).toBe(0);
    expect(DUST_LEVEL_PX[1]).toBeGreaterThan(0);
    expect(DUST_LEVEL_PX[2]).toBeGreaterThan(DUST_LEVEL_PX[1]);
    expect(DUST_LEVEL_PX[3]).toBeGreaterThan(DUST_LEVEL_PX[2]);
  });

  it("every walk gait resolves to a real dust spec", () => {
    const gaits = [
      "walk-hop", "walk-trot", "walk-nod", "walk-waddle", "walk-glide",
      "walk-rock", "walk-shuffle", "walk-flutter", "walk-crawl",
      "walk-slither", "walk-strut", "walk-bounce", "walk-sway",
    ];
    const levels = gaits.map((g) => walkDustFor(g).level);
    expect(levels).toContain(0); // glide: none
    expect(levels).toContain(3); // lurching: large
    expect(levels).toContain(1); // light: small
    expect(new Set(levels).size).toBeGreaterThan(2); // not one-size-fits-all
  });
});

describe("combat pose classes (per-species battle stance)", () => {
  it("iconic species hold their signature fighting pose", () => {
    expect(combatPoseClass("pikachu")).toBe("pose-ready");
    expect(combatPoseClass("gengar")).toBe("pose-hover");
    expect(combatPoseClass("onix")).toBe("pose-coil");
    expect(combatPoseClass("snorlax")).toBe("pose-hunker");
    expect(combatPoseClass("bulbasaur")).toBe("pose-lean");
    expect(combatPoseClass("charmander")).toBe("pose-rear");
    expect(combatPoseClass("squirtle")).toBe("pose-crouch");
    expect(combatPoseClass("charizard")).toBe("pose-hover");
    expect(combatPoseClass("machamp")).toBe("pose-ready");
    expect(combatPoseClass("rapidash")).toBe("pose-rear");
  });

  it("the battle pose is distinct from idle and walk animations", () => {
    for (const id of ["pikachu", "gengar", "squirtle", "bulbasaur", "onix"]) {
      expect(combatPoseClass(id)).not.toBe(idleAnimClass(id));
      expect(combatPoseClass(id)).not.toBe(walkAnimClass(id));
    }
  });

  it("falls back to a ready stance for unknown species", () => {
    expect(combatPoseClass("missingmon")).toBe("pose-ready");
  });

  it("every Gen-1 species resolves to a valid registered pose", () => {
    const VALID = new Set([
      "pose-ready", "pose-crouch", "pose-lean", "pose-coil",
      "pose-rear", "pose-hover", "pose-sway", "pose-hunker",
    ]);
    for (const id of KANTO_151) {
      expect(VALID.has(combatPoseClass(id))).toBe(true);
    }
  });

  it("species get distinct poses (not one universal stance)", () => {
    const iconic = ["pikachu", "gengar", "onix", "snorlax", "bulbasaur", "charmander", "squirtle", "ekans"];
    const poses = new Set(iconic.map((id) => combatPoseClass(id)));
    expect(poses.size).toBeGreaterThan(4);
  });
});
describe("flinch classes (species-flavored crit recoil)", () => {
  it("maps each combat pose family to its flinch variant", () => {
    expect(flinchClass("pose-ready")).toBe("flinch-recoil");
    expect(flinchClass("pose-crouch")).toBe("flinch-recoil");
    expect(flinchClass("pose-hover")).toBe("flinch-wobble");
    expect(flinchClass("pose-sway")).toBe("flinch-wobble");
    expect(flinchClass("pose-hunker")).toBe("flinch-heave");
    expect(flinchClass("pose-coil")).toBe("flinch-heave");
    expect(flinchClass("pose-lean")).toBe("flinch-pitch");
    expect(flinchClass("pose-rear")).toBe("flinch-pitch");
  });

  it("falls back to the sharp recoil for unknown poses", () => {
    expect(flinchClass("pose-unknown")).toBe("flinch-recoil");
  });

  it("is consistent with the species combat poses", () => {
    // The flinch keyed off the pose the species actually holds in battle.
    expect(flinchClass(combatPoseClass("gengar"))).toBe("flinch-wobble");
    expect(flinchClass(combatPoseClass("snorlax"))).toBe("flinch-heave");
    expect(flinchClass(combatPoseClass("pikachu"))).toBe("flinch-recoil");
    expect(flinchClass(combatPoseClass("charmander"))).toBe("flinch-pitch");
  });
});

describe("living sky (v1.3.0)", () => {
  it("skyGradientSvg is a non-repeating 1×28 band gradient (no clouds)", () => {
    const uri = skyGradientSvg("day");
    expect(uri.startsWith("data:image/svg+xml")).toBe(true);
    const svg = decodeURIComponent(uri);
    expect(svg).toContain('width="1"');
    expect(svg).toContain('height="28"');
    expect(svg).not.toContain('#ffffff'); // no cloud puffs in the gradient
    expect(svg).not.toMatch(/width="256"/);
  });

  it("skyGradientSvg follows the phase palette", () => {
    expect(skyGradientSvg("night")).not.toBe(skyGradientSvg("day"));
    expect(skyGradientSvg("sunset")).not.toBe(skyGradientSvg("day"));
  });

  it("skyClouds returns 15 varied non-repeating sprites (12 clouds + 3 birds)", () => {
    const sprites = skyClouds(12345);
    expect(sprites.length).toBe(15);
    const clouds = sprites.filter((s) => s.kind === "cloud");
    const birds = sprites.filter((s) => s.kind === "bird");
    expect(clouds.length).toBe(12);
    expect(birds.length).toBe(3);
    // every cloud is unique in size/height/speed/delay
    expect(new Set(clouds.map((c) => c.size)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(clouds.map((c) => c.durSec)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(clouds.map((c) => c.delaySec)).size).toBeGreaterThanOrEqual(5);
    // all sprites render valid data URIs
    for (const s of sprites) {
      expect(s.uri.startsWith("data:image/svg+xml")).toBe(true);
      expect(s.size).toBeGreaterThan(0);
      expect(s.topPx).toBeGreaterThanOrEqual(0);
    }
  });

  it("skyClouds is deterministic per seed and scatters differently across seeds", () => {
    expect(skyClouds(42)).toEqual(skyClouds(42));
    expect(skyClouds(42)).not.toEqual(skyClouds(43));
    // the first cloud's placement/speed must differ between seeds
    expect(skyClouds(42)[0]).not.toEqual(skyClouds(43)[0]);
  });

  it("skyClouds drops the birds at night (birds fly home after sunset)", () => {
    const day = skyClouds(7);
    const night = skyClouds(7, "night");
    expect(day.filter((s) => s.kind === "bird").length).toBe(3);
    expect(night.filter((s) => s.kind === "bird").length).toBe(0);
  });

  it("skyClouds handles the zero seed without collapsing", () => {
    const sprites = skyClouds(0);
    expect(sprites.length).toBeGreaterThan(0);
    expect(new Set(sprites.map((s) => s.key)).size).toBe(sprites.length);
  });
});

describe("sky generator", () => {
  it("returns a valid 256×28 SVG data URI with clouds and birds", () => {
    const uri = skySvg(12345);
    expect(uri.startsWith("data:image/svg+xml")).toBe(true);
    const svg = decodeURIComponent(uri);
    expect(svg).toContain('width="256"');
    expect(svg).toContain('height="28"');
    expect(svg).toContain('#ffffff'); // cloud puffs
    expect(svg).toContain('#1c1c1c'); // bird chevrons
    expect(svg).toContain('#cfd8dc'); // cloud under-shade
    // A wider tile with five clouds — the sky is never a 128px repeating stamp.
    expect((svg.match(/fill="#ffffff"/g) ?? []).length).toBeGreaterThanOrEqual(8);
    expect((svg.match(/fill="#1c1c1c"/g) ?? []).length).toBeGreaterThanOrEqual(8);
  });

  it("is deterministic for a seed and varies across seeds", () => {
    expect(skySvg(42)).toBe(skySvg(42));
    expect(skySvg(42)).not.toBe(skySvg(43));
    expect(skySvg(42)).not.toBe(skySvg(0));
  });

  it("handles the zero seed without collapsing to a blank tile", () => {
    const svg = decodeURIComponent(skySvg(0));
    expect(svg).toContain('#ffffff');
    expect(svg).toContain('#1c1c1c');
  });

  it("cloudsSvg is the clouds-only transparent tile (no sky bands)", () => {
    const uri = cloudsSvg(12345);
    expect(uri.startsWith("data:image/svg+xml")).toBe(true);
    const svg = decodeURIComponent(uri);
    expect(svg).toContain('width="256"');
    expect(svg).toContain('height="28"');
    // clouds + birds present…
    expect(svg).toContain('#ffffff');
    expect(svg).toContain('#1c1c1c');
    // …but no full-width gradient band rects → transparent background.
    expect(svg).not.toMatch(/<rect width="256"/);
  });

  it("cloudsSvg mirrors skySvg's deterministic clouds for the same seed", () => {
    expect(cloudsSvg(42)).toBe(cloudsSvg(42));
    expect(cloudsSvg(42)).not.toBe(cloudsSvg(43));
    // Both tiles draw the exact same cloud/bird pixels — only the bands
    // differ (skySvg adds full-width gradient rects on top).
    const sky = decodeURIComponent(skySvg(42));
    const clouds = decodeURIComponent(cloudsSvg(42));
    const cloudRects = [...clouds.matchAll(/<rect[^>]*y="([2-9]|1[0-9])"[^>]*\/>/g)].map((m) => m[0]);
    expect(cloudRects.length).toBeGreaterThan(0);
    for (const rect of cloudRects) {
      expect(sky).toContain(rect);
    }
  });

  it("defaults to day: white clouds and visible dark birds", () => {
    const svg = decodeURIComponent(skySvg(7));
    expect(svg).toContain('#ffffff'); // white cloud puffs
    expect(svg).toContain('#1c1c1c'); // dark birds present
  });

  it("sunset warms the clouds and tints the birds", () => {
    const svg = decodeURIComponent(skySvg(7, 'sunset'));
    expect(svg).toContain('#ffe0b3'); // warm cloud puffs
    expect(svg).toContain('#e8b878'); // warm under-shade
    expect(svg).toContain('#4a3a28'); // dusk birds still present
    expect(svg).not.toContain('#ffffff');
  });

  it("night grays the clouds and removes the birds", () => {
    const svg = decodeURIComponent(skySvg(7, 'night'));
    expect(svg).toContain('#6b7280'); // gray cloud puffs
    expect(svg).toContain('#4b5563'); // gray under-shade
    expect(svg).not.toContain('#1c1c1c'); // birds gone after sunset
    expect(svg).not.toContain('#ffffff');
  });

  it("keeps the same cloud layout across phases (deterministic layout)", () => {
    // Birds are skipped at night, so compare only the cloud rects' x/y
    // geometry (any of the three cloud/shade fills) across phases.
    const cloudLayout = (uri: string) =>
      decodeURIComponent(uri)
        .split('<rect ')
        .filter((r) =>
          /fill="#(ffffff|cfd8dc|ffe0b3|e8b878|6b7280|4b5563)"/.test(r),
        )
        .map((r) => (r.match(/x="(\d+)" y="(\d+)"/) ?? []).slice(1).join(','))
        .join('|');
    expect(cloudLayout(skySvg(99, 'day'))).toBe(cloudLayout(skySvg(99, 'night')));
    expect(cloudLayout(skySvg(99, 'day'))).toBe(cloudLayout(skySvg(99, 'sunset')));
    // and the layout is deterministic within a phase
    expect(cloudLayout(skySvg(99, 'night'))).toBe(cloudLayout(skySvg(99, 'night')));
  });
});

describe("sky color helper", () => {
  it("returns the bottom sky band for each phase", () => {
    expect(skyColorFor("day")).toBe("#6ec4f8");
    expect(skyColorFor("sunset")).toBe("#e3af66");
    expect(skyColorFor("night")).toBe("#303e6e");
  });

  it("matches the sky tile's bottom band so the banner has no seam", () => {
    // the last gradient band in the tile equals the flat backdrop color
    expect(decodeURIComponent(skySvg(5, "day"))).toContain(`fill="${skyColorFor("day")}"`);
    expect(decodeURIComponent(skySvg(5, "night"))).toContain(`fill="${skyColorFor("night")}"`);
  });
});

describe("ambient particles", () => {
  it("is deterministic per (biome, seed, phase)", () => {
    expect(ambientParticles("plains", 123)).toEqual(ambientParticles("plains", 123));
    expect(ambientParticles("plains", 123)).not.toEqual(ambientParticles("plains", 124));
  });

  it("always returns a full sky of motes with sane ranges", () => {
    for (const id of ["plains", "forest", "cave"]) {
      const parts = ambientParticles(id, 42, "day");
      expect(parts.length).toBe(10);
      for (const p of parts) {
        expect(p.leftPct).toBeGreaterThanOrEqual(0);
        expect(p.leftPct).toBeLessThanOrEqual(100);
        expect(p.topPx).toBeGreaterThanOrEqual(0);
        expect(p.sizePx).toBeGreaterThan(0);
        expect(p.durSec).toBeGreaterThan(0);
        expect(["fall", "rise", "drift"]).toContain(p.kind);
      }
    }
  });

  it("uses biome-specific motion: plains pollen falls, cave sparkles rise", () => {
    expect(ambientParticles("plains", 7, "day")[0].kind).toBe("fall");
    expect(ambientParticles("forest", 7, "day")[0].kind).toBe("fall");
    expect(ambientParticles("cave", 7, "day")[0].kind).toBe("rise");
  });

  it("shifts palette at night", () => {
    const day = ambientParticles("plains", 7, "day");
    const night = ambientParticles("plains", 7, "night");
    expect(day[0].color).not.toBe(night[0].color);
  });
});

describe("celestial sprites", () => {
  it("sun is a valid 8×8 data URI, day and sunset variants differ", () => {
    const day = decodeURIComponent(sunSvg('day'));
    const sunset = decodeURIComponent(sunSvg('sunset'));
    expect(sunSvg().startsWith('data:image/svg+xml')).toBe(true);
    expect(day).toContain('#ffd21f'); // day disc
    expect(sunset).toContain('#ff9d3c'); // sunset disc
    expect(day).not.toBe(sunset);
  });

  it("moon is a valid pale crescent data URI", () => {
    const uri = moonSvg();
    expect(uri.startsWith('data:image/svg+xml')).toBe(true);
    const svg = decodeURIComponent(uri);
    expect(svg).toContain('#f0efe6'); // lit crescent
    expect(svg).toContain('#d8d6c8'); // crater pixel
  });

  it("day places a high sun, no moon", () => {
    const c = celestialForPhase('day');
    expect(c).toHaveLength(1);
    expect(c[0].topPx).toBeLessThanOrEqual(2); // high in the sky
    expect(c[0].uri).toContain('ffd21f'); // day-colored sun
  });

  it("sunset shows the sun sinking low and a moon rising opposite", () => {
    const c = celestialForPhase('sunset');
    expect(c).toHaveLength(2);
    expect(c[0].uri).toContain('ff9d3c'); // sunset sun
    expect(c[0].topPx).toBeGreaterThan(celestialForPhase('day')[0].topPx); // lower
    expect(c[1].uri).toContain('f0efe6'); // moon
    expect(c[1].leftPct).toBeLessThan(c[0].leftPct); // opposite side
  });

  it("night replaces the sun with a high moon", () => {
    const c = celestialForPhase('night');
    expect(c).toHaveLength(1);
    expect(c[0].uri).toContain('f0efe6'); // moon only
    expect(c[0].uri).not.toContain('ffd21f');
    expect(c[0].topPx).toBeLessThanOrEqual(2);
  });

  it("placement is deterministic per phase", () => {
    expect(celestialForPhase('night')).toEqual(celestialForPhase('night'));
    expect(celestialForPhase('day')).toEqual(celestialForPhase('day'));
  });
});

describe("pixel UI constants", () => {
  it("the banner is 60px and the sky is exactly #00ff00", () => {
    expect(PIXEL_UI.bannerHeight).toBe(60);
    expect(PIXEL_UI.neonGreen).toBe("#00ff00");
  });

  it("neobrutalist tokens: ink, flat colors, pixel font", () => {
    expect(PIXEL_UI.ink).toBe("#111111");
    expect(PIXEL_UI.yellow).toBe("#ffde00");
    expect(PIXEL_UI.font).toContain("Press Start 2P");
    expect(PIXEL_UI.nbButton).toContain("border-2");
    expect(PIXEL_UI.nbButton).toContain("shadow");
  });
});
