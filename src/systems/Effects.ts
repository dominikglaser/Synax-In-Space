/**
 * Visual effects system: hit flash, screen shake, muzzle flash, particles
 */

import Phaser from 'phaser';
import { colord } from 'colord';
import { BALANCER } from './Balancer';

/**
 * Simple bezier easing function (replaces bezier-easing package for ESM compatibility)
 */
function bezierEasing(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  return (t: number): number => {
    // Simple cubic bezier approximation
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;

    function sampleCurveX(t: number): number {
      return ((ax * t + bx) * t + cx) * t;
    }

    function sampleCurveY(t: number): number {
      return ((ay * t + by) * t + cy) * t;
    }

    function solve(x: number): number {
      let t0 = 0;
      let t1 = 1;
      let t2 = x;
      let x2 = 0;
      for (let i = 0; i < 8; i++) {
        x2 = sampleCurveX(t2) - x;
        if (Math.abs(x2) < 0.001) return sampleCurveY(t2);
        if (x2 > 0) t1 = t2;
        else t0 = t2;
        t2 = (t1 - t0) * 0.5 + t0;
      }
      return sampleCurveY(t2);
    }

    return solve(t);
  };
}

/**
 * Easing functions for animations
 */
export const easing = {
  easeOut: bezierEasing(0.16, 1, 0.3, 1),
  easeIn: bezierEasing(0.32, 0, 0.67, 0),
  easeInOut: bezierEasing(0.42, 0, 0.58, 1),
};

/**
 * Apply hit flash tint to a color
 */
export function hitFlashTint(base: number, amount = 0.35): number {
  // Manual color mixing since colord v2 doesn't have mix/interpolate
  const baseColor = colord(`#${base.toString(16).padStart(6, '0')}`);
  const white = colord('#ffffff');
  const baseRgb = baseColor.toRgb();
  const whiteRgb = white.toRgb();
  const mixedRgb = {
    r: Math.round(baseRgb.r * (1 - amount) + whiteRgb.r * amount),
    g: Math.round(baseRgb.g * (1 - amount) + whiteRgb.g * amount),
    b: Math.round(baseRgb.b * (1 - amount) + whiteRgb.b * amount),
  };
  const c = colord(mixedRgb);
  return parseInt(c.toHex().slice(1), 16);
}

export class Effects {
  private camera: Phaser.Cameras.Scene2D.CameraManager;
  private shakeTimer: number = 0;
  private shakeIntensity: number = 0;

  constructor(scene: Phaser.Scene) {
    this.camera = scene.cameras;
  }

  /**
   * Trigger screen shake
   */
  shake(intensity?: number, duration?: number): void {
    this.shakeIntensity = intensity ?? BALANCER.shakeIntensity;
    this.shakeTimer = duration ?? BALANCER.shakeDuration;
  }

  /**
   * Update shake effect (call in update loop)
   */
    update(_time: number, delta: number): void {
    if (this.shakeTimer > 0) {
      const mainCamera = this.camera.main;
      // Calculate offset relative to original scroll position (0, 0)
      // Camera should stay at (0, 0) scroll position, only shake within bounds
      const offsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      const offsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;

      // Set scroll to offset only (not accumulated)
      // This ensures camera doesn't drift over time
      mainCamera.setScroll(offsetX, offsetY);

      this.shakeTimer -= delta;
      if (this.shakeTimer <= 0) {
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        // Reset camera to original position when shake ends
        mainCamera.setScroll(0, 0);
      }
    } else {
      // Ensure camera is reset when not shaking
      const mainCamera = this.camera.main;
      if (mainCamera.scrollX !== 0 || mainCamera.scrollY !== 0) {
        mainCamera.setScroll(0, 0);
      }
    }
  }

  /**
   * Create hit flash effect on sprite
   */
  hitFlash(sprite: Phaser.GameObjects.Sprite, duration: number = 100): void {
      // Original tint available if needed in future
      // const originalTint = sprite.tint;
    sprite.setTint(0xffffff);

    sprite.scene.time.delayedCall(duration, () => {
      sprite.clearTint();
    });
  }

  /**
   * Create muzzle flash effect
   */
  muzzleFlash(
    scene: Phaser.Scene,
    x: number,
    y: number,
    angle: number
  ): Phaser.GameObjects.Sprite {
    const flash = scene.add.sprite(x, y, 'bullet-player');
    flash.setScale(2);
    flash.setRotation(angle);
    flash.setTint(0xffff00);
    flash.setAlpha(0.8);

    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 0.5,
      duration: 50,
      onComplete: () => {
        flash.destroy();
      },
    });

    return flash;
  }

  /**
   * Create explosion particles
   */
  explosion(
    scene: Phaser.Scene,
    x: number,
    y: number,
    color: number = 0xffff00
  ): void {
    const particles = scene.add.particles(x, y, 'bullet-player', {
      speed: { min: 50, max: 200 },
      scale: { start: 1, end: 0 },
      lifespan: 500,
      quantity: 20,
      tint: color,
    });

    scene.time.delayedCall(500, () => {
      particles.destroy();
    });
  }

  /**
   * Create trail effect for moving object
   */
  trail(
    scene: Phaser.Scene,
    x: number,
    y: number,
    color: number = 0x00ffff
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    return scene.add.particles(x, y, 'bullet-player', {
      speed: 0,
      scale: { start: 0.3, end: 0 },
      lifespan: 200,
      quantity: 1,
      tint: color,
      follow: undefined,
    });
  }

  /**
   * Create bomb explosion wave effect (expanding wave from center across screen)
   */
  bombWave(
    scene: Phaser.Scene,
    startX: number,
    startY: number,
    screenWidth: number,
    screenHeight: number
  ): void {
    // Calculate max radius to cover entire screen (diagonal)
    const maxRadius = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight) * 0.6;
    
    // Create multiple expanding circles for wave effect
    const waveCount = 3;
    const waveDuration = 800; // milliseconds
    
    for (let i = 0; i < waveCount; i++) {
      const delay = i * 150; // Stagger waves
      
      scene.time.delayedCall(delay, () => {
        // Create expanding circle graphic
        const graphics = scene.add.graphics();
        
        // Outer glow
        graphics.lineStyle(8, 0xffff00, 0.8);
        graphics.strokeCircle(startX, startY, 0);
        
        // Inner bright ring
        graphics.lineStyle(4, 0xffffff, 1);
        graphics.strokeCircle(startX, startY, 0);
        
        // Animate expansion
        scene.tweens.add({
          targets: graphics,
          props: {
            alpha: { value: 0, duration: waveDuration },
          },
          onUpdate: (tween: Phaser.Tweens.Tween) => {
            const progress = tween.progress;
            const radius = progress * maxRadius;
            const alpha = 1 - progress;
            
            graphics.clear();
            
            // Outer glow (yellow/orange)
            graphics.lineStyle(12, 0xffff00, alpha * 0.6);
            graphics.strokeCircle(startX, startY, radius);
            
            graphics.lineStyle(8, 0xff8800, alpha * 0.8);
            graphics.strokeCircle(startX, startY, radius);
            
            // Inner bright ring (white/yellow)
            graphics.lineStyle(6, 0xffffff, alpha);
            graphics.strokeCircle(startX, startY, radius * 0.9);
            
            graphics.lineStyle(4, 0xffff00, alpha * 0.9);
            graphics.strokeCircle(startX, startY, radius * 0.85);
            
            // Core bright flash
            if (progress < 0.3) {
              graphics.fillStyle(0xffffff, alpha * 0.5);
              graphics.fillCircle(startX, startY, radius * 0.3);
            }
          },
          onComplete: () => {
            graphics.destroy();
          },
        });
      });
    }
    
    // Add particle burst at center
    const particles = scene.add.particles(startX, startY, 'bullet-player', {
      speed: { min: 100, max: 400 },
      scale: { start: 2, end: 0 },
      lifespan: 600,
      quantity: 50,
      tint: 0xffff00,
      angle: { min: 0, max: 360 },
    });
    
    scene.time.delayedCall(600, () => {
      particles.destroy();
    });
  }
}


