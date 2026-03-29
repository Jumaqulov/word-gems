import { getLevelConfig, WordDifficulty, WorldId } from './LevelSystem';

type WorldDictionary = Record<WordDifficulty, string[]>;

export const WORLD_WORD_DATABASE: Record<WorldId, WorldDictionary> = {
  forest: {
    easy: [
      'TREE', 'LEAF', 'MOSS', 'FERN', 'BARK', 'PINE', 'DEER', 'OWL', 'NEST', 'VINE', 'BLOOM', 'ROOT',
      'GLEN', 'ACORN', 'FOX', 'RIVER', 'BERRY', 'TRAIL',
    ],
    medium: [
      'GROVE', 'CEDAR', 'MAPLE', 'THICKET', 'MEADOW', 'RABBIT', 'CANOPY', 'BROOK', 'BADGER', 'SPROUT',
      'TIMBER', 'WILLOW', 'BRAMBLE', 'PETAL', 'MUSHROOM', 'HICKORY', 'SAPLING', 'WOODLAND',
    ],
    hard: [
      'EVERGREEN', 'WILDFLOWER', 'UNDERGROWTH', 'LUMBERJACK', 'SONGBIRD', 'WATERFALL', 'HEARTWOOD',
      'BLACKBERRY', 'BIRCHWOOD', 'FIREFLIES', 'WOODPECKER', 'MOONLIT',
    ],
  },
  ocean: {
    easy: [
      'WAVE', 'TIDE', 'REEF', 'KELP', 'SEAL', 'GULL', 'SHELL', 'FOAM', 'SURF', 'DEEP', 'PEARL', 'CORAL',
      'SHOAL', 'WHALE', 'SPRAY', 'OAR', 'COVE', 'TROUT',
    ],
    medium: [
      'LAGOON', 'ANCHOR', 'SEABED', 'DOLPHIN', 'MARLIN', 'CURRENT', 'DRIFT', 'TURTLE', 'HARBOR', 'SQUID',
      'SEAHORSE', 'TYPHOON', 'ABYSS', 'CLAMOR', 'SEAGLASS', 'WHIRL', 'TIDAL', 'SHIPWRECK',
    ],
    hard: [
      'JELLYFISH', 'STARFISH', 'UNDERTOW', 'LIGHTHOUSE', 'CATAMARAN', 'WATERLINE', 'BLUEWHALE',
      'SALTWATER', 'STORMTIDE', 'MOONCURRENT', 'OCEANIC', 'BARNACLES',
    ],
  },
  space: {
    easy: [
      'STAR', 'MOON', 'MARS', 'VOID', 'NOVA', 'ORBIT', 'COMET', 'ASTRO', 'COSMOS', 'SOLAR', 'LUNAR', 'RING',
      'RADAR', 'SKY', 'ROVER', 'ION', 'ECHO', 'PULSE',
    ],
    medium: [
      'NEBULA', 'GALAXY', 'SATURN', 'METEOR', 'QUASAR', 'ROCKET', 'GRAVITY', 'ECLIPSE', 'STARDUST', 'COSMIC',
      'ZENITH', 'PLANET', 'SHUTTLE', 'ASTEROID', 'MODULE', 'VECTOR', 'PULSAR', 'STELLAR',
    ],
    hard: [
      'SUPERNOVA', 'CONSTELLATION', 'COSMONAUT', 'TELESCOPE', 'HYPERDRIVE', 'INTERSTELLAR', 'BLACKHOLE',
      'SPACEPORT', 'WORMHOLE', 'ATMOSPHERE', 'MOONSTONE', 'STARLIGHT',
    ],
  },
  castle: {
    easy: [
      'KING', 'CROWN', 'VAULT', 'WALL', 'ARCH', 'BELL', 'MOAT', 'GATE', 'PAGE', 'LORD', 'ROOK', 'BLADE',
      'SQUIRE', 'TOWER', 'BANNER', 'SEAL', 'HALL', 'DRUM',
    ],
    medium: [
      'KNIGHT', 'THRONE', 'PORTAL', 'KEEPER', 'ARMORY', 'HERALD', 'SCEPTER', 'CASTLE', 'TURRET', 'BAILEY',
      'CHAMBER', 'WARDEN', 'BROADSWORD', 'COURT', 'RAMPART', 'LANTERN', 'CITADEL', 'REGENT',
    ],
    hard: [
      'FORTRESS', 'STONEKEEP', 'BATTLEMENT', 'TREBUCHET', 'ROYALGUARD', 'BANQUET', 'DRAWBRIDGE',
      'WATCHTOWER', 'HIGHBORN', 'CANDLEHALL', 'IRONCLAD', 'GRANDHALL',
    ],
  },
  magic: {
    easy: [
      'RUNE', 'WAND', 'SPELL', 'ORB', 'ELIXIR', 'CHARM', 'GLYPH', 'MYTH', 'MANA', 'SIGIL', 'HEX', 'WISP',
      'MAGE', 'TOME', 'EMBER', 'FAE', 'SPARK', 'VEIL',
    ],
    medium: [
      'POTION', 'ARCANE', 'ENCHANT', 'CAULDRON', 'RUNESTONE', 'FAMILIAR', 'PHANTOM', 'RITUAL', 'SORCERY', 'TOTEM',
      'WIZARD', 'BROOM', 'STARFIRE', 'AMULET', 'MIRROR', 'CHANT', 'MAGISTER', 'MYSTIC',
    ],
    hard: [
      'ALCHEMY', 'SPELLBOOK', 'MOONCHARM', 'DRAGONFLAME', 'SORCERER', 'HEXSTONE', 'STARSHARD',
      'LUMINARIA', 'TIMETWIST', 'CELESTIAL', 'MOONWELL', 'ARCANIST',
    ],
  },
  ice: {
    easy: [
      'FROST', 'SNOW', 'ICE', 'GLINT', 'SLED', 'CHILL', 'GLASS', 'CRAG', 'COLD', 'FLAKE', 'MINT', 'HAIL',
      'BLUE', 'SHIVER', 'DRIFT', 'RIME', 'MIST', 'SHARD',
    ],
    medium: [
      'GLACIER', 'BLIZZARD', 'ICICLE', 'TUNDRA', 'AURORA', 'ICEBERG', 'FROZEN', 'SNOWCAP', 'WHITEOUT', 'CAVERN',
      'SNOWDRIFT', 'POLAR', 'HUSKY', 'CRYSTAL', 'FROSTBITE', 'ICEFALL', 'WINTER', 'COLDWAVE',
    ],
    hard: [
      'AVALANCHE', 'PERMAFROST', 'MOONGLACIER', 'SNOWSTORM', 'SHATTERICE', 'SILVERFROST', 'ICEBOUND',
      'CRYSTALINE', 'WINTERTIDE', 'FROSTLINE', 'ICECASTLE', 'POLARLIGHT',
    ],
  },
  desert: {
    easy: [
      'DUNE', 'SAND', 'OASIS', 'SUN', 'HEAT', 'FALCON', 'DATES', 'GOLD', 'MESA', 'PALM', 'SCARAB', 'CAMEL',
      'CAVE', 'MIRAGE', 'TRACK', 'DUST', 'GLOW', 'AMBER',
    ],
    medium: [
      'TEMPLE', 'CANYON', 'SCORCH', 'SUNSET', 'VULTURE', 'CARAVAN', 'COYOTE', 'MONSOON', 'RELIC', 'PYRAMID',
      'SANDSTONE', 'DROUGHT', 'SUNDIAL', 'GEYSER', 'BLAZE', 'HORIZON', 'QUICKSAND', 'SUNSTONE',
    ],
    hard: [
      'SANDSTORM', 'OBELISK', 'SUNCHASER', 'GOLDENHOUR', 'HEATWAVE', 'WANDERER', 'MIRAGEWAY',
      'ANCIENTRUIN', 'DUSTTRAIL', 'EMBERDUNE', 'STAROASIS', 'MOONTEMPLE',
    ],
  },
  volcano: {
    easy: [
      'LAVA', 'ASH', 'HEAT', 'MAGMA', 'EMBER', 'BASALT', 'CRATER', 'FUME', 'SMOKE', 'FLARE', 'SCORIA', 'SPARK',
      'VENT', 'GLOW', 'RIDGE', 'CINDER', 'SULFUR', 'STEAM',
    ],
    medium: [
      'VOLCANO', 'ERUPTION', 'OBSIDIAN', 'MOLTEN', 'FISSURE', 'CHARCOAL', 'FIREPEAK', 'LAVAFLOW', 'BLAZE', 'CALDERA',
      'IGNEOUS', 'THERMAL', 'PYROCLAST', 'REDSTONE', 'MAGMATIC', 'HEATWAVE', 'SMOLDER', 'BRIMSTONE',
    ],
    hard: [
      'AFTERGLOW', 'ASHCLOUD', 'FIRESTORM', 'LAVATUNNEL', 'VOLCANIC', 'SCORCHED', 'CINDERCONE', 'MAGMAFALL',
      'RIFTSTONE', 'ASHFIELD', 'FIRELIGHT', 'SMOKEPLUME',
    ],
  },
  sky: {
    easy: [
      'SKY', 'CLOUD', 'BREEZE', 'GUST', 'WING', 'BIRD', 'DAWN', 'SUN', 'GLOW', 'AIR', 'SOAR', 'GLIDE',
      'LIGHT', 'CIRRUS', 'HALO', 'FLOAT', 'DOVE', 'HAZE',
    ],
    medium: [
      'HORIZON', 'THUNDER', 'FEATHER', 'SKYLINE', 'AIRSTREAM', 'SUNBEAM', 'UPDRAFT', 'SUNRISE', 'DAYBREAK', 'WINDSONG',
      'SKYLARK', 'DRIFTING', 'MOONRISE', 'STARLING', 'GLIDER', 'NIMBUS', 'SKYSCAPE', 'CLOUDTOP',
    ],
    hard: [
      'AEROLIGHT', 'HOVERWING', 'STARGAZE', 'WHITECLOUD', 'SKYBRIDGE', 'RAINSWEEP', 'WINDTRAIL', 'BLUEHAVEN',
      'SUNSHOWER', 'SKYDANCER', 'HIGHNOON', 'CLOUDLINE',
    ],
  },
  crystal: {
    easy: [
      'GEM', 'CRYSTAL', 'PRISM', 'GLOW', 'CAVE', 'SHARD', 'ECHO', 'VEIN', 'SPARK', 'STONE', 'GLINT', 'GEODE',
      'QUARTZ', 'DRUSE', 'CAVERN', 'FACET', 'LUSTER', 'MINERAL',
    ],
    medium: [
      'AMETHYST', 'SAPPHIRE', 'MINESHAFT', 'LAMPLIGHT', 'GLIMMER', 'GEMSTONE', 'REFRACT', 'MOONSTONE', 'PRISMATIC', 'STALACTITE',
      'STALAGMITE', 'GROTTO', 'SHIMMER', 'LODESTONE', 'GEMCAVERN', 'FLICKER', 'CAVERNOUS', 'SPARKLE',
    ],
    hard: [
      'DIAMOND', 'STARQUARTZ', 'PRISMLIGHT', 'GLOWSTONE', 'SHARDLIGHT', 'ECHOCAVERN', 'GEMCLUSTER', 'CAVEGLASS',
      'REFLECTION', 'SPARKMINE', 'HIDDENVEIN', 'LUMENROCK',
    ],
  },
  shadow: {
    easy: [
      'SHADE', 'DUSK', 'NIGHT', 'GLOOM', 'ECLIPSE', 'UMBRA', 'VEIL', 'RAVEN', 'CLOAK', 'WHISPER', 'NOIR', 'MOON',
      'SHIVER', 'WRAITH', 'FOG', 'SILENCE', 'MIST', 'GHOST',
    ],
    medium: [
      'SHADOW', 'TWILIGHT', 'PHANTOM', 'MOONLIT', 'NIGHTFALL', 'DARKNESS', 'SILHOUETTE', 'EERIE', 'MIDNIGHT', 'HUSHED',
      'LANTERN', 'HOLLOW', 'AFTERDARK', 'VELVET', 'MOONSHADE', 'BLACKOUT', 'SHROUDED', 'STARLESS',
    ],
    hard: [
      'SHADOWFORM', 'NIGHTVEIL', 'MOONGLOW', 'GLOAMING', 'WITCHHOUR', 'DARKWATER', 'SHADEWALK', 'WHISPERED',
      'DUSKBOUND', 'NOCTURNE', 'GRIMLIGHT', 'MOONSHARD',
    ],
  },
  clockwork: {
    easy: [
      'GEAR', 'CLOCK', 'SPRING', 'BRASS', 'STEAM', 'BOLT', 'COG', 'TICK', 'WHIRL', 'LEVER', 'CHAIN', 'WHEEL',
      'PISTON', 'GLINT', 'METAL', 'CHIME', 'VALVE', 'AXLE',
    ],
    medium: [
      'ENGINE', 'MACHINE', 'BALANCE', 'PENDULUM', 'TURNKEY', 'BLUEPRINT', 'WORKSHOP', 'TINKER', 'CIRCUIT', 'SPROCKET',
      'COMPASS', 'AUTOMATA', 'MAINSPRING', 'CLOCKFACE', 'RATCHET', 'TIMEKEEP', 'MECHANIC', 'GEARBOX',
    ],
    hard: [
      'HOURGLASS', 'CLOCKWORK', 'WINDINGKEY', 'STEELHEART', 'COPPERGEAR', 'BRASSWORK', 'TICKTOCK', 'IRONPULSE',
      'GEARTRAIN', 'TIMEPIECE', 'SPRINGLOCK', 'AUTOMATON',
    ],
  },
};

export function selectWordsForLevel(level: number, usedWords: string[]): string[] {
  const config = getLevelConfig(level);
  const selected: string[] = [];
  const usedSet = new Set(usedWords);
  const counts = allocateDifficultyCounts(config.wordCount, config.difficultyWeights);

  (['easy', 'medium', 'hard'] as WordDifficulty[]).forEach((difficulty) => {
    pickFromWorldPool(config.world.id, difficulty, counts[difficulty], selected, usedSet);
  });

  if (selected.length < config.wordCount) {
    fillFromFallbackPools(config.world.id, config.wordCount - selected.length, selected, usedSet);
  }

  return selected.slice(0, config.wordCount);
}

function allocateDifficultyCounts(totalWords: number, weights: { easy: number; medium: number; hard: number }) {
  const difficulties: WordDifficulty[] = ['easy', 'medium', 'hard'];
  const raw = difficulties.map((difficulty) => ({
    difficulty,
    exact: totalWords * weights[difficulty],
  }));

  const counts = {
    easy: Math.floor(raw[0].exact),
    medium: Math.floor(raw[1].exact),
    hard: Math.floor(raw[2].exact),
  };

  let assigned = counts.easy + counts.medium + counts.hard;
  const remainders = raw
    .map(({ difficulty, exact }) => ({ difficulty, remainder: exact - Math.floor(exact) }))
    .sort((a, b) => b.remainder - a.remainder);

  for (const item of remainders) {
    if (assigned >= totalWords) break;
    counts[item.difficulty] += 1;
    assigned += 1;
  }

  while (assigned < totalWords) {
    counts.medium += 1;
    assigned += 1;
  }

  return counts;
}

function pickFromWorldPool(
  worldId: WorldId,
  difficulty: WordDifficulty,
  count: number,
  selected: string[],
  usedSet: Set<string>
): void {
  if (count <= 0) return;

  const primaryPool = WORLD_WORD_DATABASE[worldId][difficulty];
  const available = primaryPool.filter((word) => !selected.includes(word) && !usedSet.has(word));
  const reusable = primaryPool.filter((word) => !selected.includes(word));
  const source = available.length >= count ? available : reusable;
  const shuffled = shuffleArray([...source]);

  for (let i = 0; i < count && i < shuffled.length; i++) {
    selected.push(shuffled[i]);
  }
}

function fillFromFallbackPools(
  worldId: WorldId,
  missingCount: number,
  selected: string[],
  usedSet: Set<string>
): void {
  const worldWords = [
    ...WORLD_WORD_DATABASE[worldId].easy,
    ...WORLD_WORD_DATABASE[worldId].medium,
    ...WORLD_WORD_DATABASE[worldId].hard,
  ];

  const worldFallback = worldWords.filter((word) => !selected.includes(word) && !usedSet.has(word));
  const reusableWorldFallback = worldWords.filter((word) => !selected.includes(word));
  const globalFallback = Object.values(WORLD_WORD_DATABASE)
    .flatMap((dictionary) => [...dictionary.easy, ...dictionary.medium, ...dictionary.hard])
    .filter((word) => !selected.includes(word));

  const combined = shuffleArray([
    ...worldFallback,
    ...reusableWorldFallback,
    ...globalFallback,
  ]);

  const targetCount = selected.length + missingCount;
  for (const word of combined) {
    if (selected.length >= targetCount) break;
    if (!selected.includes(word)) selected.push(word);
  }
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
