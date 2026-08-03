// ---------------------------------------------------------------------------
// panels-tabs.tsx — the tail tabs extracted from panels.tsx (which grew to
// 1,846 lines and outgrew the editor's per-file index budget). Codex, Shop,
// Arena and Save render here; GamePanels imports them.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { CHAMPIONS, GAME_VERSION, ITEMS, TUNING, getSpecies } from "./constants";
import { LANG_LABELS, LANGS, t } from "./i18n";
import { placeholderSprite, urlSpriteCombat } from "./presentation";
import type { GamePanelsProps } from "./panels";
import type { SaveData } from "./types";

// ---------------------------------------------------------------------------
// Codex — shortcuts, game guide, and the hidden easter egg hint
// ---------------------------------------------------------------------------

export function CodexTab(props: GamePanelsProps) {
  const lang = props.save.language;
  const SHORTCUTS: [string, string][] = [
    ["M", "Mute / unmute all audio"],
    ["N", "Toggle music (BGM) only — SFX keep playing"],
    ["B", "Open the Bag"],
    ["C", "Open the Poké Center"],
    ["K", "Open the Marketplace"],
    ["ESC", "Close panels"],
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
        <p className="mt-1 text-ink/80">
          Somewhere beyond the 151, a time traveler sleeps in an egg. The
          elders whisper it will hatch for the trainer who has earned every
          badge, registered the full Kanto Pokédex, and sent Team Rocket
          packing at least once. Keep your eyes on the sky.
        </p>
      </div>
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
  const nextChamp = CHAMPIONS[save.championWins % CHAMPIONS.length];
  const bossLevel = (save.team[0]?.level ?? 5) + 3;
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
    </div>
  );
}

// ---------------------------------------------------------------------------

export function SaveTab(props: GamePanelsProps) {
  const { save } = props;
  const [exported, setExported] = useState("");
  const [importText, setImportText] = useState("");
  const [importOk, setImportOk] = useState<boolean | null>(null);
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
        <div className="mb-1 font-bold uppercase">Export save</div>
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
        <div className="mb-1 font-bold uppercase">Import save</div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste a POKEBANNER|v2|... export here"
          className="h-14 w-full resize-none border-2 border-ink bg-gray-50 p-1 font-mono text-[6px]"
        />
        <div className="mt-1 flex items-center gap-2">
          <button
            className="nb-btn bg-yellow-200"
            onClick={() => setImportOk(props.onImport(importText))}
          >
            IMPORT
          </button>
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
