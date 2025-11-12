/**
 * Tests for BulletMLRunner
 */

import { describe, it, expect } from 'vitest';
import { BulletMLRunner } from '../systems/BulletMLRunner';

describe('BulletMLRunner', () => {
  it('spawns a fan', () => {
    const r = new BulletMLRunner();
    r.spawnFan(0, 0, 0, 60, 5, 100, 1000);
    expect(r.bullets.length).toBe(5);
  });

  it('updates bullet positions', () => {
    const r = new BulletMLRunner();
    r.spawnFan(0, 0, 0, 0, 1, 100, 1000);
    expect(r.bullets.length).toBe(1);

    const bullet = r.bullets[0]!;
    const initialX = bullet.x;

    r.update(100); // 100ms

    expect(bullet.x).toBeGreaterThan(initialX);
    expect(bullet.life).toBe(900);
  });

  it('removes bullets when life expires', () => {
    const r = new BulletMLRunner();
    r.spawnFan(0, 0, 0, 0, 1, 100, 100);
    expect(r.bullets.length).toBe(1);

    r.update(150); // Past lifetime

    expect(r.bullets.length).toBe(0);
  });

  it('clears all bullets', () => {
    const r = new BulletMLRunner();
    r.spawnFan(0, 0, 0, 60, 10, 100, 1000);
    expect(r.bullets.length).toBe(10);

    r.clear();

    expect(r.bullets.length).toBe(0);
  });
});

