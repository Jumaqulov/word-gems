import type { WorldId } from '../utils/LevelSystem';
import EventBus, { EVENTS } from '../utils/EventBus';

type SoundName = 'select' | 'found' | 'complete' | 'wrong' | 'spin' | 'click' | 'gem';

interface WorldSoundProfile {
  selectBase: number;
  selectStep: number;
  selectType: OscillatorType;
  foundChord: number[];
  completeArpeggio: number[];
  wrongFreq: number;
  wrongType: OscillatorType;
  spinStart: number;
  spinEnd: number;
  gemChord: number[];
}

const WORLD_SOUND_PROFILES: Record<WorldId, WorldSoundProfile> = {
  forest: {
    selectBase: 290,
    selectStep: 35,
    selectType: 'sine',
    foundChord: [392, 494, 587],
    completeArpeggio: [392, 440, 494, 587, 784],
    wrongFreq: 150,
    wrongType: 'triangle',
    spinStart: 220,
    spinEnd: 760,
    gemChord: [980, 1240],
  },
  ocean: {
    selectBase: 250,
    selectStep: 28,
    selectType: 'triangle',
    foundChord: [330, 440, 554],
    completeArpeggio: [330, 392, 440, 554, 659],
    wrongFreq: 135,
    wrongType: 'sine',
    spinStart: 180,
    spinEnd: 620,
    gemChord: [880, 1180],
  },
  space: {
    selectBase: 360,
    selectStep: 45,
    selectType: 'sine',
    foundChord: [523, 784, 1047],
    completeArpeggio: [523, 659, 784, 1047, 1318],
    wrongFreq: 180,
    wrongType: 'square',
    spinStart: 300,
    spinEnd: 950,
    gemChord: [1320, 1760],
  },
  castle: {
    selectBase: 270,
    selectStep: 32,
    selectType: 'triangle',
    foundChord: [349, 440, 523],
    completeArpeggio: [349, 392, 440, 523, 698],
    wrongFreq: 145,
    wrongType: 'sawtooth',
    spinStart: 210,
    spinEnd: 700,
    gemChord: [1040, 1320],
  },
  magic: {
    selectBase: 340,
    selectStep: 40,
    selectType: 'sine',
    foundChord: [587, 740, 988],
    completeArpeggio: [587, 659, 740, 988, 1174],
    wrongFreq: 170,
    wrongType: 'triangle',
    spinStart: 260,
    spinEnd: 840,
    gemChord: [1400, 1860],
  },
  ice: {
    selectBase: 300,
    selectStep: 30,
    selectType: 'triangle',
    foundChord: [440, 554, 659],
    completeArpeggio: [440, 494, 554, 659, 880],
    wrongFreq: 120,
    wrongType: 'sine',
    spinStart: 200,
    spinEnd: 680,
    gemChord: [1180, 1480],
  },
  desert: {
    selectBase: 260,
    selectStep: 34,
    selectType: 'sawtooth',
    foundChord: [392, 523, 659],
    completeArpeggio: [392, 466, 523, 659, 880],
    wrongFreq: 155,
    wrongType: 'sawtooth',
    spinStart: 220,
    spinEnd: 780,
    gemChord: [1000, 1340],
  },
};

class SoundManagerSingleton {
  private audioContext: AudioContext | null = null;
  private _muted = false;
  private _enabled = true;
  private _vibrationEnabled = true;
  private worldProfile: WorldSoundProfile = WORLD_SOUND_PROFILES.forest;

  get muted(): boolean { return this._muted; }
  get enabled(): boolean { return this._enabled; }

  init(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not available');
    }

    EventBus.on(EVENTS.MUTE_CHANGED, (muted: boolean) => {
      this._muted = muted;
    });

    const resume = () => {
      if (this.audioContext?.state === 'suspended') {
        this.audioContext.resume();
      }
      document.removeEventListener('pointerdown', resume);
    };
    document.addEventListener('pointerdown', resume);
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  setVibrationEnabled(enabled: boolean): void {
    this._vibrationEnabled = enabled;
  }

  setWorldProfile(worldId: WorldId): void {
    this.worldProfile = WORLD_SOUND_PROFILES[worldId] ?? WORLD_SOUND_PROFILES.forest;
  }

  play(name: SoundName): void {
    if (this._muted || !this._enabled || !this.audioContext) return;

    try {
      switch (name) {
        case 'select':
          this.playTone(this.worldProfile.selectBase, 0.06, this.worldProfile.selectType, 0.08);
          break;
        case 'found':
          this.playChord(this.worldProfile.foundChord, 0.25, 0.1);
          this.vibrate(15);
          break;
        case 'complete':
          this.playArpeggio(this.worldProfile.completeArpeggio, 0.1, 0.08);
          this.vibrate([15, 30, 15]);
          break;
        case 'wrong':
          this.playTone(this.worldProfile.wrongFreq, 0.2, this.worldProfile.wrongType, 0.06);
          this.vibrate([30, 20, 30]);
          break;
        case 'spin':
          this.playRisingTone(this.worldProfile.spinStart, this.worldProfile.spinEnd, 1.5, 0.1);
          break;
        case 'click':
          this.playTone(800, 0.05, 'sine', 0.06);
          break;
        case 'gem':
          this.playChord(this.worldProfile.gemChord, 0.1, 0.04);
          this.vibrate(10);
          break;
      }
    } catch {
      // Ignore audio errors
    }
  }

  playLetterSelect(index: number): void {
    if (this._muted || !this._enabled || !this.audioContext) return;
    try {
      const frequency = this.worldProfile.selectBase + index * this.worldProfile.selectStep;
      this.playTone(frequency, 0.08, this.worldProfile.selectType, 0.08);
    } catch {
      // Ignore audio errors
    }
  }

  private vibrate(pattern: number | number[]): void {
    if (!this._vibrationEnabled) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {
      // Ignore vibration errors
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15): void {
    const ctx = this.audioContext!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  private playChord(freqs: number[], duration: number, volume = 0.15): void {
    const ctx = this.audioContext!;

    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume / freqs.length, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    }
  }

  private playArpeggio(freqs: number[], noteSpacing: number, volume = 0.15): void {
    const ctx = this.audioContext!;

    freqs.forEach((freq, index) => {
      const startTime = ctx.currentTime + index * noteSpacing;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  private playRisingTone(startFreq: number, endFreq: number, duration: number, volume = 0.12): void {
    const ctx = this.audioContext!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }
}

export const SoundManager = new SoundManagerSingleton();
