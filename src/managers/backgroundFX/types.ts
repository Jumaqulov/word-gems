import Phaser from 'phaser';

export interface FXViewport {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export type SizeValue = number | ((viewport: FXViewport) => number);
export type BlendMode = Phaser.BlendModes | string;

export interface AmbientActor {
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

export interface SignatureActor {
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

export interface StaticBackdropActor {
  sprite: Phaser.GameObjects.Image;
  xRatio: number;
  yRatio: number;
  coverScale: number;
}

export interface OrbitActor {
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

export interface CometPoolEntry {
  trail: Phaser.GameObjects.Image;
  head: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  busy: boolean;
}

export interface BackgroundFXDebugSummary {
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

export interface AmbientSpriteOptions {
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

export interface SignatureLayerOptions {
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

export interface OrbitActorOptions {
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

export interface StaticBackdropOptions {
  xRatio: number;
  yRatio: number;
  coverScale?: number;
  alpha?: number;
  tint?: number;
  blendMode?: BlendMode;
}

export const MOBILE_PROFILE_BREAKPOINT = 768;
