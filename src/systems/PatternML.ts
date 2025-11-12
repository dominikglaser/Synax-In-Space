/**
 * PatternML - Data-driven bullet pattern system (BulletML-style)
 */

import { z } from 'zod';

/**
 * Bullet pattern schema
 */
export const BulletPattern = z.object({
  name: z.string(),
  repeat: z.number().int().min(1).default(1),
  spawnEveryMs: z.number().int().min(0),
  bullets: z.array(
    z.object({
      speed: z.number(),
      angleDeg: z.number(),
      accel: z.number().default(0),
      lifeMs: z.number().int().min(100).default(4000),
    })
  ),
});

/**
 * Wave schema
 */
export const WaveSchema = z.object({
  t0: z.number().int(), // ms since stage start
  duration: z.number().int(),
  enemy: z.string(), // enemy type key
  count: z.number().int().min(1),
  formation: z.enum(['line', 'arc', 'sine', 'v', 'random']),
  pattern: BulletPattern,
});

export type Wave = z.infer<typeof WaveSchema>;
export type BulletPat = z.infer<typeof BulletPattern>;

/**
 * Parse and validate waves from JSON
 */
export function parseWaves(json: unknown): Wave[] {
  const arr = z.array(WaveSchema).parse(json);
  return arr.sort((a, b) => a.t0 - b.t0);
}

