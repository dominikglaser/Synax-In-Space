/**
 * Power-up system - manages weapon tier, bombs, health upgrades
 */

import { BALANCER } from './Balancer';

export interface PowerUpState {
  weaponTier: number;
  bombs: number;
  health: number;
  maxHealth: number;
}

export class PowerUpSystem {
  private state: PowerUpState;

  constructor() {
    this.state = {
      weaponTier: 0,
      bombs: BALANCER.bombsStart,
      health: BALANCER.playerLives,
      maxHealth: BALANCER.playerLives,
    };
  }

  /**
   * Upgrade weapon tier
   */
  upgradeWeapon(): void {
    const maxTier = 2; // 0, 1, 2
    if (this.state.weaponTier < maxTier) {
      this.state.weaponTier++;
    }
  }

  /**
   * Add bomb
   */
  addBomb(): void {
    this.state.bombs++;
  }

  /**
   * Use bomb
   */
  useBomb(): boolean {
    if (this.state.bombs > 0) {
      this.state.bombs--;
      return true;
    }
    return false;
  }

  /**
   * Add health
   */
  addHealth(): void {
    if (this.state.health < this.state.maxHealth) {
      this.state.health++;
    }
  }

  /**
   * Take damage
   */
  takeDamage(amount: number): void {
    this.state.health = Math.max(0, this.state.health - amount);
  }

  /**
   * Get current state
   */
  getState(): PowerUpState {
    return { ...this.state };
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.state = {
      weaponTier: 0,
      bombs: BALANCER.bombsStart,
      health: BALANCER.playerLives,
      maxHealth: BALANCER.playerLives,
    };
  }
}

