// ---------------------------------------------------------------------------
// Audio controller — the single integration point for the desktop shell's
// tray volume actions. No sounds play yet; future chiptune/SFX code should
// read `effectiveVolume()` (0 when muted) before emitting.
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();

let volume = 1;
let muted = false;

function emit() {
  for (const cb of [...listeners]) cb();
}

/** Clamps any input to [0, 1]; non-finite values fall back to 0.5. */
export function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return 0.5;
  return Math.min(1, Math.max(0, v));
}

export function setVolume(v: number): number {
  volume = clampVolume(v);
  emit();
  return volume;
}

export function getVolume(): number {
  return volume;
}

export function setMuted(m: boolean): boolean {
  muted = Boolean(m);
  emit();
  return muted;
}

export function isMuted(): boolean {
  return muted;
}

/** What a sound source should actually play at. */
export function effectiveVolume(): number {
  return muted ? 0 : volume;
}

/** Steps volume by a delta (clamped); unmutes on any positive step. */
export function stepVolume(delta: number): number {
  if (delta > 0) muted = false;
  return setVolume(volume + delta);
}

export function toggleMuted(): boolean {
  return setMuted(!muted);
}

/** Short human-readable label for the current volume state (M-hotkey / tray feedback). */
export function volumeLabel(mutedState: boolean, volumeValue: number): string {
  return mutedState
    ? "🔇 Muted"
    : `🔊 Volume ${Math.round(clampVolume(volumeValue) * 100)}%`;
}

/** Subscribe to volume/mute changes; returns an unsubscribe function. */
export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function snapshot(): { volume: number; muted: boolean } {
  return { volume, muted };
}

/** Resets state (used by tests). */
export function _resetForTests(): void {
  volume = 1;
  muted = false;
  listeners.clear();
}
