import type {
  BiomeDef,
  CenterServiceId,
  ChampionDef,
  DexEntry,
  DexRarity,
  ItemDef,
  LeagueMemberDef,
  MoveDef,
  SpeciesDef,
  TypeName,
  WeatherKind,
} from "./types";

// ---------------------------------------------------------------------------
// Static game data. Pure data — no logic, no timers, no DOM.
// ---------------------------------------------------------------------------

/** Every species in the game (a representative Kanto 151). */
export const KANTO_151: string[] = [
  "bulbasaur", "ivysaur", "venusaur", "charmander", "charmeleon", "charizard",
  "squirtle", "wartortle", "blastoise", "caterpie", "metapod", "butterfree",
  "weedle", "kakuna", "beedrill", "pidgey", "pidgeotto", "pidgeot",
  "rattata", "raticate", "spearow", "fearow", "ekans", "arbok", "pikachu",
  "raichu", "sandshrew", "sandslash", "nidoran-f", "nidorina", "nidoqueen",
  "nidoran-m", "nidorino", "nidoking", "clefairy", "clefable", "vulpix",
  "ninetales", "jigglypuff", "wigglytuff", "zubat", "golbat", "oddish",
  "gloom", "vileplume", "paras", "parasect", "venonat", "venomoth", "diglett",
  "dugtrio", "meowth", "persian", "psyduck", "golduck", "mankey", "primeape",
  "growlithe", "arcanine", "poliwag", "poliwhirl", "poliwrath", "abra",
  "kadabra", "alakazam", "machop", "machoke", "machamp", "bellsprout",
  "weepinbell", "victreebel", "tentacool", "tentacruel", "geodude", "graveler",
  "golem", "ponyta", "rapidash", "slowpoke", "slowbro", "magnemite",
  "magneton", "farfetchd", "doduo", "dodrio", "seel", "dewgong", "grimer",
  "muk", "shellder", "cloyster", "gastly", "haunter", "gengar", "onix",
  "drowzee", "hypno", "krabby", "kingler", "voltorb", "electrode", "exeggcute",
  "exeggutor", "cubone", "marowak", "hitmonlee", "hitmonchan", "lickitung",
  "koffing", "weezing", "rhyhorn", "rhydon", "chansey", "tangela", "kangaskhan",
  "horsea", "seadra", "goldeen", "seaking", "staryu", "starmie", "mr-mime",
  "scyther", "jynx", "electabuzz", "magmar", "pinsir", "tauros", "magikarp",
  "gyarados", "lapras", "ditto", "eevee", "vaporeon", "jolteon", "flareon",
  "porygon", "omanyte", "omastar", "kabuto", "kabutops", "aerodactyl",
  "snorlax", "articuno", "zapdos", "moltres", "dratini", "dragonair",
  "dragonite", "mewtwo", "mew",
];

const base = (id: string, name: string, types: TypeName[], hp: number, atk: number, def: number, catchRate: number, xpYield: number, extra: Partial<SpeciesDef> = {}): SpeciesDef => ({
  id,
  name,
  types,
  baseHp: hp,
  baseAtk: atk,
  baseDef: def,
  catchRate,
  xpYield,
  ...extra,
});

/** Stats for species that actually appear in the game. */
export const SPECIES: Record<string, SpeciesDef> = Object.fromEntries(
  [
    base("bulbasaur", "Bulbasaur", ["grass", "poison"], 45, 49, 49, 45, 64),
    base("ivysaur", "Ivysaur", ["grass", "poison"], 60, 62, 63, 45, 142),
    base("venusaur", "Venusaur", ["grass", "poison"], 80, 82, 83, 45, 236),
    base("charmander", "Charmander", ["fire"], 39, 52, 43, 45, 62),
    base("charmeleon", "Charmeleon", ["fire"], 58, 64, 58, 45, 142),
    base("charizard", "Charizard", ["fire", "flying"], 78, 84, 78, 45, 240),
    base("squirtle", "Squirtle", ["water"], 44, 48, 65, 45, 63),
    base("wartortle", "Wartortle", ["water"], 59, 63, 80, 45, 142),
    base("blastoise", "Blastoise", ["water"], 79, 83, 100, 45, 239),
    base("pidgey", "Pidgey", ["normal", "flying"], 40, 45, 40, 255, 50),
    base("rattata", "Rattata", ["normal"], 30, 56, 35, 255, 51),
    base("spearow", "Spearow", ["normal", "flying"], 40, 60, 30, 255, 52),
    base("ekans", "Ekans", ["poison"], 35, 60, 44, 255, 58),
    base("pikachu", "Pikachu", ["electric"], 35, 55, 40, 190, 82),
    base("oddish", "Oddish", ["grass", "poison"], 45, 50, 55, 255, 60),
    base("meowth", "Meowth", ["normal"], 40, 45, 35, 255, 58),
    base("caterpie", "Caterpie", ["bug"], 45, 30, 35, 255, 39),
    base("metapod", "Metapod", ["bug"], 50, 20, 55, 255, 72),
    base("weedle", "Weedle", ["bug", "poison"], 40, 35, 30, 255, 39),
    base("zubat", "Zubat", ["poison", "flying"], 40, 45, 35, 255, 49, { nightOnly: true }),
    base("geodude", "Geodude", ["rock", "ground"], 40, 80, 100, 255, 60),
    base("diglett", "Diglett", ["ground"], 10, 55, 25, 255, 53),
    base("onix", "Onix", ["rock", "ground"], 35, 45, 160, 45, 77),
    base("staryu", "Staryu", ["water"], 30, 45, 55, 225, 68),
    base("raichu", "Raichu", ["electric"], 60, 90, 55, 75, 122),
    // post-game champions & richer wild variety
    base("kadabra", "Kadabra", ["psychic"], 40, 35, 30, 200, 145),
    base("arcanine", "Arcanine", ["fire"], 90, 110, 80, 75, 213),
    base("vileplume", "Vileplume", ["grass", "poison"], 75, 80, 85, 45, 216),
    base("weezing", "Weezing", ["poison"], 65, 90, 120, 60, 172),
    base("rhydon", "Rhydon", ["ground", "rock"], 105, 130, 120, 60, 170),
    base("nidoran-f", "Nidoran♀", ["poison"], 55, 47, 52, 235, 59),
    base("mankey", "Mankey", ["fighting"], 40, 80, 35, 190, 61),
    base("growlithe", "Growlithe", ["fire"], 55, 70, 45, 190, 70),
    base("ponyta", "Ponyta", ["fire"], 50, 85, 55, 190, 82),
    base("tentacool", "Tentacool", ["water", "poison"], 40, 40, 35, 190, 67),
    // Legendary Bosses (v1.8.0) — rare weather events spawn these. Low catch
    // rate, huge stats, big XP/money yields. Ice type joins for Articuno.
    base("articuno", "Articuno", ["ice", "flying"], 90, 85, 100, 3, 290),
    base("zapdos", "Zapdos", ["electric", "flying"], 90, 90, 85, 3, 290),
    base("moltres", "Moltres", ["fire", "flying"], 90, 100, 90, 3, 290),
    base("mewtwo", "Mewtwo", ["psychic"], 106, 110, 90, 3, 340),
    // v1.9.0: friendship-evolution targets + Elite Four roster. These species
    // can be earned through friendship evolutions or faced in the Indigo
    // League; they were absent before because they never spawned in the wild.
    base("persian", "Persian", ["normal"], 65, 70, 60, 90, 154),
    base("gloom", "Gloom", ["grass", "poison"], 60, 65, 70, 120, 138),
    base("golbat", "Golbat", ["poison", "flying"], 75, 80, 70, 90, 159),
    base("nidorina", "Nidorina", ["poison"], 70, 62, 67, 120, 128),
    base("nidoran-m", "Nidoran♂", ["poison"], 46, 57, 40, 235, 60),
    base("nidorino", "Nidorino", ["poison"], 61, 72, 57, 120, 128),
    base("machop", "Machop", ["fighting"], 70, 80, 50, 180, 61),
    base("machoke", "Machoke", ["fighting"], 80, 100, 70, 90, 142),
    base("machamp", "Machamp", ["fighting"], 90, 130, 80, 45, 193),
    base("rapidash", "Rapidash", ["fire"], 65, 100, 70, 60, 152),
    base("dewgong", "Dewgong", ["ice", "water"], 90, 70, 80, 75, 166),
    base("gengar", "Gengar", ["ghost", "poison"], 60, 65, 60, 45, 190),
    base("aerodactyl", "Aerodactyl", ["rock", "flying"], 80, 105, 65, 45, 180),
    // Mythical easter egg — Celebi, the time traveler (beyond the 151)
    base("celebi", "Celebi", ["psychic", "grass"], 100, 100, 100, 3, 400, { nightOnly: false }),
  ].map((s) => [s.id, s]),
);

/** Fallback stats for dex entries that never appear in the wild. */
export const DEFAULT_STATS: Omit<SpeciesDef, "id" | "name" | "types"> = {
  baseHp: 50,
  baseAtk: 48,
  baseDef: 45,
  catchRate: 120,
  xpYield: 60,
};

export function getSpecies(id: string): SpeciesDef {
  return (
    SPECIES[id] ?? {
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      types: ["normal"],
      ...DEFAULT_STATS,
    }
  );
}

/** Dex metadata (height/weight/flavor) for every species, keyed by id. */
export const DEX_META: Record<string, DexEntry> = {
  bulbasaur: { heightM: 0.7, weightKg: 6.9, flavor: "A strange seed was planted on its back at birth. The plant sprouts and grows with this Pokémon." },
  ivysaur: { heightM: 1, weightKg: 13, flavor: "When the bulb on its back grows large, it appears to lose the ability to stand on its hind legs." },
  venusaur: { heightM: 2, weightKg: 100, flavor: "The plant blooms when it is absorbing solar energy. It stays on the move to seek sunlight." },
  charmander: { heightM: 0.6, weightKg: 8.5, flavor: "The flame on its tail shows the strength of its life force. If it is weak, the flame also burns weakly." },
  charmeleon: { heightM: 1.1, weightKg: 19, flavor: "When it swings its burning tail, it elevates the temperature to unbearably high levels." },
  charizard: { heightM: 1.7, weightKg: 90.5, flavor: "It spits fire that is hot enough to melt boulders. It may cause forest fires by blowing flames." },
  squirtle: { heightM: 0.5, weightKg: 9, flavor: "After birth, its back swells and hardens into a shell. It powerfully sprays foam from its mouth." },
  wartortle: { heightM: 1, weightKg: 22.5, flavor: "It is recognized as a symbol of longevity. If its shell has algae, that Wartortle is very old." },
  blastoise: { heightM: 1.6, weightKg: 85.5, flavor: "A brutal Pokémon with pressurized water jets on its shell. They are used for high-speed tackles." },
  caterpie: { heightM: 0.3, weightKg: 2.9, flavor: "Its short feet are tipped with suction pads that enable it to tirelessly climb slopes and walls." },
  metapod: { heightM: 0.7, weightKg: 9.9, flavor: "It is waiting for the moment to evolve. At this stage, it can only harden, so it remains motionless." },
  butterfree: { heightM: 1.1, weightKg: 32, flavor: "In battle, it flaps its wings at great speed to release highly toxic dust into the air." },
  weedle: { heightM: 0.3, weightKg: 3.2, flavor: "Often found in forests, eating leaves. It has a sharp venomous stinger on its head." },
  kakuna: { heightM: 0.6, weightKg: 10, flavor: "Almost incapable of moving, this Pokémon can only harden its shell to protect itself." },
  beedrill: { heightM: 1, weightKg: 29.5, flavor: "It flies at high speed and attacks using the large venomous stingers on its forelegs and tail." },
  pidgey: { heightM: 0.3, weightKg: 1.8, flavor: "A common sight in forests and woods. It flaps its wings at ground level to kick up blinding sand." },
  pidgeotto: { heightM: 1.1, weightKg: 30, flavor: "It uses its sharp claws to seize prey. Very protective of its own territory." },
  pidgeot: { heightM: 1.5, weightKg: 39.5, flavor: "When hunting, it skims the surface of water at high speed to pick off unwary prey." },
  rattata: { heightM: 0.3, weightKg: 3.5, flavor: "Bites anything when it attacks. Small and very quick, it is a common sight in many places." },
  raticate: { heightM: 0.7, weightKg: 18.5, flavor: "It uses its whiskers to maintain its balance. It slows down if they are cut off." },
  spearow: { heightM: 0.3, weightKg: 2, flavor: "It eats bugs in grassy areas. It has to flap its short wings at high speed to stay airborne." },
  fearow: { heightM: 1.2, weightKg: 38, flavor: "A Pokémon that dates back many years. If it senses danger, it flies high and away instantly." },
  ekans: { heightM: 2, weightKg: 6.9, flavor: "Moves silently and stealthily. It eats the eggs of birds, such as Pidgey and Spearow." },
  arbok: { heightM: 3.5, weightKg: 65, flavor: "It is rumored that the ferocious warning markings on its belly differ from area to area." },
  pikachu: { heightM: 0.4, weightKg: 6, flavor: "When several of these Pokémon gather, their electricity could build and cause lightning storms." },
  raichu: { heightM: 0.8, weightKg: 30, flavor: "Its long tail serves as a ground to protect itself from its own high-voltage power." },
  sandshrew: { heightM: 0.6, weightKg: 12, flavor: "Burrows deep underground in arid locations far from water. It only emerges to hunt for food." },
  sandslash: { heightM: 1, weightKg: 29.5, flavor: "Curls up into a spiny ball when threatened. It can roll while curled up to attack or escape." },
  "nidoran-f": { heightM: 0.4, weightKg: 7, flavor: "Although small, its venomous barbs render this Pokémon dangerous. The female has smaller horns." },
  nidorina: { heightM: 0.8, weightKg: 20, flavor: "The female's horn develops slowly. Prefers physical attacks such as clawing and biting." },
  nidoqueen: { heightM: 1.3, weightKg: 60, flavor: "Its hard scales provide strong protection. It uses its hefty bulk to execute powerful moves." },
  "nidoran-m": { heightM: 0.5, weightKg: 9, flavor: "Stiffens its ears to sense danger. The larger its horns, the more powerful its secreted venom." },
  nidorino: { heightM: 0.9, weightKg: 19.5, flavor: "An aggressive Pokémon that is quick to attack. The horn on its head secretes a powerful venom." },
  nidoking: { heightM: 1.4, weightKg: 62, flavor: "It uses its powerful tail in battle to smash, constrict, then break the prey's bones." },
  clefairy: { heightM: 0.6, weightKg: 7.5, flavor: "Its magical and cute appeal has many admirers. It is rare and found only in certain areas." },
  clefable: { heightM: 1.3, weightKg: 40, flavor: "A timid fairy Pokémon that is rarely seen. It will run and hide the moment it senses people." },
  vulpix: { heightM: 0.6, weightKg: 9.9, flavor: "At the time of birth, it has just one tail. The tail splits from its tip as it grows older." },
  ninetales: { heightM: 1.1, weightKg: 19.9, flavor: "Very smart and very vengeful. Grabbing one of its many tails could result in a 1,000-year curse." },
  jigglypuff: { heightM: 0.5, weightKg: 5.5, flavor: "When its huge eyes lighten, it sings a mysteriously soothing melody that lulls its enemies to sleep." },
  wigglytuff: { heightM: 1, weightKg: 12, flavor: "The body is soft and rubbery. When angered, it inhales and inflates itself to an enormous size." },
  zubat: { heightM: 0.8, weightKg: 7.5, flavor: "Forms colonies in perpetually dark places. Uses ultrasonic waves to identify and approach targets." },
  golbat: { heightM: 1.6, weightKg: 55, flavor: "It attacks in a stealthy manner, without warning. Its sharp fangs are used to bite and suck blood." },
  oddish: { heightM: 0.5, weightKg: 5.4, flavor: "During the day, it keeps its face buried in the ground. At night, it wanders around sowing its seeds." },
  gloom: { heightM: 0.8, weightKg: 8.6, flavor: "What appears to be drool is actually sweet honey. It is very sticky and clings stubbornly if touched." },
  vileplume: { heightM: 1.2, weightKg: 18.6, flavor: "The larger its petals, the more toxic pollen it contains. Its big head is heavy and hard to hold up." },
  paras: { heightM: 0.3, weightKg: 5.4, flavor: "Burrows to suck tree roots. The mushrooms on its back grow by drawing nutrients from the bug host." },
  parasect: { heightM: 1, weightKg: 29.5, flavor: "A host-parasite pair in which the parasite mushroom has taken over the host bug. Prefers damp places." },
  venonat: { heightM: 1, weightKg: 30, flavor: "Lives in the shadows of tall trees where it eats insects. It is attracted by light at night." },
  venomoth: { heightM: 1.5, weightKg: 12.5, flavor: "The dust-like scales covering its wings are odorless. It is poisonous, and it attacks with dust." },
  diglett: { heightM: 0.2, weightKg: 0.8, flavor: "Lives about one yard underground, where it feeds on plant roots. It sometimes appears above ground." },
  dugtrio: { heightM: 0.7, weightKg: 33.3, flavor: "A team of Diglett triplets. It triggers huge earthquakes by burrowing 60 miles underground." },
  meowth: { heightM: 0.4, weightKg: 4.2, flavor: "Adores circular objects. Wanders the streets on a nightly basis to look for dropped loose change." },
  persian: { heightM: 1, weightKg: 32, flavor: "Although its fur has many admirers, it is tough to raise as a pet because of its fickle meanness." },
  psyduck: { heightM: 0.8, weightKg: 19.6, flavor: "While lulling its enemies with its vacant look, this wily Pokémon will use psychokinetic powers." },
  golduck: { heightM: 1.7, weightKg: 76.6, flavor: "Often seen swimming elegantly by lake shores. It is often mistaken for the Japanese monster Kappa." },
  mankey: { heightM: 0.5, weightKg: 28, flavor: "Extremely quick to anger. It could be docile one moment, then thrashing away the next instant." },
  primeape: { heightM: 1, weightKg: 32, flavor: "Always furious and tenacious to boot. It will not abandon chasing its quarry until it is caught." },
  growlithe: { heightM: 0.7, weightKg: 19, flavor: "Very protective of its territory. It will bark and bite to repel intruders from its space." },
  arcanine: { heightM: 1.9, weightKg: 155, flavor: "A Pokémon that has been admired since the past for its beauty. It runs agilely as if on wings." },
  poliwag: { heightM: 0.6, weightKg: 12.4, flavor: "Its newly grown legs prevent it from running. It appears to prefer swimming over trying to stand." },
  poliwhirl: { heightM: 1, weightKg: 20, flavor: "Capable of living in or out of water. When out of water, it sweats to keep its body slimy." },
  poliwrath: { heightM: 1.3, weightKg: 54, flavor: "An adept swimmer at both the front crawl and breast stroke. Easily overtakes the best human swimmers." },
  abra: { heightM: 0.9, weightKg: 19.5, flavor: "Using its ability to read minds, it will identify impending danger and teleport to safety." },
  kadabra: { heightM: 1.3, weightKg: 56.5, flavor: "It emits special alpha waves from its body that induce headaches just by being close by." },
  alakazam: { heightM: 1.5, weightKg: 48, flavor: "Its brain can outperform a supercomputer. Its intelligence quotient is said to be around 5,000." },
  machop: { heightM: 0.8, weightKg: 19.5, flavor: "Loves to build its muscles. It trains in all styles of martial arts to become even stronger." },
  machoke: { heightM: 1.5, weightKg: 70.5, flavor: "Its muscular body is so powerful, it must wear a power-save belt to be able to regulate its motions." },
  machamp: { heightM: 1.6, weightKg: 130, flavor: "Using its heavy muscles, it throws powerful punches that can send the victim clear over the horizon." },
  bellsprout: { heightM: 0.7, weightKg: 4, flavor: "A carnivorous Pokémon that traps and eats bugs. It uses its root feet to soak up needed moisture." },
  weepinbell: { heightM: 1, weightKg: 6.4, flavor: "It spits out poisonpowder to immobilize the enemy and then finishes it with a spray of acid." },
  victreebel: { heightM: 1.7, weightKg: 15.5, flavor: "Said to live in huge colonies deep in jungles, although no one has ever returned from there." },
  tentacool: { heightM: 0.9, weightKg: 45.5, flavor: "Drifts in shallow seas. Anglers who hook them by accident are often punished by its stinging acid." },
  tentacruel: { heightM: 1.6, weightKg: 55, flavor: "It can extend freely its 80 tentacles to snatch prey and cause injury. It is often found at sea." },
  geodude: { heightM: 0.4, weightKg: 20, flavor: "Found in fields and mountains. Mistaking them for boulders, people often step or trip on them." },
  graveler: { heightM: 1, weightKg: 105, flavor: "Rolls down slopes to move. It rolls over any obstacle without slowing or changing its direction." },
  golem: { heightM: 1.4, weightKg: 300, flavor: "Its boulder-like body is extremely hard. It can easily withstand dynamite blasts without damage." },
  ponyta: { heightM: 1, weightKg: 30, flavor: "Its hooves are 10 times harder than diamonds. It can trample anything completely flat." },
  rapidash: { heightM: 1.7, weightKg: 95, flavor: "Very competitive, this Pokémon will chase anything that moves fast in the hopes of racing it." },
  slowpoke: { heightM: 1.2, weightKg: 36, flavor: "Incredibly slow and dopey. It takes 5 seconds for it to feel pain when under attack." },
  slowbro: { heightM: 1.6, weightKg: 78.5, flavor: "The Shellder that is latched onto Slowpoke's tail is said to feed on the host's leftover scraps." },
  magnemite: { heightM: 0.3, weightKg: 6, flavor: "Uses anti-gravity to stay suspended. It appears without warning and uses Thunder Wave and similar moves." },
  magneton: { heightM: 1, weightKg: 60, flavor: "Formed by several Magnemites linked together. They frequently appear when sunspots flare up." },
  farfetchd: { heightM: 0.8, weightKg: 15, flavor: "The sprig of green onions it holds is its weapon. It is used much like a metal sword." },
  doduo: { heightM: 1.4, weightKg: 39.2, flavor: "A bird that makes up for its poor flying with its fast foot speed. Leaves giant footprints." },
  dodrio: { heightM: 1.8, weightKg: 85.2, flavor: "Uses its three brains to execute complex plans. While two heads sleep, one head stays awake." },
  seel: { heightM: 1.1, weightKg: 90, flavor: "The protruding horn on its head is very hard. It is used for bashing through thick ice." },
  dewgong: { heightM: 1.7, weightKg: 120, flavor: "Stores thermal energy in its body. It swims at a steady 8 knots even in intensely cold waters." },
  grimer: { heightM: 0.9, weightKg: 30, flavor: "Appears in filthy areas. Thrives by sucking up polluted sludge that is pumped out of factories." },
  muk: { heightM: 1.2, weightKg: 30, flavor: "Thickly covered with a filthy, vile sludge. It is so toxic that even its footprints contain poison." },
  shellder: { heightM: 0.3, weightKg: 4, flavor: "Its hard shell repels any kind of attack. It is vulnerable only when its shell is open." },
  cloyster: { heightM: 1.5, weightKg: 132.5, flavor: "When attacked, it launches its horns in quick volleys. Its innards have never been seen." },
  gastly: { heightM: 1.3, weightKg: 0.1, flavor: "Almost invisible, this gaseous Pokémon cloaks the target and puts it to sleep without notice." },
  haunter: { heightM: 1.6, weightKg: 0.1, flavor: "Because of its ability to slip through block walls, it is said to be from another dimension." },
  gengar: { heightM: 1.5, weightKg: 40.5, flavor: "Under a full moon, this Pokémon likes to mimic the shadows of people and laugh at their fright." },
  onix: { heightM: 8.8, weightKg: 210, flavor: "As it grows, the stone portions of its body harden to become similar to a diamond, but colored black." },
  drowzee: { heightM: 1, weightKg: 32.4, flavor: "Puts enemies to sleep, then eats their dreams. Occasionally gets sick from eating bad dreams." },
  hypno: { heightM: 1.6, weightKg: 75.6, flavor: "When it locks eyes with an enemy, it will use a mix of psi moves such as Hypnosis and Confusion." },
  krabby: { heightM: 0.4, weightKg: 6.5, flavor: "Its pincers are not only powerful weapons, they are used for balance when walking sideways." },
  kingler: { heightM: 1.3, weightKg: 60, flavor: "The large pincer has 10,000-horsepower crushing force. However, its huge size makes it unwieldy." },
  voltorb: { heightM: 0.5, weightKg: 10.4, flavor: "Usually found in power plants. Easily mistaken for a Poké Ball, it has zapped many people." },
  electrode: { heightM: 1.2, weightKg: 66.6, flavor: "It stores electric energy under very high pressure. It often explodes with little or no provocation." },
  exeggcute: { heightM: 0.4, weightKg: 2.5, flavor: "Often mistaken for eggs. When disturbed, they quickly gather and attack in groups." },
  exeggutor: { heightM: 2, weightKg: 120, flavor: "Legend has it that on rare occasions, one of its heads will drop off and continue on as an Exeggcute." },
  cubone: { heightM: 0.4, weightKg: 6.5, flavor: "Because it never removes its skull helmet, no one has ever seen this Pokémon's real face." },
  marowak: { heightM: 1, weightKg: 45, flavor: "The bone it holds is its key weapon. It throws the bone skillfully like a boomerang to KO targets." },
  hitmonlee: { heightM: 1.5, weightKg: 49.8, flavor: "If it starts kicking, it just keeps kicking until it loses its balance. It can jump 30 feet." },
  hitmonchan: { heightM: 1.5, weightKg: 50.2, flavor: "While apparently doing nothing, it fires punches in lightning-fast volleys that are impossible to see." },
  lickitung: { heightM: 1.2, weightKg: 65.5, flavor: "Its tongue can be extended like a chameleon's. It leaves a tingling sensation when it licks enemies." },
  koffing: { heightM: 0.6, weightKg: 1, flavor: "Because it stores several kinds of toxic gases in its body, its overgrown body often oozes smells." },
  weezing: { heightM: 1.2, weightKg: 9.5, flavor: "Where two kinds of poison gases meet, two Koffings can fuse into a Weezing over many years." },
  rhyhorn: { heightM: 1, weightKg: 115, flavor: "Its massive bones are 1,000 times harder than human bones. It can easily knock a trailer flying." },
  rhydon: { heightM: 1.9, weightKg: 120, flavor: "Protected by an armor-like hide, it is capable of living in molten lava of 3,600 degrees." },
  chansey: { heightM: 1.1, weightKg: 34.6, flavor: "A rare and elusive Pokémon that is said to bring happiness to those who manage to get it." },
  tangela: { heightM: 1, weightKg: 35, flavor: "Its whole body is swathed with wide vines that are similar to seaweed. Its vines shake as it walks." },
  kangaskhan: { heightM: 2.2, weightKg: 80, flavor: "The infant rarely ventures out of its mother's protective pouch until it is 3 years old." },
  horsea: { heightM: 0.4, weightKg: 8, flavor: "Known to shoot down flying bugs with precision blasts of ink from the surface of the water." },
  seadra: { heightM: 1.2, weightKg: 25, flavor: "Capable of swimming backwards by rapidly flapping its wing-like pectoral fins and stout tail." },
  goldeen: { heightM: 0.6, weightKg: 15, flavor: "Its tail fin billows like an elegant ballroom dress, giving it the nickname of the Water Queen." },
  seaking: { heightM: 1.3, weightKg: 39, flavor: "In the autumn spawning season, they can be seen swimming powerfully up rivers and creeks." },
  staryu: { heightM: 0.8, weightKg: 34.5, flavor: "An enigmatic Pokémon that can effortlessly regenerate any appendage it loses in battle." },
  starmie: { heightM: 1.1, weightKg: 80, flavor: "Its central core glows with the seven colors of the rainbow. Some people value the core as a gem." },
  "mr-mime": { heightM: 1.3, weightKg: 54.5, flavor: "If interrupted while it is miming, it will slap around the offender with its broad hands." },
  scyther: { heightM: 1.5, weightKg: 56, flavor: "With ninja-like agility and speed, it can create the illusion that there is more than one." },
  jynx: { heightM: 1.4, weightKg: 40.6, flavor: "It seductively wiggles its hips as it walks. It can cause people to dance in unison with it." },
  electabuzz: { heightM: 1.1, weightKg: 30, flavor: "Normally found near power plants, it can wander away and cause blackouts in major cities." },
  magmar: { heightM: 1.3, weightKg: 44.5, flavor: "Its body always burns with an orange glow that enables it to hide perfectly among flames." },
  pinsir: { heightM: 1.5, weightKg: 55, flavor: "If it fails to crush the victim in its pincers, it will toss them about and fling them hard." },
  tauros: { heightM: 1.4, weightKg: 88.4, flavor: "When it targets an enemy, it charges furiously while whipping its body with its long tails." },
  magikarp: { heightM: 0.9, weightKg: 10, flavor: "In the distant past, it was somewhat stronger than the horribly weak descendants that exist today." },
  gyarados: { heightM: 6.5, weightKg: 235, flavor: "Rarely seen in the wild. Huge and vicious, it is capable of destroying entire cities in a rage." },
  lapras: { heightM: 2.5, weightKg: 220, flavor: "A Pokémon that has been overhunted almost to extinction. It can ferry people across the water." },
  ditto: { heightM: 0.3, weightKg: 4, flavor: "Capable of copying an enemy's genetic code to instantly transform itself into a duplicate of the enemy." },
  eevee: { heightM: 0.3, weightKg: 6.5, flavor: "Its genetic code is irregular. It may mutate if it is exposed to radiation from element stones." },
  vaporeon: { heightM: 1, weightKg: 29, flavor: "Lives close to water. Its long tail is ridged with a fin which is often mistaken for a mermaid's." },
  jolteon: { heightM: 0.8, weightKg: 24.5, flavor: "It accumulates negative ions in the atmosphere to blast out 10,000-volt lightning bolts." },
  flareon: { heightM: 0.9, weightKg: 25, flavor: "When storing thermal energy in its body, its temperature could soar to over 1,600 degrees." },
  porygon: { heightM: 0.8, weightKg: 36.5, flavor: "A Pokémon that consists entirely of programming code. Capable of moving freely in cyberspace." },
  omanyte: { heightM: 0.4, weightKg: 7.5, flavor: "Although long extinct, in rare cases, it can be genetically resurrected from fossils." },
  omastar: { heightM: 1, weightKg: 35, flavor: "A prehistoric Pokémon that died out when its heavy shell made it impossible to catch prey." },
  kabuto: { heightM: 0.5, weightKg: 11.5, flavor: "A Pokémon that was resurrected from a fossil found in what was once the ocean floor eons ago." },
  kabutops: { heightM: 1.3, weightKg: 40.5, flavor: "Its sleek shape is perfect for swimming. It slashes prey with its claws and drains the fluids." },
  aerodactyl: { heightM: 1.8, weightKg: 59, flavor: "A ferocious, prehistoric Pokémon that goes for the enemy's throat with its serrated saw-like fangs." },
  snorlax: { heightM: 2.1, weightKg: 460, flavor: "Very lazy. Just eats and sleeps. As its rotund bulk builds, it becomes steadily more slothful." },
  articuno: { heightM: 1.7, weightKg: 55.4, flavor: "A legendary bird Pokémon that is said to appear to doomed people who are lost in icy mountains." },
  zapdos: { heightM: 1.6, weightKg: 52.6, flavor: "A legendary bird Pokémon that is said to appear from clouds while dropping enormous lightning bolts." },
  moltres: { heightM: 2, weightKg: 60, flavor: "Known as the legendary bird of fire. Every flap of its wings creates a dazzling flash of flames." },
  dratini: { heightM: 1.8, weightKg: 3.3, flavor: "Long considered a mythical Pokémon until recently, when a small colony was found living underwater." },
  dragonair: { heightM: 4, weightKg: 16.5, flavor: "A mystical Pokémon that exudes a gentle aura. Has the ability to change climate conditions." },
  dragonite: { heightM: 2.2, weightKg: 210, flavor: "An extremely rarely seen marine Pokémon. Its intelligence is said to match that of humans." },
  mewtwo: { heightM: 2, weightKg: 122, flavor: "It was created by a scientist after years of horrific gene splicing and DNA engineering experiments." },
  mew: { heightM: 0.4, weightKg: 4, flavor: "So rare that it is still said to be a mirage by many experts. Only a few people have seen it worldwide." },
  celebi: { heightM: 0.6, weightKg: 5, flavor: "This Pokémon came from the future by crossing time. It is believed that it can only appear in peace." },
};

/** Fallback entry for species with no recorded measurements. */
const DEX_FALLBACK: DexEntry = { heightM: 0.6, weightKg: 12.0, flavor: "A mysterious Pokémon whose details remain unrecorded." };

export function getDexMeta(id: string): DexEntry {
  return DEX_META[id] ?? DEX_FALLBACK;
}

/** Codex completion milestones (share of the 151) and their one-time rewards. */
export const DEX_MILESTONES: { pct: number; money: number; item: string; qty: number }[] = [
  { pct: 25, money: 500, item: "greatball", qty: 5 },
  { pct: 50, money: 1500, item: "greatball", qty: 10 },
  { pct: 75, money: 3000, item: "berry", qty: 10 },
  { pct: 100, money: 10000, item: "pokeball", qty: 25 },
];

/** Tailwind chip colors per type (used by the Codex type badges). */
export const TYPE_COLORS: Record<TypeName, string> = {
  normal: "bg-gray-300",
  grass: "bg-green-300",
  fire: "bg-red-300",
  water: "bg-blue-300",
  electric: "bg-yellow-300",
  bug: "bg-lime-300",
  poison: "bg-purple-300",
  ground: "bg-amber-300",
  rock: "bg-stone-300",
  flying: "bg-sky-300",
  ghost: "bg-violet-300",
  fighting: "bg-orange-300",
  ice: "bg-cyan-300",
  psychic: "bg-pink-300",
};

// ---------------------------------------------------------------------------
// Moves
// ---------------------------------------------------------------------------

export const MOVES: Record<string, MoveDef> = {
  tackle: { id: "tackle", name: "Tackle", type: "normal", power: 40, accuracy: 100, target: "enemy" },
  "quick-attack": { id: "quick-attack", name: "Quick Attack", type: "normal", power: 40, accuracy: 100, target: "enemy" },
  scratch: { id: "scratch", name: "Scratch", type: "normal", power: 40, accuracy: 100, target: "enemy" },
  bite: { id: "bite", name: "Bite", type: "normal", power: 60, accuracy: 100, target: "enemy" },
  "vine-whip": { id: "vine-whip", name: "Vine Whip", type: "grass", power: 45, accuracy: 100, target: "enemy" },
  "leech-seed": { id: "leech-seed", name: "Leech Seed", type: "grass", power: 20, accuracy: 90, target: "enemy", status: "leech", drain: true },
  "sleep-powder": { id: "sleep-powder", name: "Sleep Powder", type: "grass", power: 0, accuracy: 75, target: "enemy", status: "sleep" },
  ember: { id: "ember", name: "Ember", type: "fire", power: 40, accuracy: 100, target: "enemy" },
  "fire-fang": { id: "fire-fang", name: "Fire Fang", type: "fire", power: 65, accuracy: 95, target: "enemy" },
  "flame-charge": { id: "flame-charge", name: "Flame Charge", type: "fire", power: 0, accuracy: 100, target: "self", healPct: 20 },
  "water-gun": { id: "water-gun", name: "Water Gun", type: "water", power: 40, accuracy: 100, target: "enemy" },
  withdraw: { id: "withdraw", name: "Withdraw", type: "water", power: 0, accuracy: 100, target: "self", healPct: 25 },
  "thunder-shock": { id: "thunder-shock", name: "Thunder Shock", type: "electric", power: 40, accuracy: 100, target: "enemy" },
  thunderbolt: { id: "thunderbolt", name: "Thunderbolt", type: "electric", power: 90, accuracy: 100, target: "enemy" },
  "rock-throw": { id: "rock-throw", name: "Rock Throw", type: "rock", power: 50, accuracy: 90, target: "enemy" },
  "rock-slide": { id: "rock-slide", name: "Rock Slide", type: "rock", power: 75, accuracy: 90, target: "enemy" },
  "gust": { id: "gust", name: "Gust", type: "flying", power: 40, accuracy: 100, target: "enemy" },
  "poison-sting": { id: "poison-sting", name: "Poison Sting", type: "poison", power: 15, accuracy: 100, target: "enemy" },
  // wild-variety moves covering the types the generic fallback can't reach
  peck: { id: "peck", name: "Peck", type: "flying", power: 35, accuracy: 100, target: "enemy" },
  "bug-bite": { id: "bug-bite", name: "Bug Bite", type: "bug", power: 60, accuracy: 100, target: "enemy" },
  "mud-slap": { id: "mud-slap", name: "Mud-Slap", type: "ground", power: 20, accuracy: 100, target: "enemy" },
  "karate-chop": { id: "karate-chop", name: "Karate Chop", type: "fighting", power: 50, accuracy: 100, target: "enemy" },
  acid: { id: "acid", name: "Acid", type: "poison", power: 40, accuracy: 100, target: "enemy" },
  "string-shot": { id: "string-shot", name: "String Shot", type: "bug", power: 10, accuracy: 100, target: "enemy" },
  // status moves: poison & paralysis make the wild-type variety change battle state
  "poison-powder": { id: "poison-powder", name: "Poison Powder", type: "poison", power: 0, accuracy: 75, target: "enemy", status: "poison" },
  "stun-spore": { id: "stun-spore", name: "Stun Spore", type: "grass", power: 0, accuracy: 75, target: "enemy", status: "paralysis" },
  "thunder-wave": { id: "thunder-wave", name: "Thunder Wave", type: "electric", power: 0, accuracy: 90, target: "enemy", status: "paralysis" },
  sludge: { id: "sludge", name: "Sludge", type: "poison", power: 65, accuracy: 100, target: "enemy", status: "poison" },
  // psychic moves for Celebi & future mythicals
  confusion: { id: "confusion", name: "Confusion", type: "psychic", power: 50, accuracy: 100, target: "enemy" },
  "psybeam": { id: "psybeam", name: "Psybeam", type: "psychic", power: 65, accuracy: 100, target: "enemy" },
  "ancient-power": { id: "ancient-power", name: "Ancient Power", type: "rock", power: 60, accuracy: 100, target: "enemy" },
  // v1.8.0: legendary birds & Mewtwo signature moves (ice joins the chart)
  "ice-beam": { id: "ice-beam", name: "Ice Beam", type: "ice", power: 90, accuracy: 100, target: "enemy" },
  "wing-attack": { id: "wing-attack", name: "Wing Attack", type: "flying", power: 60, accuracy: 100, target: "enemy" },
  // v1.9.0: ghost coverage for Agatha's Gengar (the only ghost specialist)
  "shadow-ball": { id: "shadow-ball", name: "Shadow Ball", type: "ghost", power: 80, accuracy: 100, target: "enemy" },
};

const STARTER_MOVES: Record<string, string[]> = {
  bulbasaur: ["tackle", "vine-whip", "leech-seed", "sleep-powder"],
  charmander: ["scratch", "ember", "fire-fang", "flame-charge"],
  squirtle: ["tackle", "water-gun", "bite", "withdraw"],
};

/**
 * Evolved starter forms inherit their base form's signature learnset — an
 * Ivysaur keeps Bulbasaur's vine moves, Charizard keeps Charmander's embers,
 * etc. Without this an evolved starter falls back to plain Tackle.
 */
const STARTER_BASE: Record<string, string> = {
  ivysaur: "bulbasaur",
  venusaur: "bulbasaur",
  charmeleon: "charmander",
  charizard: "charmander",
  wartortle: "squirtle",
  blastoise: "squirtle",
};

/** Evolutions only need to be defined for the starter chains. */
export const EVOLUTIONS: Record<string, { to: string; atLevel: number }> = {
  bulbasaur: { to: "ivysaur", atLevel: 16 },
  ivysaur: { to: "venusaur", atLevel: 32 },
  charmander: { to: "charmeleon", atLevel: 16 },
  charmeleon: { to: "charizard", atLevel: 36 },
  squirtle: { to: "wartortle", atLevel: 16 },
  wartortle: { to: "blastoise", atLevel: 36 },
};

const STAB_FALLBACK: Record<TypeName, string> = {
  normal: "tackle",
  grass: "vine-whip",
  fire: "ember",
  water: "water-gun",
  electric: "thunder-shock",
  bug: "tackle",
  poison: "poison-sting",
  ground: "rock-throw",
  rock: "rock-throw",
  flying: "gust",
  ghost: "tackle",
  fighting: "tackle",
  ice: "ice-beam",
  psychic: "confusion",
};

const CHAMPION_MOVES: Record<string, string[]> = {
  onix: ["rock-throw", "rock-slide", "tackle"],
  staryu: ["water-gun", "tackle", "quick-attack"],
  raichu: ["thunder-shock", "thunderbolt", "thunder-wave", "quick-attack"],
  vileplume: ["vine-whip", "leech-seed", "sleep-powder", "poison-powder"],
  weezing: ["sludge", "poison-sting", "rock-slide", "tackle"],
  rhydon: ["rock-throw", "rock-slide", "tackle"],
  kadabra: ["confusion", "psybeam", "quick-attack", "tackle"],
  arcanine: ["ember", "fire-fang", "flame-charge", "quick-attack"],
};

/**
 * Per-species wild learnsets (3–4 moves each) so every encounter has real
 * type variety instead of the generic STAB+tackle fallback. Keyed by the
 * lowercase species id; every id must resolve in MOVES (validated by tests).
 */
export const WILD_MOVES: Record<string, string[]> = {
  pidgey: ["tackle", "gust", "quick-attack", "peck"],
  rattata: ["tackle", "quick-attack", "bite"],
  spearow: ["peck", "gust", "quick-attack"],
  ekans: ["bite", "poison-sting", "acid"],
  pikachu: ["thunder-shock", "thunder-wave", "quick-attack", "scratch"],
  oddish: ["acid", "vine-whip", "leech-seed", "sleep-powder"],
  meowth: ["scratch", "bite", "quick-attack"],
  caterpie: ["string-shot", "bug-bite", "tackle"],
  metapod: ["string-shot", "bug-bite", "tackle"],
  weedle: ["string-shot", "bug-bite", "poison-sting"],
  zubat: ["bite", "gust", "poison-sting", "quick-attack"],
  geodude: ["rock-throw", "mud-slap", "tackle"],
  diglett: ["mud-slap", "scratch", "tackle"],
  "nidoran-f": ["poison-sting", "tackle", "bite", "acid"],
  mankey: ["karate-chop", "scratch", "tackle"],
  growlithe: ["ember", "bite", "quick-attack", "fire-fang"],
  ponyta: ["ember", "quick-attack", "tackle", "flame-charge"],
  tentacool: ["water-gun", "acid", "poison-sting"],
  // Legendary Boss learnsets (v1.8.0) — signature kits, no generic fallback
  articuno: ["ice-beam", "wing-attack", "gust", "peck"],
  zapdos: ["thunderbolt", "thunder-wave", "wing-attack", "quick-attack"],
  moltres: ["ember", "fire-fang", "wing-attack", "flame-charge"],
  mewtwo: ["psybeam", "confusion", "thunderbolt", "ice-beam"],
  // Beach biome water species (v1.8.0)
  staryu: ["water-gun", "psybeam", "tackle", "quick-attack"],
  psyduck: ["water-gun", "scratch", "confusion", "peck"],
  horsea: ["water-gun", "peck", "tackle", "quick-attack"],
  goldeen: ["water-gun", "peck", "tackle", "quick-attack"],
  magikarp: ["tackle", "quick-attack", "water-gun"],
  // League biome species (v1.8.0)
  raichu: ["thunder-shock", "thunderbolt", "quick-attack", "thunder-wave"],
  snorlax: ["tackle", "bite", "ancient-power", "rock-slide"],
  hitmonlee: ["karate-chop", "rock-slide", "mud-slap", "quick-attack"],
  machoke: ["karate-chop", "rock-throw", "mud-slap", "tackle"],
  gyarados: ["bite", "water-gun", "ancient-power", "ice-beam"],
  // v1.9.0: friendship-evolution targets (earned via the bond system)
  persian: ["scratch", "bite", "quick-attack"],
  gloom: ["acid", "vine-whip", "leech-seed", "sleep-powder"],
  golbat: ["bite", "gust", "poison-sting", "wing-attack"],
  nidorina: ["poison-sting", "tackle", "bite"],
  "nidoran-m": ["poison-sting", "tackle", "bite"],
  nidorino: ["poison-sting", "karate-chop", "tackle"],
  machop: ["karate-chop", "rock-throw", "tackle"],
  machamp: ["karate-chop", "rock-slide", "rock-throw", "tackle"],
  rapidash: ["ember", "flame-charge", "quick-attack", "fire-fang"],
  // v1.9.0: Elite Four & League Champion signature kits
  dewgong: ["ice-beam", "water-gun", "wing-attack", "peck"],
  gengar: ["shadow-ball", "sludge", "confusion", "psybeam"],
  aerodactyl: ["wing-attack", "rock-slide", "rock-throw", "bite"],
  charizard: ["ember", "fire-fang", "flame-charge", "wing-attack"],
};

export function starterMovesFor(speciesId: string): MoveDef[] {
  // Evolved starter forms map back to their base form so their signature
  // movepool survives evolution (see STARTER_BASE above).
  const baseId = STARTER_BASE[speciesId] ?? speciesId;
  const ids = STARTER_MOVES[baseId] ?? ["tackle"];
  return ids.map((id) => MOVES[id]).filter(Boolean);
}

export function defaultMovesFor(speciesId: string, championId?: string): MoveDef[] {
  if (championId) {
    // CHAMPION_MOVES is keyed by the boss's SPECIES id ("onix"), so resolve
    // the champion id ("brock") to its species before looking up the pool.
    const champ = CHAMPIONS.find((c) => c.id === championId);
    const bossSpecies = champ ? champ.speciesId : championId;
    if (CHAMPION_MOVES[bossSpecies]) {
      return CHAMPION_MOVES[bossSpecies].map((id) => MOVES[id]).filter(Boolean);
    }
  }
  // Wild species with a real learnset use it; anything else falls back to the
  // generic STAB + tackle pair so no species ever fights without moves.
  const learnset = WILD_MOVES[speciesId];
  if (learnset) {
    return learnset.map((id) => MOVES[id]).filter(Boolean);
  }
  const def = getSpecies(speciesId);
  const stab = STAB_FALLBACK[def.types[0]] ?? "tackle";
  const ids = [stab, "tackle"];
  return ids.map((id) => MOVES[id]).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Type chart (offensive multiplier, defender side lists each type once)
// ---------------------------------------------------------------------------

export const TYPE_CHART: Record<TypeName, Partial<Record<TypeName, number>>> = {
  normal: { rock: 0.5, ghost: 0 },
  grass: { fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, water: 2, ground: 2, rock: 2, ice: 0.5 },
  fire: { fire: 0.5, water: 0.5, rock: 0.5, grass: 2, bug: 2, ice: 2 },
  water: { water: 0.5, grass: 0.5, fire: 2, ground: 2, rock: 2, ice: 0.5 },
  electric: { electric: 0.5, grass: 0.5, ground: 0, water: 2, flying: 2 },
  bug: { fire: 0.5, grass: 2, poison: 2, flying: 0.5, ghost: 0.5, fighting: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5 },
  ground: { fire: 2, electric: 2, poison: 2, rock: 2, grass: 0.5, bug: 0.5, flying: 0, ice: 2 },
  rock: { fire: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, ice: 2 },
  flying: { grass: 2, bug: 2, fighting: 2, electric: 0.5, rock: 0.5, ice: 2 },
  ghost: { normal: 0 },
  fighting: { normal: 2, rock: 2, ghost: 0, ice: 2 },
  ice: { fire: 0.5, water: 0.5, ice: 0.5, grass: 2, ground: 2, flying: 2 },
  psychic: { poison: 2, fighting: 2, psychic: 0.5, ghost: 0.5 },
};

// ---------------------------------------------------------------------------
// Biomes, time cycle, champions, shop, items
// ---------------------------------------------------------------------------

export const BIOMES: BiomeDef[] = [
  {
    id: "plains",
    name: "Route 1",
    pool: [
      "pidgey",
      "rattata",
      "caterpie",
      "oddish",
      "meowth",
      "spearow",
      // post-variety additions: the species added for the wild-type pass
      "nidoran-f",
      "mankey",
      "growlithe",
      "ponyta",
    ],
    ground: "#b5834a",
    grass: "#4caf50",
    accent: "#2e7d32",
    hill: "#8bc34a",
    soil: "#8a5a2b",
    prop: "#ffd54f",
    prop2: "#fff59d",
  },
  {
    id: "forest",
    name: "Viridian Forest",
    pool: ["pikachu", "metapod", "weedle", "oddish", "caterpie"],
    ground: "#8a5a2b",
    grass: "#3a8f3a",
    accent: "#1f5e1f",
    hill: "#2e7d32",
    soil: "#6e4520",
    prop: "#ff7043",
    prop2: "#ffd0a8",
  },
  {
    id: "cave",
    name: "The Cave",
    pool: ["zubat", "geodude", "diglett", "zubat"],
    ground: "#6e6e78",
    grass: "#4a4a55",
    accent: "#33333d",
    hill: "#565660",
    soil: "#4b4b55",
    prop: "#4fc3f7",
    prop2: "#b3e5fc",
  },
  {
    id: "beach",
    name: "Seafoam Beach",
    pool: ["staryu", "tentacool", "psyduck", "horsea", "goldeen", "magikarp"],
    ground: "#e8d6a8",
    grass: "#d9c98f",
    accent: "#c9b878",
    hill: "#a8c8e8",
    soil: "#b7a76f",
    prop: "#6ec4f8",
    prop2: "#e3f2fd",
  },
  {
    id: "league",
    name: "Indigo League",
    pool: ["raichu", "snorlax", "hitmonlee", "growlithe", "machoke", "gyarados"],
    ground: "#8d7fae",
    grass: "#7a6ea3",
    accent: "#5f5494",
    hill: "#4a3f80",
    soil: "#6e6399",
    prop: "#ffd54f",
    prop2: "#fff59d",
  },
];

export const ROCKET_POOL = ["rattata", "ekans", "zubat", "mankey"];

/** Legendary Bosses (v1.8.0) — spawn only during Eclipse / Aurora events. */
export const LEGENDS: string[] = ["articuno", "zapdos", "moltres", "mewtwo"];

/**
 * Indigo League gauntlet (v1.9.0): the four Elite Four members plus the
 * League Champion. Unlocked after all 8 badges; the rotation advances with
 * leagueIndex (member = LEAGUE[leagueIndex % LEAGUE.length]), so a cleared
 * League rematches from Lorelei with higher levels.
 */
export const LEAGUE: LeagueMemberDef[] = [
  { id: "lorelei", name: "Lorelei", title: "Elite Four · Ice", speciesId: "dewgong", color: "#4dd0e1" },
  { id: "bruno", name: "Bruno", title: "Elite Four · Fighting", speciesId: "machamp", color: "#ff7043" },
  { id: "agatha", name: "Agatha", title: "Elite Four · Ghost", speciesId: "gengar", color: "#9b59b6" },
  { id: "lance", name: "Lance", title: "Elite Four · Dragon", speciesId: "aerodactyl", color: "#3d5afe" },
  { id: "blue", name: "Blue", title: "League Champion", speciesId: "charizard", color: "#ffd54f" },
];

/** Route Trainer species (v1.9.0) — random trainers on the routes. */
export const TRAINER_POOL: string[] = [
  "pidgey",
  "rattata",
  "spearow",
  "ekans",
  "mankey",
  "geodude",
  "nidoran-f",
  "growlithe",
  "ponyta",
  "oddish",
];

/** Route Trainer display names (v1.9.0). */
export const TRAINER_NAMES: string[] = [
  "Youngster",
  "Lass",
  "Bug Catcher",
  "Hiker",
  "Swimmer",
  "Psychic",
  "Camper",
  "Picnicker",
  "Juggler",
  "Tamer",
];

/** Rival species (v1.9.0) — the rival's rotating team, a cut above trainers. */
export const RIVAL_POOL: string[] = ["pikachu", "growlithe", "ponyta", "ekans", "mankey"];

/**
 * Friendship evolutions (v1.9.0): level is irrelevant — the bond decides.
 * Targets fill gaps in the obtainable roster (no stones/trades in a banner).
 */
export const FRIENDSHIP_EVOLUTIONS: Record<string, { to: string; atHappiness: number }> = {
  pikachu: { to: "raichu", atHappiness: 150 },
  growlithe: { to: "arcanine", atHappiness: 150 },
  meowth: { to: "persian", atHappiness: 150 },
  oddish: { to: "gloom", atHappiness: 150 },
  gloom: { to: "vileplume", atHappiness: 170 },
  zubat: { to: "golbat", atHappiness: 130 },
  machop: { to: "machoke", atHappiness: 120 },
  machoke: { to: "machamp", atHappiness: 160 },
  ponyta: { to: "rapidash", atHappiness: 150 },
  "nidoran-f": { to: "nidorina", atHappiness: 150 },
  "nidoran-m": { to: "nidorino", atHappiness: 150 },
};

/**
 * Egg species pool (v1.8.0). Walking hatches a random member; legendaries
 * are deliberately absent (they come from weather events) but the rest are
 * mid-rare Kanto species you'd otherwise hunt for a while.
 */
export const EGG_POOL: [string, number][] = [
  ["clefairy", 10],
  ["jigglypuff", 10],
  ["vulpix", 10],
  ["abra", 10],
  ["growlithe", 10],
  ["ponyta", 10],
  ["eevee", 9],
  ["porygon", 8],
  ["chansey", 7],
  ["scyther", 6],
  ["pinsir", 6],
  ["lapras", 5],
  ["kangaskhan", 5],
  ["aerodactyl", 4],
  ["dratini", 4],
  ["snorlax", 3],
  ["ditto", 3],
];

/** The three Pokémon Center care services. */
export const CENTER_SERVICES: Record<
  CenterServiceId,
  { id: CenterServiceId; name: string; desc: string; price: number }
> = {
  team: { id: "team", name: "Heal Team", desc: "Restores the whole party's HP for free.", price: 0 },
  pc: { id: "pc", name: "Full PC Care", desc: "Heals your team AND every boxed Pokémon.", price: 150 },
  revive: { id: "revive", name: "Revive & Restore", desc: "Revives fainted party members and fully heals all.", price: 400 },
};

/** Market pricing formula knobs for selling/listing Pokémon. */
export const MARKET_TUNING = {
  basePrice: 50,
  pricePerLevel: 12,
  shinyBonus: 500,
  /** Buy-back factor when the local market buys one of your Pokémon. */
  localSellFactor: 0.75,
};

export const CHAMPIONS: ChampionDef[] = [
  { id: "brock", name: "Brock", title: "Gym Leader · Pewter", speciesId: "onix", badge: "Boulder Badge", color: "#8d6e63" },
  { id: "misty", name: "Misty", title: "Gym Leader · Cerulean", speciesId: "staryu", badge: "Cascade Badge", color: "#4fc3f7" },
  { id: "surge", name: "Lt. Surge", title: "Gym Leader · Vermilion", speciesId: "raichu", badge: "Thunder Badge", color: "#ffd54f" },
  { id: "erika", name: "Erika", title: "Gym Leader · Celadon", speciesId: "vileplume", badge: "Rainbow Badge", color: "#3ddc3d" },
  { id: "koga", name: "Koga", title: "Gym Leader · Fuchsia", speciesId: "weezing", badge: "Soul Badge", color: "#9b59b6" },
  { id: "sabrina", name: "Sabrina", title: "Gym Leader · Saffron", speciesId: "kadabra", badge: "Marsh Badge", color: "#f48fb1" },
  { id: "blaine", name: "Blaine", title: "Gym Leader · Cinnabar", speciesId: "arcanine", badge: "Volcano Badge", color: "#ff7043" },
  { id: "giovanni", name: "Giovanni", title: "Gym Leader · Viridian", speciesId: "rhydon", badge: "Earth Badge", color: "#8d6e63" },
];

export const ITEMS: Record<string, ItemDef> = {
  pokeball: { id: "pokeball", name: "Poké Ball", desc: "Standard capture ball.", price: 200, ballMult: 1 },
  greatball: { id: "greatball", name: "Great Ball", desc: "Better catch rate.", price: 600, ballMult: 1.5 },
  berry: { id: "berry", name: "Oran Berry", desc: "Restores 20 HP instantly.", price: 300, healFlat: 20 },
  sitrus: { id: "sitrus", name: "Sitrus Berry", desc: "Restores 25% of max HP.", price: 500, healPct: 0.25 },
  potion: { id: "potion", name: "Potion", desc: "Restores 20 HP.", price: 300, healFlat: 20 },
  hyperpotion: { id: "hyperpotion", name: "Hyper Potion", desc: "Restores 200 HP.", price: 1200, healFlat: 200 },
  // v1.8.0: a purchasable Mystery Egg — walking hatches it into a rare species
  egg: { id: "egg", name: "Mystery Egg", desc: "Hatches while you walk!", price: 800 },
};

export const GROUND_ITEM_WEIGHTS: [string, number][] = [
  ["berry", 0.4],
  ["pokeball", 0.35],
  ["sitrus", 0.15],
  ["potion", 0.1],
  ["egg", 0.06],
];

// ---------------------------------------------------------------------------
// Game tuning knobs
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Release version — shown on the landing page, the in-game Save tab, and the
// packaged desktop installer filename (kept in sync with desktop/package.json).
// ---------------------------------------------------------------------------

export const GAME_VERSION = "1.9.0";

export const TUNING = {
  bannerHeight: 60,
  /** The banner's day sky — a bright retro pixel blue (#6ec4f8). The old
   *  neon-green chroma key is long gone: the browser paints this blue sky,
   *  and the desktop shell window is truly transparent (see desktop/).
   *  `neonGreen` remains only as a legacy constant pinned by tests. */
  skyBlue: "#6ec4f8",
  neonGreen: "#00ff00",
  battleIntervalMs: 2000,
  // Wild encounters roll a completely random delay inside this window each
  // time one ends, so encounters never tick like clockwork.
  encounterMinMs: 5000,
  encounterMaxMs: 20000,
  xpToNext: (level: number) => Math.max(30, level * 30),
  xpPerWildBase: 30,
  moneyPerWild: 10,
  moneyPerRocketBase: 1500,
  moneyPerChampion: 3000,
  /** Legendary Boss rewards (v1.8.0) — worth the rare weather event. */
  moneyPerLegendary: 1500,
  legendaryXpMult: 2,
  championXpMult: 2.5,
  rocketXpMult: 1.2,
  benchXpShare: 0.5,
  shinyChance: 0.01,
  rocketChance: 0.05,
  critChance: 1 / 16,
  minDamage: 1,
  sleepWakeChance: 0.5,
  leechDrainFraction: 1 / 8,
  /** Chance a paralyzed attacker is fully paralyzed and skips its turn. */
  paralysisSkipChance: 0.25,
  /** Fraction of max HP lost to poison each round. */
  poisonTickFraction: 1 / 8,
  catchMilestoneCount: 10,
  catchMilestoneBonus: 0.1,
  xpMilestoneStep: 20,
  biomeStepSize: 500,
  cycleMs: 5 * 60 * 1000,
  badgeDamageBonus: 0.05,
  /** Encounter-frequency multiplier per weather (rain draws out wild Pokémon). */
  weatherEncounterMult: {
    clear: 1,
    rain: 0.8,
    snow: 0.9,
    starry: 1,
    eclipse: 1.05,
    aurora: 1.05,
  } as Record<WeatherKind, number>,
  maxLevel: 100,
  teamMax: 6,
  expShareBench: 0.5,
  /** Same-Type Attack Bonus — matching the attacker's type deals 1.5×. */
  stabMult: 1.5,
  /** Egg incubation window (steps walked), rolled per egg (v1.8.0). */
  eggStepsMin: 300,
  eggStepsMax: 600,
  /** Route Trainer & Rival encounter chances (v1.9.0). Rolled inside the same
   *  single encounter check as Team Rocket, so the RNG stream is unchanged: a
   *  roll < rocketChance is a Rocket, < +trainerChance a Trainer, < +rivalChance
   *  the Rival, otherwise a wild Pokémon. */
  trainerChance: 0.12,
  rivalChance: 0.02,
  moneyPerTrainer: 80,
  moneyPerRival: 250,
  trainerXpMult: 1.4,
  rivalXpMult: 1.8,
  /** Elite Four & League Champion purses (v1.9.0). */
  moneyPerElite: 5000,
  moneyPerLeagueChampion: 8000,
  eliteXpMult: 3,
  /** Happiness / friendship knobs (v1.9.0). Ratings are 0–255. */
  happinessStart: 40,
  happinessWinLeader: 2,
  happinessWinBench: 1,
  happinessHeal: 5,
  /** Steps walked per +1 happiness for the leader. */
  happinessStepInterval: 150,
  /** Tier thresholds. */
  happinessFriendly: 50,
  happinessHappy: 100,
  happinessBest: 200,
  /** Tier bonuses. */
  happinessXpFriendly: 0.05,
  happinessXpBest: 0.1,
  happinessDmgHappy: 0.05,
  happinessDmgBest: 0.1,
};

export const UI = {
  bannerHeight: 60,
  skyBlue: "#6ec4f8",
  /** Legacy chroma-key color — kept only for PIXEL_UI parity tests. */
  neonGreen: "#00ff00",
  fontPixel: '"Press Start 2P", ui-monospace, monospace',
  spriteBase: "https://play.pokemonshowdown.com/sprites/ani",
  bgWhite: "#ffffff",
  ink: "#111111",
  panelYellow: "#ffde00",
  panelRed: "#ff4d4d",
  panelBlue: "#2d6cff",
  panelGreen: "#3ddc3d",
};
