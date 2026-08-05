// ---------------------------------------------------------------------------
// panels-v2.tsx — the v2.0.0 "Champions & Légendes" panel tabs: Ghost PvP &
// Trainer Cards, Daily Quests & the League Pass, and the 8-bit Safari photo
// gallery. Kept in its own module so the giant panels/panels-tabs files don't
// grow further; panels-tabs re-exports these for GamePanels.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { AURAS, PASS_TIERS, PVP_RANKS, getSpecies } from "./constants";
import {
  PHOTO_SCALES,
  cardFromTeam,
  dailyKeyFor,
  encodeTrainerCard,
  passTierFor,
  passXpForTier,
  photoScaleFor,
  pvpRankFor,
  questsForDate,
} from "./engine";
import { localizedAuraName, localizedItemName, t } from "./i18n";
import { placeholderSprite, urlSpriteCombat } from "./presentation";
import type { GamePanelsProps } from "./panels";
import type { Language, PassReward } from "./types";

/** Short human label for a League Pass reward (money / item / egg / aura). */
export function passRewardLabel(reward: PassReward, lang: Language): string {
  if (reward.kind === "money") return `₽${(reward.amount ?? 0).toLocaleString()}`;
  if (reward.kind === "item" && reward.itemId) {
    return `${reward.amount ?? 1}× ${localizedItemName(reward.itemId, lang)}`;
  }
  if (reward.kind === "egg") return `🥚 ${localizedItemName("egg", lang)}`;
  if (reward.kind === "aura" && reward.aura) {
    return `✨ ${localizedAuraName(reward.aura, lang)} ${t(lang, "aura")}`;
  }
  return "?";
}

/** Literal UI key per quest kind — the i18n integrity scan only detects
 *  direct key-string calls, so the quest labels must not be dynamic. */
function questLabel(lang: Language, kind: string, n: number): string {
  switch (kind) {
    case "battle":
      return t(lang, "quest-battle", { n });
    case "capture":
      return t(lang, "quest-capture", { n });
    case "steps":
      return t(lang, "quest-steps", { n });
    case "rocket":
      return t(lang, "quest-rocket", { n });
    case "trainer":
      return t(lang, "quest-trainer", { n });
    case "pvp":
      return t(lang, "quest-pvp", { n });
    case "heal":
      return t(lang, "quest-heal", { n });
    default:
      return t(lang, "quest-battle", { n });
  }
}

/** A small species sprite with an Elemental Aura dot when the mon carries one. */
function MonSprite({ speciesId, aura }: { speciesId: string; aura?: string }) {
  const auraColor = aura && AURAS[aura as keyof typeof AURAS] ? AURAS[aura as keyof typeof AURAS].color : null;
  return (
    <div className="relative">
      <img
        src={urlSpriteCombat(speciesId)}
        alt={getSpecies(speciesId).name}
        className="h-7 w-7 pixelated"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = placeholderSprite(speciesId);
        }}
      />
      {auraColor && (
        <span
          className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 border border-ink"
          style={{ background: auraColor }}
          title={`${localizedAuraName(aura as string, "en")} Aura`}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ghost PvP & Trainer Cards (v2.0.0)
// ---------------------------------------------------------------------------

export function PvpTab(props: GamePanelsProps) {
  const lang = props.save.language;
  const save = props.save;
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const rank = pvpRankFor(save.pvpWins);
  const ghost = props.ghostCard;
  // Your card is built from the live team (strongest first) + lifetime wins.
  const myCard = cardFromTeam(save.team, "Champion", save.pvpWins);
  const myCode = encodeTrainerCard(myCard);

  const copyCard = () => {
    try {
      void navigator.clipboard?.writeText(myCode);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="space-y-2 text-[7px]">
      {/* Rank ladder */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="font-bold uppercase">{t(lang, "pvp-title")}</div>
        <div className="mt-1 flex items-center gap-2">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink text-[9px] font-bold"
            style={{ background: rank.color }}
          >
            {rank.id.charAt(0).toUpperCase()}
          </span>
          <div>
            <div className="font-bold">{t(lang, "pvp-rank", { rank: rank.id.toUpperCase() })}</div>
            <div className="text-ink/70">
              {t(lang, "pvp-wins", { n: save.pvpWins })} · {t(lang, "pvp-losses", { n: save.pvpLosses })}
            </div>
          </div>
        </div>
        <div className="mt-1 flex gap-1">
          {PVP_RANKS.map((r) => {
            const held = r.id === rank.id;
            const reached = save.pvpWins >= r.minWins;
            return (
              <div
                key={r.id}
                title={`${r.id.toUpperCase()} · ${r.minWins} ${t(lang, "pvp-wins", { n: r.minWins })}`}
                className="flex flex-col items-center"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border-2 border-ink text-[7px] font-bold ${
                    reached ? "" : "opacity-30 grayscale"
                  }`}
                  style={{ background: r.color }}
                >
                  {r.id.charAt(0).toUpperCase()}
                </span>
                <span className={`mt-0.5 ${held ? "font-bold" : "text-ink/40"}`}>{r.id.slice(0, 1)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Import a friend's card */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="font-bold uppercase">{t(lang, "pvp-import")}</div>
        <div className="mt-1 flex gap-1">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t(lang, "pvp-import-hint")}
            spellCheck={false}
            className="min-w-0 flex-1 border-2 border-ink bg-gray-50 px-1 py-0.5 outline-none focus:bg-yellow-50"
          />
          <button
            onClick={() => {
              if (code.trim() && props.onImportCard(code.trim())) setCode("");
            }}
            className="nb-btn bg-blue-300"
          >
            {t(lang, "pvp-import")}
          </button>
        </div>
        {!ghost && <div className="mt-1 text-ink/60">{t(lang, "pvp-empty")}</div>}
        {ghost && (
          <div className="mt-1 border-2 border-ink bg-yellow-50 p-1">
            <div className="font-bold uppercase">
              {ghost.trainerName} · {ghost.rank.toUpperCase()} · {t(lang, "pvp-wins", { n: ghost.wins })}
            </div>
            <div className="mt-1 flex gap-1">
              {ghost.team.map((m, i) => (
                <MonSprite key={`${m.speciesId}-${i}`} speciesId={m.speciesId} aura={m.aura} />
              ))}
            </div>
            <button onClick={props.onChallengeGhost} className="nb-btn mt-1 bg-red-300">
              ⚔ {t(lang, "pvp-challenge")}
            </button>
          </div>
        )}
      </div>

      {/* Your shareable card */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="font-bold uppercase">
            {t(lang, "pvp-trainer-card")} — {myCard.trainerName}
          </span>
          <button onClick={copyCard} className="nb-btn bg-green-300">
            {copied ? "✓" : t(lang, "pvp-copy")}
          </button>
        </div>
        <div className="mt-1 flex gap-1">
          {myCard.team.map((m, i) => (
            <MonSprite key={`${m.speciesId}-${i}`} speciesId={m.speciesId} aura={m.aura} />
          ))}
          {myCard.team.length === 0 && <span className="text-ink/60">{t(lang, "pvp-empty")}</span>}
        </div>
        <div className="mt-1 break-all border-2 border-dashed border-ink bg-gray-50 p-1 text-ink/70">
          {myCode}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Daily Quests & the League Pass (v2.0.0)
// ---------------------------------------------------------------------------

export function QuestsTab(props: GamePanelsProps) {
  const lang = props.save.language;
  const save = props.save;
  const today = dailyKeyFor(new Date());
  // Persisted quests for today, or the deterministic preview if none yet.
  const quests =
    save.quests && save.quests.date === today && save.quests.defs.length > 0
      ? save.quests
      : questsForDate(today);
  const tier = passTierFor(save.passXp);
  const complete = tier >= PASS_TIERS.length;
  const nextTier = Math.min(PASS_TIERS.length, tier + 1);
  const curXp = passXpForTier(tier);
  const nextXp = passXpForTier(nextTier);
  const pct = complete
    ? 100
    : Math.max(0, Math.min(100, Math.round(((save.passXp - curXp) / Math.max(1, nextXp - curXp)) * 100)));

  return (
    <div className="space-y-2 text-[7px]">
      {/* The three daily quests */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">📋 {t(lang, "quests")}</div>
        <div className="space-y-1">
          {quests.defs.map((def, i) => {
            const prog = Math.min(def.target, quests.progress[i] ?? 0);
            const done = prog >= def.target;
            const claimed = quests.claimed[i];
            return (
              <div key={def.id} className="border-2 border-ink bg-gray-50 p-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold">{questLabel(lang, def.kind, def.target)}</span>
                  <button
                    onClick={() => props.onClaimQuest(i)}
                    disabled={!done || claimed}
                    className={`nb-btn ${claimed ? "bg-gray-200" : done ? "bg-green-300" : "bg-gray-100"}`}
                  >
                    {claimed ? "✓" : done ? t(lang, "quest-claim") : "···"}
                  </button>
                </div>
                <div className="mt-1 h-2 border-2 border-ink bg-white">
                  <div
                    className={`h-full ${done ? "bg-green-400" : "bg-yellow-300"}`}
                    style={{ width: `${Math.round((prog / def.target) * 100)}%` }}
                  />
                </div>
                <div className="mt-0.5 text-ink/60">
                  {prog}/{def.target} · +{def.reward} ₽
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* League Pass */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 flex items-center justify-between gap-1">
          <span className="font-bold uppercase">🎟 {t(lang, "pass")}</span>
          <span className="text-ink/70">{t(lang, "pass-progress", { tier, n: save.passXp })}</span>
        </div>
        <div className="flex flex-wrap gap-0.5">
          {PASS_TIERS.map((pt) => {
            const unlocked = pt.tier <= tier;
            const claimed = save.passClaimed.includes(pt.tier);
            const claimable = unlocked && !claimed && pt.tier > 1;
            const title = t(lang, "pass-reward", {
              tier: pt.tier,
              reward: passRewardLabel(pt.reward, lang),
            });
            if (claimable) {
              return (
                <button
                  key={pt.tier}
                  onClick={() => props.onClaimPassTier(pt.tier)}
                  title={`${title} — ${t(lang, "quest-claim")}`}
                  className="flex h-4 w-4 items-center justify-center border-2 border-ink bg-yellow-300 text-[6px] font-bold hover:bg-yellow-400"
                >
                  {pt.tier}
                </button>
              );
            }
            return (
              <div
                key={pt.tier}
                title={title}
                className={`flex h-4 w-4 items-center justify-center border-2 border-ink text-[6px] font-bold ${
                  claimed ? "bg-green-300" : unlocked ? "bg-yellow-200" : "bg-gray-100 text-ink/40"
                }`}
              >
                {claimed ? "✓" : pt.tier}
              </div>
            );
          })}
        </div>
        <div className="mt-1 text-ink/70">
          {complete
            ? t(lang, "pass-full")
            : `${save.passXp} / ${nextXp} XP → ${t(lang, "pass-progress", { tier: nextTier, n: nextXp })}`}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8-bit Safari Photo (v2.0.0)
// ---------------------------------------------------------------------------

export function PhotoTab(props: GamePanelsProps) {
  const lang = props.save.language;
  const scale = photoScaleFor(props.photoScale);
  const photos = props.photos;
  return (
    <div className="space-y-2 text-[7px]">
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="font-bold uppercase">📸 {t(lang, "photo")}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="text-ink/70">{t(lang, "photo-scale")}</span>
          {PHOTO_SCALES.map((s) => (
            <button
              key={s.id}
              onClick={() => props.onSetPhotoScale(s.id)}
              className={`nb-btn ${props.photoScale === s.id ? "bg-yellow-300" : "bg-gray-100"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button onClick={props.onCapturePhoto} className="nb-btn mt-1 bg-red-300">
          {t(lang, "photo-capture")} ({scale.label})
        </button>
        <div className="mt-1 text-ink/60">{t(lang, "photo-saved")}</div>
      </div>

      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">
          {t(lang, "photo-gallery")} — {photos.length}/12
        </div>
        {photos.length === 0 && <div className="text-ink/60">{t(lang, "photo-empty")}</div>}
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {photos.map((p) => (
            <div key={p.id} className="border-2 border-ink bg-gray-50 p-1">
              <img src={p.dataUrl} alt={p.stamp} className="w-full pixelated" />
              <div className="mt-0.5 truncate text-ink/70" title={p.stamp}>
                {p.stamp}
              </div>
              <div className="mt-0.5 flex gap-1">
                <button onClick={() => props.onExportPhoto(p.id)} className="nb-btn flex-1 bg-green-300">
                  ⬇ {t(lang, "photo-export")}
                </button>
                <button onClick={() => props.onDeletePhoto(p.id)} className="nb-btn bg-red-300">
                  {t(lang, "photo-delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
