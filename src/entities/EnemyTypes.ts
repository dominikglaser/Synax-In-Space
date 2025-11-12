/**
 * Enemy type definitions and archetypes
 */

import type { EnemyPattern } from '../types';
import { BALANCER } from '../systems/Balancer';
import { getKenneySprite } from '../config/AssetMappings';

// Helper to get texture key, preferring Kenney assets if available
function getEnemyTextureKey(type: 'chaser' | 'turret' | 'sineFlyer', scene: Phaser.Scene): string {
  // Check if Kenney atlas exists and has the sprite
  if (scene.textures.exists('game')) {
    const atlas = scene.textures.get('game');
    const kenneySprite = type === 'chaser' 
      ? getKenneySprite('enemyChaser', 0)
      : type === 'turret'
      ? getKenneySprite('enemyTurret', 0)
      : getKenneySprite('enemySineFlyer', 0);
    
    if (atlas.has(kenneySprite)) {
      return kenneySprite;
    }
  }
  
  // Fallback to procedural texture
  return `enemy-${type}`;
}

export const ENEMY_TYPES = {
  chaser: {
    pattern: {
      type: 'chaser' as const,
      speed: BALANCER.enemySpeeds.chaser,
    } as EnemyPattern,
    hp: BALANCER.enemyHP.chaser,
    fireRate: BALANCER.enemyFireRates.chaser,
    textureKey: 'enemy-chaser', // Will be resolved at runtime
    kenneySprite: getKenneySprite('enemyChaser', 0),
  },
  turret: {
    pattern: {
      type: 'turret' as const,
      speed: BALANCER.enemySpeeds.turret,
      fireRate: BALANCER.enemyFireRates.turret,
    } as EnemyPattern,
    hp: BALANCER.enemyHP.turret,
    fireRate: BALANCER.enemyFireRates.turret,
    textureKey: 'enemy-turret', // Will be resolved at runtime
    kenneySprite: getKenneySprite('enemyTurret', 0),
  },
  sineFlyer: {
    pattern: {
      type: 'sine' as const,
      speed: BALANCER.enemySpeeds.sineFlyer,
      amplitude: 100,
      frequency: 2,
      fireRate: BALANCER.enemyFireRates.sineFlyer,
    } as EnemyPattern,
    hp: BALANCER.enemyHP.sineFlyer,
    fireRate: BALANCER.enemyFireRates.sineFlyer,
    textureKey: 'enemy-sineFlyer', // Will be resolved at runtime
    kenneySprite: getKenneySprite('enemySineFlyer', 0),
  },
} as const;


