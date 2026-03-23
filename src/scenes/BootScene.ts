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
    this.generateLightShaftTexture('bgfx-light-shaft', 150, 420);
    this.generateCausticTexture('bgfx-caustic', 320, 120);
    this.generateNebulaTexture('bgfx-nebula', 220);
    this.generateArchGlowTexture('bgfx-arch-glow', 120, 320);
    this.generateRuneHaloTexture('bgfx-rune-halo', 220);
    this.generateGlintBandTexture('bgfx-glint-band', 260, 74);
    this.generateHeatHazeTexture('bgfx-heat-haze', 320, 120);
    this.generateForestCanopyTexture('bgfx-forest-canopy', 700, 250);
    this.generateForestRidgeTexture('bgfx-forest-ridge', 760, 240);
    this.generateOceanReefTexture('bgfx-ocean-reef', 760, 220);
    this.generateOceanCurrentTexture('bgfx-ocean-current', 620, 170);
    this.generateSpacePlanetTexture('bgfx-space-planet', 320);
    this.generateCastleSilhouetteTexture('bgfx-castle-silhouette', 760, 250);
    this.generateMagicVeilTexture('bgfx-magic-veil', 620, 320);
    this.generateIceCrystalTexture('bgfx-ice-crystals', 760, 240);
    this.generateAuroraTexture('bgfx-aurora', 700, 180);
    this.generateDesertDunesTexture('bgfx-desert-dunes', 760, 220);
    this.generateSunDiscTexture('bgfx-sun-disc', 280);
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

  private generateLightShaftTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();

    g.fillStyle(0xffffff, 0.03);
    g.fillPoints([
      new Phaser.Geom.Point(width * 0.34, 0),
      new Phaser.Geom.Point(width * 0.66, 0),
      new Phaser.Geom.Point(width, height),
      new Phaser.Geom.Point(0, height),
    ], true);
    g.fillStyle(0xffffff, 0.06);
    g.fillPoints([
      new Phaser.Geom.Point(width * 0.42, 0),
      new Phaser.Geom.Point(width * 0.58, 0),
      new Phaser.Geom.Point(width * 0.78, height),
      new Phaser.Geom.Point(width * 0.22, height),
    ], true);

    g.generateTexture(key, width, height);
    g.destroy();
  }

  private generateCausticTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();
    const rows = [0.28, 0.48, 0.7];

    rows.forEach((ratio, index) => {
      const y = height * ratio;
      g.fillStyle(0xffffff, index === 1 ? 0.08 : 0.05);
      g.fillEllipse(width * 0.28, y, width * 0.28, height * 0.18);
      g.fillEllipse(width * 0.52, y - height * 0.08, width * 0.36, height * 0.16);
      g.fillEllipse(width * 0.78, y, width * 0.24, height * 0.14);
    });

    g.generateTexture(key, width, height);
    g.destroy();
  }

  private generateNebulaTexture(key: string, size: number): void {
    const g = this.add.graphics();
    const circles = [
      { x: 0.32, y: 0.4, r: 0.2, a: 0.08 },
      { x: 0.56, y: 0.34, r: 0.28, a: 0.09 },
      { x: 0.68, y: 0.56, r: 0.22, a: 0.07 },
      { x: 0.4, y: 0.66, r: 0.18, a: 0.05 },
    ];

    circles.forEach((circle) => {
      g.fillStyle(0xffffff, circle.a);
      g.fillCircle(size * circle.x, size * circle.y, size * circle.r);
    });

    g.generateTexture(key, size, size);
    g.destroy();
  }

  private generateArchGlowTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();

    g.fillStyle(0xffffff, 0.06);
    g.fillEllipse(width * 0.5, height * 0.56, width * 0.92, height * 0.8);
    g.fillStyle(0xffffff, 0.12);
    g.fillEllipse(width * 0.5, height * 0.3, width * 0.46, height * 0.24);
    g.fillStyle(0xffffff, 0.08);
    g.fillEllipse(width * 0.5, height * 0.64, width * 0.58, height * 0.44);

    g.generateTexture(key, width, height);
    g.destroy();
  }

  private generateRuneHaloTexture(key: string, size: number): void {
    const g = this.add.graphics();
    const center = size / 2;

    g.lineStyle(3, 0xffffff, 0.16);
    g.strokeCircle(center, center, size * 0.36);
    g.lineStyle(2, 0xffffff, 0.12);
    g.strokeCircle(center, center, size * 0.28);
    g.lineStyle(1.5, 0xffffff, 0.16);
    for (let index = 0; index < 8; index++) {
      const angle = (Math.PI * 2 * index) / 8;
      const x = center + Math.cos(angle) * size * 0.32;
      const y = center + Math.sin(angle) * size * 0.32;
      g.strokeCircle(x, y, size * 0.03);
    }

    g.generateTexture(key, size, size);
    g.destroy();
  }

  private generateGlintBandTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();

    g.fillStyle(0xffffff, 0.04);
    g.fillPoints([
      new Phaser.Geom.Point(width * 0.05, height * 0.7),
      new Phaser.Geom.Point(width * 0.42, height * 0.18),
      new Phaser.Geom.Point(width * 0.96, height * 0.28),
      new Phaser.Geom.Point(width * 0.58, height * 0.82),
    ], true);
    g.fillStyle(0xffffff, 0.09);
    g.fillPoints([
      new Phaser.Geom.Point(width * 0.2, height * 0.66),
      new Phaser.Geom.Point(width * 0.46, height * 0.28),
      new Phaser.Geom.Point(width * 0.82, height * 0.34),
      new Phaser.Geom.Point(width * 0.56, height * 0.72),
    ], true);

    g.generateTexture(key, width, height);
    g.destroy();
  }

  private generateHeatHazeTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();

    g.fillStyle(0xffffff, 0.025);
    g.fillEllipse(width * 0.2, height * 0.52, width * 0.34, height * 0.5);
    g.fillEllipse(width * 0.5, height * 0.46, width * 0.48, height * 0.42);
    g.fillEllipse(width * 0.82, height * 0.58, width * 0.3, height * 0.36);
    g.fillStyle(0xffffff, 0.045);
    g.fillEllipse(width * 0.42, height * 0.54, width * 0.2, height * 0.2);
    g.fillEllipse(width * 0.68, height * 0.42, width * 0.16, height * 0.16);

    g.generateTexture(key, width, height);
    g.destroy();
  }

  private generateForestCanopyTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();
    const circles = [
      [0.08, 0.48, 0.2],
      [0.22, 0.38, 0.24],
      [0.38, 0.46, 0.26],
      [0.56, 0.34, 0.22],
      [0.74, 0.42, 0.24],
      [0.9, 0.5, 0.18],
    ] as const;

    g.fillStyle(0xffffff, 0.22);
    circles.forEach(([x, y, r]) => {
      g.fillCircle(width * x, height * y, width * r);
    });

    g.fillStyle(0xffffff, 0.16);
    g.fillRoundedRect(width * 0.04, height * 0.42, width * 0.92, height * 0.5, 60);

    for (let i = 0; i < 7; i++) {
      const stemX = width * (0.12 + i * 0.12);
      const stemHeight = height * (0.2 + (i % 3) * 0.08);
      g.fillStyle(0xffffff, 0.1);
      g.fillRoundedRect(stemX, height * 0.62, width * 0.018, stemHeight, 8);
      g.fillCircle(stemX + width * 0.009, height * 0.62 + stemHeight * 0.12, width * 0.03);
    }

    g.generateTexture(key, width, height);
    g.destroy();
  }

  private generateForestRidgeTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();

    g.fillStyle(0xffffff, 0.18);
    g.fillPoints([
      new Phaser.Geom.Point(0, height * 0.78),
      new Phaser.Geom.Point(width * 0.12, height * 0.62),
      new Phaser.Geom.Point(width * 0.28, height * 0.7),
      new Phaser.Geom.Point(width * 0.46, height * 0.56),
      new Phaser.Geom.Point(width * 0.64, height * 0.7),
      new Phaser.Geom.Point(width * 0.84, height * 0.58),
      new Phaser.Geom.Point(width, height * 0.74),
      new Phaser.Geom.Point(width, height),
      new Phaser.Geom.Point(0, height),
    ], true);

    for (let i = 0; i < 9; i++) {
      const baseX = width * (0.06 + i * 0.105);
      const treeHeight = height * (0.22 + ((i + 1) % 3) * 0.07);
      g.fillStyle(0xffffff, 0.18);
      g.fillTriangle(
        baseX,
        height * 0.7,
        baseX + width * 0.04,
        height * 0.7 - treeHeight,
        baseX + width * 0.08,
        height * 0.7
      );
    }

    g.generateTexture(key, width, height);
    g.destroy();
  }

  private generateOceanReefTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();

    g.fillStyle(0xffffff, 0.16);
    g.fillPoints([
      new Phaser.Geom.Point(0, height * 0.82),
      new Phaser.Geom.Point(width * 0.12, height * 0.64),
      new Phaser.Geom.Point(width * 0.24, height * 0.74),
      new Phaser.Geom.Point(width * 0.36, height * 0.58),
      new Phaser.Geom.Point(width * 0.5, height * 0.76),
      new Phaser.Geom.Point(width * 0.64, height * 0.62),
      new Phaser.Geom.Point(width * 0.82, height * 0.8),
      new Phaser.Geom.Point(width, height * 0.66),
      new Phaser.Geom.Point(width, height),
      new Phaser.Geom.Point(0, height),
    ], true);

    for (let i = 0; i < 6; i++) {
      const baseX = width * (0.1 + i * 0.14);
      const stalkHeight = height * (0.16 + (i % 2) * 0.12);
      g.fillStyle(0xffffff, 0.14);
      g.fillRoundedRect(baseX, height * 0.68 - stalkHeight, width * 0.022, stalkHeight, 8);
      g.fillCircle(baseX + width * 0.012, height * 0.68 - stalkHeight, width * 0.028);
    }

    g.generateTexture(key, width, height);
    g.destroy();
  }

  private generateOceanCurrentTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();

    g.fillStyle(0xffffff, 0.08);
    g.fillPoints([
      new Phaser.Geom.Point(width * 0.02, height * 0.62),
      new Phaser.Geom.Point(width * 0.18, height * 0.36),
      new Phaser.Geom.Point(width * 0.42, height * 0.48),
      new Phaser.Geom.Point(width * 0.68, height * 0.24),
      new Phaser.Geom.Point(width * 0.96, height * 0.42),
      new Phaser.Geom.Point(width * 0.96, height * 0.7),
      new Phaser.Geom.Point(width * 0.72, height * 0.54),
      new Phaser.Geom.Point(width * 0.46, height * 0.82),
      new Phaser.Geom.Point(width * 0.18, height * 0.64),
    ], true);
    g.fillStyle(0xffffff, 0.14);
    g.fillEllipse(width * 0.56, height * 0.46, width * 0.5, height * 0.34);

    g.generateTexture(key, width, height);
    g.destroy();
  }

  private generateSpacePlanetTexture(key: string, size: number): void {
    const g = this.add.graphics();
    const center = size / 2;

    g.fillStyle(0xffffff, 0.18);
    g.fillCircle(center, center, size * 0.28);
    g.fillStyle(0xffffff, 0.08);
    g.fillCircle(center - size * 0.06, center - size * 0.04, size * 0.17);
    g.lineStyle(size * 0.04, 0xffffff, 0.18);
    g.strokeEllipse(center, center, size * 0.78, size * 0.26);
    g.lineStyle(size * 0.015, 0xffffff, 0.14);
    g.strokeEllipse(center, center, size * 0.9, size * 0.18);

    g.generateTexture(key, size, size);
    g.destroy();
  }

  private generateCastleSilhouetteTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();

    g.fillStyle(0xffffff, 0.18);
    g.fillPoints([
      new Phaser.Geom.Point(0, height * 0.78),
      new Phaser.Geom.Point(width * 0.1, height * 0.78),
      new Phaser.Geom.Point(width * 0.1, height * 0.42),
      new Phaser.Geom.Point(width * 0.16, height * 0.42),
      new Phaser.Geom.Point(width * 0.16, height * 0.34),
      new Phaser.Geom.Point(width * 0.22, height * 0.34),
      new Phaser.Geom.Point(width * 0.22, height * 0.52),
      new Phaser.Geom.Point(width * 0.4, height * 0.52),
      new Phaser.Geom.Point(width * 0.4, height * 0.28),
      new Phaser.Geom.Point(width * 0.46, height * 0.28),
      new Phaser.Geom.Point(width * 0.46, height * 0.48),
      new Phaser.Geom.Point(width * 0.62, height * 0.48),
      new Phaser.Geom.Point(width * 0.62, height * 0.36),
      new Phaser.Geom.Point(width * 0.68, height * 0.36),
      new Phaser.Geom.Point(width * 0.68, height * 0.58),
      new Phaser.Geom.Point(width * 0.84, height * 0.58),
      new Phaser.Geom.Point(width * 0.84, height * 0.42),
      new Phaser.Geom.Point(width * 0.9, height * 0.42),
      new Phaser.Geom.Point(width * 0.9, height * 0.78),
      new Phaser.Geom.Point(width, height * 0.78),
      new Phaser.Geom.Point(width, height),
      new Phaser.Geom.Point(0, height),
    ], true);

    g.generateTexture(key, width, height);
    g.destroy();
  }

  private generateMagicVeilTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();

    g.fillStyle(0xffffff, 0.08);
    g.fillEllipse(width * 0.28, height * 0.54, width * 0.42, height * 0.52);
    g.fillEllipse(width * 0.62, height * 0.44, width * 0.48, height * 0.56);
    g.fillStyle(0xffffff, 0.12);
    g.fillEllipse(width * 0.48, height * 0.5, width * 0.56, height * 0.42);
    g.lineStyle(4, 0xffffff, 0.12);
    g.strokeEllipse(width * 0.52, height * 0.48, width * 0.42, height * 0.22);

    g.generateTexture(key, width, height);
    g.destroy();
  }

  private generateIceCrystalTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();
    const peaks = [
      [0.04, 0.9, 0.14, 0.28],
      [0.18, 0.9, 0.08, 0.46],
      [0.28, 0.9, 0.12, 0.32],
      [0.42, 0.9, 0.07, 0.52],
      [0.56, 0.9, 0.14, 0.34],
      [0.72, 0.9, 0.1, 0.48],
      [0.86, 0.9, 0.12, 0.36],
    ] as const;

    peaks.forEach(([x, bottom, halfWidth, top]) => {
      g.fillStyle(0xffffff, 0.18);
      g.fillTriangle(
        width * (x - halfWidth / 2),
        height * bottom,
        width * x,
        height * top,
        width * (x + halfWidth / 2),
        height * bottom
      );
    });

    g.fillStyle(0xffffff, 0.12);
    g.fillRoundedRect(0, height * 0.82, width, height * 0.18, 12);

    g.generateTexture(key, width, height);
    g.destroy();
  }

  private generateAuroraTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();

    g.fillStyle(0xffffff, 0.06);
    g.fillPoints([
      new Phaser.Geom.Point(width * 0.02, height * 0.54),
      new Phaser.Geom.Point(width * 0.18, height * 0.22),
      new Phaser.Geom.Point(width * 0.36, height * 0.38),
      new Phaser.Geom.Point(width * 0.56, height * 0.16),
      new Phaser.Geom.Point(width * 0.78, height * 0.28),
      new Phaser.Geom.Point(width * 0.98, height * 0.1),
      new Phaser.Geom.Point(width * 0.98, height * 0.4),
      new Phaser.Geom.Point(width * 0.76, height * 0.52),
      new Phaser.Geom.Point(width * 0.52, height * 0.34),
      new Phaser.Geom.Point(width * 0.28, height * 0.56),
      new Phaser.Geom.Point(width * 0.1, height * 0.42),
    ], true);
    g.fillStyle(0xffffff, 0.12);
    g.fillEllipse(width * 0.48, height * 0.34, width * 0.6, height * 0.24);

    g.generateTexture(key, width, height);
    g.destroy();
  }

  private generateDesertDunesTexture(key: string, width: number, height: number): void {
    const g = this.add.graphics();

    g.fillStyle(0xffffff, 0.18);
    g.fillPoints([
      new Phaser.Geom.Point(0, height * 0.84),
      new Phaser.Geom.Point(width * 0.16, height * 0.62),
      new Phaser.Geom.Point(width * 0.34, height * 0.74),
      new Phaser.Geom.Point(width * 0.56, height * 0.54),
      new Phaser.Geom.Point(width * 0.76, height * 0.68),
      new Phaser.Geom.Point(width, height * 0.58),
      new Phaser.Geom.Point(width, height),
      new Phaser.Geom.Point(0, height),
    ], true);

    g.fillStyle(0xffffff, 0.12);
    g.fillPoints([
      new Phaser.Geom.Point(0, height * 0.94),
      new Phaser.Geom.Point(width * 0.22, height * 0.76),
      new Phaser.Geom.Point(width * 0.48, height * 0.88),
      new Phaser.Geom.Point(width * 0.72, height * 0.7),
      new Phaser.Geom.Point(width, height * 0.82),
      new Phaser.Geom.Point(width, height),
      new Phaser.Geom.Point(0, height),
    ], true);

    g.generateTexture(key, width, height);
    g.destroy();
  }

  private generateSunDiscTexture(key: string, size: number): void {
    const g = this.add.graphics();
    const center = size / 2;

    g.fillStyle(0xffffff, 0.08);
    g.fillCircle(center, center, size * 0.46);
    g.fillStyle(0xffffff, 0.16);
    g.fillCircle(center, center, size * 0.28);
    g.fillStyle(0xffffff, 0.24);
    g.fillCircle(center, center, size * 0.18);

    g.generateTexture(key, size, size);
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
