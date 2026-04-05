import Phaser from 'phaser';
import { WorldId } from '../../utils/LevelSystem';
import {
  AmbientActor,
  AmbientSpriteOptions,
  FXViewport,
  OrbitActorOptions,
  SignatureLayerOptions,
  StaticBackdropOptions,
} from './types';

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

export interface BackgroundFXWorldBuilderContext {
  readonly viewport: FXViewport;
  readonly isMobileProfile: boolean;
  pickCount(desktopCount: number, mobileCount: number): number;
  addAmbientSprite(texture: string, options: AmbientSpriteOptions): AmbientActor;
  addSignatureLayer(texture: string, options: SignatureLayerOptions): void;
  addOrbitActor(texture: string, options: OrbitActorOptions): void;
  addStaticBackdrop(texture: string, options: StaticBackdropOptions): void;
  createCometPool(count: number): void;
  scheduleNextComet(): void;
}

export function buildWorldFX(
  worldId: WorldId,
  context: BackgroundFXWorldBuilderContext
): void {
  switch (worldId) {
    case 'forest':
      buildForest(context);
      return;
    case 'ocean':
      buildOcean(context);
      return;
    case 'space':
      buildSpace(context);
      return;
    case 'castle':
      buildCastle(context);
      return;
    case 'magic':
      buildMagic(context);
      return;
    case 'ice':
      buildIce(context);
      return;
    case 'desert':
      buildDesert(context);
      return;
    default:
      buildFallbackWorld(worldId, context);
  }
}

function buildFallbackWorld(
  worldId: WorldId,
  context: BackgroundFXWorldBuilderContext
): void {
  const profile = FALLBACK_WORLD_PROFILES[worldId];
  if (!profile) return;

  context.addSignatureLayer(profile.accentTexture, {
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

  context.addSignatureLayer('bgfx-soft-glow', {
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

  context.addSignatureLayer('bgfx-soft-glow', {
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

  const sparkleCount = context.pickCount(5, 3);
  const dustCount = context.pickCount(4, 2);

  for (let index = 0; index < sparkleCount; index++) {
    context.addAmbientSprite('bgfx-sparkle', {
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
    context.addAmbientSprite('bgfx-dust', {
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

function buildForest(context: BackgroundFXWorldBuilderContext): void {
  context.addStaticBackdrop('world-forest-backdrop', {
    xRatio: 0.5,
    yRatio: 0.48,
    coverScale: context.isMobileProfile ? 1.12 : 1.08,
    alpha: 0.78,
  });

  context.addSignatureLayer('bgfx-light-shaft', {
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

  context.addSignatureLayer('bgfx-light-shaft', {
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

  context.addSignatureLayer('bgfx-soft-glow', {
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

  const leafCount = context.pickCount(7, 4);
  const fireflyCount = context.pickCount(5, 3);

  for (let index = 0; index < leafCount; index++) {
    context.addAmbientSprite('bgfx-leaf', {
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
    context.addAmbientSprite('bgfx-sparkle', {
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

function buildOcean(context: BackgroundFXWorldBuilderContext): void {
  context.addSignatureLayer('bgfx-ocean-reef', {
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
  context.addSignatureLayer('bgfx-ocean-reef', {
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
  context.addSignatureLayer('bgfx-ocean-current', {
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
  context.addSignatureLayer('bgfx-caustic', {
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

  const bubbleCount = context.pickCount(4, 3);
  const shimmerCount = context.pickCount(2, 1);

  for (let index = 0; index < bubbleCount; index++) {
    const actor = context.addAmbientSprite('bgfx-bubble', {
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
    actor.baseY = Phaser.Math.FloatBetween(40, context.viewport.height + 20);
  }

  for (let index = 0; index < shimmerCount; index++) {
    context.addAmbientSprite('bgfx-glow-dot', {
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

function buildSpace(context: BackgroundFXWorldBuilderContext): void {
  context.addSignatureLayer('bgfx-space-planet', {
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
  context.addSignatureLayer('bgfx-nebula', {
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
  context.addSignatureLayer('bgfx-nebula', {
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

  const farStars = context.pickCount(12, 8);
  const nearStars = context.pickCount(6, 4);

  for (let index = 0; index < farStars; index++) {
    context.addAmbientSprite('bgfx-glow-dot', {
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
    context.addAmbientSprite('bgfx-sparkle', {
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

  context.createCometPool(1);
  context.scheduleNextComet();
}

function buildCastle(context: BackgroundFXWorldBuilderContext): void {
  context.addSignatureLayer('bgfx-castle-silhouette', {
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
  context.addSignatureLayer('bgfx-castle-silhouette', {
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
  context.addSignatureLayer('bgfx-arch-glow', {
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
  context.addSignatureLayer('bgfx-soft-glow', {
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

  const dustCount = context.pickCount(7, 4);
  const emberCount = context.pickCount(2, 1);

  for (let index = 0; index < dustCount; index++) {
    context.addAmbientSprite('bgfx-dust', {
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
    const actor = context.addAmbientSprite('bgfx-glow-dot', {
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
    actor.baseX = context.viewport.width * edgeBias;
  }
}

function buildMagic(context: BackgroundFXWorldBuilderContext): void {
  context.addSignatureLayer('bgfx-magic-veil', {
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
  context.addSignatureLayer('bgfx-magic-veil', {
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
  context.addSignatureLayer('bgfx-rune-halo', {
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

  if (!context.isMobileProfile) {
    context.addOrbitActor('bgfx-glow-dot', {
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

  const runeCount = context.pickCount(2, 1);
  const sparkleCount = context.pickCount(4, 3);

  for (let index = 0; index < runeCount; index++) {
    context.addAmbientSprite('bgfx-rune', {
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
    context.addAmbientSprite('bgfx-sparkle', {
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

function buildIce(context: BackgroundFXWorldBuilderContext): void {
  context.addSignatureLayer('bgfx-ice-crystals', {
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
  context.addSignatureLayer('bgfx-ice-crystals', {
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
  context.addSignatureLayer('bgfx-aurora', {
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
  context.addSignatureLayer('bgfx-glint-band', {
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

  const snowCount = context.pickCount(6, 4);
  const glimmerCount = context.pickCount(2, 1);

  for (let index = 0; index < snowCount; index++) {
    const actor = context.addAmbientSprite('bgfx-snowflake', {
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
    actor.baseY = Phaser.Math.FloatBetween(-20, context.viewport.height);
  }

  for (let index = 0; index < glimmerCount; index++) {
    context.addAmbientSprite('bgfx-glow-dot', {
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

function buildDesert(context: BackgroundFXWorldBuilderContext): void {
  context.addSignatureLayer('bgfx-sun-disc', {
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
  context.addSignatureLayer('bgfx-desert-dunes', {
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
  context.addSignatureLayer('bgfx-desert-dunes', {
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
  context.addSignatureLayer('bgfx-heat-haze', {
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

  const sandCount = context.pickCount(5, 3);
  const goldDustCount = context.pickCount(2, 1);

  for (let index = 0; index < sandCount; index++) {
    context.addAmbientSprite('bgfx-sand', {
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
    context.addAmbientSprite('bgfx-glow-dot', {
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
