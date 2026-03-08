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

// Colors
export const COLORS = {
  BG_DARK: 0x0F051D,
  BG_MID: 0x1A0C2E,
  CELL_BG: 0x1E0A3C,
  CELL_BORDER: 0x3D1F6E,
  CELL_HOVER: 0x2D1555,
  LETTER_WHITE: 0xFFFFFF,
  LETTER_DIM: 0xC4B5FD,
  SELECT_CYAN: 0x00D4FF,
  SELECT_GLOW: 0x00D4FF,
  FOUND_COLORS: [0xFF0055, 0x00D4FF, 0x39FF14, 0xBC13FE, 0xFFD700, 0xFF6B35, 0xE040FB, 0x00E5FF],
  FOUND_COLORS_HEX: ['#FF0055', '#00D4FF', '#39FF14', '#BC13FE', '#FFD700', '#FF6B35', '#E040FB', '#00E5FF'],
  GOLD: 0xFFD700,
  ERROR_RED: 0xFF4444,
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

// Collection
export const GEM_TYPES = ['Diamond', 'Ruby', 'Emerald', 'Sapphire', 'Amethyst'];
export const GEM_COLORS = ['Red', 'Blue', 'Green', 'Purple'];
export const COLLECTION_TOTAL = GEM_TYPES.length * GEM_COLORS.length;

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
