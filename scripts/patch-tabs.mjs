// One-off v1.8.0 patch for panels-tabs.tsx.
import { readFileSync, writeFileSync } from "node:fs";

const p = "src/game/panels-tabs.tsx";
let s = readFileSync(p, "utf8");

const subs = [
  // 1. imports
  [
    'import { CHAMPIONS, GAME_VERSION, ITEMS, TUNING, getSpecies } from "./constants";',
    'import { BIOMES, CHAMPIONS, GAME_VERSION, ITEMS, TUNING, getSpecies } from "./constants";',
  ],
  [
    'import { LANG_LABELS, LANGS, t } from "./i18n";',
    'import { badgeDamageBonus } from "./engine";\nimport { LANG_LABELS, LANGS, t } from "./i18n";',
  ],
  // 2. ShopTab: add the Mystery Egg
  [
    '        {["pokeball", "greatball", "berry", "sitrus", "potion", "hyperpotion"].map(',
    '        {["pokeball", "greatball", "berry", "sitrus", "potion", "hyperpotion", "egg"].map(',
  ],
  // 3. CodexTab guide bullets — v1.8.0 facts
  [
    '          <li>• Wild Pokémon appear at a random 5–20s rhythm — win for XP & ₽.</li>\n          <li>• Capture low-HP foes with Poké Balls; Great Balls catch better.</li>\n          <li>• 6 badges from the Arena add +5% team damage each.</li>\n          <li>• Biomes rotate every 500 steps; night-only species appear after dark.</li>\n          <li>• Team Rocket (rare) drops big money or a Great Ball.</li>\n          <li>• The Pokémon Center heals your team for free.</li>',
    '          <li>• Wild Pokémon appear at a random 5–20s rhythm — win for XP & ₽.</li>\n          <li>• Capture low-HP foes with Poké Balls; Great Balls catch better.</li>\n          <li>• 8 badges from the Arena add +5% team damage each.</li>\n          <li>• Eclipse & Aurora events summon Legendary Bosses — huge rewards.</li>\n          <li>• Eggs hatch while you walk; pick your banner biome in Settings.</li>\n          <li>• Team Rocket (rare) drops big money or a Great Ball.</li>\n          <li>• The Pokémon Center heals your team for free.</li>',
  ],
  // 4. Append CareerTab + EggsTab after SettingsTab (end of file)
  [
    'export function SettingsTab(props: GamePanelsProps) {',
    '// ---------------------------------------------------------------------------\n// CareerTab — lifetime stats + the 8 Kanto badges (v1.8.0)\n// ---------------------------------------------------------------------------\n\nexport function CareerTab(props: GamePanelsProps) {\n  const { save } = props;\n  const lang = save.language;\n  const bonus = Math.round((badgeDamageBonus(save.badges.length) - 1) * 100);\n  const caught = Object.values(save.pokedex).filter((v) => v === "caught").length;\n  const stats: [string, string | number][] = [\n    ["Battles won", save.battlesWon],\n    ["Battles lost", save.battlesLost],\n    ["Captures", save.captures],\n    ["Shinies seen", save.shiniesSeen],\n    ["Team Rocket", save.rocketsDefeated],\n    ["Champions beaten", save.championWins],\n    ["Legendaries defeated", save.legendariesDefeated],\n    ["Eggs hatched", save.eggsHatched],\n    ["Steps walked", save.steps],\n    ["₽ earned", save.moneyEarned],\n    ["Dex caught", caught],\n  ];\n  return (\n    <div className="space-y-2 text-[7px]">\n      <div className="border-2 border-ink bg-blue-100 p-1.5">\n        <div className="font-bold uppercase">🏆 {t(lang, "career-title")}</div>\n        <div className="text-ink/70">Lifetime record for this save file.</div>\n      </div>\n      <div className="border-2 border-ink bg-white p-1.5">\n        <div className="mb-1 font-bold uppercase">\n          {t(lang, "career-badges")} ({save.badges.length}/{CHAMPIONS.length})\n        </div>\n        <div className="grid grid-cols-4 gap-1">\n          {CHAMPIONS.map((c) => {\n            const earned = save.badges.includes(c.badge);\n            return (\n              <div\n                key={c.id}\n                className={`border-2 p-1 text-center ${earned ? "border-ink" : "border-gray-300"}`}\n                style={earned ? { backgroundColor: c.color } : { backgroundColor: "#f1f1f1" }}\n                title={`${c.badge} — ${c.name}`}\n              >\n                <div className={`text-[8px] leading-3 ${earned ? "" : "opacity-30 grayscale"}`}>\n                  ★\n                </div>\n                <div\n                  className={`truncate text-[6px] ${\n                    earned ? "font-bold text-ink" : "text-ink/40"\n                  }`}\n                >\n                  {c.badge}\n                </div>\n              </div>\n            );\n          })}\n        </div>\n        <div className="mt-1 text-ink/70">\n          Each badge adds +5% team damage — current bonus: +{bonus}%.\n        </div>\n      </div>\n      <div className="border-2 border-ink bg-white p-1.5">\n        <div className="mb-1 font-bold uppercase">{t(lang, "career-stats")}</div>\n        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">\n          {stats.map(([label, value]) => (\n            <div key={label} className="border-2 border-ink bg-gray-50 p-1">\n              <div className="truncate font-bold uppercase">{label}</div>\n              <div className="text-ink/80">{value}</div>\n            </div>\n          ))}\n        </div>\n      </div>\n    </div>\n  );\n}\n\n// ---------------------------------------------------------------------------\n// EggsTab — incubating eggs and their hatching progress (v1.8.0)\n// ---------------------------------------------------------------------------\n\nexport function EggsTab(props: GamePanelsProps) {\n  const { save } = props;\n  const lang = save.language;\n  if (save.eggs.length === 0) {\n    return (\n      <div className="space-y-2 text-[7px]">\n        <div className="border-2 border-ink bg-yellow-100 p-1.5 font-bold uppercase">\n          🥚 {t(lang, "eggs-title")}\n        </div>\n        <div className="border-2 border-ink bg-white p-1.5 text-ink/80">\n          {t(lang, "eggs-empty")}\n        </div>\n      </div>\n    );\n  }\n  return (\n    <div className="space-y-2 text-[7px]">\n      <div className="border-2 border-ink bg-yellow-100 p-1.5 font-bold uppercase">\n        🥚 {t(lang, "eggs-title")} ({save.eggs.length})\n      </div>\n      {save.eggs.map((e, i) => {\n        const pct = Math.max(\n          0,\n          Math.min(100, ((e.needed - e.steps) / Math.max(1, e.needed)) * 100),\n        );\n        return (\n          <div key={i} className="flex items-center gap-2 border-2 border-ink bg-white p-1.5">\n            <span className="egg-wiggle flex h-6 w-6 items-center justify-center border-2 border-ink bg-white text-[10px]">\n              🥚\n            </span>\n            <div className="flex-1">\n              <div className="flex items-center justify-between">\n                <span className="font-bold uppercase">???</span>\n                <span className="text-ink/60">\n                  {e.steps}/{e.needed} {e.steps === 1 ? "step" : "steps"}\n                </span>\n              </div>\n              <div className="mt-0.5 h-2 border-2 border-ink bg-white">\n                <div className="h-full bg-yellow-400" style={{ width: `${pct}%` }} />\n              </div>\n            </div>\n          </div>\n        );\n      })}\n      <div className="text-ink/70">{t(lang, "eggs-hint")}</div>\n    </div>\n  );\n}\n\n// ---------------------------------------------------------------------------\n\nexport function SettingsTab(props: GamePanelsProps) {',
  ],
  // 5. SettingsTab: biome picker after the dust toggle block
  [
    '          <button\n            className={`nb-btn !px-2 ${dustOn ? "bg-green-300" : "bg-gray-200"}`}\n            onClick={() => props.onSetDustTrail(!dustOn)}\n          >\n            {dustOn ? t(lang, "on") : t(lang, "off")}\n          </button>\n        </div>\n      </div>\n    </div>\n  );\n}',
    '          <button\n            className={`nb-btn !px-2 ${dustOn ? "bg-green-300" : "bg-gray-200"}`}\n            onClick={() => props.onSetDustTrail(!dustOn)}\n          >\n            {dustOn ? t(lang, "on") : t(lang, "off")}\n          </button>\n        </div>\n      </div>\n      <div className="border-2 border-ink bg-white p-1.5">\n        <div className="mb-1 font-bold uppercase">🌍 {t(lang, "biome-title")}</div>\n        <div className="flex flex-wrap gap-1">\n          <button\n            className={`nb-btn !px-1.5 ${\n              props.save.biome === "auto" ? "bg-yellow-300" : "bg-gray-100"\n            }`}\n            onClick={() => props.onSetBiome("auto")}\n          >\n            🔄 {t(lang, "biome-auto")}\n          </button>\n          {BIOMES.map((b) => (\n            <button\n              key={b.id}\n              className={`nb-btn !px-1.5 ${\n                props.save.biome === b.id ? "bg-yellow-300" : "bg-gray-100"\n              }`}\n              onClick={() => props.onSetBiome(b.id)}\n            >\n              {b.name}\n            </button>\n          ))}\n        </div>\n        <div className="mt-1 text-ink/60">\n          Pick a backdrop — "Auto" keeps the 500-step rotation.\n        </div>\n      </div>\n    </div>\n  );\n}',
  ],
];

let ok = 0;
const fail = [];
for (const [o, n] of subs) {
  const i = s.indexOf(o);
  if (i >= 0) {
    s = s.slice(0, i) + n + s.slice(i + o.length);
    ok++;
  } else {
    fail.push(o.slice(0, 70));
  }
}
writeFileSync(p, s);
console.log("ok", ok, "fail", fail.length);
fail.forEach((f) => console.log("FAIL:", f));
