/**
 * Power-up entity (weapon, bomb, health)
 */

import Phaser from 'phaser';
// BALANCER available if needed for future balance adjustments
// import { BALANCER } from '../systems/Balancer';
import type { PowerUpType } from '../types';
import { getKenneySprite } from '../config/AssetMappings';

export class PowerUp extends Phaser.GameObjects.Sprite {
  public powerUpType: PowerUpType;
  public value: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PowerUpType) {
    // Try to use Kenney power-up sprite if available
    let textureKey = 'powerup-weapon';
    let kenneySprite = '';
    
    if (type.type === 'bomb') {
      textureKey = 'powerup-bomb';
      kenneySprite = getKenneySprite('powerUpBomb', 0);
    } else if (type.type === 'health') {
      textureKey = 'powerup-health';
      kenneySprite = getKenneySprite('powerUpHealth', 0);
    } else if (type.type === 'shield') {
      textureKey = 'powerup-shield';
      kenneySprite = getKenneySprite('powerUpShield', 0);
    } else {
      kenneySprite = getKenneySprite('powerUpWeapon', 0);
    }

    // Check if Kenney sprite is available
    let frameKey: string | undefined = undefined;
    if (kenneySprite && scene.textures.exists('game')) {
      const atlas = scene.textures.get('game');
      if (atlas.has(kenneySprite)) {
        textureKey = 'game'; // Use atlas as texture
        frameKey = kenneySprite; // Use sprite name as frame
      }
    }

    super(scene, x, y, textureKey, frameKey);
    this.powerUpType = type;
    this.value = type.value;
    scene.add.existing(this);

    // Add floating animation
    scene.tweens.add({
      targets: this,
      y: this.y - 20,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Update power-up position (scrolling handled by GameScene)
   */
  update(_delta: number): void {
    // Scrolling is handled by GameScene to support boss fight pausing
    // Remove if off screen
    if (this.x < -100) {
      this.setActive(false);
      this.setVisible(false);
    }
  }
}


