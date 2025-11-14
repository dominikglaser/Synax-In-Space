/**
 * Rate limiting utilities for network requests
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private defaultWindowMs: number;
  private defaultMaxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.defaultWindowMs = windowMs;
    this.defaultMaxRequests = maxRequests;
  }

  /**
   * Check if a request is allowed
   * @param key - Unique identifier for the rate limit (e.g., URL pattern)
   * @param windowMs - Time window in milliseconds (optional, uses default if not provided)
   * @param maxRequests - Maximum requests per window (optional, uses default if not provided)
   * @returns true if request is allowed, false if rate limited
   */
  isAllowed(key: string, windowMs?: number, maxRequests?: number): boolean {
    const window = windowMs ?? this.defaultWindowMs;
    const max = maxRequests ?? this.defaultMaxRequests;
    const now = Date.now();

    const entry = this.requests.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new window
      this.requests.set(key, {
        count: 1,
        resetTime: now + window,
      });
      return true;
    }

    if (entry.count >= max) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Get remaining requests in current window
   */
  getRemaining(key: string, maxRequests?: number): number {
    const max = maxRequests ?? this.defaultMaxRequests;
    const entry = this.requests.get(key);
    
    if (!entry || Date.now() > entry.resetTime) {
      return max;
    }
    
    return Math.max(0, max - entry.count);
  }

  /**
   * Get time until rate limit resets (in milliseconds)
   */
  getResetTime(key: string): number {
    const entry = this.requests.get(key);
    if (!entry) {
      return 0;
    }
    return Math.max(0, entry.resetTime - Date.now());
  }

  /**
   * Clear rate limit for a specific key
   */
  clear(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.requests.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Global rate limiter for network requests
export const networkRateLimiter = new RateLimiter(60000, 100); // 100 requests per minute

// Rate limiter for specific URL patterns (stricter)
export const urlRateLimiter = new RateLimiter(60000, 10); // 10 requests per minute per URL

/**
 * Get rate limit key from URL
 */
export function getRateLimitKey(url: string): string {
  try {
    const urlObj = new URL(url, window.location.href);
    // Use origin + pathname as key (ignores query params for rate limiting)
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    // Fallback to full URL if parsing fails
    return url;
  }
}

