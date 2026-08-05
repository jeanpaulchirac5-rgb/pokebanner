// ---------------------------------------------------------------------------
// panels-tabs.tsx — the tail tabs extracted from panels.tsx (which grew to
// 1,846 lines and outgrew the editor's per-file index budget). Codex, Shop,
// Arena and Save render here; GamePanels imports them.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { BIOMES, CHAMPIONS, GAME_VERSION, ITEMS, LEAGUE, TUNING, getSpecies } from "./constants";
import {
  badgeDamageBonus,
  happinessDamageBonus,
  happinessOf,
  happinessTier,
  happinessXpBonus,
  type HappinessTier,
} from "./engine";
import {
  LANG_LABELS,
  LANGS,
  localizedLeagueName,
  localizedName,
  t,
} from "./i18n";
import { placeholderSprite, urlSpriteCombat } from "./presentation";
import { compareVersions, fetchReleaseNotes } from "../lib/release";
import type { ReleaseNote } from "../lib/release";
import type { GamePanelsProps } from "./panels";
import type { SaveData } from "./types";

// ---------------------------------------------------------------------------
// Codex — shortcuts, game guide, and the hidden easter egg hint
// ---------------------------------------------------------------------------

export function CodexTab(props: GamePanelsProps) {
  const lang = props.save.language;
  const SHORTCUTS: [string, string][] = [
    ["M", t(lang, "shortcut-mute")],
    ["N", t(lang, "shortcut-bgm")],
    ["B", t(lang, "shortcut-bag")],
    ["C", t(lang, "shortcut-center")],
    ["K", t(lang, "shortcut-market")],
    ["ESC", t(lang, "shortcut-close")],
  ];
  return (
    <div className="space-y-2 text-[7px]">
      <div className="border-2 border-ink bg-blue-100 p-1.5">
        <div className="font-bold uppercase">⌨ {t(lang, "shortcuts")}</div>
        <div className="mt-1 grid grid-cols-1 gap-0.5 sm:grid-cols-2">
          {SHORTCUTS.map(([k, d]) => (
            <div key={k} className="flex items-center gap-1">
              <span className="border-2 border-ink bg-white px-1 font-bold">{k}</span>
              <span className="text-ink/80">{d}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">{t(lang, "players-guide")}</div>
        <ul className="list-none space-y-0.5 text-ink/80">
          <li>• Wild Pokémon appear at a random 5–20s rhythm — win for XP & ₽.</li>
          <li>• Capture low-HP foes with Poké Balls; Great Balls catch better.</li>
          <li>• 6 badges from the Arena add +5% team damage each.</li>
          <li>• Biomes rotate every 500 steps; night-only species appear after dark.</li>
          <li>• Team Rocket (rare) drops big money or a Great Ball.</li>
          <li>• The Pokémon Center heals your team for free.</li>
        </ul>
      </div>

      <div className="border-2 border-ink bg-yellow-100 p-1.5">
        <div className="font-bold uppercase">🥚 {t(lang, "secret-waits")}</div>
        <p className="mt-1 text-ink/80">{t(lang, "secret-waits-desc")}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NewsTab — in-game changelog fed by the GitHub release notes (the same
// source the auto-updater uses), so the banner's NEWS panel always shows the
// latest published version and what's in it.
// ---------------------------------------------------------------------------

function markdownLite(body: string): string {
  // GitHub-flavored markdown → plain pixel text: strip headings, bullets,
  // emphasis and code fences so the changelog renders in the tiny UI.
  return body
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/^#{1,4}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "• ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}

export function NewsTab(props: GamePanelsProps) {
  const lang = props.save.language;
  const [state, setState] = useState<"loading" | "error" | "done">("loading");
  const [notes, setNotes] = useState<ReleaseNote[]>([]);

  const load = () => {
    setState("loading");
    fetchReleaseNotes(5)
      .then((rows) => {
        setNotes(rows);
        setState("done");
      })
      .catch(() => setState("error"));
  };

  useEffect(load, []);

  // Installed vs latest diff: drives the version banner. notes[0] is the
  // newest GitHub release (API returns them newest-first).
  const latestTag = notes[0]?.tag ?? null;
  const cmp = latestTag ? compareVersions(GAME_VERSION, latestTag) : 0;

  return (
    <div className="space-y-2 text-[7px]">
      <div className="border-2 border-ink bg-blue-100 p-1.5">
        <div className="font-bold uppercase">📰 {t(lang, "news")}</div>
        <div className="text-ink/70">
          POKEBANNER v{GAME_VERSION} — what's new in each release (from GitHub).
        </div>
      </div>

      {/* Installed vs latest version banner + differential-update note.
          Only when the feed loaded; the note explains the two update paths
          (NSIS differential auto-update vs portable manual download). */}
      {state === "done" && latestTag && (
        <div
          className={`border-2 border-ink p-1.5 ${
            cmp < 0
              ? "bg-yellow-100"
              : cmp === 0
                ? "bg-green-100"
                : "bg-blue-100"
          }`}
        >
          <div className="flex items-center gap-1">
            <span className="font-bold uppercase">
              {t(lang, "news-installed")}: v{GAME_VERSION}
            </span>
            <span className="text-ink/60">→</span>
            <span className="font-bold uppercase">
              {t(lang, "news-latest")}: {latestTag}
            </span>
            <span className="ml-auto font-bold">
              {cmp < 0
                ? `⬇ ${t(lang, "news-update-avail")}`
                : cmp === 0
                  ? t(lang, "news-up-to-date")
                  : `✨ ${t(lang, "news-ahead")}`}
            </span>
          </div>
          <div className="mt-1 text-ink/70">{t(lang, "news-diff-note")}</div>
        </div>
      )}

      {state === "loading" && (
        <div className="border-2 border-ink bg-white p-1.5 text-ink/70">
          {t(lang, "news-loading")}
        </div>
      )}

      {state === "error" && (
        <div className="border-2 border-ink bg-red-50 p-1.5">
          <div className="text-ink/80">{t(lang, "news-error")}</div>
          <button className="nb-btn mt-1 bg-yellow-300" onClick={load}>
            {t(lang, "news-retry")}
          </button>
        </div>
      )}

      {state === "done" && notes.length === 0 && (
        <div className="border-2 border-ink bg-white p-1.5 text-ink/70">
          {t(lang, "news-empty")}
        </div>
      )}

      {state === "done" &&
        notes.map((n) => (
          <div key={n.tag} className="border-2 border-ink bg-white p-1.5">
            <div className="flex items-baseline gap-1">
              <span className="font-bold uppercase">⬇ {n.tag}</span>
              {n.publishedAt && (
                <span className="text-ink/50">
                  {new Date(n.publishedAt).toLocaleDateString()}
                </span>
              )}
              {n.htmlUrl && (
                <a
                  href={n.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-ink/60 underline hover:text-ink"
                >
                  ↗
                </a>
              )}
            </div>
            {n.name && <div className="font-bold">{n.name}</div>}
            {n.body && (
              <div className="mt-0.5 whitespace-pre-wrap text-ink/80">
                {markdownLite(n.body)}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ShopTab(props: GamePanelsProps) {
  const { save } = props;
  return (
    <div className="space-y-2 text-[7px]">
      <div className="border-2 border-ink bg-yellow-100 p-1.5 font-bold uppercase">
        🧙 Traveling Merchant — every 10 victories
      </div>
      <div className="grid grid-cols-2 gap-1">
        {["pokeball", "greatball", "berry", "sitrus", "potion", "hyperpotion"].map(
          (id) => {
            const item = ITEMS[id];
            const owned = save.inventory[id] ?? 0;
            return (
              <div key={id} className="flex items-center gap-1 border-2 border-ink bg-white p-1">
                <div className="flex-1">
                  <div className="font-bold uppercase">{item.name}</div>
                  <div className="text-ink/70">{item.desc}</div>
                  <div className="text-ink/60">Owned: {owned}</div>
                </div>
                <button
                  className="nb-btn bg-green-200"
                  onClick={() => props.onBuy(id)}
                  disabled={save.money < item.price}
                >
                  ₽{item.price}
                </button>
              </div>
            );
          },
        )}
      </div>
      <div className="text-ink/70">
        Wallet: ₽{save.money}. Defeat 10 opponents to summon the merchant again.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ArenaTab(props: GamePanelsProps) {
  const { save } = props;
  const lang = save.language;
  const nextChamp = CHAMPIONS[save.championWins % CHAMPIONS.length];
  const bossLevel = (save.team[0]?.level ?? 5) + 3;
  // v1.9.0: Indigo League — unlocked with all 8 badges. leagueIndex rotates
  // through the five members (Elite Four → Champion); a cleared League
  // rematches from Lorelei at higher levels.
  const leagueUnlocked = save.badges.length >= CHAMPIONS.length;
  const leagueIdx = save.leagueIndex % LEAGUE.length;
  const nextMember = LEAGUE[leagueIdx];
  const leagueLevel = (save.team[0]?.level ?? 5) + 4 + leagueIdx;
  return (
    <div className="space-y-2 text-[7px]">
      <div className="border-2 border-ink bg-red-100 p-1.5">
        <div className="font-bold uppercase">⚔ Arena — badge +5% team damage</div>
        <div className="mt-1 text-ink/80">
          Badges: {save.badges.length > 0 ? save.badges.join(" · ") : "none"}
        </div>
      </div>
      <div className="flex items-center gap-2 border-2 border-ink bg-white p-1.5">
        <img
          src={urlSpriteCombat(nextChamp.speciesId)}
          alt=""
          className="h-10 w-10 pixelated"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = placeholderSprite(
              nextChamp.speciesId,
            );
          }}
        />
        <div className="flex-1">
          <div className="font-bold uppercase">
            {nextChamp.name} — {nextChamp.title}
          </div>
          <div>
            {getSpecies(nextChamp.speciesId).name} Lv.{bossLevel} (boss: ×1.8 HP,
            ×1.4 ATK)
          </div>
          <div className="text-ink/70">
            Reward: {TUNING.moneyPerChampion}₽ + {nextChamp.badge} + 2.5× XP
          </div>
        </div>
        <button className="nb-btn bg-red-300" onClick={props.onChallengeChampion}>
          CHALLENGE
        </button>
      </div>
      <div className="text-ink/70">
        The leader gains a level every multiple of 5 → the Arena Champion appears.
      </div>

      {/* v1.9.0: Indigo League — the Elite Four + Champion gauntlet */}
      <div className="border-2 border-ink bg-indigo-100 p-1.5">
        <div className="font-bold uppercase">
          🏆 {t(lang, "league-title")} — {save.leagueWins} {t(lang, "league-wins")}
          {save.leagueChampion ? " · " + t(lang, "league-title-earned") : ""}
        </div>
        <div className="mt-1 text-ink/70">{t(lang, "league-tag")}</div>
        {!leagueUnlocked && (
          <div className="mt-1 border-2 border-ink bg-gray-100 p-1 text-ink/70">
            🔒 {t(lang, "league-locked")}
          </div>
        )}
        {leagueUnlocked && (
          <div className="mt-1 flex items-center gap-2 border-2 border-ink bg-white p-1.5">
            <img
              src={urlSpriteCombat(nextMember.speciesId)}
              alt=""
              className="h-10 w-10 pixelated"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = placeholderSprite(
                  nextMember.speciesId,
                );
              }}
            />
            <div className="flex-1">
              <div className="font-bold uppercase">
                {localizedLeagueName(nextMember.id, lang)} — {nextMember.title}
              </div>
              <div className="text-ink/80">
                {getSpecies(nextMember.speciesId).name} Lv.{leagueLevel} (boss: ×2.0 HP, ×1.6 ATK)
              </div>
              <div className="text-ink/70">
                {t(lang, "league-reward", { money: TUNING.moneyPerElite })}
              </div>
            </div>
            <button
              className="nb-btn bg-indigo-300"
              onClick={props.onChallengeLeague}
            >
              {save.leagueChampion ? t(lang, "league-rematch") : "CHALLENGE"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function SaveTab(props: GamePanelsProps) {
  const { save } = props;
  const lang = save.language;
  const [exported, setExported] = useState("");
  const [importText, setImportText] = useState("");
  const [importOk, setImportOk] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const downloadSave = () => {
    const text = props.onExport();
    setExported(text);
    try {
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pokebanner-save-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      /* file download unavailable (rare) — the textarea still has the export */
    }
  };
  const loadFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setImportText(text);
      setImportOk(props.onImport(text));
    };
    reader.readAsText(file);
  };
  return (
    <div className="space-y-2 text-[7px]">
      <div className="flex items-center gap-1 border-2 border-ink bg-white p-1.5">
        <span className="font-bold uppercase">🌐 Language</span>
        <div className="ml-auto flex gap-1">
          {LANGS.map((l) => (
            <button
              key={l}
              className={`nb-btn !px-1.5 ${save.language === l ? "bg-yellow-300" : "bg-gray-100"}`}
              onClick={() =>
                props.onSetLanguage(l)
              }
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatMini label="XP total" value={`${saveStatsXp(props.save)}`} />
        <StatMini label="Level" value={`${props.save.team[0]?.level ?? 0}`} />
        <StatMini label="Battles" value={`${props.save.battlesWon}`} />
        <StatMini label="Badges" value={`${props.save.badges.length}`} />
      </div>
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">💾 {t(lang, "save-export")}</div>
        <div className="flex gap-1">
          <button
            className="nb-btn bg-blue-200"
            onClick={() => setExported(props.onExport())}
          >
            GENERATE
          </button>
          <button
            className="nb-btn bg-green-200"
            disabled={!exported}
            onClick={() => navigator.clipboard?.writeText(exported)}
          >
            COPY
          </button>
          <button className="nb-btn bg-teal-200" onClick={downloadSave}>
            ⬇ {t(lang, "save-download")}
          </button>
        </div>
        {exported && (
          <textarea
            readOnly
            value={exported}
            className="mt-1 h-14 w-full resize-none border-2 border-ink bg-gray-50 p-1 font-mono text-[6px]"
          />
        )}
      </div>
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">📥 {t(lang, "save-import")}</div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={t(lang, "save-import-hint")}
          className="h-14 w-full resize-none border-2 border-ink bg-gray-50 p-1 font-mono text-[6px]"
        />
        <div className="mt-1 flex items-center gap-2">
          <button
            className="nb-btn bg-yellow-200"
            onClick={() => setImportOk(props.onImport(importText))}
          >
            IMPORT
          </button>
          <button className="nb-btn bg-blue-200" onClick={() => fileRef.current?.click()}>
            📂 {t(lang, "save-load")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.txt"
            className="hidden"
            onChange={(e) => {
              loadFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {importOk !== null && (
            <span className={importOk ? "text-green-700" : "text-red-600"}>
              {importOk ? "Save loaded ✓" : "Import failed ✗"}
            </span>
          )}
        </div>
      </div>
      <div className="border-2 border-ink bg-red-50 p-1.5">
        <button className="nb-btn bg-red-300" onClick={props.onReset}>
          RESET GAME
        </button>
        <div className="mt-1 text-ink/70">
          Wipes local storage and returns to the starter screen.
        </div>
      </div>
      <p className="pt-1 text-center text-[6px] text-ink/50">
        POKEBANNER v{GAME_VERSION} · fan game · saves live in this browser
      </p>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-ink bg-gray-50 p-1">
      <div className="font-bold uppercase">{label}</div>
      <div className="text-ink/80">{value}</div>
    </div>
  );
}

function saveStatsXp(save: SaveData): number {
  return save.team.reduce((sum, m) => sum + m.xp, 0);
}

// ---------------------------------------------------------------------------
// Settings — preferences toggles (dust trail today; more later)
// ---------------------------------------------------------------------------

export function SettingsTab(props: GamePanelsProps) {
  const lang = props.save.language;
  const dustOn = props.save.dustTrail !== false;
  const biomeId = props.save.biome ?? "auto";
  return (
    <div className="space-y-2 text-[7px]">
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">⚙ {t(lang, "settings")}</div>
        <div className="flex items-center justify-between gap-2 border-2 border-ink bg-gray-50 p-1">
          <div>
            <div className="font-bold uppercase">{t(lang, "dust-trail")}</div>
            <div className="text-ink/60">{t(lang, "dust-trail-desc")}</div>
          </div>
          <button
            className={`nb-btn !px-2 ${dustOn ? "bg-green-300" : "bg-gray-200"}`}
            onClick={() => props.onSetDustTrail(!dustOn)}
          >
            {dustOn ? t(lang, "on") : t(lang, "off")}
          </button>
        </div>
      </div>

      {/* v1.8.0: biome picker — pin the banner scenery or let it rotate */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">🌲 {t(lang, "biome-title")}</div>
        <div className="flex flex-wrap gap-1">
          <button
            className={`nb-btn !px-1.5 ${biomeId === "auto" ? "bg-yellow-300" : "bg-gray-100"}`}
            onClick={() => props.onSetBiome("auto")}
          >
            🔄 {t(lang, "biome-auto")}
          </button>
          {BIOMES.map((b) => (
            <button
              key={b.id}
              className={`nb-btn !px-1.5 ${biomeId === b.id ? "bg-yellow-300" : "bg-gray-100"}`}
              onClick={() => props.onSetBiome(b.id)}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Career — lifetime stats + the 8 Kanto badges (v1.8.0 Elite & Legends+)
// ---------------------------------------------------------------------------

export function CareerTab(props: GamePanelsProps) {
  const lang = props.save.language;
  const save = props.save;
  const badgeMult = badgeDamageBonus(save.badges.length);
  const stats: [string, string][] = [
    [t(lang, "career-money"), "₽" + save.moneyEarned.toLocaleString()],
    [t(lang, "career-wins"), save.battlesWon.toLocaleString()],
    [t(lang, "career-losses"), save.battlesLost.toLocaleString()],
    [t(lang, "career-captures"), save.captures.toLocaleString()],
    [t(lang, "career-champions"), save.championWins.toLocaleString()],
    [t(lang, "career-rockets"), save.rocketsDefeated.toLocaleString()],
    [t(lang, "career-legendaries"), save.legendariesDefeated.toLocaleString()],
    [t(lang, "career-trainers"), save.trainersDefeated.toLocaleString()],
    [t(lang, "career-league"), save.leagueWins.toLocaleString()],
    [t(lang, "career-shinies"), save.shiniesSeen.toLocaleString()],
    [t(lang, "career-eggs"), save.eggsHatched.toLocaleString()],
    [t(lang, "career-steps"), save.steps.toLocaleString()],
  ];
  return (
    <div className="space-y-2 text-[7px]">
      <div className="border-2 border-ink bg-amber-100 p-1.5">
        <div className="font-bold uppercase">
          🏅 {t(lang, "career-title")} — {save.badges.length}/8 {t(lang, "career-badges")}
        </div>
        <div className="mt-1 text-ink/70">{t(lang, "career-tag")}</div>
      </div>

      {/* The 8 Kanto badges */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">{t(lang, "career-badges")}</div>
        <div className="grid grid-cols-4 gap-1">
          {CHAMPIONS.map((c) => {
            const earned = save.badges.includes(c.badge);
            return (
              <div
                key={c.id}
                className={
                  "flex flex-col items-center border-2 p-1 text-center " +
                  (earned ? "border-ink bg-yellow-200" : "border-gray-300 bg-gray-50 opacity-60")
                }
                title={`${c.name} · ${c.badge} · +5% damage`}
              >
                <span
                  className="mb-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-ink text-[8px]"
                  style={{
                    background: earned ? c.color : "#e5e5e5",
                    filter: earned ? "none" : "grayscale(1)",
                  }}
                >
                  {earned ? "★" : "?"}
                </span>
                <span className="font-bold uppercase leading-tight">{c.badge}</span>
                <span className="text-ink/60">{c.name}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-1 text-ink/70">
          {t(lang, "career-badge-bonus")}: +{Math.round((badgeMult - 1) * 100)}% {t(lang, "career-damage")}
        </div>
      </div>

      {/* Lifetime stats grid */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">{t(lang, "career-stats")}</div>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="border-2 border-ink bg-gray-50 p-1 text-center">
            <div className="font-bold uppercase leading-tight text-ink/70">{label}</div>
            <div className="text-[9px] font-bold">{value}</div>
          </div>
        ))}
        </div>
      </div>

      <div className="border-2 border-ink bg-white p-1.5">
        <div className="font-bold uppercase">{t(lang, "career-next")}</div>
        <div className="mt-1 text-ink/70">{t(lang, "career-next-desc")}</div>
        {save.leagueChampion && (
          <div className="mt-1 border-2 border-ink bg-indigo-100 p-1 font-bold uppercase">
            🏆 {t(lang, "league-title-earned")}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Friends — the happiness/friendship meter (v1.9.0 Master's Path)
// ---------------------------------------------------------------------------

export function FriendsTab(props: GamePanelsProps) {
  const lang = props.save.language;
  const save = props.save;
  const members = [save.team[0], ...save.team.slice(1)];
  const tierLabel = (tier: HappinessTier) =>
    tier === "best"
      ? t(lang, "friendship-tier-best")
      : tier === "happy"
        ? t(lang, "friendship-tier-happy")
        : tier === "friendly"
          ? t(lang, "friendship-tier-friendly")
          : t(lang, "friendship-tier-neutral");
  return (
    <div className="space-y-2 text-[7px]">
      <div className="border-2 border-ink bg-rose-100 p-1.5">
        <div className="font-bold uppercase">❤ {t(lang, "friendship-title")}</div>
        <div className="mt-1 text-ink/70">{t(lang, "friendship-tag")}</div>
      </div>

      {members.length === 0 && (
        <div className="border-2 border-ink bg-white p-2 text-ink/60">
          No team — add a Pokémon from the PC first.
        </div>
      )}

      <div className="flex flex-col gap-1">
        {members.map((m, i) => {
          if (!m) return null;
          const h = happinessOf(m);
          const tier = happinessTier(h);
          const hearts = tier === "best" ? 4 : tier === "happy" ? 3 : tier === "friendly" ? 2 : 1;
          return (
            <div key={i} className="flex items-center gap-2 border-2 border-ink bg-white p-1.5">
              <img
                src={urlSpriteCombat(m.speciesId)}
                alt=""
                className="h-8 w-8 pixelated"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = placeholderSprite(m.speciesId);
                }}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between font-bold uppercase">
                  <span>
                    {m.nickname ?? localizedName(m.speciesId, lang)}
                    {i === 0 ? " (LEAD)" : ""}
                  </span>
                  <span className="text-rose-600">
                    {"♥".repeat(hearts)}
                    <span className="text-ink/40">{"♡".repeat(4 - hearts)}</span> {h}/255
                  </span>
                </div>
                <div className="mt-0.5 h-2 border-2 border-ink bg-white">
                  <div
                    className={
                      "h-full " + (tier === "best" ? "bg-rose-500" : tier === "happy" ? "bg-orange-400" : tier === "friendly" ? "bg-yellow-400" : "bg-gray-300")
                    }
                    style={{ width: Math.round((h / 255) * 100) + "%" }}
                  />
                </div>
                <div className="mt-0.5 flex items-center justify-between text-ink/70">
                  <span className="font-bold uppercase">
                    {tierLabel(tier)}
                  </span>
                  <span>
                    {t(lang, "friendship-xp-bonus")}: +{Math.round((happinessXpBonus(h) - 1) * 100)}%
                    · {t(lang, "friendship-dmg-bonus")}: +{Math.round((happinessDamageBonus(h) - 1) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-2 border-ink bg-white p-1.5">
        <div className="font-bold uppercase">ℹ How to bond</div>
        <ul className="mt-1 space-y-0.5 text-ink/70">
          <li>• Winning battles: leader +2, bench +1.</li>
          <li>• Using berries / potions: +5.</li>
          <li>• Walking: +1 every {TUNING.happinessStepInterval} steps.</li>
          <li>• At 120+ happiness, some Pokémon evolve from your bond alone!</li>
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Eggs — the incubator: walk to hatch (v1.8.0 step-based hatching)
// ---------------------------------------------------------------------------

export function EggsTab(props: GamePanelsProps) {
  const lang = props.save.language;
  const save = props.save;
  const eggs = save.eggs ?? [];
  return (
    <div className="space-y-2 text-[7px]">
      <div className="border-2 border-ink bg-rose-100 p-1.5">
        <div className="font-bold uppercase">
          🥚 {t(lang, "eggs-title")} — {eggs.length} {t(lang, "eggs-count")}
        </div>
        <div className="mt-1 text-ink/70">{t(lang, "eggs-tag")}</div>
      </div>

      {eggs.length === 0 && (
        <div className="border-2 border-ink bg-white p-2 text-ink/60">
          {t(lang, "eggs-empty")}
        </div>
      )}

      <div className="flex flex-col gap-1">
        {eggs.map((e, i) => {
          const pct = Math.max(0, Math.min(100, ((e.needed - e.steps) / Math.max(1, e.needed)) * 100));
          return (
            <div key={i} className="flex items-center gap-2 border-2 border-ink bg-white p-1.5">
              <span className="egg-wiggle flex h-6 w-6 shrink-0 items-center justify-center border-2 border-ink bg-white text-[10px]" style={{ animationDelay: `${i * 0.25}s` }}>
                🥚
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between font-bold uppercase">
                  <span>
                    {localizedName(e.speciesId, lang)}
                    {e.shiny ? " ⭐" : ""}
                  </span>
                  <span className="text-ink/60">
                    {Math.max(0, e.steps)}/{e.needed} {t(lang, "eggs-steps")}
                  </span>
                </div>
                <div className="mt-0.5 h-2 border-2 border-ink bg-white">
                  <div className="h-full bg-rose-400" style={{ width: pct + "%" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-2 border-ink bg-white p-1.5">
        <div className="font-bold uppercase">{t(lang, "eggs-hatched")}: {save.eggsHatched}</div>
        <div className="mt-1 text-ink/70">{t(lang, "eggs-hint")}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// v2.0.0 — Champions & Légendes: Ghost PvP, Daily Quests & League Pass, and
// the 8-bit Safari photo gallery live in panels-v2.tsx (kept modular so this
// file stays readable). GamePanels imports them through this re-export.
// ---------------------------------------------------------------------------

export { PhotoTab, PvpTab, QuestsTab, passRewardLabel } from "./panels-v2";

