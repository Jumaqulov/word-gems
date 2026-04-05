import Phaser from 'phaser';
import { LevelConfig, WorldId } from '../utils/LevelSystem';
import { buildWorldFX } from './backgroundFX/worldBuilders';
import {
  AmbientActor,
  AmbientSpriteOptions,
  BackgroundFXDebugSummary,
  BlendMode,
  CometPoolEntry,
  FXViewport,
  MOBILE_PROFILE_BREAKPOINT,
  OrbitActor,
  OrbitActorOptions,
  SignatureActor,
  SignatureLayerOptions,
  SizeValue,
  StaticBackdropActor,
  StaticBackdropOptions,
} from './backgroundFX/types';

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
    buildWorldFX(worldId, this.createWorldBuilderContext());
  }

  private createWorldBuilderContext() {
    return {
      viewport: this.viewport,
      isMobileProfile: this.isMobileProfile,
      pickCount: (desktopCount: number, mobileCount: number) =>
        this.pickCount(desktopCount, mobileCount),
      addAmbientSprite: (texture: string, options: AmbientSpriteOptions) =>
        this.addAmbientSprite(texture, options),
      addSignatureLayer: (texture: string, options: SignatureLayerOptions) =>
        this.addSignatureLayer(texture, options),
      addOrbitActor: (texture: string, options: OrbitActorOptions) =>
        this.addOrbitActor(texture, options),
      addStaticBackdrop: (texture: string, options: StaticBackdropOptions) =>
        this.addStaticBackdrop(texture, options),
      createCometPool: (count: number) => this.createCometPool(count),
      scheduleNextComet: () => this.scheduleNextComet(),
    };
  }

  private addAmbientSprite(
    texture: string,
    options: AmbientSpriteOptions
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
    options: SignatureLayerOptions
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
    options: OrbitActorOptions
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
    options: StaticBackdropOptions
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
