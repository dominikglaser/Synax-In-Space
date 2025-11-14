/**
 * Player entity with movement, shooting, charge shot, bombs
 */

import Phaser from 'phaser';
import { BALANCER, WEAPON_SPECS, getBulletCountForTier, getSpreadAngleForBulletCount } from '../systems/Balancer';
import type { WeaponSpec } from '../types';
import { getKenneySprite } from '../config/AssetMappings';

export class Player extends Phaser.GameObjects.Sprite {
  public lives: number = BALANCER.playerLives;
  public weaponTier: number = 0;
  public bombs: number = BALANCER.bombsStart;
  public shields: number = 1; // Start with 1 shield, max 5
  public chargeTime: number = 0;
  public iframeTimer: number = 0;
  public isInvincible: boolean = false;
  public shieldTimer: number = 0; // Timer for active shield (in milliseconds)
  public isShielded: boolean = false;
  public speed: number = BALANCER.playerSpeed;
  private shieldGraphics?: Phaser.GameObjects.Graphics;
  private shieldPulseTime: number = 0; // Time accumulator for shield pulse effect
  private engineFireEmitter1?: Phaser.GameObjects.Particles.ParticleEmitter;
  private engineFireEmitter2?: Phaser.GameObjects.Particles.ParticleEmitter;
  private engineSmokeEmitter1?: Phaser.GameObjects.Particles.ParticleEmitter;
  private engineSmokeEmitter2?: Phaser.GameObjects.Particles.ParticleEmitter;
  private logo?: Phaser.GameObjects.Image; // Company logo on player ship

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Try to use Kenney player sprite if available
    let textureKey = 'player';
    let frameKey: string | undefined = undefined;
    
    if (scene.textures.exists('game')) {
      const atlas = scene.textures.get('game');
      const kenneyPlayer = getKenneySprite('player', 0);
      if (atlas.has(kenneyPlayer)) {
        textureKey = 'game'; // Use atlas as texture
        frameKey = kenneyPlayer; // Use sprite name as frame
      }
    }
    
    super(scene, x, y, textureKey, frameKey);
    scene.add.existing(this);
    this.setScale(1);
    
    // Create shield visual effect
    this.shieldGraphics = scene.add.graphics();
    this.shieldGraphics.setDepth(9); // Just below player
    this.updateShieldVisual();
    
    // Create engine fire and smoke effects
    this.createEngineEffects(scene);
    
    // Add company logo overlay on the player ship (miniature version)
    if (scene.textures.exists('company-logo')) {
      const logoSize = Math.max(this.width, this.height) * 0.25; // 25% of ship size
      this.logo = scene.add.image(0, 0, 'company-logo');
      this.logo.setDisplaySize(logoSize, logoSize);
      this.logo.setDepth(11); // Slightly in front of player (player is depth 10)
      this.logo.setOrigin(0.5, 0.5); // Center the logo
      this.logo.setAlpha(0.9); // Slightly transparent
      // Logo will be positioned relative to player in update method
    }
  }
  
  /**
   * Create engine fire and smoke particle effects
   */
  private createEngineEffects(scene: Phaser.Scene): void {
    // Engine positions (relative to sprite center)
    const engineY1 = -9; // Top engine
    const engineY2 = 9;  // Bottom engine
    
    // Create fire particles for engine 1
    // In Phaser: 0 = right, 90 = down, 180 = left, 270 = up
    // Engines point left (180 degrees), with some spread
    this.engineFireEmitter1 = scene.add.particles(0, engineY1, 'bullet-player', {
      speed: { min: 30, max: 60 },
      scale: { start: 0.4, end: 0 },
      lifespan: 150,
      quantity: 4,
      tint: [0xffff00, 0xff6600, 0xff0000], // Yellow to orange to red
      angle: { min: 170, max: 190 }, // Pointing left (180°) with spread
      emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 2), quantity: 1 },
      blendMode: 'ADD',
    });
    this.engineFireEmitter1.setDepth(8); // Below player, above background
    
    // Create fire particles for engine 2
    this.engineFireEmitter2 = scene.add.particles(0, engineY2, 'bullet-player', {
      speed: { min: 30, max: 60 },
      scale: { start: 0.4, end: 0 },
      lifespan: 150,
      quantity: 4,
      tint: [0xffff00, 0xff6600, 0xff0000], // Yellow to orange to red
      angle: { min: 170, max: 190 }, // Pointing left with spread
      emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 2), quantity: 1 },
      blendMode: 'ADD',
    });
    this.engineFireEmitter2.setDepth(8);
    
    // Create smoke particles for engine 1
    this.engineSmokeEmitter1 = scene.add.particles(0, engineY1, 'bullet-player', {
      speed: { min: 20, max: 40 },
      scale: { start: 0.3, end: 0.8 },
      lifespan: 500,
      quantity: 3,
      tint: [0x333333, 0x555555, 0x222222], // Dark grey smoke variations
      alpha: { start: 0.7, end: 0 },
      angle: { min: 165, max: 195 }, // Wider spread for smoke
      emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 2), quantity: 1 },
      blendMode: 'NORMAL',
    });
    this.engineSmokeEmitter1.setDepth(7); // Below fire
    
    // Create smoke particles for engine 2
    this.engineSmokeEmitter2 = scene.add.particles(0, engineY2, 'bullet-player', {
      speed: { min: 20, max: 40 },
      scale: { start: 0.3, end: 0.8 },
      lifespan: 500,
      quantity: 3,
      tint: [0x333333, 0x555555, 0x222222], // Dark grey smoke variations
      alpha: { start: 0.7, end: 0 },
      angle: { min: 165, max: 195 }, // Wider spread for smoke
      emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 2), quantity: 1 },
      blendMode: 'NORMAL',
    });
    this.engineSmokeEmitter2.setDepth(7);
  }

  /**
   * Get current weapon spec (supports unlimited tiers)
   */
  getWeaponSpec(): WeaponSpec {
    const baseTier = Math.min(this.weaponTier, WEAPON_SPECS.length - 1);
    const baseSpec = WEAPON_SPECS[baseTier]!;
    
    // Always calculate bullet count and spread dynamically based on tier
    const bulletCount = getBulletCountForTier(this.weaponTier);
    const spreadAngle = getSpreadAngleForBulletCount(bulletCount);
    
    // For tiers beyond the base specs, scale stats up
    if (this.weaponTier >= WEAPON_SPECS.length) {
      return {
        ...baseSpec,
        bulletCount,
        spreadAngle,
        fireRate: baseSpec.fireRate + (this.weaponTier - baseTier) * 0.5,
        damage: baseSpec.damage + (this.weaponTier - baseTier) * 1,
        bulletSpeed: baseSpec.bulletSpeed + (this.weaponTier - baseTier) * 50,
      };
    }
    
    // For base tiers, use calculated bullet count and spread
    return {
      ...baseSpec,
      bulletCount,
      spreadAngle,
    };
  }

  /**
   * Update player state
   */
  update(delta: number): void {
    // Update shield timer
    if (this.shieldTimer > 0) {
      this.shieldTimer -= delta;
      this.isShielded = this.shieldTimer > 0;
      this.shieldPulseTime += delta;
      
      if (!this.isShielded) {
        // Shield expired
        this.shieldTimer = 0;
        this.shieldPulseTime = 0;
      }
    } else {
      this.isShielded = false;
      this.shieldPulseTime = 0;
    }
    
    // Always update shield visual to track player position
    this.updateShieldVisual();

    // Update invincibility timer
    if (this.iframeTimer > 0) {
      this.iframeTimer -= delta;
      this.isInvincible = this.iframeTimer > 0;

      // Flash effect during i-frames
      if (this.isInvincible) {
        this.setAlpha(Math.floor(this.iframeTimer / 100) % 2);
      } else {
        this.setAlpha(1);
      }
    } else {
      this.isInvincible = false;
      this.setAlpha(1);
    }
    
    // Update engine effects position
    this.updateEngineEffects();
    
    // Update logo position to follow player
    if (this.logo) {
      this.logo.setPosition(this.x, this.y);
      this.logo.setRotation(this.rotation); // Rotate with ship
      // Match player's alpha (for invincibility flashing effect)
      this.logo.setAlpha(this.alpha * 0.9); // Slightly more transparent than player
    }
  }
  
  /**
   * Update engine fire and smoke particle positions
   */
  private updateEngineEffects(): void {
    // Engine positions relative to sprite center (left side, pointing left)
    const engineX = -6; // Left side of ship
    const engineY1 = -9; // Top engine
    const engineY2 = 9;  // Bottom engine
    
    // Update fire emitter positions
    if (this.engineFireEmitter1) {
      this.engineFireEmitter1.setPosition(this.x + engineX, this.y + engineY1);
    }
    if (this.engineFireEmitter2) {
      this.engineFireEmitter2.setPosition(this.x + engineX, this.y + engineY2);
    }
    
    // Update smoke emitter positions
    if (this.engineSmokeEmitter1) {
      this.engineSmokeEmitter1.setPosition(this.x + engineX, this.y + engineY1);
    }
    if (this.engineSmokeEmitter2) {
      this.engineSmokeEmitter2.setPosition(this.x + engineX, this.y + engineY2);
    }
  }

  /**
   * Take damage
   */
  takeDamage(): void {
    if (this.isInvincible) {
      return;
    }
    
    // Shield blocks all damage
    if (this.isShielded) {
      return;
    }

    this.lives--;
    this.iframeTimer = BALANCER.playerIFramesMs;
    this.isInvincible = true;
  }
  
  /**
   * Activate shield (5 seconds duration)
   */
  activateShield(): boolean {
    if (this.shields > 0 && !this.isShielded) {
      this.shields--;
      this.shieldTimer = 5000; // 5 seconds in milliseconds
      this.isShielded = true;
      this.updateShieldVisual();
      return true;
    }
    return false;
  }
  
  /**
   * Get shield radius for collision detection
   */
  getShieldRadius(): number {
    if (!this.isShielded) {
      return 0;
    }
    return Math.max(this.width, this.height) * 0.8; // Match visual radius
  }
  
  /**
   * Add shield (max 5)
   */
  addShield(): void {
    if (this.shields < 5) {
      this.shields++;
    }
  }
  
  /**
   * Update shield visual effect (blue sphere around ship)
   */
  private updateShieldVisual(): void {
    if (!this.shieldGraphics) {
      return;
    }
    
    this.shieldGraphics.clear();
    
    if (this.isShielded) {
      const radius = Math.max(this.width, this.height) * 0.8; // Slightly larger than ship
      const alpha = 0.6 + Math.sin(this.shieldPulseTime / 200) * 0.2; // Pulsing effect
      
      // Draw blue sphere
      this.shieldGraphics.lineStyle(2, 0x4488ff, alpha);
      this.shieldGraphics.fillStyle(0x4488ff, alpha * 0.3);
      this.shieldGraphics.beginPath();
      this.shieldGraphics.arc(this.x, this.y, radius, 0, Math.PI * 2);
      this.shieldGraphics.fillPath();
      this.shieldGraphics.strokePath();
      
      // Additional outer ring for effect
      this.shieldGraphics.lineStyle(1, 0x66aaff, alpha * 0.5);
      this.shieldGraphics.beginPath();
      this.shieldGraphics.arc(this.x, this.y, radius + 2, 0, Math.PI * 2);
      this.shieldGraphics.strokePath();
    }
  }

  /**
   * Add charge time (call when holding fire button)
   */
  addChargeTime(delta: number): void {
    this.chargeTime += delta;
  }

  /**
   * Reset charge time (call when releasing fire button)
   */
  resetChargeTime(): void {
    this.chargeTime = 0;
  }

  /**
   * Check if charge shot is ready
   */
  isChargeShotReady(): boolean {
    return this.chargeTime >= BALANCER.playerChargeShotTime;
  }

  /**
   * Upgrade weapon (capped at 6 upgrades / tier 6)
   */
  upgradeWeapon(): void {
    const maxTier = 6; // Cap at tier 6 (6 upgrades from tier 0)
    if (this.weaponTier < maxTier) {
      this.weaponTier++;
    }
  }

  /**
   * Add bomb
   */
  addBomb(): void {
    this.bombs++;
  }

  /**
   * Use bomb
   */
  useBomb(): boolean {
    if (this.bombs > 0) {
      this.bombs--;
      return true;
    }
    return false;
  }

  /**
   * Add life (can increase up to max lives via power-ups)
   */
  addLife(): void {
    if (this.lives < BALANCER.playerMaxLives) {
      this.lives++;
    }
  }

  /**
   * Check if player is alive
   */
  isAlive(): boolean {
    return this.lives > 0;
  }
  
  /**
   * Clean up shield graphics when player is destroyed
   */
  destroy(): void {
    this.shieldGraphics?.destroy();
    this.engineFireEmitter1?.destroy();
    this.engineFireEmitter2?.destroy();
    this.engineSmokeEmitter1?.destroy();
    this.engineSmokeEmitter2?.destroy();
    this.logo?.destroy(); // Clean up logo
    super.destroy();
  }
}


