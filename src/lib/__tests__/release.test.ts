import { describe, expect, it, afterEach } from "vitest";
import {
  DOWNLOAD_URL,
  RELEASE_CHECK_URL,
  compareVersions,
  deriveReleaseCheckUrl,
  fetchReleaseNotes,
  isPortableBuild,
} from "../release";

describe("release URL wiring (update-loop regression)", () => {
  it("DOWNLOAD_URL points at the GitHub 'latest' release, never a pinned tag", () => {
    expect(DOWNLOAD_URL).toMatch(/^https:\/\/github\.com\//);
    expect(DOWNLOAD_URL).toMatch(/\/releases\/latest$/);
    expect(DOWNLOAD_URL).not.toMatch(/\/releases\/tag\//);
  });

  it("never freezes the download button on the initial v1.0.0 tag", () => {
    // The original bug: DOWNLOAD_URL was pinned to …/releases/tag/v1.0.0,
    // so every future release stayed invisible on the landing page.
    expect(DOWNLOAD_URL).not.toContain("v1.0.0");
    expect(DOWNLOAD_URL).not.toContain("v1.");
  });

  it("derives the API check URL for the latest-release pattern", () => {
    expect(RELEASE_CHECK_URL).toBe(
      "https://api.github.com/repos/jeanpaulchirac5-rgb/pokebanner/releases/latest",
    );
  });

  it("still converts a legacy tag URL to the tags API endpoint", () => {
    expect(
      deriveReleaseCheckUrl("https://github.com/owner/repo/releases/tag/v1.2.0"),
    ).toBe("https://api.github.com/repos/owner/repo/releases/tags/v1.2.0");
  });

  it("leaves unrelated github.com URLs unchanged apart from the API host", () => {
    expect(
      deriveReleaseCheckUrl("https://github.com/owner/repo/releases/expanded_assets/latest"),
    ).toBe(
      "https://api.github.com/repos/owner/repo/releases/expanded_assets/latest",
    );
  });
});

describe("fetchReleaseNotes (changelog feed)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("maps GitHub release JSON into ReleaseNote rows", async () => {
    globalThis.fetch = (async () =>
      ({
        ok: true,
        json: async () => [
          {
            tag_name: "v1.1.0",
            name: "Auto-update + changelog",
            body: "- auto-updater\n- news panel",
            published_at: "2026-07-01T10:00:00Z",
            html_url: "https://github.com/jeanpaulchirac5-rgb/pokebanner/releases/tag/v1.1.0",
          },
        ],
      })) as unknown as typeof fetch;
    const notes = await fetchReleaseNotes(5);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toEqual({
      tag: "v1.1.0",
      name: "Auto-update + changelog",
      body: "- auto-updater\n- news panel",
      publishedAt: "2026-07-01T10:00:00Z",
      htmlUrl: "https://github.com/jeanpaulchirac5-rgb/pokebanner/releases/tag/v1.1.0",
    });
  });

  it("throws when the GitHub API responds with an error status", async () => {
    globalThis.fetch = (async () =>
      ({
        ok: false,
        status: 403,
      })) as unknown as typeof fetch;
    await expect(fetchReleaseNotes()).rejects.toThrow("GitHub API 403");
  });

  it("tolerates missing optional fields with sensible fallbacks", async () => {
    globalThis.fetch = (async () =>
      ({
        ok: true,
        json: async () => [{ tag_name: "v1.0.0" }],
      })) as unknown as typeof fetch;
    const notes = await fetchReleaseNotes();
    expect(notes[0]).toEqual({
      tag: "v1.0.0",
      name: "",
      body: "",
      publishedAt: "",
      htmlUrl: "",
    });
  });
});

describe("compareVersions (NEWS diff banner)", () => {
  it("compares plain and v-prefixed versions", () => {
    expect(compareVersions("1.0.0", "1.1.0")).toBeLessThan(0);
    expect(compareVersions("1.1.0", "1.0.0")).toBeGreaterThan(0);
    expect(compareVersions("1.1.0", "v1.1.0")).toBe(0);
    expect(compareVersions("v1.2.0", "1.1.9")).toBeGreaterThan(0);
  });

  it("handles partial and build-tagged versions", () => {
    expect(compareVersions("1.1", "1.1.0")).toBe(0);
    expect(compareVersions("1.1.0+build5", "1.1.0")).toBe(0);
    expect(compareVersions("2", "1.9.9")).toBeGreaterThan(0);
  });

  it("treats equal versions as equal (up-to-date)", () => {
    expect(compareVersions("1.1.0", "1.1.0")).toBe(0);
  });
});

describe("isPortableBuild", () => {
  const originalEnv = process.env.PORTABLE_EXECUTABLE_FILE;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.PORTABLE_EXECUTABLE_FILE;
    else process.env.PORTABLE_EXECUTABLE_FILE = originalEnv;
  });

  it("is false in the browser (no env)", () => {
    delete process.env.PORTABLE_EXECUTABLE_FILE;
    expect(isPortableBuild()).toBe(false);
  });

  it("is true when the portable exe marker env var is set", () => {
    process.env.PORTABLE_EXECUTABLE_FILE = "C:\\Games\\Poke-Banner-Portable.exe";
    expect(isPortableBuild()).toBe(true);
  });
});
