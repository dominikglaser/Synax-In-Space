/**
 * Browser and localhost behavior logging system
 * Tracks console errors, network requests, performance metrics, and resource loading
 */

import { sanitizeErrorMessage, sanitizeErrorData, sanitizeStackTrace, isProduction } from './errorSanitizer';
import { networkRateLimiter, getRateLimitKey } from './rateLimiter';
import { isRequestInfo, isRequestInit } from './typeGuards';

interface BrowserLog {
  timestamp: number;
  type: 'error' | 'warning' | 'info' | 'network' | 'performance' | 'resource' | 'webgl' | 'visibility' | 'phaser';
  category: string;
  message: string;
  data?: any;
  stack?: string;
}

interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  duration?: number;
  timestamp: number;
  type: 'fetch' | 'xhr' | 'image' | 'audio' | 'other';
}

interface PerformanceMetric {
  timestamp: number;
  memory?: {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
  fps?: number;
  frameTime?: number;
  renderTime?: number;
}

class BrowserLogger {
  private logs: BrowserLog[] = [];
  private networkRequests: NetworkRequest[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private maxLogs = 500;
  private maxNetworkRequests = 200;
  private maxPerformanceMetrics = 100;
  private originalConsole: {
    error: typeof console.error;
    warn: typeof console.warn;
    log: typeof console.log;
    info: typeof console.info;
  };
  private performanceMonitorInterval?: number;
  private isMonitoring = false;
  // Use WeakMap to store private data per XMLHttpRequest instance (prevents prototype pollution)
  private xhrDataMap = new WeakMap<XMLHttpRequest, {
    url: string | URL;
    method: string;
    startTime: number;
  }>();

  constructor() {
    // Store original console methods
    this.originalConsole = {
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      log: console.log.bind(console),
      info: console.info.bind(console),
    };

    this.setupConsoleInterception();
    this.setupNetworkInterception();
    this.setupPerformanceMonitoring();
    this.setupVisibilityTracking();
    this.setupErrorHandlers();
  }

  private log(type: BrowserLog['type'], category: string, message: string, data?: any, stack?: string): void {
    // Sanitize error messages in production
    const sanitizedMessage = type === 'error' ? sanitizeErrorMessage(message, false) : message;
    const sanitizedStack = stack ? sanitizeStackTrace(stack) : undefined;
    const sanitizedData = type === 'error' && data ? sanitizeErrorData(data) : data;
    
    const logEntry: BrowserLog = {
      timestamp: performance.now(),
      type,
      category,
      message: sanitizedMessage,
      data: sanitizedData,
      stack: sanitizedStack,
    };

    this.logs.push(logEntry);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Only log errors and warnings to console (sanitized in production)
    if (type === 'error' || type === 'warning') {
      const timeStr = logEntry.timestamp.toFixed(2);
      const dataStr = sanitizedData ? ` | ${JSON.stringify(sanitizedData)}` : '';
      if (!isProduction() || type === 'error') {
        // In production, only log errors (not warnings) and with sanitized data
        console.log(`[BrowserLogger ${timeStr}ms] [${type.toUpperCase()}] ${category}: ${sanitizedMessage}${dataStr}`);
      }
    }
  }

  private setupConsoleInterception(): void {
    // Intercept console.error (only log to our system, don't duplicate to console)
    const originalError = console.error;
    console.error = (...args: any[]) => {
      originalError.apply(console, args); // Still output to console
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      const stack = new Error().stack;
      this.log('error', 'CONSOLE', message, args.length > 1 ? args.slice(1) : undefined, stack);
      this.originalConsole.error(...args);
    };

    // Intercept console.warn
    console.warn = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      this.log('warning', 'CONSOLE', message, args.length > 1 ? args.slice(1) : undefined);
      this.originalConsole.warn(...args);
    };

    // Intercept console.log (but only log important ones to avoid spam)
    console.log = (...args: any[]) => {
      const message = String(args[0]);
      // Only log if it's not from our own logging systems
      if (!message.includes('[SceneLogger') && !message.includes('[BrowserLogger')) {
        this.log('info', 'CONSOLE', message, args.length > 1 ? args.slice(1) : undefined);
      }
      this.originalConsole.log(...args);
    };

    // Intercept console.info
    console.info = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      this.log('info', 'CONSOLE', message, args.length > 1 ? args.slice(1) : undefined);
      this.originalConsole.info(...args);
    };
  }

  private setupNetworkInterception(): void {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args: unknown[]): Promise<Response> => {
      // Validate arguments with type guards
      if (!isRequestInfo(args[0])) {
        throw new TypeError('First argument to fetch must be a RequestInfo');
      }
      
      const requestInfo = args[0];
      const requestInit = args[1] && isRequestInit(args[1]) ? args[1] : undefined;
      
      const url = typeof requestInfo === 'string' 
        ? requestInfo 
        : requestInfo instanceof Request 
          ? requestInfo.url 
          : (requestInfo && typeof requestInfo === 'object' && 'url' in requestInfo)
            ? String((requestInfo as { url: unknown }).url) 
            : '';
      const method = requestInit?.method || (requestInfo instanceof Request ? requestInfo.method : 'GET') || 'GET';
      const startTime = performance.now();
      
      // Check rate limiting
      const rateLimitKey = getRateLimitKey(url);
      if (!networkRateLimiter.isAllowed(rateLimitKey)) {
        const resetTime = networkRateLimiter.getResetTime(rateLimitKey);
        const error = new Error(`Rate limit exceeded. Please wait ${Math.ceil(resetTime / 1000)} seconds.`);
        this.log('error', 'FETCH_RATE_LIMITED', `Rate limited: ${method} ${url}`, { url, method, resetTime });
        throw error;
      }
      
      this.log('network', 'FETCH_START', `Fetching ${method} ${url}`, { url, method });
      
      try {
        const response = await originalFetch(requestInfo, requestInit);
        const duration = performance.now() - startTime;
        
        const request: NetworkRequest = {
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          duration,
          timestamp: performance.now(),
          type: url.includes('localhost') || url.includes('127.0.0.1') ? 'fetch' : 'fetch',
        };
        
        this.networkRequests.push(request);
        if (this.networkRequests.length > this.maxNetworkRequests) {
          this.networkRequests.shift();
        }
        
        this.log('network', 'FETCH_COMPLETE', `${method} ${url} - ${response.status}`, {
          status: response.status,
          statusText: response.statusText,
          duration,
          isLocalhost: url.includes('localhost') || url.includes('127.0.0.1'),
        });
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log('error', 'FETCH_ERROR', `Fetch failed: ${url}`, { 
          error: errorMessage,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          duration 
        });
        // Re-throw to maintain original behavior
        throw error;
      }
    };

    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: unknown[]) {
      // Store data in WeakMap instead of prototype pollution
      browserLogger.xhrDataMap.set(this, {
        url,
        method,
        startTime: performance.now(),
      });
      const async = (args[0] as boolean | undefined) ?? true;
      const user = args[1] as string | undefined;
      const password = args[2] as string | undefined;
      return originalXHROpen.call(this, method, url as string, async, user, password);
    };

    XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
      const xhrData = browserLogger.xhrDataMap.get(this);
      const url = xhrData?.url;
      const method = xhrData?.method;
      const startTime = xhrData?.startTime;
      
      if (url && startTime !== undefined) {
        const startTimeValue = startTime;
        this.addEventListener('load', () => {
          const duration = performance.now() - startTimeValue;
          const request: NetworkRequest = {
            url: String(url),
            method: method || 'GET',
            status: this.status,
            statusText: this.statusText,
            duration,
            timestamp: performance.now(),
            type: 'xhr',
          };
          
          browserLogger.networkRequests.push(request);
          if (browserLogger.networkRequests.length > browserLogger.maxNetworkRequests) {
            browserLogger.networkRequests.shift();
          }
          
          browserLogger.log('network', 'XHR_COMPLETE', `${method} ${url} - ${this.status}`, {
            status: this.status,
            statusText: this.statusText,
            duration,
            isLocalhost: String(url).includes('localhost') || String(url).includes('127.0.0.1'),
          });
        });

        this.addEventListener('error', () => {
          const duration = startTime !== undefined ? performance.now() - startTime : 0;
          browserLogger.log('error', 'XHR_ERROR', `XHR failed: ${url}`, { error: 'Network error', duration });
        });
      }

      return originalXHRSend.call(this, body);
    };

    // Monitor resource loading (images, audio, etc.)
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry instanceof PerformanceResourceTiming) {
              const url = entry.name;
              const duration = entry.duration;
              const type = this.getResourceType(url);
              
              this.log('resource', 'RESOURCE_LOADED', `Resource loaded: ${url}`, {
                url,
                duration,
                type,
                size: entry.transferSize,
                isLocalhost: url.includes('localhost') || url.includes('127.0.0.1'),
              });
            }
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (error) {
        this.log('warning', 'PERFORMANCE_OBSERVER', 'Failed to set up resource observer', { error });
      }
    }
  }

  private getResourceType(url: string): NetworkRequest['type'] {
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'image';
    if (url.match(/\.(mp3|ogg|wav|m4a)$/i)) return 'audio';
    return 'other';
  }

  private setupPerformanceMonitoring(): void {
    // Monitor performance metrics periodically
    this.startPerformanceMonitoring();
  }

  startPerformanceMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.performanceMonitorInterval = window.setInterval(() => {
      const metric: PerformanceMetric = {
        timestamp: performance.now(),
      };

      // Memory metrics (Chrome/Edge only)
      if ('memory' in performance && performance.memory) {
        const memory = performance.memory;
        metric.memory = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        };
      }

      // Frame timing (if available)
      if (typeof requestAnimationFrame !== 'undefined') {
        let lastFrameTime = performance.now();
        requestAnimationFrame(() => {
          const frameTime = performance.now() - lastFrameTime;
          metric.frameTime = frameTime;
          if (frameTime > 0) {
            metric.fps = 1000 / frameTime;
          }
        });
      }

      this.performanceMetrics.push(metric);
      if (this.performanceMetrics.length > this.maxPerformanceMetrics) {
        this.performanceMetrics.shift();
      }

      // Log significant memory changes
      if (metric.memory && this.performanceMetrics.length > 1) {
        const prevMetric = this.performanceMetrics[this.performanceMetrics.length - 2];
        if (prevMetric.memory) {
          const memoryIncrease = metric.memory.usedJSHeapSize! - prevMetric.memory.usedJSHeapSize!;
          if (Math.abs(memoryIncrease) > 5 * 1024 * 1024) { // 5MB change
            this.log('performance', 'MEMORY_CHANGE', `Memory changed by ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`, {
              current: metric.memory.usedJSHeapSize,
              previous: prevMetric.memory.usedJSHeapSize,
              change: memoryIncrease,
            });
          }
        }
      }
    }, intervalMs);
  }

  stopPerformanceMonitoring(): void {
    if (this.performanceMonitorInterval) {
      clearInterval(this.performanceMonitorInterval);
      this.performanceMonitorInterval = undefined;
      this.isMonitoring = false;
    }
  }

  private setupVisibilityTracking(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      const isHidden = document.hidden;
      this.log('visibility', 'PAGE_VISIBILITY', isHidden ? 'Page hidden' : 'Page visible', {
        hidden: isHidden,
        visibilityState: document.visibilityState,
      });
    });

    window.addEventListener('focus', () => {
      this.log('visibility', 'WINDOW_FOCUS', 'Window focused');
    });

    window.addEventListener('blur', () => {
      this.log('visibility', 'WINDOW_BLUR', 'Window blurred');
    });
  }

  private setupErrorHandlers(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      const errorData = isProduction() 
        ? { /* Don't include filename/line numbers in production */ }
        : {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error,
          };
      this.log('error', 'GLOBAL_ERROR', sanitizeErrorMessage(event.error || event.message, false), errorData, event.error?.stack);
    });

    // Unhandled promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.log('error', 'UNHANDLED_REJECTION', sanitizeErrorMessage(event.reason, false), sanitizeErrorData(event.reason), event.reason?.stack);
    });

    // WebGL context lost
    window.addEventListener('webglcontextlost', (event) => {
      this.log('webgl', 'CONTEXT_LOST', 'WebGL context lost', { event: event.type }, undefined);
    });

    window.addEventListener('webglcontextrestored', (event) => {
      this.log('webgl', 'CONTEXT_RESTORED', 'WebGL context restored', { event: event.type }, undefined);
    });
  }

  logPhaserEvent(event: string, data?: any): void {
    this.log('phaser', 'PHASER', event, data);
  }

  logWebGLInfo(info: any): void {
    this.log('webgl', 'WEBGL_INFO', 'WebGL information', info);
  }

  getLogs(type?: BrowserLog['type']): BrowserLog[] {
    if (type) {
      return this.logs.filter(log => log.type === type);
    }
    return [...this.logs];
  }

  getNetworkRequests(urlFilter?: string): NetworkRequest[] {
    if (urlFilter) {
      return this.networkRequests.filter(req => req.url.includes(urlFilter));
    }
    return [...this.networkRequests];
  }

  getPerformanceMetrics(): PerformanceMetric[] {
    return [...this.performanceMetrics];
  }

  getLocalhostRequests(): NetworkRequest[] {
    return this.networkRequests.filter(req => 
      req.url.includes('localhost') || req.url.includes('127.0.0.1')
    );
  }

  getRecentErrors(): BrowserLog[] {
    return this.logs.filter(log => log.type === 'error').slice(-20);
  }

  clear(): void {
    this.logs = [];
    this.networkRequests = [];
    this.performanceMetrics = [];
  }

  dump(): void {
    console.group('Browser Logger Dump');
    console.log('Total Logs:', this.logs.length);
    console.log('Network Requests:', this.networkRequests.length);
    console.log('Performance Metrics:', this.performanceMetrics.length);
    
    console.group('Recent Errors (last 10)');
    this.getRecentErrors().slice(-10).forEach(log => {
      console.error(`[${log.timestamp.toFixed(2)}ms] ${log.category}: ${log.message}`, log.data);
    });
    console.groupEnd();
    
    console.group('Localhost Requests');
    this.getLocalhostRequests().forEach(req => {
      console.log(`${req.method} ${req.url} - ${req.status} (${req.duration?.toFixed(2)}ms)`);
    });
    console.groupEnd();
    
    console.group('Performance Metrics (last 10)');
    this.performanceMetrics.slice(-10).forEach(metric => {
      console.log(`[${metric.timestamp.toFixed(2)}ms]`, {
        memory: metric.memory,
        fps: metric.fps?.toFixed(2),
        frameTime: metric.frameTime?.toFixed(2),
      });
    });
    console.groupEnd();
    
    console.group('All Logs');
    this.logs.forEach(log => {
      const timeStr = log.timestamp.toFixed(2);
      const dataStr = log.data ? ` | ${JSON.stringify(log.data)}` : '';
      console.log(`${timeStr}ms: [${log.type}] ${log.category} - ${log.message}${dataStr}`);
    });
    console.groupEnd();
    
    console.groupEnd();
  }

  dumpSummary(): void {
    const errors = this.logs.filter(l => l.type === 'error').length;
    const warnings = this.logs.filter(l => l.type === 'warning').length;
    const localhostRequests = this.getLocalhostRequests().length;
    const failedRequests = this.networkRequests.filter(r => r.status && r.status >= 400).length;
    
    console.group('Browser Logger Summary');
    console.log('Total Logs:', this.logs.length);
    console.log('Errors:', errors);
    console.log('Warnings:', warnings);
    console.log('Network Requests:', this.networkRequests.length);
    console.log('Localhost Requests:', localhostRequests);
    console.log('Failed Requests:', failedRequests);
    console.log('Performance Metrics:', this.performanceMetrics.length);
    
    if (this.performanceMetrics.length > 0) {
      const latest = this.performanceMetrics[this.performanceMetrics.length - 1];
      if (latest.memory) {
        console.log('Current Memory:', {
          used: `${(latest.memory.usedJSHeapSize! / 1024 / 1024).toFixed(2)}MB`,
          total: `${(latest.memory.totalJSHeapSize! / 1024 / 1024).toFixed(2)}MB`,
          limit: `${(latest.memory.jsHeapSizeLimit! / 1024 / 1024).toFixed(2)}MB`,
        });
      }
      if (latest.fps) {
        console.log('Current FPS:', latest.fps.toFixed(2));
      }
    }
    
    console.groupEnd();
  }
}

export const browserLogger = new BrowserLogger();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.browserLogger = browserLogger;
}






