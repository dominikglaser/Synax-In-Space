/**
 * Scene transition logging system for debugging performance issues
 */

import { sanitizeErrorMessage, sanitizeErrorData, isProduction } from './errorSanitizer';

class SceneLogger {
  private logs: Array<{
    timestamp: number;
    scene: string;
    event: string;
    data?: any;
  }> = [];
  private maxLogs = 100;

  log(scene: string, event: string, data?: any): void {
    const logEntry = {
      timestamp: performance.now(),
      scene,
      event,
      data,
    };
    
    this.logs.push(logEntry);
    
    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Only log critical events to console
    const isCritical = event.includes('TRANSITION') || event.includes('ERROR') || event.includes('CREATE') || event.includes('SHUTDOWN');
    
    if (isCritical) {
      const timeStr = logEntry.timestamp.toFixed(2);
      const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
      console.log(`[SceneLogger ${timeStr}ms] ${scene} - ${event}${dataStr}`);
    }
  }

  logTransition(from: string, to: string, data?: any): void {
    this.log(from, `TRANSITION -> ${to}`, data);
  }

  logError(scene: string, error: string, details?: any): void {
    const sanitizedError = sanitizeErrorMessage(error, false);
    const sanitizedDetails = details ? sanitizeErrorData(details) : undefined;
    
    // Only log to console in development or for critical errors
    if (!isProduction()) {
      console.error(`[SceneLogger ERROR] ${scene} - ${sanitizedError}`, sanitizedDetails);
    }
    this.log(scene, `ERROR: ${sanitizedError}`, sanitizedDetails);
  }

  getLogs(): Array<{ timestamp: number; scene: string; event: string; data?: any }> {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }

  dump(): void {
    console.group('Scene Transition Log');
    this.logs.forEach((log) => {
      const timeStr = log.timestamp.toFixed(2);
      const dataStr = log.data ? ` | ${JSON.stringify(log.data)}` : '';
      console.log(`${timeStr}ms: ${log.scene} - ${log.event}${dataStr}`);
    });
    console.groupEnd();
  }

  checkSceneStates(game: Phaser.Game): void {
    const activeScenes = game.scene.getScenes(true);
    const inactiveScenes = game.scene.getScenes(false);
    
    console.group('Current Scene States');
    console.log('Active Scenes:', activeScenes.map(s => ({ 
      key: s.scene.key, 
      active: s.scene.isActive(), 
      paused: s.scene.isPaused(),
      visible: s.scene.isVisible()
    })));
    console.log('Inactive Scenes:', inactiveScenes.map(s => ({ 
      key: s.scene.key, 
      active: s.scene.isActive(), 
      paused: s.scene.isPaused(),
      visible: s.scene.isVisible()
    })));
    console.groupEnd();
    
    this.log('System', 'SCENE_STATE_CHECK', {
      active: activeScenes.map(s => s.scene.key),
      inactive: inactiveScenes.map(s => s.scene.key),
    });
  }
}

export const sceneLogger = new SceneLogger();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.sceneLogger = sceneLogger;
}

