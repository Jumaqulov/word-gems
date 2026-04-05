import Phaser from 'phaser';
import { CrazyGamesManager } from '../managers/CrazyGamesManager';
import { SoundManager } from '../managers/SoundManager';
import { BackgroundFXManager } from '../managers/BackgroundFXManager';
import {
  BoardThemeProfile,
  createWordRuntimeState,
  getBoardThemeProfile,
  WordRuntimeState,
} from './gameScene/boardTheme';
import { getCellTextureKey, getFoundCellTextureKey, useSpaciousCellTextures } from './gameScene/cellTextures';
import { applyReadableLetterStyle, colorValueToCss, hexToColorValue, mixColor } from './gameScene/colorUtils';
import {
  CellCoord,
  findMatchedWord,
  resolveSelectionHover,
  SelectionDirection,
} from './gameScene/selectionLogic';
import {
  evaluatePreFoundMechanic,
  evaluatePostFoundMechanics,
  getFrozenWordBlockedText,
  getLockedWordFeedbackText,
} from './gameScene/wordMechanics';
import EventBus, { EVENTS } from '../utils/EventBus';
import { selectWordsForLevel } from '../utils/WordDatabase';
import { generateGrid, GridData, PlacedWord } from '../utils/GridGenerator';
import { GameJuice } from '../utils/GameJuice';
import { scheduleResponsiveLayout } from '../utils/ResponsiveLayout';
import { applyWorldScene } from '../utils/WorldSceneLoader';
import {
  calculateLevelScore,
  getCellSizeForGrid,
  getLevelConfig,
  LevelConfig,
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
import { TimerComboController } from './gameScene/TimerComboController';
import { WorldEffectsController } from './gameScene/WorldEffectsController';

interface CellSprite {
  bg: Phaser.GameObjects.Image;
  letter: Phaser.GameObjects.Text;
  row: number;
  col: number;
  baseX: number;
  baseY: number;
}

interface WordStatusTag {
  label: string;
  className: string;
}

export class GameScene extends Phaser.Scene {
  private gridContainer!: Phaser.GameObjects.Container;
  private cells: CellSprite[][] = [];
  private gridData!: GridData;
  private actualGridLetters: string[][] = [];
  private juice!: GameJuice;

  private levelConfig!: LevelConfig;
  private boardThemeProfile!: BoardThemeProfile;
  private cellSize = 50;
  private cellDisplaySize = 50;
  private levelWords: string[] = [];
  private bonusWords = new Set<string>();
  private foundWords = new Set<string>();
  private foundWordColors = new Map<string, number>();
  private foundCellKeys = new Set<string>();
  private levelScore = 0;
  private hintsUsedThisLevel = 0;
  private adUsedThisLevel = false;
  private foundColorIndex = 0;
  private spinAngle = 0;

  private worldState: WordRuntimeState = createWordRuntimeState();
  private backgroundFX: BackgroundFXManager | null = null;
  private timerCombo!: TimerComboController;
  private worldEffects!: WorldEffectsController;
  private timedOut = false;
  private resolutionState: 'active' | 'success' | 'timeout' = 'active';

  private isDragging = false;
  private selectedCells: CellCoord[] = [];
  private selectionDirection: SelectionDirection | null = null;
  private selectionGraphics!: Phaser.GameObjects.Graphics;

  private idleTimer: Phaser.Time.TimerEvent | null = null;
  private uiSetup = false;
  private inputHandlersSetup = false;
  private isLevelTransitioning = false;
  private visibilityHandler: (() => void) | null = null;
  private beforeUnloadHandler: (() => void) | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.juice = new GameJuice(this);
    this.selectionGraphics = this.add.graphics();
    this.selectionGraphics.setDepth(10);
    this.backgroundFX = new BackgroundFXManager(this);
    this.timerCombo = new TimerComboController(this, {
      onTimerExpired: () => this.onTimerExpired(),
    });
    this.worldEffects = new WorldEffectsController({
      scene: this,
      getCells: () => this.cells,
      getWorldState: () => this.worldState,
      getFoundCellKeys: () => this.foundCellKeys,
      getCellKey: (row, col) => this.getCellKey(row, col),
      getCellFromKey: (key) => this.getCellFromKey(key),
      applyBaseCellStyle: (cell) => this.applyBaseCellStyle(cell),
    });

    this.setupInputHandlers();
    this.startLevel(CrazyGamesManager.saveData.level);

    if (!this.uiSetup) {
      this.setupUI();
      this.uiSetup = true;
    }

    this.updateHUD();
    CrazyGamesManager.gameplayStart();
    this.setupPageVisibilitySave();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleSceneResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
  }

  private handleSceneShutdown(): void {
    this.cleanupLevel();
    this.removePageVisibilitySave();
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleSceneResize, this);

    if (this.inputHandlersSetup) {
      this.input.off('pointermove', this.handlePointerMove, this);
      this.input.off('pointerup', this.handlePointerUp, this);
      this.inputHandlersSetup = false;
    }

    if (this.backgroundFX) {
      this.backgroundFX.destroy();
      this.backgroundFX = null;
    }

    this.timerCombo.destroy();
    this.worldEffects.destroy();
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
    this.hideResolutionModals();

    const save = CrazyGamesManager.saveData;
    this.levelConfig = getLevelConfig(level);
    this.boardThemeProfile = getBoardThemeProfile(this.levelConfig.world.id);
    this.cellSize = this.calculateCellSize();
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
    this.timedOut = false;
    this.resolutionState = 'active';
    this.worldState = createWordRuntimeState();
    this.bonusWords.clear();

    this.gridData = generateGrid(requestedWords, this.levelConfig.gridSize, {
      directions: this.levelConfig.directions,
      directionWeights: this.levelConfig.directionWeights,
      seedAnchorWord: this.levelConfig.mechanic.type === 'forest_stable',
    });

    this.levelWords = this.gridData.placedWords.map((placedWord) => placedWord.word);
    this.actualGridLetters = this.gridData.grid.map((row) => [...row]);
    this.configureWorldMechanics();
    this.backgroundFX?.applyWorld(this.levelConfig);
    this.buildGrid();
    this.applyWorldTheme();
    this.worldEffects.start(this.levelConfig);
    this.juice.animateGridEntrance(this.cells, this.levelConfig.gridSize);

    this.updateWordListUI();
    this.updateHUD();
    this.updateWorldUI();

    this.timerCombo.resetForLevel(this.levelConfig);
    this.startIdleAnimation();
    scheduleResponsiveLayout();
    EventBus.emit(EVENTS.LEVEL_START, level);
    this.restorePendingCompletionIfNeeded(level);
  }

  private cleanupLevel(): void {
    this.timerCombo.stop();
    this.stopIdleAnimation();
    this.worldEffects.stop();
    this.backgroundFX?.clear();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.clearTransientSceneObjects();

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

  update(time: number, delta: number): void {
    this.backgroundFX?.update(time, delta);
  }

  public renderGameToText(): string {
    return JSON.stringify({
      coordinateSystem: {
        origin: 'top-left',
        x: 'right',
        y: 'down',
      },
      level: this.levelConfig?.level ?? null,
      world: this.levelConfig?.world.id ?? null,
      board: {
        size: this.gridData?.size ?? 0,
        cellSize: this.cellSize,
      },
      requiredWords: this.levelWords,
      bonusWords: [...this.bonusWords],
      foundWords: [...this.foundWords],
      status: this.levelConfig ? this.getWorldStatusText() : null,
      fx: this.backgroundFX?.getDebugSummary() ?? null,
    });
  }

  private handleSceneResize(): void {
    this.backgroundFX?.resize();
  }

  private clearTransientSceneObjects(): void {
    const persistentObjects = new Set<Phaser.GameObjects.GameObject>();
    if (this.gridContainer) persistentObjects.add(this.gridContainer);
    if (this.selectionGraphics) persistentObjects.add(this.selectionGraphics);

    const transientObjects = this.children.list.filter((object) => {
      if (persistentObjects.has(object)) return false;
      const depth = (object as Phaser.GameObjects.GameObject & { depth?: number }).depth ?? 0;
      return depth >= 50;
    });

    transientObjects.forEach((object) => {
      if (!object.active) return;
      object.destroy();
    });
  }

  private configureWorldMechanics(): void {
    const placedWords = this.gridData.placedWords.map((placedWord) => placedWord.word);
    const mechanic = this.levelConfig.mechanic;

    if (mechanic.type === 'space_comet') {
      this.worldState.cometWord = this.pickWordByPreference(placedWords, 'longest');
      if (this.worldState.cometWord) {
        this.bonusWords.add(this.worldState.cometWord);
        this.levelWords = this.levelWords.filter((word) => word !== this.worldState.cometWord);
      }
    }

    if (mechanic.type === 'castle_lock' && mechanic.hasLockedWord && placedWords.length >= 2) {
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
    this.createGridStage(totalSize);
    this.cells = [];

    for (let row = 0; row < this.gridData.size; row++) {
      this.cells[row] = [];
      for (let col = 0; col < this.gridData.size; col++) {
        const x = Math.round(col * this.cellSize + this.cellSize / 2);
        const y = Math.round(row * this.cellSize + this.cellSize / 2);
          const bg = this.add.image(
            x,
            y,
            getCellTextureKey(this.textures, 'cell-bg', this.levelConfig.world.id, this.levelConfig.gridSize)
          );
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

  private createGridStage(totalSize: number): void {
    const profile = this.boardThemeProfile;
    const isDesktop = window.innerWidth > 768;
    const stagePadding = Math.round(this.cellSize * (isDesktop ? 0.68 : 0.58));
    const stageWidth = totalSize + stagePadding * 2;
    const stageHeight = totalSize + stagePadding * 2;
    const stageX = -stagePadding;
    const stageY = -stagePadding;
    const outerRadius = Math.max(24, Math.round(this.cellSize * 0.38));
    const innerRadius = Math.max(18, outerRadius - 8);
    const coreRadius = Math.max(12, innerRadius - 6);

    const primary = hexToColorValue(this.levelConfig.visuals.primary);
    const secondary = hexToColorValue(this.levelConfig.visuals.secondary);
    const accent = this.levelConfig.visuals.accentTint;
    const cellTint = this.levelConfig.visuals.cellTint;
    const bgMid = hexToColorValue(this.levelConfig.visuals.backgroundMid);
    const bgBottom = hexToColorValue(this.levelConfig.visuals.backgroundBottom);
    const shellColor = mixColor(cellTint, primary, profile.shellMix);
    const rimColor = mixColor(bgMid, cellTint, profile.rimMix);
    const panelFace = mixColor(cellTint, secondary, profile.faceMix);
    const panelInner = mixColor(primary, cellTint, profile.innerMix);
    const panelCore = mixColor(panelInner, secondary, profile.coreMix);
    const slotShadow = mixColor(bgBottom, bgMid, 0.26);
    const slotBase = mixColor(cellTint, panelInner, profile.slotBaseMix);
    const slotGlow = mixColor(secondary, cellTint, profile.slotGlowMix);
    const facetColor = mixColor(primary, secondary, profile.facetMix);
    const gemChipColor = mixColor(accent, secondary, profile.chipMix);

    const stageGlow = this.add.image(totalSize / 2, totalSize / 2, 'bgfx-soft-glow');
    stageGlow.setDisplaySize(stageWidth * 1.18, stageHeight * 1.14);
    stageGlow.setTint(accent);
    stageGlow.setAlpha(profile.stageGlowAlpha);

    const stageBloom = this.add.image(totalSize / 2, totalSize / 2, 'bgfx-soft-glow');
    stageBloom.setDisplaySize(stageWidth * 0.9, stageHeight * 0.84);
    stageBloom.setTint(secondary);
    stageBloom.setAlpha(profile.stageBloomAlpha);

    const stageHalo = this.add.image(totalSize / 2, totalSize / 2, 'bgfx-rune-halo');
    stageHalo.setDisplaySize(stageWidth * 0.64, stageWidth * 0.64);
    stageHalo.setTint(secondary);
    stageHalo.setAlpha(profile.stageHaloAlpha);

    const stageShadow = this.add.graphics();
    stageShadow.fillStyle(bgBottom, 0.16);
    stageShadow.fillRoundedRect(stageX + 6, stageY + 14, stageWidth, stageHeight, outerRadius + 6);

    const stageFrame = this.add.graphics();
    stageFrame.fillStyle(shellColor, profile.frameOuterAlpha);
    stageFrame.fillRoundedRect(stageX, stageY, stageWidth, stageHeight, outerRadius);
    stageFrame.fillStyle(rimColor, profile.frameInnerAlpha);
    stageFrame.fillRoundedRect(stageX + 6, stageY + 6, stageWidth - 12, stageHeight - 12, outerRadius - 4);
    stageFrame.fillStyle(panelFace, profile.panelFaceAlpha);
    stageFrame.fillRoundedRect(stageX + 18, stageY + 18, stageWidth - 36, stageHeight - 36, innerRadius);
    stageFrame.fillStyle(panelInner, profile.panelInnerAlpha);
    stageFrame.fillRoundedRect(stageX + 28, stageY + 28, stageWidth - 56, stageHeight - 56, coreRadius);
    stageFrame.fillStyle(panelCore, profile.panelCoreAlpha);
    stageFrame.fillRoundedRect(stageX + 28, stageY + 28, stageWidth - 56, Math.max(56, stageHeight * 0.26), {
      tl: coreRadius,
      tr: coreRadius,
      bl: 12,
      br: 12,
    });
    stageFrame.lineStyle(2, mixColor(primary, secondary, 0.5), 0.18);
    stageFrame.strokeRoundedRect(stageX + 1, stageY + 1, stageWidth - 2, stageHeight - 2, outerRadius);
    stageFrame.lineStyle(1, 0xffffff, 0.2);
    stageFrame.strokeRoundedRect(stageX + 8, stageY + 8, stageWidth - 16, stageHeight - 16, outerRadius - 6);
    stageFrame.lineStyle(1, facetColor, 0.12);
    stageFrame.strokeRoundedRect(stageX + 20, stageY + 20, stageWidth - 40, stageHeight - 40, innerRadius - 2);

    const stageTopBand = this.add.image(totalSize / 2, stageY + stagePadding * 0.7, 'bgfx-glint-band');
    stageTopBand.setDisplaySize(stageWidth * 0.56, Math.max(32, stagePadding * 0.8));
    stageTopBand.setTint(secondary);
    stageTopBand.setAlpha(profile.topBandAlpha);

    const stageGlassBand = this.add.image(totalSize / 2, totalSize / 2 + this.cellSize * 0.1, 'bgfx-glint-band');
    stageGlassBand.setDisplaySize(stageWidth * 0.62, Math.max(42, this.cellSize * 0.6));
    stageGlassBand.setTint(primary);
    stageGlassBand.setAlpha(profile.glassBandAlpha);

    const facetGraphics = this.add.graphics();
    facetGraphics.fillStyle(0xffffff, profile.facetFillAlpha);
    facetGraphics.fillTriangle(stageX + 24, stageY + 28, stageX + stageWidth * 0.34, stageY + 28, stageX + 24, stageY + stageHeight * 0.3);
    facetGraphics.fillTriangle(stageX + stageWidth - 24, stageY + 28, stageX + stageWidth - 24, stageY + stageHeight * 0.3, stageX + stageWidth * 0.66, stageY + 28);
    facetGraphics.fillTriangle(stageX + 24, stageY + stageHeight - 28, stageX + stageWidth * 0.34, stageY + stageHeight - 28, stageX + 24, stageY + stageHeight * 0.7);
    facetGraphics.fillTriangle(stageX + stageWidth - 24, stageY + stageHeight - 28, stageX + stageWidth - 24, stageY + stageHeight * 0.7, stageX + stageWidth * 0.66, stageY + stageHeight - 28);
    facetGraphics.lineStyle(1, facetColor, profile.facetStrokeAlpha);
    facetGraphics.lineBetween(stageX + 36, stageY + 34, stageX + stageWidth * 0.46, stageY + stageHeight * 0.46);
    facetGraphics.lineBetween(stageX + stageWidth - 36, stageY + 34, stageX + stageWidth * 0.54, stageY + stageHeight * 0.46);
    facetGraphics.lineBetween(stageX + 36, stageY + stageHeight - 34, stageX + stageWidth * 0.46, stageY + stageHeight * 0.54);
    facetGraphics.lineBetween(stageX + stageWidth - 36, stageY + stageHeight - 34, stageX + stageWidth * 0.54, stageY + stageHeight * 0.54);

    const slotGraphics = this.add.graphics();
    const slotSize = this.cellDisplaySize + Math.max(2, Math.round(this.cellSize * 0.08));
    const slotRadius = Math.max(10, Math.round(slotSize * 0.2));

    for (let row = 0; row < this.gridData.size; row++) {
      for (let col = 0; col < this.gridData.size; col++) {
        const x = Math.round(col * this.cellSize + this.cellSize / 2 - slotSize / 2);
        const y = Math.round(row * this.cellSize + this.cellSize / 2 - slotSize / 2 + Math.max(2, this.cellSize * 0.05));

        slotGraphics.fillStyle(slotShadow, profile.slotShadowAlpha);
        slotGraphics.fillRoundedRect(x, y + 2, slotSize, slotSize, slotRadius);
        slotGraphics.fillStyle(slotBase, profile.slotBaseAlpha);
        slotGraphics.fillRoundedRect(x + 1, y + 1, slotSize - 2, slotSize - 2, slotRadius - 1);
        slotGraphics.fillStyle(slotGlow, profile.slotGlowAlpha);
        slotGraphics.fillRoundedRect(x + 3, y + 3, slotSize - 6, slotSize * 0.24, slotRadius - 3);
        slotGraphics.lineStyle(1, slotGlow, profile.slotEdgeAlpha);
        slotGraphics.strokeRoundedRect(x + 1, y + 1, slotSize - 2, slotSize - 2, slotRadius - 1);
        slotGraphics.lineStyle(1, 0xffffff, profile.slotInnerEdgeAlpha);
        slotGraphics.strokeRoundedRect(x + 4, y + 4, slotSize - 8, slotSize - 8, slotRadius - 4);
      }
    }

    const gemChips = this.add.graphics();
    const chipSize = Math.max(10, Math.round(this.cellSize * 0.16));
    const cornerPoints = [
      { x: stageX + 24, y: stageY + 24 },
      { x: stageX + stageWidth - 24, y: stageY + 24 },
      { x: stageX + 24, y: stageY + stageHeight - 24 },
      { x: stageX + stageWidth - 24, y: stageY + stageHeight - 24 },
    ];
    const drawDiamond = (x: number, y: number, size: number, color: number, alpha: number) => {
      gemChips.fillStyle(color, alpha);
      gemChips.fillTriangle(x, y - size, x + size, y, x, y + size);
      gemChips.fillTriangle(x, y - size, x - size, y, x, y + size);
      gemChips.lineStyle(1, 0xffffff, alpha * 0.8);
      gemChips.lineBetween(x, y - size, x + size * 0.45, y);
      gemChips.lineBetween(x, y - size, x - size * 0.45, y);
    };
    cornerPoints.forEach(({ x, y }) => {
      drawDiamond(x, y, chipSize, gemChipColor, profile.chipAlpha);
    });

    this.gridContainer.add([
      stageGlow,
      stageBloom,
      stageHalo,
      stageShadow,
      stageFrame,
      stageTopBand,
      stageGlassBand,
      facetGraphics,
      slotGraphics,
      gemChips,
    ]);
  }

  private calculateCellSize(): number {
    if (window.innerWidth > 768) {
      return getCellSizeForGrid(this.levelConfig.gridSize);
    }

    const stageSize = Math.min(this.scale.width, this.scale.height);
    const boardPadding = stageSize >= 440 ? 30 : stageSize >= 400 ? 26 : 22;
    return Math.max(26, Math.floor((stageSize - boardPadding * 2) / this.levelConfig.gridSize));
  }

  private getCellDisplaySize(): number {
    return this.cellSize;
  }

  private getCellContentSize(): number {
    return this.cellSize - (useSpaciousCellTextures(this.levelConfig.gridSize) ? 12 : CELL_GAP);
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
    if (this.isGameplayLocked() || this.timedOut || this.isModalOpen()) return;
    this.isDragging = true;
    this.selectedCells = [{ row, col }];
    this.selectionDirection = null;
    this.updateSelectionVisuals();
    SoundManager.playLetterSelect(0);
  }

  private onCellPointerOver(row: number, col: number): void {
    if (!this.isDragging || this.selectedCells.length === 0) return;
    const hoverResult = resolveSelectionHover(this.selectedCells, { row, col }, this.selectionDirection);
    this.selectionDirection = hoverResult.direction;

    if (!hoverResult.nextSelection) return;

    this.selectedCells = hoverResult.nextSelection;
    this.updateSelectionVisuals();
    SoundManager.playLetterSelect(this.selectedCells.length - 1);

    const tail = hoverResult.nextSelection[hoverResult.nextSelection.length - 1];
    const trailSecondary = mixColor(
      this.levelConfig.visuals.accentTint,
      hexToColorValue(this.levelConfig.visuals.secondary),
      this.boardThemeProfile.trailSecondaryMix
    );
    this.juice.selectionTrailAt(
      this.gridContainer.x + tail.col * this.cellSize + this.cellSize / 2,
      this.gridContainer.y + tail.row * this.cellSize + this.cellSize / 2,
      this.levelConfig.visuals.accentTint,
      {
        shape: this.boardThemeProfile.trailShape,
        count: this.boardThemeProfile.trailCount,
        alpha: this.boardThemeProfile.trailAlpha,
        secondaryColor: trailSecondary,
      }
    );
  }

  private onPointerUp(): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    if (this.selectedCells.length < 2) {
      this.clearSelection();
      return;
    }

    const matchedWord = findMatchedWord(
      this.levelWords,
      this.bonusWords,
      this.foundWords,
      this.selectedCells,
      this.gridData.grid,
      this.worldState.wildcardCellKeys,
      this.getCellKey.bind(this)
    );
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

  private handlePreFoundMechanics(word: string): 'resolve' | 'blocked' {
    const outcome = evaluatePreFoundMechanic({
      isLockedWord: this.isWordLocked(word),
      isFrozenWord: this.worldState.frozenWords.has(word),
      isCrackedFrozenWord: this.worldState.crackedFrozenWords.has(word),
      remainingNonFrozenRequiredWordCount: this.getRemainingNonFrozenRequiredWordCount(),
    });

    if (outcome === 'locked') {
      this.showLockedWordFeedback(word);
      return 'blocked';
    }

    if (outcome === 'crack_frozen') {
      this.crackFrozenWord(word);
      return 'blocked';
    }

    if (outcome === 'blocked_frozen') {
      this.showFrozenWordBlockedFeedback(word);
      return 'blocked';
    }

    return 'resolve';
  }

  private showLockedWordFeedback(word: string): void {
    SoundManager.play('wrong');
    this.juice.shake(this.gridContainer, 2, 180);

    const text = getLockedWordFeedbackText(word, this.worldState.lockPrerequisite);
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

  private showFrozenWordBlockedFeedback(word: string): void {
    const placedWord = this.getPlacedWord(word);
    if (!placedWord) return;

    SoundManager.play('wrong');
    this.juice.shake(this.gridContainer, 2, 180);

    const midPoint = placedWord.cells[Math.floor(placedWord.cells.length / 2)];
    const text = getFrozenWordBlockedText(this.getRemainingNonFrozenRequiredWordCount());

    this.juice.floatingText(
      this.gridContainer.x + midPoint.col * this.cellSize + this.cellSize / 2,
      this.gridContainer.y + midPoint.row * this.cellSize + this.cellSize / 2 - 18,
      text,
      '#DDF7FF',
      18
    );

    this.updateWorldUI();
  }

  private onWordFound(word: string): void {
    if (this.worldState.frozenWords.has(word)) {
      this.worldState.crackedFrozenWords.delete(word);
      this.worldState.frozenWords.delete(word);
    }

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
    const foundSecondary = mixColor(
      COLORS.FOUND_COLORS[colorIndex],
      hexToColorValue(this.levelConfig.visuals.secondary),
      this.boardThemeProfile.foundBurstSecondaryMix
    );

    for (const { row, col } of placedWord.cells) {
      const cell = this.cells[row][col];
      const foundStroke = colorValueToCss(
        mixColor(
          mixColor(COLORS.FOUND_COLORS[colorIndex], 0xFFFFFF, 0.12),
          hexToColorValue(this.levelConfig.visuals.backgroundBottom),
          this.boardThemeProfile.foundStrokeMix
        )
      );
      cell.bg.setTexture(getFoundCellTextureKey(colorIndex, this.levelConfig.gridSize));
      cell.bg.clearTint();
      cell.bg.setAlpha(1);
      cell.bg.setPosition(cell.baseX, cell.baseY);
      cell.bg.setScale(this.boardThemeProfile.foundTileScale + 0.01);
      cell.letter.setText(this.actualGridLetters[row][col]);
      cell.letter.setPosition(cell.baseX, cell.baseY);
      applyReadableLetterStyle(cell.letter, '#FFFFFF', foundStroke, `rgba(0, 0, 0, ${this.boardThemeProfile.foundShadowAlpha})`, {
        fontStyle: 'bold',
        strokeWidth: 2,
        shadowOffsetY: 2,
      });
      cell.letter.setScale(this.boardThemeProfile.foundLetterScale + 0.02);
      this.foundCellKeys.add(this.getCellKey(row, col));
    }

    placedWord.cells.forEach(({ row, col }, index) => {
      this.time.delayedCall(index * 40, () => {
        this.juice.popSprite(this.cells[row][col].letter, 1.3, 200);
      });
    });

    this.juice.animateFoundLine(cellCenters, color, this.cellSize, {
      alpha: this.boardThemeProfile.foundLineAlpha,
      widthScale: this.boardThemeProfile.foundLineWidthScale,
      secondaryColor: foundSecondary,
    });
    cellCenters.forEach((position) =>
      this.juice.starBurst(position.x, position.y, color, this.boardThemeProfile.foundBurstCount, {
        shape: this.boardThemeProfile.foundBurstShape,
        alpha: this.boardThemeProfile.foundBurstAlpha,
        spread: this.boardThemeProfile.foundBurstSpread,
        secondaryColor: foundSecondary,
      })
    );

    const comboMultiplier = this.timerCombo.onWordFound();
    const wordScore = Math.floor(word.length * SCORING.WORD_MULTIPLIER * comboMultiplier);
    this.levelScore += wordScore;

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

    if (this.getFoundRequiredWordCount() === this.levelWords.length) {
      this.resolveLevelSuccess();
    }

    EventBus.emit(EVENTS.WORD_FOUND, word);
  }

  private resolveLevelSuccess(): void {
    if (this.resolutionState !== 'active') return;

    this.resolutionState = 'success';
    this.timerCombo.stop();
    this.time.delayedCall(600, () => void this.onLevelComplete());
  }

  private handlePostFoundMechanics(
    word: string,
    placedWord: PlacedWord,
    midCell: { x: number; y: number }
  ): void {
    const postFoundResult = evaluatePostFoundMechanics({
      word,
      wordCellKeys: placedWord.cells.map(({ row, col }) => this.getCellKey(row, col)),
      mechanic: this.levelConfig.mechanic,
      lockPrerequisite: this.worldState.lockPrerequisite,
      lockedWord: this.worldState.lockedWord,
      foundWords: this.foundWords,
      cometWord: this.worldState.cometWord,
      cometClaimed: this.worldState.cometClaimed,
      goldenCellKeys: this.worldState.goldenCellKeys,
      collectedGoldenCellKeys: this.worldState.collectedGoldenCellKeys,
    });

    if (postFoundResult.unlockBurstText) {
      this.juice.floatingText(midCell.x, midCell.y - 56, postFoundResult.unlockBurstText, '#F2DEC0', 22);
      this.cameras.main.flash(180, 255, 231, 194, false);
    }

    if (postFoundResult.cometReward) {
      this.worldState.cometClaimed = true;
      this.levelScore += postFoundResult.cometReward.bonusScore;
      this.juice.floatingText(
        midCell.x,
        midCell.y - 54,
        `${postFoundResult.cometReward.bonusLabel} +${postFoundResult.cometReward.bonusScore}`,
        this.levelConfig.visuals.accent,
        22
      );
      this.juice.sparkleAt(midCell.x, midCell.y, this.levelConfig.visuals.bonusTint, 14);
      SoundManager.play('gem');
    }

    if (postFoundResult.goldenReward) {
      postFoundResult.goldenReward.newlyCollectedGoldenCellKeys.forEach((key) =>
        this.worldState.collectedGoldenCellKeys.add(key)
      );
      this.levelScore += postFoundResult.goldenReward.scoreBonus;
      CrazyGamesManager.addGems(postFoundResult.goldenReward.gemBonus);
      this.juice.floatingText(
        midCell.x,
        midCell.y - 56,
        `${postFoundResult.goldenReward.rewardLabel} +${postFoundResult.goldenReward.scoreBonus}`,
        this.levelConfig.visuals.secondary,
        22
      );
      this.juice.gemBurst(midCell.x, midCell.y);
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

    const profile = this.boardThemeProfile;
    const primaryColor = hexToColorValue(this.levelConfig.visuals.primary);
    const secondaryColor = hexToColorValue(this.levelConfig.visuals.secondary);
    const letterBase = mixColor(hexToColorValue(this.levelConfig.visuals.letterColor), 0x061018, profile.letterDarkMix);
    const baseStrokeMix = Math.min(0.36, profile.letterStrokeMix + 0.12);
    const baseShadowAlpha = Math.min(0.34, profile.letterShadowAlpha + 0.08);
    const baseTint = mixColor(0xFFFFFF, this.levelConfig.visuals.cellTint, Math.max(0.12, profile.tileTintMix + 0.04));
    const specialTileScale = Math.max(0.98, profile.tileScale + 0.03);
    const specialLetterScale = Math.max(1, profile.tileLetterScale + 0.05);
    cell.bg.setTexture(getCellTextureKey(this.textures, 'cell-bg', this.levelConfig.world.id, this.levelConfig.gridSize));
    cell.bg.clearTint();
    cell.bg.setAlpha(1);
    cell.bg.setPosition(cell.baseX, cell.baseY);
    cell.bg.setScale(profile.tileScale);

    cell.letter.setText(this.gridData.grid[cell.row][cell.col]);
    cell.letter.setPosition(cell.baseX, cell.baseY);
    cell.letter.setScale(profile.tileLetterScale);
    cell.letter.setAlpha(1);
    applyReadableLetterStyle(
      cell.letter,
      colorValueToCss(letterBase),
      colorValueToCss(mixColor(primaryColor, 0xFFFFFF, baseStrokeMix)),
      `rgba(8, 18, 28, ${baseShadowAlpha})`,
      {
        strokeWidth: 1.4,
        shadowOffsetY: 2,
      }
    );

    cell.bg.setTint(baseTint);

    const cellKey = this.getCellKey(cell.row, cell.col);
    if (this.worldState.goldenCellKeys.has(cellKey) && !this.worldState.collectedGoldenCellKeys.has(cellKey)) {
      cell.bg.setTexture(getCellTextureKey(this.textures, 'cell-hover', this.levelConfig.world.id, this.levelConfig.gridSize));
      cell.bg.setTint(this.levelConfig.visuals.bonusTint);
      cell.bg.setScale(specialTileScale);
      applyReadableLetterStyle(cell.letter, '#FFF8DE', 'rgba(137, 99, 21, 0.84)', 'rgba(255, 223, 115, 0.74)', {
        fontStyle: 'bold',
        strokeWidth: 2,
        shadowOffsetY: 2,
      });
      cell.letter.setScale(specialLetterScale);
    }

    if (this.worldState.wildcardCellKeys.has(cellKey)) {
      cell.bg.setTexture(getCellTextureKey(this.textures, 'cell-hover', this.levelConfig.world.id, this.levelConfig.gridSize));
      cell.bg.setTint(this.levelConfig.visuals.accentTint);
      cell.bg.setScale(specialTileScale);
      applyReadableLetterStyle(cell.letter, '#FFF7FF', 'rgba(91, 52, 113, 0.78)', 'rgba(255, 255, 255, 0.38)', {
        fontStyle: 'bold',
        strokeWidth: 2,
        shadowOffsetY: 2,
      });
      cell.letter.setScale(specialLetterScale);
    }

    if (this.isCellInFrozenWord(cell.row, cell.col)) {
      const isCracked = this.isCellInCrackedFrozenWord(cell.row, cell.col);
      cell.bg.setTexture(
        getCellTextureKey(
          this.textures,
          isCracked ? 'cell-selected' : 'cell-hover',
          this.levelConfig.world.id,
          this.levelConfig.gridSize
        )
      );
      cell.bg.setTint(this.isCellInCrackedFrozenWord(cell.row, cell.col) ? 0xd2f2ff : 0xb5e3ff);
      cell.bg.setScale(isCracked ? specialTileScale + 0.02 : specialTileScale);
      applyReadableLetterStyle(cell.letter, '#F1FCFF', 'rgba(47, 107, 132, 0.76)', 'rgba(183, 244, 255, 0.78)', {
        fontStyle: 'bold',
        strokeWidth: 2,
        shadowOffsetY: 2,
      });
      cell.letter.setScale(specialLetterScale);
    }
  }

  private updateSelectionVisuals(): void {
    const profile = this.boardThemeProfile;
    const selectedStroke = colorValueToCss(
      mixColor(
        mixColor(hexToColorValue(this.levelConfig.visuals.backgroundBottom), 0xFFFFFF, 0.16),
        this.levelConfig.visuals.accentTint,
        Math.min(0.56, profile.selectedStrokeMix + 0.08)
      )
    );
    const selectedTint = mixColor(
      mixColor(this.levelConfig.visuals.accentTint, 0xFFFFFF, 0.18),
      hexToColorValue(this.levelConfig.visuals.secondary),
      Math.max(0.12, profile.selectedTintMix * 0.8)
    );

    for (const row of this.cells) {
      for (const cell of row) {
        this.applyBaseCellStyle(cell);
      }
    }

    for (const { row, col } of this.selectedCells) {
      if (this.foundCellKeys.has(this.getCellKey(row, col))) continue;
      const cell = this.cells[row][col];
      cell.bg.setTexture(
        getCellTextureKey(this.textures, 'cell-selected', this.levelConfig.world.id, this.levelConfig.gridSize)
      );
      cell.bg.setTint(selectedTint);
      cell.bg.setScale(profile.selectedScale + 0.01);
      applyReadableLetterStyle(cell.letter, '#FFFFFF', selectedStroke, `rgba(0, 0, 0, ${profile.selectedShadowAlpha})`, {
        fontStyle: 'bold',
        strokeWidth: 2,
        shadowOffsetY: 2,
      });
      cell.letter.setScale(profile.selectedLetterScale + 0.02);
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

  private hideResolutionModals(): void {
    document.getElementById('level-complete-modal')?.style.setProperty('display', 'none');
    document.getElementById('time-up-modal')?.style.setProperty('display', 'none');
  }

  private isGameplayLocked(): boolean {
    return this.resolutionState !== 'active' || this.isLevelTransitioning;
  }

  private bumpHudGems(): void {
    const el = document.getElementById('hud-gems');
    if (!el) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  private async onLevelComplete(): Promise<void> {
    if (this.resolutionState !== 'success' || this.timedOut) return;

    CrazyGamesManager.gameplayStop();
    const save = CrazyGamesManager.saveData;
    const level = save.level;

    const result = calculateLevelScore(
      level,
      this.levelScore,
      save.streak,
      this.timerCombo.getComboMultiplier(),
      this.hintsUsedThisLevel,
      this.timedOut,
      this.timerCombo.getTimerSeconds()
    );

    this.juice.screenFlash(COLORS.GOLD, 400);
    this.juice.crystalShower(this.cameras.main.centerX, this.cameras.main.centerY);
    this.worldEffects.stop();
    this.animateGridExit();
    SoundManager.play('complete');

    CrazyGamesManager.addScore(result.total);
    CrazyGamesManager.addGems(result.gemsEarned);
    CrazyGamesManager.trackUsedWords(this.gridData.placedWords.map((placedWord) => placedWord.word));
    CrazyGamesManager.setLevelStars(level, result.stars);
    CrazyGamesManager.addWordsFound(this.getFoundRequiredWordCount());
    if (result.stars === 3) CrazyGamesManager.addPerfectLevel();
    CrazyGamesManager.setPendingCompletion({
      level,
      result: {
        total: result.total,
        gemsEarned: result.gemsEarned,
        stars: result.stars,
      },
      foundWords: this.getFoundRequiredWordCount(),
      totalWords: this.levelWords.length,
    });

    if (save.streak % 5 === 0 || result.stars === 3) {
      CrazyGamesManager.happytime();
    }

    this.time.delayedCall(800, () => this.showLevelCompleteModal(level, result));
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
    result: { total: number; gemsEarned: number; stars: number },
    summary?: { foundWords: number; totalWords: number }
  ): void {
    const modal = document.getElementById('level-complete-modal')!;
    const foundWords = summary?.foundWords ?? this.getFoundRequiredWordCount();
    const totalWords = summary?.totalWords ?? this.levelWords.length;
    document.getElementById('complete-level-num')!.textContent = level.toString();
    document.getElementById('complete-words')!.textContent = `${foundWords}/${totalWords}`;
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

  private restorePendingCompletionIfNeeded(level: number): void {
    const pendingCompletion = CrazyGamesManager.saveData.pendingCompletion;
    if (!pendingCompletion || pendingCompletion.level !== level) return;

    this.resolutionState = 'success';
    this.timedOut = false;
    this.timerCombo.stop();
    CrazyGamesManager.gameplayStop();

    this.time.delayedCall(0, () => {
      this.showLevelCompleteModal(pendingCompletion.level, pendingCompletion.result, {
        foundWords: pendingCompletion.foundWords,
        totalWords: pendingCompletion.totalWords,
      });
    });
  }

  private showTimeUpModal(): void {
    if (this.resolutionState !== 'timeout') return;

    const level = CrazyGamesManager.saveData.level;
    const modal = document.getElementById('time-up-modal');
    const levelEl = document.getElementById('time-up-level-num');
    const wordsEl = document.getElementById('time-up-words');
    const scoreEl = document.getElementById('time-up-score');

    if (levelEl) levelEl.textContent = level.toString();
    if (wordsEl) wordsEl.textContent = `${this.getFoundRequiredWordCount()}/${this.levelWords.length}`;
    if (scoreEl) scoreEl.textContent = this.levelScore.toString();
    if (modal) modal.style.display = 'flex';
  }

  private applyWorldTheme(): void {
    const root = document.documentElement;
    const shell = document.getElementById('game-shell');
    const mainContent = document.getElementById('main-content');
    const gameContainer = document.getElementById('game-container');
    const gameInfoBar = document.getElementById('game-info-bar');
    const timerContainer = document.getElementById('timer-container');
    const theme = this.levelConfig.visuals;
    const targets = [root, shell].filter((target): target is HTMLElement => Boolean(target));

    if (shell) {
      shell.setAttribute('data-world', this.levelConfig.world.id);
    }

    if (mainContent) {
      mainContent.setAttribute('data-world', this.levelConfig.world.id);
    }

    if (gameInfoBar) {
      gameInfoBar.setAttribute('data-world', this.levelConfig.world.id);
    }

    if (timerContainer) {
      timerContainer.setAttribute('data-world', this.levelConfig.world.id);
    }

    if (gameContainer) {
      gameContainer.removeAttribute('data-world');
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

    applyWorldScene(this.levelConfig.world.id);
  }

  private updateWorldUI(): void {
    const worldNameEl = document.getElementById('zone-name');
    const worldStatusEl = document.getElementById('world-status');

    if (worldNameEl) worldNameEl.textContent = this.levelConfig.world.name.toUpperCase();
    if (worldStatusEl) worldStatusEl.textContent = this.getWorldStatusText();
    scheduleResponsiveLayout();
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
        return this.worldState.cometClaimed ? mechanic.claimedText ?? 'Comet burst secured.' : mechanic.hint;
      case 'magic_wildcard': {
        const cellLabel = mechanic.cellLabel ?? 'rune cell';
        return `${mechanic.hint} ${this.worldState.wildcardCellKeys.size} ${cellLabel}${this.worldState.wildcardCellKeys.size > 1 ? 's are' : ' is'} active.`;
      }
      case 'ice_frozen':
        if (this.worldState.crackedFrozenWords.size > 0) {
          const remaining = this.getRemainingNonFrozenRequiredWordCount();
          if (remaining > 0) {
            return `Finish ${remaining} more word${remaining > 1 ? 's' : ''} before thawing the cracked word${this.worldState.crackedFrozenWords.size > 1 ? 's' : ''}.`;
          }
          return 'Cracked frozen words can now be cleared.';
        }
        return mechanic.hint;
      case 'desert_gold': {
        const remaining = [...this.worldState.goldenCellKeys].filter((key) => !this.worldState.collectedGoldenCellKeys.has(key)).length;
        const cellLabel = mechanic.cellLabel ?? 'golden cell';
        return remaining > 0
          ? `${remaining} ${cellLabel}${remaining > 1 ? 's' : ''} still shimmer.`
          : mechanic.collectedText ?? 'All golden cells collected.';
      }
      default:
        return mechanic.hint;
    }
  }

  private onTimerExpired(): void {
    if (this.resolutionState !== 'active') return;

    this.timerCombo.stop();
    this.resolutionState = 'timeout';
    this.timedOut = true;
    this.isDragging = false;
    this.clearSelection();
    CrazyGamesManager.gameplayStop();
    this.juice.screenFlash(COLORS.ERROR_RED, 400);
    SoundManager.play('wrong');
    this.time.delayedCall(600, () => this.showTimeUpModal());
  }

  private setupUI(): void {
    this.injectIcons();
    this.setupMobileWordRackScroll();

    document.getElementById('btn-retry-level')?.addEventListener('click', async () => {
      if (this.isLevelTransitioning) return;

      this.isLevelTransitioning = true;
      const retryButton = document.getElementById('btn-retry-level') as HTMLButtonElement | null;
      retryButton?.setAttribute('disabled', 'true');
      document.getElementById('time-up-modal')!.style.display = 'none';
      SoundManager.play('click');

      try {
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        CrazyGamesManager.gameplayStart();
        this.startLevel(CrazyGamesManager.saveData.level);
      } finally {
        retryButton?.removeAttribute('disabled');
        this.isLevelTransitioning = false;
      }
    });

    document.getElementById('btn-next-level')?.addEventListener('click', async () => {
      if (this.isLevelTransitioning) return;

      this.isLevelTransitioning = true;
      const nextLevelButton = document.getElementById('btn-next-level') as HTMLButtonElement | null;
      nextLevelButton?.setAttribute('disabled', 'true');
      document.getElementById('level-complete-modal')!.style.display = 'none';
      SoundManager.play('click');

      try {
        const currentLevel = CrazyGamesManager.saveData.pendingCompletion?.level ?? CrazyGamesManager.saveData.level;
        const nextLevel = currentLevel + 1;
        CrazyGamesManager.clearPendingCompletion();
        CrazyGamesManager.advanceLevel();

        if (nextLevel % AD_INTERVAL_LEVELS === 0) {
          await CrazyGamesManager.requestMidgameAd();
        }

        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        CrazyGamesManager.gameplayStart();
        this.startLevel(nextLevel);
      } finally {
        nextLevelButton?.removeAttribute('disabled');
        this.isLevelTransitioning = false;
      }
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => {
      if (this.isGameplayLocked()) return;
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
      if (this.isGameplayLocked()) return;
      SoundManager.play('click');
      this.useDetect();
    });
    document.getElementById('btn-undo')?.addEventListener('click', () => {
      if (this.isGameplayLocked()) return;
      SoundManager.play('click');
      this.useUndo();
    });
    document.getElementById('btn-ad-gems')?.addEventListener('click', () => {
      if (this.isGameplayLocked()) return;
      SoundManager.play('click');
      this.watchAdForGems();
    });

    const spinHandler = () => {
      if (this.isGameplayLocked()) return;
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
        const modal = backdrop.parentElement as HTMLElement | null;
        if (!modal || modal.dataset.static === 'true') return;
        modal.style.display = 'none';
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

  private setupMobileWordRackScroll(): void {
    const mobileList = document.getElementById('mobile-word-list');
    if (!mobileList || mobileList.dataset.dragScrollBound === '1') return;

    mobileList.dataset.dragScrollBound = '1';

    let activePointerId: number | null = null;
    let startX = 0;
    let startScrollLeft = 0;
    let dragged = false;

    mobileList.addEventListener('pointerdown', (event: PointerEvent) => {
      activePointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = mobileList.scrollLeft;
      dragged = false;
      mobileList.setPointerCapture?.(event.pointerId);
    });

    mobileList.addEventListener('pointermove', (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) return;

      const deltaX = event.clientX - startX;
      if (!dragged && Math.abs(deltaX) < 3) return;

      dragged = true;
      mobileList.scrollLeft = startScrollLeft - deltaX;
      event.preventDefault();
      event.stopPropagation();
    }, { passive: false });

    const clearPointer = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) return;
      if (mobileList.hasPointerCapture?.(event.pointerId)) {
        mobileList.releasePointerCapture(event.pointerId);
      }
      activePointerId = null;
      window.setTimeout(() => {
        dragged = false;
      }, 0);
    };

    mobileList.addEventListener('pointerup', clearPointer);
    mobileList.addEventListener('pointercancel', clearPointer);
    mobileList.addEventListener('click', (event) => {
      if (!dragged) return;
      event.preventDefault();
      event.stopPropagation();
    });
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
    const adRewardBadge = document.querySelector('.ad-reward-badge');
    if (adRewardBadge) adRewardBadge.innerHTML = `+50 ${iconHTML('gem', 'reward-gem')}`;
  }

  private useDetect(): void {
    if (this.isGameplayLocked() || this.timedOut) return;
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
    return this.levelWords.filter((word) =>
      !this.foundWords.has(word)
      && !this.isWordLocked(word)
      && (!this.worldState.frozenWords.has(word) || this.getRemainingNonFrozenRequiredWordCount() === 0)
    );
  }

  private useUndo(): void {
    if (this.isGameplayLocked() || this.timedOut) return;
    if (!this.isDragging) return;
    if (!CrazyGamesManager.spendGems(POWERUP_COSTS.UNDO)) return;

    this.isDragging = false;
    this.clearSelection();
    this.updateHUD();
    EventBus.emit(EVENTS.POWERUP_UNDO);
  }

  private async watchAdForGems(): Promise<void> {
    if (this.isGameplayLocked() || this.timedOut) return;
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
    if (this.isGameplayLocked() || this.timedOut) return;
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
    if (this.isGameplayLocked()) return;
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
    const allFound = this.getFoundRequiredWordCount() === this.levelWords.length;
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
        item.title = statusTag && !isFound ? `${word} - ${statusTag.label}` : word;
        item.setAttribute('aria-label', item.title);

        const check = document.createElement('span');
        check.className = 'word-check';
        check.innerHTML = isFound ? ICONS.checkFilled : ICONS.checkEmpty;

        const wordBody = document.createElement('span');
        wordBody.className = 'word-body';

        const wordText = document.createElement('span');
        wordText.className = 'word-text';
        wordText.textContent = word;
        wordText.dataset.word = word;

        wordBody.appendChild(wordText);
        item.append(check, wordBody);
        desktopList.appendChild(item);
      });

      if (allFound) {
        const msg = document.createElement('div');
        msg.className = 'all-found-msg';
        msg.textContent = 'ALL FOUND!';
        desktopList.appendChild(msg);
      }
    }

    const mobileList = document.getElementById('mobile-word-list');
    if (mobileList) {
      mobileList.innerHTML = '';
      mobileList.scrollLeft = 0;
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
        item.dataset.word = word;
        item.title = statusTag && !isFound ? `${word} - ${statusTag.label}` : word;
        item.setAttribute('aria-label', item.title);
        mobileList.appendChild(item);
      });
    }

    scheduleResponsiveLayout();
  }

  private getFoundRequiredWordCount(): number {
    let count = 0;
    for (const word of this.levelWords) {
      if (this.foundWords.has(word)) count += 1;
    }
    return count;
  }

  private getRemainingNonFrozenRequiredWordCount(): number {
    let count = 0;
    for (const word of this.levelWords) {
      if (this.foundWords.has(word)) continue;
      if (this.worldState.frozenWords.has(word)) continue;
      count += 1;
    }
    return count;
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
