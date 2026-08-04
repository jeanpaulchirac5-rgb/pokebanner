# Publishing Poke-Banner — release checklist

Publishing never locks the project. The repo stays the source of truth; a
release is just a version bump + a git tag. Follow this checklist top to
bottom for every update (v1.0.0 → v1.1.0 → …).

## 0) Pre-flight (local, before anything ships)

- [ ] `bun tsc -b --noEmit` passes with no errors
- [ ] `bunx vitest run` passes (game engine, i18n, storage, release-URL tests)
- [ ] `bun run build` completes (web app compiles)
- [ ] Quick manual check of the preview: `/` landing + `/play` game + auth
- [ ] If you changed Convex schema: `bunx convex dev --once` typechecks, and
      keep changes **additive** (add fields, never remove) so existing
      leaderboard/market/feedback rows keep loading

## 1) Bump the version

- [ ] `src/game/constants.ts` → `GAME_VERSION = "x.y.z"`
- [ ] `desktop/package.json` → `"version": "x.y.z"`
- [ ] Root `package.json` → `"version": "x.y.z"` (cosmetic but tidy)
- [ ] (Optional) note the changes in `desktop/README.md` / release notes

> The web app shows `v${GAME_VERSION}` on the landing page and in-game; the
> desktop exe names use `desktop/package.json`. They must match the tag.

## 2) Commit + push

- [ ] `git add -A && git commit -m "Release vX.Y.Z"` (or whatever you use)
- [ ] `git push origin main`

## 3) Tag it (this triggers CI)

- [ ] `git tag vX.Y.Z`
- [ ] `git push origin vX.Y.Z`

## 4) Verify CI (GitHub Actions)

- [ ] Open Actions → the `Build & Release` run for the new tag
- [ ] It builds the web app, installs desktop deps, packages **both** exes
- [ ] Release has all four artifact kinds attached:
      - `Poke-Banner-Setup-X.Y.Z.exe` (NSIS installer)
      - `Poke-Banner-Portable-X.Y.Z.exe` (portable)
      - `latest.yml` + `*.blockmap` (**required** for auto-updates)
- [ ] If Azure Trusted Signing secrets are set: exes are signed (SmartScreen
      warning gone). If not set, the build stays unsigned — release still works.

## 5) Verify the homepage

- [ ] Load `/` — the download section should show **⬇ GET IT ON GITHUB**
      (not "Release coming soon") — it auto-verifies via the GitHub API
- [ ] The button points at `…/releases/latest` (it always tracks the newest
      release — a regression test in `src/lib/__tests__/release.test.ts`
      guards this, so never change it back to a pinned tag URL)

## 6) Verify the desktop update path (installed app only)

- [ ] Open the **installed** NSIS app → tray → **🔄 Check for updates**
- [ ] It downloads the new installer in the background (notification shown)
- [ ] Tray shows **⬇ vX.Y.Z ready — Restart & install** → click it → the app
      restarts on the new version, saves intact
- [ ] The **in-banner chip** appears top-left: `⬇ vX.Y.Z UPDATE READY —
      RESTART` (green pulse) — clicking it restarts & installs too
- [ ] Updates are **differential** (blockmap): only the changed bytes download

> The **portable** exe has no auto-update (single-file apps can't patch
> themselves) — portable users download the new exe manually. Portable
> builds are detected automatically (`PORTABLE_EXECUTABLE_FILE`) and the
> banner shows an amber **PORTABLE — MANUAL UPDATE** chip that opens the
> release page — verify it appears when running the portable exe.

## 6c) Verify the NEWS diff banner

- [ ] In the **NEWS** tab: the top banner shows `Installed vX.Y.Z → vLatest`
      and one of **Update available** / **You're up to date** / **ahead**
- [ ] The differential-update note is visible under the diff (NSIS
      blockmap updates vs portable manual download)

## 6b) Verify the in-game changelog feed (NEWS tab)

- [ ] Open the game → **MENU** → **NEWS** tab
- [ ] It lists the latest GitHub releases with notes (fetched live from the
      GitHub API — same source the auto-updater uses)
- [ ] If offline/GitHub is down: shows a graceful loading/error state with a
      **RETRY** button (never a blank panel)

## 7) Post-release

- [ ] Share the release link: `https://github.com/jeanpaulchirac5-rgb/pokebanner/releases/latest`
- [ ] If you changed the backend: `bunx convex deploy` so the leaderboard /
      marketplace / feedback update in production

## Troubleshooting

- **Download button says "Release coming soon"** → the release isn't public
  yet or the API check failed; wait for CI, then hard-refresh.
- **CI fails on `latest.yml`** → make sure `desktop/package.json` still has
  the `publish` (github) config and the NSIS target is enabled.
- **Auto-update does nothing** → the app must be the **installed** NSIS
  version (not portable), the release must contain `latest.yml`, and the
  version in the release must be **higher** than the installed one.
