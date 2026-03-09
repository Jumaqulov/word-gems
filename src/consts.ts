// Cell gap between cells
export const CELL_GAP = 3;

// Detect mobile
export const IS_MOBILE = () => window.innerWidth < 768;

// Dynamic cell size for a given grid dimension
export function getCellSizeForGrid(gridSize: number): number {
  const isMobile = IS_MOBILE();
  const maxWidth = isMobile ? window.innerWidth - 20 : 500;
  const maxHeight = isMobile ? window.innerHeight * 0.55 : 500;
  const maxDim = Math.min(maxWidth, maxHeight);
  return Math.floor(maxDim / gridSize);
}

// Legacy helpers (used by BootScene for default texture size)
export const getGridSize = () => IS_MOBILE() ? 8 : 10;
export const getCellSize = () => getCellSizeForGrid(getGridSize());

// Colors — Casual bright palette
export const COLORS = {
  BG_DARK: 0x1a0e3e,
  BG_MID: 0x2d1b69,
  CELL_BG: 0xd0d8f0,
  CELL_BORDER: 0xb8c0dd,
  CELL_HOVER: 0xe0e6f8,
  LETTER_DARK: 0x2a2a4e,
  LETTER_DIM: 0x5a5a7e,
  SELECT_COLOR: 0x4ECDC4,
  SELECT_GLOW: 0x4ECDC4,
  FOUND_COLORS: [0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0x96CEB4, 0xFFD93D, 0xFF8B5E, 0xDDA0DD, 0x87CEEB],
  FOUND_COLORS_HEX: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFD93D', '#FF8B5E', '#DDA0DD', '#87CEEB'],
  GOLD: 0xFFD700,
  ERROR_RED: 0xFF6B6B,
  PERFECT_GOLD: 0xFFD700,
};

// Scoring
export const SCORING = {
  WORD_MULTIPLIER: 10,
  LEVEL_BONUS_MULTIPLIER: 100,
  STREAK_BONUS_MULTIPLIER: 10,
  PERFECT_BONUS: 200,
  GEMS_PER_10_POINTS: 1,
};

// Power-ups
export const POWERUP_COSTS = {
  DETECT: 50,
  UNDO: 30,
  AD_REWARD: 100,
};

// Ads
export const AD_INTERVAL_LEVELS = 5;

// Daily spin rewards
export const SPIN_REWARDS = [
  { label: '50 Gems', value: 50, type: 'gems' as const, weight: 40 },
  { label: '100 Gems', value: 100, type: 'gems' as const, weight: 30 },
  { label: '200 Gems', value: 200, type: 'gems' as const, weight: 15 },
  { label: 'Free Hint', value: 1, type: 'hint' as const, weight: 15 },
];


// Save keys
export const SAVE_KEY = 'wordgems_save';

// Directions for word placement (dx, dy)
export const DIRECTIONS: [number, number][] = [
  [1, 0],   // right
  [-1, 0],  // left
  [0, 1],   // down
  [0, -1],  // up
  [1, 1],   // down-right
  [-1, -1], // up-left
  [1, -1],  // up-right
  [-1, 1],  // down-left
];

// Weighted random letters for grid fill (English frequency)
export const WEIGHTED_LETTERS = 'EEEEEEEEEEEETTTTTTTTTAAAAAAAAOOOOOOOOIIIIIIINNNNNNNSSSSSSSHHHHHHRRRRRRDDDDLLLLCCCCUUUMMWWFFGGYYPPBBVKJXQZ';
