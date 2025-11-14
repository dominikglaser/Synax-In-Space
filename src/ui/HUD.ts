/**
 * HUD using rex-plugins UI components
 */

import Phaser from 'phaser';

export interface HUDData {
  score: number;
  lives: number;
  weaponTier: number;
  bombs: number;
  hp?: number;
  maxHp?: number;
}

export class HUD {
  private scene: Phaser.Scene;
  private scoreText?: Phaser.GameObjects.Text;
  private livesText?: Phaser.GameObjects.Text;
  private weaponText?: Phaser.GameObjects.Text;
  private bombsText?: Phaser.GameObjects.Text;
  private hpBar?: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    const padding = 20;
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
    };

    // Score
    this.scoreText = this.scene.add
      .text(padding, padding, 'SCORE: 0000000', style)
      .setDepth(1000)
      .setOrigin(0, 0);

    // Lives
    this.livesText = this.scene.add
      .text(padding, padding + 30, 'LIVES: 3', style)
      .setDepth(1000)
      .setOrigin(0, 0);

    // Weapon tier
    this.weaponText = this.scene.add
      .text(padding, padding + 60, 'WEAPON: I', style)
      .setDepth(1000)
      .setOrigin(0, 0);

    // Bombs
    this.bombsText = this.scene.add
      .text(padding, padding + 90, 'BOMBS: 3', style)
      .setDepth(1000)
      .setOrigin(0, 0);

    // HP Bar (optional, for boss fights)
    this.hpBar = this.scene.add.graphics().setDepth(1000);
  }

  /**
   * Update HUD with current data
   */
  update(data: HUDData): void {
    if (this.scoreText) {
      this.scoreText.setText(`SCORE: ${data.score.toString().padStart(7, '0')}`);
    }
    if (this.livesText) {
      this.livesText.setText(`LIVES: ${data.lives}`);
    }
    if (this.weaponText) {
      const maxTier = 6; // Maximum weapon tier
      if (data.weaponTier >= maxTier) {
        this.weaponText.setText('WEAPON: MAX LEVEL');
      } else {
        const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI'];
        const tier = romanNumerals[data.weaponTier] ?? 'I';
        this.weaponText.setText(`WEAPON: ${tier}`);
      }
    }
    if (this.bombsText) {
      this.bombsText.setText(`BOMBS: ${data.bombs}`);
    }

    // Update HP bar if provided
    if (this.hpBar && data.hp !== undefined && data.maxHp !== undefined) {
      const { width } = this.scene.scale;
      const barWidth = 400;
      const barHeight = 20;
      const x = width / 2 - barWidth / 2;
      const y = 20;
      const hpRatio = data.hp / data.maxHp;

      this.hpBar.clear();
      // Background
      this.hpBar.fillStyle(0x333333);
      this.hpBar.fillRect(x, y, barWidth, barHeight);
      // HP bar
      this.hpBar.fillStyle(0xff0000);
      this.hpBar.fillRect(x, y, barWidth * hpRatio, barHeight);
      // Border
      this.hpBar.lineStyle(2, 0xffffff);
      this.hpBar.strokeRect(x, y, barWidth, barHeight);
    }
  }

  /**
   * Destroy HUD
   */
  destroy(): void {
    this.scoreText?.destroy();
    this.livesText?.destroy();
    this.weaponText?.destroy();
    this.bombsText?.destroy();
    this.hpBar?.destroy();
  }
}

