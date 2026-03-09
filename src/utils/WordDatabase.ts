import { getLevelConfig } from './LevelSystem';

export const WORD_DATABASE = {
  easy: [
    // 3-4 letter words (100+)
    'CAT', 'DOG', 'SUN', 'MOON', 'FISH', 'BIRD', 'TREE', 'STAR',
    'BOOK', 'GAME', 'PLAY', 'LOVE', 'HOME', 'FIRE', 'RAIN', 'SNOW',
    'CAKE', 'BLUE', 'GOLD', 'PINK', 'FROG', 'BEAR', 'LION', 'KING',
    'BALL', 'HAND', 'RING', 'COOL', 'FAST', 'WIND', 'JUMP', 'SWIM',
    'LAKE', 'WAVE', 'SEED', 'LEAF', 'NEST', 'COIN', 'DRUM', 'POEM',
    'FORT', 'MAZE', 'GIFT', 'SILK', 'HERO', 'PEAK', 'GLOW', 'WISH',
    'REEF', 'DUST', 'MIST', 'PINE', 'ROSE', 'KITE', 'ROPE', 'LAMP',
    'DICE', 'HARP', 'JADE', 'OPAL', 'RUBY', 'IRON', 'SHIP', 'WOLF',
    'BARN', 'BEAD', 'BELL', 'BONE', 'BOWL', 'CLAW', 'CRAB', 'CROW',
    'DEER', 'DOVE', 'DUSK', 'FERN', 'FLAG', 'FOAM', 'FORK', 'GATE',
    'GOAT', 'HAZE', 'HILL', 'HOOK', 'IRIS', 'KELP', 'KNOT', 'LARK',
    'LIME', 'LOOM', 'MACE', 'MOTH', 'MULE', 'NOON', 'PEAR', 'PLUM',
    'POND', 'PUMA', 'SAGE', 'SAND', 'SLED', 'TOAD', 'TUBE', 'VINE',
    'WAND', 'YARN', 'YAWN', 'ZEAL', 'ARCH', 'APEX', 'BAND', 'BRIM',
  ],
  medium: [
    // 5-6 letter words (80+)
    'DRAKE', 'DRAGON', 'PLANET', 'OCEAN', 'MUSIC', 'MAGIC',
    'SPACE', 'LIGHT', 'POWER', 'STORM', 'FLAME', 'DREAM',
    'SWORD', 'HEART', 'CLOUD', 'EARTH', 'JEWEL', 'PEARL',
    'GHOST', 'ROBOT', 'CANDY', 'HONEY', 'RIVER', 'TOWER',
    'CROWN', 'SPARK', 'FROST', 'BLOOM', 'STONE', 'EAGLE',
    'CORAL', 'CHARM', 'PRIZE', 'QUEST', 'BLAZE', 'COMET',
    'SURGE', 'REIGN', 'FORGE', 'HAVEN', 'VAPOR', 'LUNAR',
    'SOLAR', 'FLARE', 'ORBIT', 'PRISM', 'NEXUS', 'CREST',
    'TIGER', 'SWIFT', 'BRAVE', 'NOBLE', 'VIVID', 'GRACE',
    'ATLAS', 'VAULT', 'PULSE', 'SHIFT', 'GLEAM', 'TRACE',
    'AMBER', 'BEACH', 'BLADE', 'CABIN', 'CHAIN', 'CLIFF',
    'CRANE', 'DEPTH', 'DREAD', 'EMBER', 'FEAST', 'FLORA',
    'GLYPH', 'GRAIN', 'GROVE', 'IVORY', 'LATCH', 'MARSH',
    'ONYX', 'PLUME', 'RAVEN', 'SHARD', 'STEEL', 'THORN',
    'TORCH', 'UMBRA', 'VIGOR', 'WRAITH', 'SPIRE', 'DELTA',
    'NEBULA', 'ZENITH',
  ],
  hard: [
    // 7+ letter words (60+)
    'DIAMOND', 'THUNDER', 'RAINBOW', 'VOLCANO', 'PHOENIX',
    'MYSTERY', 'WARRIOR', 'EMERALD', 'UNICORN', 'KINGDOM',
    'COMPASS', 'FORTUNE', 'GLACIER', 'HORIZON', 'LANTERN',
    'PENGUIN', 'DOLPHIN', 'PANTHER', 'MAMMOTH', 'TORNADO',
    'CAPTAIN', 'BLOSSOM', 'JOURNEY', 'SPARKLE', 'CRESCENT',
    'WHISPER', 'STARLIT', 'ANCIENT', 'TREASURE', 'CASCADE',
    'EXPLORE', 'HARMONY', 'CRIMSON', 'SAPPHIRE', 'ALCHEMY',
    'ECLIPSE', 'FANTASY', 'TEMPEST', 'CITADEL', 'GRANITE',
    'OBELISK', 'SPECTRUM', 'LABYRINTH', 'SENTINEL',
    'PILGRIM', 'SORCERY', 'TRIDENT', 'CHALICE', 'PEGASUS',
    'AVALANCHE', 'FORTRESS', 'DUNGEON', 'ENCHANT', 'FEATHER',
    'GALLEON', 'HYDRANT', 'INFERNO', 'JAVELIN', 'KNUCKLE',
    'LECTERN', 'MONARCH', 'NUCLEUS', 'ORCHARD', 'PHANTOM',
    'QUARREL', 'RAPTURE', 'SERPENT', 'TRIUMPH', 'BASTION',
  ],
};

export type Difficulty = keyof typeof WORD_DATABASE;

/**
 * Select words for a given level using the LevelSystem config.
 */
export function selectWordsForLevel(level: number, usedWords: string[]): string[] {
  const config = getLevelConfig(level);
  const zone = config.zone;
  const totalWords = config.wordCount;

  // Distribute words among pools
  const pools = zone.wordPool;
  const selected: string[] = [];
  const usedSet = new Set(usedWords);

  if (pools.length === 1) {
    // Single pool — all words from it
    pickFromPool(pools[0], totalWords, selected, usedSet);
  } else if (pools.length === 2) {
    // Two pools — ratio shifts with level progress within zone
    const zoneProgress = zone.levels[1] === zone.levels[0]
      ? 1
      : (level - zone.levels[0]) / (zone.levels[1] - zone.levels[0]);

    // Start with more easy, shift to more hard
    const hardCount = Math.round(totalWords * (0.2 + zoneProgress * 0.5));
    const easyCount = totalWords - hardCount;

    pickFromPool(pools[0], easyCount, selected, usedSet);
    pickFromPool(pools[1], hardCount, selected, usedSet);
  }

  return selected;
}

function pickFromPool(pool: Difficulty, count: number, selected: string[], usedSet: Set<string>): void {
  const available = WORD_DATABASE[pool].filter(
    w => !selected.includes(w) && !usedSet.has(w)
  );

  // If not enough unused words, allow reuse
  const source = available.length >= count
    ? available
    : WORD_DATABASE[pool].filter(w => !selected.includes(w));

  const shuffled = shuffleArray([...source]);
  for (let i = 0; i < count && i < shuffled.length; i++) {
    selected.push(shuffled[i]);
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
