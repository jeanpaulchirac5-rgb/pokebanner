import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BIOMES, GAME_VERSION } from "@/game/constants";
import {
  backdropSvg,
  celestialForPhase,
  groundSvg,
  scenerySvg,
  skySvg,
  urlSpriteCombat,
  urlSpriteShiny,
  urlSpriteWalking,
} from "@/game/presentation";

const STARTERS = [
  { id: "bulbasaur", label: "GRASS", color: "#3ddc3d", type: "🌱" },
  { id: "charmander", label: "FIRE", color: "#ff8a3d", type: "🔥" },
  { id: "squirtle", label: "WATER", color: "#4fc3f7", type: "💧" },
];

/**
 * Where the packaged desktop installer lives. After you build & upload a
 * release (see desktop/README.md → Packaging & publishing), paste the
 * permanent URL here (GitHub Releases, itch.io, etc.) so the Download
 * button below points at the real .exe. Until a real URL is set, the
 * section shows a "Release coming soon" state instead of a dead link.
 */
const DOWNLOAD_URL = "https://github.com/jeanpaulchirac5-rgb/pokebanner/releases/tag/v1.0.0";

/**
 * GitHub API endpoint derived from DOWNLOAD_URL so we can live-verify the
 * release exists before showing the Download button (no dead links).
 * https://github.com/:owner/:repo/releases/tag/:tag ->
 * https://api.github.com/repos/:owner/:repo/releases/tags/:tag
 */
const RELEASE_CHECK_URL = DOWNLOAD_URL.replace(
  "https://github.com/",
  "https://api.github.com/repos/",
)
  .replace("/releases/tag/", "/releases/tags/");

/**
 * True only while the release API confirms the release is public. Fetches
 * once on mount; falls back to false ("coming soon") on any failure so a
 * dead or private release never renders a broken download link.
 */
function useReleaseLive(): boolean {
  const [live, setLive] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!DOWNLOAD_URL || DOWNLOAD_URL.includes("yourname")) return;
    fetch(RELEASE_CHECK_URL, { headers: { Accept: "application/vnd.github+json" } })
      .then((res) => {
        if (!cancelled) setLive(res.ok);
      })
      .catch(() => {
        if (!cancelled) setLive(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return live;
}

type FeedbackKind = "review" | "bug" | "idea";

const KIND_META: Record<
  FeedbackKind,
  { label: string; chip: string; hint: string }
> = {
  review: { label: "REVIEW", chip: "bg-yellow-300", hint: "Tell other players what you think — add stars!" },
  bug: { label: "BUG", chip: "bg-red-400", hint: "Something broken? Describe what happened." },
  idea: { label: "IDEA", chip: "bg-blue-300", hint: "Suggest the next feature for POKEBANNER." },
};

/** Living 60px banner mock — reuses the game's own pixel scenery + sprites. */
function MockBanner() {
  const biome = BIOMES[0]; // Route 1 / Plains
  const sun = celestialForPhase("day");
  return (
    <div
      className="relative h-[60px] w-full overflow-hidden border-4 border-ink"
      style={{ backgroundColor: "#00ff00" }}
    >
      {/* sky: drifting clouds */}
      <div
        className="scenery-scroll-sky absolute inset-x-0 top-0 h-[28px]"
        style={{ backgroundImage: `url("${skySvg(20260701, "day")}")` }}
      />
      {/* sun */}
      {sun.map((c, i) => (
        <div
          key={`sun-${i}`}
          className="pointer-events-none absolute z-[1]"
          style={{
            left: `${c.leftPct}%`,
            top: c.topPx,
            width: c.size,
            height: c.size,
            backgroundImage: `url("${c.uri}")`,
            backgroundSize: `${c.size}px ${c.size}px`,
          }}
        />
      ))}
      {/* parallax scenery */}
      <div className="absolute inset-x-0 bottom-0 h-[24px]">
        <div
          className="scenery-scroll-far absolute inset-x-0 h-[16px]"
          style={{ backgroundImage: `url("${backdropSvg(biome)}")`, bottom: 8 }}
        />
        <div
          className="scenery-scroll absolute inset-x-0 h-[12px]"
          style={{ backgroundImage: `url("${scenerySvg(biome)}")`, bottom: 8 }}
        />
        <div
          className="ground-scroll absolute inset-x-0 bottom-0 h-[8px]"
          style={{ backgroundImage: `url("${groundSvg(biome)}")` }}
        />
      </div>
      {/* walking leader + wild opponent (both are animated GIFs) */}
      <img
        src={urlSpriteWalking("bulbasaur")}
        alt=""
        className="absolute bottom-1 left-6 z-10 h-10 w-10 pixelated"
      />
      <img
        src={urlSpriteWalking("pidgey")}
        alt=""
        className="absolute bottom-1 right-6 z-10 h-10 w-10 pixelated"
        style={{ transform: "scaleX(-1)" }}
      />
      {/* banner buttons */}
      <div className="absolute right-1 top-1 z-30 flex gap-1">
        <span className="nb-btn !px-1.5 !py-0.5 !text-[6px] bg-yellow-300">BAG</span>
        <span className="nb-btn !px-1.5 !py-0.5 !text-[6px] bg-blue-300">MENU</span>
      </div>
    </div>
  );
}

function FeedbackStars({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (n: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={`text-xs leading-none ${readonly ? "" : "cursor-pointer"} ${
            n <= value ? "text-ink" : "text-ink/20"
          }`}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function FeedbackSection() {
  const submitFeedback = useMutation(api.feedback.submitFeedback);
  const recent = useQuery(api.feedback.listFeedback, { limit: 8 });

  const [kind, setKind] = useState<FeedbackKind>("review");
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      await submitFeedback({
        kind,
        text,
        author: author.trim() || undefined,
        rating: kind === "review" ? rating : undefined,
      });
      setStatus("done");
      setText("");
      setAuthor("");
      window.setTimeout(() => setStatus("idle"), 2600);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Couldn't send feedback — try again.");
    }
  };

  return (
    <section className="border-b-4 border-ink bg-[#fff8e1] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-sm uppercase">▚ Player Feedback ▞</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-[8px] leading-3 text-ink/70">
          Leave a review, report a bug, or suggest what to build next. Your
          feedback is stored on the shared POKEBANNER database for everyone to see.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* form */}
          <form onSubmit={onSubmit} className="nb-panel flex flex-col gap-3 p-3">
            {/* kind selector */}
            <div className="flex gap-1">
              {(Object.keys(KIND_META) as FeedbackKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`nb-btn flex-1 !px-1 !py-1.5 !text-[7px] ${
                    kind === k ? "translate-x-[2px] translate-y-[2px] shadow-none" : KIND_META[k].chip
                  }`}
                >
                  {KIND_META[k].label}
                </button>
              ))}
            </div>
            <p className="text-[6px] leading-3 text-ink/60">{KIND_META[kind].hint}</p>

            {kind === "review" && (
              <div className="flex items-center justify-between border-2 border-ink bg-white px-2 py-1.5">
                <span className="text-[7px] uppercase text-ink/70">Your rating</span>
                <FeedbackStars value={rating} onChange={setRating} />
              </div>
            )}

            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="NAME (OPTIONAL)"
              maxLength={40}
              className="border-2 border-ink bg-white px-2 py-1.5 text-[7px] placeholder:text-ink/40 focus:outline-none"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                kind === "bug"
                  ? "What happened? (e.g. capture ate my ball but the Pokémon stayed)"
                  : kind === "idea"
                    ? "What should we add next?"
                    : "What do you think of POKEBANNER?"
              }
              maxLength={2000}
              rows={3}
              className="border-2 border-ink bg-white px-2 py-1.5 text-[7px] leading-3 placeholder:text-ink/40 focus:outline-none"
            />
            {error && <p className="text-[6px] text-red-600">⚠ {error}</p>}
            {status === "done" && (
              <p className="text-[7px] font-bold text-green-700">★ Thanks! Your feedback is live.</p>
            )}
            <button
              type="submit"
              disabled={!text.trim() || status === "sending"}
              className="nb-btn w-full !py-2 !text-[9px] bg-green-300"
            >
              {status === "sending" ? "SENDING…" : "▶ SUBMIT FEEDBACK"}
            </button>
          </form>

          {/* recent feedback */}
          <div className="nb-panel flex flex-col gap-2 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold uppercase">Latest feedback</span>
              <span className="text-[6px] text-ink/50">from players</span>
            </div>
            {recent === undefined ? (
              <p className="text-[7px] text-ink/50">Loading feedback…</p>
            ) : recent.length === 0 ? (
              <p className="text-[7px] text-ink/50">
                Be the first to leave a review, report a bug, or drop an idea!
              </p>
            ) : (
              <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
                {recent.map((f) => (
                  <div key={f._id} className="border-2 border-ink bg-white p-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-1 py-0.5 text-[6px] font-bold uppercase ${KIND_META[f.kind].chip}`}>
                        {KIND_META[f.kind].label}
                      </span>
                      <span className="text-[6px] text-ink/50">
                        {f.author || "Anonymous"} ·{" "}
                        {new Date(f.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {f.kind === "review" && f.rating != null && (
                      <div className="mt-1">
                        <FeedbackStars value={f.rating} readonly />
                      </div>
                    )}
                    <p className="mt-1 break-words text-[7px] leading-3 text-ink/90">{f.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Hall of Fame — the top 10 trainers live from the shared leaderboard, with
// their team sprites. Shown on the home page so visitors can browse player
// profiles without launching the game.
// ---------------------------------------------------------------------------

function HallOfFame() {
  const top = useQuery(api.social.topPlayers, { limit: 10 });
  return (
    <section className="border-b-4 border-ink bg-[#eef2ff] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-white text-base">
            🏆
          </span>
          <h2 className="text-sm uppercase">Hall of Fame — top 10 trainers</h2>
        </div>
        <p className="mt-2 max-w-xl text-[8px] leading-3 text-ink/70">
          Live from the shared POKEBANNER leaderboard: composite score (badges,
          dex, team levels, wins, earnings). Browse player profiles and their
          teams without launching the game.
        </p>
        {top === undefined ? (
          <p className="mt-4 text-[8px] text-ink/50">Loading the Hall of Fame…</p>
        ) : top.length === 0 ? (
          <p className="mt-4 border-2 border-ink bg-white p-3 text-[8px] text-ink/60">
            No challengers yet — play the game, hit RANK, and claim the crown!
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {top.map((p, i) => (
              <div
                key={p._id}
                className="nb-panel flex flex-wrap items-center gap-2 p-2"
              >
                <span className="w-8 text-center text-[10px]">
                  {i === 0 ? "👑" : `#${i + 1}`}
                </span>
                <span className="w-28 truncate text-[8px] font-bold uppercase">
                  {p.playerName}
                </span>
                <span className="text-[8px] text-ink/80">
                  {p.score.toLocaleString()} pts
                </span>
                <span className="hidden text-[7px] text-ink/60 sm:inline">
                  {p.badges}/6 badges · {p.dexCaught}/152 dex · {p.battlesWon} wins
                </span>
                <span className="ml-auto flex gap-1">
                  {p.team.slice(0, 6).map((m, j) => (
                    <img
                      key={j}
                      src={m.shiny ? urlSpriteShiny(m.speciesId) : urlSpriteCombat(m.speciesId)}
                      alt=""
                      className="h-6 w-6 pixelated"
                      title={`${m.speciesId} Lv.${m.level}${m.shiny ? " ⭐" : ""}`}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = urlSpriteCombat(m.speciesId);
                      }}
                    />
                  ))}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-[6px] text-ink/50">
          Anti-cheat: the server validates every submission — impossible saves are rejected.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Marketplace preview — live player listings visible without launching the game.
// ---------------------------------------------------------------------------

function MarketPreview() {
  const listings = useQuery(api.market.listListings, { limit: 8 });
  return (
    <section className="border-b-4 border-ink bg-[#fff3e0] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-white text-base">
            🏪
          </span>
          <h2 className="text-sm uppercase">Live marketplace</h2>
        </div>
        <p className="mt-2 max-w-xl text-[8px] leading-3 text-ink/70">
          Real player-to-player listings from the shared board — browse what
          trainers are selling right now, then trade your own catches in-game.
        </p>
        {listings === undefined ? (
          <p className="mt-4 text-[8px] text-ink/50">Loading listings…</p>
        ) : listings.length === 0 ? (
          <p className="mt-4 border-2 border-ink bg-white p-3 text-[8px] text-ink/60">
            Nothing listed yet — be the first to sell a Pokémon in-game!
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {listings
              .filter((l) => !l.sold)
              .slice(0, 8)
              .map((l) => (
                <div key={l._id} className="nb-panel flex flex-col items-center gap-1 p-2">
                  <img
                    src={l.shiny ? urlSpriteShiny(l.speciesId) : urlSpriteCombat(l.speciesId)}
                    alt=""
                    className="h-8 w-8 pixelated"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = urlSpriteCombat(l.speciesId);
                    }}
                  />
                  <span className="truncate text-[7px] font-bold uppercase">
                    {l.nickname ?? l.name} Lv.{l.level}
                    {l.shiny ? " ⭐" : ""}
                  </span>
                  <span className="text-[6px] text-ink/60">by {l.sellerName || "???"}</span>
                  <span className="border-2 border-ink bg-yellow-200 px-1 text-[7px]">
                    ₽{l.price}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}

const FEATURES: Array<[string, string, string]> = [
  [
    "⚔",
    "AUTO-BATTLE · 4 MOVES",
    "Wild Kanto encounters arrive at a random 5–20s rhythm. Your starter picks from 4 classic moves with the full type chart, crits, min-damage rolls, sleep and leech seed.",
  ],
  [
    "🎣",
    "CAPTURE · TEAM OF 6",
    "Real catch math with wobble animation, Great Balls, a 6-member team with Exp Share, and a PC full of caught Pokémon.",
  ],
  [
    "🏆",
    "GYMS · ROCKET · SHOP",
    "Badge battles vs Brock, Misty and Lt. Surge (+5% team damage each). A traveling merchant every 10 victories, Team Rocket ambushes and shiny sparks (1/100).",
  ],
  [
    "🌍",
    "BIOMES · DAY & NIGHT",
    "Route 1, Viridian Forest and The Cave rotate every 500 steps. A 5-minute day/night cycle paints the sky — sun, sunset and moon — with night-only spawns like Zubat.",
  ],
  [
    "🎵",
    "CHIPTUNE SOUND",
    "Biome-specific BGM that darkens into a night theme, plus SFX for hits, captures, level-ups and evolutions. M mutes, N toggles music, tray buttons tweak volume.",
  ],
  [
    "💾",
    "SAVE · DESKTOP READY",
    "Autosaves to localStorage with export/import. The 60px neon-green strip keys out to true transparency above the Windows taskbar, with tray pause/volume controls.",
  ],
];

const EXTRA_STRIP = [
  "151-POKÉDEX",
  "EVOLUTION FX",
  "4 LANGUAGES EN/FR/DE/ES",
  "HALL OF FAME",
  "FRIENDS & TRADES",
  "POKÉ CENTER",
  "PLAYER MARKET",
  "WISHLISTS",
  "ANTI-CHEAT",
  "GROUND PICKUPS",
  "HOTKEYS M/N/B/C/K",
  "TRAY PAUSE",
  "EXPORT/IMPORT",
];

/** Hidden-yet-visible easter egg hint: a tiny pixel egg that, when clicked,
 *  reveals a cryptic riddle about the secret waiting beyond the 151. */
function EggHint() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-3 right-3 z-50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="egg-wiggle flex h-8 w-8 items-center justify-center border-2 border-ink bg-white text-sm shadow-[3px_3px_0_0_#111] transition-transform hover:-translate-y-0.5"
        title="A strange egg..."
        aria-label="Easter egg hint"
      >
        🥚
      </button>
      {open && (
        <div className="nb-panel absolute bottom-10 right-0 w-64 p-2 text-[6px] leading-3">
          <div className="mb-1 border-2 border-ink bg-yellow-100 p-1 font-bold uppercase">
            A traveler's tale
          </div>
          <p className="text-ink/80">
            "Beyond the 151 sleeps a time traveler in an egg. It will only
            hatch for the trainer who has earned every badge, registered the
            full Kanto Pokédex, and chased Team Rocket away at least once.
            Then — look to the sky."
          </p>
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  const releaseLive = useReleaseLive();
  return (
    <div className="min-h-screen bg-white text-ink font-pixel">
      <EggHint />
      {/* Header */}
      <header className="flex items-center justify-between border-b-4 border-ink px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="pokeball-pixel block !h-5 !w-5" />
          <span className="text-xs font-bold uppercase">Pokebanner</span>
        </Link>
        <nav className="flex gap-2">
          <Link to="/auth" className="nb-btn bg-yellow-300">
            PLAY
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="border-b-4 border-ink px-4 pb-8 pt-10 text-center">
        <p className="text-[8px] tracking-widest text-ink/60">A POCKET-MONSTER RPG LIVING IN YOUR TASKBAR</p>
        <h1 className="mx-auto mt-3 max-w-2xl text-2xl leading-8 uppercase">
          <span className="inline-block border-2 border-ink bg-[#00ff00] px-2">Pokebanner</span> —
          the whole journey in a{" "}
          <span className="inline-block border-2 border-ink bg-yellow-300 px-1">60px strip</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[9px] leading-4 text-ink/80">
          Pick Bulbasaur, Charmander or Squirtle and set off through Route 1 — a tiny
          pixel world that auto-battles, captures, evolves and levels up your team while
          you work. Three biomes, a living day/night sky, gym badges, Team Rocket,
          chiptune BGM and a full 151-Pokédex, all inside a banner that floats above
          your desktop.
        </p>

        {/* living mock banner */}
        <div className="mx-auto mt-6 w-full max-w-3xl">
          <MockBanner />
          <div className="mx-auto -mt-px w-[96%] border-2 border-t-0 border-ink bg-gray-50 p-1 text-left text-[6px] text-ink/70">
            ▓▓▓▓▓▓▓▓ 60px neon-green strip · live preview · keyed out for the Windows taskbar
          </div>
        </div>

        {/* starter sprite parade — the three starters walk across the hero */}
        <div className="mx-auto mt-5 flex max-w-xs items-end justify-center gap-6">
          {STARTERS.map((s, i) => (
            <div key={s.id} className="sprite-walker" style={{ animationDelay: `${i * 0.6}s` }}>
              <img src={urlSpriteWalking(s.id)} alt={s.label} className="h-10 w-10 pixelated" />
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/auth" className="nb-btn !px-4 !py-2 !text-[10px] bg-yellow-300">
            ▶ START ADVENTURE
          </Link>
          <Link to="/auth?returnTo=%2Fdashboard" className="nb-btn !px-4 !py-2 !text-[10px] bg-blue-300">
            PICK A STARTER
          </Link>
        </div>
      </section>

      {/* Quick stats band */}
      <section className="border-b-4 border-ink bg-[#eef2ff] px-4 py-3">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["151", "Kanto species"],
            ["6", "Gym badges"],
            ["3", "Biomes + day/night"],
            ["4", "Languages"],
          ].map(([n, l]) => (
            <div key={l} className="nb-panel p-1 text-center">
              <div className="text-sm font-bold">{n}</div>
              <div className="text-[6px] uppercase text-ink/70">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How to play */}
      <section className="border-b-4 border-ink bg-[#fff8e1] px-4 py-6">
        <div className="mx-auto grid max-w-3xl gap-2 sm:grid-cols-4">
          {[
            ["1", "PICK A STARTER", "Bulbasaur, Charmander or Squirtle starts your team."],
            ["2", "WALK & BATTLE", "Wild Pokémon appear every 5–20s — the battle runs itself."],
            ["3", "CATCH & GROW", "Weaken foes, throw balls, level up, evolve, earn badges."],
            ["4", "CONQUER", "Fill the 151-Pokédex, beat Team Rocket, hatch the secret."],
          ].map(([n, title, d]) => (
            <div key={n} className="nb-panel p-2">
              <div className="flex items-center gap-1">
                <span className="flex h-4 w-4 items-center justify-center border-2 border-ink bg-yellow-300 text-[7px] font-bold">
                  {n}
                </span>
                <span className="text-[7px] font-bold uppercase">{title}</span>
              </div>
              <p className="mt-1 text-[6px] leading-3 text-ink/70">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Starter cards */}
      <section className="border-b-4 border-ink px-4 py-8">
        <h2 className="text-center text-sm uppercase">Choose your starter</h2>
        <p className="mt-1 text-center text-[7px] text-ink/60">
          Each starter evolves at Lv.16 into its Kanto form — Ivysaur, Charmeleon or Wartortle.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {STARTERS.map((s) => (
            <Link
              key={s.id}
              to="/auth?returnTo=%2Fdashboard"
              className="nb-panel flex w-40 flex-col items-center gap-1 p-2 transition-transform hover:-translate-y-1"
            >
              <div
                className="flex h-14 w-full items-center justify-center border-2 border-ink"
                style={{ backgroundColor: s.color }}
              >
                <img
                  src={urlSpriteWalking(s.id)}
                  alt=""
                  className="h-10 w-10 pixelated"
                />
              </div>
              <span className="text-[8px] uppercase">
                {s.type} {s.id}
              </span>
              <span className="text-[7px] text-ink/70">{s.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section className="grid grid-cols-1 gap-2 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(([icon, title, desc]) => (
          <div key={title} className="nb-panel p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-white text-sm">
                {icon}
              </span>
              <div className="text-[8px] font-bold uppercase">{title}</div>
            </div>
            <p className="mt-2 text-[7px] leading-3 text-ink/80">{desc}</p>
          </div>
        ))}
      </section>

      {/* Extra features strip */}
      <section className="border-y-4 border-ink bg-ink px-4 py-3">
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2">
          {EXTRA_STRIP.map((x) => (
            <span key={x} className="border-2 border-ink bg-white px-2 py-1 text-[6px] uppercase text-ink">
              {x}
            </span>
          ))}
        </div>
      </section>

      {/* Live leaderboard — top 10 trainers + their teams */}
      <HallOfFame />

      {/* Live marketplace — player listings without launching the game */}
      <MarketPreview />

      {/* Feedback */}
      <FeedbackSection />

      {/* Download — the desktop game is free forever */}
      <section className="border-y-4 border-ink bg-[#fff8e1] px-4 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[8px] tracking-widest text-ink/60">
            RUNS ON YOUR WINDOWS TASKBAR · FREE FOREVER
          </p>
          <h2 className="mt-2 text-sm uppercase">Take Pokebanner to the desktop</h2>
          <p className="mx-auto mt-3 max-w-lg text-[8px] leading-4 text-ink/80">
            One 60px strip that docks above the taskbar, keys out its neon-green sky, and
            keeps battling, catching and evolving while you work. Drag it anywhere on the
            screen — position, saves and settings survive restarts.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[6px] uppercase">
            <span className="border-2 border-ink bg-green-300 px-2 py-1">Windows 10 / 11</span>
            <span className="border-2 border-ink bg-yellow-300 px-2 py-1">Installer + portable</span>
            <span className="border-2 border-ink bg-white px-2 py-1">v{GAME_VERSION}</span>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {releaseLive ? (
              <a
                href={DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
                className="nb-btn !px-5 !py-2 !text-[10px] bg-green-300"
              >
                ⬇ GET IT ON GITHUB
              </a>
            ) : (
              <span
                className="nb-btn !px-5 !py-2 !text-[10px] bg-gray-200 !text-ink/60"
                title="Download goes live once the GitHub release URL is configured."
              >
                ⬇ RELEASE COMING SOON
              </span>
            )}
            <Link to="/desktop" className="nb-btn !px-5 !py-2 !text-[10px] bg-blue-300">
              ▶ PLAY IN BROWSER
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-10 text-center">
        <h2 className="text-sm uppercase">Ready to catch 'em all?</h2>
        <Link to="/auth" className="nb-btn mt-4 !px-6 !py-3 !text-[11px] bg-green-300">
          FREE TO PLAY →
        </Link>
        <p className="mt-3 text-[6px] text-ink/60">
          Day/night cycle · 3 biomes · chiptune BGM · team of 6 · gym badges · 4 languages ·
          leaderboard · friends & trades · anti-cheat · save export/import
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-ink bg-white px-4 py-4 text-center text-[6px] text-ink/50">
        POKEBANNER v{GAME_VERSION} — an unofficial fan game. Pokémon © Nintendo / Game Freak.
        Not affiliated with the Pokémon Company. Sprites via Pokémon Showdown.
      </footer>
    </div>
  );
}
