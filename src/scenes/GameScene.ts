import Phaser from 'phaser';
import { CrazyGamesManager } from '../managers/CrazyGamesManager';
import { SoundManager } from '../managers/SoundManager';
import EventBus, { EVENTS } from '../utils/EventBus';
import { selectWordsForLevel } from '../utils/WordDatabase';
import { generateGrid, GridData, PlacedWord } from '../utils/GridGenerator';
import { GameJuice } from '../utils/GameJuice';
import {
  calculateLevelScore,
  ComboState,
  createComboState,
  getCellSizeForGrid,
  getComboTimeFraction,
  getLevelConfig,
  isComboActive,
  LevelConfig,
  updateCombo,
} from '../utils/LevelSystem';
import {
  AD_INTERVAL_LEVELS,
  CELL_GAP,
  COLORS,
  POWERUP_COSTS,
  SCORING,
  SPIN_REWARDS,
} from '../consts';
import { iconHTML, ICONS, setIcon } from '../icons';

interface CellSprite {
  bg: Phaser.GameObjects.Image;
  letter: Phaser.GameObjects.Text;
  row: number;
  col: number;
  baseX: number;
  baseY: number;
}

interface WordRuntimeState {
  cometWord: string | null;
  cometClaimed: boolean;
  lockedWord: string | null;
  lockPrerequisite: string | null;
  wildcardCellKeys: Set<string>;
  frozenWords: Set<string>;
  crackedFrozenWords: Set<string>;
  goldenCellKeys: Set<string>;
  collectedGoldenCellKeys: Set<string>;
  waveCellKeys: Set<string>;
}

interface WordStatusTag {
  label: string;
  className: string;
}

function createWordRuntimeState(): WordRuntimeState {
  return {
    cometWord: null,
    cometClaimed: false,
    lockedWord: null,
    lockPrerequisite: null,
    wildcardCellKeys: new Set(),
    frozenWords: new Set(),
    crackedFrozenWords: new Set(),
    goldenCellKeys: new Set(),
    collectedGoldenCellKeys: new Set(),
    waveCellKeys: new Set(),
  };
}

export class GameScene extends Phaser.Scene {
  private gridContainer!: Phaser.GameObjects.Container;
  private cells: CellSprite[][] = [];
  private gridData!: GridData;
  private actualGridLetters: string[][] = [];
  private juice!: GameJuice;

  private levelConfig!: LevelConfig;
  private cellSize = 50;
  private cellDisplaySize = 50;
  private levelWords: string[] = [];
  private foundWords = new Set<string>();
  private foundWordColors = new Map<string, number>();
  private foundCellKeys = new Set<string>();
  private levelScore = 0;
  private hintsUsedThisLevel = 0;
  private adUsedThisLevel = false;
  private foundColorIndex = 0;
  private spinAngle = 0;

  private worldState: WordRuntimeState = createWordRuntimeState();
  private worldEffectTimer: Phaser.Time.TimerEvent | null = null;

  private comboState!: ComboState;
  private comboInterval: ReturnType<typeof setInterval> | null = null;
  private timerSeconds = 0;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private timedOut = false;

  private isDragging = false;
  private selectedCells: { row: number; col: number }[] = [];
  private selectionDirection: { dx: number; dy: number } | null = null;
  private selectionGraphics!: Phaser.GameObjects.Graphics;

  private idleTimer: Phaser.Time.TimerEvent | null = null;
  private uiSetup = false;
  private inputHandlersSetup = false;
  private visibilityHandler: (() => void) | null = null;
  private beforeUnloadHandler: (() => void) | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.juice = new GameJuice(this);
    this.comboState = createComboState();
    this.selectionGraphics = this.add.graphics();
    this.selectionGraphics.setDepth(10);

    this.setupInputHandlers();
    this.startLevel(CrazyGamesManager.saveData.level);

    if (!this.uiSetup) {
      this.setupUI();
      this.uiSetup = true;
    }

    this.updateHUD();
    CrazyGamesManager.gameplayStart();
    this.setupPageVisibilitySave();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
  }

  private handleSceneShutdown(): void {
    this.cleanupLevel();
    this.removePageVisibilitySave();

    if (this.inputHandlersSetup) {
      this.input.off('pointermove', this.handlePointerMove, this);
      this.input.off('pointerup', this.handlePointerUp, this);
      this.inputHandlersSetup = false;
    }
  }

  private setupPageVisibilitySave(): void {
    this.removePageVisibilitySave();
    this.visibilityHandler = () => {
      if (document.hidden) CrazyGamesManager.saveGame();
    };
    this.beforeUnloadHandler = () => {
      CrazyGamesManager.saveGame();
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  private removePageVisibilitySave(): void {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
  }

  private startLevel(level: number): void {
    this.cleanupLevel();

    const save = CrazyGamesManager.saveData;
    this.levelConfig = getLevelConfig(level);
    this.cellSize = getCellSizeForGrid(this.levelConfig.gridSize);
    this.cellDisplaySize = this.getCellDisplaySize();
    SoundManager.setWorldProfile(this.levelConfig.sfxProfile);

    const requestedWords = selectWordsForLevel(level, save.usedWords);
    this.foundWords.clear();
    this.foundWordColors.clear();
    this.foundCellKeys.clear();
    this.levelScore = 0;
    this.hintsUsedThisLevel = 0;
    this.adUsedThisLevel = false;
    this.foundColorIndex = 0;
    this.comboState = createComboState();
    this.timedOut = false;
    this.worldState = createWordRuntimeState();

    this.gridData = generateGrid(requestedWords, this.levelConfig.gridSize, {
      directions: this.levelConfig.directions,
      directionWeights: this.levelConfig.directionWeights,
      seedAnchorWord: this.levelConfig.mechanic.type === 'forest_stable',
    });

    this.levelWords = this.gridData.placedWords.map((placedWord) => placedWord.word);
    this.actualGridLetters = this.gridData.grid.map((row) => [...row]);
    this.configureWorldMechanics();
    this.buildGrid();
    this.applyWorldTheme();
    this.startWorldAmbientEffects();
    this.juice.animateGridEntrance(this.cells, this.levelConfig.gridSize);

    this.updateWordListUI();
    this.updateHUD();
    this.updateWorldUI();

    if (this.levelConfig.hasTimer) {
      this.timerSeconds = this.levelConfig.timerSeconds;
      this.startTimer();
    } else {
      this.timerSeconds = 0;
      this.hideTimer();
    }

    this.updateComboUI();
    this.startIdleAnimation();
    EventBus.emit(EVENTS.LEVEL_START, level);
  }

  private cleanupLevel(): void {
    this.stopTimer();
    this.stopComboTick();
    this.stopIdleAnimation();
    this.stopWorldAmbientEffects();

    if (this.gridContainer) {
      this.gridContainer.destroy(true);
    }

    this.cells = [];
    this.selectedCells = [];
    this.selectionDirection = null;
    this.isDragging = false;
    this.worldState = createWordRuntimeState();

    if (this.selectionGraphics) {
      this.selectionGraphics.clear();
    }
  }

  private configureWorldMechanics(): void {
    const placedWords = this.gridData.placedWords.map((placedWord) => placedWord.word);
    const mechanic = this.levelConfig.mechanic;

    if (mechanic.type === 'space_comet') {
      this.worldState.cometWord = this.pickWordByPreference(placedWords, 'longest');
    }

    if (mechanic.type === 'castle_lock' && mechanic.lockedWords > 0 && placedWords.length >= 2) {
      this.worldState.lockedWord = this.pickWordByPreference(placedWords, 'longest');
      this.worldState.lockPrerequisite = this.pickWordByPreference(
        placedWords.filter((word) => word !== this.worldState.lockedWord),
        'shortest'
      );
    }

    if (mechanic.type === 'magic_wildcard') {
      const wildcardCells = this.pickUniqueCellsFromWords(randomBetween(mechanic.wildcardCells[0], mechanic.wildcardCells[1]));
      wildcardCells.forEach(({ row, col }) => {
        this.worldState.wildcardCellKeys.add(this.getCellKey(row, col));
        this.gridData.grid[row][col] = '?';
      });
    }

    if (mechanic.type === 'ice_frozen') {
      const frozenCandidates = this.pickWordGroup(placedWords, mechanic.frozenWords, 'longest');
      frozenCandidates.forEach((word) => this.worldState.frozenWords.add(word));
    }

    if (mechanic.type === 'desert_gold') {
      const goldenCells = this.pickUniqueCellsFromWords(randomBetween(mechanic.goldenCells[0], mechanic.goldenCells[1]));
      goldenCells.forEach(({ row, col }) => this.worldState.goldenCellKeys.add(this.getCellKey(row, col)));
    }

    if (mechanic.type === 'ocean_wave') {
      const waveCells = this.pickUniqueCellsFromGrid(randomBetween(mechanic.waveCells[0], mechanic.waveCells[1]));
      waveCells.forEach(({ row, col }) => this.worldState.waveCellKeys.add(this.getCellKey(row, col)));
    }
  }

  private buildGrid(): void {
    const totalSize = this.cellSize * this.gridData.size;
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    const gridX = Math.round(centerX - totalSize / 2);
    const gridY = Math.round(centerY - totalSize / 2);

    this.gridContainer = this.add.container(gridX, gridY);
    this.gridContainer.setDepth(1);
    this.cells = [];

    for (let row = 0; row < this.gridData.size; row++) {
      this.cells[row] = [];
      for (let col = 0; col < this.gridData.size; col++) {
        const x = Math.round(col * this.cellSize + this.cellSize / 2);
        const y = Math.round(row * this.cellSize + this.cellSize / 2);
        const bg = this.add.image(x, y, this.getCellTextureKey('cell-bg'));
        bg.setDisplaySize(this.cellDisplaySize, this.cellDisplaySize);
        bg.setInteractive({ useHandCursor: false });

        const fontSize = Math.floor(this.getCellContentSize() * 0.42);
        const letter = this.add.text(x, y, this.gridData.grid[row][col], {
          fontFamily: '"Fredoka One", cursive',
          fontSize: `${fontSize}px`,
          color: this.levelConfig.visuals.letterColor,
        });
        letter.setOrigin(0.5);
        letter.setDepth(2);

        this.gridContainer.add([bg, letter]);
        const cell: CellSprite = { bg, letter, row, col, baseX: x, baseY: y };
        this.cells[row][col] = cell;
        this.applyBaseCellStyle(cell);

        bg.on('pointerdown', () => this.onCellPointerDown(row, col));
      }
    }
  }

  private getCellDisplaySize(): number {
    return this.cellSize;
  }

  private getCellContentSize(): number {
    return this.cellSize - (this.useSpaciousCellTextures() ? 12 : CELL_GAP);
  }

  private useSpaciousCellTextures(): boolean {
    return this.levelConfig.gridSize >= 9;
  }

  private getCellTextureKey(baseKey: 'cell-bg' | 'cell-selected' | 'cell-hover' | 'cell-wrong' | 'cell-found'): string {
    return this.useSpaciousCellTextures() ? `${baseKey}-spacious` : baseKey;
  }

  private getFoundCellTextureKey(colorIndex: number): string {
    return this.useSpaciousCellTextures() ? `cell-found-${colorIndex}-spacious` : `cell-found-${colorIndex}`;
  }

  private setupInputHandlers(): void {
    if (this.inputHandlersSetup) return;

    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.inputHandlersSetup = true;
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging || this.isModalOpen()) return;

    if (!this.selectionDirection && this.selectedCells.length === 1) {
      const first = this.selectedCells[0];
      const centerX = this.gridContainer.x + first.col * this.cellSize + this.cellSize / 2;
      const centerY = this.gridContainer.y + first.row * this.cellSize + this.cellSize / 2;
      const distSq = (pointer.x - centerX) ** 2 + (pointer.y - centerY) ** 2;

      if (distSq > (this.cellSize * 0.6) ** 2) {
        const angle = Math.atan2(pointer.y - centerY, pointer.x - centerX);
        const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        const dx = Math.round(Math.cos(snapAngle));
        const dy = Math.round(Math.sin(snapAngle));

        if (dx !== 0 || dy !== 0) {
          this.selectionDirection = { dx, dy };
          const targetRow = first.row + dy;
          const targetCol = first.col + dx;
          if (this.isInsideGrid(targetRow, targetCol)) {
            this.onCellPointerOver(targetRow, targetCol);
            return;
          }
        }
      }
    }

    if (this.selectionDirection && this.selectedCells.length >= 1) {
      const snapped = this.snapToDirectionLine(pointer);
      if (snapped) {
        this.onCellPointerOver(snapped.row, snapped.col);
        return;
      }
    }

    const cell = this.getCellAtPointer(pointer);
    if (cell) this.onCellPointerOver(cell.row, cell.col);
  }

  private handlePointerUp(): void {
    this.onPointerUp();
  }

  private isInsideGrid(row: number, col: number): boolean {
    return row >= 0 && row < this.gridData.size && col >= 0 && col < this.gridData.size;
  }

  private snapToDirectionLine(pointer: Phaser.Input.Pointer): { row: number; col: number } | null {
    const first = this.selectedCells[0];
    const { dx, dy } = this.selectionDirection!;
    const localX = pointer.x - this.gridContainer.x;
    const localY = pointer.y - this.gridContainer.y;

    let bestDist = Infinity;
    let bestCell: { row: number; col: number } | null = null;

    for (let step = 0; step < this.gridData.size; step++) {
      const row = first.row + step * dy;
      const col = first.col + step * dx;
      if (!this.isInsideGrid(row, col)) break;

      const centerX = col * this.cellSize + this.cellSize / 2;
      const centerY = row * this.cellSize + this.cellSize / 2;
      const dist = (localX - centerX) ** 2 + (localY - centerY) ** 2;

      if (dist < bestDist) {
        bestDist = dist;
        bestCell = { row, col };
      }
    }

    return bestCell && bestDist < (this.cellSize * 2) ** 2 ? bestCell : null;
  }

  private getCellAtPointer(pointer: Phaser.Input.Pointer): { row: number; col: number } | null {
    const col = Math.floor((pointer.x - this.gridContainer.x) / this.cellSize);
    const row = Math.floor((pointer.y - this.gridContainer.y) / this.cellSize);
    return this.isInsideGrid(row, col) ? { row, col } : null;
  }

  private isModalOpen(): boolean {
    const modals = document.querySelectorAll('.modal');
    for (let i = 0; i < modals.length; i++) {
      if ((modals[i] as HTMLElement).style.display === 'flex') return true;
    }
    return false;
  }

  private onCellPointerDown(row: number, col: number): void {
    if (this.timedOut || this.isModalOpen()) return;
    this.isDragging = true;
    this.selectedCells = [{ row, col }];
    this.selectionDirection = null;
    this.updateSelectionVisuals();
    SoundManager.playLetterSelect(0);
  }

  private onCellPointerOver(row: number, col: number): void {
    if (!this.isDragging || this.selectedCells.length === 0) return;

    const first = this.selectedCells[0];
    const last = this.selectedCells[this.selectedCells.length - 1];
    if (last.row === row && last.col === col) return;

    if (this.selectedCells.length === 1) {
      const absCol = Math.abs(col - first.col);
      const absRow = Math.abs(row - first.row);
      if (absCol === 0 && absRow === 0) return;

      if (absCol > 1 || absRow > 1) {
        const angle = Math.atan2(row - first.row, col - first.col);
        const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        const dx = Math.round(Math.cos(snapAngle));
        const dy = Math.round(Math.sin(snapAngle));
        if (dx === 0 && dy === 0) return;
        this.selectionDirection = { dx, dy };
      } else {
        this.selectionDirection = {
          dx: Math.sign(col - first.col),
          dy: Math.sign(row - first.row),
        };
      }
    }

    if (!this.selectionDirection) return;

    const { dx, dy } = this.selectionDirection;
    const dRow = row - first.row;
    const dCol = col - first.col;

    if (dx === 0 && dCol !== 0) return;
    if (dy === 0 && dRow !== 0) return;
    if (dx !== 0 && dy !== 0) {
      if (Math.abs(dRow) !== Math.abs(dCol)) return;
      if (Math.sign(dCol) !== dx || Math.sign(dRow) !== dy) return;
    }
    if (dx !== 0 && Math.sign(dCol) !== dx) return;
    if (dy !== 0 && Math.sign(dRow) !== dy) return;

    const steps = dx !== 0 ? Math.abs(dCol) : Math.abs(dRow);
    const nextSelection: { row: number; col: number }[] = [];
    for (let index = 0; index <= steps; index++) {
      nextSelection.push({
        row: first.row + index * dy,
        col: first.col + index * dx,
      });
    }

    if (
      nextSelection.length !== this.selectedCells.length ||
      nextSelection[nextSelection.length - 1].row !== last.row ||
      nextSelection[nextSelection.length - 1].col !== last.col
    ) {
      this.selectedCells = nextSelection;
      this.updateSelectionVisuals();
      SoundManager.playLetterSelect(this.selectedCells.length - 1);

      const tail = nextSelection[nextSelection.length - 1];
      this.juice.selectionTrailAt(
        this.gridContainer.x + tail.col * this.cellSize + this.cellSize / 2,
        this.gridContainer.y + tail.row * this.cellSize + this.cellSize / 2,
        this.levelConfig.visuals.accentTint
      );
    }
  }

  private onPointerUp(): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    if (this.selectedCells.length < 2) {
      this.clearSelection();
      return;
    }

    const matchedWord = this.findMatchedWord();
    if (!matchedWord) {
      this.onWordInvalid();
      this.clearSelection();
      return;
    }

    const preFoundOutcome = this.handlePreFoundMechanics(matchedWord);
    if (preFoundOutcome === 'resolve') {
      this.onWordFound(matchedWord);
    }

    this.clearSelection();
  }

  private findMatchedWord(): string | null {
    return this.levelWords.find((word) => !this.foundWords.has(word) && this.selectionMatchesWord(word)) ?? null;
  }

  private selectionMatchesWord(word: string): boolean {
    if (word.length !== this.selectedCells.length) return false;
    return this.matchesWordDirection(word, false) || this.matchesWordDirection(word, true);
  }

  private matchesWordDirection(word: string, reversed: boolean): boolean {
    const characters = reversed ? [...word].reverse() : [...word];
    for (let index = 0; index < this.selectedCells.length; index++) {
      const { row, col } = this.selectedCells[index];
      const cellKey = this.getCellKey(row, col);
      const cellChar = this.gridData.grid[row][col];
      if (cellChar === '?' && this.worldState.wildcardCellKeys.has(cellKey)) continue;
      if (cellChar !== characters[index]) return false;
    }
    return true;
  }

  private handlePreFoundMechanics(word: string): 'resolve' | 'blocked' {
    if (this.isWordLocked(word)) {
      this.showLockedWordFeedback(word);
      return 'blocked';
    }

    if (this.worldState.frozenWords.has(word) && !this.worldState.crackedFrozenWords.has(word)) {
      this.crackFrozenWord(word);
      return 'blocked';
    }

    return 'resolve';
  }

  private showLockedWordFeedback(word: string): void {
    SoundManager.play('wrong');
    this.juice.shake(this.gridContainer, 2, 180);

    const prerequisite = this.worldState.lockPrerequisite;
    const text = prerequisite ? `Unlock with ${prerequisite}` : `${word} is locked`;
    this.juice.floatingText(this.cameras.main.centerX, this.cameras.main.centerY - 40, text, '#F2DEC0', 20);
    this.updateWorldUI();
  }

  private crackFrozenWord(word: string): void {
    const placedWord = this.getPlacedWord(word);
    if (!placedWord) return;

    this.worldState.crackedFrozenWords.add(word);
    SoundManager.play('select');

    const midPoint = placedWord.cells[Math.floor(placedWord.cells.length / 2)];
    this.juice.floatingText(
      this.gridContainer.x + midPoint.col * this.cellSize + this.cellSize / 2,
      this.gridContainer.y + midPoint.row * this.cellSize + this.cellSize / 2 - 18,
      'CRACKED',
      '#B7F4FF',
      22
    );

    placedWord.cells.forEach(({ row, col }) => this.applyBaseCellStyle(this.cells[row][col]));
    this.updateWordListUI();
    this.updateWorldUI();
  }

  private onWordFound(word: string): void {
    this.foundWords.add(word);
    const colorIndex = this.foundColorIndex % COLORS.FOUND_COLORS.length;
    const color = COLORS.FOUND_COLORS[colorIndex];
    const colorHex = COLORS.FOUND_COLORS_HEX[colorIndex];
    this.foundWordColors.set(word, colorIndex);
    this.foundColorIndex += 1;

    const placedWord = this.getPlacedWord(word);
    if (!placedWord) return;

    const cellCenters = placedWord.cells.map(({ row, col }) => ({
      x: this.gridContainer.x + col * this.cellSize + this.cellSize / 2,
      y: this.gridContainer.y + row * this.cellSize + this.cellSize / 2,
    }));

    for (const { row, col } of placedWord.cells) {
      const cell = this.cells[row][col];
      cell.bg.setTexture(this.getFoundCellTextureKey(colorIndex));
      cell.bg.clearTint();
      cell.bg.setAlpha(1);
      cell.bg.setPosition(cell.baseX, cell.baseY);
      cell.letter.setText(this.actualGridLetters[row][col]);
      cell.letter.setPosition(cell.baseX, cell.baseY);
      cell.letter.setColor('#FFFFFF');
      cell.letter.setFontStyle('bold');
      cell.letter.setShadow(1, 1, 'rgba(0,0,0,0.3)', 2, false, true);
      this.foundCellKeys.add(this.getCellKey(row, col));
    }

    placedWord.cells.forEach(({ row, col }, index) => {
      this.time.delayedCall(index * 40, () => {
        this.juice.popSprite(this.cells[row][col].letter, 1.3, 200);
      });
    });

    cellCenters.forEach((position) => this.juice.starBurst(position.x, position.y, color, 5));

    const comboMultiplier = updateCombo(this.comboState);
    const wordScore = Math.floor(word.length * SCORING.WORD_MULTIPLIER * comboMultiplier);
    this.levelScore += wordScore;

    this.startComboTick();
    this.updateComboUI();

    const midCell = cellCenters[Math.floor(cellCenters.length / 2)];
    const scoreText = comboMultiplier > 1 ? `+${wordScore} x${comboMultiplier}` : `+${wordScore}`;
    this.juice.floatingText(midCell.x, midCell.y - 20, scoreText, colorHex, 24);

    this.cameras.main.shake(100, 0.003);
    SoundManager.play('found');
    this.time.delayedCall(300, () => SoundManager.play('gem'));

    this.handlePostFoundMechanics(word, placedWord, midCell);
    this.updateWordListUI();
    this.updateWorldUI();
    this.updateHUD();
    this.bumpHudGems();

    if (this.foundWords.size === this.levelWords.length) {
      this.stopTimer();
      this.time.delayedCall(600, () => this.onLevelComplete());
    }

    EventBus.emit(EVENTS.WORD_FOUND, word);
  }

  private handlePostFoundMechanics(
    word: string,
    placedWord: PlacedWord,
    midCell: { x: number; y: number }
  ): void {
    if (this.worldState.lockPrerequisite === word && this.worldState.lockedWord && !this.foundWords.has(this.worldState.lockedWord)) {
      this.juice.floatingText(midCell.x, midCell.y - 56, 'GATE OPEN', '#F2DEC0', 22);
      this.cameras.main.flash(180, 255, 231, 194, false);
    }

    if (this.worldState.cometWord === word && !this.worldState.cometClaimed && this.levelConfig.mechanic.type === 'space_comet') {
      this.worldState.cometClaimed = true;
      this.levelScore += this.levelConfig.mechanic.bonusScore;
      this.juice.floatingText(midCell.x, midCell.y - 54, `COMET +${this.levelConfig.mechanic.bonusScore}`, '#9CC9FF', 22);
      this.juice.sparkleAt(midCell.x, midCell.y, 0x9CC9FF, 14);
      SoundManager.play('gem');
    }

    if (this.levelConfig.mechanic.type === 'desert_gold') {
      const newGoldenCells = placedWord.cells.filter(({ row, col }) => {
        const key = this.getCellKey(row, col);
        return this.worldState.goldenCellKeys.has(key) && !this.worldState.collectedGoldenCellKeys.has(key);
      });

      if (newGoldenCells.length > 0) {
        newGoldenCells.forEach(({ row, col }) => this.worldState.collectedGoldenCellKeys.add(this.getCellKey(row, col)));

        const scoreBonus = newGoldenCells.length * this.levelConfig.mechanic.scoreBonus;
        const gemBonus = newGoldenCells.length * this.levelConfig.mechanic.gemBonus;
        this.levelScore += scoreBonus;
        CrazyGamesManager.addGems(gemBonus);

        this.juice.floatingText(midCell.x, midCell.y - 56, `SUN GOLD +${scoreBonus}`, '#FFE07A', 22);
        this.juice.gemBurst(midCell.x, midCell.y);
      }
    }
  }

  private onWordInvalid(): void {
    SoundManager.play('wrong');
    this.juice.flashCellsRed(this.selectedCells.map(({ row, col }) => this.cells[row][col]), 200, this.foundCellKeys);
    this.juice.shake(this.gridContainer, 3, 200);
    EventBus.emit(EVENTS.WORD_INVALID);
  }

  private applyBaseCellStyle(cell: CellSprite): void {
    if (this.foundCellKeys.has(this.getCellKey(cell.row, cell.col))) return;

    cell.bg.setTexture(this.getCellTextureKey('cell-bg'));
    cell.bg.clearTint();
    cell.bg.setAlpha(1);
    cell.bg.setPosition(cell.baseX, cell.baseY);
    cell.bg.setScale(1);

    cell.letter.setText(this.gridData.grid[cell.row][cell.col]);
    cell.letter.setPosition(cell.baseX, cell.baseY);
    cell.letter.setScale(1);
    cell.letter.setAlpha(1);
    cell.letter.setColor(this.levelConfig.visuals.letterColor);
    cell.letter.setFontStyle('');
    cell.letter.setShadow(0, 0, 'transparent', 0);

    cell.bg.setTint(this.levelConfig.visuals.cellTint);

    const cellKey = this.getCellKey(cell.row, cell.col);
    if (this.worldState.goldenCellKeys.has(cellKey) && !this.worldState.collectedGoldenCellKeys.has(cellKey)) {
      cell.bg.setTint(this.levelConfig.visuals.bonusTint);
      cell.letter.setColor('#FFF8DE');
      cell.letter.setShadow(0, 0, 'rgba(255, 223, 115, 0.9)', 8);
    }

    if (this.worldState.wildcardCellKeys.has(cellKey)) {
      cell.bg.setTint(this.levelConfig.visuals.accentTint);
      cell.letter.setColor('#FFF7FF');
      cell.letter.setShadow(0, 0, this.levelConfig.visuals.secondary, 8);
    }

    if (this.isCellInFrozenWord(cell.row, cell.col)) {
      cell.bg.setTint(this.isCellInCrackedFrozenWord(cell.row, cell.col) ? 0xd2f2ff : 0xb5e3ff);
      cell.letter.setColor('#F1FCFF');
      cell.letter.setShadow(0, 0, 'rgba(183, 244, 255, 0.8)', 6);
    }
  }

  private updateSelectionVisuals(): void {
    for (const row of this.cells) {
      for (const cell of row) {
        this.applyBaseCellStyle(cell);
      }
    }

    for (const { row, col } of this.selectedCells) {
      if (this.foundCellKeys.has(this.getCellKey(row, col))) continue;
      const cell = this.cells[row][col];
      cell.bg.setTexture(this.getCellTextureKey('cell-selected'));
      cell.bg.setTint(this.levelConfig.visuals.accentTint);
      cell.letter.setColor('#FFFFFF');
      cell.letter.setScale(1.15);
    }

    this.selectionGraphics.clear();
  }

  private clearSelection(): void {
    this.selectedCells = [];
    this.selectionDirection = null;

    for (const row of this.cells) {
      for (const cell of row) {
        this.applyBaseCellStyle(cell);
      }
    }

    this.selectionGraphics.clear();
  }

  private bumpHudGems(): void {
    const el = document.getElementById('hud-gems');
    if (!el) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  private async onLevelComplete(): Promise<void> {
    CrazyGamesManager.gameplayStop();
    const save = CrazyGamesManager.saveData;
    const level = save.level;

    const result = calculateLevelScore(
      level,
      this.levelScore,
      save.streak,
      this.comboState.multiplier,
      this.hintsUsedThisLevel,
      this.timedOut,
      this.timerSeconds
    );

    this.juice.screenFlash(COLORS.GOLD, 400);
    this.juice.crystalShower(this.cameras.main.centerX, this.cameras.main.centerY);
    this.stopWorldAmbientEffects();
    this.animateGridExit();
    SoundManager.play('complete');

    CrazyGamesManager.addScore(result.total);
    CrazyGamesManager.addGems(result.gemsEarned);
    CrazyGamesManager.trackUsedWords(this.levelWords);
    CrazyGamesManager.setLevelStars(level, result.stars);
    CrazyGamesManager.addWordsFound(this.foundWords.size);
    if (result.stars === 3) CrazyGamesManager.addPerfectLevel();

    if (save.streak % 5 === 0 || result.stars === 3) {
      CrazyGamesManager.happytime();
    }

    this.time.delayedCall(800, () => this.showLevelCompleteModal(level, result));
    CrazyGamesManager.advanceLevel();
  }

  private animateGridExit(): void {
    for (let row = this.gridData.size - 1; row >= 0; row--) {
      for (let col = 0; col < this.gridData.size; col++) {
        const cell = this.cells[row][col];
        const delay = (this.gridData.size - 1 - row) * 50 + col * 10;
        this.tweens.add({
          targets: [cell.bg, cell.letter],
          alpha: 0,
          scaleX: 0,
          scaleY: 0,
          y: '-=20',
          duration: 280,
          delay,
          ease: 'Back.easeIn',
        });
      }
    }
  }

  private showLevelCompleteModal(
    level: number,
    result: { total: number; gemsEarned: number; stars: number }
  ): void {
    const modal = document.getElementById('level-complete-modal')!;
    document.getElementById('complete-level-num')!.textContent = level.toString();
    document.getElementById('complete-words')!.textContent = `${this.foundWords.size}/${this.levelWords.length}`;
    document.getElementById('complete-score')!.textContent = result.total.toString();
    document.getElementById('complete-gems')!.textContent = result.gemsEarned.toString();

    const starsContainer = document.getElementById('complete-stars');
    if (starsContainer) {
      starsContainer.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const star = document.createElement('span');
        star.className = i < result.stars ? 'star-icon star-filled' : 'star-icon star-empty';
        star.innerHTML = i < result.stars ? ICONS.starFilled : ICONS.starEmpty;
        starsContainer.appendChild(star);
      }
    }

    const perfectEl = document.getElementById('complete-perfect')!;
    const perfectValueEl = perfectEl.querySelector('.complete-value');
    if (perfectValueEl) perfectValueEl.textContent = `+${SCORING.PERFECT_BONUS}`;
    perfectEl.style.display = result.stars === 3 ? 'flex' : 'none';
    modal.style.display = 'flex';
  }

  private applyWorldTheme(): void {
    const root = document.documentElement;
    const shell = document.getElementById('game-shell');
    const theme = this.levelConfig.visuals;
    const targets = [root, shell].filter((target): target is HTMLElement => Boolean(target));

    if (shell) {
      shell.setAttribute('data-world', this.levelConfig.world.id);
    }

    targets.forEach((target) => {
      target.style.setProperty('--world-primary', theme.primary);
      target.style.setProperty('--world-secondary', theme.secondary);
      target.style.setProperty('--world-accent', theme.accent);
      target.style.setProperty('--world-bg-top', theme.backgroundTop);
      target.style.setProperty('--world-bg-mid', theme.backgroundMid);
      target.style.setProperty('--world-bg-bottom', theme.backgroundBottom);
      target.style.setProperty('--world-glow', theme.glow);
      target.style.setProperty('--world-overlay-primary', theme.overlayPrimary);
      target.style.setProperty('--world-overlay-secondary', theme.overlaySecondary);
    });
  }

  private updateWorldUI(): void {
    const worldNameEl = document.getElementById('zone-name');
    const worldStatusEl = document.getElementById('world-status');

    if (worldNameEl) worldNameEl.textContent = this.levelConfig.world.name.toUpperCase();
    if (worldStatusEl) worldStatusEl.textContent = this.getWorldStatusText();
  }

  private getWorldStatusText(): string {
    const mechanic = this.levelConfig.mechanic;
    switch (mechanic.type) {
      case 'castle_lock':
        if (this.worldState.lockedWord && this.worldState.lockPrerequisite && !this.foundWords.has(this.worldState.lockedWord)) {
          return this.foundWords.has(this.worldState.lockPrerequisite)
            ? `${this.worldState.lockedWord} is unlocked.`
            : `Unlock ${this.worldState.lockedWord} with ${this.worldState.lockPrerequisite}.`;
        }
        return mechanic.hint;
      case 'space_comet':
        return this.worldState.cometClaimed ? 'Comet burst secured.' : mechanic.hint;
      case 'magic_wildcard':
        return `${mechanic.hint} ${this.worldState.wildcardCellKeys.size} rune cell${this.worldState.wildcardCellKeys.size > 1 ? 's are' : ' is'} active.`;
      case 'ice_frozen':
        return this.worldState.crackedFrozenWords.size > 0 ? 'Cracked words need one more solve.' : mechanic.hint;
      case 'desert_gold': {
        const remaining = [...this.worldState.goldenCellKeys].filter((key) => !this.worldState.collectedGoldenCellKeys.has(key)).length;
        return remaining > 0 ? `${remaining} golden cell${remaining > 1 ? 's' : ''} still shimmer.` : 'All golden cells collected.';
      }
      default:
        return mechanic.hint;
    }
  }

  private startTimer(): void {
    this.stopTimer();
    this.updateTimerUI();
    this.showTimer();

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.timerSeconds -= 1;
        this.updateTimerUI();
        if (this.timerSeconds <= 0) this.onTimerExpired();
      },
    });
  }

  private stopTimer(): void {
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }
  }

  private onTimerExpired(): void {
    this.stopTimer();
    this.timedOut = true;
    this.juice.screenFlash(COLORS.ERROR_RED, 400);
    SoundManager.play('wrong');
    this.time.delayedCall(600, () => this.onLevelComplete());
  }

  private updateTimerUI(): void {
    const el = document.getElementById('timer-display');
    if (!el) return;

    const minutes = Math.floor(this.timerSeconds / 60);
    const seconds = this.timerSeconds % 60;
    el.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    if (this.timerSeconds <= 15) {
      el.className = 'timer-value timer-critical';
    } else if (this.timerSeconds <= 30) {
      el.className = 'timer-value timer-warning';
    } else {
      el.className = 'timer-value';
    }
  }

  private showTimer(): void {
    const el = document.getElementById('timer-container');
    if (el) el.style.display = 'flex';
  }

  private hideTimer(): void {
    const el = document.getElementById('timer-container');
    if (el) el.style.display = 'none';
  }

  private updateComboUI(): void {
    const displayEl = document.getElementById('combo-display');
    const barEl = document.getElementById('combo-bar-fill');
    if (!displayEl || !barEl) return;

    if (this.comboState.multiplier > 1 && isComboActive(this.comboState)) {
      displayEl.style.display = 'flex';
      displayEl.textContent = `x${this.comboState.multiplier}`;
      barEl.style.width = `${getComboTimeFraction(this.comboState) * 100}%`;
    } else {
      displayEl.style.display = 'none';
      barEl.style.width = '0%';
    }
  }

  private startComboTick(): void {
    if (this.comboInterval) return;

    this.comboInterval = setInterval(() => {
      this.updateComboUI();
      if (!isComboActive(this.comboState)) {
        this.comboState.multiplier = 1;
        this.updateComboUI();
        this.stopComboTick();
      }
    }, 50);
  }

  private stopComboTick(): void {
    if (this.comboInterval) {
      clearInterval(this.comboInterval);
      this.comboInterval = null;
    }
  }

  private setupUI(): void {
    this.injectIcons();

    document.getElementById('btn-next-level')?.addEventListener('click', async () => {
      document.getElementById('level-complete-modal')!.style.display = 'none';
      SoundManager.play('click');

      const level = CrazyGamesManager.saveData.level;
      if (level % AD_INTERVAL_LEVELS === 0) {
        await CrazyGamesManager.requestMidgameAd();
      }

      CrazyGamesManager.gameplayStart();
      this.startLevel(level);
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => {
      SoundManager.play('click');
      document.getElementById('settings-modal')!.style.display = 'flex';
    });

    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      SoundManager.play('click');
      document.getElementById('settings-modal')!.style.display = 'none';
    });

    document.getElementById('btn-how-to-play')?.addEventListener('click', () => {
      SoundManager.play('click');
      document.getElementById('settings-modal')!.style.display = 'none';
      document.getElementById('tutorial-overlay')!.style.display = 'flex';
    });

    document.getElementById('toggle-sound')?.addEventListener('change', (event) => {
      const checked = (event.target as HTMLInputElement).checked;
      SoundManager.setEnabled(checked);
      CrazyGamesManager.saveData.soundEnabled = checked;
      CrazyGamesManager.saveGame();
    });

    document.getElementById('toggle-vibration')?.addEventListener('change', (event) => {
      const checked = (event.target as HTMLInputElement).checked;
      SoundManager.setVibrationEnabled(checked);
      CrazyGamesManager.saveData.vibrationEnabled = checked;
      CrazyGamesManager.saveGame();
    });

    document.getElementById('btn-detect')?.addEventListener('click', () => {
      SoundManager.play('click');
      this.useDetect();
    });
    document.getElementById('btn-undo')?.addEventListener('click', () => {
      SoundManager.play('click');
      this.useUndo();
    });
    document.getElementById('btn-ad-gems')?.addEventListener('click', () => {
      SoundManager.play('click');
      this.watchAdForGems();
    });

    const spinHandler = () => {
      SoundManager.play('click');
      this.openDailySpin();
    };
    document.getElementById('btn-daily-spin')?.addEventListener('click', spinHandler);
    document.getElementById('btn-daily-spin-mobile')?.addEventListener('click', spinHandler);
    document.getElementById('btn-close-spin')?.addEventListener('click', () => {
      document.getElementById('spin-modal')!.style.display = 'none';
    });
    document.getElementById('btn-spin')?.addEventListener('click', () => this.performSpin());
    document.getElementById('btn-spin-collect')?.addEventListener('click', () => {
      document.getElementById('spin-modal')!.style.display = 'none';
    });

    document.getElementById('btn-tutorial-ok')?.addEventListener('click', () => {
      document.getElementById('tutorial-overlay')!.style.display = 'none';
      CrazyGamesManager.markTutorialSeen();
    });

    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', () => {
        (backdrop.parentElement as HTMLElement).style.display = 'none';
      });
    });

    const save = CrazyGamesManager.saveData;
    if (!save.soundEnabled) {
      SoundManager.setEnabled(false);
      (document.getElementById('toggle-sound') as HTMLInputElement | null)!.checked = false;
    }
    if (!save.vibrationEnabled) {
      SoundManager.setVibrationEnabled(false);
      (document.getElementById('toggle-vibration') as HTMLInputElement | null)!.checked = false;
    }
  }

  private injectIcons(): void {
    setIcon('icon-streak', 'fire');
    setIcon('icon-gems', 'gem');
    setIcon('icon-settings', 'settings');
    setIcon('icon-spin', 'spin');
    setIcon('icon-detect', 'detect');
    setIcon('icon-undo', 'undo');
    setIcon('icon-watch-ad', 'watchAd');
    setIcon('icon-sound', 'soundOn');
    setIcon('icon-vibration', 'vibration');
    setIcon('icon-howto', 'howToPlay');

    const detectCost = document.getElementById('cost-detect');
    if (detectCost) detectCost.innerHTML = `${iconHTML('gem', 'cost-gem')} ${POWERUP_COSTS.DETECT}`;
    const undoCost = document.getElementById('cost-undo');
    if (undoCost) undoCost.innerHTML = `${iconHTML('gem', 'cost-gem')} ${POWERUP_COSTS.UNDO}`;
  }

  private useDetect(): void {
    if (this.timedOut) return;
    const save = CrazyGamesManager.saveData;

    if (save.freeHints > 0) {
      save.freeHints -= 1;
      CrazyGamesManager.saveGame();
    } else if (!CrazyGamesManager.spendGems(POWERUP_COSTS.DETECT)) {
      this.offerAdForPowerup('detect');
      return;
    }

    this.hintsUsedThisLevel += 1;
    CrazyGamesManager.incrementHintsUsed();

    const hintableWords = this.getHintableWords();
    if (hintableWords.length === 0) return;

    const word = hintableWords[Math.floor(Math.random() * hintableWords.length)];
    const placedWord = this.getPlacedWord(word);
    if (!placedWord) return;

    const firstCell = placedWord.cells[0];
    const x = this.gridContainer.x + firstCell.col * this.cellSize + this.cellSize / 2;
    const y = this.gridContainer.y + firstCell.row * this.cellSize + this.cellSize / 2;
    const gridCenterX = this.gridContainer.x + (this.gridData.size * this.cellSize) / 2;
    const gridCenterY = this.gridContainer.y + (this.gridData.size * this.cellSize) / 2;

    this.juice.radarPulse(gridCenterX, gridCenterY, (this.gridData.size * this.cellSize) / 2);

    this.time.delayedCall(400, () => {
      const flash = this.add.circle(x, y, this.cellSize / 2, COLORS.GOLD, 0.6);
      flash.setDepth(50);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        scaleX: 1.8,
        scaleY: 1.8,
        duration: 1200,
        ease: 'Cubic.easeOut',
        onComplete: () => flash.destroy(),
      });

      const cell = this.cells[firstCell.row][firstCell.col];
      this.tweens.add({
        targets: cell.letter,
        scaleX: 1.4,
        scaleY: 1.4,
        duration: 300,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut',
      });

      this.juice.sparkleAt(x, y, COLORS.GOLD, 8);
    });

    this.time.delayedCall(600, () => {
      const arrow = this.add.text(
        x + placedWord.dx * this.cellSize * 0.6,
        y + placedWord.dy * this.cellSize * 0.6,
        '\u2192',
        { fontFamily: '"Fredoka One", cursive', fontSize: '18px', color: '#FFD700' }
      );
      arrow.setOrigin(0.5);
      arrow.setDepth(50);
      arrow.setRotation(Math.atan2(placedWord.dy, placedWord.dx));

      this.tweens.add({
        targets: arrow,
        alpha: 0,
        duration: 800,
        delay: 500,
        onComplete: () => arrow.destroy(),
      });
    });

    this.updateHUD();
    EventBus.emit(EVENTS.POWERUP_DETECT);
  }

  private getHintableWords(): string[] {
    return this.levelWords.filter((word) => !this.foundWords.has(word) && !this.isWordLocked(word));
  }

  private useUndo(): void {
    if (!this.isDragging) return;
    if (!CrazyGamesManager.spendGems(POWERUP_COSTS.UNDO)) return;

    this.isDragging = false;
    this.clearSelection();
    this.updateHUD();
    EventBus.emit(EVENTS.POWERUP_UNDO);
  }

  private async watchAdForGems(): Promise<void> {
    if (this.adUsedThisLevel) return;
    const success = await CrazyGamesManager.requestRewardedAd();
    if (!success) return;

    CrazyGamesManager.addGems(POWERUP_COSTS.AD_REWARD);
    this.adUsedThisLevel = true;
    this.updateHUD();
    this.bumpHudGems();

    this.juice.floatingText(this.cameras.main.centerX, this.cameras.main.centerY, `+${POWERUP_COSTS.AD_REWARD} GEMS`, '#FFD700', 26);
    this.juice.gemBurst(this.cameras.main.centerX, this.cameras.main.centerY);
    SoundManager.play('gem');
  }

  private async offerAdForPowerup(type: 'detect'): Promise<void> {
    const success = await CrazyGamesManager.requestRewardedAd();
    if (!success) return;

    if (type === 'detect') {
      this.hintsUsedThisLevel += 1;
      CrazyGamesManager.incrementHintsUsed();

      const hintableWords = this.getHintableWords();
      if (hintableWords.length === 0) return;
      const word = hintableWords[Math.floor(Math.random() * hintableWords.length)];
      const placedWord = this.getPlacedWord(word);
      if (!placedWord) return;

      const firstCell = placedWord.cells[0];
      const x = this.gridContainer.x + firstCell.col * this.cellSize + this.cellSize / 2;
      const y = this.gridContainer.y + firstCell.row * this.cellSize + this.cellSize / 2;

      const flash = this.add.circle(x, y, this.cellSize / 2, COLORS.GOLD, 0.6);
      flash.setDepth(50);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        scaleX: 1.8,
        scaleY: 1.8,
        duration: 1200,
        ease: 'Cubic.easeOut',
        onComplete: () => flash.destroy(),
      });
      this.juice.sparkleAt(x, y, COLORS.GOLD, 8);
    }
  }

  private openDailySpin(): void {
    const modal = document.getElementById('spin-modal')!;
    const button = document.getElementById('btn-spin')!;
    const result = document.getElementById('spin-result')!;
    result.style.display = 'none';

    if (CrazyGamesManager.canDailySpin()) {
      button.style.display = 'block';
      button.textContent = 'SPIN!';
      button.removeAttribute('disabled');
    } else {
      button.style.display = 'block';
      button.textContent = 'COME BACK TOMORROW';
      button.setAttribute('disabled', 'true');
    }

    this.drawSpinWheel();
    modal.style.display = 'flex';
  }

  private drawSpinWheel(): void {
    const canvas = document.getElementById('spin-wheel') as HTMLCanvasElement | null;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 300;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 140;
    const segmentAngle = (Math.PI * 2) / SPIN_REWARDS.length;
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFD93D'];
    const darkColors = ['#CC4444', '#2A9A91', '#2088A0', '#CCA010'];

    for (let index = 0; index < SPIN_REWARDS.length; index++) {
      const startAngle = index * segmentAngle - Math.PI / 2;
      const endAngle = (index + 1) * segmentAngle - Math.PI / 2;
      const reward = SPIN_REWARDS[index];

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius);
      gradient.addColorStop(0, colors[index % colors.length]);
      gradient.addColorStop(1, darkColors[index % darkColors.length]);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const midAngle = (startAngle + endAngle) / 2;
      const textX = centerX + Math.cos(midAngle) * radius * 0.62;
      const textY = centerY + Math.sin(midAngle) * radius * 0.62;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '18px sans-serif';
      ctx.fillText(reward.type === 'gems' ? '\u{1F48E}' : '\u{1F3AF}', textX, textY - 10);
      ctx.font = 'bold 14px "Fredoka One", cursive';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(reward.label, textX, textY + 10);
      ctx.shadowColor = 'transparent';
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#2d1b69';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  private async performSpin(): Promise<void> {
    if (!CrazyGamesManager.canDailySpin()) return;

    const button = document.getElementById('btn-spin')!;
    button.setAttribute('disabled', 'true');
    button.textContent = 'SPINNING...';
    SoundManager.play('spin');

    const totalWeight = SPIN_REWARDS.reduce((sum, reward) => sum + reward.weight, 0);
    let randomWeight = Math.random() * totalWeight;
    let selectedIdx = 0;
    for (let index = 0; index < SPIN_REWARDS.length; index++) {
      randomWeight -= SPIN_REWARDS[index].weight;
      if (randomWeight <= 0) {
        selectedIdx = index;
        break;
      }
    }

    const reward = SPIN_REWARDS[selectedIdx];
    const canvas = document.getElementById('spin-wheel') as HTMLCanvasElement;
    const segmentAngle = 360 / SPIN_REWARDS.length;
    const targetAngle = (360 - (selectedIdx * segmentAngle + segmentAngle / 2)) % 360;
    this.spinAngle += 360 * 5 + targetAngle;
    canvas.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    canvas.style.transform = `rotate(${this.spinAngle}deg)`;

    await new Promise((resolve) => setTimeout(resolve, 3200));

    if (reward.type === 'gems') {
      CrazyGamesManager.addGems(reward.value);
    } else {
      CrazyGamesManager.saveData.freeHints += reward.value;
      CrazyGamesManager.saveGame();
    }

    CrazyGamesManager.markDailySpin();
    button.style.display = 'none';
    document.getElementById('spin-reward-text')!.textContent = `${reward.label}!`;
    document.getElementById('spin-result')!.style.display = 'block';
    this.updateHUD();

    await CrazyGamesManager.requestMidgameAd();
  }

  private updateHUD(): void {
    const save = CrazyGamesManager.saveData;
    const levelEl = document.getElementById('hud-level');
    const streakEl = document.getElementById('hud-streak');
    const gemsEl = document.getElementById('hud-gems');
    if (levelEl) levelEl.textContent = save.level.toString();
    if (streakEl) streakEl.textContent = save.streak.toString();
    if (gemsEl) gemsEl.textContent = save.gems.toString();

    const wordsEl = document.getElementById('stat-words');
    const perfectEl = document.getElementById('stat-perfect');
    const bestStreakEl = document.getElementById('stat-best-streak');
    if (wordsEl) wordsEl.textContent = save.wordsFound.toString();
    if (perfectEl) perfectEl.textContent = save.perfectLevels.toString();
    if (bestStreakEl) bestStreakEl.textContent = save.bestStreak.toString();
  }

  private updateWordListUI(): void {
    const allFound = this.foundWords.size === this.levelWords.length;
    const desktopList = document.getElementById('word-list');
    if (desktopList) {
      desktopList.innerHTML = '';
      this.levelWords.forEach((word) => {
        const item = document.createElement('div');
        const isFound = this.foundWords.has(word);
        const statusTag = this.getWordStatusTag(word);
        item.className = 'word-item';

        if (isFound) {
          const colorIndex = this.foundWordColors.get(word) ?? 0;
          item.classList.add('found', `word-color-${colorIndex % COLORS.FOUND_COLORS.length}`);
        }
        if (statusTag) item.classList.add(statusTag.className);

        item.innerHTML = `
          <span class="word-check">${isFound ? ICONS.checkFilled : ICONS.checkEmpty}</span>
          <span class="word-text">${word}</span>
          ${statusTag && !isFound ? `<span class="word-state ${statusTag.className}">${statusTag.label}</span>` : ''}
        `;
        desktopList.appendChild(item);
      });

      if (allFound) {
        const msg = document.createElement('div');
        msg.className = 'all-found-msg';
        msg.textContent = 'ALL FOUND!';
        desktopList.appendChild(msg);
      }
    }

    let mobileList = document.getElementById('mobile-word-list');
    if (!mobileList) {
      mobileList = document.createElement('div');
      mobileList.id = 'mobile-word-list';
      document.getElementById('main-content')?.insertBefore(mobileList, document.getElementById('main-content')!.firstChild);
    }

    mobileList.innerHTML = '';
    this.levelWords.forEach((word) => {
      const item = document.createElement('span');
      const isFound = this.foundWords.has(word);
      const statusTag = this.getWordStatusTag(word);
      item.className = 'mobile-word';
      if (isFound) {
        const colorIndex = this.foundWordColors.get(word) ?? 0;
        item.classList.add('found', `word-color-${colorIndex % COLORS.FOUND_COLORS.length}`);
      }
      if (statusTag) item.classList.add(statusTag.className);
      item.textContent = word;
      if (statusTag && !isFound) item.title = statusTag.label;
      mobileList!.appendChild(item);
    });
  }

  private getWordStatusTag(word: string): WordStatusTag | null {
    if (this.foundWords.has(word)) return null;
    if (this.isWordLocked(word)) return { label: 'LOCKED', className: 'word-locked' };
    if (this.worldState.crackedFrozenWords.has(word)) return { label: 'CRACKED', className: 'word-cracked' };
    if (this.worldState.frozenWords.has(word)) return { label: 'FROZEN', className: 'word-frozen' };
    return null;
  }

  private startIdleAnimation(): void {
    this.stopIdleAnimation();
    this.idleTimer = this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        if (this.isDragging) return;
        const count = 2 + Math.floor(Math.random() * 2);
        for (let index = 0; index < count; index++) {
          const row = Math.floor(Math.random() * this.gridData.size);
          const col = Math.floor(Math.random() * this.gridData.size);
          if (this.foundCellKeys.has(this.getCellKey(row, col))) continue;
          const cell = this.cells[row]?.[col];
          if (!cell) continue;

          this.tweens.add({
            targets: cell.letter,
            alpha: 0.5,
            duration: 400,
            yoyo: true,
            ease: 'Sine.easeInOut',
            delay: index * 150,
          });
        }
      },
    });
  }

  private stopIdleAnimation(): void {
    if (this.idleTimer) {
      this.idleTimer.destroy();
      this.idleTimer = null;
    }
  }

  private startWorldAmbientEffects(): void {
    this.stopWorldAmbientEffects();
    const mechanic = this.levelConfig.mechanic;

    if (mechanic.type === 'ocean_wave') {
      this.worldEffectTimer = this.time.addEvent({
        delay: 950,
        loop: true,
        callback: () => this.animateOceanWave(mechanic.amplitude),
      });
    }

    if (mechanic.type === 'desert_gold') {
      this.worldEffectTimer = this.time.addEvent({
        delay: 1200,
        loop: true,
        callback: () => this.animateGoldenCells(),
      });
    }

    if (mechanic.type === 'magic_wildcard') {
      this.worldEffectTimer = this.time.addEvent({
        delay: 1400,
        loop: true,
        callback: () => this.animateWildcardCells(),
      });
    }
  }

  private stopWorldAmbientEffects(): void {
    if (this.worldEffectTimer) {
      this.worldEffectTimer.destroy();
      this.worldEffectTimer = null;
    }

    for (const row of this.cells) {
      for (const cell of row) {
        if (!this.foundCellKeys.has(this.getCellKey(cell.row, cell.col))) {
          this.applyBaseCellStyle(cell);
        }
      }
    }
  }

  private animateOceanWave(amplitude: number): void {
    const candidates = shuffleArray([...this.worldState.waveCellKeys])
      .map((key) => this.getCellFromKey(key))
      .filter((cell): cell is CellSprite => {
        if (!cell) return false;
        return !this.foundCellKeys.has(this.getCellKey(cell.row, cell.col));
      })
      .slice(0, 4);

    candidates.forEach((cell, index) => {
      this.tweens.add({
        targets: [cell.bg, cell.letter],
        y: cell.baseY + (index % 2 === 0 ? amplitude : -amplitude),
        duration: 450,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private animateGoldenCells(): void {
    const candidates = shuffleArray([...this.worldState.goldenCellKeys])
      .filter((key) => !this.worldState.collectedGoldenCellKeys.has(key))
      .map((key) => this.getCellFromKey(key))
      .filter((cell): cell is CellSprite => {
        if (!cell) return false;
        return !this.foundCellKeys.has(this.getCellKey(cell.row, cell.col));
      })
      .slice(0, 3);

    candidates.forEach((cell) => {
      this.tweens.add({
        targets: [cell.bg, cell.letter],
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 220,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private animateWildcardCells(): void {
    const candidates = shuffleArray([...this.worldState.wildcardCellKeys])
      .map((key) => this.getCellFromKey(key))
      .filter((cell): cell is CellSprite => {
        if (!cell) return false;
        return !this.foundCellKeys.has(this.getCellKey(cell.row, cell.col));
      })
      .slice(0, 2);

    candidates.forEach((cell) => {
      this.tweens.add({
        targets: cell.letter,
        alpha: 0.65,
        duration: 240,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private getPlacedWord(word: string): PlacedWord | undefined {
    return this.gridData.placedWords.find((placedWord) => placedWord.word === word);
  }

  private isWordLocked(word: string): boolean {
    return this.worldState.lockedWord === word
      && this.worldState.lockPrerequisite !== null
      && !this.foundWords.has(this.worldState.lockPrerequisite);
  }

  private isCellInFrozenWord(row: number, col: number): boolean {
    return [...this.worldState.frozenWords].some((word) =>
      this.getPlacedWord(word)?.cells.some((cell) => cell.row === row && cell.col === col)
    );
  }

  private isCellInCrackedFrozenWord(row: number, col: number): boolean {
    return [...this.worldState.crackedFrozenWords].some((word) =>
      this.getPlacedWord(word)?.cells.some((cell) => cell.row === row && cell.col === col)
    );
  }

  private getCellKey(row: number, col: number): string {
    return `${row}:${col}`;
  }

  private getCellFromKey(key: string): CellSprite | null {
    const [rowStr, colStr] = key.split(':');
    const row = Number(rowStr);
    const col = Number(colStr);
    return this.cells[row]?.[col] ?? null;
  }

  private pickWordByPreference(words: string[], preference: 'longest' | 'shortest'): string | null {
    if (words.length === 0) return null;
    const sorted = [...words].sort((a, b) => preference === 'longest' ? b.length - a.length : a.length - b.length);
    return sorted[0] ?? null;
  }

  private pickWordGroup(words: string[], count: number, preference: 'longest' | 'shortest'): string[] {
    const sorted = [...words].sort((a, b) => preference === 'longest' ? b.length - a.length : a.length - b.length);
    return sorted.slice(0, count);
  }

  private pickUniqueCellsFromWords(count: number): { row: number; col: number }[] {
    const pool = shuffleArray(
      this.gridData.placedWords.flatMap((placedWord) =>
        placedWord.cells.map((cell) => ({ ...cell, key: this.getCellKey(cell.row, cell.col) }))
      )
    );

    const selected: { row: number; col: number }[] = [];
    const seen = new Set<string>();

    for (const cell of pool) {
      if (selected.length >= count) break;
      if (seen.has(cell.key)) continue;
      selected.push({ row: cell.row, col: cell.col });
      seen.add(cell.key);
    }

    return selected;
  }

  private pickUniqueCellsFromGrid(count: number): { row: number; col: number }[] {
    const cells: { row: number; col: number }[] = [];
    for (let row = 0; row < this.gridData.size; row++) {
      for (let col = 0; col < this.gridData.size; col++) {
        cells.push({ row, col });
      }
    }
    return shuffleArray(cells).slice(0, count);
  }
}

function randomBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
