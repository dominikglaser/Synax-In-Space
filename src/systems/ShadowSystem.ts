/**
 * Shadow system for casting shadows on objects
 */

import Phaser from 'phaser';

export interface ShadowCaster {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  shadow?: Phaser.GameObjects.Graphics;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowScale: number;
}

export class ShadowSystem {
  private casters: ShadowCaster[] = [];
  private scene: Phaser.Scene;
  private lightDirection: { x: number; y: number } = { x: 0.3, y: 0.7 }; // Light from top-left

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // Normalize light direction
    const length = Math.sqrt(this.lightDirection.x ** 2 + this.lightDirection.y ** 2);
    this.lightDirection.x /= length;
    this.lightDirection.y /= length;
  }

  /**
   * Add an object that casts shadows
   */
  addCaster(
    sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
    shadowOffset?: number
  ): ShadowCaster {
    const offset = shadowOffset ?? Math.max(sprite.width, sprite.height) * 0.15;
    const shadow = this.scene.add.graphics();
    
    // Shadow offset based on light direction
    const shadowOffsetX = this.lightDirection.x * offset;
    const shadowOffsetY = this.lightDirection.y * offset;
    const shadowScale = 0.6; // Shadows are smaller than the object
    
    shadow.setDepth(sprite.depth - 0.1); // Just behind the object
    shadow.setAlpha(0.4);
    
    const caster: ShadowCaster = {
      sprite,
      shadow,
      shadowOffsetX,
      shadowOffsetY,
      shadowScale,
    };
    
    this.casters.push(caster);
    this.updateShadow(caster);
    
    return caster;
  }

  /**
   * Remove a shadow caster
   */
  removeCaster(sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image): void {
    const index = this.casters.findIndex((c) => c.sprite === sprite);
    if (index !== -1) {
      const caster = this.casters[index]!;
      if (caster.shadow) {
        caster.shadow.destroy();
      }
      this.casters.splice(index, 1);
    }
  }

  /**
   * Update shadow graphics for a caster
   */
  private updateShadow(caster: ShadowCaster): void {
    if (!caster.shadow || !caster.sprite.active) {
      return;
    }

    const sprite = caster.sprite;
    const width = sprite.width * caster.shadowScale;
    const height = sprite.height * caster.shadowScale * 0.5; // Flatten shadow
    
    const x = sprite.x + caster.shadowOffsetX;
    const y = sprite.y + caster.shadowOffsetY;
    
    caster.shadow.clear();
    caster.shadow.fillStyle(0x000000, 0.4);
    caster.shadow.fillEllipse(x, y, width, height);
    caster.shadow.setDepth(sprite.depth - 0.1);
    caster.shadow.setVisible(sprite.visible);
  }

  /**
   * Update all shadows (call in update loop)
   */
  update(): void {
    for (const caster of this.casters) {
      if (caster.sprite.active) {
        this.updateShadow(caster);
      } else if (caster.shadow) {
        caster.shadow.setVisible(false);
      }
    }
  }

  /**
   * Clean up all shadows
   */
  destroy(): void {
    for (const caster of this.casters) {
      if (caster.shadow) {
        caster.shadow.destroy();
      }
    }
    this.casters = [];
  }
}







