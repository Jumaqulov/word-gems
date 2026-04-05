import { SCORING } from '../../consts';
import { ICONS } from '../../icons';
import { scheduleResponsiveLayout } from '../../utils/ResponsiveLayout';
import { applyWorldScene } from '../../utils/WorldSceneLoader';
import type { WorldId, WorldVisualTheme } from '../../utils/LevelSystem';

interface LevelCompleteResult {
  total: number;
  gemsEarned: number;
  stars: number;
}

export class GamePresentationController {
  hideResolutionModals(): void {
    document.getElementById('level-complete-modal')?.style.setProperty('display', 'none');
    document.getElementById('time-up-modal')?.style.setProperty('display', 'none');
  }

  showLevelCompleteModal(
    level: number,
    result: LevelCompleteResult,
    summary: { foundWords: number; totalWords: number }
  ): void {
    const modal = document.getElementById('level-complete-modal');
    if (!modal) return;

    const levelNumEl = document.getElementById('complete-level-num');
    const wordsEl = document.getElementById('complete-words');
    const scoreEl = document.getElementById('complete-score');
    const gemsEl = document.getElementById('complete-gems');

    if (levelNumEl) levelNumEl.textContent = level.toString();
    if (wordsEl) wordsEl.textContent = `${summary.foundWords}/${summary.totalWords}`;
    if (scoreEl) scoreEl.textContent = result.total.toString();
    if (gemsEl) gemsEl.textContent = result.gemsEarned.toString();

    const starsContainer = document.getElementById('complete-stars');
    if (starsContainer) {
      starsContainer.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const star = document.createElement('span');
        star.className = i < result.stars ? 'star-icon star-filled' : 'star-icon star-empty';
        star.innerHTML = i < result.stars ? ICONS.starFilled : ICONS.starEmpty;
        starsContainer.appendChild(star);
      }
    }

    const perfectEl = document.getElementById('complete-perfect');
    const perfectValueEl = perfectEl?.querySelector('.complete-value');
    if (perfectValueEl) perfectValueEl.textContent = `+${SCORING.PERFECT_BONUS}`;
    if (perfectEl) perfectEl.style.display = result.stars === 3 ? 'flex' : 'none';

    modal.style.display = 'flex';
  }

  showTimeUpModal(level: number, foundWords: number, totalWords: number, score: number): void {
    const modal = document.getElementById('time-up-modal');
    const levelEl = document.getElementById('time-up-level-num');
    const wordsEl = document.getElementById('time-up-words');
    const scoreEl = document.getElementById('time-up-score');

    if (levelEl) levelEl.textContent = level.toString();
    if (wordsEl) wordsEl.textContent = `${foundWords}/${totalWords}`;
    if (scoreEl) scoreEl.textContent = score.toString();
    if (modal) modal.style.display = 'flex';
  }

  applyWorldTheme(worldId: WorldId, theme: WorldVisualTheme): void {
    const root = document.documentElement;
    const shell = document.getElementById('game-shell');
    const mainContent = document.getElementById('main-content');
    const gameContainer = document.getElementById('game-container');
    const gameInfoBar = document.getElementById('game-info-bar');
    const timerContainer = document.getElementById('timer-container');
    const targets = [root, shell].filter((target): target is HTMLElement => Boolean(target));

    if (shell) shell.setAttribute('data-world', worldId);
    if (mainContent) mainContent.setAttribute('data-world', worldId);
    if (gameInfoBar) gameInfoBar.setAttribute('data-world', worldId);
    if (timerContainer) timerContainer.setAttribute('data-world', worldId);
    if (gameContainer) gameContainer.removeAttribute('data-world');

    targets.forEach((target) => {
      target.style.setProperty('--world-primary', theme.primary);
      target.style.setProperty('--world-secondary', theme.secondary);
      target.style.setProperty('--world-accent', theme.accent);
      target.style.setProperty('--world-bg-top', theme.backgroundTop);
      target.style.setProperty('--world-bg-mid', theme.backgroundMid);
      target.style.setProperty('--world-bg-bottom', theme.backgroundBottom);
      target.style.setProperty('--world-glow', theme.glow);
      target.style.setProperty('--world-overlay-primary', theme.overlayPrimary);
      target.style.setProperty('--world-overlay-secondary', theme.overlaySecondary);
    });

    applyWorldScene(worldId);
  }

  updateWorldStatus(worldName: string, status: string): void {
    const worldNameEl = document.getElementById('zone-name');
    const worldStatusEl = document.getElementById('world-status');

    if (worldNameEl) worldNameEl.textContent = worldName;
    if (worldStatusEl) worldStatusEl.textContent = status;
    scheduleResponsiveLayout();
  }
}
