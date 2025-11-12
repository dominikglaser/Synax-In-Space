/**
 * Main entry point for Synax In Space
 */

import Phaser from 'phaser';
import { GAME_CONFIG } from './config/constants';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { IntroScene } from './scenes/IntroScene';
import { GameScene } from './scenes/GameScene';
import { HUDScene } from './scenes/HUDScene';
import { PauseScene } from './scenes/PauseScene';
import { EndScene } from './scenes/EndScene';
import { DeathScene } from './scenes/DeathScene';

console.log('%cSYNAX IN SPACE', 'font-size: 24px; font-weight: bold; color: #00ffff;');
console.log('Phaser 3 + TypeScript Side-Scrolling Shooter');

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.width,
  height: GAME_CONFIG.height,
  parent: 'game-container',
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  input: {
    keyboard: true, // Explicitly enable keyboard input
  },
  scene: [BootScene, PreloadScene, MenuScene, IntroScene, GameScene, HUDScene, PauseScene, EndScene, DeathScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);


