import Phaser from 'phaser';
import { CrazyGamesManager } from '../managers/CrazyGamesManager';
import { SoundManager } from '../managers/SoundManager';
import EventBus, { EVENTS } from '../utils/EventBus';
import { selectWordsForLevel } from '../utils/WordDatabase';
import { generateGrid, GridData } from '../utils/GridGenerator';
import { GameJuice } from '../utils/GameJuice';
import {
  getLevelConfig, LevelConfig,
  createComboState, updateCombo, isComboActive, getComboTimeFraction, ComboState,
  calculateLevelScore,
} from '../utils/LevelSystem';
import {
  COLORS, SCORING, POWERUP_COSTS, AD_INTERVAL_LEVELS,
  SPIN_REWARDS, GEM_TYPES, GEM_COLORS,
  getCellSizeForGrid, CELL_GAP, IS_MOBILE,
} from '../consts';
import { setIcon, ICONS, iconHTML } from '../icons';

interface CellSprite {
  bg: Phaser.GameObjects.Image;
  letter: Phaser.GameObjects.Text;
  row: number;
  col: number;
}

export class GameScene extends Phaser.Scene {
  private gridContainer!: Phaser.GameObjects.Container;
  private cells: CellSprite[][] = [];
  private gridData!: GridData;
  private juice!: GameJuice;

  // Level config
  private levelConfig!: LevelConfig;
  private cellSize = 50;

  // Current level state
  private levelWords: string[] = [];
  private foundWords: Set<string> = new Set();
  private foundWordGraphics: Phaser.GameObjects.Graphics[] = [];
  private foundWordColors: Map<string, number> = new Map();
  private levelScore = 0;
  private hintsUsedThisLevel = 0;
  private adUsedThisLevel = false;

  // Combo
  private comboState!: ComboState;

  // Timer
  private timerSeconds = 0;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private timedOut = false;

  // Selection state
  private isDragging = false;
  private selectedCells: { row: number; col: number }[] = [];
  private selectionDirection: { dx: number; dy: number } | null = null;
  private selectionGraphics!: Phaser.GameObjects.Graphics;

  // Color cycling for found words
  private foundColorIndex = 0;
  private spinAngle = 0;

  // Track if UI setup done
  private uiSetup = false;

  // Page visibility save
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

    this.startLevel(CrazyGamesManager.saveData.level);

    if (!this.uiSetup) {
      this.setupUI();
      this.uiSetup = true;
    }

    this.updateHUD();
    CrazyGamesManager.gameplayStart();

    // Page visibility save
    this.setupPageVisibilitySave();
  }

  // =========================================
  // PAGE VISIBILITY SAVE
  // =========================================

  private setupPageVisibilitySave(): void {
    this.visibilityHandler = () => {
      if (document.hidden) {
        CrazyGamesManager.saveGame();
      }
    };
    this.beforeUnloadHandler = () => {
      CrazyGamesManager.saveGame();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  // =========================================
  // LEVEL MANAGEMENT
  // =========================================

  private startLevel(level: number): void {
    this.cleanupLevel();

    const save = CrazyGamesManager.saveData;
    this.levelConfig = getLevelConfig(level);
    this.cellSize = getCellSizeForGrid(this.levelConfig.gridSize);

    this.levelWords = selectWordsForLevel(level, save.usedWords);
    this.foundWords.clear();
    this.foundWordColors.clear();
    this.levelScore = 0;
    this.hintsUsedThisLevel = 0;
    this.adUsedThisLevel = false;
    this.foundColorIndex = 0;
    this.comboState = createComboState();
    this.timedOut = false;

    this.gridData = generateGrid(this.levelWords, this.levelConfig.gridSize, this.levelConfig.directions);
    this.buildGrid();

    // Grid entrance animation
    this.juice.animateGridEntrance(this.cells, this.levelConfig.gridSize);

    this.updateWordListUI();
    this.updateHUD();
    this.updateZoneUI();

    // Timer
    if (this.levelConfig.hasTimer) {
      this.timerSeconds = this.levelConfig.timerSeconds;
      this.startTimer();
    } else {
      this.timerSeconds = 0;
      this.hideTimer();
    }

    // Combo UI reset
    this.updateComboUI();

    EventBus.emit(EVENTS.LEVEL_START, level);
  }

  private cleanupLevel(): void {
    if (this.gridContainer) {
      this.gridContainer.destroy(true);
    }
    this.cells = [];
    this.selectedCells = [];
    this.selectionDirection = null;
    this.isDragging = false;

    for (const g of this.foundWordGraphics) {
      g.destroy();
    }
    this.foundWordGraphics = [];

    if (this.selectionGraphics) {
      this.selectionGraphics.clear();
    }

    this.stopTimer();
  }

  // =========================================
  // TIMER
  // =========================================

  private startTimer(): void {
    this.stopTimer();
    this.updateTimerUI();
    this.showTimer();

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timerSeconds--;
        this.updateTimerUI();
        if (this.timerSeconds <= 0) {
          this.onTimerExpired();
        }
      },
      loop: true,
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

    // Flash red
    this.juice.screenFlash(COLORS.ERROR_RED, 400);
    SoundManager.play('wrong');

    // Still complete the level but with 0 stars
    this.time.delayedCall(600, () => this.onLevelComplete());
  }

  private updateTimerUI(): void {
    const el = document.getElementById('timer-display');
    if (!el) return;
    const min = Math.floor(this.timerSeconds / 60);
    const sec = this.timerSeconds % 60;
    el.textContent = `${min}:${sec.toString().padStart(2, '0')}`;

    // Color based on time remaining
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

  // =========================================
  // COMBO UI
  // =========================================

  private updateComboUI(): void {
    const el = document.getElementById('combo-display');
    const barEl = document.getElementById('combo-bar-fill');
    if (!el || !barEl) return;

    if (this.comboState.multiplier > 1 && isComboActive(this.comboState)) {
      el.style.display = 'flex';
      el.textContent = `x${this.comboState.multiplier}`;

      const fraction = getComboTimeFraction(this.comboState);
      barEl.style.width = `${fraction * 100}%`;
    } else {
      el.style.display = 'none';
      barEl.style.width = '0%';
    }
  }

  private startComboTick(): void {
    // Use Phaser update or a simple interval for combo bar
    if (!this._comboInterval) {
      this._comboInterval = setInterval(() => {
        this.updateComboUI();
        if (!isComboActive(this.comboState)) {
          this.comboState.multiplier = 1;
          this.updateComboUI();
          if (this._comboInterval) {
            clearInterval(this._comboInterval);
            this._comboInterval = null;
          }
        }
      }, 50);
    }
  }

  private _comboInterval: ReturnType<typeof setInterval> | null = null;

  // =========================================
  // ZONE UI
  // =========================================

  private updateZoneUI(): void {
    const el = document.getElementById('zone-name');
    if (el) el.textContent = this.levelConfig.zone.name;
  }

  // =========================================
  // GRID BUILDING
  // =========================================

  private buildGrid(): void {
    const cellSize = this.cellSize;
    const gridSize = this.gridData.size;
    const totalSize = cellSize * gridSize;

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.gridContainer = this.add.container(
      centerX - totalSize / 2,
      centerY - totalSize / 2
    );
    this.gridContainer.setDepth(1);

    this.cells = [];

    for (let r = 0; r < gridSize; r++) {
      this.cells[r] = [];
      for (let c = 0; c < gridSize; c++) {
        const x = c * cellSize + cellSize / 2;
        const y = r * cellSize + cellSize / 2;

        const bg = this.add.image(x, y, 'cell-bg');
        bg.setDisplaySize(cellSize, cellSize);
        bg.setInteractive({ useHandCursor: false });

        const fontSize = Math.floor((cellSize - CELL_GAP) * 0.45);
        const letter = this.add.text(x, y, this.gridData.grid[r][c], {
          fontFamily: '"Fredoka One", cursive',
          fontSize: `${fontSize}px`,
          color: '#2a2a4e',
          fontStyle: 'bold',
        });
        letter.setOrigin(0.5);
        letter.setDepth(2);

        this.gridContainer.add([bg, letter]);
        this.cells[r][c] = { bg, letter, row: r, col: c };

        bg.on('pointerdown', () => this.onCellPointerDown(r, c));
      }
    }

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const cell = this.getCellAtPointer(pointer);
      if (cell) this.onCellPointerOver(cell.row, cell.col);
    });

    this.input.on('pointerup', () => this.onPointerUp());
  }

  // =========================================
  // INPUT HANDLING
  // =========================================

  private getCellAtPointer(pointer: Phaser.Input.Pointer): { row: number; col: number } | null {
    const cellSize = this.cellSize;
    const localX = pointer.x - this.gridContainer.x;
    const localY = pointer.y - this.gridContainer.y;

    const col = Math.floor(localX / cellSize);
    const row = Math.floor(localY / cellSize);

    const gridSize = this.gridData.size;
    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return null;
    return { row, col };
  }

  private onCellPointerDown(row: number, col: number): void {
    if (this.timedOut) return;
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
      const dx = Math.sign(col - first.col);
      const dy = Math.sign(row - first.row);
      if (dx === 0 && dy === 0) return;
      if (Math.abs(col - first.col) > 1 || Math.abs(row - first.row) > 1) return;
      this.selectionDirection = { dx, dy };
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

    const newSelection: { row: number; col: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      newSelection.push({
        row: first.row + i * dy,
        col: first.col + i * dx,
      });
    }

    if (newSelection.length !== this.selectedCells.length ||
        newSelection[newSelection.length - 1].row !== last.row ||
        newSelection[newSelection.length - 1].col !== last.col) {
      this.selectedCells = newSelection;
      this.updateSelectionVisuals();
      SoundManager.playLetterSelect(this.selectedCells.length - 1);
    }
  }

  private onPointerUp(): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    if (this.selectedCells.length < 2) {
      this.clearSelection();
      return;
    }

    const selectedWord = this.selectedCells
      .map(c => this.gridData.grid[c.row][c.col])
      .join('');

    const match = this.levelWords.find(
      w => !this.foundWords.has(w) && (w === selectedWord || w === [...selectedWord].reverse().join(''))
    );

    if (match) {
      this.onWordFound(match);
    } else {
      this.onWordInvalid();
    }

    this.clearSelection();
  }

  // =========================================
  // WORD FOUND / INVALID
  // =========================================

  private onWordFound(word: string): void {
    this.foundWords.add(word);
    const colorIndex = this.foundColorIndex % COLORS.FOUND_COLORS.length;
    const color = COLORS.FOUND_COLORS[colorIndex];
    const colorHex = COLORS.FOUND_COLORS_HEX[colorIndex];
    this.foundWordColors.set(word, colorIndex);
    this.foundColorIndex++;

    const placedWord = this.gridData.placedWords.find(pw => pw.word === word);
    if (!placedWord) return;

    const cellSize = this.cellSize;
    const cellCenters = placedWord.cells.map(c => ({
      x: this.gridContainer.x + c.col * cellSize + cellSize / 2,
      y: this.gridContainer.y + c.row * cellSize + cellSize / 2,
    }));

    // 1. Colored highlight line
    const lineGfx = this.juice.animateFoundLine(cellCenters, color, cellSize);
    this.foundWordGraphics.push(lineGfx);

    // 2. Text glow
    for (const cell of placedWord.cells) {
      const cs = this.cells[cell.row][cell.col];
      cs.letter.setShadow(0, 0, colorHex, 8, false, true);
    }

    // 3. Bounce letters
    for (let i = 0; i < placedWord.cells.length; i++) {
      const cell = placedWord.cells[i];
      this.time.delayedCall(i * 40, () => {
        this.juice.popSprite(this.cells[cell.row][cell.col].letter, 1.3, 200);
      });
    }

    // 4. Star sparkles
    for (const pos of cellCenters) {
      this.juice.starBurst(pos.x, pos.y, color, 5);
    }

    // 5. Combo + Score
    const comboMult = updateCombo(this.comboState);
    const wordScore = Math.floor(word.length * SCORING.WORD_MULTIPLIER * comboMult);
    this.levelScore += wordScore;

    // Start combo tick
    this.startComboTick();
    this.updateComboUI();

    // 6. Floating score text (show combo if > 1)
    const midCell = cellCenters[Math.floor(cellCenters.length / 2)];
    const scoreText = comboMult > 1 ? `+${wordScore} x${comboMult}` : `+${wordScore}`;
    this.juice.floatingText(midCell.x, midCell.y - 20, scoreText, colorHex, 24);

    // 7. Camera shake
    this.cameras.main.shake(100, 0.003);

    // 8. Sound
    SoundManager.play('found');

    // 9. Gem sound
    this.time.delayedCall(300, () => SoundManager.play('gem'));

    // 10. Update word list UI
    this.updateWordListUI();

    // 11. HUD update
    this.updateHUD();
    this.bumpHudGems();

    // Check level complete
    if (this.foundWords.size === this.levelWords.length) {
      this.stopTimer();
      this.time.delayedCall(600, () => this.onLevelComplete());
    }

    EventBus.emit(EVENTS.WORD_FOUND, word);
  }

  private onWordInvalid(): void {
    SoundManager.play('wrong');

    const flashCells = this.selectedCells.map(c => this.cells[c.row][c.col]);
    this.juice.flashCellsRed(flashCells, 200);
    this.juice.shake(this.gridContainer, 3, 200);

    EventBus.emit(EVENTS.WORD_INVALID);
  }

  // =========================================
  // LEVEL COMPLETE
  // =========================================

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

    // 1. Screen flash
    this.juice.screenFlash(COLORS.GOLD, 400);

    // 2. Crystal shower
    this.juice.crystalShower(this.cameras.main.centerX, this.cameras.main.centerY);

    // 3. Grid exit animation
    this.juice.animateGridExit(this.cells, this.gridData.size);

    // 4. Sound
    SoundManager.play('complete');

    // 5. Rewards
    CrazyGamesManager.addScore(result.total);
    CrazyGamesManager.addGems(result.gemsEarned);
    CrazyGamesManager.trackUsedWords(this.levelWords);
    CrazyGamesManager.setLevelStars(level, result.stars);
    CrazyGamesManager.addWordsFound(this.foundWords.size);
    if (result.stars === 3) {
      CrazyGamesManager.addPerfectLevel();
    }

    // Random collection gem
    const gemId = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)] + '_' +
                  GEM_COLORS[Math.floor(Math.random() * GEM_COLORS.length)];
    CrazyGamesManager.addToCollection(gemId);

    if (save.streak % 5 === 0 || result.stars === 3) {
      CrazyGamesManager.happytime();
    }

    // 6. Show modal
    this.time.delayedCall(800, () => {
      this.showLevelCompleteModal(level, result);
    });

    CrazyGamesManager.advanceLevel();
  }

  private showLevelCompleteModal(
    level: number,
    result: { total: number; gemsEarned: number; stars: number }
  ): void {
    const modal = document.getElementById('level-complete-modal')!;
    document.getElementById('complete-level-num')!.textContent = level.toString();
    document.getElementById('complete-words')!.textContent = `${this.levelWords.length}/${this.levelWords.length}`;
    document.getElementById('complete-score')!.textContent = result.total.toString();
    document.getElementById('complete-gems')!.textContent = result.gemsEarned.toString();

    // Stars
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
    perfectEl.style.display = result.stars === 3 ? 'flex' : 'none';

    modal.style.display = 'flex';
  }

  // =========================================
  // SELECTION VISUALS
  // =========================================

  private updateSelectionVisuals(): void {
    const cellSize = this.cellSize;

    // Reset non-found cells
    for (const row of this.cells) {
      for (const cell of row) {
        cell.bg.setTexture('cell-bg');
        cell.letter.setColor('#2a2a4e');
        cell.letter.setScale(1);
      }
    }

    // Re-apply found word colors
    for (const [word, colorIdx] of this.foundWordColors) {
      const hex = COLORS.FOUND_COLORS_HEX[colorIdx];
      const placed = this.gridData.placedWords.find(pw => pw.word === word);
      if (placed) {
        for (const c of placed.cells) {
          this.cells[c.row][c.col].letter.setShadow(0, 0, hex, 8, false, true);
        }
      }
    }

    // Highlight selected cells
    for (let i = 0; i < this.selectedCells.length; i++) {
      const { row, col } = this.selectedCells[i];
      this.cells[row][col].bg.setTexture('cell-selected');
      this.cells[row][col].letter.setColor('#1a6b65');
      this.cells[row][col].letter.setScale(1.15);
    }

    // Draw selection glow line
    this.selectionGraphics.clear();
    if (this.selectedCells.length >= 2) {
      this.selectionGraphics.lineStyle(cellSize * 0.55, COLORS.SELECT_COLOR, 0.08);
      this.drawSelectionPath(cellSize);

      this.selectionGraphics.lineStyle(cellSize * 0.35, COLORS.SELECT_COLOR, 0.18);
      this.drawSelectionPath(cellSize);

      this.selectionGraphics.lineStyle(cellSize * 0.15, COLORS.SELECT_COLOR, 0.3);
      this.drawSelectionPath(cellSize);
    }
  }

  private drawSelectionPath(cellSize: number): void {
    this.selectionGraphics.beginPath();
    const first = this.selectedCells[0];
    this.selectionGraphics.moveTo(
      this.gridContainer.x + first.col * cellSize + cellSize / 2,
      this.gridContainer.y + first.row * cellSize + cellSize / 2
    );
    for (let i = 1; i < this.selectedCells.length; i++) {
      const cell = this.selectedCells[i];
      this.selectionGraphics.lineTo(
        this.gridContainer.x + cell.col * cellSize + cellSize / 2,
        this.gridContainer.y + cell.row * cellSize + cellSize / 2
      );
    }
    this.selectionGraphics.strokePath();
  }

  private clearSelection(): void {
    this.selectedCells = [];
    this.selectionDirection = null;

    for (const row of this.cells) {
      for (const cell of row) {
        cell.bg.setTexture('cell-bg');
        cell.letter.setColor('#2a2a4e');
        cell.letter.setScale(1);
      }
    }

    // Re-apply found word text glow
    for (const [word, colorIdx] of this.foundWordColors) {
      const hex = COLORS.FOUND_COLORS_HEX[colorIdx];
      const placed = this.gridData.placedWords.find(pw => pw.word === word);
      if (placed) {
        for (const c of placed.cells) {
          this.cells[c.row][c.col].letter.setShadow(0, 0, hex, 8, false, true);
        }
      }
    }

    this.selectionGraphics.clear();
  }

  // =========================================
  // HUD ANIMATIONS
  // =========================================

  private bumpHudGems(): void {
    const el = document.getElementById('hud-gems');
    if (!el) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  // =========================================
  // UI BINDINGS
  // =========================================

  private setupUI(): void {
    // Inject SVG icons
    this.injectIcons();

    // Next level button
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

    // Settings
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      SoundManager.play('click');
      document.getElementById('settings-modal')!.style.display = 'flex';
    });

    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      SoundManager.play('click');
      document.getElementById('settings-modal')!.style.display = 'none';
    });

    // How to Play button in settings
    document.getElementById('btn-how-to-play')?.addEventListener('click', () => {
      SoundManager.play('click');
      document.getElementById('settings-modal')!.style.display = 'none';
      const tutorial = document.getElementById('tutorial-overlay');
      if (tutorial) tutorial.style.display = 'flex';
    });

    // Sound toggle
    document.getElementById('toggle-sound')?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      SoundManager.setEnabled(checked);
      CrazyGamesManager.saveData.soundEnabled = checked;
      CrazyGamesManager.saveGame();
    });

    // Vibration toggle
    document.getElementById('toggle-vibration')?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      CrazyGamesManager.saveData.vibrationEnabled = checked;
      SoundManager.setVibrationEnabled(checked);
      CrazyGamesManager.saveGame();
    });

    // Power-ups
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

    // Daily spin
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

    // Collection
    document.getElementById('btn-collection')?.addEventListener('click', () => {
      SoundManager.play('click');
      this.openCollection();
    });

    document.getElementById('btn-close-collection')?.addEventListener('click', () => {
      document.getElementById('collection-modal')!.style.display = 'none';
    });

    // Tutorial dismiss
    document.getElementById('btn-tutorial-ok')?.addEventListener('click', () => {
      document.getElementById('tutorial-overlay')!.style.display = 'none';
      CrazyGamesManager.markTutorialSeen();
    });

    // Modal backdrop close
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', () => {
        (backdrop.parentElement as HTMLElement).style.display = 'none';
      });
    });

    // Restore sound setting
    const save = CrazyGamesManager.saveData;
    if (!save.soundEnabled) {
      SoundManager.setEnabled(false);
      const toggle = document.getElementById('toggle-sound') as HTMLInputElement;
      if (toggle) toggle.checked = false;
    }
    if (!save.vibrationEnabled) {
      SoundManager.setVibrationEnabled(false);
      const toggle = document.getElementById('toggle-vibration') as HTMLInputElement;
      if (toggle) toggle.checked = false;
    }
  }

  // =========================================
  // SVG ICONS
  // =========================================

  private injectIcons(): void {
    setIcon('icon-streak', 'fire');
    setIcon('icon-gems', 'gem');
    setIcon('icon-settings', 'settings');
    setIcon('icon-collection', 'chest');
    setIcon('icon-spin', 'spin');
    setIcon('icon-detect', 'detect');
    setIcon('icon-undo', 'undo');
    setIcon('icon-watch-ad', 'watchAd');
    setIcon('icon-sound', 'soundOn');
    setIcon('icon-vibration', 'vibration');
    setIcon('icon-howto', 'howToPlay');

    // Power-up costs with gem icon
    const costDetect = document.getElementById('cost-detect');
    if (costDetect) costDetect.innerHTML = `${iconHTML('gem', 'cost-gem')} ${POWERUP_COSTS.DETECT}`;
    const costUndo = document.getElementById('cost-undo');
    if (costUndo) costUndo.innerHTML = `${iconHTML('gem', 'cost-gem')} ${POWERUP_COSTS.UNDO}`;
  }

  // =========================================
  // POWER-UPS
  // =========================================

  private useDetect(): void {
    if (this.timedOut) return;
    const save = CrazyGamesManager.saveData;

    if (save.freeHints > 0) {
      save.freeHints--;
      CrazyGamesManager.saveGame();
    } else if (!CrazyGamesManager.spendGems(POWERUP_COSTS.DETECT)) {
      this.offerAdForPowerup('detect');
      return;
    }

    this.hintsUsedThisLevel++;
    CrazyGamesManager.incrementHintsUsed();

    const unfound = this.levelWords.filter(w => !this.foundWords.has(w));
    if (unfound.length === 0) return;

    const word = unfound[Math.floor(Math.random() * unfound.length)];
    const placed = this.gridData.placedWords.find(pw => pw.word === word);
    if (!placed) return;

    const firstCell = placed.cells[0];
    const cellSize = this.cellSize;
    const x = this.gridContainer.x + firstCell.col * cellSize + cellSize / 2;
    const y = this.gridContainer.y + firstCell.row * cellSize + cellSize / 2;

    // Radar pulse from grid center
    const gridCX = this.gridContainer.x + (this.gridData.size * cellSize) / 2;
    const gridCY = this.gridContainer.y + (this.gridData.size * cellSize) / 2;
    this.juice.radarPulse(gridCX, gridCY, this.gridData.size * cellSize / 2);

    // Flash the first letter cell
    this.time.delayedCall(400, () => {
      const flash = this.add.circle(x, y, cellSize / 2, COLORS.GOLD, 0.6);
      flash.setDepth(50);

      this.tweens.add({
        targets: flash,
        alpha: 0, scaleX: 1.8, scaleY: 1.8,
        duration: 1200, ease: 'Cubic.easeOut',
        onComplete: () => flash.destroy(),
      });

      const cell = this.cells[firstCell.row][firstCell.col];
      this.tweens.add({
        targets: cell.letter,
        scaleX: 1.4, scaleY: 1.4,
        duration: 300, yoyo: true, repeat: 2,
        ease: 'Sine.easeInOut',
      });

      this.juice.sparkleAt(x, y, COLORS.GOLD, 8);
    });

    // Show direction arrow
    this.time.delayedCall(600, () => {
      const arrowX = x + placed.dx * cellSize * 0.6;
      const arrowY = y + placed.dy * cellSize * 0.6;
      const arrow = this.add.text(arrowX, arrowY, '\u2192', {
        fontFamily: '"Fredoka One", cursive',
        fontSize: '18px',
        color: '#FFD700',
      });
      arrow.setOrigin(0.5);
      arrow.setDepth(50);
      arrow.setRotation(Math.atan2(placed.dy, placed.dx));

      this.tweens.add({
        targets: arrow,
        alpha: 0, duration: 800, delay: 500,
        onComplete: () => arrow.destroy(),
      });
    });

    this.updateHUD();
    EventBus.emit(EVENTS.POWERUP_DETECT);
  }

  private useUndo(): void {
    if (!this.isDragging) return;

    if (!CrazyGamesManager.spendGems(POWERUP_COSTS.UNDO)) {
      return;
    }

    this.isDragging = false;
    this.clearSelection();
    this.updateHUD();
    EventBus.emit(EVENTS.POWERUP_UNDO);
  }

  private async watchAdForGems(): Promise<void> {
    if (this.adUsedThisLevel) return;

    const success = await CrazyGamesManager.requestRewardedAd();
    if (success) {
      CrazyGamesManager.addGems(POWERUP_COSTS.AD_REWARD);
      this.adUsedThisLevel = true;
      this.updateHUD();
      this.bumpHudGems();

      this.juice.floatingText(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        `+${POWERUP_COSTS.AD_REWARD} GEMS`,
        '#FFD700', 26
      );
      this.juice.gemBurst(this.cameras.main.centerX, this.cameras.main.centerY);
      SoundManager.play('gem');
    }
  }

  private async offerAdForPowerup(type: string): Promise<void> {
    const success = await CrazyGamesManager.requestRewardedAd();
    if (success && type === 'detect') {
      this.hintsUsedThisLevel++;

      const unfound = this.levelWords.filter(w => !this.foundWords.has(w));
      if (unfound.length === 0) return;
      const word = unfound[Math.floor(Math.random() * unfound.length)];
      const placed = this.gridData.placedWords.find(pw => pw.word === word);
      if (!placed) return;

      const firstCell = placed.cells[0];
      const cellSize = this.cellSize;
      const x = this.gridContainer.x + firstCell.col * cellSize + cellSize / 2;
      const y = this.gridContainer.y + firstCell.row * cellSize + cellSize / 2;

      const flash = this.add.circle(x, y, cellSize / 2, COLORS.GOLD, 0.6);
      flash.setDepth(50);
      this.tweens.add({
        targets: flash,
        alpha: 0, scaleX: 1.8, scaleY: 1.8,
        duration: 1200, ease: 'Cubic.easeOut',
        onComplete: () => flash.destroy(),
      });
      this.juice.sparkleAt(x, y, COLORS.GOLD, 8);
    }
  }

  // =========================================
  // DAILY SPIN
  // =========================================

  private openDailySpin(): void {
    const modal = document.getElementById('spin-modal')!;
    const btnSpin = document.getElementById('btn-spin')!;
    const result = document.getElementById('spin-result')!;

    result.style.display = 'none';

    if (CrazyGamesManager.canDailySpin()) {
      btnSpin.style.display = 'block';
      btnSpin.textContent = 'SPIN!';
      btnSpin.removeAttribute('disabled');
    } else {
      btnSpin.style.display = 'block';
      btnSpin.textContent = 'COME BACK TOMORROW';
      btnSpin.setAttribute('disabled', 'true');
    }

    this.drawSpinWheel();
    modal.style.display = 'flex';
  }

  private drawSpinWheel(): void {
    const canvas = document.getElementById('spin-wheel') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const cx = 150, cy = 150, r = 140;

    ctx.clearRect(0, 0, 300, 300);

    const segments = SPIN_REWARDS.length;
    const segAngle = (Math.PI * 2) / segments;
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFD93D'];

    for (let i = 0; i < segments; i++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, i * segAngle - Math.PI / 2, (i + 1) * segAngle - Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((i + 0.5) * segAngle - Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px "Fredoka One", cursive';
      ctx.fillText(SPIN_REWARDS[i].label, r * 0.6, 5);
      ctx.restore();
    }
  }

  private async performSpin(): Promise<void> {
    if (!CrazyGamesManager.canDailySpin()) return;

    const btnSpin = document.getElementById('btn-spin')!;
    btnSpin.setAttribute('disabled', 'true');
    btnSpin.textContent = 'SPINNING...';

    SoundManager.play('spin');

    const totalWeight = SPIN_REWARDS.reduce((s, r) => s + r.weight, 0);
    let rng = Math.random() * totalWeight;
    let selectedIdx = 0;
    for (let i = 0; i < SPIN_REWARDS.length; i++) {
      rng -= SPIN_REWARDS[i].weight;
      if (rng <= 0) { selectedIdx = i; break; }
    }

    const reward = SPIN_REWARDS[selectedIdx];

    const canvas = document.getElementById('spin-wheel') as HTMLCanvasElement;
    const segAngle = 360 / SPIN_REWARDS.length;
    this.spinAngle += 360 * 5 + (selectedIdx * segAngle + segAngle / 2);
    canvas.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    canvas.style.transform = `rotate(${this.spinAngle}deg)`;

    await new Promise(resolve => setTimeout(resolve, 3200));

    if (reward.type === 'gems') {
      CrazyGamesManager.addGems(reward.value);
    } else if (reward.type === 'hint') {
      CrazyGamesManager.saveData.freeHints += reward.value;
      CrazyGamesManager.saveGame();
    }

    CrazyGamesManager.markDailySpin();

    btnSpin.style.display = 'none';
    const resultEl = document.getElementById('spin-result')!;
    document.getElementById('spin-reward-text')!.textContent = reward.label + '!';
    resultEl.style.display = 'block';

    this.updateHUD();

    await CrazyGamesManager.requestMidgameAd();
  }

  // =========================================
  // COLLECTION
  // =========================================

  private openCollection(): void {
    const grid = document.getElementById('collection-grid')!;
    grid.innerHTML = '';

    const collected = CrazyGamesManager.saveData.collection;
    const gemSymbols: Record<string, string> = {
      Diamond: '\u25C6', Ruby: '\u25C8', Emerald: '\u25C7', Sapphire: '\u25CA', Amethyst: '\u25C9',
    };
    const colorMap: Record<string, string> = {
      Red: '#FF6B6B', Blue: '#45B7D1', Green: '#4ECDC4', Purple: '#A855F7',
    };

    for (const type of GEM_TYPES) {
      for (const color of GEM_COLORS) {
        const id = `${type}_${color}`;
        const item = document.createElement('div');
        item.className = 'collection-item' + (collected.includes(id) ? ' collected' : '');
        item.style.color = colorMap[color] || '#FFFFFF';
        item.textContent = gemSymbols[type] || '\u25C6';
        item.title = `${color} ${type}`;
        grid.appendChild(item);
      }
    }

    document.getElementById('collection-modal')!.style.display = 'flex';
  }

  // =========================================
  // HUD & WORD LIST
  // =========================================

  private updateHUD(): void {
    const save = CrazyGamesManager.saveData;
    const levelEl = document.getElementById('hud-level');
    const streakEl = document.getElementById('hud-streak');
    const gemsEl = document.getElementById('hud-gems');

    if (levelEl) levelEl.textContent = save.level.toString();
    if (streakEl) streakEl.textContent = save.streak.toString();
    if (gemsEl) gemsEl.textContent = save.gems.toString();
  }

  private updateWordListUI(): void {
    const allFound = this.foundWords.size === this.levelWords.length;

    // Desktop word list
    const wordList = document.getElementById('word-list');
    if (wordList) {
      wordList.innerHTML = '';

      this.levelWords.forEach((word) => {
        const item = document.createElement('div');
        item.className = 'word-item';
        const isFound = this.foundWords.has(word);

        if (isFound) {
          const cIdx = this.foundWordColors.get(word) ?? 0;
          item.classList.add('found', `word-color-${cIdx % COLORS.FOUND_COLORS.length}`);
        }

        item.innerHTML = `
          <span class="word-check">${isFound ? ICONS.checkFilled : ICONS.checkEmpty}</span>
          <span class="word-text">${word}</span>
        `;
        wordList.appendChild(item);
      });

      if (allFound) {
        const msg = document.createElement('div');
        msg.className = 'all-found-msg';
        msg.textContent = 'ALL FOUND!';
        wordList.appendChild(msg);
      }
    }

    // Mobile word list
    let mobileList = document.getElementById('mobile-word-list');
    if (!mobileList) {
      mobileList = document.createElement('div');
      mobileList.id = 'mobile-word-list';
      const mainContent = document.getElementById('main-content');
      if (mainContent) mainContent.insertBefore(mobileList, mainContent.firstChild);
    }

    mobileList.innerHTML = '';
    this.levelWords.forEach((word) => {
      const span = document.createElement('span');
      span.className = 'mobile-word';
      if (this.foundWords.has(word)) {
        const cIdx = this.foundWordColors.get(word) ?? 0;
        span.classList.add('found', `word-color-${cIdx % COLORS.FOUND_COLORS.length}`);
      }
      span.textContent = word;
      mobileList!.appendChild(span);
    });
  }
}
