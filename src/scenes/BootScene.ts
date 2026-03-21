import Phaser from 'phaser';
import { CrazyGamesManager } from '../managers/CrazyGamesManager';
import { SoundManager } from '../managers/SoundManager';
import { COLORS, CELL_GAP } from '../consts';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  async create(): Promise<void> {
    await CrazyGamesManager.init();
    SoundManager.init();

    this.generateTextures();

    CrazyGamesManager.loadingStop();

    // Hide splash, show game shell
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.transition = 'opacity 0.5s';
      splash.style.opacity = '0';
      setTimeout(() => {
        splash.style.display = 'none';
        const shell = document.getElementById('game-shell');
        if (shell) shell.style.display = 'flex';
      }, 500);
    }

    // Show tutorial on first play
    if (!CrazyGamesManager.saveData.tutorialSeen && CrazyGamesManager.saveData.level === 1) {
      const tutorial = document.getElementById('tutorial-overlay');
      if (tutorial) tutorial.style.display = 'flex';
    }

    this.scene.start('GameScene');
  }

  private generateTextures(): void {
    // Generate at a fixed reference size — GameScene uses setDisplaySize to scale
    const cellSize = 64;
    const innerSize = cellSize - CELL_GAP;
    const spaciousInnerSize = cellSize - 12;

    // Normal cell — light glossy casual style
    this.generateCellTexture('cell-bg', cellSize, innerSize, {
      fillTop: 0xe4e8f8,
      fillBottom: 0xd0d8f0,
      border: COLORS.CELL_BORDER,
      borderAlpha: 0.5,
      borderWidth: 1,
      glossy: true,
    });
    this.generateCellTexture('cell-bg-spacious', cellSize, spaciousInnerSize, {
      fillTop: 0xe4e8f8,
      fillBottom: 0xd0d8f0,
      border: COLORS.CELL_BORDER,
      borderAlpha: 0.5,
      borderWidth: 1,
      glossy: true,
    });

    // Hover cell
    this.generateCellTexture('cell-hover', cellSize, innerSize, {
      fillTop: 0xeef0ff,
      fillBottom: 0xe0e6f8,
      border: COLORS.SELECT_COLOR,
      borderAlpha: 0.5,
      borderWidth: 1.5,
      glossy: true,
    });
    this.generateCellTexture('cell-hover-spacious', cellSize, spaciousInnerSize, {
      fillTop: 0xeef0ff,
      fillBottom: 0xe0e6f8,
      border: COLORS.SELECT_COLOR,
      borderAlpha: 0.5,
      borderWidth: 1.5,
      glossy: true,
    });

    // Selected cell (part of valid selection) — vivid teal
    this.generateCellTexture('cell-selected', cellSize, innerSize, {
      fillTop: 0x7EE8DF,
      fillBottom: 0x4ECDC4,
      border: 0x35AEA5,
      borderAlpha: 0.9,
      borderWidth: 2.5,
      glossy: true,
    });
    this.generateCellTexture('cell-selected-spacious', cellSize, spaciousInnerSize, {
      fillTop: 0x7EE8DF,
      fillBottom: 0x4ECDC4,
      border: 0x35AEA5,
      borderAlpha: 0.9,
      borderWidth: 2.5,
      glossy: true,
    });

    // Found cell overlay
    this.generateCellTexture('cell-found', cellSize, innerSize, {
      fillTop: 0xe8ecf8,
      fillBottom: 0xdce2f2,
      border: 0xc0c8e0,
      borderAlpha: 0.3,
      borderWidth: 1,
      glossy: true,
    });
    this.generateCellTexture('cell-found-spacious', cellSize, spaciousInnerSize, {
      fillTop: 0xe8ecf8,
      fillBottom: 0xdce2f2,
      border: 0xc0c8e0,
      borderAlpha: 0.3,
      borderWidth: 1,
      glossy: true,
    });

    // Wrong cell flash
    this.generateCellTexture('cell-wrong', cellSize, innerSize, {
      fillTop: 0xffd0d0,
      fillBottom: 0xffb8b8,
      border: COLORS.ERROR_RED,
      borderAlpha: 0.6,
      borderWidth: 2,
      glossy: false,
    });
    this.generateCellTexture('cell-wrong-spacious', cellSize, spaciousInnerSize, {
      fillTop: 0xffd0d0,
      fillBottom: 0xffb8b8,
      border: COLORS.ERROR_RED,
      borderAlpha: 0.6,
      borderWidth: 2,
      glossy: false,
    });

    // Generate gem-colored cell textures for found words
    this.generateFoundGemTextures(cellSize, innerSize);
    this.generateFoundGemTextures(cellSize, spaciousInnerSize, '-spacious');

    this.generateBackgroundFxTextures();
  }

  /** Generate rich gem-like cell textures for each found word color */
  private generateFoundGemTextures(cellSize: number, innerSize: number, suffix = ''): void {
    // Each found color gets a gem-like texture: saturated gradient + glossy shine + border
    const foundConfigs: { color: number; top: number; bottom: number; border: number }[] = [
      { color: 0xFF6B6B, top: 0xFF7B7B, bottom: 0xE04545, border: 0xCC3333 }, // Red
      { color: 0x4ECDC4, top: 0x6EDDD6, bottom: 0x35AEA5, border: 0x2A9A91 }, // Teal
      { color: 0x45B7D1, top: 0x65C7E1, bottom: 0x2E9AB5, border: 0x2088A0 }, // Blue
      { color: 0x96CEB4, top: 0xA8DAC4, bottom: 0x7AB89A, border: 0x68A586 }, // Green
      { color: 0xFFD93D, top: 0xFFE066, bottom: 0xE6C020, border: 0xCCAA10 }, // Yellow
      { color: 0xFF8B5E, top: 0xFFA07A, bottom: 0xE06A3D, border: 0xCC5530 }, // Orange
      { color: 0xDDA0DD, top: 0xE8B8E8, bottom: 0xC480C4, border: 0xB060B0 }, // Purple
      { color: 0x87CEEB, top: 0xA0DAFA, bottom: 0x6BB8D8, border: 0x55A0C0 }, // Sky
    ];

    for (let i = 0; i < foundConfigs.length; i++) {
      const cfg = foundConfigs[i];
      this.generateCellTexture(`cell-found-${i}${suffix}`, cellSize, innerSize, {
        fillTop: cfg.top,
        fillBottom: cfg.bottom,
        border: cfg.border,
        borderAlpha: 0.8,
        borderWidth: 2,
        glossy: true,
      });
    }
  }

  private generateCellTexture(
    key: string,
    totalSize: number,
    innerSize: number,
    opts: {
      fillTop: number;
      fillBottom: number;
      border: number;
      borderAlpha: number;
      borderWidth: number;
      glossy?: boolean;
    }
  ): void {
    const g = this.add.graphics();
    const offset = (totalSize - innerSize) / 2;
    const radius = 10;

    // Top half (lighter)
    g.fillStyle(opts.fillTop, 1);
    g.fillRoundedRect(offset, offset, innerSize, innerSize / 2, { tl: radius, tr: radius, bl: 0, br: 0 });

    // Bottom half (slightly darker)
    g.fillStyle(opts.fillBottom, 1);
    g.fillRoundedRect(offset, offset + innerSize / 2, innerSize, innerSize / 2, { tl: 0, tr: 0, bl: radius, br: radius });

    // Border
    g.lineStyle(opts.borderWidth, opts.border, opts.borderAlpha);
    g.strokeRoundedRect(offset, offset, innerSize, innerSize, radius);

    // Glossy highlight (multi-layer crystal shine)
    if (opts.glossy) {
      // Layer 1: Yuqori yarim — keng yumshoq oq gradient
      g.fillStyle(0xFFFFFF, 0.15);
      g.fillRoundedRect(offset + 1, offset + 1, innerSize - 2, innerSize * 0.5,
        { tl: radius - 1, tr: radius - 1, bl: 0, br: 0 });

      // Layer 2: Yuqori qism — aniqroq glossy highlight
      g.fillStyle(0xFFFFFF, 0.35);
      g.fillRoundedRect(offset + 4, offset + 3, innerSize - 8, innerSize * 0.22,
        { tl: radius - 3, tr: radius - 3, bl: 4, br: 4 });

      // Layer 3: Eng yuqori chiziq — sharp reflection
      g.fillStyle(0xFFFFFF, 0.5);
      g.fillRoundedRect(offset + 6, offset + 3, innerSize - 12, 4,
        { tl: 2, tr: 2, bl: 2, br: 2 });

      // Layer 4: Pastki ichki soya (depth uchun)
      g.fillStyle(0x000000, 0.06);
      g.fillRoundedRect(offset + 2, offset + innerSize - 8, innerSize - 4, 6,
        { tl: 0, tr: 0, bl: radius - 2, br: radius - 2 });
    }

    g.generateTexture(key, totalSize, totalSize);
    g.destroy();
  }

  private generateBackgroundFxTextures(): void {
    this.generateSoftGlowTexture('bgfx-soft-glow', 160);
    this.generateSoftStripTexture('bgfx-soft-strip', 280, 88);
    this.generateLeafTexture('bgfx-leaf', 56, 40);
    this.generateBubbleTexture('bgfx-bubble', 42);
    this.generateSparkleTexture('bgfx-sparkle', 34);
    this.generateRuneTexture('bgfx-rune', 48);
    this.generateSnowflakeTexture('bgfx-snowflake', 36);
    this.generateDustTexture('bgfx-dust', 18);
    this.generateSandTexture('bgfx-sand', 22, 10);
    this.generateCometTexture('bgfx-comet', 120, 26);
    this.generateSoftGlowTexture('bgfx-glow-dot', 36);
  }

  private generateSoftGlowTexture(key: string, size: number): void {
    const g = this.add.graphics();
    const center = size / 2;

    g.fillStyle(0xffffff, 0.08);
    g.fillCircle(center, center, size * 0.48);
    g.fillStyle(0xffffff, 0.14);
    g.fillCircle(center, center, size * 0.32);
    g.fillStyle(0xffffff, 0.22);
    g.fillCircle(center, center, size * 0.18);

    g.generateTexture(key, size, size);
    g.destroy();
  }

  private generateSoftStripTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();
    const centerY = height / 2;

    g.fillStyle(0xffffff, 0.05);
    g.fillEllipse(width / 2, centerY, width, height);
    g.fillStyle(0xffffff, 0.08);
    g.fillEllipse(width / 2, centerY, width * 0.82, height * 0.72);
    g.fillStyle(0xffffff, 0.12);
    g.fillEllipse(width / 2, centerY, width * 0.58, height * 0.4);

    g.generateTexture(key, width, height);
    g.destroy();
  }

  private generateLeafTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();
    const points = [
      new Phaser.Geom.Point(width * 0.15, height * 0.52),
      new Phaser.Geom.Point(width * 0.38, height * 0.1),
      new Phaser.Geom.Point(width * 0.88, height * 0.26),
      new Phaser.Geom.Point(width * 0.8, height * 0.68),
      new Phaser.Geom.Point(width * 0.3, height * 0.88),
    ];

    g.fillStyle(0xffffff, 0.9);
    g.fillPoints(points, true);
    g.lineStyle(2, 0xffffff, 0.55);
    g.beginPath();
    g.moveTo(width * 0.18, height * 0.62);
    g.lineTo(width * 0.76, height * 0.28);
    g.strokePath();

    g.generateTexture(key, width, height);
    g.destroy();
  }

  private generateBubbleTexture(key: string, size: number): void {
    const g = this.add.graphics();
    const center = size / 2;

    g.fillStyle(0xffffff, 0.08);
    g.fillCircle(center, center, size * 0.42);
    g.lineStyle(2, 0xffffff, 0.36);
    g.strokeCircle(center, center, size * 0.38);
    g.fillStyle(0xffffff, 0.28);
    g.fillCircle(size * 0.37, size * 0.35, size * 0.08);

    g.generateTexture(key, size, size);
    g.destroy();
  }

  private generateSparkleTexture(key: string, size: number): void {
    const g = this.add.graphics();
    const center = size / 2;

    g.fillStyle(0xffffff, 0.9);
    g.fillPoints([
      new Phaser.Geom.Point(center, 0),
      new Phaser.Geom.Point(center + size * 0.16, center - size * 0.16),
      new Phaser.Geom.Point(size, center),
      new Phaser.Geom.Point(center + size * 0.16, center + size * 0.16),
      new Phaser.Geom.Point(center, size),
      new Phaser.Geom.Point(center - size * 0.16, center + size * 0.16),
      new Phaser.Geom.Point(0, center),
      new Phaser.Geom.Point(center - size * 0.16, center - size * 0.16),
    ], true);

    g.generateTexture(key, size, size);
    g.destroy();
  }

  private generateRuneTexture(key: string, size: number): void {
    const g = this.add.graphics();
    const center = size / 2;

    g.lineStyle(2, 0xffffff, 0.72);
    g.strokeCircle(center, center, size * 0.34);
    g.beginPath();
    g.moveTo(center, size * 0.12);
    g.lineTo(center, size * 0.88);
    g.moveTo(size * 0.18, center);
    g.lineTo(size * 0.82, center);
    g.moveTo(size * 0.28, size * 0.28);
    g.lineTo(size * 0.72, size * 0.72);
    g.moveTo(size * 0.72, size * 0.28);
    g.lineTo(size * 0.28, size * 0.72);
    g.strokePath();

    g.generateTexture(key, size, size);
    g.destroy();
  }

  private generateSnowflakeTexture(key: string, size: number): void {
    const g = this.add.graphics();
    const center = size / 2;

    g.lineStyle(2, 0xffffff, 0.9);
    for (let arm = 0; arm < 3; arm++) {
      const angle = (Math.PI / 3) * arm;
      const dx = Math.cos(angle) * size * 0.34;
      const dy = Math.sin(angle) * size * 0.34;
      g.beginPath();
      g.moveTo(center - dx, center - dy);
      g.lineTo(center + dx, center + dy);
      g.strokePath();
    }

    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(center, center, 2);

    g.generateTexture(key, size, size);
    g.destroy();
  }

  private generateDustTexture(key: string, size: number): void {
    const g = this.add.graphics();
    const center = size / 2;

    g.fillStyle(0xffffff, 0.24);
    g.fillCircle(center, center, size * 0.3);
    g.fillStyle(0xffffff, 0.12);
    g.fillCircle(center + 2, center - 1, size * 0.18);

    g.generateTexture(key, size, size);
    g.destroy();
  }

  private generateSandTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();

    g.fillStyle(0xffffff, 0.6);
    g.fillEllipse(width * 0.5, height * 0.5, width * 0.9, height * 0.62);
    g.fillStyle(0xffffff, 0.28);
    g.fillEllipse(width * 0.34, height * 0.44, width * 0.3, height * 0.2);

    g.generateTexture(key, width, height);
    g.destroy();
  }

  private generateCometTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();

    g.fillStyle(0xffffff, 0.08);
    g.fillPoints([
      new Phaser.Geom.Point(0, height * 0.5),
      new Phaser.Geom.Point(width * 0.72, height * 0.12),
      new Phaser.Geom.Point(width, height * 0.5),
      new Phaser.Geom.Point(width * 0.72, height * 0.88),
    ], true);
    g.fillStyle(0xffffff, 0.16);
    g.fillPoints([
      new Phaser.Geom.Point(width * 0.14, height * 0.5),
      new Phaser.Geom.Point(width * 0.78, height * 0.24),
      new Phaser.Geom.Point(width * 0.96, height * 0.5),
      new Phaser.Geom.Point(width * 0.78, height * 0.76),
    ], true);
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(width * 0.88, height * 0.5, height * 0.22);

    g.generateTexture(key, width, height);
    g.destroy();
  }
}
