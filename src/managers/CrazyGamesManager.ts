import EventBus, { EVENTS } from '../utils/EventBus';
import { SAVE_KEY } from '../consts';

export interface SaveData {
  version: number;
  level: number;
  gems: number;
  totalScore: number;
  streak: number;
  lastPlayDate: string;
  dailySpinTimestamp: number;
  collection: string[];
  usedWords: string[];
  freeHints: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  // Level system additions
  stars: Record<number, number>; // levelNum -> star rating (0-3)
  wordsFound: number;
  perfectLevels: number;
  tutorialSeen: boolean;
  hintsUsed: number;
}

const DEFAULT_SAVE: SaveData = {
  version: 2,
  level: 1,
  gems: 0,
  totalScore: 0,
  streak: 0,
  lastPlayDate: '',
  dailySpinTimestamp: 0,
  collection: [],
  usedWords: [],
  freeHints: 0,
  soundEnabled: true,
  vibrationEnabled: true,
  stars: {},
  wordsFound: 0,
  perfectLevels: 0,
  tutorialSeen: false,
  hintsUsed: 0,
};

class CrazyGamesManagerSingleton {
  private sdk: CrazySDK | null = null;
  private _saveData: SaveData = { ...DEFAULT_SAVE };
  private _initialized = false;

  get saveData(): SaveData {
    return this._saveData;
  }

  get initialized(): boolean {
    return this._initialized;
  }

  async init(): Promise<void> {
    try {
      if (window.CrazyGames?.SDK) {
        await window.CrazyGames.SDK.init();
        this.sdk = window.CrazyGames.SDK;

        // Listen for audio mute
        if (this.sdk.game.addSettingsChangeListener) {
          this.sdk.game.addSettingsChangeListener((settings: any) => {
            if (settings?.muteAudio !== undefined) {
              EventBus.emit(EVENTS.MUTE_CHANGED, settings.muteAudio);
            }
          });
        }
      }
    } catch (e) {
      console.warn('CrazyGames SDK not available');
    }

    this.loadGame();
    this.updateStreak();
    this._initialized = true;
  }

  // --- Ads ---

  requestRewardedAd(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.sdk) {
        // Local dev: simulate success
        resolve(true);
        return;
      }

      const timeout = setTimeout(() => resolve(false), 30000);

      this.sdk.ad.requestAd('rewarded', {
        adStarted: () => {
          EventBus.emit(EVENTS.MUTE_CHANGED, true);
        },
        adFinished: () => {
          clearTimeout(timeout);
          EventBus.emit(EVENTS.MUTE_CHANGED, false);
          resolve(true);
        },
        adError: () => {
          clearTimeout(timeout);
          EventBus.emit(EVENTS.MUTE_CHANGED, false);
          resolve(false);
        },
      });
    });
  }

  requestMidgameAd(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.sdk) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => resolve(), 30000);

      this.sdk.ad.requestAd('midgame', {
        adStarted: () => {
          EventBus.emit(EVENTS.MUTE_CHANGED, true);
        },
        adFinished: () => {
          clearTimeout(timeout);
          EventBus.emit(EVENTS.MUTE_CHANGED, false);
          resolve();
        },
        adError: () => {
          clearTimeout(timeout);
          EventBus.emit(EVENTS.MUTE_CHANGED, false);
          resolve();
        },
      });
    });
  }

  // --- Gameplay events ---

  gameplayStart(): void {
    try {
      this.sdk?.game.gameplayStart();
    } catch (e) { /* ignore */ }
  }

  gameplayStop(): void {
    try {
      this.sdk?.game.gameplayStop();
    } catch (e) { /* ignore */ }
  }

  loadingStop(): void {
    try {
      this.sdk?.game.loadingStop();
    } catch (e) { /* ignore */ }
  }

  happytime(): void {
    try {
      this.sdk?.game.happytime();
    } catch (e) { /* ignore */ }
  }

  // --- Save / Load ---

  saveGame(): void {
    const json = JSON.stringify(this._saveData);

    if (this.sdk) {
      // Use SDK data module only
      try {
        this.sdk.data.setItem(SAVE_KEY, json);
      } catch (e) { /* ignore */ }
    } else {
      // Fallback to localStorage (local dev)
      try {
        localStorage.setItem(SAVE_KEY, json);
      } catch (e) { /* ignore */ }
    }
  }

  loadGame(): void {
    let json: string | null = null;

    // Try SDK first
    try {
      json = this.sdk?.data.getItem(SAVE_KEY) ?? null;
    } catch (e) { /* ignore */ }

    // Fallback to localStorage
    if (!json) {
      try {
        json = localStorage.getItem(SAVE_KEY);
      } catch (e) { /* ignore */ }
    }

    if (json) {
      try {
        const parsed = JSON.parse(json);
        this._saveData = { ...DEFAULT_SAVE, ...parsed };
      } catch (e) {
        this._saveData = { ...DEFAULT_SAVE };
      }
    } else {
      this._saveData = { ...DEFAULT_SAVE };
    }
  }

  // --- Streak ---

  private updateStreak(): void {
    const today = new Date().toISOString().split('T')[0];
    const lastPlay = this._saveData.lastPlayDate;

    if (!lastPlay) {
      this._saveData.streak = 1;
    } else if (lastPlay === today) {
      // Same day, no change
    } else {
      const lastDate = new Date(lastPlay);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        this._saveData.streak += 1;
      } else if (diffDays > 1) {
        this._saveData.streak = 1;
      }
    }

    this._saveData.lastPlayDate = today;
    this.saveGame();
  }

  // --- Helpers ---

  addGems(amount: number): void {
    this._saveData.gems += amount;
    EventBus.emit(EVENTS.GEMS_CHANGED, this._saveData.gems);
    this.saveGame();
  }

  spendGems(amount: number): boolean {
    if (this._saveData.gems < amount) return false;
    this._saveData.gems -= amount;
    EventBus.emit(EVENTS.GEMS_CHANGED, this._saveData.gems);
    this.saveGame();
    return true;
  }

  addScore(amount: number): void {
    this._saveData.totalScore += amount;
    EventBus.emit(EVENTS.SCORE_CHANGED, this._saveData.totalScore);
    this.saveGame();
  }

  advanceLevel(): void {
    this._saveData.level += 1;
    this.saveGame();
  }

  setLevelStars(level: number, stars: number): void {
    const current = this._saveData.stars[level] ?? 0;
    if (stars > current) {
      this._saveData.stars[level] = stars;
    }
    this.saveGame();
  }

  addWordsFound(count: number): void {
    this._saveData.wordsFound += count;
    this.saveGame();
  }

  addPerfectLevel(): void {
    this._saveData.perfectLevels += 1;
    this.saveGame();
  }

  incrementHintsUsed(): void {
    this._saveData.hintsUsed += 1;
    this.saveGame();
  }

  markTutorialSeen(): void {
    this._saveData.tutorialSeen = true;
    this.saveGame();
  }

  addToCollection(gemId: string): void {
    if (!this._saveData.collection.includes(gemId)) {
      this._saveData.collection.push(gemId);
      this.saveGame();
    }
  }

  trackUsedWords(words: string[]): void {
    const used = this._saveData.usedWords;
    for (const w of words) {
      if (!used.includes(w)) used.push(w);
    }
    // Keep only last 200
    if (used.length > 200) {
      this._saveData.usedWords = used.slice(-200);
    }
    this.saveGame();
  }

  canDailySpin(): boolean {
    const now = Date.now();
    const last = this._saveData.dailySpinTimestamp;
    return now - last > 24 * 60 * 60 * 1000;
  }

  markDailySpin(): void {
    this._saveData.dailySpinTimestamp = Date.now();
    this.saveGame();
  }
}

export const CrazyGamesManager = new CrazyGamesManagerSingleton();
