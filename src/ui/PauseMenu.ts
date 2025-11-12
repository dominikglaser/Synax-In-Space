/**
 * Pause Menu using rex-plugins UI components
 */

import Phaser from 'phaser';

export class PauseMenu {
  private scene: Phaser.Scene;
  private container?: Phaser.GameObjects.Container;
  private isVisible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show pause menu
   */
  show(): void {
    if (this.isVisible) {
      return;
    }

    const { width, height } = this.scene.scale;

    // Dark overlay
    const overlay = this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setDepth(2000)
      .setInteractive();

    // Pause text
    const pauseText = this.scene.add
      .text(width / 2, height / 2 - 100, 'PAUSED', {
        fontSize: '48px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(2001);

    // Resume instruction
    const resumeText = this.scene.add
      .text(width / 2, height / 2 + 50, 'Press ESC to Resume', {
        fontSize: '24px',
        fontFamily: 'monospace',
        color: '#00ffff',
      })
      .setOrigin(0.5)
      .setDepth(2001);

    // Menu instruction
    const menuText = this.scene.add
      .text(width / 2, height / 2 + 100, 'Press M for Main Menu', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#888888',
      })
      .setOrigin(0.5)
      .setDepth(2001);

    this.container = this.scene.add
      .container(0, 0, [overlay, pauseText, resumeText, menuText])
      .setDepth(2000);

    this.isVisible = true;
  }

  /**
   * Hide pause menu
   */
  hide(): void {
    if (!this.isVisible || !this.container) {
      return;
    }

    this.container.destroy();
    this.container = undefined;
    this.isVisible = false;
  }

  /**
   * Check if visible
   */
  get visible(): boolean {
    return this.isVisible;
  }
}

