/**
 * PauseScene - Pause overlay with dim and resume option
 */

import Phaser from 'phaser';
import { KennyEasterEgg } from '../utils/KennyEasterEgg';

export class PauseScene extends Phaser.Scene {
  private dimRect?: Phaser.GameObjects.Rectangle;
  private kennys: Phaser.GameObjects.Container[] = []; // Kenny easter egg
  private kennyKeyboardSetup: boolean = false; // Track if keyboard handler is set up

  constructor() {
    super({ key: 'PauseScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Dim overlay
    this.dimRect = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setDepth(1000);

    // Pause text
    this.add
      .text(width / 2, height / 2 - 50, 'PAUSED', {
        fontSize: '48px',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(1001);

    // Resume instructions
    this.add
      .text(width / 2, height / 2 + 50, 'Press ESC to Resume', {
        fontSize: '24px',
        color: '#00ffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(1001);

    // Setup Kenny easter egg (only once)
    if (!this.kennyKeyboardSetup) {
      KennyEasterEgg.setupKeyboardHandler(this, width, height, this.kennys);
      this.kennyKeyboardSetup = true;
    }
    
    // Input handler
    this.input.keyboard!.on('keydown-ESC', () => {
      this.resume();
    });
  }

  update(time: number, delta: number): void {
    // Update Kennys
    const { width, height } = this.cameras.main;
    KennyEasterEgg.updateKennys(this, width, height, delta, this.kennys);
  }

  private resume(): void {
    // Resume game scene
    this.scene.resume('GameScene');
    this.scene.stop();
  }
}


