/**
 * Collision system with broadphase grid
 */

import { GAME_CONFIG } from '../config/constants';
import { circleCollision, circleAabbCollision } from '../utils/math';
import type { Bullet } from '../entities/Bullet';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { PowerUp } from '../entities/PowerUp';
import type { Boss } from '../entities/Boss';

export class CollisionSystem {
  private gridSize: number = GAME_CONFIG.collisionGridSize;

  /**
   * Check collision between shield and enemy bullets
   * Returns bullets that hit the shield
   */
  checkShieldBulletCollision(
    player: Player,
    enemyBullets: Bullet[]
  ): Bullet[] {
    if (!player.isShielded) {
      return [];
    }

    const shieldRadius = player.getShieldRadius();
    if (shieldRadius <= 0) {
      return [];
    }

    const shieldCircle = {
      x: player.x,
      y: player.y,
      radius: shieldRadius,
    };

    const hitBullets: Bullet[] = [];

    for (const bullet of enemyBullets) {
      if (!bullet.active) continue;

      const bulletCircle = {
        x: bullet.x,
        y: bullet.y,
        radius: bullet.width / 2,
      };

      if (circleCollision(bulletCircle, shieldCircle)) {
        hitBullets.push(bullet);
      }
    }

    return hitBullets;
  }

  /**
   * Check collision between player and enemy bullets
   */
  checkPlayerBulletCollision(
    player: Player,
    enemyBullets: Bullet[]
  ): Bullet | null {
    if (player.isInvincible) {
      return null;
    }

    const playerBounds = {
      x: player.x - player.width / 2,
      y: player.y - player.height / 2,
      width: player.width,
      height: player.height,
    };

    for (const bullet of enemyBullets) {
      if (!bullet.active) continue;

      const bulletCircle = {
        x: bullet.x,
        y: bullet.y,
        radius: bullet.width / 2,
      };

      if (circleAabbCollision(bulletCircle, playerBounds)) {
        return bullet;
      }
    }

    return null;
  }

  /**
   * Check collision between player bullets and enemies
   * Only checks collisions when enemies are visible on screen
   */
  checkBulletEnemyCollision(
    playerBullets: Bullet[],
    enemies: Enemy[],
    screenWidth: number,
    screenHeight: number
  ): { bullet: Bullet; enemy: Enemy } | null {
    for (const bullet of playerBullets) {
      if (!bullet.active || !bullet.isPlayerBullet) continue;

      const bulletCircle = {
        x: bullet.x,
        y: bullet.y,
        radius: bullet.width / 2,
      };

      for (const enemy of enemies) {
        if (!enemy.active) continue;

        // Check if enemy is visible on screen before checking collision
        const enemyHalfWidth = enemy.displayWidth / 2;
        const enemyHalfHeight = enemy.displayHeight / 2;
        
        // Enemy must be at least partially visible on screen
        const isOnScreen = 
          enemy.x + enemyHalfWidth >= 0 && // Right edge not past left screen edge
          enemy.x - enemyHalfWidth <= screenWidth && // Left edge not past right screen edge
          enemy.y + enemyHalfHeight >= 0 && // Bottom edge not past top screen edge
          enemy.y - enemyHalfHeight <= screenHeight; // Top edge not past bottom screen edge
        
        if (!isOnScreen) continue; // Skip collision check if enemy is off-screen

        const enemyCircle = {
          x: enemy.x,
          y: enemy.y,
          radius: enemy.width / 2,
        };

        if (circleCollision(bulletCircle, enemyCircle)) {
          return { bullet, enemy };
        }
      }
    }

    return null;
  }

  /**
   * Check collision between player bullets and boss
   */
  checkBulletBossCollision(
    playerBullets: Bullet[],
    boss: Boss | null
  ): { bullet: Bullet; boss: Boss } | null {
    if (!boss || !boss.active) {
      return null;
    }

    for (const bullet of playerBullets) {
      if (!bullet.active || !bullet.isPlayerBullet) continue;

      const bulletCircle = {
        x: bullet.x,
        y: bullet.y,
        radius: bullet.width / 2,
      };

      const bossCircle = {
        x: boss.x,
        y: boss.y,
        radius: boss.width / 2,
      };

      if (circleCollision(bulletCircle, bossCircle)) {
        return { bullet, boss };
      }
    }

    return null;
  }

  /**
   * Check collision between player and enemies
   */
  checkPlayerEnemyCollision(player: Player, enemies: Enemy[]): Enemy | null {
    if (player.isInvincible) {
      return null;
    }

    const playerBounds = {
      x: player.x - player.width / 2,
      y: player.y - player.height / 2,
      width: player.width,
      height: player.height,
    };

    for (const enemy of enemies) {
      if (!enemy.active) continue;

      const enemyCircle = {
        x: enemy.x,
        y: enemy.y,
        radius: enemy.width / 2,
      };

      if (circleAabbCollision(enemyCircle, playerBounds)) {
        return enemy;
      }
    }

    return null;
  }

  /**
   * Check collision between player and boss
   */
  checkPlayerBossCollision(player: Player, boss: Boss | null): boolean {
    if (!boss || !boss.active || player.isInvincible) {
      return false;
    }

    const playerBounds = {
      x: player.x - player.width / 2,
      y: player.y - player.height / 2,
      width: player.width,
      height: player.height,
    };

    const bossCircle = {
      x: boss.x,
      y: boss.y,
      radius: boss.width / 2,
    };

    return circleAabbCollision(bossCircle, playerBounds);
  }

  /**
   * Check collision between player and power-ups
   */
  checkPlayerPowerUpCollision(
    player: Player,
    powerUps: PowerUp[]
  ): PowerUp | null {
    const playerBounds = {
      x: player.x - player.width / 2,
      y: player.y - player.height / 2,
      width: player.width,
      height: player.height,
    };

    for (const powerUp of powerUps) {
      if (!powerUp.active) continue;

      const powerUpCircle = {
        x: powerUp.x,
        y: powerUp.y,
        radius: powerUp.width / 2,
      };

      if (circleAabbCollision(powerUpCircle, playerBounds)) {
        return powerUp;
      }
    }

    return null;
  }

  /**
   * Check if bomb clears enemies/bullets in radius
   */
  getEnemiesInRadius(
    centerX: number,
    centerY: number,
    radius: number,
    enemies: Enemy[]
  ): Enemy[] {
    const cleared: Enemy[] = [];

    for (const enemy of enemies) {
      if (!enemy.active) continue;

      const dx = enemy.x - centerX;
      const dy = enemy.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        cleared.push(enemy);
      }
    }

    return cleared;
  }

  /**
   * Check if bomb clears bullets in radius
   */
  getBulletsInRadius(
    centerX: number,
    centerY: number,
    radius: number,
    bullets: Bullet[]
  ): Bullet[] {
    const cleared: Bullet[] = [];

    for (const bullet of bullets) {
      if (!bullet.active) continue;

      const dx = bullet.x - centerX;
      const dy = bullet.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        cleared.push(bullet);
      }
    }

    return cleared;
  }
}


