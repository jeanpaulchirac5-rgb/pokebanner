// ---------------------------------------------------------------------------
// i18n for POKEBANNER. Five languages: English, French, German, Spanish,
// Japanese. The in-game switcher stores the choice in the save
// (SaveData.language); these helpers are pure so the dictionaries and
// lookups are unit-testable.
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

export const LANGS: Language[] = ["en", "fr", "de", "es", "ja"];

export const LANG_LABELS: Record<Language, string> = {
  en: "EN",
  fr: "FR",
  de: "DE",
  es: "ES",
  ja: "JA",
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
  bag: { en: "BAG", fr: "SAC", de: "TASCHE", es: "MOCHILA", ja: "バッグ" },
  menu: { en: "MENU", fr: "MENU", de: "MENÜ", es: "MENÚ", ja: "メニュー" },
  arena: { en: "ARENA", fr: "ARÈNE", de: "ARENA", es: "ARENA", ja: "アリーナ" },
  paused: { en: "PAUSED", fr: "PAUSE", de: "PAUSE", es: "PAUSA", ja: "ポーズ中" },
  "grass-starter": { en: "GRASS", fr: "PLANTE", de: "PFLANZE", es: "PLANTA", ja: "くさ" },
  "fire-starter": { en: "FIRE", fr: "FEU", de: "FEUER", es: "FUEGO", ja: "ほのお" },
  "water-starter": { en: "WATER", fr: "EAU", de: "WASSER", es: "AGUA", ja: "みず" },
  // battle banner controls
  oran: { en: "ORAN", fr: "ORAN", de: "ORAN", es: "ORAN", ja: "オレン" },
  sitrus: { en: "SITRUS", fr: "SITRUS", de: "SITRUS", es: "SITRUS", ja: "オボン" },
  ball: { en: "BALL", fr: "BALL", de: "BALL", es: "BALL", ja: "ボール" },
  great: { en: "GREAT", fr: "SUPER", de: "SUPER", es: "SUPER", ja: "スーパー" },
  // messages
  "shiny-appears": { en: "A SHINY appears!!", fr: "Un CHROMATIQUE apparaît !!", de: "Ein SCHILLERNDES erscheint!!", es: "¡Aparece un VARIOS COLORES!", ja: "色違いが現れた！！" },
  "capture-failed": { en: "Capture failed!", fr: "Capture ratée !", de: "Fang fehlgeschlagen!", es: "¡Captura fallida!", ja: "捕まえられなかった！" },
  "no-balls": { en: "No Poké Balls!", fr: "Plus de Poké Balls !", de: "Keine Pokébälle!", es: "¡No hay Poké Balls!", ja: "モンスターボールがない！" },
  "captured": { en: "{mon} was caught!", fr: "{mon} a été capturé !", de: "{mon} wurde gefangen!", es: "¡{mon} fue capturado!", ja: "{mon} を捕まえた！" },
  "fainted": { en: "{mon} fainted...", fr: "{mon} est K.O.…", de: "{mon} ist besiegt…", es: "{mon} se debilitó...", ja: "{mon} は倒れた…" },
  "go": { en: "Go, {mon}!", fr: "À toi, {mon} !", de: "Los, {mon}!", es: "¡Adelante, {mon}!", ja: "いけ、{mon}！" },
  "grew": { en: "{mon} grew to Lv.{lv}!", fr: "{mon} monte au N.{lv} !", de: "{mon} erreicht Lv.{lv}!", es: "¡{mon} sube al Nv.{lv}!", ja: "{mon} は Lv.{lv} になった！" },
  "evolving": { en: "Huh? {mon} is evolving!", fr: "Hein ? {mon} évolue !", de: "Was? {mon} entwickelt sich!", es: "¿Qué? ¡{mon} está evolucionando!", ja: "えっ？ {mon} が進化している！" },
  "evolved": { en: "{a} evolved into {b}!", fr: "{a} évolue en {b} !", de: "{a} entwickelt sich zu {b}!", es: "¡{a} evolucionó a {b}!", ja: "{a} は {b} に進化した！" },
  "rewards": { en: "{xp} XP · ₽{money} earned!", fr: "{xp} XP · {money} ₽ gagnés !", de: "{xp} XP · {money} ₽ verdient!", es: "¡{xp} XP · {money} ₽ ganados!", ja: "{xp} XP・₽{money} を獲得！" },
  "badge-earned": { en: "{badge} earned! +5% team damage", fr: "{badge} obtenu ! +5% dégâts d'équipe", de: "{badge} erhalten! +5% Team-Schaden", es: "¡{badge} conseguida! +5% daño de equipo", ja: "{badge} を獲得！ チームのダメージ+5%" },
  "team-full": { en: "Team is full (6 max)!", fr: "Équipe complète (6 max) !", de: "Team ist voll (max. 6)!", es: "¡Equipo lleno (máx. 6)!", ja: "チームがいっぱいだ（最大6匹）！" },
  "leads": { en: "{mon} leads the walk!", fr: "{mon} mène la marche !", de: "{mon} führt den Weg an!", es: "¡{mon} lidera el paseo!", ja: "{mon} が先頭を歩く！" },
  "hp-full": { en: "{mon}'s HP is full!", fr: "Les PV de {mon} sont pleins !", de: "{mon}s KP sind voll!", es: "¡Los PS de {mon} están llenos!", ja: "{mon} のHPは満タンだ！" },
  "item-used": { en: "{item} used! +{hp} HP", fr: "{item} utilisé ! +{hp} PV", de: "{item} benutzt! +{hp} KP", es: "¡{item} usado! +{hp} PS", ja: "{item} を使った！ HP+{hp}" },
  "found-item": { en: "Found {item}!", fr: "{item} trouvé !", de: "{item} gefunden!", es: "¡{item} encontrado!", ja: "{item} を見つけた！" },
  "not-enough": { en: "Not enough ₽!", fr: "Pas assez de ₽ !", de: "Nicht genug ₽!", es: "¡No hay suficiente ₽!", ja: "お金が足りない！" },
  "bought": { en: "Bought {item}!", fr: "{item} acheté !", de: "{item} gekauft!", es: "¡{item} comprado!", ja: "{item} を買った！" },
  "sold": { en: "Sold {mon} for ₽{price}!", fr: "{mon} vendu pour {price} ₽ !", de: "{mon} für {price} ₽ verkauft!", es: "¡{mon} vendido por {price} ₽!", ja: "{mon} を ₽{price} で売った！" },
  "welcome": { en: "Welcome, {mon}! (₽{price})", fr: "Bienvenue, {mon} ! ({price} ₽)", de: "Willkommen, {mon}! ({price} ₽)", es: "¡Bienvenido, {mon}! ({price} ₽)", ja: "ようこそ、{mon}！（₽{price}）" },
  "returned": { en: "{mon} returned to your PC.", fr: "{mon} est revenu dans ton PC.", de: "{mon} ist zurück im PC.", es: "{mon} volvió a tu PC.", ja: "{mon} はパソコンに戻った。" },
  "egg-hatch": { en: "The egg cracks... CELEBI, the time traveler, hatches!", fr: "L'œuf se fissure… CELEBI, le voyageur du temps, éclot !", de: "Das Ei knackt... CELEBI, der Zeitreisende, schlüpft!", es: "¡El huevo se rompe... CELEBI, el viajero del tiempo, eclosiona!", ja: "タマゴが割れる…時を越える者、セレビィが孵った！" },
  "shop-unavailable": { en: "The merchant visits after 10 victories!", fr: "Le marchand revient après 10 victoires !", de: "Der Händler kommt nach 10 Siegen!", es: "¡El mercader vuelve tras 10 victorias!", ja: "商人は10勝後に現れる！" },
  // pokémon center
  "center-name": { en: "Pokémon Center", fr: "Centre Pokémon", de: "Pokémon-Center", es: "Centro Pokémon", ja: "ポケモンセンター" },
  "center-tag": { en: "Nurse Joy's care — walk in anytime to rest your team.", fr: "Les soins d'Infirmière Jo — entrez pour reposer votre équipe.", de: "Schwester Joys Pflege — komm jederzeit zum Ausruhen vorbei.", es: "Los cuidados de Enfermera Joy: entra a descansar a tu equipo.", ja: "ジョーイさんのケア — いつでも入ってチームを休めよう。" },
  "wallet": { en: "Wallet: ₽{money}", fr: "Portefeuille : {money} ₽", de: "Geldbeutel: {money} ₽", es: "Cartera: {money} ₽", ja: "おサイフ：₽{money}" },
  // codex / leaderboard
  shortcuts: { en: "Shortcuts", fr: "Raccourcis", de: "Tastenkürzel", es: "Atajos", ja: "ショートカット" },
  "players-guide": { en: "Player's guide", fr: "Guide du joueur", de: "Spielerhandbuch", es: "Guía del jugador", ja: "プレイヤーガイド" },
  "secret-waits": { en: "A secret waits…", fr: "Un secret t'attend…", de: "Ein Geheimnis wartet…", es: "Un secreto aguarda…", ja: "秘密が待っている…" },
  "rank-title": { en: "Hall of Fame", fr: "Temple de la Renommée", de: "Ruhmeshalle", es: "Salón de la Fama", ja: "殿堂入り" },
  "rank-tag": { en: "Top 10 trainers worldwide", fr: "Top 10 des dresseurs mondiaux", de: "Top 10 Trainer weltweit", es: "Top 10 entrenadores del mundo", ja: "世界のトップ10トレーナー" },
  "your-score": { en: "Your score", fr: "Ton score", de: "Dein Score", es: "Tu puntuación", ja: "あなたのスコア" },
  "submit-score": { en: "SUBMIT", fr: "ENVOYER", de: "SENDEN", es: "ENVIAR", ja: "送信" },
  "submitted": { en: "Score submitted!", fr: "Score envoyé !", de: "Score gesendet!", es: "¡Puntuación enviada!", ja: "スコアを送信しました！" },
  "rank-rejected": { en: "Suspicious save — score rejected.", fr: "Sauvegarde suspecte — score rejeté.", de: "Verdächtiger Speicherstand — abgelehnt.", es: "Partida sospechosa: puntuación rechazada.", ja: "不審なセーブ — スコアを拒否しました。" },
  "cheat-flag": { en: "Anti-cheat", fr: "Anti-triche", de: "Anti-Cheat", es: "Anti-trampas", ja: "アンチチート" },
  "friend-requests": { en: "Friend requests", fr: "Demandes d'amis", de: "Freundschaftsanfragen", es: "Solicitudes de amistad", ja: "フレンド申請" },
  "friends": { en: "Friends", fr: "Amis", de: "Freunde", es: "Amigos", ja: "フレンド" },
  "add-friend": { en: "Add friend", fr: "Ajouter un ami", de: "Freund hinzufügen", es: "Añadir amigo", ja: "フレンドを追加" },
  "trade-title": { en: "Trade offers", fr: "Offres d'échange", de: "Handelsangebote", es: "Ofertas de intercambio", ja: "交換オファー" },
  "wishlist": { en: "Wishlist", fr: "Liste de souhaits", de: "Wunschliste", es: "Lista de deseos", ja: "ほしいものリスト" },
  "mythical": { en: "Mythical", fr: "Fabuleux", de: "Mythos", es: "Mítico", ja: "幻" },
  // easter egg + settings + ground item
  "egg-title": { en: "A mysterious egg...", fr: "Un œuf mystérieux...", de: "Ein mysteriöses Ei...", es: "¡Un huevo misterioso...!", ja: "謎のタマゴ…" },
  "egg-flavor": { en: "Psychic/Grass · hatched from the mysterious egg.", fr: "Psy/Plante · éclos de l'œuf mystérieux.", de: "Psycho/Pflanze · aus dem mysteriösen Ei geschlüpft.", es: "Psíquico/Planta · eclosionado del huevo misterioso.", ja: "エスパー・くさ・謎のタマゴから孵った。" },
  "celebi-name": { en: "Celebi — the time traveler", fr: "Celebi — le voyageur du temps", de: "Celebi — der Zeitreisende", es: "Celebi — el viajero del tiempo", ja: "セレビィ・時を越える者" },
  "caught-label": { en: "Caught", fr: "Capturé", de: "Gefangen", es: "Capturado", ja: "捕まえた" },
  "pickup-title": { en: "Pick up the item!", fr: "Ramasse l'objet !", de: "Heb das Item auf!", es: "¡Recoge el objeto!", ja: "アイテムを拾う！" },
  "item-appeared": { en: "An item appeared!", fr: "Un objet apparaît !", de: "Ein Item ist aufgetaucht!", es: "¡Ha aparecido un objeto!", ja: "アイテムが現れた！" },
  settings: { en: "Settings", fr: "Réglages", de: "Einstellungen", es: "Ajustes", ja: "設定" },
  "dust-trail": { en: "Dust trail", fr: "Traînée de poussière", de: "Staubspur", es: "Rastro de polvo", ja: "ダストトレイル" },
  "dust-trail-desc": { en: "Footstep puffs behind your Pokémon while walking.", fr: "Nuages de poussière sous les pas de votre Pokémon.", de: "Fußspur-Staubwölkchen hinter deinem Pokémon.", es: "Nubecitas de polvo tras tu Pokémon al caminar.", ja: "歩くとき、ポケモンの足元に土ぼこり。" },
  on: { en: "ON", fr: "OUI", de: "AN", es: "SÍ", ja: "オン" },
  off: { en: "OFF", fr: "NON", de: "AUS", es: "NO", ja: "オフ" },
  "secret-waits-desc": { en: "Somewhere beyond the 151, a time traveler sleeps in an egg. The elders whisper it will hatch for the trainer who has earned every badge, registered the full Kanto Pokédex, and sent Team Rocket packing at least once. Keep your eyes on the sky.", fr: "Au-delà des 151, un voyageur du temps dort dans un œuf. Les anciens murmurent qu'il éclora pour le dresseur qui aura gagné tous les badges, complété le Pokédex de Kanto et vaincu la Team Rocket au moins une fois. Gardez l'œil sur le ciel.", de: "Jenseits der 151 schläft ein Zeitreisender in einem Ei. Die Alten flüstern, es werde für den Trainer schlüpfen, der alle Orden errungen, den gesamten Kanto-Pokédex erfasst und Team Rocket mindestens einmal besiegt hat. Haltet Ausschau nach dem Himmel.", es: "Más allá de los 151, un viajero del tiempo duerme en un huevo. Los ancianos susurran que eclosionará para el entrenador que haya ganado todas las medallas, completado la Pokédex de Kanto y derrotado al Team Rocket al menos una vez. Vigila el cielo.", ja: "151種の向こう、時を越える者がタマゴの中で眠っている。すべてのバッジを手に入れ、カントー図鑑を完成させ、ロケット団を一度は撃退したトレーナーのもとで孵ると言われている。空を見上げよ。" },
  "shortcut-mute": { en: "Mute / unmute all audio", fr: "Couper / rétablir le son", de: "Ton stummschalten / wieder einschalten", es: "Silenciar / reactivar el audio", ja: "すべての音をミュート／復帰" },
  "shortcut-bgm": { en: "Toggle music (BGM) only — SFX keep playing", fr: "Musique (BGM) seule — les effets restent", de: "Nur Musik (BGM) umschalten — Effekte laufen weiter", es: "Alternar solo la música (BGM): los efectos siguen", ja: "BGMだけ切り替え（効果音は継続）" },
  "shortcut-bag": { en: "Open the Bag", fr: "Ouvrir le Sac", de: "Tasche öffnen", es: "Abrir la Mochila", ja: "バッグを開く" },
  "shortcut-center": { en: "Open the Poké Center", fr: "Ouvrir le Centre Pokémon", de: "Pokémon-Center öffnen", es: "Abrir el Centro Pokémon", ja: "ポケモンセンターを開く" },
  "shortcut-market": { en: "Open the Marketplace", fr: "Ouvrir le Marché", de: "Marktplatz öffnen", es: "Abrir el Mercado", ja: "マーケットを開く" },
  "shortcut-close": { en: "Close panels", fr: "Fermer les panneaux", de: "Panels schließen", es: "Cerrar los paneles", ja: "パネルを閉じる" },
  // changelog / news panel
  news: { en: "NEWS", fr: "ACTUS", de: "NEWS", es: "NOVEDADES", ja: "ニュース" },
  "news-loading": { en: "Loading release notes…", fr: "Chargement des notes de version…", de: "Lade Versionshinweise…", es: "Cargando notas de versión…", ja: "リリースノートを読み込み中…" },
  "news-error": { en: "Couldn't load release notes (offline or GitHub unreachable).", fr: "Impossible de charger les notes de version (hors ligne ou GitHub injoignable).", de: "Versionshinweise konnten nicht geladen werden (offline oder GitHub nicht erreichbar).", es: "No se pudieron cargar las notas (sin conexión o GitHub inaccesible).", ja: "リリースノートを読み込めませんでした（オフラインかGitHubに接続できません）。" },
  "news-retry": { en: "RETRY", fr: "RÉESSAYER", de: "ERNEUT VERSUCHEN", es: "REINTENTAR", ja: "再試行" },
  "news-empty": { en: "No public releases yet — the changelog appears here once v1.1.0 ships.", fr: "Aucune version publique pour l'instant — le journal apparaîtra ici à la sortie de la v1.1.0.", de: "Noch keine öffentlichen Versionen — das Changelog erscheint hier, sobald v1.1.0 erscheint.", es: "Aún no hay versiones públicas: el registro aparecerá aquí cuando salga v1.1.0.", ja: "公開リリースはまだありません — v1.1.0がリリースされるとここに表示されます。" },
  // in-banner auto-update chip
  "update-downloading": { en: "UPDATE…", fr: "MISE À JOUR…", de: "UPDATE…", es: "ACTUALIZANDO…", ja: "更新中…" },
  "update-ready": { en: "UPDATE READY — RESTART", fr: "MÀJ PRÊTE — REDÉMARRER", de: "UPDATE BEREIT — NEUSTART", es: "ACT. LISTA — REINICIAR", ja: "更新完了 — 再起動" },
  "update-portable": { en: "PORTABLE — MANUAL UPDATE", fr: "PORTABLE — MÀJ MANUELLE", de: "PORTABLE — MANUELLES UPDATE", es: "PORTÁTIL — ACT. MANUAL", ja: "ポータブル版 — 手動更新" },
  // NEWS panel: installed-vs-latest diff banner + differential-update note
  "news-installed": { en: "Installed", fr: "Installée", de: "Installiert", es: "Instalada", ja: "インストール済み" },
  "news-latest": { en: "Latest", fr: "Dernière", de: "Neueste", es: "Última", ja: "最新" },
  "news-up-to-date": { en: "You're up to date ✓", fr: "Vous êtes à jour ✓", de: "Du bist auf dem neuesten Stand ✓", es: "Estás al día ✓", ja: "最新版です ✓" },
  "news-update-avail": { en: "Update available", fr: "Mise à jour disponible", de: "Update verfügbar", es: "Actualización disponible", ja: "更新があります" },
  "news-ahead": { en: "This build is ahead of the latest release", fr: "Cette version est plus récente que la dernière sortie", de: "Dieser Build ist neuer als die letzte Veröffentlichung", es: "Esta versión supera la última publicación", ja: "このビルドは最新リリースより新しい" },
  "news-diff-note": { en: "Installed builds update via differential patches (blockmaps) — only the changed bytes download. Portable users grab the new exe from GitHub.", fr: "Les versions installées se mettent à jour par patchs différentiels (blockmaps) — seuls les octets modifiés sont téléchargés. Les utilisateurs portables récupèrent le nouvel .exe sur GitHub.", de: "Installierte Builds aktualisieren per Differential-Patches (Blockmaps) — nur geänderte Bytes werden geladen. Portable-Nutzer laden die neue EXE von GitHub.", es: "Las versiones instaladas se actualizan con parches diferenciales (blockmaps): solo se descargan los bytes modificados. Los portátiles descargan el nuevo exe desde GitHub.", ja: "インストール版は差分パッチ（ブロックマップ）で更新され、変更分のみダウンロードされます。ポータブル版はGitHubから新しいexeを入手してください。" },
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
// Localized species names. French, German and Japanese use official
// localized names; Spanish keeps the English names for Kanto, so it falls
// back to English.
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

const SPECIES_JA: Record<string, string> = {
  bulbasaur: "フシギダネ", ivysaur: "フシギソウ", venusaur: "フシギバナ",
  charmander: "ヒトカゲ", charmeleon: "リザード", charizard: "リザードン",
  squirtle: "ゼニガメ", wartortle: "カメール", blastoise: "カメックス",
  caterpie: "キャタピー", metapod: "トランセル", butterfree: "バタフリー",
  weedle: "ビードル", kakuna: "コクーン", beedrill: "スピアー",
  pidgey: "ポッポ", pidgeotto: "ピジョン", pidgeot: "ピジョット",
  rattata: "コラッタ", raticate: "ラッタ", spearow: "オニスズメ", fearow: "オニドリル",
  ekans: "アーボ", arbok: "アーボック", pikachu: "ピカチュウ", raichu: "ライチュウ",
  sandshrew: "サンド", sandslash: "サンドパン",
  "nidoran-f": "ニドラン♀", nidorina: "ニドリーナ", nidoqueen: "ニドクイン",
  "nidoran-m": "ニドラン♂", nidorino: "ニドリーノ", nidoking: "ニドキング",
  clefairy: "ピッピ", clefable: "ピクシー", vulpix: "ロコン", ninetales: "キュウコン",
  jigglypuff: "プリン", wigglytuff: "プクリン",
  zubat: "ズバット", golbat: "ゴルバット", oddish: "ナゾノクサ", gloom: "クサイハナ",
  vileplume: "ラフレシア", paras: "パラス", parasect: "パラセクト", venonat: "コンパン",
  venomoth: "モルフォン", diglett: "ディグダ", dugtrio: "ダグトリオ",
  meowth: "ニャース", persian: "ペルシアン", psyduck: "コダック", golduck: "ゴルダック",
  mankey: "マンキー", primeape: "オコリザル", growlithe: "ガーディ", arcanine: "ウインディ",
  poliwag: "ニョロモ", poliwhirl: "ニョロゾ", poliwrath: "ニョロボン",
  abra: "ケーシィ", kadabra: "ユンゲラー", alakazam: "フーディン",
  machop: "ワンリキー", machoke: "ゴーリキー", machamp: "カイリキー",
  bellsprout: "マダツボミ", weepinbell: "ウツドン", victreebel: "ウツボット",
  tentacool: "メノクラゲ", tentacruel: "ドククラゲ", geodude: "イシツブテ",
  graveler: "ゴローン", golem: "ゴローニャ", ponyta: "ポニータ", rapidash: "ギャロップ",
  slowpoke: "ヤドン", slowbro: "ヤドラン", magnemite: "コイル", magneton: "レアコイル",
  farfetchd: "カモネギ", doduo: "ドードー", dodrio: "ドードリオ", seel: "パウワウ",
  dewgong: "ジュゴン", grimer: "ベトベター", muk: "ベトベトン", shellder: "シェルダー",
  cloyster: "パルシェン", gastly: "ゴース", haunter: "ゴースト", gengar: "ゲンガー",
  onix: "イワーク", drowzee: "スリープ", hypno: "スリーパー", krabby: "クラブ",
  kingler: "キングラー", voltorb: "ビリリダマ", electrode: "マルマイン",
  exeggcute: "タマタマ", exeggutor: "ナッシー", cubone: "カラカラ", marowak: "ガラガラ",
  hitmonlee: "サワムラー", hitmonchan: "エビワラー", lickitung: "ベロリンガ",
  koffing: "ドガース", weezing: "マタドガス", rhyhorn: "サイホーン", rhydon: "サイドン",
  chansey: "ラッキー", tangela: "モンジャラ", kangaskhan: "ガルーラ",
  horsea: "タッツー", seadra: "シードラ", goldeen: "トサキント", seaking: "アズマオウ",
  staryu: "ヒトデマン", starmie: "スターミー", "mr-mime": "バリヤード", scyther: "ストライク",
  jynx: "ルージュラ", electabuzz: "エレブー", magmar: "ブーバー", pinsir: "カイロス",
  tauros: "ケンタロス", magikarp: "コイキング", gyarados: "ギャラドス", lapras: "ラプラス",
  ditto: "メタモン", eevee: "イーブイ", vaporeon: "シャワーズ", jolteon: "サンダース",
  flareon: "ブースター", porygon: "ポリゴン", omanyte: "オムナイト", omastar: "オムスター",
  kabuto: "カブト", kabutops: "カブトプス", aerodactyl: "プテラ", snorlax: "カビゴン",
  articuno: "フリーザー", zapdos: "サンダー", moltres: "ファイヤー",
  dratini: "ミニリュウ", dragonair: "ハクリュー", dragonite: "カイリュー",
  mewtwo: "ミュウツー", mew: "ミュウ", celebi: "セレビィ",
};

/** Localized species display name; Spanish and unknown ids fall back to EN. */
export function localizedName(speciesId: string, lang: Language): string {
  if (lang === "fr" && SPECIES_FR[speciesId]) return SPECIES_FR[speciesId];
  if (lang === "de" && SPECIES_DE[speciesId]) return SPECIES_DE[speciesId];
  if (lang === "ja" && SPECIES_JA[speciesId]) return SPECIES_JA[speciesId];
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

const MOVES_JA: Record<string, string> = {
  tackle: "たいあたり", "quick-attack": "でんこうせっか", scratch: "ひっかく", bite: "かみつく",
  "vine-whip": "つるのムチ", "leech-seed": "やどりぎのタネ", "sleep-powder": "ねむりごな",
  ember: "ひのこ", "fire-fang": "ほのおのキバ", "flame-charge": "ニトロチャージ",
  "water-gun": "みずでっぽう", withdraw: "からにこもる", "thunder-shock": "でんきショック",
  thunderbolt: "10まんボルト", "rock-throw": "いわおとし", "rock-slide": "いわなだれ",
  gust: "かぜおこし", "poison-sting": "どくばり", peck: "つつく", "bug-bite": "むしくい",
  "mud-slap": "どろかけ", "karate-chop": "からてチョップ", acid: "ようかいえき",
  "string-shot": "いとをはく", "poison-powder": "どくのこな", "stun-spore": "しびれごな",
  "thunder-wave": "でんじは", sludge: "ヘドロこうげき", confusion: "ねんりき",
  psybeam: "サイケこうせん", "ancient-power": "げんしのちから",
};

/** Localized move display name (Spanish and unknown ids fall back to EN). */
export function localizedMoveName(moveId: string, lang: Language): string {
  if (lang === "fr" && MOVES_FR[moveId]) return MOVES_FR[moveId];
  if (lang === "de" && MOVES_DE[moveId]) return MOVES_DE[moveId];
  if (lang === "ja" && MOVES_JA[moveId]) return MOVES_JA[moveId];
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

const ITEMS_JA: Record<string, string> = {
  pokeball: "モンスターボール", greatball: "スーパーボール", berry: "オレンのみ",
  sitrus: "オボンのみ", potion: "キズぐすり", hyperpotion: "ハイパーきずぐすり",
  revive: "げんきのかけら",
};

/** Localized item display name (unknown ids fall back to the canonical name). */
export function localizedItemName(itemId: string, lang: Language): string {
  if (lang === "fr" && ITEMS_FR[itemId]) return ITEMS_FR[itemId];
  if (lang === "de" && ITEMS_DE[itemId]) return ITEMS_DE[itemId];
  if (lang === "ja" && ITEMS_JA[itemId]) return ITEMS_JA[itemId];
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

const CHAMPS_JA: Record<string, string> = {
  brock: "タケシ", misty: "カスミ", surge: "マチス",
  erika: "エリカ", koga: "キョウ", giovanni: "サカキ",
};

/** Localized gym-leader display name (unknown ids fall back to the canonical name). */
export function localizedChampionName(championId: string, lang: Language): string {
  if (lang === "fr" && CHAMPS_FR[championId]) return CHAMPS_FR[championId];
  if (lang === "de" && CHAMPS_DE[championId]) return CHAMPS_DE[championId];
  if (lang === "ja" && CHAMPS_JA[championId]) return CHAMPS_JA[championId];
  return CHAMPIONS.find((c) => c.id === championId)?.name ?? championId;
}

// ---------------------------------------------------------------------------
// Convenience: full display name of a species id in a language (used by the
// banner's nameOf/oldName replacements).
// ---------------------------------------------------------------------------
export { SPECIES, SPECIES_FR, SPECIES_DE, SPECIES_JA };
