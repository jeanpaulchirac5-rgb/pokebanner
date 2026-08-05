p = "src/game/engine.ts"
s = open(p).read()

def sub(old, new, tag):
    global s
    n = s.count(old)
    assert n == 1, f"anchor {tag}: found {n}"
    s = s.replace(old, new)

# 1) computeVictoryRewards pvp branch
sub(
"""  } else if (encounter.kind === "elite") {
    // Elite Four & League Champion (v1.9.0): the richest battles in the game.
    xpGain = Math.floor(xpGain * TUNING.eliteXpMult);
    moneyGain = isLeagueChampionMember(encounter.championId)
      ? TUNING.moneyPerLeagueChampion
      : TUNING.moneyPerElite;
  }""",
"""  } else if (encounter.kind === "elite") {
    // Elite Four & League Champion (v1.9.0): the richest battles in the game.
    xpGain = Math.floor(xpGain * TUNING.eliteXpMult);
    moneyGain = isLeagueChampionMember(encounter.championId)
      ? TUNING.moneyPerLeagueChampion
      : TUNING.moneyPerElite;
  } else if (encounter.kind === "pvp") {
    // Ghost PvP duels (v2.0.0): a solid purse + boosted XP. Rank-ladder
    // bookkeeping (promotions, rank-up bonuses) lives in pvpBookkeeping.
    xpGain = Math.floor(xpGain * 1.8);
    moneyGain = PVP_TUNING.moneyPerWin;
  }""",
"victory-pvp",
)

# 2) createSave new fields
sub(
"""    leagueChampion: false,
    trainersDefeated: 0,
    rivalDefeated: 0,
  };
}""",
"""    leagueChampion: false,
    trainersDefeated: 0,
    rivalDefeated: 0,
    // v2.0.0
    pvpWins: 0,
    pvpLosses: 0,
    passXp: 0,
    passClaimed: [],
    quests: null,
    auraSeen: 0,
    auraCaught: 0,
    photosTaken: 0,
  };
}""",
"createSave",
)

# 3) normalizeSave new fields + normalizeDailyQuests helper
sub(
"""    leagueChampion: Boolean(r.leagueChampion),
    trainersDefeated: Math.max(0, Math.floor(Number(r.trainersDefeated) || 0)),
    rivalDefeated: Math.max(0, Math.floor(Number(r.rivalDefeated) || 0)),
  };
}""",
"""    leagueChampion: Boolean(r.leagueChampion),
    trainersDefeated: Math.max(0, Math.floor(Number(r.trainersDefeated) || 0)),
    rivalDefeated: Math.max(0, Math.floor(Number(r.rivalDefeated) || 0)),
    // v2.0.0
    pvpWins: Math.max(0, Math.floor(Number(r.pvpWins) || 0)),
    pvpLosses: Math.max(0, Math.floor(Number(r.pvpLosses) || 0)),
    passXp: Math.max(0, Number(r.passXp) || 0),
    passClaimed: Array.isArray(r.passClaimed)
      ? (r.passClaimed as unknown[])
          .map((v) => Math.floor(Number(v)))
          .filter((v) => v >= 1 && v <= PASS_TIERS.length)
      : [],
    quests: normalizeDailyQuests(r.quests),
    auraSeen: Math.max(0, Math.floor(Number(r.auraSeen) || 0)),
    auraCaught: Math.max(0, Math.floor(Number(r.auraCaught) || 0)),
    photosTaken: Math.max(0, Math.floor(Number(r.photosTaken) || 0)),
  };
}

/** Internal: validate/repair a persisted DailyQuests payload (v2.0.0). */
function normalizeDailyQuests(raw: unknown): DailyQuests | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.date !== "string") return null;
  if (!Array.isArray(r.defs) || !Array.isArray(r.progress) || !Array.isArray(r.claimed)) {
    return null;
  }
  const defs = (r.defs as unknown[]).slice(0, QUEST_TUNING.count).map((d) => {
    const q = (d ?? {}) as Record<string, unknown>;
    const kind = QUEST_POOL.find((p) => p.kind === q.kind)?.kind ?? "battle";
    return {
      id: typeof q.id === "string" ? q.id : kind,
      kind,
      target: Math.max(1, Math.floor(Number(q.target) || 1)),
      reward: Math.max(0, Math.floor(Number(q.reward) || 0)),
    } as QuestDef;
  });
  if (defs.length === 0) return null;
  return {
    date: r.date,
    defs,
    progress: defs.map((_, i) =>
      Math.min(defs[i].target, Math.max(0, Math.floor(Number(r.progress[i]) || 0))),
    ),
    claimed: defs.map((_, i) => Boolean(r.claimed[i])),
  };
}""",
"normalizeSave",
)

# 4) normalizePokemon aura
sub(
"""    happiness: happinessOf(p),
  };
}""",
"""    happiness: happinessOf(p),
    aura: AURAS[p.aura as AuraKind] ? (p.aura as AuraKind) : undefined,
  };
}""",
"normalizePokemon",
)

open(p, "w").write(s)
print("patch-engine-b OK:", len(s), "chars")
