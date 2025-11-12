/**
 * Bullet entity for player and enemy projectiles
 */

import Phaser from 'phaser';
import { BALANCER } from '../systems/Balancer';

export class Bullet extends Phaser.GameObjects.Sprite {
  public speed: number = 0;
  public damage: number = 0;
  public isPlayerBullet: boolean = false;
  public angle: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    isPlayer: boolean,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame);
    this.isPlayerBullet = isPlayer;
    scene.add.existing(this);

    // Only tint if using procedural sprites (not Kenney assets)
    if (!frame) {
      if (isPlayer) {
        this.setTint(0x00ffff);
      } else {
        this.setTint(0xff0000);
      }
    }
    this.damage = BALANCER.bulletDamage;
  }

  /**
   * Initialize bullet with speed and angle
   */
  init(x: number, y: number, angle: number, speed: number, damage: number): void {
    this.setPosition(x, y);
    this.setRotation(angle);
    this.angle = angle;
    this.speed = speed;
    this.damage = damage;
    this.setActive(true);
    this.setVisible(true);
    
    // For player bullets, keep original hitbox size even though visual is smaller
    if (this.isPlayerBullet) {
      this.setSize(8, 16); // Maintain original hitbox size
    }
  }

  /**
   * Update bullet position
   */
  update(delta: number): void {
    const deltaSeconds = delta / 1000;
    const dx = Math.cos(this.angle) * this.speed * deltaSeconds;
    const dy = Math.sin(this.angle) * this.speed * deltaSeconds;

    this.x += dx;
    this.y += dy;

    // Remove if off screen
    if (
      this.x < -100 ||
      this.x > this.scene.cameras.main.width + 100 ||
      this.y < -100 ||
      this.y > this.scene.cameras.main.height + 100
    ) {
      this.setActive(false);
      this.setVisible(false);
    }
  }
}


