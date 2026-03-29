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
export type WorldId =
  | 'forest'
  | 'ocean'
  | 'space'
  | 'castle'
  | 'magic'
  | 'ice'
  | 'desert'
  | 'volcano'
  | 'sky'
  | 'crystal'
  | 'shadow'
  | 'clockwork';

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
  | { type: 'space_comet'; hint: string; bonusScore: number; bonusLabel?: string; claimedText?: string }
  | { type: 'castle_lock'; hint: string; hasLockedWord: boolean; unlockBurstText?: string }
  | { type: 'magic_wildcard'; hint: string; wildcardCells: [number, number]; cellLabel?: string }
  | { type: 'ice_frozen'; hint: string; frozenWords: number }
  | {
      type: 'desert_gold';
      hint: string;
      goldenCells: [number, number];
      gemBonus: number;
      scoreBonus: number;
      cellLabel?: string;
      collectedText?: string;
      rewardLabel?: string;
    };

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
      primary: '#84D95E',
      secondary: '#F1FFB0',
      accent: '#BCFFA4',
      backgroundTop: '#13311A',
      backgroundMid: '#347A40',
      backgroundBottom: '#0A1A10',
      glow: 'rgba(132, 217, 94, 0.38)',
      overlayPrimary: 'rgba(132, 217, 94, 0.2)',
      overlaySecondary: 'rgba(241, 255, 176, 0.11)',
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
      primary: '#34D8FF',
      secondary: '#B8F8FF',
      accent: '#67FFE2',
      backgroundTop: '#062746',
      backgroundMid: '#0F73AD',
      backgroundBottom: '#03131F',
      glow: 'rgba(52, 216, 255, 0.4)',
      overlayPrimary: 'rgba(52, 216, 255, 0.22)',
      overlaySecondary: 'rgba(184, 248, 255, 0.12)',
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
      primary: '#C094FF',
      secondary: '#F7EAFF',
      accent: '#7CCBFF',
      backgroundTop: '#0D0828',
      backgroundMid: '#2D196B',
      backgroundBottom: '#050311',
      glow: 'rgba(192, 148, 255, 0.4)',
      overlayPrimary: 'rgba(124, 203, 255, 0.2)',
      overlaySecondary: 'rgba(247, 234, 255, 0.1)',
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
      primary: '#E0A25F',
      secondary: '#FFE1B4',
      accent: '#F7C37B',
      backgroundTop: '#2A160C',
      backgroundMid: '#714022',
      backgroundBottom: '#120907',
      glow: 'rgba(224, 162, 95, 0.36)',
      overlayPrimary: 'rgba(247, 195, 123, 0.2)',
      overlaySecondary: 'rgba(255, 225, 180, 0.1)',
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
      primary: '#F06CFF',
      secondary: '#FFE0FF',
      accent: '#89F4FF',
      backgroundTop: '#2B1036',
      backgroundMid: '#792E94',
      backgroundBottom: '#130617',
      glow: 'rgba(240, 108, 255, 0.4)',
      overlayPrimary: 'rgba(240, 108, 255, 0.2)',
      overlaySecondary: 'rgba(137, 244, 255, 0.11)',
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
    description: 'Frozen words crack once, then thaw only after the other words are found.',
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
      hint: 'Frozen words crack first, then clear after the other words are found.',
      frozenWords: 1,
    },
    visuals: {
      primary: '#8BE0FF',
      secondary: '#FAFFFF',
      accent: '#C9F9FF',
      backgroundTop: '#08283F',
      backgroundMid: '#2478AF',
      backgroundBottom: '#04111C',
      glow: 'rgba(139, 224, 255, 0.44)',
      overlayPrimary: 'rgba(139, 224, 255, 0.24)',
      overlaySecondary: 'rgba(250, 255, 255, 0.14)',
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
    levels: [61, 70],
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
      primary: '#FFC05A',
      secondary: '#FFF0BD',
      accent: '#FFE07B',
      backgroundTop: '#3A2008',
      backgroundMid: '#9D5B1C',
      backgroundBottom: '#150A04',
      glow: 'rgba(255, 192, 90, 0.38)',
      overlayPrimary: 'rgba(255, 224, 123, 0.22)',
      overlaySecondary: 'rgba(255, 240, 189, 0.11)',
      cellTint: 0xfff1dd,
      accentTint: 0xffcf8c,
      bonusTint: 0xffdf73,
      letterColor: '#5b3a1b',
    },
    sfxProfile: 'desert',
  },
  {
    id: 'volcano',
    name: 'Volcano World',
    description: 'Molten trails with ember cells that forge extra rewards.',
    levels: [71, 80],
    gridSize: [10, 10],
    wordCount: [8, 10],
    difficultyWeights: {
      start: { easy: 0.1, medium: 0.4, hard: 0.5 },
      end: { easy: 0.05, medium: 0.25, hard: 0.7 },
    },
    directions: DIR_ALL,
    directionWeights: {
      right: 1,
      left: 1,
      down: 1,
      up: 1,
      downRight: 1.25,
      upLeft: 1.25,
      upRight: 1.2,
      downLeft: 1.2,
    },
    timer: { enabled: true, startSeconds: 165, endSeconds: 130 },
    mechanic: {
      type: 'desert_gold',
      hint: 'Ember cells flare hot and forge extra rewards when cleared.',
      goldenCells: [2, 5],
      gemBonus: 2,
      scoreBonus: 20,
      cellLabel: 'ember cell',
      collectedText: 'All ember cells forged.',
      rewardLabel: 'EMBER',
    },
    visuals: {
      primary: '#FF7958',
      secondary: '#FFE0BC',
      accent: '#FFC468',
      backgroundTop: '#2A0906',
      backgroundMid: '#7B1E13',
      backgroundBottom: '#170603',
      glow: 'rgba(255, 121, 88, 0.4)',
      overlayPrimary: 'rgba(255, 121, 88, 0.23)',
      overlaySecondary: 'rgba(255, 224, 188, 0.11)',
      cellTint: 0xfff0e8,
      accentTint: 0xffa073,
      bonusTint: 0xffd36c,
      letterColor: '#5a2015',
    },
    sfxProfile: 'volcano',
  },
  {
    id: 'sky',
    name: 'Sky World',
    description: 'Open-air boards where breeze cells drift across the grid.',
    levels: [81, 90],
    gridSize: [10, 10],
    wordCount: [8, 10],
    difficultyWeights: {
      start: { easy: 0.12, medium: 0.45, hard: 0.43 },
      end: { easy: 0.06, medium: 0.34, hard: 0.6 },
    },
    directions: DIR_ALL,
    directionWeights: {
      right: 1.05,
      left: 1.05,
      down: 1,
      up: 1,
      downRight: 1.15,
      upLeft: 1.15,
      upRight: 1.15,
      downLeft: 1.15,
    },
    timer: { enabled: false, startSeconds: 0, endSeconds: 0 },
    mechanic: {
      type: 'ocean_wave',
      hint: 'Breeze cells drift with the wind but keep the path readable.',
      waveCells: [7, 11],
      amplitude: 5,
    },
    visuals: {
      primary: '#74D8FF',
      secondary: '#F7FDFF',
      accent: '#FFE38C',
      backgroundTop: '#11304F',
      backgroundMid: '#64B9F4',
      backgroundBottom: '#0A182A',
      glow: 'rgba(116, 216, 255, 0.38)',
      overlayPrimary: 'rgba(116, 216, 255, 0.22)',
      overlaySecondary: 'rgba(247, 253, 255, 0.12)',
      cellTint: 0xf4fbff,
      accentTint: 0xb9e8ff,
      bonusTint: 0xffe28a,
      letterColor: '#24506a',
    },
    sfxProfile: 'sky',
  },
  {
    id: 'crystal',
    name: 'Crystal Cave World',
    description: 'Prism-lit caverns with refracting wildcard cells.',
    levels: [91, 100],
    gridSize: [10, 10],
    wordCount: [8, 10],
    difficultyWeights: {
      start: { easy: 0.08, medium: 0.42, hard: 0.5 },
      end: { easy: 0.04, medium: 0.28, hard: 0.68 },
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
      hint: 'Prism cells marked ? can refract into any letter.',
      wildcardCells: [2, 3],
      cellLabel: 'prism cell',
    },
    visuals: {
      primary: '#8D8BFF',
      secondary: '#F6F1FF',
      accent: '#78F2FF',
      backgroundTop: '#17102F',
      backgroundMid: '#3F3593',
      backgroundBottom: '#090613',
      glow: 'rgba(141, 139, 255, 0.42)',
      overlayPrimary: 'rgba(120, 242, 255, 0.18)',
      overlaySecondary: 'rgba(246, 241, 255, 0.11)',
      cellTint: 0xf7f5ff,
      accentTint: 0xcac4ff,
      bonusTint: 0xa8f8ff,
      letterColor: '#3b3468',
    },
    sfxProfile: 'crystal',
  },
  {
    id: 'shadow',
    name: 'Shadow World',
    description: 'Dusky lanes where one hidden word stays sealed in shadow.',
    levels: [101, 110],
    gridSize: [10, 10],
    wordCount: [8, 10],
    difficultyWeights: {
      start: { easy: 0.08, medium: 0.37, hard: 0.55 },
      end: { easy: 0.03, medium: 0.22, hard: 0.75 },
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
    timer: { enabled: true, startSeconds: 160, endSeconds: 125 },
    mechanic: {
      type: 'castle_lock',
      hint: 'A shadow word clears only after its lantern word is found.',
      hasLockedWord: true,
      unlockBurstText: 'SHADOW LIFTED',
    },
    visuals: {
      primary: '#7E7AAE',
      secondary: '#F0EAFE',
      accent: '#E78CFF',
      backgroundTop: '#0F0A17',
      backgroundMid: '#2F2445',
      backgroundBottom: '#05040A',
      glow: 'rgba(126, 122, 174, 0.34)',
      overlayPrimary: 'rgba(231, 140, 255, 0.18)',
      overlaySecondary: 'rgba(240, 234, 254, 0.08)',
      cellTint: 0xf5f1ff,
      accentTint: 0xc1b8e6,
      bonusTint: 0xf0a2ff,
      letterColor: '#342a4f',
    },
    sfxProfile: 'shadow',
  },
  {
    id: 'clockwork',
    name: 'Clockwork World',
    description: 'Precision puzzleworks with hidden gears and ticking bonuses.',
    levels: [111, 120],
    gridSize: [10, 10],
    wordCount: [8, 10],
    difficultyWeights: {
      start: { easy: 0.06, medium: 0.34, hard: 0.6 },
      end: { easy: 0.02, medium: 0.18, hard: 0.8 },
    },
    directions: DIR_ALL,
    directionWeights: {
      right: 1.05,
      left: 1.05,
      down: 1,
      up: 1,
      downRight: 1.2,
      upLeft: 1.2,
      upRight: 1.2,
      downLeft: 1.2,
    },
    timer: { enabled: true, startSeconds: 155, endSeconds: 120 },
    mechanic: {
      type: 'space_comet',
      hint: 'One hidden gear word grants an extra score burst.',
      bonusScore: 85,
      bonusLabel: 'GEAR',
      claimedText: 'Gear bonus secured.',
    },
    visuals: {
      primary: '#C8A469',
      secondary: '#FFF1D8',
      accent: '#75D7D1',
      backgroundTop: '#1C140E',
      backgroundMid: '#5B4630',
      backgroundBottom: '#0C0806',
      glow: 'rgba(200, 164, 105, 0.35)',
      overlayPrimary: 'rgba(117, 215, 209, 0.16)',
      overlaySecondary: 'rgba(255, 241, 216, 0.09)',
      cellTint: 0xfff6ea,
      accentTint: 0xe3bd84,
      bonusTint: 0x8fe7df,
      letterColor: '#58412b',
    },
    sfxProfile: 'clockwork',
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
