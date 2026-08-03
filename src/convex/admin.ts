import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Admin identity — THE ONLY ADMIN.
//
// Set this to your own email address. The game reads this constant server-side
// and only grants admin powers (banning cheaters, removing listings, deleting
// feedback) to the single signed-in user whose email matches. No other user can
// become admin through the game UI.
// ---------------------------------------------------------------------------
export const ADMIN_EMAILS: string[] = [
  "you@example.com", // ← REPLACE with your email to unlock admin powers
];

/** True when the signed-in user is the admin (email matches the list). */
export async function isAdmin(ctx: QueryCtx): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return false;
  const user = await ctx.db.get(userId);
  const email = (user?.email ?? "").toLowerCase().trim();
  return ADMIN_EMAILS.some((e) => e.toLowerCase().trim() === email);
}

async function requireAdmin(ctx: QueryCtx): Promise<void> {
  if (!(await isAdmin(ctx))) {
    throw new Error("Admin only.");
  }
}

/** Admin: ban a trainer name — hides their leaderboard entries and blocks
 *  future score submissions / marketplace listings from that name. */
export const banPlayer = mutation({
  args: { playerName: v.string(), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const name = args.playerName.trim().slice(0, 24);
    if (!name) throw new Error("Missing trainer name.");
    const existing = await ctx.db
      .query("bans")
      .withIndex("by_player", (q) => q.eq("playerName", name))
      .first();
    if (!existing) {
      await ctx.db.insert("bans", {
        playerName: name,
        reason: (args.reason ?? "").trim().slice(0, 200),
        bannedAt: Date.now(),
      });
    }
    // Hide the banned player's leaderboard entries.
    const entries = await ctx.db
      .query("leaderboard")
      .filter((q) => q.eq(q.field("playerName"), name))
      .collect();
    for (const e of entries) await ctx.db.delete(e._id);
    return { banned: name };
  },
});

/** Admin: unban a trainer name. */
export const unbanPlayer = mutation({
  args: { playerName: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const name = args.playerName.trim().slice(0, 24);
    const ban = await ctx.db
      .query("bans")
      .withIndex("by_player", (q) => q.eq("playerName", name))
      .first();
    if (ban) await ctx.db.delete(ban._id);
    return { unbanned: name };
  },
});

/** Public-ish query: is the signed-in user the admin? (False when signed
 *  out or when the email doesn't match ADMIN_EMAILS — never throws.) */
export const isAdminUser = query({
  args: {},
  handler: async (ctx) => isAdmin(ctx),
});

/** Admin: list current bans (used by the admin panel in-game). */
export const listBans = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return [];
    return ctx.db.query("bans").order("desc").take(100);
  },
});

/** Admin: current signed-in user's email (for the ADMIN tab's setup hint).
 *  Returns null when signed out — never throws, never leaks other users. */
export const myEmail = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    return user?.email ?? null;
  },
});

/** Admin: remove any marketplace listing. */
export const removeListing = mutation({
  args: { listingId: v.id("marketListings") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const listing = await ctx.db.get(args.listingId);
    if (listing) await ctx.db.delete(args.listingId);
    return { removed: args.listingId };
  },
});

/** Admin: delete any feedback entry. */
export const deleteFeedback = mutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const fb = await ctx.db.get(args.feedbackId);
    if (fb) await ctx.db.delete(args.feedbackId);
    return { removed: args.feedbackId };
  },
});

/** Admin: delete an open trade offer. */
export const cancelTradeOffer = mutation({
  args: { offerId: v.id("tradeOffers") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const offer = await ctx.db.get(args.offerId);
    if (offer) await ctx.db.delete(args.offerId);
    return { removed: args.offerId };
  },
});
