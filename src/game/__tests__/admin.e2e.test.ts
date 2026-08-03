/* eslint-disable @typescript-eslint/no-explicit-any -- Convex ctx mocks in this e2e suite */
// ---------------------------------------------------------------------------
// ADMIN gate + ban flow — end-to-end through the REAL production handlers.
//
// The Convex functions in src/convex/admin.ts, src/convex/social.ts and
// src/convex/market.ts can't run against a real deployment here, so we mock
// the two runtime entry points they import (_generated/server's mutation/query
// wrappers and @convex-dev/auth/server's getAuthUserId) and drive each
// function's .handler() directly with a tiny in-memory fake ctx/db. Every
// branch — the admin email gate, ban bookkeeping, leaderboard cleanup, and
// the marketplace/trade/leaderboard enforcement — is the production code.
// ---------------------------------------------------------------------------

import { beforeEach, describe, expect, it, vi } from "vitest";

// Signed-in user identity fed to getAuthUserId (null === signed out).
const auth = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock("@convex-dev/auth/server", () => ({
  getAuthUserId: async () => auth.userId,
}));

// identity wrappers: return the definition as-is so we can call .handler()
// directly without arg-validation indirection.
vi.mock("../../convex/_generated/server", () => ({
  mutation: (def: unknown) => def,
  query: (def: unknown) => def,
}));

import * as admin from "../../convex/admin";
import * as market from "../../convex/market";
import * as social from "../../convex/social";

// ---------------------------------------------------------------------------
// Minimal predicate + in-memory db (supports everything the handlers use)
// ---------------------------------------------------------------------------

type FieldRef = { __field: string };

interface PredLike {
  children: Array<{ left: string | FieldRef; right: unknown }>;
  eq: (left: string | FieldRef, right: unknown) => PredLike;
}

const field = (name: string): FieldRef => ({ __field: name });

function makePred(left: string | FieldRef, right: unknown): PredLike {
  const children: Array<{ left: string | FieldRef; right: unknown }> = [{ left, right }];
  const self = {
    children,
    eq(nextLeft: string | FieldRef, nextRight: unknown) {
      children.push({ left: nextLeft, right: nextRight });
      return self;
    },
  };
  return self;
}

function predMatches(pred: PredLike, row: Record<string, unknown>): boolean {
  return pred.children.every(({ left, right }) => {
    const key =
      left && typeof left === "object" && "__field" in left
        ? (left as FieldRef).__field
        : (left as string);
    return row[key] === right;
  });
}

type Row = Record<string, unknown> & { _id: string };

class FakeDb {
  tables: Record<string, Row[]> = {};
  private seq = 0;

  get(id: string): Row | null {
    for (const rows of Object.values(this.tables)) {
      const hit = rows.find((r) => r._id === id);
      if (hit) return hit;
    }
    return null;
  }

  insert(table: string, doc: Record<string, unknown>): string {
    const row = { ...doc, _id: `${table}#${++this.seq}` } as Row;
    (this.tables[table] ??= []).push(row);
    return row._id;
  }

  delete(id: string): void {
    for (const rows of Object.values(this.tables)) {
      const i = rows.findIndex((r) => r._id === id);
      if (i >= 0) {
        rows.splice(i, 1);
        return;
      }
    }
  }

  patch(id: string, fields: Record<string, unknown>): void {
    for (const rows of Object.values(this.tables)) {
      const hit = rows.find((r) => r._id === id);
      if (hit) {
        Object.assign(hit, fields);
        return;
      }
    }
  }

  query(table: string) {
    const rows = (): Row[] => this.tables[table] ?? [];
    const filters: PredLike[] = [];
    let desc = false;
    const evalRows = (): Row[] => {
      const out = rows().filter((r) => filters.every((p) => predMatches(p, r)));
      return desc ? [...out].reverse() : out;
    };
    const qb = {
      withIndex(
        _name: string,
        pred?: (q: { eq: typeof makePred; field: typeof field }) => PredLike,
      ) {
        if (pred) filters.push(pred({ eq: makePred, field }));
        return qb;
      },
      filter(pred: (q: { eq: typeof makePred; field: typeof field }) => PredLike) {
        filters.push(pred({ eq: makePred, field }));
        return qb;
      },
      order(dir: string) {
        desc = dir === "desc";
        return qb;
      },
      first() {
        return evalRows()[0] ?? null;
      },
      collect() {
        return evalRows();
      },
      take(n: number) {
        return evalRows().slice(0, n);
      },
    };
    return qb;
  }
}

// A save that passes the server-side cheatScore() anti-cheat (level ≤ cap,
// HP ≤ max, money in line with wins, known dex species, banked XP).
const cleanSave = {
  version: 2,
  team: [{ speciesId: "bulbasaur", level: 5, hp: 19, maxHp: 20, xp: 0 }],
  pc: [],
  money: 100,
  battlesWon: 1,
  pokedex: { bulbasaur: "caught" },
  shiniesSeen: 0,
};

const pidgey = {
  speciesId: "pidgey",
  name: "Pidgey",
  level: 4,
  hp: 16,
  maxHp: 16,
  atk: 8,
  def: 6,
  xp: 0,
  shiny: false,
};

describe("ADMIN gate — lock / unlock (real handlers, fake ctx)", () => {
  let db: FakeDb;
  let ctx: { db: FakeDb };
  let adminUserId: string;
  let normalUserId: string;
  const ADMIN_EMAIL = admin.ADMIN_EMAILS[0] as string;

  beforeEach(() => {
    db = new FakeDb();
    ctx = { db };
    adminUserId = db.insert("users", { email: ADMIN_EMAIL, name: "Admin" });
    normalUserId = db.insert("users", { email: "player@example.com", name: "Player" });
  });

  it("signed out → locked: isAdminUser=false, myEmail=null, listBans=[], ban rejected", async () => {
    auth.userId = null;
    expect(await (admin.isAdminUser as any).handler(ctx)).toBe(false);
    expect(await (admin.myEmail as any).handler(ctx)).toBeNull();
    expect(await (admin.listBans as any).handler(ctx)).toEqual([]);
    await expect(
      (admin.banPlayer as any).handler(ctx, { playerName: "cheater1" }),
    ).rejects.toThrow("Admin only.");
  });

  it("signed in with a non-admin email → locked, hint shows the email", async () => {
    auth.userId = normalUserId;
    expect(await (admin.isAdminUser as any).handler(ctx)).toBe(false);
    expect(await (admin.myEmail as any).handler(ctx)).toBe("player@example.com");
    await expect(
      (admin.banPlayer as any).handler(ctx, { playerName: "cheater1" }),
    ).rejects.toThrow("Admin only.");
  });

  it("signed in with the admin email → unlocked", async () => {
    auth.userId = adminUserId;
    expect(await (admin.isAdminUser as any).handler(ctx)).toBe(true);
    expect(await (admin.myEmail as any).handler(ctx)).toBe(ADMIN_EMAIL);
    expect(await (admin.listBans as any).handler(ctx)).toEqual([]);
  });

  it("admin email match is case- and whitespace-insensitive", async () => {
    const upper = db.insert("users", { email: `${ADMIN_EMAIL.toUpperCase()}   ` });
    auth.userId = upper;
    expect(await (admin.isAdminUser as any).handler(ctx)).toBe(true);
  });

  it("non-admin cannot moderate (unban/remove/delete/cancel all rejected)", async () => {
    auth.userId = normalUserId;
    await expect(
      (admin.unbanPlayer as any).handler(ctx, { playerName: "cheater1" }),
    ).rejects.toThrow("Admin only.");
    await expect(
      (admin.removeListing as any).handler(ctx, { listingId: "marketListings#1" }),
    ).rejects.toThrow("Admin only.");
    await expect(
      (admin.deleteFeedback as any).handler(ctx, { feedbackId: "feedback#1" }),
    ).rejects.toThrow("Admin only.");
    await expect(
      (admin.cancelTradeOffer as any).handler(ctx, { offerId: "tradeOffers#1" }),
    ).rejects.toThrow("Admin only.");
  });
});

describe("ban flow end-to-end (real handlers, fake ctx)", () => {
  let db: FakeDb;
  let ctx: { db: FakeDb };
  let adminUserId: string;

  beforeEach(() => {
    db = new FakeDb();
    ctx = { db };
    const ADMIN_EMAIL = admin.ADMIN_EMAILS[0] as string;
    adminUserId = db.insert("users", { email: ADMIN_EMAIL, name: "Admin" });
    auth.userId = adminUserId; // the admin is signed in
  });

  it("ban → leaderboard wiped → blocked everywhere → unban restores", async () => {
    // 1. cheater reaches the leaderboard
    const first = await (social.submitScore as any).handler(ctx, {
      playerName: "cheater1",
      save: cleanSave,
    });
    expect(first).toEqual({ score: expect.any(Number), accepted: true });
    const entries = await (social.topPlayers as any).handler(ctx, {});
    expect((entries as Array<{ playerName: string }>).map((e) => e.playerName)).toEqual([
      "cheater1",
    ]);

    // 2. admin bans them — ban recorded, leaderboard entries removed
    await (admin.banPlayer as any).handler(ctx, {
      playerName: "cheater1",
      reason: "impossible save",
    });
    expect(await (social.topPlayers as any).handler(ctx, {})).toHaveLength(0);
    const bans = (await (admin.listBans as any).handler(ctx)) as Array<{
      playerName: string;
      reason: string;
    }>;
    expect(bans).toHaveLength(1);
    expect(bans[0].playerName).toBe("cheater1");
    expect(bans[0].reason).toBe("impossible save");

    // 3. banned from leaderboard submissions
    await expect(
      (social.submitScore as any).handler(ctx, { playerName: "cheater1", save: cleanSave }),
    ).rejects.toThrow("banned from the leaderboard");

    // 4. banned from the marketplace
    await expect(
      (market.listPokemon as any).handler(ctx, {
        sellerName: "cheater1",
        ...pidgey,
        price: 100,
      }),
    ).rejects.toThrow("banned from the marketplace");

    // 5. banned from trading
    await expect(
      (social.createTradeOffer as any).handler(ctx, {
        offererName: "cheater1",
        offered: pidgey,
        wantedSpeciesId: "pikachu",
      }),
    ).rejects.toThrow("banned from trading");

    // 6. unban restores everything
    await (admin.unbanPlayer as any).handler(ctx, { playerName: "cheater1" });
    expect(await (admin.listBans as any).handler(ctx)).toHaveLength(0);
    const restored = await (social.submitScore as any).handler(ctx, {
      playerName: "cheater1",
      save: cleanSave,
    });
    expect(restored).toEqual({ score: expect.any(Number), accepted: true });
  });

  it("bans are keyed by exact trainer name — other players are unaffected", async () => {
    await (admin.banPlayer as any).handler(ctx, { playerName: "cheater1" });
    const ok = await (social.submitScore as any).handler(ctx, {
      playerName: "honest_player",
      save: cleanSave,
    });
    expect(ok.accepted).toBe(true);
    // a different-but-close name is NOT blocked
    await expect(
      (market.listPokemon as any).handler(ctx, {
        sellerName: "cheater2",
        ...pidgey,
        price: 50,
      }),
    ).resolves.toBeUndefined();
  });
});
