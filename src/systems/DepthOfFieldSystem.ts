/**
 * Depth of field system - applies blur and scale based on depth
 */

import Phaser from 'phaser';

export interface DepthObject {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  baseDepth: number;
  baseScale: number;
  baseAlpha?: number;
}

export class DepthOfFieldSystem {
  private objects: DepthObject[] = [];
  private scene: Phaser.Scene;
  private cameraDepth: number = 10; // Objects at depth 10 (player) are in focus
  private blurRange: number = 20; // Depth range for blur effect (increased)
  private maxBlur: number = 3; // Maximum blur amount

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Add an object to apply depth of field to
   */
  addObject(
    sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
    baseDepth: number
  ): DepthObject {
    const baseScale = sprite.scaleX;
    const baseAlpha = sprite.alpha;
    const obj: DepthObject = {
      sprite,
      baseDepth,
      baseScale,
      baseAlpha,
    };
    
    this.objects.push(obj);
    this.updateDepthEffect(obj);
    
    return obj;
  }

  /**
   * Remove an object from depth of field
   */
  removeObject(sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image): void {
    const index = this.objects.findIndex((o) => o.sprite === sprite);
    if (index !== -1) {
      this.objects.splice(index, 1);
    }
  }

  /**
   * Update depth effect for an object
   */
  private updateDepthEffect(obj: DepthObject): void {
    if (!obj.sprite.active) {
      return;
    }

    const depth = obj.sprite.depth;
    const depthDiff = Math.abs(depth - this.cameraDepth);
    
    // Calculate blur amount based on distance from camera depth
    const blurAmount = Math.min((depthDiff / this.blurRange) * this.maxBlur, this.maxBlur);
    
    // Calculate scale based on depth (objects farther appear smaller)
    // Much more subtle effect - only apply to background objects far from camera
    const scaleFactor = depth < 0 
      ? 1 - (depthDiff / this.blurRange) * 0.1  // Background: up to 10% smaller
      : 1 - (depthDiff / this.blurRange) * 0.05; // Foreground: up to 5% smaller
    const newScale = obj.baseScale * Math.max(scaleFactor, 0.95); // Minimum 95% scale (keep objects visible)
    
    // Apply scale
    obj.sprite.setScale(newScale);
    
    // Apply alpha based on depth (objects farther are slightly more transparent)
    // Keep alpha changes very subtle to maintain visibility
    const alphaFactor = depth < 0
      ? 1 - (depthDiff / this.blurRange) * 0.15  // Background: up to 15% more transparent
      : 1 - (depthDiff / this.blurRange) * 0.05;  // Foreground: up to 5% more transparent
    const baseAlpha = obj.baseAlpha ?? 1;
    obj.sprite.setAlpha(baseAlpha * Math.max(alphaFactor, 0.9)); // Minimum 90% alpha (keep visible)
    
    // Note: Phaser 3 doesn't have built-in blur filters for sprites
    // We simulate blur by reducing alpha and scale
    // For true blur, we'd need WebGL shaders or plugins
  }

  /**
   * Update all depth effects (call in update loop)
   */
  update(): void {
    for (const obj of this.objects) {
      if (obj.sprite.active) {
        this.updateDepthEffect(obj);
      }
    }
  }

  /**
   * Set camera focus depth
   */
  setCameraDepth(depth: number): void {
    this.cameraDepth = depth;
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.objects = [];
  }
}

