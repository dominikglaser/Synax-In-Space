/**
 * Core type definitions for Synax In Space
 */

export interface WeaponSpec {
  /** Fire rate in shots per second */
  fireRate: number;
  /** Damage per shot */
  damage: number;
  /** Bullet speed in pixels per frame */
  bulletSpeed: number;
  /** Number of bullets per shot (for spread) */
  bulletCount: number;
  /** Angle spread in degrees for multi-bullet shots */
  spreadAngle: number;
}

export interface EnemyPattern {
  /** Movement pattern type */
  type: 'chaser' | 'turret' | 'sine' | 'boss';
  /** Base movement speed */
  speed: number;
  /** Amplitude for sine patterns */
  amplitude?: number;
  /** Frequency for sine patterns */
  frequency?: number;
  /** Fire rate in seconds */
  fireRate?: number;
}

export interface WaveConfig {
  /** Time in seconds when this wave starts */
  startTime: number;
  /** Enemy type to spawn */
  enemyType: string;
  /** Number of enemies in this wave */
  count: number;
  /** Spawn interval in seconds */
  interval: number;
  /** X position offset from screen edge */
  xOffset: number;
}

export interface GameState {
  score: number;
  lives: number;
  weaponTier: number;
  bombs: number;
  shields: number;
  stageTime: number;
  bossActive: boolean;
  paused: boolean;
}

export interface PowerUpType {
  type: 'weapon' | 'bomb' | 'health' | 'shield';
  value: number;
}

export interface BossPhase {
  /** HP threshold (0-1) when this phase starts */
  hpThreshold: number;
  /** Movement pattern */
  pattern: EnemyPattern;
  /** Fire pattern identifier */
  firePattern: string;
}

export interface CollisionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleBounds {
  x: number;
  y: number;
  radius: number;
}

export interface SpawnSchedule {
  time: number;
  enemyType: string;
  x: number;
  y?: number;
}


