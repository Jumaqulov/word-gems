export interface CellCoord {
  row: number;
  col: number;
}

export interface SelectionDirection {
  dx: number;
  dy: number;
}

export interface SelectionHoverResult {
  direction: SelectionDirection | null;
  nextSelection: CellCoord[] | null;
}

function buildSelectionPath(first: CellCoord, steps: number, direction: SelectionDirection): CellCoord[] {
  const nextSelection: CellCoord[] = [];
  for (let index = 0; index <= steps; index++) {
    nextSelection.push({
      row: first.row + index * direction.dy,
      col: first.col + index * direction.dx,
    });
  }
  return nextSelection;
}

export function resolveSelectionHover(
  selectedCells: CellCoord[],
  hoveredCell: CellCoord,
  currentDirection: SelectionDirection | null
): SelectionHoverResult {
  if (selectedCells.length === 0) {
    return { direction: currentDirection, nextSelection: null };
  }

  const first = selectedCells[0];
  const last = selectedCells[selectedCells.length - 1];
  if (last.row === hoveredCell.row && last.col === hoveredCell.col) {
    return { direction: currentDirection, nextSelection: null };
  }

  let direction = currentDirection;

  if (selectedCells.length === 1) {
    const absCol = Math.abs(hoveredCell.col - first.col);
    const absRow = Math.abs(hoveredCell.row - first.row);
    if (absCol === 0 && absRow === 0) {
      return { direction, nextSelection: null };
    }

    if (absCol > 1 || absRow > 1) {
      const angle = Math.atan2(hoveredCell.row - first.row, hoveredCell.col - first.col);
      const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      const dx = Math.round(Math.cos(snapAngle));
      const dy = Math.round(Math.sin(snapAngle));
      if (dx === 0 && dy === 0) {
        return { direction, nextSelection: null };
      }
      direction = { dx, dy };
    } else {
      direction = {
        dx: Math.sign(hoveredCell.col - first.col),
        dy: Math.sign(hoveredCell.row - first.row),
      };
    }
  }

  if (!direction) {
    return { direction, nextSelection: null };
  }

  const { dx, dy } = direction;
  const dRow = hoveredCell.row - first.row;
  const dCol = hoveredCell.col - first.col;

  if (dx === 0 && dCol !== 0) return { direction, nextSelection: null };
  if (dy === 0 && dRow !== 0) return { direction, nextSelection: null };
  if (dx !== 0 && dy !== 0) {
    if (Math.abs(dRow) !== Math.abs(dCol)) return { direction, nextSelection: null };
    if (Math.sign(dCol) !== dx || Math.sign(dRow) !== dy) return { direction, nextSelection: null };
  }
  if (dx !== 0 && Math.sign(dCol) !== dx) return { direction, nextSelection: null };
  if (dy !== 0 && Math.sign(dRow) !== dy) return { direction, nextSelection: null };

  const steps = dx !== 0 ? Math.abs(dCol) : Math.abs(dRow);
  const nextSelection = buildSelectionPath(first, steps, direction);

  if (
    nextSelection.length === selectedCells.length &&
    nextSelection[nextSelection.length - 1].row === last.row &&
    nextSelection[nextSelection.length - 1].col === last.col
  ) {
    return { direction, nextSelection: null };
  }

  return { direction, nextSelection };
}

export function matchesWordDirection(
  selectedCells: CellCoord[],
  word: string,
  reversed: boolean,
  grid: string[][],
  wildcardCellKeys: Set<string>,
  getCellKey: (row: number, col: number) => string
): boolean {
  const characters = reversed ? [...word].reverse() : [...word];
  for (let index = 0; index < selectedCells.length; index++) {
    const { row, col } = selectedCells[index];
    const cellKey = getCellKey(row, col);
    const cellChar = grid[row][col];
    if (cellChar === '?' && wildcardCellKeys.has(cellKey)) continue;
    if (cellChar !== characters[index]) return false;
  }
  return true;
}

export function selectionMatchesWord(
  selectedCells: CellCoord[],
  word: string,
  grid: string[][],
  wildcardCellKeys: Set<string>,
  getCellKey: (row: number, col: number) => string
): boolean {
  if (word.length !== selectedCells.length) return false;
  return (
    matchesWordDirection(selectedCells, word, false, grid, wildcardCellKeys, getCellKey) ||
    matchesWordDirection(selectedCells, word, true, grid, wildcardCellKeys, getCellKey)
  );
}

export function findMatchedWord(
  levelWords: string[],
  bonusWords: Iterable<string>,
  foundWords: Set<string>,
  selectedCells: CellCoord[],
  grid: string[][],
  wildcardCellKeys: Set<string>,
  getCellKey: (row: number, col: number) => string
): string | null {
  const matchableWords = [...levelWords, ...[...bonusWords].filter((word) => !foundWords.has(word))];
  return (
    matchableWords.find(
      (word) =>
        !foundWords.has(word) &&
        selectionMatchesWord(selectedCells, word, grid, wildcardCellKeys, getCellKey)
    ) ?? null
  );
}
