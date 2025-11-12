/**
 * Tests for Balancer configuration
 */

import { describe, it, expect } from 'vitest';
import { BALANCER, WEAPON_SPECS, calculateWeaponDPS, calculateTTK } from '../systems/Balancer';

describe('Balancer', () => {
  it('should have valid weapon specs', () => {
    expect(WEAPON_SPECS.length).toBeGreaterThan(0);
    WEAPON_SPECS.forEach((spec) => {
      expect(spec.fireRate).toBeGreaterThan(0);
      expect(spec.damage).toBeGreaterThan(0);
      expect(spec.bulletSpeed).toBeGreaterThan(0);
      expect(spec.bulletCount).toBeGreaterThan(0);
    });
  });

  it('should have valid player settings', () => {
    expect(BALANCER.playerSpeed).toBeGreaterThan(0);
    expect(BALANCER.playerLives).toBeGreaterThan(0);
    expect(BALANCER.playerIFramesMs).toBeGreaterThan(0);
    expect(BALANCER.playerChargeShotTime).toBeGreaterThan(0);
  });

  it('should have valid enemy HP values', () => {
    expect(BALANCER.enemyHP.chaser).toBeGreaterThan(0);
    expect(BALANCER.enemyHP.turret).toBeGreaterThan(0);
    expect(BALANCER.enemyHP.sineFlyer).toBeGreaterThan(0);
  });

  it('should have valid enemy speeds', () => {
    expect(BALANCER.enemySpeeds.chaser).toBeGreaterThan(0);
    expect(BALANCER.enemySpeeds.turret).toBeGreaterThan(0);
    expect(BALANCER.enemySpeeds.sineFlyer).toBeGreaterThan(0);
  });

  it('should have valid drop rates', () => {
    const totalDropRate =
      BALANCER.dropRates.weapon + BALANCER.dropRates.bomb + BALANCER.dropRates.health;
    expect(totalDropRate).toBeLessThanOrEqual(1);
    expect(BALANCER.dropRates.weapon).toBeGreaterThanOrEqual(0);
    expect(BALANCER.dropRates.bomb).toBeGreaterThanOrEqual(0);
    expect(BALANCER.dropRates.health).toBeGreaterThanOrEqual(0);
  });

  it('should have valid boss configuration', () => {
    expect(BALANCER.bossHP).toBeGreaterThan(0);
    expect(BALANCER.bossSpeed).toBeGreaterThan(0);
    expect(BALANCER.bossFireRate).toBeGreaterThan(0);
    expect(BALANCER.bossHPPhases.length).toBeGreaterThan(0);
  });

  it('should calculate DPS correctly', () => {
    const weapon = WEAPON_SPECS[0];
    const dps = calculateWeaponDPS(weapon);
    expect(dps).toBe(weapon.damage * weapon.fireRate * weapon.bulletCount);
  });

  it('should calculate TTK correctly', () => {
    const hp = 100;
    const dps = 50;
    const ttk = calculateTTK(hp, dps);
    expect(ttk).toBe(2);
  });

  it('should have spawn schedule', () => {
    expect(BALANCER.spawnSchedule.length).toBeGreaterThan(0);
    BALANCER.spawnSchedule.forEach((spawn) => {
      expect(spawn.time).toBeGreaterThanOrEqual(0);
      expect(spawn.enemyType).toBeTruthy();
      expect(spawn.x).toBeGreaterThan(0);
    });
  });

  it('should have valid score values', () => {
    expect(BALANCER.scorePerKill.chaser).toBeGreaterThan(0);
    expect(BALANCER.scorePerKill.turret).toBeGreaterThan(0);
    expect(BALANCER.scorePerKill.sineFlyer).toBeGreaterThan(0);
    expect(BALANCER.scorePerKill.boss).toBeGreaterThan(0);
  });
});


