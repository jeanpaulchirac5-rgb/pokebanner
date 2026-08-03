import { beforeEach, describe, expect, it } from "vitest";
import {
  BGM_FADE_MS,
  BGM_LOOP_BEATS,
  BGM_PATTERN,
  BGM_TEMPO,
  BGM_TEMPO_BPM,
  BGM_VARIANTS,
  SFX_PATTERNS,
  _resetForTests,
  bgmLabel,
  getBgmTheme,
  isBgmEnabled,
  isBgmPlaying,
  nightify,
  noteToFrequency,
  resolveBgmKey,
  setBgmEnabled,
  setBgmTheme,
  sfxDurationMs,
  startBgm,
  stopBgm,
  toneEnvelope,
  transposeTone,
  validatePattern,
} from "../sound";
import type { BgmBiome, SfxName } from "../sound";

beforeEach(() => _resetForTests());

describe("noteToFrequency", () => {
  it("maps note names to standard equal-temperament frequencies", () => {
    expect(noteToFrequency("A4")).toBeCloseTo(440, 1);
    expect(noteToFrequency("C4")).toBeCloseTo(261.63, 1);
    expect(noteToFrequency("C5")).toBeCloseTo(523.25, 1);
    expect(noteToFrequency("E5")).toBeCloseTo(659.26, 1);
    expect(noteToFrequency("A2")).toBeCloseTo(110, 1);
  });

  it("handles sharps and flats identically", () => {
    expect(noteToFrequency("C#5")).toBeCloseTo(noteToFrequency("Db5"), 5);
    expect(noteToFrequency("A#4")).toBeCloseTo(noteToFrequency("Bb4"), 5);
  });

  it("returns 0 for unparseable input", () => {
    expect(noteToFrequency("foo")).toBe(0);
    expect(noteToFrequency("")).toBe(0);
    expect(noteToFrequency("C")).toBe(0);
  });
});

describe("pattern data", () => {
  it("every SFX pattern exists, is valid, and has a finite duration", () => {
    const names: SfxName[] = [
      "hit", "crit", "capture", "capture-fail", "levelup", "victory",
      "evolve", "faint", "heal", "pickup", "shiny", "click",
      "lowhp", "xp", "switchin", "denied",
    ];
    for (const name of names) {
      const pattern = SFX_PATTERNS[name];
      expect(pattern, name).toBeDefined();
      expect(pattern.length, name).toBeGreaterThan(0);
      expect(validatePattern(pattern), name).toBe(true);
      expect(sfxDurationMs(pattern), name).toBeGreaterThan(0);
    }
  });

  it("all SFX have no overlapping starts and stay under ~1.4s", () => {
    for (const [name, pattern] of Object.entries(SFX_PATTERNS)) {
      const starts = pattern.map((t) => t.start).sort((a, b) => a - b);
      for (let i = 1; i < starts.length; i++) {
        expect(starts[i] - starts[i - 1], name).toBeGreaterThanOrEqual(0);
      }
      expect(sfxDurationMs(pattern), name).toBeLessThanOrEqual(1400);
    }
  });

  it("the BGM loop is valid and lasts a reasonable length", () => {
    expect(BGM_PATTERN.length).toBeGreaterThan(0);
    expect(validatePattern(BGM_PATTERN)).toBe(true);
    expect(BGM_LOOP_BEATS).toBeGreaterThan(0);
    expect(BGM_TEMPO_BPM).toBeGreaterThan(0);
    const loopSeconds = (BGM_LOOP_BEATS * 60) / BGM_TEMPO_BPM;
    expect(loopSeconds).toBeGreaterThan(4);
    expect(loopSeconds).toBeLessThan(30);
    // every tone fits inside the loop
    for (const t of BGM_PATTERN) {
      expect(t.start + t.dur).toBeLessThanOrEqual(BGM_LOOP_BEATS + 0.001);
    }
  });

  it("sfxDurationMs measures to the last tone end", () => {
    expect(sfxDurationMs([{ note: "C5", start: 0, dur: 0.25 }])).toBe(250);
    expect(
      sfxDurationMs([
        { note: "C5", start: 0, dur: 0.1 },
        { note: "G5", start: 0.5, dur: 0.4 },
      ]),
    ).toBe(900);
    expect(sfxDurationMs([])).toBe(0);
  });

  it("validatePattern rejects broken tones", () => {
    const good = [{ note: "C5", start: 0, dur: 0.1, vol: 0.5 }];
    expect(validatePattern(good)).toBe(true);
    expect(validatePattern([{ note: "zz9", start: 0, dur: 0.1 }])).toBe(false);
    expect(validatePattern([{ note: "C5", start: -1, dur: 0.1 }])).toBe(false);
    expect(validatePattern([{ note: "C5", start: 0, dur: 0 }])).toBe(false);
    expect(validatePattern([{ note: "C5", start: 0, dur: 0.1, vol: 2 }])).toBe(false);
    expect(validatePattern([{ note: "C5", start: 0, dur: 0.1, slideTo: "nope" }])).toBe(false);
  });
});

describe("biome BGM variants", () => {
  it("resolveBgmKey maps biome index + time phase to a BGM key", () => {
    expect(resolveBgmKey(0, "day")).toEqual({ biome: "plains", night: false });
    expect(resolveBgmKey(1, "day")).toEqual({ biome: "forest", night: false });
    expect(resolveBgmKey(2, "night")).toEqual({ biome: "cave", night: true });
    expect(resolveBgmKey(1, "sunset")).toEqual({ biome: "forest", night: false });
    expect(resolveBgmKey(3, "day")).toEqual({ biome: "plains", night: false });
  });

  it("all three biome variants are valid 16-beat patterns", () => {
    for (const [biome, pattern] of Object.entries(BGM_VARIANTS)) {
      expect(validatePattern(pattern), biome).toBe(true);
      for (const t of pattern) {
        expect(t.start + t.dur, `${biome}:${t.note}`).toBeLessThanOrEqual(
          BGM_LOOP_BEATS + 0.001,
        );
      }
    }
  });

  it("transposeTone shifts notes by semitones and tolerates garbage", () => {
    expect(transposeTone("A4", -3)).toBe("F#4");
    expect(transposeTone("C5", 2)).toBe("D5");
    expect(transposeTone("E5", 0)).toBe("E5");
    expect(transposeTone("zz", -1)).toBe("zz");
    // transposed notes still parse to the expected frequency
    expect(noteToFrequency(transposeTone("A4", -3))).toBeCloseTo(
      noteToFrequency("A4") / Math.pow(2, 3 / 12),
      4,
    );
  });

  it("nightify produces a valid, darker variant with a low drone", () => {
    for (const biome of Object.keys(BGM_VARIANTS) as BgmBiome[]) {
      const day = BGM_VARIANTS[biome];
      const night = nightify(day);
      expect(validatePattern(night), biome).toBe(true);
      expect(night.length, biome).toBe(day.length + 1);
      // a sine drone is prepended
      expect(night[0].type, biome).toBe("sine");
      expect(noteToFrequency(night[0].note), biome).toBeGreaterThan(0);
      // every original tone is transposed DOWN (or equal) in the night variant
      day.forEach((t, i) => {
        expect(
          noteToFrequency(night[i + 1].note),
          `${biome}:${t.note}`,
        ).toBeLessThanOrEqual(noteToFrequency(t.note) + 0.001);
        expect((night[i + 1].vol ?? 1), `${biome}:${t.note}`).toBeLessThanOrEqual(
          t.vol ?? 1,
        );
      });
    }
  });

  it("nightify stays inside the loop window", () => {
    for (const day of Object.values(BGM_VARIANTS)) {
      for (const t of nightify(day)) {
        expect(t.start + t.dur).toBeLessThanOrEqual(BGM_LOOP_BEATS + 0.001);
      }
    }
  });

  it("per-biome tempos get progressively slower", () => {
    expect(BGM_TEMPO.plains).toBeGreaterThan(BGM_TEMPO.forest);
    expect(BGM_TEMPO.forest).toBeGreaterThan(BGM_TEMPO.cave);
    // default alias matches the plains tempo (keeps the classic loop length)
    expect(BGM_TEMPO_BPM).toBe(BGM_TEMPO.plains);
    expect(BGM_PATTERN).toBe(BGM_VARIANTS.plains);
  });

  it("setBgmTheme records the resolved theme even without an audio context", () => {
    expect(getBgmTheme()).toEqual({ biome: "plains", night: false });
    setBgmTheme(1, "day");
    expect(getBgmTheme()).toEqual({ biome: "forest", night: false });
    setBgmTheme(2, "night");
    expect(getBgmTheme()).toEqual({ biome: "cave", night: true });
    // back to plains on biome wrap
    setBgmTheme(3, "day");
    expect(getBgmTheme()).toEqual({ biome: "plains", night: false });
  });
});

describe("BGM enable toggle (N hotkey)", () => {
  it("bgmLabel formats the on/off feedback message", () => {
    expect(bgmLabel(true)).toBe("🎵 Music On");
    expect(bgmLabel(false)).toBe("🎵 Music Off");
  });

  it("setBgmEnabled/isBgmEnabled flip the flag; reset restores it", () => {
    expect(isBgmEnabled()).toBe(true);
    expect(setBgmEnabled(false)).toBe(false);
    expect(isBgmEnabled()).toBe(false);
    expect(setBgmEnabled(false)).toBe(false); // idempotent
    expect(setBgmEnabled(true)).toBe(true);
    expect(isBgmEnabled()).toBe(true);
    _resetForTests();
    expect(isBgmEnabled()).toBe(true);
  });

  it("startBgm is gated: disabled means no BGM even when audio is available", () => {
    withFakeAudio(() => {
      setBgmEnabled(false);
      expect(startBgm()).toBe(false);
      expect(isBgmPlaying()).toBe(false);
      expect(isBgmEnabled()).toBe(false);
    });
  });

  it("re-enabling the flag lets the BGM start and stop again", () => {
    withFakeAudio(() => {
      setBgmEnabled(false);
      setBgmEnabled(true);
      expect(startBgm()).toBe(true);
      expect(isBgmPlaying()).toBe(true);
      expect(isBgmEnabled()).toBe(true);
      stopBgm();
      expect(isBgmPlaying()).toBe(false);
    });
  });
});

describe("BGM crossfade", () => {
  it("BGM_FADE_MS is a short positive crossfade window", () => {
    expect(BGM_FADE_MS).toBeGreaterThan(0);
    expect(BGM_FADE_MS).toBeLessThanOrEqual(1500);
  });

  it("toneEnvelope fades in then releases to silence", () => {
    const env = toneEnvelope({ note: "C5", start: 0, dur: 1 }, 0.4);
    expect(env[0]).toEqual({ t: 0, v: 0.0001 });
    expect(env[1].t).toBeCloseTo(0.4, 5);
    expect(env[1].v).toBeCloseTo(0.5, 5);
    expect(env[2].t).toBeCloseTo(1, 5);
    expect(env[2].v).toBeLessThan(0.01);
  });

  it("toneEnvelope clamps the fade-in to the tone duration", () => {
    const env = toneEnvelope({ note: "C5", start: 0, dur: 0.2 }, 0.4, 0.3);
    expect(env.length).toBe(3);
    expect(env[1].t).toBeLessThanOrEqual(0.2);
    expect(env[1].v).toBeCloseTo(0.3, 5);
  });

  it("toneEnvelope attacks instantly when no fade is requested", () => {
    const env = toneEnvelope({ note: "C5", start: 0, dur: 0.5 }, 0, 0.4);
    expect(env[0]).toEqual({ t: 0, v: 0.4 });
    expect(env[1].t).toBeCloseTo(0.5, 5);
    expect(env[1].v).toBeLessThan(0.01);
  });

  it("theme changes never leave a stale key; repeats are no-ops", () => {
    setBgmTheme(0, "day");
    expect(getBgmTheme()).toEqual({ biome: "plains", night: false });
    setBgmTheme(1, "night");
    expect(getBgmTheme()).toEqual({ biome: "forest", night: true });
    setBgmTheme(1, "night"); // same theme — no churn
    expect(getBgmTheme()).toEqual({ biome: "forest", night: true });
  });
});

// ---------------------------------------------------------------------------
// Helper: stub a minimal window.AudioContext so the BGM scheduler can run
// (startBgm/stopBgm) in the Node test environment. Restores globals after.
// ---------------------------------------------------------------------------
function withFakeAudio(fn: () => void): void {
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
  const prev = (globalThis as Record<string, unknown>).window;
  let timerSeq = 0;
  const fakeGain = () => ({
    value: 1,
    setTargetAtTime() {},
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  });
  const fakeAc = class {
    currentTime = 0;
    destination = {};
    state = "running";
    resume() {
      return Promise.resolve();
    }
    createGain() {
      return { gain: fakeGain(), connect() {} };
    }
    createOscillator() {
      return {
        type: "square",
        frequency: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        start() {},
        stop() {},
      };
    }
  };
  (globalThis as Record<string, unknown>).window = {
    AudioContext: fakeAc,
    setInterval: () => ++timerSeq,
    clearInterval: () => {},
  };
  try {
    fn();
  } finally {
    _resetForTests(); // still under the stub so stopBgm's clearInterval works
    if (hadWindow) (globalThis as Record<string, unknown>).window = prev;
    else delete (globalThis as Record<string, unknown>).window;
  }
}
