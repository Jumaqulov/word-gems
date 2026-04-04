import Phaser from 'phaser';
import { WorldId } from '../../utils/LevelSystem';

export function useSpaciousCellTextures(gridSize: number): boolean {
  return gridSize >= 9;
}

export function getCellTextureKey(
  textures: Phaser.Textures.TextureManager,
  baseKey: 'cell-bg' | 'cell-selected' | 'cell-hover' | 'cell-wrong' | 'cell-found',
  worldId: WorldId,
  gridSize: number
): string {
  const suffix = useSpaciousCellTextures(gridSize) ? '-spacious' : '';
  const variantKey = `${baseKey}-${worldId}${suffix}`;
  return textures.exists(variantKey) ? variantKey : `${baseKey}${suffix}`;
}

export function getFoundCellTextureKey(colorIndex: number, gridSize: number): string {
  return useSpaciousCellTextures(gridSize) ? `cell-found-${colorIndex}-spacious` : `cell-found-${colorIndex}`;
}
