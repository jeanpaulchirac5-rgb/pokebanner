// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// Render smoke tests — mount the 60px banner and the panels against a mock
// save to catch render-time crashes (null save, empty team, Convex loading
// states, missing tabs). Uses jsdom (dev-only dependency) so the components
// render in a DOM like the browser. No network/audio happens: the banner
// no-ops on window.desktopAPI, and sound guards behind AudioContext.
// ---------------------------------------------------------------------------

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import PokemonBanner from "../PokemonBanner";
import { GamePanels, type PanelTab } from "../panels";
import { createSave, makePokemon, normalizeSave } from "../engine";
import { CHAMPIONS } from "../constants";
import { persistSave } from "../storage";
import type { SaveData } from "../types";

// React's act() needs this flag when running outside @testing-library/react.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// Panels use Convex hooks; here they only need to render — every query
// resolves to "loading" (undefined), which must not crash. The real handler
// behavior is covered separately by admin.e2e.test.ts.
vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useMutation: () => async () => ({}),
}));
vi.mock("@/convex/_generated/api", () => ({
  api: new Proxy({}, { get: () => new Proxy({}, { get: () => ({} as never) }) }),
}));

// jsdom normally provides localStorage, but guard anyway so these render
// smoke tests stay hermetic in any environment (see the beforeEach below).
if (typeof globalThis.localStorage === "undefined") {
  const mem = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      get length() {
        return mem.size;
      },
      clear: () => mem.clear(),
      getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
      key: (i: number) => [...mem.keys()][i] ?? null,
      removeItem: (k: string) => void mem.delete(k),
      setItem: (k: string, v: string) => void mem.set(k, String(v)),
    } satisfies Storage,
  });
}

/** Mount a React node and return the root + container for assertions. */
async function mount(node: ReactNode): Promise<{ root: Root; container: HTMLDivElement }> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(node);
  });
  return { root, container };
}

async function unmount(root: Root, container: HTMLDivElement): Promise<void> {
  await act(async () => {
    root.unmount();
  });
  container.remove();
}

/** A believable mid-game save: team + PC, inventory, a badge, some money. */
function mockSave(): SaveData {
  const base = normalizeSave({ ...createSave("bulbasaur"), language: "fr" });
  const buddy = makePokemon("pidgey", 3, {});
  return normalizeSave({
    ...base,
    pc: [buddy],
    team: [base.team[0], buddy],
    inventory: {
      pokeball: 10,
      greatball: 3,
      berry: 5,
      sitrus: 2,
      potion: 1,
      hyperpotion: 0,
    },
    badges: ["Boulder Badge"],
    money: 2500,
    battlesWon: 12,
  });
}

const noop = () => {};
const PANEL_PROPS = {
  champion: CHAMPIONS[0],
  detailsMon: null,
  onClose: noop,
  onSetTab: noop,
  onUseItem: noop,
  onBuy: noop,
  onSetLeader: noop,
  onAddToTeam: noop,
  onRemoveFromTeam: noop,
  onViewDetails: noop,
  onChallengeChampion: noop,
  onCenterService: noop,
  onSellPokemon: noop,
  onBuyMarketMon: noop,
  onListMarketMon: () => null,
  onReturnMarketMon: noop,
  onExport: () => "",
  onImport: () => false,
  onReset: noop,
  onClearDetails: noop,
  onSetLanguage: noop,
  onSetDustTrail: noop,
  onSetBiome: noop,
  onSetMoves: noop,
  detailsIdx: null,
};

describe("PokemonBanner render smoke", () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom lacks matchMedia; the app only touches it defensively.
    if (!window.matchMedia) {
      window.matchMedia = (() => ({
        matches: false,
        addListener: noop,
        removeListener: noop,
      })) as never;
    }
  });

  it("renders the starter-selection screen on a fresh visit (no save crash)", async () => {
    const { root, container } = await mount(<PokemonBanner />);
    const text = container.textContent ?? "";
    // tr() must survive the null save — regression for the choose-phase crash.
    expect(text).toContain("GRASS");
    expect(text).toContain("FIRE");
    expect(text).toContain("WATER");
    expect(container.querySelectorAll("img")).toHaveLength(3); // three starters
    await unmount(root, container);
  });

  it("picking a starter moves to walking and persists the save", async () => {
    const { root, container } = await mount(<PokemonBanner />);
    const buttons = [...container.querySelectorAll("button")];
    const charmander = buttons.find((b) => b.textContent?.includes("FIRE"));
    expect(charmander).toBeTruthy();
    await act(async () => {
      charmander!.click();
    });
    expect(container.textContent ?? "").not.toContain("GRASS"); // choose screen gone
    expect(localStorage.getItem("poke-banner-save-v2")).toBeTruthy();
    await unmount(root, container);
  });

  it("loads an existing save straight into the walking phase", async () => {
    persistSave(mockSave(), localStorage);
    const { root, container } = await mount(<PokemonBanner />);
    expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    expect(container.textContent ?? "").not.toContain("GRASS");
    await unmount(root, container);
  });

  it("shows the portable manual-update chip when the shell is a portable build", async () => {
    // Portable builds can't self-update; the main process flags state
    // "portable" and the banner must surface the manual-download hint.
    (window as { desktopAPI?: unknown }).desktopAPI = {
      isDesktop: true,
      platform: "win32",
      setPanelHeight: noop,
      close: noop,
      reportVolume: noop,
      getUpdateStatus: async () => ({ state: "portable", version: null }),
      onUpdateStatus: noop,
      offUpdateStatus: noop,
    };
    persistSave(mockSave(), localStorage);
    const { root, container } = await mount(<PokemonBanner />);
    const text = container.textContent ?? "";
    expect(text).toContain("PORTABLE");
    await unmount(root, container);
    delete (window as { desktopAPI?: unknown }).desktopAPI;
  });
});

describe("GamePanels render smoke (every tab)", () => {
  const save = mockSave();
  const TABS: PanelTab[] = [
    "items",
    "team",
    "dex",
    "career",
    "eggs",
    "center",
    "market",
    "rank",
    "social",
    "admin",
    "shop",
    "arena",
    "code",
    "news",
    "save",
    "settings",
  ];

  beforeEach(() => {
    // NewsTab fetches release notes on mount — stub the network so the tab
    // renders its empty state deterministically (no real GitHub calls).
    globalThis.fetch = (async () =>
      ({
        ok: true,
        json: async () => [],
      })) as unknown as typeof fetch;
  });

  it.each(TABS)("renders the %s tab without crashing", async (tab) => {
    const { root, container } = await mount(
      <GamePanels {...PANEL_PROPS} save={save} tab={tab} />,
    );
    expect(container.querySelector(".nb-panel")).toBeTruthy();
    await unmount(root, container);
  });
});
