p = "src/game/panels.tsx"
s = open(p).read()

def sub(old, new, tag):
    global s
    n = s.count(old)
    assert n == 1, f"anchor {tag}: found {n}"
    s = s.replace(old, new)

# 1) type imports
sub(
"""import type {
  CenterServiceId,
  ChampionDef,
  DexRarity,
  Language,
  Pokemon,
  SaveData,
} from "./types";
import { ArenaTab, CareerTab, CodexTab, EggsTab, FriendsTab, NewsTab, SaveTab, SettingsTab, ShopTab } from "./panels-tabs";""",
"""import type {
  CenterServiceId,
  ChampionDef,
  DexRarity,
  Language,
  PhotoEntry,
  Pokemon,
  SaveData,
  TrainerCard,
} from "./types";
import {
  ArenaTab,
  CareerTab,
  CodexTab,
  EggsTab,
  FriendsTab,
  NewsTab,
  PhotoTab,
  PvpTab,
  QuestsTab,
  SaveTab,
  SettingsTab,
  ShopTab,
} from "./panels-tabs";""",
"type-imports",
)

# 2) PanelTab union
sub(
"""  | "career"
  | "eggs"
  | "friends";""",
"""  | "career"
  | "eggs"
  | "friends"
  | "pvp"
  | "quests"
  | "photo";""",
"paneltab-union",
)

# 3) GamePanelsProps additions (after detailsIdx)
sub(
"""  /** v1.8.0: configure the 2 battle moves for a PC pokémon. */
  onSetMoves: (pcIndex: number, moves: string[]) => void;
  /** PC index of the Pokémon currently in the details view. */
  detailsIdx: number | null;
}""",
"""  /** v1.8.0: configure the 2 battle moves for a PC pokémon. */
  onSetMoves: (pcIndex: number, moves: string[]) => void;
  /** PC index of the Pokémon currently in the details view. */
  detailsIdx: number | null;
  /** v2.0.0 Ghost PvP: the imported opponent's Trainer Card (null = none). */
  ghostCard: TrainerCard | null;
  onImportCard: (code: string) => boolean;
  onChallengeGhost: () => void;
  /** v2.0.0 daily quests: claim quest index (0–2). */
  onClaimQuest: (index: number) => void;
  /** v2.0.0 League Pass: claim pass tier (1–30). */
  onClaimPassTier: (tier: number) => void;
  /** v2.0.0 Safari photo gallery. */
  photos: PhotoEntry[];
  photoScale: string;
  onSetPhotoScale: (scale: string) => void;
  onCapturePhoto: () => void;
  onDeletePhoto: (id: string) => void;
  onExportPhoto: (id: string) => void;
}""",
"props",
)

# 4) TABS entries
sub(
"""  { id: "career", label: "CAREER" },
  { id: "eggs", label: "EGGS" },
  { id: "friends", label: "FRIENDS" },""",
"""  { id: "career", label: "CAREER" },
  { id: "eggs", label: "EGGS" },
  { id: "friends", label: "FRIENDS" },
  { id: "pvp", label: "PVP" },
  { id: "quests", label: "QUESTS" },
  { id: "photo", label: "PHOTO" },""",
"tabs",
)

# 5) render lines
sub(
"""      {tab === "career" && <CareerTab {...props} />}
      {tab === "eggs" && <EggsTab {...props} />}
      {tab === "friends" && <FriendsTab {...props} />}""",
"""      {tab === "career" && <CareerTab {...props} />}
      {tab === "eggs" && <EggsTab {...props} />}
      {tab === "friends" && <FriendsTab {...props} />}
      {tab === "pvp" && <PvpTab {...props} />}
      {tab === "quests" && <QuestsTab {...props} />}
      {tab === "photo" && <PhotoTab {...props} />}""",
"render",
)

open(p, "w").write(s)
print("panels.tsx patched:", len(s), "chars")
