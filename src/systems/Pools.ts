/**
 * Object pools for bullets, enemies, explosions, and particles
 * Prevents GC spikes by reusing objects
 */

import Phaser from 'phaser';
import type { Bullet } from '../entities/Bullet';
import type { Enemy } from '../entities/Enemy';
import type { PowerUp } from '../entities/PowerUp';

export class BulletPool {
  private pool: Bullet[] = [];
  private active: Set<Bullet> = new Set();

  /**
   * Get a bullet from the pool or create a new one
   */
  get(scene: Phaser.Scene): Bullet | null {
    let bullet = this.pool.pop() || null;

    if (!bullet) {
      // Create new bullet (will be initialized by caller)
      return null;
    }

    this.active.add(bullet);
    return bullet;
  }

  /**
   * Return a bullet to the pool
   */
  release(bullet: Bullet): void {
    if (this.active.has(bullet)) {
      this.active.delete(bullet);
      bullet.setActive(false);
      bullet.setVisible(false);
      this.pool.push(bullet);
    }
  }

  /**
   * Get all active bullets
   */
  getActive(): Bullet[] {
    return Array.from(this.active);
  }

  /**
   * Clear all bullets
   */
  clear(): void {
    this.active.forEach((bullet) => {
      bullet.destroy();
    });
    this.active.clear();
    this.pool.forEach((bullet) => {
      bullet.destroy();
    });
    this.pool = [];
  }
}

export class EnemyPool {
  private pool: Enemy[] = [];
  private active: Set<Enemy> = new Set();

  get(scene: Phaser.Scene, type: string): Enemy | null {
    let enemy = this.pool.pop() || null;

    if (!enemy) {
      return null;
    }

    this.active.add(enemy);
    return enemy;
  }

  release(enemy: Enemy): void {
    if (this.active.has(enemy)) {
      this.active.delete(enemy);
      enemy.setActive(false);
      enemy.setVisible(false);
      this.pool.push(enemy);
    }
  }

  getActive(): Enemy[] {
    return Array.from(this.active);
  }

  clear(): void {
    this.active.forEach((enemy) => {
      enemy.destroy();
    });
    this.active.clear();
    this.pool.forEach((enemy) => {
      enemy.destroy();
    });
    this.pool = [];
  }
}

export class PowerUpPool {
  private pool: PowerUp[] = [];
  private active: Set<PowerUp> = new Set();

  get(scene: Phaser.Scene): PowerUp | null {
    let powerUp = this.pool.pop() || null;

    if (!powerUp) {
      return null;
    }

    this.active.add(powerUp);
    return powerUp;
  }

  release(powerUp: PowerUp): void {
    if (this.active.has(powerUp)) {
      this.active.delete(powerUp);
      powerUp.setActive(false);
      powerUp.setVisible(false);
      this.pool.push(powerUp);
    }
  }

  getActive(): PowerUp[] {
    return Array.from(this.active);
  }

  clear(): void {
    this.active.forEach((powerUp) => {
      powerUp.destroy();
    });
    this.active.clear();
    this.pool.forEach((powerUp) => {
      powerUp.destroy();
    });
    this.pool = [];
  }
}

export class ParticlePool {
  private pool: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private active: Set<Phaser.GameObjects.Particles.ParticleEmitter> = new Set();

  get(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig
  ): Phaser.GameObjects.Particles.ParticleEmitter | null {
    // For particles, we'll create new emitters as needed
    // In a real implementation, you'd pool these differently
    const emitter = scene.add.particles(x, y, 'bullet-player', config);
    this.active.add(emitter);
    return emitter;
  }

  release(emitter: Phaser.GameObjects.Particles.ParticleEmitter): void {
    if (this.active.has(emitter)) {
      this.active.delete(emitter);
      emitter.stop();
      emitter.destroy();
    }
  }

  clear(): void {
    this.active.forEach((emitter) => {
      emitter.stop();
      emitter.destroy();
    });
    this.active.clear();
    this.pool = [];
  }
}

/**
 * Master pool manager
 */
export class Pools {
  bullets = new BulletPool();
  enemies = new EnemyPool();
  powerUps = new PowerUpPool();
  particles = new ParticlePool();

  /**
   * Clear all pools
   */
  clear(): void {
    this.bullets.clear();
    this.enemies.clear();
    this.powerUps.clear();
    this.particles.clear();
  }
}


