# Poke-Banner desktop shell

Frameless, transparent, always-on-top Electron window. It starts docked
**above the Windows taskbar** but you can drag the green sky to **place it
anywhere on the desktop** — top edge, a side, over a second monitor, wherever.
Your position is remembered across restarts, and opening a Bag/PC/Dex/Shop/
Arena panel grows the window in place (never yanking it back to the taskbar).
The banner's neon-green sky (`#00ff00`) is keyed out to true alpha in desktop
mode, so the strip appears to float over your desktop with no fringing.

## How the keying works

The web app always paints the sky `#00ff00` (see `src/game/constants.ts`,
`TUNING.neonGreen`). The Electron window is `transparent: true`, and when the
renderer detects `window.desktopAPI` it adds `desktop` to `<html>`. The CSS
override in `src/index.css` then swaps the key color for real alpha:

```css
html.desktop .game-sky { background-color: transparent !important; }
```

True per-pixel alpha (not chroma filtering) means crisp sprites, no green
halos, and no artifacts over dark wallpapers. Interactive elements inside the
banner are marked `no-drag` so buttons still click; the sky itself is the drag
handle.

## Run (dev, hot-reload)

```bash
# terminal 1 — vite dev server (from the project root)
bun run dev

# terminal 2 — electron shell (from this folder)
npm install
npm run dev        # loads http://localhost:5173/desktop, devtools attached
```

## Run (production build)

```bash
# from the project root
bun run build

# from this folder
npm install
npm start          # loads ../dist/index.html, kicks the router to /desktop
```

## Tray menu

A pixel poké-ball tray icon (generated at runtime by `icon.cjs` — no binary
assets) provides:

- **⏸ Pause / ▶ Resume** — freezes the whole game loop via the `tray-pause` IPC;
  the banner shows a `⏸ PAUSED` chip.
- **Volume (+10% / −10% / Mute / Reset)** — sent over `tray-volume` to the
  renderer's audio controller (`src/game/audio.ts`), the single integration
  point future chiptune/SFX will read (`effectiveVolume()` → 0 when muted). The
  renderer reports its state back so the menu checkbox stays truthful.
- **M hotkey** — pressing **M** while the banner has focus toggles mute/unmute
  (also in the plain browser). It's ignored while typing in an input/textarea
  or when Ctrl/Cmd/Alt is held, and it reports the new state back to the tray
  so the Mute checkbox stays in sync.
- **N hotkey** — pressing **N** toggles the BGM loop on/off without touching
  SFX or volume (a `🎵 Music On/Off` message flashes). The toggle persists
  across tray pause/resume and biome/theme swaps, which all honor the flag.
- **Position** — submenu with **Above taskbar** and **Top of screen** snap
  presets (plus a hint that you can drag the sky anywhere).
- **Show / Hide banner** — toggles window visibility (left-click on the tray
  icon does the same).
- **Quit Poke-Banner** — exits the app. Closing the window just hides the strip.

## Place it anywhere

- The sky (`html.desktop .game-sky`) is an `-webkit-app-region: drag` handle,
  so dragging the green strip moves the window; every button inside is
  `no-drag`.
- Position is persisted (debounced on move/resize) to
  `<userData>/poke-banner-window.json` and restored on launch — clamped back
  onto a visible display if a monitor was unplugged.
- When a Bag/PC/Dex/Shop/Arena/Save panel opens, `growForPanel` extends the
  window **in place**: upward when the strip sits near the bottom edge,
  downward when it's near the top. It never re-docks, so the banner stays
  exactly where you put it.

## Packaging a distributable `.exe`

The shell is publish-ready with `electron-builder` (config in
`desktop/package.json`). It produces two free Windows builds:

- **Installer** — `Poke-Banner-Setup-1.0.0.exe` (NSIS, per-user install)
- **Portable** — `Poke-Banner-Portable-1.0.0.exe` (no install, run anywhere)

```bash
cd desktop
npm install          # installs electron + electron-builder
npm run dist         # builds ../dist (the web app), generates build/icon.png,
                     # and packages both .exe files into desktop/release/
```

The app icon is generated at build time from the same pixel-art poké-ball
code (`make-icon.cjs` → `build/icon.png`, converted to `.ico` by
electron-builder) — no binary assets to maintain. The packaged app loads
`../dist` (Vite build) via `extraResources`, so the neon-green sky keying,
sprites, BGM and saves all work offline in the shipped exe.

### Publishing with a permanent download URL

**Easiest — GitHub Actions (automatic):** a workflow ships in
`.github/workflows/release.yml`. Push the project to a GitHub repo, then:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

CI builds both `.exe` files on Windows and attaches them to a GitHub
Release automatically. Copy that release URL into `src/pages/Landing.tsx`
(`DOWNLOAD_URL` constant, top of the file) and the landing page's
"⬇ GET IT ON GITHUB" button points at the real download for everyone.

**Manual alternative:** run `npm run dist` (above) and upload
`Poke-Banner-Setup-*.exe` + `Poke-Banner-Portable-*.exe` to any free host
(GitHub Releases, itch.io, etc.), then set the same `DOWNLOAD_URL`.

Until a real URL is configured, the landing page shows a safe
"⬇ RELEASE COMING SOON" chip instead of a dead link.

No signing certificate is configured, so Windows SmartScreen will show a
"More info → Run anyway" prompt — normal for free/unsigned fan projects.

## Notes

- The window is `skipTaskbar`, `alwaysOnTop` ("screen-saver" level) and
  `setVisibleOnAllWorkspaces` on Windows.
- The route `/desktop` renders the game directly (no auth wall) — see
  `src/main.tsx`.
