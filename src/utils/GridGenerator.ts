import { WEIGHTED_LETTERS } from '../consts';

export interface PlacedWord {
  word: string;
  startRow: number;
  startCol: number;
  dx: number;
  dy: number;
  cells: { row: number; col: number }[];
}

export interface GridData {
  grid: string[][];
  placedWords: PlacedWord[];
  size: number;
}

export interface GenerateGridOptions {
  directions: [number, number][];
  directionWeights?: number[];
  seedAnchorWord?: boolean;
}

interface PlacementCandidate {
  startRow: number;
  startCol: number;
  direction: [number, number];
  cells: { row: number; col: number }[];
  overlapCount: number;
  score: number;
}

export function generateGrid(
  words: string[],
  gridSize: number,
  optionsOrDirections: GenerateGridOptions | [number, number][]
): GridData {
  const options = normalizeOptions(optionsOrDirections);
  const maxGridAttempts = 24;
  let bestResult: GridData | null = null;

  for (let attempt = 0; attempt < maxGridAttempts; attempt++) {
    const result = generateGridAttempt(words, gridSize, options);
    if (!bestResult || result.placedWords.length > bestResult.placedWords.length) {
      bestResult = result;
    }

    if (result.placedWords.length === words.length) {
      return result;
    }
  }

  if (bestResult && bestResult.placedWords.length < words.length) {
    console.warn(
      `Generated partial grid: placed ${bestResult.placedWords.length}/${words.length} words`
    );
  }

  return bestResult ?? generateGridAttempt(words, gridSize, options);
}

function normalizeOptions(optionsOrDirections: GenerateGridOptions | [number, number][]): GenerateGridOptions {
  return Array.isArray(optionsOrDirections)
    ? { directions: optionsOrDirections }
    : optionsOrDirections;
}

function generateGridAttempt(
  words: string[],
  gridSize: number,
  options: GenerateGridOptions
): GridData {
  const sortedWords = shuffleArray([...words]).sort((a, b) => b.length - a.length);
  const grid: string[][] = Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => ''));
  const placedWords: PlacedWord[] = [];

  if (options.seedAnchorWord && sortedWords.length > 0) {
    const anchorCandidate = sortedWords[sortedWords.length - 1];
    const anchored = tryPlaceAnchoredWord(grid, anchorCandidate, gridSize, options);
    if (anchored) {
      placedWords.push(anchored);
      sortedWords.splice(sortedWords.indexOf(anchorCandidate), 1);
    }
  }

  for (const word of sortedWords) {
    if (word.length > gridSize) {
      console.warn(`Word "${word}" too long for ${gridSize}x${gridSize} grid, skipping`);
      continue;
    }

    const placed = tryPlaceWord(grid, word, gridSize, options);
    if (placed) {
      placedWords.push(placed);
    } else {
      console.warn(`Could not place word: ${word}`);
    }
  }

  fillEmptyCells(grid, gridSize);
  return { grid, placedWords, size: gridSize };
}

function tryPlaceAnchoredWord(
  grid: string[][],
  word: string,
  gridSize: number,
  options: GenerateGridOptions
): PlacedWord | null {
  const horizontalDirections = options.directions.filter(([dx, dy]) => dy === 0 && dx !== 0);
  const usableDirections = horizontalDirections.length > 0 ? horizontalDirections : options.directions;
  const targetRows = [Math.floor(gridSize * 0.25), Math.floor(gridSize * 0.65)];

  for (const row of targetRows) {
    for (const direction of usableDirections) {
      const [dx] = direction;
      const startCol = dx === 1
        ? Math.floor((gridSize - word.length) / 2)
        : Math.floor((gridSize + word.length - 1) / 2);
      const placed = placeWordIfFits(grid, word, gridSize, row, startCol, direction);
      if (placed) return placed;
    }
  }

  return null;
}

function tryPlaceWord(
  grid: string[][],
  word: string,
  gridSize: number,
  options: GenerateGridOptions
): PlacedWord | null {
  const candidates: PlacementCandidate[] = [];
  const directions = shuffleArray([...options.directions]);

  for (const [dx, dy] of directions) {
    const rowMin = dy === -1 ? word.length - 1 : 0;
    const rowMax = dy === 1 ? gridSize - word.length : gridSize - 1;
    const colMin = dx === -1 ? word.length - 1 : 0;
    const colMax = dx === 1 ? gridSize - word.length : gridSize - 1;

    if (rowMin > rowMax || colMin > colMax) {
      continue;
    }

    for (let startRow = rowMin; startRow <= rowMax; startRow++) {
      for (let startCol = colMin; startCol <= colMax; startCol++) {
        const candidate = getPlacementCandidate(grid, word, gridSize, startRow, startCol, [dx, dy]);
        if (candidate) {
          candidates.push(candidate);
        }
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => right.score - left.score);
  const topBand = candidates.filter((candidate) => candidate.score >= candidates[0].score - 0.75);
  const chosen = topBand[Math.floor(Math.random() * topBand.length)];

  return commitPlacement(grid, word, chosen);
}

function placeWordIfFits(
  grid: string[][],
  word: string,
  gridSize: number,
  startRow: number,
  startCol: number,
  direction: [number, number]
): PlacedWord | null {
  const candidate = getPlacementCandidate(grid, word, gridSize, startRow, startCol, direction);
  if (!candidate) return null;
  return commitPlacement(grid, word, candidate);
}

function getPlacementCandidate(
  grid: string[][],
  word: string,
  gridSize: number,
  startRow: number,
  startCol: number,
  direction: [number, number]
): PlacementCandidate | null {
  const [dx, dy] = direction;
  const cells: { row: number; col: number }[] = [];
  let overlapCount = 0;

  for (let i = 0; i < word.length; i++) {
    const row = startRow + i * dy;
    const col = startCol + i * dx;

    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return null;

    const existing = grid[row][col];
    if (existing !== '' && existing !== word[i]) return null;
    if (existing === word[i]) overlapCount += 1;
    cells.push({ row, col });
  }

  const center = (gridSize - 1) / 2;
  const centerDistance = cells.reduce(
    (sum, cell) => sum + Math.abs(cell.row - center) + Math.abs(cell.col - center),
    0
  );
  const score =
    overlapCount * 8 -
    centerDistance * 0.08 +
    Math.random() * 0.35;

  return { startRow, startCol, direction, cells, overlapCount, score };
}

function commitPlacement(
  grid: string[][],
  word: string,
  candidate: PlacementCandidate
): PlacedWord {
  const [dx, dy] = candidate.direction;

  for (let i = 0; i < word.length; i++) {
    grid[candidate.cells[i].row][candidate.cells[i].col] = word[i];
  }

  return {
    word,
    startRow: candidate.startRow,
    startCol: candidate.startCol,
    dx,
    dy,
    cells: candidate.cells,
  };
}

function pickDirection(
  directions: [number, number][],
  weights?: number[]
): [number, number] {
  if (!weights || weights.length !== directions.length) {
    return directions[Math.floor(Math.random() * directions.length)];
  }

  const totalWeight = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (totalWeight <= 0) {
    return directions[Math.floor(Math.random() * directions.length)];
  }

  let roll = Math.random() * totalWeight;
  for (let i = 0; i < directions.length; i++) {
    roll -= Math.max(0, weights[i]);
    if (roll <= 0) return directions[i];
  }

  return directions[directions.length - 1];
}

function fillEmptyCells(grid: string[][], gridSize: number): void {
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col] === '') {
        grid[row][col] = WEIGHTED_LETTERS[Math.floor(Math.random() * WEIGHTED_LETTERS.length)];
      }
    }
  }
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
