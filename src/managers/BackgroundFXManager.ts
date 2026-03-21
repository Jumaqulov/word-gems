import Phaser from 'phaser';
import { LevelConfig } from '../utils/LevelSystem';

interface FXViewport {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

interface AmbientActor {
  sprite: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  velocityX: number;
  velocityY: number;
  bobX: number;
  bobY: number;
  bobSpeed: number;
  phase: number;
  rotationSpeed: number;
  alphaBase: number;
  alphaSwing: number;
  alphaSpeed: number;
  scaleBase: number;
  scaleSwing: number;
  scaleSpeed: number;
  wrapPadding: number;
}

interface PulseActor {
  sprite: Phaser.GameObjects.Image;
  baseAlpha: number;
  alphaSwing: number;
  speed: number;
  phase: number;
  baseScale: number;
  scaleSwing: number;
}

type SizeValue = number | ((viewport: FXViewport) => number);

interface AnchoredLayout {
  sprite: Phaser.GameObjects.Image;
  xRatio: number;
  yRatio: number;
  width: SizeValue;
  height: SizeValue;
}

type BlendMode = Phaser.BlendModes | string;

export class BackgroundFXManager {
  private readonly scene: Phaser.Scene;
  private readonly layer: Phaser.GameObjects.Container;
  private readonly isMobileProfile: boolean;

  private currentLevel: LevelConfig | null = null;
  private viewport: FXViewport;
  private ambientActors: AmbientActor[] = [];
  private pulseActors: PulseActor[] = [];
  private anchoredLayouts: AnchoredLayout[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private objects: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.layer = scene.add.container(0, 0);
    this.layer.setDepth(-20);
    this.isMobileProfile = window.innerWidth <= 768;
    this.viewport = this.readViewport();
  }

  applyWorld(levelConfig: LevelConfig): void {
    this.clear();
    this.currentLevel = levelConfig;

    const builders = {
      forest: () => this.buildForest(),
      ocean: () => this.buildOcean(),
      space: () => this.buildSpace(),
      castle: () => this.buildCastle(),
      magic: () => this.buildMagic(),
      ice: () => this.buildIce(),
      desert: () => this.buildDesert(),
    } as const;

    builders[levelConfig.world.id]();
    this.resize();
  }

  clear(): void {
    this.timers.forEach((timer) => timer.destroy());
    this.timers = [];

    this.objects.forEach((object) => {
      this.scene.tweens.killTweensOf(object);
      if (object.active) {
        object.destroy();
      }
    });

    this.objects = [];
    this.ambientActors = [];
    this.pulseActors = [];
    this.anchoredLayouts = [];
    this.layer.removeAll(false);
    this.currentLevel = null;
  }

  destroy(): void {
    this.clear();
    this.layer.destroy(true);
    this.currentLevel = null;
  }

  resize(): void {
    this.viewport = this.readViewport();
    this.anchoredLayouts.forEach((layout) => {
      layout.sprite.setPosition(this.viewport.width * layout.xRatio, this.viewport.height * layout.yRatio);
      layout.sprite.setDisplaySize(this.resolveSize(layout.width), this.resolveSize(layout.height));
    });
  }

  update(_time: number, delta: number): void {
    if (!this.currentLevel) return;

    const dt = delta / 1000;
    this.viewport = this.readViewport();

    this.ambientActors.forEach((actor) => this.updateAmbientActor(actor, dt));
    this.pulseActors.forEach((actor) => this.updatePulseActor(actor, dt));
  }

  getDebugSummary(): string {
    return JSON.stringify({
      world: this.currentLevel?.world.id ?? null,
      ambientActors: this.ambientActors.length,
      pulseActors: this.pulseActors.length,
      timers: this.timers.length,
    });
  }

  private buildForest(): void {
    this.addPulseGlow(0.18, 0.28, this.viewport.height * 0.44, this.viewport.height * 0.44, 0x8FD36D, {
      alpha: 0.08,
      alphaSwing: 0.03,
      scaleSwing: 0.05,
      speed: 0.55,
    });
    this.addPulseGlow(0.78, 0.7, this.viewport.height * 0.34, this.viewport.height * 0.34, 0xF5E08A, {
      alpha: 0.05,
      alphaSwing: 0.02,
      scaleSwing: 0.04,
      speed: 0.45,
    });

    const leafCount = this.pickCount(7, 4);
    const fireflyCount = this.pickCount(10, 6);
    const leafTints = [0x92C86F, 0xB0D973, 0xD2AF5C];
    const fireflyTints = [0xC6F56F, 0xF6E37D, 0x92ECA6];

    for (let index = 0; index < leafCount; index++) {
      this.addAmbientSprite('bgfx-leaf', {
        tint: Phaser.Utils.Array.GetRandom(leafTints),
        alphaBase: Phaser.Math.FloatBetween(0.08, 0.16),
        alphaSwing: Phaser.Math.FloatBetween(0.03, 0.06),
        alphaSpeed: Phaser.Math.FloatBetween(0.6, 1.1),
        scaleBase: Phaser.Math.FloatBetween(0.34, 0.68),
        scaleSwing: 0.05,
        scaleSpeed: Phaser.Math.FloatBetween(0.5, 0.8),
        velocityX: Phaser.Math.FloatBetween(-14, -8),
        velocityY: Phaser.Math.FloatBetween(4, 10),
        bobX: Phaser.Math.FloatBetween(5, 12),
        bobY: Phaser.Math.FloatBetween(4, 9),
        bobSpeed: Phaser.Math.FloatBetween(0.5, 1),
        rotationSpeed: Phaser.Math.FloatBetween(-0.28, 0.28),
        wrapPadding: 50,
        blendMode: Phaser.BlendModes.NORMAL,
      });
    }

    for (let index = 0; index < fireflyCount; index++) {
      this.addAmbientSprite('bgfx-glow-dot', {
        tint: Phaser.Utils.Array.GetRandom(fireflyTints),
        alphaBase: Phaser.Math.FloatBetween(0.08, 0.16),
        alphaSwing: Phaser.Math.FloatBetween(0.04, 0.08),
        alphaSpeed: Phaser.Math.FloatBetween(0.9, 1.8),
        scaleBase: Phaser.Math.FloatBetween(0.26, 0.52),
        scaleSwing: 0.05,
        scaleSpeed: Phaser.Math.FloatBetween(0.8, 1.2),
        velocityX: Phaser.Math.FloatBetween(-3, 3),
        velocityY: Phaser.Math.FloatBetween(-4, 4),
        bobX: Phaser.Math.FloatBetween(5, 14),
        bobY: Phaser.Math.FloatBetween(5, 12),
        bobSpeed: Phaser.Math.FloatBetween(0.5, 1.2),
        rotationSpeed: 0,
        wrapPadding: 24,
        blendMode: Phaser.BlendModes.ADD,
      });
    }
  }

  private buildOcean(): void {
    this.addPulseGlow(0.5, 0.26, this.viewport.width * 0.9, this.viewport.height * 0.34, 0x59D9FF, {
      texture: 'bgfx-soft-strip',
      alpha: 0.05,
      alphaSwing: 0.02,
      scaleSwing: 0.05,
      speed: 0.42,
    });
    this.addPulseGlow(0.58, 0.58, this.viewport.width * 1.05, this.viewport.height * 0.24, 0x2FBEE5, {
      texture: 'bgfx-soft-strip',
      alpha: 0.04,
      alphaSwing: 0.02,
      scaleSwing: 0.06,
      speed: 0.34,
      rotation: 0.04,
    });

    const bubbleCount = this.pickCount(9, 6);
    const shimmerCount = this.pickCount(6, 4);

    for (let index = 0; index < bubbleCount; index++) {
      const actor = this.addAmbientSprite('bgfx-bubble', {
        tint: 0x9AE9FF,
        alphaBase: Phaser.Math.FloatBetween(0.1, 0.2),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.05),
        alphaSpeed: Phaser.Math.FloatBetween(0.4, 0.8),
        scaleBase: Phaser.Math.FloatBetween(0.26, 0.58),
        scaleSwing: 0.04,
        scaleSpeed: Phaser.Math.FloatBetween(0.4, 0.8),
        velocityX: Phaser.Math.FloatBetween(-3, 3),
        velocityY: Phaser.Math.FloatBetween(-24, -12),
        bobX: Phaser.Math.FloatBetween(6, 14),
        bobY: Phaser.Math.FloatBetween(2, 6),
        bobSpeed: Phaser.Math.FloatBetween(0.45, 0.85),
        rotationSpeed: 0,
        wrapPadding: 40,
      });
      actor.baseY = Phaser.Math.FloatBetween(40, this.viewport.height + 20);
    }

    for (let index = 0; index < shimmerCount; index++) {
      this.addAmbientSprite('bgfx-glow-dot', {
        tint: Phaser.Utils.Array.GetRandom([0x84D9FF, 0xBEFFFF, 0x6BE7E0]),
        alphaBase: Phaser.Math.FloatBetween(0.05, 0.11),
        alphaSwing: Phaser.Math.FloatBetween(0.03, 0.05),
        alphaSpeed: Phaser.Math.FloatBetween(0.8, 1.4),
        scaleBase: Phaser.Math.FloatBetween(0.38, 0.74),
        scaleSwing: 0.06,
        scaleSpeed: Phaser.Math.FloatBetween(0.8, 1.3),
        velocityX: Phaser.Math.FloatBetween(-6, -2),
        velocityY: Phaser.Math.FloatBetween(-1, 2),
        bobX: Phaser.Math.FloatBetween(8, 20),
        bobY: Phaser.Math.FloatBetween(4, 10),
        bobSpeed: Phaser.Math.FloatBetween(0.45, 0.9),
        rotationSpeed: 0,
        wrapPadding: 28,
        blendMode: Phaser.BlendModes.ADD,
      });
    }
  }

  private buildSpace(): void {
    this.addPulseGlow(0.26, 0.18, this.viewport.height * 0.34, this.viewport.height * 0.34, 0x6E67FF, {
      alpha: 0.06,
      alphaSwing: 0.02,
      scaleSwing: 0.04,
      speed: 0.28,
    });
    this.addPulseGlow(0.78, 0.72, this.viewport.height * 0.28, this.viewport.height * 0.28, 0xB88CFF, {
      alpha: 0.05,
      alphaSwing: 0.015,
      scaleSwing: 0.05,
      speed: 0.22,
    });

    const nearStars = this.pickCount(18, 12);
    const farStars = this.pickCount(14, 9);

    for (let index = 0; index < farStars; index++) {
      this.addAmbientSprite('bgfx-glow-dot', {
        tint: Phaser.Utils.Array.GetRandom([0xF3EAFF, 0xBFD5FF, 0xCFC7FF]),
        alphaBase: Phaser.Math.FloatBetween(0.14, 0.24),
        alphaSwing: Phaser.Math.FloatBetween(0.03, 0.06),
        alphaSpeed: Phaser.Math.FloatBetween(0.8, 1.6),
        scaleBase: Phaser.Math.FloatBetween(0.12, 0.26),
        scaleSwing: 0.03,
        scaleSpeed: Phaser.Math.FloatBetween(0.6, 1),
        velocityX: Phaser.Math.FloatBetween(-3.2, -1.2),
        velocityY: Phaser.Math.FloatBetween(-0.4, 0.4),
        bobX: 0,
        bobY: 0,
        bobSpeed: 0.3,
        rotationSpeed: 0,
        wrapPadding: 18,
        blendMode: Phaser.BlendModes.ADD,
      });
    }

    for (let index = 0; index < nearStars; index++) {
      this.addAmbientSprite('bgfx-sparkle', {
        tint: Phaser.Utils.Array.GetRandom([0xF5F0FF, 0xDDEBFF, 0xC6B6FF]),
        alphaBase: Phaser.Math.FloatBetween(0.08, 0.16),
        alphaSwing: Phaser.Math.FloatBetween(0.04, 0.08),
        alphaSpeed: Phaser.Math.FloatBetween(0.9, 1.9),
        scaleBase: Phaser.Math.FloatBetween(0.16, 0.42),
        scaleSwing: 0.04,
        scaleSpeed: Phaser.Math.FloatBetween(0.8, 1.4),
        velocityX: Phaser.Math.FloatBetween(-7, -3),
        velocityY: Phaser.Math.FloatBetween(-0.8, 0.8),
        bobX: Phaser.Math.FloatBetween(1, 5),
        bobY: Phaser.Math.FloatBetween(1, 4),
        bobSpeed: Phaser.Math.FloatBetween(0.3, 0.7),
        rotationSpeed: Phaser.Math.FloatBetween(-0.08, 0.08),
        wrapPadding: 24,
        blendMode: Phaser.BlendModes.ADD,
      });
    }

    this.scheduleNextComet();
  }

  private buildCastle(): void {
    this.addPulseGlow(0.16, 0.32, this.viewport.height * 0.32, this.viewport.height * 0.32, 0xF0AA59, {
      alpha: 0.09,
      alphaSwing: 0.03,
      scaleSwing: 0.08,
      speed: 0.7,
    });
    this.addPulseGlow(0.84, 0.34, this.viewport.height * 0.29, this.viewport.height * 0.29, 0xE58A3C, {
      alpha: 0.08,
      alphaSwing: 0.03,
      scaleSwing: 0.08,
      speed: 0.76,
    });

    const dustCount = this.pickCount(16, 10);
    const emberCount = this.pickCount(5, 3);

    for (let index = 0; index < dustCount; index++) {
      this.addAmbientSprite('bgfx-dust', {
        tint: Phaser.Utils.Array.GetRandom([0xEED6B5, 0xCFAE89, 0xB9926E]),
        alphaBase: Phaser.Math.FloatBetween(0.05, 0.12),
        alphaSwing: Phaser.Math.FloatBetween(0.015, 0.04),
        alphaSpeed: Phaser.Math.FloatBetween(0.35, 0.8),
        scaleBase: Phaser.Math.FloatBetween(0.16, 0.4),
        scaleSwing: 0.02,
        scaleSpeed: Phaser.Math.FloatBetween(0.3, 0.7),
        velocityX: Phaser.Math.FloatBetween(-4, 4),
        velocityY: Phaser.Math.FloatBetween(-6, 1),
        bobX: Phaser.Math.FloatBetween(2, 8),
        bobY: Phaser.Math.FloatBetween(2, 6),
        bobSpeed: Phaser.Math.FloatBetween(0.35, 0.7),
        rotationSpeed: Phaser.Math.FloatBetween(-0.15, 0.15),
        wrapPadding: 24,
      });
    }

    for (let index = 0; index < emberCount; index++) {
      this.addAmbientSprite('bgfx-glow-dot', {
        tint: Phaser.Utils.Array.GetRandom([0xFFB266, 0xF6D77A, 0xE36D4C]),
        alphaBase: Phaser.Math.FloatBetween(0.05, 0.09),
        alphaSwing: Phaser.Math.FloatBetween(0.03, 0.05),
        alphaSpeed: Phaser.Math.FloatBetween(1, 1.8),
        scaleBase: Phaser.Math.FloatBetween(0.22, 0.4),
        scaleSwing: 0.03,
        scaleSpeed: Phaser.Math.FloatBetween(0.8, 1.3),
        velocityX: Phaser.Math.FloatBetween(-2, 2),
        velocityY: Phaser.Math.FloatBetween(-10, -4),
        bobX: Phaser.Math.FloatBetween(2, 6),
        bobY: Phaser.Math.FloatBetween(2, 6),
        bobSpeed: Phaser.Math.FloatBetween(0.4, 0.8),
        rotationSpeed: 0,
        wrapPadding: 20,
        blendMode: Phaser.BlendModes.ADD,
      });
    }
  }

  private buildMagic(): void {
    this.addPulseGlow(0.34, 0.22, this.viewport.height * 0.34, this.viewport.height * 0.34, 0xB88CFF, {
      alpha: 0.08,
      alphaSwing: 0.03,
      scaleSwing: 0.06,
      speed: 0.42,
    });
    this.addPulseGlow(0.7, 0.62, this.viewport.height * 0.32, this.viewport.height * 0.32, 0x69E6FF, {
      alpha: 0.06,
      alphaSwing: 0.025,
      scaleSwing: 0.05,
      speed: 0.5,
    });

    const runeCount = this.pickCount(5, 3);
    const sparkleCount = this.pickCount(10, 6);

    for (let index = 0; index < runeCount; index++) {
      this.addAmbientSprite('bgfx-rune', {
        tint: Phaser.Utils.Array.GetRandom([0xD8B7FF, 0x9AE9FF, 0xF3DEFF]),
        alphaBase: Phaser.Math.FloatBetween(0.05, 0.09),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.04),
        alphaSpeed: Phaser.Math.FloatBetween(0.35, 0.75),
        scaleBase: Phaser.Math.FloatBetween(0.42, 0.86),
        scaleSwing: 0.05,
        scaleSpeed: Phaser.Math.FloatBetween(0.4, 0.7),
        velocityX: Phaser.Math.FloatBetween(-4, 4),
        velocityY: Phaser.Math.FloatBetween(-2, 2),
        bobX: Phaser.Math.FloatBetween(8, 18),
        bobY: Phaser.Math.FloatBetween(6, 14),
        bobSpeed: Phaser.Math.FloatBetween(0.3, 0.7),
        rotationSpeed: Phaser.Math.FloatBetween(-0.2, 0.2),
        wrapPadding: 30,
        blendMode: Phaser.BlendModes.ADD,
      });
    }

    for (let index = 0; index < sparkleCount; index++) {
      this.addAmbientSprite('bgfx-sparkle', {
        tint: Phaser.Utils.Array.GetRandom([0xEFD8FF, 0x8CE5FF, 0xFDF4FF]),
        alphaBase: Phaser.Math.FloatBetween(0.08, 0.15),
        alphaSwing: Phaser.Math.FloatBetween(0.03, 0.07),
        alphaSpeed: Phaser.Math.FloatBetween(0.9, 1.8),
        scaleBase: Phaser.Math.FloatBetween(0.22, 0.48),
        scaleSwing: 0.04,
        scaleSpeed: Phaser.Math.FloatBetween(0.8, 1.2),
        velocityX: Phaser.Math.FloatBetween(-3, 3),
        velocityY: Phaser.Math.FloatBetween(-5, 5),
        bobX: Phaser.Math.FloatBetween(4, 10),
        bobY: Phaser.Math.FloatBetween(4, 10),
        bobSpeed: Phaser.Math.FloatBetween(0.45, 0.95),
        rotationSpeed: Phaser.Math.FloatBetween(-0.16, 0.16),
        wrapPadding: 24,
        blendMode: Phaser.BlendModes.ADD,
      });
    }
  }

  private buildIce(): void {
    this.addPulseGlow(0.24, 0.22, this.viewport.height * 0.32, this.viewport.height * 0.32, 0xA6E8FF, {
      alpha: 0.07,
      alphaSwing: 0.025,
      scaleSwing: 0.05,
      speed: 0.34,
    });
    this.addPulseGlow(0.78, 0.68, this.viewport.height * 0.28, this.viewport.height * 0.28, 0xECFAFF, {
      alpha: 0.05,
      alphaSwing: 0.02,
      scaleSwing: 0.04,
      speed: 0.3,
    });

    const snowCount = this.pickCount(14, 9);
    const glimmerCount = this.pickCount(6, 4);

    for (let index = 0; index < snowCount; index++) {
      const actor = this.addAmbientSprite('bgfx-snowflake', {
        tint: Phaser.Utils.Array.GetRandom([0xF2FBFF, 0xCCF0FF, 0xDFFBFF]),
        alphaBase: Phaser.Math.FloatBetween(0.1, 0.2),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.05),
        alphaSpeed: Phaser.Math.FloatBetween(0.4, 0.8),
        scaleBase: Phaser.Math.FloatBetween(0.22, 0.48),
        scaleSwing: 0.03,
        scaleSpeed: Phaser.Math.FloatBetween(0.4, 0.7),
        velocityX: Phaser.Math.FloatBetween(-10, -3),
        velocityY: Phaser.Math.FloatBetween(10, 20),
        bobX: Phaser.Math.FloatBetween(4, 9),
        bobY: Phaser.Math.FloatBetween(1, 4),
        bobSpeed: Phaser.Math.FloatBetween(0.45, 0.9),
        rotationSpeed: Phaser.Math.FloatBetween(-0.12, 0.12),
        wrapPadding: 24,
      });
      actor.baseY = Phaser.Math.FloatBetween(-20, this.viewport.height);
    }

    for (let index = 0; index < glimmerCount; index++) {
      this.addAmbientSprite('bgfx-glow-dot', {
        tint: Phaser.Utils.Array.GetRandom([0xB8F3FF, 0xEAFBFF, 0x9FE2FF]),
        alphaBase: Phaser.Math.FloatBetween(0.05, 0.09),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.05),
        alphaSpeed: Phaser.Math.FloatBetween(0.9, 1.4),
        scaleBase: Phaser.Math.FloatBetween(0.28, 0.55),
        scaleSwing: 0.04,
        scaleSpeed: Phaser.Math.FloatBetween(0.7, 1.1),
        velocityX: Phaser.Math.FloatBetween(-2, 2),
        velocityY: Phaser.Math.FloatBetween(-1, 1),
        bobX: Phaser.Math.FloatBetween(4, 9),
        bobY: Phaser.Math.FloatBetween(4, 8),
        bobSpeed: Phaser.Math.FloatBetween(0.35, 0.7),
        rotationSpeed: 0,
        wrapPadding: 20,
        blendMode: Phaser.BlendModes.ADD,
      });
    }
  }

  private buildDesert(): void {
    this.addPulseGlow(0.52, 0.3, this.viewport.width * 1.08, this.viewport.height * 0.18, 0xF6D89A, {
      texture: 'bgfx-soft-strip',
      alpha: 0.045,
      alphaSwing: 0.016,
      scaleSwing: 0.04,
      speed: 0.28,
      rotation: 0.02,
    });
    this.addPulseGlow(0.46, 0.64, this.viewport.width * 0.96, this.viewport.height * 0.14, 0xFFF0C7, {
      texture: 'bgfx-soft-strip',
      alpha: 0.035,
      alphaSwing: 0.014,
      scaleSwing: 0.035,
      speed: 0.24,
      rotation: -0.015,
    });

    const sandCount = this.pickCount(12, 8);
    const goldDustCount = this.pickCount(5, 3);

    for (let index = 0; index < sandCount; index++) {
      this.addAmbientSprite('bgfx-sand', {
        tint: Phaser.Utils.Array.GetRandom([0xD9B06E, 0xE7C885, 0xC99153]),
        alphaBase: Phaser.Math.FloatBetween(0.07, 0.14),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.04),
        alphaSpeed: Phaser.Math.FloatBetween(0.6, 1),
        scaleBase: Phaser.Math.FloatBetween(0.14, 0.34),
        scaleSwing: 0.02,
        scaleSpeed: Phaser.Math.FloatBetween(0.4, 0.7),
        velocityX: Phaser.Math.FloatBetween(10, 18),
        velocityY: Phaser.Math.FloatBetween(2, 8),
        bobX: Phaser.Math.FloatBetween(3, 8),
        bobY: Phaser.Math.FloatBetween(1, 4),
        bobSpeed: Phaser.Math.FloatBetween(0.35, 0.7),
        rotationSpeed: Phaser.Math.FloatBetween(-0.12, 0.12),
        wrapPadding: 26,
      });
    }

    for (let index = 0; index < goldDustCount; index++) {
      this.addAmbientSprite('bgfx-glow-dot', {
        tint: Phaser.Utils.Array.GetRandom([0xF7D977, 0xFFE9A6, 0xF4BF57]),
        alphaBase: Phaser.Math.FloatBetween(0.04, 0.08),
        alphaSwing: Phaser.Math.FloatBetween(0.025, 0.045),
        alphaSpeed: Phaser.Math.FloatBetween(0.8, 1.5),
        scaleBase: Phaser.Math.FloatBetween(0.22, 0.42),
        scaleSwing: 0.03,
        scaleSpeed: Phaser.Math.FloatBetween(0.7, 1.1),
        velocityX: Phaser.Math.FloatBetween(4, 10),
        velocityY: Phaser.Math.FloatBetween(-2, 2),
        bobX: Phaser.Math.FloatBetween(6, 12),
        bobY: Phaser.Math.FloatBetween(3, 7),
        bobSpeed: Phaser.Math.FloatBetween(0.35, 0.8),
        rotationSpeed: 0,
        wrapPadding: 20,
        blendMode: Phaser.BlendModes.ADD,
      });
    }
  }

  private scheduleNextComet(): void {
    const delay = Phaser.Math.Between(
      this.isMobileProfile ? 12000 : 9000,
      this.isMobileProfile ? 18000 : 14000
    );

    const timer = this.scene.time.delayedCall(delay, () => {
      if (this.currentLevel?.world.id !== 'space') return;
      this.spawnComet();
      this.scheduleNextComet();
    });

    this.timers.push(timer);
  }

  private spawnComet(): void {
    const startY = Phaser.Math.FloatBetween(50, this.viewport.height * 0.45);
    const endY = startY + Phaser.Math.FloatBetween(100, 170);
    const startX = -120;
    const endX = this.viewport.width + 160;

    const trail = this.createSprite('bgfx-comet', startX, startY, {
      tint: 0xBFD5FF,
      alpha: 0,
      rotation: Phaser.Math.FloatBetween(0.36, 0.56),
      scale: this.isMobileProfile ? 0.6 : 0.78,
      blendMode: Phaser.BlendModes.ADD,
    });

    const head = this.createSprite('bgfx-glow-dot', startX, startY, {
      tint: 0xF8FBFF,
      alpha: 0,
      scale: this.isMobileProfile ? 0.7 : 0.9,
      blendMode: Phaser.BlendModes.ADD,
    });

    this.scene.tweens.add({
      targets: [trail, head],
      alpha: { from: 0, to: 0.26 },
      duration: 240,
      ease: 'Sine.easeOut',
      yoyo: true,
      hold: 500,
    });

    this.scene.tweens.add({
      targets: trail,
      x: endX,
      y: endY,
      duration: this.isMobileProfile ? 2100 : 1700,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (trail.active) trail.destroy();
      },
    });

    this.scene.tweens.add({
      targets: head,
      x: endX + 24,
      y: endY + 8,
      duration: this.isMobileProfile ? 2100 : 1700,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (head.active) head.destroy();
      },
    });
  }

  private addAmbientSprite(
    texture: string,
    options: {
      tint?: number;
      alphaBase: number;
      alphaSwing: number;
      alphaSpeed: number;
      scaleBase: number;
      scaleSwing: number;
      scaleSpeed: number;
      velocityX: number;
      velocityY: number;
      bobX: number;
      bobY: number;
      bobSpeed: number;
      rotationSpeed: number;
      wrapPadding: number;
      blendMode?: BlendMode;
    }
  ): AmbientActor {
    const sprite = this.createSprite(
      texture,
      Phaser.Math.FloatBetween(-options.wrapPadding, this.viewport.width + options.wrapPadding),
      Phaser.Math.FloatBetween(-options.wrapPadding, this.viewport.height + options.wrapPadding),
      {
        tint: options.tint,
        alpha: options.alphaBase,
        scale: options.scaleBase,
        rotation: Phaser.Math.FloatBetween(0, Math.PI * 2),
        blendMode: options.blendMode,
      }
    );

    const actor: AmbientActor = {
      sprite,
      baseX: sprite.x,
      baseY: sprite.y,
      velocityX: options.velocityX,
      velocityY: options.velocityY,
      bobX: options.bobX,
      bobY: options.bobY,
      bobSpeed: options.bobSpeed,
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      rotationSpeed: options.rotationSpeed,
      alphaBase: options.alphaBase,
      alphaSwing: options.alphaSwing,
      alphaSpeed: options.alphaSpeed,
      scaleBase: options.scaleBase,
      scaleSwing: options.scaleSwing,
      scaleSpeed: options.scaleSpeed,
      wrapPadding: options.wrapPadding,
    };

    this.ambientActors.push(actor);
    return actor;
  }

  private addPulseGlow(
    xRatio: number,
    yRatio: number,
    width: SizeValue,
    height: SizeValue,
    tint: number,
    options: {
      texture?: string;
      alpha: number;
      alphaSwing: number;
      scaleSwing: number;
      speed: number;
      rotation?: number;
      blendMode?: BlendMode;
    }
  ): void {
    const sprite = this.createSprite(options.texture ?? 'bgfx-soft-glow', 0, 0, {
      tint,
      alpha: options.alpha,
      rotation: options.rotation,
      blendMode: options.blendMode ?? Phaser.BlendModes.ADD,
    });

    this.anchoredLayouts.push({ sprite, xRatio, yRatio, width, height });
    this.pulseActors.push({
      sprite,
      baseAlpha: options.alpha,
      alphaSwing: options.alphaSwing,
      speed: options.speed,
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      baseScale: 1,
      scaleSwing: options.scaleSwing,
    });
  }

  private createSprite(
    texture: string,
    x: number,
    y: number,
    options: {
      tint?: number;
      alpha?: number;
      scale?: number;
      rotation?: number;
      blendMode?: BlendMode;
    } = {}
  ): Phaser.GameObjects.Image {
    const sprite = this.scene.add.image(x, y, texture);
    if (options.tint !== undefined) sprite.setTint(options.tint);
    if (options.alpha !== undefined) sprite.setAlpha(options.alpha);
    if (options.scale !== undefined) sprite.setScale(options.scale);
    if (options.rotation !== undefined) sprite.setRotation(options.rotation);
    if (options.blendMode !== undefined) {
      sprite.setBlendMode(options.blendMode as Phaser.BlendModes);
    }

    this.layer.add(sprite);
    this.objects.push(sprite);
    return sprite;
  }

  private updateAmbientActor(actor: AmbientActor, dt: number): void {
    if (!actor.sprite.active) return;

    actor.baseX += actor.velocityX * dt;
    actor.baseY += actor.velocityY * dt;
    actor.phase += actor.bobSpeed * dt;

    this.wrapActor(actor);

    actor.sprite.x = actor.baseX + Math.sin(actor.phase * 1.7) * actor.bobX;
    actor.sprite.y = actor.baseY + Math.cos(actor.phase * 1.2) * actor.bobY;
    actor.sprite.rotation += actor.rotationSpeed * dt;
    actor.sprite.alpha = Phaser.Math.Clamp(
      actor.alphaBase + Math.sin(actor.phase * actor.alphaSpeed) * actor.alphaSwing,
      0,
      0.32
    );

    const scale = actor.scaleBase + Math.sin(actor.phase * actor.scaleSpeed) * actor.scaleSwing;
    actor.sprite.setScale(Math.max(0.04, scale));
  }

  private updatePulseActor(actor: PulseActor, dt: number): void {
    if (!actor.sprite.active) return;

    actor.phase += actor.speed * dt;
    actor.sprite.alpha = Phaser.Math.Clamp(
      actor.baseAlpha + Math.sin(actor.phase) * actor.alphaSwing,
      0,
      0.2
    );

    const scale = actor.baseScale + Math.sin(actor.phase) * actor.scaleSwing;
    actor.sprite.setScale(Math.max(0.9, scale));
  }

  private wrapActor(actor: AmbientActor): void {
    const { width, height } = this.viewport;
    const pad = actor.wrapPadding;

    if (actor.baseX < -pad) actor.baseX = width + pad;
    if (actor.baseX > width + pad) actor.baseX = -pad;
    if (actor.baseY < -pad) actor.baseY = height + pad;
    if (actor.baseY > height + pad) actor.baseY = -pad;
  }

  private readViewport(): FXViewport {
    const camera = this.scene.cameras.main;
    return {
      width: camera.width,
      height: camera.height,
      centerX: camera.centerX,
      centerY: camera.centerY,
    };
  }

  private resolveSize(value: SizeValue): number {
    return typeof value === 'function' ? value(this.viewport) : value;
  }

  private pickCount(desktopCount: number, mobileCount: number): number {
    return this.isMobileProfile ? mobileCount : desktopCount;
  }
}
