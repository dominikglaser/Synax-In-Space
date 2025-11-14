/**
 * Extended Phaser type definitions
 */

declare namespace Phaser {
  namespace Renderer {
    namespace WebGL {
      interface WebGLRenderer {
        gl: WebGLRenderingContext | WebGL2RenderingContext;
      }
    }
  }
}

