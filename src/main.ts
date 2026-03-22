import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { IS_MOBILE } from './consts';
import { initResponsiveLayout } from './utils/ResponsiveLayout';

// Scroll prevention (CrazyGames requirement)
window.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
});

async function boot() {
  // SDK init is handled by CrazyGamesManager.init() in BootScene

  const isMobile = IS_MOBILE();
  initResponsiveLayout();

  // Phaser config — match canvas to grid area for perfect centering
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    transparent: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: isMobile ? 460 : 700,
      height: isMobile ? 460 : 700,
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
  if (import.meta.env.DEV) {
    window.render_game_to_text = () => {
      const scene = window.game?.scene.keys.GameScene;
      if (scene instanceof GameScene) {
        return scene.renderGameToText();
      }

      return JSON.stringify({
        state: 'loading',
      });
    };
  } else {
    delete window.render_game_to_text;
  }

  // Add mobile class
  if (isMobile) {
    document.getElementById('game-shell')?.classList.add('mobile');
  }
}

boot();
