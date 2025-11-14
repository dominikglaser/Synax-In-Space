/**
 * Type guard utilities for safe type checking
 */

/**
 * Type guard to check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value);
}

/**
 * Type guard to check if value is a valid URL string
 */
export function isUrlString(value: unknown): value is string {
  if (!isString(value)) {
    return false;
  }
  try {
    new URL(value, window.location.href);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard to check if value is an array
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Type guard to check if value is a WebGL renderer
 */
export function isWebGLRenderer(
  renderer: Phaser.Renderer.WebGL.WebGLRenderer | Phaser.Renderer.Canvas.CanvasRenderer
): renderer is Phaser.Renderer.WebGL.WebGLRenderer {
  return renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer;
}

/**
 * Type guard to check if object has a property
 */
export function hasProperty<T extends string>(
  obj: unknown,
  prop: T
): obj is Record<T, unknown> {
  return typeof obj === 'object' && obj !== null && prop in obj;
}

/**
 * Type guard to check if object has a method
 */
export function hasMethod<T extends string>(
  obj: unknown,
  method: T
): obj is Record<T, (...args: unknown[]) => unknown> {
  return hasProperty(obj, method) && typeof (obj as Record<string, unknown>)[method] === 'function';
}

/**
 * Type guard to check if value is a valid RequestInfo
 */
export function isRequestInfo(value: unknown): value is RequestInfo {
  return (
    isString(value) ||
    value instanceof Request ||
    (typeof value === 'object' && value !== null && 'url' in value)
  );
}

/**
 * Type guard to check if value is a valid RequestInit
 */
export function isRequestInit(value: unknown): value is RequestInit {
  return typeof value === 'object' && value !== null;
}

