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

/**
 * Generate a word search grid with the given words placed.
 * Accepts allowed directions from LevelConfig.
 */
export function generateGrid(
  words: string[],
  gridSize: number,
  allowedDirs: [number, number][]
): GridData {
  const maxGridAttempts = 12;
  let bestResult: GridData | null = null;

  for (let attempt = 0; attempt < maxGridAttempts; attempt++) {
    const result = generateGridAttempt(words, gridSize, allowedDirs);

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

  return bestResult ?? generateGridAttempt(words, gridSize, allowedDirs);
}

function generateGridAttempt(
  words: string[],
  gridSize: number,
  allowedDirs: [number, number][]
): GridData {
  const sortedWords = [...words].sort((a, b) => b.length - a.length);

  const grid: string[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => '')
  );

  const placedWords: PlacedWord[] = [];

  // Ensure at least one word is easy to find (horizontal in first/last rows)
  if (sortedWords.length > 0) {
    const easyWord = sortedWords[sortedWords.length - 1];
    const easyPlaced = tryPlaceWordEasy(grid, easyWord, gridSize);
    if (easyPlaced) {
      placedWords.push(easyPlaced);
      sortedWords.pop();
    }
  }

  for (const word of sortedWords) {
    // Skip words longer than grid
    if (word.length > gridSize) {
      console.warn(`Word "${word}" too long for ${gridSize}x${gridSize} grid, skipping`);
      continue;
    }
    const placed = tryPlaceWord(grid, word, gridSize, allowedDirs);
    if (placed) {
      placedWords.push(placed);
    } else {
      console.warn(`Could not place word: ${word}`);
    }
  }

  fillEmptyCells(grid, gridSize);

  return { grid, placedWords, size: gridSize };
}

function tryPlaceWordEasy(grid: string[][], word: string, gridSize: number): PlacedWord | null {
  if (word.length > gridSize) return null;

  const rows = [0, gridSize - 1];
  for (const row of rows) {
    const maxCol = gridSize - word.length;
    const startCol = Math.floor(Math.random() * (maxCol + 1));

    let fits = true;
    const cells: { row: number; col: number }[] = [];
    for (let i = 0; i < word.length; i++) {
      const existing = grid[row][startCol + i];
      if (existing !== '' && existing !== word[i]) { fits = false; break; }
      cells.push({ row, col: startCol + i });
    }

    if (fits) {
      for (let i = 0; i < word.length; i++) {
        grid[row][startCol + i] = word[i];
      }
      return { word, startRow: row, startCol, dx: 1, dy: 0, cells };
    }
  }
  return null;
}

function tryPlaceWord(grid: string[][], word: string, gridSize: number, allowedDirs: [number, number][]): PlacedWord | null {
  const maxAttempts = 200;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const dirIdx = Math.floor(Math.random() * allowedDirs.length);
    const [dx, dy] = allowedDirs[dirIdx];

    const rowMin = dy === -1 ? word.length - 1 : 0;
    const rowMax = dy === 1 ? gridSize - word.length : gridSize - 1;
    const colMin = dx === -1 ? word.length - 1 : 0;
    const colMax = dx === 1 ? gridSize - word.length : gridSize - 1;

    if (rowMin > rowMax || colMin > colMax) continue;

    const startRow = rowMin + Math.floor(Math.random() * (rowMax - rowMin + 1));
    const startCol = colMin + Math.floor(Math.random() * (colMax - colMin + 1));

    let fits = true;
    const cells: { row: number; col: number }[] = [];

    for (let i = 0; i < word.length; i++) {
      const r = startRow + i * dy;
      const c = startCol + i * dx;

      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) {
        fits = false;
        break;
      }

      const existing = grid[r][c];
      if (existing !== '' && existing !== word[i]) {
        fits = false;
        break;
      }

      cells.push({ row: r, col: c });
    }

    if (!fits) continue;

    for (let i = 0; i < word.length; i++) {
      grid[cells[i].row][cells[i].col] = word[i];
    }

    return { word, startRow, startCol, dx, dy, cells };
  }

  return null;
}

function fillEmptyCells(grid: string[][], gridSize: number): void {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = WEIGHTED_LETTERS[Math.floor(Math.random() * WEIGHTED_LETTERS.length)];
      }
    }
  }
}
