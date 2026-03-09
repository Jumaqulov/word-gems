import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { IS_MOBILE } from './consts';

// Scroll prevention (CrazyGames requirement)
window.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
});

async function boot() {
  // SDK init is handled by CrazyGamesManager.init() in BootScene

  const isMobile = IS_MOBILE();

  // Phaser config — match canvas to grid area for perfect centering
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    transparent: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: isMobile ? 360 : 700,
      height: isMobile ? 640 : 700,
    },
    scene: [BootScene, GameScene],
    input: {
      activePointers: 1,
    },
    render: {
      antialias: true,
      pixelArt: false,
    },
  };

  window.game = new Phaser.Game(config);

  // Add mobile class
  if (isMobile) {
    document.getElementById('game-shell')?.classList.add('mobile');
  }
}

boot();
