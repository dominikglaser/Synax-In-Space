/**
 * Comprehensive debug logger specifically for MenuScene transition issues
 * Tracks scene lifecycle, object creation, renderer state, and display list
 */

export class MenuSceneDebugger {
  private static logs: Array<{
    timestamp: number;
    event: string;
    data: any;
    stack?: string;
  }> = [];

  static log(event: string, data: any = {}, includeStack: boolean = false): void {
    const logEntry = {
      timestamp: Date.now(),
      event,
      data,
      ...(includeStack ? { stack: new Error().stack } : {}),
    };
    
    this.logs.push(logEntry);
    
    // Also log to console with clear formatting
    console.log(`[MenuSceneDebug] ${event}`, data);
    
    if (includeStack) {
      console.log('Stack trace:', new Error().stack);
    }
  }

  static logError(event: string, error: any): void {
    const logEntry = {
      timestamp: Date.now(),
      event: `ERROR: ${event}`,
      data: {
        error: error?.message || String(error),
        errorType: error?.constructor?.name,
        stack: error?.stack,
      },
    };
    
    this.logs.push(logEntry);
    console.error(`[MenuSceneDebug] ERROR: ${event}`, error);
    if (error?.stack) {
      console.error('Error stack:', error.stack);
    }
  }

  static logSceneState(scene: Phaser.Scene, label: string): void {
    const state = {
      isActive: scene.scene.isActive(),
      isPaused: scene.scene.isPaused(),
      isVisible: scene.scene.isVisible(),
      isSleeping: scene.scene.isSleeping(),
      key: scene.scene.key,
      childrenCount: scene.children.list.length,
      childrenTypes: scene.children.list.map((child: any) => ({
        type: child.type,
        textureKey: child.texture?.key,
        visible: child.visible,
        active: child.active,
        depth: child.depth,
      })),
      cameraVisible: scene.cameras.main?.visible,
      cameraScroll: {
        x: scene.cameras.main?.scrollX,
        y: scene.cameras.main?.scrollY,
      },
      rendererReady: this.checkRenderer(scene.game),
    };
    
    this.log(`SCENE_STATE: ${label}`, state, true);
  }

  static logObjectCreation(type: string, success: boolean, details: any = {}): void {
    this.log(`OBJECT_CREATION: ${type}`, {
      success,
      ...details,
    }, true);
  }

  static logRendererState(game: Phaser.Game, label: string): void {
    const renderer = game.renderer as any;
    const state = {
      rendererExists: !!renderer,
      glExists: !!renderer?.gl,
      canvasExists: !!renderer?.gl?.canvas,
      contextLost: renderer?.gl && typeof renderer.gl.isContextLost === 'function' 
        ? renderer.gl.isContextLost() 
        : 'unknown',
      width: renderer?.width,
      height: renderer?.height,
    };
    
    this.log(`RENDERER_STATE: ${label}`, state);
  }

  static checkRenderer(game: Phaser.Game): boolean {
    const renderer = game.renderer as any;
    return !!(
      renderer &&
      renderer.gl &&
      renderer.gl.canvas &&
      (!renderer.gl.isContextLost || !renderer.gl.isContextLost())
    );
  }

  static logChildrenList(scene: Phaser.Scene, label: string): void {
    const children = scene.children.list.map((child: any, index: number) => {
      const info: any = {
        index,
        type: child.type,
        visible: child.visible,
        active: child.active,
        depth: child.depth,
        alpha: child.alpha,
      };
      
      if (child.texture) {
        info.textureKey = child.texture.key;
      }
      
      if (child.x !== undefined) {
        info.x = child.x;
        info.y = child.y;
      }
      
      return info;
    });
    
    this.log(`CHILDREN_LIST: ${label}`, {
      count: children.length,
      children,
    });
  }

  static logTransition(from: string, to: string, details: any = {}): void {
    this.log(`TRANSITION: ${from} -> ${to}`, details, true);
  }

  static getAllLogs(): typeof this.logs {
    return [...this.logs];
  }

  static getRecentLogs(count: number = 50): typeof this.logs {
    return this.logs.slice(-count);
  }

  static clearLogs(): void {
    this.logs = [];
  }

  static printSummary(): void {
    const errors = this.logs.filter(log => log.event.startsWith('ERROR:'));
    const transitions = this.logs.filter(log => log.event.startsWith('TRANSITION:'));
    const sceneStates = this.logs.filter(log => log.event.startsWith('SCENE_STATE:'));
    const objectCreations = this.logs.filter(log => log.event.startsWith('OBJECT_CREATION:'));
    
    console.group('[MenuSceneDebug] Summary');
    console.log('Total logs:', this.logs.length);
    console.log('Errors:', errors.length);
    console.log('Transitions:', transitions.length);
    console.log('Scene states:', sceneStates.length);
    console.log('Object creations:', objectCreations.length);
    
    if (errors.length > 0) {
      console.group('Recent Errors');
      errors.slice(-5).forEach(error => {
        console.error(error.event, error.data);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  static exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Make it available globally for easy access
if (typeof window !== 'undefined') {
  (window as any).menuSceneDebugger = MenuSceneDebugger;
}





