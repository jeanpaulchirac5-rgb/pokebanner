declare global {
  interface Window {
    /**
     * Navigate to the auth page with a custom redirect URL
     * @param redirectUrl - URL to redirect to after successful authentication
     */
    navigateToAuth: (redirectUrl: string) => void;
    /**
     * Bridge exposed by the Electron desktop shell (desktop/preload.cjs).
     * Present only when running inside the shell.
     */
    desktopAPI?: {
      isDesktop: boolean;
      platform: string;
      /** Tells the shell to grow/shrink the window for the open panel (px). */
      setPanelHeight: (height: number) => void;
      close: () => void;
      /** Tray Pause/Resume events (true = paused). */
      onPauseChanged: (cb: (paused: boolean) => void) => void;
      offPauseChanged: (cb: (paused: boolean) => void) => void;
      /** Tray volume/mute events ({ volume, muted }). */
      onVolumeChanged: (
        cb: (v: { volume: number; muted: boolean }) => void,
      ) => void;
      offVolumeChanged: (
        cb: (v: { volume: number; muted: boolean }) => void,
      ) => void;
      /** Renderer → shell: keep the tray's volume/mute state truthful. */
      reportVolume: (v: { volume: number; muted: boolean }) => void;
      /** Auto-update status push ({ state, version }). */
      onUpdateStatus: (
        cb: (s: { state: "idle" | "downloading" | "ready" | "portable"; version: string | null }) => void,
      ) => void;
      offUpdateStatus: (
        cb: (s: { state: "idle" | "downloading" | "ready" | "portable"; version: string | null }) => void,
      ) => void;
      /** Renderer pulls the current status on mount (covers app reloads). */
      getUpdateStatus: () => Promise<{
        state: "idle" | "downloading" | "ready" | "portable";
        version: string | null;
      }>;
      /** Renderer asks to restart & install a downloaded update (in-banner chip). */
      restartAndInstall: () => void;
      /** Renderer asks to open the GitHub releases page (portable chip, NEWS links). */
      openReleases: () => void;
    };
  }
}

export {};
