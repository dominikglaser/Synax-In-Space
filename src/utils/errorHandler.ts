/**
 * Standardized error handling utilities
 */

import { logger } from './logger';
import { sanitizeErrorMessage, sanitizeErrorData } from './errorSanitizer';
import { sceneLogger } from './SceneLogger';

/**
 * Error handling result
 */
export interface ErrorResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Standardized error handler
 */
export class ErrorHandler {
  /**
   * Handle error with standardized logging
   */
  static handleError(
    context: string,
    error: unknown,
    options: {
      logToScene?: boolean;
      logToConsole?: boolean;
      rethrow?: boolean;
      fallback?: () => void;
    } = {}
  ): void {
    const {
      logToScene = true,
      logToConsole = true,
      rethrow = false,
      fallback,
    } = options;

    const errorMessage = sanitizeErrorMessage(error, false);
    const errorData = sanitizeErrorData(error);

    if (logToScene) {
      sceneLogger.logError(context, errorMessage, errorData);
    }

    if (logToConsole) {
      logger.error(`[${context}]`, errorMessage, errorData);
    }

    if (fallback) {
      try {
        fallback();
      } catch (fallbackError) {
        logger.error(`[${context}] Fallback failed:`, fallbackError);
      }
    }

    if (rethrow) {
      throw error instanceof Error ? error : new Error(errorMessage);
    }
  }

  /**
   * Execute function with error handling
   */
  static async execute<T>(
    context: string,
    fn: () => Promise<T>,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      this.handleError(context, error, {
        fallback: fallback !== undefined ? () => {} : undefined,
      });
      return fallback;
    }
  }

  /**
   * Execute synchronous function with error handling
   */
  static executeSync<T>(
    context: string,
    fn: () => T,
    fallback?: T
  ): T | undefined {
    try {
      return fn();
    } catch (error) {
      this.handleError(context, error, {
        fallback: fallback !== undefined ? () => {} : undefined,
      });
      return fallback;
    }
  }

  /**
   * Wrap async function with error handling
   */
  static wrapAsync<T extends (...args: any[]) => Promise<any>>(
    context: string,
    fn: T
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(context, error, { rethrow: true });
        throw error;
      }
    }) as T;
  }

  /**
   * Wrap synchronous function with error handling
   */
  static wrapSync<T extends (...args: any[]) => any>(
    context: string,
    fn: T
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        return fn(...args);
      } catch (error) {
        this.handleError(context, error, { rethrow: true });
        throw error;
      }
    }) as T;
  }
}

