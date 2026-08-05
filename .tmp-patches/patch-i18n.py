p = "src/game/i18n.ts"
s = open(p).read()

keys = r'''
  // ---- v2.0.0 Ghost PvP & Trainer Cards ----
  pvp: { en: "PVP", fr: "PVP", de: "PVP", es: "PVP", ja: "PVP" },
  safari: { en: "SAFARI", fr: "SAFARI", de: "SAFARI", es: "SAFARI", ja: "サファリ" },
  camera: { en: "CAM", fr: "CAM", de: "CAM", es: "CAM", ja: "カメラ" },
  "pvp-title": { en: "Ghost PvP", fr: "PvP Fantôme", de: "Geister-PvP", es: "PvP Fantasma", ja: "ゴーストPvP" },
  "pvp-rank": { en: "Rank: {rank}", fr: "Rang : {rank}", de: "Rang: {rank}", es: "Rango: {rank}", ja: "ランク: {rank}" },
  "pvp-wins": { en: "Wins {n}", fr: "Victoires {n}", de: "Siege {n}", es: "Victorias {n}", ja: "勝利 {n}" },
  "pvp-losses": { en: "Losses {n}", fr: "Défaites {n}", de: "Niederlagen {n}", es: "Derrotas {n}", ja: "敗北 {n}" },
  "pvp-trainer-card": { en: "Trainer Card", fr: "Carte Dresseur", de: "Trainerkarte", es: "Carta de Entrenador", ja: "トレーナーカード" },
  "pvp-import": { en: "IMPORT", fr: "IMPORTER", de: "IMPORTIEREN", es: "IMPORTAR", ja: "読み込む" },
  "pvp-import-hint": { en: "Paste a Trainer Card code", fr: "Collez un code Carte Dresseur", de: "Trainerkarte-Code einfügen", es: "Pega un código de Carta", ja: "カードコードを貼り付け" },
  "pvp-your-card": { en: "Your Card", fr: "Votre Carte", de: "Deine Karte", es: "Tu Carta", ja: "自分のカード" },
  "pvp-challenge": { en: "CHALLENGE", fr: "DÉFI", de: "FORDERN", es: "RETO", ja: "たたかう" },
  "pvp-await": { en: "{name} awaits!", fr: "{name} vous attend !", de: "{name} wartet!", es: "¡{name} te espera!", ja: "{name} が待っている！" },
  "rank-up": { en: "Promoted to {rank}!", fr: "Promu au rang {rank} !", de: "Aufgestiegen zu {rank}!", es: "¡Ascendido a {rank}!", ja: "{rank} に昇格！" },
  "pvp-loss": { en: "You lost to {name}...", fr: "Vous avez perdu contre {name}…", de: "Du hast gegen {name} verloren…", es: "Perdiste contra {name}...", ja: "{name} に敗れた…" },
  "invalid-code": { en: "Invalid Trainer Card code.", fr: "Code Carte Dresseur invalide.", de: "Ungültiger Trainerkarten-Code.", es: "Código de Carta inválido.", ja: "無効なカードコードです。" },
  "card-copied": { en: "Trainer Card copied!", fr: "Carte Dresseur copiée !", de: "Trainerkarte kopiert!", es: "¡Carta copiada!", ja: "カードをコピーした！" },
  "card-imported": { en: "{name}'s card loaded!", fr: "Carte de {name} chargée !", de: "{name}s Karte geladen!", es: "¡Carta de {name} cargada!", ja: "{name} のカードを読み込んだ！" },
  "pvp-copy": { en: "COPY", fr: "COPIER", de: "KOPIEREN", es: "COPIAR", ja: "コピー" },
  "pvp-empty": { en: "Import a friend's card to battle their team.", fr: "Importez une carte pour affronter son équipe.", de: "Importiere eine Karte, um gegen ihr Team zu kämpfen.", es: "Importa una carta para luchar contra su equipo.", ja: "カードを読み込んでチームと戦おう。" },
  // ---- v2.0.0 Daily quests & League Pass ----
  quests: { en: "DAILY QUESTS", fr: "DÉFIS QUOTIDIENS", de: "TAGESAUFGABEN", es: "MISIONES DIARIAS", ja: "デイリークエスト" },
  "quest-battle": { en: "Win {n} battles", fr: "Gagner {n} combats", de: "Gewinne {n} Kämpfe", es: "Gana {n} combates", ja: "{n} 回勝利" },
  "quest-capture": { en: "Catch {n} Pokémon", fr: "Capturer {n} Pokémon", de: "Fange {n} Pokémon", es: "Captura {n} Pokémon", ja: "{n} 匹捕まえる" },
  "quest-steps": { en: "Walk {n} steps", fr: "Marcher {n} pas", de: "Gehe {n} Schritte", es: "Camina {n} pasos", ja: "{n} 歩あるく" },
  "quest-rocket": { en: "Defeat {n} Rocket", fr: "Vaincre {n} Rocket", de: "Besiege {n} Rocket", es: "Derrota {n} Rocket", ja: "ロケット団を{n}回倒す" },
  "quest-trainer": { en: "Beat {n} trainers", fr: "Battre {n} dresseurs", de: "Besiege {n} Trainer", es: "Vence a {n} entrenadores", ja: "トレーナーに{n}回勝つ" },
  "quest-pvp": { en: "Win {n} ghost duel", fr: "Gagner {n} duel fantôme", de: "Gewinne {n} Geisterduell", es: "Gana {n} duelo fantasma", ja: "ゴースト戦で{n}回勝つ" },
  "quest-heal": { en: "Use {n} items", fr: "Utiliser {n} objets", de: "Benutze {n} Items", es: "Usa {n} objetos", ja: "どうぐを{n}回使う" },
  claim: { en: "CLAIM", fr: "RÉCLAMER", de: "EINLÖSEN", es: "RECLAMAR", ja: "受け取る" },
  "quest-claimed": { en: "Quest complete! +{money} ₽", fr: "Défi terminé ! +{money} ₽", de: "Aufgabe erledigt! +{money} ₽", es: "¡Misión completa! +{money} ₽", ja: "クエスト達成！ +{money} ₽" },
  "quests-none": { en: "Keep playing to unlock today's quests!", fr: "Continuez à jouer pour débloquer les défis du jour !", de: "Spiele weiter, um die Tagesaufgaben freizuschalten!", es: "¡Sigue jugando para desbloquear las misiones de hoy!", ja: "プレイを続けて今日のクエストを解放！" },
  pass: { en: "LEAGUE PASS", fr: "PASSE DE LA LIGUE", de: "LIGA-PASS", es: "PASE DE LA LIGA", ja: "リーグパス" },
  "pass-progress": { en: "Tier {tier} · {n} XP", fr: "Palier {tier} · {n} XP", de: "Stufe {tier} · {n} XP", es: "Nivel {tier} · {n} XP", ja: "ティア {tier} · {n} XP" },
  "pass-tier-unlocked": { en: "Tier {tier} unlocked!", fr: "Palier {tier} débloqué !", de: "Stufe {tier} freigeschaltet!", es: "¡Nivel {tier} desbloqueado!", ja: "ティア {tier} 解放！" },
  "pass-reward": { en: "Tier {tier} reward: {reward}", fr: "Récompense palier {tier} : {reward}", de: "Stufe {tier} Belohnung: {reward}", es: "Recompensa nivel {tier}: {reward}", ja: "ティア {tier} 報酬: {reward}" },
  "pass-aura": { en: "{mon} gains the {aura} Aura!", fr: "{mon} gagne l'Aura {aura} !", de: "{mon} erhält die {aura}-Aura!", es: "¡{mon} obtiene el Aura {aura}!", ja: "{mon} は {aura} のオーラを得た！" },
  "pass-egg": { en: "A Mystery Egg was added!", fr: "Un Œuf Mystère ajouté !", de: "Ein Geheim-Ei hinzugefügt!", es: "¡Se añadió un Huevo Misterioso!", ja: "ふしぎなタマゴを入手！" },
  "pass-full": { en: "Pass complete!", fr: "Passe terminée !", de: "Pass abgeschlossen!", es: "¡Pase completado!", ja: "パスコンプリート！" },
  tier: { en: "Tier", fr: "Palier", de: "Stufe", es: "Nivel", ja: "ティア" },
  // ---- v2.0.0 Elemental Auras ----
  aura: { en: "AURA", fr: "AURA", de: "AURA", es: "AURA", ja: "オーラ" },
  "aura-flame": { en: "Flame", fr: "Flamme", de: "Flamme", es: "Llama", ja: "ほのお" },
  "aura-bolt": { en: "Bolt", fr: "Foudre", de: "Blitz", es: "Rayo", ja: "いかずち" },
  "aura-aurora": { en: "Aurora", fr: "Aurore", de: "Aurora", es: "Aurora", ja: "オーロラ" },
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
'''

anchor = '  "save-import-hint": { en: "Paste a POKEBANNER|v2|... export or load a .json/.txt file", fr: "Collez un export POKEBANNER|v2|... ou chargez un fichier .json/.txt", de: "Füge einen POKEBANNER|v2|...-Export ein oder lade eine .json/.txt-Datei", es: "Pega un export POKEBANNER|v2|... o carga un archivo .json/.txt", ja: "POKEBANNER|v2|... を貼り付けるか、.json/.txtファイルを読み込む" },\n};'
n = s.count(anchor)
assert n == 1, f"dict close anchor: found {n}"
s = s.replace(anchor, anchor.replace("\n};", "") + keys + "};\n")

# Add rank + aura localizers right after localizedLeagueName's closing brace
funcs = r'''
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

/** v2.0.0: localized Elemental Aura names (flame / bolt / aurora). */
export function localizedAuraName(auraId: string, lang: Language): string {
  return t(lang, `aura-${auraId}`);
}

'''
anchor2 = "export function localizedLeagueName(memberId: string, lang: Language): string {"
# find the end of localizedLeagueName (first "}\n" after anchor2)
start = s.index(anchor2)
end = s.index("\n}\n", start) + len("\n}\n")
s = s[:end] + funcs + s[end:]

open(p, "w").write(s)
print("i18n patched:", len(s), "chars")
