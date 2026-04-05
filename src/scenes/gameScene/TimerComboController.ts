import Phaser from 'phaser';
import {
  ComboState,
  createComboState,
  getComboTimeFraction,
  isComboActive,
  LevelConfig,
  updateCombo,
} from '../../utils/LevelSystem';
import { scheduleResponsiveLayout } from '../../utils/ResponsiveLayout';

interface TimerComboControllerCallbacks {
  onTimerExpired: () => void;
}

export class TimerComboController {
  private comboState: ComboState = createComboState();
  private comboInterval: ReturnType<typeof setInterval> | null = null;
  private timerSeconds = 0;
  private timerEvent: Phaser.Time.TimerEvent | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly callbacks: TimerComboControllerCallbacks
  ) {}

  resetForLevel(levelConfig: Pick<LevelConfig, 'hasTimer' | 'timerSeconds'>): void {
    this.stop();
    this.comboState = createComboState();
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
    this.stopComboTick();
  }

  destroy(): void {
    this.stop();
  }

  onWordFound(): number {
    const comboMultiplier = updateCombo(this.comboState);
    this.startComboTick();
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

    if (this.comboState.multiplier > 1 && isComboActive(this.comboState)) {
      displayEl.style.display = 'flex';
      displayEl.textContent = `x${this.comboState.multiplier}`;
      barEl.style.width = `${getComboTimeFraction(this.comboState) * 100}%`;
    } else {
      displayEl.style.display = 'none';
      barEl.style.width = '0%';
    }
  }

  private startComboTick(): void {
    if (this.comboInterval) return;

    this.comboInterval = setInterval(() => {
      this.updateComboUI();
      if (!isComboActive(this.comboState)) {
        this.comboState.multiplier = 1;
        this.updateComboUI();
        this.stopComboTick();
      }
    }, 50);
  }

  private stopComboTick(): void {
    if (this.comboInterval) {
      clearInterval(this.comboInterval);
      this.comboInterval = null;
    }
  }
}
