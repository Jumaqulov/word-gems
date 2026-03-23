import Phaser from 'phaser';
import { LevelConfig } from '../utils/LevelSystem';

interface FXViewport {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

type SizeValue = number | ((viewport: FXViewport) => number);
type BlendMode = Phaser.BlendModes | string;

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

interface SignatureActor {
  sprite: Phaser.GameObjects.Image;
  xRatio: number;
  yRatio: number;
  width: SizeValue;
  height: SizeValue;
  driftX: number;
  driftY: number;
  driftSpeed: number;
  phase: number;
  alphaBase: number;
  alphaSwing: number;
  alphaSpeed: number;
  scaleBase: number;
  scaleSwing: number;
  scaleSpeed: number;
  rotationBase: number;
  rotationSwing: number;
  rotationSpeed: number;
}

interface OrbitActor {
  sprite: Phaser.GameObjects.Image;
  centerXRatio: number;
  centerYRatio: number;
  radiusX: SizeValue;
  radiusY: SizeValue;
  speed: number;
  phase: number;
  alphaBase: number;
  alphaSwing: number;
  alphaSpeed: number;
  scaleBase: number;
  scaleSwing: number;
  scaleSpeed: number;
  rotationSpeed: number;
}

interface CometPoolEntry {
  trail: Phaser.GameObjects.Image;
  head: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  busy: boolean;
}

interface BackgroundFXDebugSummary {
  world: string | null;
  mobileProfile: boolean;
  ambientActors: number;
  signatureActors: number;
  orbitActors: number;
  timers: number;
  pooledComets: number;
  trackedObjects: number;
}

export class BackgroundFXManager {
  private readonly scene: Phaser.Scene;
  private readonly layer: Phaser.GameObjects.Container;

  private currentLevel: LevelConfig | null = null;
  private viewport: FXViewport;
  private isMobileProfile = false;
  private ambientActors: AmbientActor[] = [];
  private signatureActors: SignatureActor[] = [];
  private orbitActors: OrbitActor[] = [];
  private cometPool: CometPoolEntry[] = [];
  private timers = new Set<Phaser.Time.TimerEvent>();
  private objects = new Set<Phaser.GameObjects.GameObject>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.layer = scene.add.container(0, 0);
    this.layer.setDepth(-20);
    this.viewport = this.readViewport();
    this.isMobileProfile = this.viewport.width <= 768;
  }

  applyWorld(levelConfig: LevelConfig): void {
    this.clear();
    this.currentLevel = levelConfig;
    this.viewport = this.readViewport();
    this.isMobileProfile = this.viewport.width <= 768;

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
    this.timers.clear();

    Array.from(this.objects).forEach((object) => {
      this.scene.tweens.killTweensOf(object);
      if (object.active) {
        object.destroy();
      }
    });

    this.objects.clear();
    this.ambientActors = [];
    this.signatureActors = [];
    this.orbitActors = [];
    this.cometPool = [];
    this.layer.removeAll(false);
    this.currentLevel = null;
  }

  destroy(): void {
    this.clear();
    this.layer.destroy(true);
  }

  resize(): void {
    const previousMobileProfile = this.isMobileProfile;
    this.viewport = this.readViewport();
    this.isMobileProfile = this.viewport.width <= 768;

    if (this.currentLevel && previousMobileProfile !== this.isMobileProfile) {
      const level = this.currentLevel;
      this.applyWorld(level);
      return;
    }

    this.signatureActors.forEach((actor) => {
      actor.sprite.setDisplaySize(this.resolveSize(actor.width), this.resolveSize(actor.height));
    });
  }

  update(_time: number, delta: number): void {
    if (!this.currentLevel) return;

    const dt = delta / 1000;

    this.ambientActors.forEach((actor) => this.updateAmbientActor(actor, dt));
    this.signatureActors.forEach((actor) => this.updateSignatureActor(actor, dt));
    this.orbitActors.forEach((actor) => this.updateOrbitActor(actor, dt));
  }

  getDebugSummary(): BackgroundFXDebugSummary {
    return {
      world: this.currentLevel?.world.id ?? null,
      mobileProfile: this.isMobileProfile,
      ambientActors: this.ambientActors.length,
      signatureActors: this.signatureActors.length,
      orbitActors: this.orbitActors.length,
      timers: this.timers.size,
      pooledComets: this.cometPool.length,
      trackedObjects: this.objects.size,
    };
  }

  private buildForest(): void {
    this.addSignatureLayer('bgfx-forest-canopy', {
      xRatio: 0.5,
      yRatio: 0.09,
      width: (viewport) => viewport.width * 1.12,
      height: (viewport) => viewport.height * 0.28,
      tint: 0x0f3514,
      alphaBase: 0.32,
      alphaSwing: 0.025,
      alphaSpeed: 0.2,
      scaleBase: 1,
      scaleSwing: 0.012,
      scaleSpeed: 0.18,
      driftX: 4,
      driftY: 3,
      driftSpeed: 0.12,
      rotationBase: 0,
      rotationSwing: 0.01,
      rotationSpeed: 0.08,
    });
    this.addSignatureLayer('bgfx-forest-ridge', {
      xRatio: 0.5,
      yRatio: 0.9,
      width: (viewport) => viewport.width * 1.1,
      height: (viewport) => viewport.height * 0.26,
      tint: 0x143d18,
      alphaBase: 0.2,
      alphaSwing: 0.016,
      alphaSpeed: 0.18,
      scaleBase: 1,
      scaleSwing: 0.01,
      scaleSpeed: 0.16,
      driftX: 6,
      driftY: 2,
      driftSpeed: 0.1,
      rotationBase: 0,
      rotationSwing: 0.008,
      rotationSpeed: 0.08,
    });
    this.addSignatureLayer('bgfx-light-shaft', {
      xRatio: 0.22,
      yRatio: 0.28,
      width: (viewport) => viewport.width * 0.22,
      height: (viewport) => viewport.height * 0.82,
      tint: 0xdff2a3,
      alphaBase: 0.09,
      alphaSwing: 0.025,
      alphaSpeed: 0.45,
      scaleBase: 1,
      scaleSwing: 0.04,
      scaleSpeed: 0.3,
      driftX: 18,
      driftY: 10,
      driftSpeed: 0.22,
      rotationBase: -0.14,
      rotationSwing: 0.02,
      rotationSpeed: 0.35,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-light-shaft', {
      xRatio: 0.76,
      yRatio: 0.24,
      width: (viewport) => viewport.width * 0.18,
      height: (viewport) => viewport.height * 0.74,
      tint: 0xc9ee86,
      alphaBase: 0.075,
      alphaSwing: 0.02,
      alphaSpeed: 0.4,
      scaleBase: 1,
      scaleSwing: 0.035,
      scaleSpeed: 0.28,
      driftX: 12,
      driftY: 8,
      driftSpeed: 0.2,
      rotationBase: 0.1,
      rotationSwing: 0.018,
      rotationSpeed: 0.3,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-leaf', {
      xRatio: 0.12,
      yRatio: 0.1,
      width: (viewport) => viewport.width * 0.18,
      height: (viewport) => viewport.height * 0.11,
      tint: 0x6c8f3b,
      alphaBase: 0.07,
      alphaSwing: 0.02,
      alphaSpeed: 0.55,
      scaleBase: 1,
      scaleSwing: 0.03,
      scaleSpeed: 0.45,
      driftX: 10,
      driftY: 6,
      driftSpeed: 0.28,
      rotationBase: 0.8,
      rotationSwing: 0.06,
      rotationSpeed: 0.24,
    });
    this.addSignatureLayer('bgfx-soft-glow', {
      xRatio: 0.5,
      yRatio: 0.58,
      width: (viewport) => viewport.width * 0.56,
      height: (viewport) => viewport.height * 0.42,
      tint: 0x9cc85c,
      alphaBase: 0.05,
      alphaSwing: 0.016,
      alphaSpeed: 0.3,
      scaleBase: 1,
      scaleSwing: 0.025,
      scaleSpeed: 0.28,
      driftX: 0,
      driftY: 0,
      driftSpeed: 0.2,
      rotationBase: 0,
      rotationSwing: 0,
      rotationSpeed: 0.2,
      blendMode: Phaser.BlendModes.ADD,
    });

    const leafCount = this.pickCount(6, 4);
    const fireflyCount = this.pickCount(9, 6);
    const leafTints = [0x92c86f, 0xb0d973, 0xd2af5c];
    const fireflyTints = [0xc6f56f, 0xf6e37d, 0x92eca6];

    for (let index = 0; index < leafCount; index++) {
      this.addAmbientSprite('bgfx-leaf', {
        tint: Phaser.Utils.Array.GetRandom(leafTints),
        alphaBase: Phaser.Math.FloatBetween(0.08, 0.16),
        alphaSwing: Phaser.Math.FloatBetween(0.03, 0.06),
        alphaSpeed: Phaser.Math.FloatBetween(0.6, 1.1),
        scaleBase: Phaser.Math.FloatBetween(0.34, 0.66),
        scaleSwing: 0.05,
        scaleSpeed: Phaser.Math.FloatBetween(0.5, 0.8),
        velocityX: Phaser.Math.FloatBetween(-14, -7),
        velocityY: Phaser.Math.FloatBetween(4, 10),
        bobX: Phaser.Math.FloatBetween(5, 12),
        bobY: Phaser.Math.FloatBetween(4, 9),
        bobSpeed: Phaser.Math.FloatBetween(0.5, 1),
        rotationSpeed: Phaser.Math.FloatBetween(-0.28, 0.28),
        wrapPadding: 52,
      });
    }

    for (let index = 0; index < fireflyCount; index++) {
      this.addAmbientSprite('bgfx-glow-dot', {
        tint: Phaser.Utils.Array.GetRandom(fireflyTints),
        alphaBase: Phaser.Math.FloatBetween(0.08, 0.16),
        alphaSwing: Phaser.Math.FloatBetween(0.04, 0.08),
        alphaSpeed: Phaser.Math.FloatBetween(0.9, 1.8),
        scaleBase: Phaser.Math.FloatBetween(0.26, 0.5),
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
    this.addSignatureLayer('bgfx-ocean-reef', {
      xRatio: 0.5,
      yRatio: 0.9,
      width: (viewport) => viewport.width * 1.12,
      height: (viewport) => viewport.height * 0.24,
      tint: 0x09304a,
      alphaBase: 0.22,
      alphaSwing: 0.016,
      alphaSpeed: 0.2,
      scaleBase: 1,
      scaleSwing: 0.012,
      scaleSpeed: 0.16,
      driftX: 6,
      driftY: 3,
      driftSpeed: 0.1,
      rotationBase: 0,
      rotationSwing: 0.006,
      rotationSpeed: 0.08,
    });
    this.addSignatureLayer('bgfx-ocean-current', {
      xRatio: 0.44,
      yRatio: 0.5,
      width: (viewport) => viewport.width * 0.86,
      height: (viewport) => viewport.height * 0.22,
      tint: 0x9af6ff,
      alphaBase: 0.09,
      alphaSwing: 0.024,
      alphaSpeed: 0.24,
      scaleBase: 1,
      scaleSwing: 0.018,
      scaleSpeed: 0.2,
      driftX: 14,
      driftY: 8,
      driftSpeed: 0.14,
      rotationBase: -0.06,
      rotationSwing: 0.012,
      rotationSpeed: 0.1,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-caustic', {
      xRatio: 0.5,
      yRatio: 0.24,
      width: (viewport) => viewport.width * 0.98,
      height: (viewport) => viewport.height * 0.28,
      tint: 0x7be6ff,
      alphaBase: 0.12,
      alphaSwing: 0.03,
      alphaSpeed: 0.36,
      scaleBase: 1,
      scaleSwing: 0.03,
      scaleSpeed: 0.28,
      driftX: 14,
      driftY: 6,
      driftSpeed: 0.2,
      rotationBase: -0.04,
      rotationSwing: 0.015,
      rotationSpeed: 0.2,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-caustic', {
      xRatio: 0.56,
      yRatio: 0.63,
      width: (viewport) => viewport.width * 0.92,
      height: (viewport) => viewport.height * 0.2,
      tint: 0x4ad2f8,
      alphaBase: 0.08,
      alphaSwing: 0.022,
      alphaSpeed: 0.32,
      scaleBase: 1,
      scaleSwing: 0.026,
      scaleSpeed: 0.24,
      driftX: 10,
      driftY: 4,
      driftSpeed: 0.18,
      rotationBase: 0.02,
      rotationSwing: 0.014,
      rotationSpeed: 0.22,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-soft-glow', {
      xRatio: 0.84,
      yRatio: 0.56,
      width: (viewport) => viewport.width * 0.3,
      height: (viewport) => viewport.height * 0.44,
      tint: 0x5fd8ff,
      alphaBase: 0.07,
      alphaSwing: 0.02,
      alphaSpeed: 0.28,
      scaleBase: 1,
      scaleSwing: 0.035,
      scaleSpeed: 0.26,
      driftX: 8,
      driftY: 8,
      driftSpeed: 0.2,
      rotationBase: 0,
      rotationSwing: 0,
      rotationSpeed: 0.1,
      blendMode: Phaser.BlendModes.ADD,
    });

    const bubbleCount = this.pickCount(7, 5);
    const shimmerCount = this.pickCount(4, 3);

    for (let index = 0; index < bubbleCount; index++) {
      const actor = this.addAmbientSprite('bgfx-bubble', {
        tint: 0x9ae9ff,
        alphaBase: Phaser.Math.FloatBetween(0.14, 0.24),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.05),
        alphaSpeed: Phaser.Math.FloatBetween(0.4, 0.8),
        scaleBase: Phaser.Math.FloatBetween(0.34, 0.72),
        scaleSwing: 0.04,
        scaleSpeed: Phaser.Math.FloatBetween(0.4, 0.8),
        velocityX: Phaser.Math.FloatBetween(-2.5, 2.5),
        velocityY: Phaser.Math.FloatBetween(-22, -11),
        bobX: Phaser.Math.FloatBetween(6, 15),
        bobY: Phaser.Math.FloatBetween(2, 6),
        bobSpeed: Phaser.Math.FloatBetween(0.45, 0.85),
        rotationSpeed: 0,
        wrapPadding: 40,
      });
      actor.baseY = Phaser.Math.FloatBetween(40, this.viewport.height + 20);
    }

    for (let index = 0; index < shimmerCount; index++) {
      this.addAmbientSprite('bgfx-glow-dot', {
        tint: Phaser.Utils.Array.GetRandom([0x84d9ff, 0xbeffff, 0x6be7e0]),
        alphaBase: Phaser.Math.FloatBetween(0.08, 0.15),
        alphaSwing: Phaser.Math.FloatBetween(0.03, 0.05),
        alphaSpeed: Phaser.Math.FloatBetween(0.8, 1.4),
        scaleBase: Phaser.Math.FloatBetween(0.5, 0.88),
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
    this.addSignatureLayer('bgfx-space-planet', {
      xRatio: 0.84,
      yRatio: 0.18,
      width: (viewport) => Math.min(viewport.width, viewport.height) * 0.46,
      height: (viewport) => Math.min(viewport.width, viewport.height) * 0.46,
      tint: 0x7f73ff,
      alphaBase: 0.18,
      alphaSwing: 0.02,
      alphaSpeed: 0.18,
      scaleBase: 1,
      scaleSwing: 0.016,
      scaleSpeed: 0.16,
      driftX: 8,
      driftY: 4,
      driftSpeed: 0.1,
      rotationBase: 0.14,
      rotationSwing: 0.018,
      rotationSpeed: 0.08,
    });
    this.addSignatureLayer('bgfx-nebula', {
      xRatio: 0.24,
      yRatio: 0.24,
      width: (viewport) => viewport.width * 0.52,
      height: (viewport) => viewport.height * 0.34,
      tint: 0x7866ff,
      alphaBase: 0.11,
      alphaSwing: 0.024,
      alphaSpeed: 0.22,
      scaleBase: 1,
      scaleSwing: 0.028,
      scaleSpeed: 0.22,
      driftX: 10,
      driftY: 6,
      driftSpeed: 0.14,
      rotationBase: 0.08,
      rotationSwing: 0.015,
      rotationSpeed: 0.12,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-nebula', {
      xRatio: 0.78,
      yRatio: 0.72,
      width: (viewport) => viewport.width * 0.48,
      height: (viewport) => viewport.height * 0.32,
      tint: 0x6ea7ff,
      alphaBase: 0.08,
      alphaSwing: 0.02,
      alphaSpeed: 0.2,
      scaleBase: 1,
      scaleSwing: 0.026,
      scaleSpeed: 0.18,
      driftX: 8,
      driftY: 4,
      driftSpeed: 0.12,
      rotationBase: -0.06,
      rotationSwing: 0.014,
      rotationSpeed: 0.11,
      blendMode: Phaser.BlendModes.ADD,
    });

    const farStars = this.pickCount(16, 10);
    const nearStars = this.pickCount(12, 8);

    for (let index = 0; index < farStars; index++) {
      this.addAmbientSprite('bgfx-glow-dot', {
        tint: Phaser.Utils.Array.GetRandom([0xf3eaff, 0xbfd5ff, 0xcfc7ff]),
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
        tint: Phaser.Utils.Array.GetRandom([0xf5f0ff, 0xddebff, 0xc6b6ff]),
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

    this.createCometPool(this.isMobileProfile ? 1 : 2);
    this.scheduleNextComet();
  }

  private buildCastle(): void {
    this.addSignatureLayer('bgfx-castle-silhouette', {
      xRatio: 0.5,
      yRatio: 0.86,
      width: (viewport) => viewport.width * 1.08,
      height: (viewport) => viewport.height * 0.28,
      tint: 0x1b0f0a,
      alphaBase: 0.26,
      alphaSwing: 0.018,
      alphaSpeed: 0.18,
      scaleBase: 1,
      scaleSwing: 0.012,
      scaleSpeed: 0.16,
      driftX: 4,
      driftY: 2,
      driftSpeed: 0.1,
      rotationBase: 0,
      rotationSwing: 0.008,
      rotationSpeed: 0.08,
    });
    this.addSignatureLayer('bgfx-arch-glow', {
      xRatio: 0.07,
      yRatio: 0.3,
      width: (viewport) => viewport.width * 0.18,
      height: (viewport) => viewport.height * 0.58,
      tint: 0xf1ab59,
      alphaBase: 0.11,
      alphaSwing: 0.028,
      alphaSpeed: 0.8,
      scaleBase: 1,
      scaleSwing: 0.05,
      scaleSpeed: 0.44,
      driftX: 3,
      driftY: 6,
      driftSpeed: 0.3,
      rotationBase: -0.06,
      rotationSwing: 0.012,
      rotationSpeed: 0.22,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-arch-glow', {
      xRatio: 0.93,
      yRatio: 0.32,
      width: (viewport) => viewport.width * 0.18,
      height: (viewport) => viewport.height * 0.56,
      tint: 0xe58a3c,
      alphaBase: 0.1,
      alphaSwing: 0.026,
      alphaSpeed: 0.76,
      scaleBase: 1,
      scaleSwing: 0.048,
      scaleSpeed: 0.4,
      driftX: -3,
      driftY: 6,
      driftSpeed: 0.28,
      rotationBase: 0.06,
      rotationSwing: 0.012,
      rotationSpeed: 0.22,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-soft-glow', {
      xRatio: 0.5,
      yRatio: 0.5,
      width: (viewport) => viewport.width * 0.56,
      height: (viewport) => viewport.height * 0.48,
      tint: 0xc49163,
      alphaBase: 0.048,
      alphaSwing: 0.014,
      alphaSpeed: 0.24,
      scaleBase: 1,
      scaleSwing: 0.02,
      scaleSpeed: 0.2,
      driftX: 0,
      driftY: 0,
      driftSpeed: 0.2,
      rotationBase: 0,
      rotationSwing: 0,
      rotationSpeed: 0.1,
    });

    const dustCount = this.pickCount(14, 9);
    const emberCount = this.pickCount(4, 3);

    for (let index = 0; index < dustCount; index++) {
      this.addAmbientSprite('bgfx-dust', {
        tint: Phaser.Utils.Array.GetRandom([0xeed6b5, 0xcfae89, 0xb9926e]),
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
      const edgeBias = index % 2 === 0 ? 0.12 : 0.88;
      const actor = this.addAmbientSprite('bgfx-glow-dot', {
        tint: Phaser.Utils.Array.GetRandom([0xffb266, 0xf6d77a, 0xe36d4c]),
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
      actor.baseX = this.viewport.width * edgeBias;
    }
  }

  private buildMagic(): void {
    this.addSignatureLayer('bgfx-magic-veil', {
      xRatio: 0.5,
      yRatio: 0.48,
      width: (viewport) => viewport.width * 0.88,
      height: (viewport) => viewport.height * 0.38,
      tint: 0xc68cff,
      alphaBase: 0.11,
      alphaSwing: 0.028,
      alphaSpeed: 0.22,
      scaleBase: 1,
      scaleSwing: 0.018,
      scaleSpeed: 0.18,
      driftX: 6,
      driftY: 6,
      driftSpeed: 0.12,
      rotationBase: 0,
      rotationSwing: 0.012,
      rotationSpeed: 0.08,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-rune-halo', {
      xRatio: 0.5,
      yRatio: 0.48,
      width: (viewport) => Math.min(viewport.width, viewport.height) * 0.9,
      height: (viewport) => Math.min(viewport.width, viewport.height) * 0.9,
      tint: 0xd4c0ff,
      alphaBase: 0.1,
      alphaSwing: 0.028,
      alphaSpeed: 0.26,
      scaleBase: 1,
      scaleSwing: 0.03,
      scaleSpeed: 0.24,
      driftX: 4,
      driftY: 6,
      driftSpeed: 0.16,
      rotationBase: 0,
      rotationSwing: 0.035,
      rotationSpeed: 0.12,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-rune-halo', {
      xRatio: 0.58,
      yRatio: 0.44,
      width: (viewport) => Math.min(viewport.width, viewport.height) * 0.54,
      height: (viewport) => Math.min(viewport.width, viewport.height) * 0.54,
      tint: 0x79dcff,
      alphaBase: 0.06,
      alphaSwing: 0.02,
      alphaSpeed: 0.3,
      scaleBase: 1,
      scaleSwing: 0.025,
      scaleSpeed: 0.24,
      driftX: 5,
      driftY: 5,
      driftSpeed: 0.18,
      rotationBase: 0.45,
      rotationSwing: 0.03,
      rotationSpeed: -0.14,
      blendMode: Phaser.BlendModes.ADD,
    });

    this.addOrbitActor('bgfx-glow-dot', {
      centerXRatio: 0.5,
      centerYRatio: 0.48,
      radiusX: (viewport) => viewport.width * 0.18,
      radiusY: (viewport) => viewport.height * 0.12,
      speed: 0.42,
      tint: 0x92e9ff,
      alphaBase: 0.09,
      alphaSwing: 0.03,
      alphaSpeed: 0.85,
      scaleBase: 0.55,
      scaleSwing: 0.08,
      scaleSpeed: 0.9,
      rotationSpeed: 0.18,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addOrbitActor('bgfx-sparkle', {
      centerXRatio: 0.5,
      centerYRatio: 0.48,
      radiusX: (viewport) => viewport.width * 0.14,
      radiusY: (viewport) => viewport.height * 0.18,
      speed: -0.34,
      tint: 0xf7e4ff,
      alphaBase: 0.08,
      alphaSwing: 0.025,
      alphaSpeed: 0.8,
      scaleBase: 0.48,
      scaleSwing: 0.05,
      scaleSpeed: 0.7,
      rotationSpeed: -0.22,
      blendMode: Phaser.BlendModes.ADD,
    });

    const runeCount = this.pickCount(4, 3);
    const sparkleCount = this.pickCount(8, 5);

    for (let index = 0; index < runeCount; index++) {
      this.addAmbientSprite('bgfx-rune', {
        tint: Phaser.Utils.Array.GetRandom([0xd8b7ff, 0x9ae9ff, 0xf3deff]),
        alphaBase: Phaser.Math.FloatBetween(0.05, 0.09),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.04),
        alphaSpeed: Phaser.Math.FloatBetween(0.35, 0.75),
        scaleBase: Phaser.Math.FloatBetween(0.42, 0.82),
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
        tint: Phaser.Utils.Array.GetRandom([0xefd8ff, 0x8ce5ff, 0xfdf4ff]),
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
    this.addSignatureLayer('bgfx-ice-crystals', {
      xRatio: 0.5,
      yRatio: 0.9,
      width: (viewport) => viewport.width * 1.08,
      height: (viewport) => viewport.height * 0.24,
      tint: 0x8fdfff,
      alphaBase: 0.22,
      alphaSwing: 0.018,
      alphaSpeed: 0.18,
      scaleBase: 1,
      scaleSwing: 0.012,
      scaleSpeed: 0.16,
      driftX: 6,
      driftY: 2,
      driftSpeed: 0.1,
      rotationBase: 0,
      rotationSwing: 0.008,
      rotationSpeed: 0.08,
    });
    this.addSignatureLayer('bgfx-aurora', {
      xRatio: 0.54,
      yRatio: 0.16,
      width: (viewport) => viewport.width * 1.02,
      height: (viewport) => viewport.height * 0.2,
      tint: 0xd6ffff,
      alphaBase: 0.09,
      alphaSwing: 0.026,
      alphaSpeed: 0.24,
      scaleBase: 1,
      scaleSwing: 0.016,
      scaleSpeed: 0.18,
      driftX: 10,
      driftY: 5,
      driftSpeed: 0.12,
      rotationBase: -0.05,
      rotationSwing: 0.01,
      rotationSpeed: 0.08,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-glint-band', {
      xRatio: 0.52,
      yRatio: 0.22,
      width: (viewport) => viewport.width * 1.04,
      height: (viewport) => viewport.height * 0.18,
      tint: 0xdff7ff,
      alphaBase: 0.1,
      alphaSwing: 0.024,
      alphaSpeed: 0.28,
      scaleBase: 1,
      scaleSwing: 0.025,
      scaleSpeed: 0.24,
      driftX: 10,
      driftY: 2,
      driftSpeed: 0.18,
      rotationBase: -0.18,
      rotationSwing: 0.018,
      rotationSpeed: 0.18,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-glint-band', {
      xRatio: 0.46,
      yRatio: 0.68,
      width: (viewport) => viewport.width * 0.92,
      height: (viewport) => viewport.height * 0.12,
      tint: 0xb8ecff,
      alphaBase: 0.072,
      alphaSwing: 0.02,
      alphaSpeed: 0.25,
      scaleBase: 1,
      scaleSwing: 0.02,
      scaleSpeed: 0.22,
      driftX: 8,
      driftY: 2,
      driftSpeed: 0.16,
      rotationBase: -0.12,
      rotationSwing: 0.014,
      rotationSpeed: 0.16,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-soft-glow', {
      xRatio: 0.72,
      yRatio: 0.22,
      width: (viewport) => viewport.width * 0.24,
      height: (viewport) => viewport.height * 0.3,
      tint: 0xeafaff,
      alphaBase: 0.05,
      alphaSwing: 0.015,
      alphaSpeed: 0.22,
      scaleBase: 1,
      scaleSwing: 0.02,
      scaleSpeed: 0.2,
      driftX: 5,
      driftY: 3,
      driftSpeed: 0.16,
      rotationBase: 0,
      rotationSwing: 0,
      rotationSpeed: 0.12,
      blendMode: Phaser.BlendModes.ADD,
    });

    const snowCount = this.pickCount(11, 7);
    const glimmerCount = this.pickCount(5, 3);

    for (let index = 0; index < snowCount; index++) {
      const actor = this.addAmbientSprite('bgfx-snowflake', {
        tint: Phaser.Utils.Array.GetRandom([0xf2fbff, 0xccf0ff, 0xdffbff]),
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
        tint: Phaser.Utils.Array.GetRandom([0xb8f3ff, 0xeafbff, 0x9fe2ff]),
        alphaBase: Phaser.Math.FloatBetween(0.07, 0.12),
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
    this.addSignatureLayer('bgfx-sun-disc', {
      xRatio: 0.84,
      yRatio: 0.2,
      width: (viewport) => Math.min(viewport.width, viewport.height) * 0.32,
      height: (viewport) => Math.min(viewport.width, viewport.height) * 0.32,
      tint: 0xffdd8a,
      alphaBase: 0.12,
      alphaSwing: 0.02,
      alphaSpeed: 0.18,
      scaleBase: 1,
      scaleSwing: 0.014,
      scaleSpeed: 0.16,
      driftX: 5,
      driftY: 4,
      driftSpeed: 0.1,
      rotationBase: 0,
      rotationSwing: 0.006,
      rotationSpeed: 0.06,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-desert-dunes', {
      xRatio: 0.5,
      yRatio: 0.9,
      width: (viewport) => viewport.width * 1.12,
      height: (viewport) => viewport.height * 0.24,
      tint: 0x7a4314,
      alphaBase: 0.24,
      alphaSwing: 0.018,
      alphaSpeed: 0.18,
      scaleBase: 1,
      scaleSwing: 0.012,
      scaleSpeed: 0.16,
      driftX: 7,
      driftY: 2,
      driftSpeed: 0.1,
      rotationBase: 0,
      rotationSwing: 0.008,
      rotationSpeed: 0.08,
    });
    this.addSignatureLayer('bgfx-heat-haze', {
      xRatio: 0.54,
      yRatio: 0.36,
      width: (viewport) => viewport.width * 1.08,
      height: (viewport) => viewport.height * 0.22,
      tint: 0xf6d89a,
      alphaBase: 0.085,
      alphaSwing: 0.022,
      alphaSpeed: 0.24,
      scaleBase: 1,
      scaleSwing: 0.02,
      scaleSpeed: 0.2,
      driftX: 12,
      driftY: 4,
      driftSpeed: 0.18,
      rotationBase: -0.04,
      rotationSwing: 0.01,
      rotationSpeed: 0.12,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-soft-strip', {
      xRatio: 0.5,
      yRatio: 0.72,
      width: (viewport) => viewport.width * 0.98,
      height: (viewport) => viewport.height * 0.15,
      tint: 0xe7b763,
      alphaBase: 0.06,
      alphaSwing: 0.017,
      alphaSpeed: 0.22,
      scaleBase: 1,
      scaleSwing: 0.02,
      scaleSpeed: 0.18,
      driftX: 10,
      driftY: 2,
      driftSpeed: 0.14,
      rotationBase: 0.02,
      rotationSwing: 0.008,
      rotationSpeed: 0.1,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-soft-glow', {
      xRatio: 0.82,
      yRatio: 0.26,
      width: (viewport) => viewport.width * 0.28,
      height: (viewport) => viewport.height * 0.42,
      tint: 0xffe3a3,
      alphaBase: 0.05,
      alphaSwing: 0.015,
      alphaSpeed: 0.18,
      scaleBase: 1,
      scaleSwing: 0.018,
      scaleSpeed: 0.18,
      driftX: 6,
      driftY: 4,
      driftSpeed: 0.14,
      rotationBase: 0,
      rotationSwing: 0,
      rotationSpeed: 0.1,
      blendMode: Phaser.BlendModes.ADD,
    });

    const sandCount = this.pickCount(10, 6);
    const goldDustCount = this.pickCount(4, 2);

    for (let index = 0; index < sandCount; index++) {
      this.addAmbientSprite('bgfx-sand', {
        tint: Phaser.Utils.Array.GetRandom([0xd9b06e, 0xe7c885, 0xc99153]),
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
        tint: Phaser.Utils.Array.GetRandom([0xf7d977, 0xffe9a6, 0xf4bf57]),
        alphaBase: Phaser.Math.FloatBetween(0.06, 0.1),
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

  private addSignatureLayer(
    texture: string,
    options: {
      xRatio: number;
      yRatio: number;
      width: SizeValue;
      height: SizeValue;
      tint?: number;
      alphaBase: number;
      alphaSwing: number;
      alphaSpeed: number;
      scaleBase: number;
      scaleSwing: number;
      scaleSpeed: number;
      driftX: number;
      driftY: number;
      driftSpeed: number;
      rotationBase: number;
      rotationSwing: number;
      rotationSpeed: number;
      blendMode?: BlendMode;
    }
  ): void {
    const sprite = this.createSprite(texture, 0, 0, {
      tint: options.tint,
      alpha: options.alphaBase,
      rotation: options.rotationBase,
      blendMode: options.blendMode,
    });

    this.signatureActors.push({
      sprite,
      xRatio: options.xRatio,
      yRatio: options.yRatio,
      width: options.width,
      height: options.height,
      driftX: options.driftX,
      driftY: options.driftY,
      driftSpeed: options.driftSpeed,
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      alphaBase: options.alphaBase,
      alphaSwing: options.alphaSwing,
      alphaSpeed: options.alphaSpeed,
      scaleBase: options.scaleBase,
      scaleSwing: options.scaleSwing,
      scaleSpeed: options.scaleSpeed,
      rotationBase: options.rotationBase,
      rotationSwing: options.rotationSwing,
      rotationSpeed: options.rotationSpeed,
    });
  }

  private addOrbitActor(
    texture: string,
    options: {
      centerXRatio: number;
      centerYRatio: number;
      radiusX: SizeValue;
      radiusY: SizeValue;
      speed: number;
      tint?: number;
      alphaBase: number;
      alphaSwing: number;
      alphaSpeed: number;
      scaleBase: number;
      scaleSwing: number;
      scaleSpeed: number;
      rotationSpeed: number;
      blendMode?: BlendMode;
    }
  ): void {
    const sprite = this.createSprite(texture, 0, 0, {
      tint: options.tint,
      alpha: options.alphaBase,
      scale: options.scaleBase,
      rotation: Phaser.Math.FloatBetween(0, Math.PI * 2),
      blendMode: options.blendMode,
    });

    this.orbitActors.push({
      sprite,
      centerXRatio: options.centerXRatio,
      centerYRatio: options.centerYRatio,
      radiusX: options.radiusX,
      radiusY: options.radiusY,
      speed: options.speed,
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      alphaBase: options.alphaBase,
      alphaSwing: options.alphaSwing,
      alphaSpeed: options.alphaSpeed,
      scaleBase: options.scaleBase,
      scaleSwing: options.scaleSwing,
      scaleSpeed: options.scaleSpeed,
      rotationSpeed: options.rotationSpeed,
    });
  }

  private createCometPool(count: number): void {
    for (let index = 0; index < count; index++) {
      const trail = this.createSprite('bgfx-comet', -200, -200, {
        tint: 0xbfd5ff,
        alpha: 0,
        scale: this.isMobileProfile ? 0.6 : 0.78,
        blendMode: Phaser.BlendModes.ADD,
      });
      const head = this.createSprite('bgfx-glow-dot', -200, -200, {
        tint: 0xf8fbff,
        alpha: 0,
        scale: this.isMobileProfile ? 0.8 : 0.95,
        blendMode: Phaser.BlendModes.ADD,
      });
      const glow = this.createSprite('bgfx-soft-glow', -200, -200, {
        tint: 0x89a7ff,
        alpha: 0,
        scale: this.isMobileProfile ? 0.22 : 0.26,
        blendMode: Phaser.BlendModes.ADD,
      });

      trail.setVisible(false);
      head.setVisible(false);
      glow.setVisible(false);

      this.cometPool.push({
        trail,
        head,
        glow,
        busy: false,
      });
    }
  }

  private scheduleNextComet(): void {
    this.createTrackedDelay(
      Phaser.Math.Between(
        this.isMobileProfile ? 12000 : 9000,
        this.isMobileProfile ? 18000 : 14000
      ),
      () => {
        if (this.currentLevel?.world.id !== 'space') return;
        this.spawnPooledComet();
        this.scheduleNextComet();
      }
    );
  }

  private spawnPooledComet(): void {
    const entry = this.cometPool.find((candidate) => !candidate.busy);
    if (!entry) return;

    entry.busy = true;
    this.scene.tweens.killTweensOf(entry.trail);
    this.scene.tweens.killTweensOf(entry.head);
    this.scene.tweens.killTweensOf(entry.glow);

    const startY = Phaser.Math.FloatBetween(50, this.viewport.height * 0.42);
    const endY = startY + Phaser.Math.FloatBetween(90, 160);
    const startX = -120;
    const endX = this.viewport.width + 180;
    const rotation = Phaser.Math.FloatBetween(0.36, 0.56);

    [entry.trail, entry.head, entry.glow].forEach((sprite) => {
      sprite.setVisible(true);
      sprite.setAlpha(0);
    });

    entry.trail.setPosition(startX, startY);
    entry.trail.setRotation(rotation);
    entry.head.setPosition(startX, startY);
    entry.glow.setPosition(startX, startY);

    this.scene.tweens.add({
      targets: [entry.trail, entry.head, entry.glow],
      alpha: { from: 0, to: 0.24 },
      duration: 220,
      ease: 'Sine.easeOut',
      yoyo: true,
      hold: 440,
    });

    this.scene.tweens.add({
      targets: entry.trail,
      x: endX,
      y: endY,
      duration: this.isMobileProfile ? 2200 : 1800,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.recycleCometEntry(entry);
      },
    });

    this.scene.tweens.add({
      targets: entry.head,
      x: endX + 20,
      y: endY + 8,
      duration: this.isMobileProfile ? 2200 : 1800,
      ease: 'Quad.easeOut',
    });

    this.scene.tweens.add({
      targets: entry.glow,
      x: endX - 30,
      y: endY,
      duration: this.isMobileProfile ? 2200 : 1800,
      ease: 'Quad.easeOut',
    });
  }

  private recycleCometEntry(entry: CometPoolEntry): void {
    entry.busy = false;
    this.scene.tweens.killTweensOf(entry.trail);
    this.scene.tweens.killTweensOf(entry.head);
    this.scene.tweens.killTweensOf(entry.glow);
    [entry.trail, entry.head, entry.glow].forEach((sprite) => {
      sprite.setVisible(false);
      sprite.setAlpha(0);
      sprite.setPosition(-220, -220);
    });
  }

  private createTrackedDelay(delay: number, callback: () => void): Phaser.Time.TimerEvent {
    let timerRef: Phaser.Time.TimerEvent | null = null;
    timerRef = this.scene.time.delayedCall(delay, () => {
      if (timerRef) {
        this.timers.delete(timerRef);
      }
      callback();
    });

    this.timers.add(timerRef);
    return timerRef;
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
    const sprite = this.trackObject(this.scene.add.image(x, y, texture));
    if (options.tint !== undefined) sprite.setTint(options.tint);
    if (options.alpha !== undefined) sprite.setAlpha(options.alpha);
    if (options.scale !== undefined) sprite.setScale(options.scale);
    if (options.rotation !== undefined) sprite.setRotation(options.rotation);
    if (options.blendMode !== undefined) {
      sprite.setBlendMode(options.blendMode as Phaser.BlendModes);
    }

    this.layer.add(sprite);
    return sprite;
  }

  private trackObject<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.add(object);
    object.once('destroy', () => {
      this.objects.delete(object);
    });
    return object;
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
      0.38
    );

    const scale = actor.scaleBase + Math.sin(actor.phase * actor.scaleSpeed) * actor.scaleSwing;
    actor.sprite.setScale(Math.max(0.04, scale));
  }

  private updateSignatureActor(actor: SignatureActor, dt: number): void {
    if (!actor.sprite.active) return;

    actor.phase += dt;
    actor.sprite.x = this.viewport.width * actor.xRatio + Math.sin(actor.phase * actor.driftSpeed) * actor.driftX;
    actor.sprite.y = this.viewport.height * actor.yRatio + Math.cos(actor.phase * actor.driftSpeed * 0.92) * actor.driftY;
    actor.sprite.alpha = Phaser.Math.Clamp(
      actor.alphaBase + Math.sin(actor.phase * actor.alphaSpeed) * actor.alphaSwing,
      0,
      0.38
    );
    actor.sprite.rotation = actor.rotationBase + Math.sin(actor.phase * actor.rotationSpeed) * actor.rotationSwing;

    const scale = actor.scaleBase + Math.sin(actor.phase * actor.scaleSpeed) * actor.scaleSwing;
    actor.sprite.setScale(Math.max(0.88, scale));
  }

  private updateOrbitActor(actor: OrbitActor, dt: number): void {
    if (!actor.sprite.active) return;

    actor.phase += actor.speed * dt;
    const radiusX = this.resolveSize(actor.radiusX);
    const radiusY = this.resolveSize(actor.radiusY);
    const centerX = this.viewport.width * actor.centerXRatio;
    const centerY = this.viewport.height * actor.centerYRatio;

    actor.sprite.x = centerX + Math.cos(actor.phase) * radiusX;
    actor.sprite.y = centerY + Math.sin(actor.phase * 1.08) * radiusY;
    actor.sprite.rotation += actor.rotationSpeed * dt;
    actor.sprite.alpha = Phaser.Math.Clamp(
      actor.alphaBase + Math.sin(actor.phase * actor.alphaSpeed) * actor.alphaSwing,
      0,
      0.28
    );

    const scale = actor.scaleBase + Math.sin(actor.phase * actor.scaleSpeed) * actor.scaleSwing;
    actor.sprite.setScale(Math.max(0.08, scale));
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
