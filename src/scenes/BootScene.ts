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

    // Normal cell — gradient fill with subtle glow border
    this.generateCellTexture('cell-bg', cellSize, innerSize, {
      fillTop: 0x1E0B36,
      fillBottom: 0x281446,
      border: COLORS.CELL_BORDER,
      borderAlpha: 0.3,
      borderWidth: 1,
    });

    // Hover cell
    this.generateCellTexture('cell-hover', cellSize, innerSize, {
      fillTop: 0x2D1555,
      fillBottom: 0x3A1C6E,
      border: COLORS.SELECT_CYAN,
      borderAlpha: 0.4,
      borderWidth: 1.5,
    });

    // Selected cell (part of valid selection)
    this.generateCellTexture('cell-selected', cellSize, innerSize, {
      fillTop: 0x0A2D40,
      fillBottom: 0x0E3A52,
      border: COLORS.SELECT_CYAN,
      borderAlpha: 0.7,
      borderWidth: 2,
    });

    // Found cell overlay (just a highlight)
    this.generateCellTexture('cell-found', cellSize, innerSize, {
      fillTop: 0x2D1555,
      fillBottom: 0x2D1555,
      border: 0xFFFFFF,
      borderAlpha: 0.15,
      borderWidth: 1,
    });

    // Wrong cell flash
    this.generateCellTexture('cell-wrong', cellSize, innerSize, {
      fillTop: 0x3D0A0A,
      fillBottom: 0x4D1515,
      border: COLORS.ERROR_RED,
      borderAlpha: 0.6,
      borderWidth: 2,
    });
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
    }
  ): void {
    const g = this.add.graphics();
    const offset = (totalSize - innerSize) / 2;
    const radius = 6;

    // Gradient fill (simulated with two rects)
    g.fillStyle(opts.fillTop, 1);
    g.fillRoundedRect(offset, offset, innerSize, innerSize / 2, { tl: radius, tr: radius, bl: 0, br: 0 });
    g.fillStyle(opts.fillBottom, 1);
    g.fillRoundedRect(offset, offset + innerSize / 2, innerSize, innerSize / 2, { tl: 0, tr: 0, bl: radius, br: radius });

    // Border
    g.lineStyle(opts.borderWidth, opts.border, opts.borderAlpha);
    g.strokeRoundedRect(offset, offset, innerSize, innerSize, radius);

    // Subtle inner highlight (top edge)
    g.lineStyle(1, 0xFFFFFF, 0.04);
    g.strokeRoundedRect(offset + 1, offset + 1, innerSize - 2, innerSize - 2, radius - 1);

    g.generateTexture(key, totalSize, totalSize);
    g.destroy();
  }
}
