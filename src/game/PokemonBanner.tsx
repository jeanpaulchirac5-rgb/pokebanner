// ---------------------------------------------------------------------------
// PokemonBanner — the 60px banner game.
//
// A thin horizontal strip (60px × 100vw) with pixel-art Gen-1 sprites, a
// scrolling parallax ground, auto-battles every 20s, capture/heal buttons,
// evolution sequences, gym champions, a traveling shop, and a day/night
// biome system with a living pixel-blue sky (see src/game/presentation.ts)
// that shifts to amber at sunset and indigo at night, plus always-animating
// ambient motes (pollen, leaves, crystal sparkles) per biome.
//
// All game math lives in the pure engine (src/game/engine.ts) so the loop is
// fully unit-testable; this file only orchestrates timers and rendering.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import {
  BIOMES,
  CHAMPIONS,
  ITEMS,
  TUNING,
} from "./constants";
import {
  ballWobbleSec,
  captureAnimMs,
  computeDmgFx,
  dmgFxClass,
  dmgFxLabel,
  dustAccumulate,
  DUST_PUFF_CLASS,
  expireDust,
  levelUpFxActive,
  LEVEL_UP_FX_MS,
  logHasCrit,
  pushDust,
  sparkleBurst,
  SPRITE_SHADOW_CLASS,
  statusIconFor,
  VS_FLASH_MS,
  vsFlashActive,
} from "./fx";
import {
  addToPc,
  addToTeam,
  applyCenterService,
  badgeDamageBonus,
  biomeIndexForSteps,
  buildEncounter,
  captureAttempt,
  championBookkeeping,
  checkEvolution,
  computeVictoryRewards,
  createSave,
  doBattleTick,
  easterEggUnlocked,
  evolutionFxFor,
  expShare,
  makePokemon,
  makeWildEnemy,
  markPokedex,
  nextEncounterDelay,
  normalizeSave,
  pickupGroundItem,
  pokedexMilestone,
  setupChampion,
  switchLeader,
  timePhase,
  applyItemOn,
} from "./engine";
import {
  clearSave,
  exportSave,
  getPreferredLanguage,
  importSave,
  loadSave,
  persistSave,
  setPreferredLanguage,
} from "./storage";
import {
  ambientParticles,
  backdropSvg,
  celestialForPhase,
  skyClouds,
  combatPoseClass,
  DUST_LEVEL_PX,
  flinchClass,
  groundSvg,
  idleAnimClass,
  moveFxByName,
  nurseJoySprite,
  placeholderSprite,
  preloadSprites,
  scenerySvg,
  skyColorFor,
  skyGradientSvg,
  urlSpriteCombat,
  urlSpriteShiny,
  urlSpriteWalking,
  walkAnimClass,
  walkDustFor,
} from "./presentation";
import {
  LANG_LABELS,
  LANGS,
  localizedItemName,
  localizedName,
  t,
} from "./i18n";
import {
  effectiveVolume,
  setMuted,
  setVolume,
  snapshot,
  toggleMuted,
  volumeLabel,
} from "./audio";
import {
  bgmLabel,
  isBgmEnabled,
  playSfx,
  setBgmEnabled,
  setBgmTheme,
  startBgm,
  stopBgm,
  unlockAudio,
} from "./sound";
import type {
  CenterServiceId,
  Encounter,
  Language,
  Pokemon,
  SaveData,
} from "./types";
import { GamePanels, type PanelTab } from "./panels";

type Phase =
  | "choose"
  | "walking"
  | "approach"
  | "battle"
  | "victory"
  | "ko"
  | "evolving"
  | "capture";

interface EnemyOnField {
  pokemon: Pokemon;
  encounter: Encounter;
  x: number;
}

interface GameRef {
  save: SaveData;
  phase: Phase;
  leaderX: number;
  dir: 1 | -1;
  enemy: EnemyOnField | null;
  encounterTimer: number;
  /** Randomly rolled delay (ms) for the next wild encounter — 5–20s window. */
  encounterDelay: number;
  battleTimer: number;
  pauseLeft: number;
  /** Frames remaining in the turn-around idle pause (~0.5s at each edge). */
  idlePause: number;
  message: string | null;
  panel: PanelTab | null;
  messageUntil: number;
  merchant: boolean;
  groundItem: { x: number; life: number } | null;
  arenaAvailable: boolean;
  arenaClearedLevel: number;
  detailsMon: Pokemon | null;
  battle: { leader: Pokemon; enemy: Pokemon; enemyChampionId?: string } | null;
  hpFlash: "leader" | "enemy" | null;
  lunge: "leader" | "enemy" | null;
  /** Critical-hit flinch: brief species-flavored recoil on the hit sprite. */
  flinch: "leader" | "enemy" | null;
  notif: { color: "red" | "blue"; key: number } | null;
  lastStepBiome: number;
  /** Visible attack animation: colored impact burst + move name popup. */
  moveFx: { key: number; color: string; glyph: string; text: string; side: "leader" | "enemy" } | null;
  /** Floating damage numbers for the last battle tick. */
  dmgFx: {
    key: number;
    side: "leader" | "enemy";
    amount: number;
    kind: "damage" | "crit" | "heal";
  }[];
  /** "VS!" pop when a battle starts or a new leader switches in. */
  vsFlash: { key: number } | null;
  /** Capture sequence: ball thrown at the enemy (wobble × shakes). */
  captureAnim: { key: number; shakes: number; success: boolean } | null;
  /** Level-up sparkle burst at the leader. */
  levelUpFx: { key: number } | null;
  /** Dust puffs kicked up behind the walking leader / approaching enemy. */
  dust: { key: number; x: number; size: number; side: "leader" | "enemy" }[];
  dustTimer: number;
  /** Low-HP warning already beeped this battle. */
  lowHpBeeped: boolean;
  /** Desktop shell: tray-driven pause freezes the whole loop. */
  paused: boolean;
  /** Per-species evolution animation while the "evolving" phase plays. */
  evoFx: { kind: string; color: string; accent: string; glyph: string; from: string; to: string } | null;
  /** Nurse Joy NPC visit (appears occasionally while walking, opens the Center). */
  nurseJoy: boolean;
  /** Last Nurse Joy victory-cycle already visited (every 5 wins). */
  nurseJoyCycle: number;
  /** Frames the Nurse Joy NPC stays visible (then she wanders off). */
  nurseJoyLife: number;
}

const WALK_PX_PER_FRAME = 3;
const FRAME_MS = 100;
const IDLE_PAUSE_FRAMES = 5; // ~0.5s hesitation + sway at each turn-around

/** Small animated badge showing a battle status effect above a sprite. */
function StatusIcon({
  status,
  side,
}: {
  status: Pokemon["status"];
  side: "leader" | "enemy";
}) {
  const icon = statusIconFor(status);
  if (!icon) return null;
  const style = side === "enemy" ? { right: 46 } : { left: 46 };
  return (
    <div className={`${icon.className} absolute top-2 z-20 text-[8px]`} style={style}>
      {icon.glyph}
    </div>
  );
}

export default function PokemonBanner() {
  const [tick, setTick] = useState(0);
  const [updateStatus, setUpdateStatus] = useState<{
    state: "idle" | "downloading" | "ready" | "portable";
    version: string | null;
  }>({ state: "idle", version: null });
  const g = useRef<GameRef | null>(null);
  const viewportW = useRef(typeof window !== "undefined" ? window.innerWidth : 1200);
  const rng = () => Math.random();

  if (!g.current) {
    let save: SaveData | null = null;
    if (typeof localStorage !== "undefined") {
      try {
        save = loadSave(localStorage);
      } catch {
        save = null;
      }
    }
    g.current = {
      save:
        save ??
        (null as unknown as SaveData),
      phase: save ? "walking" : "choose",
      leaderX: 40,
      dir: 1,
      enemy: null,
      encounterTimer: 0,
      encounterDelay: nextEncounterDelay(rng),
      battleTimer: 0,
      pauseLeft: 0,
      idlePause: 0,
      message: null,
      panel: null,
      messageUntil: 0,
      merchant: false,
      groundItem: null,
      arenaAvailable: false,
      arenaClearedLevel: 0,
      detailsMon: null,
      battle: null,
      hpFlash: null,
      lunge: null,
      flinch: null,
      notif: null,
      lastStepBiome: 0,
      moveFx: null,
      dmgFx: [],
      vsFlash: null,
      captureAnim: null,
      levelUpFx: null,
      dust: [],
      dustTimer: 0,
      lowHpBeeped: false,
      paused: false,
      evoFx: null,
      nurseJoy: false,
      nurseJoyCycle: 0,
      nurseJoyLife: 0,
    };
    if (save) {
      preloadSprites([save.team[0]?.speciesId ?? "bulbasaur"]);
      // Restore the persisted BGM preference (music stays off until a user
      // gesture can unlock audio; the flag gates startBgm everywhere).
      setBgmEnabled(save.bgmEnabled);
    }
  }

  const rerender = () => setTick((t) => t + 1);
  const persist = () => {
    try {
      if (typeof localStorage !== "undefined" && g.current?.save) {
        persistSave(g.current.save, localStorage);
        // Keep the landing page's preferred-language key in sync with the
        // save so the home-screen picker always reflects the active language.
        setPreferredLanguage(localStorage, g.current.save.language);
      }
    } catch {
      /* storage unavailable */
    }
  };
  /** Preferred language from the landing page's picker (LANG_KEY). */
  const prefLang = (): Language =>
    typeof localStorage !== "undefined" ? getPreferredLanguage(localStorage) : "en";
  /** Localized message helper — reads the save's language. */
  const tr = (key: string, vars?: Record<string, string | number>) => {
    const s = g.current!;
    // No save yet during the starter-selection screen — fall back to the
    // language picked on the landing page so the choose phase renders the
    // localized starter buttons.
    return t(s.save?.language ?? prefLang(), key, vars);
  };
  /** Localized species name helper. */
  const trName = (speciesId: string) => {
    const s = g.current!;
    return localizedName(speciesId, s.save?.language ?? prefLang());
  };

  // ---------------------------------------------------------------
  // Core game tick (single 100ms interval, phase-gated)
  // ---------------------------------------------------------------
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = g.current;
      if (!s) return;
      const now = Date.now();
      // Tray pause: freeze progression entirely (rendering continues).
      if (s.paused) {
        rerender();
        return;
      }
      // Notification flash (shiny = red, arena = blue) auto-clears after its
      // ~3.6s blink sequence so the 2px line never stays pinned to the banner.
      if (s.notif && now - s.notif.key > 3600) s.notif = null;
      // Dust puffs only exist while actually moving (walking or approach).
      if (s.phase !== "walking" && s.phase !== "approach" && s.dust.length) s.dust = [];
      const frame = () => {
        // Only expire the message once its display window has passed — the old
        // unconditional clear made every message vanish after a single frame.
        if (now >= s.messageUntil) s.message = null;
      };

      if (s.phase === "walking") {
        // Turn-around idle: at each edge the leader hesitates ~0.5s and plays
        // its species idle animation (see idleAnimClass in presentation.ts)
        // before walking back. The tray pause also stops the walk, so the
        // idle animation plays there too.
        if (s.idlePause > 0) {
          s.idlePause -= 1;
          frame();
          rerender();
          return;
        }
        // walk
        const rightEdge = viewportW.current - 80;
        let nx = s.leaderX + s.dir * WALK_PX_PER_FRAME;
        if (nx >= rightEdge) {
          s.idlePause = IDLE_PAUSE_FRAMES;
          nx = rightEdge;
          s.dir = -1;
        } else if (nx <= 20) {
          s.idlePause = IDLE_PAUSE_FRAMES;
          nx = 20;
          s.dir = 1;
        }
        s.leaderX = nx;
        s.save = { ...s.save, steps: s.save.steps + 1 };
        const biomeIdx = biomeIndexForSteps(s.save.steps);
        if (biomeIdx !== s.lastStepBiome) {
          s.lastStepBiome = biomeIdx;
          preloadSprites(BIOMES[biomeIdx].pool);
        }
        // Dust puffs kicked up behind the leader — sized and paced by the
        // species' walk gait (gliders kick up nothing, lurching gaits throw
        // big puffs; see walkDustFor in presentation.ts).
        const leaderMon = s.save.team[0];
        const leaderDust = leaderMon
          ? walkDustFor(walkAnimClass(leaderMon.speciesId))
          : { level: 1 as const, intervalMs: 800 };
        if (s.save.dustTrail !== false && leaderDust.level > 0) {
          const dustTick = dustAccumulate(s.dustTimer, FRAME_MS, leaderDust.intervalMs);
          s.dustTimer = dustTick.timer;
          if (dustTick.spawn) {
            s.dust = pushDust(s.dust, {
              key: Date.now(),
              x: s.leaderX,
              size: DUST_LEVEL_PX[leaderDust.level],
              side: "leader",
            });
          }
        }
        if (s.dust.length) s.dust = expireDust(s.dust, now);
        // Biome/phase-aware BGM: swaps plains/forest/cave + night variants live
        setBgmTheme(biomeIdx, timePhase(s.save.startedAt, now));
        // merchant
        const cycle = Math.floor(s.save.battlesWon / 10);
        s.merchant =
          s.save.battlesWon > 0 && cycle > s.save.merchantVisitedCycle;
        // Nurse Joy NPC — appears occasionally while walking (every 5 victories
        // cycle, in-memory), clicking her opens the Pokémon Center.
        const nurseCycle = Math.floor(s.save.battlesWon / 5);
        if (s.save.battlesWon > 0 && nurseCycle > s.nurseJoyCycle) {
          s.nurseJoyCycle = nurseCycle;
          s.nurseJoy = true;
          s.nurseJoyLife = 600; // ~60s to click her before she wanders off
        }
        if (s.nurseJoyLife > 0) s.nurseJoyLife--;
        if (s.nurseJoyLife <= 0) s.nurseJoy = false;
        // ground item pickup (0.6% per frame — rare, announced)
        if (!s.groundItem && Math.random() < 0.006) {
          s.groundItem = {
            x: 80 + Math.random() * (viewportW.current - 200),
            life: 180,
          };
          s.message = tr("item-appeared");
          s.messageUntil = now + 1600;
        }
        if (s.groundItem) {
          s.groundItem.life--;
          if (s.groundItem.life <= 0) s.groundItem = null;
        }
        // encounter spawn — completely random delay within the 5–20s window
        s.encounterTimer += FRAME_MS;
        if (s.encounterTimer >= s.encounterDelay && !s.merchant) {
          s.encounterTimer = 0;
          s.encounterDelay = nextEncounterDelay(rng); // re-roll for next time
          const night = timePhase(s.save.startedAt, now) === "night";
          const leader = s.save.team[0];
          const level = leader?.level ?? 5;
          const encounter = buildEncounter({
            poolIds: BIOMES[biomeIdx].pool,
            levelRange: [Math.max(1, level - 2), level + 2],
            night,
            allowRocket: true,
            rng,
          });
          const pokemon = makeWildEnemy(s.save, encounter);
          s.save = {
            ...s.save,
            pokedex: markPokedex(s.save.pokedex, encounter.speciesId, "seen"),
            shiniesSeen: s.save.shiniesSeen + (encounter.shiny ? 1 : 0),
          };
          if (encounter.shiny) {
            s.notif = { color: "red", key: Date.now() };
            s.message = tr("shiny-appears");
            s.messageUntil = now + 2000;
            playSfx("shiny");
          }
          preloadSprites([encounter.speciesId], "combat");
          s.enemy = {
            pokemon,
            encounter,
            // Spawn just past the right edge (relative to the leader) so the
            // approach is a few seconds, not ~45s of walking across the screen.
            x: Math.max(viewportW.current * 0.6, s.leaderX + 260),
          };
          s.phase = "approach";
        }
      } else if (s.phase === "approach" && s.enemy) {
        s.enemy.x -= 16;
        // The approaching wild Pokémon trails dust behind it too — sized and
        // paced by its own species gait.
        const enemyDust = walkDustFor(walkAnimClass(s.enemy.pokemon.speciesId));
        if (s.save.dustTrail !== false && enemyDust.level > 0) {
          const dustTick = dustAccumulate(s.dustTimer, FRAME_MS, enemyDust.intervalMs);
          s.dustTimer = dustTick.timer;
          if (dustTick.spawn) {
            s.dust = pushDust(s.dust, {
              key: Date.now(),
              x: s.enemy.x + 8,
              size: DUST_LEVEL_PX[enemyDust.level],
              side: "enemy",
            });
          }
        }
        if (s.dust.length) s.dust = expireDust(s.dust, now);
        const meetX = s.leaderX + 36; // dust-attach-test
        if (s.enemy.x <= meetX) {
          const leader = s.save.team[0];
          if (!leader) {
            // Team emptied (leader sold/listed while walking) — abort the
            // encounter instead of opening a battle with no leader.
            s.enemy = null;
            s.phase = "walking";
          } else {
            s.battle = {
              leader: { ...leader },
              enemy: { ...s.enemy.pokemon },
              // Champions keep their signature movepool through the whole fight
              // (and after a switch the new leader still faces the same boss).
              enemyChampionId: s.enemy.encounter.championId,
            };
            s.battleTimer = 0;
            s.lowHpBeeped = false;
            s.phase = "battle";
            // "VS!" pop + whoosh as the encounter locks in.
            playSfx("switchin");
            s.vsFlash = { key: Date.now() };
            window.setTimeout(() => {
              if (g.current) {
                g.current.vsFlash = null;
                rerender();
              }
            }, VS_FLASH_MS);
          }
        }
      } else if (s.phase === "battle" && s.battle) {
        s.battleTimer += FRAME_MS;
        if (s.battleTimer >= TUNING.battleIntervalMs) {
          s.battleTimer = 0;
          runBattleTick(s, now);
        }
      } else if (s.phase === "victory" || s.phase === "ko") {
        s.pauseLeft -= FRAME_MS;
        if (s.pauseLeft <= 0) {
          s.phase = "walking";
          s.enemy = null;
          s.message = null;
          s.battle = null;
        }
      } else if (s.phase === "evolving") {
        s.pauseLeft -= FRAME_MS;
        if (s.pauseLeft <= 0) {
          s.phase = "walking";
          s.message = null;
        }
      } else if (s.phase === "capture") {
        s.pauseLeft -= FRAME_MS;
        if (s.pauseLeft <= 0) {
          finishCapture(s);
        }
      }
      frame();
      rerender();
    }, FRAME_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- game loop reads g.current via stable refs
  }, []);

  // ---------------------------------------------------------------
  // Battle internals (mutate g; pure math from engine)
  // ---------------------------------------------------------------
  function runBattleTick(s: GameRef, now: number) {
    if (!s.battle) return;
    const save = s.save;
    const leader = s.battle.leader;
    const enemy = s.battle.enemy;
    const beforeLeader = leader.hp;
    const beforeEnemy = enemy.hp;
    const badges = save.badges.length;
    const caught = pokedexMilestone(
      Object.values(save.pokedex).filter((v) => v === "caught").length,
    );
    const next = doBattleTick(
      {
        leader,
        enemy,
        badgeMult: badgeDamageBonus(badges),
        xpBonus: caught.xpBonus,
        turn: 0,
        log: [],
        enemyChampionId: s.battle.enemyChampionId,
      },
      rng,
    );
    s.battle = { ...s.battle, leader: next.leader, enemy: next.enemy };
    const enemyHit = next.enemy.hp < beforeEnemy;
    const leaderHit = next.leader.hp < beforeLeader;
    s.hpFlash = enemyHit ? "enemy" : leaderHit ? "leader" : null;
    s.lunge = enemyHit ? "leader" : "enemy";
    // Floating damage numbers for this tick (hits on both sides + drains/heals).
    const critHit = logHasCrit(next.log);
    // Critical hits trigger a brief species-flavored flinch on the sprite
    // that takes the hit (see flinchClass in presentation.ts).
    if (critHit) {
      s.flinch = enemyHit ? "enemy" : leaderHit ? "leader" : null;
      window.setTimeout(() => {
        if (g.current) {
          g.current.flinch = null;
          rerender();
        }
      }, 420);
    }
    const pops: GameRef["dmgFx"] = computeDmgFx(
      { leader: beforeLeader, enemy: beforeEnemy },
      { leader: next.leader.hp, enemy: next.enemy.hp },
      critHit,
    ).map((p, i) => ({ ...p, key: Date.now() + i + 1 }));
    if (pops.length > 0) {
      s.dmgFx = [...s.dmgFx, ...pops].slice(-6);
      window.setTimeout(() => {
        if (g.current) {
          g.current.dmgFx = [];
          rerender();
        }
      }, 800);
    }
    // Low-HP warning — beep once when the leader drops to ≤25% HP.
    if (
      next.leader.hp > 0 &&
      next.leader.hp <= next.leader.maxHp * 0.25 &&
      !s.lowHpBeeped
    ) {
      s.lowHpBeeped = true;
      playSfx("lowhp");
    }
    // Visible attack animation: pop the last "used <move>" log message with
    // a type-colored impact burst on the receiving side.
    if (enemyHit || leaderHit) {
      const usedMatch = [...next.log]
        .reverse()
        .map((l) => l.match(/used (.+?)(?: —|$)/)?.[1])
        .find(Boolean);
      if (usedMatch) {
        const fx = moveFxByName(usedMatch);
        s.moveFx = {
          key: Date.now(),
          color: fx.color,
          glyph: fx.glyph,
          text: usedMatch,
          side: enemyHit ? "enemy" : "leader",
        };
        window.setTimeout(() => {
          if (g.current) g.current.moveFx = null;
          rerender();
        }, 700);
      }
    }
    // Chiptune feedback for this tick's hits
    if (enemyHit || leaderHit) {
      playSfx(critHit ? "crit" : "hit");
    }
    if (s.hpFlash) {
      window.setTimeout(() => {
        if (g.current) g.current.hpFlash = null;
        rerender();
      }, 260);
    }
    if (s.lunge) {
      window.setTimeout(() => {
        if (g.current) g.current.lunge = null;
        rerender();
      }, 260);
    }

    // Victory
    if (next.enemy.hp <= 0) {
      playSfx("victory");
      const rewards = computeVictoryRewards(s.enemy!.encounter, rng);
      const xpBonus = pokedexMilestone(
        Object.values(save.pokedex).filter((v) => v === "caught").length,
      ).xpBonus;
      const share = expShare(save.team, rewards.xpGain, xpBonus);
      let nextSave: SaveData = {
        ...save,
        team: share.team,
        money: save.money + rewards.moneyGain,
        battlesWon: save.battlesWon + 1,
      };
      // Post-battle recovery: fainted team members revive to full HP so the
      // roster never accumulates dead weight (matches the KO-restore path).
      nextSave = {
        ...nextSave,
        team: nextSave.team.map((m) =>
          m.hp <= 0 ? { ...m, hp: m.maxHp, status: "none" as const, statusTurns: 0 } : m,
        ),
      };
      if (rewards.itemAwarded) {
        nextSave = {
          ...nextSave,
          inventory: {
            ...nextSave.inventory,
            [rewards.itemAwarded]: (nextSave.inventory[rewards.itemAwarded] ?? 0) + 1,
          },
        };
      }
      if (s.enemy!.encounter.kind === "rocket") {
        nextSave = { ...nextSave, rocketsDefeated: nextSave.rocketsDefeated + 1 };
      }
      let badgeMsg: string | null = null;
      if (s.enemy!.encounter.kind === "champion") {
        const cb = championBookkeeping(nextSave, s.enemy!.encounter.championId);
        nextSave = cb.save;
        if (cb.badgeAwarded) {
          badgeMsg = tr("badge-earned", { badge: cb.badgeAwarded });
        }
      }
      s.save = normalizeSave(nextSave);
      const levelMessages: string[] = [];
      share.leveled.forEach((i) => {
        levelMessages.push(
          tr("grew", { mon: trName(s.save.team[i].speciesId), lv: s.save.team[i].level }),
        );
      });
      if (share.leveled.includes(0)) {
        window.setTimeout(() => playSfx("levelup"), 700);
      }
      if (share.leveled.length > 0) {
        // Sparkle burst + XP jingle for any level-up (leader or bench).
        s.levelUpFx = { key: Date.now() };
        playSfx("xp");
        window.setTimeout(() => {
          if (g.current) {
            g.current.levelUpFx = null;
            rerender();
          }
        }, LEVEL_UP_FX_MS);
      }
      const leaderEvo = checkEvolution(s.save.team[0]);
      if (leaderEvo) {
        playSfx("evolve");
        const fx = evolutionFxFor(leaderEvo.newSpeciesId);
        s.evoFx = {
          kind: fx.kind,
          color: fx.color,
          accent: fx.accent,
          glyph: fx.glyph,
          from: leaderEvo.oldSpeciesId,
          to: leaderEvo.newSpeciesId,
        };
        s.message = tr("evolving", { mon: trName(leaderEvo.oldSpeciesId) });
        s.phase = "evolving";
        s.pauseLeft = 3200;
        s.messageUntil = now + 3200;
        // preload the evolved sprite
        preloadSprites([leaderEvo.newSpeciesId]);
        rerender();
        window.setTimeout(() => {
          if (!g.current) return;
          const sv = g.current.save;
          const team = sv.team.map((m, i) => (i === 0 ? { ...m, hp: m.maxHp } : m));
          g.current.save = normalizeSave({ ...sv, team });
          g.current.message = tr("evolved", {
            a: trName(leaderEvo.oldSpeciesId),
            b: trName(leaderEvo.newSpeciesId),
          });
          g.current.messageUntil = Date.now() + 2000;
          g.current.evoFx = null;
          persist();
          rerender();
        }, 3200);
        persist();
        return;
      }
      // Badge message takes priority when a champion was beaten; otherwise the
      // XP/₽ summary (never clobbers the badge announcement anymore).
      s.message =
        badgeMsg ??
        levelMessages[0] ??
        tr("rewards", { xp: rewards.xpGain, money: rewards.moneyGain });
      s.messageUntil = now + (badgeMsg ? 2600 : 2200);
      s.phase = "victory";
      s.pauseLeft = 2400;
      // arena trigger: leader gained a level multiple of 5
      const lvl = s.save.team[0]?.level ?? 0;
      if (lvl > 5 && lvl % 5 === 0 && lvl !== s.arenaClearedLevel) {
        s.arenaAvailable = true;
        s.notif = { color: "blue", key: Date.now() };
      }
      persist();
      return;
    }

    // Leader faint → switch or KO
    if (next.leader.hp <= 0) {
      playSfx("faint");
      const sw = switchLeader(save.team.map((m, i) => (i === 0 ? next.leader : m)));
      if (sw.switched) {
        s.battle = { ...s.battle, leader: sw.team[0], enemy: next.enemy };
        s.save = normalizeSave({ ...save, team: sw.team });
        s.lowHpBeeped = false; // fresh leader gets its own warning
        playSfx("switchin");
        s.vsFlash = { key: Date.now() };
        window.setTimeout(() => {
          if (g.current) {
            g.current.vsFlash = null;
            rerender();
          }
        }, VS_FLASH_MS);
        s.message = tr("go", { mon: trName(sw.team[0].speciesId) });
        s.messageUntil = now + 1600;
      } else if (sw.allFainted) {
        s.phase = "ko";
        s.pauseLeft = 2800;
        s.message = tr("fainted", { mon: trName(next.leader.speciesId) });
        s.messageUntil = now + 2800;
        // full restore after the regen pause (battle ref cleared at resume)
        window.setTimeout(() => {
          if (!g.current) return;
          const sv = g.current.save;
          const team = sv.team.map((m) => ({ ...m, hp: m.maxHp, status: "none" as const, statusTurns: 0 }));
          g.current.save = normalizeSave({ ...sv, team });
          persist();
          rerender();
        }, 2800);
      }
      persist();
    }
  }

  // ---------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------
  const chooseStarter = (id: string) => {
    const s = g.current!;
    s.save = { ...createSave(id), language: prefLang() };
    s.phase = "walking";
    s.leaderX = 40;
    preloadSprites([id]);
    playSfx("click");
    unlockAudio(); // user gesture: satisfies the autoplay policy
    startBgm();
    persist();
    rerender();
  };

  const tryCapture = () => {
    const s = g.current!;
    if (s.phase !== "battle" || !s.enemy) return;
    const ball = (s.save.inventory.greatball ?? 0) > 0 ? "greatball" : "pokeball";
    if ((s.save.inventory[ball] ?? 0) <= 0) {
      playSfx("denied");
      s.message = tr("no-balls");
      s.messageUntil = Date.now() + 1200;
      rerender();
      return;
    }
    s.save = {
      ...s.save,
      inventory: { ...s.save.inventory, [ball]: (s.save.inventory[ball] ?? 0) - 1 },
    };
    const caughtCount = Object.values(s.save.pokedex).filter((v) => v === "caught").length;
    // Roll against the LIVE battle HP (damage already applied), not the
    // full-HP spawn snapshot — otherwise low-HP captures never worked and the
    // captured Pokémon always came back at full health.
    const target = s.battle?.enemy ?? s.enemy.pokemon;
    const res = captureAttempt(target, ball, caughtCount, rng);
    // Throw the ball: play the wobble sequence, then apply the outcome.
    s.captureAnim = { key: Date.now(), shakes: res.shakes, success: res.success };
    s.phase = "capture";
    s.pauseLeft = captureAnimMs(res.shakes);
    playSfx(res.success ? "capture" : "capture-fail");
    persist();
    rerender();
  };

  /** Applied when the capture wobble sequence finishes. */
  const finishCapture = (s: GameRef) => {
    const anim = s.captureAnim;
    if (!anim) {
      s.phase = "battle";
      return;
    }
    s.captureAnim = null;
    if (!anim.success) {
      s.phase = "battle";
      s.message = tr("capture-failed");
      s.messageUntil = Date.now() + 1600;
      persist();
      rerender();
      return;
    }
    const target = s.battle?.enemy ?? s.enemy?.pokemon;
    if (!target) {
      s.phase = "battle";
      return;
    }
    const mon = { ...target, hp: Math.max(1, target.hp) };
    s.save = normalizeSave({
      ...s.save,
      pc: addToPc(s.save.pc, mon),
      team: s.save.team.length < TUNING.teamMax ? addToTeam(s.save.team, mon) : s.save.team,
      pokedex: markPokedex(s.save.pokedex, mon.speciesId, "caught"),
      money: s.save.money + 5,
    });
    s.message = tr("captured", { mon: trName(mon.speciesId) });
    s.messageUntil = Date.now() + 2200;
    s.phase = "victory";
    s.pauseLeft = 2400;
    s.battle = null;
    s.enemy = null;
    persist();
    rerender();
  };

  const healItem = (itemId: string) => {
    const s = g.current!;
    if (s.phase !== "battle" && s.phase !== "walking") return;
    const count = s.save.inventory[itemId] ?? 0;
    if (count <= 0) return;
    // During battle the visible HP lives on the battle leader (a live copy),
    // NOT the save team — heal the right one or the bar never moves and the
    // button always reports "HP is full".
    const target =
      s.phase === "battle" && s.battle ? s.battle.leader : s.save.team[0];
    if (!target) return;
    const before = target.hp;
    const res = applyItemOn(target, itemId);
    if (!res.consumed) {
      s.message = tr("hp-full", { mon: trName(target.speciesId) });
      s.messageUntil = Date.now() + 1200;
      rerender();
      return;
    }
    // Capture the healed amount BEFORE reassigning (the old code read the diff
    // after reassignment and always printed +0 HP).
    const healed = Math.max(0, res.pokemon.hp - before);
    if (s.phase === "battle" && s.battle) {
      s.battle = { ...s.battle, leader: res.pokemon };
      // Healed back above the warning line → re-arm the low-HP beep.
      if (res.pokemon.hp > res.pokemon.maxHp * 0.25) s.lowHpBeeped = false;
    } else {
      const team = [...s.save.team];
      team[0] = res.pokemon;
      s.save = normalizeSave({ ...s.save, team });
    }
    s.save = normalizeSave({
      ...s.save,
      inventory: { ...s.save.inventory, [itemId]: count - 1 },
    });
    playSfx("heal");
    s.message = tr("item-used", {
      item: localizedItemName(itemId, s.save.language),
      hp: healed,
    });
    s.messageUntil = Date.now() + 1400;
    persist();
    rerender();
  };

  const pickGroundItem = () => {
    const s = g.current!;
    if (!s.groundItem) return;
    const itemId = pickupGroundItem(rng);
    s.save = normalizeSave({
      ...s.save,
      inventory: { ...s.save.inventory, [itemId]: (s.save.inventory[itemId] ?? 0) + 1 },
    });
    playSfx("pickup");
    s.message = tr("found-item", { item: localizedItemName(itemId, s.save.language) });
    s.messageUntil = Date.now() + 1400;
    s.groundItem = null;
    persist();
    rerender();
  };

  const openMerchant = () => {
    const s = g.current!;
    if (!s.merchant) {
      s.message = tr("shop-unavailable");
      s.messageUntil = Date.now() + 1600;
      rerender();
      return;
    }
    const cycle = Math.floor(s.save.battlesWon / 10);
    s.save = { ...s.save, merchantVisitedCycle: Math.max(s.save.merchantVisitedCycle, cycle) };
    s.merchant = false;
    s.panel = "shop";
    persist();
    rerender();
  };

  const challengeChampion = () => {
    const s = g.current!;
    if (s.phase !== "walking") return;
    const leader = s.save.team[0];
    // Empty team (leader sold/listed) — nothing can enter the arena.
    if (!leader) return;
    const encounter = makeChampionEncounter(s.save.championWins, leader.level);
    const pokemon = makeWildEnemy(s.save, encounter);
    s.save = {
      ...s.save,
      pokedex: markPokedex(s.save.pokedex, encounter.speciesId, "seen"),
    };
    preloadSprites([encounter.speciesId], "combat");
    s.enemy = { pokemon, encounter, x: viewportW.current + 30 };
    s.arenaAvailable = false;
    s.arenaClearedLevel = leader.level;
    s.panel = null;
    s.phase = "approach";
    persist();
    rerender();
  };

  const openPanel = (tab: PanelTab) => {
    const s = g.current!;
    s.panel = s.panel === tab ? null : tab;
    rerender();
  };

  const onSetLeader = (index: number) => {
    const s = g.current!;
    const mon = s.save.pc[index];
    if (!mon) return;
    const team = [...s.save.team];
    if (team.some((m) => m.speciesId === mon.speciesId)) {
      // promote in place
      const at = team.findIndex((m) => m.speciesId === mon.speciesId);
      const [promoted] = team.splice(at, 1);
      team.unshift(promoted);
    } else {
      if (team.length >= TUNING.teamMax) {
        s.message = tr("team-full");
        s.messageUntil = Date.now() + 1400;
        rerender();
        return;
      }
      team.unshift(mon);
    }
    s.save = normalizeSave({ ...s.save, team });
    s.message = tr("leads", { mon: trName(mon.speciesId) });
    s.messageUntil = Date.now() + 1400;
    s.detailsMon = null;
    persist();
    rerender();
  };

  const onAddToTeam = (index: number) => {
    const s = g.current!;
    const mon = s.save.pc[index];
    if (!mon) return;
    const team = addToTeam(s.save.team, mon);
    if (team.length === s.save.team.length) {
      s.message = tr("team-full");
      s.messageUntil = Date.now() + 1400;
    }
    s.save = normalizeSave({ ...s.save, team });
    persist();
    rerender();
  };

  const onRemoveFromTeam = (index: number) => {
    const s = g.current!;
    const team = s.save.team.filter((_, i) => i !== index);
    s.save = normalizeSave({ ...s.save, team });
    persist();
    rerender();
  };

  const onUseItem = (itemId: string) => healItem(itemId);
  const onBuy = (itemId: string, qty = 1) => {
    const s = g.current!;
    const item = ITEMS[itemId];
    if (!item) return;
    const res = purchaseItemLocal(s, itemId, item.price, qty);
    if (!res.ok) {
      s.message = tr("not-enough");
      s.messageUntil = Date.now() + 1400;
      rerender();
      return;
    }
    s.save = res.save;
    s.message = tr("bought", { item: localizedItemName(itemId, s.save.language) });
    s.messageUntil = Date.now() + 1400;
    persist();
    rerender();
  };

  const onExport = (): string => {
    const s = g.current!;
    return exportSave(s.save);
  };

  const onImport = (text: string): boolean => {
    try {
      const s = g.current!;
      const imported = importSave(text);
      s.save = normalizeSave(imported);
      s.phase = "walking";
      s.battle = null;
      s.enemy = null;
      persist();
      rerender();
      return true;
    } catch {
      return false;
    }
  };

  const onReset = () => {
    const s = g.current!;
    if (typeof localStorage !== "undefined") clearSave(localStorage);
    stopBgm();
    setBgmEnabled(true); // fresh game: music on (matches createSave)
    s.save = null as unknown as SaveData;
    s.phase = "choose";
    s.battle = null;
    s.enemy = null;
    s.panel = null;
    s.detailsMon = null;
    s.arenaAvailable = false;
    rerender();
  };

  const onViewDetails = (index: number) => {
    const s = g.current!;
    s.detailsMon = s.save.pc[index] ?? null;
    rerender();
  };

  // Language switcher — cycles EN → FR → DE → ES → JA, persisted with the save.
  const cycleLanguage = () => {
    const s = g.current!;
    const langs = LANGS;
    const next = langs[(langs.indexOf(s.save.language) + 1) % langs.length];
    s.save = { ...s.save, language: next };
    if (typeof localStorage !== "undefined") setPreferredLanguage(localStorage, next);
    s.message = LANG_LABELS[next];
    s.messageUntil = Date.now() + 1000;
    persist();
    rerender();
  };

  // Nurse Joy NPC — clicking her opens the Pokémon Center.
  const openNurseJoy = () => {
    const s = g.current!;
    s.nurseJoy = false;
    s.nurseJoyLife = 0;
    s.panel = "center";
    playSfx("heal");
    rerender();
  };

  // ---------------------------------------------------------------
  // Pokémon Center & marketplace actions
  // ---------------------------------------------------------------
  const onCenterService = (serviceId: CenterServiceId) => {
    const s = g.current!;
    const res = applyCenterService(s.save, serviceId);
    if (!res.ok) {
      s.message = tr("not-enough");
      s.messageUntil = Date.now() + 1600;
      rerender();
      return;
    }
    s.save = res.save;
    playSfx("heal");
    const svcName = localizedItemName(serviceId, s.save.language);
    s.message =
      res.healed > 0
        ? `${svcName} — ${res.healed} Pokémon fully rested!`
        : `${svcName} — everyone is already healthy.`;
    s.messageUntil = Date.now() + 1800;
    persist();
    rerender();
  };

  const onSellPokemon = (pcIndex: number, price: number) => {
    const s = g.current!;
    const mon = s.save.pc[pcIndex];
    if (!mon) return;
    const pc = s.save.pc.filter((_, i) => i !== pcIndex);
    const team = s.save.team.filter(
      (m) => !(m.speciesId === mon.speciesId && m.level === mon.level),
    );
    s.save = normalizeSave({
      ...s.save,
      pc,
      team,
      money: s.save.money + price,
    });
    playSfx("pickup");
    s.message = tr("sold", { mon: trName(mon.speciesId), price });
    s.messageUntil = Date.now() + 1600;
    persist();
    rerender();
  };

  const onBuyMarketMon = (mon: Pokemon, price: number) => {
    const s = g.current!;
    if (s.save.money < price) {
      s.message = tr("not-enough");
      s.messageUntil = Date.now() + 1400;
      rerender();
      return;
    }
    s.save = normalizeSave({
      ...s.save,
      money: s.save.money - price,
      pc: addToPc(s.save.pc, mon),
      team: s.save.team.length < TUNING.teamMax ? addToTeam(s.save.team, mon) : s.save.team,
      pokedex: markPokedex(s.save.pokedex, mon.speciesId, "caught"),
    });
    playSfx("capture");
    s.message = tr("welcome", { mon: trName(mon.speciesId), price });
    s.messageUntil = Date.now() + 1600;
    persist();
    rerender();
  };

  const onListMarketMon = (pcIndex: number): Pokemon | null => {
    const s = g.current!;
    const mon = s.save.pc[pcIndex];
    if (!mon) return null;
    // pull the listed mon out of the PC (and team if it was leading)
    const pc = s.save.pc.filter((_, i) => i !== pcIndex);
    const team = s.save.team.filter(
      (m) => !(m.speciesId === mon.speciesId && m.level === mon.level),
    );
    s.save = normalizeSave({ ...s.save, pc, team });
    persist();
    rerender();
    return mon;
  };

  const onReturnMarketMon = (mon: Pokemon) => {
    const s = g.current!;
    s.save = normalizeSave({
      ...s.save,
      pc: addToPc(s.save.pc, mon),
    });
    s.message = tr("returned", { mon: trName(mon.speciesId) });
    s.messageUntil = Date.now() + 1400;
    persist();
    rerender();
  };

  // Hidden easter egg: when every badge is earned, the full Kanto Pokédex is
  // registered, and Team Rocket has been beaten at least once, a mysterious
  // egg appears — hatching the time traveler Celebi (beyond the 151).
  const hatchEgg = () => {
    const s = g.current!;
    if (!easterEggUnlocked(s.save)) return;
    if (s.save.pokedex.celebi === "caught") return;
    const level = Math.min(TUNING.maxLevel, Math.max(50, (s.save.team[0]?.level ?? 5) + 10));
    const celebi = makePokemon("celebi", level);
    s.save = normalizeSave({
      ...s.save,
      pc: addToPc(s.save.pc, celebi),
      team: s.save.team.length < TUNING.teamMax ? addToTeam(s.save.team, celebi) : s.save.team,
      pokedex: markPokedex(s.save.pokedex, "celebi", "caught"),
    });
    s.notif = { color: "red", key: Date.now() };
    playSfx("evolve");
    s.message = tr("egg-hatch");
    s.messageUntil = Date.now() + 3000;
    preloadSprites(["celebi"]);
    persist();
    rerender();
  };

  // ---------------------------------------------------------------
  // Desktop shell: tray pause/volume events + open-panel height reporting.
  // (All of this no-ops in the browser where window.desktopAPI is absent.)
  // ---------------------------------------------------------------
  useEffect(() => {
    const api = window.desktopAPI;
    if (!api) return;
    const onPause = (paused: boolean) => {
      const s = g.current;
      if (!s) return;
      s.paused = paused;
      if (paused) stopBgm();
      else startBgm();
      if (!paused) {
        s.encounterTimer = 0; // avoid an instant spawn on resume
        s.encounterDelay = nextEncounterDelay(rng); // fresh random window
      }
      rerender();
    };
    const onVolume = (v: { volume: number; muted: boolean }) => {
      setVolume(v.volume);
      setMuted(v.muted);
      const s = g.current;
      if (s) {
        s.message = volumeLabel(v.muted, effectiveVolume());
        s.messageUntil = Date.now() + 1600;
      }
      rerender();
    };
    api.onPauseChanged?.(onPause);
    api.onVolumeChanged?.(onVolume);
    // Report our initial state so the tray menu reflects it.
    api.reportVolume?.(snapshot());
    return () => {
      api.offPauseChanged?.(onPause);
      api.offVolumeChanged?.(onVolume);
    };
  }, []);

  // Desktop shell: auto-update status → in-banner chip. The main process
  // pushes state changes (idle → downloading → ready); we also pull once on
  // mount so a reload after the update downloaded still shows the indicator.
  useEffect(() => {
    const api = window.desktopAPI;
    if (!api) return;
    const onUpdate = (s: {
      state: "idle" | "downloading" | "ready" | "portable";
      version: string | null;
    }) => {
      setUpdateStatus(s);
    };
    api.onUpdateStatus?.(onUpdate);
    api.getUpdateStatus?.().then(onUpdate).catch(() => {
      /* pull is best-effort — pushes keep us fresh */
    });
    return () => {
      api.offUpdateStatus?.(onUpdate);
    };
  }, []);

  // ---------------------------------------------------------------
  // Hotkeys while the banner is focused (work in browser + desktop shell):
  //   M — mute/unmute all audio (tray checkbox stays in sync via report)
  //   N — toggle BGM on/off; SFX keep playing
  // ---------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing (e.g. the save import textarea) or shortcuts.
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = g.current;
      const key = e.key.toLowerCase();
      if (key === "m") {
        const muted = toggleMuted();
        if (s) {
          s.message = volumeLabel(muted, effectiveVolume());
          s.messageUntil = Date.now() + 1600;
        }
        window.desktopAPI?.reportVolume?.(snapshot());
        rerender();
        return;
      }
      if (key === "n") {
        // N: BGM only — SFX and volume are untouched.
        const on = setBgmEnabled(!isBgmEnabled());
        if (s) {
          s.save = { ...s.save, bgmEnabled: on };
          s.message = bgmLabel(on);
          s.messageUntil = Date.now() + 1600;
          persist();
        }
        rerender();
        return;
      }
      // Panel shortcuts advertised in the Codex
      const panelFor: Record<string, PanelTab> = {
        b: "items",
        c: "center",
        k: "market",
        d: "dex",
        a: "arena",
      };
      const target = panelFor[key];
      if (target && s) {
        s.panel = s.panel === target ? null : target;
        rerender();
        return;
      }
      if (e.key === "Escape" && s) {
        s.panel = null;
        rerender();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // First user gesture unlocks audio and (re)starts the BGM loop for a loaded
  // save — browsers block autoplay, so music never starts on reload without
  // this. startBgm() is a no-op when already playing, so repeat clicks are safe.
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      if (isBgmEnabled()) startBgm();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const lastPanelH = useRef(0);
  useEffect(() => {
    const api = window.desktopAPI;
    if (!api?.setPanelHeight) return;
    const el = document.getElementById("game-panel-area");
    const h = g.current?.panel && el ? el.offsetHeight : 0;
    if (h !== lastPanelH.current) {
      lastPanelH.current = h;
      api.setPanelHeight(h);
    }
  }, [tick]);

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------
  const s = g.current!;
  // Fresh visits / post-reset have no save yet — render the starter-choice
  // screen against an empty normalized save instead of crashing on save.team.
  const save = s.save ?? normalizeSave({});
  const leader = save.team[0];
  const biome = BIOMES[biomeIndexForSteps(save.steps)];
  const phase = timePhase(save.startedAt, Date.now());
  const phaseTint =
    phase === "night"
      ? "rgba(8,8,36,0.55)"
      : phase === "sunset"
        ? "rgba(255,140,0,0.28)"
        : "transparent";
  const walking = s.phase === "walking";
  // Idle animation: active during the turn-around pause and while the tray
  // pause freezes the walk (rendering continues then, so it's visible). The
  // class is per-species (idleAnimClass in presentation.ts).
  const idling = (walking && (s.paused || s.idlePause > 0)) || s.phase === "approach";
  const idleClass = leader ? idleAnimClass(leader.speciesId) : "idle-sway";
  // Walk gait: the per-species MOVEMENT animation, active while actually
  // walking (the idle class only replaces it during the turn-around pause
  // or the tray pause). Each species has its own signature stride.
  const walkClass = leader ? walkAnimClass(leader.speciesId) : "walk-sway";
  // Combat pose: the species' fighting stance while a battle is active (see
  // combatPoseClass in presentation.ts — replaces the static battle stance).
  const poseClass = leader ? combatPoseClass(leader.speciesId) : "pose-ready";
  // Electron shell: the window is transparent, so the sky tile swaps to the
  // clouds-only variant and the CSS paints the scene straight on the desktop.
  const desktopShell =
    typeof window !== "undefined" && Boolean(window.desktopAPI?.isDesktop);
  const inBattle = s.phase === "battle";
  // Hidden easter egg availability (computed in render where save is in scope)
  const eggReady =
    easterEggUnlocked(save) && save.pokedex.celebi !== "caught" && walking;

  const leaderSprite = leader
    ? leader.shiny
      ? urlSpriteShiny(save.team[0].speciesId)
      : urlSpriteWalking(save.team[0].speciesId)
    : placeholderSprite("empty");

  return (
    <div className="banner-page flex min-h-screen flex-col bg-white">
      {/* The 60px banner — top of the screen.
          game-sky = a living pixel-blue sky (no chroma key anymore). The
          flat backdrop matches the sky tile's bottom band so there is no
          seam at any time of day. */}
      <div
        className="game-sky relative w-full overflow-hidden border-b-4 border-ink"
        style={{ height: TUNING.bannerHeight, backgroundColor: skyColorFor(phase) }}
      >
        {/* Desktop auto-update chip: downloading → clickable when ready.
            Only present in the Electron shell (window.desktopAPI), so the
            browser build never shows it. Sits below the pause chip when the
            tray pause is active so the two never overlap. Portable builds
            (can't self-update) show a manual-download hint that opens the
            GitHub releases page. */}
        {updateStatus.state !== "idle" && (
          <div className={`absolute left-1 z-30 ${s.paused ? "top-[17px]" : "top-1"}`}>
            {updateStatus.state === "ready" ? (
              <button
                onClick={() => window.desktopAPI?.restartAndInstall?.()}
                className="nb-btn update-ready-pulse bg-green-300 !px-1.5 !py-0.5 text-[6px]"
                title={tr("update-ready")}
              >
                ⬇ v{updateStatus.version} {tr("update-ready")}
              </button>
            ) : updateStatus.state === "portable" ? (
              <button
                onClick={() => window.desktopAPI?.openReleases?.()}
                className="nb-btn update-portable-pulse bg-orange-300 !px-1.5 !py-0.5 text-[6px]"
                title={tr("update-portable")}
              >
                ⬇ {tr("update-portable")}
              </button>
            ) : (
              <div className="nb-panel bg-blue-200 px-1.5 py-0.5 text-[6px] text-ink">
                ⬇ v{updateStatus.version} {tr("update-downloading")}
              </div>
            )}
          </div>
        )}
        {/* Notification flash (shiny = red, arena = blue) */}
        {s.notif && (
          <div
            key={s.notif.key}
            className="notif-flash absolute inset-x-0 top-0 z-30 h-[2px]"
            style={{ backgroundColor: s.notif.color === "red" ? "#ff0000" : "#0066ff" }}
          />
        )}

        {/* Sky: a non-repeating vertical gradient + individual drifting
            clouds and birds. Every cloud is its own sprite at its own speed —
            nothing tiles, so the sky never looks repetitive. The desktop shell
            (transparent window) skips the gradient and keeps only the clouds
            floating over the wallpaper. */}
        {!desktopShell && (
          <div
            className="sky-gradient absolute inset-x-0 top-0 h-[28px]"
            style={{ backgroundImage: `url("${skyGradientSvg(phase)}")` }}
          />
        )}
        {skyClouds(save.startedAt, phase).map((c) => (
          <div
            key={c.key}
            className="sky-cloud pointer-events-none z-[1]"
            style={{
              top: c.topPx,
              width: c.size,
              height: c.size,
              backgroundImage: `url("${c.uri}")`,
              animationDuration: `${c.durSec}s`,
              animationDelay: `-${c.delaySec}s`,
            }}
          />
        ))}

        {/* Celestial: a pulsing sun by day, sinking low at sunset, and a
            rising moon at night (never scrolls/tiles). */}
        {celestialForPhase(phase).map((c, i) => (
          <div
            key={`${phase}-${i}`}
            className="celestial-pulse pointer-events-none absolute z-[1]"
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

        {/* Biome ambient motes — pollen, leaves or crystal sparkles drifting
            through the sky. Always animating (never gated on walking). */}
        {ambientParticles(biome.id, save.startedAt, phase).map((p, i) => (
          <span
            key={`amb-${i}`}
            className={`ambient-${p.kind} pointer-events-none absolute z-[2]`}
            style={
              {
                left: `${p.leftPct}%`,
                top: p.topPx,
                width: p.sizePx,
                height: p.sizePx,
                backgroundColor: p.color,
                animationDuration: `${p.durSec}s`,
                animationDelay: `${p.delaySec}s`,
                "--sway": `${p.swayPx}px`,
              } as React.CSSProperties
            }
          />
        ))}

        {/* Parallax scenery — three pixel layers, scroll only while walking */}
        <div
          className="absolute inset-x-0 bottom-0 h-[24px]"
          style={{ animationPlayState: walking ? "running" : "paused" }}
        >
          {/* far: hill / canopy / rock silhouette band above the grass */}
          <div
            className="scenery-scroll-far absolute inset-x-0 h-[16px]"
            style={{
              backgroundImage: `url("${backdropSvg(biome)}")`,
              animationDuration: "14s",
              bottom: 8,
            }}
          />
          {/* mid: grass strip + tufts + biome props (flowers/mushrooms/crystals) */}
          <div
            className="scenery-scroll absolute inset-x-0 h-[12px]"
            style={{
              backgroundImage: `url("${scenerySvg(biome)}")`,
              animationDuration: "9s",
              bottom: 8,
            }}
          />
          {/* near: dirt + soil + pebbles, fastest scroll */}
          <div
            className="ground-scroll absolute inset-x-0 bottom-0 h-[8px]"
            style={{ backgroundImage: `url("${groundSvg(biome)}")` }}
          />
          {phaseTint !== "transparent" && (
            <div className="night-tint absolute inset-0" style={{ backgroundColor: phaseTint }} />
          )}
        </div>

        {/* Merchant NPC (every 10 victories) */}
        {s.merchant && (
          <button
            onClick={openMerchant}
            className="nb-btn absolute right-24 top-1 z-20 flex h-10 w-10 items-center justify-center text-lg"
            title="Traveling Merchant"
          >
            🧙
          </button>
        )}

        {/* Nurse Joy NPC (every 5 victories, briefly) — opens the Center */}
        {s.nurseJoy && walking && (
          <button
            onClick={openNurseJoy}
            className="nurse-bob absolute right-36 top-1 z-20 flex h-10 w-10 items-center justify-center border-2 border-ink bg-white"
            title="Nurse Joy"
          >
            <img
              src={nurseJoySprite(24)}
              alt=""
              className="h-6 w-6 pixelated"
            />
          </button>
        )}

        {/* Ground pickup item */}
        {s.groundItem && walking && (
          <button
            onClick={pickGroundItem}
            className="item-bob absolute z-20 h-4 w-4"
            style={{ left: s.groundItem.x, bottom: 14 }}
            title={tr("pickup-title")}
          >
            <span className="pokeball-pixel block h-3.5 w-3.5" />
            <span className="item-shine pointer-events-none absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full border border-ink bg-yellow-300" />
          </button>
        )}

        {/* Walking leader */}
        {leader && s.phase !== "battle" && (
          <>
            {/* grounding shadow */}
            <div
              className={`${SPRITE_SHADOW_CLASS} bottom-1 z-[5]`}
              style={{ left: s.leaderX + 6 }}
            />
            {/* walking dust — puff size matches the gait (see DUST_LEVEL_PX) */}
            {s.dust.map((d) => (
              <span
                key={d.key}
                className={`${DUST_PUFF_CLASS} bottom-2 z-[5]`}
                style={{
                  left: d.x + (d.side === "enemy" ? 2 : 4),
                  width: d.size,
                  height: d.size,
                }}
              />
            ))}
          <img
            src={leaderSprite}
            alt=""
            className={`absolute bottom-1 z-10 h-10 w-10 pixelated ${idling ? idleClass : walkClass}`}
            style={
              {
                left: s.leaderX,
                transform: s.dir === -1 ? "scaleX(-1)" : undefined,
                // Idle AND walk keyframes scale by this so the flip is kept.
                "--flip": s.dir === -1 ? -1 : 1,
              } as React.CSSProperties
            }
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              if (el.src.includes("-shiny")) {
                el.src = urlSpriteWalking(leader.speciesId);
              } else {
                el.src = placeholderSprite(leader.speciesId);
              }
            }}
          />
          {/* Debug readout while the tray pause freezes the game: the leader's
              localized species + its species-specific idle AND walk classes. */}
          {s.paused && (
            <div className="pointer-events-none absolute left-1 top-6 z-30">
              <div className="nb-panel px-1.5 py-0.5 text-[6px] text-ink">
                {trName(leader.speciesId)} · {idleClass} / {walkClass} / {poseClass}
              </div>
            </div>
          )}
          </>
        )}

        {/* Approach: wild pokémon moving in from the right */}
        {s.phase === "approach" && s.enemy && (
          <>
            {/* grounding shadow */}
            <div
              className="sprite-shadow absolute bottom-1 z-[5] h-1.5 w-7"
              style={{ left: s.enemy.x + 6 }}
            />
          <img
            src={urlSpriteCombat(s.enemy.pokemon.speciesId)}
            alt=""
            className={`absolute bottom-1 z-10 h-10 w-10 pixelated ${walkAnimClass(s.enemy.pokemon.speciesId)}`}
            style={
              {
                left: s.enemy.x,
                transform: "scaleX(-1)",
                // Keep the mirror while the species walk gait plays.
                "--flip": -1,
              } as React.CSSProperties
            }
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = placeholderSprite(
                s.enemy!.pokemon.speciesId,
              );
            }}
          />
          </>
        )}

        {/* Battle: leader left, enemy right, HP bars above */}
        {inBattle && s.battle && (
          <>
            {/* VS! pop on battle start / switch-in */}
            {s.vsFlash && vsFlashActive(s.vsFlash.key, Date.now()) && (
              <div
                key={s.vsFlash.key}
                className="vs-pop pointer-events-none absolute inset-x-0 top-2 z-40 text-center text-base font-bold text-ink"
              >
                VS!
              </div>
            )}
            {/* Floating damage numbers for this tick */}
            {s.dmgFx.map((d) => (
              <div
                key={d.key}
                className={`dmg-pop pointer-events-none absolute z-40 text-[9px] font-bold ${dmgFxClass(d.kind)}`}
                style={d.side === "enemy" ? { right: 42, top: 22 } : { left: 42, top: 22 }}
              >
                {dmgFxLabel(d.kind, d.amount)}
              </div>
            ))}
            {/* Status effect icons above the sprites */}
            {s.battle.leader.status !== "none" && (
              <StatusIcon status={s.battle.leader.status} side="leader" />
            )}
            {s.battle.enemy.status !== "none" && (
              <StatusIcon status={s.battle.enemy.status} side="enemy" />
            )}
            {/* leader */}
            <div
              className="absolute bottom-1 z-10"
              style={{ left: 50 }}
            >
              <div className={`${SPRITE_SHADOW_CLASS} bottom-0 left-1 z-0`} />
              <HpBar hp={s.battle.leader.hp} max={s.battle.leader.maxHp} flashing={s.hpFlash === "leader"} />
              <div className={s.lunge === "leader" ? "lunge-left" : ""}>
                <div
                  className={"inline-block " + combatPoseClass(s.battle.leader.speciesId) + (s.flinch === "leader" ? " " + flinchClass(combatPoseClass(s.battle.leader.speciesId)) : "")}
                  style={{ "--flip": 1 } as React.CSSProperties}
                >
                <img
                  src={
                    s.battle.leader.shiny
                      ? urlSpriteShiny(s.battle.leader.speciesId)
                      : urlSpriteCombat(s.battle.leader.speciesId)
                  }
                  alt=""
                  className={`h-10 w-10 pixelated ${s.battle.leader.shiny ? "shiny-glow" : ""}`}
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    if (el.src.includes("-shiny")) {
                      el.src = urlSpriteCombat(s.battle!.leader.speciesId);
                    } else {
                      el.src = placeholderSprite(s.battle!.leader.speciesId);
                    }
                  }}
                />
                </div>
              </div>
            </div>
            {/* enemy */}
            <div
              className="absolute bottom-1 z-10"
              style={{ right: 50 }}
            >
              <div className={`${SPRITE_SHADOW_CLASS} bottom-0 right-1 z-0`} />
              <HpBar hp={s.battle.enemy.hp} max={s.battle.enemy.maxHp} flashing={s.hpFlash === "enemy"} />
              <div className={s.lunge === "enemy" ? "lunge-right" : ""}>
                <div
                  className={"inline-block " + combatPoseClass(s.battle.enemy.speciesId) + (s.flinch === "enemy" ? " " + flinchClass(combatPoseClass(s.battle.enemy.speciesId)) : "")}
                  style={{ "--flip": -1 } as React.CSSProperties}
                >
                <img
                  src={
                    s.battle.enemy.shiny
                      ? urlSpriteShiny(s.battle.enemy.speciesId)
                      : urlSpriteCombat(s.battle.enemy.speciesId)
                  }
                  alt=""
                  className={`h-10 w-10 pixelated ${s.battle.enemy.shiny ? "shiny-glow" : ""}`}
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    if (el.src.includes("-shiny")) {
                      el.src = urlSpriteCombat(s.battle!.enemy.speciesId);
                    } else {
                      el.src = placeholderSprite(s.battle!.enemy.speciesId);
                    }
                  }}
                />
                </div>
              </div>
            </div>

            {/* Attack animation: type-colored impact burst + move name */}
            {s.moveFx && (
              <div
                key={s.moveFx.key}
                className="pointer-events-none absolute z-30"
                style={
                  s.moveFx.side === "enemy"
                    ? { right: 60, bottom: 34 }
                    : { left: 60, bottom: 34 }
                }
              >
                <div
                  className="impact-burst flex h-8 w-8 items-center justify-center text-sm"
                  style={{ color: s.moveFx.color }}
                >
                  {s.moveFx.glyph}
                </div>
                <div
                  className="move-name-pop mx-auto mt-0.5 w-max border-2 border-ink bg-white px-1 py-0.5 text-[6px] uppercase"
                  style={{ borderColor: s.moveFx.color }}
                >
                  {s.moveFx.text}
                </div>
              </div>
            )}

            {/* Capture button — near the opponent */}
            <button
              onClick={tryCapture}
              className="nb-btn absolute z-20 flex items-center gap-1"
              style={{ right: 52, bottom: 44 }}
              disabled={(save.inventory.greatball ?? 0) + (save.inventory.pokeball ?? 0) <= 0}
            >
              <span className="pokeball-pixel inline-block h-2.5 w-2.5" />
              {(save.inventory.greatball ?? 0) > 0
                ? `${tr("great")} ×${save.inventory.greatball}`
                : `${tr("ball")} ×${save.inventory.pokeball ?? 0}`}
            </button>

            {/* Heal buttons — next to the leader */}
            <div className="absolute z-20 flex gap-1" style={{ left: 52, bottom: 44 }}>
              <button
                onClick={() => healItem("berry")}
                className="nb-btn"
                disabled={(save.inventory.berry ?? 0) <= 0}
              >
                {tr("oran")} ×{save.inventory.berry ?? 0}
              </button>
              <button
                onClick={() => healItem("sitrus")}
                className="nb-btn"
                disabled={(save.inventory.sitrus ?? 0) <= 0}
              >
                {tr("sitrus")} ×{save.inventory.sitrus ?? 0}
              </button>
            </div>
          </>
        )}

        {/* Capture sequence: the thrown ball replaces the enemy + wobbles */}
        {s.phase === "capture" && s.captureAnim && (
          <>
            <div className="absolute bottom-1 z-10 h-10 w-10" style={{ right: 50 }}>
              <div
                key={s.captureAnim.key}
                className="ball-wobble flex h-full w-full items-center justify-center"
                style={{ animationDuration: `${ballWobbleSec(s.captureAnim.success)}s` }}
              >
                <span className="pokeball-pixel block h-6 w-6" />
              </div>
            </div>
            {s.captureAnim.success && (
              <div className="pointer-events-none absolute z-30" style={{ right: 42, bottom: 38 }}>
                {sparkleBurst({
                  colors: ["#ffffff", "#ffd21f"],
                  spacingPx: 7,
                  delayMs: 80,
                }).map((sp, i) => (
                  <span
                    key={i}
                    className="sparkle absolute text-[9px]"
                    style={{
                      left: `${sp.leftPx}px`,
                      animationDelay: `${sp.delaySec}s`,
                      color: sp.color,
                    }}
                  >
                    {sp.glyph}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {/* Level-up sparkle burst at the leader */}
        {s.levelUpFx && levelUpFxActive(s.levelUpFx.key, Date.now()) && leader && (
          <div
            key={s.levelUpFx.key}
            className="pointer-events-none absolute z-30"
            style={{ left: s.leaderX, bottom: 40 }}
          >
            {sparkleBurst({
              colors: ["#7dd3fc", "#ffd21f"],
              spacingPx: 6,
              delayMs: 70,
            }).map((sp, i) => (
              <span
                key={i}
                className="sparkle absolute text-[9px]"
                style={{
                  left: `${sp.leftPx}px`,
                  animationDelay: `${sp.delaySec}s`,
                  color: sp.color,
                }}
              >
                {sp.glyph}
              </span>
            ))}
          </div>
        )}

        {/* Per-species evolution animation overlay */}
        {s.phase === "evolving" && s.evoFx && (
          <>
            {/* white flash covering the sprite */}
            <div className="evo-flash absolute inset-0 z-20 bg-white" />
            {/* themed particles rising from the evolving Pokémon */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="evo-particle z-20 h-1.5 w-1.5 border border-ink"
                style={{
                  left: `${28 + i * 6}%`,
                  backgroundColor: i % 2 === 0 ? s.evoFx!.color : s.evoFx!.accent,
                  animationDelay: `${(i * 0.15).toFixed(2)}s`,
                }}
              />
            ))}
            {/* expanding ring in the species' color */}
            <div
              className="evo-ring z-20 h-8 w-8"
              style={{ left: "44%", top: 14, color: s.evoFx.color }}
            />
            {/* glyph marker */}
            <div
              className="absolute z-20 text-sm"
              style={{ left: "52%", top: 8, color: s.evoFx.color }}
            >
              {s.evoFx.glyph}
            </div>
          </>
        )}

        {/* Hidden easter egg: the time-traveler's egg (Celebi) */}
        {eggReady && (
          <button
            onClick={hatchEgg}
            className="egg-wiggle absolute left-1/2 top-6 z-30 flex h-6 w-6 -translate-x-1/2 items-center justify-center border-2 border-ink bg-white text-[10px]"
            title={tr("egg-title")}
          >
            🥚
          </button>
        )}

        {/* Starter selection screen */}
        {s.phase === "choose" && (
          <div className="game-sky absolute inset-0 z-40 flex items-center justify-center gap-3">
            {["bulbasaur", "charmander", "squirtle"].map((id) => (
              <button
                key={id}
                onClick={() => chooseStarter(id)}
                className="nb-btn flex h-12 w-20 flex-col items-center justify-center gap-0.5 bg-white"
              >
                <img
                  src={urlSpriteWalking(id)}
                  alt={id}
                  className="h-7 w-7 pixelated"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = placeholderSprite(id);
                  }}
                />
                <span className="text-[6px] uppercase">
                  {id === "bulbasaur"
                    ? `🌱 ${tr("grass-starter")}`
                    : id === "charmander"
                      ? `🔥 ${tr("fire-starter")}`
                      : `💧 ${tr("water-starter")}`}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Center message (level up, capture, evolution, rewards) */}
        {s.message && (
          <div className="pointer-events-none absolute inset-x-0 top-1 z-30 flex justify-center">
            <div className="nb-panel px-2 py-1 text-[7px] leading-3 text-ink" style={{ background: "#fff" }}>
              {s.message}
            </div>
          </div>
        )}

        {/* Tray pause chip */}
        {s.paused && (
          <div className="pointer-events-none absolute left-1 top-1 z-30">
            <div className="nb-panel px-1.5 py-0.5 text-[6px] text-ink">⏸ {tr("paused")}</div>
          </div>
        )}

        {/* Right-side buttons */}
        <div className="absolute right-1 top-1 z-30 flex gap-1">
          {s.arenaAvailable && (
            <button
              onClick={() => openPanel("arena")}
              className="nb-btn arena-pulse bg-red-400"
            >
              ⚔ {tr("arena")}
            </button>
          )}
          <button
            onClick={cycleLanguage}
            className="nb-btn bg-white"
            title={tr("rank-title")}
          >
            🌐 {LANG_LABELS[save.language]}
          </button>
          <button onClick={() => openPanel("items")} className="nb-btn bg-yellow-300">
            {tr("bag")}
          </button>
          <button onClick={() => openPanel("save")} className="nb-btn bg-blue-300">
            {tr("menu")}
          </button>
        </div>
      </div>

      {/* Below the banner: white expanse hosting the panels */}
      <div id="game-panel-area" className="relative flex-1 overflow-hidden bg-white">
        {s.panel && (
          <GamePanels
            save={save}
            tab={s.panel}
            champion={CHAMPIONS[save.championWins % CHAMPIONS.length]}
            onClose={() => {
              const x = g.current!;
              x.panel = null;
              rerender();
            }}
            onSetTab={(t) => openPanel(t)}
            onUseItem={onUseItem}
            onBuy={onBuy}
            onSetLeader={onSetLeader}
            onAddToTeam={onAddToTeam}
            onRemoveFromTeam={onRemoveFromTeam}
            onViewDetails={onViewDetails}
            onChallengeChampion={challengeChampion}
            onCenterService={onCenterService}
            onSellPokemon={onSellPokemon}
            onBuyMarketMon={onBuyMarketMon}
            onListMarketMon={onListMarketMon}
            onReturnMarketMon={onReturnMarketMon}
            onExport={onExport}
            onImport={onImport}
            onReset={onReset}
            onSetLanguage={(lang) => {
              const x = g.current!;
              x.save = { ...x.save, language: lang };
              persist();
              rerender();
            }}
            onSetDustTrail={(on) => {
              const x = g.current!;
              x.save = { ...x.save, dustTrail: on };
              if (!on) x.dust = [];
              persist();
              rerender();
            }}
            onClearDetails={() => {
              const x = g.current!;
              x.detailsMon = null;
              rerender();
            }}
            detailsMon={s.detailsMon}
          />
        )}
      </div>
    </div>
  );
}

function HpBar({
  hp,
  max,
  flashing,
}: {
  hp: number;
  max: number;
  flashing: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (hp / Math.max(1, max)) * 100));
  return (
    <div className="relative mb-0.5 h-[7px] w-12 border-2 border-ink bg-white">
      <div
        className={`h-full ${flashing ? "hp-flash" : ""} ${
          pct > 50 ? "bg-green-500" : pct > 20 ? "bg-yellow-400" : "bg-red-500"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function purchaseItemLocal(
  s: GameRef,
  itemId: string,
  price: number,
  qty: number,
): { ok: boolean; save: SaveData } {
  const cost = price * qty;
  if (s.save.money < cost) return { ok: false, save: s.save };
  return {
    ok: true,
    save: normalizeSave({
      ...s.save,
      money: s.save.money - cost,
      inventory: {
        ...s.save.inventory,
        [itemId]: (s.save.inventory[itemId] ?? 0) + qty,
      },
    }),
  };
}

function makeChampionEncounter(championWins: number, leaderLevel: number): Encounter {
  return setupChampion(leaderLevel, championWins);
}

