/**
 * BootScene - Initial setup and canvas creation
 */

import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/constants';

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


