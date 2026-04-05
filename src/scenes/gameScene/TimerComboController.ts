import Phaser from 'phaser';
import {
  ComboState,
  LevelConfig,
} from '../../utils/LevelSystem';
import { scheduleResponsiveLayout } from '../../utils/ResponsiveLayout';

interface TimerComboControllerCallbacks {
  onTimerExpired: () => void;
}

export class TimerComboController {
  private comboState: ComboState = this.createComboState();
  private timerSeconds = 0;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private comboUiEvent: Phaser.Time.TimerEvent | null = null;
  private comboExpiryEvent: Phaser.Time.TimerEvent | null = null;

  private readonly comboTiers = [1, 1.5, 2.0, 2.5, 3.0];
  private readonly comboWindow = 5000;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly callbacks: TimerComboControllerCallbacks
  ) {}

  resetForLevel(levelConfig: Pick<LevelConfig, 'hasTimer' | 'timerSeconds'>): void {
    this.stop();
    this.comboState = this.createComboState();
    this.timerSeconds = levelConfig.hasTimer ? levelConfig.timerSeconds : 0;

    if (levelConfig.hasTimer) {
      this.startTimer();
    } else {
      this.hideTimer();
    }

    this.updateComboUI();
  }

  stop(): void {
    this.stopTimer();
    this.stopComboEvents();
    this.comboState = this.createComboState();
    this.updateComboUI();
  }

  destroy(): void {
    this.stop();
  }

  onWordFound(): number {
    const comboMultiplier = this.updateComboState(this.scene.time.now);
    this.startComboEvents();
    this.updateComboUI();
    return comboMultiplier;
  }

  getComboMultiplier(): number {
    return this.comboState.multiplier;
  }

  getTimerSeconds(): number {
    return this.timerSeconds;
  }

  private startTimer(): void {
    this.stopTimer();
    this.updateTimerUI();
    this.showTimer();

    this.timerEvent = this.scene.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.timerSeconds -= 1;
        this.updateTimerUI();
        if (this.timerSeconds <= 0) {
          this.stopTimer();
          this.callbacks.onTimerExpired();
        }
      },
    });
  }

  private stopTimer(): void {
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }
  }

  private updateTimerUI(): void {
    const el = document.getElementById('timer-display');
    const container = document.getElementById('timer-container');
    if (!el) return;

    const minutes = Math.floor(this.timerSeconds / 60);
    const seconds = this.timerSeconds % 60;
    el.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    el.className = 'timer-value';

    if (this.timerSeconds <= 15) {
      container?.setAttribute('data-state', 'critical');
    } else if (this.timerSeconds <= 30) {
      container?.setAttribute('data-state', 'warning');
    } else {
      container?.setAttribute('data-state', 'normal');
    }
  }

  private showTimer(): void {
    const el = document.getElementById('timer-container');
    if (el) el.style.display = 'flex';
    scheduleResponsiveLayout();
  }

  private hideTimer(): void {
    const el = document.getElementById('timer-container');
    if (el) el.style.display = 'none';
    scheduleResponsiveLayout();
  }

  private updateComboUI(): void {
    const displayEl = document.getElementById('combo-display');
    const barEl = document.getElementById('combo-bar-fill');
    if (!displayEl || !barEl) return;

    if (this.comboState.multiplier > 1 && this.isComboActive(this.scene.time.now)) {
      displayEl.style.display = 'flex';
      displayEl.textContent = `x${this.comboState.multiplier}`;
      barEl.style.width = `${this.getComboTimeFraction(this.scene.time.now) * 100}%`;
    } else {
      displayEl.style.display = 'none';
      barEl.style.width = '0%';
    }
  }

  private startComboEvents(): void {
    this.stopComboEvents();

    this.comboUiEvent = this.scene.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        this.updateComboUI();
      },
    });

    this.comboExpiryEvent = this.scene.time.delayedCall(this.comboState.comboWindow, () => {
      this.comboState.multiplier = 1;
      this.comboState.lastFoundTime = 0;
      this.updateComboUI();
      this.stopComboEvents();
    });
  }

  private stopComboEvents(): void {
    if (this.comboUiEvent) {
      this.comboUiEvent.destroy();
      this.comboUiEvent = null;
    }

    if (this.comboExpiryEvent) {
      this.comboExpiryEvent.destroy();
      this.comboExpiryEvent = null;
    }
  }

  private createComboState(): ComboState {
    return { multiplier: 1, lastFoundTime: 0, comboWindow: this.comboWindow };
  }

  private updateComboState(now: number): number {
    const timeSinceLast = now - this.comboState.lastFoundTime;

    if (this.comboState.lastFoundTime === 0 || timeSinceLast > this.comboState.comboWindow) {
      this.comboState.multiplier = this.comboTiers[0];
    } else {
      const currentIdx = this.comboTiers.indexOf(this.comboState.multiplier);
      const nextIdx = Math.min(currentIdx + 1, this.comboTiers.length - 1);
      this.comboState.multiplier = this.comboTiers[nextIdx];
    }

    this.comboState.lastFoundTime = now;
    return this.comboState.multiplier;
  }

  private isComboActive(now: number): boolean {
    if (this.comboState.lastFoundTime === 0) return false;
    return now - this.comboState.lastFoundTime < this.comboState.comboWindow;
  }

  private getComboTimeFraction(now: number): number {
    if (this.comboState.lastFoundTime === 0) return 0;
    const elapsed = now - this.comboState.lastFoundTime;
    return Math.max(0, 1 - elapsed / this.comboState.comboWindow);
  }
}
