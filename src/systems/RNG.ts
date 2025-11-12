/**
 * RNG system using seedrandom for deterministic random number generation
 */

import seedrandom from 'seedrandom';

export class RNG {
  private rng: ReturnType<typeof seedrandom>;

  constructor(seed: string | number) {
    this.rng = seedrandom(String(seed));
  }

  /**
   * Random float between 0 and 1
   */
  float(): number {
    return this.rng.quick();
  }

  /**
   * Random float between 0 and 1 (alias for float)
   */
  random(): number {
    return this.float();
  }

  /**
   * Random integer between min and max (inclusive)
   */
  int(min: number, max: number): number {
    return Math.floor(this.float() * (max - min + 1)) + min;
  }

  /**
   * Random float between min and max
   */
  floatRange(min: number, max: number): number {
    return this.float() * (max - min) + min;
  }

  /**
   * Pick a random element from an array
   */
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.float() * arr.length)]!;
  }

  /**
   * Shuffle an array (Fisher-Yates)
   */
  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.float() * (i + 1));
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  }
}
