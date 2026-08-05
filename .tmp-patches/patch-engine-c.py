p = "src/game/engine.ts"
s = open(p).read()

block = r'''
// ---------------------------------------------------------------------------
// v2.0.0 — Ghost PvP & Trainer Cards
// ---------------------------------------------------------------------------

const CARD_PREFIX = "PB2";

/** djb2 checksum for the card codec (deterministic, test-friendly). */
function cardChecksum(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36).toUpperCase().padStart(4, "0");
}

/** Each char becomes two base-32 digits from the unambiguous alphabet. */
function base32Encode(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out += CARD_ALPHABET[Math.floor(code / 32) % CARD_ALPHABET.length];
    out += CARD_ALPHABET[code % CARD_ALPHABET.length];
  }
  return out;
}

function base32Decode(text: string): string {
  let out = "";
  for (let i = 0; i + 1 < text.length; i += 2) {
    const a = CARD_ALPHABET.indexOf(text[i]);
    const b = CARD_ALPHABET.indexOf(text[i + 1]);
    if (a < 0 || b < 0) throw new Error("Bad card code.");
    out += String.fromCharCode(a * 32 + b);
  }
  return out;
}

/** Builds a shareable Trainer Card from a team (strongest first, max 6). */
export function cardFromTeam(
  team: Pokemon[],
  trainerName: string,
  wins: number,
): TrainerCard {
  const roster = [...team]
    .filter((m) => m.hp > 0)
    .sort((a, b) => b.level - a.level)
    .slice(0, 6)
    .map((m) => ({ ...m, hp: m.maxHp, status: "none" as const, statusTurns: 0 }));
  return {
    trainerName: trainerName.slice(0, 16),
    rank: pvpRankFor(Math.max(0, Math.floor(wins))).id,
    wins: Math.max(0, Math.floor(wins)),
    team: roster,
  };
}

/** Rank ladder position for a lifetime win count (0-based index). */
export function pvpRankIndex(wins: number): number {
  let idx = 0;
  for (let i = 0; i < PVP_RANKS.length; i++) {
    if (wins >= PVP_RANKS[i].minWins) idx = i;
  }
  return idx;
}

export function pvpRankFor(wins: number): PvpRankDef {
  return PVP_RANKS[pvpRankIndex(wins)];
}

/**
 * Encodes a Trainer Card into a compact shareable code:
 * "PB2-<base32 payload>-<checksum>". Round-trips through decodeTrainerCard.
 */
export function encodeTrainerCard(card: TrainerCard): string {
  const team = card.team.slice(0, 6).map((m) => [
    m.speciesId,
    Math.min(TUNING.maxLevel, Math.max(1, Math.floor(m.level))),
    m.shiny ? 1 : 0,
    m.aura ?? "",
  ]);
  const payload = JSON.stringify({
    n: card.trainerName.slice(0, 16),
    r: card.rank,
    w: Math.max(0, Math.floor(card.wins)),
    t: team,
  });
  const body = base32Encode(payload);
  return `${CARD_PREFIX}-${body}-${cardChecksum(body)}`;
}

/** Decodes a Trainer Card code. Throws on any tampering / bad shape. */
export function decodeTrainerCard(code: string): TrainerCard {
  const clean = String(code).trim().toUpperCase();
  if (!clean.startsWith(`${CARD_PREFIX}-`)) throw new Error("Bad card code.");
  const rest = clean.slice(CARD_PREFIX.length + 1);
  const bar = rest.lastIndexOf("-");
  if (bar < 0) throw new Error("Bad card code.");
  const body = rest.slice(0, bar);
  const check = rest.slice(bar + 1);
  if (cardChecksum(body) !== check) throw new Error("Card checksum mismatch.");
  let json = "";
  try {
    json = base32Decode(body);
  } catch {
    throw new Error("Card payload invalid.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Card payload invalid.");
  }
  const p = parsed as { n?: unknown; r?: unknown; w?: unknown; t?: unknown };
  if (
    typeof p.n !== "string" ||
    typeof p.r !== "string" ||
    typeof p.w !== "number" ||
    !Array.isArray(p.t)
  ) {
    throw new Error("Card payload invalid.");
  }
  const team = (p.t as unknown[]).slice(0, 6).map((raw) => {
    const row = raw as [string, number, number, string];
    const speciesId = String(row?.[0] ?? "");
    const level = Math.min(TUNING.maxLevel, Math.max(1, Math.floor(Number(row?.[1]) || 1)));
    const aura = AURAS[row?.[3] as AuraKind] ? (row[3] as AuraKind) : undefined;
    if (!speciesId) throw new Error("Card team invalid.");
    return makePokemon(speciesId, level, { shiny: Boolean(row?.[2]), aura });
  });
  if (team.length === 0) throw new Error("Card team empty.");
  return {
    trainerName: p.n.slice(0, 16),
    rank: PVP_RANKS.some((r) => r.id === p.r) ? (p.r as PvpRankId) : "novice",
    wins: Math.max(0, Math.floor(p.w)),
    team,
  };
}

/** The ghost battle: the imported card's leader, scaled to the challenger. */
export function buildGhostEncounter(card: TrainerCard, leaderLevel: number): Encounter {
  const lead = card.team[0] ?? card.team[card.team.length - 1];
  const step = Math.min(4, pvpRankIndex(card.wins));
  return {
    kind: "pvp",
    speciesId: lead.speciesId,
    level: Math.min(TUNING.maxLevel, leaderLevel + PVP_TUNING.levelOffset + step),
    shiny: lead.shiny,
    isBoss: true,
    hpScale: PVP_TUNING.hpScale,
    atkScale: PVP_TUNING.atkScale,
    aura: lead.aura,
  };
}

/**
 * Ghost PvP win/loss bookkeeping: advances the ladder, pays the duel purse
 * (win only) and awards the rank-up bonus the moment a new rank is reached.
 */
export function pvpBookkeeping(
  save: SaveData,
  won: boolean,
): { save: SaveData; promoted: boolean; reward: number } {
  const before = pvpRankIndex(save.pvpWins);
  const pvpWins = won ? save.pvpWins + 1 : save.pvpWins;
  const after = pvpRankIndex(pvpWins);
  const promoted = won && after > before;
  const reward = promoted ? PVP_TUNING.rankUpMoney : 0;
  const purse = won ? PVP_TUNING.moneyPerWin : 0;
  return {
    save: {
      ...save,
      pvpWins,
      pvpLosses: won ? save.pvpLosses : save.pvpLosses + 1,
      money: save.money + purse + reward,
      moneyEarned: save.moneyEarned + purse + reward,
    },
    promoted,
    reward,
  };
}

// ---------------------------------------------------------------------------
// v2.0.0 — Daily quests & the League Pass
// ---------------------------------------------------------------------------

/** Local calendar-day key ("YYYY-MM-DD") a set of quests belongs to. */
export function dailyKeyFor(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The three daily quests for a date. Fully deterministic: the same date key
 * ALWAYS yields the same quests (seeded from a hash of the key), so the tab
 * can preview today's quests even before the first activity is recorded.
 */
export function questsForDate(dateKey: string): DailyQuests {
  const rng = lcg(hashString(dateKey) || 1);
  const pool = [...QUEST_POOL];
  const defs: QuestDef[] = [];
  for (let i = 0; i < QUEST_TUNING.count && pool.length > 0; i++) {
    const at = Math.floor(rng() * pool.length);
    defs.push(pool.splice(at, 1)[0]);
  }
  return {
    date: dateKey,
    defs,
    progress: defs.map(() => 0),
    claimed: defs.map(() => false),
  };
}

/** Today's quests for a save (re-creates them lazily on first use / new day). */
function freshQuests(save: SaveData, now = Date.now()): DailyQuests {
  const existing = save.quests;
  const today = dailyKeyFor(new Date(now));
  if (existing && existing.date === today && existing.defs.length > 0) return existing;
  return questsForDate(today);
}

/**
 * Records one unit of an activity: advances matching daily quests (capped at
 * their targets) and accrues League Pass XP. Pure + unit-tested.
 */
export function recordActivity(
  save: SaveData,
  kind: QuestKind,
  amount = 1,
): SaveData {
  const quests = freshQuests(save);
  const amt = Math.max(1, Math.floor(amount));
  const progress = quests.defs.map((def, i) =>
    def.kind === kind
      ? Math.min(def.target, (quests.progress[i] ?? 0) + amt)
      : quests.progress[i] ?? 0,
  );
  return {
    ...save,
    quests: { ...quests, progress },
    passXp: save.passXp + PASS_TUNING.xpPer[kind] * amt,
  };
}

/** Claims a completed quest's PokéDollar reward. Idempotent. */
export function claimQuest(
  save: SaveData,
  index: number,
): { save: SaveData; reward: number } {
  const quests = save.quests;
  if (!quests) return { save, reward: 0 };
  const def = quests.defs[index];
  if (!def || quests.claimed[index]) return { save, reward: 0 };
  if ((quests.progress[index] ?? 0) < def.target) return { save, reward: 0 };
  return {
    save: {
      ...save,
      quests: {
        ...quests,
        claimed: quests.claimed.map((c, i) => (i === index ? true : c)),
      },
      money: save.money + def.reward,
      moneyEarned: save.moneyEarned + def.reward,
    },
    reward: def.reward,
  };
}

/** Cumulative XP threshold that unlocks a given pass tier (1–30). */
export function passXpForTier(tier: number): number {
  const clamped = Math.min(PASS_TIERS.length, Math.max(1, Math.floor(tier)));
  return PASS_THRESHOLDS[clamped] ?? 0;
}

/** Current unlocked pass tier for an XP total (1 = always unlocked). */
export function passTierFor(xp: number): number {
  const x = Math.max(0, Math.floor(xp));
  let tier = 1;
  for (let t = 1; t <= PASS_TIERS.length; t++) {
    if (x >= PASS_THRESHOLDS[t]) tier = t;
  }
  return tier;
}

/**
 * Claims one unlocked, unclaimed pass tier. Grants the tier's reward into the
 * save (money / item / egg / aura on the first member without one). Returns
 * the reward for messaging. Idempotent.
 */
export function claimPassTier(
  save: SaveData,
  tier: number,
  rng: Rng = lcg(Date.now() >>> 0),
): { save: SaveData; reward: PassReward | null; appliedTo?: string } {
  const t = Math.floor(tier);
  if (t < 1 || t > PASS_TIERS.length) return { save, reward: null };
  if (t > passTierFor(save.passXp)) return { save, reward: null };
  if (save.passClaimed.includes(t)) return { save, reward: null };
  const reward = PASS_TIERS[t - 1].reward;
  let next: SaveData = { ...save, passClaimed: [...save.passClaimed, t] };
  let appliedTo: string | undefined;
  if (reward.kind === "money") {
    next = {
      ...next,
      money: next.money + (reward.amount ?? 0),
      moneyEarned: next.moneyEarned + (reward.amount ?? 0),
    };
  } else if (reward.kind === "item" && reward.itemId) {
    next = {
      ...next,
      inventory: {
        ...next.inventory,
        [reward.itemId]: (next.inventory[reward.itemId] ?? 0) + (reward.amount ?? 1),
      },
    };
  } else if (reward.kind === "egg") {
    next = { ...next, eggs: [...next.eggs, randomEgg(rng)] };
  } else if (reward.kind === "aura") {
    const auraKind = reward.aura;
    if (auraKind) {
      const idx = next.team.findIndex((m) => !m.aura);
      if (idx >= 0) {
        next = {
          ...next,
          team: next.team.map((m, i) => (i === idx ? { ...m, aura: auraKind } : m)),
          auraCaught: next.auraCaught + 1,
        };
        appliedTo = next.team[idx].speciesId;
      }
    }
  }
  return { save: next, reward, appliedTo };
}

// ---------------------------------------------------------------------------
// v2.0.0 — Elemental Auras
// ---------------------------------------------------------------------------

/** Ultra-rare aura roll: 1/64 → one of the three aura kinds, else null. */
export function rollAura(rng: Rng): AuraKind | null {
  if (rng() >= AURA_CHANCE) return null;
  const ids = Object.keys(AURAS) as AuraKind[];
  return ids[Math.min(ids.length - 1, Math.floor(rng() * ids.length))];
}

/** Team-wide multipliers granted by an aura (1× when none). */
export function auraBonus(aura: AuraKind | undefined): { dmgMult: number; xpMult: number } {
  if (!aura) return { dmgMult: 1, xpMult: 1 };
  const def = AURAS[aura];
  return def ? { dmgMult: def.dmgMult, xpMult: def.xpMult } : { dmgMult: 1, xpMult: 1 };
}

/** Tags an encounter with an aura variant (display + capture inheritance). */
export function applyAuraTo(encounter: Encounter, aura: AuraKind): Encounter {
  return { ...encounter, aura };
}

// ---------------------------------------------------------------------------
// v2.0.0 — Safari Photo mode (pure helpers; the DOM capture lives in the banner)
// ---------------------------------------------------------------------------

export interface PhotoStampOpts {
  mon: string;
  level: number;
  biome: string;
  phase: string;
  lang: string;
}

/** The caption burned into a Safari photo. */
export function photoStampText(opts: PhotoStampOpts): string {
  return `${opts.mon} Lv.${opts.level} · ${opts.biome} · ${opts.phase} · ${opts.lang.toUpperCase()}`;
}

export const PHOTO_SCALES: { id: string; mult: number; label: string }[] = [
  { id: "1x", mult: 1, label: "1X" },
  { id: "2x", mult: 2, label: "2X" },
  { id: "4x", mult: 4, label: "4X" },
];

/** Validates a scale id and resolves the pixel multiplier + label. */
export function photoScaleFor(scaleId: string): { mult: number; label: string } {
  const found = PHOTO_SCALES.find((s) => s.id === scaleId);
  return found ? { mult: found.mult, label: found.label } : { mult: 1, label: "1X" };
}

/** Adds a photo to the gallery, newest first, capped (dedupes by id). */
export function pushPhoto(photos: PhotoEntry[], entry: PhotoEntry, cap = 12): PhotoEntry[] {
  const rest = photos.filter((p) => p.id !== entry.id);
  return [entry, ...rest].slice(0, Math.max(1, cap));
}

/** Sanitized export filename for a photo entry. */
export function photoFilename(entry: PhotoEntry): string {
  const d = new Date(entry.at);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  const id = entry.id.replace(/[^a-z0-9-]/gi, "");
  return `poke-banner-${stamp}-${id}.png`;
}
'''

marker = "export type { SpeciesDef, EncounterKind };"
n = s.count(marker)
assert n == 1, f"append anchor: found {n}"
s = s.replace(marker, marker + "\n" + block)
open(p, "w").write(s)
print("patch-engine-c OK:", len(s), "chars")
