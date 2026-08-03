import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // add other tables here

    // Player feedback for the POKEBANNER home page: reviews, bug reports,
    // and feature ideas. Public submit/list so anyone can leave feedback.
    feedback: defineTable({
      kind: v.union(
        v.literal("review"),
        v.literal("bug"),
        v.literal("idea"),
      ),
      text: v.string(),
      author: v.optional(v.string()),
      rating: v.optional(v.number()), // 1–5 stars, reviews only
      createdAt: v.number(),
    }).index("by_createdAt", ["createdAt"]),

    // Player-to-player Pokémon marketplace: a public listing board where
    // players list a Pokémon for sale and others can buy it with their
    // in-game PokéDollars. Mirrors the feedback table's public/no-auth model.
    marketListings: defineTable({
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
      sold: v.boolean(),
      createdAt: v.number(),
    }).index("by_createdAt", ["createdAt"]),

    // Global leaderboard — top 10 trainers with their composite score and
    // a snapshot of their team. Submissions are anti-cheat validated.
    leaderboard: defineTable({
      playerName: v.string(),
      score: v.number(),
      badges: v.number(),
      dexCaught: v.number(),
      teamLevel: v.number(),
      battlesWon: v.number(),
      // Team snapshot (≤6 entries): speciesId + level + shiny for profile cards
      team: v.array(
        v.object({
          speciesId: v.string(),
          level: v.number(),
          shiny: v.boolean(),
        }),
      ),
      submittedAt: v.number(),
    }).index("by_score", ["score"]),

    // Player-to-player friendships (by trainer name, matching the market's
    // anonymous name model). status: pending | accepted.
    friendships: defineTable({
      fromName: v.string(),
      toName: v.string(),
      status: v.union(v.literal("pending"), v.literal("accepted")),
      createdAt: v.number(),
    }).index("by_names", ["fromName", "toName"]),

    // Pokémon trading: a two-way swap offer. offerer lists their mon and what
    // they want; the accepter fulfills it with their own mon. Atomic accept.
    tradeOffers: defineTable({
      offererName: v.string(),
      offered: v.object({
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
      }),
      wantedSpeciesId: v.string(),
      status: v.union(v.literal("open"), v.literal("accepted")),
      accepterName: v.optional(v.string()),
      acceptedMon: v.optional(
        v.object({
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
        }),
      ),
      createdAt: v.number(),
    }).index("by_status", ["status"]),

    // Wishlists: a trainer lists species they'd love to find on the market.
    wishlists: defineTable({
      playerName: v.string(),
      speciesId: v.string(),
      createdAt: v.number(),
    }).index("by_player", ["playerName"]),

    // Anti-cheat bans. When the admin bans a trainer name, their leaderboard
    // entries and future submissions are blocked.
    bans: defineTable({
      playerName: v.string(),
      reason: v.string(),
      bannedAt: v.number(),
    }).index("by_player", ["playerName"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
