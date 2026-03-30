import { getWorldConfig, WORLDS, WorldId } from './LevelSystem';

const WORLD_SCENE_IMAGES: Record<WorldId, string> = {
  forest: '/assets/forest-theme.png',
  ocean: '/assets/ocean-theme.png',
  space: '/assets/space-theme.png',
  castle: '/assets/castle-theme.png',
  magic: '/assets/magic-theme.png',
  ice: '/assets/ice-theme.png',
  desert: '/assets/desert-theme.png',
  volcano: '/assets/volcano-theme.png',
  sky: '/assets/sky-theme.png',
  crystal: '/assets/crystalcave-theme.png',
  shadow: '/assets/shadow-theme.png',
  clockwork: '/assets/clockwork-theme.png',
};

const sceneLoadPromises = new Map<WorldId, Promise<void>>();
const sceneLoaded = new Set<WorldId>();
let warmedWorldId: WorldId | null = null;

function getMainContent(): HTMLElement | null {
  return document.getElementById('main-content');
}

function setSceneBackground(worldId: WorldId): void {
  const mainContent = getMainContent();
  const sceneImage = WORLD_SCENE_IMAGES[worldId];
  if (!mainContent || !sceneImage) return;

  mainContent.style.setProperty('--world-scene-image', `url("${sceneImage}")`);
  mainContent.setAttribute('data-scene-ready', 'true');
}

export function preloadWorldScene(worldId: WorldId): Promise<void> {
  const existingPromise = sceneLoadPromises.get(worldId);
  if (existingPromise) return existingPromise;

  const sceneImage = WORLD_SCENE_IMAGES[worldId];
  if (!sceneImage) return Promise.resolve();

  const promise = new Promise<void>((resolve) => {
    const image = new Image();
    let settled = false;
    image.decoding = 'async';
    try {
      (
        image as HTMLImageElement & {
          fetchPriority?: 'high' | 'low' | 'auto';
        }
      ).fetchPriority = sceneLoaded.size === 0 ? 'high' : 'low';
    } catch {
      // ignore unsupported fetchPriority
    }

    const finalize = () => {
      if (settled) return;
      settled = true;
      sceneLoaded.add(worldId);
      resolve();
    };

    image.onload = () => {
      if (typeof image.decode === 'function') {
        image.decode().catch(() => undefined).finally(finalize);
        return;
      }

      finalize();
    };

    image.onerror = finalize;
    image.src = sceneImage;

    if (image.complete && image.naturalWidth > 0) {
      finalize();
    }
  });

  sceneLoadPromises.set(worldId, promise);
  return promise;
}

function getNeighborWorldIds(worldId: WorldId): WorldId[] {
  const worldIndex = WORLDS.findIndex((world) => world.id === worldId);
  if (worldIndex === -1) return [];

  return [WORLDS[worldIndex + 1]?.id, WORLDS[worldIndex - 1]?.id].filter(
    (candidate): candidate is WorldId => Boolean(candidate)
  );
}

function scheduleNeighborWarmup(worldId: WorldId): void {
  if (warmedWorldId === worldId) return;
  warmedWorldId = worldId;

  const warmup = () => {
    getNeighborWorldIds(worldId).forEach((neighborWorldId) => {
      void preloadWorldScene(neighborWorldId);
    });
  };

  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
      .requestIdleCallback(warmup, { timeout: 900 });
    return;
  }

  setTimeout(warmup, 220);
}

export async function prepareInitialWorldScene(level: number): Promise<void> {
  const worldId = getWorldConfig(level).id;
  await preloadWorldScene(worldId);
  setSceneBackground(worldId);
  scheduleNeighborWarmup(worldId);
}

export function applyWorldScene(worldId: WorldId): void {
  if (sceneLoaded.has(worldId)) {
    setSceneBackground(worldId);
  } else {
    void preloadWorldScene(worldId).then(() => {
      const mainContent = getMainContent();
      if (mainContent?.getAttribute('data-world') === worldId) {
        setSceneBackground(worldId);
      }
    });
  }

  scheduleNeighborWarmup(worldId);
}
