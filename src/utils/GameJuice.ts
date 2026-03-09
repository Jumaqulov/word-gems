import Phaser from 'phaser';
import { COLORS } from '../consts';

export class GameJuice {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Pop a sprite with elastic bounce */
  popSprite(target: Phaser.GameObjects.GameObject, scale = 1.3, duration = 200): void {
    this.scene.tweens.add({
      targets: target,
      scaleX: scale,
      scaleY: scale,
      duration: duration / 2,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  /** Smooth scale tween for selection (up or down) */
  scaleTo(target: Phaser.GameObjects.GameObject, scale: number, duration = 150): void {
    this.scene.tweens.add({
      targets: target,
      scaleX: scale,
      scaleY: scale,
      duration,
      ease: 'Back.easeOut',
    });
  }

  /** Shake effect on a container */
  shake(target: Phaser.GameObjects.Container | Phaser.Cameras.Scene2D.Camera, intensity = 3, duration = 200): void {
    if (target instanceof Phaser.Cameras.Scene2D.Camera) {
      target.shake(duration, intensity / 500);
    } else {
      const origX = target.x;
      const origY = target.y;
      this.scene.tweens.add({
        targets: target,
        x: origX + intensity,
        duration: 40,
        yoyo: true,
        repeat: Math.floor(duration / 80),
        ease: 'Sine.easeInOut',
        onComplete: () => {
          target.x = origX;
          target.y = origY;
        },
      });
    }
  }

  /** Sparkle particles at position */
  sparkleAt(x: number, y: number, color: number = COLORS.GOLD, count = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 20 + Math.random() * 30;

      const particle = this.scene.add.circle(x, y, 2 + Math.random() * 2, color, 1);
      particle.setDepth(100);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 400 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /** Star-shaped sparkle particles for word found */
  starBurst(x: number, y: number, color: number, count = 6): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 25 + Math.random() * 20;

      // Create a small star (4-point)
      const star = this.scene.add.star(x, y, 4, 2, 5, color, 1);
      star.setDepth(100);

      this.scene.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        rotation: Math.PI * 2,
        scaleX: 0,
        scaleY: 0,
        duration: 500 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => star.destroy(),
      });
    }
  }

  /** Floating text (like "+60") */
  floatingText(x: number, y: number, text: string, color: string = '#FFD700', fontSize = 22): void {
    const txt = this.scene.add.text(x, y, text, {
      fontFamily: '"Fredoka One", cursive',
      fontSize: `${fontSize}px`,
      color,
      fontStyle: 'bold',
      stroke: '#1a0e3e',
      strokeThickness: 3,
    });
    txt.setOrigin(0.5);
    txt.setDepth(100);

    // Start scaled down, bounce up
    txt.setScale(0.5);
    this.scene.tweens.add({
      targets: txt,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: txt,
          y: y - 50,
          alpha: 0,
          scaleX: 0.8,
          scaleY: 0.8,
          duration: 700,
          ease: 'Cubic.easeOut',
          onComplete: () => txt.destroy(),
        });
      },
    });
  }

  /** Gem collection burst with diamond particles */
  gemBurst(x: number, y: number): void {
    const colors = [COLORS.SELECT_COLOR, COLORS.GOLD, 0xFF6B6B, 0x4ECDC4, 0x45B7D1];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 30 + Math.random() * 40;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 2 + Math.random() * 3;

      const particle = this.scene.add.polygon(x, y, [0, -size, size, 0, 0, size, -size, 0], color, 1);
      particle.setDepth(100);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        rotation: Math.PI,
        duration: 500 + Math.random() * 300,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /** Flash the whole screen */
  screenFlash(color = 0xFFFFFF, duration = 300): void {
    const flash = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      color,
      0.3
    );
    flash.setDepth(200);
    flash.setScrollFactor(0);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  /** Animated line for found word — colored highlight behind letters */
  animateFoundLine(
    cells: { x: number; y: number }[],
    color: number,
    cellSize: number
  ): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    g.setDepth(5);

    // Thicker rounded line
    g.lineStyle(cellSize * 0.7, color, 0.3);
    g.beginPath();

    if (cells.length > 0) {
      g.moveTo(cells[0].x, cells[0].y);
      for (let i = 1; i < cells.length; i++) {
        g.lineTo(cells[i].x, cells[i].y);
      }
    }
    g.strokePath();

    // Add rounded end caps
    for (const cell of cells) {
      g.fillStyle(color, 0.25);
      g.fillCircle(cell.x, cell.y, cellSize * 0.35);
    }

    // Animate alpha in
    g.alpha = 0;
    this.scene.tweens.add({
      targets: g,
      alpha: 1,
      duration: 300,
      ease: 'Cubic.easeOut',
    });

    return g;
  }

  /** Staggered grid entrance animation */
  animateGridEntrance(
    cells: { bg: Phaser.GameObjects.Image; letter: Phaser.GameObjects.Text; row: number; col: number }[][],
    gridSize: number
  ): void {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const cell = cells[r][c];
        const delay = (r + c) * 20; // staggered from top-left

        // Start invisible and small
        cell.bg.setAlpha(0);
        cell.bg.setScale(0.3);
        cell.letter.setAlpha(0);
        cell.letter.setScale(0.3);

        this.scene.tweens.add({
          targets: cell.bg,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 300,
          delay,
          ease: 'Back.easeOut',
        });

        this.scene.tweens.add({
          targets: cell.letter,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 300,
          delay: delay + 50,
          ease: 'Back.easeOut',
        });
      }
    }
  }

  /** Level complete — wave disappear animation (row by row from bottom) */
  animateGridExit(
    cells: { bg: Phaser.GameObjects.Image; letter: Phaser.GameObjects.Text; row: number; col: number }[][],
    gridSize: number,
    onComplete?: () => void
  ): void {
    let maxDelay = 0;
    for (let r = gridSize - 1; r >= 0; r--) {
      for (let c = 0; c < gridSize; c++) {
        const cell = cells[r][c];
        const delay = (gridSize - 1 - r) * 50 + c * 10;
        maxDelay = Math.max(maxDelay, delay + 300);

        this.scene.tweens.add({
          targets: [cell.bg, cell.letter],
          alpha: 0,
          scaleX: 0,
          scaleY: 0,
          y: '-=20',
          duration: 300,
          delay,
          ease: 'Back.easeIn',
        });
      }
    }

    if (onComplete) {
      this.scene.time.delayedCall(maxDelay, onComplete);
    }
  }

  /** Wrong selection flash — briefly tint cells red */
  flashCellsRed(
    cells: { bg: Phaser.GameObjects.Image; letter: Phaser.GameObjects.Text }[],
    duration = 200
  ): void {
    for (const cell of cells) {
      cell.bg.setTint(0xFF4444);
      cell.letter.setColor('#FF4444');
    }

    this.scene.time.delayedCall(duration, () => {
      for (const cell of cells) {
        cell.bg.clearTint();
        cell.letter.setColor('#1e1e40');
      }
    });
  }

  /** Radar pulse effect from center (for hint detect) */
  radarPulse(x: number, y: number, radius: number): void {
    const circle = this.scene.add.circle(x, y, 10, COLORS.GOLD, 0.3);
    circle.setDepth(50);
    circle.setStrokeStyle(2, COLORS.GOLD, 0.5);

    this.scene.tweens.add({
      targets: circle,
      scaleX: radius / 10,
      scaleY: radius / 10,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => circle.destroy(),
    });
  }

  /** Selection trail — drag paytida zarrachalar */
  selectionTrailAt(x: number, y: number, color: number = 0x4ECDC4): void {
    for (let i = 0; i < 3; i++) {
      const offsetX = (Math.random() - 0.5) * 15;
      const offsetY = (Math.random() - 0.5) * 15;
      const size = 1.5 + Math.random() * 2;

      const particle = this.scene.add.circle(x + offsetX, y + offsetY, size, color, 0.6);
      particle.setDepth(15);

      this.scene.tweens.add({
        targets: particle,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        y: particle.y - 10 - Math.random() * 10,
        duration: 300 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /** Crystal shower particles for level complete */
  crystalShower(centerX: number, centerY: number): void {
    const colors = [COLORS.SELECT_COLOR, COLORS.GOLD, 0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0xFFD93D];

    for (let i = 0; i < 30; i++) {
      const x = centerX + (Math.random() - 0.5) * 400;
      const startY = centerY - 200;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 3 + Math.random() * 5;
      const delay = Math.random() * 500;

      const particle = this.scene.add.polygon(x, startY, [0, -size, size, 0, 0, size, -size, 0], color, 0.8);
      particle.setDepth(150);

      this.scene.tweens.add({
        targets: particle,
        y: centerY + 200 + Math.random() * 100,
        x: x + (Math.random() - 0.5) * 100,
        rotation: Math.PI * 4,
        alpha: 0,
        duration: 1500 + Math.random() * 500,
        delay,
        ease: 'Cubic.easeIn',
        onComplete: () => particle.destroy(),
      });
    }
  }
}
