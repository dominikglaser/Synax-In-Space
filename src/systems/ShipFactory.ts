/**
 * ShipFactory - Composes ships from small sprite "modules" for kitbashing
 */

import Phaser from 'phaser';

export interface ShipModule {
  name: string;
  texture: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  tint?: number;
}

export interface ShipRecipe {
  modules: ShipModule[];
  width: number;
  height: number;
}

export class ShipFactory {
  /**
   * Create a ship from modules
   */
  static createShip(
    scene: Phaser.Scene,
    recipe: ShipRecipe,
    x: number,
    y: number
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);

    for (const module of recipe.modules) {
      const sprite = scene.add.sprite(module.x, module.y, module.texture);
      sprite.setRotation(module.rotation);
      sprite.setScale(module.scale);
      if (module.tint !== undefined) {
        sprite.setTint(module.tint);
      }
      container.add(sprite);
    }

    container.setSize(recipe.width, recipe.height);
    return container;
  }

  /**
   * Generate a random ship recipe
   */
  static generateRandomRecipe(
    rng: { float(): number; int(min: number, max: number): number }
  ): ShipRecipe {
    const modules: ShipModule[] = [];

    // Body
    modules.push({
      name: 'body',
      texture: 'ship-body',
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
    });

    // Wings (random)
    if (rng.float() > 0.3) {
      modules.push({
        name: 'wing-left',
        texture: 'ship-wing',
        x: -10,
        y: 5,
        rotation: -0.2,
        scale: 0.8,
      });
    }
    if (rng.float() > 0.3) {
      modules.push({
        name: 'wing-right',
        texture: 'ship-wing',
        x: 10,
        y: 5,
        rotation: 0.2,
        scale: 0.8,
      });
    }

    // Engine
    modules.push({
      name: 'engine',
      texture: 'ship-engine',
      x: -15,
      y: 0,
      rotation: 0,
      scale: 0.9,
      tint: 0xffff00,
    });

    return {
      modules,
      width: 40,
      height: 28,
    };
  }
}

