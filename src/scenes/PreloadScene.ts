/**
 * PreloadScene - Generates all procedural assets at runtime
 */

import Phaser from 'phaser';
import { generateBitmapFont } from '../ui/BitmapFontGen';
import { GAME_CONFIG } from '../config/constants';
import { ParallaxSystem } from '../systems/ParallaxSystem';
import { ASSETS } from '../config/Assets';
import { getKenneySprite } from '../config/AssetMappings';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Load atlas assets if they exist
    ASSETS.atlases.forEach((atlas) => {
      try {
        this.load.atlas(atlas.key, atlas.textureURL, atlas.atlasURL);
      } catch (error) {
        // Atlas not found, will use procedural generation
      }
    });

    // Load audio sprite if it exists
    try {
      const a = ASSETS.audioSprite;
      this.load.audioSprite(a.key, a.url, [...a.audioURL]);
    } catch (error) {
      // Audio sprite not found, will use procedural audio
    }

    // Load company logo if it exists (for space station overlay)
    // Note: This will fail silently if the file doesn't exist, which is fine
    // The scenes will check if the texture exists before using it
    try {
      this.load.image('company-logo', 'assets/logo/appicon.png');
    } catch (error) {
      // Logo not found, will skip logo overlay
    }
  }

  create(): void {
    // Check if we have a loaded atlas with real sprites
    const hasAtlas = this.textures.exists('game');
    const useRealAssets = hasAtlas && this.textures.get('game').frameTotal > 0;
    
    if (useRealAssets) {
      // Try to use real assets, generate fallbacks if needed
      this.setupRealAssets();
    } else {
      // Generate procedural assets
      this.generatePlayerSprite();
      this.generateEnemySprites();
      this.generateBulletSprites();
      this.generatePowerUpSprites();
      this.generateExplosionSpritesheet();
    }
    
    // Generate background and other assets (always procedural for now)
    this.generateBackgroundLayers();
    this.generateMeteoriteTexture();
    this.generateBrokenShipTexture();
    this.generateWreckedStationTexture();
    this.generateBitmapFont();
    
    // Generate menu background and space station
    this.generateMenuBackground();
    this.generateSpaceStation();
    
    // Generate death screen background with wrecked player ship
    this.generateDeathScreenBackground();
    
    // Transition to menu
    this.scene.start('MenuScene');
  }
  
  /**
   * Generate menu background - space with nebula (stars will be animated separately)
   */
  private generateMenuBackground(): void {
    const { width, height } = GAME_CONFIG;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // Dark space background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#000011');
    gradient.addColorStop(0.5, '#000022');
    gradient.addColorStop(1, '#000033');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add nebula/cloud effects
    ctx.globalAlpha = 0.3;
    const nebulaGradient1 = ctx.createRadialGradient(width * 0.3, height * 0.2, 0, width * 0.3, height * 0.2, width * 0.4);
    nebulaGradient1.addColorStop(0, '#440088');
    nebulaGradient1.addColorStop(0.5, '#220044');
    nebulaGradient1.addColorStop(1, 'transparent');
    ctx.fillStyle = nebulaGradient1;
    ctx.fillRect(0, 0, width, height);
    
    const nebulaGradient2 = ctx.createRadialGradient(width * 0.7, height * 0.8, 0, width * 0.7, height * 0.8, width * 0.3);
    nebulaGradient2.addColorStop(0, '#004488');
    nebulaGradient2.addColorStop(0.5, '#002244');
    nebulaGradient2.addColorStop(1, 'transparent');
    ctx.fillStyle = nebulaGradient2;
    ctx.fillRect(0, 0, width, height);
    
    ctx.globalAlpha = 1;
    
    // Note: Stars are now animated separately in MenuScene, not drawn here
    
    this.textures.addCanvas('menu-background', canvas);
  }
  
  /**
   * Generate large space station sprite for menu background
   */
  private generateSpaceStation(): void {
    const size = 400; // Large station
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Main station body - circular/ring structure in muted grey-blue
    ctx.fillStyle = '#5a6a7a'; // Muted grey-blue
    ctx.strokeStyle = '#4a5a6a'; // Darker grey-blue
    ctx.lineWidth = 3;
    
    // Outer ring
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Inner ring
    ctx.fillStyle = '#4a5a6a'; // Darker muted grey-blue
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Central hub
    ctx.fillStyle = '#6a7a8a'; // Lighter muted grey-blue
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Spokes/connections
    ctx.strokeStyle = '#5a6a7a'; // Muted grey-blue
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x1 = size / 2 + Math.cos(angle) * (size / 4);
      const y1 = size / 2 + Math.sin(angle) * (size / 4);
      const x2 = size / 2 + Math.cos(angle) * (size / 2 - 60);
      const y2 = size / 2 + Math.sin(angle) * (size / 2 - 60);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    // Docking ports/structures around the ring - muted colors
    ctx.fillStyle = '#5a6a7a'; // Muted grey-blue
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x = size / 2 + Math.cos(angle) * (size / 2 - 30);
      const y = size / 2 + Math.sin(angle) * (size / 2 - 30);
      
      ctx.beginPath();
      ctx.rect(x - 15, y - 8, 30, 16);
      ctx.fill();
      
      // Detail
      ctx.fillStyle = '#6a7a8a'; // Lighter muted grey-blue
      ctx.beginPath();
      ctx.rect(x - 12, y - 5, 24, 10);
      ctx.fill();
      ctx.fillStyle = '#5a6a7a';
    }
    
    // Large structures/docking bays - muted grey-blue
    ctx.fillStyle = '#4a5a6a'; // Darker muted grey-blue
    ctx.strokeStyle = '#6a7a8a'; // Lighter muted grey-blue
    ctx.lineWidth = 2;
    
    // Top structure
    ctx.beginPath();
    ctx.rect(size / 2 - 40, size / 2 - size / 2 + 10, 80, 40);
    ctx.fill();
    ctx.stroke();
    
    // Bottom structure
    ctx.beginPath();
    ctx.rect(size / 2 - 40, size / 2 + size / 2 - 50, 80, 40);
    ctx.fill();
    ctx.stroke();
    
    // Left structure
    ctx.beginPath();
    ctx.rect(size / 2 - size / 2 + 10, size / 2 - 40, 40, 80);
    ctx.fill();
    ctx.stroke();
    
    // Right structure (main docking area)
    ctx.fillStyle = '#5a6a7a';
    ctx.beginPath();
    ctx.rect(size / 2 + size / 2 - 50, size / 2 - 60, 50, 120);
    ctx.fill();
    ctx.stroke();
    
    // Docking bay details
    ctx.fillStyle = '#3a4a5a'; // Darker for contrast
    ctx.beginPath();
    ctx.rect(size / 2 + size / 2 - 45, size / 2 - 55, 40, 110);
    ctx.fill();
    
    // Windows/lights - muted blue
    ctx.fillStyle = '#4a6a8a'; // Muted blue (not bright cyan)
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 8; i++) {
      const y = size / 2 - 50 + i * 15;
      ctx.beginPath();
      ctx.rect(size / 2 + size / 2 - 42, y, 8, 6);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    // Antenna/communication arrays
    ctx.strokeStyle = '#6a7a8a'; // Muted grey-blue
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size / 2 - 30, size / 2 - size / 2 + 10);
    ctx.lineTo(size / 2 - 30, size / 2 - size / 2 - 20);
    ctx.moveTo(size / 2 + 30, size / 2 - size / 2 + 10);
    ctx.lineTo(size / 2 + 30, size / 2 - size / 2 - 20);
    ctx.stroke();
    
    // Antenna tips
    ctx.fillStyle = '#7a8a9a'; // Lighter muted grey-blue
    ctx.beginPath();
    ctx.rect(size / 2 - 32, size / 2 - size / 2 - 20, 4, 8);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(size / 2 + 28, size / 2 - size / 2 - 20, 4, 8);
    ctx.fill();
    
    // Panel details
    ctx.strokeStyle = '#6a7a8a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const x = size / 2 + Math.cos(angle) * (size / 2 - 80);
      const y = size / 2 + Math.sin(angle) * (size / 2 - 80);
      
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    this.textures.addCanvas('space-station', canvas);
  }
  
  /**
   * Set up real assets from atlas, create fallbacks if sprites are missing
   */
  private setupRealAssets(): void {
    const atlas = this.textures.get('game');
    
    // Check and create player sprite
    const playerSprite = getKenneySprite('player', 0);
    if (!atlas.has(playerSprite)) {
      this.generatePlayerSprite();
    }
    
    // Check and create enemy sprites
    const enemySprites = [
      { type: 'chaser', sprite: getKenneySprite('enemyChaser', 0) },
      { type: 'turret', sprite: getKenneySprite('enemyTurret', 0) },
      { type: 'sineFlyer', sprite: getKenneySprite('enemySineFlyer', 0) },
    ];
    
    for (const { type: _type, sprite } of enemySprites) {
      if (!atlas.has(sprite)) {
      }
    }
    
    // Generate enemy sprites if any are missing (will check individually)
    this.generateEnemySprites();
    
    // Check bullets
    const playerBullet = getKenneySprite('playerBullet', 0);
    const enemyBullet = getKenneySprite('enemyBullet', 0);
    if (!atlas.has(playerBullet) || !atlas.has(enemyBullet)) {
      this.generateBulletSprites();
    }
    
    // Check power-ups
    const powerUpSprites = [
      getKenneySprite('powerUpWeapon', 0),
      getKenneySprite('powerUpBomb', 0),
      getKenneySprite('powerUpHealth', 0),
      getKenneySprite('powerUpShield', 0),
    ];
    
    const missingPowerUps = powerUpSprites.filter(sprite => !atlas.has(sprite));
    if (missingPowerUps.length > 0) {
      this.generatePowerUpSprites();
    }
    
    // Check explosions
    const explosion = getKenneySprite('explosion', 0);
    if (!atlas.has(explosion)) {
      this.generateExplosionSpritesheet();
    }
  }

  /**
   * Generate player ship sprite - realistic fighter with wings, greys, browns, red accents
   */
  private generatePlayerSprite(): void {
    const width = 120;
    const height = 84;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Main body - dark grey base
    ctx.fillStyle = '#2a2a2a'; // Dark grey
    ctx.strokeStyle = '#1a1a1a'; // Black outline
    ctx.lineWidth = 2;

    // Main fuselage (pointed nose)
    ctx.beginPath();
    ctx.moveTo(width, height / 2); // Nose
    ctx.lineTo(width - 24, height / 2 - 9);
    ctx.lineTo(width - 36, height / 2 - 18);
    ctx.lineTo(30, height / 2 - 24); // Top rear
    ctx.lineTo(18, height / 2 - 12);
    ctx.lineTo(12, height / 2); // Rear center
    ctx.lineTo(18, height / 2 + 12);
    ctx.lineTo(30, height / 2 + 24); // Bottom rear
    ctx.lineTo(width - 36, height / 2 + 18);
    ctx.lineTo(width - 24, height / 2 + 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Secondary hull detail - lighter grey
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.moveTo(width - 18, height / 2 - 6);
    ctx.lineTo(width - 30, height / 2 - 15);
    ctx.lineTo(24, height / 2 - 18);
    ctx.lineTo(15, height / 2);
    ctx.lineTo(24, height / 2 + 18);
    ctx.lineTo(width - 30, height / 2 + 15);
    ctx.lineTo(width - 18, height / 2 + 6);
    ctx.closePath();
    ctx.fill();

    // Brown/rusty panel accents
    ctx.fillStyle = '#5a4a3a'; // Brown
    ctx.beginPath();
    ctx.moveTo(width - 45, height / 2 - 10);
    ctx.lineTo(width - 50, height / 2 - 8);
    ctx.lineTo(width - 50, height / 2 + 8);
    ctx.lineTo(width - 45, height / 2 + 10);
    ctx.closePath();
    ctx.fill();

    // Main wings - large, visible
    ctx.fillStyle = '#3a3a3a'; // Medium grey
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2;
    
    // Top wing (left side)
    ctx.beginPath();
    ctx.moveTo(30, height / 2 - 24);
    ctx.lineTo(15, height / 2 - 30);
    ctx.lineTo(5, height / 2 - 28);
    ctx.lineTo(8, height / 2 - 20);
    ctx.lineTo(24, height / 2 - 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Top wing (right side)
    ctx.beginPath();
    ctx.moveTo(30, height / 2 - 24);
    ctx.lineTo(45, height / 2 - 30);
    ctx.lineTo(55, height / 2 - 28);
    ctx.lineTo(52, height / 2 - 20);
    ctx.lineTo(36, height / 2 - 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom wing (left side)
    ctx.beginPath();
    ctx.moveTo(30, height / 2 + 24);
    ctx.lineTo(15, height / 2 + 30);
    ctx.lineTo(5, height / 2 + 28);
    ctx.lineTo(8, height / 2 + 20);
    ctx.lineTo(24, height / 2 + 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom wing (right side)
    ctx.beginPath();
    ctx.moveTo(30, height / 2 + 24);
    ctx.lineTo(45, height / 2 + 30);
    ctx.lineTo(55, height / 2 + 28);
    ctx.lineTo(52, height / 2 + 20);
    ctx.lineTo(36, height / 2 + 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wing details - white highlights
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30, height / 2 - 24);
    ctx.lineTo(12, height / 2);
    ctx.moveTo(30, height / 2 + 24);
    ctx.lineTo(12, height / 2);
    ctx.stroke();

    // Wing panels - darker grey
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.moveTo(36, height / 2 - 21);
    ctx.lineTo(30, height / 2 - 24);
    ctx.lineTo(24, height / 2 - 18);
    ctx.lineTo(30, height / 2 - 15);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(36, height / 2 + 21);
    ctx.lineTo(30, height / 2 + 24);
    ctx.lineTo(24, height / 2 + 18);
    ctx.lineTo(30, height / 2 + 15);
    ctx.closePath();
    ctx.fill();

    // Engine nozzles - visible, dark grey/black
    const engineY1 = height / 2 - 9;
    const engineY2 = height / 2 + 9;
    
    // Engine nozzle outer ring
    ctx.fillStyle = '#1a1a1a'; // Black
    ctx.strokeStyle = '#3a3a3a'; // Grey outline
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(6, engineY1, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(6, engineY2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Engine nozzle inner ring
    ctx.fillStyle = '#0a0a0a'; // Very dark
    ctx.beginPath();
    ctx.arc(6, engineY1, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, engineY2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Engine nozzle details
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(6, engineY1, 6.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(6, engineY2, 6.5, 0, Math.PI * 2);
    ctx.stroke();

    // Cockpit/canopy - dark with white highlights
    ctx.fillStyle = '#1a1a2a'; // Dark blue-grey
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(width - 12, height / 2 - 15);
    ctx.lineTo(width - 42, height / 2 - 21);
    ctx.lineTo(width - 42, height / 2 + 21);
    ctx.lineTo(width - 12, height / 2 + 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Cockpit highlight - white
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(width - 18, height / 2 - 9);
    ctx.lineTo(width - 36, height / 2 - 15);
    ctx.lineTo(width - 36, height / 2 + 15);
    ctx.lineTo(width - 18, height / 2 + 9);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Wing fins with red accents
    ctx.fillStyle = '#cc0000'; // Red
    ctx.beginPath();
    ctx.moveTo(42, height / 2 - 27);
    ctx.lineTo(36, height / 2 - 30);
    ctx.lineTo(30, height / 2 - 24);
    ctx.lineTo(36, height / 2 - 21);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(42, height / 2 + 27);
    ctx.lineTo(36, height / 2 + 30);
    ctx.lineTo(30, height / 2 + 24);
    ctx.lineTo(36, height / 2 + 21);
    ctx.closePath();
    ctx.fill();

    // Red accent stripes on wings
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.rect(32, height / 2 - 26, 4, 8);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(32, height / 2 + 18, 4, 8);
    ctx.fill();

    // Nose - white with red tip
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(width - 6, height / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.arc(width - 2, height / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Weapon ports on wings - red
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.arc(width - 30, height / 2 - 12, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width - 30, height / 2 + 12, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Hull panel lines - white/grey
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(width - 48, height / 2 - 12);
    ctx.lineTo(width - 48, height / 2 + 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width - 30, height / 2 - 15);
    ctx.lineTo(width - 30, height / 2 + 15);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Brown weathering details
    ctx.fillStyle = '#5a4a3a';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(width - 40, height / 2 - 10, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width - 40, height / 2 + 10, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    this.textures.addCanvas('player', canvas);
  }

  /**
   * Generate enemy sprites for each type
   */
  private generateEnemySprites(): void {
    // Chaser enemy
    this.generateChaserSprite();
    // Turret enemy
    this.generateTurretSprite();
    // Sine flyer enemy
    this.generateSineFlyerSprite();
  }

  private generateChaserSprite(): void {
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Enemy chaser - Sleek, aggressive interceptor with forward-swept wings
    ctx.fillStyle = '#8b0000'; // Dark red
    ctx.strokeStyle = '#ff4444'; // Bright red
    ctx.lineWidth = 2;

    // Main body - narrow, pointed design
    ctx.beginPath();
    ctx.moveTo(size, size / 2); // Sharp nose
    ctx.lineTo(size - 15, size / 2 - 8);
    ctx.lineTo(size - 25, size / 2 - 12);
    ctx.lineTo(size / 2 + 15, size / 2 - 16);
    ctx.lineTo(size / 2 - 5, size / 2); // Rear center
    ctx.lineTo(size / 2 + 15, size / 2 + 16);
    ctx.lineTo(size - 25, size / 2 + 12);
    ctx.lineTo(size - 15, size / 2 + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Pixel art shadowing - dark shadow on bottom/right
    ctx.fillStyle = '#5a0000'; // Darker red shadow
    ctx.beginPath();
    ctx.moveTo(size - 15, size / 2 + 8);
    ctx.lineTo(size - 25, size / 2 + 12);
    ctx.lineTo(size / 2 + 15, size / 2 + 16);
    ctx.lineTo(size / 2 - 5, size / 2);
    ctx.lineTo(size / 2 + 10, size / 2 + 2);
    ctx.lineTo(size - 20, size / 2 + 10);
    ctx.closePath();
    ctx.fill();
    
    // Pixel art highlight - light on top/left
    ctx.fillStyle = '#aa3333'; // Lighter red highlight
    ctx.beginPath();
    ctx.moveTo(size, size / 2);
    ctx.lineTo(size - 15, size / 2 - 8);
    ctx.lineTo(size - 25, size / 2 - 12);
    ctx.lineTo(size / 2 + 15, size / 2 - 16);
    ctx.lineTo(size / 2 - 5, size / 2);
    ctx.lineTo(size / 2 + 10, size / 2 - 2);
    ctx.lineTo(size - 20, size / 2 - 10);
    ctx.closePath();
    ctx.fill();
    
    // Re-draw main body outline
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size, size / 2);
    ctx.lineTo(size - 15, size / 2 - 8);
    ctx.lineTo(size - 25, size / 2 - 12);
    ctx.lineTo(size / 2 + 15, size / 2 - 16);
    ctx.lineTo(size / 2 - 5, size / 2);
    ctx.lineTo(size / 2 + 15, size / 2 + 16);
    ctx.lineTo(size - 25, size / 2 + 12);
    ctx.lineTo(size - 15, size / 2 + 8);
    ctx.closePath();
    ctx.stroke();

    // Forward-swept wings (distinctive feature)
    ctx.fillStyle = '#aa3333';
    ctx.beginPath();
    // Top wing - forward swept
    ctx.moveTo(size - 10, size / 2 - 6);
    ctx.lineTo(size - 5, size / 2 - 18);
    ctx.lineTo(size - 20, size / 2 - 22);
    ctx.lineTo(size - 25, size / 2 - 12);
    ctx.closePath();
    ctx.fill();
    
    // Top wing shadow
    ctx.fillStyle = '#660000';
    ctx.beginPath();
    ctx.moveTo(size - 20, size / 2 - 22);
    ctx.lineTo(size - 25, size / 2 - 12);
    ctx.lineTo(size - 10, size / 2 - 6);
    ctx.lineTo(size - 15, size / 2 - 18);
    ctx.closePath();
    ctx.fill();
    
    // Top wing highlight
    ctx.fillStyle = '#cc5555';
    ctx.beginPath();
    ctx.moveTo(size - 10, size / 2 - 6);
    ctx.lineTo(size - 5, size / 2 - 18);
    ctx.lineTo(size - 12, size / 2 - 20);
    ctx.closePath();
    ctx.fill();
    
    // Bottom wing - forward swept
    ctx.fillStyle = '#aa3333';
    ctx.beginPath();
    ctx.moveTo(size - 10, size / 2 + 6);
    ctx.lineTo(size - 5, size / 2 + 18);
    ctx.lineTo(size - 20, size / 2 + 22);
    ctx.lineTo(size - 25, size / 2 + 12);
    ctx.closePath();
    ctx.fill();
    
    // Bottom wing shadow (darker)
    ctx.fillStyle = '#660000';
    ctx.beginPath();
    ctx.moveTo(size - 20, size / 2 + 22);
    ctx.lineTo(size - 25, size / 2 + 12);
    ctx.lineTo(size - 10, size / 2 + 6);
    ctx.lineTo(size - 15, size / 2 + 18);
    ctx.closePath();
    ctx.fill();

    // Wing details - red accents
    ctx.strokeStyle = '#ff6666';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(size - 10, size / 2 - 6);
    ctx.lineTo(size - 5, size / 2 - 18);
    ctx.moveTo(size - 10, size / 2 + 6);
    ctx.lineTo(size - 5, size / 2 + 18);
    ctx.stroke();

    // Narrow cockpit - small
    ctx.fillStyle = '#ff0000';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.ellipse(size - 8, size / 2, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Single center engine (distinctive - not dual)
    ctx.fillStyle = '#ff4444';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(size / 2 - 5, size / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#ff8888';
    ctx.beginPath();
    ctx.arc(size / 2 - 5, size / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Engine nozzle
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(size / 2 - 5, size / 2, 6, 0, Math.PI * 2);
    ctx.fill();

    // Spikes on nose - aggressive look
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(size - 2, size / 2 - 2);
    ctx.lineTo(size, size / 2);
    ctx.lineTo(size - 2, size / 2 + 2);
    ctx.closePath();
    ctx.fill();

    // Hull lines
    ctx.strokeStyle = '#ff6666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size - 20, size / 2 - 8);
    ctx.lineTo(size - 20, size / 2 + 8);
    ctx.stroke();

    this.textures.addCanvas('enemy-chaser', canvas);
  }

  private generateTurretSprite(): void {
    const size = 108;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Enemy turret - Heavy, blocky gunship with large rotating turret on top
    ctx.fillStyle = '#5a4a2a'; // Brown-grey
    ctx.strokeStyle = '#ffaa00'; // Orange
    ctx.lineWidth = 2.5;

    // Main body - wide, rectangular, heavily armored
    ctx.beginPath();
    ctx.moveTo(size, size / 2); // Nose
    ctx.lineTo(size - 8, size / 2 - 18);
    ctx.lineTo(size - 20, size / 2 - 22);
    ctx.lineTo(size / 2 + 20, size / 2 - 28);
    ctx.lineTo(size / 2 - 20, size / 2 - 24);
    ctx.lineTo(size / 2 - 28, size / 2); // Rear center
    ctx.lineTo(size / 2 - 20, size / 2 + 24);
    ctx.lineTo(size / 2 + 20, size / 2 + 28);
    ctx.lineTo(size - 20, size / 2 + 22);
    ctx.lineTo(size - 8, size / 2 + 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Pixel art shadowing - dark shadow on bottom/right
    ctx.fillStyle = '#3a2a1a'; // Darker brown shadow
    ctx.beginPath();
    ctx.moveTo(size - 8, size / 2 + 18);
    ctx.lineTo(size - 20, size / 2 + 22);
    ctx.lineTo(size / 2 + 20, size / 2 + 28);
    ctx.lineTo(size / 2 - 20, size / 2 + 24);
    ctx.lineTo(size / 2 - 28, size / 2);
    ctx.lineTo(size / 2 - 15, size / 2 + 2);
    ctx.lineTo(size - 15, size / 2 + 20);
    ctx.closePath();
    ctx.fill();
    
    // Pixel art highlight - light on top/left
    ctx.fillStyle = '#6a5a3a'; // Lighter brown highlight
    ctx.beginPath();
    ctx.moveTo(size, size / 2);
    ctx.lineTo(size - 8, size / 2 - 18);
    ctx.lineTo(size - 20, size / 2 - 22);
    ctx.lineTo(size / 2 + 20, size / 2 - 28);
    ctx.lineTo(size / 2 - 20, size / 2 - 24);
    ctx.lineTo(size / 2 - 15, size / 2 - 2);
    ctx.lineTo(size - 15, size / 2 - 20);
    ctx.closePath();
    ctx.fill();
    
    // Re-draw main body outline
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(size, size / 2);
    ctx.lineTo(size - 8, size / 2 - 18);
    ctx.lineTo(size - 20, size / 2 - 22);
    ctx.lineTo(size / 2 + 20, size / 2 - 28);
    ctx.lineTo(size / 2 - 20, size / 2 - 24);
    ctx.lineTo(size / 2 - 28, size / 2);
    ctx.lineTo(size / 2 - 20, size / 2 + 24);
    ctx.lineTo(size / 2 + 20, size / 2 + 28);
    ctx.lineTo(size - 20, size / 2 + 22);
    ctx.lineTo(size - 8, size / 2 + 18);
    ctx.closePath();
    ctx.stroke();

    // Armor plates - layered look with shadowing
    ctx.fillStyle = '#3a3a2a';
    ctx.beginPath();
    ctx.rect(size / 2 - 24, size / 2 - 20, 48, 40);
    ctx.fill();
    
    // Armor plate shadow (bottom edge)
    ctx.fillStyle = '#2a2a1a';
    ctx.fillRect(size / 2 - 24, size / 2 + 15, 48, 5);
    
    // Armor plate highlight (top edge)
    ctx.fillStyle = '#4a4a3a';
    ctx.fillRect(size / 2 - 24, size / 2 - 20, 48, 5);

    // Large rotating turret on top - distinctive feature
    ctx.fillStyle = '#ff8800';
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    // Turret base (cylindrical)
    ctx.beginPath();
    ctx.ellipse(size / 2, size / 2 - 18, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Turret cannon barrel (long, protruding)
    ctx.fillStyle = '#2a2a1a';
    ctx.beginPath();
    ctx.rect(size / 2 - 2, size / 2 - 28, 4, 16);
    ctx.fill();
    
    // Turret barrel tip
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.rect(size / 2 - 3, size / 2 - 30, 6, 4);
    ctx.fill();

    // Turret details - orange highlights
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2 - 18, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Side weapon pods - boxy
    ctx.fillStyle = '#ff8800';
    ctx.beginPath();
    ctx.rect(size / 2 + 18, size / 2 - 8, 8, 16);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(size / 2 - 26, size / 2 - 8, 8, 16);
    ctx.fill();

    // Weapon ports
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(size / 2 + 22, size / 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size / 2 - 22, size / 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Engine array - triple engines (distinctive)
    ctx.fillStyle = '#ff6600';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(size / 2 - 28, size / 2 - 10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size / 2 - 28, size / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size / 2 - 28, size / 2 + 10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Engine cores
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(size / 2 - 28, size / 2 - 10, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size / 2 - 28, size / 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size / 2 - 28, size / 2 + 10, 3, 0, Math.PI * 2);
    ctx.fill();

    // Hull panel lines
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size - 18, size / 2 - 12);
    ctx.lineTo(size - 18, size / 2 + 12);
    ctx.moveTo(size / 2 + 10, size / 2 - 20);
    ctx.lineTo(size / 2 + 10, size / 2 + 20);
    ctx.moveTo(size / 2 - 10, size / 2 - 20);
    ctx.lineTo(size / 2 - 10, size / 2 + 20);
    ctx.stroke();

    // Sensor array on nose
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(size - 4, size / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    this.textures.addCanvas('enemy-turret', canvas);
  }

  private generateSineFlyerSprite(): void {
    const size = 84;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Enemy sine flyer - Diamond-shaped fighter with delta wings
    ctx.fillStyle = '#004488'; // Dark blue
    ctx.strokeStyle = '#00aaff'; // Bright blue
    ctx.lineWidth = 2;

    // Main body - diamond/rhombus shape (distinctive)
    ctx.beginPath();
    ctx.moveTo(size, size / 2); // Right point (nose)
    ctx.lineTo(size / 2, size / 2 - 20); // Top point
    ctx.lineTo(0, size / 2); // Left point (rear)
    ctx.lineTo(size / 2, size / 2 + 20); // Bottom point
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Pixel art shadowing - dark shadow on bottom/right
    ctx.fillStyle = '#002244'; // Darker blue shadow
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2 + 20); // Bottom point
    ctx.lineTo(0, size / 2); // Left point (rear)
    ctx.lineTo(size / 2 - 5, size / 2 + 2);
    ctx.lineTo(size / 2 + 2, size / 2 + 15);
    ctx.closePath();
    ctx.fill();
    
    // Pixel art highlight - light on top/left
    ctx.fillStyle = '#0066aa'; // Lighter blue highlight
    ctx.beginPath();
    ctx.moveTo(size, size / 2); // Right point (nose)
    ctx.lineTo(size / 2, size / 2 - 20); // Top point
    ctx.lineTo(size / 2 - 2, size / 2 - 15);
    ctx.lineTo(size / 2 + 5, size / 2 - 2);
    ctx.closePath();
    ctx.fill();
    
    // Re-draw main body outline
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size, size / 2);
    ctx.lineTo(size / 2, size / 2 - 20);
    ctx.lineTo(0, size / 2);
    ctx.lineTo(size / 2, size / 2 + 20);
    ctx.closePath();
    ctx.stroke();

    // Delta wings - triangular, swept back
    ctx.fillStyle = '#0066aa';
    ctx.beginPath();
    // Top delta wing
    ctx.moveTo(size / 2, size / 2 - 20);
    ctx.lineTo(size / 2 + 15, size / 2 - 8);
    ctx.lineTo(size / 2 + 8, size / 2 - 12);
    ctx.closePath();
    ctx.fill();
    
    // Top wing shadow
    ctx.fillStyle = '#002244';
    ctx.beginPath();
    ctx.moveTo(size / 2 + 8, size / 2 - 12);
    ctx.lineTo(size / 2 + 15, size / 2 - 8);
    ctx.lineTo(size / 2 + 10, size / 2 - 4);
    ctx.lineTo(size / 2 + 5, size / 2 - 8);
    ctx.closePath();
    ctx.fill();
    
    // Top wing highlight
    ctx.fillStyle = '#0088cc';
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2 - 20);
    ctx.lineTo(size / 2 + 8, size / 2 - 12);
    ctx.lineTo(size / 2 + 3, size / 2 - 16);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#0066aa';
    ctx.beginPath();
    // Bottom delta wing
    ctx.moveTo(size / 2, size / 2 + 20);
    ctx.lineTo(size / 2 + 15, size / 2 + 8);
    ctx.lineTo(size / 2 + 8, size / 2 + 12);
    ctx.closePath();
    ctx.fill();
    
    // Bottom wing shadow (darker)
    ctx.fillStyle = '#002244';
    ctx.beginPath();
    ctx.moveTo(size / 2 + 8, size / 2 + 12);
    ctx.lineTo(size / 2 + 15, size / 2 + 8);
    ctx.lineTo(size / 2 + 10, size / 2 + 4);
    ctx.lineTo(size / 2 + 5, size / 2 + 8);
    ctx.closePath();
    ctx.fill();

    // Wing tips - swept back
    ctx.fillStyle = '#0088cc';
    ctx.beginPath();
    ctx.moveTo(size / 2 + 8, size / 2 - 12);
    ctx.lineTo(size / 2 + 15, size / 2 - 8);
    ctx.lineTo(size / 2 + 12, size / 2 - 4);
    ctx.lineTo(size / 2 + 6, size / 2 - 8);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(size / 2 + 8, size / 2 + 12);
    ctx.lineTo(size / 2 + 15, size / 2 + 8);
    ctx.lineTo(size / 2 + 12, size / 2 + 4);
    ctx.lineTo(size / 2 + 6, size / 2 + 8);
    ctx.closePath();
    ctx.fill();

    // Central cockpit - circular
    ctx.fillStyle = '#00aaff';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Cockpit highlight
    ctx.fillStyle = '#88ddff';
    ctx.beginPath();
    ctx.arc(size / 2 - 2, size / 2 - 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Single large rear engine (distinctive - not dual)
    ctx.fillStyle = '#00aaff';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(0, size / 2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#88ddff';
    ctx.beginPath();
    ctx.arc(0, size / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Engine nozzle
    ctx.fillStyle = '#1a1a2a';
    ctx.beginPath();
    ctx.arc(0, size / 2, 7, 0, Math.PI * 2);
    ctx.fill();

    // Wing edge highlights
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2 - 20);
    ctx.lineTo(size / 2 + 15, size / 2 - 8);
    ctx.moveTo(size / 2, size / 2 + 20);
    ctx.lineTo(size / 2 + 15, size / 2 + 8);
    ctx.stroke();

    // Nose sensor
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(size - 4, size / 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Hull lines - diagonal (following diamond shape)
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size / 2 + 10, size / 2 - 10);
    ctx.lineTo(size / 2 - 10, size / 2 + 10);
    ctx.moveTo(size / 2 + 10, size / 2 + 10);
    ctx.lineTo(size / 2 - 10, size / 2 - 10);
    ctx.stroke();

    this.textures.addCanvas('enemy-sineFlyer', canvas);
  }

  /**
   * Generate bullet sprites
   */
  private generateBulletSprites(): void {
    // Player bullet - round and smaller, but keep original hitbox size
    const playerCanvas = document.createElement('canvas');
    playerCanvas.width = 8; // Keep original size for hitbox
    playerCanvas.height = 16; // Keep original size for hitbox
    const playerCtx = playerCanvas.getContext('2d')!;
    // Draw smaller round bullet centered in the canvas
    const bulletSize = 5; // Smaller visual size
    const centerX = playerCanvas.width / 2;
    const centerY = playerCanvas.height / 2;
    playerCtx.fillStyle = '#00ffff';
    playerCtx.beginPath();
    playerCtx.arc(centerX, centerY, bulletSize / 2, 0, Math.PI * 2);
    playerCtx.fill();
    playerCtx.strokeStyle = '#ffffff';
    playerCtx.lineWidth = 1;
    playerCtx.beginPath();
    playerCtx.arc(centerX, centerY, bulletSize / 2, 0, Math.PI * 2);
    playerCtx.stroke();
    // Add a bright center highlight
    playerCtx.fillStyle = '#ffffff';
    playerCtx.beginPath();
    playerCtx.arc(centerX, centerY, bulletSize / 4, 0, Math.PI * 2);
    playerCtx.fill();
    this.textures.addCanvas('bullet-player', playerCanvas);

    // Enemy bullet
    const enemyCanvas = document.createElement('canvas');
    enemyCanvas.width = 6;
    enemyCanvas.height = 12;
    const enemyCtx = enemyCanvas.getContext('2d')!;
    enemyCtx.fillStyle = '#ff0000';
    enemyCtx.fillRect(0, 0, 6, 12);
    enemyCtx.strokeStyle = '#ffffff';
    enemyCtx.lineWidth = 1;
    enemyCtx.strokeRect(0, 0, 6, 12);
    this.textures.addCanvas('bullet-enemy', enemyCanvas);
  }

  /**
   * Generate power-up sprites
   */
  private generatePowerUpSprites(): void {
    const size = 16;

    // Weapon power-up (star shape)
    const weaponCanvas = document.createElement('canvas');
    weaponCanvas.width = size;
    weaponCanvas.height = size;
    const weaponCtx = weaponCanvas.getContext('2d')!;
    weaponCtx.fillStyle = '#ffff00';
    weaponCtx.strokeStyle = '#ffffff';
    weaponCtx.lineWidth = 2;
    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = size / 2;
    const innerRadius = size / 4;
    weaponCtx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (i === 0) {
        weaponCtx.moveTo(x, y);
      } else {
        weaponCtx.lineTo(x, y);
      }
    }
    weaponCtx.closePath();
    weaponCtx.fill();
    weaponCtx.stroke();
    this.textures.addCanvas('powerup-weapon', weaponCanvas);

    // Bomb power-up (missile design)
    const bombCanvas = document.createElement('canvas');
    bombCanvas.width = size;
    bombCanvas.height = size * 1.5; // Taller for missile shape
    const bombCtx = bombCanvas.getContext('2d')!;
    
    const bombCenterX = size / 2;
    const bodyHeight = size * 1.2;
    const bodyWidth = size * 0.6;
    
    // Missile body (cylindrical)
    bombCtx.fillStyle = '#ff4444';
    bombCtx.strokeStyle = '#ff0000';
    bombCtx.lineWidth = 1.5;
    bombCtx.beginPath();
    bombCtx.ellipse(bombCenterX, size * 0.3, bodyWidth / 2, bodyWidth / 4, 0, 0, Math.PI * 2);
    bombCtx.fill();
    bombCtx.stroke();
    
    // Main body
    bombCtx.fillRect(bombCenterX - bodyWidth / 2, size * 0.3, bodyWidth, bodyHeight);
    bombCtx.strokeRect(bombCenterX - bodyWidth / 2, size * 0.3, bodyWidth, bodyHeight);
    
    // Bottom ellipse (rear)
    bombCtx.beginPath();
    bombCtx.ellipse(bombCenterX, size * 0.3 + bodyHeight, bodyWidth / 2, bodyWidth / 4, 0, 0, Math.PI * 2);
    bombCtx.fill();
    bombCtx.stroke();
    
    // Warhead (pointed tip)
    bombCtx.fillStyle = '#ff8888';
    bombCtx.beginPath();
    bombCtx.moveTo(bombCenterX, 0);
    bombCtx.lineTo(bombCenterX - bodyWidth / 2, size * 0.3);
    bombCtx.lineTo(bombCenterX + bodyWidth / 2, size * 0.3);
    bombCtx.closePath();
    bombCtx.fill();
    bombCtx.strokeStyle = '#ff0000';
    bombCtx.lineWidth = 1;
    bombCtx.stroke();
    
    // Fins (wings)
    const finWidth = bodyWidth * 0.4;
    const finHeight = bodyHeight * 0.3;
    bombCtx.fillStyle = '#cc0000';
    // Left fin
    bombCtx.fillRect(bombCenterX - bodyWidth / 2 - finWidth * 0.5, size * 0.3 + bodyHeight * 0.5, finWidth, finHeight);
    // Right fin
    bombCtx.fillRect(bombCenterX + bodyWidth / 2 - finWidth * 0.5, size * 0.3 + bodyHeight * 0.5, finWidth, finHeight);
    
    // Detail lines
    bombCtx.strokeStyle = '#ff0000';
    bombCtx.lineWidth = 1;
    bombCtx.beginPath();
    bombCtx.moveTo(bombCenterX, size * 0.3);
    bombCtx.lineTo(bombCenterX, size * 0.3 + bodyHeight);
    bombCtx.stroke();
    
    // Highlight on tip
    bombCtx.fillStyle = '#ffffff';
    bombCtx.globalAlpha = 0.5;
    bombCtx.beginPath();
    bombCtx.moveTo(bombCenterX, 2);
    bombCtx.lineTo(bombCenterX - bodyWidth / 4, size * 0.15);
    bombCtx.lineTo(bombCenterX + bodyWidth / 4, size * 0.15);
    bombCtx.closePath();
    bombCtx.fill();
    bombCtx.globalAlpha = 1;
    
    this.textures.addCanvas('powerup-bomb', bombCanvas);

    // Health power-up
    const healthCanvas = document.createElement('canvas');
    healthCanvas.width = size;
    healthCanvas.height = size;
    const healthCtx = healthCanvas.getContext('2d')!;
    healthCtx.fillStyle = '#00ff00';
    healthCtx.strokeStyle = '#ffffff';
    healthCtx.lineWidth = 2;
    healthCtx.fillRect(0, 0, size, size);
    healthCtx.strokeRect(0, 0, size, size);
    healthCtx.fillStyle = '#ffffff';
    healthCtx.fillRect(2, 2, size - 4, size - 4);
    this.textures.addCanvas('powerup-health', healthCanvas);

    // Shield power-up (blue sphere)
    const shieldCanvas = document.createElement('canvas');
    shieldCanvas.width = size;
    shieldCanvas.height = size;
    const shieldCtx = shieldCanvas.getContext('2d')!;
    const shieldCenterX = size / 2;
    const shieldCenterY = size / 2;
    const shieldRadius = size / 2 - 1;
    
    // Outer glow (light blue)
    const gradient = shieldCtx.createRadialGradient(shieldCenterX, shieldCenterY, 0, shieldCenterX, shieldCenterY, shieldRadius);
    gradient.addColorStop(0, '#66aaff');
    gradient.addColorStop(0.5, '#4488ff');
    gradient.addColorStop(1, '#2266ff');
    shieldCtx.fillStyle = gradient;
    shieldCtx.beginPath();
    shieldCtx.arc(shieldCenterX, shieldCenterY, shieldRadius, 0, Math.PI * 2);
    shieldCtx.fill();
    
    // Outer border
    shieldCtx.strokeStyle = '#ffffff';
    shieldCtx.lineWidth = 2;
    shieldCtx.beginPath();
    shieldCtx.arc(shieldCenterX, shieldCenterY, shieldRadius, 0, Math.PI * 2);
    shieldCtx.stroke();
    
    // Inner highlight
    shieldCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    shieldCtx.beginPath();
    shieldCtx.arc(shieldCenterX - shieldRadius * 0.3, shieldCenterY - shieldRadius * 0.3, shieldRadius * 0.4, 0, Math.PI * 2);
    shieldCtx.fill();
    
    this.textures.addCanvas('powerup-shield', shieldCanvas);
  }

  /**
   * Generate explosion spritesheet
   */
  private generateExplosionSpritesheet(): void {
    const frameCount = 8;
    const frameSize = 64;
    
    // Create canvas for spritesheet
    const canvas = document.createElement('canvas');
    canvas.width = frameSize * frameCount;
    canvas.height = frameSize;
    const ctx = canvas.getContext('2d')!;

    for (let frame = 0; frame < frameCount; frame++) {
      const progress = frame / frameCount;
      const size = frameSize * (0.3 + progress * 0.7);
      const alpha = 1 - progress;

      // Draw frame on canvas
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(frameSize / 2 + frame * frameSize, frameSize / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(frameSize / 2 + frame * frameSize, frameSize / 2, size / 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    this.textures.addCanvas('explosion', canvas);
  }

  /**
   * Generate parallax background layers
   */
  private generateBackgroundLayers(): void {
    // Far layer (stars)
    this.generateStarLayer('bg-far', GAME_CONFIG.width, GAME_CONFIG.height, 0.3);
    // Mid layer (nebula)
    this.generateNebulaLayer('bg-mid', GAME_CONFIG.width, GAME_CONFIG.height, 0.6);
    // Near layer (clouds)
    this.generateCloudLayer('bg-near', GAME_CONFIG.width, GAME_CONFIG.height, 0.9);
  }

  private generateStarLayer(key: string, width: number, height: number, opacity: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;

    // Generate random stars
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    this.textures.addCanvas(key, canvas);
  }

  private generateNebulaLayer(key: string, width: number, height: number, opacity: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Use a fixed seed for consistent generation
    const seed = 12345;
    let seedValue = seed;
    const seededRandom = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };

    // Create gradient nebula effect with seamless tiling
    // Generate nebula clouds that wrap around horizontally
    for (let i = 0; i < 10; i++) {
      // Use modulo to ensure x positions wrap around
      const baseX = seededRandom() * width;
      const y = seededRandom() * height;
      const radius = seededRandom() * 200 + 100;
      const hue = seededRandom() * 60 + 240; // Purple to blue range
      const color = Phaser.Display.Color.HSVToRGB(hue / 360, 0.5, 0.3).color;
      const hexColor = '#' + color.toString(16).padStart(6, '0');
      
      // Draw the main nebula cloud
      ctx.fillStyle = hexColor;
      ctx.globalAlpha = opacity * 0.3;
      ctx.beginPath();
      ctx.arc(baseX, y, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw a copy on the left side if it extends past the right edge
      if (baseX + radius > width) {
        ctx.beginPath();
        ctx.arc(baseX - width, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw a copy on the right side if it extends past the left edge
      if (baseX - radius < 0) {
        ctx.beginPath();
        ctx.arc(baseX + width, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.globalAlpha = 1;
    }

    // Make the texture seamlessly tileable by blending left and right edges
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const blendWidth = Math.min(150, width / 3); // Wider blend zone for smoother transition
    
    // Create seamless edges by cross-blending left and right edges
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < blendWidth; x++) {
        const leftIdx = (y * width + x) * 4;
        const rightIdx = (y * width + (width - blendWidth + x)) * 4;
        
        // Blend factor: gradually transition
        const blendFactor = x / blendWidth;
        
        // Average the left and right edge pixels for seamless tiling
        const avgR = Math.round((data[leftIdx]! + data[rightIdx]!) / 2);
        const avgG = Math.round((data[leftIdx + 1]! + data[rightIdx + 1]!) / 2);
        const avgB = Math.round((data[leftIdx + 2]! + data[rightIdx + 2]!) / 2);
        const avgA = Math.round((data[leftIdx + 3]! + data[rightIdx + 3]!) / 2);
        
        // Blend towards the average
        const leftBlend = 1 - blendFactor * 0.5; // Less aggressive on left
        const rightBlend = blendFactor * 0.5; // Less aggressive on right
        
        data[leftIdx] = Math.round(data[leftIdx]! * leftBlend + avgR * (1 - leftBlend));
        data[leftIdx + 1] = Math.round(data[leftIdx + 1]! * leftBlend + avgG * (1 - leftBlend));
        data[leftIdx + 2] = Math.round(data[leftIdx + 2]! * leftBlend + avgB * (1 - leftBlend));
        data[leftIdx + 3] = Math.round(data[leftIdx + 3]! * leftBlend + avgA * (1 - leftBlend));
        
        data[rightIdx] = Math.round(data[rightIdx]! * (1 - rightBlend) + avgR * rightBlend);
        data[rightIdx + 1] = Math.round(data[rightIdx + 1]! * (1 - rightBlend) + avgG * rightBlend);
        data[rightIdx + 2] = Math.round(data[rightIdx + 2]! * (1 - rightBlend) + avgB * rightBlend);
        data[rightIdx + 3] = Math.round(data[rightIdx + 3]! * (1 - rightBlend) + avgA * rightBlend);
      }
    }
    
    ctx.putImageData(imageData, 0, 0);

    this.textures.addCanvas(key, canvas);
  }

  private generateCloudLayer(key: string, width: number, height: number, opacity: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Use a fixed seed for consistent generation
    const seed = 67890;
    let seedValue = seed;
    const seededRandom = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };

    // Create cloud-like shapes with seamless tiling
    ctx.fillStyle = `rgba(68, 68, 68, ${opacity * 0.2})`;
    for (let i = 0; i < 5; i++) {
      const baseX = seededRandom() * width;
      const y = seededRandom() * height;
      for (let j = 0; j < 5; j++) {
        const offsetX = (seededRandom() - 0.5) * 100;
        const offsetY = (seededRandom() - 0.5) * 50;
        const radius = seededRandom() * 40 + 20;
        const x = baseX + offsetX;
        
        // Draw the main cloud blob
        ctx.beginPath();
        ctx.arc(x, y + offsetY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw a copy on the left side if it extends past the right edge
        if (x + radius > width) {
          ctx.beginPath();
          ctx.arc(x - width, y + offsetY, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Draw a copy on the right side if it extends past the left edge
        if (x - radius < 0) {
          ctx.beginPath();
          ctx.arc(x + width, y + offsetY, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Make the texture seamlessly tileable by blending left and right edges
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const blendWidth = Math.min(150, width / 3); // Wider blend zone for smoother transition
    
    // Create seamless edges by cross-blending left and right edges
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < blendWidth; x++) {
        const leftIdx = (y * width + x) * 4;
        const rightIdx = (y * width + (width - blendWidth + x)) * 4;
        
        // Blend factor: gradually transition
        const blendFactor = x / blendWidth;
        
        // Average the left and right edge pixels for seamless tiling
        const avgR = Math.round((data[leftIdx]! + data[rightIdx]!) / 2);
        const avgG = Math.round((data[leftIdx + 1]! + data[rightIdx + 1]!) / 2);
        const avgB = Math.round((data[leftIdx + 2]! + data[rightIdx + 2]!) / 2);
        const avgA = Math.round((data[leftIdx + 3]! + data[rightIdx + 3]!) / 2);
        
        // Blend towards the average
        const leftBlend = 1 - blendFactor * 0.5; // Less aggressive on left
        const rightBlend = blendFactor * 0.5; // Less aggressive on right
        
        data[leftIdx] = Math.round(data[leftIdx]! * leftBlend + avgR * (1 - leftBlend));
        data[leftIdx + 1] = Math.round(data[leftIdx + 1]! * leftBlend + avgG * (1 - leftBlend));
        data[leftIdx + 2] = Math.round(data[leftIdx + 2]! * leftBlend + avgB * (1 - leftBlend));
        data[leftIdx + 3] = Math.round(data[leftIdx + 3]! * leftBlend + avgA * (1 - leftBlend));
        
        data[rightIdx] = Math.round(data[rightIdx]! * (1 - rightBlend) + avgR * rightBlend);
        data[rightIdx + 1] = Math.round(data[rightIdx + 1]! * (1 - rightBlend) + avgG * rightBlend);
        data[rightIdx + 2] = Math.round(data[rightIdx + 2]! * (1 - rightBlend) + avgB * rightBlend);
        data[rightIdx + 3] = Math.round(data[rightIdx + 3]! * (1 - rightBlend) + avgA * rightBlend);
      }
    }
    
    ctx.putImageData(imageData, 0, 0);

    this.textures.addCanvas(key, canvas);
  }

  /**
   * Generate meteorite texture
   */
  private generateMeteoriteTexture(): void {
    ParallaxSystem.generateMeteoriteTexture(this);
  }

  /**
   * Generate broken spaceship texture - grey and black with small color accents
   */
  private generateBrokenShipTexture(): void {
    const width = 120;
    const height = 80;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Main body - dark grey/black
    ctx.fillStyle = '#2a2a2a'; // Dark grey
    ctx.strokeStyle = '#1a1a1a'; // Black outline
    ctx.lineWidth = 2;

    // Broken/damaged hull shape
    ctx.beginPath();
    ctx.moveTo(width * 0.8, height / 2); // Nose (pointed but damaged)
    ctx.lineTo(width * 0.7, height * 0.2);
    ctx.lineTo(width * 0.5, height * 0.1);
    ctx.lineTo(width * 0.2, height * 0.15);
    ctx.lineTo(0, height * 0.3); // Left damaged side
    ctx.lineTo(width * 0.1, height * 0.5);
    ctx.lineTo(width * 0.05, height * 0.7);
    ctx.lineTo(width * 0.2, height * 0.85);
    ctx.lineTo(width * 0.5, height * 0.9);
    ctx.lineTo(width * 0.7, height * 0.8);
    ctx.lineTo(width * 0.8, height * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Secondary hull - lighter grey
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.moveTo(width * 0.75, height / 2);
    ctx.lineTo(width * 0.65, height * 0.25);
    ctx.lineTo(width * 0.4, height * 0.15);
    ctx.lineTo(width * 0.25, height * 0.2);
    ctx.lineTo(width * 0.15, height * 0.4);
    ctx.lineTo(width * 0.1, height / 2);
    ctx.lineTo(width * 0.15, height * 0.6);
    ctx.lineTo(width * 0.25, height * 0.8);
    ctx.lineTo(width * 0.4, height * 0.85);
    ctx.lineTo(width * 0.65, height * 0.75);
    ctx.closePath();
    ctx.fill();

    // Broken wing fragments
    ctx.fillStyle = '#1a1a1a'; // Black
    ctx.beginPath();
    ctx.moveTo(width * 0.3, height * 0.1);
    ctx.lineTo(width * 0.15, height * 0.05);
    ctx.lineTo(width * 0.1, height * 0.2);
    ctx.lineTo(width * 0.25, height * 0.25);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(width * 0.3, height * 0.9);
    ctx.lineTo(width * 0.15, height * 0.95);
    ctx.lineTo(width * 0.1, height * 0.8);
    ctx.lineTo(width * 0.25, height * 0.75);
    ctx.closePath();
    ctx.fill();

    // Subtle color variations - natural brown/rust accents
    ctx.fillStyle = '#5a4a3a'; // Brown-grey (natural rust)
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.rect(width * 0.4, height * 0.3, width * 0.15, height * 0.1);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(width * 0.4, height * 0.6, width * 0.15, height * 0.1);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Damage/crack lines
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width * 0.2, height * 0.3);
    ctx.lineTo(width * 0.35, height * 0.5);
    ctx.lineTo(width * 0.2, height * 0.7);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width * 0.5, height * 0.2);
    ctx.lineTo(width * 0.6, height * 0.4);
    ctx.stroke();

    // Engine damage (black holes)
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(width * 0.1, height * 0.4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width * 0.1, height * 0.6, 4, 0, Math.PI * 2);
    ctx.fill();

    // Hull panel details
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width * 0.6, height * 0.3);
    ctx.lineTo(width * 0.6, height * 0.7);
    ctx.stroke();

    this.textures.addCanvas('broken-ship', canvas);
  }

  /**
   * Generate wrecked space station texture - natural realistic colors
   */
  private generateWreckedStationTexture(): void {
    const width = 600;
    const height = 400;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Main structure - dark grey/steel
    ctx.fillStyle = '#4a4a4a'; // Dark grey
    ctx.strokeStyle = '#3a3a3a'; // Darker grey
    ctx.lineWidth = 3;

    // Broken station body - irregular shape
    ctx.beginPath();
    ctx.moveTo(width * 0.3, height * 0.2);
    ctx.lineTo(width * 0.7, height * 0.15);
    ctx.lineTo(width * 0.85, height * 0.3);
    ctx.lineTo(width * 0.8, height * 0.6);
    ctx.lineTo(width * 0.6, height * 0.75);
    ctx.lineTo(width * 0.3, height * 0.8);
    ctx.lineTo(width * 0.15, height * 0.65);
    ctx.lineTo(width * 0.2, height * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Secondary structures - lighter grey
    ctx.fillStyle = '#5a5a5a';
    ctx.beginPath();
    ctx.rect(width * 0.4, height * 0.25, width * 0.3, height * 0.15);
    ctx.fill();
    
    ctx.beginPath();
    ctx.rect(width * 0.35, height * 0.5, width * 0.25, height * 0.2);
    ctx.fill();

    // Broken panels - brown/rusty
    ctx.fillStyle = '#6a5a4a'; // Brown-grey
    ctx.beginPath();
    ctx.rect(width * 0.5, height * 0.3, width * 0.15, height * 0.1);
    ctx.fill();
    
    ctx.beginPath();
    ctx.rect(width * 0.4, height * 0.55, width * 0.2, height * 0.08);
    ctx.fill();

    // Damage/cracks - dark lines
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.35, height * 0.3);
    ctx.lineTo(width * 0.5, height * 0.45);
    ctx.lineTo(width * 0.65, height * 0.5);
    ctx.stroke();

    // Broken sections - black holes
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(width * 0.25, height * 0.4, 20, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(width * 0.7, height * 0.45, 25, 0, Math.PI * 2);
    ctx.fill();

    // Metal panels - various greys
    ctx.fillStyle = '#6a6a6a';
    ctx.beginPath();
    ctx.rect(width * 0.45, height * 0.35, width * 0.1, height * 0.08);
    ctx.fill();

    // Panel lines
    ctx.strokeStyle = '#5a5a5a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width * 0.4, height * 0.4);
    ctx.lineTo(width * 0.6, height * 0.4);
    ctx.moveTo(width * 0.5, height * 0.35);
    ctx.lineTo(width * 0.5, height * 0.45);
    ctx.stroke();

    this.textures.addCanvas('wrecked-station', canvas);
  }

  /**
   * Generate death screen background with 3D pixel art wrecked player ship floating in space
   */
  private generateDeathScreenBackground(): void {
    const { width, height } = GAME_CONFIG;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // Enable pixelated rendering
    ctx.imageSmoothingEnabled = false;
    
    // Space background - dark gradient
    const spaceGradient = ctx.createLinearGradient(0, 0, 0, height);
    spaceGradient.addColorStop(0, '#000011');
    spaceGradient.addColorStop(0.5, '#000022');
    spaceGradient.addColorStop(1, '#000033');
    ctx.fillStyle = spaceGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add distant stars (pixelated)
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() > 0.9 ? 2 : 1; // Occasional brighter star
      ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
    }
    
    // Ship center position (slightly offset for perspective)
    const shipX = width * 0.5;
    const shipY = height * 0.5; // Centered vertically
    const pixelSize = 2; // Pixel art size (smaller for more detail at 6x scale)
    const scale = 6; // 6x scale multiplier
    
    // Original player ship dimensions: 120x84
    // Scaled dimensions: 720x504
    const shipWidth = 120 * scale;
    const shipHeight = 84 * scale;
    
    // Helper function to draw pixelated blocks
    const drawPixelBlock = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.floor(x) * pixelSize,
        Math.floor(y) * pixelSize,
        Math.floor(w) * pixelSize,
        Math.floor(h) * pixelSize
      );
    };
    
    // Helper to adjust color brightness
    const adjustBrightness = (color: string, amount: number): string => {
      const num = parseInt(color.replace('#', ''), 16);
      const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
      const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
      const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
      return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
    };
    
    // Normalize coordinates to pixel grid
    const px = (x: number) => Math.floor(x / pixelSize);
    const py = (y: number) => Math.floor(y / pixelSize);
    
    // WRECKED PLAYER SHIP - 6x scale, matching actual player ship design
    // Colors matching actual player ship
    const fuselageBase = '#2a2a2a'; // Dark grey - main body
    const fuselageSecondary = '#3a3a3a'; // Lighter grey - secondary hull
    const wingColor = '#3a3a3a'; // Medium grey - wings
    const wingDark = '#2a2a2a'; // Darker grey - wing details
    const engineColor = '#1a1a1a'; // Black - engines
    const cockpitColor = '#1a1a2a'; // Dark blue-grey - cockpit
      // Red accent available if needed in future
      // const redAccent = '#cc0000'; // Red - accents
    const brownAccent = '#5a4a3a'; // Brown - weathering
    const whiteAccent = '#ffffff'; // White - highlights
    
    // 3D shading colors
    const fuselageLight = adjustBrightness(fuselageBase, 20);
    const fuselageDark = adjustBrightness(fuselageBase, -25);
    const wingLight = adjustBrightness(wingColor, 25);
    const wingDarkShadow = adjustBrightness(wingColor, -30);
    
    // Ship reference point (center of original design, rear of ship)
    const shipRefX = shipX - shipWidth * 0.4; // Position ship with nose pointing right
    const shipRefY = shipY;
    
    // MAIN FUSELAGE - Pointed nose design (scaled 6x from original)
    // Main body outline (wrecked - broken in middle)
    // Fuselage points available if needed in future (commented out to avoid unused variable warning)
    /*
    const fuselagePoints = [
      // Front nose (pointed right)
      { x: shipRefX + shipWidth * 0.9, y: shipRefY },
      // Top front
      { x: shipRefX + shipWidth * 0.8, y: shipRefY - shipHeight * 0.11 },
      { x: shipRefX + shipWidth * 0.7, y: shipRefY - shipHeight * 0.21 },
      // Top rear
      { x: shipRefX + shipWidth * 0.25, y: shipRefY - shipHeight * 0.29 },
      { x: shipRefX + shipWidth * 0.15, y: shipRefY - shipHeight * 0.14 },
      // Rear center (broken section starts here)
      { x: shipRefX + shipWidth * 0.1, y: shipRefY },
      // Bottom rear
      { x: shipRefX + shipWidth * 0.15, y: shipRefY + shipHeight * 0.14 },
      { x: shipRefX + shipWidth * 0.25, y: shipRefY + shipHeight * 0.29 },
      // Bottom front
      { x: shipRefX + shipWidth * 0.7, y: shipRefY + shipHeight * 0.21 },
      { x: shipRefX + shipWidth * 0.8, y: shipRefY + shipHeight * 0.11 },
    ];
    */
    
    // Draw main fuselage body (broken in middle - split at rear)
    // Front section (nose to break point)
    drawPixelBlock(px(shipRefX + shipWidth * 0.25), py(shipRefY - shipHeight * 0.29), px(shipWidth * 0.65), py(shipHeight * 0.58), fuselageBase);
    // Top face (lighter)
    drawPixelBlock(px(shipRefX + shipWidth * 0.25), py(shipRefY - shipHeight * 0.29), px(shipWidth * 0.65), py(shipHeight * 0.15), fuselageLight);
    // Right face (darker shadow)
    drawPixelBlock(px(shipRefX + shipWidth * 0.85), py(shipRefY - shipHeight * 0.21), px(shipWidth * 0.05), py(shipHeight * 0.42), fuselageDark);
    
    // Broken section - gap in middle (rear section separated)
    ctx.fillStyle = '#000000';
    drawPixelBlock(px(shipRefX + shipWidth * 0.08), py(shipRefY - shipHeight * 0.14), px(shipWidth * 0.04), py(shipHeight * 0.28), '#000000');
    
    // Rear section - damaged and separated
    drawPixelBlock(px(shipRefX), py(shipRefY - shipHeight * 0.29), px(shipWidth * 0.25), py(shipHeight * 0.58), fuselageBase);
    drawPixelBlock(px(shipRefX), py(shipRefY - shipHeight * 0.29), px(shipWidth * 0.25), py(shipHeight * 0.15), fuselageLight);
    drawPixelBlock(px(shipRefX + shipWidth * 0.22), py(shipRefY - shipHeight * 0.29), px(shipWidth * 0.03), py(shipHeight * 0.58), fuselageDark);
    
    // Secondary hull detail - lighter grey (damaged)
    drawPixelBlock(px(shipRefX + shipWidth * 0.85), py(shipRefY - shipHeight * 0.07), px(shipWidth * 0.6), py(shipHeight * 0.14), fuselageSecondary);
    // Crack in secondary hull
    ctx.fillStyle = '#000000';
    drawPixelBlock(px(shipRefX + shipWidth * 0.55), py(shipRefY - shipHeight * 0.07), px(shipWidth * 0.02), py(shipHeight * 0.14), '#000000');
    
    // WINGS - Four wings matching actual design (scaled 6x)
    // Top left wing (BROKEN - partially missing)
    drawPixelBlock(px(shipRefX + shipWidth * 0.25), py(shipRefY - shipHeight * 0.29), px(shipWidth * 0.125), py(shipHeight * 0.07), wingColor);
    drawPixelBlock(px(shipRefX + shipWidth * 0.125), py(shipRefY - shipHeight * 0.36), px(shipWidth * 0.042), py(shipHeight * 0.05), wingColor);
    // 3D effect
    drawPixelBlock(px(shipRefX + shipWidth * 0.25), py(shipRefY - shipHeight * 0.29), px(shipWidth * 0.125), py(shipHeight * 0.02), wingLight);
    drawPixelBlock(px(shipRefX + shipWidth * 0.35), py(shipRefY - shipHeight * 0.29), px(shipWidth * 0.015), py(shipHeight * 0.07), wingDarkShadow);
    
    // Top right wing (DAMAGED - cracked)
    drawPixelBlock(px(shipRefX + shipWidth * 0.25), py(shipRefY - shipHeight * 0.29), px(shipWidth * 0.125), py(shipHeight * 0.07), wingColor);
    drawPixelBlock(px(shipRefX + shipWidth * 0.375), py(shipRefY - shipHeight * 0.36), px(shipWidth * 0.042), py(shipHeight * 0.05), wingColor);
    // 3D effect
    drawPixelBlock(px(shipRefX + shipWidth * 0.25), py(shipRefY - shipHeight * 0.29), px(shipWidth * 0.125), py(shipHeight * 0.02), wingLight);
    drawPixelBlock(px(shipRefX + shipWidth * 0.35), py(shipRefY - shipHeight * 0.29), px(shipWidth * 0.015), py(shipHeight * 0.07), wingDarkShadow);
    // Crack in wing
    ctx.fillStyle = '#000000';
    drawPixelBlock(px(shipRefX + shipWidth * 0.3), py(shipRefY - shipHeight * 0.32), px(shipWidth * 0.01), py(shipHeight * 0.05), '#000000');
    
    // Bottom left wing (MISSING - only stub remains)
    drawPixelBlock(px(shipRefX + shipWidth * 0.25), py(shipRefY + shipHeight * 0.29), px(shipWidth * 0.08), py(shipHeight * 0.05), wingColor);
    drawPixelBlock(px(shipRefX + shipWidth * 0.25), py(shipRefY + shipHeight * 0.29), px(shipWidth * 0.08), py(shipHeight * 0.02), wingLight);
    
    // Bottom right wing (BROKEN OFF - floating separately)
    const detachedWingX = shipRefX + shipWidth * 0.15;
    const detachedWingY = shipRefY + shipHeight * 0.4;
    drawPixelBlock(px(detachedWingX), py(detachedWingY), px(shipWidth * 0.125), py(shipHeight * 0.07), wingColor);
    drawPixelBlock(px(detachedWingX + shipWidth * 0.042), py(detachedWingY - shipHeight * 0.07), px(shipWidth * 0.042), py(shipHeight * 0.05), wingColor);
    drawPixelBlock(px(detachedWingX), py(detachedWingY), px(shipWidth * 0.125), py(shipHeight * 0.02), wingLight);
    drawPixelBlock(px(detachedWingX + shipWidth * 0.11), py(detachedWingY), px(shipWidth * 0.015), py(shipHeight * 0.07), wingDarkShadow);
    
    // Wing panels - darker grey (damaged)
    drawPixelBlock(px(shipRefX + shipWidth * 0.3), py(shipRefY - shipHeight * 0.25), px(shipWidth * 0.05), py(shipHeight * 0.04), wingDark);
    drawPixelBlock(px(shipRefX + shipWidth * 0.3), py(shipRefY + shipHeight * 0.25), px(shipWidth * 0.05), py(shipHeight * 0.04), wingDark);
    
    // ENGINE NOZZLES - Two engines at rear (scaled 6x)
    const engineRadius = 8 * scale; // 48px radius
    const engineY1 = shipRefY - shipHeight * 0.11; // Top engine
    const engineY2 = shipRefY + shipHeight * 0.11; // Bottom engine
    const engineX = shipRefX + shipWidth * 0.05;
    
    // Top engine - DESTROYED (black hole)
    ctx.fillStyle = '#000000';
    drawPixelBlock(px(engineX - engineRadius), py(engineY1 - engineRadius), px(engineRadius * 2), py(engineRadius * 2), '#000000');
    
    // Bottom engine - DAMAGED (partially intact)
    drawPixelBlock(px(engineX - engineRadius), py(engineY2 - engineRadius), px(engineRadius * 2), py(engineRadius * 2), engineColor);
    // Inner ring
    drawPixelBlock(px(engineX - engineRadius * 0.625), py(engineY2 - engineRadius * 0.625), px(engineRadius * 1.25), py(engineRadius * 1.25), '#0a0a0a');
    // Damage hole
    drawPixelBlock(px(engineX - engineRadius * 0.3), py(engineY2 - engineRadius * 0.3), px(engineRadius * 0.6), py(engineRadius * 0.6), '#000000');
    // 3D effect
    drawPixelBlock(px(engineX - engineRadius), py(engineY2 - engineRadius), px(engineRadius * 2), py(engineRadius * 0.4), '#3a3a3a');
    drawPixelBlock(px(engineX + engineRadius * 0.7), py(engineY2 - engineRadius), px(engineRadius * 0.3), py(engineRadius * 2), '#0a0a0a');
    
    // COCKPIT/CANOPY - Near front (scaled 6x)
    const cockpitX = shipRefX + shipWidth * 0.9;
    const cockpitY = shipRefY;
    drawPixelBlock(px(cockpitX - shipWidth * 0.1), py(cockpitY - shipHeight * 0.18), px(shipWidth * 0.25), py(shipHeight * 0.36), cockpitColor);
    // 3D effect
    drawPixelBlock(px(cockpitX - shipWidth * 0.1), py(cockpitY - shipHeight * 0.18), px(shipWidth * 0.25), py(shipHeight * 0.1), '#2a2a3a');
    drawPixelBlock(px(cockpitX + shipWidth * 0.12), py(cockpitY - shipHeight * 0.18), px(shipWidth * 0.03), py(shipHeight * 0.36), '#0a0a1a');
    // SHATTERED canopy
    ctx.fillStyle = '#000000';
    drawPixelBlock(px(cockpitX - shipWidth * 0.05), py(cockpitY - shipHeight * 0.05), px(shipWidth * 0.1), py(shipHeight * 0.1), '#000000');
    // Crack lines
    drawPixelBlock(px(cockpitX - shipWidth * 0.08), py(cockpitY - shipHeight * 0.15), px(shipWidth * 0.02), py(shipHeight * 0.3), '#000000');
    drawPixelBlock(px(cockpitX + shipWidth * 0.02), py(cockpitY - shipHeight * 0.12), px(shipWidth * 0.02), py(shipHeight * 0.24), '#000000');
    
    // RED ACCENTS - Wing fins and stripes (scaled 6x, faded/burnt)
    const redFaded = '#880000'; // Burnt red
    // Top wing fin (right side)
    drawPixelBlock(px(shipRefX + shipWidth * 0.35), py(cockpitY - shipHeight * 0.32), px(shipWidth * 0.05), py(shipHeight * 0.04), redFaded);
    // Bottom wing fin (left side - mostly missing, only remnant)
    drawPixelBlock(px(shipRefX + shipWidth * 0.3), py(cockpitY + shipHeight * 0.32), px(shipWidth * 0.03), py(shipHeight * 0.02), redFaded);
    // Red stripe on top wing
    drawPixelBlock(px(shipRefX + shipWidth * 0.27), py(cockpitY - shipHeight * 0.31), px(shipWidth * 0.033), py(shipHeight * 0.05), redFaded);
    
    // NOSE - White with red tip (scaled 6x)
    const noseRadius = 6 * scale; // 36px
    drawPixelBlock(px(cockpitX + shipWidth * 0.05 - noseRadius), py(cockpitY - noseRadius), px(noseRadius * 2), py(noseRadius * 2), whiteAccent);
    // Red tip
    const tipRadius = 3 * scale; // 18px
    drawPixelBlock(px(cockpitX + shipWidth * 0.05 - tipRadius * 0.5), py(cockpitY - tipRadius), px(tipRadius), py(tipRadius * 2), redFaded);
    
    // WEAPON PORTS - On wings (scaled 6x, damaged)
    const weaponRadius = 4.5 * scale; // 27px
    drawPixelBlock(px(shipRefX + shipWidth * 0.75 - weaponRadius), py(cockpitY - shipHeight * 0.14 - weaponRadius), px(weaponRadius * 2), py(weaponRadius * 2), redFaded);
    drawPixelBlock(px(shipRefX + shipWidth * 0.75 - weaponRadius), py(cockpitY + shipHeight * 0.14 - weaponRadius), px(weaponRadius * 2), py(weaponRadius * 2), redFaded);
    
    // BROWN WEATHERING - Rust spots (scaled 6x)
    drawPixelBlock(px(shipRefX + shipWidth * 0.67), py(cockpitY - shipHeight * 0.12), px(shipWidth * 0.017), py(shipHeight * 0.024), brownAccent);
    drawPixelBlock(px(shipRefX + shipWidth * 0.67), py(cockpitY + shipHeight * 0.12), px(shipWidth * 0.017), py(shipHeight * 0.024), brownAccent);
    drawPixelBlock(px(shipRefX + shipWidth * 0.45), py(cockpitY - shipHeight * 0.08), px(shipWidth * 0.017), py(shipHeight * 0.024), brownAccent);
    
    // DEBRIS floating around ship (scaled appropriately)
    ctx.fillStyle = '#3a3a3a';
    // Large debris chunks
    drawPixelBlock(px(shipRefX - shipWidth * 0.2), py(cockpitY - shipHeight * 0.15), px(shipWidth * 0.05), py(shipHeight * 0.04), '#3a3a3a');
    drawPixelBlock(px(shipRefX + shipWidth * 0.25), py(cockpitY + shipHeight * 0.3), px(shipWidth * 0.04), py(shipHeight * 0.03), '#2a2a2a');
    drawPixelBlock(px(shipRefX + shipWidth * 0.1), py(cockpitY - shipHeight * 0.4), px(shipWidth * 0.03), py(shipHeight * 0.05), '#3a3a3a');
    // 3D effect on debris
    drawPixelBlock(px(shipRefX - shipWidth * 0.2), py(cockpitY - shipHeight * 0.15), px(shipWidth * 0.05), py(shipHeight * 0.01), '#4a4a4a');
    drawPixelBlock(px(shipRefX - shipWidth * 0.15), py(cockpitY - shipHeight * 0.15), px(shipWidth * 0.01), py(shipHeight * 0.04), '#1a1a1a');
    
    // Smoke/dust clouds around wreckage (scaled)
    ctx.fillStyle = '#1a1a1a';
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 12; i++) {
      const x = shipRefX - shipWidth * 0.15 + Math.random() * shipWidth * 0.5;
      const y = cockpitY - shipHeight * 0.25 + Math.random() * shipHeight * 0.5;
      const size = (30 + Math.random() * 60) * scale / 10; // Scaled appropriately
      drawPixelBlock(px(x), py(y), px(size), py(size), '#1a1a1a');
    }
    ctx.globalAlpha = 1;
    
    // Re-enable smoothing for the final texture
    ctx.imageSmoothingEnabled = true;
    
    this.textures.addCanvas('death-screen-background', canvas);
  }

  /**
   * Generate bitmap font for HUD
   */
  private generateBitmapFont(): void {
    generateBitmapFont(this, 'hud-font');
  }
}

