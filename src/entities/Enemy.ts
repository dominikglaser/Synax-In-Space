/**
 * Enemy entity with patterns and AI
 */

import Phaser from 'phaser';
import { BALANCER } from '../systems/Balancer';
import { ENEMY_TYPES } from './EnemyTypes';
import type { EnemyPattern } from '../types';
import { RNG } from '../systems/RNG';

export class Enemy extends Phaser.GameObjects.Sprite {
  public hp: number = 0;
  public maxHp: number = 0;
  public pattern: EnemyPattern;
  public enemyType: string;
  public fireTimer: number = 0;
  public patternTime: number = 0;
  public startY: number = 0;
  private rng: RNG;
  private spawnX: number = 0; // Track spawn position
  public reachedEdge: boolean = false; // Has enemy reached the screen edge?
  public edgeX: number = 0; // X position when enemy reached the edge
  public returningToEdge: boolean = false; // Flag for when enemy should return to edge after backtracking

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: string,
    rng: RNG
  ) {
    const enemyData = ENEMY_TYPES[type as keyof typeof ENEMY_TYPES];
    if (!enemyData) {
      throw new Error(`Unknown enemy type: ${type}`);
    }

    // Try to use Kenney sprite if available, fallback to procedural
    let textureKey = enemyData.textureKey;
    let frameKey: string | undefined = undefined;
    
    if (scene.textures.exists('game')) {
      const atlas = scene.textures.get('game');
      const kenneySprite = (enemyData as any).kenneySprite;
      if (atlas.has(kenneySprite)) {
        textureKey = 'game'; // Use atlas as texture
        frameKey = kenneySprite; // Use sprite name as frame
      }
    }

    super(scene, x, y, textureKey, frameKey);
    this.enemyType = type;
    this.pattern = { ...enemyData.pattern };
    this.maxHp = enemyData.hp;
    this.hp = this.maxHp;
    this.startY = y;
    this.rng = rng;

    scene.add.existing(this);
    this.setScale(1);
  }

  /**
   * Initialize enemy at position
   */
  init(x: number, y: number): void {
    this.setPosition(x, y);
    this.spawnX = x;
    this.startY = y;
    this.hp = this.maxHp;
    this.fireTimer = 0;
    this.patternTime = 0;
    this.reachedEdge = false;
    this.edgeX = 0;
    this.returningToEdge = false;
    this.setActive(true);
    this.setVisible(true);
  }

  /**
   * Update enemy movement and firing
   * Returns: true if should fire, 'explode' if should explode, false otherwise
   */
  update(delta: number, playerX: number, playerY: number): boolean | 'explode' {
    const deltaSeconds = delta / 1000;
    this.patternTime += deltaSeconds;

    // Update movement pattern
    this.updateMovement(deltaSeconds, playerX, playerY);

    // Update firing
    this.fireTimer += deltaSeconds;
    const enemyData = ENEMY_TYPES[this.enemyType as keyof typeof ENEMY_TYPES];
    const fireInterval = 1 / enemyData.fireRate;

    if (this.fireTimer >= fireInterval) {
      this.fireTimer = 0;
      return true; // Signal to fire
    }

    // Enemy scrolling is handled by GameScene

    // For chaser enemies: check if should explode when reaching edge after returning
    if (this.pattern.type === 'chaser' && this.returningToEdge) {
      const edgeThreshold = 50;
      if (this.x <= edgeThreshold) {
        // Enemy has returned to edge after backtracking - should explode
        return 'explode';
      }
    }

    // Remove if off screen (left edge) - disappear when they reach the end
    if (this.x < -50) {
      this.setActive(false);
      this.setVisible(false);
      return false;
    }

    return false;
  }

  /**
   * Update movement based on pattern
   * Chaser behavior:
   * 1. Move to screen edge (left side) without following player
   * 2. Once at edge, can backtrack player up to 1/4 screen width
   * 3. After backtracking 1/4 screen width, return to edge and explode
   */
  private updateMovement(deltaSeconds: number, playerX: number, playerY: number): void {
    switch (this.pattern.type) {
      case 'chaser':
        const screenWidth = this.scene.cameras.main.width;
        const edgeThreshold = 50; // Consider edge reached at x = 50
        
        // Always track player vertically (up/down) regardless of phase
        const dy = playerY - this.y;
        const distY = Math.abs(dy);
        if (distY > 0) {
          const verticalSpeed = (dy / distY) * this.pattern.speed;
          this.y += verticalSpeed * deltaSeconds;
        }
        
        // Phase 1: Move to screen edge (don't follow player backwards yet)
        // Enemy is already being scrolled by GameScene, so we just need to check if we've reached edge
        if (!this.reachedEdge) {
          // Check if reached edge (note: enemy is being scrolled left by GameScene)
          if (this.x <= edgeThreshold) {
            this.reachedEdge = true;
            this.edgeX = this.x;
          }
          return; // Horizontal movement handled by scrolling, vertical already handled above
        }
        
        // Phase 2: Enemy is at edge, can backtrack player
        if (!this.returningToEdge) {
          // Check backward distance from edge
          const backwardDistance = this.x - this.edgeX; // How far right (backwards) from edge
          const maxBackwardDistance = screenWidth * 0.25;
          
          if (backwardDistance >= maxBackwardDistance) {
            // Has backtracked 1/4 screen width, must return to edge
            this.returningToEdge = true;
          } else {
            // Can still backtrack - follow player horizontally
            const dx = playerX - this.x;
            const distX = Math.abs(dx);
            if (distX > 0) {
              const horizontalSpeed = (dx / distX) * this.pattern.speed;
              this.x += horizontalSpeed * deltaSeconds;
            }
            // Vertical tracking already handled above
          }
        } else {
          // Phase 3: Returning to edge after backtracking
          // Move forward toward screen edge (left side, decreasing X)
          this.x -= this.pattern.speed * deltaSeconds * 1.5; // Move faster when returning
          // Vertical tracking already handled above
        }
        break;

      case 'turret':
        // Move slowly forward, stop to fire
        this.x -= this.pattern.speed * deltaSeconds * 0.5;
        break;

      case 'sine':
        // Sine wave pattern
        if (this.pattern.amplitude && this.pattern.frequency) {
          const offset = Math.sin(this.patternTime * this.pattern.frequency) * this.pattern.amplitude;
          this.y = this.startY + offset;
        }
        this.x -= this.pattern.speed * deltaSeconds;
        break;
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
   * Check if should drop power-up
   */
  shouldDropPowerUp(): 'weapon' | 'bomb' | 'health' | 'shield' | null {
    const roll = this.rng.random();
    if (roll < BALANCER.dropRates.weapon) {
      return 'weapon';
    }
    if (roll < BALANCER.dropRates.weapon + BALANCER.dropRates.bomb) {
      return 'bomb';
    }
    if (roll < BALANCER.dropRates.weapon + BALANCER.dropRates.bomb + BALANCER.dropRates.health) {
      return 'health';
    }
    if (roll < BALANCER.dropRates.weapon + BALANCER.dropRates.bomb + BALANCER.dropRates.health + BALANCER.dropRates.shield) {
      return 'shield';
    }
    return null;
  }
}


