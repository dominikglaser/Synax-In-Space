/**
 * CameraJuice - Camera shake, zoom punch, hit stop effects
 */

import Phaser from 'phaser';

export class CameraJuice {
  private camera: Phaser.Cameras.Scene2D.CameraManager;
  private shakeTimer: number = 0;
  private shakeIntensity: number = 0;
  private zoomPunchTimer: number = 0;
  private zoomPunchAmount: number = 0;
  private hitStopTimer: number = 0;
  private originalZoom: number = 1;

  constructor(scene: Phaser.Scene) {
    this.camera = scene.cameras;
    this.originalZoom = this.camera.main.zoom;
  }

  /**
   * Trigger camera shake
   */
  shake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  /**
   * Trigger zoom punch (quick zoom in/out)
   */
  zoomPunch(amount: number, duration: number = 200): void {
    this.zoomPunchAmount = amount;
    this.zoomPunchTimer = duration;
  }

  /**
   * Trigger hit stop (brief pause)
   */
  hitStop(duration: number = 50): void {
    this.hitStopTimer = duration;
  }

  /**
   * Update camera effects (call in update loop)
   */
  update(delta: number): void {
    const mainCamera = this.camera.main;

    // Shake
    if (this.shakeTimer > 0) {
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
      if (mainCamera.scrollX !== 0 || mainCamera.scrollY !== 0) {
        mainCamera.setScroll(0, 0);
      }
    }

    // Zoom punch
    if (this.zoomPunchTimer > 0) {
      const progress = this.zoomPunchTimer / 200;
      const zoom = this.originalZoom + this.zoomPunchAmount * (1 - progress);
      mainCamera.setZoom(zoom);
      this.zoomPunchTimer -= delta;
      if (this.zoomPunchTimer <= 0) {
        this.zoomPunchTimer = 0;
        mainCamera.setZoom(this.originalZoom);
      }
    }

    // Hit stop (freeze time scaling)
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= delta;
      // Note: Actual time scaling would need to be implemented at scene level
    }
  }
}

