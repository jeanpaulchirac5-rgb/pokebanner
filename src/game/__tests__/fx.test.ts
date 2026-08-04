// ---------------------------------------------------------------------------
// Unit tests for the pure battle-presentation FX helpers (src/game/fx.ts):
// VS! flash timing, floating damage-number computation, damage labels/colors,
// the crit log detector, and the status-effect badge mapping.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import {
  ballWobbleSec,
  CAPTURE_BASE_MS,
  captureAnimMs,
  CAPTURE_SHAKE_MS,
  computeDmgFx,
  dmgFxClass,
  dmgFxLabel,
  dustAccumulate,
  DUST_INTERVAL_MS,
  DUST_LIFETIME_MS,
  DUST_MAX_PUFFS,
  DUST_PUFF_CLASS,
  expireDust,
  levelUpFxActive,
  LEVEL_UP_FX_MS,
  logHasCrit,
  logHasMiss,
  logHasStatus,
  logHasSuper,
  logHasWeak,
  pushDust,
  sparkleBurst,
  SPRITE_SHADOW_CLASS,
  statusIconFor,
  VS_FLASH_MS,
  vsFlashActive,
} from "../fx";
import type { StatusEffect } from "../types";

describe("vsFlashActive (VS! pop timing)", () => {
  it("is inactive before the flash starts", () => {
    expect(vsFlashActive(1000, 999)).toBe(false);
  });

  it("is active from the very moment it starts", () => {
    expect(vsFlashActive(1000, 1000)).toBe(true);
  });

  it("stays active through the whole default window", () => {
    expect(vsFlashActive(1000, 1000 + VS_FLASH_MS - 1)).toBe(true);
  });

  it("expires exactly at the window boundary", () => {
    expect(vsFlashActive(1000, 1000 + VS_FLASH_MS)).toBe(false);
  });

  it("is inactive well after the window", () => {
    expect(vsFlashActive(1000, 1000 + VS_FLASH_MS + 500)).toBe(false);
  });

  it("honors a custom duration", () => {
    expect(vsFlashActive(0, 499, 500)).toBe(true);
    expect(vsFlashActive(0, 500, 500)).toBe(false);
  });

  it("exposes the same duration the banner uses (900ms)", () => {
    expect(VS_FLASH_MS).toBe(900);
  });
});

describe("logHasCrit (critical-hit detector)", () => {
  it("returns false for an empty log", () => {
    expect(logHasCrit([])).toBe(false);
  });

  it("detects an uppercase critical mention", () => {
    expect(logHasCrit(["Bulbasaur used Tackle", "Critical hit! -30"])).toBe(true);
  });

  it("detects a lowercase critical mention", () => {
    expect(logHasCrit(["critical hit! 12 damage"])).toBe(true);
  });

  it("returns false when no crit happened", () => {
    expect(logHasCrit(["Bulbasaur used Vine Whip", "It hit! -18"])).toBe(false);
  });
});

describe("battle-log outcome detectors (v1.6.0 combat sounds)", () => {
  it("logHasSuper spots super-effective hits", () => {
    expect(logHasSuper(["Bulbasaur used Vine Whip — super effective! -30"])).toBe(true);
    expect(logHasSuper(["Pidgey used Tackle -12"])).toBe(false);
  });

  it("logHasWeak spots not-very-effective hits", () => {
    expect(logHasWeak(["Charmander used Ember — not very effective... -5"])).toBe(true);
    expect(logHasWeak(["Charmander used Ember -18"])).toBe(false);
  });

  it("logHasMiss spots missed attacks", () => {
    expect(logHasMiss(["Pidgey's Tackle missed!"])).toBe(true);
    expect(logHasMiss(["Rattata is fast asleep."])).toBe(false);
  });

  it("logHasStatus spots inflicted status effects", () => {
    expect(logHasStatus(["Oddish was inflicted with sleep!"])).toBe(true);
    expect(logHasStatus(["Oddish was seeded!"])).toBe(false);
  });
});

describe("computeDmgFx (floating damage numbers)", () => {
  it("produces nothing when HP did not change", () => {
    expect(computeDmgFx({ leader: 50, enemy: 50 }, { leader: 50, enemy: 50 }, false)).toEqual([]);
  });

  it("pops damage on the enemy when only the enemy is hit", () => {
    const pops = computeDmgFx({ leader: 50, enemy: 50 }, { leader: 50, enemy: 30 }, false);
    expect(pops).toEqual([{ side: "enemy", amount: 20, kind: "damage" }]);
  });

  it("pops damage on the leader when only the leader is hit", () => {
    const pops = computeDmgFx({ leader: 50, enemy: 50 }, { leader: 41, enemy: 50 }, false);
    expect(pops).toEqual([{ side: "leader", amount: 9, kind: "damage" }]);
  });

  it("marks both hit pops as crit when the tick had a critical hit", () => {
    const pops = computeDmgFx({ leader: 50, enemy: 50 }, { leader: 30, enemy: 10 }, true);
    expect(pops).toEqual([
      { side: "enemy", amount: 40, kind: "crit" },
      { side: "leader", amount: 20, kind: "crit" },
    ]);
  });

  it("pops a heal when a side recovers HP (leech/drain)", () => {
    const pops = computeDmgFx({ leader: 20, enemy: 50 }, { leader: 32, enemy: 50 }, false);
    expect(pops).toEqual([{ side: "leader", amount: 12, kind: "heal" }]);
  });

  it("combines damage and heal in one tick (drain moves)", () => {
    const pops = computeDmgFx({ leader: 20, enemy: 50 }, { leader: 26, enemy: 35 }, false);
    expect(pops).toEqual([
      { side: "enemy", amount: 15, kind: "damage" },
      { side: "leader", amount: 6, kind: "heal" },
    ]);
  });

  it("pops a heal on the enemy too when it recovers", () => {
    const pops = computeDmgFx({ leader: 50, enemy: 10 }, { leader: 50, enemy: 30 }, false);
    expect(pops).toEqual([{ side: "enemy", amount: 20, kind: "heal" }]);
  });

  it("uses exact deltas and never a zero amount", () => {
    const pops = computeDmgFx({ leader: 1, enemy: 1 }, { leader: 1, enemy: 0 }, false);
    expect(pops).toEqual([{ side: "enemy", amount: 1, kind: "damage" }]);
  });
});

describe("dmgFxLabel (signed label)", () => {
  it("prefixes heals with a plus", () => {
    expect(dmgFxLabel("heal", 20)).toBe("+20");
  });

  it("prefixes damage with a minus", () => {
    expect(dmgFxLabel("damage", 35)).toBe("-35");
  });

  it("prefixes crits with a minus", () => {
    expect(dmgFxLabel("crit", 12)).toBe("-12");
  });
});

describe("dmgFxClass (pop color)", () => {
  it("is green for heals", () => {
    expect(dmgFxClass("heal")).toBe("text-green-700");
  });

  it("is red for crits", () => {
    expect(dmgFxClass("crit")).toBe("text-red-600");
  });

  it("is ink for normal damage", () => {
    expect(dmgFxClass("damage")).toBe("text-ink");
  });
});

describe("statusIconFor (status badge mapping)", () => {
  const cases: [StatusEffect, string][] = [
    ["sleep", "💤"],
    ["poison", "☠"],
    ["leech", "🌿"],
    ["paralysis", "⚡"],
  ];

  it.each(cases)("maps %s to its glyph", (status, glyph) => {
    expect(statusIconFor(status)?.glyph).toBe(glyph);
  });

  it("keeps the animated zzz and poison-bubble classes", () => {
    expect(statusIconFor("sleep")?.className).toContain("status-zzz");
    expect(statusIconFor("poison")?.className).toContain("poison-bubble");
  });

  it("colors leech and paralysis badges", () => {
    expect(statusIconFor("leech")?.className).toBe("text-green-800");
    expect(statusIconFor("paralysis")?.className).toBe("text-yellow-600");
  });

  it("returns null for a cleared status", () => {
    expect(statusIconFor("none")).toBeNull();
  });

  it("returns null for unknown statuses (defensive)", () => {
    expect(statusIconFor("frozen" as StatusEffect)).toBeNull();
  });
});

describe("captureAnimMs (wobble sequence timing)", () => {
  it("uses only the base wobble time with zero shakes", () => {
    expect(captureAnimMs(0)).toBe(CAPTURE_BASE_MS);
    expect(CAPTURE_BASE_MS).toBe(1400);
  });

  it("adds 550ms per shake roll", () => {
    expect(CAPTURE_SHAKE_MS).toBe(550);
    expect(captureAnimMs(1)).toBe(1950);
    expect(captureAnimMs(2)).toBe(2500);
  });

  it("covers a full 3-shake (successful) sequence", () => {
    expect(captureAnimMs(3)).toBe(3050);
  });

  it("scales with every shake the engine can roll (0..3)", () => {
    const expected = [1400, 1950, 2500, 3050];
    expected.forEach((ms, shakes) => expect(captureAnimMs(shakes)).toBe(ms));
  });
});

describe("ballWobbleSec (CSS wobble duration)", () => {
  it("wobbles longer on a successful shake", () => {
    expect(ballWobbleSec(true)).toBe(0.45);
  });

  it("uses a shorter wobble when the ball breaks free", () => {
    expect(ballWobbleSec(false)).toBe(0.28);
  });
});

describe("levelUpFxActive (sparkle burst timing)", () => {
  it("is inactive before the burst starts", () => {
    expect(levelUpFxActive(1000, 999)).toBe(false);
  });

  it("is active from the very moment it starts", () => {
    expect(levelUpFxActive(1000, 1000)).toBe(true);
  });

  it("stays active through the whole default window", () => {
    expect(levelUpFxActive(1000, 1000 + LEVEL_UP_FX_MS - 1)).toBe(true);
  });

  it("expires exactly at the window boundary", () => {
    expect(levelUpFxActive(1000, 1000 + LEVEL_UP_FX_MS)).toBe(false);
  });

  it("honors a custom duration", () => {
    expect(levelUpFxActive(0, 999, 1000)).toBe(true);
    expect(levelUpFxActive(0, 1000, 1000)).toBe(false);
  });

  it("exposes the same duration the banner uses (1200ms)", () => {
    expect(LEVEL_UP_FX_MS).toBe(1200);
  });
});

describe("sparkleBurst (deterministic sparkle placement)", () => {
  it("builds 6 sparkles by default with the original banner offsets", () => {
    // Matches the pre-extraction inline math `(i - 3) * spacingPx`:
    // offsets span -21 … +14 with a center at index 3.
    const burst = sparkleBurst({ colors: ["#ffffff", "#ffd21f"], spacingPx: 7, delayMs: 80 });
    expect(burst).toHaveLength(6);
    expect(burst.map((s) => s.leftPx)).toEqual([-21, -14, -7, 0, 7, 14]);
  });

  it("alternates colors through the burst (even → first, odd → second)", () => {
    const burst = sparkleBurst({ colors: ["#ffffff", "#ffd21f"], spacingPx: 7, delayMs: 80 });
    expect(burst.map((s) => s.color)).toEqual([
      "#ffffff",
      "#ffd21f",
      "#ffffff",
      "#ffd21f",
      "#ffffff",
      "#ffd21f",
    ]);
  });

  it("stagger delays in seconds derived from ms", () => {
    const burst = sparkleBurst({ colors: ["#ffd21f", "#7dd3fc"], spacingPx: 6, delayMs: 70 });
    expect(burst[0].delaySec).toBe(0);
    expect(burst[1].delaySec).toBe(0.07);
    expect(burst[3].delaySec).toBe(0.21);
  });

  it("uses the star glyph for every sparkle", () => {
    const burst = sparkleBurst({ colors: ["#ffffff", "#ffd21f"], spacingPx: 7, delayMs: 80 });
    expect(burst.every((s) => s.glyph === "✦")).toBe(true);
  });

  it("supports a custom count with re-centered spacing", () => {
    const burst = sparkleBurst({ count: 4, colors: ["#fff", "#000"], spacingPx: 5, delayMs: 100 });
    expect(burst).toHaveLength(4);
    expect(burst.map((s) => s.leftPx)).toEqual([-10, -5, 0, 5]);
  });

  it("is deterministic for the same options", () => {
    const opts = { colors: ["#ffffff", "#ffd21f"] as [string, string], spacingPx: 7, delayMs: 80 };
    expect(sparkleBurst(opts)).toEqual(sparkleBurst(opts));
  });
});

describe("dustAccumulate (puff spawn timing)", () => {
  it("accumulates time without spawning below the interval", () => {
    expect(dustAccumulate(0, 100)).toEqual({ timer: 100, spawn: false });
    expect(dustAccumulate(600, 99)).toEqual({ timer: 699, spawn: false });
  });

  it("spawns and resets exactly at the interval boundary", () => {
    expect(dustAccumulate(0, 700)).toEqual({ timer: 0, spawn: true });
    expect(dustAccumulate(650, 50)).toEqual({ timer: 0, spawn: true });
  });

  it("spawns at most once per frame even if dt overshoots", () => {
    expect(dustAccumulate(600, 700)).toEqual({ timer: 0, spawn: true });
  });

  it("honors a custom interval", () => {
    expect(dustAccumulate(0, 499, 500)).toEqual({ timer: 499, spawn: false });
    expect(dustAccumulate(0, 500, 500)).toEqual({ timer: 0, spawn: true });
  });

  it("exposes the tuning interval the banner walks with", () => {
    expect(DUST_INTERVAL_MS).toBe(700);
  });
});

describe("pushDust (puff ring buffer)", () => {
  it("appends a puff to an empty list", () => {
    expect(pushDust([], { key: 1, x: 2 })).toEqual([{ key: 1, x: 2 }]);
  });

  it("keeps at most 5 puffs, dropping the oldest", () => {
    const puffs = [1, 2, 3, 4, 5].map((key) => ({ key, x: 0 }));
    const next = pushDust(puffs, { key: 6, x: 0 });
    expect(next).toHaveLength(5);
    expect(next.map((p) => p.key)).toEqual([2, 3, 4, 5, 6]);
  });

  it("honors a custom max", () => {
    expect(pushDust([{ key: 1, x: 0 }], { key: 2, x: 0 }, 2)).toEqual([
      { key: 1, x: 0 },
      { key: 2, x: 0 },
    ]);
    expect(pushDust([{ key: 1, x: 0 }, { key: 2, x: 0 }], { key: 3, x: 0 }, 2)).toEqual([
      { key: 2, x: 0 },
      { key: 3, x: 0 },
    ]);
  });

  it("exposes the on-screen cap", () => {
    expect(DUST_MAX_PUFFS).toBe(5);
  });
});

describe("expireDust (puff lifetime)", () => {
  it("keeps fresh puffs and drops expired ones", () => {
    const puffs = [
      { key: 100, x: 0 },
      { key: 400, x: 0 },
    ];
    expect(expireDust(puffs, 1000)).toEqual([{ key: 400, x: 0 }]);
  });

  it("keeps everything within the lifetime window", () => {
    const puffs = [{ key: 301, x: 0 }];
    expect(expireDust(puffs, 1000)).toEqual(puffs);
  });

  it("drops a puff exactly at the lifetime boundary", () => {
    expect(expireDust([{ key: 300, x: 0 }], 1000)).toEqual([]);
  });

  it("honors a custom lifetime", () => {
    const puffs = [{ key: 0, x: 0 }];
    expect(expireDust(puffs, 500, 500)).toEqual([]);
    expect(expireDust(puffs, 499, 500)).toEqual(puffs);
  });

  it("returns an empty array for no puffs", () => {
    expect(expireDust([], 1000)).toEqual([]);
  });

  it("exposes the lifetime constant", () => {
    expect(DUST_LIFETIME_MS).toBe(700);
  });
});

describe("dust & shadow styling constants", () => {
  it("dust puffs carry the retro puff animation + pixel look", () => {
    expect(DUST_PUFF_CLASS).toContain("dust-puff");
    expect(DUST_PUFF_CLASS).toContain("pointer-events-none");
    expect(DUST_PUFF_CLASS).toContain("rounded-full");
    expect(DUST_PUFF_CLASS).toContain("bg-black/25");
  });

  it("sprite shadows are elliptical grounding ellipses", () => {
    expect(SPRITE_SHADOW_CLASS).toContain("sprite-shadow");
    expect(SPRITE_SHADOW_CLASS).toContain("h-1.5");
    expect(SPRITE_SHADOW_CLASS).toContain("w-7");
  });
});
