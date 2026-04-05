import Phaser from 'phaser';
import { LevelConfig, WorldId } from '../utils/LevelSystem';

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

interface StaticBackdropActor {
  sprite: Phaser.GameObjects.Image;
  xRatio: number;
  yRatio: number;
  coverScale: number;
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
  staticBackdrops: number;
  ambientActors: number;
  signatureActors: number;
  orbitActors: number;
  timers: number;
  pooledComets: number;
  trackedObjects: number;
}

const MOBILE_PROFILE_BREAKPOINT = 768;

interface FallbackWorldProfile {
  primaryGlow: number;
  secondaryGlow: number;
  ambientColors: number[];
  accentTexture: 'bgfx-soft-glow' | 'bgfx-rune-halo' | 'bgfx-glint-band';
}

const FALLBACK_WORLD_PROFILES: Record<WorldId, FallbackWorldProfile | null> = {
  forest: null,
  ocean: null,
  space: null,
  castle: null,
  magic: null,
  ice: null,
  desert: null,
  volcano: {
    primaryGlow: 0xff7b52,
    secondaryGlow: 0xffc16a,
    ambientColors: [0xff8a5c, 0xffc76d, 0xff6b4a],
    accentTexture: 'bgfx-soft-glow',
  },
  sky: {
    primaryGlow: 0x96ddff,
    secondaryGlow: 0xf5fbff,
    ambientColors: [0xdaf4ff, 0xa8dcff, 0xf9fdff],
    accentTexture: 'bgfx-glint-band',
  },
  crystal: {
    primaryGlow: 0xb0a0ff,
    secondaryGlow: 0xe4d9ff,
    ambientColors: [0xdfd4ff, 0xbfc9ff, 0xf3efff],
    accentTexture: 'bgfx-rune-halo',
  },
  shadow: {
    primaryGlow: 0x7c68bb,
    secondaryGlow: 0xc5bdf4,
    ambientColors: [0x9e8edf, 0x7868b6, 0xd9d1ff],
    accentTexture: 'bgfx-rune-halo',
  },
  clockwork: {
    primaryGlow: 0xd2a15e,
    secondaryGlow: 0xf1d5a8,
    ambientColors: [0xe0b872, 0xc28b4b, 0xf0dab0],
    accentTexture: 'bgfx-glint-band',
  },
};

export class BackgroundFXManager {
  private readonly scene: Phaser.Scene;
  private readonly layer: Phaser.GameObjects.Container;

  private currentLevel: LevelConfig | null = null;
  private viewport: FXViewport;
  private isMobileProfile = false;
  private ambientActors: AmbientActor[] = [];
  private signatureActors: SignatureActor[] = [];
  private staticBackdropActors: StaticBackdropActor[] = [];
  private orbitActors: OrbitActor[] = [];
  private cometPool: CometPoolEntry[] = [];
  private timers = new Set<Phaser.Time.TimerEvent>();
  private objects = new Set<Phaser.GameObjects.GameObject>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.layer = scene.add.container(0, 0);
    this.layer.setDepth(-20);
    this.viewport = this.readViewport();
    this.isMobileProfile = this.readIsMobileProfile();
  }

  applyWorld(levelConfig: LevelConfig): void {
    this.clear();
    this.currentLevel = levelConfig;
    this.refreshViewport();
    this.buildCurrentWorld(levelConfig.world.id);
    this.layoutWorldLayers();
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
    this.staticBackdropActors = [];
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
    this.refreshViewport();

    if (this.currentLevel && previousMobileProfile !== this.isMobileProfile) {
      const level = this.currentLevel;
      this.applyWorld(level);
      return;
    }

    this.layoutWorldLayers();
  }

  private layoutWorldLayers(): void {
    this.staticBackdropActors.forEach((actor) => {
      this.layoutStaticBackdropActor(actor);
    });

    this.signatureActors.forEach((actor) => {
      actor.sprite.x = this.viewport.width * actor.xRatio;
      actor.sprite.y = this.viewport.height * actor.yRatio;
      actor.sprite.setDisplaySize(this.resolveSize(actor.width), this.resolveSize(actor.height));
    });

    this.orbitActors.forEach((actor) => {
      const radiusX = this.resolveSize(actor.radiusX);
      const radiusY = this.resolveSize(actor.radiusY);
      const centerX = this.viewport.width * actor.centerXRatio;
      const centerY = this.viewport.height * actor.centerYRatio;
      actor.sprite.x = centerX + Math.cos(actor.phase) * radiusX;
      actor.sprite.y = centerY + Math.sin(actor.phase * 1.08) * radiusY;
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
      staticBackdrops: this.staticBackdropActors.length,
      ambientActors: this.ambientActors.length,
      signatureActors: this.signatureActors.length,
      orbitActors: this.orbitActors.length,
      timers: this.timers.size,
      pooledComets: this.cometPool.length,
      trackedObjects: this.objects.size,
    };
  }

  private refreshViewport(): void {
    this.viewport = this.readViewport();
    this.isMobileProfile = this.readIsMobileProfile();
  }

  private readIsMobileProfile(): boolean {
    const viewport = window.visualViewport;
    const width = Math.round(viewport?.width ?? window.innerWidth);
    return width <= MOBILE_PROFILE_BREAKPOINT;
  }

  private buildCurrentWorld(worldId: WorldId): void {
    switch (worldId) {
      case 'forest':
        this.buildForest();
        return;
      case 'ocean':
        this.buildOcean();
        return;
      case 'space':
        this.buildSpace();
        return;
      case 'castle':
        this.buildCastle();
        return;
      case 'magic':
        this.buildMagic();
        return;
      case 'ice':
        this.buildIce();
        return;
      case 'desert':
        this.buildDesert();
        return;
      default:
        this.buildFallbackWorld(worldId);
    }
  }

  private buildFallbackWorld(worldId: WorldId): void {
    const profile = FALLBACK_WORLD_PROFILES[worldId];
    if (!profile) return;

    this.addSignatureLayer(profile.accentTexture, {
      xRatio: 0.5,
      yRatio: 0.24,
      width: (viewport) => viewport.width * 0.78,
      height: (viewport) => viewport.height * 0.2,
      tint: profile.secondaryGlow,
      alphaBase: 0.08,
      alphaSwing: 0.014,
      alphaSpeed: 0.16,
      scaleBase: 1,
      scaleSwing: 0.01,
      scaleSpeed: 0.12,
      driftX: 2.5,
      driftY: 1.2,
      driftSpeed: 0.08,
      rotationBase: -0.04,
      rotationSwing: 0.006,
      rotationSpeed: 0.08,
      blendMode: Phaser.BlendModes.ADD,
    });

    this.addSignatureLayer('bgfx-soft-glow', {
      xRatio: 0.18,
      yRatio: 0.68,
      width: (viewport) => viewport.width * 0.3,
      height: (viewport) => viewport.height * 0.18,
      tint: profile.primaryGlow,
      alphaBase: 0.08,
      alphaSwing: 0.012,
      alphaSpeed: 0.14,
      scaleBase: 1,
      scaleSwing: 0.008,
      scaleSpeed: 0.1,
      driftX: 1.6,
      driftY: 1,
      driftSpeed: 0.07,
      rotationBase: 0,
      rotationSwing: 0.004,
      rotationSpeed: 0.05,
      blendMode: Phaser.BlendModes.ADD,
    });

    this.addSignatureLayer('bgfx-soft-glow', {
      xRatio: 0.82,
      yRatio: 0.76,
      width: (viewport) => viewport.width * 0.26,
      height: (viewport) => viewport.height * 0.16,
      tint: profile.secondaryGlow,
      alphaBase: 0.06,
      alphaSwing: 0.01,
      alphaSpeed: 0.12,
      scaleBase: 1,
      scaleSwing: 0.008,
      scaleSpeed: 0.1,
      driftX: 1.2,
      driftY: 0.8,
      driftSpeed: 0.06,
      rotationBase: 0,
      rotationSwing: 0.004,
      rotationSpeed: 0.05,
      blendMode: Phaser.BlendModes.ADD,
    });

    const sparkleCount = this.pickCount(5, 3);
    const dustCount = this.pickCount(4, 2);

    for (let index = 0; index < sparkleCount; index++) {
      this.addAmbientSprite('bgfx-sparkle', {
        tint: Phaser.Utils.Array.GetRandom(profile.ambientColors),
        alphaBase: Phaser.Math.FloatBetween(0.05, 0.1),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.04),
        alphaSpeed: Phaser.Math.FloatBetween(0.5, 0.9),
        scaleBase: Phaser.Math.FloatBetween(0.16, 0.3),
        scaleSwing: 0.03,
        scaleSpeed: Phaser.Math.FloatBetween(0.4, 0.8),
        velocityX: Phaser.Math.FloatBetween(-2.5, 2.5),
        velocityY: Phaser.Math.FloatBetween(-1.5, 1.5),
        bobX: Phaser.Math.FloatBetween(2, 6),
        bobY: Phaser.Math.FloatBetween(2, 6),
        bobSpeed: Phaser.Math.FloatBetween(0.25, 0.55),
        rotationSpeed: Phaser.Math.FloatBetween(-0.08, 0.08),
        wrapPadding: 18,
        blendMode: Phaser.BlendModes.ADD,
      });
    }

    for (let index = 0; index < dustCount; index++) {
      this.addAmbientSprite('bgfx-dust', {
        tint: Phaser.Utils.Array.GetRandom(profile.ambientColors),
        alphaBase: Phaser.Math.FloatBetween(0.04, 0.08),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.04),
        alphaSpeed: Phaser.Math.FloatBetween(0.3, 0.6),
        scaleBase: Phaser.Math.FloatBetween(0.14, 0.26),
        scaleSwing: 0.02,
        scaleSpeed: Phaser.Math.FloatBetween(0.25, 0.5),
        velocityX: Phaser.Math.FloatBetween(-2, 2),
        velocityY: Phaser.Math.FloatBetween(-1, 1),
        bobX: Phaser.Math.FloatBetween(2, 8),
        bobY: Phaser.Math.FloatBetween(2, 6),
        bobSpeed: Phaser.Math.FloatBetween(0.2, 0.45),
        rotationSpeed: Phaser.Math.FloatBetween(-0.05, 0.05),
        wrapPadding: 18,
      });
    }
  }

  private buildForest(): void {
    this.addStaticBackdrop('world-forest-backdrop', {
      xRatio: 0.5,
      yRatio: 0.48,
      coverScale: this.isMobileProfile ? 1.12 : 1.08,
      alpha: 0.78,
    });

    this.addSignatureLayer('bgfx-light-shaft', {
      xRatio: 0.26,
      yRatio: 0.26,
      width: (viewport) => viewport.width * 0.22,
      height: (viewport) => viewport.height * 0.72,
      tint: 0xcaf6b2,
      alphaBase: 0.12,
      alphaSwing: 0.018,
      alphaSpeed: 0.16,
      scaleBase: 1,
      scaleSwing: 0.02,
      scaleSpeed: 0.12,
      driftX: 7,
      driftY: 5,
      driftSpeed: 0.08,
      rotationBase: -0.2,
      rotationSwing: 0.02,
      rotationSpeed: 0.1,
      blendMode: Phaser.BlendModes.ADD,
    });

    this.addSignatureLayer('bgfx-light-shaft', {
      xRatio: 0.78,
      yRatio: 0.28,
      width: (viewport) => viewport.width * 0.2,
      height: (viewport) => viewport.height * 0.68,
      tint: 0xe7ffd0,
      alphaBase: 0.09,
      alphaSwing: 0.014,
      alphaSpeed: 0.14,
      scaleBase: 1,
      scaleSwing: 0.016,
      scaleSpeed: 0.1,
      driftX: 5,
      driftY: 4,
      driftSpeed: 0.07,
      rotationBase: 0.12,
      rotationSwing: 0.016,
      rotationSpeed: 0.08,
      blendMode: Phaser.BlendModes.ADD,
    });

    this.addSignatureLayer('bgfx-soft-glow', {
      xRatio: 0.18,
      yRatio: 0.78,
      width: (viewport) => viewport.width * 0.28,
      height: (viewport) => viewport.height * 0.18,
      tint: 0x7edf7d,
      alphaBase: 0.08,
      alphaSwing: 0.014,
      alphaSpeed: 0.18,
      scaleBase: 1,
      scaleSwing: 0.01,
      scaleSpeed: 0.12,
      driftX: 2.6,
      driftY: 1.6,
      driftSpeed: 0.08,
      rotationBase: 0,
      rotationSwing: 0.004,
      rotationSpeed: 0.05,
      blendMode: Phaser.BlendModes.ADD,
    });

    const leafCount = this.pickCount(7, 4);
    const fireflyCount = this.pickCount(5, 3);

    for (let index = 0; index < leafCount; index++) {
      this.addAmbientSprite('bgfx-leaf', {
        tint: Phaser.Utils.Array.GetRandom([0x78c16d, 0x9ad77a, 0xc6eea8]),
        alphaBase: Phaser.Math.FloatBetween(0.06, 0.12),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.04),
        alphaSpeed: Phaser.Math.FloatBetween(0.25, 0.5),
        scaleBase: Phaser.Math.FloatBetween(0.18, 0.34),
        scaleSwing: 0.02,
        scaleSpeed: Phaser.Math.FloatBetween(0.2, 0.45),
        velocityX: Phaser.Math.FloatBetween(-4.5, -1.2),
        velocityY: Phaser.Math.FloatBetween(1.5, 4.5),
        bobX: Phaser.Math.FloatBetween(6, 12),
        bobY: Phaser.Math.FloatBetween(2, 5),
        bobSpeed: Phaser.Math.FloatBetween(0.22, 0.42),
        rotationSpeed: Phaser.Math.FloatBetween(-0.22, 0.22),
        wrapPadding: 28,
      });
    }

    for (let index = 0; index < fireflyCount; index++) {
      this.addAmbientSprite('bgfx-sparkle', {
        tint: Phaser.Utils.Array.GetRandom([0xd6ff9a, 0xbef683, 0xf4ffb8]),
        alphaBase: Phaser.Math.FloatBetween(0.08, 0.16),
        alphaSwing: Phaser.Math.FloatBetween(0.03, 0.06),
        alphaSpeed: Phaser.Math.FloatBetween(0.6, 1),
        scaleBase: Phaser.Math.FloatBetween(0.16, 0.28),
        scaleSwing: 0.03,
        scaleSpeed: Phaser.Math.FloatBetween(0.45, 0.8),
        velocityX: Phaser.Math.FloatBetween(-1.4, 1.4),
        velocityY: Phaser.Math.FloatBetween(-0.8, 0.8),
        bobX: Phaser.Math.FloatBetween(3, 8),
        bobY: Phaser.Math.FloatBetween(3, 8),
        bobSpeed: Phaser.Math.FloatBetween(0.35, 0.65),
        rotationSpeed: Phaser.Math.FloatBetween(-0.08, 0.08),
        wrapPadding: 18,
        blendMode: Phaser.BlendModes.ADD,
      });
    }
  }

  private buildOcean(): void {
    this.addSignatureLayer('bgfx-ocean-reef', {
      xRatio: 0.5,
      yRatio: 0.78,
      width: (viewport) => viewport.width * 1.06,
      height: (viewport) => viewport.height * 0.18,
      tint: 0x0b4360,
      alphaBase: 0.12,
      alphaSwing: 0.008,
      alphaSpeed: 0.12,
      scaleBase: 1,
      scaleSwing: 0.005,
      scaleSpeed: 0.1,
      driftX: 2,
      driftY: 1,
      driftSpeed: 0.06,
      rotationBase: 0,
      rotationSwing: 0.002,
      rotationSpeed: 0.05,
    });
    this.addSignatureLayer('bgfx-ocean-reef', {
      xRatio: 0.5,
      yRatio: 0.9,
      width: (viewport) => viewport.width * 1.12,
      height: (viewport) => viewport.height * 0.26,
      tint: 0x072f44,
      alphaBase: 0.24,
      alphaSwing: 0.01,
      alphaSpeed: 0.12,
      scaleBase: 1,
      scaleSwing: 0.006,
      scaleSpeed: 0.1,
      driftX: 2.6,
      driftY: 1,
      driftSpeed: 0.06,
      rotationBase: 0,
      rotationSwing: 0.002,
      rotationSpeed: 0.05,
    });
    this.addSignatureLayer('bgfx-ocean-current', {
      xRatio: 0.48,
      yRatio: 0.46,
      width: (viewport) => viewport.width * 0.9,
      height: (viewport) => viewport.height * 0.18,
      tint: 0x8feaf9,
      alphaBase: 0.075,
      alphaSwing: 0.014,
      alphaSpeed: 0.16,
      scaleBase: 1,
      scaleSwing: 0.008,
      scaleSpeed: 0.12,
      driftX: 4,
      driftY: 2,
      driftSpeed: 0.08,
      rotationBase: -0.06,
      rotationSwing: 0.005,
      rotationSpeed: 0.08,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-caustic', {
      xRatio: 0.5,
      yRatio: 0.24,
      width: (viewport) => viewport.width * 0.98,
      height: (viewport) => viewport.height * 0.28,
      tint: 0x7be6ff,
      alphaBase: 0.08,
      alphaSwing: 0.014,
      alphaSpeed: 0.18,
      scaleBase: 1,
      scaleSwing: 0.012,
      scaleSpeed: 0.14,
      driftX: 4,
      driftY: 2,
      driftSpeed: 0.08,
      rotationBase: -0.04,
      rotationSwing: 0.006,
      rotationSpeed: 0.1,
      blendMode: Phaser.BlendModes.ADD,
    });

    const bubbleCount = this.pickCount(4, 3);
    const shimmerCount = this.pickCount(2, 1);

    for (let index = 0; index < bubbleCount; index++) {
      const actor = this.addAmbientSprite('bgfx-bubble', {
        tint: 0x9ae9ff,
        alphaBase: Phaser.Math.FloatBetween(0.12, 0.2),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.04),
        alphaSpeed: Phaser.Math.FloatBetween(0.35, 0.6),
        scaleBase: Phaser.Math.FloatBetween(0.28, 0.56),
        scaleSwing: 0.03,
        scaleSpeed: Phaser.Math.FloatBetween(0.35, 0.55),
        velocityX: Phaser.Math.FloatBetween(-1.4, 1.4),
        velocityY: Phaser.Math.FloatBetween(-16, -9),
        bobX: Phaser.Math.FloatBetween(4, 10),
        bobY: Phaser.Math.FloatBetween(2, 6),
        bobSpeed: Phaser.Math.FloatBetween(0.35, 0.65),
        rotationSpeed: 0,
        wrapPadding: 28,
      });
      actor.baseY = Phaser.Math.FloatBetween(40, this.viewport.height + 20);
    }

    for (let index = 0; index < shimmerCount; index++) {
      this.addAmbientSprite('bgfx-glow-dot', {
        tint: Phaser.Utils.Array.GetRandom([0x84d9ff, 0xbeffff, 0x6be7e0]),
        alphaBase: Phaser.Math.FloatBetween(0.05, 0.1),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.04),
        alphaSpeed: Phaser.Math.FloatBetween(0.5, 0.9),
        scaleBase: Phaser.Math.FloatBetween(0.32, 0.58),
        scaleSwing: 0.03,
        scaleSpeed: Phaser.Math.FloatBetween(0.45, 0.7),
        velocityX: Phaser.Math.FloatBetween(-1.6, -0.4),
        velocityY: Phaser.Math.FloatBetween(-0.4, 1),
        bobX: Phaser.Math.FloatBetween(4, 10),
        bobY: Phaser.Math.FloatBetween(2, 6),
        bobSpeed: Phaser.Math.FloatBetween(0.3, 0.6),
        rotationSpeed: 0,
        wrapPadding: 18,
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
      alphaBase: 0.16,
      alphaSwing: 0.012,
      alphaSpeed: 0.12,
      scaleBase: 1,
      scaleSwing: 0.008,
      scaleSpeed: 0.1,
      driftX: 3,
      driftY: 2,
      driftSpeed: 0.06,
      rotationBase: 0.14,
      rotationSwing: 0.008,
      rotationSpeed: 0.05,
    });
    this.addSignatureLayer('bgfx-nebula', {
      xRatio: 0.24,
      yRatio: 0.24,
      width: (viewport) => viewport.width * 0.52,
      height: (viewport) => viewport.height * 0.34,
      tint: 0x7866ff,
      alphaBase: 0.09,
      alphaSwing: 0.014,
      alphaSpeed: 0.14,
      scaleBase: 1,
      scaleSwing: 0.012,
      scaleSpeed: 0.14,
      driftX: 3,
      driftY: 2,
      driftSpeed: 0.08,
      rotationBase: 0.08,
      rotationSwing: 0.008,
      rotationSpeed: 0.06,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-nebula', {
      xRatio: 0.78,
      yRatio: 0.72,
      width: (viewport) => viewport.width * 0.48,
      height: (viewport) => viewport.height * 0.32,
      tint: 0x6ea7ff,
      alphaBase: 0.065,
      alphaSwing: 0.012,
      alphaSpeed: 0.14,
      scaleBase: 1,
      scaleSwing: 0.01,
      scaleSpeed: 0.12,
      driftX: 2.5,
      driftY: 1.6,
      driftSpeed: 0.08,
      rotationBase: -0.06,
      rotationSwing: 0.006,
      rotationSpeed: 0.05,
      blendMode: Phaser.BlendModes.ADD,
    });

    const farStars = this.pickCount(12, 8);
    const nearStars = this.pickCount(6, 4);

    for (let index = 0; index < farStars; index++) {
      this.addAmbientSprite('bgfx-glow-dot', {
        tint: Phaser.Utils.Array.GetRandom([0xf3eaff, 0xbfd5ff, 0xcfc7ff]),
        alphaBase: Phaser.Math.FloatBetween(0.12, 0.2),
        alphaSwing: Phaser.Math.FloatBetween(0.03, 0.06),
        alphaSpeed: Phaser.Math.FloatBetween(0.7, 1.2),
        scaleBase: Phaser.Math.FloatBetween(0.12, 0.26),
        scaleSwing: 0.03,
        scaleSpeed: Phaser.Math.FloatBetween(0.6, 1),
        velocityX: Phaser.Math.FloatBetween(-2.2, -0.8),
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
        alphaBase: Phaser.Math.FloatBetween(0.06, 0.12),
        alphaSwing: Phaser.Math.FloatBetween(0.04, 0.08),
        alphaSpeed: Phaser.Math.FloatBetween(0.8, 1.4),
        scaleBase: Phaser.Math.FloatBetween(0.14, 0.3),
        scaleSwing: 0.04,
        scaleSpeed: Phaser.Math.FloatBetween(0.7, 1.1),
        velocityX: Phaser.Math.FloatBetween(-4, -1.5),
        velocityY: Phaser.Math.FloatBetween(-0.8, 0.8),
        bobX: Phaser.Math.FloatBetween(1, 5),
        bobY: Phaser.Math.FloatBetween(1, 4),
        bobSpeed: Phaser.Math.FloatBetween(0.3, 0.7),
        rotationSpeed: Phaser.Math.FloatBetween(-0.08, 0.08),
        wrapPadding: 24,
        blendMode: Phaser.BlendModes.ADD,
      });
    }

    this.createCometPool(1);
    this.scheduleNextComet();
  }

  private buildCastle(): void {
    this.addSignatureLayer('bgfx-castle-silhouette', {
      xRatio: 0.5,
      yRatio: 0.72,
      width: (viewport) => viewport.width * 1.02,
      height: (viewport) => viewport.height * 0.2,
      tint: 0x3a2214,
      alphaBase: 0.12,
      alphaSwing: 0.008,
      alphaSpeed: 0.12,
      scaleBase: 1,
      scaleSwing: 0.004,
      scaleSpeed: 0.08,
      driftX: 1.4,
      driftY: 0.8,
      driftSpeed: 0.06,
      rotationBase: 0,
      rotationSwing: 0.002,
      rotationSpeed: 0.04,
    });
    this.addSignatureLayer('bgfx-castle-silhouette', {
      xRatio: 0.5,
      yRatio: 0.88,
      width: (viewport) => viewport.width * 1.08,
      height: (viewport) => viewport.height * 0.3,
      tint: 0x190c08,
      alphaBase: 0.28,
      alphaSwing: 0.008,
      alphaSpeed: 0.1,
      scaleBase: 1,
      scaleSwing: 0.004,
      scaleSpeed: 0.08,
      driftX: 1.8,
      driftY: 0.8,
      driftSpeed: 0.06,
      rotationBase: 0,
      rotationSwing: 0.002,
      rotationSpeed: 0.04,
    });
    this.addSignatureLayer('bgfx-arch-glow', {
      xRatio: 0.07,
      yRatio: 0.3,
      width: (viewport) => viewport.width * 0.18,
      height: (viewport) => viewport.height * 0.58,
      tint: 0xf1ab59,
      alphaBase: 0.08,
      alphaSwing: 0.018,
      alphaSpeed: 0.4,
      scaleBase: 1,
      scaleSwing: 0.02,
      scaleSpeed: 0.2,
      driftX: 1.5,
      driftY: 2.5,
      driftSpeed: 0.14,
      rotationBase: -0.06,
      rotationSwing: 0.006,
      rotationSpeed: 0.1,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-soft-glow', {
      xRatio: 0.84,
      yRatio: 0.24,
      width: (viewport) => viewport.width * 0.18,
      height: (viewport) => viewport.height * 0.24,
      tint: 0xffd18b,
      alphaBase: 0.04,
      alphaSwing: 0.01,
      alphaSpeed: 0.16,
      scaleBase: 1,
      scaleSwing: 0.008,
      scaleSpeed: 0.1,
      driftX: 0.8,
      driftY: 0.8,
      driftSpeed: 0.08,
      rotationBase: 0,
      rotationSwing: 0,
      rotationSpeed: 0.06,
    });

    const dustCount = this.pickCount(7, 4);
    const emberCount = this.pickCount(2, 1);

    for (let index = 0; index < dustCount; index++) {
      this.addAmbientSprite('bgfx-dust', {
        tint: Phaser.Utils.Array.GetRandom([0xeed6b5, 0xcfae89, 0xb9926e]),
        alphaBase: Phaser.Math.FloatBetween(0.04, 0.08),
        alphaSwing: Phaser.Math.FloatBetween(0.015, 0.04),
        alphaSpeed: Phaser.Math.FloatBetween(0.3, 0.6),
        scaleBase: Phaser.Math.FloatBetween(0.14, 0.28),
        scaleSwing: 0.015,
        scaleSpeed: Phaser.Math.FloatBetween(0.25, 0.5),
        velocityX: Phaser.Math.FloatBetween(-2, 2),
        velocityY: Phaser.Math.FloatBetween(-3, 0.5),
        bobX: Phaser.Math.FloatBetween(2, 8),
        bobY: Phaser.Math.FloatBetween(2, 6),
        bobSpeed: Phaser.Math.FloatBetween(0.25, 0.5),
        rotationSpeed: Phaser.Math.FloatBetween(-0.08, 0.08),
        wrapPadding: 18,
      });
    }

    for (let index = 0; index < emberCount; index++) {
      const edgeBias = index % 2 === 0 ? 0.12 : 0.88;
      const actor = this.addAmbientSprite('bgfx-glow-dot', {
        tint: Phaser.Utils.Array.GetRandom([0xffb266, 0xf6d77a, 0xe36d4c]),
        alphaBase: Phaser.Math.FloatBetween(0.04, 0.07),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.04),
        alphaSpeed: Phaser.Math.FloatBetween(0.7, 1.1),
        scaleBase: Phaser.Math.FloatBetween(0.18, 0.3),
        scaleSwing: 0.03,
        scaleSpeed: Phaser.Math.FloatBetween(0.5, 0.9),
        velocityX: Phaser.Math.FloatBetween(-1, 1),
        velocityY: Phaser.Math.FloatBetween(-5, -2),
        bobX: Phaser.Math.FloatBetween(2, 6),
        bobY: Phaser.Math.FloatBetween(2, 6),
        bobSpeed: Phaser.Math.FloatBetween(0.3, 0.6),
        rotationSpeed: 0,
        wrapPadding: 16,
        blendMode: Phaser.BlendModes.ADD,
      });
      actor.baseX = this.viewport.width * edgeBias;
    }
  }

  private buildMagic(): void {
    this.addSignatureLayer('bgfx-magic-veil', {
      xRatio: 0.5,
      yRatio: 0.68,
      width: (viewport) => viewport.width * 0.84,
      height: (viewport) => viewport.height * 0.24,
      tint: 0x6e2e8f,
      alphaBase: 0.14,
      alphaSwing: 0.01,
      alphaSpeed: 0.1,
      scaleBase: 1,
      scaleSwing: 0.006,
      scaleSpeed: 0.08,
      driftX: 1.6,
      driftY: 1,
      driftSpeed: 0.06,
      rotationBase: 0,
      rotationSwing: 0.002,
      rotationSpeed: 0.04,
    });
    this.addSignatureLayer('bgfx-magic-veil', {
      xRatio: 0.5,
      yRatio: 0.5,
      width: (viewport) => viewport.width * 0.92,
      height: (viewport) => viewport.height * 0.34,
      tint: 0xb267ff,
      alphaBase: 0.09,
      alphaSwing: 0.012,
      alphaSpeed: 0.12,
      scaleBase: 1,
      scaleSwing: 0.008,
      scaleSpeed: 0.1,
      driftX: 2.5,
      driftY: 1.4,
      driftSpeed: 0.06,
      rotationBase: 0,
      rotationSwing: 0.003,
      rotationSpeed: 0.05,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-rune-halo', {
      xRatio: 0.5,
      yRatio: 0.5,
      width: (viewport) => Math.min(viewport.width, viewport.height) * 0.72,
      height: (viewport) => Math.min(viewport.width, viewport.height) * 0.72,
      tint: 0xd4c0ff,
      alphaBase: 0.08,
      alphaSwing: 0.018,
      alphaSpeed: 0.16,
      scaleBase: 1,
      scaleSwing: 0.012,
      scaleSpeed: 0.14,
      driftX: 2,
      driftY: 2,
      driftSpeed: 0.08,
      rotationBase: 0,
      rotationSwing: 0.02,
      rotationSpeed: 0.08,
      blendMode: Phaser.BlendModes.ADD,
    });

    if (!this.isMobileProfile) {
      this.addOrbitActor('bgfx-glow-dot', {
        centerXRatio: 0.5,
        centerYRatio: 0.5,
        radiusX: (viewport) => viewport.width * 0.12,
        radiusY: (viewport) => viewport.height * 0.08,
        speed: 0.18,
        tint: 0x92e9ff,
        alphaBase: 0.05,
        alphaSwing: 0.018,
        alphaSpeed: 0.5,
        scaleBase: 0.4,
        scaleSwing: 0.04,
        scaleSpeed: 0.5,
        rotationSpeed: 0.08,
        blendMode: Phaser.BlendModes.ADD,
      });
    }

    const runeCount = this.pickCount(2, 1);
    const sparkleCount = this.pickCount(4, 3);

    for (let index = 0; index < runeCount; index++) {
      this.addAmbientSprite('bgfx-rune', {
        tint: Phaser.Utils.Array.GetRandom([0xd8b7ff, 0x9ae9ff, 0xf3deff]),
        alphaBase: Phaser.Math.FloatBetween(0.04, 0.07),
        alphaSwing: Phaser.Math.FloatBetween(0.015, 0.03),
        alphaSpeed: Phaser.Math.FloatBetween(0.25, 0.5),
        scaleBase: Phaser.Math.FloatBetween(0.32, 0.52),
        scaleSwing: 0.03,
        scaleSpeed: Phaser.Math.FloatBetween(0.25, 0.45),
        velocityX: Phaser.Math.FloatBetween(-1.4, 1.4),
        velocityY: Phaser.Math.FloatBetween(-0.8, 0.8),
        bobX: Phaser.Math.FloatBetween(4, 8),
        bobY: Phaser.Math.FloatBetween(4, 8),
        bobSpeed: Phaser.Math.FloatBetween(0.2, 0.45),
        rotationSpeed: Phaser.Math.FloatBetween(-0.08, 0.08),
        wrapPadding: 20,
        blendMode: Phaser.BlendModes.ADD,
      });
    }

    for (let index = 0; index < sparkleCount; index++) {
      this.addAmbientSprite('bgfx-sparkle', {
        tint: Phaser.Utils.Array.GetRandom([0xefd8ff, 0x8ce5ff, 0xfdf4ff]),
        alphaBase: Phaser.Math.FloatBetween(0.05, 0.09),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.04),
        alphaSpeed: Phaser.Math.FloatBetween(0.6, 1),
        scaleBase: Phaser.Math.FloatBetween(0.18, 0.34),
        scaleSwing: 0.03,
        scaleSpeed: Phaser.Math.FloatBetween(0.5, 0.8),
        velocityX: Phaser.Math.FloatBetween(-1.2, 1.2),
        velocityY: Phaser.Math.FloatBetween(-1.8, 1.8),
        bobX: Phaser.Math.FloatBetween(3, 7),
        bobY: Phaser.Math.FloatBetween(3, 7),
        bobSpeed: Phaser.Math.FloatBetween(0.3, 0.6),
        rotationSpeed: Phaser.Math.FloatBetween(-0.08, 0.08),
        wrapPadding: 18,
        blendMode: Phaser.BlendModes.ADD,
      });
    }
  }

  private buildIce(): void {
    this.addSignatureLayer('bgfx-ice-crystals', {
      xRatio: 0.5,
      yRatio: 0.76,
      width: (viewport) => viewport.width * 1.02,
      height: (viewport) => viewport.height * 0.16,
      tint: 0x70bfdc,
      alphaBase: 0.12,
      alphaSwing: 0.008,
      alphaSpeed: 0.1,
      scaleBase: 1,
      scaleSwing: 0.004,
      scaleSpeed: 0.08,
      driftX: 1.4,
      driftY: 0.6,
      driftSpeed: 0.06,
      rotationBase: 0,
      rotationSwing: 0.002,
      rotationSpeed: 0.04,
    });
    this.addSignatureLayer('bgfx-ice-crystals', {
      xRatio: 0.5,
      yRatio: 0.9,
      width: (viewport) => viewport.width * 1.08,
      height: (viewport) => viewport.height * 0.24,
      tint: 0x93e4ff,
      alphaBase: 0.22,
      alphaSwing: 0.01,
      alphaSpeed: 0.1,
      scaleBase: 1,
      scaleSwing: 0.005,
      scaleSpeed: 0.08,
      driftX: 1.8,
      driftY: 0.8,
      driftSpeed: 0.06,
      rotationBase: 0,
      rotationSwing: 0.002,
      rotationSpeed: 0.04,
    });
    this.addSignatureLayer('bgfx-aurora', {
      xRatio: 0.54,
      yRatio: 0.16,
      width: (viewport) => viewport.width * 1.02,
      height: (viewport) => viewport.height * 0.2,
      tint: 0xd6ffff,
      alphaBase: 0.08,
      alphaSwing: 0.014,
      alphaSpeed: 0.14,
      scaleBase: 1,
      scaleSwing: 0.008,
      scaleSpeed: 0.1,
      driftX: 3,
      driftY: 1.5,
      driftSpeed: 0.06,
      rotationBase: -0.05,
      rotationSwing: 0.004,
      rotationSpeed: 0.05,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-glint-band', {
      xRatio: 0.52,
      yRatio: 0.22,
      width: (viewport) => viewport.width * 1.04,
      height: (viewport) => viewport.height * 0.18,
      tint: 0xdff7ff,
      alphaBase: 0.08,
      alphaSwing: 0.014,
      alphaSpeed: 0.16,
      scaleBase: 1,
      scaleSwing: 0.012,
      scaleSpeed: 0.12,
      driftX: 3,
      driftY: 1,
      driftSpeed: 0.08,
      rotationBase: -0.18,
      rotationSwing: 0.008,
      rotationSpeed: 0.08,
      blendMode: Phaser.BlendModes.ADD,
    });

    const snowCount = this.pickCount(6, 4);
    const glimmerCount = this.pickCount(2, 1);

    for (let index = 0; index < snowCount; index++) {
      const actor = this.addAmbientSprite('bgfx-snowflake', {
        tint: Phaser.Utils.Array.GetRandom([0xf2fbff, 0xccf0ff, 0xdffbff]),
        alphaBase: Phaser.Math.FloatBetween(0.08, 0.14),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.05),
        alphaSpeed: Phaser.Math.FloatBetween(0.35, 0.6),
        scaleBase: Phaser.Math.FloatBetween(0.18, 0.34),
        scaleSwing: 0.02,
        scaleSpeed: Phaser.Math.FloatBetween(0.3, 0.55),
        velocityX: Phaser.Math.FloatBetween(-6, -2),
        velocityY: Phaser.Math.FloatBetween(7, 13),
        bobX: Phaser.Math.FloatBetween(4, 9),
        bobY: Phaser.Math.FloatBetween(1, 4),
        bobSpeed: Phaser.Math.FloatBetween(0.3, 0.6),
        rotationSpeed: Phaser.Math.FloatBetween(-0.08, 0.08),
        wrapPadding: 18,
      });
      actor.baseY = Phaser.Math.FloatBetween(-20, this.viewport.height);
    }

    for (let index = 0; index < glimmerCount; index++) {
      this.addAmbientSprite('bgfx-glow-dot', {
        tint: Phaser.Utils.Array.GetRandom([0xb8f3ff, 0xeafbff, 0x9fe2ff]),
        alphaBase: Phaser.Math.FloatBetween(0.05, 0.08),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.04),
        alphaSpeed: Phaser.Math.FloatBetween(0.6, 1),
        scaleBase: Phaser.Math.FloatBetween(0.2, 0.34),
        scaleSwing: 0.03,
        scaleSpeed: Phaser.Math.FloatBetween(0.45, 0.8),
        velocityX: Phaser.Math.FloatBetween(-1, 1),
        velocityY: Phaser.Math.FloatBetween(-0.5, 0.5),
        bobX: Phaser.Math.FloatBetween(3, 6),
        bobY: Phaser.Math.FloatBetween(3, 6),
        bobSpeed: Phaser.Math.FloatBetween(0.25, 0.5),
        rotationSpeed: 0,
        wrapPadding: 16,
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
      alphaBase: 0.11,
      alphaSwing: 0.012,
      alphaSpeed: 0.12,
      scaleBase: 1,
      scaleSwing: 0.008,
      scaleSpeed: 0.1,
      driftX: 2,
      driftY: 1.5,
      driftSpeed: 0.06,
      rotationBase: 0,
      rotationSwing: 0.002,
      rotationSpeed: 0.04,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.addSignatureLayer('bgfx-desert-dunes', {
      xRatio: 0.5,
      yRatio: 0.78,
      width: (viewport) => viewport.width * 1.06,
      height: (viewport) => viewport.height * 0.18,
      tint: 0x955a20,
      alphaBase: 0.12,
      alphaSwing: 0.008,
      alphaSpeed: 0.1,
      scaleBase: 1,
      scaleSwing: 0.004,
      scaleSpeed: 0.08,
      driftX: 1.8,
      driftY: 0.7,
      driftSpeed: 0.06,
      rotationBase: 0,
      rotationSwing: 0.002,
      rotationSpeed: 0.04,
    });
    this.addSignatureLayer('bgfx-desert-dunes', {
      xRatio: 0.5,
      yRatio: 0.9,
      width: (viewport) => viewport.width * 1.12,
      height: (viewport) => viewport.height * 0.26,
      tint: 0x6a3910,
      alphaBase: 0.24,
      alphaSwing: 0.01,
      alphaSpeed: 0.1,
      scaleBase: 1,
      scaleSwing: 0.005,
      scaleSpeed: 0.08,
      driftX: 2.4,
      driftY: 0.8,
      driftSpeed: 0.06,
      rotationBase: 0,
      rotationSwing: 0.002,
      rotationSpeed: 0.04,
    });
    this.addSignatureLayer('bgfx-heat-haze', {
      xRatio: 0.54,
      yRatio: 0.36,
      width: (viewport) => viewport.width * 1.08,
      height: (viewport) => viewport.height * 0.22,
      tint: 0xf6d89a,
      alphaBase: 0.075,
      alphaSwing: 0.012,
      alphaSpeed: 0.16,
      scaleBase: 1,
      scaleSwing: 0.01,
      scaleSpeed: 0.12,
      driftX: 4,
      driftY: 1.2,
      driftSpeed: 0.08,
      rotationBase: -0.04,
      rotationSwing: 0.004,
      rotationSpeed: 0.08,
      blendMode: Phaser.BlendModes.ADD,
    });

    const sandCount = this.pickCount(5, 3);
    const goldDustCount = this.pickCount(2, 1);

    for (let index = 0; index < sandCount; index++) {
      this.addAmbientSprite('bgfx-sand', {
        tint: Phaser.Utils.Array.GetRandom([0xd9b06e, 0xe7c885, 0xc99153]),
        alphaBase: Phaser.Math.FloatBetween(0.05, 0.09),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.04),
        alphaSpeed: Phaser.Math.FloatBetween(0.45, 0.8),
        scaleBase: Phaser.Math.FloatBetween(0.12, 0.24),
        scaleSwing: 0.02,
        scaleSpeed: Phaser.Math.FloatBetween(0.3, 0.5),
        velocityX: Phaser.Math.FloatBetween(6, 11),
        velocityY: Phaser.Math.FloatBetween(1, 4),
        bobX: Phaser.Math.FloatBetween(3, 8),
        bobY: Phaser.Math.FloatBetween(1, 4),
        bobSpeed: Phaser.Math.FloatBetween(0.25, 0.45),
        rotationSpeed: Phaser.Math.FloatBetween(-0.08, 0.08),
        wrapPadding: 20,
      });
    }

    for (let index = 0; index < goldDustCount; index++) {
      this.addAmbientSprite('bgfx-glow-dot', {
        tint: Phaser.Utils.Array.GetRandom([0xf7d977, 0xffe9a6, 0xf4bf57]),
        alphaBase: Phaser.Math.FloatBetween(0.04, 0.08),
        alphaSwing: Phaser.Math.FloatBetween(0.02, 0.04),
        alphaSpeed: Phaser.Math.FloatBetween(0.6, 1),
        scaleBase: Phaser.Math.FloatBetween(0.18, 0.32),
        scaleSwing: 0.03,
        scaleSpeed: Phaser.Math.FloatBetween(0.45, 0.8),
        velocityX: Phaser.Math.FloatBetween(2, 6),
        velocityY: Phaser.Math.FloatBetween(-1, 1),
        bobX: Phaser.Math.FloatBetween(4, 8),
        bobY: Phaser.Math.FloatBetween(2, 5),
        bobSpeed: Phaser.Math.FloatBetween(0.25, 0.5),
        rotationSpeed: 0,
        wrapPadding: 16,
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

  private addStaticBackdrop(
    texture: string,
    options: {
      xRatio: number;
      yRatio: number;
      coverScale?: number;
      alpha?: number;
      tint?: number;
      blendMode?: BlendMode;
    }
  ): void {
    const sprite = this.createSprite(texture, 0, 0, {
      alpha: options.alpha,
      tint: options.tint,
      blendMode: options.blendMode,
    });

    const actor: StaticBackdropActor = {
      sprite,
      xRatio: options.xRatio,
      yRatio: options.yRatio,
      coverScale: options.coverScale ?? 1,
    };

    this.staticBackdropActors.push(actor);
    this.layoutStaticBackdropActor(actor);
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

  private layoutStaticBackdropActor(actor: StaticBackdropActor): void {
    const source = actor.sprite.texture.getSourceImage() as { width?: number; height?: number };
    const sourceWidth = source.width ?? this.viewport.width;
    const sourceHeight = source.height ?? this.viewport.height;
    const sourceAspect = sourceWidth / Math.max(1, sourceHeight);
    const viewportAspect = this.viewport.width / Math.max(1, this.viewport.height);

    let width: number;
    let height: number;

    if (sourceAspect > viewportAspect) {
      height = this.viewport.height * actor.coverScale;
      width = height * sourceAspect;
    } else {
      width = this.viewport.width * actor.coverScale;
      height = width / sourceAspect;
    }

    actor.sprite.setPosition(this.viewport.width * actor.xRatio, this.viewport.height * actor.yRatio);
    actor.sprite.setDisplaySize(width, height);
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
