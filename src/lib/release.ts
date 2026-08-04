/**
 * Where the packaged desktop installer lives. Points at the GitHub "latest"
 * release so every new tag (v1.1.0, v1.2.0, …) is picked up automatically —
 * no code change needed when publishing updates. If you host the .exe
 * elsewhere (itch.io, etc.), paste the permanent URL here instead. Until a
 * real release exists, the landing page shows a "Release coming soon" state
 * instead of a dead link.
 *
 * NOTE: keep this pointing at `/releases/latest` — a pinned `/releases/tag/…`
 * URL silently freezes the download button on an old build (see the
 * regression test in src/lib/__tests__/release.test.ts).
 */
export const DOWNLOAD_URL =
  "https://github.com/jeanpaulchirac5-rgb/pokebanner/releases/latest";

/**
 * GitHub API endpoint derived from a github.com release URL so the landing
 * page can live-verify the release exists before showing the Download
 * button (no dead links).
 *   …/releases/latest      -> …/api.github.com/…/releases/latest
 *   …/releases/tag/vX.Y.Z  -> …/api.github.com/…/releases/tags/vX.Y.Z
 */
export function deriveReleaseCheckUrl(downloadUrl: string): string {
  return downloadUrl
    .replace("https://github.com/", "https://api.github.com/repos/")
    .replace("/releases/tag/", "/releases/tags/");
}

export const RELEASE_CHECK_URL = deriveReleaseCheckUrl(DOWNLOAD_URL);

// ---------------------------------------------------------------------------
// Release notes (in-game changelog panel)
// ---------------------------------------------------------------------------

/** One GitHub release, normalized for the in-game changelog panel. */
export interface ReleaseNote {
  tag: string;
  name: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
}

const GITHUB_REPO = "jeanpaulchirac5-rgb/pokebanner";

// ---------------------------------------------------------------------------
// Version comparison (installed vs latest — NEWS panel diff banner)
// ---------------------------------------------------------------------------

/** Normalize a tag/version string to comparable numeric segments. */
function versionSegments(v: string): number[] {
  const cleaned = String(v).replace(/^v/i, "").trim();
  const parts = cleaned.split(/[.\-+]/);
  const nums: number[] = [];
  for (const p of parts) {
    const n = parseInt(p, 10);
    if (Number.isNaN(n)) break;
    nums.push(n);
  }
  while (nums.length < 3) nums.push(0);
  return nums;
}

/**
 * Compare two version strings ("1.1.0" vs "v1.2.0" etc).
 * Returns 0 if equal, < 0 if a < b, > 0 if a > b.
 */
export function compareVersions(a: string, b: string): number {
  const A = versionSegments(a);
  const B = versionSegments(b);
  for (let i = 0; i < 3; i++) {
    if (A[i] !== B[i]) return A[i] - B[i];
  }
  return 0;
}

/**
 * True when running inside the portable (single-file) desktop build.
 * electron-builder sets PORTABLE_EXECUTABLE_FILE only for portable exes —
 * those can't self-update, so the banner shows a manual-download hint.
 * Browser-safe (guarded): returns false in the web build.
 */
export function isPortableBuild(): boolean {
  if (typeof process === "undefined" || !process.env) return false;
  return Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
}

/**
 * Fetches the N most recent GitHub releases for the changelog panel.
 * Uses the public API (CORS-enabled, no token needed for public repos); the
 * panel degrades to its loading/error state if the network or GitHub is down.
 */
export async function fetchReleaseNotes(limit = 5): Promise<ReleaseNote[]> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=${limit}`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = (await res.json()) as Array<{
    tag_name?: string;
    name?: string;
    body?: string | null;
    published_at?: string;
    html_url?: string;
  }>;
  return data.map((r) => ({
    tag: r.tag_name ?? "unknown",
    name: r.name ?? "",
    body: r.body ?? "",
    publishedAt: r.published_at ?? "",
    htmlUrl: r.html_url ?? "",
  }));
}
