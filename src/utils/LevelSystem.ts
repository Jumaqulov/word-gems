import { SCORING } from '../consts';

export type Direction = [number, number];
export type DirectionName =
  | 'right'
  | 'left'
  | 'down'
  | 'up'
  | 'downRight'
  | 'upLeft'
  | 'upRight'
  | 'downLeft';

export type WordDifficulty = 'easy' | 'medium' | 'hard';
export type WorldId = 'forest' | 'ocean' | 'space' | 'castle' | 'magic' | 'ice' | 'desert';

export interface DifficultyWeights {
  easy: number;
  medium: number;
  hard: number;
}

export interface WorldVisualTheme {
  primary: string;
  secondary: string;
  accent: string;
  backgroundTop: string;
  backgroundMid: string;
  backgroundBottom: string;
  glow: string;
  overlayPrimary: string;
  overlaySecondary: string;
  cellTint: number;
  accentTint: number;
  bonusTint: number;
  letterColor: string;
}

export type WorldMechanicConfig =
  | { type: 'forest_stable'; hint: string }
  | { type: 'ocean_wave'; hint: string; waveCells: [number, number]; amplitude: number }
  | { type: 'space_comet'; hint: string; bonusScore: number }
  | { type: 'castle_lock'; hint: string; hasLockedWord: boolean }
  | { type: 'magic_wildcard'; hint: string; wildcardCells: [number, number] }
  | { type: 'ice_frozen'; hint: string; frozenWords: number }
  | { type: 'desert_gold'; hint: string; goldenCells: [number, number]; gemBonus: number; scoreBonus: number };

export interface WorldConfig {
  id: WorldId;
  name: string;
  description: string;
  levels: [number, number];
  gridSize: [number, number];
  wordCount: [number, number];
  difficultyWeights: {
    start: DifficultyWeights;
    end: DifficultyWeights;
  };
  directions: DirectionName[];
  directionWeights?: Partial<Record<DirectionName, number>>;
  timer: {
    enabled: boolean;
    startSeconds: number;
    endSeconds: number;
  };
  mechanic: WorldMechanicConfig;
  visuals: WorldVisualTheme;
  sfxProfile: WorldId;
}

export interface LevelConfig {
  level: number;
  world: WorldConfig;
  worldProgress: number;
  gridSize: number;
  wordCount: number;
  directions: Direction[];
  directionNames: DirectionName[];
  directionWeights: number[];
  difficultyWeights: DifficultyWeights;
  hasTimer: boolean;
  timerSeconds: number;
  mechanic: WorldMechanicConfig;
  visuals: WorldVisualTheme;
  sfxProfile: WorldId;
}

export const DIRECTION_VECTORS: Record<DirectionName, Direction> = {
  right: [1, 0],
  left: [-1, 0],
  down: [0, 1],
  up: [0, -1],
  downRight: [1, 1],
  upLeft: [-1, -1],
  upRight: [1, -1],
  downLeft: [-1, 1],
};

const DIR_H: DirectionName[] = ['right', 'left'];
const DIR_V: DirectionName[] = ['down', 'up'];
const DIR_D: DirectionName[] = ['downRight', 'upLeft', 'upRight', 'downLeft'];
const DIR_HV: DirectionName[] = [...DIR_H, ...DIR_V];
const DIR_ALL: DirectionName[] = [...DIR_HV, ...DIR_D];

const WORLD_SPAN_CAP = 20;

export const WORLDS: WorldConfig[] = [
  {
    id: 'forest',
    name: 'Forest World',
    description: 'Gentle trails and grounded word paths.',
    levels: [1, 10],
    gridSize: [7, 8],
    wordCount: [4, 6],
    difficultyWeights: {
      start: { easy: 0.8, medium: 0.2, hard: 0 },
      end: { easy: 0.55, medium: 0.35, hard: 0.1 },
    },
    directions: DIR_HV,
    directionWeights: {
      right: 1.2,
      left: 1.2,
      down: 1,
      up: 1,
    },
    timer: { enabled: false, startSeconds: 0, endSeconds: 0 },
    mechanic: {
      type: 'forest_stable',
      hint: 'Calm paths: mostly straight lines and no board tricks.',
    },
    visuals: {
      primary: '#7CCB5D',
      secondary: '#D8F29B',
      accent: '#B2F2A5',
      backgroundTop: '#17351F',
      backgroundMid: '#2B5A30',
      backgroundBottom: '#102415',
      glow: 'rgba(124, 203, 93, 0.28)',
      overlayPrimary: 'rgba(124, 203, 93, 0.15)',
      overlaySecondary: 'rgba(218, 242, 155, 0.08)',
      cellTint: 0xf3ffe8,
      accentTint: 0xc9f76f,
      bonusTint: 0xf6d86b,
      letterColor: '#254124',
    },
    sfxProfile: 'forest',
  },
  {
    id: 'ocean',
    name: 'Ocean World',
    description: 'Rolling tides and swaying wave cells.',
    levels: [11, 20],
    gridSize: [8, 9],
    wordCount: [5, 7],
    difficultyWeights: {
      start: { easy: 0.55, medium: 0.35, hard: 0.1 },
      end: { easy: 0.35, medium: 0.45, hard: 0.2 },
    },
    directions: [...DIR_HV, 'downRight', 'upLeft'],
    directionWeights: {
      right: 1.15,
      left: 1.15,
      down: 1,
      up: 1,
      downRight: 0.7,
      upLeft: 0.7,
    },
    timer: { enabled: false, startSeconds: 0, endSeconds: 0 },
    mechanic: {
      type: 'ocean_wave',
      hint: 'Wave cells drift with the tide but never break control.',
      waveCells: [6, 10],
      amplitude: 4,
    },
    visuals: {
      primary: '#46C3FF',
      secondary: '#9CE7FF',
      accent: '#7ADAF1',
      backgroundTop: '#0D2D4D',
      backgroundMid: '#175A86',
      backgroundBottom: '#0A1D2B',
      glow: 'rgba(70, 195, 255, 0.3)',
      overlayPrimary: 'rgba(70, 195, 255, 0.16)',
      overlaySecondary: 'rgba(156, 231, 255, 0.08)',
      cellTint: 0xe5f7ff,
      accentTint: 0x8fdfff,
      bonusTint: 0xffdf74,
      letterColor: '#16445c',
    },
    sfxProfile: 'ocean',
  },
  {
    id: 'space',
    name: 'Space World',
    description: 'Diagonal routes and hidden comet bonuses.',
    levels: [21, 30],
    gridSize: [8, 9],
    wordCount: [6, 7],
    difficultyWeights: {
      start: { easy: 0.3, medium: 0.5, hard: 0.2 },
      end: { easy: 0.2, medium: 0.45, hard: 0.35 },
    },
    directions: DIR_ALL,
    directionWeights: {
      downRight: 1.9,
      upLeft: 1.9,
      upRight: 1.9,
      downLeft: 1.9,
      right: 0.9,
      left: 0.9,
      down: 0.85,
      up: 0.85,
    },
    timer: { enabled: false, startSeconds: 0, endSeconds: 0 },
    mechanic: {
      type: 'space_comet',
      hint: 'One hidden comet word pays an extra score burst.',
      bonusScore: 70,
    },
    visuals: {
      primary: '#B88CFF',
      secondary: '#F0E2FF',
      accent: '#91B9FF',
      backgroundTop: '#120B32',
      backgroundMid: '#26185C',
      backgroundBottom: '#090617',
      glow: 'rgba(184, 140, 255, 0.34)',
      overlayPrimary: 'rgba(145, 185, 255, 0.16)',
      overlaySecondary: 'rgba(240, 226, 255, 0.07)',
      cellTint: 0xf0ebff,
      accentTint: 0xc3b1ff,
      bonusTint: 0x9fd7ff,
      letterColor: '#2a2459',
    },
    sfxProfile: 'space',
  },
  {
    id: 'castle',
    name: 'Castle World',
    description: 'Royal halls with one guarded word gate.',
    levels: [31, 40],
    gridSize: [9, 9],
    wordCount: [6, 8],
    difficultyWeights: {
      start: { easy: 0.25, medium: 0.5, hard: 0.25 },
      end: { easy: 0.1, medium: 0.45, hard: 0.45 },
    },
    directions: [...DIR_HV, 'downRight', 'upLeft'],
    directionWeights: {
      right: 1.1,
      left: 1.1,
      down: 1,
      up: 1,
      downRight: 0.75,
      upLeft: 0.75,
    },
    timer: { enabled: false, startSeconds: 0, endSeconds: 0 },
    mechanic: {
      type: 'castle_lock',
      hint: 'A locked word opens only after its key word is found.',
      hasLockedWord: true,
    },
    visuals: {
      primary: '#D7A86E',
      secondary: '#F2DEC0',
      accent: '#E3C38B',
      backgroundTop: '#2B1B14',
      backgroundMid: '#5A3623',
      backgroundBottom: '#17100D',
      glow: 'rgba(215, 168, 110, 0.3)',
      overlayPrimary: 'rgba(227, 195, 139, 0.15)',
      overlaySecondary: 'rgba(242, 222, 192, 0.07)',
      cellTint: 0xfff3e6,
      accentTint: 0xf2c489,
      bonusTint: 0xffdd7a,
      letterColor: '#4a2d1f',
    },
    sfxProfile: 'castle',
  },
  {
    id: 'magic',
    name: 'Magic World',
    description: 'Arcane boards with wildcard rune cells.',
    levels: [41, 50],
    gridSize: [9, 10],
    wordCount: [7, 8],
    difficultyWeights: {
      start: { easy: 0.2, medium: 0.5, hard: 0.3 },
      end: { easy: 0.1, medium: 0.4, hard: 0.5 },
    },
    directions: DIR_ALL,
    directionWeights: {
      right: 1,
      left: 1,
      down: 1,
      up: 1,
      downRight: 1.2,
      upLeft: 1.2,
      upRight: 1.2,
      downLeft: 1.2,
    },
    timer: { enabled: false, startSeconds: 0, endSeconds: 0 },
    mechanic: {
      type: 'magic_wildcard',
      hint: 'Rune cells marked ? can stand in for any letter.',
      wildcardCells: [1, 2],
    },
    visuals: {
      primary: '#E06DFF',
      secondary: '#FFD8FF',
      accent: '#8FF0FF',
      backgroundTop: '#2D1237',
      backgroundMid: '#5C2470',
      backgroundBottom: '#150817',
      glow: 'rgba(224, 109, 255, 0.32)',
      overlayPrimary: 'rgba(224, 109, 255, 0.16)',
      overlaySecondary: 'rgba(143, 240, 255, 0.08)',
      cellTint: 0xffecff,
      accentTint: 0xf2b2ff,
      bonusTint: 0xaef6ff,
      letterColor: '#53265a',
    },
    sfxProfile: 'magic',
  },
  {
    id: 'ice',
    name: 'Ice World',
    description: 'Frozen words crack once before they clear.',
    levels: [51, 60],
    gridSize: [10, 10],
    wordCount: [7, 9],
    difficultyWeights: {
      start: { easy: 0.15, medium: 0.5, hard: 0.35 },
      end: { easy: 0.05, medium: 0.4, hard: 0.55 },
    },
    directions: DIR_ALL,
    directionWeights: {
      right: 1,
      left: 1,
      down: 1,
      up: 1,
      downRight: 1.15,
      upLeft: 1.15,
      upRight: 1.15,
      downLeft: 1.15,
    },
    timer: { enabled: true, startSeconds: 185, endSeconds: 155 },
    mechanic: {
      type: 'ice_frozen',
      hint: 'Frozen words crack on the first solve and clear on the second.',
      frozenWords: 1,
    },
    visuals: {
      primary: '#87DBFF',
      secondary: '#F0FDFF',
      accent: '#B7F4FF',
      backgroundTop: '#0D2940',
      backgroundMid: '#18547A',
      backgroundBottom: '#08131E',
      glow: 'rgba(135, 219, 255, 0.34)',
      overlayPrimary: 'rgba(183, 244, 255, 0.16)',
      overlaySecondary: 'rgba(240, 253, 255, 0.08)',
      cellTint: 0xecfbff,
      accentTint: 0xb8edff,
      bonusTint: 0xd8ffff,
      letterColor: '#1d4a64',
    },
    sfxProfile: 'ice',
  },
  {
    id: 'desert',
    name: 'Desert World',
    description: 'Mirage boards with shimmering golden rewards.',
    levels: [61, 99999],
    gridSize: [10, 10],
    wordCount: [8, 10],
    difficultyWeights: {
      start: { easy: 0.1, medium: 0.45, hard: 0.45 },
      end: { easy: 0.05, medium: 0.3, hard: 0.65 },
    },
    directions: DIR_ALL,
    directionWeights: {
      right: 1,
      left: 1,
      down: 1,
      up: 1,
      downRight: 1.25,
      upLeft: 1.25,
      upRight: 1.1,
      downLeft: 1.1,
    },
    timer: { enabled: true, startSeconds: 170, endSeconds: 130 },
    mechanic: {
      type: 'desert_gold',
      hint: 'Golden cells shimmer and pay extra gems when cleared.',
      goldenCells: [2, 4],
      gemBonus: 2,
      scoreBonus: 18,
    },
    visuals: {
      primary: '#F4B554',
      secondary: '#FFE8B0',
      accent: '#F9D977',
      backgroundTop: '#3B2410',
      backgroundMid: '#8A5225',
      backgroundBottom: '#1B1108',
      glow: 'rgba(244, 181, 84, 0.3)',
      overlayPrimary: 'rgba(249, 217, 119, 0.16)',
      overlaySecondary: 'rgba(255, 232, 176, 0.08)',
      cellTint: 0xfff1dd,
      accentTint: 0xffcf8c,
      bonusTint: 0xffdf73,
      letterColor: '#5b3a1b',
    },
    sfxProfile: 'desert',
  },
];

function lerpNumber(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function lerpInt(start: number, end: number, progress: number): number {
  return Math.round(lerpNumber(start, end, progress));
}

function getWorldProgress(level: number, world: WorldConfig): number {
  const cappedSpan = Math.min(world.levels[1] - world.levels[0], WORLD_SPAN_CAP);
  if (cappedSpan <= 0) return 1;
  return Math.max(0, Math.min(1, (level - world.levels[0]) / cappedSpan));
}

function normalizeDifficultyWeights(weights: DifficultyWeights): DifficultyWeights {
  const total = weights.easy + weights.medium + weights.hard || 1;
  return {
    easy: weights.easy / total,
    medium: weights.medium / total,
    hard: weights.hard / total,
  };
}

function getInterpolatedDifficultyWeights(world: WorldConfig, progress: number): DifficultyWeights {
  return normalizeDifficultyWeights({
    easy: lerpNumber(world.difficultyWeights.start.easy, world.difficultyWeights.end.easy, progress),
    medium: lerpNumber(world.difficultyWeights.start.medium, world.difficultyWeights.end.medium, progress),
    hard: lerpNumber(world.difficultyWeights.start.hard, world.difficultyWeights.end.hard, progress),
  });
}

export function getWorldConfig(level: number): WorldConfig {
  return WORLDS.find((world) => level >= world.levels[0] && level <= world.levels[1]) ?? WORLDS[WORLDS.length - 1];
}

export function getLevelConfig(level: number): LevelConfig {
  const world = getWorldConfig(level);
  const worldProgress = getWorldProgress(level, world);

  return {
    level,
    world,
    worldProgress,
    gridSize: lerpInt(world.gridSize[0], world.gridSize[1], worldProgress),
    wordCount: lerpInt(world.wordCount[0], world.wordCount[1], worldProgress),
    directions: world.directions.map((directionName) => DIRECTION_VECTORS[directionName]),
    directionNames: [...world.directions],
    directionWeights: world.directions.map((directionName) => world.directionWeights?.[directionName] ?? 1),
    difficultyWeights: getInterpolatedDifficultyWeights(world, worldProgress),
    hasTimer: world.timer.enabled,
    timerSeconds: world.timer.enabled
      ? lerpInt(world.timer.startSeconds, world.timer.endSeconds, worldProgress)
      : 0,
    mechanic: world.mechanic,
    visuals: world.visuals,
    sfxProfile: world.sfxProfile,
  };
}

export interface ComboState {
  multiplier: number;
  lastFoundTime: number;
  comboWindow: number;
}

const COMBO_TIERS = [1, 1.5, 2.0, 2.5, 3.0];
const COMBO_WINDOW = 5000;

export function createComboState(): ComboState {
  return { multiplier: 1, lastFoundTime: 0, comboWindow: COMBO_WINDOW };
}

export function updateCombo(state: ComboState): number {
  const now = Date.now();
  const timeSinceLast = now - state.lastFoundTime;

  if (state.lastFoundTime === 0 || timeSinceLast > state.comboWindow) {
    state.multiplier = COMBO_TIERS[0];
  } else {
    const currentIdx = COMBO_TIERS.indexOf(state.multiplier);
    const nextIdx = Math.min(currentIdx + 1, COMBO_TIERS.length - 1);
    state.multiplier = COMBO_TIERS[nextIdx];
  }

  state.lastFoundTime = now;
  return state.multiplier;
}

export function isComboActive(state: ComboState): boolean {
  if (state.lastFoundTime === 0) return false;
  return Date.now() - state.lastFoundTime < state.comboWindow;
}

export function getComboTimeFraction(state: ComboState): number {
  if (state.lastFoundTime === 0) return 0;
  const elapsed = Date.now() - state.lastFoundTime;
  return Math.max(0, 1 - elapsed / state.comboWindow);
}

export function getStarRating(hintsUsed: number, timedOut: boolean): number {
  if (timedOut) return 0;
  if (hintsUsed === 0) return 3;
  if (hintsUsed === 1) return 2;
  return 1;
}

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
  const levelBonus = level * SCORING.LEVEL_BONUS_MULTIPLIER;
  const streakBonus = streak * SCORING.STREAK_BONUS_MULTIPLIER;
  const comboBonus = Math.floor(wordScoreSum * (comboMultiplier - 1));
  const perfectBonus = hintsUsed === 0 && !timedOut ? SCORING.PERFECT_BONUS : 0;
  const timerBonus = remainingSeconds > 0 ? remainingSeconds * SCORING.TIMER_BONUS_MULTIPLIER : 0;
  const total = wordScoreSum + levelBonus + streakBonus + comboBonus + perfectBonus + timerBonus;

  return {
    wordScore: wordScoreSum,
    levelBonus,
    streakBonus,
    comboBonus,
    perfectBonus,
    timerBonus,
    total,
    gemsEarned: Math.floor(total / SCORING.GEM_DIVISOR),
    stars: getStarRating(hintsUsed, timedOut),
  };
}

export function getCellSizeForGrid(gridSize: number): number {
  const isMobile = window.innerWidth < 768;
  const maxWidth = isMobile ? window.innerWidth - 20 : 500;
  const maxHeight = isMobile ? window.innerHeight * 0.55 : 500;
  const maxDim = Math.min(maxWidth, maxHeight);
  return Math.floor(maxDim / gridSize);
}
