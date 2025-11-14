/**
 * Input validation utilities for security
 */

/**
 * Validate and sanitize gamepad stick values
 * Ensures values are within expected range [-1, 1]
 */
export function validateGamepadStick(value: number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value !== 'number' || !isFinite(value)) {
    return 0;
  }
  // Clamp to valid range
  return Math.max(-1, Math.min(1, value));
}

/**
 * Validate and sanitize gamepad button state
 */
export function validateGamepadButton(value: boolean | null | undefined): boolean {
  return value === true;
}

/**
 * Validate seed value
 * Seeds must be non-negative integers
 */
export function validateSeed(seed: number | string): number {
  const numSeed = typeof seed === 'string' ? parseInt(seed, 10) : seed;
  
  if (!Number.isInteger(numSeed) || numSeed < 0 || !isFinite(numSeed)) {
    throw new Error(`Invalid seed value: ${seed}. Seed must be a non-negative integer.`);
  }
  
  // Clamp to reasonable maximum to prevent integer overflow
  const MAX_SEED = 2147483647; // Max 32-bit signed integer
  return Math.min(numSeed, MAX_SEED);
}

/**
 * Sanitize string input to prevent injection
 */
export function sanitizeString(input: string | null | undefined, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove control characters except newlines and tabs
  let sanitized = input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Validate URL string
 */
export function validateUrlString(url: string): string {
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('URL must be a non-empty string');
  }
  
  // Basic URL validation (more strict validation should be done at network layer)
  if (url.length > 2048) {
    throw new Error('URL exceeds maximum length of 2048 characters');
  }
  
  return url;
}

