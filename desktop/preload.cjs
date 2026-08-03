// Exposes a minimal, safe bridge to the renderer. contextIsolation is on and
// nodeIntegration is off — the page only ever sees this API surface.
const { contextBridge, ipcRenderer } = require("electron");

const pauseCbs = new Set();
ipcRenderer.on("tray-pause", (_event, paused) => {
  for (const cb of pauseCbs) cb(paused);
});

const volumeCbs = new Set();
ipcRenderer.on("tray-volume", (_event, v) => {
  for (const cb of volumeCbs) cb(v);
});

contextBridge.exposeInMainWorld("desktopAPI", {
  isDesktop: true,
  platform: process.platform,
  /** Tells the shell to grow/shrink the window for the open panel (px). */
  setPanelHeight: (height) => ipcRenderer.send("panel-height", height),
  close: () => ipcRenderer.send("desktop-close"),
  /** Tray Pause/Resume events. */
  onPauseChanged: (cb) => pauseCbs.add(cb),
  offPauseChanged: (cb) => pauseCbs.delete(cb),
  /** Tray volume/mute events ({ volume, muted }). */
  onVolumeChanged: (cb) => volumeCbs.add(cb),
  offVolumeChanged: (cb) => volumeCbs.delete(cb),
  /** Renderer → shell: keep the tray's volume/mute state truthful. */
  reportVolume: (v) => ipcRenderer.send("volume-changed", v),
});
