// ---------------------------------------------------------------------------
// Pure battle-presentation FX helpers. Deterministic functions for the small
// visual effects the banner renders (status effect badges, floating damage
// numbers, the "VS!" flash at battle start / switch-in). Extracted from
// PokemonBanner.tsx so they can be unit-tested without React or a browser.
// ---------------------------------------------------------------------------

import type { StatusEffect } from "./types";

/** How long the "VS!" pop stays visible at battle start / switch-in (ms). */
export const VS_FLASH_MS = 900;

/** A single floating damage-number pop for one battle tick. */
export interface DmgFxItem {
  side: "leader" | "enemy";
  amount: number;
  kind: "damage" | "crit" | "heal";
}

/** HP snapshot of both combatants before / after a battle tick. */
export interface HpSnapshot {
  leader: number;
  enemy: number;
}

/** True while a VS! flash started at `startedAt` is still within its window. */
export function vsFlashActive(
  startedAt: number,
  now: number,
  durMs: number = VS_FLASH_MS,
): boolean {
  return now >= startedAt && now - startedAt < durMs;
}

/** Whether a battle log mentions a critical hit (case-insensitive). */
export function logHasCrit(log: string[]): boolean {
  return log.some((l) => l.toLowerCase().includes("critical"));
}

/**
 * Compute the floating damage pops for one battle tick from HP deltas.
 * A hit produces a "damage" (or "crit") pop on the receiving side; recovery
 * (leech drains, berries, heals) produces a "heal" pop on the healed side.
 */
export function computeDmgFx(
  before: HpSnapshot,
  after: HpSnapshot,
  crit: boolean,
): DmgFxItem[] {
  const pops: DmgFxItem[] = [];
  if (after.enemy < before.enemy)
    pops.push({
      side: "enemy",
      amount: before.enemy - after.enemy,
      kind: crit ? "crit" : "damage",
    });
  if (after.leader < before.leader)
    pops.push({
      side: "leader",
      amount: before.leader - after.leader,
      kind: crit ? "crit" : "damage",
    });
  if (after.leader > before.leader)
    pops.push({
      side: "leader",
      amount: after.leader - before.leader,
      kind: "heal",
    });
  if (after.enemy > before.enemy)
    pops.push({
      side: "enemy",
      amount: after.enemy - before.enemy,
      kind: "heal",
    });
  return pops;
}

/** Signed label for a damage pop: "+20" for heals, "-35" for damage/crits. */
export function dmgFxLabel(kind: DmgFxItem["kind"], amount: number): string {
  return kind === "heal" ? `+${amount}` : `-${amount}`;
}

/** Tailwind text color for a damage pop. */
export function dmgFxClass(kind: DmgFxItem["kind"]): string {
  if (kind === "heal") return "text-green-700";
  if (kind === "crit") return "text-red-600";
  return "text-ink";
}

// ---------------------------------------------------------------------------
// Capture ball wobble sequence
// ---------------------------------------------------------------------------

/** Base wobble time before the ball's shake rolls play (ms). */
export const CAPTURE_BASE_MS = 1400;
/** Extra time per shake roll (ms). */
export const CAPTURE_SHAKE_MS = 550;

/** Total time the capture wobble sequence plays for `shakes` rolls. */
export function captureAnimMs(shakes: number): number {
  return CAPTURE_BASE_MS + shakes * CAPTURE_SHAKE_MS;
}

/** CSS ball-wobble animation duration in seconds (success wobbles longer). */
export function ballWobbleSec(success: boolean): number {
  return success ? 0.45 : 0.28;
}

// ---------------------------------------------------------------------------
// Level-up sparkle burst
// ---------------------------------------------------------------------------

/** How long the level-up sparkle burst stays visible (ms). */
export const LEVEL_UP_FX_MS = 1200;

/** True while a level-up sparkle burst started at `startedAt` is visible. */
export function levelUpFxActive(
  startedAt: number,
  now: number,
  durMs: number = LEVEL_UP_FX_MS,
): boolean {
  return now >= startedAt && now - startedAt < durMs;
}

/** One sparkle in a burst (deterministic given the options). */
export interface SparkleSpec {
  glyph: string;
  color: string;
  leftPx: number;
  delaySec: number;
}

/** Options for building a sparkle burst. */
export interface SparkleBurstOpts {
  /** Number of sparkles (default 6). */
  count?: number;
  /** Two colors alternating through the burst. */
  colors: [string, string];
  /** Horizontal spacing between sparkles (px). */
  spacingPx: number;
  /** Stagger between consecutive sparkles (ms). */
  delayMs: number;
}

/**
 * Build a centered, staggered sparkle burst. Deterministic: the same options
 * always produce the same array, so renders are stable between frames.
 */
export function sparkleBurst(opts: SparkleBurstOpts): SparkleSpec[] {
  const count = opts.count ?? 6;
  const center = Math.floor(count / 2);
  return Array.from({ length: count }, (_, i) => ({
    glyph: "✦",
    color: i % 2 ? opts.colors[1] : opts.colors[0],
    leftPx: (i - center) * opts.spacingPx,
    delaySec: (i * opts.delayMs) / 1000,
  }));
}

// ---------------------------------------------------------------------------
// Walking dust puffs + sprite grounding shadows
// ---------------------------------------------------------------------------

/** How often a dust puff spawns while walking (ms). */
export const DUST_INTERVAL_MS = 700;
/** How long a dust puff stays visible before vanishing (ms). */
export const DUST_LIFETIME_MS = 700;
/** Maximum number of dust puffs on screen at once. */
export const DUST_MAX_PUFFS = 5;

/** Tailwind treatment for a dust puff (positioning added per render site). */
export const DUST_PUFF_CLASS =
  "dust-puff pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-black/25";
/** Tailwind treatment for the elliptical grounding shadow under sprites. */
export const SPRITE_SHADOW_CLASS = "sprite-shadow absolute h-1.5 w-7";

/**
 * Frame accumulator for dust spawning. Returns whether a puff should spawn
 * this frame plus the running timer (reset on spawn), mirroring the banner's
 * `dustTimer` loop without any React state.
 */
export function dustAccumulate(
  timer: number,
  dt: number,
  intervalMs: number = DUST_INTERVAL_MS,
): { timer: number; spawn: boolean } {
  const next = timer + dt;
  return next >= intervalMs
    ? { timer: 0, spawn: true }
    : { timer: next, spawn: false };
}

/** Append a puff, keeping at most `max` (oldest dropped). */
export function pushDust<T extends { key: number }>(
  puffs: T[],
  puff: T,
  max: number = DUST_MAX_PUFFS,
): T[] {
  return [...puffs.slice(-(max - 1)), puff];
}

/** Drop puffs older than `lifetimeMs`, preserving order. */
export function expireDust<T extends { key: number }>(
  puffs: T[],
  now: number,
  lifetimeMs: number = DUST_LIFETIME_MS,
): T[] {
  return puffs.filter((d) => now - d.key < lifetimeMs);
}

/** Status-effect badge mapping: glyph + CSS class, or null for no badge. */
export function statusIconFor(
  status: StatusEffect,
): { glyph: string; className: string } | null {
  switch (status) {
    case "sleep":
      return { glyph: "💤", className: "status-zzz" };
    case "poison":
      return { glyph: "☠", className: "poison-bubble" };
    case "leech":
      return { glyph: "🌿", className: "text-green-800" };
    case "paralysis":
      return { glyph: "⚡", className: "text-yellow-600" };
    default:
      return null;
  }
}
