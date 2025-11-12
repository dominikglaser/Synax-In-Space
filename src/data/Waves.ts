/**
 * Load and validate wave data from JSON5 files
 */

import { parseWaves, type Wave } from '../systems/PatternML';
import JSON5 from 'json5';

/**
 * Load waves from a JSON5 file
 */
export async function loadWaves(url: string): Promise<Wave[]> {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const json = JSON5.parse(text);
    return parseWaves(json);
  } catch (error) {
    return [];
  }
}

/**
 * Get waves that should spawn at a given time
 */
export function getWavesAtTime(waves: Wave[], timeMs: number): Wave[] {
  return waves.filter(
    (wave) => timeMs >= wave.t0 && timeMs < wave.t0 + wave.duration
  );
}

