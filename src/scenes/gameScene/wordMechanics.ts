import { WorldMechanicConfig } from '../../utils/LevelSystem';

export type PreFoundMechanicOutcome = 'resolve' | 'locked' | 'crack_frozen' | 'blocked_frozen';

export interface PreFoundMechanicState {
  isLockedWord: boolean;
  isFrozenWord: boolean;
  isCrackedFrozenWord: boolean;
  remainingNonFrozenRequiredWordCount: number;
}

export function evaluatePreFoundMechanic(state: PreFoundMechanicState): PreFoundMechanicOutcome {
  if (state.isLockedWord) {
    return 'locked';
  }

  if (!state.isFrozenWord) {
    return 'resolve';
  }

  const canClearFrozenWordNow = state.remainingNonFrozenRequiredWordCount === 0;
  if (!state.isCrackedFrozenWord) {
    return canClearFrozenWordNow ? 'resolve' : 'crack_frozen';
  }

  return canClearFrozenWordNow ? 'resolve' : 'blocked_frozen';
}

export function getLockedWordFeedbackText(word: string, prerequisite: string | null): string {
  return prerequisite ? `Unlock with ${prerequisite}` : `${word} is locked`;
}

export function getFrozenWordBlockedText(remainingNonFrozenRequiredWordCount: number): string {
  return remainingNonFrozenRequiredWordCount > 1
    ? `FIND ${remainingNonFrozenRequiredWordCount} MORE WORDS`
    : 'FIND 1 MORE WORD';
}

export interface PostFoundMechanicState {
  word: string;
  wordCellKeys: string[];
  mechanic: WorldMechanicConfig;
  lockPrerequisite: string | null;
  lockedWord: string | null;
  foundWords: Set<string>;
  cometWord: string | null;
  cometClaimed: boolean;
  goldenCellKeys: Set<string>;
  collectedGoldenCellKeys: Set<string>;
}

export interface PostFoundMechanicResult {
  unlockBurstText: string | null;
  cometReward:
    | {
        bonusScore: number;
        bonusLabel: string;
      }
    | null;
  goldenReward:
    | {
        newlyCollectedGoldenCellKeys: string[];
        scoreBonus: number;
        gemBonus: number;
        rewardLabel: string;
      }
    | null;
}

export function evaluatePostFoundMechanics(state: PostFoundMechanicState): PostFoundMechanicResult {
  const unlockBurstText =
    state.lockPrerequisite === state.word &&
    state.lockedWord &&
    !state.foundWords.has(state.lockedWord)
      ? state.mechanic.type === 'castle_lock'
        ? state.mechanic.unlockBurstText ?? 'GATE OPEN'
        : 'GATE OPEN'
      : null;

  const cometReward =
    state.cometWord === state.word && !state.cometClaimed && state.mechanic.type === 'space_comet'
      ? {
          bonusScore: state.mechanic.bonusScore,
          bonusLabel: state.mechanic.bonusLabel ?? 'COMET',
        }
      : null;

  const goldenReward =
    state.mechanic.type === 'desert_gold'
      ? (() => {
          const newlyCollectedGoldenCellKeys = state.wordCellKeys.filter(
            (key) => state.goldenCellKeys.has(key) && !state.collectedGoldenCellKeys.has(key)
          );

          if (newlyCollectedGoldenCellKeys.length === 0) {
            return null;
          }

          return {
            newlyCollectedGoldenCellKeys,
            scoreBonus: newlyCollectedGoldenCellKeys.length * state.mechanic.scoreBonus,
            gemBonus: newlyCollectedGoldenCellKeys.length * state.mechanic.gemBonus,
            rewardLabel: state.mechanic.rewardLabel ?? 'SUN GOLD',
          };
        })()
      : null;

  return {
    unlockBurstText,
    cometReward,
    goldenReward,
  };
}
