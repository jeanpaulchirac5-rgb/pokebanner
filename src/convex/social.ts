import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { cheatScore } from "../game/engine";

// ---------------------------------------------------------------------------
// Social layer for POKEBANNER: global leaderboard, friendships, trading, and
// wishlists. Player identity is the trainer name they choose in-game (matching
// the anonymous market model). Leaderboard submissions are validated with the
// same pure cheatScore() the game engine uses — impossible saves are rejected
// server-side so cheaters can't top the Hall of Fame.
// ---------------------------------------------------------------------------

const NAME_MAX = 24;
const TEAM_MAX = 6;
const SCORE_MAX = 10_000_000;

const cleanName = (raw: unknown): string =>
  (typeof raw === "string" ? raw : "").trim().slice(0, NAME_MAX);

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

/** Composite score used by the Hall of Fame (pure, mirrors engine). */
export function compositeScore(args: {
  badges: number;
  dexCaught: number;
  teamLevel: number;
  battlesWon: number;
  money: number;
}): number {
  return (
    args.badges * 1000 +
    args.dexCaught * 50 +
    args.teamLevel * 10 +
    args.battlesWon * 15 +
    Math.min(5000, Math.floor(args.money / 10))
  );
}

/**
 * Submit a leaderboard entry. Payload includes the full save (for server-side
 * anti-cheat analysis); only the score + team snapshot is persisted.
 * Rejects: banned names, empty names, impossible saves (cheatScore >= 40),
 * teams over 6, negative/overflow scores.
 */
export const submitScore = mutation({
  args: {
    playerName: v.string(),
    save: v.any(), // full local save for server-side cheat analysis
  },
  handler: async (ctx, args) => {
    const name = cleanName(args.playerName);
    if (!name) throw new Error("Trainer name required.");

    // Banned players can't submit.
    const ban = await ctx.db
      .query("bans")
      .withIndex("by_player", (q) => q.eq("playerName", name))
      .first();
    if (ban) throw new Error("This trainer is banned from the leaderboard.");

    // Server-side anti-cheat on the raw save (same pure logic as the engine).
    const report = cheatScore(args.save);
    if (report.score >= 40) {
      throw new Error(`Suspicious save rejected: ${report.flags.join(", ")}`);
    }

    const raw = (args.save ?? {}) as Record<string, unknown>;
    const teamRaw = Array.isArray(raw.team) ? (raw.team as Record<string, unknown>[]) : [];
    if (teamRaw.length > TEAM_MAX) throw new Error("Team too large.");

    const team = teamRaw.slice(0, TEAM_MAX).map((m) => ({
      speciesId: String(m.speciesId ?? "bulbasaur").slice(0, 24),
      level: Math.min(100, Math.max(1, Math.floor(Number(m.level) || 1))),
      shiny: Boolean(m.shiny),
    }));
    const badgesArr = Array.isArray(raw.badges) ? (raw.badges as unknown[]) : [];
    const badges = Math.min(6, Math.max(0, badgesArr.length));
    const dexCaught = Math.min(152, Math.max(0, Math.floor(Number(raw.dexCaught) || 0)));
    const teamLevel = team.reduce((s, m) => s + m.level, 0);
    const battlesWon = Math.min(1_000_000, Math.max(0, Math.floor(Number(raw.battlesWon) || 0)));
    const money = Math.max(0, Math.floor(Number(raw.money) || 0));

    const score = Math.min(
      SCORE_MAX,
      compositeScore({ badges, dexCaught, teamLevel, battlesWon, money }),
    );

    // Upsert: a trainer's best score wins.
    const existing = await ctx.db
      .query("leaderboard")
      .filter((q) => q.eq(q.field("playerName"), name))
      .first();
    if (existing) {
      if (score > existing.score) {
        await ctx.db.patch(existing._id, {
          score,
          badges,
          dexCaught,
          teamLevel,
          battlesWon,
          team,
          submittedAt: Date.now(),
        });
      }
    } else {
      await ctx.db.insert("leaderboard", {
        playerName: name,
        score,
        badges,
        dexCaught,
        teamLevel,
        battlesWon,
        team,
        submittedAt: Date.now(),
      });
    }
    return { score, accepted: true };
  },
});

/** Top 10 trainers (by composite score), with their teams for profile cards. */
export const topPlayers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(10, Math.max(1, args.limit ?? 10));
    return ctx.db.query("leaderboard").order("desc").take(limit);
  },
});

/** Look up one trainer's leaderboard entry (for profile view from landing). */
export const playerProfile = query({
  args: { playerName: v.string() },
  handler: async (ctx, args) => {
    const name = cleanName(args.playerName);
    if (!name) return null;
    return ctx.db
      .query("leaderboard")
      .filter((q) => q.eq(q.field("playerName"), name))
      .first();
  },
});

// ---------------------------------------------------------------------------
// Friendships (by trainer name)
// ---------------------------------------------------------------------------

export const sendFriendRequest = mutation({
  args: { fromName: v.string(), toName: v.string() },
  handler: async (ctx, args) => {
    const from = cleanName(args.fromName);
    const to = cleanName(args.toName);
    if (!from || !to) throw new Error("Names required.");
    if (from === to) throw new Error("You can't add yourself.");
    const existing = await ctx.db
      .query("friendships")
      .withIndex("by_names", (q) => q.eq("fromName", from).eq("toName", to))
      .first();
    if (existing) throw new Error("Request already sent.");
    // Also block a reverse pending/duplicate.
    const reverse = await ctx.db
      .query("friendships")
      .withIndex("by_names", (q) => q.eq("fromName", to).eq("toName", from))
      .first();
    if (reverse?.status === "accepted") throw new Error("Already friends.");
    if (reverse?.status === "pending") {
      // They already asked you — accept instead.
      await ctx.db.patch(reverse._id, { status: "accepted" });
      return { accepted: true, reverse: true };
    }
    await ctx.db.insert("friendships", {
      fromName: from,
      toName: to,
      status: "pending",
      createdAt: Date.now(),
    });
    return { accepted: false, reverse: false };
  },
});

export const respondFriendRequest = mutation({
  args: { requestId: v.id("friendships"), accept: v.boolean() },
  handler: async (ctx, args) => {
    const req = await ctx.db.get(args.requestId);
    if (!req || req.status !== "pending") throw new Error("Request gone.");
    if (args.accept) {
      await ctx.db.patch(args.requestId, { status: "accepted" });
    } else {
      await ctx.db.delete(args.requestId);
    }
    return { ok: true };
  },
});

/** Friend requests sent TO me (pending) + my accepted friends. */
export const myFriends = query({
  args: { playerName: v.string() },
  handler: async (ctx, args) => {
    const name = cleanName(args.playerName);
    if (!name) return { friends: [], requests: [] };
    const rows = await ctx.db.query("friendships").collect();
    const friends: string[] = [];
    const requests: { _id: Id<"friendships">; fromName: string }[] = [];
    for (const r of rows) {
      if (r.status === "accepted") {
        if (r.fromName === name) friends.push(r.toName);
        else if (r.toName === name) friends.push(r.fromName);
      } else if (r.status === "pending" && r.toName === name) {
        requests.push({ _id: r._id, fromName: r.fromName });
      }
    }
    return { friends, requests };
  },
});

// ---------------------------------------------------------------------------
// Trading — two-way Pokémon swap
// ---------------------------------------------------------------------------

const monValidator = v.object({
  speciesId: v.string(),
  name: v.string(),
  level: v.number(),
  hp: v.number(),
  maxHp: v.number(),
  atk: v.number(),
  def: v.number(),
  xp: v.number(),
  shiny: v.boolean(),
  nickname: v.optional(v.string()),
});

export const createTradeOffer = mutation({
  args: {
    offererName: v.string(),
    offered: monValidator,
    wantedSpeciesId: v.string(),
  },
  handler: async (ctx, args) => {
    const name = cleanName(args.offererName);
    if (!name) throw new Error("Trainer name required.");
    const ban = await ctx.db
      .query("bans")
      .withIndex("by_player", (q) => q.eq("playerName", name))
      .first();
    if (ban) throw new Error("This trainer is banned from trading.");
    if (args.offered.level < 1 || args.offered.level > 100) {
      throw new Error("Invalid Pokémon level.");
    }
    await ctx.db.insert("tradeOffers", {
      offererName: name,
      offered: args.offered,
      wantedSpeciesId: args.wantedSpeciesId.slice(0, 24),
      status: "open",
      accepterName: undefined,
      acceptedMon: undefined,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const listTradeOffers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(20, Math.max(1, args.limit ?? 20));
    return ctx.db.query("tradeOffers").order("desc").take(limit);
  },
});

export const cancelTradeOffer = mutation({
  args: { offerId: v.id("tradeOffers"), playerName: v.string() },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.offerId);
    if (!offer) return;
    if (offer.offererName !== cleanName(args.playerName)) {
      throw new Error("Only the offerer can cancel.");
    }
    if (offer.status === "accepted") throw new Error("Already traded.");
    await ctx.db.delete(args.offerId);
  },
});

/** Accept an open trade: the accepter supplies their own mon of the wanted
 *  species; both sides receive the other's Pokémon. Atomic. */
export const acceptTradeOffer = mutation({
  args: { offerId: v.id("tradeOffers"), accepterName: v.string(), acceptedMon: monValidator },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.offerId);
    if (!offer || offer.status !== "open") throw new Error("Offer no longer open.");
    const name = cleanName(args.accepterName);
    if (!name) throw new Error("Trainer name required.");
    if (offer.offererName === name) throw new Error("You can't trade with yourself.");
    if (args.acceptedMon.speciesId !== offer.wantedSpeciesId) {
      throw new Error(`Needs a ${offer.wantedSpeciesId} to trade.`);
    }
    const ban = await ctx.db
      .query("bans")
      .withIndex("by_player", (q) => q.eq("playerName", name))
      .first();
    if (ban) throw new Error("This trainer is banned from trading.");
    await ctx.db.patch(offer._id, {
      status: "accepted",
      accepterName: name,
      acceptedMon: args.acceptedMon,
    });
    // Return both sides so each player can add their new Pokémon locally.
    return {
      received: offer.offered, // what the accepter receives
      given: args.acceptedMon, // what the offerer receives
      offererName: offer.offererName,
    };
  },
});

// ---------------------------------------------------------------------------
// Wishlists
// ---------------------------------------------------------------------------

export const addWishlist = mutation({
  args: { playerName: v.string(), speciesId: v.string() },
  handler: async (ctx, args) => {
    const name = cleanName(args.playerName);
    if (!name) throw new Error("Trainer name required.");
    const species = args.speciesId.trim().slice(0, 24);
    if (!species) throw new Error("Species required.");
    const existing = await ctx.db
      .query("wishlists")
      .withIndex("by_player", (q) => q.eq("playerName", name))
      .collect();
    if (existing.some((w) => w.speciesId === species)) return { ok: true };
    await ctx.db.insert("wishlists", {
      playerName: name,
      speciesId: species,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const removeWishlist = mutation({
  args: { playerName: v.string(), speciesId: v.string() },
  handler: async (ctx, args) => {
    const name = cleanName(args.playerName);
    const rows = await ctx.db
      .query("wishlists")
      .withIndex("by_player", (q) => q.eq("playerName", name))
      .collect();
    const hit = rows.find((w) => w.speciesId === args.speciesId);
    if (hit) await ctx.db.delete(hit._id);
    return { ok: true };
  },
});

export const myWishlist = query({
  args: { playerName: v.string() },
  handler: async (ctx, args) => {
    const name = cleanName(args.playerName);
    if (!name) return [];
    return ctx.db.query("wishlists").withIndex("by_player", (q) => q.eq("playerName", name)).collect();
  },
});
