/**
 * Load and validate wave data from JSON5 files
 */

import { parseWaves, type Wave } from '../systems/PatternML';
import JSON5 from 'json5';

// Security: Maximum file size for wave data (1MB)
const MAX_WAVE_FILE_SIZE = 1024 * 1024;

/**
 * Validate URL to prevent SSRF attacks
 */
function validateWaveUrl(urlString: string): void {
  try {
    const url = new URL(urlString, window.location.href);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol');
    }
    // For browser context, we can allow relative URLs and same-origin
    // Block file:// protocol
    if (url.protocol === 'file:') {
      throw new Error('File protocol not allowed');
    }
  } catch (error) {
    throw new Error(`Invalid or unsafe URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Load waves from a JSON5 file with security validation
 */
export async function loadWaves(url: string): Promise<Wave[]> {
  try {
    // Validate URL before fetching
    validateWaveUrl(url);
    
    const response = await fetch(url);
    
    // Check response status
    if (!response.ok) {
      throw new Error(`Failed to load waves: ${response.status} ${response.statusText}`);
    }
    
    // Check content length if available
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size > MAX_WAVE_FILE_SIZE) {
        throw new Error(`Wave file too large: ${size} bytes (max: ${MAX_WAVE_FILE_SIZE})`);
      }
    }
    
    // Read response with size tracking
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }
    
    let text = '';
    let totalSize = 0;
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      totalSize += value.length;
      if (totalSize > MAX_WAVE_FILE_SIZE) {
        reader.cancel();
        throw new Error(`Wave file exceeded maximum size: ${MAX_WAVE_FILE_SIZE} bytes`);
      }
      
      text += decoder.decode(value, { stream: true });
    }
    
    // Final decode for any remaining data
    text += decoder.decode();
    
    const json = JSON5.parse(text);
    return parseWaves(json);
  } catch (error) {
    console.error('Failed to load waves:', error);
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

