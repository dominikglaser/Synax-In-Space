/**
 * Type-safe event emitter wrapper
 */

type EventMap = Record<string, (...args: unknown[]) => void>;

export class TypeSafeEventEmitter<T extends EventMap> {
  private listeners: Map<keyof T, Set<T[keyof T]>> = new Map();

  /**
   * Subscribe to an event
   */
  on<K extends keyof T>(event: K, callback: T[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof T>(event: K, callback: T[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Emit an event
   */
  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        callback(...args);
      });
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners<K extends keyof T>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}


