/**
 * Extended Window type definitions for global debugging utilities
 */

interface Window {
  browserLogger?: import('../utils/BrowserLogger').BrowserLogger;
  sceneLogger?: import('../utils/SceneLogger').SceneLogger;
}

