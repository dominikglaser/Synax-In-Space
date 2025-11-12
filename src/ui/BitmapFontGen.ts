/**
 * Runtime bitmap font generator for HUD text
 */

import Phaser from 'phaser';

const CHAR_WIDTH = 8;
const CHAR_HEIGHT = 12;
const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ: ';

/**
 * Generate a simple bitmap font for HUD text
 */
export function generateBitmapFont(scene: Phaser.Scene, fontName: string): void {
  // Create canvas for font texture
  const canvas = document.createElement('canvas');
  canvas.width = CHAR_WIDTH * CHARS.length;
  canvas.height = CHAR_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // Draw each character
  for (let i = 0; i < CHARS.length; i++) {
    const char = CHARS[i];
    const x = i * CHAR_WIDTH;
    drawChar(ctx, char, x, 0);
  }

  // Add texture
  scene.textures.addCanvas('hud-font-texture', canvas);

  // Create bitmap font data
  const fontData = {
    font: fontName,
    size: CHAR_HEIGHT,
    lineHeight: CHAR_HEIGHT,
    chars: {} as Record<string, { x: number; y: number; width: number; height: number }>,
  };

  // Generate character data
  for (let i = 0; i < CHARS.length; i++) {
    fontData.chars[CHARS[i]] = {
      x: i * CHAR_WIDTH,
      y: 0,
      width: CHAR_WIDTH,
      height: CHAR_HEIGHT,
    };
  }

  // Add bitmap font to cache
  scene.cache.bitmapFont.add(fontName, {
    data: fontData,
    texture: 'hud-font-texture',
    frame: null,
  });
}

/**
 * Draw a simple character using basic shapes
 */
function drawChar(
  ctx: CanvasRenderingContext2D,
  char: string,
  x: number,
  y: number
): void {
  // Very simple monospace font - just draw basic shapes for readability
  // This is a placeholder - in a real game you'd want proper bitmap font data
  if (char === ' ') {
    return;
  }

  ctx.fillStyle = '#ffffff';
  // Draw a simple representation (just a rectangle for now)
  // In a real implementation, you'd have proper glyph data
  ctx.fillRect(x + 1, y + 1, CHAR_WIDTH - 2, CHAR_HEIGHT - 2);
}

