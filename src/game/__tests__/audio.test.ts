import { beforeEach, describe, expect, it } from "vitest";
import {
  _resetForTests,
  clampVolume,
  effectiveVolume,
  getVolume,
  isMuted,
  setMuted,
  setVolume,
  snapshot,
  stepVolume,
  subscribe,
  toggleMuted,
  volumeLabel,
} from "../audio";

beforeEach(() => _resetForTests());

describe("clampVolume", () => {
  it("clamps to [0, 1]", () => {
    expect(clampVolume(0.5)).toBe(0.5);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(0)).toBe(0);
    expect(clampVolume(1)).toBe(1);
  });

  it("falls back to 0.5 for non-finite inputs", () => {
    expect(clampVolume(Number.NaN)).toBe(0.5);
    expect(clampVolume(Number.POSITIVE_INFINITY)).toBe(0.5);
    expect(clampVolume(undefined as unknown as number)).toBe(0.5);
  });
});

describe("volume state", () => {
  it("setVolume clamps and getVolume reads it back", () => {
    expect(setVolume(0.7)).toBe(0.7);
    expect(getVolume()).toBe(0.7);
    setVolume(5);
    expect(getVolume()).toBe(1);
    setVolume(-3);
    expect(getVolume()).toBe(0);
  });

  it("mute drives effectiveVolume to zero", () => {
    setVolume(0.8);
    expect(effectiveVolume()).toBe(0.8);
    setMuted(true);
    expect(isMuted()).toBe(true);
    expect(effectiveVolume()).toBe(0);
    setMuted(false);
    expect(effectiveVolume()).toBe(0.8);
  });

  it("stepVolume moves by delta and unmutes on a positive step", () => {
    setVolume(0.5);
    setMuted(true);
    stepVolume(0.1);
    expect(isMuted()).toBe(false);
    expect(getVolume()).toBe(0.6);
    stepVolume(-0.9);
    expect(getVolume()).toBe(0);
  });

  it("toggleMuted flips the flag", () => {
    expect(toggleMuted()).toBe(true);
    expect(isMuted()).toBe(true);
    expect(toggleMuted()).toBe(false);
  });

  it("snapshot returns the current volume/mute pair", () => {
    setVolume(0.4);
    setMuted(true);
    expect(snapshot()).toEqual({ volume: 0.4, muted: true });
  });
});

describe("volumeLabel", () => {
  it("reports Muted when muted regardless of volume", () => {
    expect(volumeLabel(true, 0.8)).toBe("🔇 Muted");
    expect(volumeLabel(true, 0)).toBe("🔇 Muted");
    expect(volumeLabel(true, 5)).toBe("🔇 Muted");
  });

  it("reports a clamped percentage when unmuted", () => {
    expect(volumeLabel(false, 0.4)).toBe("🔊 Volume 40%");
    expect(volumeLabel(false, 1)).toBe("🔊 Volume 100%");
    expect(volumeLabel(false, 0)).toBe("🔊 Volume 0%");
  });

  it("clamps out-of-range and non-finite volumes", () => {
    expect(volumeLabel(false, 2)).toBe("🔊 Volume 100%");
    expect(volumeLabel(false, -1)).toBe("🔊 Volume 0%");
    expect(volumeLabel(false, Number.NaN)).toBe("🔊 Volume 50%");
  });
});

describe("subscription", () => {
  it("notifies subscribers on changes and unsubscribes cleanly", () => {
    let calls = 0;
    const off = subscribe(() => calls++);
    setVolume(0.6);
    setMuted(true);
    expect(calls).toBe(2);
    off();
    setVolume(0.9);
    expect(calls).toBe(2);
  });
});
