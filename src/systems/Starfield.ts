/**
 * Starfield system using Simplex Noise for procedural star generation
 */

import SimplexNoise from 'simplex-noise';
import Phaser from 'phaser';

export interface StarfieldLayer {
  sprite: Phaser.GameObjects.TileSprite;
  speed: number;
}

export interface Starfield {
  layers: StarfieldLayer[];
  update(dt: number, speed: number): void;
}

/**
 * Create parallax starfield with multiple layers
 */
export function createParallaxStarfield(
  scene: Phaser.Scene,
  w: number,
  h: number
): Starfield {
  const g1 = scene.add.graphics();
  g1.fillStyle(0xffffff, 0.7);
  const g2 = scene.add.graphics();
  g2.fillStyle(0xffffff, 0.4);
  const g3 = scene.add.graphics();
  g3.fillStyle(0xffffff, 0.2);

  const noise = new SimplexNoise('stars');

  // Generate stars using noise for distribution
  for (let i = 0; i < 400; i++) {
    const x = (noise.noise2D(i * 0.1, 0) * 0.5 + 0.5) * w;
    const y = (noise.noise2D(0, i * 0.1) * 0.5 + 0.5) * h;
    g1.fillRect(x, y, 2, 2);
  }

  for (let i = 0; i < 200; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    g2.fillRect(x, y, 2, 2);
  }

  for (let i = 0; i < 100; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    g3.fillRect(x, y, 2, 2);
  }

  // Generate textures
  const l1 = g1.generateTexture('stars1', w, h);
  g1.destroy();
  const l2 = g2.generateTexture('stars2', w, h);
  g2.destroy();
  const l3 = g3.generateTexture('stars3', w, h);
  g3.destroy();

  // Create tile sprites
  const s1 = scene.add.tileSprite(0, 0, w, h, 'stars1').setOrigin(0).setDepth(-10);
  const s2 = scene.add.tileSprite(0, 0, w, h, 'stars2').setOrigin(0).setDepth(-9);
  const s3 = scene.add.tileSprite(0, 0, w, h, 'stars3').setOrigin(0).setDepth(-8);

  const layers: StarfieldLayer[] = [
    { sprite: s1, speed: 1.0 },
    { sprite: s2, speed: 0.6 },
    { sprite: s3, speed: 0.3 },
  ];

  return {
    layers,
    update(dt: number, speed: number): void {
      for (const layer of layers) {
        layer.sprite.tilePositionX += speed * layer.speed * dt;
      }
    },
  };
}

