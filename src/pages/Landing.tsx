import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BIOMES, GAME_VERSION } from "@/game/constants";
import {
  ambientParticles,
  backdropSvg,
  celestialForPhase,
  groundSvg,
  scenerySvg,
  skyClouds,
  skyColorFor,
  skyGradientSvg,
  urlSpriteCombat,
  urlSpriteShiny,
  urlSpriteWalking,
} from "@/game/presentation";
import { LANGS, LANG_LABELS } from "@/game/i18n";
import { getPreferredLanguage, setPreferredLanguage } from "@/game/storage";
import { DOWNLOAD_URL, RELEASE_CHECK_URL } from "@/lib/release";
import type { Language } from "@/game/types";

const STARTERS = [
  { id: "bulbasaur", label: "GRASS", color: "#3ddc3d", type: "🌱" },
  { id: "charmander", label: "FIRE", color: "#ff8a3d", type: "🔥" },
  { id: "squirtle", label: "WATER", color: "#4fc3f7", type: "💧" },
];

/**
 * Landing-page copy dictionary. Kept local (not in the game i18n dict) so
 * the usage↔dictionary integrity test stays untouched; page copy lives with
 * the page. The picker mirrors the in-game switcher: EN/FR/DE/ES/JP, persisted
 * to LANG_KEY (src/game/storage.ts) so the game starts in that language.
 */
const COPY = {
  play: { en: "PLAY", fr: "JOUER", de: "SPIELEN", es: "JUGAR", ja: "プレイ" },
  navGame: { en: "▶ PLAY", fr: "▶ JOUER", de: "▶ SPIELEN", es: "▶ JUGAR", ja: "▶ プレイ" },
  langTitle: { en: "Language", fr: "Langue", de: "Sprache", es: "Idioma", ja: "言語" },
  eyebrow: {
    en: "A POCKET-MONSTER RPG LIVING IN YOUR TASKBAR",
    fr: "UN RPG DE MONSTRES DE POCHE QUI VIT DANS TA BARRE DES TÂCHES",
    de: "EIN TASCHENMONSTER-RPG, DAS IN DEINER TASKBAR LEBT",
    es: "UN RPG DE MONSTRUOS DE BOLSILLO QUE VIVE EN TU BARRA DE TAREAS",
    ja: "タスクバーの中で暮らすポケットモンスターRPG",
  },
  titleMid: {
    en: "the whole journey in a",
    fr: "tout le voyage dans une",
    de: "die ganze Reise in einem",
    es: "todo el viaje en una",
    ja: "すべての旅を、たったの",
  },
  titleStrip: {
    en: "60px strip",
    fr: "bande de 60 px",
    de: "60-px-Streifen",
    es: "franja de 60 px",
    ja: "60px の帯に",
  },
  subtitle: {
    en: "Pick Bulbasaur, Charmander or Squirtle and set off through Route 1 — a tiny pixel world that auto-battles, captures, evolves and levels up your team while you work. Three biomes, a living day/night sky, gym badges, Team Rocket, chiptune BGM and a full 151-Pokédex, all inside a banner that floats above your desktop.",
    fr: "Choisis Bulbizarre, Salamèche ou Carapuce et pars sur la Route 1 : un mini monde en pixels qui combat, capture, fait évoluer et monte ton équipe en niveau pendant que tu travailles. Trois biomes, un ciel jour/nuit vivant, des badges d'arène, la Team Rocket, une BGM chiptune et un Pokédex complet de 151 espèces, le tout dans une bannière qui flotte au-dessus de ton bureau.",
    de: "Wähle Bisasam, Glumanda oder Schiggy und ziehe durch Route 1 — eine winzige Pixelwelt, die dein Team automatisch kämpfen, fangen, entwickeln und leveln lässt, während du arbeitest. Drei Biome, ein lebendiger Tag/Nacht-Himmel, Orden, Team Rocket, Chiptune-BGM und ein kompletter 151er-Pokédex — alles in einem Banner, das über deinem Desktop schwebt.",
    es: "Elige a Bulbasaur, Charmander o Squirtle y recorre la Ruta 1: un diminuto mundo de píxeles que lucha, captura, evoluciona y sube de nivel a tu equipo mientras trabajas. Tres biomas, un cielo día/noche vivo, medallas de gimnasio, el Team Rocket, música chiptune y una Pokédex completa de 151 especies, todo dentro de un banner que flota sobre tu escritorio.",
    ja: "フシギダネ・ヒトカゲ・ゼニガメから1匹を選んで、1番道路へ出発しよう。働いている間も自動でバトルし、捕まえ、進化し、レベルアップする小さなピクセル世界。3つのバイオーム、生きている昼と夜の空、ジムバッジ、ロケット団、チップチューンBGM、そして151匹のポケモン図鑑。すべてがデスクトップの上に浮かぶバナーの中で動いている。",
  },
  start: {
    en: "▶ START ADVENTURE",
    fr: "▶ COMMENCER L'AVENTURE",
    de: "▶ ABENTEUER STARTEN",
    es: "▶ COMENZAR AVENTURA",
    ja: "▶ 冒険をはじめる",
  },
  pick: {
    en: "PICK A STARTER",
    fr: "CHOISIR SON DÉPART",
    de: "STARTER WÄHLEN",
    es: "ELEGIR INICIAL",
    ja: "最初のポケモンを選ぶ",
  },
  stats: {
    en: ["Kanto species", "Gym badges", "Biomes + day/night", "Languages"],
    fr: ["Espèces de Kanto", "Badges d'arène", "Biomes + jour/nuit", "Langues"],
    de: ["Kanto-Arten", "Orden", "Biome + Tag/Nacht", "Sprachen"],
    es: ["Especies de Kanto", "Medallas", "Biomas + día/noche", "Idiomas"],
    ja: ["カントーのポケモン", "ジムバッジ", "バイオーム＋昼夜", "言語"],
  },
  starterTitle: {
    en: "Choose your starter",
    fr: "Choisis ton starter",
    de: "Wähle deinen Starter",
    es: "Elige tu inicial",
    ja: "最初のポケモンを選ぼう",
  },
  starterSub: {
    en: "Each starter evolves at Lv.16 into its Kanto form — Ivysaur, Charmeleon or Wartortle.",
    fr: "Chaque starter évolue au N.16 en sa forme de Kanto : Herbizarre, Reptincel ou Carabaffe.",
    de: "Jeder Starter entwickelt sich auf Lv.16 in seine Kanto-Form — Bisaknosp, Glutexo oder Schillok.",
    es: "Cada inicial evoluciona en el Nv.16 a su forma de Kanto: Ivysaur, Charmeleon o Wartortle.",
    ja: "どの最初のポケモンも Lv.16 でカントーの姿（フシギソウ・リザード・カメール）に進化する。",
  },
  features: {
    en: [
      ["⚔", "AUTO-BATTLE · 4 MOVES", "Wild Kanto encounters arrive at a random 5–20s rhythm. Your starter picks from 4 classic moves with the full type chart, crits, min-damage rolls, sleep and leech seed."],
      ["🎣", "CAPTURE · TEAM OF 6", "Real catch math with wobble animation, Great Balls, a 6-member team with Exp Share, and a PC full of caught Pokémon."],
      ["🏆", "GYMS · ROCKET · SHOP", "Badge battles vs Brock, Misty and Lt. Surge (+5% team damage each). A traveling merchant every 10 victories, Team Rocket ambushes and shiny sparks (1/100)."],
      ["🌍", "BIOMES · DAY & NIGHT", "Route 1, Viridian Forest and The Cave rotate every 500 steps. A 5-minute day/night cycle paints the sky — sun, sunset and moon — with night-only spawns like Zubat."],
      ["🎵", "CHIPTUNE SOUND", "Biome-specific BGM that darkens into a night theme, plus SFX for hits, captures, level-ups and evolutions. M mutes, N toggles music, tray buttons tweak volume."],
      ["💾", "SAVE · DESKTOP READY", "Autosaves to localStorage with export/import. The 60px strip floats above the Windows taskbar, with tray pause/volume controls."],
    ],
    fr: [
      ["⚔", "AUTO-COMBAT · 4 ATTAQUES", "Des rencontres sauvages de Kanto arrivent à un rythme aléatoire de 5–20 s. Ton starter choisit parmi 4 attaques classiques avec la table des types, les crits, les dégâts minimum, le sommeil et le vampirisme."],
      ["🎣", "CAPTURE · ÉQUIPE DE 6", "De vrais calculs de capture avec animation de la ball, des Super Balls, une équipe de 6 avec Multi Exp, et un PC plein de Pokémon capturés."],
      ["🏆", "ARÈNES · ROCKET · BOUTIQUE", "Combats de badges contre Pierre, Ondine et Major Bob (+5% de dégâts d'équipe chacun). Un marchand ambulant toutes les 10 victoires, des embuscades de la Team Rocket et des chromatiques (1/100)."],
      ["🌍", "BIOMES · JOUR & NUIT", "La Route 1, la Forêt de Jade et la Cave alternent toutes les 500 pas. Un cycle jour/nuit de 5 minutes peint le ciel — soleil, coucher et lune — avec des apparitions nocturnes comme Nosferapti."],
      ["🎵", "SON CHIPTUNE", "Une BGM par biome qui s'assombrit en thème nocturne, plus des SFX pour les coups, les captures, les montées de niveau et les évolutions. M coupe le son, N bascule la musique, les boutons du tray règlent le volume."],
      ["💾", "SAUVEGARDE · PRÊT POUR LE BUREAU", "Sauvegarde automatique dans localStorage avec export/import. La bande de 60 px flotte au-dessus de la barre des tâches Windows, avec pause et volume depuis le tray."],
    ],
    de: [
      ["⚔", "AUTO-KAMPF · 4 ATTACKEN", "Wilde Kanto-Begegnungen erscheinen in einem zufälligen 5–20-Sekunden-Rhythmus. Dein Starter wählt aus 4 klassischen Attacken mit kompletter Typentabelle, Krit-Treffern, Mindestschaden, Schlaf und Egelsamen."],
      ["🎣", "FANG · TEAM AUS 6", "Echte Fang-Mechanik mit Wackel-Animation, Superbällen, einem 6er-Team mit EP-Teiler und einem PC voller gefangener Pokémon."],
      ["🏆", "ARENEN · ROCKET · LADEN", "Orden-Kämpfe gegen Rocko, Misty und Major Bob (+5% Team-Schaden). Alle 10 Siege ein Wanderhändler, Team-Rocket-Hinterhalte und Schillernde (1/100)."],
      ["🌍", "BIOME · TAG & NACHT", "Route 1, Vertania-Wald und die Höhle wechseln alle 500 Schritte. Ein 5-Minuten-Tag/Nacht-Zyklus färbt den Himmel — Sonne, Sonnenuntergang und Mond — mit nächtlichen Erscheinungen wie Zubat."],
      ["🎵", "CHIPTUNE-SOUND", "Biom-spezifische BGM, die zu einem Nacht-Theme abdunkelt, plus SFX für Treffer, Fänge, Level-Ups und Entwicklungen. M stummt, N schaltet Musik um, Tray-Buttons regeln die Lautstärke."],
      ["💾", "SPEICHER · DESKTOP-BEREIT", "Autosave in localStorage mit Export/Import. Der 60-px-Streifen schwebt über der Windows-Taskleiste, mit Pause/Lautstärke im Tray."],
    ],
    es: [
      ["⚔", "AUTO-COMBATE · 4 MOVIMIENTOS", "Los encuentros salvajes de Kanto llegan en un ritmo aleatorio de 5–20 s. Tu inicial elige entre 4 movimientos clásicos con la tabla de tipos completa, críticos, daño mínimo, sueño y drenadoras."],
      ["🎣", "CAPTURA · EQUIPO DE 6", "Cálculo de captura real con animación de la ball, Super Balls, un equipo de 6 con Reparto Exp y un PC lleno de Pokémon capturados."],
      ["🏆", "GIMNASIOS · ROCKET · TIENDA", "Combates de medallas contra Brock, Misty y Lt. Surge (+5% de daño de equipo cada uno). Un mercader ambulante cada 10 victorias, emboscadas del Team Rocket y variocolores (1/100)."],
      ["🌍", "BIOMAS · DÍA Y NOCHE", "La Ruta 1, el Bosque Verde y la Cueva rotan cada 500 pasos. Un ciclo día/noche de 5 minutos pinta el cielo — sol, atardecer y luna — con apariciones nocturnas como Zubat."],
      ["🎵", "SONIDO CHIPTUNE", "BGM específica por bioma que se oscurece en tema nocturno, más SFX para golpes, capturas, subidas de nivel y evoluciones. M silencia, N alterna la música, los botones del tray ajustan el volumen."],
      ["💾", "GUARDADO · LISTO PARA EL ESCRITORIO", "Autoguardado en localStorage con exportar/importar. La franja de 60 px flota sobre la barra de tareas de Windows, con pausa y volumen desde el tray."],
    ],
    ja: [
      ["⚔", "オートバトル・4つのわざ", "野生のカントーのポケモンが5〜20秒のランダムな間隔で現れる。最初のポケモンはタイプ相性・急所・最低ダメージ・ねむり・やどりぎを備えた4つのクラシックなわざを使いこなす。"],
      ["🎣", "捕まえる・6匹のチーム", "揺れアニメーション付きの本格捕獲計算、スーパーボール、がくしゅうそうち付きの6匹チーム、そして捕まえたポケモンでいっぱいのパソコン。"],
      ["🏆", "ジム・ロケット団・ショップ", "タケシ・カスミ・マチスとのバッジバトル（それぞれチームのダメージ+5%）。10勝ごとに現れる行商人、ロケット団の奇襲、そして色違い（1/100）。"],
      ["🌍", "バイオーム・昼と夜", "1番道路・トキワの森・洞窟が500歩ごとに移り変わる。5分の昼夜サイクルが空を染める — 太陽、夕焼け、月 — 夜限定でズバットなども出現。"],
      ["🎵", "チップチューンサウンド", "バイオームごとのBGMが夜のテーマに変化。ヒット・捕獲・レベルアップ・進化の効果音付き。Mでミュート、Nで音楽切り替え、トレイボタンで音量調整。"],
      ["💾", "セーブ・デスクトップ対応", "localStorageに自動セーブ、エクスポート/インポート対応。60pxの帯はWindowsタスクバーの上に浮かび、トレイで一時停止・音量調整ができる。"],
    ],
  },
  how: {
    en: [
      ["PICK A STARTER", "Bulbasaur, Charmander or Squirtle starts your team."],
      ["WALK & BATTLE", "Wild Pokémon appear every 5–20s — the battle runs itself."],
      ["CATCH & GROW", "Weaken foes, throw balls, level up, evolve, earn badges."],
      ["CONQUER", "Fill the 151-Pokédex, beat Team Rocket, hatch the secret."],
    ],
    fr: [
      ["CHOISIR SON DÉPART", "Bulbizarre, Salamèche ou Carapuce lance ton équipe."],
      ["MARCHER & COMBATTRE", "Des Pokémon sauvages apparaissent toutes les 5–20 s — le combat se déroule seul."],
      ["CAPTURER & GRANDIR", "Affaiblis tes rivaux, lance des balls, monte de niveau, évolue, gagne des badges."],
      ["CONQUÉRIR", "Remplis le Pokédex de 151, bats la Team Rocket, fais éclore le secret."],
    ],
    de: [
      ["STARTER WÄHLEN", "Bisasam, Glumanda oder Schiggy startet dein Team."],
      ["LAUFEN & KÄMPFEN", "Wilde Pokémon erscheinen alle 5–20 s — der Kampf läuft von selbst."],
      ["FANGEN & WACHSEN", "Schwäche Gegner, wirf Bälle, steige auf, entwickle dich, verdiene Orden."],
      ["EROBERN", "Fülle den 151er-Pokédex, besiege Team Rocket, brüte das Geheimnis aus."],
    ],
    es: [
      ["ELEGIR INICIAL", "Bulbasaur, Charmander o Squirtle inicia tu equipo."],
      ["CAMINAR Y LUCHAR", "Los Pokémon salvajes aparecen cada 5–20 s: el combate se desarrolla solo."],
      ["CAPTURAR Y CRECER", "Debilita rivales, lanza balls, sube de nivel, evoluciona, gana medallas."],
      ["CONQUISTAR", "Completa la Pokédex de 151, vence al Team Rocket, eclosiona el secreto."],
    ],
    ja: [
      ["最初のポケモンを選ぶ", "フシギダネ・ヒトカゲ・ゼニガメでチームを始める。"],
      ["歩いてバトル", "野生のポケモンが5〜20秒ごとに出現 — バトルは自動で進む。"],
      ["捕まえて育てる", "相手を弱らせ、ボールを投げ、レベルアップ、進化、バッジ獲得。"],
      ["征服する", "151匹の図鑑を完成させ、ロケット団を倒し、秘密のタマゴを孵す。"],
    ],
  },
  downloadEyebrow: {
    en: "RUNS ON YOUR WINDOWS TASKBAR · FREE FOREVER",
    fr: "FONCTIONNE SUR TA BARRE DES TÂCHES · GRATUIT POUR TOUJOURS",
    de: "LÄUFT IN DEINER WINDOWS-TASKLEISTE · FÜR IMMER KOSTENLOS",
    es: "FUNCIONA EN TU BARRA DE TAREAS · GRATIS PARA SIEMPRE",
    ja: "Windowsタスクバーで動作・ずっと無料",
  },
  downloadTitle: {
    en: "Take Pokebanner to the desktop",
    fr: "Emporte Pokebanner sur ton bureau",
    de: "Bring Pokebanner auf den Desktop",
    es: "Lleva Pokebanner al escritorio",
    ja: "Pokebanner をデスクトップへ",
  },
  downloadSub: {
    en: "One 60px strip that docks above the taskbar, keeps battling, catching and evolving while you work. Drag it anywhere on the screen — position, saves and settings survive restarts.",
    fr: "Une bande de 60 px qui se place au-dessus de la barre des tâches et continue de combattre, capturer et évoluer pendant que tu travailles. Déplace-la où tu veux — position, sauvegardes et réglages survivent aux redémarrages.",
    de: "Ein 60-px-Streifen, der über der Taskleiste andockt und weiterkämpft, fängt und evolviert, während du arbeitest. Zieh ihn überall hin — Position, Speicherstände und Einstellungen überleben Neustarts.",
    es: "Una franja de 60 px que se acopla sobre la barra de tareas y sigue luchando, capturando y evolucionando mientras trabajas. Arrástrala a cualquier parte: posición, guardados y ajustes sobreviven a los reinicios.",
    ja: "タスクバーの上にドッキングする60pxの帯。仕事をしながらも戦い、捕まえ、進化し続ける。画面上のどこへでもドラッグ可能 — 位置・セーブ・設定は再起動しても残る。",
  },
  downloadChips: {
    en: ["Windows 10 / 11", "Installer + portable", `v${GAME_VERSION}`],
    fr: ["Windows 10 / 11", "Installateur + portable", `v${GAME_VERSION}`],
    de: ["Windows 10 / 11", "Installateur + portabel", `v${GAME_VERSION}`],
    es: ["Windows 10 / 11", "Instalador + portátil", `v${GAME_VERSION}`],
    ja: ["Windows 10 / 11", "インストーラー＋ポータブル", `v${GAME_VERSION}`],
  },
  downloadBtn: {
    en: "⬇ GET IT ON GITHUB",
    fr: "⬇ TÉLÉCHARGER SUR GITHUB",
    de: "⬇ AUF GITHUB HOLEN",
    es: "⬇ DESCARGAR EN GITHUB",
    ja: "⬇ GITHUB で入手",
  },
  downloadSoon: {
    en: "⬇ RELEASE COMING SOON",
    fr: "⬇ SORTIE BIENTÔT",
    de: "⬇ RELEASE DEMNÄCHST",
    es: "⬇ PRONTO DISPONIBLE",
    ja: "⬇ 近日公開",
  },
  browserBtn: {
    en: "▶ PLAY IN BROWSER",
    fr: "▶ JOUER DANS LE NAVIGATEUR",
    de: "▶ IM BROWSER SPIELEN",
    es: "▶ JUGAR EN EL NAVEGADOR",
    ja: "▶ ブラウザで遊ぶ",
  },
  ctaTitle: {
    en: "Ready to catch 'em all?",
    fr: "Prêt à tous les attraper ?",
    de: "Bereit, sie alle zu fangen?",
    es: "¿Listo para atraparlos a todos?",
    ja: "全部捕まえる準備はできた？",
  },
  ctaBtn: {
    en: "FREE TO PLAY →",
    fr: "GRATUIT À JOUER →",
    de: "KOSTENLOS SPIELEN →",
    es: "GRATIS PARA JUGAR →",
    ja: "無料で遊ぶ →",
  },
  ctaFooter: {
    en: "Day/night cycle · 3 biomes · chiptune BGM · team of 6 · gym badges · 5 languages · leaderboard · friends & trades · anti-cheat · save export/import",
    fr: "Cycle jour/nuit · 3 biomes · BGM chiptune · équipe de 6 · badges d'arène · 5 langues · classement · amis & échanges · anti-triche · export/import de sauvegarde",
    de: "Tag/Nacht-Zyklus · 3 Biome · Chiptune-BGM · 6er-Team · Orden · 5 Sprachen · Bestenliste · Freunde & Tausch · Anti-Cheat · Export/Import",
    es: "Ciclo día/noche · 3 biomas · BGM chiptune · equipo de 6 · medallas · 5 idiomas · clasificación · amigos e intercambios · anti-trampas · exportar/importar",
    ja: "昼夜サイクル · 3つのバイオーム · チップチューンBGM · 6匹チーム · ジムバッジ · 5言語 · ランキング · フレンド＆交換 · アンチチート · セーブのエクスポート/インポート",
  },
  footer: {
    en: `POKEBANNER v${GAME_VERSION} — an unofficial fan game. Pokémon © Nintendo / Game Freak. Not affiliated with the Pokémon Company. Sprites via Pokémon Showdown.`,
    fr: `POKEBANNER v${GAME_VERSION} — un jeu de fans non officiel. Pokémon © Nintendo / Game Freak. Non affilié à la Pokémon Company. Sprites via Pokémon Showdown.`,
    de: `POKEBANNER v${GAME_VERSION} — ein inoffizielles Fan-Spiel. Pokémon © Nintendo / Game Freak. Nicht mit der Pokémon Company verbunden. Sprites via Pokémon Showdown.`,
    es: `POKEBANNER v${GAME_VERSION} — un juego de fans no oficial. Pokémon © Nintendo / Game Freak. No afiliado a The Pokémon Company. Sprites vía Pokémon Showdown.`,
    ja: `POKEBANNER v${GAME_VERSION} — 非公式ファンゲーム。ポケモン © Nintendo / Game Freak。The Pokémon Company とは無関係。スプライトは Pokémon Showdown 提供。`,
  },
  hofTitle: {
    en: "Hall of Fame — top 10 trainers",
    fr: "Temple de la Renommée — top 10 des dresseurs",
    de: "Ruhmeshalle — Top 10 Trainer",
    es: "Salón de la Fama — top 10 entrenadores",
    ja: "殿堂入り — トップ10トレーナー",
  },
  hofTag: {
    en: "Live from the shared POKEBANNER leaderboard: composite score (badges, dex, team levels, wins, earnings). Browse player profiles and their teams without launching the game.",
    fr: "En direct du classement POKEBANNER partagé : score composite (badges, dex, niveaux d'équipe, victoires, gains). Parcours les profils et leurs équipes sans lancer le jeu.",
    de: "Live von der geteilten POKEBANNER-Bestenliste: Gesamtscore (Orden, Dex, Team-Level, Siege, Einnahmen). Durchstöbere Profile und Teams, ohne das Spiel zu starten.",
    es: "En vivo desde la clasificación compartida de POKEBANNER: puntuación compuesta (medallas, dex, niveles, victorias, ganancias). Explora perfiles y equipos sin abrir el juego.",
    ja: "共有POKEBANNERランキングからライブ配信：総合スコア（バッジ・図鑑・チームレベル・勝利数・収入）。ゲームを起動せずにプレイヤーのプロフィールとチームを見られる。",
  },
  hofLoading: {
    en: "Loading the Hall of Fame…",
    fr: "Chargement du Temple de la Renommée…",
    de: "Lade Ruhmeshalle…",
    es: "Cargando el Salón de la Fama…",
    ja: "殿堂入りを読み込み中…",
  },
  hofEmpty: {
    en: "No challengers yet — play the game, hit RANK, and claim the crown!",
    fr: "Aucun challenger pour l'instant — joue, touche RANG et réclame la couronne !",
    de: "Noch keine Herausforderer — spiele, drücke RANG und hol dir die Krone!",
    es: "Aún no hay retadores: ¡juega, toca RANK y reclama la corona!",
    ja: "まだ挑戦者はいない — ゲームをプレイしてRANKを押し、王座を手に入れよう！",
  },
  hofAntiCheat: {
    en: "Anti-cheat: the server validates every submission — impossible saves are rejected.",
    fr: "Anti-triche : le serveur valide chaque envoi — les sauvegardes impossibles sont rejetées.",
    de: "Anti-Cheat: Der Server validiert jede Einreichung — unmögliche Speicherstände werden abgelehnt.",
    es: "Anti-trampas: el servidor valida cada envío: las partidas imposibles se rechazan.",
    ja: "アンチチート：サーバーがすべての送信を検証 — 不可能なセーブは拒否される。",
  },
  mktTitle: {
    en: "Live marketplace",
    fr: "Marché en direct",
    de: "Live-Marktplatz",
    es: "Mercado en vivo",
    ja: "ライブマーケット",
  },
  mktTag: {
    en: "Real player-to-player listings from the shared board — browse what trainers are selling right now, then trade your own catches in-game.",
    fr: "De vraies annonces de joueur à joueur depuis le tableau partagé — regarde ce que les dresseurs vendent en ce moment, puis échange tes propres captures en jeu.",
    de: "Echte Spieler-zu-Spieler-Angebote vom geteilten Board — schau, was Trainer gerade verkaufen, und handle deine eigenen Fänge im Spiel.",
    es: "Listados reales entre jugadores del tablero compartido: mira qué venden los entrenadores ahora y luego comercia tus propias capturas en el juego.",
    ja: "共有ボードからの実際のプレイヤー間リスト — トレーナーが今売っているものを見て、ゲーム内で自分の捕獲物を取引しよう。",
  },
  mktLoading: {
    en: "Loading listings…",
    fr: "Chargement des annonces…",
    de: "Lade Angebote…",
    es: "Cargando listados…",
    ja: "リストを読み込み中…",
  },
  mktEmpty: {
    en: "Nothing listed yet — be the first to sell a Pokémon in-game!",
    fr: "Rien en vente pour l'instant — sois le premier à vendre un Pokémon en jeu !",
    de: "Noch nichts eingestellt — sei der Erste, der ein Pokémon im Spiel verkauft!",
    es: "Aún no hay listados: ¡sé el primero en vender un Pokémon en el juego!",
    ja: "まだ何も出品されていない — ゲーム内で最初のポケモンを売ってみよう！",
  },
};

/** Player-feedback section copy, keyed by kind for labels/placeholders. */
const FB: {
  title: Record<Language, string>;
  sub: Record<Language, string>;
  kind: Record<FeedbackKind, Record<Language, string>>;
  hint: Record<FeedbackKind, Record<Language, string>>;
  placeholder: Record<FeedbackKind, Record<Language, string>>;
  author: Record<Language, string>;
  rating: Record<Language, string>;
  latest: Record<Language, string>;
  fromPlayers: Record<Language, string>;
  send: Record<Language, string>;
  sending: Record<Language, string>;
  done: Record<Language, string>;
  error: Record<Language, string>;
  loading: Record<Language, string>;
  empty: Record<Language, string>;
} = {
  title: {
    en: "▚ Player Feedback ▞",
    fr: "▚ Avis des joueurs ▞",
    de: "▚ Spieler-Feedback ▞",
    es: "▚ Comentarios ▞",
    ja: "▚ プレイヤーの声 ▞",
  },
  sub: {
    en: "Leave a review, report a bug, or suggest what to build next. Your feedback is stored on the shared POKEBANNER database for everyone to see.",
    fr: "Laisse un avis, signale un bug ou propose la suite. Ton avis est stocké sur la base POKEBANNER partagée, visible par tous.",
    de: "Hinterlasse eine Bewertung, melde einen Bug oder schlage vor, was als Nächstes kommt. Dein Feedback wird in der geteilten POKEBANNER-Datenbank gespeichert.",
    es: "Deja una opinión, reporta un error o sugiere qué construir después. Tu comentario se guarda en la base compartida de POKEBANNER para que todos lo vean.",
    ja: "レビューを書く、バグを報告する、次の機能を提案する。あなたのフィードバックは共有のPOKEBANNERデータベースに保存され、誰でも見られます。",
  },
  kind: {
    review: { en: "REVIEW", fr: "AVIS", de: "BEWERTUNG", es: "OPINIÓN", ja: "レビュー" },
    bug: { en: "BUG", fr: "BUG", de: "BUG", es: "ERROR", ja: "バグ" },
    idea: { en: "IDEA", fr: "IDÉE", de: "IDEE", es: "IDEA", ja: "アイデア" },
  },
  hint: {
    review: {
      en: "Tell other players what you think — add stars!",
      fr: "Dis aux autres joueurs ce que tu en penses — ajoute des étoiles !",
      de: "Sag anderen Spielern deine Meinung — mit Sternen!",
      es: "¡Cuéntales a otros jugadores qué piensas, con estrellas!",
      ja: "星を付けて、他のプレイヤーに感想を伝えよう！",
    },
    bug: {
      en: "Something broken? Describe what happened.",
      fr: "Un problème ? Décris ce qui s'est passé.",
      de: "Etwas kaputt? Beschreibe, was passiert ist.",
      es: "¿Algo roto? Describe qué pasó.",
      ja: "何か壊れている？ 何が起きたか書いてね。",
    },
    idea: {
      en: "Suggest the next feature for POKEBANNER.",
      fr: "Propose la prochaine fonctionnalité de POKEBANNER.",
      de: "Schlage die nächste Funktion für POKEBANNER vor.",
      es: "Sugiere la próxima función de POKEBANNER.",
      ja: "POKEBANNERの次の機能を提案しよう。",
    },
  },
  placeholder: {
    review: {
      en: "What do you think of POKEBANNER?",
      fr: "Que penses-tu de POKEBANNER ?",
      de: "Was denkst du über POKEBANNER?",
      es: "¿Qué opinas de POKEBANNER?",
      ja: "POKEBANNERについてどう思う？",
    },
    bug: {
      en: "What happened? (e.g. capture ate my ball but the Pokémon stayed)",
      fr: "Que s'est-il passé ? (ex. la capture a mangé ma ball mais le Pokémon est resté)",
      de: "Was ist passiert? (z. B. der Fang hat meinen Ball gefressen, aber das Pokémon blieb)",
      es: "¿Qué pasó? (p. ej. la captura se comió mi ball pero el Pokémon se quedó)",
      ja: "何が起きた？（例：捕獲でボールは消費されたのにポケモンは残った）",
    },
    idea: {
      en: "What should we add next?",
      fr: "Qu'ajouter ensuite ?",
      de: "Was sollen wir als Nächstes hinzufügen?",
      es: "¿Qué deberíamos añadir después?",
      ja: "次に何を追加すべき？",
    },
  },
  author: {
    en: "NAME (OPTIONAL)",
    fr: "NOM (FACULTATIF)",
    de: "NAME (OPTIONAL)",
    es: "NOMBRE (OPCIONAL)",
    ja: "名前（任意）",
  },
  rating: {
    en: "Your rating",
    fr: "Ta note",
    de: "Deine Bewertung",
    es: "Tu valoración",
    ja: "あなたの評価",
  },
  latest: {
    en: "Latest feedback",
    fr: "Derniers avis",
    de: "Neueste Beiträge",
    es: "Últimos comentarios",
    ja: "最新のフィードバック",
  },
  fromPlayers: {
    en: "from players",
    fr: "des joueurs",
    de: "von Spielern",
    es: "de jugadores",
    ja: "プレイヤーから",
  },
  send: {
    en: "▶ SUBMIT FEEDBACK",
    fr: "▶ ENVOYER L'AVIS",
    de: "▶ FEEDBACK SENDEN",
    es: "▶ ENVIAR OPINIÓN",
    ja: "▶ フィードバックを送信",
  },
  sending: {
    en: "SENDING…",
    fr: "ENVOI…",
    de: "SENDE…",
    es: "ENVIANDO…",
    ja: "送信中…",
  },
  done: {
    en: "★ Thanks! Your feedback is live.",
    fr: "★ Merci ! Ton avis est en ligne.",
    de: "★ Danke! Dein Feedback ist live.",
    es: "★ ¡Gracias! Tu opinión está en línea.",
    ja: "★ ありがとう！ フィードバックが公開されました。",
  },
  error: {
    en: "Couldn't send feedback — try again.",
    fr: "Impossible d'envoyer — réessaie.",
    de: "Feedback konnte nicht gesendet werden — versuch es erneut.",
    es: "No se pudo enviar — inténtalo de nuevo.",
    ja: "送信できませんでした — もう一度お試しください。",
  },
  loading: {
    en: "Loading feedback…",
    fr: "Chargement des avis…",
    de: "Lade Feedback…",
    es: "Cargando comentarios…",
    ja: "フィードバックを読み込み中…",
  },
  empty: {
    en: "Be the first to leave a review, report a bug, or drop an idea!",
    fr: "Sois le premier à laisser un avis, signaler un bug ou proposer une idée !",
    de: "Sei der Erste, der eine Bewertung hinterlässt, einen Bug meldet oder eine Idee einwirft!",
    es: "¡Sé el primero en dejar una opinión, reportar un error o proponer una idea!",
    ja: "最初のレビュー・バグ報告・アイデアをどうぞ！",
  },
};

/**
 * True only while the release API confirms the release is public. Fetches
 * once on mount; falls back to false ("coming soon") on any failure so a
 * dead or private release never renders a broken download link.
 */
function useReleaseLive(): boolean {
  const [live, setLive] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!DOWNLOAD_URL || DOWNLOAD_URL.includes("yourname")) return;
    fetch(RELEASE_CHECK_URL, { headers: { Accept: "application/vnd.github+json" } })
      .then((res) => {
        if (!cancelled) setLive(res.ok);
      })
      .catch(() => {
        if (!cancelled) setLive(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return live;
}

type FeedbackKind = "review" | "bug" | "idea";

const KIND_META: Record<
  FeedbackKind,
  { label: string; chip: string; hint: string }
> = {
  review: { label: "REVIEW", chip: "bg-yellow-300", hint: "Tell other players what you think — add stars!" },
  bug: { label: "BUG", chip: "bg-red-400", hint: "Something broken? Describe what happened." },
  idea: { label: "IDEA", chip: "bg-blue-300", hint: "Suggest the next feature for POKEBANNER." },
};

/** Living 60px banner mock — reuses the game's own pixel scenery + sprites. */
function MockBanner() {
  const biome = BIOMES[0]; // Route 1 / Plains
  const sun = celestialForPhase("day");
  return (
    <div
      className="relative h-[60px] w-full overflow-hidden border-4 border-ink"
      style={{ backgroundColor: skyColorFor("day") }}
    >
      {/* sky: non-repeating gradient + individual drifting clouds */}
      <div
        className="sky-gradient absolute inset-x-0 top-0 h-[28px]"
        style={{ backgroundImage: `url("${skyGradientSvg("day")}")` }}
      />
      {skyClouds(20260701, "day").map((c) => (
        <div
          key={c.key}
          className="sky-cloud pointer-events-none z-[1]"
          style={{
            top: c.topPx,
            width: c.size,
            height: c.size,
            backgroundImage: `url("${c.uri}")`,
            animationDuration: `${c.durSec}s`,
            animationDelay: `-${c.delaySec}s`,
          }}
        />
      ))}
      {/* sun */}
      {sun.map((c, i) => (
        <div
          key={`sun-${i}`}
          className="celestial-pulse pointer-events-none absolute z-[1]"
          style={{
            left: `${c.leftPct}%`,
            top: c.topPx,
            width: c.size,
            height: c.size,
            backgroundImage: `url("${c.uri}")`,
            backgroundSize: `${c.size}px ${c.size}px`,
          }}
        />
      ))}
      {/* ambient pollen motes drifting through the mock sky */}
      {ambientParticles(biome.id, 20260701, "day").map((p, i) => (
        <span
          key={`amb-${i}`}
          className={`ambient-${p.kind} pointer-events-none absolute z-[2]`}
          style={
            {
              left: `${p.leftPct}%`,
              top: p.topPx,
              width: p.sizePx,
              height: p.sizePx,
              backgroundColor: p.color,
              animationDuration: `${p.durSec}s`,
              animationDelay: `${p.delaySec}s`,
              "--sway": `${p.swayPx}px`,
            } as React.CSSProperties
          }
        />
      ))}
      {/* parallax scenery */}
      <div className="absolute inset-x-0 bottom-0 h-[24px]">
        <div
          className="scenery-scroll-far absolute inset-x-0 h-[16px]"
          style={{ backgroundImage: `url("${backdropSvg(biome)}")`, bottom: 8 }}
        />
        <div
          className="scenery-scroll absolute inset-x-0 h-[12px]"
          style={{ backgroundImage: `url("${scenerySvg(biome)}")`, bottom: 8 }}
        />
        <div
          className="ground-scroll absolute inset-x-0 bottom-0 h-[8px]"
          style={{ backgroundImage: `url("${groundSvg(biome)}")` }}
        />
      </div>
      {/* walking leader + wild opponent (both are animated GIFs) */}
      <img
        src={urlSpriteWalking("bulbasaur")}
        alt=""
        className="absolute bottom-1 left-6 z-10 h-10 w-10 pixelated"
      />
      <img
        src={urlSpriteWalking("pidgey")}
        alt=""
        className="absolute bottom-1 right-6 z-10 h-10 w-10 pixelated"
        style={{ transform: "scaleX(-1)" }}
      />
      {/* banner buttons */}
      <div className="absolute right-1 top-1 z-30 flex gap-1">
        <span className="nb-btn !px-1.5 !py-0.5 !text-[6px] bg-yellow-300">BAG</span>
        <span className="nb-btn !px-1.5 !py-0.5 !text-[6px] bg-blue-300">MENU</span>
      </div>
    </div>
  );
}

function FeedbackStars({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (n: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={`text-xs leading-none ${readonly ? "" : "cursor-pointer"} ${
            n <= value ? "text-ink" : "text-ink/20"
          }`}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function FeedbackSection({ lang }: { lang: Language }) {
  const submitFeedback = useMutation(api.feedback.submitFeedback);
  const recent = useQuery(api.feedback.listFeedback, { limit: 8 });

  const [kind, setKind] = useState<FeedbackKind>("review");
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      await submitFeedback({
        kind,
        text,
        author: author.trim() || undefined,
        rating: kind === "review" ? rating : undefined,
      });
      setStatus("done");
      setText("");
      setAuthor("");
      window.setTimeout(() => setStatus("idle"), 2600);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Couldn't send feedback — try again.");
    }
  };

  return (
    <section className="border-b-4 border-ink bg-[#fff8e1] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-sm uppercase">{FB.title[lang]}</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-[8px] leading-3 text-ink/70">
          {FB.sub[lang]}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* form */}
          <form onSubmit={onSubmit} className="nb-panel flex flex-col gap-3 p-3">
            {/* kind selector */}
            <div className="flex gap-1">
              {(Object.keys(KIND_META) as FeedbackKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`nb-btn flex-1 !px-1 !py-1.5 !text-[7px] ${
                    kind === k ? "translate-x-[2px] translate-y-[2px] shadow-none" : KIND_META[k].chip
                  }`}
                >
                  {FB.kind[k][lang]}
                </button>
              ))}
            </div>
            <p className="text-[6px] leading-3 text-ink/60">{FB.hint[kind][lang]}</p>

            {kind === "review" && (
              <div className="flex items-center justify-between border-2 border-ink bg-white px-2 py-1.5">
                <span className="text-[7px] uppercase text-ink/70">{FB.rating[lang]}</span>
                <FeedbackStars value={rating} onChange={setRating} />
              </div>
            )}

            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder={FB.author[lang]}
              maxLength={40}
              className="border-2 border-ink bg-white px-2 py-1.5 text-[7px] placeholder:text-ink/40 focus:outline-none"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={FB.placeholder[kind][lang]}
              maxLength={2000}
              rows={3}
              className="border-2 border-ink bg-white px-2 py-1.5 text-[7px] leading-3 placeholder:text-ink/40 focus:outline-none"
            />
            {error && <p className="text-[6px] text-red-600">⚠ {error}</p>}
            {status === "done" && (
              <p className="text-[7px] font-bold text-green-700">{FB.done[lang]}</p>
            )}
            <button
              type="submit"
              disabled={!text.trim() || status === "sending"}
              className="nb-btn w-full !py-2 !text-[9px] bg-green-300"
            >
              {status === "sending" ? FB.sending[lang] : FB.send[lang]}
            </button>
          </form>

          {/* recent feedback */}
          <div className="nb-panel flex flex-col gap-2 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold uppercase">{FB.latest[lang]}</span>
              <span className="text-[6px] text-ink/50">{FB.fromPlayers[lang]}</span>
            </div>
            {recent === undefined ? (
              <p className="text-[7px] text-ink/50">{FB.loading[lang]}</p>
            ) : recent.length === 0 ? (
              <p className="text-[7px] text-ink/50">{FB.empty[lang]}</p>
            ) : (
              <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
                {recent.map((f) => (
                  <div key={f._id} className="border-2 border-ink bg-white p-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-1 py-0.5 text-[6px] font-bold uppercase ${KIND_META[f.kind].chip}`}>
                        {FB.kind[f.kind][lang]}
                      </span>
                      <span className="text-[6px] text-ink/50">
                        {f.author || "Anonymous"} ·{" "}
                        {new Date(f.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {f.kind === "review" && f.rating != null && (
                      <div className="mt-1">
                        <FeedbackStars value={f.rating} readonly />
                      </div>
                    )}
                    <p className="mt-1 break-words text-[7px] leading-3 text-ink/90">{f.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Hall of Fame — the top 10 trainers live from the shared leaderboard, with
// their team sprites. Shown on the home page so visitors can browse player
// profiles without launching the game.
// ---------------------------------------------------------------------------

function HallOfFame({ lang }: { lang: Language }) {
  const top = useQuery(api.social.topPlayers, { limit: 10 });
  return (
    <section className="border-b-4 border-ink bg-[#eef2ff] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-white text-base">
            🏆
          </span>
          <h2 className="text-sm uppercase">{COPY.hofTitle[lang]}</h2>
        </div>
        <p className="mt-2 max-w-xl text-[8px] leading-3 text-ink/70">
          {COPY.hofTag[lang]}
        </p>
        {top === undefined ? (
          <p className="mt-4 text-[8px] text-ink/50">{COPY.hofLoading[lang]}</p>
        ) : top.length === 0 ? (
          <p className="mt-4 border-2 border-ink bg-white p-3 text-[8px] text-ink/60">
            {COPY.hofEmpty[lang]}
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {top.map((p, i) => (
              <div
                key={p._id}
                className="nb-panel flex flex-wrap items-center gap-2 p-2"
              >
                <span className="w-8 text-center text-[10px]">
                  {i === 0 ? "👑" : `#${i + 1}`}
                </span>
                <span className="w-28 truncate text-[8px] font-bold uppercase">
                  {p.playerName}
                </span>
                <span className="text-[8px] text-ink/80">
                  {p.score.toLocaleString()} pts
                </span>
                <span className="hidden text-[7px] text-ink/60 sm:inline">
                  {p.badges}/6 badges · {p.dexCaught}/152 dex · {p.battlesWon} wins
                </span>
                <span className="ml-auto flex gap-1">
                  {p.team.slice(0, 6).map((m, j) => (
                    <img
                      key={j}
                      src={m.shiny ? urlSpriteShiny(m.speciesId) : urlSpriteCombat(m.speciesId)}
                      alt=""
                      className="h-6 w-6 pixelated"
                      title={`${m.speciesId} Lv.${m.level}${m.shiny ? " ⭐" : ""}`}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = urlSpriteCombat(m.speciesId);
                      }}
                    />
                  ))}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-[6px] text-ink/50">
          {COPY.hofAntiCheat[lang]}
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Marketplace preview — live player listings visible without launching the game.
// ---------------------------------------------------------------------------

function MarketPreview({ lang }: { lang: Language }) {
  const listings = useQuery(api.market.listListings, { limit: 8 });
  return (
    <section className="border-b-4 border-ink bg-[#fff3e0] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-white text-base">
            🏪
          </span>
          <h2 className="text-sm uppercase">{COPY.mktTitle[lang]}</h2>
        </div>
        <p className="mt-2 max-w-xl text-[8px] leading-3 text-ink/70">
          {COPY.mktTag[lang]}
        </p>
        {listings === undefined ? (
          <p className="mt-4 text-[8px] text-ink/50">{COPY.mktLoading[lang]}</p>
        ) : listings.length === 0 ? (
          <p className="mt-4 border-2 border-ink bg-white p-3 text-[8px] text-ink/60">
            {COPY.mktEmpty[lang]}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {listings
              .filter((l) => !l.sold)
              .slice(0, 8)
              .map((l) => (
                <div key={l._id} className="nb-panel flex flex-col items-center gap-1 p-2">
                  <img
                    src={l.shiny ? urlSpriteShiny(l.speciesId) : urlSpriteCombat(l.speciesId)}
                    alt=""
                    className="h-8 w-8 pixelated"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = urlSpriteCombat(l.speciesId);
                    }}
                  />
                  <span className="truncate text-[7px] font-bold uppercase">
                    {l.nickname ?? l.name} Lv.{l.level}
                    {l.shiny ? " ⭐" : ""}
                  </span>
                  <span className="text-[6px] text-ink/60">by {l.sellerName || "???"}</span>
                  <span className="border-2 border-ink bg-yellow-200 px-1 text-[7px]">
                    ₽{l.price}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}

const EXTRA_STRIP = [
  "151-POKÉDEX",
  "EVOLUTION FX",
  "5 LANGUAGES EN/FR/DE/ES/JP",
  "HALL OF FAME",
  "FRIENDS & TRADES",
  "POKÉ CENTER",
  "PLAYER MARKET",
  "WISHLISTS",
  "ANTI-CHEAT",
  "GROUND PICKUPS",
  "HOTKEYS M/N/B/C/K",
  "TRAY PAUSE",
  "EXPORT/IMPORT",
];

/** Hidden-yet-visible easter egg hint: a tiny pixel egg that, when clicked,
 *  reveals a cryptic riddle about the secret waiting beyond the 151. */
function EggHint() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-3 right-3 z-50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="egg-wiggle flex h-8 w-8 items-center justify-center border-2 border-ink bg-white text-sm shadow-[3px_3px_0_0_#111] transition-transform hover:-translate-y-0.5"
        title="A strange egg..."
        aria-label="Easter egg hint"
      >
        🥚
      </button>
      {open && (
        <div className="nb-panel absolute bottom-10 right-0 w-64 p-2 text-[6px] leading-3">
          <div className="mb-1 border-2 border-ink bg-yellow-100 p-1 font-bold uppercase">
            A traveler's tale
          </div>
          <p className="text-ink/80">
            "Beyond the 151 sleeps a time traveler in an egg. It will only
            hatch for the trainer who has earned every badge, registered the
            full Kanto Pokédex, and chased Team Rocket away at least once.
            Then — look to the sky."
          </p>
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  const releaseLive = useReleaseLive();
  // Preferred language, seeded from LANG_KEY (set by this picker in past
  // visits) so the whole page — and the game it launches — speaks the
  // player's language from the very first paint.
  const [lang, setLang] = useState<Language>(() =>
    typeof localStorage !== "undefined" ? getPreferredLanguage(localStorage) : "en",
  );
  const pickLanguage = (l: Language) => {
    setLang(l);
    if (typeof localStorage !== "undefined") setPreferredLanguage(localStorage, l);
  };
  return (
    <div className="min-h-screen bg-white text-ink font-pixel">
      <EggHint />
      {/* Header */}
      <header className="flex items-center justify-between border-b-4 border-ink px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="pokeball-pixel block !h-5 !w-5" />
          <span className="text-xs font-bold uppercase">Pokebanner</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/play" className="nb-btn bg-blue-300">
            {COPY.navGame[lang]}
          </Link>
          <div
            className="flex gap-1"
            role="group"
            aria-label={COPY.langTitle[lang]}
            title={COPY.langTitle[lang]}
          >
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => pickLanguage(l)}
                aria-pressed={lang === l}
                className={`nb-btn !px-1.5 ${lang === l ? "bg-yellow-300" : "bg-gray-100"}`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
          <Link to="/auth" className="nb-btn bg-yellow-300">
            {COPY.play[lang]}
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="border-b-4 border-ink px-4 pb-8 pt-10 text-center">
        <p className="text-[8px] tracking-widest text-ink/60">{COPY.eyebrow[lang]}</p>
        <h1 className="mx-auto mt-3 max-w-2xl text-2xl leading-8 uppercase">
          <span className="inline-block border-2 border-ink bg-[#6ec4f8] px-2">Pokebanner</span> —
          {COPY.titleMid[lang]}{" "}
          <span className="inline-block border-2 border-ink bg-yellow-300 px-1">
            {COPY.titleStrip[lang]}
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[9px] leading-4 text-ink/80">
          {COPY.subtitle[lang]}
        </p>

        {/* living mock banner */}
        <div className="mx-auto mt-6 w-full max-w-3xl">
          <MockBanner />
          <div className="mx-auto -mt-px w-[96%] border-2 border-t-0 border-ink bg-gray-50 p-1 text-left text-[6px] text-ink/70">
            ▓▓▓▓▓▓▓▓ 60px sky-blue strip · live preview · the world never sleeps
          </div>
        </div>

        {/* starter sprite parade — the three starters walk across the hero */}
        <div className="mx-auto mt-5 flex max-w-xs items-end justify-center gap-6">
          {STARTERS.map((s, i) => (
            <div key={s.id} className="sprite-walker" style={{ animationDelay: `${i * 0.6}s` }}>
              <img src={urlSpriteWalking(s.id)} alt={s.label} className="h-10 w-10 pixelated" />
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/auth" className="nb-btn !px-4 !py-2 !text-[10px] bg-yellow-300">
            {COPY.start[lang]}
          </Link>
          <Link
            to="/auth?returnTo=%2Fdashboard"
            className="nb-btn !px-4 !py-2 !text-[10px] bg-blue-300"
          >
            {COPY.pick[lang]}
          </Link>
        </div>
      </section>

      {/* Quick stats band */}
      <section className="border-b-4 border-ink bg-[#eef2ff] px-4 py-3">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["151", COPY.stats[lang][0]],
            ["6", COPY.stats[lang][1]],
            ["3", COPY.stats[lang][2]],
            ["5", COPY.stats[lang][3]],
          ].map(([n, l]) => (
            <div key={l} className="nb-panel p-1 text-center">
              <div className="text-sm font-bold">{n}</div>
              <div className="text-[6px] uppercase text-ink/70">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How to play */}
      <section className="border-b-4 border-ink bg-[#fff8e1] px-4 py-6">
        <div className="mx-auto grid max-w-3xl gap-2 sm:grid-cols-4">
          {COPY.how[lang].map(([title, d], idx) => (
            <div key={title} className="nb-panel p-2">
              <div className="flex items-center gap-1">
                <span className="flex h-4 w-4 items-center justify-center border-2 border-ink bg-yellow-300 text-[7px] font-bold">
                  {idx + 1}
                </span>
                <span className="text-[7px] font-bold uppercase">{title}</span>
              </div>
              <p className="mt-1 text-[6px] leading-3 text-ink/70">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Starter cards */}
      <section className="border-b-4 border-ink px-4 py-8">
        <h2 className="text-center text-sm uppercase">{COPY.starterTitle[lang]}</h2>
        <p className="mt-1 text-center text-[7px] text-ink/60">{COPY.starterSub[lang]}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {STARTERS.map((s) => (
            <Link
              key={s.id}
              to="/auth?returnTo=%2Fdashboard"
              className="nb-panel flex w-40 flex-col items-center gap-1 p-2 transition-transform hover:-translate-y-1"
            >
              <div
                className="flex h-14 w-full items-center justify-center border-2 border-ink"
                style={{ backgroundColor: s.color }}
              >
                <img
                  src={urlSpriteWalking(s.id)}
                  alt=""
                  className="h-10 w-10 pixelated"
                />
              </div>
              <span className="text-[8px] uppercase">
                {s.type} {s.id}
              </span>
              <span className="text-[7px] text-ink/70">{s.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section className="grid grid-cols-1 gap-2 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
        {COPY.features[lang].map(([icon, title, desc]) => (
          <div key={title} className="nb-panel p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-white text-sm">
                {icon}
              </span>
              <div className="text-[8px] font-bold uppercase">{title}</div>
            </div>
            <p className="mt-2 text-[7px] leading-3 text-ink/80">{desc}</p>
          </div>
        ))}
      </section>

      {/* Extra features strip */}
      <section className="border-y-4 border-ink bg-ink px-4 py-3">
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2">
          {EXTRA_STRIP.map((x) => (
            <span key={x} className="border-2 border-ink bg-white px-2 py-1 text-[6px] uppercase text-ink">
              {x}
            </span>
          ))}
        </div>
      </section>

      {/* Live leaderboard — top 10 trainers + their teams */}
      <HallOfFame lang={lang} />

      {/* Live marketplace — player listings without launching the game */}
      <MarketPreview lang={lang} />

      {/* Feedback */}
      <FeedbackSection lang={lang} />

      {/* Download — the desktop game is free forever */}
      <section className="border-y-4 border-ink bg-[#fff8e1] px-4 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[8px] tracking-widest text-ink/60">
            {COPY.downloadEyebrow[lang]}
          </p>
          <h2 className="mt-2 text-sm uppercase">{COPY.downloadTitle[lang]}</h2>
          <p className="mx-auto mt-3 max-w-lg text-[8px] leading-4 text-ink/80">
            {COPY.downloadSub[lang]}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[6px] uppercase">
            {COPY.downloadChips[lang].map((chip) => (
              <span key={chip} className="border-2 border-ink bg-white px-2 py-1">
                {chip}
              </span>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {releaseLive ? (
              <a
                href={DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
                className="nb-btn !px-5 !py-2 !text-[10px] bg-green-300"
              >
                {COPY.downloadBtn[lang]}
              </a>
            ) : (
              <span
                className="nb-btn !px-5 !py-2 !text-[10px] bg-gray-200 !text-ink/60"
                title="Download goes live once the GitHub release URL is configured."
              >
                {COPY.downloadSoon[lang]}
              </span>
            )}
            <Link to="/play" className="nb-btn !px-5 !py-2 !text-[10px] bg-blue-300">
              {COPY.browserBtn[lang]}
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-10 text-center">
        <h2 className="text-sm uppercase">{COPY.ctaTitle[lang]}</h2>
        <Link to="/auth" className="nb-btn mt-4 !px-6 !py-3 !text-[11px] bg-green-300">
          {COPY.ctaBtn[lang]}
        </Link>
        <p className="mt-3 text-[6px] text-ink/60">{COPY.ctaFooter[lang]}</p>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-ink bg-white px-4 py-4 text-center text-[6px] text-ink/50">
        {COPY.footer[lang]}
      </footer>
    </div>
  );
}
