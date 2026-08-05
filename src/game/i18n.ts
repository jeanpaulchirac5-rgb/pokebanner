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
  LEAGUE,
  MOVES,
  SPECIES,
  getDexMeta,
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
  // dynamic weather announcements (v1.5.0)
  "rain-start": { en: "It started to rain!", fr: "Il se met à pleuvoir !", de: "Es beginnt zu regnen!", es: "¡Empieza a llover!", ja: "雨が降り出した！" },
  "snow-start": { en: "Snow started falling!", fr: "Il se met à neiger !", de: "Es beginnt zu schneien!", es: "¡Empieza a nevar!", ja: "雪が降り出した！" },
  "starry-start": { en: "A starry night falls over the route…", fr: "Une nuit étoilée tombe sur la route…", de: "Eine Sternennacht senkt sich über die Route…", es: "Una noche estrellada cae sobre la ruta…", ja: "星降る夜が道に広がる…" },
  "clear-sky": { en: "The sky clears up.", fr: "Le ciel se dégage.", de: "Der Himmel klart auf.", es: "El cielo se despeja.", ja: "空が晴れ渡った。" },
  // rare weather events (v1.8.0) — eclipse & aurora lure Legendary Bosses
  "eclipse-start": { en: "A solar eclipse darkens the sky!", fr: "Une éclipse solaire assombrit le ciel !", de: "Eine Sonnenfinsternis verdunkelt den Himmel!", es: "¡Un eclipse solar oscurece el cielo!", ja: "日食が空を暗くした！" },
  "aurora-start": { en: "An aurora dances across the night sky!", fr: "Une aurore boréale danse dans le ciel nocturne !", de: "Eine Aurora tanzt über den Nachthimmel!", es: "¡Una aurora baila en el cielo nocturno!", ja: "オーロラが夜空に舞う！" },
  "legendary-appears": { en: "{mon} descends from the sky!!", fr: "{mon} descend du ciel !!", de: "{mon} steigt vom Himmel herab!!", es: "¡¡{mon} desciende del cielo!!", ja: "{mon} が空から舞い降りた！！" },
  "legendary-tag": { en: "LEGENDARY", fr: "LÉGENDAIRE", de: "LEGENDE", es: "LEGENDARIO", ja: "伝説" },
  // egg system (v1.8.0)
  "egg-found": { en: "A mysterious egg appeared!", fr: "Un œuf mystérieux apparaît !", de: "Ein mysteriöses Ei erscheint!", es: "¡Ha aparecido un huevo misterioso!", ja: "ふしぎなタマゴを見つけた！" },
  "egg-hatched": { en: "{mon} hatched from an egg!", fr: "{mon} sort de l'œuf !", de: "{mon} schlüpft aus dem Ei!", es: "¡{mon} salió de un huevo!", ja: "{mon} がタマゴから孵った！" },
  "eggs-title": { en: "Eggs", fr: "Œufs", de: "Eier", es: "Huevos", ja: "タマゴ" },
  "eggs-empty": { en: "No eggs yet. Find one in the grass or buy from the merchant!", fr: "Pas encore d'œufs. Cherchez dans l'herbe ou achetez-en au marchand !", de: "Noch keine Eier. Suche im Gras oder kaufe beim Händler!", es: "Aún no hay huevos. ¡Búscalos en la hierba o cómpralos al mercader!", ja: "タマゴはまだない。草むらで探すか、商人から買おう！" },
  "eggs-hint": { en: "Walk to hatch.", fr: "Marche pour faire éclore.", de: "Laufe, um es schlüpfen zu lassen.", es: "Camina para eclosionar.", ja: "歩くと孵る。" },
  // career stats & badges (v1.8.0)
  "career-title": { en: "Career", fr: "Carrière", de: "Karriere", es: "Carrera", ja: "キャリア" },
  "career-badges": { en: "Kanto Badges", fr: "Badges de Kanto", de: "Kanto-Orden", es: "Medallas de Kanto", ja: "カントーのバッジ" },
  "career-stats": { en: "Lifetime Stats", fr: "Statistiques de carrière", de: "Lebenszeit-Statistiken", es: "Estadísticas de por vida", ja: "通算記録" },
  "career-tag": { en: "Your whole trainer journey: badges, battles and records.", fr: "Tout votre parcours de dresseur : badges, combats et records.", de: "Deine ganze Trainer-Reise: Orden, Kämpfe und Rekorde.", es: "Todo tu viaje de entrenador: medallas, combates y récords.", ja: "トレーナーの旅のすべて：バッジ、バトル、記録。" },
  "career-money": { en: "₽ Earned", fr: "₽ Gagnés", de: "₽ Verdient", es: "₽ Ganados", ja: "獲得₽" },
  "career-wins": { en: "Wins", fr: "Victoires", de: "Siege", es: "Victorias", ja: "勝利" },
  "career-losses": { en: "Losses", fr: "Défaites", de: "Niederlagen", es: "Derrotas", ja: "敗北" },
  "career-captures": { en: "Captures", fr: "Captures", de: "Fänge", es: "Capturas", ja: "捕獲" },
  "career-champions": { en: "Champions", fr: "Champions", de: "Champions", es: "Campeones", ja: "ジムリーダー" },
  "career-rockets": { en: "Rockets", fr: "Rocket", de: "Rockets", es: "Rocket", ja: "ロケット団" },
  "career-legendaries": { en: "Legendaries", fr: "Légendaires", de: "Legendäre", es: "Legendarios", ja: "伝説" },
  "career-shinies": { en: "Shinies", fr: "Chromatiques", de: "Schillernde", es: "Variocolores", ja: "色違い" },
  "career-eggs": { en: "Eggs Hatched", fr: "Œufs éclos", de: "Geschlüpfte Eier", es: "Huevos eclosionados", ja: "孵った数" },
  "career-steps": { en: "Steps", fr: "Pas", de: "Schritte", es: "Pasos", ja: "歩数" },
  "career-badge-bonus": { en: "Badge bonus", fr: "Bonus de badge", de: "Orden-Bonus", es: "Bono de medalla", ja: "バッジボーナス" },
  "career-damage": { en: "damage", fr: "dégâts", de: "Schaden", es: "daño", ja: "ダメージ" },
  "career-next": { en: "Next milestone", fr: "Prochain objectif", de: "Nächstes Ziel", es: "Próximo hito", ja: "次の目標" },
  "career-next-desc": { en: "Earn all 8 badges for the full +40% damage bonus — then hunt the Legendary Bosses during Eclipse & Aurora events.", fr: "Obtenez les 8 badges pour le bonus de +40% de dégâts — puis chassez les Boss Légendaires lors des éclipses et aurores.", de: "Sammle alle 8 Orden für +40% Schaden — dann jage die Legendären Bosse bei Sonnenfinsternis & Aurora.", es: "Consigue las 8 medallas para el +40% de daño — ¡luego caza a los Jefes Legendarios durante eclipses y auroras!", ja: "バッジを8個集めてダメージ+40%を獲得。日食・オーロラの伝説ボスを狩ろう！" },
  "eggs-count": { en: "incubating", fr: "en incubation", de: "brüten", es: "incubando", ja: "温め中" },
  "eggs-tag": { en: "Every step you walk hatches them a little more.", fr: "Chaque pas que vous faites les fait éclore un peu plus.", de: "Jeder Schritt, den du gehst, bringt sie dem Schlüpfen näher.", es: "Cada paso que das los hace eclosionar un poco más.", ja: "歩くほどタマゴは孵りに近づく。" },
  "eggs-steps": { en: "steps", fr: "pas", de: "Schritte", es: "pasos", ja: "歩" },
  "eggs-hatched": { en: "Hatched", fr: "Éclos", de: "Geschlüpft", es: "Eclosionados", ja: "孵った" },
  // biome picker (v1.8.0)
  "biome-title": { en: "Biome", fr: "Biome", de: "Biom", es: "Bioma", ja: "エリア" },
  "biome-auto": { en: "Auto (rotates every 500 steps)", fr: "Auto (alterne toutes les 500 pas)", de: "Auto (wechselt alle 500 Schritte)", es: "Auto (rota cada 500 pasos)", ja: "オート（500歩ごと）" },
  // move configuration (v1.8.0)
  "moves-title": { en: "Moves", fr: "Capacités", de: "Attacken", es: "Movimientos", ja: "わざ" },
  "moves-hint": { en: "Pick 2 moves for battle.", fr: "Choisis 2 capacités de combat.", de: "Wähle 2 Attacken für den Kampf.", es: "Elige 2 movimientos para el combate.", ja: "戦闘用のわざを2つ選ぶ。" },
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
  // codex (v1.7.0)
  "dex-title": { en: "Pokédex", fr: "Pokédex", de: "Pokédex", es: "Pokédex", ja: "ポケモン図鑑" },
  "dex-progress": { en: "Collection progress", fr: "Progression de collection", de: "Sammelfortschritt", es: "Progreso de colección", ja: "コレクション進捗" },
  "dex-seen": { en: "Seen", fr: "Vus", de: "Gesehen", es: "Vistos", ja: "見た" },
  "dex-shiny": { en: "Shiny", fr: "Chromatique", de: "Schillernd", es: "Variocolor", ja: "色違い" },
  "dex-size": { en: "Size", fr: "Taille", de: "Größe", es: "Tamaño", ja: "サイズ" },
  "dex-height": { en: "Height", fr: "Taille", de: "Größe", es: "Altura", ja: "たかさ" },
  "dex-weight": { en: "Weight", fr: "Poids", de: "Gewicht", es: "Peso", ja: "おもさ" },
  "dex-rate": { en: "Catch rate", fr: "Taux de capture", de: "Fangrate", es: "Tasa de captura", ja: "捕獲率" },
  "dex-rarity-common": { en: "Common", fr: "Commun", de: "Häufig", es: "Común", ja: "ふつう" },
  "dex-rarity-uncommon": { en: "Uncommon", fr: "Peu commun", de: "Ungewöhnlich", es: "Poco común", ja: "めずらしい" },
  "dex-rarity-rare": { en: "Rare", fr: "Rare", de: "Selten", es: "Raro", ja: "まれ" },
  "dex-rarity-mythic": { en: "Mythic", fr: "Mythique", de: "Mythos", es: "Mítico", ja: "でんせつ" },
  "dex-milestone": { en: "Milestones", fr: "Jalons", de: "Meilensteine", es: "Hitos", ja: "マイルストーン" },
  "dex-milestone-reward": { en: "{badge} of the Codex complete! +{money} ₽ & {item}", fr: "{badge} du Codex complété ! +{money} ₽ et {item}", de: "{badge} des Codex geschafft! +{money} ₽ & {item}", es: "¡{badge} del Codex completado! +{money} ₽ y {item}", ja: "図鑑 {badge} 達成！ +{money}₽ と {item}" },
  "dex-detail": { en: "Entry", fr: "Entrée", de: "Eintrag", es: "Entrada", ja: "ずかん" },
  "dex-flavor": { en: "Dex entry", fr: "Entrée du Pokédex", de: "Codex-Eintrag", es: "Entrada del Codex", ja: "図鑑コメント" },
  "dex-unknown": { en: "???", fr: "???", de: "???", es: "???", ja: "？？？" },
  "dex-all": { en: "All", fr: "Tous", de: "Alle", es: "Todos", ja: "すべて" },
  "dex-caught": { en: "Caught", fr: "Capturé", de: "Gefangen", es: "Capturado", ja: "捕まえた" },
  "shiny-registered": { en: "Shiny {mon} registered in the Codex!", fr: "Le chromatique {mon} est dans le Codex !", de: "Schillerndes {mon} im Codex registriert!", es: "¡{mon} variocolor registrado en el Codex!", ja: "色違いの{mon}を図鑑に登録！" },
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
  // Indigo League & Elite Four (v1.9.0)
  "league-title": { en: "Indigo League", fr: "Ligue Indigo", de: "Indigo-Liga", es: "Liga Índigo", ja: "セキエイリーグ" },
  "league-tag": { en: "The Elite Four await — the final test after all 8 badges.", fr: "Le Conseil des 4 vous attend — l'épreuve finale après les 8 badges.", de: "Die Top Vier warten — die letzte Prüfung nach allen 8 Orden.", es: "El Alto Mando te espera: la prueba final tras las 8 medallas.", ja: "四天王が待つ — 8個のバッジの先にある最終試練。" },
  "league-locked": { en: "Earn all 8 badges to unlock the Indigo League!", fr: "Obtenez les 8 badges pour débloquer la Ligue Indigo !", de: "Sammle alle 8 Orden, um die Indigo-Liga freizuschalten!", es: "¡Consigue las 8 medallas para desbloquear la Liga Índigo!", ja: "バッジを8個集めてセキエイリーグを解禁しよう！" },
  "league-reward": { en: "{money}₽ · 3× XP", fr: "{money}₽ · 3× XP", de: "{money}₽ · 3× EP", es: "{money}₽ · 3× XP", ja: "₽{money}・経験値3倍" },
  "league-rematch": { en: "Rematch the League", fr: "Rejouer la Ligue", de: "Liga erneut bestreiten", es: "Revancha contra la Liga", ja: "リーグ再戦" },
  "league-champion": { en: "You are the Pokémon League Champion!", fr: "Vous êtes le Champion de la Ligue Pokémon !", de: "Du bist der Pokémon-Liga-Champion!", es: "¡Eres el Campeón de la Liga Pokémon!", ja: "ポケモンリーグチャンピオンになった！" },
  "league-wins": { en: "League wins", fr: "Victoires en Ligue", de: "Liga-Siege", es: "Victorias de la Liga", ja: "リーグ勝利" },
  "league-title-earned": { en: "League Champion", fr: "Champion de la Ligue", de: "Liga-Champion", es: "Campeón de la Liga", ja: "リーグチャンピオン" },
  "league-member": { en: "{mon} awaits...", fr: "{mon} vous attend…", de: "{mon} wartet…", es: "{mon} aguarda…", ja: "{mon} が待っている…" },
  // route trainers & the rival (v1.9.0)
  "trainer-appears": { en: "{mon} wants to battle!", fr: "{mon} veut se battre !", de: "{mon} will kämpfen!", es: "¡{mon} quiere combatir!", ja: "{mon} が勝負を仕掛けてきた！" },
  "rival-appears": { en: "{mon} challenges you!", fr: "{mon} vous défie !", de: "{mon} fordert dich heraus!", es: "¡{mon} te desafía!", ja: "{mon} が挑戦してきた！" },
  "no-capture": { en: "You can't catch a Trainer's Pokémon!", fr: "Impossible de capturer le Pokémon d'un dresseur !", de: "Du kannst das Pokémon eines Trainers nicht fangen!", es: "¡No puedes capturar el Pokémon de un entrenador!", ja: "トレーナーのポケモンは捕まえられない！" },
  "league-evolve": { en: "Your bond deepens...", fr: "Votre lien se renforce…", de: "Eure Bindung wird stärker…", es: "Tu vínculo se fortalece…", ja: "きずなが深まる…" },
  "career-trainers": { en: "Trainers", fr: "Dresseurs", de: "Trainer", es: "Entrenadores", ja: "トレーナー" },
  "career-league": { en: "League", fr: "Ligue", de: "Liga", es: "Liga", ja: "リーグ" },
  // friendship / happiness (v1.9.0)
  "friendship-title": { en: "Friendship", fr: "Amitié", de: "Freundschaft", es: "Amistad", ja: "なつき度" },
  "friendship-tag": { en: "Care for your team — battles, berries and steps deepen the bond.", fr: "Prenez soin de votre équipe — combats, baies et pas renforcent le lien.", de: "Kümmere dich um dein Team — Kämpfe, Beeren und Schritte vertiefen die Bindung.", es: "Cuida a tu equipo: combates, bayas y pasos fortalecen el vínculo.", ja: "チームを大切に — バトル・きのみ・歩くことで絆が深まる。" },
  "friendship-tier-neutral": { en: "Neutral", fr: "Neutre", de: "Neutral", es: "Neutro", ja: "ふつう" },
  "friendship-tier-friendly": { en: "Friendly", fr: "Ami", de: "Freundlich", es: "Amistoso", ja: "なかよし" },
  "friendship-tier-happy": { en: "Happy", fr: "Content", de: "Glücklich", es: "Feliz", ja: "たのしい" },
  "friendship-tier-best": { en: "Best friends", fr: "Meilleurs amis", de: "Beste Freunde", es: "Mejores amigos", ja: "しんゆう" },
  "friendship-xp-bonus": { en: "XP bonus", fr: "Bonus XP", de: "EP-Bonus", es: "Bono XP", ja: "経験値ボーナス" },
  "friendship-dmg-bonus": { en: "Damage bonus", fr: "Bonus de dégâts", de: "Schadensbonus", es: "Bono de daño", ja: "ダメージボーナス" },
  "friendship-evolved": { en: "{a} evolved into {b} from your bond!", fr: "{a} évolue en {b} grâce à votre lien !", de: "{a} entwickelt sich dank eurer Bindung zu {b}!", es: "¡{a} evolucionó a {b} gracias a tu vínculo!", ja: "きずなの力で {a} は {b} に進化した！" },
  // save export/import (v1.9.0 polish)
  "save-export": { en: "Export save", fr: "Exporter la sauvegarde", de: "Speicherstand exportieren", es: "Exportar partida", ja: "セーブを書き出す" },
  "save-import": { en: "Import save", fr: "Importer la sauvegarde", de: "Speicherstand importieren", es: "Importar partida", ja: "セーブを読み込む" },
  "save-download": { en: "DOWNLOAD", fr: "TÉLÉCHARGER", de: "HERUNTERLADEN", es: "DESCARGAR", ja: "ダウンロード" },
  "save-load": { en: "LOAD FILE", fr: "CHARGER FICHIER", de: "DATEI LADEN", es: "CARGAR ARCHIVO", ja: "ファイルを開く" },
  "save-import-hint": { en: "Paste a POKEBANNER|v2|... export or load a .json/.txt file", fr: "Collez un export POKEBANNER|v2|... ou chargez un fichier .json/.txt", de: "Füge einen POKEBANNER|v2|...-Export ein oder lade eine .json/.txt-Datei", es: "Pega un export POKEBANNER|v2|... o carga un archivo .json/.txt", ja: "POKEBANNER|v2|... を貼り付けるか、.json/.txtファイルを読み込む" },
  // ---- v2.0.0 Ghost PvP & Trainer Cards ----
  "pvp-title": { en: "Ghost PvP", fr: "PvP Fantôme", de: "Geister-PvP", es: "PvP Fantasma", ja: "ゴーストPvP" },
  "pvp-rank": { en: "Rank: {rank}", fr: "Rang : {rank}", de: "Rang: {rank}", es: "Rango: {rank}", ja: "ランク: {rank}" },
  "pvp-wins": { en: "Wins {n}", fr: "Victoires {n}", de: "Siege {n}", es: "Victorias {n}", ja: "勝利 {n}" },
  "pvp-losses": { en: "Losses {n}", fr: "Défaites {n}", de: "Niederlagen {n}", es: "Derrotas {n}", ja: "敗北 {n}" },
  "pvp-trainer-card": { en: "Trainer Card", fr: "Carte Dresseur", de: "Trainerkarte", es: "Carta de Entrenador", ja: "トレーナーカード" },
  "pvp-import": { en: "IMPORT", fr: "IMPORTER", de: "IMPORTIEREN", es: "IMPORTAR", ja: "読み込む" },
  "pvp-import-hint": { en: "Paste a Trainer Card code", fr: "Collez un code Carte Dresseur", de: "Trainerkarte-Code einfügen", es: "Pega un código de Carta", ja: "カードコードを貼り付け" },
  "pvp-challenge": { en: "CHALLENGE", fr: "DÉFI", de: "FORDERN", es: "RETO", ja: "たたかう" },
  "pvp-await": { en: "{name} awaits!", fr: "{name} vous attend !", de: "{name} wartet!", es: "¡{name} te espera!", ja: "{name} が待っている！" },
  "pvp-loss": { en: "You lost to {name}...", fr: "Vous avez perdu contre {name}…", de: "Du hast gegen {name} verloren…", es: "Perdiste contra {name}...", ja: "{name} に敗れた…" },
  "invalid-code": { en: "Invalid Trainer Card code.", fr: "Code Carte Dresseur invalide.", de: "Ungültiger Trainerkarten-Code.", es: "Código de Carta inválido.", ja: "無効なカードコードです。" },
  "card-imported": { en: "{name}'s card loaded!", fr: "Carte de {name} chargée !", de: "{name}s Karte geladen!", es: "¡Carta de {name} cargada!", ja: "{name} のカードを読み込んだ！" },
  "pvp-copy": { en: "COPY", fr: "COPIER", de: "KOPIEREN", es: "COPIAR", ja: "コピー" },
  "pvp-empty": { en: "Import a friend's card to battle their team.", fr: "Importez une carte pour affronter son équipe.", de: "Importiere eine Karte, um gegen ihr Team zu kämpfen.", es: "Importa una carta para luchar contra su equipo.", ja: "カードを読み込んでチームと戦おう。" },
  "pvp-rank-up": { en: "Rank up! You are now {rank}!", fr: "Montée de rang ! Vous êtes désormais {rank} !", de: "Aufgestiegen! Du bist jetzt {rank}!", es: "¡Subes de rango! Ahora eres {rank}!", ja: "ランクアップ！ 今のランクは {rank}！" },
  // ---- v2.0.0 Daily quests & League Pass ----
  quests: { en: "DAILY QUESTS", fr: "DÉFIS QUOTIDIENS", de: "TAGESAUFGABEN", es: "MISIONES DIARIAS", ja: "デイリークエスト" },
  "quest-battle": { en: "Win {n} battles", fr: "Gagner {n} combats", de: "Gewinne {n} Kämpfe", es: "Gana {n} combates", ja: "{n} 回勝利" },
  "quest-capture": { en: "Catch {n} Pokémon", fr: "Capturer {n} Pokémon", de: "Fange {n} Pokémon", es: "Captura {n} Pokémon", ja: "{n} 匹捕まえる" },
  "quest-steps": { en: "Walk {n} steps", fr: "Marcher {n} pas", de: "Gehe {n} Schritte", es: "Camina {n} pasos", ja: "{n} 歩あるく" },
  "quest-rocket": { en: "Defeat {n} Rocket", fr: "Vaincre {n} Rocket", de: "Besiege {n} Rocket", es: "Derrota {n} Rocket", ja: "ロケット団を{n}回倒す" },
  "quest-trainer": { en: "Beat {n} trainers", fr: "Battre {n} dresseurs", de: "Besiege {n} Trainer", es: "Vence a {n} entrenadores", ja: "トレーナーに{n}回勝つ" },
  "quest-pvp": { en: "Win {n} ghost duel", fr: "Gagner {n} duel fantôme", de: "Gewinne {n} Geisterduell", es: "Gana {n} duelo fantasma", ja: "ゴースト戦で{n}回勝つ" },
  "quest-heal": { en: "Use {n} items", fr: "Utiliser {n} objets", de: "Benutze {n} Items", es: "Usa {n} objetos", ja: "どうぐを{n}回使う" },
  "quest-claimed": { en: "Quest complete! +{money} ₽", fr: "Défi terminé ! +{money} ₽", de: "Aufgabe erledigt! +{money} ₽", es: "¡Misión completa! +{money} ₽", ja: "クエスト達成！ +{money} ₽" },
  "quest-claim": { en: "CLAIM", fr: "RÉCLAMER", de: "EINLÖSEN", es: "RECLAMAR", ja: "受け取る" },
  pass: { en: "LEAGUE PASS", fr: "PASSE DE LA LIGUE", de: "LIGA-PASS", es: "PASE DE LA LIGA", ja: "リーグパス" },
  "pass-progress": { en: "Tier {tier} · {n} XP", fr: "Palier {tier} · {n} XP", de: "Stufe {tier} · {n} XP", es: "Nivel {tier} · {n} XP", ja: "ティア {tier} · {n} XP" },
  "pass-tier-unlocked": { en: "Tier {tier} unlocked!", fr: "Palier {tier} débloqué !", de: "Stufe {tier} freigeschaltet!", es: "¡Nivel {tier} desbloqueado!", ja: "ティア {tier} 解放！" },
  "pass-reward": { en: "Tier {tier} reward: {reward}", fr: "Récompense palier {tier} : {reward}", de: "Stufe {tier} Belohnung: {reward}", es: "Recompensa nivel {tier}: {reward}", ja: "ティア {tier} 報酬: {reward}" },
  "pass-aura": { en: "{mon} gains the {aura} Aura!", fr: "{mon} gagne l'Aura {aura} !", de: "{mon} erhält die {aura}-Aura!", es: "¡{mon} obtiene el Aura {aura}!", ja: "{mon} は {aura} のオーラを得た！" },
  "pass-egg": { en: "A Mystery Egg was added!", fr: "Un Œuf Mystère ajouté !", de: "Ein Geheim-Ei hinzugefügt!", es: "¡Se añadió un Huevo Misterioso!", ja: "ふしぎなタマゴを入手！" },
  "pass-full": { en: "Pass complete!", fr: "Passe terminée !", de: "Pass abgeschlossen!", es: "¡Pase completado!", ja: "パスコンプリート！" },
  // ---- v2.0.0 Elemental Auras ----
  aura: { en: "AURA", fr: "AURA", de: "AURA", es: "AURA", ja: "オーラ" },
  "aura-appears": { en: "A {aura} Aura {mon} appears!!", fr: "Un {mon} à Aura {aura} apparaît !!", de: "Ein {aura}-Aura-{mon} erscheint!!", es: "¡Aparece un {mon} de Aura {aura}!", ja: "{aura} のオーラをまとった {mon} が現れた！！" },
  "aura-bonus": { en: "Team Aura active", fr: "Aura d'équipe active", de: "Team-Aura aktiv", es: "Aura de equipo activa", ja: "チームオーラ発動中" },
  // ---- v2.0.0 Safari Photo ----
  photo: { en: "SAFARI PHOTO", fr: "PHOTO SAFARI", de: "SAFARI-FOTO", es: "FOTO SAFARI", ja: "サファリフォト" },
  "photo-capture": { en: "CAPTURE", fr: "CAPTURER", de: "FOTOGRAFIEREN", es: "CAPTURAR", ja: "撮影" },
  "photo-scale": { en: "Scale", fr: "Échelle", de: "Maßstab", es: "Escala", ja: "倍率" },
  "photo-saved": { en: "Safari photo saved!", fr: "Photo Safari enregistrée !", de: "Safari-Foto gespeichert!", es: "¡Foto Safari guardada!", ja: "写真を保存した！" },
  "photo-export": { en: "EXPORT", fr: "EXPORTER", de: "EXPORTIEREN", es: "EXPORTAR", ja: "書き出す" },
  "photo-delete": { en: "DEL", fr: "SUPPR", de: "LÖSCHEN", es: "BORRAR", ja: "削除" },
  "photo-empty": { en: "No photos yet — capture one!", fr: "Aucune photo — capturez-en une !", de: "Noch keine Fotos — mach eins!", es: "Aún no hay fotos, ¡captura una!", ja: "写真はまだない — 撮ってみよう！" },
  "photo-gallery": { en: "Gallery", fr: "Galerie", de: "Galerie", es: "Galería", ja: "ギャラリー" },
  "photo-deleted": { en: "Photo deleted.", fr: "Photo supprimée.", de: "Foto gelöscht.", es: "Foto borrada.", ja: "写真を削除した。" },
  "photo-exported": { en: "Photo exported!", fr: "Photo exportée !", de: "Foto exportiert!", es: "¡Foto exportada!", ja: "写真を書き出した！" },
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
  "shadow-ball": "Ball'Ombre",
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
  "shadow-ball": "Spukball",
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
  "shadow-ball": "シャドーボール",
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
  revive: "Rappel", egg: "Œuf Mystère",
};

const ITEMS_DE: Record<string, string> = {
  pokeball: "Pokéball", greatball: "Superball", berry: "Oranbeere",
  sitrus: "Sitrusbeere", potion: "Trank", hyperpotion: "Hypertrank",
  revive: "Beleber", egg: "Mysteriöses Ei",
};

const ITEMS_JA: Record<string, string> = {
  pokeball: "モンスターボール", greatball: "スーパーボール", berry: "オレンのみ",
  sitrus: "オボンのみ", potion: "キズぐすり", hyperpotion: "ハイパーきずぐすり",
  revive: "げんきのかけら", egg: "ふしぎなタマゴ",
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
  erika: "Érika", koga: "Koga", sabrina: "Morgane", blaine: "Auguste",
  giovanni: "Giovanni",
};

const CHAMPS_DE: Record<string, string> = {
  brock: "Rocko", misty: "Misty", surge: "Major Bob",
  erika: "Erika", koga: "Koga", sabrina: "Sabrina", blaine: "Pyro",
  giovanni: "Giovanni",
};

const CHAMPS_JA: Record<string, string> = {
  brock: "タケシ", misty: "カスミ", surge: "マチス",
  erika: "エリカ", koga: "キョウ", sabrina: "ナツメ", blaine: "カツラ",
  giovanni: "サカキ",
};

/** Localized gym-leader display name (unknown ids fall back to the canonical name). */
export function localizedChampionName(championId: string, lang: Language): string {
  if (lang === "fr" && CHAMPS_FR[championId]) return CHAMPS_FR[championId];
  if (lang === "de" && CHAMPS_DE[championId]) return CHAMPS_DE[championId];
  if (lang === "ja" && CHAMPS_JA[championId]) return CHAMPS_JA[championId];
  return CHAMPIONS.find((c) => c.id === championId)?.name ?? championId;
}

/** Localized League member names (Elite Four + Champion); ES falls back to EN. */
export function localizedLeagueName(memberId: string, lang: Language): string {
  if (lang === "fr" && LEAGUE_FR[memberId]) return LEAGUE_FR[memberId];
  if (lang === "de" && LEAGUE_DE[memberId]) return LEAGUE_DE[memberId];
  if (lang === "ja" && LEAGUE_JA[memberId]) return LEAGUE_JA[memberId];
  return LEAGUE.find((m) => m.id === memberId)?.name ?? memberId;
}

/** v2.0.0: localized Ghost PvP rank names. */
const PVP_RANK_NAMES: Record<string, Record<Language, string>> = {
  novice: { en: "Novice", fr: "Novice", de: "Novize", es: "Novato", ja: "ビギナー" },
  bronze: { en: "Bronze", fr: "Bronze", de: "Bronze", es: "Bronce", ja: "ブロンズ" },
  silver: { en: "Silver", fr: "Argent", de: "Silber", es: "Plata", ja: "シルバー" },
  gold: { en: "Gold", fr: "Or", de: "Gold", es: "Oro", ja: "ゴールド" },
  platinum: { en: "Platinum", fr: "Platine", de: "Platin", es: "Platino", ja: "プラチナ" },
  master: { en: "Master", fr: "Maître", de: "Meister", es: "Maestro", ja: "マスター" },
};

export function localizedPvpRank(rankId: string, lang: Language): string {
  return PVP_RANK_NAMES[rankId]?.[lang] ?? PVP_RANK_NAMES[rankId]?.en ?? rankId;
}

/** v2.0.0: localized Elemental Aura names (flame / bolt / aurora). Data, not
 *  UI dictionary keys — kept inline exactly like PVP_RANK_NAMES. */
const AURA_NAMES: Record<string, { en: string; fr: string; de: string; es: string; ja: string }> = {
  flame: { en: "Flame", fr: "Flamme", de: "Flamme", es: "Llama", ja: "ほのお" },
  bolt: { en: "Bolt", fr: "Foudre", de: "Blitz", es: "Rayo", ja: "いかずち" },
  aurora: { en: "Aurora", fr: "Aurore", de: "Aurora", es: "Aurora", ja: "オーロラ" },
};

export function localizedAuraName(auraId: string, lang: Language): string {
  return AURA_NAMES[auraId]?.[lang] ?? AURA_NAMES[auraId]?.en ?? auraId;
}


const LEAGUE_FR: Record<string, string> = {
  lorelei: "Ondine", bruno: "Aldo", agatha: "Agatha", lance: "Peter", blue: "Régis",
};
const LEAGUE_DE: Record<string, string> = {
  lorelei: "Lorelei", bruno: "Bruno", agatha: "Agatha", lance: "Siegfried", blue: "Blue",
};
const LEAGUE_JA: Record<string, string> = {
  lorelei: "カンナ", bruno: "シバ", agatha: "キクコ", lance: "ワタル", blue: "グリーン",
};

// ---------------------------------------------------------------------------
// Convenience: full display name of a species id in a language (used by the
// banner's nameOf/oldName replacements).
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Localized dex flavor lines (v1.7.1). Keyed by species id; falls back to the
// English flavor in DEX_META for any language without an entry.
// ---------------------------------------------------------------------------

export const DEX_FLAVOR: Record<string, Partial<Record<"fr" | "de" | "es" | "ja", string>>> = {
  "bulbasaur": { fr: "Une étrange graine a été plantée sur son dos à la naissance. La plante pousse avec ce Pokémon.", de: "Bei der Geburt wurde ein seltsamer Samen auf seinen Rücken gepflanzt. Die Pflanze wächst mit diesem Pokémon.", es: "Una extraña semilla fue plantada en su espalda al nacer. La planta crece con este Pokémon.", ja: "生まれたときから背中に不思議なタネがある。植物はこのポケモンと一緒に育つ。" },
  "ivysaur": { fr: "Quand le bulbe sur son dos grossit, il semble perdre la capacité de se tenir sur ses pattes arrière.", de: "Wenn die Knolle auf seinem Rücken groß wird, verliert es offenbar die Fähigkeit, auf den Hinterbeinen zu stehen.", es: "Cuando el bulbo de su espalda crece, parece perder la capacidad de mantenerse en pie.", ja: "背中のタネが大きくなると、後ろ足で立つことができなくなるらしい。" },
  "venusaur": { fr: "La plante fleurit quand il absorbe l'énergie solaire. Il se déplace sans cesse pour chercher la lumière du soleil.", de: "Die Pflanze blüht, wenn es Sonnenenergie aufnimmt. Es bleibt in Bewegung, um Sonnenlicht zu suchen.", es: "La planta florece cuando absorbe energía solar. Se mantiene en movimiento buscando la luz del sol.", ja: "太陽エネルギーを吸収すると花が咲く。日差しを求めて動き続ける。" },
  "charmander": { fr: "La flamme au bout de sa queue montre la force de sa vitalité. S'il est faible, la flamme brûle faiblement.", de: "Die Flamme an seiner Schwanzspitze zeigt die Stärke seiner Lebenskraft. Ist es schwach, brennt auch die Flamme schwach.", es: "La llama de su cola muestra la fuerza de su vitalidad. Si está débil, la llama arde débilmente.", ja: "しっぽの炎は生命力の強さを示す。弱っているときは炎も弱々しい。" },
  "charmeleon": { fr: "Quand il agite sa queue enflammée, il fait monter la température à des niveaux insupportables.", de: "Wenn es seinen brennenden Schwanz schwingt, erhöht es die Temperatur auf unerträgliche Werte.", es: "Cuando agita su cola ardiente, eleva la temperatura a niveles insoportables.", ja: "燃えるしっぽを振ると、耐えられないほど温度が上がる。" },
  "charizard": { fr: "Il crache un feu assez chaud pour faire fondre les rochers. Il peut provoquer des incendies de forêt en soufflant des flammes.", de: "Es spuckt Feuer, das heiß genug ist, um Felsen zu schmelzen. Mit seinen Flammen kann es Waldbrände auslösen.", es: "Escupe fuego tan caliente que funde rocas. Puede causar incendios forestales al soplar llamas.", ja: "岩を溶かすほどの炎を吐く。火を吹くことで山火事を起こすこともある。" },
  "squirtle": { fr: "Après la naissance, son dos gonfle et durcit en une carapace. Il projette puissamment de l'écume par la bouche.", de: "Nach der Geburt schwillt sein Rücken an und verhärtet sich zu einem Panzer. Es spritzt kräftig Schaum aus seinem Mund.", es: "Tras nacer, su espalda se hincha y endurece formando un caparazón. Escupe espuma con potencia.", ja: "生まれたあと、背中がふくらんで甲羅になる。口から強力な泡を放つ。" },
  "wartortle": { fr: "Il est reconnu comme un symbole de longévité. Si sa carapace a des algues, ce Wartortle est très vieux.", de: "Es gilt als Symbol der Langlebigkeit. Hat sein Panzer Algen, ist dieses Wartortle sehr alt.", es: "Es símbolo de longevidad. Si su caparazón tiene algas, ese Wartortle es muy viejo.", ja: "長寿のシンボルとされる。甲羅に藻が生えていたら、それはとても年老いたカメール。" },
  "blastoise": { fr: "Un Pokémon brutal avec des canons à eau pressurisée sur sa carapace. Ils servent à des charges à grande vitesse.", de: "Ein brutales Pokémon mit Druckwasserkanonen auf seinem Panzer. Sie dienen für Angriffe bei hoher Geschwindigkeit.", es: "Un Pokémon brutal con cañones de agua presurizada en su caparazón. Se usan para embestidas a gran velocidad.", ja: "甲羅に高圧のウォーターキャノンを備えた凶暴なポケモン。高速タックルに使われる。" },
  "caterpie": { fr: "Ses courtes pattes sont munies de ventouses qui lui permettent de grimper sans se fatiguer sur les pentes et les murs.", de: "Seine kurzen Füße haben Saugnäpfe, mit denen es mühelos Hänge und Wände hinaufklettern kann.", es: "Sus cortas patas tienen ventosas que le permiten escalar paredes y pendientes sin cansarse.", ja: "短い足に吸盤があり、坂道や壁を疲れずに登ることができる。" },
  "metapod": { fr: "Il attend le moment d'évoluer. À ce stade, il ne peut que durcir, alors il reste immobile.", de: "Es wartet auf den Moment der Entwicklung. In diesem Stadium kann es sich nur verhärten und bleibt bewegungslos.", es: "Espera el momento de evolucionar. En esta etapa solo puede endurecerse, por lo que permanece inmóvil.", ja: "進化の瞬間を待っている。この時期は硬くなることしかできないため、動かない。" },
  "butterfree": { fr: "En combat, il bat des ailes à grande vitesse pour libérer une poussière hautement toxique dans l'air.", de: "Im Kampf schlägt es mit großer Geschwindigkeit mit den Flügeln, um hochgiftigen Staub in die Luft zu entlassen.", es: "En combate, bate sus alas a gran velocidad para liberar un polvo altamente tóxico en el aire.", ja: "戦闘中、高速で羽ばたき、猛毒の粉を空にまき散らす。" },
  "weedle": { fr: "On le trouve souvent en forêt, en train de manger des feuilles. Il a un dard venimeux sur la tête.", de: "Oft in Wäldern anzutreffen, wo es Blätter frisst. Es hat einen giftigen Stachel auf dem Kopf.", es: "Se encuentra a menudo en los bosques comiendo hojas. Tiene un aguijón venenoso en la cabeza.", ja: "森でよく見られ、葉っぱを食べる。頭に猛毒の針を持つ。" },
  "kakuna": { fr: "Presque incapable de bouger, ce Pokémon ne peut que durcir sa carapace pour se protéger.", de: "Fast bewegungsunfähig, kann dieses Pokémon nur seinen Panzer verhärten, um sich zu schützen.", es: "Casi incapaz de moverse, solo puede endurecer su caparazón para protegerse.", ja: "ほとんど動けない。身を守るため殻を硬くするしかない。" },
  "beedrill": { fr: "Il vole à grande vitesse et attaque avec les grands dards venimeux de ses pattes avant et de sa queue.", de: "Es fliegt mit hoher Geschwindigkeit und greift mit den großen Giftstacheln an Vorderbeinen und Schwanz an.", es: "Vuela a gran velocidad y ataca con los grandes aguijones venenosos de sus patas delanteras y su cola.", ja: "高速で飛び、前足としっぽの大きな毒針で攻撃する。" },
  "pidgey": { fr: "Un spectacle courant dans les forêts. Il bat des ailes au niveau du sol pour soulever du sable aveuglant.", de: "Ein häufiger Anblick in Wäldern. Es schlägt am Boden mit den Flügeln, um blenden Sand aufzuwirbeln.", es: "Una vista común en los bosques. Agita sus alas cerca del suelo para levantar arena cegadora.", ja: "森でよく見られる。地上近くで羽ばたき、目くらましの砂を巻き上げる。" },
  "pidgeotto": { fr: "Il utilise ses serres acérées pour saisir ses proies. Très protecteur de son propre territoire.", de: "Es nutzt seine scharfen Krallen, um Beute zu packen. Sehr beschützend gegenüber seinem Revier.", es: "Usa sus afiladas garras para atrapar a sus presas. Muy protector de su territorio.", ja: "鋭い爪で獲物をつかむ。自分の縄張りをとても大切にする。" },
  "pidgeot": { fr: "En chassant, il effleure la surface de l'eau à grande vitesse pour surprendre ses proies.", de: "Bei der Jagd streift es mit hoher Geschwindigkeit über die Wasseroberfläche, um Beute zu überraschen.", es: "Al cazar, roza la superficie del agua a gran velocidad para sorprender a sus presas.", ja: "狩りのとき、高速で水面スレスレを飛び、獲物を不意打ちする。" },
  "rattata": { fr: "Mord tout ce qu'il attaque. Petit et très rapide, il est courant dans de nombreux endroits.", de: "Beißt alles, was es angreift. Klein und sehr schnell, ist es vielerorts anzutreffen.", es: "Muerde todo lo que ataca. Pequeño y muy veloz, es común en muchos lugares.", ja: "攻撃するときは何でもかみつく。小さくて素早く、どこにでもいる。" },
  "raticate": { fr: "Il utilise ses moustaches pour garder l'équilibre. Il ralentit si on les coupe.", de: "Es nutzt seine Schnurrhaare für das Gleichgewicht. Werden sie abgeschnitten, verlangsamt es sich.", es: "Usa sus bigotes para mantener el equilibrio. Si se los cortan, se vuelve más lento.", ja: "ヒゲでバランスをとっている。ヒゲを切られると動きが遅くなる。" },
  "spearow": { fr: "Il mange des insectes dans les zones herbeuses. Il doit battre des ailes très vite pour rester en l'air.", de: "Es frisst Käfer in Grasgebieten. Es muss mit den kurzen Flügeln sehr schnell schlagen, um in der Luft zu bleiben.", es: "Come insectos en zonas de hierba. Debe batir sus cortas alas muy rápido para mantenerse en el aire.", ja: "草むらで虫を食べる。空にいる間、短い翼を高速ではばたかせる。" },
  "fearow": { fr: "Un Pokémon qui remonte à de nombreuses années. S'il sent un danger, il s'envole haut et s'éloigne instantanément.", de: "Ein Pokémon mit langer Geschichte. Spürt es Gefahr, fliegt es hoch hinauf und sofort davon.", es: "Un Pokémon de hace muchos años. Si percibe peligro, vuela alto y se aleja al instante.", ja: "昔からいるポケモン。危険を感じると、高く飛んでたちまち去っていく。" },
  "ekans": { fr: "Se déplace silencieusement et furtivement. Il mange les œufs d'oiseaux comme Pidgey et Spearow.", de: "Bewegt sich lautlos und heimlich. Es frisst Vogeleier, etwa von Pidgey und Spearow.", es: "Se mueve silenciosa y sigilosamente. Come huevos de aves como Pidgey y Spearow.", ja: "音もなく忍び寄る。ピジョンやオニスズメなどの鳥のタマゴを食べる。" },
  "arbok": { fr: "On raconte que les marques féroces de son ventre diffèrent d'une région à l'autre.", de: "Es heißt, die wilden Warnmuster auf seinem Bauch unterscheiden sich von Gebiet zu Gebiet.", es: "Se rumorea que las feroces marcas de su vientre difieren según la región.", ja: "お腹の恐ろしい模様は地域によって違うと言われている。" },
  "pikachu": { fr: "Quand plusieurs de ces Pokémon se réunissent, leur électricité peut provoquer des orages.", de: "Wenn sich mehrere dieser Pokémon versammeln, kann ihre Elektrizität Gewitter verursachen.", es: "Cuando varios de estos Pokémon se reúnen, su electricidad puede provocar tormentas.", ja: "たくさんのピカチュウが集まると、電気が発生して雷雲になることもある。" },
  "raichu": { fr: "Sa longue queue sert de mise à la terre pour se protéger de sa propre électricité à haute tension.", de: "Sein langer Schwanz dient als Erdung, um es vor seiner eigenen Hochspannung zu schützen.", es: "Su larga cola sirve de toma de tierra para protegerse de su propia electricidad de alto voltaje.", ja: "長いしっぽはアースの役割をし、自分の高圧電流から身を守っている。" },
  "sandshrew": { fr: "Creuse profondément sous terre dans les zones arides loin de l'eau. Il ne sort que pour chasser.", de: "Gräbt in trockenen Gebieten fern von Wasser tief unter die Erde. Es kommt nur zur Jagd heraus.", es: "Excava profundamente en zonas áridas lejos del agua. Solo sale a cazar.", ja: "水のない乾いた土地に深い穴を掘って暮らす。エサを探すときだけ地上に出る。" },
  "sandslash": { fr: "Se roule en boule épineuse quand il est menacé. Il peut rouler pour attaquer ou s'enfuir.", de: "Rollt sich bei Gefahr zu einem stacheligen Ball zusammen. Es kann rollend angreifen oder fliehen.", es: "Se enrolla como una bola espinosa cuando se siente amenazado. Puede rodar para atacar o huir.", ja: "危険を感じるとトゲの球になる。そのまま転がって攻撃したり逃げたりする。" },
  "nidoran-f": { fr: "Bien que petit, ses barbes venimeuses le rendent dangereux. La femelle a des cornes plus petites.", de: "Obwohl klein, machen seine Giftstachel es gefährlich. Das Weibchen hat kleinere Hörner.", es: "Aunque es pequeño, sus púas venenosas lo hacen peligroso. La hembra tiene cuernos más pequeños.", ja: "小さくても毒のトゲを持つ危険なポケモン。メスは角が小さい。" },
  "nidorina": { fr: "La corne de la femelle pousse lentement. Elle préfère les attaques physiques comme les griffes et les morsures.", de: "Das Horn des Weibchens wächst langsam. Es bevorzugt physische Angriffe wie Kratzen und Beißen.", es: "El cuerno de la hembra crece lentamente. Prefiere ataques físicos como arañar y morder.", ja: "メスの角はゆっくり育つ。ひっかいたりかみついたりする物理攻撃を好む。" },
  "nidoqueen": { fr: "Ses écailles dures offrent une protection solide. Il utilise sa masse pour des attaques puissantes.", de: "Seine harten Schuppen bieten starken Schutz. Es nutzt seine Masse für kraftvolle Angriffe.", es: "Sus duras escamas ofrecen una protección sólida. Usa su masa para ejecutar ataques potentes.", ja: "硬いウロコは強力な守り。体重を活かした強力な攻撃を放つ。" },
  "nidoran-m": { fr: "Dresse ses oreilles pour sentir le danger. Plus ses cornes sont grandes, plus son venin est puissant.", de: "Stellt die Ohren auf, um Gefahr zu spüren. Je größer seine Hörner, desto stärker das Gift.", es: "Endereza las orejas para sentir el peligro. Cuanto más grandes sus cuernos, más potente su veneno.", ja: "耳を立てて危険を察知する。角が大きいほど毒の威力も強い。" },
  "nidorino": { fr: "Un Pokémon agressif qui attaque rapidement. La corne sur sa tête sécrète un venin puissant.", de: "Ein aggressives Pokémon, das schnell angreift. Das Horn auf seinem Kopf sondert starkes Gift ab.", es: "Un Pokémon agresivo que ataca rápido. El cuerno de su cabeza secreta un veneno potente.", ja: "攻撃的なポケモンで、すぐに襲いかかる。頭の角は強い毒を分泌する。" },
  "nidoking": { fr: "Il utilise sa queue puissante pour écraser, serrer puis briser les os de sa proie.", de: "Es nutzt seinen kräftigen Schwanz, um Beute zu zermalmen, zu würgen und dann die Knochen zu brechen.", es: "Usa su poderosa cola para aplastar, constreñir y romper los huesos de su presa.", ja: "強力なシッポで獲物を叩きつけ、締め上げ、骨まで砕く。" },
  "clefairy": { fr: "Son charme magique et mignon lui vaut de nombreux admirateurs. Il est rare et ne se trouve que dans certaines régions.", de: "Sein magischer und niedlicher Charme hat viele Bewunderer. Es ist selten und nur in bestimmten Gebieten zu finden.", es: "Su encanto mágico y adorable tiene muchos admiradores. Es raro y solo se encuentra en ciertas áreas.", ja: "神秘的で愛らしい魅力を持つ。珍しく、限られた場所でしか見られない。" },
  "clefable": { fr: "Un Pokémon fée timide et rarement vu. Il court se cacher dès qu'il sent la présence de gens.", de: "Ein scheues Feen-Pokémon, das selten gesehen wird. Es rennt davon und versteckt sich, sobald es Menschen spürt.", es: "Un tímido Pokémon hada rara vez visto. Corre a esconderse en cuanto siente la presencia de personas.", ja: "おくびょうなポケモンで、めったに姿を見せない。人の気配を感じるとすぐに隠れる。" },
  "vulpix": { fr: "À la naissance, il n'a qu'une seule queue. La queue se divise à partir de son extrémité en grandissant.", de: "Bei der Geburt hat es nur einen Schwanz. Der Schwanz teilt sich von der Spitze aus, während es älter wird.", es: "Al nacer tiene una sola cola. La cola se divide desde la punta a medida que crece.", ja: "生まれたときはしっぽが1本。成長するにつれて、先端から分かれていく。" },
  "ninetales": { fr: "Très intelligent et très rancunier. Attraper une de ses nombreuses queues pourrait entraîner une malédiction de 1000 ans.", de: "Sehr klug und sehr rachsüchtig. Wer einen seiner vielen Schwänze packt, könnte einen 1000-jährigen Fluch erleiden.", es: "Muy listo y muy vengativo. Agarrar una de sus muchas colas podría resultar en una maldición de 1000 años.", ja: "非常に賢く、執念深い。9本のしっぽを掴むと千年の呪いをかけられるという。" },
  "jigglypuff": { fr: "Quand ses grands yeux s'illuminent, il chante une mélodie apaisante qui endort ses ennemis.", de: "Wenn seine großen Augen aufleuchten, singt es eine beruhigende Melodie, die Feinde in Schlaf versetzt.", es: "Cuando sus grandes ojos se iluminan, canta una melodía relajante que adormece a sus enemigos.", ja: "大きな目が輝くと、敵を眠らせる不思議な子守唄を歌う。" },
  "wigglytuff": { fr: "Son corps est doux et caoutchouteux. En colère, il inspire et se gonfle jusqu'à une taille énorme.", de: "Sein Körper ist weich und gummiartig. Wird es wütend, atmet es ein und bläht sich enorm auf.", es: "Su cuerpo es suave y elástico. Cuando se enfada, inhala y se infla hasta un tamaño enorme.", ja: "体は柔らかくゴムのよう。怒ると息を吸い込んで巨大に膨らむ。" },
  "zubat": { fr: "Forme des colonies dans les endroits toujours sombres. Utilise des ultrasons pour repérer ses cibles.", de: "Bildet Kolonien in ewig dunklen Orten. Nutzt Ultraschall, um Ziele zu orten.", es: "Forma colonias en lugares perpetuamente oscuros. Usa ultrasonidos para localizar objetivos.", ja: "いつも暗い場所で群れを作る。超音波で獲物の位置を探る。" },
  "golbat": { fr: "Il attaque furtivement, sans avertissement. Ses crocs acérés servent à mordre et à sucer le sang.", de: "Es greift heimlich und ohne Warnung an. Seine scharfen Fangzähne dienen zum Beißen und Blutsaugen.", es: "Ataca sigilosamente, sin avisar. Sus afilados colmillos sirven para morder y chupar sangre.", ja: "こっそりと無警告で襲いかかる。鋭いキバでかみつき血を吸う。" },
  "oddish": { fr: "Pendant la journée, il garde le visage enfoui dans le sol. La nuit, il se promène en semant ses graines.", de: "Tagsüber vergräbt es sein Gesicht im Boden. Nachts wandert es umher und sät seine Samen aus.", es: "Durante el día mantiene su rostro enterrado en el suelo. De noche pasea esparciendo sus semillas.", ja: "昼は地面に顔を埋めている。夜になると歩き回り、タネをまく。" },
  "gloom": { fr: "Ce qui ressemble à de la bave est en fait du miel sucré. Très collant, il adhère obstinément au toucher.", de: "Was wie Sabber aussieht, ist süßer Honig. Er ist sehr klebrig und bleibt hartnäckig haften.", es: "Lo que parece baba es en realidad miel dulce. Es muy pegajosa y se adhiere con obstinación.", ja: "よだれのように見えるのは甘い蜜。とても粘着性が高く、触るとくっついて離れない。" },
  "vileplume": { fr: "Plus ses pétales sont grands, plus le pollen toxique qu'il contient est puissant. Sa grosse tête est lourde à porter.", de: "Je größer seine Blütenblätter, desto mehr Giftpollen enthalten sie. Sein großer Kopf ist schwer zu tragen.", es: "Cuanto más grandes sus pétalos, más tóxico es el polen que contienen. Su gran cabeza es pesada de sostener.", ja: "花びらが大きいほど毒花粉も強力。大きな頭は重くて支えにくい。" },
  "paras": { fr: "Creuse pour sucer les racines des arbres. Les champignons de son dos poussent en absorbant les nutriments de l'hôte.", de: "Gräbt, um Baumwurzeln zu saugen. Die Pilze auf seinem Rücken wachsen von den Nährstoffen des Wirts.", es: "Excava para chupar las raíces de los árboles. Los hongos de su espalda crecen absorbiendo nutrientes del huésped.", ja: "木の根から栄養を吸う。背中のキノコは宿主の栄養で成長する。" },
  "parasect": { fr: "Un couple hôte-parasite dans lequel le champignon parasite a pris le contrôle. Préfère les endroits humides.", de: "Ein Wirt-Parasit-Paar, in dem der Parasitenpilz den Wirt übernommen hat. Bevorzugt feuchte Orte.", es: "Una pareja huésped-parásito donde el hongo parásito ha tomado el control. Prefiere lugares húmedos.", ja: "寄生された本体をキノコが支配している。湿った場所を好む。" },
  "venonat": { fr: "Vit à l'ombre des grands arbres où il mange des insectes. Il est attiré par la lumière la nuit.", de: "Lebt im Schatten hoher Bäume und frisst Insekten. Nachts wird es von Licht angezogen.", es: "Vive a la sombra de árboles altos donde come insectos. De noche le atrae la luz.", ja: "高い木の影で暮らし、虫を食べる。夜は光に集まる。" },
  "venomoth": { fr: "La poussière d'écailles de ses ailes est inodore. Poison, il attaque avec cette poussière.", de: "Der Schuppenstaub seiner Flügel ist geruchlos. Es ist giftig und greift mit dem Staub an.", es: "El polvo de escamas de sus alas es inodoro. Es venenoso y ataca con ese polvo.", ja: "羽の粉は無臭だが毒を持つ。粉をまき散らして攻撃する。" },
  "diglett": { fr: "Vit à environ un mètre sous terre, où il se nourrit de racines. Il apparaît parfois à la surface.", de: "Lebt etwa einen Meter unter der Erde, wo es sich von Wurzeln ernährt. Es taucht manchmal an der Oberfläche auf.", es: "Vive a unos dos metros bajo tierra, donde se alimenta de raíces. A veces aparece en la superficie.", ja: "地下1mほどで生活し、植物の根を食べる。たまに地上に顔を出す。" },
  "dugtrio": { fr: "Une équipe de trois Diglett. Il déclenche d'énormes séismes en creusant à 100 km sous terre.", de: "Ein Team aus drei Diglett. Es verursacht gewaltige Erdbeben, indem es 100 km unter die Erde gräbt.", es: "Un equipo de tres Diglett. Provoca enormes terremotos cavando a 100 km bajo tierra.", ja: "ディグダ3匹のチーム。地下100kmを掘り進み、大地震を起こす。" },
  "meowth": { fr: "Adore les objets ronds. Erre dans les rues chaque nuit à la recherche de pièces tombées.", de: "Liebt runde Gegenstände. Streift nachts durch die Straßen auf der Suche nach heruntergefallenen Münzen.", es: "Adora los objetos redondos. Deambula por las calles cada noche buscando monedas caídas.", ja: "丸いものが大好き。夜な夜な落ちているコインを探して街を歩く。" },
  "persian": { fr: "Bien que sa fourrure ait de nombreux admirateurs, il est difficile à élever à cause de sa méchanceté capricieuse.", de: "Obwohl sein Fell viele Bewunderer hat, ist es wegen seiner launischen Bosheit schwer zu halten.", es: "Aunque su pelaje tiene admiradores, es difícil de criar por su mezquindad caprichosa.", ja: "毛皮は人気だが、気まぐれで意地悪なため飼育は難しい。" },
  "psyduck": { fr: "Tout en endormissant ses ennemis de son regard vide, ce Pokémon rusé utilise ses pouvoirs psychokinétiques.", de: "Während es Feinde mit seinem leeren Blick einlullt, nutzt dieses schlaue Pokémon psychokinetische Kräfte.", es: "Mientras adormece a sus enemigos con su mirada vacía, este astuto Pokémon usa poderes psicoquinéticos.", ja: "ぼんやりした顔で相手を油断させ、サイコパワーを操るずる賢いポケモン。" },
  "golduck": { fr: "Souvent vu nageant élégamment près des rives des lacs. On le confond souvent avec le monstre japonais Kappa.", de: "Oft elegant an Seeufern schwimmend gesehen. Es wird oft mit dem japanischen Monster Kappa verwechselt.", es: "A menudo se le ve nadando elegantemente cerca de las orillas de los lagos. Se le confunde con el Kappa.", ja: "湖岸を優雅に泳ぐ姿がよく見られる。日本の妖怪カッパと間違われることも。" },
  "mankey": { fr: "Extrêmement prompt à se fâcher. Il peut être docile un instant, puis s'agiter violemment l'instant d'après.", de: "Äußerst schnell wütend. Es kann einen Moment sanft sein und im nächsten wild um sich schlagen.", es: "Extremadamente irascible. Puede estar tranquilo un momento y al siguiente atacar violentamente.", ja: "とても短気。おとなしいかと思えば、次の瞬間には暴れている。" },
  "primeape": { fr: "Toujours furieux et tenace. Il ne renoncera pas à poursuivre sa proie tant qu'elle n'est pas attrapée.", de: "Immer wütend und hartnäckig. Es gibt die Jagd auf seine Beute nicht auf, bis sie gefangen ist.", es: "Siempre furioso y tenaz. No abandona la caza de su presa hasta atraparla.", ja: "いつも怒っていて、しつこい。獲物を捕まえるまで追跡をやめない。" },
  "growlithe": { fr: "Très protecteur de son territoire. Il aboie et mord pour repousser les intrus.", de: "Sehr beschützend gegenüber seinem Revier. Es bellt und beißt, um Eindringlinge zu vertreiben.", es: "Muy protector de su territorio. Ladra y muerde para repeler a los intrusos.", ja: "縄張り意識が強い。侵入者には吠えかかって追い払う。" },
  "arcanine": { fr: "Admiré depuis le passé pour sa beauté. Il court agilement comme s'il avait des ailes.", de: "Seit jeher für seine Schönheit bewundert. Es läuft agil, als hätte es Flügel.", es: "Admirado desde el pasado por su belleza. Corre con agilidad como si tuviera alas.", ja: "昔から美しさで知られるポケモン。翼があるかのように軽やかに駆ける。" },
  "poliwag": { fr: "Ses pattes fraîchement formées l'empêchent de courir. Il préfère nager plutôt que de rester debout.", de: "Seine frisch gewachsenen Beine hindern es am Laufen. Es schwimmt lieber, als zu stehen.", es: "Sus nuevas patas le impiden correr. Prefiere nadar a mantenerse en pie.", ja: "生えたばかりの足ではうまく走れない。立つより泳ぐほうが好き。" },
  "poliwhirl": { fr: "Capable de vivre dans et hors de l'eau. Hors de l'eau, il transpire pour garder son corps visqueux.", de: "Kann in und außerhalb von Wasser leben. An Land schwitzt es, um seinen Körper schleimig zu halten.", es: "Capaz de vivir dentro y fuera del agua. Fuera del agua, suda para mantener su cuerpo viscoso.", ja: "水の中でも外でも生きられる。陸では体をぬめらせるために汗をかく。" },
  "poliwrath": { fr: "Nageur expert en crawl et en brasse. Il dépasse facilement les meilleurs nageurs humains.", de: "Erfahrener Schwimmer im Kraul- und Bruststil. Es überholt leicht die besten menschlichen Schwimmer.", es: "Nadador experto en crol y braza. Supera fácilmente a los mejores nadadores humanos.", ja: "クロールも平泳ぎも得意な泳ぎの名人。人間の水泳選手より速い。" },
  "abra": { fr: "Grâce à sa capacité à lire les pensées, il détecte un danger imminent et se téléporte en sécurité.", de: "Mit seiner Gedankenlesefähigkeit erkennt es drohende Gefahr und teleportiert sich in Sicherheit.", es: "Con su habilidad para leer la mente, detecta el peligro y se teletransporta a un lugar seguro.", ja: "テレパシーで危険を察知し、瞬間移動で安全な場所へ逃げる。" },
  "kadabra": { fr: "Il émet des ondes alpha spéciales qui provoquent des maux de tête rien qu'en s'approchant.", de: "Es sendet spezielle Alphawellen aus, die schon bei Annäherung Kopfschmerzen verursachen.", es: "Emite ondas alfa especiales que causan dolores de cabeza solo por estar cerca.", ja: "近くにいるだけで頭痛を起こす特殊なα波を放つ。" },
  "alakazam": { fr: "Son cerveau surpasse un supercalculateur. Son quotient intellectuel est d'environ 5000.", de: "Sein Gehirn übertrifft einen Supercomputer. Sein Intelligenzquotient liegt bei etwa 5000.", es: "Su cerebro supera a un superordenador. Su coeficiente intelectual es de unos 5000.", ja: "頭脳はスーパーコンピューター以上。IQはおよそ5000とされる。" },
  "machop": { fr: "Aime développer ses muscles. Il s'entraîne dans tous les arts martiaux pour devenir plus fort.", de: "Liebt es, Muskeln aufzubauen. Es trainiert in allen Kampfkünsten, um stärker zu werden.", es: "Le encanta desarrollar sus músculos. Entrena en todas las artes marciales para hacerse más fuerte.", ja: "筋肉を鍛えるのが好き。さらに強くなるため、あらゆる格闘技を修業する。" },
  "machoke": { fr: "Son corps musclé est si puissant qu'il doit porter une ceinture de puissance pour réguler ses mouvements.", de: "Sein muskulöser Körper ist so stark, dass es einen Kraftgürtel tragen muss, um seine Bewegungen zu kontrollieren.", es: "Su cuerpo musculoso es tan poderoso que debe llevar un cinturón de control.", ja: "あまりに強い筋肉を持つため、動きを制御するパワーセーブベルトを着用している。" },
  "machamp": { fr: "Avec ses muscles lourds, il lance des coups si puissants qu'ils peuvent envoyer la victime à l'horizon.", de: "Mit seinen schweren Muskeln wirft es Schläge, die das Opfer bis über den Horizont schleudern können.", es: "Con sus pesados músculos, lanza golpes que pueden mandar a la víctima más allá del horizonte.", ja: "重い筋肉で放つパンチは、相手を遥か彼方まで吹き飛ばす。" },
  "bellsprout": { fr: "Un Pokémon carnivore qui piège et mange des insectes. Ses pieds-racines absorbent l'humidité.", de: "Ein fleischfressendes Pokémon, das Insekten fängt und frisst. Mit seinen Wurzelfüßen saugt es Feuchtigkeit auf.", es: "Un Pokémon carnívoro que atrapa y come insectos. Sus pies de raíz absorben la humedad.", ja: "虫を捕まえて食べる肉食ポケモン。根っこの足で水分を吸収する。" },
  "weepinbell": { fr: "Il crache de la poudre toxique pour immobiliser l'ennemi puis l'achève avec un jet d'acide.", de: "Es spuckt Giftpuder aus, um den Feind zu lähmen, und erledigt ihn dann mit einem Säurespray.", es: "Escupe polvo venenoso para inmovilizar al enemigo y lo remata con un chorro de ácido.", ja: "どくのこなで相手を動けなくし、ようかいえきで仕留める。" },
  "victreebel": { fr: "On dit qu'il vit en grandes colonies au fond des jungles, mais personne n'en est jamais revenu.", de: "Es soll in großen Kolonien tief im Dschungel leben, doch niemand ist je zurückgekehrt.", es: "Se dice que vive en enormes colonias en lo profundo de la jungla, pero nadie ha regresado jamás.", ja: "密林の奥深くに大群で生息すると言われるが、帰ってきた者はいない。" },
  "tentacool": { fr: "Dérive dans les mers peu profondes. Les pêcheurs qui l'attrapent par accident sont punis par son acide.", de: "Treibt in flachen Meeren. Angler, die es versehentlich fangen, werden von seiner Säure bestraft.", es: "Deriva en mares poco profundos. Los pescadores que lo enganchan por accidente sufren su ácido.", ja: "浅い海を漂う。誤って釣り上げた釣り人は毒に刺される。" },
  "tentacruel": { fr: "Il peut étendre librement ses 80 tentacules pour attraper ses proies. Souvent trouvé en mer.", de: "Es kann seine 80 Tentakel frei ausstrecken, um Beute zu fangen. Oft auf See anzutreffen.", es: "Puede extender libremente sus 80 tentáculos para atrapar presas. A menudo en el mar.", ja: "80本の触手を自由に伸ばして獲物を捕らえる。海でよく見られる。" },
  "geodude": { fr: "Trouvé dans les champs et les montagnes. Le prenant pour un rocher, les gens trébuchent dessus.", de: "In Feldern und Bergen zu finden. Da man es für einen Felsen hält, stolpert man darüber.", es: "Se encuentra en campos y montañas. Al confundirlo con una roca, la gente tropieza con él.", ja: "野原や山にいる。岩と間違えられて、人がつまずくことも。" },
  "graveler": { fr: "Roule sur les pentes pour se déplacer. Il roule sur tout obstacle sans ralentir.", de: "Rollt Hänge hinunter, um sich fortzubewegen. Es rollt über jedes Hindernis, ohne zu verlangsamen.", es: "Rueda por las pendientes para moverse. Rueda sobre cualquier obstáculo sin frenar.", ja: "坂道を転がって移動する。どんな障害物も速度を落とさずに乗り越える。" },
  "golem": { fr: "Son corps de rocher est extrêmement dur. Il résiste sans dommage aux explosions de dynamite.", de: "Sein felsiger Körper ist extrem hart. Es hält Dynamit-Explosionen ohne Schaden stand.", es: "Su cuerpo rocoso es extremadamente duro. Resiste explosiones de dinamita sin daño.", ja: "岩のような体は非常に硬く、ダイナマイトの爆発にも耐える。" },
  "ponyta": { fr: "Ses sabots sont 10 fois plus durs que le diamant. Il peut aplatir n'importe quoi.", de: "Seine Hufe sind 10-mal härter als Diamant. Es kann alles völlig platt trampeln.", es: "Sus cascos son 10 veces más duros que el diamante. Puede aplastarlo todo.", ja: "ひづめはダイヤモンドの10倍の硬さ。何でも真っ平らに踏み潰す。" },
  "rapidash": { fr: "Très compétitif, il poursuit tout ce qui bouge vite dans l'espoir de faire la course.", de: "Sehr wetteifernd, jagt es alles, was sich schnell bewegt, in der Hoffnung auf ein Rennen.", es: "Muy competitivo, persigue cualquier cosa que se mueva rápido con la esperanza de correr contra ella.", ja: "負けず嫌いで、速く動くものを見るとレースをしたくて追いかける。" },
  "slowpoke": { fr: "Incroyablement lent et hébété. Il lui faut 5 secondes pour ressentir la douleur d'une attaque.", de: "Unglaublich langsam und benommen. Es braucht 5 Sekunden, um Schmerz bei einem Angriff zu spüren.", es: "Increíblemente lento y atontado. Tarda 5 segundos en sentir dolor cuando es atacado.", ja: "とてものろまで間抜け。攻撃されても痛みを感じるまで5秒かかる。" },
  "slowbro": { fr: "On dit que le Kokiyas accroché à sa queue se nourrit des restes du Slowpoke.", de: "Der Shellder, der an seinem Schwanz hängt, ernährt sich angeblich von den Resten des Wirts.", es: "Se dice que el Shellder que se aferra a su cola se alimenta de los restos del huésped.", ja: "しっぽに噛みついたシェルダーは、本体の食べ残しを食べているという。" },
  "magnemite": { fr: "Utilise l'anti-gravité pour rester suspendu. Il apparaît sans prévenir et utilise des attaques électriques.", de: "Nutzt Anti-Schwerkraft, um zu schweben. Es erscheint ohne Vorwarnung und setzt Elektroangriffe ein.", es: "Usa la antigravedad para mantenerse suspendido. Aparece sin avisar y usa ataques eléctricos.", ja: "反重力で空中に浮かんでいる。突然現れて電気技を使ってくる。" },
  "magneton": { fr: "Formé par plusieurs Magnemite reliés. Ils apparaissent souvent lors des éruptions solaires.", de: "Aus mehreren verbundenen Magnemite gebildet. Sie erscheinen oft bei Sonnenflecken.", es: "Formado por varios Magnemite unidos. Aparecen a menudo durante las erupciones solares.", ja: "複数のコイルがくっついてできている。黒点が増えるとよく現れる。" },
  "farfetchd": { fr: "La botte de poireaux qu'il tient est son arme. Il s'en sert comme d'une épée de métal.", de: "Das Bund Lauch, das es hält, ist seine Waffe. Es benutzt es wie ein Metallschwert.", es: "El manojo de puerros que sostiene es su arma. Lo usa como una espada de metal.", ja: "持っているネギは武器。まるで金属の剣のように使いこなす。" },
  "doduo": { fr: "Un oiseau qui compense son vol médiocre par sa vitesse au sol. Laisse d'énormes empreintes.", de: "Ein Vogel, der sein schwaches Fliegen mit schnellem Laufen ausgleicht. Hinterlässt riesige Fußabdrücke.", es: "Un ave que compensa su pobre vuelo con su velocidad terrestre. Deja enormes huellas.", ja: "飛ぶのは苦手だが、その分足が速い。大きな足跡を残す。" },
  "dodrio": { fr: "Utilise ses trois cerveaux pour des plans complexes. Pendant que deux têtes dorment, une reste éveillée.", de: "Nutzt seine drei Gehirne für komplexe Pläne. Während zwei Köpfe schlafen, bleibt einer wach.", es: "Usa sus tres cerebros para planes complejos. Mientras dos cabezas duermen, una permanece despierta.", ja: "3つの頭脳で複雑な作戦を立てる。2つの頭が眠る間も1つは起きている。" },
  "seel": { fr: "La corne saillante de sa tête est très dure. Elle sert à briser la glace épaisse.", de: "Das hervorstehende Horn auf seinem Kopf ist sehr hart. Es dient zum Durchbrechen von dickem Eis.", es: "El cuerno de su cabeza es muy duro. Se usa para romper el hielo grueso.", ja: "頭の出っ張った角はとても硬い。厚い氷を砕くのに使う。" },
  "dewgong": { fr: "Stocke de l'énergie thermique dans son corps. Il nage à 8 nœuds réguliers même dans les eaux glaciales.", de: "Speichert Wärmeenergie in seinem Körper. Es schwimmt selbst in eisigem Wasser konstant 8 Knoten.", es: "Almacena energía térmica en su cuerpo. Nada a 8 nudos incluso en aguas heladas.", ja: "体に熱エネルギーを蓄える。氷水の中でも時速15kmで泳ぎ続ける。" },
  "grimer": { fr: "Apparaît dans les endroits sales. Il prospère en absorbant la boue polluée des usines.", de: "Erscheint an schmutzigen Orten. Es gedeiht, indem es Fabrikschlamm aufsaugt.", es: "Aparece en lugares sucios. Prospera absorbiendo los lodos contaminados de las fábricas.", ja: "汚れた場所に現れる。工場のヘドロを吸って生きている。" },
  "muk": { fr: "Recouvert d'une boue épaisse et répugnante. Si toxique que même ses traces contiennent du poison.", de: "Dicht mit ekligem Schlamm bedeckt. So giftig, dass selbst seine Fußspuren Gift enthalten.", es: "Cubierto de un lodo espeso y asqueroso. Tan tóxico que hasta sus huellas contienen veneno.", ja: "どろどろの汚いヘドロに覆われている。足あとにも毒があるほど。" },
  "shellder": { fr: "Sa coquille dure repousse toute attaque. Il n'est vulnérable que lorsque sa coquille est ouverte.", de: "Sein harter Panzer wehrt jeden Angriff ab. Es ist nur verwundbar, wenn sein Panzer offen ist.", es: "Su dura concha repele cualquier ataque. Solo es vulnerable cuando su concha está abierta.", ja: "硬い殻はどんな攻撃もはね返す。殻が開いているときだけが弱点。" },
  "cloyster": { fr: "Attaqué, il lance ses cornes en rafales rapides. On n'a jamais vu son intérieur.", de: "Bei Angriffen schießt es seine Hörner in schnellen Salven ab. Sein Inneres wurde nie gesehen.", es: "Cuando es atacado, dispara sus cuernos en ráfagas rápidas. Nunca se ha visto su interior.", ja: "攻撃されるとツノを素早く連射する。中身は誰も見たことがない。" },
  "gastly": { fr: "Presque invisible, ce Pokémon gazeux enveloppe sa cible et l'endort sans prévenir.", de: "Fast unsichtbar hüllt dieses gasförmige Pokémon sein Ziel ein und schläfert es unbemerkt ein.", es: "Casi invisible, este Pokémon gaseoso envuelve a su objetivo y lo duerme sin avisar.", ja: "ほとんど姿が見えず、相手を包み込んでいつの間にか眠らせる。" },
  "haunter": { fr: "Grâce à sa capacité à traverser les murs, on dit qu'il vient d'une autre dimension.", de: "Da es durch Wände schlüpfen kann, sagt man, es stamme aus einer anderen Dimension.", es: "Por su habilidad de atravesar paredes, se dice que viene de otra dimensión.", ja: "壁をすり抜けることから、異次元から来たと言われる。" },
  "gengar": { fr: "Sous une pleine lune, ce Pokémon aime imiter les ombres des gens et rire de leur frayeur.", de: "Bei Vollmond ahmt es gern Schatten von Menschen nach und lacht über ihre Angst.", es: "Bajo la luna llena, le gusta imitar las sombras de la gente y reírse de su miedo.", ja: "満月の夜、人の影に化けて驚かせては、その様子を楽しんでいる。" },
  "onix": { fr: "En grandissant, les parties rocheuses de son corps durcissent jusqu'à ressembler à un diamant noir.", de: "Mit dem Wachstum verhärten sich die steinigen Teile seines Körpers zu schwarzem Diamant.", es: "Al crecer, las partes rocosas de su cuerpo se endurecen como un diamante negro.", ja: "成長するにつれ、体の石の部分が黒いダイヤのように硬くなる。" },
  "drowzee": { fr: "Endort ses ennemis puis mange leurs rêves. Il lui arrive d'être malade après de mauvais rêves.", de: "Schläfert Feinde ein und frisst ihre Träume. Gelegentlich wird es von schlechten Träumen krank.", es: "Duerme a sus enemigos y luego come sus sueños. A veces enferma por los malos sueños.", ja: "敵を眠らせて夢を食べる。悪い夢を食べて病気になることも。" },
  "hypno": { fr: "Quand il croise le regard d'un ennemi, il utilise un mélange de techniques psi comme Hypnose et Confusion.", de: "Wenn es einem Feind in die Augen blickt, nutzt es Psi-Attacken wie Hypnose und Konfusion.", es: "Cuando cruza la mirada con un enemigo, usa técnicas psi como Hipnosis y Confusión.", ja: "目が合うと、さいみんじゅつやねんりきなどのサイコ技で攻める。" },
  "krabby": { fr: "Ses pinces ne sont pas que des armes puissantes, elles servent aussi d'équilibre quand il marche de côté.", de: "Seine Scheren sind nicht nur starke Waffen, sie dienen auch als Gleichgewicht beim Seitwärtsgehen.", es: "Sus pinzas no solo son armas poderosas, también le sirven de equilibrio al caminar de lado.", ja: "ハサミは強力な武器であると同時に、横歩きのバランスをとる役割もある。" },
  "kingler": { fr: "La grande pince a une force d'écrasement de 10 000 chevaux. Mais sa taille la rend difficile à manier.", de: "Die große Schere hat 10 000 PS Zerdrückkraft. Doch ihre Größe macht sie unhandlich.", es: "La gran pinza tiene fuerza de aplastamiento de 10 000 caballos. Pero su tamaño la hace difícil de manejar.", ja: "巨大なハサミは1万馬力の破壊力。しかし大きすぎて扱いにくい。" },
  "voltorb": { fr: "Habituellement trouvé dans les centrales électriques. Confondu avec une Poké Ball, il a électrocuté bien des gens.", de: "Meist in Kraftwerken zu finden. Mit einem Pokéball verwechselt, hat es viele Menschen elektrisiert.", es: "Suele encontrarse en centrales eléctricas. Confundido con una Poké Ball, ha electrocutado a mucha gente.", ja: "発電所などで見られる。モンスターボールと間違えられ、感電させてしまう。" },
  "electrode": { fr: "Il stocke l'énergie électrique sous très haute pression. Il explose souvent sans provocation.", de: "Es speichert elektrische Energie unter hohem Druck. Es explodiert oft ohne Anlass.", es: "Almacena energía eléctrica a muy alta presión. A menudo explota sin provocación.", ja: "高圧で電気エネルギーを蓄える。少しの刺激でも爆発することが多い。" },
  "exeggcute": { fr: "Souvent confondu avec des œufs. Dérangé, il se rassemble rapidement et attaque en groupe.", de: "Oft mit Eiern verwechselt. Gestört, versammelt es sich schnell und greift in Gruppen an.", es: "A menudo confundido con huevos. Cuando se le molesta, se reúne rápido y ataca en grupo.", ja: "タマゴと間違われることが多い。邪魔されるとすぐ集まり、群れで攻撃する。" },
  "exeggutor": { fr: "La légende dit que, rarement, une de ses têtes se détache et continue comme un Exeggcute.", de: "Der Legende nach löst sich selten einer seiner Köpfe und wird zu einem Exeggcute.", es: "La leyenda dice que, en raras ocasiones, una de sus cabezas se desprende y continúa como Exeggcute.", ja: "まれに頭が1つ落ちて、そのままタマタマとして育つという伝説がある。" },
  "cubone": { fr: "Parce qu'il ne retire jamais son casque de crâne, personne n'a jamais vu son vrai visage.", de: "Da es seinen Schädelhelm nie abnimmt, hat niemand je sein wahres Gesicht gesehen.", es: "Porque nunca se quita su casco de calavera, nadie ha visto jamás su verdadero rostro.", ja: "頭蓋骨のヘルメットを決して外さないため、素顔を見た者は誰もいない。" },
  "marowak": { fr: "L'os qu'il tient est son arme clé. Il le lance habilement comme un boomerang pour mettre KO ses cibles.", de: "Der Knochen, den es hält, ist seine Schlüsselwaffe. Es wirft ihn geschickt wie einen Bumerang.", es: "El hueso que sostiene es su arma clave. Lo lanza hábilmente como un bumerán para noquear objetivos.", ja: "手にした骨が武器。ブーメランのように巧みに投げて敵を倒す。" },
  "hitmonlee": { fr: "S'il commence à donner des coups de pied, il continue jusqu'à perdre l'équilibre. Il saute à 9 mètres.", de: "Wenn es zu treten beginnt, tritt es weiter, bis es das Gleichgewicht verliert. Es springt 9 Meter hoch.", es: "Si empieza a patear, no para hasta perder el equilibrio. Puede saltar 9 metros.", ja: "蹴り始めるとバランスを崩すまで蹴り続ける。9mのジャンプが可能。" },
  "hitmonchan": { fr: "Sans rien laisser paraître, il lance des rafales de poings impossibles à voir à l'œil nu.", de: "Während es scheinbar nichts tut, feuert es Blitzserien von Schlägen ab, die unsichtbar sind.", es: "Mientras aparentemente no hace nada, dispara ráfagas de puñetazos imposibles de ver.", ja: "動きを見せずに、目で追えないほどの高速パンチを連発する。" },
  "lickitung": { fr: "Sa langue s'étire comme celle d'un caméléon. Elle laisse une sensation de picotement en léchant.", de: "Seine Zunge kann sich wie bei einem Chamäleon ausstrecken. Sie hinterlässt ein Kribbeln beim Lecken.", es: "Su lengua se estira como la de un camaleón. Deja una sensación de cosquilleo al lamer.", ja: "トカゲのように舌を伸ばす。舐められるとしびれるような感触が残る。" },
  "koffing": { fr: "Comme il stocke plusieurs gaz toxiques dans son corps, il dégage souvent des odeurs.", de: "Da es mehrere Giftgase in seinem Körper speichert, verströmt es oft Gerüche.", es: "Como almacena varios gases tóxicos en su cuerpo, a menudo despide olores.", ja: "体にさまざまな毒ガスを蓄えているため、いつも異臭を放っている。" },
  "weezing": { fr: "Là où deux gaz toxiques se rencontrent, deux Koffing peuvent fusionner en un Weezing après des années.", de: "Wo zwei Giftgase zusammentreffen, können zwei Koffing nach Jahren zu einem Weezing verschmelzen.", es: "Donde se encuentran dos gases venenosos, dos Koffing pueden fusionarse en un Weezing tras años.", ja: "2種類の毒ガスが出会う場所では、長い年月を経て2匹のドガースがマタドガスに合体する。" },
  "rhyhorn": { fr: "Ses os massifs sont 1000 fois plus durs que ceux des humains. Il peut envoyer une remorque voler.", de: "Seine massiven Knochen sind 1000-mal härter als Menschenknochen. Es kann einen Anhänger wegschleudern.", es: "Sus huesos masivos son 1000 veces más duros que los humanos. Puede lanzar un remolque por los aires.", ja: "骨は人間の1000倍の硬さ。トレーラーを軽々と吹き飛ばす。" },
  "rhydon": { fr: "Protégé par une peau semblable à une armure, il peut vivre dans la lave en fusion à 3600 degrés.", de: "Geschützt durch eine panzerartige Haut kann es in glühender Lava von 3600 Grad leben.", es: "Protegido por una piel blindada, puede vivir en lava fundida a 3600 grados.", ja: "ヨロイのような皮膚に守られ、3600度の溶岩の中でも生きられる。" },
  "chansey": { fr: "Un Pokémon rare et insaisissable dont on dit qu'il apporte le bonheur à ceux qui l'attrapent.", de: "Ein seltenes und schwer fassbares Pokémon, das angeblich denen Glück bringt, die es fangen.", es: "Un Pokémon raro y esquivo del que se dice que trae felicidad a quienes lo capturan.", ja: "めったに見られない珍しいポケモン。捕まえた人に幸せを運ぶと言われる。" },
  "tangela": { fr: "Tout son corps est enveloppé de lianes semblables à des algues. Elles tremblent quand il marche.", de: "Sein ganzer Körper ist mit algenartigen Ranken umhüllt. Sie wackeln beim Gehen.", es: "Todo su cuerpo está envuelto en enredaderas parecidas a algas. Tiemblan al caminar.", ja: "体は海藻のようなつるで覆われている。歩くたびにつるが揺れる。" },
  "kangaskhan": { fr: "Le petit sort rarement de la poche protectrice de sa mère jusqu'à l'âge de 3 ans.", de: "Das Kind verlässt selten den schützenden Beutel seiner Mutter, bis es 3 Jahre alt ist.", es: "La cría rara vez sale de la bolsa protectora de su madre hasta los 3 años.", ja: "生まれてから3年間は、母親のお腹の袋からほとんど出ない。" },
  "horsea": { fr: "Connu pour abattre les insectes volants avec des jets d'encre précis depuis la surface de l'eau.", de: "Bekannt dafür, fliegende Insekten mit präzisen Tintenschüssen von der Wasseroberfläche abzuschießen.", es: "Conocido por derribar insectos voladores con chorros de tinta precisos desde la superficie del agua.", ja: "水面から正確な墨を放ち、飛んでいる虫を撃ち落とすことで知られる。" },
  "seadra": { fr: "Capable de nager en arrière en battant rapidement ses nageoires pectorales et sa queue robuste.", de: "Kann rückwärts schwimmen, indem es schnell seine brustflossenartigen Flügel und den kräftigen Schwanz bewegt.", es: "Capaz de nadar hacia atrás batiendo rápidamente sus aletas pectorales y su robusta cola.", ja: "胸びれと太いしっぽを素早く動かして後ろ向きに泳ぐこともできる。" },
  "goldeen": { fr: "Sa nageoire caudale ondule comme une robe de bal élégante, d'où son surnom de Reine des Eaux.", de: "Seine Schwanzflosse bauscht sich wie ein elegantes Ballkleid, daher sein Spitzname Wasserkönigin.", es: "Su aleta caudal ondea como un elegante vestido de gala, de ahí su apodo de Reina del Agua.", ja: "優雅なドレスを広げたような尾びれを持つことから「水の女王」と呼ばれる。" },
  "seaking": { fr: "En automne, on peut les voir nager puissamment en remontant les rivières et les ruisseaux.", de: "Im Herbst kann man sie kräftig flussaufwärts schwimmen sehen.", es: "En otoño pueden verse nadando poderosamente río arriba por los arroyos.", ja: "秋になると、産卵のため力強く川を上っていく姿が見られる。" },
  "staryu": { fr: "Un Pokémon énigmatique qui peut régénérer sans effort tout appendice perdu au combat.", de: "Ein rätselhaftes Pokémon, das jedes verlorene Körperteil mühelos regenerieren kann.", es: "Un Pokémon enigmático que puede regenerar sin esfuerzo cualquier apéndice perdido en combate.", ja: "戦いで失った部分を即座に再生できる不思議なポケモン。" },
  "starmie": { fr: "Son cœur central brille des sept couleurs de l'arc-en-ciel. Certains le considèrent comme un joyau.", de: "Sein Kern glüht in den sieben Regenbogenfarben. Manche schätzen den Kern als Edelstein.", es: "Su núcleo central brilla con los siete colores del arcoíris. Algunos lo valoran como una gema.", ja: "中央のコアは虹の7色に輝く。そのコアを宝石として珍重する人もいる。" },
  "mr-mime": { fr: "S'il est interrompu pendant son mime, il gifle l'importun avec ses grandes mains.", de: "Wird es beim Pantomime-Spiel unterbrochen, ohrfeigt es den Störer mit seinen breiten Händen.", es: "Si se le interrumpe mientras hace mimo, abofetea al intruso con sus anchas manos.", ja: "物まねの最中に邪魔されると、大きな手で相手をビンタする。" },
  "scyther": { fr: "Avec une agilité et une vitesse de ninja, il peut créer l'illusion d'être plusieurs.", de: "Mit ninjahafter Wendigkeit und Geschwindigkeit erzeugt es die Illusion, mehrfach zu sein.", es: "Con agilidad y velocidad de ninja, puede crear la ilusión de que hay más de uno.", ja: "忍者のような身軽さと速さで、分身したかのように見せかける。" },
  "jynx": { fr: "Il se dandine en marchant. Il peut faire danser les gens à l'unisson.", de: "Es wiegt beim Gehen verführerisch die Hüften. Es kann Menschen im Gleichklang tanzen lassen.", es: "Menea las caderas seductoramente al caminar. Puede hacer bailar a la gente al unísono.", ja: "歩くとき腰をくねらせる。見た人を同じ動きで踊らせてしまう。" },
  "electabuzz": { fr: "Normalement près des centrales électriques, il peut s'éloigner et provoquer des pannes dans les grandes villes.", de: "Normalerweise in der Nähe von Kraftwerken, kann es sich entfernen und in Großstädten Blackouts verursachen.", es: "Normalmente cerca de centrales eléctricas, puede alejarse y causar apagones en grandes ciudades.", ja: "普段は発電所のそばにいるが、遠くへ行って大都市の停電を起こすことも。" },
  "magmar": { fr: "Son corps brûle d'une lueur orange qui lui permet de se cacher parfaitement parmi les flammes.", de: "Sein Körper glüht orangefarben, sodass es sich perfekt in Flammen verstecken kann.", es: "Su cuerpo arde con un brillo naranja que le permite ocultarse perfectamente entre las llamas.", ja: "オレンジ色に燃える体は、炎の中に完璧に溶け込む。" },
  "pinsir": { fr: "S'il ne parvient pas à écraser sa victime avec ses pinces, il la jette et la projette violemment.", de: "Schafft es nicht, das Opfer mit seinen Scheren zu zerquetschen, wirft es es herum und schleudert es hart.", es: "Si no logra aplastar a su víctima con sus pinzas, la arroja y la lanza con violencia.", ja: "ハサミで挟みつぶせないと、相手を振り回して勢いよく投げ飛ばす。" },
  "tauros": { fr: "Quand il vise un ennemi, il charge furieusement en se fouettant avec ses longues queues.", de: "Wenn es ein Ziel anvisiert, stürmt es wütend los und peitscht sich mit seinen langen Schwänzen.", es: "Cuando apunta a un enemigo, carga furiosamente azotándose con sus largas colas.", ja: "敵を発見すると、長い3本の尻尾で体を叩きながら猛突進する。" },
  "magikarp": { fr: "Dans un passé lointain, il était un peu plus fort que les descendants terriblement faibles d'aujourd'hui.", de: "In ferner Vergangenheit war es etwas stärker als die schrecklich schwachen Nachfahren von heute.", es: "En un pasado lejano era algo más fuerte que los terriblemente débiles descendientes actuales.", ja: "大昔は、今のひどく弱い子孫より少し強かったという。" },
  "gyarados": { fr: "Rarement vu à l'état sauvage. Énorme et vicieux, il peut détruire des villes entières dans sa rage.", de: "Selten in der Wildnis gesehen. Riesig und boshaft, kann es in seiner Wut ganze Städte zerstören.", es: "Rara vez visto en estado salvaje. Enorme y vicioso, puede destruir ciudades enteras en su ira.", ja: "野生ではめったに見られない。巨大で凶暴で、怒ると町ひとつ壊すこともある。" },
  "lapras": { fr: "Un Pokémon chassé jusqu'à presque l'extinction. Il peut transporter les gens sur l'eau.", de: "Ein fast bis zur Ausrottung gejagtes Pokémon. Es kann Menschen übers Wasser tragen.", es: "Un Pokémon cazado casi hasta la extinción. Puede transportar gente por el agua.", ja: "乱獲のせいで絶滅寸前。人を背中に乗せて海を渡ることができる。" },
  "ditto": { fr: "Capable de copier le code génétique d'un ennemi pour se transformer en son double.", de: "Kann den genetischen Code eines Feindes kopieren, um sich in ein Duplikat zu verwandeln.", es: "Capaz de copiar el código genético de un enemigo para transformarse en su duplicado.", ja: "相手の遺伝子をコピーして、そのままの姿に変身することができる。" },
  "eevee": { fr: "Son code génétique est irrégulier. Il peut muter s'il est exposé aux radiations des pierres élémentaires.", de: "Sein genetischer Code ist unregelmäßig. Es kann mutieren, wenn es Strahlung von Elementsteinen ausgesetzt wird.", es: "Su código genético es irregular. Puede mutar si se expone a la radiación de las piedras elementales.", ja: "遺伝子が不安定で、元素の石の放射線を浴びると突然変異することがある。" },
  "vaporeon": { fr: "Vit près de l'eau. Sa longue queue porte une nageoire souvent prise pour une sirène.", de: "Lebt nahe dem Wasser. Sein langer Schwanz hat eine Flosse, die oft für eine Meerjungfrau gehalten wird.", es: "Vive cerca del agua. Su larga cola tiene una aleta que a menudo se confunde con una sirena.", ja: "水辺で暮らす。尾びれのある長いしっぽは、人魚と間違われることも。" },
  "jolteon": { fr: "Il accumule des ions négatifs pour lancer des éclairs de 10 000 volts.", de: "Es sammelt negative Ionen, um Blitze mit 10 000 Volt abzufeuern.", es: "Acumula iones negativos para disparar rayos de 10 000 voltios.", ja: "空気中のマイナスイオンを集め、1万ボルトの雷を放つ。" },
  "flareon": { fr: "En stockant de l'énergie thermique, sa température peut dépasser 1600 degrés.", de: "Beim Speichern von Wärmeenergie kann seine Temperatur über 1600 Grad steigen.", es: "Al almacenar energía térmica, su temperatura puede superar los 1600 grados.", ja: "体内に熱エネルギーを溜めると、体温は1600度を超える。" },
  "porygon": { fr: "Un Pokémon composé entièrement de code de programmation. Capable de se déplacer librement dans le cyberespace.", de: "Ein Pokémon, das vollständig aus Programmcode besteht. Es kann sich frei im Cyberspace bewegen.", es: "Un Pokémon compuesto enteramente de código de programación. Capaz de moverse libremente en el ciberespacio.", ja: "プログラムのコードだけでできたポケモン。サイバースペースを自由に動ける。" },
  "omanyte": { fr: "Bien qu'éteint depuis longtemps, il peut être ressuscité génétiquement à partir de fossiles.", de: "Obwohl längst ausgestorben, kann es in seltenen Fällen aus Fossilien wiederbelebt werden.", es: "Aunque extinto hace tiempo, en raras ocasiones puede resucitarse genéticamente de fósiles.", ja: "絶滅した古代のポケモンだが、化石から復活することがある。" },
  "omastar": { fr: "Un Pokémon préhistorique qui a disparu quand sa lourde coquille l'a empêché d'attraper ses proies.", de: "Ein prähistorisches Pokémon, das ausstarb, als sein schwerer Panzer das Jagen unmöglich machte.", es: "Un Pokémon prehistórico que se extinguió cuando su pesado caparazón le impidió atrapar presas.", ja: "重い殻のせいで獲物を捕れなくなり絶滅した古代ポケモン。" },
  "kabuto": { fr: "Ressuscité d'un fossile trouvé sur ce qui était autrefois le fond de l'océan.", de: "Aus einem Fossil wiederbelebt, das auf dem einstigen Meeresboden gefunden wurde.", es: "Resucitado de un fósil hallado en lo que fue el fondo del océano hace eones.", ja: "昔海の底だった場所で見つかった化石から復活したポケモン。" },
  "kabutops": { fr: "Sa forme profilée est parfaite pour nager. Il lacère ses proies de ses griffes et en aspire les fluides.", de: "Seine stromlinienförmige Form ist perfekt zum Schwimmen. Es schlitzt Beute mit seinen Krallen auf und saugt die Flüssigkeiten aus.", es: "Su forma aerodinámica es perfecta para nadar. Desgarra a sus presas con sus garras y drena sus fluidos.", ja: "流線型の体は泳ぎに最適。鋭いカマで獲物を切り裂き、体液を吸う。" },
  "aerodactyl": { fr: "Un Pokémon préhistorique féroce qui vise la gorge de l'ennemi avec ses crocs en scie.", de: "Ein wildes prähistorisches Pokémon, das mit seinen sägeartigen Fangzähnen die Kehle des Feindes anvisiert.", es: "Un feroz Pokémon prehistórico que ataca la garganta del enemigo con sus colmillos de sierra.", ja: "ノコギリのような鋭い牙で敵ののどを狙う凶暴な古代ポケモン。" },
  "snorlax": { fr: "Très paresseux. Il ne fait que manger et dormir. Plus sa masse s'arrondit, plus il devient indolent.", de: "Sehr faul. Es isst und schläft nur. Je runder es wird, desto träger wird es.", es: "Muy perezoso. Solo come y duerme. Cuanto más redondo se vuelve, más indolente es.", ja: "とてもなまけもの。食べて寝るだけ。体が太るほど、ますます怠惰になる。" },
  "articuno": { fr: "Un oiseau légendaire qui apparaîtrait aux personnes perdues dans les montagnes glacées.", de: "Ein legendärer Vogel, der angeblich verlorenen Menschen in eisigen Bergen erscheint.", es: "Un ave legendaria que se dice aparece a los perdidos en montañas heladas.", ja: "氷の山で遭難した人の前に現れるという伝説の鳥。" },
  "zapdos": { fr: "Un oiseau légendaire qui apparaîtrait des nuages en déchaînant d'énormes éclairs.", de: "Ein legendärer Vogel, der aus Wolken erscheint und gewaltige Blitze schleudert.", es: "Un ave legendaria que aparece de las nubes lanzando enormes rayos.", ja: "雲の中から現れ、巨大な稲妻を落とすという伝説の鳥。" },
  "moltres": { fr: "Connu comme l'oiseau légendaire du feu. Chaque battement d'aile crée un éclair de flammes éblouissant.", de: "Bekannt als legendärer Feuervogel. Jeder Flügelschlag erzeugt einen blendenden Flammenblitz.", es: "Conocido como el ave legendaria del fuego. Cada aleteo crea un destello cegador de llamas.", ja: "炎の伝説の鳥。羽ばたくたびに、まばゆい炎の閃光を放つ。" },
  "dratini": { fr: "Longtemps considéré comme mythique, jusqu'à ce qu'une petite colonie soit découverte sous l'eau.", de: "Lange als mythisch angesehen, bis eine kleine Kolonie unter Wasser entdeckt wurde.", es: "Durante mucho tiempo considerado mítico, hasta que se descubrió una pequeña colonia bajo el agua.", ja: "長らく幻のポケモンとされてきたが、水中で小さな群れが発見された。" },
  "dragonair": { fr: "Un Pokémon mystique qui dégage une aura douce. Il peut changer les conditions climatiques.", de: "Ein mystisches Pokémon mit sanfter Aura. Es kann das Klima verändern.", es: "Un Pokémon místico que irradia una aura suave. Puede cambiar las condiciones climáticas.", ja: "神秘的なオーラを放つポケモン。気候を変える力を持つと言われる。" },
  "dragonite": { fr: "Un Pokémon marin extrêmement rare. Son intelligence est dite comparable à celle des humains.", de: "Ein äußerst seltenes Meeres-Pokémon. Seine Intelligenz soll der des Menschen entsprechen.", es: "Un Pokémon marino extremadamente raro. Se dice que su inteligencia es comparable a la humana.", ja: "極めて珍しい海のポケモン。人間に匹敵する知能を持つと言われる。" },
  "mewtwo": { fr: "Créé par un scientifique après des années d'expériences horribles de manipulation génétique.", de: "Von einem Wissenschaftler nach Jahren schrecklicher Genmanipulation erschaffen.", es: "Creado por un científico tras años de horribles experimentos de manipulación genética.", ja: "科学者が長年の恐ろしい遺伝子操作の末に生み出したポケモン。" },
  "mew": { fr: "Si rare que beaucoup d'experts le considèrent encore comme un mirage. Peu de gens l'ont vu.", de: "So selten, dass viele Experten es noch immer für eine Fata Morgana halten. Nur wenige haben es gesehen.", es: "Tan raro que muchos expertos aún lo consideran un espejismo. Pocos lo han visto.", ja: "幻と言われるほど珍しい。世界中でも見た者はほとんどいない。" },
  "celebi": { fr: "Ce Pokémon est venu du futur en traversant le temps. On croit qu'il ne peut apparaître qu'en temps de paix.", de: "Dieses Pokémon kam aus der Zukunft, indem es die Zeit durchquerte. Es soll nur in Friedenszeiten erscheinen.", es: "Este Pokémon vino del futuro cruzando el tiempo. Se cree que solo puede aparecer en tiempos de paz.", ja: "未来から時を越えてやってきたポケモン。平和な時代にしか現れないと言われる。" },
};

/** Localized dex flavor for a species; unknown ids/languages fall back to EN. */
export function dexFlavor(speciesId: string, lang: Language): string {
  if (lang !== "en") {
    const localized = DEX_FLAVOR[speciesId]?.[lang];
    if (localized) return localized;
  }
  return getDexMeta(speciesId).flavor;
}

export { SPECIES, SPECIES_FR, SPECIES_DE, SPECIES_JA };
