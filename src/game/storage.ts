// ---------------------------------------------------------------------------
// Storage layer: load/persist/migrate/export/import for the banner save.
// The storage interface is injected so tests can use in-memory fakes and fuzz
// arbitrary v1/v2 payloads through the same code path as the browser.
// ---------------------------------------------------------------------------

import { createSave, migrateV1, normalizeSave, normalizePokemon } from "./engine";
import type { SaveData, SaveV1 } from "./types";

export const V1_KEY = "poke-banner-save";
export const V2_KEY = "poke-banner-save-v2";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Checksum used by the export codec (djb2 — deterministic, test-friendly). */
export function checksum(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

export function isValidSave(raw: unknown): raw is SaveData {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  return r.version === 2 && Array.isArray(r.team);
}

/** Loads the newest save; transparently migrates a v1 save if present. */
export function loadSave(storage: StorageLike): SaveData | null {
  const v2 = storage.getItem(V2_KEY);
  if (v2) {
    try {
      const parsed = JSON.parse(v2) as unknown;
      if (isValidSave(parsed)) return normalizeSave(parsed);
    } catch {
      // fall through to v1
    }
  }
  const v1 = storage.getItem(V1_KEY);
  if (v1) {
    try {
      const raw = JSON.parse(v1) as SaveV1;
      const migrated = migrateV1(raw);
      persistSave(migrated, storage);
      return migrated;
    } catch {
      return null;
    }
  }
  return null;
}

export function persistSave(save: SaveData, storage: StorageLike): void {
  storage.setItem(V2_KEY, JSON.stringify(normalizeSave(save)));
}

export function clearSave(storage: StorageLike): void {
  storage.removeItem(V2_KEY);
  storage.removeItem(V1_KEY);
}

/**
 * Export codec: a single portable string that round-trips through importSave.
 * Format: "POKEBANNER|v2|<json>|<checksum>"
 */
export function exportSave(save: SaveData): string {
  const normalized = normalizeSave(save);
  const json = JSON.stringify(normalized);
  return `POKEBANNER|v2|${json}|${checksum(json)}`;
}

/**
 * Throws on corrupt/mismatched exports, otherwise returns a valid save.
 * Parses with a prefix strip + LAST "|" split (not naive split), so a "|"
 * inside a JSON string field (e.g. a nickname like "Ricky|Dangerous") can't
 * break the codec.
 */
export function importSave(text: string): SaveData {
  if (typeof text !== "string") throw new Error("Not a save string.");
  const prefix = "POKEBANNER|v2|";
  if (!text.startsWith(prefix)) throw new Error("Unrecognized save format.");
  const bar = text.lastIndexOf("|");
  if (bar < prefix.length) throw new Error("Unrecognized save format.");
  const json = text.slice(prefix.length, bar);
  const sum = text.slice(bar + 1);
  if (checksum(json) !== sum) {
    throw new Error("Save checksum mismatch — data corrupted.");
  }
  const parsed = JSON.parse(json) as unknown;
  if (!isValidSave(parsed)) throw new Error("Save payload is not a valid v2 save.");
  return normalizeSave(parsed);
}

/**
 * Cross-layer round trip helper: serializes with the browser-style JSON write
 * (used by fuzz tests to prove save → persist → load → battle is stable).
 */
export function roundTrip(save: SaveData, storage: StorageLike): SaveData {
  persistSave(save, storage);
  const loaded = loadSave(storage);
  if (!loaded) throw new Error("Round trip produced no save.");
  return loaded;
}

export { createSave, migrateV1, normalizeSave, normalizePokemon };
