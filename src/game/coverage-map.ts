// ---------------------------------------------------------------------------
// Coverage map: every pure engine/storage/presentation function and which
// test suite(s) exercise it. Consumed by coverage.test.ts (gap flagging) and
// scripts/coverage-report.ts (HTML report with per-suite drill-downs).
//
// Suites: "engine" | "storage" | "loop" | "fuzz" | "presentation" |
//         "audio" | "sound" | "i18n" | "fx"
// ---------------------------------------------------------------------------

export type SuiteName =
  | "engine"
  | "storage"
  | "loop"
  | "fuzz"
  | "presentation"
  | "audio"
  | "sound"
  | "i18n"
  | "fx";

export const COVERAGE_MAP: Record<string, SuiteName[]> = {
  // ---- engine.ts ----
  randomRng: ["engine", "fuzz"],
  lcg: ["engine", "fuzz"],
  statsFor: ["engine", "loop", "fuzz"],
  makePokemon: ["engine", "loop", "fuzz"],
  typeMultiplier: ["engine", "loop", "fuzz"],
  TYPE_CHART_MULT: ["engine"],
  rollDamage: ["engine", "loop", "fuzz"],
  chooseMove: ["engine", "loop"],
  applyStatusEffect: ["engine", "loop"],
  executeTurn: ["engine", "loop"],
  applyLeechTick: ["engine", "loop", "fuzz"],
  applyPoisonTick: ["engine", "loop", "fuzz"],
  doBattleTick: ["engine", "loop", "fuzz"],
  leaderMovesFor: ["engine", "loop"],
  enemyMovesFor: ["engine", "loop"],
  xpNeeded: ["engine", "loop"],
  pokedexMilestone: ["engine", "loop"],
  badgeDamageBonus: ["engine", "loop"],
  checkEvolution: ["engine", "loop"],
  evolutionFxFor: ["engine"],
  cheatScore: ["engine"],
  applyXpAndLevels: ["engine", "loop", "fuzz"],
  expShare: ["engine", "loop", "fuzz"],
  captureBallMult: ["engine", "loop"],
  captureAttempt: ["engine", "loop", "fuzz"],
  buildEncounter: ["engine", "loop", "fuzz"],
  nextEncounterDelay: ["engine"],
  biomeIndexForSteps: ["engine", "fuzz"],
  setupChampion: ["engine", "loop"],
  makeWildEnemy: ["engine", "loop", "fuzz"],
  markPokedex: ["engine", "loop", "fuzz"],
  markShinyCaught: ["engine"],
  dexMilestonesEarned: ["engine"],
  dexRarity: ["engine"],
  computeVictoryRewards: ["engine", "loop"],
  championBookkeeping: ["engine", "loop"],
  rocketReward: ["engine", "loop"],
  purchaseItem: ["engine", "loop", "fuzz"],
  applyItemOn: ["engine", "loop"],
  pickupGroundItem: ["engine", "loop"],
  easterEggUnlocked: ["engine", "loop"],
  applyCenterService: ["engine", "loop"],
  marketValueOf: ["engine", "loop"],
  switchLeader: ["engine", "loop", "fuzz"],
  addToPc: ["engine", "loop"],
  addToTeam: ["engine", "loop"],
  timePhase: ["engine", "loop"],
  weatherFor: ["engine"],
  weatherEncounterMult: ["engine"],
  createSave: ["engine", "loop", "fuzz"],
  normalizeSave: ["engine", "storage", "fuzz"],
  normalizePokemon: ["engine", "storage", "fuzz"],
  migrateV1: ["storage", "fuzz"],
  pokedexCounts: ["engine"],
  dexSize: ["engine"],
  isStarterOrEvolution: ["engine"],
  // ---- storage.ts ----
  checksum: ["storage"],
  isValidSave: ["storage", "fuzz"],
  loadSave: ["storage", "fuzz"],
  persistSave: ["storage", "loop", "fuzz"],
  clearSave: ["storage", "loop"],
  exportSave: ["storage", "loop"],
  importSave: ["storage", "loop"],
  roundTrip: ["storage", "fuzz"],
  getPreferredLanguage: ["storage"],
  setPreferredLanguage: ["storage"],
  // ---- i18n.ts (four-language dictionaries) ----
  isLanguage: ["i18n"],
  t: ["i18n"],
  uiKeys: ["i18n"],
  localizedName: ["i18n"],
  dexFlavor: ["i18n"],
  localizedMoveName: ["i18n"],
  localizedItemName: ["i18n"],
  localizedChampionName: ["i18n"],
  // ---- fx.ts (battle-presentation FX helpers) ----
  vsFlashActive: ["fx"],
  logHasCrit: ["fx"],
  logHasSuper: ["fx"],
  logHasWeak: ["fx"],
  logHasMiss: ["fx"],
  logHasStatus: ["fx"],
  computeDmgFx: ["fx"],
  dmgFxLabel: ["fx"],
  dmgFxClass: ["fx"],
  statusIconFor: ["fx"],
  captureAnimMs: ["fx"],
  ballWobbleSec: ["fx"],
  levelUpFxActive: ["fx"],
  sparkleBurst: ["fx"],
  dustAccumulate: ["fx"],
  pushDust: ["fx"],
  expireDust: ["fx"],
  // ---- presentation.ts ----
  toEnglishId: ["presentation"],
  urlSpriteWalking: ["presentation"],
  urlSpriteCombat: ["presentation"],
  urlSpriteOpponent: ["presentation"],
  urlSpriteShiny: ["presentation"],
  spriteScaleFor: ["presentation"],
  idleAnimClass: ["presentation"],
  walkAnimClass: ["presentation"],
  walkDustFor: ["presentation"],
  combatPoseClass: ["presentation"],
  flinchClass: ["presentation"],
  moveFxById: ["presentation"],
  moveFxByMove: ["presentation"],
  moveFxByName: ["presentation"],
  placeholderSprite: ["presentation"],
  nurseJoySprite: ["presentation"],
  preloadSprites: ["presentation"],
  backdropSvg: ["presentation"],
  scenerySvg: ["presentation"],
  groundSvg: ["presentation"],
  skySvg: ["presentation"],
  cloudsSvg: ["presentation"],
  skyGradientSvg: ["presentation"],
  skyClouds: ["presentation"],
  skyColorFor: ["presentation"],
  ambientParticles: ["presentation"],
  weatherTint: ["presentation"],
  weatherParticles: ["presentation"],
  sunSvg: ["presentation"],
  moonSvg: ["presentation"],
  celestialForPhase: ["presentation"],
  // ---- sound.ts (chiptune engine) ----
  noteToFrequency: ["sound"],
  transposeTone: ["sound"],
  validatePattern: ["sound"],
  sfxDurationMs: ["sound"],
  toneEnvelope: ["sound"],
  nightify: ["sound"],
  resolveBgmKey: ["sound"],
  setBgmTheme: ["sound"],
  getBgmTheme: ["sound"],
  setBgmEnabled: ["sound"],
  isBgmEnabled: ["sound"],
  bgmLabel: ["sound"],
  unlockAudio: ["sound"],
  playSfx: ["sound"],
  startBgm: ["sound"],
  stopBgm: ["sound"],
  isBgmPlaying: ["sound"],
  // ---- audio.ts (desktop tray volume controller) ----
  clampVolume: ["audio"],
  setVolume: ["audio"],
  getVolume: ["audio"],
  setMuted: ["audio"],
  isMuted: ["audio"],
  effectiveVolume: ["audio"],
  stepVolume: ["audio"],
  toggleMuted: ["audio"],
  volumeLabel: ["audio"],
  subscribe: ["audio"],
  snapshot: ["audio"],
  // audio.ts and sound.ts both export a test-reset helper under this name
  _resetForTests: ["audio", "sound"],
};

/** Functions covered by exactly one suite — the "thinnest coverage" list. */
export function thinnestCoverage(): string[] {
  return Object.entries(COVERAGE_MAP)
    .filter(([, suites]) => suites.length === 1)
    .map(([fn]) => fn)
    .sort();
}

/** Functions with no recorded suite — hard gaps. */
export function coverageGaps(): string[] {
  return Object.entries(COVERAGE_MAP)
    .filter(([, suites]) => suites.length === 0)
    .map(([fn]) => fn)
    .sort();
}

/** All function names the map knows about. */
export function coveredFunctions(): string[] {
  return Object.keys(COVERAGE_MAP).sort();
}

/** Per-suite drill-down for the report. */
export function suitesForFunction(fn: string): SuiteName[] {
  return COVERAGE_MAP[fn] ?? [];
}

export function functionsForSuite(suite: SuiteName): string[] {
  return Object.entries(COVERAGE_MAP)
    .filter(([, suites]) => suites.includes(suite))
    .map(([fn]) => fn)
    .sort();
}
