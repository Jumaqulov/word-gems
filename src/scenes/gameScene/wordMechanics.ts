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
