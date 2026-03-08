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
  // Init CrazyGames SDK
  try {
    if (window.CrazyGames?.SDK) {
      await window.CrazyGames.SDK.init();
    }
  } catch (e) {
    console.warn('CrazyGames SDK init failed (likely local dev):', e);
  }

  const isMobile = IS_MOBILE();

  // Phaser config
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#0F051D',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: isMobile ? 360 : 600,
      height: isMobile ? 640 : 600,
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
