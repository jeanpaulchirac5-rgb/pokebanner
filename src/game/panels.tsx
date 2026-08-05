// ---------------------------------------------------------------------------
// GamePanels — the Bag / PC / Pokédex / Shop / Arena / Save panels rendered
// in the white area below the 60px banner. Neobrutalism minimalism: square
// corners, fat black borders, flat color blocks, pixel font.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CENTER_SERVICES,
  DEX_META,
  DEX_MILESTONES,
  ITEMS,
  KANTO_151,
  MOVES,
  MARKET_TUNING,
  TYPE_COLORS,
  TUNING,
  getDexMeta,
  getSpecies,
} from "./constants";
import {
  badgeDamageBonus,
  dexMilestonesEarned,
  dexRarity,
  learnsetFor,
  marketValueOf,
  pokedexMilestone,
  xpNeeded,
} from "./engine";
import {
  urlSpriteCombat,
  urlSpriteShiny,
  placeholderSprite,
} from "./presentation";
import {
  dexFlavor,
  localizedItemName,
  localizedMoveName,
  localizedName,
  t,
} from "./i18n";
import type {
  CenterServiceId,
  ChampionDef,
  DexRarity,
  Language,
  Pokemon,
  SaveData,
} from "./types";
import { ArenaTab, CareerTab, CodexTab, EggsTab, NewsTab, SaveTab, SettingsTab, ShopTab } from "./panels-tabs";

export type PanelTab =
  | "items"
  | "team"
  | "dex"
  | "shop"
  | "arena"
  | "center"
  | "market"
  | "rank"
  | "social"
  | "admin"
  | "code"
  | "news"
  | "save"
  | "settings"
  | "career"
  | "eggs";

export interface GamePanelsProps {
  save: SaveData;
  tab: PanelTab;
  champion: ChampionDef;
  detailsMon: Pokemon | null;
  onClose: () => void;
  onSetTab: (t: PanelTab) => void;
  onUseItem: (itemId: string) => void;
  onBuy: (itemId: string, qty?: number) => void;
  onSetLeader: (pcIndex: number) => void;
  onAddToTeam: (pcIndex: number) => void;
  onRemoveFromTeam: (teamIndex: number) => void;
  onViewDetails: (pcIndex: number) => void;
  onChallengeChampion: () => void;
  onCenterService: (serviceId: CenterServiceId) => void;
  onSellPokemon: (pcIndex: number, price: number) => void;
  onBuyMarketMon: (mon: Pokemon, price: number) => void;
  onListMarketMon: (pcIndex: number) => Pokemon | null;
  onReturnMarketMon: (mon: Pokemon) => void;
  onExport: () => string;
  onImport: (text: string) => boolean;
  onReset: () => void;
  onClearDetails: () => void;
  onSetLanguage: (lang: Language) => void;
  onSetDustTrail: (on: boolean) => void;
  /** v1.8.0: pin the banner biome (auto = step rotation). */
  onSetBiome: (biome: string) => void;
  /** v1.8.0: configure the 2 battle moves for a PC pokémon. */
  onSetMoves: (pcIndex: number, moves: string[]) => void;
  /** PC index of the Pokémon currently in the details view. */
  detailsIdx: number | null;
}

const TABS: { id: PanelTab; label: string }[] = [
  { id: "items", label: "BAG" },
  { id: "team", label: "PC" },
  { id: "dex", label: "DEX" },
  { id: "career", label: "CAREER" },
  { id: "eggs", label: "EGGS" },
  { id: "center", label: "CENTER" },
  { id: "market", label: "MARKET" },
  { id: "rank", label: "RANK" },
  { id: "social", label: "FRIENDS" },
  { id: "admin", label: "ADMIN" },
  { id: "shop", label: "SHOP" },
  { id: "arena", label: "ARENA" },
  { id: "code", label: "CODEX" },
  { id: "news", label: "NEWS" },
  { id: "save", label: "SAVE" },
  { id: "settings", label: "SETTINGS" },
];

export function GamePanels(props: GamePanelsProps) {
  const { save, tab } = props;
  return (
    <div className="nb-panel mx-auto mt-2 w-[min(720px,94vw)] p-2">
      {/* Tab bar */}
      <div className="mb-2 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => props.onSetTab(t.id)}
            className={`nb-btn ${tab === t.id ? "bg-yellow-300" : "bg-gray-100"}`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[8px] text-ink">₽{save.money}</span>
          <button onClick={props.onClose} className="nb-btn bg-red-300">
            ✕ CLOSE
          </button>
        </div>
      </div>

      {tab === "items" && <ItemsTab {...props} />}
      {tab === "team" && <TeamTab {...props} />}
      {tab === "dex" && <DexTab {...props} />}
      {tab === "career" && <CareerTab {...props} />}
      {tab === "eggs" && <EggsTab {...props} />}
      {tab === "center" && <CenterTab {...props} />}
      {tab === "market" && <MarketTab {...props} />}
      {tab === "rank" && <RankTab {...props} />}
      {tab === "social" && <SocialTab {...props} />}
      {tab === "admin" && <AdminTab {...props} />}
      {tab === "shop" && <ShopTab {...props} />}
      {tab === "arena" && <ArenaTab {...props} />}      { tab === "code" && <CodexTab {...props} /> }
      { tab === "news" && <NewsTab {...props} /> }
      { tab === "save" && <SaveTab {...props} /> }
      { tab === "settings" && <SettingsTab {...props} /> }
    </div>
  );
}

// ---------------------------------------------------------------------------

function StatBlock({ leader }: { leader: Pokemon | undefined }) {
  if (!leader) return null;
  const xpNeed = xpNeeded(leader.level);
  const xpPct = Math.max(0, Math.min(100, (leader.xp / Math.max(1, xpNeed)) * 100));
  const hpPct = (leader.hp / leader.maxHp) * 100;
  return (
    <div className="border-2 border-ink bg-yellow-50 p-1.5 text-[7px] leading-3">
      <div className="flex items-center gap-1">
        <img
          src={urlSpriteCombat(leader.speciesId)}
          alt=""
          className="h-7 w-7 pixelated"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = placeholderSprite(leader.speciesId);
          }}
        />
        <div className="flex-1">
          <div className="font-bold uppercase">
            {leader.name} Lv.{leader.level}
            {leader.shiny ? " ⭐" : ""}
          </div>
          <div className="mt-0.5 flex items-center gap-1">
            <span className="w-6">HP</span>
            <div className="h-2 flex-1 border-2 border-ink bg-white">
              <div
                className="h-full bg-green-500"
                style={{ width: `${hpPct}%` }}
              />
            </div>
            <span>
              {leader.hp}/{leader.maxHp}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1">
            <span className="w-6">XP</span>
            <div className="h-2 flex-1 border-2 border-ink bg-white">
              <div className="h-full bg-blue-400" style={{ width: `${xpPct}%` }} />
            </div>
            <span>{leader.xp}/{xpNeed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ItemsTab(props: GamePanelsProps) {
  const { save } = props;
  const healable = ["berry", "sitrus", "potion", "hyperpotion"];
  const balls = ["pokeball", "greatball"];
  return (
    <div className="space-y-2 text-[7px]">
      <StatBlock leader={save.team[0]} />
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase text-ink">Items</div>
        <div className="grid grid-cols-2 gap-1">
          {[...balls, ...healable].map((id) => {
            const item = ITEMS[id];
            const count = save.inventory[id] ?? 0;
            return (
              <div key={id} className="flex items-center gap-1 border-2 border-ink bg-gray-50 p-1">
                <span className="flex-1">
                  {item.name}
                  <span className="ml-1 text-ink/60">×{count}</span>
                </span>
                {healable.includes(id) && (
                  <button
                    className="nb-btn !px-1"
                    disabled={count <= 0 || !save.team[0]}
                    onClick={() => props.onUseItem(id)}
                  >
                    USE
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="text-ink/70">
        Badges: {save.badges.length > 0 ? save.badges.join(", ") : "none"} · Team
        damage bonus: +{Math.round((badgeDamageBonus(save.badges.length) - 1) * 100)}%
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function TeamTab(props: GamePanelsProps) {
  const { save } = props;
  const [pendingLeader, setPendingLeader] = useState<number | null>(null);
  if (props.detailsMon) {
    return (
      <DetailsView
        mon={props.detailsMon}
        save={props.save}
        idx={props.detailsIdx}
        onBack={props.onClearDetails}
        onSetMoves={props.onSetMoves}
      />
    );
  }
  if (pendingLeader !== null) {
    const mon = save.pc[pendingLeader];
    return (
      <PixelConfirm
        text={`Make ${mon?.name ?? "?"} the walking leader?`}
        onYes={() => {
          props.onSetLeader(pendingLeader);
          setPendingLeader(null);
        }}
        onNo={() => setPendingLeader(null)}
      />
    );
  }
  const caught = pokedexMilestone(
    Object.values(save.pokedex).filter((v) => v === "caught").length,
  );
  return (
    <div className="space-y-2 text-[7px]">
      <StatBlock leader={save.team[0]} />
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">Active Team ({save.team.length}/6)</div>
        {save.team.length === 0 && (
          <div className="text-ink/60">No team — add a Pokémon from the PC below.</div>
        )}
        <div className="flex flex-wrap gap-1">
          {save.team.map((m, i) => (
            <div
              key={`${m.speciesId}-${i}`}
              className={`flex items-center gap-1 border-2 border-ink p-1 ${
                i === 0 ? "bg-yellow-200" : "bg-gray-50"
              }`}
            >
              <img
                src={urlSpriteCombat(m.speciesId)}
                alt=""
                className="h-6 w-6 pixelated"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = placeholderSprite(m.speciesId);
                }}
              />
              <div>
                <div className="font-bold">
                  {i === 0 ? "★ " : ""}
                  {m.name} Lv.{m.level}
                </div>
                <div>
                  HP {m.hp}/{m.maxHp}
                </div>
              </div>
              {i > 0 && (
                <button
                  className="nb-btn !px-1 !py-0.5 bg-red-200"
                  onClick={() => props.onRemoveFromTeam(i)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 flex items-center justify-between font-bold uppercase">
          <span>My Caught Pokémon</span>
          <span className="text-ink/70">
            +{Math.round(caught.catchBonus * 100)}% catch · ×{caught.xpBonus.toFixed(1)} XP
          </span>
        </div>
        {save.pc.length === 0 && (
          <div className="text-ink/60">Catch a Pokémon to see it here.</div>
        )}
        <div className="grid max-h-56 grid-cols-3 gap-1 overflow-y-auto sm:grid-cols-5">
          {save.pc.map((m, i) => {
            const inTeam = save.team.some(
              (t) => t.speciesId === m.speciesId && t.level === m.level,
            );
            return (
              <div key={`${m.speciesId}-${i}`} className="border-2 border-ink bg-gray-50 p-1">
                <img
                  src={urlSpriteCombat(m.speciesId)}
                  alt=""
                  className="mx-auto h-8 w-8 pixelated"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = placeholderSprite(m.speciesId);
                  }}
                />
                <div className="mt-0.5 truncate text-center font-bold uppercase">
                  {m.name}
                </div>
                <div className="text-center">Lv.{m.level}</div>
                <div className="mt-1 flex justify-center gap-0.5">
                  <button
                    className="nb-btn !px-1 !py-0.5 bg-yellow-200"
                    onClick={() => (inTeam ? setPendingLeader(i) : props.onSetLeader(i))}
                  >
                    {inTeam ? "LEAD" : "ADD"}
                  </button>
                  <button
                    className="nb-btn !px-1 !py-0.5 bg-blue-200"
                    onClick={() => props.onViewDetails(i)}
                  >
                    ?
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="text-ink/70">
        Click <span className="font-bold">LEAD</span> to make a caught Pokémon the
        walking leader (with pixel confirmation), <span className="font-bold">ADD</span>{" "}
        to add it to the team, <span className="font-bold">?</span> for details.
      </div>
    </div>
  );
}

/** Pixel-art confirmation prompt before switching the active leader. */
function PixelConfirm({
  text,
  onYes,
  onNo,
}: {
  text: string;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="nb-panel w-64 p-2 text-[7px]">
        <div className="mb-2 border-2 border-ink bg-yellow-100 p-1 font-bold uppercase">
          {text}
        </div>
        <div className="flex justify-center gap-2">
          <button className="nb-btn bg-green-300" onClick={onYes}>
            YES
          </button>
          <button className="nb-btn bg-red-300" onClick={onNo}>
            NO
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function DetailsView({
  mon,
  save,
  idx,
  onBack,
  onSetMoves,
}: {
  mon: Pokemon;
  save: SaveData;
  idx: number | null;
  onBack: () => void;
  onSetMoves: (pcIndex: number, moves: string[]) => void;
}) {
  const berries = ["berry", "sitrus"];
  const pct = (mon.hp / mon.maxHp) * 100;
  return (
    <div className="space-y-2 text-[7px]">
      <div className="flex items-center gap-2">
        <button className="nb-btn bg-gray-200" onClick={onBack}>
          ← BACK
        </button>
        <span className="font-bold uppercase">
          {mon.name} Lv.{mon.level}
        </span>
      </div>
      <div className="flex items-start gap-2 border-2 border-ink bg-white p-1.5">
        <img
          src={urlSpriteCombat(mon.speciesId)}
          alt=""
          className="h-12 w-12 pixelated"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = placeholderSprite(mon.speciesId);
          }}
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1">
            <span>HP</span>
            <div className="h-2 flex-1 border-2 border-ink bg-white">
              <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
            </div>
            <span>
              {mon.hp}/{mon.maxHp}
            </span>
          </div>
          <div>
            ATK {mon.atk} · DEF {mon.def}
          </div>
          <div>
            Type: {getSpecies(mon.speciesId).types.join("/")}
          </div>
        </div>
      </div>
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">Available Berries</div>
        {berries.map((b) => (
          <div key={b} className="text-ink/80">
            • {ITEMS[b].name}: {ITEMS[b].desc}
          </div>
        ))}
      </div>
      <MovesSection mon={mon} save={save} idx={idx} onSetMoves={onSetMoves} />
    </div>
  );
}

function MovesSection({
  mon,
  save,
  idx,
  onSetMoves,
}: {
  mon: Pokemon;
  save: SaveData;
  idx: number | null;
  onSetMoves: (pcIndex: number, moves: string[]) => void;
}) {
  if (idx === null) return null;
  const lang = save.language;
  const learnset = learnsetFor(mon);
  const configured = mon.moves ?? [];
  const toggle = (moveId: string) => {
    const cur = [...configured];
    if (cur.includes(moveId)) {
      onSetMoves(idx, cur.filter((m) => m !== moveId));
    } else if (cur.length < 2) {
      onSetMoves(idx, [...cur, moveId]);
    } else {
      // both slots full: replace the second slot
      onSetMoves(idx, [cur[0], moveId]);
    }
  };
  return (
    <div className="border-2 border-ink bg-white p-1.5">
      <div className="mb-1 font-bold uppercase">{t(lang, "moves-title")}</div>
      <div className="mb-1 flex gap-1">
        {[0, 1].map((slot) => {
          const id = configured[slot];
          const move = id ? MOVES[id] : null;
          return (
            <div
              key={slot}
              className={`flex-1 border-2 border-ink p-1 text-center ${
                move ? "bg-yellow-100" : "bg-gray-50"
              }`}
            >
              {move ? (
                <>
                  <div className="font-bold">{localizedMoveName(id, lang)}</div>
                  <div className="text-ink/60 uppercase">
                    {getSpecies(mon.speciesId).types.includes(move.type)
                      ? "STAB"
                      : move.type}
                  </div>
                </>
              ) : (
                <span className="text-ink/50">SLOT {slot + 1}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {learnset.map((m) => (
          <button
            key={m.id}
            className={`nb-btn !px-1 text-left ${
              configured.includes(m.id) ? "bg-green-300" : "bg-gray-100"
            }`}
            onClick={() => toggle(m.id)}
          >
            {localizedMoveName(m.id, lang)}
            <span className="ml-1 text-ink/60">P{m.power}</span>
          </button>
        ))}
      </div>
      <div className="mt-1 text-ink/70">{t(lang, "moves-hint")}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function DexTab(props: GamePanelsProps) {
  const { save } = props;
  const lang = save.language;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "seen" | "caught" | "shiny">("all");
  const [sel, setSel] = useState<string | null>(null);
  const seen = Object.values(save.pokedex).filter((v) => v === "seen" || v === "caught").length;
  const caught = Object.values(save.pokedex).filter((v) => v === "caught").length;
  const shinySet = new Set(save.shinyCaught ?? []);
  const pct = Math.round((caught / KANTO_151.length) * 100);
  const earnedPcts = new Set(dexMilestonesEarned(caught));
  const rarityLabel = (r: DexRarity) => {
    switch (r) {
      case "common": return t(lang, "dex-rarity-common");
      case "uncommon": return t(lang, "dex-rarity-uncommon");
      case "rare": return t(lang, "dex-rarity-rare");
      default: return t(lang, "dex-rarity-mythic");
    }
  };
  const list = KANTO_151.filter((id) => {
    const needle = q.trim().toLowerCase();
    const status = save.pokedex[id];
    if (filter === "seen" && status !== "seen" && status !== "caught") return false;
    if (filter === "caught" && status !== "caught") return false;
    if (filter === "shiny" && !shinySet.has(id)) return false;
    if (!needle) return true;
    const nm = localizedName(id, lang).toLowerCase();
    const en = getSpecies(id).name.toLowerCase();
    return nm.includes(needle) || en.includes(needle) || id.includes(needle);
  });
  const detailId = sel && KANTO_151.includes(sel) ? sel : null;
  const detail = detailId ? getSpecies(detailId) : null;
  const detailMeta = detailId ? getDexMeta(detailId) : null;
  return (
    <div className="space-y-2 text-[7px]">
      {/* Header: title, counts, progress bar */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="flex items-center justify-between font-bold uppercase">
          <span>{t(lang, "dex-title")} (151)</span>
          <span>
            {caught}/{KANTO_151.length} {t(lang, "dex-caught")} · {seen}/{KANTO_151.length}{" "}
            {t(lang, "dex-seen")} · {shinySet.size} {t(lang, "dex-shiny")}
          </span>
        </div>
        <div className="mt-1 h-2 border-2 border-ink bg-white">
          <div className="h-full bg-green-500" style={{ width: pct + "%" }} />
        </div>
        <div className="mt-1 flex items-center justify-between gap-1">
          <span className="uppercase text-ink/70">{t(lang, "dex-progress")}: {pct}%</span>
          <span className="text-ink/70">
            {t(lang, "dex-milestone")}:{" "}
            {DEX_MILESTONES.map((m) => (
              <span
                key={m.pct}
                className={
                  "ml-1 inline-block border-2 px-1 font-bold " +
                  (earnedPcts.has(m.pct)
                    ? "border-ink bg-yellow-300 text-ink"
                    : "border-gray-300 bg-gray-100 text-ink/40")
                }
                title={m.qty + "× " + localizedItemName(m.item, lang) + " · ₽" + m.money}
              >
                {m.pct}%
              </span>
            ))}
          </span>
        </div>
      </div>

      {/* Controls: search + filter chips */}
      <div className="flex flex-wrap items-center gap-1">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="SEARCH SPECIES…"
          maxLength={24}
          className="w-40 border-2 border-ink bg-gray-50 px-1 py-1 text-[7px] uppercase"
        />
        {(["all", "seen", "caught", "shiny"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "border-2 border-ink px-1.5 py-0.5 font-bold uppercase " +
              (filter === f ? "bg-yellow-300" : "bg-white")
            }
          >
            {f === "all" ? t(lang, "dex-all") : f === "seen" ? t(lang, "dex-seen") : f === "caught" ? t(lang, "dex-caught") : t(lang, "dex-shiny")}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-5 gap-1 border-2 border-ink bg-white p-1.5 sm:grid-cols-10">
        {list.map((id) => {
          const idx = KANTO_151.indexOf(id);
          const status = save.pokedex[id];
          const isShiny = shinySet.has(id);
          return (
            <button
              key={id}
              onClick={() => setSel(sel === id ? null : id)}
              className={
                "relative flex h-9 flex-col items-center justify-center border-2 " +
                (sel === id ? "border-ink bg-yellow-200" : "") +
                (status === "caught"
                  ? " border-red-400 bg-red-100"
                  : status === "seen"
                    ? " border-ink bg-yellow-50"
                    : " border-gray-200 bg-gray-50")
              }
              title={"#" + (idx + 1) + " " + getSpecies(id).name + " · " + getSpecies(id).types.join("/")}
            >
              {isShiny && (
                <span className="absolute right-0 top-0 text-[8px] leading-none text-red-500">★</span>
              )}
              {status === "caught" ? (
                <img
                  src={isShiny ? urlSpriteShiny(id) : urlSpriteCombat(id)}
                  alt=""
                  className="h-5 w-5 pixelated"
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    if (el.src.includes("-shiny")) el.src = urlSpriteCombat(id);
                    else el.src = placeholderSprite(id);
                  }}
                />
              ) : status === "seen" ? (
                <span className="text-[8px]">👁</span>
              ) : (
                <span className="text-[6px] text-ink/30">#{idx + 1}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      {detail && detailMeta && (
        <div className="border-2 border-ink bg-white p-1.5">
          <div className="mb-1 font-bold uppercase">
            {t(lang, "dex-detail")} · {t(lang, "dex-size")}
          </div>
          <div className="flex gap-2">
            <div className="flex flex-col items-center">
              <img
                src={shinySet.has(detailId!) ? urlSpriteShiny(detail.id) : urlSpriteCombat(detail.id)}
                alt=""
                className={"h-10 w-10 pixelated " + (shinySet.has(detailId!) ? "shiny-glow" : "")}
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  if (el.src.includes("-shiny")) el.src = urlSpriteCombat(detail.id);
                  else el.src = placeholderSprite(detail.id);
                }}
              />
              <span className="mt-0.5 text-[6px] text-ink/50">
                #{KANTO_151.indexOf(detail.id) + 1}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 font-bold uppercase">
                <span>{localizedName(detail.id, lang)}</span>
                {shinySet.has(detail.id) && (
                  <span className="border-2 border-red-400 bg-red-100 px-0.5 text-red-600">★ {t(lang, "dex-shiny")}</span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-0.5">
                {detail.types.map((ty) => (
                  <span key={ty} className={"border-2 border-ink px-1 font-bold uppercase " + (TYPE_COLORS[ty] ?? "bg-gray-200")}>
                    {ty}
                  </span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-ink/80">
                <span>{t(lang, "dex-height")}: {detailMeta.heightM.toFixed(1)} m</span>
                <span>{t(lang, "dex-weight")}: {detailMeta.weightKg.toFixed(1)} kg</span>
                <span>
                  {t(lang, "dex-rate")}: {detail.catchRate}/255 · {rarityLabel(dexRarity(detail.catchRate))}
                </span>
                <span>
                  {t(lang, "dex-caught")}:{" "}
                  {save.pokedex[detail.id] === "caught" ? "✓" : save.pokedex[detail.id] === "seen" ? t(lang, "dex-seen") : t(lang, "dex-unknown")}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-1 border-t-2 border-ink pt-1 text-ink/80">
            <span className="font-bold uppercase">{t(lang, "dex-flavor")}: </span>
            {dexFlavor(detail.id, lang)}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-ink/70">
        <span className="border border-red-400 bg-red-100 px-1">{t(lang, "dex-caught")} 🔴</span>
        <span className="border border-ink bg-yellow-50 px-1">{t(lang, "dex-seen")} 👁</span>
        <span className="border border-red-400 bg-red-100 px-1">★ {t(lang, "dex-shiny")}</span>
      </div>

      {/* Mythical section: Celebi appears once hatched (easter egg) */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">✨ {t(lang, "mythical")}</div>
        {save.pokedex.celebi === "caught" ? (
          <div className="flex items-center gap-2 border-2 border-ink bg-yellow-50 p-1">
            <img
              src={urlSpriteCombat("celebi")}
              alt=""
              className="h-7 w-7 pixelated"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = placeholderSprite("celebi");
              }}
            />
            <div className="flex-1">
              <div className="font-bold uppercase">{t(lang, "celebi-name")}</div>
              <div className="text-ink/70">{t(lang, "egg-flavor")}</div>
            </div>
            <span className="text-ink/60">✓ {t(lang, "caught-label")}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-2 border-ink bg-gray-50 p-1">
            <span className="flex h-7 w-7 items-center justify-center border-2 border-dashed border-ink text-[8px] text-ink/40">
              ?
            </span>
            <div className="flex-1 text-ink/60">
              ??? — a mythical beyond the 151 sleeps in an egg.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function SpriteImg({ mon, className }: { mon: Pokemon; className?: string }) {
  const src = mon.shiny ? urlSpriteShiny(mon.speciesId) : urlSpriteCombat(mon.speciesId);
  return (
    <img
      src={src}
      alt=""
      className={`pixelated ${mon.shiny ? "shiny-glow" : ""} ${className ?? ""}`}
      onError={(e) => {
        const el = e.currentTarget as HTMLImageElement;
        // shiny sprites occasionally 404 — fall back to the regular sprite
        if (el.src.includes("-shiny")) {
          el.src = urlSpriteCombat(mon.speciesId);
        } else {
          el.src = placeholderSprite(mon.speciesId);
        }
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Poké Center — the three care services (heal team / full PC / revive)
// ---------------------------------------------------------------------------

function CenterTab(props: GamePanelsProps) {
  const { save } = props;
  return (
    <div className="space-y-2 text-[7px]">
      <div className="flex items-center gap-2 border-2 border-ink bg-pink-100 p-1.5">
        <span className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-white text-sm">
          ❤️
        </span>
        <div className="flex-1">
          <div className="font-bold uppercase">{t(save.language, "center-name")}</div>
          <div className="text-ink/70">{t(save.language, "center-tag")}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
        {(Object.keys(CENTER_SERVICES) as CenterServiceId[]).map((id) => {
          const svc = CENTER_SERVICES[id];
          const affordable = save.money >= svc.price;
          return (
            <div key={id} className="flex flex-col gap-1 border-2 border-ink bg-white p-1.5">
              <div className="font-bold uppercase">{localizedItemName(id, save.language)}</div>
              <div className="flex-1 text-ink/70">{svc.desc}</div>
              <button
                className="nb-btn bg-green-200"
                disabled={!affordable}
                onClick={() => props.onCenterService(id)}
              >
                {svc.price === 0 ? "FREE" : `₽${svc.price}`}
              </button>
            </div>
          );
        })}
      </div>
      <div className="text-ink/70">
        Wallet: ₽{save.money}. Team HP restores free; PC-wide care and revives
        cost a little of your battle earnings.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Marketplace — sell your Pokémon locally, trade with players online (Convex)
// ---------------------------------------------------------------------------

function MarketTab(props: GamePanelsProps) {
  const { save } = props;
  const lang = save.language;
  const [sellerName, setSellerName] = useState("");
  const [listingPcIndex, setListingPcIndex] = useState(0);
  const [price, setPrice] = useState("");
  const [wishSpecies, setWishSpecies] = useState("pidgey");
  const [status, setStatus] = useState<string | null>(null);
  const listPokemon = useMutation(api.market.listPokemon);
  const buyListing = useMutation(api.market.buyListing);
  const cancelListing = useMutation(api.market.cancelListing);
  const listings = useQuery(api.market.listListings, { limit: 20 });
  // Wishlist: species you'd love to find on the market.
  const addWishlist = useMutation(api.social.addWishlist);
  const removeWishlist = useMutation(api.social.removeWishlist);
  const myWishlist = useQuery(api.social.myWishlist, { playerName: sellerName.trim() });

  const mine =
    listings?.filter((l) => l.sellerName === sellerName.trim()) ?? [];
  const open =
    listings?.filter((l) => !l.sold && l.sellerName !== sellerName.trim()) ?? [];

  const doList = async () => {
    const mon = props.onListMarketMon(listingPcIndex);
    if (!mon) {
      setStatus("Pick a Pokémon to list.");
      return;
    }
    const p = Math.max(1, Math.floor(Number(price) || marketValueOf(mon)));
    try {
      await listPokemon({
        sellerName: sellerName.trim() || undefined,
        speciesId: mon.speciesId,
        name: mon.name,
        level: mon.level,
        hp: mon.hp,
        maxHp: mon.maxHp,
        atk: mon.atk,
        def: mon.def,
        xp: mon.xp,
        shiny: mon.shiny,
        nickname: mon.nickname,
        price: p,
      });
      setStatus(`Listed ${mon.name} for ₽${p}!`);
      setPrice("");
    } catch (err) {
      // The mon was already pulled out of the PC before the server call;
      // give it back so a failed/banned listing never eats a Pokémon.
      props.onReturnMarketMon(mon);
      setStatus(err instanceof Error ? err.message : "Couldn't list.");
    }
  };

  const doBuy = async (listingId: Id<"marketListings">, mon: Pokemon, price: number) => {
    if (save.money < price) {
      setStatus("Not enough ₽!");
      return;
    }
    try {
      const listed = await buyListing({ listingId });
      props.onBuyMarketMon(
        {
          speciesId: listed.speciesId,
          name: listed.name,
          level: listed.level,
          hp: listed.hp,
          maxHp: listed.maxHp,
          atk: listed.atk,
          def: listed.def,
          xp: listed.xp,
          status: "none",
          statusTurns: 0,
          shiny: listed.shiny,
          nickname: listed.nickname ?? undefined,
        },
        price,
      );
      setStatus(`Bought ${listed.name} for ₽${price}!`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Purchase failed.");
    }
  };

  const doCancel = async (listingId: Id<"marketListings">, mon: Pokemon) => {
    try {
      await cancelListing({ listingId });
      props.onReturnMarketMon(mon);
      setStatus(`Returned ${mon.name} to your PC.`);
    } catch {
      setStatus("Couldn't cancel listing.");
    }
  };

  return (
    <div className="space-y-2 text-[7px]">
      <div className="border-2 border-ink bg-purple-100 p-1.5">
        <div className="font-bold uppercase">
          🏪 Marketplace — {t(lang, "wallet", { money: save.money })}
        </div>
        <div className="mt-1 text-ink/70">
          Sell your caught Pokémon for battle earnings, or trade with other
          players on the shared board (needs an internet connection).
        </div>
      </div>

      {/* Online listing form */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">List a Pokémon for sale</div>
        <div className="flex flex-wrap items-center gap-1">
          <select
            value={listingPcIndex}
            onChange={(e) => setListingPcIndex(Number(e.target.value))}
            className="border-2 border-ink bg-gray-50 px-1 py-1 text-[7px]"
          >
            {save.pc.map((m, i) => (
              <option key={`${m.speciesId}-${i}`} value={i}>
                {m.name} Lv.{m.level}
                {m.shiny ? " ⭐" : ""} — value ₽{marketValueOf(m)}
              </option>
            ))}
          </select>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={`₽${save.pc[listingPcIndex] ? marketValueOf(save.pc[listingPcIndex]) : 0}`}
            inputMode="numeric"
            className="w-20 border-2 border-ink bg-gray-50 px-1 py-1 text-[7px]"
          />
          <input
            value={sellerName}
            onChange={(e) => setSellerName(e.target.value)}
            placeholder="TRAINER NAME"
            maxLength={24}
            className="w-28 border-2 border-ink bg-gray-50 px-1 py-1 text-[7px]"
          />
          <button
            className="nb-btn bg-purple-300"
            disabled={save.pc.length === 0}
            onClick={doList}
          >
            LIST
          </button>
        </div>
        <div className="mt-1 text-ink/60">
          Local sell value: ₽
          {save.pc[listingPcIndex]
            ? Math.floor(marketValueOf(save.pc[listingPcIndex]) * MARKET_TUNING.localSellFactor)
            : 0}{" "}
          (75% of listing price — the NPC pays less).
        </div>
      </div>

      {status && (
        <div className="border-2 border-ink bg-yellow-100 p-1 text-ink">{status}</div>
      )}

      {/* Your active listings */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">Your listings</div>
        {mine.length === 0 && <div className="text-ink/60">Nothing listed yet.</div>}
        <div className="flex max-h-28 flex-col gap-1 overflow-y-auto">
          {mine.map((l) => (
            <div key={l._id} className="flex items-center gap-1 border-2 border-ink bg-gray-50 p-1">
              <SpriteImg
                mon={{
                  speciesId: l.speciesId,
                  name: l.name,
                  level: l.level,
                  hp: l.hp,
                  maxHp: l.maxHp,
                  atk: l.atk,
                  def: l.def,
                  xp: l.xp,
                  status: "none",
                  statusTurns: 0,
                  shiny: l.shiny,
                  nickname: l.nickname ?? undefined,
                }}
                className="h-5 w-5"
              />
              <span className="flex-1">
                {l.name} Lv.{l.level} {l.shiny ? "⭐" : ""} — ₽{l.price}{" "}
                {l.sold ? "(SOLD)" : ""}
              </span>
              {!l.sold && (
                <button
                  className="nb-btn !px-1 bg-red-200"
                  onClick={() =>
                    doCancel(
                      l._id,
                      {
                        speciesId: l.speciesId,
                        name: l.name,
                        level: l.level,
                        hp: l.hp,
                        maxHp: l.maxHp,
                        atk: l.atk,
                        def: l.def,
                        xp: l.xp,
                        status: "none",
                        statusTurns: 0,
                        shiny: l.shiny,
                        nickname: l.nickname ?? undefined,
                      },
                    )
                  }
                >
                  RETURN
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Wishlist — species you'd love to find on the market */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">❤ {t(lang, "wishlist")}</div>
        <div className="flex flex-wrap items-center gap-1">
          <select
            value={wishSpecies}
            onChange={(e) => setWishSpecies(e.target.value)}
            className="border-2 border-ink bg-gray-50 px-1 py-1 text-[7px]"
          >
            {KANTO_151.slice(0, 40).map((id) => (
              <option key={id} value={id}>
                {localizedName(id, lang)}
              </option>
            ))}
          </select>
          <button
            className="nb-btn bg-pink-300"
            disabled={!sellerName.trim()}
            onClick={async () => {
              try {
                await addWishlist({ playerName: sellerName.trim(), speciesId: wishSpecies });
                setStatus("Added to wishlist!");
              } catch (err) {
                setStatus(err instanceof Error ? err.message : "Couldn't update wishlist.");
              }
            }}
          >
            + WANT
          </button>
          <span className="ml-auto text-ink/60">
            {myWishlist?.length ?? 0} wanted
          </span>
        </div>
        {myWishlist !== undefined && myWishlist.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {myWishlist.map((w) => (
              <span
                key={w._id}
                className="flex items-center gap-1 border-2 border-ink bg-pink-50 px-1 py-0.5 uppercase"
              >
                {localizedName(w.speciesId, lang)}
                <button
                  className="text-ink/50"
                  onClick={async () => {
                    await removeWishlist({ playerName: sellerName.trim(), speciesId: w.speciesId });
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Open listings from other players */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">Player listings</div>
        {listings === undefined && (
          <div className="text-ink/60">Loading the shared market…</div>
        )}
        {listings !== undefined && open.length === 0 && (
          <div className="text-ink/60">
            No Pokémon for sale right now — be the first to list one!
          </div>
        )}
        <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
          {open.map((l) => (
            <div key={l._id} className="flex flex-col items-center border-2 border-ink bg-gray-50 p-1">
              <SpriteImg
                mon={{
                  speciesId: l.speciesId,
                  name: l.name,
                  level: l.level,
                  hp: l.hp,
                  maxHp: l.maxHp,
                  atk: l.atk,
                  def: l.def,
                  xp: l.xp,
                  status: "none",
                  statusTurns: 0,
                  shiny: l.shiny,
                  nickname: l.nickname ?? undefined,
                }}
                className="h-7 w-7"
              />
              <div className="truncate font-bold uppercase">
                {l.nickname ?? l.name} Lv.{l.level}
              </div>
              <div className="text-ink/60">by {l.sellerName || "???"}</div>
              <button
                className="nb-btn !px-1 bg-green-200"
                disabled={save.money < l.price}
                onClick={() =>
                  doBuy(
                    l._id,
                    {
                      speciesId: l.speciesId,
                      name: l.name,
                      level: l.level,
                      hp: l.hp,
                      maxHp: l.maxHp,
                      atk: l.atk,
                      def: l.def,
                      xp: l.xp,
                      status: "none",
                      statusTurns: 0,
                      shiny: l.shiny,
                      nickname: l.nickname ?? undefined,
                    },
                    l.price,
                  )
                }
              >
                ₽{l.price}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rank — global leaderboard (top 10 trainers + their teams), with server-side
// anti-cheat validation on submit (the same pure cheatScore the engine uses).
// ---------------------------------------------------------------------------

function RankTab(props: GamePanelsProps) {
  const { save } = props;
  const lang = save.language;
  const submitScore = useMutation(api.social.submitScore);
  const top = useQuery(api.social.topPlayers, { limit: 10 });
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const teamLevel = save.team.reduce((sum, m) => sum + m.level, 0);
  const dexCaught = Object.values(save.pokedex).filter((v) => v === "caught").length;
  const score = compositeScoreLocal({
    badges: save.badges.length,
    dexCaught,
    teamLevel,
    battlesWon: save.battlesWon,
    money: save.money,
  });

  const doSubmit = async () => {
    const playerName = name.trim();
    if (!playerName) {
      setStatus(t(lang, "add-friend") + " name?");
      return;
    }
    setPending(true);
    setStatus(null);
    try {
      await submitScore({ playerName, save });
      setStatus(t(lang, "submitted"));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t(lang, "rank-rejected"));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-2 text-[7px]">
      <div className="border-2 border-ink bg-indigo-100 p-1.5">
        <div className="font-bold uppercase">🏆 {t(lang, "rank-title")}</div>
        <div className="mt-1 text-ink/70">{t(lang, "rank-tag")}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="TRAINER NAME"
            maxLength={24}
            className="w-28 border-2 border-ink bg-gray-50 px-1 py-1 text-[7px]"
          />
          <button
            className="nb-btn bg-indigo-300"
            disabled={pending || !name.trim()}
            onClick={doSubmit}
          >
            {t(lang, "submit-score")}
          </button>
          <span className="ml-auto text-ink/70">
            {t(lang, "your-score")}: {score.toLocaleString()}
          </span>
        </div>
        {status && (
          <div className="mt-1 border-2 border-ink bg-yellow-100 p-1 text-ink">{status}</div>
        )}
        <div className="mt-1 text-ink/60">
          {t(lang, "cheat-flag")}: impossible saves are rejected server-side.
        </div>
      </div>

      {top === undefined ? (
        <div className="text-ink/60">Loading…</div>
      ) : (
        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {top.length === 0 && (
            <div className="border-2 border-ink bg-white p-2 text-ink/60">
              No challengers yet — be the first Hall of Famer!
            </div>
          )}
          {top.map((p, i) => (
            <div key={p._id} className="flex items-center gap-2 border-2 border-ink bg-white p-1.5">
              <span className="w-5 text-center font-bold text-ink/80">
                {i === 0 ? "👑" : `#${i + 1}`}
              </span>
              <div className="w-24 truncate font-bold uppercase">{p.playerName}</div>
              <div className="text-ink/70">
                {p.score.toLocaleString()} · {p.badges}/6 badges · {p.dexCaught} dex ·
                Lv.{p.teamLevel} · {p.battlesWon} wins
              </div>
              {/* their team, tiny sprites */}
              <div className="ml-auto flex gap-0.5">
                {p.team.slice(0, 6).map((m, j) => (
                  <img
                    key={j}
                    src={
                      m.shiny
                        ? urlSpriteShiny(m.speciesId)
                        : urlSpriteCombat(m.speciesId)
                    }
                    alt=""
                    className="h-5 w-5 pixelated"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = placeholderSprite(m.speciesId);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Composite score (mirrors convex/social.ts) — kept pure for the panel. */
function compositeScoreLocal(args: {
  badges: number;
  dexCaught: number;
  teamLevel: number;
  battlesWon: number;
  money: number;
}): number {
  return (
    args.badges * 1000 +
    args.dexCaught * 50 +
    args.teamLevel * 10 +
    args.battlesWon * 15 +
    Math.min(5000, Math.floor(args.money / 10))
  );
}

// ---------------------------------------------------------------------------
// Social — friends (by trainer name) + Pokémon trading (two-way swap)
// ---------------------------------------------------------------------------

function SocialTab(props: GamePanelsProps) {
  const { save } = props;
  const lang = save.language;
  const [me, setMe] = useState("");
  const [friendName, setFriendName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const sendRequest = useMutation(api.social.sendFriendRequest);
  const respondRequest = useMutation(api.social.respondFriendRequest);
  const myFriends = useQuery(api.social.myFriends, { playerName: me });

  const createOffer = useMutation(api.social.createTradeOffer);
  const acceptOffer = useMutation(api.social.acceptTradeOffer);
  const cancelOffer = useMutation(api.social.cancelTradeOffer);
  const offers = useQuery(api.social.listTradeOffers, { limit: 10 });

  const [offerPcIndex, setOfferPcIndex] = useState(0);
  const [wantSpecies, setWantSpecies] = useState("pidgey");
  const [acceptPcIndex, setAcceptPcIndex] = useState(0);
  const [acceptOfferId, setAcceptOfferId] = useState<Id<"tradeOffers"> | null>(null);

  const doSendFriend = async () => {
    if (!me.trim() || !friendName.trim()) {
      setStatus("Enter your name + friend's name.");
      return;
    }
    try {
      const r = await sendRequest({ fromName: me.trim(), toName: friendName.trim() });
      setStatus(r.reverse ? "They already asked you — added as friends!" : "Request sent!");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Couldn't send request.");
    }
  };

  const doRespond = async (requestId: Id<"friendships">, accept: boolean) => {
    try {
      await respondRequest({ requestId, accept });
      setStatus(accept ? "Friend added!" : "Request declined.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Couldn't respond.");
    }
  };

  const doCreateOffer = async () => {
    const mon = save.pc[offerPcIndex];
    if (!me.trim() || !mon) {
      setStatus("Enter your name + pick a Pokémon to trade.");
      return;
    }
    try {
      await createOffer({
        offererName: me.trim(),
        offered: {
          speciesId: mon.speciesId,
          name: localizedName(mon.speciesId, "en"),
          level: mon.level,
          hp: mon.hp,
          maxHp: mon.maxHp,
          atk: mon.atk,
          def: mon.def,
          xp: mon.xp,
          shiny: mon.shiny,
          nickname: mon.nickname,
        },
        wantedSpeciesId: wantSpecies,
      });
      setStatus("Trade offer listed!");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Couldn't list trade.");
    }
  };

  const doAcceptOffer = async (offerId: Id<"tradeOffers">, _offeredName: string) => {
    const mon = save.pc[acceptPcIndex];
    if (!me.trim() || !mon) {
      setStatus("Enter your name + pick your Pokémon to give.");
      return;
    }
    try {
      const res = await acceptOffer({
        offerId,
        accepterName: me.trim(),
        acceptedMon: {
          speciesId: mon.speciesId,
          name: localizedName(mon.speciesId, "en"),
          level: mon.level,
          hp: mon.hp,
          maxHp: mon.maxHp,
          atk: mon.atk,
          def: mon.def,
          xp: mon.xp,
          shiny: mon.shiny,
          nickname: mon.nickname,
        },
      });
      // A real two-way swap: your given Pokémon leaves your PC/team and the
      // received one joins it (both local mutations, mirroring the server).
      props.onSellPokemon(acceptPcIndex, 0);
      props.onBuyMarketMon(
        {
          speciesId: res.received.speciesId,
          name: res.received.name,
          level: res.received.level,
          hp: res.received.hp,
          maxHp: res.received.maxHp,
          atk: res.received.atk,
          def: res.received.def,
          xp: res.received.xp,
          status: "none",
          statusTurns: 0,
          shiny: res.received.shiny,
          nickname: res.received.nickname ?? undefined,
        },
        0,
      );
      setStatus(`Traded! You received ${localizedName(res.received.speciesId, lang)}.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Trade failed.");
    }
  };

  const doCancelOffer = async (offerId: Id<"tradeOffers">) => {
    try {
      await cancelOffer({ offerId, playerName: me.trim() });
      setStatus("Offer removed.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Couldn't cancel.");
    }
  };

  return (
    <div className="space-y-2 text-[7px]">
      <div className="flex flex-wrap items-center gap-1 border-2 border-ink bg-pink-100 p-1.5">
        <span className="font-bold uppercase">🤝 {t(lang, "add-friend")}</span>
        <input
          value={me}
          onChange={(e) => setMe(e.target.value)}
          placeholder="YOUR TRAINER NAME"
          maxLength={24}
          className="w-32 border-2 border-ink bg-gray-50 px-1 py-1 text-[7px]"
        />
        <input
          value={friendName}
          onChange={(e) => setFriendName(e.target.value)}
          placeholder="FRIEND'S NAME"
          maxLength={24}
          className="w-32 border-2 border-ink bg-gray-50 px-1 py-1 text-[7px]"
        />
        <button className="nb-btn bg-pink-300" onClick={doSendFriend}>
          SEND
        </button>
        {status && (
          <span className="ml-auto text-ink">{status}</span>
        )}
      </div>

      {/* friends + pending requests */}
      {me.trim() ? (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          <div className="border-2 border-ink bg-white p-1.5">
            <div className="mb-1 font-bold uppercase">{t(lang, "friends")}</div>
            {myFriends === undefined && <div className="text-ink/60">Loading…</div>}
            {myFriends && myFriends.friends.length === 0 && (
              <div className="text-ink/60">No friends yet — add one above.</div>
            )}
            <div className="flex flex-wrap gap-1">
              {myFriends?.friends.map((f) => (
                <span key={f} className="border-2 border-ink bg-gray-50 px-1 py-0.5 uppercase">
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div className="border-2 border-ink bg-white p-1.5">
            <div className="mb-1 font-bold uppercase">{t(lang, "friend-requests")}</div>
            {myFriends && myFriends.requests.length === 0 && (
              <div className="text-ink/60">Nothing waiting.</div>
            )}
            {myFriends?.requests.map((r) => (
              <div key={r._id} className="flex items-center gap-1 border-2 border-ink bg-gray-50 p-1">
                <span className="flex-1 uppercase">{r.fromName}</span>
                <button className="nb-btn !px-1 bg-green-300" onClick={() => doRespond(r._id, true)}>
                  ✓
                </button>
                <button className="nb-btn !px-1 bg-red-300" onClick={() => doRespond(r._id, false)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-ink/60">Enter your trainer name to see friends & requests.</div>
      )}

      {/* Trading */}
      <div className="border-2 border-ink bg-amber-100 p-1.5">
        <div className="font-bold uppercase">🔄 {t(lang, "trade-title")}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="text-ink/70">List:</span>
          <select
            value={offerPcIndex}
            onChange={(e) => setOfferPcIndex(Number(e.target.value))}
            className="border-2 border-ink bg-gray-50 px-1 py-1 text-[7px]"
          >
            {save.pc.map((m, i) => (
              <option key={`${m.speciesId}-${i}`} value={i}>
                {localizedName(m.speciesId, lang)} Lv.{m.level}
              </option>
            ))}
          </select>
          <span className="text-ink/70">want:</span>
          <select
            value={wantSpecies}
            onChange={(e) => setWantSpecies(e.target.value)}
            className="border-2 border-ink bg-gray-50 px-1 py-1 text-[7px]"
          >
            {KANTO_151.slice(0, 40).map((id) => (
              <option key={id} value={id}>
                {localizedName(id, lang)}
              </option>
            ))}
          </select>
          <button className="nb-btn bg-amber-300" disabled={save.pc.length === 0} onClick={doCreateOffer}>
            LIST OFFER
          </button>
        </div>
        {offers === undefined ? (
          <div className="mt-1 text-ink/60">Loading offers…</div>
        ) : (
          <div className="mt-1 flex max-h-32 flex-col gap-1 overflow-y-auto">
            {offers.filter((o) => o.status === "open").length === 0 && (
              <div className="text-ink/60">No open trades.</div>
            )}
            {offers
              .filter((o) => o.status === "open")
              .map((o) => (
                <div key={o._id} className="flex items-center gap-1 border-2 border-ink bg-gray-50 p-1">
                  <span className="flex-1">
                    {o.offererName} offers {localizedName(o.offered.speciesId, lang)} Lv.
                    {o.offered.level}
                    {o.offered.shiny ? " ⭐" : ""} → wants{" "}
                    {localizedName(o.wantedSpeciesId, lang)}
                  </span>
                  {o.offererName === me.trim() ? (
                    <button className="nb-btn !px-1 bg-red-200" onClick={() => doCancelOffer(o._id)}>
                      ✕
                    </button>
                  ) : (
                    <>
                      <select
                        value={acceptOfferId === o._id ? acceptPcIndex : acceptPcIndex}
                        onChange={(e) => {
                          setAcceptPcIndex(Number(e.target.value));
                          setAcceptOfferId(o._id);
                        }}
                        className="border-2 border-ink bg-gray-50 px-1 py-0.5 text-[6px]"
                      >
                        {save.pc.map((m, i) => (
                          <option key={`${m.speciesId}-${i}`} value={i}>
                            {localizedName(m.speciesId, lang)} Lv.{m.level}
                          </option>
                        ))}
                      </select>
                      <button
                        className="nb-btn !px-1 bg-green-300"
                        disabled={!save.pc.length}
                        onClick={() => doAcceptOffer(o._id, o.offered.name)}
                      >
                        TRADE
                      </button>
                    </>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin — the single-admin control room. Visible to everyone but only usable
// by the signed-in user whose email matches ADMIN_EMAILS in convex/admin.ts.
// Shows: ban/unban cheaters, remove marketplace listings, delete feedback,
// and cancel trade offers.
// ---------------------------------------------------------------------------

function AdminTab(_props: GamePanelsProps) {
  const isAdmin = useQuery(api.admin.isAdminUser);
  const myEmail = useQuery(api.admin.myEmail);
  const bans = useQuery(api.admin.listBans);
  const listings = useQuery(api.market.listListings, { limit: 20 });
  const feedback = useQuery(api.feedback.listFeedback, { limit: 10 });
  const offers = useQuery(api.social.listTradeOffers, { limit: 10 });

  const banPlayer = useMutation(api.admin.banPlayer);
  const unbanPlayer = useMutation(api.admin.unbanPlayer);
  const removeListing = useMutation(api.admin.removeListing);
  const deleteFeedback = useMutation(api.admin.deleteFeedback);
  const cancelTrade = useMutation(api.admin.cancelTradeOffer);

  const [banName, setBanName] = useState("");
  const [banReason, setBanReason] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  if (isAdmin === undefined) {
    return <div className="text-[7px] text-ink/60">Checking admin access…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="space-y-2 text-[7px]">
        <div className="border-2 border-ink bg-red-100 p-2">
          <div className="font-bold uppercase">🔒 Admin only</div>
          <p className="mt-1 text-ink/80">
            This control room is locked. Only the trainer whose sign-in email
            matches <span className="font-mono">ADMIN_EMAILS</span> in{" "}
            <span className="font-mono">src/convex/admin.ts</span> can use it.
          </p>
          <p className="mt-1 text-ink/70">
            {myEmail === null
              ? "You're signed out — sign in with your admin email to unlock."
              : `Signed in as ${myEmail} — this email is not on the admin list.`}
          </p>
        </div>
      </div>
    );
  }

  const doBan = async () => {
    const name = banName.trim();
    if (!name) return;
    try {
      const r = await banPlayer({ playerName: name, reason: banReason.trim() || undefined });
      setStatus(`Banned ${r.banned} — leaderboard entries removed.`);
      setBanName("");
      setBanReason("");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Ban failed.");
    }
  };

  return (
    <div className="space-y-2 text-[7px]">
      <div className="border-2 border-ink bg-red-100 p-1.5">
        <div className="font-bold uppercase">🛡 Admin control room</div>
        <div className="mt-1 text-ink/70">
          Signed in as {myEmail ?? "?"}. Ban cheaters, remove listings, moderate
          feedback and trades.
        </div>
        {status && <div className="mt-1 border-2 border-ink bg-yellow-100 p-1">{status}</div>}
      </div>

      {/* Ban a player */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">Ban a trainer</div>
        <div className="flex flex-wrap items-center gap-1">
          <input
            value={banName}
            onChange={(e) => setBanName(e.target.value)}
            placeholder="TRAINER NAME"
            maxLength={24}
            className="w-32 border-2 border-ink bg-gray-50 px-1 py-1 text-[7px]"
          />
          <input
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="REASON (CHEATING?)"
            maxLength={200}
            className="w-44 border-2 border-ink bg-gray-50 px-1 py-1 text-[7px]"
          />
          <button className="nb-btn bg-red-300" disabled={!banName.trim()} onClick={doBan}>
            BAN
          </button>
        </div>
        <div className="mt-1 text-ink/60">
          Banned trainers can't submit leaderboard scores, list Pokémon, or trade.
        </div>
      </div>

      {/* Current bans */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">Active bans</div>
        {bans === undefined && <div className="text-ink/60">Loading…</div>}
        {bans !== undefined && bans.length === 0 && (
          <div className="text-ink/60">No bans right now — the trainer world is peaceful.</div>
        )}
        <div className="flex max-h-28 flex-col gap-1 overflow-y-auto">
          {bans?.map((b) => (
            <div key={b._id} className="flex items-center gap-1 border-2 border-ink bg-gray-50 p-1">
              <span className="flex-1">
                <span className="font-bold uppercase">{b.playerName}</span>
                {b.reason ? <span className="text-ink/60"> — {b.reason}</span> : null}
              </span>
              <button
                className="nb-btn !px-1 bg-green-300"
                onClick={async () => {
                  await unbanPlayer({ playerName: b.playerName });
                  setStatus(`Unbanned ${b.playerName}.`);
                }}
              >
                UNBAN
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Remove marketplace listings */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">Moderate marketplace</div>
        {listings === undefined && <div className="text-ink/60">Loading…</div>}
        {listings !== undefined && listings.length === 0 && (
          <div className="text-ink/60">No listings to moderate.</div>
        )}
        <div className="flex max-h-28 flex-col gap-1 overflow-y-auto">
          {listings?.map((l) => (
            <div key={l._id} className="flex items-center gap-1 border-2 border-ink bg-gray-50 p-1">
              <span className="flex-1 truncate">
                {l.name} Lv.{l.level} by {l.sellerName || "???"} — ₽{l.price}{" "}
                {l.sold ? "(SOLD)" : ""}
              </span>
              <button
                className="nb-btn !px-1 bg-red-300"
                disabled={l.sold}
                onClick={async () => {
                  await removeListing({ listingId: l._id });
                  setStatus(`Removed listing for ${l.name}.`);
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Delete feedback */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">Moderate feedback</div>
        {feedback === undefined && <div className="text-ink/60">Loading…</div>}
        {feedback !== undefined && feedback.length === 0 && (
          <div className="text-ink/60">No feedback to moderate.</div>
        )}
        <div className="flex max-h-28 flex-col gap-1 overflow-y-auto">
          {feedback?.map((f) => (
            <div key={f._id} className="flex items-center gap-1 border-2 border-ink bg-gray-50 p-1">
              <span className="flex-1 truncate">
                [{f.kind}] {f.text.slice(0, 80)}
                {f.text.length > 80 ? "…" : ""} — {f.author || "Anonymous"}
              </span>
              <button
                className="nb-btn !px-1 bg-red-300"
                onClick={async () => {
                  await deleteFeedback({ feedbackId: f._id });
                  setStatus("Feedback removed.");
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Cancel trade offers */}
      <div className="border-2 border-ink bg-white p-1.5">
        <div className="mb-1 font-bold uppercase">Moderate trades</div>
        {offers === undefined && <div className="text-ink/60">Loading…</div>}
        {offers !== undefined && offers.length === 0 && (
          <div className="text-ink/60">No open trade offers.</div>
        )}
        <div className="flex max-h-28 flex-col gap-1 overflow-y-auto">
          {offers?.map((o) => (
            <div key={o._id} className="flex items-center gap-1 border-2 border-ink bg-gray-50 p-1">
              <span className="flex-1 truncate">
                {o.offererName}: {o.offered.name} Lv.{o.offered.level} → wants{" "}
                {o.wantedSpeciesId}
              </span>
              {o.status === "open" && (
                <button
                  className="nb-btn !px-1 bg-red-300"
                  onClick={async () => {
                    await cancelTrade({ offerId: o._id });
                    setStatus("Trade offer cancelled.");
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
