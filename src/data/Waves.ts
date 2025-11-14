/**
 * Load and validate wave data from JSON5 files
 */

import { parseWaves, type Wave } from '../systems/PatternML';
import JSON5 from 'json5';
import { validateUrlString } from '../utils/inputValidation';
import { urlRateLimiter, getRateLimitKey } from '../utils/rateLimiter';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';

// Security: Maximum file size for wave data (1MB)
const MAX_WAVE_FILE_SIZE = 1024 * 1024;

/**
 * Enhanced URL validation to prevent SSRF attacks
 */
function validateWaveUrl(urlString: string): void {
  // Use centralized URL validation
  const sanitizedUrl = validateUrlString(urlString);
  
  try {
    const url = new URL(sanitizedUrl, window.location.href);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Only HTTP and HTTPS protocols are allowed');
    }
    
    // Block file:// protocol
    if (url.protocol === 'file:') {
      throw new Error('File protocol not allowed');
    }
    
    // Block localhost/internal network access (optional security measure)
    // In browser context, this is less critical but still good practice
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      // Allow localhost for development, but could be restricted in production
      // For now, we allow it but log it
      logger.warn('Loading wave data from localhost - ensure this is intentional');
    }
    
    // Block private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
    const privateIpPattern = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;
    if (privateIpPattern.test(hostname)) {
      throw new Error('Private IP addresses are not allowed');
    }
    
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      throw new Error('Invalid URL format');
    }
    throw error;
  }
}

/**
 * Load waves from a JSON5 file with security validation and rate limiting
 */
export async function loadWaves(url: string): Promise<Wave[]> {
  const result = await ErrorHandler.execute('Waves.loadWaves', async () => {
    // Validate URL before fetching
    validateWaveUrl(url);
    
    // Check rate limiting
    const rateLimitKey = getRateLimitKey(url);
    if (!urlRateLimiter.isAllowed(rateLimitKey)) {
      const resetTime = urlRateLimiter.getResetTime(rateLimitKey);
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(resetTime / 1000)} seconds before trying again.`);
    }
    
    const response = await fetch(url);
    
    // Check response status
    if (!response.ok) {
      throw new Error(`Failed to load waves: ${response.status} ${response.statusText}`);
    }
    
    // Check content length if available
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (isNaN(size) || size > MAX_WAVE_FILE_SIZE) {
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
    
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        if (!value) {
          continue; // Skip empty chunks
        }
        
        totalSize += value.length;
        if (totalSize > MAX_WAVE_FILE_SIZE) {
          await reader.cancel();
          throw new Error(`Wave file exceeded maximum size: ${MAX_WAVE_FILE_SIZE} bytes`);
        }
        
        text += decoder.decode(value, { stream: true });
      }
      
      // Final decode for any remaining data
      text += decoder.decode();
    } catch (readError) {
      // Ensure reader is cancelled on error
      try {
        await reader.cancel();
      } catch {
        // Ignore cancel errors
      }
      throw readError;
    }
    
    // Parse JSON5 with error handling
    let json: unknown;
    try {
      json = JSON5.parse(text);
    } catch (parseError) {
      throw new Error(`Failed to parse wave data: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
    
    return parseWaves(json);
  }, []);
  
  return result ?? [];
}

/**
 * Get waves that should spawn at a given time
 */
export function getWavesAtTime(waves: Wave[], timeMs: number): Wave[] {
  return waves.filter(
    (wave) => timeMs >= wave.t0 && timeMs < wave.t0 + wave.duration
  );
}

