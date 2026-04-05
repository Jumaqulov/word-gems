import { SoundManager } from '../../managers/SoundManager';
import type { SaveData } from '../../managers/CrazyGamesManager';
import { COLORS, POWERUP_COSTS } from '../../consts';
import { iconHTML, ICONS, setIcon } from '../../icons';
import { scheduleResponsiveLayout } from '../../utils/ResponsiveLayout';

export interface WordStatusTag {
  label: string;
  className: string;
}

export interface WordListItemViewModel {
  word: string;
  isFound: boolean;
  colorIndex: number | null;
  statusTag: WordStatusTag | null;
}

interface GameUIActions {
  isGameplayLocked: () => boolean;
  onRetryLevel: () => Promise<void> | void;
  onNextLevel: () => Promise<void> | void;
  onSoundToggle: (checked: boolean) => void;
  onVibrationToggle: (checked: boolean) => void;
  onDetect: () => void;
  onUndo: () => void;
  onWatchAdForGems: () => void;
  onOpenDailySpin: () => void;
  onSpin: () => void;
  onTutorialDismiss: () => void;
}

type MinimalSaveData = Pick<
  SaveData,
  'level' | 'streak' | 'gems' | 'wordsFound' | 'perfectLevels' | 'bestStreak' | 'soundEnabled' | 'vibrationEnabled'
>;

export class GameUIController {
  private initialized = false;

  constructor(private readonly actions: GameUIActions) {}

  initialize(saveData: Pick<SaveData, 'soundEnabled' | 'vibrationEnabled'>): void {
    if (this.initialized) return;
    this.initialized = true;

    this.injectIcons();
    this.setupMobileWordRackScroll();
    this.bindControls();
    this.applySettingsState(saveData);
  }

  updateHUD(saveData: MinimalSaveData): void {
    const levelEl = document.getElementById('hud-level');
    const streakEl = document.getElementById('hud-streak');
    const gemsEl = document.getElementById('hud-gems');
    if (levelEl) levelEl.textContent = saveData.level.toString();
    if (streakEl) streakEl.textContent = saveData.streak.toString();
    if (gemsEl) gemsEl.textContent = saveData.gems.toString();

    const wordsEl = document.getElementById('stat-words');
    const perfectEl = document.getElementById('stat-perfect');
    const bestStreakEl = document.getElementById('stat-best-streak');
    if (wordsEl) wordsEl.textContent = saveData.wordsFound.toString();
    if (perfectEl) perfectEl.textContent = saveData.perfectLevels.toString();
    if (bestStreakEl) bestStreakEl.textContent = saveData.bestStreak.toString();
  }

  updateWordLists(items: WordListItemViewModel[], allFound: boolean): void {
    const desktopList = document.getElementById('word-list');
    if (desktopList) {
      desktopList.innerHTML = '';
      items.forEach((item) => {
        desktopList.appendChild(this.createDesktopWordItem(item));
      });

      if (allFound) {
        const msg = document.createElement('div');
        msg.className = 'all-found-msg';
        msg.textContent = 'ALL FOUND!';
        desktopList.appendChild(msg);
      }
    }

    const mobileList = document.getElementById('mobile-word-list');
    if (mobileList) {
      mobileList.innerHTML = '';
      mobileList.scrollLeft = 0;
      items.forEach((item) => {
        mobileList.appendChild(this.createMobileWordItem(item));
      });
    }

    scheduleResponsiveLayout();
  }

  bumpHudGems(): void {
    const el = document.getElementById('hud-gems');
    if (!el) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  private bindControls(): void {
    this.bindAsyncButton('btn-retry-level', 'time-up-modal', () => this.actions.onRetryLevel());
    this.bindAsyncButton('btn-next-level', 'level-complete-modal', () => this.actions.onNextLevel());

    document.getElementById('btn-settings')?.addEventListener('click', () => {
      if (this.actions.isGameplayLocked()) return;
      SoundManager.play('click');
      this.showModal('settings-modal');
    });

    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      SoundManager.play('click');
      this.hideModal('settings-modal');
    });

    document.getElementById('btn-how-to-play')?.addEventListener('click', () => {
      SoundManager.play('click');
      this.hideModal('settings-modal');
      this.showModal('tutorial-overlay');
    });

    document.getElementById('toggle-sound')?.addEventListener('change', (event) => {
      this.actions.onSoundToggle((event.target as HTMLInputElement).checked);
    });

    document.getElementById('toggle-vibration')?.addEventListener('change', (event) => {
      this.actions.onVibrationToggle((event.target as HTMLInputElement).checked);
    });

    this.bindLockedAction('btn-detect', () => this.actions.onDetect());
    this.bindLockedAction('btn-undo', () => this.actions.onUndo());
    this.bindLockedAction('btn-ad-gems', () => this.actions.onWatchAdForGems());
    this.bindLockedAction('btn-daily-spin', () => this.actions.onOpenDailySpin());
    this.bindLockedAction('btn-daily-spin-mobile', () => this.actions.onOpenDailySpin());
    this.bindLockedAction('btn-spin', () => this.actions.onSpin(), false);

    document.getElementById('btn-close-spin')?.addEventListener('click', () => {
      this.hideModal('spin-modal');
    });

    document.getElementById('btn-spin-collect')?.addEventListener('click', () => {
      this.hideModal('spin-modal');
    });

    document.getElementById('btn-tutorial-ok')?.addEventListener('click', () => {
      this.hideModal('tutorial-overlay');
      this.actions.onTutorialDismiss();
    });

    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', () => {
        const modal = backdrop.parentElement as HTMLElement | null;
        if (!modal || modal.dataset.static === 'true') return;
        modal.style.display = 'none';
      });
    });
  }

  private bindAsyncButton(buttonId: string, modalId: string, action: () => Promise<void> | void): void {
    document.getElementById(buttonId)?.addEventListener('click', async () => {
      const button = document.getElementById(buttonId) as HTMLButtonElement | null;
      button?.setAttribute('disabled', 'true');
      this.hideModal(modalId);
      SoundManager.play('click');

      try {
        await action();
      } finally {
        button?.removeAttribute('disabled');
      }
    });
  }

  private bindLockedAction(buttonId: string, action: () => void, playClick = true): void {
    document.getElementById(buttonId)?.addEventListener('click', () => {
      if (this.actions.isGameplayLocked()) return;
      if (playClick) SoundManager.play('click');
      action();
    });
  }

  private applySettingsState(saveData: Pick<SaveData, 'soundEnabled' | 'vibrationEnabled'>): void {
    if (!saveData.soundEnabled) {
      SoundManager.setEnabled(false);
      const toggle = document.getElementById('toggle-sound') as HTMLInputElement | null;
      if (toggle) toggle.checked = false;
    }

    if (!saveData.vibrationEnabled) {
      SoundManager.setVibrationEnabled(false);
      const toggle = document.getElementById('toggle-vibration') as HTMLInputElement | null;
      if (toggle) toggle.checked = false;
    }
  }

  private setupMobileWordRackScroll(): void {
    const mobileList = document.getElementById('mobile-word-list');
    if (!mobileList || mobileList.dataset.dragScrollBound === '1') return;

    mobileList.dataset.dragScrollBound = '1';

    let activePointerId: number | null = null;
    let startX = 0;
    let startScrollLeft = 0;
    let dragged = false;

    mobileList.addEventListener('pointerdown', (event: PointerEvent) => {
      activePointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = mobileList.scrollLeft;
      dragged = false;
      mobileList.setPointerCapture?.(event.pointerId);
    });

    mobileList.addEventListener('pointermove', (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) return;

      const deltaX = event.clientX - startX;
      if (!dragged && Math.abs(deltaX) < 3) return;

      dragged = true;
      mobileList.scrollLeft = startScrollLeft - deltaX;
      event.preventDefault();
      event.stopPropagation();
    }, { passive: false });

    const clearPointer = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) return;
      if (mobileList.hasPointerCapture?.(event.pointerId)) {
        mobileList.releasePointerCapture(event.pointerId);
      }
      activePointerId = null;
      window.setTimeout(() => {
        dragged = false;
      }, 0);
    };

    mobileList.addEventListener('pointerup', clearPointer);
    mobileList.addEventListener('pointercancel', clearPointer);
    mobileList.addEventListener('click', (event) => {
      if (!dragged) return;
      event.preventDefault();
      event.stopPropagation();
    });
  }

  private injectIcons(): void {
    setIcon('icon-streak', 'fire');
    setIcon('icon-gems', 'gem');
    setIcon('icon-settings', 'settings');
    setIcon('icon-spin', 'spin');
    setIcon('icon-detect', 'detect');
    setIcon('icon-undo', 'undo');
    setIcon('icon-watch-ad', 'watchAd');
    setIcon('icon-sound', 'soundOn');
    setIcon('icon-vibration', 'vibration');
    setIcon('icon-howto', 'howToPlay');

    const detectCost = document.getElementById('cost-detect');
    if (detectCost) detectCost.innerHTML = `${iconHTML('gem', 'cost-gem')} ${POWERUP_COSTS.DETECT}`;
    const undoCost = document.getElementById('cost-undo');
    if (undoCost) undoCost.innerHTML = `${iconHTML('gem', 'cost-gem')} ${POWERUP_COSTS.UNDO}`;
    const adRewardBadge = document.querySelector('.ad-reward-badge');
    if (adRewardBadge) adRewardBadge.innerHTML = `+50 ${iconHTML('gem', 'reward-gem')}`;
  }

  private createDesktopWordItem(item: WordListItemViewModel): HTMLElement {
    const row = document.createElement('div');
    row.className = 'word-item';

    if (item.isFound && item.colorIndex !== null) {
      row.classList.add('found', `word-color-${item.colorIndex % COLORS.FOUND_COLORS.length}`);
    }
    if (item.statusTag) row.classList.add(item.statusTag.className);

    row.title = item.statusTag && !item.isFound ? `${item.word} - ${item.statusTag.label}` : item.word;
    row.setAttribute('aria-label', row.title);

    const check = document.createElement('span');
    check.className = 'word-check';
    check.innerHTML = item.isFound ? ICONS.checkFilled : ICONS.checkEmpty;

    const body = document.createElement('span');
    body.className = 'word-body';

    const text = document.createElement('span');
    text.className = 'word-text';
    text.textContent = item.word;
    text.dataset.word = item.word;

    body.appendChild(text);
    row.append(check, body);
    return row;
  }

  private createMobileWordItem(item: WordListItemViewModel): HTMLElement {
    const chip = document.createElement('span');
    chip.className = 'mobile-word';

    if (item.isFound && item.colorIndex !== null) {
      chip.classList.add('found', `word-color-${item.colorIndex % COLORS.FOUND_COLORS.length}`);
    }
    if (item.statusTag) chip.classList.add(item.statusTag.className);

    chip.textContent = item.word;
    chip.dataset.word = item.word;
    chip.title = item.statusTag && !item.isFound ? `${item.word} - ${item.statusTag.label}` : item.word;
    chip.setAttribute('aria-label', chip.title);
    return chip;
  }

  private showModal(id: string): void {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
  }

  private hideModal(id: string): void {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
  }
}
