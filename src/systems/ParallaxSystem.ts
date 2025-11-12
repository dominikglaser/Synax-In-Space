/**
 * Parallax system for background layers with seamless looping
 */

import Phaser from 'phaser';
import { BALANCER } from './Balancer';
import { GAME_CONFIG } from '../config/constants';
import { ShadowSystem } from './ShadowSystem';
import { DepthOfFieldSystem } from './DepthOfFieldSystem';

interface ParallaxLayer {
  image1: Phaser.GameObjects.Image;
  image2: Phaser.GameObjects.Image;
  speed: number;
}

interface BackgroundObject {
  sprite: Phaser.GameObjects.Image;
  scrollSpeed: number;
  size: number;
}

export class ParallaxSystem {
  private layers: ParallaxLayer[] = [];
  private meteorites: BackgroundObject[] = [];
  private wreckedStations: BackgroundObject[] = [];
  private wreckedShips: BackgroundObject[] = [];
  private deadSpacemen: BackgroundObject[] = [];
  private scene?: Phaser.Scene;
  private wreckSpawnTimer: number = 0;
  private spacemanSpawnTimer: number = 0;
  private shadowSystem?: ShadowSystem;
  private depthOfFieldSystem?: DepthOfFieldSystem;

  /**
   * Create parallax layers with seamless looping
   */
  createLayers(scene: Phaser.Scene, shadowSystem?: ShadowSystem, depthOfFieldSystem?: DepthOfFieldSystem): void {
    this.scene = scene;
    this.shadowSystem = shadowSystem;
    this.depthOfFieldSystem = depthOfFieldSystem;

    // Ensure renderer is ready before creating images
    if (!scene.game.renderer || !scene.game.renderer.gl) {
      scene.time.delayedCall(100, () => this.createLayers(scene, shadowSystem, depthOfFieldSystem));
      return;
    }

    // Check if required textures exist before creating images
    const requiredTextures = ['bg-far', 'bg-mid', 'bg-near'];
    for (const textureKey of requiredTextures) {
      if (!scene.textures.exists(textureKey)) {
        return;
      }
    }

    // Far layer - create two copies side by side
    // Start with image1 at x=0 and image2 immediately to its right
    try {
      const far1 = scene.add.image(0, 0, 'bg-far').setOrigin(0, 0);
      const far2 = scene.add.image(GAME_CONFIG.width, 0, 'bg-far').setOrigin(0, 0);
      far1.setDisplaySize(GAME_CONFIG.width, GAME_CONFIG.height);
      far2.setDisplaySize(GAME_CONFIG.width, GAME_CONFIG.height);
      far1.setDepth(-10);
      far2.setDepth(-10);
      this.layers.push({
        image1: far1,
        image2: far2,
        speed: GAME_CONFIG.parallaxSpeeds.far,
      });
    } catch (e) {
      return;
    }

    // Mid layer
    try {
      const mid1 = scene.add.image(0, 0, 'bg-mid').setOrigin(0, 0);
      const mid2 = scene.add.image(GAME_CONFIG.width, 0, 'bg-mid').setOrigin(0, 0);
      mid1.setDisplaySize(GAME_CONFIG.width, GAME_CONFIG.height);
      mid2.setDisplaySize(GAME_CONFIG.width, GAME_CONFIG.height);
      mid1.setDepth(-9);
      mid2.setDepth(-9);
      this.layers.push({
        image1: mid1,
        image2: mid2,
        speed: GAME_CONFIG.parallaxSpeeds.mid,
      });
    } catch (e) {
      return;
    }

    // Near layer
    try {
      const near1 = scene.add.image(0, 0, 'bg-near').setOrigin(0, 0);
      const near2 = scene.add.image(GAME_CONFIG.width, 0, 'bg-near').setOrigin(0, 0);
      near1.setDisplaySize(GAME_CONFIG.width, GAME_CONFIG.height);
      near2.setDisplaySize(GAME_CONFIG.width, GAME_CONFIG.height);
      near1.setDepth(-8);
      near2.setDepth(-8);
      this.layers.push({
        image1: near1,
        image2: near2,
        speed: GAME_CONFIG.parallaxSpeeds.near,
      });
    } catch (e) {
      return;
    }

    // Initialize meteorites of various sizes
    try {
      this.initializeMeteorites(scene);
    } catch (e) {
    }
    
    // Spawn initial wrecked objects immediately for visibility
    try {
      if (scene.textures.exists('wrecked-station')) {
        this.spawnWreckedStation(scene);
      }
      if (scene.textures.exists('broken-ship')) {
        this.spawnWreckedShip(scene);
      }
      // Ensure space-suit texture exists for dead spacemen
      if (!scene.textures.exists('space-suit-human')) {
        this.generateSpaceSuitTexture(scene);
      }
      // Don't spawn initial dead spaceman - let timer-based spawning handle it
      // This ensures they only appear after the game starts scrolling
    } catch (e) {
    }
  }

  /**
   * Initialize meteorites in the background - small and big (at least enemy size)
   */
  private initializeMeteorites(scene: Phaser.Scene): void {
    const meteoriteCount = 30; // More meteorites
    const rng = (scene as any).rng;
    const minSize = 84; // Smallest enemy size (sineFlyer is 84px)

    // Clear any existing meteorites first
    this.meteorites.forEach((m) => m.sprite.destroy());
    this.meteorites = [];

    for (let i = 0; i < meteoriteCount; i++) {
      // Vary sizes - small (84-120) and big (150-300) - all at least enemy size
      const sizeType = rng ? rng.float() : Math.random();
      const size = sizeType < 0.6 
        ? (rng ? rng.floatRange(minSize, 120) : Math.random() * (120 - minSize) + minSize) // Small meteorites (at least enemy size)
        : (rng ? rng.floatRange(150, 300) : Math.random() * 150 + 150); // Big meteorites
      
      const x = rng ? rng.floatRange(-GAME_CONFIG.width, GAME_CONFIG.width * 3) : Math.random() * (GAME_CONFIG.width * 4) - GAME_CONFIG.width;
      const y = rng ? rng.floatRange(0, GAME_CONFIG.height) : Math.random() * GAME_CONFIG.height;
      const depth = rng ? rng.floatRange(-7, -5) : Math.random() * 2 - 7; // In front of background layers (-10, -9, -8)
      const speed = rng ? rng.floatRange(0.2, 0.5) : Math.random() * 0.3 + 0.2;
      const rotation = rng ? rng.floatRange(0, Math.PI * 2) : Math.random() * Math.PI * 2;

      // Ensure texture exists
      if (!scene.textures.exists('meteorite')) {
        continue;
      }

      const meteorite = scene.add.image(x, y, 'meteorite');
      meteorite.setDisplaySize(size, size);
      meteorite.setDepth(depth);
      meteorite.setAlpha(1); // Fully opaque, not translucent
      meteorite.setRotation(rotation);
      meteorite.setVisible(true);
      meteorite.setActive(true);

      this.meteorites.push({
        sprite: meteorite,
        scrollSpeed: speed,
        size: size,
      });
      
      // Add to shadow and depth of field systems
      if (this.shadowSystem) {
        this.shadowSystem.addCaster(meteorite);
      }
      if (this.depthOfFieldSystem) {
        this.depthOfFieldSystem.addObject(meteorite, depth);
      }
    }
    
  }

  /**
   * Spawn a wrecked space station in the background
   */
  private spawnWreckedStation(scene: Phaser.Scene): void {
    // Ensure texture exists
    if (!scene.textures.exists('wrecked-station')) {
      return;
    }
    
    const rng = (scene as any).rng;
    const minSize = 84; // Smallest enemy size
    const size = rng ? rng.floatRange(300, 500) : Math.random() * 200 + 300; // Huge - 300-500px
    const x = GAME_CONFIG.width + 100;
    const y = rng ? rng.floatRange(GAME_CONFIG.height * 0.2, GAME_CONFIG.height * 0.8) : Math.random() * GAME_CONFIG.height * 0.6 + GAME_CONFIG.height * 0.2;
    const depth = rng ? rng.floatRange(-7, -5) : Math.random() * 2 - 7; // In front of background layers
    const speed = rng ? rng.floatRange(0.15, 0.25) : Math.random() * 0.1 + 0.15;
    const rotation = rng ? rng.floatRange(0, Math.PI * 2) : Math.random() * Math.PI * 2;

    const station = scene.add.image(x, y, 'wrecked-station');
    station.setDisplaySize(size, size);
    station.setDepth(depth);
    station.setAlpha(1); // Fully opaque, not translucent
    station.setRotation(rotation);
    station.setVisible(true);
    station.setActive(true);
    
    // Apply darker grey tint (darker than meteorites which are #4a4a4a)
    // Using setTint to darken the existing texture colors
    // Meteorites are #4a4a4a, so we'll make stations/ships darker but not black
    station.setTint(0x666666); // Darkens by multiplying, resulting in darker grey

    this.wreckedStations.push({
      sprite: station,
      scrollSpeed: speed,
      size: size,
    });
    
    // Add to shadow and depth of field systems
    if (this.shadowSystem) {
      this.shadowSystem.addCaster(station);
    }
    if (this.depthOfFieldSystem) {
      this.depthOfFieldSystem.addObject(station, depth);
    }
    
  }

  /**
   * Spawn a wrecked spaceship in the background
   */
  private spawnWreckedShip(scene: Phaser.Scene): void {
    // Ensure texture exists
    if (!scene.textures.exists('broken-ship')) {
      return;
    }
    
    const rng = (scene as any).rng;
    const minSize = 84; // Smallest enemy size
    const size = rng ? rng.floatRange(minSize, 250) : Math.random() * (250 - minSize) + minSize; // At least enemy size, up to 250
    const x = GAME_CONFIG.width + 100;
    const y = rng ? rng.floatRange(GAME_CONFIG.height * 0.2, GAME_CONFIG.height * 0.8) : Math.random() * GAME_CONFIG.height * 0.6 + GAME_CONFIG.height * 0.2;
    const depth = rng ? rng.floatRange(-7, -5) : Math.random() * 2 - 7; // In front of background layers
    const speed = rng ? rng.floatRange(0.2, 0.35) : Math.random() * 0.15 + 0.2;
    const rotation = rng ? rng.floatRange(0, Math.PI * 2) : Math.random() * Math.PI * 2;

    const ship = scene.add.image(x, y, 'broken-ship');
    ship.setDisplaySize(size, size);
    ship.setDepth(depth);
    ship.setAlpha(1); // Fully opaque, not translucent
    ship.setRotation(rotation);
    ship.setVisible(true);
    ship.setActive(true);
    
    // Apply darker grey tint (darker than meteorites which are #4a4a4a)
    // Using setTint to darken the existing texture colors
    // Meteorites are #4a4a4a, so we'll make stations/ships darker but not black
    ship.setTint(0x666666); // Darkens by multiplying, resulting in darker grey

    this.wreckedShips.push({
      sprite: ship,
      scrollSpeed: speed,
      size: size,
    });
    
    // Add to shadow and depth of field systems
    if (this.shadowSystem) {
      this.shadowSystem.addCaster(ship);
    }
    if (this.depthOfFieldSystem) {
      this.depthOfFieldSystem.addObject(ship, depth);
    }
    
  }

  /**
   * Generate space-suit human texture (for dead spacemen)
   */
  private generateSpaceSuitTexture(scene: Phaser.Scene): void {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Enable pixelated rendering
    ctx.imageSmoothingEnabled = false;
    
    // Space suit body (white/light grey)
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(8, 12, 16, 20); // Body
    
    // Helmet (round, transparent visor)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, 10, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Visor (dark blue/black)
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(16, 10, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Visor reflection (slight highlight)
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(12, 8, 8, 4);
    
    // Arms (extended)
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(4, 14, 4, 12); // Left arm
    ctx.fillRect(24, 14, 4, 12); // Right arm
    
    // Legs (slightly spread)
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(10, 28, 4, 4); // Left leg
    ctx.fillRect(18, 28, 4, 4); // Right leg
    
    // Oxygen tank on back (small rectangle)
    ctx.fillStyle = '#888888';
    ctx.fillRect(20, 16, 6, 8);
    
    // Details (suit seams)
    ctx.strokeStyle = '#b0b0b0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, 16);
    ctx.lineTo(20, 16);
    ctx.moveTo(12, 20);
    ctx.lineTo(20, 20);
    ctx.stroke();
    
    // Blood stains and streaks (red accents for bleeding)
    ctx.fillStyle = '#8b0000'; // Dark red blood
    // Blood streak on chest
    ctx.fillRect(12, 14, 8, 2);
    ctx.fillRect(14, 16, 4, 3);
    
    // Blood on left arm
    ctx.fillRect(5, 18, 2, 4);
    
    // Blood on right arm
    ctx.fillRect(25, 20, 2, 3);
    
    // Blood on helmet (cracked visor effect)
    ctx.fillStyle = '#cc0000'; // Brighter red
    ctx.fillRect(14, 9, 4, 2);
    
    // Blood drips on body
    ctx.fillStyle = '#6b0000'; // Darker red
    ctx.fillRect(13, 22, 2, 4);
    ctx.fillRect(17, 24, 2, 3);
    
    scene.textures.addCanvas('space-suit-human', canvas);
  }

  /**
   * Spawn a dead spaceman in the background
   */
  private spawnDeadSpaceman(scene: Phaser.Scene): void {
    // Ensure texture exists
    if (!scene.textures.exists('space-suit-human')) {
      return;
    }
    
    const rng = (scene as any).rng;
    const size = rng ? rng.floatRange(24, 40) : Math.random() * 16 + 24; // Small - 24-40px
    const x = GAME_CONFIG.width + 100; // Spawn off the right side, like stations and ships
    const y = rng ? rng.floatRange(GAME_CONFIG.height * 0.2, GAME_CONFIG.height * 0.8) : Math.random() * GAME_CONFIG.height * 0.6 + GAME_CONFIG.height * 0.2;
    const depth = rng ? rng.floatRange(-7, -5) : Math.random() * 2 - 7; // In front of background layers
    const speed = rng ? rng.floatRange(0.2, 0.35) : Math.random() * 0.15 + 0.2; // Similar speed to wrecked ships
    const rotation = rng ? rng.floatRange(0, Math.PI * 2) : Math.random() * Math.PI * 2;

    const spaceman = scene.add.image(x, y, 'space-suit-human');
    spaceman.setDisplaySize(size, size);
    spaceman.setDepth(depth);
    spaceman.setAlpha(0.7 + (rng ? rng.float() : Math.random()) * 0.3); // 0.7-1.0 alpha (ghostly)
    spaceman.setRotation(rotation);
    spaceman.setVisible(true);
    spaceman.setActive(true);

    this.deadSpacemen.push({
      sprite: spaceman,
      scrollSpeed: speed,
      size: size,
    });
    
    // Add to shadow and depth of field systems
    if (this.shadowSystem) {
      this.shadowSystem.addCaster(spaceman);
    }
    if (this.depthOfFieldSystem) {
      this.depthOfFieldSystem.addObject(spaceman, depth);
    }
    
  }

  /**
   * Generate meteorite texture
   */
  static generateMeteoriteTexture(scene: Phaser.Scene): void {
    const size = 200;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Use fixed seed for consistent meteorite shape
    const seed = 12345;
    let seedValue = seed;

    // Simple seeded random
    const seededRandom = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };

    // Draw irregular rock shape
    ctx.fillStyle = '#4a4a4a';
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;

    // Create irregular polygon
    const points = 8;
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radius = size / 2 * (0.7 + seededRandom() * 0.3);
      const x = size / 2 + Math.cos(angle) * radius;
      const y = size / 2 + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Add surface details/craters
    ctx.fillStyle = '#3a3a3a';
    for (let i = 0; i < 5; i++) {
      const x = size / 2 + (seededRandom() - 0.5) * size * 0.6;
      const y = size / 2 + (seededRandom() - 0.5) * size * 0.6;
      const r = seededRandom() * 15 + 5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add highlights
    ctx.fillStyle = '#6a6a6a';
    ctx.beginPath();
    ctx.arc(size * 0.3, size * 0.3, 8, 0, Math.PI * 2);
    ctx.fill();

    scene.textures.addCanvas('meteorite', canvas);
  }

  /**
   * Update parallax scrolling with seamless looping
   */
  update(delta: number): void {
    const deltaSeconds = delta / 1000;
    const baseScrollSpeed = BALANCER.scrollSpeed;

    // Update background layers
    for (const layer of this.layers) {
      const speed = baseScrollSpeed * layer.speed;
      layer.image1.x -= speed * deltaSeconds;
      layer.image2.x -= speed * deltaSeconds;

      // Seamless wrap - when an image completely exits the left side, move it to the right
      // We need to ensure one image is always visible and positioned correctly
      const image1RightEdge = layer.image1.x + GAME_CONFIG.width;
      const image2RightEdge = layer.image2.x + GAME_CONFIG.width;
      
      // Check if image1 has completely scrolled off the left edge
      if (image1RightEdge <= 0) {
        // Position image1 to the right of image2
        layer.image1.x = layer.image2.x + GAME_CONFIG.width;
      }
      
      // Check if image2 has completely scrolled off the left edge
      if (image2RightEdge <= 0) {
        // Position image2 to the right of image1
        layer.image2.x = layer.image1.x + GAME_CONFIG.width;
      }
      
      // Ensure proper ordering - the rightmost image should always be positioned correctly
      // This prevents any gaps or overlaps
      if (layer.image1.x > layer.image2.x) {
        // image1 is to the right, ensure image2 is one width to its left
        if (layer.image2.x < layer.image1.x - GAME_CONFIG.width - 1) {
          layer.image2.x = layer.image1.x - GAME_CONFIG.width;
        }
      } else {
        // image2 is to the right, ensure image1 is one width to its left
        if (layer.image1.x < layer.image2.x - GAME_CONFIG.width - 1) {
          layer.image1.x = layer.image2.x - GAME_CONFIG.width;
        }
      }
    }

    // Update meteorites
    for (const meteorite of this.meteorites) {
      const speed = baseScrollSpeed * meteorite.scrollSpeed;
      meteorite.sprite.x -= speed * deltaSeconds;

      // Wrap meteorites
      if (meteorite.sprite.x < -200) {
        meteorite.sprite.x = GAME_CONFIG.width + 200;
        meteorite.sprite.y = Math.random() * GAME_CONFIG.height;
        meteorite.sprite.rotation = Math.random() * Math.PI * 2;
      }
    }

    // Update wrecked stations
    for (let i = this.wreckedStations.length - 1; i >= 0; i--) {
      const station = this.wreckedStations[i]!;
      const speed = baseScrollSpeed * station.scrollSpeed;
      station.sprite.x -= speed * deltaSeconds;
      
      // Remove if off screen
      if (station.sprite.x < -station.size) {
        if (this.shadowSystem) {
          this.shadowSystem.removeCaster(station.sprite);
        }
        if (this.depthOfFieldSystem) {
          this.depthOfFieldSystem.removeObject(station.sprite);
        }
        station.sprite.destroy();
        this.wreckedStations.splice(i, 1);
      }
    }

    // Update wrecked ships
    for (let i = this.wreckedShips.length - 1; i >= 0; i--) {
      const ship = this.wreckedShips[i]!;
      const speed = baseScrollSpeed * ship.scrollSpeed;
      ship.sprite.x -= speed * deltaSeconds;
      
      // Remove if off screen
      if (ship.sprite.x < -ship.size) {
        if (this.shadowSystem) {
          this.shadowSystem.removeCaster(ship.sprite);
        }
        if (this.depthOfFieldSystem) {
          this.depthOfFieldSystem.removeObject(ship.sprite);
        }
        ship.sprite.destroy();
        this.wreckedShips.splice(i, 1);
      }
    }

    // Update dead spacemen
    for (let i = this.deadSpacemen.length - 1; i >= 0; i--) {
      const spaceman = this.deadSpacemen[i]!;
      const speed = baseScrollSpeed * spaceman.scrollSpeed;
      spaceman.sprite.x -= speed * deltaSeconds;
      
      // Add slow rotation (tumbling in space)
      spaceman.sprite.rotation += 0.01 * deltaSeconds;
      
      // Remove if off screen
      if (spaceman.sprite.x < -spaceman.size) {
        if (this.shadowSystem) {
          this.shadowSystem.removeCaster(spaceman.sprite);
        }
        if (this.depthOfFieldSystem) {
          this.depthOfFieldSystem.removeObject(spaceman.sprite);
        }
        spaceman.sprite.destroy();
        this.deadSpacemen.splice(i, 1);
      }
    }

    // Spawn wrecked objects occasionally
    if (this.scene) {
      this.wreckSpawnTimer += delta;
      const rng = (this.scene as any).rng;
      
      // Spawn wrecked station every 20-40 seconds
      if (this.wreckSpawnTimer >= 20000 && this.wreckedStations.length === 0) {
        const random = rng ? rng.float() : Math.random();
        if (random < 0.4) {
          this.wreckSpawnTimer = 0;
          this.spawnWreckedStation(this.scene);
        }
      }
      // Spawn wrecked ship every 15-30 seconds
      else if (this.wreckSpawnTimer >= 15000 && this.wreckedShips.length === 0) {
        const random = rng ? rng.float() : Math.random();
        if (random >= 0.4 && random < 0.8) {
          this.wreckSpawnTimer = 0;
          this.spawnWreckedShip(this.scene);
        }
      }
      // Reset timer periodically
      if (this.wreckSpawnTimer >= 40000) {
        this.wreckSpawnTimer = 0;
      }
      
      // Spawn dead spacemen occasionally (more frequent than stations/ships)
      this.spacemanSpawnTimer += delta;
      // Spawn dead spaceman every 10-20 seconds (if we have less than 3 on screen)
      if (this.spacemanSpawnTimer >= 10000 && this.deadSpacemen.length < 3) {
        const random = rng ? rng.float() : Math.random();
        if (random < 0.6) { // 60% chance to spawn
          this.spacemanSpawnTimer = 0;
          this.spawnDeadSpaceman(this.scene);
        }
      }
      // Reset timer periodically
      if (this.spacemanSpawnTimer >= 20000) {
        this.spacemanSpawnTimer = 0;
      }
    }
  }

  /**
   * Destroy layers
   */
  destroy(): void {
    this.layers.forEach((layer) => {
      layer.image1.destroy();
      layer.image2.destroy();
    });
    this.layers = [];
    this.meteorites.forEach((meteorite) => meteorite.sprite.destroy());
    this.meteorites = [];
    this.wreckedStations.forEach((station) => station.sprite.destroy());
    this.wreckedStations = [];
    this.wreckedShips.forEach((ship) => ship.sprite.destroy());
    this.wreckedShips = [];
    this.deadSpacemen.forEach((spaceman) => spaceman.sprite.destroy());
    this.deadSpacemen = [];
  }
}


