const MOBILE_BREAKPOINT = 768;
const MIN_BOARD_SIZE = 228;
const MAX_BOARD_SIZE = 430;
const DEFAULT_WORD_RACK_HEIGHT = 44;
const EXTRA_VERTICAL_BUFFER = 10;

let layoutRaf = 0;
let isInitialized = false;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getViewportSize(): { width: number; height: number } {
  const viewport = window.visualViewport;
  return {
    width: Math.round(viewport?.width ?? window.innerWidth),
    height: Math.round(viewport?.height ?? window.innerHeight),
  };
}

function readRootLength(variableName: string): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function measureHeight(elementId: string): number {
  const element = document.getElementById(elementId);
  if (!element) return 0;

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return 0;

  return Math.ceil(element.getBoundingClientRect().height);
}

function getMobileSideGutter(width: number): number {
  if (width <= 360) return 10;
  if (width >= 410) return 16;
  return 12;
}

function getWordRackHeight(width: number, height: number): number {
  if (width <= 380 || height <= 740) return 42;
  if (height >= 860) return 52;
  return 46;
}

export function applyResponsiveLayout(): void {
  const root = document.documentElement;
  const { width, height } = getViewportSize();
  const isMobile = width <= MOBILE_BREAKPOINT;
  const isNarrowPhone = isMobile && width <= 380;
  const isShortPhone = isMobile && height <= 740;
  const isTallPhone = isMobile && height >= 860;

  root.style.setProperty('--app-width', `${width}px`);
  root.style.setProperty('--app-height', `${height}px`);
  root.classList.toggle('is-mobile-layout', isMobile);
  root.classList.toggle('is-mobile-narrow', isNarrowPhone);
  root.classList.toggle('is-mobile-short', isShortPhone);
  root.classList.toggle('is-mobile-tall', isTallPhone);

  if (!isMobile) {
    root.style.setProperty('--mobile-side-gutter', '20px');
    root.style.setProperty('--mobile-word-rack-max-height', '0px');
    root.style.setProperty('--mobile-board-size', '700px');
    return;
  }

  const safeTop = readRootLength('--safe-top');
  const safeRight = readRootLength('--safe-right');
  const safeBottom = readRootLength('--safe-bottom');
  const safeLeft = readRootLength('--safe-left');
  const sideGutter = getMobileSideGutter(width);

  root.style.setProperty('--mobile-side-gutter', `${sideGutter}px`);
  root.style.setProperty('--mobile-word-rack-max-height', `${getWordRackHeight(width, height)}px`);

  const topHudHeight = measureHeight('top-hud');
  const wordRackHeight = Math.max(measureHeight('mobile-word-rack'), DEFAULT_WORD_RACK_HEIGHT);
  const infoBarHeight = measureHeight('game-info-bar');
  const bottomBarHeight = measureHeight('bottom-bar');

  const availableWidth = width - safeLeft - safeRight - sideGutter * 2;
  const availableHeight = height
    - safeTop
    - safeBottom
    - topHudHeight
    - wordRackHeight
    - infoBarHeight
    - bottomBarHeight
    - EXTRA_VERTICAL_BUFFER;

  const boardSize = clamp(
    Math.floor(Math.min(availableWidth, availableHeight)),
    MIN_BOARD_SIZE,
    Math.min(MAX_BOARD_SIZE, Math.floor(availableWidth))
  );

  root.style.setProperty('--mobile-board-size', `${boardSize}px`);
}

export function scheduleResponsiveLayout(): void {
  if (layoutRaf) cancelAnimationFrame(layoutRaf);
  layoutRaf = window.requestAnimationFrame(() => {
    layoutRaf = 0;
    applyResponsiveLayout();
  });
}

export function initResponsiveLayout(): void {
  if (isInitialized) return;
  isInitialized = true;

  applyResponsiveLayout();

  const refresh = () => scheduleResponsiveLayout();
  window.addEventListener('resize', refresh);
  window.visualViewport?.addEventListener('resize', refresh);
  window.visualViewport?.addEventListener('scroll', refresh);

  document.fonts?.ready.then(() => scheduleResponsiveLayout()).catch(() => {});
}
