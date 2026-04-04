import { WorldId } from '../../utils/LevelSystem';

export interface WordRuntimeState {
  cometWord: string | null;
  cometClaimed: boolean;
  lockedWord: string | null;
  lockPrerequisite: string | null;
  wildcardCellKeys: Set<string>;
  frozenWords: Set<string>;
  crackedFrozenWords: Set<string>;
  goldenCellKeys: Set<string>;
  collectedGoldenCellKeys: Set<string>;
  waveCellKeys: Set<string>;
}

export type InteractionParticleShape = 'circle' | 'diamond' | 'star' | 'leaf' | 'shard' | 'snow';

export interface BoardThemeProfile {
  shellMix: number;
  rimMix: number;
  faceMix: number;
  innerMix: number;
  coreMix: number;
  slotBaseMix: number;
  slotGlowMix: number;
  facetMix: number;
  chipMix: number;
  stageGlowAlpha: number;
  stageBloomAlpha: number;
  stageHaloAlpha: number;
  frameOuterAlpha: number;
  frameInnerAlpha: number;
  panelFaceAlpha: number;
  panelInnerAlpha: number;
  panelCoreAlpha: number;
  topBandAlpha: number;
  glassBandAlpha: number;
  facetFillAlpha: number;
  facetStrokeAlpha: number;
  slotShadowAlpha: number;
  slotBaseAlpha: number;
  slotGlowAlpha: number;
  slotEdgeAlpha: number;
  slotInnerEdgeAlpha: number;
  chipAlpha: number;
  tileTintMix: number;
  tileScale: number;
  tileLetterScale: number;
  letterDarkMix: number;
  letterStrokeMix: number;
  letterShadowAlpha: number;
  selectedTintMix: number;
  selectedScale: number;
  selectedLetterScale: number;
  selectedStrokeMix: number;
  selectedShadowAlpha: number;
  foundTileScale: number;
  foundLetterScale: number;
  foundStrokeMix: number;
  foundShadowAlpha: number;
  trailShape: InteractionParticleShape;
  trailCount: number;
  trailAlpha: number;
  trailSecondaryMix: number;
  foundBurstShape: InteractionParticleShape;
  foundBurstCount: number;
  foundBurstAlpha: number;
  foundBurstSpread: number;
  foundBurstSecondaryMix: number;
  foundLineAlpha: number;
  foundLineWidthScale: number;
}

export function createWordRuntimeState(): WordRuntimeState {
  return {
    cometWord: null,
    cometClaimed: false,
    lockedWord: null,
    lockPrerequisite: null,
    wildcardCellKeys: new Set(),
    frozenWords: new Set(),
    crackedFrozenWords: new Set(),
    goldenCellKeys: new Set(),
    collectedGoldenCellKeys: new Set(),
    waveCellKeys: new Set(),
  };
}

export function getBoardThemeProfile(worldId: WorldId): BoardThemeProfile {
  const profile: BoardThemeProfile = {
    shellMix: 0.18,
    rimMix: 0.48,
    faceMix: 0.34,
    innerMix: 0.34,
    coreMix: 0.24,
    slotBaseMix: 0.22,
    slotGlowMix: 0.42,
    facetMix: 0.42,
    chipMix: 0.34,
    stageGlowAlpha: 0.24,
    stageBloomAlpha: 0.14,
    stageHaloAlpha: 0.05,
    frameOuterAlpha: 0.24,
    frameInnerAlpha: 0.22,
    panelFaceAlpha: 0.24,
    panelInnerAlpha: 0.18,
    panelCoreAlpha: 0.1,
    topBandAlpha: 0.16,
    glassBandAlpha: 0.08,
    facetFillAlpha: 0.06,
    facetStrokeAlpha: 0.14,
    slotShadowAlpha: 0.12,
    slotBaseAlpha: 0.18,
    slotGlowAlpha: 0.12,
    slotEdgeAlpha: 0.12,
    slotInnerEdgeAlpha: 0.08,
    chipAlpha: 0.18,
    tileTintMix: 0.05,
    tileScale: 0.95,
    tileLetterScale: 0.96,
    letterDarkMix: 0.14,
    letterStrokeMix: 0.16,
    letterShadowAlpha: 0.14,
    selectedTintMix: 0.18,
    selectedScale: 1.04,
    selectedLetterScale: 1.09,
    selectedStrokeMix: 0.44,
    selectedShadowAlpha: 0.24,
    foundTileScale: 1.05,
    foundLetterScale: 1.08,
    foundStrokeMix: 0.26,
    foundShadowAlpha: 0.22,
    trailShape: 'circle',
    trailCount: 4,
    trailAlpha: 0.58,
    trailSecondaryMix: 0.34,
    foundBurstShape: 'diamond',
    foundBurstCount: 6,
    foundBurstAlpha: 0.96,
    foundBurstSpread: 18,
    foundBurstSecondaryMix: 0.34,
    foundLineAlpha: 0.42,
    foundLineWidthScale: 0.62,
  };

  const overrides: Partial<Record<WorldId, Partial<BoardThemeProfile>>> = {
    forest: {
      faceMix: 0.28,
      innerMix: 0.26,
      coreMix: 0.16,
      stageHaloAlpha: 0.03,
      slotGlowAlpha: 0.08,
      tileTintMix: 0.03,
      letterDarkMix: 0.16,
      selectedTintMix: 0.12,
      trailShape: 'leaf',
      trailCount: 5,
      trailAlpha: 0.62,
      trailSecondaryMix: 0.46,
      foundBurstShape: 'leaf',
      foundBurstCount: 7,
      foundBurstAlpha: 0.88,
      foundBurstSpread: 16,
      foundBurstSecondaryMix: 0.5,
      foundLineAlpha: 0.38,
      foundLineWidthScale: 0.58,
    },
    ocean: {
      stageGlowAlpha: 0.28,
      stageBloomAlpha: 0.18,
      stageHaloAlpha: 0.08,
      faceMix: 0.3,
      innerMix: 0.28,
      slotGlowAlpha: 0.16,
      glassBandAlpha: 0.12,
      selectedTintMix: 0.28,
      trailShape: 'circle',
      trailCount: 4,
      trailAlpha: 0.48,
      trailSecondaryMix: 0.44,
      foundBurstShape: 'shard',
      foundBurstCount: 7,
      foundBurstAlpha: 0.9,
      foundBurstSpread: 22,
      foundBurstSecondaryMix: 0.56,
      foundLineAlpha: 0.34,
      foundLineWidthScale: 0.56,
    },
    space: {
      stageGlowAlpha: 0.28,
      stageBloomAlpha: 0.16,
      stageHaloAlpha: 0.1,
      frameOuterAlpha: 0.28,
      frameInnerAlpha: 0.24,
      panelFaceAlpha: 0.22,
      panelInnerAlpha: 0.16,
      panelCoreAlpha: 0.14,
      glassBandAlpha: 0.1,
      facetStrokeAlpha: 0.18,
      tileTintMix: 0.02,
      letterDarkMix: 0.22,
      selectedTintMix: 0.22,
      trailShape: 'star',
      trailCount: 5,
      trailAlpha: 0.72,
      trailSecondaryMix: 0.52,
      foundBurstShape: 'star',
      foundBurstCount: 8,
      foundBurstAlpha: 0.98,
      foundBurstSpread: 24,
      foundBurstSecondaryMix: 0.58,
      foundLineAlpha: 0.4,
      foundLineWidthScale: 0.6,
    },
    castle: {
      frameOuterAlpha: 0.3,
      frameInnerAlpha: 0.26,
      panelFaceAlpha: 0.28,
      panelInnerAlpha: 0.2,
      panelCoreAlpha: 0.14,
      topBandAlpha: 0.18,
      chipAlpha: 0.22,
      slotBaseAlpha: 0.2,
      trailShape: 'diamond',
      trailCount: 4,
      trailAlpha: 0.62,
      trailSecondaryMix: 0.42,
      foundBurstShape: 'diamond',
      foundBurstCount: 6,
      foundBurstAlpha: 0.94,
      foundBurstSpread: 18,
      foundBurstSecondaryMix: 0.48,
      foundLineAlpha: 0.36,
      foundLineWidthScale: 0.64,
    },
    magic: {
      stageGlowAlpha: 0.3,
      stageBloomAlpha: 0.18,
      stageHaloAlpha: 0.12,
      glassBandAlpha: 0.12,
      facetFillAlpha: 0.08,
      facetStrokeAlpha: 0.18,
      slotGlowAlpha: 0.15,
      selectedTintMix: 0.3,
      trailShape: 'star',
      trailCount: 5,
      trailAlpha: 0.76,
      trailSecondaryMix: 0.6,
      foundBurstShape: 'star',
      foundBurstCount: 8,
      foundBurstAlpha: 1,
      foundBurstSpread: 24,
      foundBurstSecondaryMix: 0.64,
      foundLineAlpha: 0.44,
      foundLineWidthScale: 0.68,
    },
    ice: {
      stageGlowAlpha: 0.26,
      stageBloomAlpha: 0.16,
      stageHaloAlpha: 0.08,
      frameInnerAlpha: 0.24,
      glassBandAlpha: 0.14,
      facetFillAlpha: 0.07,
      slotGlowAlpha: 0.18,
      slotEdgeAlpha: 0.16,
      slotInnerEdgeAlpha: 0.12,
      tileTintMix: 0.01,
      letterDarkMix: 0.12,
      trailShape: 'snow',
      trailCount: 5,
      trailAlpha: 0.72,
      trailSecondaryMix: 0.52,
      foundBurstShape: 'snow',
      foundBurstCount: 7,
      foundBurstAlpha: 0.94,
      foundBurstSpread: 20,
      foundBurstSecondaryMix: 0.56,
      foundLineAlpha: 0.36,
      foundLineWidthScale: 0.56,
    },
    desert: {
      stageGlowAlpha: 0.2,
      stageBloomAlpha: 0.12,
      stageHaloAlpha: 0.04,
      panelCoreAlpha: 0.08,
      topBandAlpha: 0.18,
      slotBaseAlpha: 0.2,
      slotGlowAlpha: 0.1,
      trailShape: 'circle',
      trailCount: 4,
      trailAlpha: 0.52,
      trailSecondaryMix: 0.42,
      foundBurstShape: 'diamond',
      foundBurstCount: 6,
      foundBurstAlpha: 0.9,
      foundBurstSpread: 17,
      foundBurstSecondaryMix: 0.44,
      foundLineAlpha: 0.3,
      foundLineWidthScale: 0.58,
    },
    volcano: {
      stageGlowAlpha: 0.32,
      stageBloomAlpha: 0.18,
      stageHaloAlpha: 0.08,
      frameOuterAlpha: 0.28,
      rimMix: 0.42,
      faceMix: 0.28,
      innerMix: 0.3,
      glassBandAlpha: 0.1,
      slotShadowAlpha: 0.16,
      slotGlowAlpha: 0.18,
      selectedTintMix: 0.24,
      trailShape: 'shard',
      trailCount: 5,
      trailAlpha: 0.78,
      trailSecondaryMix: 0.6,
      foundBurstShape: 'shard',
      foundBurstCount: 8,
      foundBurstAlpha: 1,
      foundBurstSpread: 26,
      foundBurstSecondaryMix: 0.66,
      foundLineAlpha: 0.42,
      foundLineWidthScale: 0.66,
    },
    sky: {
      stageGlowAlpha: 0.18,
      stageBloomAlpha: 0.12,
      stageHaloAlpha: 0.04,
      frameOuterAlpha: 0.18,
      frameInnerAlpha: 0.18,
      panelFaceAlpha: 0.2,
      panelInnerAlpha: 0.15,
      slotShadowAlpha: 0.08,
      slotBaseAlpha: 0.16,
      slotGlowAlpha: 0.14,
      tileTintMix: 0.01,
      tileScale: 0.96,
      tileLetterScale: 0.97,
      trailShape: 'circle',
      trailCount: 5,
      trailAlpha: 0.46,
      trailSecondaryMix: 0.38,
      foundBurstShape: 'star',
      foundBurstCount: 6,
      foundBurstAlpha: 0.86,
      foundBurstSpread: 24,
      foundBurstSecondaryMix: 0.52,
      foundLineAlpha: 0.28,
      foundLineWidthScale: 0.54,
    },
    crystal: {
      stageGlowAlpha: 0.3,
      stageBloomAlpha: 0.18,
      stageHaloAlpha: 0.11,
      glassBandAlpha: 0.13,
      facetFillAlpha: 0.09,
      facetStrokeAlpha: 0.2,
      slotGlowAlpha: 0.16,
      chipAlpha: 0.24,
      selectedTintMix: 0.32,
      trailShape: 'diamond',
      trailCount: 5,
      trailAlpha: 0.78,
      trailSecondaryMix: 0.62,
      foundBurstShape: 'diamond',
      foundBurstCount: 8,
      foundBurstAlpha: 1,
      foundBurstSpread: 22,
      foundBurstSecondaryMix: 0.68,
      foundLineAlpha: 0.44,
      foundLineWidthScale: 0.64,
    },
    shadow: {
      stageGlowAlpha: 0.16,
      stageBloomAlpha: 0.1,
      stageHaloAlpha: 0.06,
      frameOuterAlpha: 0.3,
      panelFaceAlpha: 0.18,
      panelInnerAlpha: 0.16,
      panelCoreAlpha: 0.14,
      topBandAlpha: 0.08,
      glassBandAlpha: 0.05,
      slotShadowAlpha: 0.16,
      slotBaseAlpha: 0.16,
      slotGlowAlpha: 0.09,
      tileTintMix: 0.03,
      letterDarkMix: 0.24,
      letterStrokeMix: 0.1,
      trailShape: 'star',
      trailCount: 4,
      trailAlpha: 0.48,
      trailSecondaryMix: 0.5,
      foundBurstShape: 'shard',
      foundBurstCount: 6,
      foundBurstAlpha: 0.88,
      foundBurstSpread: 18,
      foundBurstSecondaryMix: 0.54,
      foundLineAlpha: 0.26,
      foundLineWidthScale: 0.56,
    },
    clockwork: {
      frameOuterAlpha: 0.32,
      frameInnerAlpha: 0.26,
      panelFaceAlpha: 0.26,
      panelInnerAlpha: 0.2,
      panelCoreAlpha: 0.12,
      topBandAlpha: 0.2,
      chipAlpha: 0.26,
      slotBaseAlpha: 0.19,
      slotGlowAlpha: 0.1,
      trailShape: 'diamond',
      trailCount: 4,
      trailAlpha: 0.64,
      trailSecondaryMix: 0.44,
      foundBurstShape: 'shard',
      foundBurstCount: 7,
      foundBurstAlpha: 0.94,
      foundBurstSpread: 20,
      foundBurstSecondaryMix: 0.5,
      foundLineAlpha: 0.34,
      foundLineWidthScale: 0.6,
    },
  };

  return { ...profile, ...(overrides[worldId] ?? {}) };
}
