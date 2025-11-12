/**
 * BulletML Runner - Executes data-driven bullet patterns
 */

export type Bullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  accel?: number;
  angle?: number;
};

export class BulletMLRunner {
  bullets: Bullet[] = [];

  /**
   * Update all bullets
   */
  update(dt: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]!;
      b.x += b.vx * (dt / 1000);
      b.y += b.vy * (dt / 1000);

      // Apply acceleration if present
      if (b.accel !== undefined && b.angle !== undefined) {
        b.vx += Math.cos(b.angle) * b.accel * (dt / 1000);
        b.vy += Math.sin(b.angle) * b.accel * (dt / 1000);
      }

      b.life -= dt;
      if (b.life <= 0) {
        this.bullets.splice(i, 1);
      }
    }
  }

  /**
   * Spawn a fan pattern
   */
  spawnFan(
    x: number,
    y: number,
    angleDeg: number,
    spread: number,
    count: number,
    speed: number,
    life = 4000
  ): void {
    const a0 = (angleDeg - spread / 2) * (Math.PI / 180);
    const step = count > 1 ? (spread / (count - 1)) * (Math.PI / 180) : 0;

    for (let i = 0; i < count; i++) {
      const a = a0 + i * step;
      this.bullets.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life,
      });
    }
  }

  /**
   * Spawn bullets from a pattern
   */
  spawnPattern(
    x: number,
    y: number,
    pattern: {
      bullets: Array<{
        speed: number;
        angleDeg: number;
        accel?: number;
        lifeMs: number;
      }>;
    }
  ): void {
    for (const bullet of pattern.bullets) {
      const angle = (bullet.angleDeg * Math.PI) / 180;
      this.bullets.push({
        x,
        y,
        vx: Math.cos(angle) * bullet.speed,
        vy: Math.sin(angle) * bullet.speed,
        life: bullet.lifeMs,
        accel: bullet.accel,
        angle: bullet.accel !== undefined ? angle : undefined,
      });
    }
  }

  /**
   * Clear all bullets
   */
  clear(): void {
    this.bullets = [];
  }
}

