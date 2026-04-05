import Phaser from 'phaser';
import { LevelConfig } from '../../utils/LevelSystem';
import { WordRuntimeState } from './boardTheme';

interface CellSpriteLike {
  bg: Phaser.GameObjects.Image;
  letter: Phaser.GameObjects.Text;
  row: number;
  col: number;
  baseX: number;
  baseY: number;
}

interface WorldEffectsControllerDeps {
  scene: Phaser.Scene;
  getCells: () => CellSpriteLike[][];
  getWorldState: () => WordRuntimeState;
  getFoundCellKeys: () => Set<string>;
  getCellKey: (row: number, col: number) => string;
  getCellFromKey: (key: string) => CellSpriteLike | null;
  applyBaseCellStyle: (cell: CellSpriteLike) => void;
}

export class WorldEffectsController {
  private worldEffectTimer: Phaser.Time.TimerEvent | null = null;

  constructor(private readonly deps: WorldEffectsControllerDeps) {}

  start(levelConfig: Pick<LevelConfig, 'mechanic'>): void {
    this.stop();
    const mechanic = levelConfig.mechanic;

    if (mechanic.type === 'ocean_wave') {
      this.worldEffectTimer = this.deps.scene.time.addEvent({
        delay: 950,
        loop: true,
        callback: () => this.animateOceanWave(mechanic.amplitude),
      });
    }

    if (mechanic.type === 'desert_gold') {
      this.worldEffectTimer = this.deps.scene.time.addEvent({
        delay: 1200,
        loop: true,
        callback: () => this.animateGoldenCells(),
      });
    }

    if (mechanic.type === 'magic_wildcard') {
      this.worldEffectTimer = this.deps.scene.time.addEvent({
        delay: 1400,
        loop: true,
        callback: () => this.animateWildcardCells(),
      });
    }
  }

  stop(): void {
    if (this.worldEffectTimer) {
      this.worldEffectTimer.destroy();
      this.worldEffectTimer = null;
    }

    for (const row of this.deps.getCells()) {
      for (const cell of row) {
        if (!this.deps.getFoundCellKeys().has(this.deps.getCellKey(cell.row, cell.col))) {
          this.deps.applyBaseCellStyle(cell);
        }
      }
    }
  }

  destroy(): void {
    this.stop();
  }

  private animateOceanWave(amplitude: number): void {
    const worldState = this.deps.getWorldState();
    const candidates = shuffleArray([...worldState.waveCellKeys])
      .map((key) => this.deps.getCellFromKey(key))
      .filter((cell): cell is CellSpriteLike => {
        if (!cell) return false;
        return !this.deps.getFoundCellKeys().has(this.deps.getCellKey(cell.row, cell.col));
      })
      .slice(0, 4);

    candidates.forEach((cell, index) => {
      this.deps.scene.tweens.add({
        targets: [cell.bg, cell.letter],
        y: cell.baseY + (index % 2 === 0 ? amplitude : -amplitude),
        duration: 450,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private animateGoldenCells(): void {
    const worldState = this.deps.getWorldState();
    const candidates = shuffleArray([...worldState.goldenCellKeys])
      .filter((key) => !worldState.collectedGoldenCellKeys.has(key))
      .map((key) => this.deps.getCellFromKey(key))
      .filter((cell): cell is CellSpriteLike => {
        if (!cell) return false;
        return !this.deps.getFoundCellKeys().has(this.deps.getCellKey(cell.row, cell.col));
      })
      .slice(0, 3);

    candidates.forEach((cell) => {
      this.deps.scene.tweens.add({
        targets: [cell.bg, cell.letter],
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 220,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private animateWildcardCells(): void {
    const worldState = this.deps.getWorldState();
    const candidates = shuffleArray([...worldState.wildcardCellKeys])
      .map((key) => this.deps.getCellFromKey(key))
      .filter((cell): cell is CellSpriteLike => {
        if (!cell) return false;
        return !this.deps.getFoundCellKeys().has(this.deps.getCellKey(cell.row, cell.col));
      })
      .slice(0, 2);

    candidates.forEach((cell) => {
      this.deps.scene.tweens.add({
        targets: cell.letter,
        alpha: 0.65,
        duration: 240,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    });
  }
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
