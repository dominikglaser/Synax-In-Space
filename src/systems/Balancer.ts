/**
 * Central tuning hub for all game balance values
 * ALL magic numbers must reference this object
 */

import type { WeaponSpec, SpawnSchedule } from '../types';

/**
 * Weapon specifications for each tier
 */
/**
 * Calculate bullet count based on weapon tier
 * Lower bullet counts to slow progression
 * Tier 0: 1 bullet (straight)
 * Tier 1: 1 bullet (straight) - after 1 pickup
 * Tier 2: 2 bullets (streams) - after 2 pickups
 * Tier 3: 2 bullets (same as tier 2)
 * Tier 4+: slowly increasing bullet count
 */
export function getBulletCountForTier(tier: number): number {
  if (tier === 0) return 1; // No pickups: 1 bullet
  if (tier === 1) return 1; // 1 pickup: 1 bullet straight
  if (tier === 2) return 2; // 2 pickups: 2 bullet streams
  if (tier === 3) return 2; // 3 pickups: still 2 bullets (slower progression)
  // Tier 4+: 3, 4, 5, etc. (increasing by 1 each tier, but starting later)
  return 2 + (tier - 3);
}

/**
 * Calculate spread angle based on bullet count
 */
export function getSpreadAngleForBulletCount(bulletCount: number): number {
  if (bulletCount === 1) return 0;
  if (bulletCount === 2) return 12; // Small spread for 2 bullets
  if (bulletCount === 3) return 15; // Small spread for 3 bullets
  // For more bullets, wider spread (reduced scaling)
  return Math.min(25, bulletCount * 4);
}

export const WEAPON_SPECS: WeaponSpec[] = [
  {
    fireRate: 8, // shots per second
    damage: 10,
    bulletSpeed: 800,
    bulletCount: 1, // Tier 0: 1 bullet (starting)
    spreadAngle: 0,
  },
  {
    fireRate: 9, // Slightly faster
    damage: 11,
    bulletSpeed: 850,
    bulletCount: 1, // Tier 1: 1 bullet (after 1 pickup)
    spreadAngle: 0,
  },
  {
    fireRate: 10,
    damage: 12,
    bulletSpeed: 900,
    bulletCount: 2, // Tier 2: 2 bullets (after 2 pickups, reduced from 3)
    spreadAngle: 12, // Reduced spread for 2 bullets
  },
  // Additional tiers will be calculated dynamically
];

/**
 * Main balance configuration object
 */
export const BALANCER = {
  // Scroll and camera
  scrollSpeed: 200, // pixels per second

  // Player
  playerSpeed: 400, // pixels per second
  playerLives: 3, // Starting lives
  playerMaxLives: 6, // Maximum lives (can be increased via power-ups)
  playerIFramesMs: 2000, // invincibility frames duration in milliseconds
  playerChargeShotTime: 600, // milliseconds to hold for charge shot
  chargeShotDamage: 50, // damage multiplier for charge shot
  chargeShotSize: 2, // size multiplier for charge shot

  // Bombs
  bombsStart: 3,
  bombDamage: 100, // damage to all enemies on screen
  bombClearRadius: 1000, // radius in pixels

  // Enemy HP
  enemyHP: {
    chaser: 140,
    turret: 140,
    sineFlyer: 140,
  },

  // Enemy speeds (pixels per second)
  enemySpeeds: {
    chaser: 150,
    turret: 80,
    sineFlyer: 120,
  },

  // Enemy fire rates (shots per second)
  enemyFireRates: {
    chaser: 1.5,
    turret: 2,
    sineFlyer: 1,
  },

  // Power-up drop rates (0-1 probability)
  dropRates: {
    weapon: 0.3, // chance to drop weapon power-up
    bomb: 0.2, // chance to drop bomb
    health: 0.1, // chance to drop health (only if below max)
    shield: 0.15, // chance to drop shield
  },

  // Boss configuration
  bossHPPhases: [1.0, 0.7, 0.35], // HP thresholds for phase changes
  bossHP: 2400, // total boss HP (tripled from 800)
  bossSpeed: 100, // pixels per second
  bossFireRate: 4, // shots per second (increased for more challenge)
  bossBulletSpeed: 350, // pixels per second

  // Bullet configuration
  bulletSpeed: 800, // default player bullet speed (overridden by weapon spec)
  enemyBulletSpeed: 400, // enemy bullet speed
  bulletDamage: 10, // default damage (overridden by weapon spec)

  // Effects
  shakeIntensity: 5, // camera shake intensity in pixels
  shakeDuration: 200, // shake duration in milliseconds

  // Spawn schedule (time-based wave spawning) - repeats every 70 seconds
  spawnSchedule: [
    // Format: { time: seconds, enemyType: string, x: screenX, y?: optionalY }
    // Reduced enemy count for better balance
    { time: 2, enemyType: 'chaser', x: 1400 },
    { time: 4, enemyType: 'sineFlyer', x: 1400 },
    { time: 6, enemyType: 'chaser', x: 1400 },
    { time: 8, enemyType: 'turret', x: 1400 },
    { time: 10, enemyType: 'chaser', x: 1400 },
    { time: 12, enemyType: 'sineFlyer', x: 1400 },
    { time: 14, enemyType: 'chaser', x: 1400 },
    { time: 16, enemyType: 'turret', x: 1400 },
    { time: 18, enemyType: 'chaser', x: 1400 },
    { time: 20, enemyType: 'sineFlyer', x: 1400 },
    { time: 22, enemyType: 'chaser', x: 1400 },
    { time: 24, enemyType: 'turret', x: 1400 },
    { time: 26, enemyType: 'chaser', x: 1400 },
    { time: 28, enemyType: 'sineFlyer', x: 1400 },
    { time: 30, enemyType: 'turret', x: 1400 },
    { time: 32, enemyType: 'chaser', x: 1400 },
    { time: 34, enemyType: 'chaser', x: 1400 },
    { time: 36, enemyType: 'sineFlyer', x: 1400 },
    { time: 38, enemyType: 'turret', x: 1400 },
    { time: 40, enemyType: 'chaser', x: 1400 },
    { time: 42, enemyType: 'sineFlyer', x: 1400 },
    { time: 44, enemyType: 'turret', x: 1400 },
    { time: 46, enemyType: 'chaser', x: 1400 },
    { time: 48, enemyType: 'chaser', x: 1400 },
    { time: 50, enemyType: 'sineFlyer', x: 1400 },
    { time: 52, enemyType: 'turret', x: 1400 },
    { time: 54, enemyType: 'chaser', x: 1400 },
    { time: 56, enemyType: 'sineFlyer', x: 1400 },
    { time: 58, enemyType: 'turret', x: 1400 },
    { time: 60, enemyType: 'chaser', x: 1400 },
    { time: 62, enemyType: 'chaser', x: 1400 },
    { time: 64, enemyType: 'sineFlyer', x: 1400 },
    { time: 66, enemyType: 'turret', x: 1400 },
    { time: 68, enemyType: 'chaser', x: 1400 },
    { time: 69, enemyType: 'sineFlyer', x: 1400 },
    { time: 69.5, enemyType: 'chaser', x: 1400 },
    // Boss spawns at 70s (handled in GameScene with loop)
  ] as SpawnSchedule[],

  // Scoring
  scorePerKill: {
    chaser: 100,
    turret: 150,
    sineFlyer: 80,
    boss: 5000,
  },
} as const;

/**
 * Helper to calculate DPS (damage per second) for a weapon
 */
export function calculateWeaponDPS(weaponSpec: WeaponSpec): number {
  return weaponSpec.damage * weaponSpec.fireRate * weaponSpec.bulletCount;
}

/**
 * Helper to calculate TTK (time to kill) in seconds
 */
export function calculateTTK(hp: number, dps: number): number {
  return hp / dps;
}


