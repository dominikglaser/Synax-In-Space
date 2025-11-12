/**
 * Spawner system for enemy waves using seeded RNG with looping game cycle
 */

import { BALANCER } from './Balancer';
import { GAME_CONFIG } from '../config/constants';
import { RNG } from './RNG';
import type { SpawnSchedule } from '../types';

export class SpawnerSystem {
  private rng: RNG;
  private spawnSchedule: SpawnSchedule[];
  private nextSpawnIndex: number = 0;
  private lastBossTime: number = 0;

  constructor(rng: RNG) {
    this.rng = rng;
    this.spawnSchedule = [...BALANCER.spawnSchedule];
  }

  /**
   * Check if enemies should spawn at current time (with loop)
   */
  checkSpawns(currentTime: number): SpawnSchedule[] {
    const spawns: SpawnSchedule[] = [];
    const loopTime = currentTime % GAME_CONFIG.bossInterval;

    // Reset index at start of each loop
    if (loopTime < 1) {
      this.nextSpawnIndex = 0;
    }

    // Check scheduled spawns within current loop
    while (
      this.nextSpawnIndex < this.spawnSchedule.length &&
      this.spawnSchedule[this.nextSpawnIndex].time <= loopTime
    ) {
      spawns.push(this.spawnSchedule[this.nextSpawnIndex]);
      this.nextSpawnIndex++;
    }

    return spawns;
  }

  /**
   * Check if boss should spawn (every 80 seconds)
   */
  shouldSpawnBoss(currentTime: number): boolean {
    const bossInterval = GAME_CONFIG.bossInterval;
    const timeSinceLastBoss = currentTime - this.lastBossTime;

    // Spawn boss every 80 seconds
    if (timeSinceLastBoss >= bossInterval) {
      this.lastBossTime = currentTime;
      return true;
    }

    return false;
  }

  /**
   * Get random Y position for spawn (within bounds, evenly distributed)
   */
  getRandomSpawnY(minY: number, maxY: number): number {
    // Use floatRange to get uniform distribution across the full height
    return this.rng.floatRange(minY, maxY);
  }

  /**
   * Reset spawner
   */
  reset(): void {
    this.nextSpawnIndex = 0;
    this.lastBossTime = 0;
  }
}


