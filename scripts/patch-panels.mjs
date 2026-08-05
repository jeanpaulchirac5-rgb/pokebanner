// One-off v1.8.0 patch for panels.tsx (written via write_file to avoid shell quoting hell).
import { readFileSync, writeFileSync } from "node:fs";

const p = "src/game/panels.tsx";
let s = readFileSync(p, "utf8");

const subs = [
  // 1. PanelTab union
  [
    '  | "code"\n  | "news"\n  | "save"\n  | "settings";',
    '  | "code"\n  | "news"\n  | "save"\n  | "settings"\n  | "career"\n  | "eggs";',
  ],
  // 2. TABS
  [
    '  { id: "items", label: "BAG" },\n  { id: "team", label: "PC" },\n  { id: "dex", label: "DEX" },',
    '  { id: "items", label: "BAG" },\n  { id: "team", label: "PC" },\n  { id: "dex", label: "DEX" },\n  { id: "career", label: "CAREER" },\n  { id: "eggs", label: "EGGS" },',
  ],
  // 3. GamePanels switch
  [
    '      {tab === "team" && <TeamTab {...props} />}\n      {tab === "dex" && <DexTab {...props} />}',
    '      {tab === "team" && <TeamTab {...props} />}\n      {tab === "dex" && <DexTab {...props} />}\n      {tab === "career" && <CareerTab {...props} />}\n      {tab === "eggs" && <EggsTab {...props} />}',
  ],
  // 4. panels-tabs import
  [
    'import { ArenaTab, CodexTab, NewsTab, SaveTab, SettingsTab, ShopTab } from "./panels-tabs";',
    'import { ArenaTab, CareerTab, CodexTab, EggsTab, NewsTab, SaveTab, SettingsTab, ShopTab } from "./panels-tabs";',
  ],
  // 5. engine import
  [
    'import {\n  badgeDamageBonus,\n  dexMilestonesEarned,\n  dexRarity,\n  marketValueOf,\n  pokedexMilestone,\n  xpNeeded,\n} from "./engine";',
    'import {\n  badgeDamageBonus,\n  dexMilestonesEarned,\n  dexRarity,\n  learnsetFor,\n  marketValueOf,\n  pokedexMilestone,\n  xpNeeded,\n} from "./engine";',
  ],
  // 6. i18n import
  [
    'import {\n  dexFlavor,\n  localizedItemName,\n  localizedName,\n  t,\n} from "./i18n";',
    'import {\n  dexFlavor,\n  localizedItemName,\n  localizedMoveName,\n  localizedName,\n  t,\n} from "./i18n";',
  ],
  // 7. Insert <MovesSection> at the end of DetailsView (after the berries block),
  // then append the MovesSection component definition after DetailsView's closing brace.
  [
    '            • {ITEMS[b].name}: {ITEMS[b].desc}\n          </div>\n        ))}\n      </div>\n    </div>\n  );\n}\n',
    '            • {ITEMS[b].name}: {ITEMS[b].desc}\n          </div>\n        ))}\n      </div>\n      <MovesSection mon={mon} save={save} idx={idx} onSetMoves={onSetMoves} />\n    </div>\n  );\n}\n\nfunction MovesSection({\n  mon,\n  save,\n  idx,\n  onSetMoves,\n}: {\n  mon: Pokemon;\n  save: SaveData;\n  idx: number | null;\n  onSetMoves: (pcIndex: number, moves: string[]) => void;\n}) {\n  if (idx === null) return null;\n  const lang = save.language;\n  const learnset = learnsetFor(mon);\n  const configured = mon.moves ?? [];\n  const toggle = (moveId: string) => {\n    const cur = [...configured];\n    if (cur.includes(moveId)) {\n      onSetMoves(idx, cur.filter((m) => m !== moveId));\n    } else if (cur.length < 2) {\n      onSetMoves(idx, [...cur, moveId]);\n    } else {\n      // both slots full: replace the second slot\n      onSetMoves(idx, [cur[0], moveId]);\n    }\n  };\n  return (\n    <div className="border-2 border-ink bg-white p-1.5">\n      <div className="mb-1 font-bold uppercase">{t(lang, "moves-title")}</div>\n      <div className="mb-1 flex gap-1">\n        {[0, 1].map((slot) => {\n          const id = configured[slot];\n          const move = id ? MOVES[id] : null;\n          return (\n            <div\n              key={slot}\n              className={`flex-1 border-2 border-ink p-1 text-center ${\n                move ? "bg-yellow-100" : "bg-gray-50"\n              }`}\n            >\n              {move ? (\n                <>\n                  <div className="font-bold">{localizedMoveName(id, lang)}</div>\n                  <div className="text-ink/60 uppercase">\n                    {getSpecies(mon.speciesId).types.includes(move.type)\n                      ? "STAB"\n                      : move.type}\n                  </div>\n                </>\n              ) : (\n                <span className="text-ink/50">SLOT {slot + 1}</span>\n              )}\n            </div>\n          );\n        })}\n      </div>\n      <div className="grid grid-cols-2 gap-1">\n        {learnset.map((m) => (\n          <button\n            key={m.id}\n            className={`nb-btn !px-1 text-left ${\n              configured.includes(m.id) ? "bg-green-300" : "bg-gray-100"\n            }`}\n            onClick={() => toggle(m.id)}\n          >\n            {localizedMoveName(m.id, lang)}\n            <span className="ml-1 text-ink/60">P{m.power}</span>\n          </button>\n        ))}\n      </div>\n      <div className="mt-1 text-ink/70">{t(lang, "moves-hint")}</div>\n    </div>\n  );\n}\n',
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
