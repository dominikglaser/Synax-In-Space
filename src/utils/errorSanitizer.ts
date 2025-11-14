/**
 * Error sanitization utilities for production security
 */

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  // In Vite, import.meta.env.PROD is true in production builds
  try {
    const meta = import.meta as { env?: { PROD?: boolean } };
    if (meta.env?.PROD === true) {
      return true;
    }
  } catch {
    // Ignore errors accessing import.meta
  }
  // Fallback: check if we're not in development
  return typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');
}

/**
 * Sanitize error message for production
 * Removes sensitive information like file paths, stack traces, and internal details
 */
export function sanitizeErrorMessage(error: unknown, includeStack: boolean = false): string {
  if (isProduction()) {
    // In production, return generic error messages
    if (error instanceof Error) {
      // Only include the error type, not the message
      return `An error occurred: ${error.constructor.name}`;
    }
    return 'An unexpected error occurred';
  }
  
  // In development, include full error details
  if (error instanceof Error) {
    if (includeStack && error.stack) {
      return `${error.message}\n${error.stack}`;
    }
    return error.message;
  }
  
  return String(error);
}

/**
 * Sanitize error object for logging
 */
export function sanitizeErrorData(error: unknown): Record<string, unknown> {
  if (isProduction()) {
    // In production, only include safe information
    if (error instanceof Error) {
      return {
        name: error.constructor.name,
        // Don't include message or stack in production
      };
    }
    return { type: typeof error };
  }
  
  // In development, include full details
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  
  return { error: String(error) };
}

/**
 * Sanitize stack trace for production
 */
export function sanitizeStackTrace(stack: string | undefined): string | undefined {
  if (!stack) {
    return undefined;
  }
  
  if (isProduction()) {
    // In production, remove file paths and line numbers
    return stack
      .split('\n')
      .map(line => {
        // Remove file paths, keep only function names
        return line.replace(/\(.*?\)/g, '()').replace(/@.*/g, '');
      })
      .join('\n');
  }
  
  // In development, return full stack
  return stack;
}

