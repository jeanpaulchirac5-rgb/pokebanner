// ---------------------------------------------------------------------------
// Poke-Banner desktop shell (Electron main process).
//
// Creates a frameless, always-on-top window. By default it docks directly
// ABOVE the Windows taskbar (bottom of the work area), but the strip is
// freely draggable anywhere on the desktop — the renderer marks the banner
// sky as an `-webkit-app-region: drag` handle. The window's position is
// persisted across restarts, and when a Bag/PC/Dex/Shop/Arena panel opens the
// window grows IN PLACE (upward when docked near the bottom edge, downward
// when placed near the top) instead of snapping back to the taskbar.
//
// The window is TRANSPARENT (backgroundColor #00000000): the browser keeps
// its living blue sky, but on the desktop the strip floats the scene
// directly over the wallpaper — the sky backdrop goes transparent while the
// drifting clouds (cloudsSvg), sun/moon, scenery, sprites and ambient
// particles stay on show. The starter-selection overlay becomes a translucent
// scrim so its buttons stay readable over any wallpaper.
//
// Loading:
//   - dev:      POKEBANNER_URL env (defaults to http://localhost:5173/desktop)
//   - prod:     ../dist/index.html + a history.replaceState('/desktop') kick
//
// Run (from this folder):  npm install && npm start
// ---------------------------------------------------------------------------

const { app, BrowserWindow, screen, ipcMain, Tray, Menu, Notification, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { createTrayImage } = require("./icon.cjs");

const BANNER_H = 60; // matches TUNING.bannerHeight
const CHROME_H = 4; // bottom border so the strip has a crisp edge
const STATE_FILE = () => path.join(app.getPath("userData"), "poke-banner-window.json");

let win = null;
let tray = null;
let quitting = false;

// Shared tray state (volume is kept in sync with the renderer via IPC).
let trayState = { paused: false, volume: 1, muted: false };

// electron-updater handle — only initialized in packaged builds (see
// initAutoUpdater). updateReadyVersion is set once an update is downloaded.
let autoUpdater = null;
let updateReadyVersion = null;

// Latest known update status, pushed to the renderer so the banner can show
// an in-strip indicator (and the renderer can pull it on mount via IPC).
let updateStatus = { state: "idle", version: null };

function sendUpdateStatus() {
  if (!win || win.isDestroyed() || win.webContents.isDestroyed()) return;
  win.webContents.send("update-status", updateStatus);
}

const clamp01 = (v) => Math.min(1, Math.max(0, Number(v) || 0));

// --- Window position persistence -----------------------------------------

/** Persists the strip's current position so it survives restarts. */
function saveWindowState() {
  if (!win || win.isDestroyed()) return;
  try {
    fs.mkdirSync(path.dirname(STATE_FILE()), { recursive: true });
    fs.writeFileSync(STATE_FILE(), JSON.stringify(win.getBounds()));
  } catch {
    /* best-effort persistence */
  }
}

/** Restores a previously saved position, clamped onto a real display. */
function loadWindowState() {
  try {
    const raw = fs.readFileSync(STATE_FILE(), "utf8");
    const b = JSON.parse(raw);
    if (
      !b || typeof b.x !== "number" || typeof b.y !== "number" ||
      typeof b.width !== "number" || typeof b.height !== "number"
    ) {
      return null;
    }
    // Only restore if the rectangle intersects some display's work area
    // (protects against a monitor being unplugged while the app is closed).
    const visible = screen.getAllDisplays().some((d) => {
      const wa = d.workArea;
      return (
        b.x < wa.x + wa.width && b.x + b.width > wa.x &&
        b.y < wa.y + wa.height && b.y + b.height > wa.y
      );
    });
    return visible ? b : null;
  } catch {
    return null;
  }
}

/** Geometry for a window docked above the taskbar on the primary display. */
function dockGeometry(height) {
  const display = screen.getPrimaryDisplay();
  const wa = display.workArea;
  const h = Math.max(BANNER_H + CHROME_H, Math.min(Math.round(height), wa.height));
  return { x: wa.x, y: wa.y + wa.height - h, width: wa.width, height: h };
}

/**
 * Grows/shrinks the strip for the open panel WITHOUT re-docking: the edge
 * facing the nearest screen edge stays put, so the banner keeps the exact
 * position the user dragged it to ("place it anywhere on the PC").
 */
function growForPanel(panelPx) {
  if (!win) return;
  const cur = win.getBounds();
  const display = screen.getDisplayMatching(cur);
  const wa = display.workArea;
  const total = BANNER_H + CHROME_H + (Math.round(Number(panelPx) || 0));
  const h = Math.max(BANNER_H + CHROME_H, Math.min(Math.round(total), wa.height));
  // Keep x/width as the user placed them; anchor to the edge that leaves the
  // banner visible: if near the bottom edge, grow upward; else grow downward.
  const nearBottom = cur.y + cur.height >= wa.y + wa.height - 2;
  const y = nearBottom ? wa.y + wa.height - h : Math.min(cur.y, wa.y + wa.height - h);
  win.setBounds({ x: cur.x, y, width: cur.width, height: h }, true);
}

function loadApp() {
  const devUrl = process.env.POKEBANNER_URL;
  if (devUrl && /^https?:/.test(devUrl)) {
    win.loadURL(devUrl);
    if (process.env.POKEBANNER_DEVTOOLS) {
      win.webContents.openDevTools({ mode: "detach" });
    }
    return;
  }
  const distIndex = path.join(__dirname, "..", "dist", "index.html");
  if (fs.existsSync(distIndex)) {
    win.loadFile(distIndex);
    // BrowserRouter won't read a hash — kick it to /desktop once mounted.
    win.webContents.once("did-finish-load", () => {
      win.webContents.executeJavaScript(
        `history.replaceState(null, "", "/desktop"); window.dispatchEvent(new PopStateEvent("popstate"));`,
      );
    });
    return;
  }
  console.error(
    "[poke-banner] dist/index.html not found — run `bun run build` (or set POKEBANNER_URL to a dev server).",
  );
  app.quit();
}

function createWindow() {
  // Restore a previously saved position ("place it anywhere"), else dock
  // above the taskbar. Width is always the full work-area width.
  const saved = loadWindowState();
  const base = dockGeometry(BANNER_H + CHROME_H);
  const start = saved
    ? { x: saved.x, y: saved.y, width: base.width, height: BANNER_H + CHROME_H }
    : base;
  win = new BrowserWindow({
    x: start.x,
    y: start.y,
    width: start.width,
    height: start.height,
    frame: false,
    transparent: true,
    resizable: false,
    // movable stays enabled so the sky's -webkit-app-region: drag works as a
    // reposition handle; the initial position is docked above the taskbar.
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    // Fully transparent fallback paint: transparency is real (the renderer
    // paints nothing where the sky is, so the wallpaper shows through). The
    // blue-sky look stays in the browser — see index.css html.desktop rules.
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  win.setAlwaysOnTop(true, "screen-saver");
  if (process.platform === "win32") {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
  win.setMenuBarVisibility(false);
  win.setTitle("Poke-Banner");
  // Persist the user's placement (debounced) so it survives restarts. This
  // also fires for the panel grow/shrink — the panel height is restored to
  // the bare strip on load, so saving the full bounds is fine.
  let saveTimer = null;
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveWindowState, 250);
  };
  win.on("moved", scheduleSave);
  win.on("resized", scheduleSave);
  // Tray-app behaviour: closing hides the strip instead of quitting.
  win.on("close", (e) => {
    if (!quitting) {
      e.preventDefault();
      win.hide();
    }
  });
  win.on("closed", () => {
    win = null;
  });
  loadApp();
}

// --- Tray ---------------------------------------------------------------

function sendToRenderer(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function togglePause() {
  trayState.paused = !trayState.paused;
  sendToRenderer("tray-pause", trayState.paused);
  buildTrayMenu();
}

function changeVolume(delta) {
  const next = clamp01((trayState.muted ? 0 : trayState.volume) + delta);
  trayState.volume = next;
  trayState.muted = false;
  sendToRenderer("tray-volume", { volume: trayState.volume, muted: trayState.muted });
  buildTrayMenu();
}

function setMuted(muted) {
  trayState.muted = Boolean(muted);
  sendToRenderer("tray-volume", { volume: trayState.volume, muted: trayState.muted });
  buildTrayMenu();
}

function toggleWindow() {
  if (!win) return;
  if (win.isVisible()) win.hide();
  else win.show();
}

function dockBottom() {
  const g = dockGeometry(BANNER_H + CHROME_H);
  win.setBounds(g, true);
  saveWindowState();
}

function dockTop() {
  const display = screen.getPrimaryDisplay();
  const wa = display.workArea;
  win.setBounds(
    { x: wa.x, y: wa.y, width: wa.width, height: BANNER_H + CHROME_H },
    true,
  );
  saveWindowState();
}

function buildTrayMenu() {
  const { paused, volume, muted } = trayState;
  const pct = muted ? 0 : Math.round(volume * 100);
  const menu = Menu.buildFromTemplate([
    {
      label: paused ? "\u25B6 Resume" : "\u23F8 Pause",
      click: togglePause,
    },
    { type: "separator" },
    {
      label: `Volume (${pct}%)`,
      submenu: [
        { label: "\uD83D\uDD0A +10%", click: () => changeVolume(0.1) },
        { label: "\uD83D\uDD09 \u221210%", click: () => changeVolume(-0.1) },
        {
          label: muted ? "\uD83D\uDD07 Unmute" : "\uD83D\uDD08 Mute",
          type: "checkbox",
          checked: muted,
          click: (item) => setMuted(item.checked),
        },
        { label: "Reset to 100%", click: () => changeVolume(1 - volume) },
      ],
    },
    { type: "separator" },
    {
      label: "Position",
      submenu: [
        { label: "Above taskbar", click: dockBottom },
        { label: "Top of screen", click: dockTop },
        { type: "separator" },
        {
          label: "Drag the transparent banner anywhere on the desktop",
          enabled: false,
        },
      ],
    },
    { type: "separator" },
    ...(autoUpdater
      ? [
          { label: "\uD83D\uDD04 Check for updates", click: checkForUpdates },
          ...(updateReadyVersion
            ? [
                {
                  label: `\u2B07 v${updateReadyVersion} ready \u2014 Restart & install`,
                  click: () => autoUpdater.quitAndInstall(),
                },
              ]
            : []),
        ]
      : []),
    { type: "separator" },
    { label: "Show / Hide banner", click: toggleWindow },
    { type: "separator" },
    { label: "Quit Poke-Banner", click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

// --- IPC ----------------------------------------------------------------

// The renderer reports the height (px) of the open panel area; grow/shrink
// the strip IN PLACE — never re-dock it to the taskbar, so the banner keeps
// whatever position the user dragged it to.
ipcMain.on("panel-height", (_event, height) => {
  growForPanel(height);
});

ipcMain.on("desktop-close", () => {
  app.quit();
});

// The renderer reports volume/mute changes (e.g. its own controls or after a
// tray event) so the tray menu checkbox stays truthful.
ipcMain.on("volume-changed", (_e, v) => {
  trayState.volume = clamp01(v?.volume);
  trayState.muted = Boolean(v?.muted);
  buildTrayMenu();
});

// Renderer pulls the current update status on mount (covers app reloads).
ipcMain.handle("update-status", () => updateStatus);

// Renderer asks to restart & install a downloaded update (in-banner chip).
ipcMain.on("update-install", () => {
  if (autoUpdater && updateReadyVersion) autoUpdater.quitAndInstall();
});

// Renderer asks to open the GitHub releases page (portable manual-download
// chip, and the NEWS panel's "view all" links on desktop).
ipcMain.on("open-releases", () => {
  shell.openExternal(
    "https://github.com/jeanpaulchirac5-rgb/pokebanner/releases/latest",
  );
});

// --- Auto-update (electron-updater) --------------------------------------

function checkForUpdates() {
  if (!autoUpdater) return;
  autoUpdater.checkForUpdates().catch(() => {
    /* network/feed failures are silent — the strip never breaks */
  });
}

function initAutoUpdater() {
  // electron-updater only works in a packaged, installed app — never in dev.
  if (!app.isPackaged) return;
  // Portable (single-file) builds can't self-update: electron-builder marks
  // them with PORTABLE_EXECUTABLE_FILE. Flag it so the in-banner chip shows
  // the manual-download hint instead of an auto-update status.
  if (process.env.PORTABLE_EXECUTABLE_FILE) {
    updateStatus = { state: "portable", version: null };
    sendUpdateStatus();
    return;
  }
  autoUpdater = require("electron-updater").autoUpdater;
  autoUpdater.autoDownload = true; // download in background; install on our terms
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    console.log(`[poke-banner] update v${info.version} available — downloading…`);
    updateStatus = { state: "downloading", version: info.version };
    sendUpdateStatus();
    if (Notification.isSupported()) {
      new Notification({
        title: "Poke-Banner update available",
        body: `v${info.version} is downloading in the background — the strip keeps running.`,
      }).show();
    }
  });

  autoUpdater.on("update-not-available", () => {
    updateStatus = { state: "idle", version: null };
    sendUpdateStatus();
  });

  autoUpdater.on("download-progress", (p) => {
    if (p && p.percent != null && Math.floor(p.percent) % 25 === 0) {
      console.log(`[poke-banner] update download ${Math.floor(p.percent)}%`);
    }
  });

  autoUpdater.on("update-downloaded", (info) => {
    updateReadyVersion = info.version;
    updateStatus = { state: "ready", version: info.version };
    sendUpdateStatus();
    console.log(`[poke-banner] update v${info.version} downloaded — restart to install.`);
    if (Notification.isSupported()) {
      new Notification({
        title: "Poke-Banner updated",
        body: `v${info.version} is ready. Use the tray menu to restart & install.`,
      }).show();
    }
    buildTrayMenu();
  });

  autoUpdater.on("error", (err) => {
    console.error(
      "[poke-banner] update check failed:",
      err && err.message ? err.message : err,
    );
    updateStatus = { state: "idle", version: null };
    sendUpdateStatus();
  });

  // Check shortly after launch so the window is already up.
  setTimeout(() => checkForUpdates(), 4000);
}

// --- App lifecycle ------------------------------------------------------

app.on("before-quit", () => {
  quitting = true;
});

// Stable AppUserModelID so Windows notifications (updates, etc.) attribute
// correctly to the installed app.
app.setAppUserModelId("com.pokebanner.desktop");

app.whenReady().then(() => {
  createWindow();
  initAutoUpdater();
  tray = new Tray(createTrayImage());
  tray.setToolTip("Poke-Banner \u2014 60px taskbar RPG");
  tray.on("click", toggleWindow); // left-click toggles the strip
  buildTrayMenu();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
