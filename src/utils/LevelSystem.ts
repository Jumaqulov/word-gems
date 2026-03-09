/**
 * Level System — 200+ levels across 9 zones with combo, stars, and timer.
 */

// ── Zone definitions ──

export interface ZoneConfig {
  name: string;
  levels: [number, number]; // inclusive start-end
  gridSize: number;
  wordCount: [number, number]; // min-max words
  wordPool: ('easy' | 'medium' | 'hard')[];
  directions: [number, number][];
  hasTimer: boolean;
  timerSeconds: number;
  description: string;
}

const DIR_H: [number, number][] = [[1, 0], [-1, 0]];
const DIR_V: [number, number][] = [[0, 1], [0, -1]];
const DIR_D: [number, number][] = [[1, 1], [-1, -1], [1, -1], [-1, 1]];

const DIR_HV = [...DIR_H, ...DIR_V];
const DIR_HV_SOME_D = [...DIR_HV, [1, 1] as [number, number], [-1, -1] as [number, number]];
const DIR_ALL: [number, number][] = [...DIR_HV, ...DIR_D];

export const ZONES: ZoneConfig[] = [
  {
    name: 'Tutorial',
    levels: [1, 5],
    gridSize: 8,
    wordCount: [4, 6],
    wordPool: ['easy'],
    directions: DIR_HV,
    hasTimer: false,
    timerSeconds: 0,
    description: 'Learn the basics',
  },
  {
    name: 'Beginner',
    levels: [6, 15],
    gridSize: 8,
    wordCount: [5, 7],
    wordPool: ['easy', 'medium'],
    directions: DIR_HV,
    hasTimer: false,
    timerSeconds: 0,
    description: 'Simple words',
  },
  {
    name: 'Easy',
    levels: [16, 30],
    gridSize: 8,
    wordCount: [6, 7],
    wordPool: ['easy', 'medium'],
    directions: DIR_HV_SOME_D,
    hasTimer: false,
    timerSeconds: 0,
    description: 'Getting harder',
  },
  {
    name: 'Intermediate',
    levels: [31, 50],
    gridSize: 9,
    wordCount: [6, 8],
    wordPool: ['easy', 'medium'],
    directions: DIR_ALL,
    hasTimer: false,
    timerSeconds: 0,
    description: 'All directions',
  },
  {
    name: 'Advanced',
    levels: [51, 75],
    gridSize: 9,
    wordCount: [7, 8],
    wordPool: ['medium', 'hard'],
    directions: DIR_ALL,
    hasTimer: false,
    timerSeconds: 0,
    description: 'Longer words',
  },
  {
    name: 'Hard',
    levels: [76, 100],
    gridSize: 10,
    wordCount: [7, 9],
    wordPool: ['medium', 'hard'],
    directions: DIR_ALL,
    hasTimer: false,
    timerSeconds: 0,
    description: 'Tough puzzles',
  },
  {
    name: 'Expert',
    levels: [101, 150],
    gridSize: 10,
    wordCount: [8, 10],
    wordPool: ['medium', 'hard'],
    directions: DIR_ALL,
    hasTimer: true,
    timerSeconds: 180,
    description: 'Race the clock',
  },
  {
    name: 'Master',
    levels: [151, 200],
    gridSize: 10,
    wordCount: [9, 10],
    wordPool: ['hard'],
    directions: DIR_ALL,
    hasTimer: true,
    timerSeconds: 150,
    description: 'Master difficulty',
  },
  {
    name: 'Endless',
    levels: [201, 99999],
    gridSize: 10,
    wordCount: [9, 10],
    wordPool: ['medium', 'hard'],
    directions: DIR_ALL,
    hasTimer: true,
    timerSeconds: 120,
    description: 'Never-ending challenge',
  },
];

// ── LevelConfig returned per level ──

export interface LevelConfig {
  level: number;
  zone: ZoneConfig;
  gridSize: number;
  wordCount: number;
  directions: [number, number][];
  hasTimer: boolean;
  timerSeconds: number;
}

/**
 * Get config for a specific level number.
 */
export function getLevelConfig(level: number): LevelConfig {
  const zone = ZONES.find(z => level >= z.levels[0] && level <= z.levels[1]) ?? ZONES[ZONES.length - 1];

  // Word count scales within zone range
  const zoneProgress = zone.levels[1] === zone.levels[0]
    ? 1
    : (level - zone.levels[0]) / (zone.levels[1] - zone.levels[0]);

  const wordCount = Math.round(
    zone.wordCount[0] + zoneProgress * (zone.wordCount[1] - zone.wordCount[0])
  );

  const gridSize = zone.gridSize;

  return {
    level,
    zone,
    gridSize,
    wordCount,
    directions: zone.directions,
    hasTimer: zone.hasTimer,
    timerSeconds: zone.timerSeconds,
  };
}

// ── Combo System ──

export interface ComboState {
  multiplier: number;
  lastFoundTime: number;
  comboWindow: number; // ms
}

const COMBO_TIERS = [1, 1.5, 2.0, 2.5, 3.0];
const COMBO_WINDOW = 5000; // 5 seconds

export function createComboState(): ComboState {
  return { multiplier: 1, lastFoundTime: 0, comboWindow: COMBO_WINDOW };
}

/**
 * Call when a word is found. Returns the new multiplier.
 */
export function updateCombo(state: ComboState): number {
  const now = Date.now();
  const timeSinceLast = now - state.lastFoundTime;

  if (state.lastFoundTime === 0 || timeSinceLast > state.comboWindow) {
    // Reset combo
    state.multiplier = COMBO_TIERS[0];
  } else {
    // Advance combo tier
    const currentIdx = COMBO_TIERS.indexOf(state.multiplier);
    const nextIdx = Math.min(currentIdx + 1, COMBO_TIERS.length - 1);
    state.multiplier = COMBO_TIERS[nextIdx];
  }

  state.lastFoundTime = now;
  return state.multiplier;
}

/**
 * Check if combo is still active (call on tick).
 */
export function isComboActive(state: ComboState): boolean {
  if (state.lastFoundTime === 0) return false;
  return Date.now() - state.lastFoundTime < state.comboWindow;
}

/**
 * Get remaining combo time as fraction (0-1).
 */
export function getComboTimeFraction(state: ComboState): number {
  if (state.lastFoundTime === 0) return 0;
  const elapsed = Date.now() - state.lastFoundTime;
  return Math.max(0, 1 - elapsed / state.comboWindow);
}

// ── Star Rating ──

/**
 * 3 stars = no hints, 2 stars = 1 hint, 1 star = 2+ hints.
 * If timer ran out → 0 stars.
 */
export function getStarRating(hintsUsed: number, timedOut: boolean): number {
  if (timedOut) return 0;
  if (hintsUsed === 0) return 3;
  if (hintsUsed === 1) return 2;
  return 1;
}

// ── Score Calculation ──

export interface ScoreResult {
  wordScore: number;
  levelBonus: number;
  streakBonus: number;
  comboBonus: number;
  perfectBonus: number;
  timerBonus: number;
  total: number;
  gemsEarned: number;
  stars: number;
}

export function calculateLevelScore(
  level: number,
  wordScoreSum: number,
  streak: number,
  comboMultiplier: number,
  hintsUsed: number,
  timedOut: boolean,
  remainingSeconds: number
): ScoreResult {
  const levelBonus = level * 100;
  const streakBonus = streak * 10;
  const comboBonus = Math.floor(wordScoreSum * (comboMultiplier - 1));
  const perfectBonus = hintsUsed === 0 && !timedOut ? 200 : 0;
  const timerBonus = remainingSeconds > 0 ? remainingSeconds * 5 : 0;

  const total = wordScoreSum + levelBonus + streakBonus + comboBonus + perfectBonus + timerBonus;
  const gemsEarned = Math.floor(total / 10);
  const stars = getStarRating(hintsUsed, timedOut);

  return {
    wordScore: wordScoreSum,
    levelBonus,
    streakBonus,
    comboBonus,
    perfectBonus,
    timerBonus,
    total,
    gemsEarned,
    stars,
  };
}

// ── Grid size helpers ──

/**
 * Returns cell size in pixels based on grid size and screen dimensions.
 * Adapts to fit the available game container space.
 */
export function getCellSizeForGrid(gridSize: number): number {
  const isMobile = window.innerWidth < 768;
  // Available space: subtract HUD, word list, padding
  const maxWidth = isMobile ? window.innerWidth - 20 : 500;
  const maxHeight = isMobile ? window.innerHeight * 0.55 : 500;
  const maxDim = Math.min(maxWidth, maxHeight);
  return Math.floor(maxDim / gridSize);
}
