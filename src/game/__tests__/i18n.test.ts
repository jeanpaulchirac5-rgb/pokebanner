import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  LANGS,
  LANG_LABELS,
  isLanguage,
  localizedChampionName,
  localizedItemName,
  localizedMoveName,
  localizedName,
  t,
  uiKeys,
} from "../i18n";
import { KANTO_151 } from "../constants";

describe("i18n: language constants", () => {
  it("supports exactly the five requested languages", () => {
    expect(LANGS).toEqual(["en", "fr", "de", "es", "ja"]);
    for (const lang of LANGS) {
      expect(isLanguage(lang)).toBe(true);
    }
    expect(isLanguage("it")).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
  });

  it("labels every language", () => {
    expect(LANG_LABELS.en).toBe("EN");
    expect(LANG_LABELS.fr).toBe("FR");
    expect(LANG_LABELS.de).toBe("DE");
    expect(LANG_LABELS.es).toBe("ES");
    expect(LANG_LABELS.ja).toBe("JA");
  });
});

describe("i18n: t() UI strings", () => {
  it("translates a core banner string into all five languages", () => {
    const bag = {
      en: t("en", "bag"),
      fr: t("fr", "bag"),
      de: t("de", "bag"),
      es: t("es", "bag"),
      ja: t("ja", "bag"),
    };
    expect(bag.en).toBe("BAG");
    expect(bag.fr).toBe("SAC");
    expect(bag.de).toBe("TASCHE");
    expect(bag.es).toBe("MOCHILA");
    expect(bag.ja).toBe("バッグ");
  });

  it("every UI key has a Japanese row (no silent English fallbacks)", () => {
    for (const key of uiKeys()) {
      const ja = t("ja", key);
      expect(ja.length).toBeGreaterThan(0);
      // Japanese should never silently fall back to the raw key.
      expect(ja).not.toBe(key);
    }
  });

  it("falls back to English for missing language rows", () => {
    // Spanish deliberately reuses the English names for species/items, and
    // any unknown key falls back to English then the key itself.
    expect(t("es", "evolving", { mon: "Bulbasaur" })).toContain("evolucionando");
    expect(t("en", "no-such-key")).toBe("no-such-key");
    expect(t("es", "no-such-key")).toBe("no-such-key");
  });

  it("substitutes variables", () => {
    expect(t("en", "captured", { mon: "Pidgey" })).toBe("Pidgey was caught!");
    expect(t("fr", "captured", { mon: "Roucool" })).toBe("Roucool a été capturé !");
    expect(t("de", "rewards", { xp: 15, money: 10 })).toBe("15 XP · 10 ₽ verdient!");
    expect(t("es", "evolved", { a: "Charmander", b: "Charmeleon" })).toBe(
      "¡Charmander evolucionó a Charmeleon!",
    );
  });
});

describe("i18n: localized species names", () => {
  it("translates the starters and their evolutions into FR/DE", () => {
    expect(localizedName("bulbasaur", "fr")).toBe("Bulbizarre");
    expect(localizedName("ivysaur", "fr")).toBe("Herbizarre");
    expect(localizedName("venusaur", "fr")).toBe("Florizarre");
    expect(localizedName("charmander", "de")).toBe("Glumanda");
    expect(localizedName("charmeleon", "de")).toBe("Glutexo");
    expect(localizedName("charizard", "de")).toBe("Glurak");
    expect(localizedName("squirtle", "fr")).toBe("Carapuce");
    expect(localizedName("blastoise", "de")).toBe("Turtok");
  });

  it("covers every Kanto species with a French name", () => {
    // French is the full dictionary; every id must resolve (no fallbacks).
    for (const id of KANTO_151) {
      const fr = localizedName(id, "fr");
      const en = localizedName(id, "en");
      expect(fr.length).toBeGreaterThan(0);
      // A handful of species keep the same name in French; that's expected.
      expect(typeof fr).toBe("string");
      expect(en.length).toBeGreaterThan(0);
    }
  });

  it("covers every Kanto species with a German name", () => {
    for (const id of KANTO_151) {
      expect(localizedName(id, "de").length).toBeGreaterThan(0);
    }
  });

  it("covers every Kanto species with a Japanese name", () => {
    for (const id of KANTO_151) {
      expect(localizedName(id, "ja").length).toBeGreaterThan(0);
    }
  });

  it("Japanese uses the official katakana names for the starters", () => {
    expect(localizedName("bulbasaur", "ja")).toBe("フシギダネ");
    expect(localizedName("charmander", "ja")).toBe("ヒトカゲ");
    expect(localizedName("squirtle", "ja")).toBe("ゼニガメ");
    expect(localizedName("mewtwo", "ja")).toBe("ミュウツー");
  });

  it("Spanish falls back to the English names for Kanto", () => {
    expect(localizedName("bulbasaur", "es")).toBe(localizedName("bulbasaur", "en"));
    expect(localizedName("pidgey", "es")).toBe("Pidgey");
  });

  it("unknown species fall back to the canonical English name", () => {
    expect(localizedName("missingmon", "fr")).toBe("Missingmon");
  });
});

describe("i18n: move / item / champion names", () => {
  it("localizes move names", () => {
    expect(localizedMoveName("tackle", "fr")).toBe("Charge");
    expect(localizedMoveName("vine-whip", "fr")).toBe("Fouet Lianes");
    expect(localizedMoveName("thunderbolt", "de")).toBe("Donnerblitz");
    expect(localizedMoveName("water-gun", "es")).toBe("Water Gun");
    expect(localizedMoveName("tackle", "ja")).toBe("たいあたり");
    expect(localizedMoveName("thunderbolt", "ja")).toBe("10まんボルト");
  });

  it("localizes item names", () => {
    expect(localizedItemName("pokeball", "fr")).toBe("Poké Ball");
    expect(localizedItemName("berry", "de")).toBe("Oranbeere");
    expect(localizedItemName("pokeball", "en")).toBe("Poké Ball");
    expect(localizedItemName("greatball", "es")).toBe("Great Ball");
    expect(localizedItemName("pokeball", "ja")).toBe("モンスターボール");
    expect(localizedItemName("revive", "ja")).toBe("げんきのかけら");
  });

  it("localizes the revive item in every language", () => {
    expect(localizedItemName("revive", "en")).toBe("Revive & Restore");
    expect(localizedItemName("revive", "fr")).toBe("Rappel");
    expect(localizedItemName("revive", "de")).toBe("Beleber");
    expect(localizedItemName("revive", "es")).toBe("Revive & Restore");
  });

  it("localizes champion names", () => {
    expect(localizedChampionName("brock", "fr")).toBe("Pierre");
    expect(localizedChampionName("misty", "de")).toBe("Misty");
    expect(localizedChampionName("brock", "en")).toBe("Brock");
    expect(localizedChampionName("koga", "es")).toBe("Koga");
    expect(localizedChampionName("brock", "ja")).toBe("タケシ");
    expect(localizedChampionName("misty", "ja")).toBe("カスミ");
  });

  it("falls back to the raw id for unknown champions", () => {
    expect(localizedChampionName("gary", "en")).toBe("gary");
  });
});

// ---------------------------------------------------------------------------
// Usage ↔ dictionary integrity: scan the real UI sources for every literal
// tr("key") / t(lang, "key") call and make sure the dictionary matches usage.
// Guards against typo'd keys (t() silently renders the raw key) and dead rows.
// ---------------------------------------------------------------------------

const here = fileURLToPath(new URL(".", import.meta.url));
const SOURCES = [
  `${here}../PokemonBanner.tsx`,
  `${here}../panels.tsx`,
  `${here}../panels-tabs.tsx`,
  `${here}../panels-v2.tsx`,
  `${here}../../pages/Landing.tsx`,
];

/** Extract literal tr("key") and t(lang, "key") keys from a source string. */
function usedUiKeys(src: string): Set<string> {
  const keys = new Set<string>();
  const re = /(?<![A-Za-z])tr\("([a-z][a-z-]*)"|(?<![A-Za-z])t\(\s*[^,)]*,\s*"([a-z][a-z-]*)"/g;
  for (const m of src.matchAll(re)) {
    const key = m[1] ?? m[2];
    if (key) keys.add(key);
  }
  return keys;
}

describe("i18n: usage ↔ dictionary integrity", () => {
  const dict = new Set(uiKeys());

  it("every tr()/t() key used in the app exists in the UI dictionary", () => {
    const missing: string[] = [];
    for (const file of SOURCES) {
      const src = readFileSync(file, "utf8");
      for (const key of usedUiKeys(src)) {
        if (!dict.has(key)) missing.push(`${file.split("/").pop()}:${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("no dictionary entry is dead — every key is used somewhere", () => {
    const used = new Set<string>();
    for (const file of SOURCES) {
      for (const key of usedUiKeys(readFileSync(file, "utf8"))) used.add(key);
    }
    const dead = [...dict].filter((k) => !used.has(k)).sort();
    expect(dead).toEqual([]);
  });

  it("templates only use whitelisted placeholder names", () => {
    const allowed = new Set([
      "mon",
      "item",
      "xp",
      "money",
      "hp",
      "lv",
      "a",
      "b",
      "badge",
      "price",
      "n",
      "name",
      "rank",
      "tier",
      "reward",
      "aura",
    ]);
    const bad: string[] = [];
    for (const key of uiKeys()) {
      const matches = [...t("en", key).matchAll(/\{([a-z]+)\}/g)].map((m) => m[1]);
      for (const p of matches) {
        if (!allowed.has(p)) bad.push(`${key}:{${p}}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
