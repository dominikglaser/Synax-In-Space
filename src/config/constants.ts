/**
 * Game constants and configuration
 */

export const GAME_CONFIG = {
  /** Game canvas width */
  width: 1280,
  /** Game canvas height */
  height: 720,
  /** Default RNG seed */
  defaultSeed: 12345,
  /** Boss trigger interval in seconds (boss spawns every 70s when timer is running) */
  bossInterval: 70,
  /** Parallax layer speeds (0-1, where 1 is full scroll speed) */
  parallaxSpeeds: {
    far: 0.3,
    mid: 0.6,
    near: 0.9,
  },
  /** Grid cell size for collision broadphase */
  collisionGridSize: 128,
  /** Debug: God mode (player invincible) */
  godMode: false,
} as const;


