// ---------------------------------------------------------------------------
// i18n for POKEBANNER. Four languages: English, French, German, Spanish.
// The in-game switcher stores the choice in the save (SaveData.language);
// these helpers are pure so the dictionaries and lookups are unit-testable.
// ---------------------------------------------------------------------------

import {
  CENTER_SERVICES,
  CHAMPIONS,
  ITEMS,
  MOVES,
  SPECIES,
  getSpecies,
} from "./constants";
import type { Language } from "./types";

export const LANGS: Language[] = ["en", "fr", "de", "es"];

export const LANG_LABELS: Record<Language, string> = {
  en: "EN",
  fr: "FR",
  de: "DE",
  es: "ES",
};

/** Validates an untrusted value as a Language (used by save normalization). */
export function isLanguage(v: unknown): v is Language {
  return LANGS.includes(v as Language);
}

// ---------------------------------------------------------------------------
// UI string dictionary (nested: key → language → text)
// ---------------------------------------------------------------------------

type Dict = Record<string, Record<Language, string>>;

const UI: Dict = {
  // banner buttons
  bag: { en: "BAG", fr: "SAC", de: "TASCHE", es: "MOCHILA" },
  menu: { en: "MENU", fr: "MENU", de: "MENÜ", es: "MENÚ" },
  arena: { en: "ARENA", fr: "ARÈNE", de: "ARENA", es: "ARENA" },
  paused: { en: "PAUSED", fr: "PAUSE", de: "PAUSE", es: "PAUSA" },
  "grass-starter": { en: "GRASS", fr: "PLANTE", de: "PFLANZE", es: "PLANTA" },
  "fire-starter": { en: "FIRE", fr: "FEU", de: "FEUER", es: "FUEGO" },
  "water-starter": { en: "WATER", fr: "EAU", de: "WASSER", es: "AGUA" },
  // battle banner controls
  oran: { en: "ORAN", fr: "ORAN", de: "ORAN", es: "ORAN" },
  sitrus: { en: "SITRUS", fr: "SITRUS", de: "SITRUS", es: "SITRUS" },
  ball: { en: "BALL", fr: "BALL", de: "BALL", es: "BALL" },
  great: { en: "GREAT", fr: "SUPER", de: "SUPER", es: "SUPER" },
  // messages
  "shiny-appears": { en: "A SHINY appears!!", fr: "Un CHROMATIQUE apparaît !!", de: "Ein SCHILLERNDES erscheint!!", es: "¡Aparece un VARIOS COLORES!" },
  "capture-failed": { en: "Capture failed!", fr: "Capture ratée !", de: "Fang fehlgeschlagen!", es: "¡Captura fallida!" },
  "no-balls": { en: "No Poké Balls!", fr: "Plus de Poké Balls !", de: "Keine Pokébälle!", es: "¡No hay Poké Balls!" },
  "captured": { en: "{mon} was caught!", fr: "{mon} a été capturé !", de: "{mon} wurde gefangen!", es: "¡{mon} fue capturado!" },
  "fainted": { en: "{mon} fainted...", fr: "{mon} est K.O.…", de: "{mon} ist besiegt…", es: "{mon} se debilitó..." },
  "go": { en: "Go, {mon}!", fr: "À toi, {mon} !", de: "Los, {mon}!", es: "¡Adelante, {mon}!" },
  "grew": { en: "{mon} grew to Lv.{lv}!", fr: "{mon} monte au N.{lv} !", de: "{mon} erreicht Lv.{lv}!", es: "¡{mon} sube al Nv.{lv}!" },
  "evolving": { en: "Huh? {mon} is evolving!", fr: "Hein ? {mon} évolue !", de: "Was? {mon} entwickelt sich!", es: "¿Qué? ¡{mon} está evolucionando!" },
  "evolved": { en: "{a} evolved into {b}!", fr: "{a} évolue en {b} !", de: "{a} entwickelt sich zu {b}!", es: "¡{a} evolucionó a {b}!" },
  "rewards": { en: "{xp} XP · ₽{money} earned!", fr: "{xp} XP · {money} ₽ gagnés !", de: "{xp} XP · {money} ₽ verdient!", es: "¡{xp} XP · {money} ₽ ganados!" },
  "badge-earned": { en: "{badge} earned! +5% team damage", fr: "{badge} obtenu ! +5% dégâts d'équipe", de: "{badge} erhalten! +5% Team-Schaden", es: "¡{badge} conseguida! +5% daño de equipo" },
  "team-full": { en: "Team is full (6 max)!", fr: "Équipe complète (6 max) !", de: "Team ist voll (max. 6)!", es: "¡Equipo lleno (máx. 6)!" },
  "leads": { en: "{mon} leads the walk!", fr: "{mon} mène la marche !", de: "{mon} führt den Weg an!", es: "¡{mon} lidera el paseo!" },
  "hp-full": { en: "{mon}'s HP is full!", fr: "Les PV de {mon} sont pleins !", de: "{mon}s KP sind voll!", es: "¡Los PS de {mon} están llenos!" },
  "item-used": { en: "{item} used! +{hp} HP", fr: "{item} utilisé ! +{hp} PV", de: "{item} benutzt! +{hp} KP", es: "¡{item} usado! +{hp} PS" },
  "found-item": { en: "Found {item}!", fr: "{item} trouvé !", de: "{item} gefunden!", es: "¡{item} encontrado!" },
  "not-enough": { en: "Not enough ₽!", fr: "Pas assez de ₽ !", de: "Nicht genug ₽!", es: "¡No hay suficiente ₽!" },
  "bought": { en: "Bought {item}!", fr: "{item} acheté !", de: "{item} gekauft!", es: "¡{item} comprado!" },
  "sold": { en: "Sold {mon} for ₽{price}!", fr: "{mon} vendu pour {price} ₽ !", de: "{mon} für {price} ₽ verkauft!", es: "¡{mon} vendido por {price} ₽!" },
  "welcome": { en: "Welcome, {mon}! (₽{price})", fr: "Bienvenue, {mon} ! ({price} ₽)", de: "Willkommen, {mon}! ({price} ₽)", es: "¡Bienvenido, {mon}! ({price} ₽)" },
  "returned": { en: "{mon} returned to your PC.", fr: "{mon} est revenu dans ton PC.", de: "{mon} ist zurück im PC.", es: "{mon} volvió a tu PC." },
  "egg-hatch": { en: "The egg cracks... CELEBI, the time traveler, hatches!", fr: "L'œuf se fissure… CELEBI, le voyageur du temps, éclot !", de: "Das Ei knackt... CELEBI, der Zeitreisende, schlüpft!", es: "¡El huevo se rompe... CELEBI, el viajero del tiempo, eclosiona!" },
  "shop-unavailable": { en: "The merchant visits after 10 victories!", fr: "Le marchand revient après 10 victoires !", de: "Der Händler kommt nach 10 Siegen!", es: "¡El mercader vuelve tras 10 victorias!" },
  // pokémon center
  "center-name": { en: "Pokémon Center", fr: "Centre Pokémon", de: "Pokémon-Center", es: "Centro Pokémon" },
  "center-tag": { en: "Nurse Joy's care — walk in anytime to rest your team.", fr: "Les soins d'Infirmière Jo — entrez pour reposer votre équipe.", de: "Schwester Joys Pflege — komm jederzeit zum Ausruhen vorbei.", es: "Los cuidados de Enfermera Joy: entra a descansar a tu equipo." },
  "wallet": { en: "Wallet: ₽{money}", fr: "Portefeuille : {money} ₽", de: "Geldbeutel: {money} ₽", es: "Cartera: {money} ₽" },
  // codex / leaderboard
  shortcuts: { en: "Shortcuts", fr: "Raccourcis", de: "Tastenkürzel", es: "Atajos" },
  "players-guide": { en: "Player's guide", fr: "Guide du joueur", de: "Spielerhandbuch", es: "Guía del jugador" },
  "secret-waits": { en: "A secret waits…", fr: "Un secret t'attend…", de: "Ein Geheimnis wartet…", es: "Un secreto aguarda…" },
  "rank-title": { en: "Hall of Fame", fr: "Temple de la Renommée", de: "Ruhmeshalle", es: "Salón de la Fama" },
  "rank-tag": { en: "Top 10 trainers worldwide", fr: "Top 10 des dresseurs mondiaux", de: "Top 10 Trainer weltweit", es: "Top 10 entrenadores del mundo" },
  "your-score": { en: "Your score", fr: "Ton score", de: "Dein Score", es: "Tu puntuación" },
  "submit-score": { en: "SUBMIT", fr: "ENVOYER", de: "SENDEN", es: "ENVIAR" },
  "submitted": { en: "Score submitted!", fr: "Score envoyé !", de: "Score gesendet!", es: "¡Puntuación enviada!" },
  "rank-rejected": { en: "Suspicious save — score rejected.", fr: "Sauvegarde suspecte — score rejeté.", de: "Verdächtiger Speicherstand — abgelehnt.", es: "Partida sospechosa: puntuación rechazada." },
  "cheat-flag": { en: "Anti-cheat", fr: "Anti-triche", de: "Anti-Cheat", es: "Anti-trampas" },
  "friend-requests": { en: "Friend requests", fr: "Demandes d'amis", de: "Freundschaftsanfragen", es: "Solicitudes de amistad" },
  "friends": { en: "Friends", fr: "Amis", de: "Freunde", es: "Amigos" },
  "add-friend": { en: "Add friend", fr: "Ajouter un ami", de: "Freund hinzufügen", es: "Añadir amigo" },
  "trade-title": { en: "Trade offers", fr: "Offres d'échange", de: "Handelsangebote", es: "Ofertas de intercambio" },
  "wishlist": { en: "Wishlist", fr: "Liste de souhaits", de: "Wunschliste", es: "Lista de deseos" },
  "mythical": { en: "Mythical", fr: "Fabuleux", de: "Mythos", es: "Mítico" },
};

/** Look up a UI string. Falls back to English, then to the key itself. */
export function t(lang: Language, key: string, vars?: Record<string, string | number>): string {
  const entry = UI[key];
  let text = entry?.[lang] ?? entry?.en ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}

/** All defined UI dictionary keys (used by the usage↔dictionary integrity test). */
export function uiKeys(): string[] {
  return Object.keys(UI);
}

// ---------------------------------------------------------------------------
// Localized species names. French and German use official localized names;
// Spanish keeps the English names for Kanto, so it falls back to English.
// ---------------------------------------------------------------------------

const SPECIES_FR: Record<string, string> = {
  bulbasaur: "Bulbizarre", ivysaur: "Herbizarre", venusaur: "Florizarre",
  charmander: "Salamèche", charmeleon: "Reptincel", charizard: "Dracaufeu",
  squirtle: "Carapuce", wartortle: "Carabaffe", blastoise: "Tortank",
  caterpie: "Chenipan", metapod: "Chrysacier", butterfree: "Papilusion",
  weedle: "Aspicot", kakuna: "Coconfort", beedrill: "Dardargnan",
  pidgey: "Roucool", pidgeotto: "Roucoups", pidgeot: "Roucarnage",
  rattata: "Rattata", raticate: "Rattatac", spearow: "Piafabec", fearow: "Rapasdepic",
  ekans: "Abo", arbok: "Arbok", pikachu: "Pikachu", raichu: "Raichu",
  sandshrew: "Sabelette", sandslash: "Sablaireau",
  "nidoran-f": "Nidoran♀", nidorina: "Nidorina", nidoqueen: "Nidoqueen",
  "nidoran-m": "Nidoran♂", nidorino: "Nidorino", nidoking: "Nidoking",
  clefairy: "Mélofée", clefable: "Mélodelfe", vulpix: "Goupix", ninetales: "Feunard",
  jigglypuff: "Rondoudou", wigglytuff: "Grodoudou",
  zubat: "Nosferapti", golbat: "Nosferalto", oddish: "Mystherbe", gloom: "Ortide",
  vileplume: "Rafflesia", paras: "Paras", parasect: "Parasect", venonat: "Mimitoss",
  venomoth: "Aéromite", diglett: "Taupiqueur", dugtrio: "Triopikeur",
  meowth: "Miaouss", persian: "Persian", psyduck: "Psykokwak", golduck: "Akwakwak",
  mankey: "Férosinge", primeape: "Colossinge", growlithe: "Caninos", arcanine: "Arcanin",
  poliwag: "Ptitard", poliwhirl: "Têtarte", poliwrath: "Tartard",
  abra: "Abra", kadabra: "Kadabra", alakazam: "Alakazam",
  machop: "Machoc", machoke: "Machopeur", machamp: "Mackogneur",
  bellsprout: "Chétiflor", weepinbell: "Boustiflor", victreebel: "Empiflor",
  tentacool: "Tentacool", tentacruel: "Tentacruel", geodude: "Racaillou",
  graveler: "Gravalanch", golem: "Grolem", ponyta: "Ponyta", rapidash: "Galopa",
  slowpoke: "Ramoloss", slowbro: "Flagadoss", magnemite: "Magnéti", magneton: "Magnéton",
  farfetchd: "Canarticho", doduo: "Doduo", dodrio: "Dodrio", seel: "Otaria",
  dewgong: "Lamantine", grimer: "Tadmorv", muk: "Grotadmorv", shellder: "Kokiyas",
  cloyster: "Crustabri", gastly: "Fantominus", haunter: "Spectrum", gengar: "Ectoplasma",
  onix: "Onix", drowzee: "Soporifik", hypno: "Hypnomade", krabby: "Krabby",
  kingler: "Krabboss", voltorb: "Voltorbe", electrode: "Électrode",
  exeggcute: "Nœunœuf", exeggutor: "Noadkoko", cubone: "Osselait", marowak: "Ossatueur",
  hitmonlee: "Kicklee", hitmonchan: "Tygnon", lickitung: "Excelangue",
  koffing: "Smogo", weezing: "Smogogo", rhyhorn: "Rhinocorne", rhydon: "Rhinoféros",
  chansey: "Leveinard", tangela: "Saquedeneu", kangaskhan: "Kangourex",
  horsea: "Hypotrempe", seadra: "Hypocéan", goldeen: "Poissirène", seaking: "Poissoroy",
  staryu: "Stari", starmie: "Staross", "mr-mime": "M. Mime", scyther: "Insécateur",
  jynx: "Lippoutou", electabuzz: "Élektek", magmar: "Magmar", pinsir: "Scarabrute",
  tauros: "Tauros", magikarp: "Magicarpe", gyarados: "Léviator", lapras: "Lokhlass",
  ditto: "Métamorph", eevee: "Évoli", vaporeon: "Aquali", jolteon: "Voltali",
  flareon: "Pyroli", porygon: "Porygon", omanyte: "Amonita", omastar: "Amonistar",
  kabuto: "Kabuto", kabutops: "Kabutops", aerodactyl: "Ptéra", snorlax: "Ronflex",
  articuno: "Artikodin", zapdos: "Électhor", moltres: "Sulfura",
  dratini: "Minidraco", dragonair: "Draco", dragonite: "Dracolosse",
  mewtwo: "Mewtwo", mew: "Mew", celebi: "Celebi",
};

const SPECIES_DE: Record<string, string> = {
  bulbasaur: "Bisasam", ivysaur: "Bisaknosp", venusaur: "Bisaflor",
  charmander: "Glumanda", charmeleon: "Glutexo", charizard: "Glurak",
  squirtle: "Schiggy", wartortle: "Schillok", blastoise: "Turtok",
  caterpie: "Raupy", metapod: "Safcon", butterfree: "Smettbo",
  weedle: "Hornliu", kakuna: "Kokuna", beedrill: "Bibor",
  pidgey: "Taubsi", pidgeotto: "Tauboga", pidgeot: "Tauboss",
  rattata: "Rattfratz", raticate: "Rattikarl", spearow: "Habitak", fearow: "Ibitak",
  ekans: "Rettan", arbok: "Arbok", pikachu: "Pikachu", raichu: "Raichu",
  sandshrew: "Sandan", sandslash: "Sandamer",
  "nidoran-f": "Nidoran♀", nidorina: "Nidorina", nidoqueen: "Nidoqueen",
  "nidoran-m": "Nidoran♂", nidorino: "Nidorino", nidoking: "Nidoking",
  clefairy: "Piepi", clefable: "Pixi", vulpix: "Vulpix", ninetales: "Vulnona",
  jigglypuff: "Pummeluff", wigglytuff: "Knuddeluff",
  zubat: "Zubat", golbat: "Golbat", oddish: "Myrapla", gloom: "Duflor",
  vileplume: "Giflor", paras: "Paras", parasect: "Parasek", venonat: "Bluzuk",
  venomoth: "Omot", diglett: "Digda", dugtrio: "Digdri",
  meowth: "Mauzi", persian: "Snobilikat", psyduck: "Enton", golduck: "Golduck",
  mankey: "Menki", primeape: "Rasaff", growlithe: "Fukano", arcanine: "Arkani",
  poliwag: "Quapsel", poliwhirl: "Quaputzi", poliwrath: "Quappo",
  abra: "Abra", kadabra: "Kadabra", alakazam: "Simsala",
  machop: "Machollo", machoke: "Maschock", machamp: "Machomei",
  bellsprout: "Knofensa", weepinbell: "Ultrigaria", victreebel: "Sarzenia",
  tentacool: "Tentacha", tentacruel: "Tentoxa", geodude: "Kleinstein",
  graveler: "Georok", golem: "Geowaz", ponyta: "Ponita", rapidash: "Gallopa",
  slowpoke: "Flegmon", slowbro: "Lahmus", magnemite: "Magnetilo", magneton: "Magneton",
  farfetchd: "Porenta", doduo: "Dodu", dodrio: "Dodri", seel: "Jurob",
  dewgong: "Jugong", grimer: "Sleima", muk: "Sleimok", shellder: "Muschas",
  cloyster: "Austos", gastly: "Nebulak", haunter: "Alpollo", gengar: "Gengar",
  onix: "Onix", drowzee: "Traumato", hypno: "Hypno", krabby: "Krabby",
  kingler: "Kingler", voltorb: "Voltobal", electrode: "Lektrobal",
  exeggcute: "Owei", exeggutor: "Kokowei", cubone: "Tragosso", marowak: "Knogga",
  hitmonlee: "Kicklee", hitmonchan: "Nockchan", lickitung: "Schlurp",
  koffing: "Smogon", weezing: "Smogmog", rhyhorn: "Rihorn", rhydon: "Rizeros",
  chansey: "Chaneira", tangela: "Tangela", kangaskhan: "Kangama",
  horsea: "Seemon", seadra: "Seemon", goldeen: "Goldini", seaking: "Golking",
  staryu: "Sterndu", starmie: "Starmie", "mr-mime": "Pantimos", scyther: "Sichlor",
  jynx: "Rossana", electabuzz: "Elektek", magmar: "Magmar", pinsir: "Pinsir",
  tauros: "Tauros", magikarp: "Karpador", gyarados: "Garados", lapras: "Lapras",
  ditto: "Ditto", eevee: "Evoli", vaporeon: "Aquana", jolteon: "Blitza",
  flareon: "Flamara", porygon: "Porygon", omanyte: "Amonitas", omastar: "Amoroso",
  kabuto: "Kabuto", kabutops: "Kabutops", aerodactyl: "Aerodactyl", snorlax: "Relaxo",
  articuno: "Arktos", zapdos: "Zapdos", moltres: "Lavados",
  dratini: "Dratini", dragonair: "Dragonir", dragonite: "Dragoran",
  mewtwo: "Mewtu", mew: "Mew", celebi: "Celebi",
};

/** Localized species display name; Spanish and unknown ids fall back to EN. */
export function localizedName(speciesId: string, lang: Language): string {
  if (lang === "fr" && SPECIES_FR[speciesId]) return SPECIES_FR[speciesId];
  if (lang === "de" && SPECIES_DE[speciesId]) return SPECIES_DE[speciesId];
  return getSpecies(speciesId).name;
}

// ---------------------------------------------------------------------------
// Localized move names (appear in battle logs + move popups)
// ---------------------------------------------------------------------------

const MOVES_FR: Record<string, string> = {
  tackle: "Charge", "quick-attack": "Vive-attaque", scratch: "Griffe", bite: "Morsure",
  "vine-whip": "Fouet Lianes", "leech-seed": "Vampigraine", "sleep-powder": "Poudre Dodo",
  ember: "Flammèche", "fire-fang": "Crocs Feu", "flame-charge": "NitroCharge",
  "water-gun": "Pistolet à O", withdraw: "Repli", "thunder-shock": "Éclair",
  thunderbolt: "Tonnerre", "rock-throw": "Jet-Pierres", "rock-slide": "Éboulement",
  gust: "Rafale Vent", "poison-sting": "Dard-Venin", peck: "Picpic", "bug-bite": "Piqûre",
  "mud-slap": "Coud'Boue", "karate-chop": "Poing Karaté", acid: "Acide",
  "string-shot": "Sécrétion", "poison-powder": "Poudre Toxik", "stun-spore": "Para-Spore",
  "thunder-wave": "Cage-Éclair", sludge: "Détritus", confusion: "Choc Mental",
  psybeam: "Rafale Psy", "ancient-power": "Pouvoir Antique",
};

const MOVES_DE: Record<string, string> = {
  tackle: "Tackle", "quick-attack": "Ruckzuckhieb", scratch: "Kratzer", bite: "Biss",
  "vine-whip": "Rankenhieb", "leech-seed": "Egelsamen", "sleep-powder": "Schlafpuder",
  ember: "Glut", "fire-fang": "Feuerzahn", "flame-charge": "Nitroladung",
  "water-gun": "Aquaknarre", withdraw: "Härtner", "thunder-shock": "Donnerschock",
  thunderbolt: "Donnerblitz", "rock-throw": "Steinwurf", "rock-slide": "Steinhagel",
  gust: "Windstoß", "poison-sting": "Giftstachel", peck: "Schnabel", "bug-bite": "Käferbiss",
  "mud-slap": "Lehmschelle", "karate-chop": "Karateschlag", acid: "Säure",
  "string-shot": "Fadenschuss", "poison-powder": "Giftpuder", "stun-spore": "Stachelspore",
  "thunder-wave": "Donnerwelle", sludge: "Schlammbad", confusion: "Konfusion",
  psybeam: "Psystrahl", "ancient-power": "Antik-Kraft",
};

/** Localized move display name (Spanish and unknown ids fall back to EN). */
export function localizedMoveName(moveId: string, lang: Language): string {
  if (lang === "fr" && MOVES_FR[moveId]) return MOVES_FR[moveId];
  if (lang === "de" && MOVES_DE[moveId]) return MOVES_DE[moveId];
  return MOVES[moveId]?.name ?? moveId;
}

// ---------------------------------------------------------------------------
// Localized item names
// ---------------------------------------------------------------------------

const ITEMS_FR: Record<string, string> = {
  pokeball: "Poké Ball", greatball: "Super Ball", berry: "Baie Oran",
  sitrus: "Baie Sitrus", potion: "Potion", hyperpotion: "Hyper Potion",
  revive: "Rappel",
};

const ITEMS_DE: Record<string, string> = {
  pokeball: "Pokéball", greatball: "Superball", berry: "Oranbeere",
  sitrus: "Sitrusbeere", potion: "Trank", hyperpotion: "Hypertrank",
  revive: "Beleber",
};

/** Localized item display name (unknown ids fall back to the canonical name). */
export function localizedItemName(itemId: string, lang: Language): string {
  if (lang === "fr" && ITEMS_FR[itemId]) return ITEMS_FR[itemId];
  if (lang === "de" && ITEMS_DE[itemId]) return ITEMS_DE[itemId];
  return (
    ITEMS[itemId]?.name ??
    CENTER_SERVICES[itemId as keyof typeof CENTER_SERVICES]?.name ??
    itemId
  );
}

// ---------------------------------------------------------------------------
// Localized champion names (gym leaders)
// ---------------------------------------------------------------------------

const CHAMPS_FR: Record<string, string> = {
  brock: "Pierre", misty: "Ondine", surge: "Major Bob",
  erika: "Érika", koga: "Koga", giovanni: "Giovanni",
};

const CHAMPS_DE: Record<string, string> = {
  brock: "Rocko", misty: "Misty", surge: "Major Bob",
  erika: "Erika", koga: "Koga", giovanni: "Giovanni",
};

/** Localized gym-leader display name (unknown ids fall back to the canonical name). */
export function localizedChampionName(championId: string, lang: Language): string {
  if (lang === "fr" && CHAMPS_FR[championId]) return CHAMPS_FR[championId];
  if (lang === "de" && CHAMPS_DE[championId]) return CHAMPS_DE[championId];
  return CHAMPIONS.find((c) => c.id === championId)?.name ?? championId;
}

// ---------------------------------------------------------------------------
// Convenience: full display name of a species id in a language (used by the
// banner's nameOf/oldName replacements).
// ---------------------------------------------------------------------------
export { SPECIES, SPECIES_FR, SPECIES_DE };
