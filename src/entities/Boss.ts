/**
 * Boss entity with multiple phases
 */

import Phaser from 'phaser';
import { BALANCER } from '../systems/Balancer';
import { RNG } from '../systems/RNG';
// BossPhase type imported for future use
// import type { BossPhase } from '../types';
import { getKenneySprite } from '../config/AssetMappings';

export class Boss extends Phaser.GameObjects.Sprite {
  public hp: number = BALANCER.bossHP;
  public maxHp: number = BALANCER.bossHP;
  public currentPhase: number = 0;
  public fireTimer: number = 0;
  public patternTime: number = 0;
  public startX: number = 0;
  public startY: number = 0;
  // RNG available if needed for future boss behavior
  // private _rng: RNG;

  constructor(scene: Phaser.Scene, x: number, y: number, _rng: RNG) {
    // Try to use Kenney boss sprite if available
    let textureKey = 'enemy-turret'; // Fallback to turret sprite
    let frameKey: string | undefined = undefined;
    
    if (scene.textures.exists('game')) {
      const atlas = scene.textures.get('game');
      const kenneyBoss = getKenneySprite('boss', 0);
      if (atlas.has(kenneyBoss)) {
        textureKey = 'game'; // Use atlas as texture
        frameKey = kenneyBoss; // Use sprite name as frame
      }
    }
    
    super(scene, x, y, textureKey, frameKey);
    // RNG stored if needed for future boss behavior
    // this._rng = rng;
    this.startX = x;
    this.startY = y;
    scene.add.existing(this);
    this.setScale(2.5); // Boss is larger
    
    // Only tint if using procedural sprite (not Kenney assets)
    if (!frameKey) {
      this.setTint(0xff0000); // Red tint to distinguish
    }
  }

  /**
   * Initialize boss
   */
  init(x: number, y: number): void {
    this.setPosition(x, y);
    this.startX = x;
    this.startY = y;
    this.hp = this.maxHp; // Use maxHp set by GameScene
    this.currentPhase = 0;
    this.fireTimer = 0;
    this.patternTime = 0;
    this.setActive(true);
    this.setVisible(true);
  }

  /**
   * Update boss movement and firing
   */
  update(delta: number, playerX: number, playerY: number): boolean {
    const deltaSeconds = delta / 1000;
    this.patternTime += deltaSeconds;

    // Check phase transitions
    const hpRatio = this.hp / this.maxHp;
    for (let i = BALANCER.bossHPPhases.length - 1; i >= 0; i--) {
      if (hpRatio <= BALANCER.bossHPPhases[i] && this.currentPhase < i + 1) {
        this.currentPhase = i + 1;
        break;
      }
    }

    // Update movement based on phase
    this.updateMovement(deltaSeconds, playerX, playerY);

    // Update firing
    this.fireTimer += deltaSeconds;
    const fireInterval = 1 / BALANCER.bossFireRate;

    if (this.fireTimer >= fireInterval) {
      this.fireTimer = 0;
      return true; // Signal to fire
    }

    return false;
  }

  /**
   * Update movement pattern based on phase
   */
  private updateMovement(
    deltaSeconds: number,
    playerX: number,
    playerY: number
  ): void {
    switch (this.currentPhase) {
      case 0:
        // Phase 1: Move in sine wave
        this.y = this.startY + Math.sin(this.patternTime * 2) * 100;
        break;

      case 1: {
        // Phase 2: Move towards player slowly
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          this.x += (dx / dist) * BALANCER.bossSpeed * deltaSeconds * 0.5;
          this.y += (dy / dist) * BALANCER.bossSpeed * deltaSeconds * 0.5;
        }
        break;
      }

      case 2: {
        // Phase 3: Aggressive movement
        const dx2 = playerX - this.x;
        const dy2 = playerY - this.y;
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (dist2 > 0) {
          this.x += (dx2 / dist2) * BALANCER.bossSpeed * deltaSeconds;
          this.y += (dy2 / dist2) * BALANCER.bossSpeed * deltaSeconds;
        }
        break;
      }
    }
  }

  /**
   * Take damage
   */
  takeDamage(amount: number): boolean {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      return true; // Dead
    }
    return false;
  }

  /**
   * Get fire pattern for current phase (more complex patterns)
   */
  getFirePattern(playerX: number, playerY: number): {
    angle: number;
    speed: number;
  }[] {
    const bullets: { angle: number; speed: number }[] = [];

    switch (this.currentPhase) {
      case 0: {
        // Phase 1: Targeted shot + side spread
        const angle = Math.atan2(playerY - this.y, playerX - this.x);
        bullets.push({ angle, speed: BALANCER.bossBulletSpeed });
        // Add side shots
        bullets.push({ angle: angle - Math.PI / 6, speed: BALANCER.bossBulletSpeed * 0.8 });
        bullets.push({ angle: angle + Math.PI / 6, speed: BALANCER.bossBulletSpeed * 0.8 });
        break;
      }

      case 1: {
        // Phase 2: Wide spread + targeted
        const baseAngle = Math.atan2(playerY - this.y, playerX - this.x);
        // Targeted shot
        bullets.push({ angle: baseAngle, speed: BALANCER.bossBulletSpeed });
        // Wide spread
        for (let i = -2; i <= 2; i++) {
          bullets.push({
            angle: baseAngle + (i * Math.PI) / 6,
            speed: BALANCER.bossBulletSpeed * 0.9,
          });
        }
        break;
      }

      case 2: {
        // Phase 3: Complex pattern - spiral + targeted
        const baseAngle2 = Math.atan2(playerY - this.y, playerX - this.x);
        // Targeted shots
        bullets.push({ angle: baseAngle2, speed: BALANCER.bossBulletSpeed * 1.1 });
        bullets.push({ angle: baseAngle2 - Math.PI / 12, speed: BALANCER.bossBulletSpeed });
        bullets.push({ angle: baseAngle2 + Math.PI / 12, speed: BALANCER.bossBulletSpeed });
        // Wide spread
        for (let i = -3; i <= 3; i++) {
          bullets.push({
            angle: baseAngle2 + (i * Math.PI) / 10,
            speed: BALANCER.bossBulletSpeed * 1.1,
          });
        }
        // Side shots
        bullets.push({ angle: baseAngle2 - Math.PI / 3, speed: BALANCER.bossBulletSpeed * 0.8 });
        bullets.push({ angle: baseAngle2 + Math.PI / 3, speed: BALANCER.bossBulletSpeed * 0.8 });
        break;
      }
    }

    return bullets;
  }

  /**
   * Check if boss is alive
   */
  isAlive(): boolean {
    return this.hp > 0;
  }
}


