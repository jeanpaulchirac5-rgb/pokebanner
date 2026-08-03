#!/usr/bin/env bun
// ---------------------------------------------------------------------------
// Generates coverage-report.html from src/game/coverage-map.ts.
// Run: bun run coverage:report
// ---------------------------------------------------------------------------

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  COVERAGE_MAP,
  functionsForSuite,
  suitesForFunction,
  thinnestCoverage,
} from "../src/game/coverage-map";
import type { SuiteName } from "../src/game/coverage-map";

const SUITES: SuiteName[] = [
  "engine",
  "storage",
  "loop",
  "fuzz",
  "presentation",
  "audio",
  "sound",
  "i18n",
  "fx",
];

const SUITE_LABEL: Record<SuiteName, string> = {
  engine: "engine.test.ts",
  storage: "storage.test.ts",
  loop: "loop.test.ts",
  fuzz: "fuzz.test.ts",
  presentation: "presentation.test.ts",
  audio: "audio.test.ts",
  sound: "sound.test.ts",
  i18n: "i18n.test.ts",
  fx: "fx.test.ts",
};

const SUITE_COLOR: Record<SuiteName, string> = {
  engine: "#3ddc3d",
  storage: "#4fc3f7",
  loop: "#ffde00",
  fuzz: "#ff8a3d",
  presentation: "#c39bd3",
  audio: "#ff6f91",
  sound: "#7c6ff0",
  i18n: "#4dd0e1",
  fx: "#7cb342",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildHtml(): string {
  const functions = Object.keys(COVERAGE_MAP).sort();
  const total = functions.length;

  const rows = functions
    .map((fn) => {
      const suites = suitesForFunction(fn);
      const chips = suites
        .map(
          (s) =>
            `<span class="chip" style="background:${SUITE_COLOR[s]}">${esc(SUITE_LABEL[s])}</span>`,
        )
        .join("");
      const coverage = Math.min(100, Math.round((suites.length / SUITES.length) * 100));
      return `<tr>
        <td class="fn">${esc(fn)}</td>
        <td>${coverage}%</td>
        <td>${chips || '<span class="gap">NO SUITE — GAP</span>'}</td>
      </tr>`;
    })
    .join("\n");

  const drilldowns = SUITES.map((suite) => {
    const fns = functionsForSuite(suite);
    return `<section class="card">
      <h2 style="color:${SUITE_COLOR[suite]}">${esc(SUITE_LABEL[suite])}</h2>
      <p class="count">${fns.length} functions</p>
      <div class="tags">${fns.map((f) => `<span class="tag">${esc(f)}</span>`).join("")}</div>
    </section>`;
  }).join("\n");

  const thin = thinnestCoverage();
  const checklist = thin
    .map(
      (fn) => `<li><code>${esc(fn)}</code> — ${esc(suitesForFunction(fn).join(", "))}</li>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Poke-Banner Coverage Map</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Courier New", monospace; background: #fff; color: #111; margin: 0; }
  .wrap { max-width: 960px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 20px; text-transform: uppercase; border-bottom: 4px solid #111; padding-bottom: 8px; }
  .stat { display: inline-block; border: 2px solid #111; padding: 6px 10px; margin: 4px 6px 4px 0; background: #ffde00; font-weight: bold; }
  .card { border: 3px solid #111; box-shadow: 4px 4px 0 0 #111; padding: 14px; margin: 14px 0; }
  h2 { margin: 0 0 6px; font-size: 15px; text-transform: uppercase; }
  .count { margin: 0 0 8px; opacity: .7; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 4px 8px; border: 1px solid #999; font-size: 13px; }
  th { background: #111; color: #fff; }
  .fn { font-weight: bold; }
  .chip { display: inline-block; font-size: 10px; padding: 2px 6px; border: 2px solid #111; margin: 1px; }
  .gap { color: #b00; font-weight: bold; }
  .tags .tag { display: inline-block; font-size: 10px; border: 1px solid #111; padding: 2px 5px; margin: 2px; background: #f5f5f5; }
  .checklist { list-style: none; padding: 0; }
  .checklist li { border-bottom: 1px dashed #aaa; padding: 4px 0; font-size: 13px; }
  code { background: #eee; padding: 0 4px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>🕹 Poke-Banner — Engine &amp; Storage Coverage Map</h1>
  <p>Every pure function in <code>engine.ts</code>, <code>storage.ts</code> and
     <code>presentation.ts</code>, and which test suite exercises it.</p>
  <div class="stat">${total} functions mapped</div>
  <div class="stat">${functions.length} rows</div>
  <div class="stat">${SUITES.length} suites</div>
  <div class="stat">${thin.length} thin-coverage functions</div>

  <div class="card">
    <h2>Full map</h2>
    <table>
      <thead><tr><th>Function</th><th>Coverage</th><th>Suites</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <h1>Per-suite drill-down</h1>
  ${drilldowns}

  <h1>Maintenance checklist — thinnest coverage</h1>
  <p>Single-suite functions (most likely to break silently). Prioritize adding a
     second suite when touching these:</p>
  <div class="card">
    <ul class="checklist">
      ${checklist || "<li>None — everything has 2+ suites 🎉</li>"}
    </ul>
  </div>
</div>
</body>
</html>`;
}

const out = resolve(process.cwd(), "coverage-report.html");
writeFileSync(out, buildHtml(), "utf8");
console.log(`Coverage report written to ${out}`);
console.log(`Thinnest coverage (maintenance checklist): ${thinnestCoverage().length} functions`);
