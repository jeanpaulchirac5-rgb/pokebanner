import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Public player feedback for the POKEBANNER home page.
 * No auth required — anyone on the landing page can leave a review,
 * report a bug, or suggest a future improvement.
 */

export const submitFeedback = mutation({
  args: {
    kind: v.union(v.literal("review"), v.literal("bug"), v.literal("idea")),
    text: v.string(),
    author: v.optional(v.string()),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const text = args.text.trim().slice(0, 2000);
    if (!text) {
      throw new Error("Feedback cannot be empty.");
    }
    let rating: number | undefined;
    if (args.kind === "review" && args.rating != null) {
      rating = Math.min(5, Math.max(1, Math.round(args.rating)));
    }
    await ctx.db.insert("feedback", {
      kind: args.kind,
      text,
      author: (args.author ?? "").trim().slice(0, 40) || undefined,
      rating,
      createdAt: Date.now(),
    });
  },
});

export const listFeedback = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(30, Math.max(1, args.limit ?? 12));
    return ctx.db.query("feedback").order("desc").take(limit);
  },
});
