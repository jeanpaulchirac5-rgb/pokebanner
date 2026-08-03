import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

/**
 * Public player-to-player marketplace for POKEBANNER.
 * No auth required — any player can list a Pokémon for sale and buy from
 * others, spending the PokéDollars they earned in battle. The actual money
 * lives in each player's local save; these functions are the shared bulletin
 * board. Buying atomically marks a listing sold so two players can't both
 * buy the same Pokémon.
 */

async function isBanned(ctx: QueryCtx, name: string): Promise<boolean> {
  if (!name) return false;
  const ban = await ctx.db
    .query("bans")
    .withIndex("by_player", (q) => q.eq("playerName", name))
    .first();
  return Boolean(ban);
}

export const listPokemon = mutation({
  args: {
    sellerName: v.optional(v.string()),
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
    price: v.number(),
  },
  handler: async (ctx, args) => {
    if (await isBanned(ctx, (args.sellerName ?? "").trim())) {
      throw new Error("This trainer is banned from the marketplace.");
    }
    if (args.level < 1 || args.level > 100) throw new Error("Invalid level.");
    const price = Math.max(1, Math.floor(args.price));
    await ctx.db.insert("marketListings", {
      sellerName: (args.sellerName ?? "").trim().slice(0, 24) || undefined,
      speciesId: args.speciesId,
      name: args.name,
      level: args.level,
      hp: args.hp,
      maxHp: args.maxHp,
      atk: args.atk,
      def: args.def,
      xp: args.xp,
      shiny: args.shiny,
      nickname: args.nickname,
      price,
      sold: false,
      createdAt: Date.now(),
    });
  },
});

export const buyListing = mutation({
  args: {
    listingId: v.id("marketListings"),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new Error("Listing no longer exists.");
    if (listing.sold) throw new Error("This Pokémon has already been sold.");
    await ctx.db.patch(args.listingId, { sold: true });
    return listing;
  },
});

export const cancelListing = mutation({
  args: {
    listingId: v.id("marketListings"),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.sold) return; // already gone / sold — nothing to cancel
    await ctx.db.delete(args.listingId);
  },
});

export const listListings = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(40, Math.max(1, args.limit ?? 20));
    return ctx.db
      .query("marketListings")
      .order("desc")
      .take(limit);
  },
});
