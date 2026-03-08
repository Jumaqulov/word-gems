import EventBus, { EVENTS } from '../utils/EventBus';

type SoundName = 'select' | 'found' | 'complete' | 'wrong' | 'spin' | 'click' | 'gem';

class SoundManagerSingleton {
  private audioContext: AudioContext | null = null;
  private _muted = false;
  private _enabled = true;

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

  play(name: SoundName): void {
    if (this._muted || !this._enabled || !this.audioContext) return;

    try {
      switch (name) {
        case 'select':
          this.playTone(240, 0.06, 'sine', 0.08);
          break;
        case 'found':
          this.playChord([523, 659, 784], 0.25, 0.1);
          break;
        case 'complete':
          this.playArpeggio([523, 587, 659, 784, 1047], 0.1, 0.08);
          break;
        case 'wrong':
          this.playTone(150, 0.2, 'sawtooth', 0.06);
          break;
        case 'spin':
          this.playRisingTone(200, 800, 1.5, 0.1);
          break;
        case 'click':
          this.playTone(800, 0.05, 'sine', 0.06);
          break;
        case 'gem':
          this.playChord([1200, 1500], 0.1, 0.04);
          break;
      }
    } catch (e) {
      // Ignore audio errors
    }
  }

  /** Ascending pitch letter select — each letter plays higher note */
  playLetterSelect(index: number): void {
    if (this._muted || !this._enabled || !this.audioContext) return;
    try {
      const freq = 300 + index * 50;
      this.playTone(freq, 0.08, 'sine', 0.08);
    } catch (e) { /* ignore */ }
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

    freqs.forEach((freq, i) => {
      const startTime = ctx.currentTime + i * noteSpacing;
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
