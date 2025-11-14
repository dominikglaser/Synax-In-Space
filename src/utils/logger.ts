/**
 * Environment-aware logging utility
 * Replaces console.log with production-safe logging
 */

import { isProduction } from './errorSanitizer';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor() {
    this.config = {
      level: isProduction() ? LogLevel.WARN : LogLevel.DEBUG,
      enableConsole: !isProduction(),
    };
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Enable/disable console output
   */
  setConsoleEnabled(enabled: boolean): void {
    this.config.enableConsole = enabled;
  }

  /**
   * Debug log (only in development)
   */
  debug(...args: unknown[]): void {
    if (this.config.level <= LogLevel.DEBUG && this.config.enableConsole) {
      console.debug('[DEBUG]', ...args);
    }
  }

  /**
   * Info log
   */
  info(...args: unknown[]): void {
    if (this.config.level <= LogLevel.INFO && this.config.enableConsole) {
      console.info('[INFO]', ...args);
    }
  }

  /**
   * Warning log
   */
  warn(...args: unknown[]): void {
    if (this.config.level <= LogLevel.WARN && this.config.enableConsole) {
      console.warn('[WARN]', ...args);
    }
  }

  /**
   * Error log (always logged)
   */
  error(...args: unknown[]): void {
    if (this.config.level <= LogLevel.ERROR) {
      console.error('[ERROR]', ...args);
    }
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, ...args: unknown[]): void {
    switch (level) {
      case LogLevel.DEBUG:
        this.debug(...args);
        break;
      case LogLevel.INFO:
        this.info(...args);
        break;
      case LogLevel.WARN:
        this.warn(...args);
        break;
      case LogLevel.ERROR:
        this.error(...args);
        break;
    }
  }
}

export const logger = new Logger();

