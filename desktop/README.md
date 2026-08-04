# Poke-Banner desktop shell

Frameless, always-on-top Electron window. It starts docked **above the
Windows taskbar** but you can drag the banner to **place it anywhere on the
desktop** — top edge, a side, over a second monitor, wherever. Your position
is remembered across restarts, and opening a Bag/PC/Dex/Shop/Arena panel
grows the window in place (never yanking it back to the taskbar).

## How transparency works

In the **browser**, the banner paints a living pixel-blue sky (see
`src/game/presentation.ts`, `skySvg`/`skyColorFor`) that shifts with the
in-game day/night cycle — bright blue by day, warm amber at sunset, deep
indigo at night.

On the **desktop**, the Electron window is truly transparent
(`transparent: true` + `backgroundColor: "#00000000"` in `main.cjs`). The
`html.desktop` CSS rules (see `src/index.css`) make the sky backdrop and page
background transparent, so the strip floats the scene **directly over the
wallpaper**: the drifting pixel clouds (`cloudsSvg` — the clouds-only,
transparent sky tile), sun/moon, parallax scenery, sprites and ambient
particles all stay on show. The starter-selection overlay becomes a
translucent dark scrim so its buttons stay readable over any wallpaper.
Interactive elements inside the banner are marked `no-drag` so buttons still
click; the banner itself is the window drag handle.

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
- **🔄 Check for updates / ⬇ Restart & install** — the installed app
  auto-updates via GitHub Releases (electron-updater): it checks ~4s after
  launch, downloads new versions in the background (Windows notification),
  and offers **Restart & install** once ready. Saves survive updates.
- **Position** — submenu with **Above taskbar** and **Top of screen** snap
  presets (plus a hint that you can drag the sky anywhere).
- **Show / Hide banner** — toggles window visibility (left-click on the tray
  icon does the same).
- **Quit Poke-Banner** — exits the app. Closing the window just hides the strip.

## Place it anywhere

- The banner (`html.desktop .game-sky`) is an `-webkit-app-region: drag`
  handle, so dragging it moves the window; every button inside is `no-drag`.
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

- **Installer** — `Poke-Banner-Setup-<version>.exe` (NSIS, per-user install)
- **Portable** — `Poke-Banner-Portable-<version>.exe` (no install, run anywhere)

```bash
cd desktop
npm install          # installs electron + electron-builder
npm run dist         # builds ../dist (the web app), generates build/icon.png,
                     # and packages both .exe files into desktop/release/
```

The app icon is generated at build time from the same pixel-art poké-ball
code (`make-icon.cjs` → `build/icon.png`, converted to `.ico` by
electron-builder) — no binary assets to maintain. The packaged app loads
`../dist` (Vite build) via `extraResources`, so the transparent scene,
sprites, BGM and saves all work offline in the shipped exe.

**Automatic updates:** the **installed** (NSIS) build updates itself from
GitHub Releases — CI uploads `latest.yml` + `.blockmap` next to the
installers, and electron-updater downloads/installs the next tag in the
background (differential updates: only the changed bytes are downloaded,
not the whole installer). The **portable** exe can't self-update
(single-file); it's detected via `PORTABLE_EXECUTABLE_FILE` and the banner
shows an amber **PORTABLE — MANUAL UPDATE** chip that opens the release page.

### Publishing with a permanent download URL

**Easiest — GitHub Actions (automatic):** a workflow ships in
`.github/workflows/release.yml`. Push the project to a GitHub repo, then:

```bash
git tag v1.1.0 && git push origin v1.1.0
```

CI builds both `.exe` files on Windows and attaches them to a GitHub
Release automatically. The landing page's `DOWNLOAD_URL` constant
(`src/pages/Landing.tsx`) points at `…/releases/latest`, so **every new
tag you push becomes the download automatically** — no code change needed
when publishing an update; just bump the version and tag it.

**Manual alternative:** run `npm run dist` (above) and upload
`Poke-Banner-Setup-*.exe` + `Poke-Banner-Portable-*.exe` to any free host
(GitHub Releases, itch.io, etc.), then set the same `DOWNLOAD_URL` to that
permanent link.

Until a real URL is configured, the landing page shows a safe
"⬇ RELEASE COMING SOON" chip instead of a dead link.

### Removing the SmartScreen warning (code-signing)

Unsigned builds show Windows SmartScreen's "More info → Run anyway" prompt.
To sign the `.exe` files in CI, the workflow supports **Azure Trusted
Signing** (Microsoft's managed code-signing — no private key to store):

1. Create an Azure Trusted Signing resource (see
   <https://learn.microsoft.com/azure/trusted-signing/>), add your identity to
   it, and create a certificate profile.
2. Register a service principal and grant it the **Trusted Signing
   Certificate Profile Signer** role on that profile.
3. Add these GitHub repo secrets (the workflow reads them automatically):

   | Secret | Value example |
   | --- | ---
   | `AZURE_TENANT_ID` | `11111111-2222-3333-4444-555555555555` |
   | `AZURE_CLIENT_ID` | your service-principal app id |
   | `AZURE_CLIENT_SECRET` | your service-principal client secret |
   | `AZURE_ENDPOINT` | `https://weu.codesigning.azure.net` (your region) |
   | `AZURE_ACCOUNT_NAME` | your Trusted Signing account name |
   | `AZURE_PROFILE_NAME` | your certificate profile name |
   | `AZURE_PUBLISHER_NAME` | e.g. `CN=Poke-Banner` |

   Next release tag, CI injects `build.win.sign` via
   `desktop/scripts/configure-azure-sign.cjs` and electron-builder signs both
   `.exe` files. **Without the secrets the build simply stays unsigned** —
   existing `git tag` releases keep working untouched.

**Alternative (traditional certificate):** own a code-signing `.pfx`
(OV/EV cert) and set `WIN_CSC_LINK` + `WIN_CSC_KEY_PASSWORD` secrets —
electron-builder picks those up natively, no script involved.

## Notes

- The window is `skipTaskbar`, `alwaysOnTop` ("screen-saver" level) and
  `setVisibleOnAllWorkspaces` on Windows.
- The routes `/desktop` (used by the shell itself) and its friendly public
  alias `/play` render the game directly (no auth wall) — see `src/main.tsx`.
  The landing page's header "▶ PLAY" button and hero "▶ PLAY IN BROWSER"
  button both point at `/play`.
