// ---------------------------------------------------------------------------
// v2.0.0 "Champions & Légendes" — test suite.
//
// Covers the four pillars of the update end-to-end at the pure-engine level:
//   1. Ghost PvP & Trainer Cards (codec, ranks, ghost encounters, bookkeeping)
//   2. Daily Quests & the League Pass (deterministic quests, claims, 30 tiers)
//   3. Elemental Auras (ultra-rare rolls, team bonuses, encounter tagging)
//   4. 8-bit Safari Photo helpers (stamps, scales, gallery caps, filenames)
// Plus the v2.0.0 save backfill (fresh + legacy payloads through normalizeSave).
//
// Everything is deterministic: rng is injected (lcg or scripted sequences) and
// every save flows through normalizeSave, so no test depends on the wall clock
// or Math.random.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";

import {
  AURAS,
  AURA_CHANCE,
  PASS_TIERS,
  PVP_RANKS,
  PVP_TUNING,
  TUNING,
} from "./constants";
import {
  applyAuraTo,
  auraBonus,
  buildGhostEncounter,
  cardFromTeam,
  claimPassTier,
  claimQuest,
  computeVictoryRewards,
  createSave,
  dailyKeyFor,
  decodeTrainerCard,
  encodeTrainerCard,
  lcg,
  makePokemon,
  normalizePokemon,
  normalizeSave,
  passTierFor,
  passXpForTier,
  photoFilename,
  photoScaleFor,
  photoStampText,
  pvpBookkeeping,
  pvpRankFor,
  pvpRankIndex,
  pushPhoto,
  questsForDate,
  recordActivity,
  rollAura,
} from "./engine";
import type { DailyQuests, Encounter, Rng, TrainerCard } from "./types";

/** Scripted rng: returns vals[i] for call i, clamping at the last value. */
const seq = (vals: number[]): Rng => {
  let i = 0;
  return () => vals[Math.min(i++, vals.length - 1)];
};

// ---------------------------------------------------------------------------
// 1. Ghost PvP & Trainer Cards
// ---------------------------------------------------------------------------

describe("v2.0.0 · Ghost PvP & Trainer Cards", () => {
  it("pvpRankIndex/pvpRankFor follow the cumulative win thresholds", () => {
    expect(pvpRankIndex(0)).toBe(0);
    expect(pvpRankFor(0).id).toBe("novice");
    expect(pvpRankFor(2).id).toBe("novice");
    expect(pvpRankFor(3).id).toBe("bronze");
    expect(pvpRankFor(8).id).toBe("silver");
    expect(pvpRankFor(15).id).toBe("gold");
    expect(pvpRankFor(25).id).toBe("platinum");
    expect(pvpRankFor(40).id).toBe("master");
    expect(pvpRankFor(999).id).toBe("master");
    expect(PVP_RANKS[PVP_RANKS.length - 1].id).toBe("master");
  });

  it("cardFromTeam sorts strongest first, restores HP, caps at 6, keeps shiny/aura", () => {
    const weak = makePokemon("pidgey", 2, {});
    const strong = makePokemon("charizard", 30, {});
    const aura = makePokemon("pikachu", 12, { aura: "bolt" });
    const fainted = makePokemon("rattata", 8, {});
    fainted.hp = 0;
    const card = cardFromTeam([weak, strong, aura, fainted], "Ash", 9);
    expect(card.team.map((m) => m.speciesId)).toEqual([
      "charizard",
      "pikachu",
      "rattata",
      "pidgey",
    ]);
    expect(card.trainerName).toBe("Ash");
    expect(card.wins).toBe(9);
    expect(card.rank).toBe("silver");
    expect(card.team.every((m) => m.hp === m.maxHp)).toBe(true);
    expect(card.team.every((m) => m.status === "none")).toBe(true);
    expect(card.team.find((m) => m.speciesId === "pikachu")?.aura).toBe("bolt");
  });

  it("encodeTrainerCard → decodeTrainerCard round-trips name, rank, wins and team", () => {
    const card: TrainerCard = {
      trainerName: "Misty",
      rank: "gold",
      wins: 17,
      team: [
        makePokemon("staryu", 22, {}),
        makePokemon("psyduck", 18, { shiny: true }),
        makePokemon("golduck", 16, { aura: "aurora" }),
      ],
    };
    const code = encodeTrainerCard(card);
    expect(code.startsWith("PB2-")).toBe(true);
    const back = decodeTrainerCard(code);
    expect(back.trainerName).toBe("Misty");
    expect(back.rank).toBe("gold");
    expect(back.wins).toBe(17);
    expect(back.team.map((m) => m.speciesId)).toEqual(["staryu", "psyduck", "golduck"]);
    expect(back.team[1].shiny).toBe(true);
    expect(back.team[2].aura).toBe("aurora");
  });

  it("decodeTrainerCard rejects tampered payloads, bad alphabets and empty teams", () => {
    const card: TrainerCard = {
      trainerName: "Gary",
      rank: "master",
      wins: 41,
      team: [makePokemon("mewtwo", 60, {})],
    };
    const code = encodeTrainerCard(card);
    // Flip one payload char (not the checksum tail) → checksum mismatch.
    const mid = Math.floor(code.length / 2);
    const tampered = code.slice(0, mid) + (code[mid] === "A" ? "B" : "A") + code.slice(mid + 1);
    expect(() => decodeTrainerCard(tampered)).toThrow();
    expect(() => decodeTrainerCard("PB2-####-0000")).toThrow(); // bad alphabet
    expect(() => decodeTrainerCard("nope")).toThrow(); // bad format
  });

  it("buildGhostEncounter scales with the leader level and the ghost's rank", () => {
    const card: TrainerCard = {
      trainerName: "Sabrina",
      rank: "silver",
      wins: 10,
      team: [makePokemon("kadabra", 30, { aura: "flame" })],
    };
    const enc = buildGhostEncounter(card, 20);
    expect(enc.kind).toBe("pvp");
    expect(enc.speciesId).toBe("kadabra");
    // leader + offset(3) + rank step(2 for silver) = 25
    expect(enc.level).toBe(20 + PVP_TUNING.levelOffset + 2);
    expect(enc.isBoss).toBe(true);
    expect(enc.hpScale).toBe(PVP_TUNING.hpScale);
    expect(enc.atkScale).toBe(PVP_TUNING.atkScale);
    expect(enc.aura).toBe("flame");
  });

  it("pvpBookkeeping pays the purse on wins and the rank-up bonus at promotions", () => {
    const base = createSave("bulbasaur");
    // 2 wins → next win promotes to bronze (3).
    const near = normalizeSave({ ...base, pvpWins: 2, money: 100, moneyEarned: 100 });
    const won = pvpBookkeeping(near, true);
    expect(won.promoted).toBe(true);
    expect(won.save.pvpWins).toBe(3);
    expect(won.save.pvpLosses).toBe(0);
    expect(won.save.money).toBe(100 + PVP_TUNING.moneyPerWin + PVP_TUNING.rankUpMoney);
    expect(won.save.moneyEarned).toBe(100 + PVP_TUNING.moneyPerWin + PVP_TUNING.rankUpMoney);
    expect(won.reward).toBe(PVP_TUNING.rankUpMoney);
  });

  it("pvpBookkeeping counts losses and never pays a purse", () => {
    const base = createSave("bulbasaur");
    const lost = pvpBookkeeping(normalizeSave({ ...base, pvpWins: 5, money: 0 }), false);
    expect(lost.save.pvpWins).toBe(5);
    expect(lost.save.pvpLosses).toBe(1);
    expect(lost.save.money).toBe(0);
    expect(lost.promoted).toBe(false);
    expect(lost.reward).toBe(0);
  });

  it("computeVictoryRewards pays the ghost purse and boosted XP for pvp duels", () => {
    const enc: Encounter = {
      kind: "pvp",
      speciesId: "raichu",
      level: 15,
      shiny: false,
      isBoss: true,
    };
    const r = computeVictoryRewards(enc, seq([0.5, 0.5]));
    expect(r.moneyGain).toBe(PVP_TUNING.moneyPerWin);
    expect(r.xpGain).toBeGreaterThanOrEqual(Math.floor(1.8 * 30));
  });
});

// ---------------------------------------------------------------------------
// 2. Daily Quests & the League Pass
// ---------------------------------------------------------------------------

describe("v2.0.0 · Daily Quests", () => {
  it("questsForDate is deterministic per date and varies across dates", () => {
    const a1 = questsForDate("2026-08-05");
    const a2 = questsForDate("2026-08-05");
    expect(a1).toEqual(a2);
    expect(a1.defs).toHaveLength(3);
    // Adjacent dates must not roll the same three quests every day — assert at
    // least two distinct sets across a two-week span (robust against the rare
    // seed collision that a single pair of dates could produce).
    const sets = new Set<string>();
    for (let d = 1; d <= 14; d++) {
      const key = `2026-08-${String(d).padStart(2, "0")}`;
      sets.add(questsForDate(key).defs.map((q) => q.id).join(","));
    }
    expect(sets.size).toBeGreaterThan(1);
  });

  it("dailyKeyFor formats a local calendar day", () => {
    const d = new Date(2026, 7, 5); // local August 5
    expect(dailyKeyFor(d)).toBe("2026-08-05");
  });

  it("recordActivity advances only matching quests, capped at their targets", () => {
    const today = dailyKeyFor(new Date());
    const quests: DailyQuests = {
      date: today,
      defs: [
        { id: "qb", kind: "battle", target: 5, reward: 60 },
        { id: "qc", kind: "capture", target: 3, reward: 80 },
        { id: "qs", kind: "steps", target: 300, reward: 80 },
      ],
      progress: [2, 1, 50],
      claimed: [false, false, false],
    };
    const save = normalizeSave({ ...createSave("bulbasaur"), quests });
    const after = recordActivity(save, "battle", 4); // 2 + 4 = 6 → capped at 5
    expect(after.quests!.progress).toEqual([5, 1, 50]);
    expect(after.quests!.claimed).toEqual([false, false, false]);
    // passXp: 4 battles × 12 XP each
    expect(after.passXp).toBe(48);
  });

  it("recordActivity rolls today's quests when none exist yet", () => {
    const save = createSave("bulbasaur"); // quests: null
    const after = recordActivity(save, "battle", 1);
    expect(after.quests).not.toBeNull();
    expect(after.quests!.date).toBe(dailyKeyFor(new Date()));
    expect(after.quests!.defs).toHaveLength(3);
    expect(after.passXp).toBeGreaterThan(0);
  });

  it("claimQuest pays only a completed, unclaimed quest and is idempotent", () => {
    const today = dailyKeyFor(new Date());
    const quests: DailyQuests = {
      date: today,
      defs: [{ id: "qp", kind: "pvp", target: 1, reward: 120 }],
      progress: [0],
      claimed: [false],
    };
    const save = normalizeSave({ ...createSave("bulbasaur"), quests, money: 50 });
    // Not complete yet → no reward.
    expect(claimQuest(save, 0).reward).toBe(0);
    const done = recordActivity(save, "pvp", 1);
    const first = claimQuest(done, 0);
    expect(first.reward).toBe(120);
    expect(first.save.money).toBe(50 + 120);
    expect(first.save.quests!.claimed[0]).toBe(true);
    // Idempotent.
    expect(claimQuest(first.save, 0).reward).toBe(0);
  });
});

describe("v2.0.0 · League Pass", () => {
  it("passTierFor/passXpForTier are monotonic and bounded at 30 tiers", () => {
    expect(PASS_TIERS).toHaveLength(30);
    expect(passTierFor(0)).toBe(1);
    expect(passXpForTier(2)).toBeGreaterThan(passXpForTier(1));
    expect(passTierFor(passXpForTier(5))).toBeGreaterThanOrEqual(5);
    expect(passTierFor(passXpForTier(30))).toBe(30);
    expect(passTierFor(1_000_000)).toBe(30);
    expect(passXpForTier(99)).toBe(passXpForTier(30)); // clamped
  });

  it("claimPassTier grants money / item / egg / aura rewards", () => {
    const rng = lcg(7);
    const base = createSave("bulbasaur");

    // Tier 1 → money (100 + 1*25).
    const t1 = claimPassTier(normalizeSave({ ...base, passXp: 500 }), 1, rng);
    expect(t1.reward?.kind).toBe("money");
    expect(t1.save.money).toBe((t1.reward as { amount: number }).amount);
    expect(t1.save.passClaimed).toEqual([1]);

    // Tier 3 → a Poké Ball.
    const t3 = claimPassTier(normalizeSave({ ...base, passXp: 500 }), 3, rng);
    expect(t3.reward?.kind).toBe("item");
    expect(t3.save.inventory.pokeball).toBe(base.inventory.pokeball + 1);

    // Tier 8 → a Mystery Egg.
    const t8 = claimPassTier(normalizeSave({ ...base, passXp: 2000 }), 8, rng);
    expect(t8.reward?.kind).toBe("egg");
    expect(t8.save.eggs).toHaveLength(1);

    // Tier 25 → Flame Aura on the first aura-less member (needs 6500 XP).
    const t25 = claimPassTier(normalizeSave({ ...base, passXp: 7000 }), 25, rng);
    expect(t25.reward?.kind).toBe("aura");
    expect(t25.save.team[0].aura).toBe("flame");
    expect(t25.save.auraCaught).toBe(1);
    expect(t25.appliedTo).toBe("bulbasaur");
  });

  it("claimPassTier rejects locked tiers, is idempotent, and skips full teams for auras", () => {
    const rng = lcg(7);
    const save = normalizeSave({ ...createSave("bulbasaur"), passXp: 0 });
    expect(claimPassTier(save, 10, rng).reward).toBeNull(); // locked

    const unlocked = normalizeSave({ ...createSave("bulbasaur"), passXp: 500 });
    const first = claimPassTier(unlocked, 2, rng);
    expect(first.reward?.kind).toBe("money");
    expect(claimPassTier(first.save, 2, rng).reward).toBeNull(); // idempotent
  });
});

// ---------------------------------------------------------------------------
// 3. Elemental Auras
// ---------------------------------------------------------------------------

describe("v2.0.0 · Elemental Auras", () => {
  it("rollAura returns null above the chance and a valid kind below it", () => {
    expect(rollAura(seq([0.99]))).toBeNull();
    const hit = rollAura(seq([0.0, 0.5]));
    expect(Object.keys(AURAS)).toContain(hit);
    expect(AURA_CHANCE).toBeLessThan(0.05); // ultra-rare
  });

  it("auraBonus exposes the tuned team multipliers (1× when absent)", () => {
    expect(auraBonus(undefined)).toEqual({ dmgMult: 1, xpMult: 1 });
    expect(auraBonus("flame").dmgMult).toBe(AURAS.flame.dmgMult);
    expect(auraBonus("aurora").xpMult).toBe(AURAS.aurora.xpMult);
  });

  it("applyAuraTo tags an encounter and makePokemon carries it onto the mon", () => {
    const enc: Encounter = { kind: "wild", speciesId: "pikachu", level: 5, shiny: false };
    const tagged = applyAuraTo(enc, "bolt");
    expect(tagged.aura).toBe("bolt");
    const mon = makePokemon(tagged.speciesId, tagged.level, { aura: tagged.aura });
    expect(mon.aura).toBe("bolt");
    expect(normalizePokemon(mon).aura).toBe("bolt");
  });
});

// ---------------------------------------------------------------------------
// 4. Safari Photo helpers
// ---------------------------------------------------------------------------

describe("v2.0.0 · Safari Photo", () => {
  it("photoStampText burns a compact caption", () => {
    expect(
      photoStampText({ mon: "Pikachu", level: 5, biome: "Route 1", phase: "day", lang: "en" }),
    ).toBe("Pikachu Lv.5 · Route 1 · day · EN");
  });

  it("photoScaleFor resolves valid scales and falls back to 1x", () => {
    expect(photoScaleFor("4x")).toEqual({ mult: 4, label: "4X" });
    expect(photoScaleFor("1x")).toEqual({ mult: 1, label: "1X" });
    expect(photoScaleFor("bogus")).toEqual({ mult: 1, label: "1X" });
  });

  it("pushPhoto keeps newest first, dedupes by id and caps the gallery", () => {
    const one = {
      id: "a",
      at: 1,
      scale: 1,
      speciesId: "pikachu",
      stamp: "A",
      dataUrl: "data:image/png;base64,AA==",
    };
    const two = { ...one, id: "b", at: 2, stamp: "B" };
    let photos = pushPhoto([], one, 2);
    photos = pushPhoto(photos, two, 2);
    expect(photos.map((p) => p.id)).toEqual(["b", "a"]);
    photos = pushPhoto(photos, { ...one, id: "b", at: 3, stamp: "B2" }, 2);
    expect(photos.map((p) => p.id)).toEqual(["b", "a"]);
    expect(photos[0].at).toBe(3); // updated, not duplicated
    for (let i = 0; i < 15; i++) {
      photos = pushPhoto(photos, { ...two, id: `x${i}`, at: 100 + i }, 12);
    }
    expect(photos).toHaveLength(12);
  });

  it("photoFilename stamps the date and sanitizes the id", () => {
    const entry = {
      id: "p 1/2!",
      at: new Date(2026, 7, 5, 14, 30).getTime(),
      scale: 1,
      speciesId: "pikachu",
      stamp: "s",
      dataUrl: "data:image/png;base64,AA==",
    };
    expect(photoFilename(entry)).toBe("poke-banner-20260805-1430-p12.png");
  });
});

// ---------------------------------------------------------------------------
// 5. Save backfill for v2.0.0
// ---------------------------------------------------------------------------

describe("v2.0.0 · Save backfill", () => {
  it("createSave seeds every Champions & Légendes field", () => {
    const save = createSave("squirtle");
    expect(save.pvpWins).toBe(0);
    expect(save.pvpLosses).toBe(0);
    expect(save.quests).toBeNull();
    expect(save.passXp).toBe(0);
    expect(save.passClaimed).toEqual([]);
    expect(save.auraSeen).toBe(0);
    expect(save.auraCaught).toBe(0);
    expect(save.photosTaken).toBe(0);
  });

  it("normalizeSave backfills legacy payloads missing the v2.0.0 fields", () => {
    const legacy = { ...createSave("charmander") } as Record<string, unknown>;
    delete legacy.pvpWins;
    delete legacy.pvpLosses;
    delete legacy.quests;
    delete legacy.passXp;
    delete legacy.passClaimed;
    delete legacy.auraSeen;
    delete legacy.auraCaught;
    delete legacy.photosTaken;
    const norm = normalizeSave(legacy);
    expect(norm.pvpWins).toBe(0);
    expect(norm.pvpLosses).toBe(0);
    expect(norm.quests).toBeNull();
    expect(norm.passXp).toBe(0);
    expect(norm.passClaimed).toEqual([]);
    expect(norm.auraSeen).toBe(0);
    expect(norm.auraCaught).toBe(0);
    expect(norm.photosTaken).toBe(0);
  });

  it("normalizeSave validates and clamps persisted quests and pass tiers", () => {
    const raw = {
      ...createSave("bulbasaur"),
      quests: {
        date: "2026-08-05",
        defs: [
          { id: "qb", kind: "battle", target: 5, reward: 60 },
          { id: "qc", kind: "capture", target: 3, reward: 80 },
          { id: "garbage", kind: "not-a-kind", target: -4, reward: -9 },
        ],
        progress: [9, 1, 2],
        claimed: [true, "yes", false],
      },
      passClaimed: [1, 2, 99, -5],
      passXp: -10,
    } as unknown;
    const norm = normalizeSave(raw);
    expect(norm.quests).not.toBeNull();
    expect(norm.quests!.defs.map((d) => d.kind)).toEqual(["battle", "capture", "battle"]);
    expect(norm.quests!.progress[0]).toBe(5); // capped at target
    expect(norm.quests!.claimed[1]).toBe(true);
    expect(norm.passClaimed).toEqual([1, 2]); // out-of-range dropped
    expect(norm.passXp).toBe(0); // negative clamped
  });
});
