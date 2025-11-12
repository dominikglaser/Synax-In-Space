/**
 * Enemy movement patterns - data-driven enemy behavior
 */

import { RNG } from './RNG';

export type EnemyPatternFn = (
  t: number,
  i: number
) => { vx: number; vy: number; rot?: number };

/**
 * Built-in enemy patterns
 */
export const Patterns = {
  line: (_t: number, _i: number) => ({ vx: -120, vy: 0 }),
  sine: (t: number, i: number) => ({
    vx: -110,
    vy: Math.sin((t + i * 200) / 300) * 80,
  }),
  arc: (_t: number, i: number) => ({ vx: -100, vy: (i - 2) * 45 }),
  chaser: (t: number, _i: number) => ({
    vx: -90,
    vy: Math.sin(t / 200) * 60,
  }),
  v: (_t: number, i: number) => {
    const center = 2;
    return { vx: -100, vy: (i - center) * 50 };
  },
  random: (_t: number, _i: number, rng?: RNG) => ({
    vx: -100,
    vy: rng ? rng.floatRange(-50, 50) : Math.random() * 100 - 50,
  }),
} as const;

/**
 * Pick a pattern by name
 */
export function pickPattern(name: string): EnemyPatternFn {
  return (Patterns as Record<string, EnemyPatternFn>)[name] ?? Patterns.line;
}

/**
 * Pick a random pattern
 */
export function randomPattern(rng: RNG): EnemyPatternFn {
  const keys = Object.keys(Patterns).filter((k) => k !== 'random');
  return pickPattern(rng.pick(keys));
}

