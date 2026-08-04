// ---------------------------------------------------------------------------
// Chiptune engine — no audio assets; every sound is synthesized with the Web
// Audio API (square/triangle/sawtooth/sine oscillators).
//
//   - All playback volume is multiplied by the audio controller's
//     effectiveVolume() (0 when muted), so the desktop tray volume/mute
//     actions directly control the game audio.
//   - BGM is biome-aware: plains/forest/cave variants with per-biome tempo,
//     and a pure `nightify()` that darkens any variant for the night phase.
//     The banner calls `setBgmTheme(biomeIndex, phase)` as it walks.
//   - Pure helpers (noteToFrequency, transposeTone, nightify, resolveBgmKey,
//     pattern data) are unit-testable in Node; the engine guards every call
//     behind `typeof AudioContext !== "undefined"` and no-ops gracefully.
// ---------------------------------------------------------------------------

import { effectiveVolume, subscribe } from "./audio";
import type { TimePhase } from "./types";

export type SfxName =
  | "hit"
  | "crit"
  | "capture"
  | "capture-fail"
  | "levelup"
  | "victory"
  | "evolve"
  | "faint"
  | "heal"
  | "pickup"
  | "shiny"
  | "click"
  | "lowhp"
  | "xp"
  | "switchin"
  | "denied"
  | "weather";

export type BgmBiome = "plains" | "forest" | "cave";

export interface Tone {
  /** Note name, e.g. "C5", "A#4". Supports sharps/flats. */
  note: string;
  /** Start offset: seconds for SFX patterns, beats for BGM. */
  start: number;
  /** Duration: seconds for SFX, beats for BGM. */
  dur: number;
  type?: OscillatorType;
  vol?: number;
  /** Optional glissando target note. */
  slideTo?: string;
}

export interface BgmKey {
  biome: BgmBiome;
  night: boolean;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const SEMITONES: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** "A4" → 440, "C5" → 523.25, "E2" → ~82.4. Returns 0 for unparseable notes. */
export function noteToFrequency(note: string): number {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(note.trim());
  if (!m) return 0;
  const semitone = SEMITONES[m[1]] ?? 0;
  const midi = (Number(m[2]) + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Transposes a note name by semitones ("A4", -3 → "F#4"). Clamps to C1–C9. */
export function transposeTone(note: string, semitones: number): string {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(note.trim());
  if (!m) return note;
  const semitone = SEMITONES[m[1]] ?? 0;
  let midi = (Number(m[2]) + 1) * 12 + semitone + Math.round(semitones);
  midi = Math.max(12, Math.min(108, midi));
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

/** Validates a pattern: parseable notes, sane starts/durations/volumes. */
export function validatePattern(tones: Tone[]): boolean {
  return tones.every((t) => {
    const f = noteToFrequency(t.note);
    if (!Number.isFinite(f) || f <= 0) return false;
    if (!Number.isFinite(t.start) || t.start < 0) return false;
    if (!Number.isFinite(t.dur) || t.dur <= 0) return false;
    if (t.vol !== undefined && (t.vol <= 0 || t.vol > 1)) return false;
    if (t.slideTo !== undefined && noteToFrequency(t.slideTo) <= 0) return false;
    return true;
  });
}

/** Total duration of an SFX pattern in milliseconds (starts are seconds). */
export function sfxDurationMs(tones: Tone[]): number {
  if (tones.length === 0) return 0;
  const end = tones.reduce((max, t) => Math.max(max, t.start + t.dur), 0);
  return Math.round(end * 1000);
}

export interface EnvelopePoint {
  /** Seconds from the tone start. */
  t: number;
  /** Gain value at that point. */
  v: number;
}

/**
 * Gain envelope for a tone: optional fade-in attack, then an exponential
 * release to silence by `tone.dur`. Pure — this is what makes BGM theme
 * crossfades click-free.
 */
export function toneEnvelope(
  tone: Tone,
  fadeInSec = 0,
  baseVol = tone.vol ?? 0.5,
): EnvelopePoint[] {
  const vol = Math.max(0.0001, baseVol);
  const dur = tone.dur;
  const fade = Math.max(0, Math.min(fadeInSec, dur));
  if (fade <= 0) {
    return [
      { t: 0, v: vol },
      { t: dur, v: 0.0001 },
    ];
  }
  return [
    { t: 0, v: 0.0001 },
    { t: fade, v: vol },
    { t: dur, v: 0.0001 },
  ];
}

/** Darkens a BGM pattern: transposes down, softens lead, adds a low drone. */
export function nightify(tones: Tone[], semitones = 3): Tone[] {
  const drone: Tone = {
    note: transposeTone("A2", -semitones),
    start: 0,
    dur: 15.5,
    type: "sine",
    vol: 0.22,
  };
  return [
    drone,
    ...tones.map((t) => ({
      ...t,
      note: transposeTone(t.note, -semitones),
      vol: Math.max(0.12, (t.vol ?? 0.5) * 0.8),
    })),
  ];
}

/** Maps the walking context (biome index 0–2, time phase) to a BGM key. */
export function resolveBgmKey(biomeIndex: number, phase: TimePhase): BgmKey {
  const biomes: BgmBiome[] = ["plains", "forest", "cave"];
  const biome = biomes[Math.abs(Math.floor(biomeIndex)) % biomes.length] ?? "plains";
  return { biome, night: phase === "night" };
}

// ---------------------------------------------------------------------------
// SFX pattern data
// ---------------------------------------------------------------------------

export const SFX_PATTERNS: Record<SfxName, Tone[]> = {
  hit: [
    { note: "B4", start: 0, dur: 0.08, type: "square", vol: 0.45 },
    { note: "G4", start: 0.08, dur: 0.1, type: "square", vol: 0.45 },
  ],
  crit: [
    { note: "E5", start: 0, dur: 0.09, type: "square", vol: 0.5 },
    { note: "G5", start: 0.09, dur: 0.09, type: "square", vol: 0.5 },
    { note: "E5", start: 0.18, dur: 0.12, type: "square", vol: 0.5 },
  ],
  capture: [
    { note: "C5", start: 0, dur: 0.1, type: "square", vol: 0.4 },
    { note: "C5", start: 0.22, dur: 0.1, type: "square", vol: 0.4 },
    { note: "C5", start: 0.44, dur: 0.12, type: "square", vol: 0.4 },
    { note: "G4", start: 0.7, dur: 0.12, type: "triangle", vol: 0.45 },
    { note: "C5", start: 0.84, dur: 0.12, type: "triangle", vol: 0.45 },
    { note: "E5", start: 0.98, dur: 0.2, type: "triangle", vol: 0.45 },
  ],
  "capture-fail": [
    { note: "E4", start: 0, dur: 0.14, type: "square", vol: 0.4 },
    { note: "C4", start: 0.16, dur: 0.18, type: "square", vol: 0.4 },
    { note: "A3", start: 0.34, dur: 0.28, type: "square", vol: 0.4 },
  ],
  levelup: [
    { note: "C5", start: 0, dur: 0.12, type: "triangle", vol: 0.45 },
    { note: "E5", start: 0.12, dur: 0.12, type: "triangle", vol: 0.45 },
    { note: "G5", start: 0.24, dur: 0.12, type: "triangle", vol: 0.45 },
    { note: "C6", start: 0.36, dur: 0.3, type: "triangle", vol: 0.5 },
  ],
  victory: [
    { note: "C5", start: 0, dur: 0.12, type: "square", vol: 0.45 },
    { note: "E5", start: 0.12, dur: 0.12, type: "square", vol: 0.45 },
    { note: "G5", start: 0.24, dur: 0.12, type: "square", vol: 0.45 },
    { note: "C6", start: 0.36, dur: 0.3, type: "square", vol: 0.5 },
  ],
  evolve: [
    { note: "E5", start: 0, dur: 0.6, type: "sawtooth", vol: 0.3, slideTo: "E6" },
    { note: "B5", start: 0.15, dur: 0.5, type: "triangle", vol: 0.4 },
  ],
  faint: [
    { note: "C5", start: 0, dur: 0.5, type: "sawtooth", vol: 0.3, slideTo: "C4" },
    { note: "A3", start: 0.3, dur: 0.35, type: "triangle", vol: 0.35, slideTo: "A2" },
  ],
  heal: [
    { note: "A4", start: 0, dur: 0.1, type: "triangle", vol: 0.4 },
    { note: "C5", start: 0.12, dur: 0.16, type: "triangle", vol: 0.4 },
  ],
  pickup: [
    { note: "C6", start: 0, dur: 0.07, type: "square", vol: 0.35 },
    { note: "E6", start: 0.07, dur: 0.1, type: "square", vol: 0.35 },
  ],
  shiny: [
    { note: "C6", start: 0, dur: 0.08, type: "triangle", vol: 0.5 },
    { note: "E6", start: 0.08, dur: 0.08, type: "triangle", vol: 0.5 },
    { note: "G6", start: 0.16, dur: 0.08, type: "triangle", vol: 0.5 },
    { note: "C7", start: 0.24, dur: 0.2, type: "triangle", vol: 0.55 },
  ],
  click: [{ note: "C6", start: 0, dur: 0.05, type: "square", vol: 0.2 }],
  // weather change — soft two-note chime (rain/snow/starry/clear)
  weather: [
    { note: "E5", start: 0, dur: 0.09, type: "triangle", vol: 0.28 },
    { note: "A5", start: 0.11, dur: 0.14, type: "triangle", vol: 0.28 },
  ],
  // low-HP warning — urgent triple beep
  lowhp: [
    { note: "A4", start: 0, dur: 0.09, type: "square", vol: 0.35 },
    { note: "A4", start: 0.16, dur: 0.09, type: "square", vol: 0.35 },
    { note: "A4", start: 0.32, dur: 0.14, type: "square", vol: 0.35 },
  ],
  // XP collection jingle (also used for level-up sparkles)
  xp: [
    { note: "C5", start: 0, dur: 0.06, type: "triangle", vol: 0.4 },
    { note: "E5", start: 0.06, dur: 0.06, type: "triangle", vol: 0.4 },
    { note: "G5", start: 0.12, dur: 0.06, type: "triangle", vol: 0.4 },
    { note: "C6", start: 0.18, dur: 0.12, type: "triangle", vol: 0.4 },
  ],
  // team switch-in whoosh
  switchin: [
    { note: "C4", start: 0, dur: 0.12, type: "sawtooth", vol: 0.28, slideTo: "C5" },
  ],
  // blocked action buzz (no balls / can't use)
  denied: [
    { note: "E3", start: 0, dur: 0.09, type: "square", vol: 0.32 },
    { note: "C3", start: 0.1, dur: 0.14, type: "square", vol: 0.32 },
  ],
};

// ---------------------------------------------------------------------------
// BGM pattern data — biome variants (16-beat loops, notes in beats)
// ---------------------------------------------------------------------------

export const BGM_LOOP_BEATS = 16;

export const BGM_TEMPO: Record<BgmBiome, number> = {
  plains: 120,
  forest: 108,
  cave: 88,
};

export const BGM_VARIANTS: Record<BgmBiome, Tone[]> = {
  // Route 1: cheerful square bass + triangle lead
  plains: [
    { note: "A2", start: 0, dur: 1.5, type: "square", vol: 0.35 },
    { note: "A2", start: 2, dur: 1.5, type: "square", vol: 0.35 },
    { note: "F2", start: 4, dur: 1.5, type: "square", vol: 0.35 },
    { note: "G2", start: 6, dur: 1.5, type: "square", vol: 0.35 },
    { note: "E2", start: 8, dur: 1.5, type: "square", vol: 0.35 },
    { note: "E2", start: 10, dur: 1.5, type: "square", vol: 0.35 },
    { note: "D2", start: 12, dur: 1.5, type: "square", vol: 0.35 },
    { note: "E2", start: 14, dur: 1.5, type: "square", vol: 0.35 },
    { note: "E5", start: 0, dur: 0.5, type: "triangle", vol: 0.4 },
    { note: "G5", start: 0.5, dur: 0.5, type: "triangle", vol: 0.4 },
    { note: "A5", start: 1, dur: 1, type: "triangle", vol: 0.4 },
    { note: "E5", start: 2, dur: 0.5, type: "triangle", vol: 0.4 },
    { note: "D5", start: 2.5, dur: 0.5, type: "triangle", vol: 0.4 },
    { note: "C5", start: 3, dur: 1, type: "triangle", vol: 0.4 },
    { note: "D5", start: 4, dur: 0.5, type: "triangle", vol: 0.4 },
    { note: "E5", start: 4.5, dur: 0.5, type: "triangle", vol: 0.4 },
    { note: "G5", start: 5, dur: 0.5, type: "triangle", vol: 0.4 },
    { note: "A5", start: 5.5, dur: 0.5, type: "triangle", vol: 0.4 },
    { note: "G5", start: 6, dur: 1, type: "triangle", vol: 0.4 },
    { note: "E5", start: 7, dur: 0.5, type: "triangle", vol: 0.4 },
    { note: "D5", start: 7.5, dur: 0.5, type: "triangle", vol: 0.4 },
    { note: "C5", start: 8, dur: 1, type: "triangle", vol: 0.4 },
    { note: "A4", start: 9, dur: 1, type: "triangle", vol: 0.4 },
    { note: "C5", start: 10, dur: 0.5, type: "triangle", vol: 0.4 },
    { note: "E5", start: 10.5, dur: 0.5, type: "triangle", vol: 0.4 },
    { note: "D5", start: 11, dur: 1, type: "triangle", vol: 0.4 },
    { note: "C5", start: 12, dur: 0.5, type: "triangle", vol: 0.4 },
    { note: "A4", start: 12.5, dur: 0.5, type: "triangle", vol: 0.4 },
    { note: "G4", start: 13, dur: 0.5, type: "triangle", vol: 0.4 },
    { note: "A4", start: 13.5, dur: 0.5, type: "triangle", vol: 0.4 },
    { note: "C5", start: 14, dur: 1, type: "triangle", vol: 0.4 },
  ],
  // Viridian Forest: flowing A-minor figure, airy triangle lead
  forest: [
    { note: "A2", start: 0, dur: 2, type: "square", vol: 0.3 },
    { note: "A2", start: 2, dur: 1, type: "square", vol: 0.3 },
    { note: "C3", start: 3, dur: 1, type: "square", vol: 0.3 },
    { note: "F2", start: 4, dur: 2, type: "square", vol: 0.3 },
    { note: "G2", start: 6, dur: 2, type: "square", vol: 0.3 },
    { note: "E2", start: 8, dur: 2, type: "square", vol: 0.3 },
    { note: "D2", start: 10, dur: 2, type: "square", vol: 0.3 },
    { note: "E2", start: 12, dur: 2, type: "square", vol: 0.3 },
    { note: "A2", start: 14, dur: 2, type: "square", vol: 0.3 },
    { note: "A4", start: 0, dur: 1, type: "triangle", vol: 0.38 },
    { note: "C5", start: 1, dur: 1, type: "triangle", vol: 0.38 },
    { note: "E5", start: 2, dur: 1.5, type: "triangle", vol: 0.38 },
    { note: "D5", start: 3.5, dur: 0.5, type: "triangle", vol: 0.38 },
    { note: "C5", start: 4, dur: 1, type: "triangle", vol: 0.38 },
    { note: "A4", start: 5, dur: 1, type: "triangle", vol: 0.38 },
    { note: "B4", start: 6, dur: 1, type: "triangle", vol: 0.38 },
    { note: "C5", start: 7, dur: 1, type: "triangle", vol: 0.38 },
    { note: "D5", start: 8, dur: 1.5, type: "triangle", vol: 0.38 },
    { note: "C5", start: 9.5, dur: 0.5, type: "triangle", vol: 0.38 },
    { note: "A4", start: 10, dur: 1.5, type: "triangle", vol: 0.38 },
    { note: "G4", start: 11.5, dur: 0.5, type: "triangle", vol: 0.38 },
    { note: "A4", start: 12, dur: 2, type: "triangle", vol: 0.38 },
    { note: "G4", start: 14, dur: 0.5, type: "triangle", vol: 0.3 },
    { note: "E4", start: 14.5, dur: 0.5, type: "triangle", vol: 0.3 },
  ],
  // The Cave: sparse, brooding low figure with a long drone
  cave: [
    { note: "A1", start: 0, dur: 15.5, type: "sine", vol: 0.22 },
    { note: "A2", start: 0, dur: 3, type: "square", vol: 0.28 },
    { note: "G2", start: 4, dur: 3, type: "square", vol: 0.28 },
    { note: "F2", start: 8, dur: 3, type: "square", vol: 0.28 },
    { note: "E2", start: 12, dur: 3.5, type: "square", vol: 0.28 },
    { note: "A3", start: 1, dur: 1.5, type: "sawtooth", vol: 0.22 },
    { note: "G3", start: 5, dur: 1.5, type: "sawtooth", vol: 0.22 },
    { note: "F3", start: 9, dur: 1.5, type: "sawtooth", vol: 0.22 },
    { note: "E3", start: 13, dur: 2, type: "sawtooth", vol: 0.22 },
    { note: "A4", start: 2, dur: 0.5, type: "triangle", vol: 0.16 },
    { note: "G4", start: 6, dur: 0.5, type: "triangle", vol: 0.16 },
    { note: "F4", start: 10, dur: 0.5, type: "triangle", vol: 0.16 },
    { note: "E4", start: 14, dur: 0.5, type: "triangle", vol: 0.16 },
  ],
};

/** Default theme = plains day (kept as a stable alias for older callers). */
export const BGM_PATTERN: Tone[] = BGM_VARIANTS.plains;
export const BGM_TEMPO_BPM: number = BGM_TEMPO.plains;

// ---------------------------------------------------------------------------
// Web Audio runtime (browser only — everything below no-ops in Node)
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bgmPlaying = false;
let bgmTimer: number | null = null;
// N-hotkey toggle: BGM can be switched off independently of SFX and volume.
// startBgm() is gated on this so tray-resume/theme swaps can't restart it.
let bgmEnabled = true;

// Current BGM theme state
let bgmKey: BgmKey = { biome: "plains", night: false };
let bgmPattern: Tone[] = BGM_VARIANTS.plains;
let bgmTempo: number = BGM_TEMPO.plains;
// Per-note scheduler state — only a short lookahead is ever in flight, which
// is what makes theme crossfades quick and click-free.
let bgmNextNote = 0;
let bgmLoopStart = 0;
let bgmFadeInMs = 0;

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  const AC =
    typeof window !== "undefined"
      ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = effectiveVolume();
  master.connect(ctx.destination);
  // The desktop tray volume/mute actions drive the master gain live.
  subscribe(() => {
    if (ctx && master) {
      master.gain.setTargetAtTime(effectiveVolume(), ctx.currentTime, 0.02);
    }
  });
  return ctx;
}

/** Must be called from a user gesture (autoplay policy). Safe to call often. */
export function unlockAudio(): boolean {
  const c = ensureCtx();
  if (c && c.state === "suspended") void c.resume();
  return Boolean(c);
}

function playTone(tone: Tone, when: number, fadeInSec = 0): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const f0 = noteToFrequency(tone.note);
  if (f0 <= 0) return;
  osc.type = tone.type ?? "square";
  osc.frequency.setValueAtTime(f0, when);
  if (tone.slideTo) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, noteToFrequency(tone.slideTo)),
      when + tone.dur,
    );
  }
  // Envelope: optional fade-in attack, then release to silence.
  const env = toneEnvelope(tone, fadeInSec);
  gain.gain.setValueAtTime(env[0].v, when + env[0].t);
  for (let i = 1; i < env.length; i++) {
    const prev = env[i - 1];
    const cur = env[i];
    if (cur.v < prev.v) {
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, cur.v), when + cur.t);
    } else {
      gain.gain.linearRampToValueAtTime(cur.v, when + cur.t);
    }
  }
  osc.connect(gain);
  gain.connect(master);
  osc.start(when);
  osc.stop(when + tone.dur + 0.03);
}

/** Plays a one-shot SFX. Returns false when audio is unavailable. */
export function playSfx(name: SfxName): boolean {
  const c = ensureCtx();
  if (!c) return false;
  const pattern = SFX_PATTERNS[name];
  if (!pattern || !validatePattern(pattern)) return false;
  const t0 = c.currentTime + 0.01;
  for (const tone of pattern) playTone(tone, t0 + tone.start);
  return true;
}

/**
 * Switches the BGM to the biome/phase-appropriate variant. Records the theme
 * even when audio is unavailable (so tests can assert the selection), and
 * restarts the loop at the next boundary when the theme actually changed.
 */
export function setBgmTheme(biomeIndex: number, phase: TimePhase): BgmKey {
  const key = resolveBgmKey(biomeIndex, phase);
  const changed = key.biome !== bgmKey.biome || key.night !== bgmKey.night;
  if (changed) {
    bgmKey = key;
    bgmPattern = key.night ? nightify(BGM_VARIANTS[key.biome]) : BGM_VARIANTS[key.biome];
    bgmTempo = BGM_TEMPO[key.biome];
    // Quick crossfade: restart the scheduler on the new theme immediately and
    // fade the first notes in, so the swap never clicks mid-note. Old notes
    // already in flight simply finish their release envelopes (a real fade).
    bgmFadeInMs = BGM_FADE_MS;
    if (ctx && bgmPlaying) {
      bgmNextNote = 0;
      bgmLoopStart = ctx.currentTime + 0.05;
      pumpBgm();
    }
  }
  return key;
}

export function getBgmTheme(): BgmKey {
  return { ...bgmKey };
}

const BGM_LOOKAHEAD_SEC = 0.3;
/** Quick crossfade window applied to the first notes after a theme swap. */
export const BGM_FADE_MS = 400;

function pumpBgm(): void {
  if (!ctx || !bgmPlaying) return;
  const beatSec = 60 / bgmTempo;
  const horizon = ctx.currentTime + BGM_LOOKAHEAD_SEC;
  const fadeInSec = bgmFadeInMs > 0 ? bgmFadeInMs / 1000 : 0;
  let guard = 0;
  while (guard < 8192) {
    guard++;
    const tone = bgmPattern[bgmNextNote];
    const when = bgmLoopStart + tone.start * beatSec;
    if (when >= horizon) break;
    playTone(tone, when, fadeInSec);
    bgmNextNote++;
    if (bgmNextNote >= bgmPattern.length) {
      bgmNextNote = 0;
      bgmLoopStart += BGM_LOOP_BEATS * beatSec;
    }
  }
  bgmFadeInMs = 0;
}

/** Starts the looping BGM (idempotent). Call after a user gesture. */
export function startBgm(): boolean {
  if (!bgmEnabled) return false;
  const c = ensureCtx();
  if (!c || bgmPlaying) return false;
  bgmPlaying = true;
  bgmNextNote = 0;
  bgmLoopStart = c.currentTime + 0.12;
  bgmFadeInMs = BGM_FADE_MS; // gentle fade-in on the very first notes
  bgmTimer = window.setInterval(pumpBgm, 150);
  pumpBgm();
  return true;
}

export function stopBgm(): void {
  bgmPlaying = false;
  if (bgmTimer !== null) {
    window.clearInterval(bgmTimer);
    bgmTimer = null;
  }
}

export function isBgmPlaying(): boolean {
  return bgmPlaying;
}

/**
 * Turns the looping BGM on/off without touching SFX. Disabling stops the
 * current loop immediately; enabling just raises the flag (call `startBgm()`
 * to resume — the caller decides when). Returns the new state.
 */
export function setBgmEnabled(enabled: boolean): boolean {
  bgmEnabled = Boolean(enabled);
  if (!bgmEnabled) stopBgm();
  return bgmEnabled;
}

export function isBgmEnabled(): boolean {
  return bgmEnabled;
}

/** Short feedback label for the N-hotkey toggle. */
export function bgmLabel(enabled: boolean): string {
  return enabled ? "🎵 Music On" : "🎵 Music Off";
}

export function _resetForTests(): void {
  stopBgm();
  bgmEnabled = true;
  ctx = null;
  master = null;
  bgmKey = { biome: "plains", night: false };
  bgmPattern = BGM_VARIANTS.plains;
  bgmTempo = BGM_TEMPO.plains;
  bgmNextNote = 0;
  bgmLoopStart = 0;
  bgmFadeInMs = 0;
}
