/**
 * BootScene - Initial setup and canvas creation
 */

import Phaser from 'phaser';
// GAME_CONFIG available if needed in future
// import { GAME_CONFIG } from '../config/constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    // Set up camera
    this.cameras.main.setBackgroundColor(0x000000);

    // Start preload scene
    this.scene.start('PreloadScene');
  }
}


