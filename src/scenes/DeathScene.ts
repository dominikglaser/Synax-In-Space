/**
 * DeathScene - Death screen when player loses
 */

import Phaser from 'phaser';
import { musicSystem, MusicTheme } from '../systems/MusicSystem';
import { sceneLogger } from '../utils/SceneLogger';
// getKenneySprite available if needed in future
// import { getKenneySprite } from '../config/AssetMappings';
import { GAME_CONFIG } from '../config/constants';

interface Meteorite {
  sprite: Phaser.GameObjects.Sprite;
  vx: number;
  vy: number;
  speed: number;
}

interface FloatingHuman {
  sprite: Phaser.GameObjects.Container;
  headSprite?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics; // Separate head for decapitated variant
  bloodParticles?: Phaser.GameObjects.Graphics[]; // Blood particles between head and torso
  bloodDrips?: Array<{ graphics: Phaser.GameObjects.Graphics; y: number; speed: number }>; // Blood drips from cuts
  vx: number;
  vy: number;
  rotationSpeed: number;
  floatAmplitude: number;
  floatSpeed: number;
  floatPhase: number;
  isDecapitated: boolean;
  isFullySeparated: boolean; // Head and torso drift completely independently
  headOffsetX: number;
  headOffsetY: number;
  headVx?: number; // Independent head velocity
  headVy?: number; // Independent head velocity
  headRotationSpeed?: number; // Independent head rotation
}

export class DeathScene extends Phaser.Scene {
  private meteorites: Meteorite[] = [];
  private meteoriteSpawnTimer: number = 0;
  private station?: Phaser.GameObjects.Image;
  private stationSize: number = 0;
  private stationX: number = 0;
  private stationY: number = 0;
  private fireEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private smokeEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private firePositions: Array<{ x: number; y: number }> = []; // Store fire positions for rotation
  private crackGraphics?: Phaser.GameObjects.Graphics;
  private crackPoints: Array<{ x: number; y: number; width: number }> = [];
  private crackBranches: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }> = [];
  private crackPulseAlpha: number = 0.4; // Current pulse alpha value (0.2 to 0.6)
  private floatingHumans: FloatingHuman[] = [];
  private humanSpawnTimer: number = 0;
  private isReady: boolean = false;
  private gameOverMusic?: Phaser.Sound.BaseSound;
  private isTransitioning: boolean = false;
  private kennyTimer: number = 0;
  private kennySpawned: boolean = false; // Track if auto-spawn happened (60 seconds)
  private kennys: Phaser.GameObjects.Container[] = []; // Array of all Kennys (max 30)

  constructor() {
    super({ key: 'DeathScene' });
  }

  preload(): void {
    // Load custom game over music MP3 file if it exists
    // Phaser will gracefully handle if the file doesn't exist
    this.load.audio('gameOverMusic', 'assets/music/gameover/lostnax v2 so sad.mp3');
  }

  create(): void {
    sceneLogger.log('DeathScene', 'CREATE', {
      sceneState: this.scene.isActive() ? 'ACTIVE' : 'INACTIVE',
      scenePaused: this.scene.isPaused() ? 'PAUSED' : 'RUNNING',
      isTransitioning: this.isTransitioning,
    });
    
    // Reset transition flag when scene actually creates
    this.isTransitioning = false;
    
    // Ensure camera is visible
    this.cameras.main.setVisible(true);
    sceneLogger.log('DeathScene', 'CAMERA_VISIBLE');
    
    // Ensure HUD scene is stopped
    if (this.scene.isActive('HUDScene')) {
      this.scene.stop('HUDScene');
      sceneLogger.log('DeathScene', 'HUD_STOPPED');
    }
    
    // Try to play custom MP3 music, fallback to procedural music
    try {
      // Check if the audio file was loaded successfully
      if (this.cache.audio.exists('gameOverMusic')) {
        // Stop procedural music
        musicSystem.stop();
        
        // Play custom MP3 file
        this.gameOverMusic = this.sound.add('gameOverMusic', {
          volume: 0.5,
          loop: true,
        });
        this.gameOverMusic.play();
      } else {
        // Fallback to procedural game over theme
        musicSystem.playTheme(MusicTheme.GAME_OVER);
      }
    } catch (error) {
      // Fallback to procedural music
      try {
        musicSystem.playTheme(MusicTheme.GAME_OVER);
      } catch (e) {
        // Ignore music errors - game can continue without music
      }
    }
    
    const { width, height } = this.cameras.main;
    
    // Space background (same as menu)
    const bg = this.add.image(0, 0, 'menu-background').setOrigin(0, 0);
    bg.setDisplaySize(width, height);
    bg.setDepth(-100);
    
    // Create animated stars - slow pulsing, all out of sync
    this.createAnimatedStars(width, height);
    
    // Create floating dead humans in space suits
    this.createFloatingHumans(width, height);
    
    // Large space station in upper right - damaged and burning
    this.stationSize = Math.min(width * 0.6, height * 0.8);
    this.stationX = width - this.stationSize * 0.3;
    this.stationY = this.stationSize * 0.3;
    this.station = this.add.image(this.stationX, this.stationY, 'space-station');
    this.station.setDisplaySize(this.stationSize, this.stationSize);
    this.station.setDepth(-99);
    this.station.setAlpha(1);
    // Damaged appearance - darker with red/orange tint
    this.station.setTint(0x4a3a2a); // Darker, more damaged look
    
    // Slow rotation animation (damaged station still rotates)
    this.tweens.add({
      targets: this.station,
      angle: 360,
      duration: 120000, // 120 seconds for full rotation
      ease: 'Linear',
      repeat: -1,
    });
    
    // Add company logo overlay on the space station (even on damaged station)
    if (this.textures.exists('company-logo')) {
      const logoSize = this.stationSize * 0.3; // Logo is 30% of station size
      const logo = this.add.image(this.stationX, this.stationY, 'company-logo');
      logo.setDisplaySize(logoSize, logoSize);
      logo.setDepth(-98.7); // In front of station (-99) but behind crack (-98.5)
      logo.setOrigin(0.5, 0.5); // Center the logo
      logo.setAlpha(0.7); // More transparent on damaged station
      
      // Make logo rotate with the station
      this.tweens.add({
        targets: logo,
        angle: 360,
        duration: 120000, // Same duration as station
        ease: 'Linear',
        repeat: -1,
      });
    }
    
    // Create burning effects on the station
    this.createBurningEffects();
    
    // Create crack through the middle of the station
    this.createCrack();
    
    // Start pulsing animation for crack
    this.startCrackPulse();
    
    // Ensure explosion-particle texture exists for meteorite explosions
    if (!this.textures.exists('explosion-particle')) {
      const circle = this.add.graphics();
      circle.fillStyle(0xffffff);
      circle.fillCircle(4, 4, 4);
      circle.generateTexture('explosion-particle', 8, 8);
      circle.destroy();
    }
    
    // Main title
    this.add
      .text(width / 2, height / 2 - 50, 'You are Dead', {
        fontSize: '48px',
        color: '#ff0000',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(100);
    
    // Subtitle
    this.add
      .text(width / 2, height / 2 + 30, 'All hope for the survival of the universe is lost. The Synax Space Station is destroyed.', {
        fontSize: '24px',
        color: '#ffaa00',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        wordWrap: { width: width * 0.8 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(100);
    
    // Instructions
    this.add
      .text(width / 2, height / 2 + 100, 'Press enter to try again', {
        fontSize: '18px',
        color: '#888888',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(100);
    
    this.add
      .text(width / 2, height / 2 + 130, 'Press esc to return to the menu', {
        fontSize: '18px',
        color: '#888888',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(100);
    
    // Blood drops removed - no longer creating them
    
    // Reset Kenny timer when scene is created
    this.kennyTimer = 0;
    this.kennySpawned = false;
    
    // Easter egg: Kenny from South Park - spawn on 'K' key (up to 30) or after 60 seconds
    if (this.input.keyboard) {
      // Method 1: Using key code
      const kKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
      kKey.on('down', () => {
        if (this.kennys.length < 30) {
          this.spawnKenny(width, height);
        }
      });
      
      // Method 2: Using event name (backup)
      this.input.keyboard.on('keydown-K', () => {
        if (this.kennys.length < 30) {
          this.spawnKenny(width, height);
        }
      });
      
      // Method 3: Generic keydown event (most reliable)
      this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
        if ((event.key === 'K' || event.key === 'k' || event.code === 'KeyK') && this.kennys.length < 30) {
          this.spawnKenny(width, height);
        }
      });
    }
    
    // Input handlers
    // Enter: Try again (restart game)
    this.input.keyboard!.on('keydown-ENTER', () => {
      if (this.isTransitioning) {
        sceneLogger.log('DeathScene', 'GAME_RESTART_BLOCKED', { isTransitioning: this.isTransitioning });
        return;
      }
      
      sceneLogger.logTransition('DeathScene', 'GameScene');
      this.isTransitioning = true;
      
      try {
        // Stop game over music if playing
        if (this.gameOverMusic) {
          this.gameOverMusic.stop();
          this.gameOverMusic.destroy();
          sceneLogger.log('DeathScene', 'MUSIC_STOPPED');
        }
        musicSystem.stop();
        
        // Ensure HUD scene is stopped
        this.scene.stop('HUDScene');
        sceneLogger.log('DeathScene', 'HUD_STOPPED');
        
        // Stop all tweens to prevent them from continuing to render
        this.tweens.killAll();
        sceneLogger.log('DeathScene', 'ALL_TWEENS_STOPPED');
        
        // Restart game with default seed
        const seed = GAME_CONFIG.defaultSeed;
        this.scene.start('GameScene', { seed: seed });
        sceneLogger.log('DeathScene', 'GAMESCENE_STARTED', { seed: seed });
        
        // Check scene states after transition
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((window as any).sceneLogger) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).sceneLogger.checkSceneStates(this.game);
          }
        }, 100);
      } catch (error) {
        sceneLogger.logError('DeathScene', 'GAME_RESTART_ERROR', error);
        this.isTransitioning = false;
      }
    });
    
    // ESC: Return to menu
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.isTransitioning) {
        sceneLogger.log('DeathScene', 'MENU_TRANSITION_BLOCKED', { isTransitioning: this.isTransitioning });
        return;
      }
      
      sceneLogger.logTransition('DeathScene', 'MenuScene');
      this.isTransitioning = true;
      
      try {
        // Stop game over music if playing
        if (this.gameOverMusic) {
          this.gameOverMusic.stop();
          this.gameOverMusic.destroy();
          sceneLogger.log('DeathScene', 'MUSIC_STOPPED');
        }
        musicSystem.stop();
        
        // Ensure HUD scene is stopped
        this.scene.stop('HUDScene');
        sceneLogger.log('DeathScene', 'HUD_STOPPED');
        
        // Stop all tweens to prevent them from continuing to render
        this.tweens.killAll();
        sceneLogger.log('DeathScene', 'ALL_TWEENS_STOPPED');
        
        // CRITICAL: Stop MenuScene first if it's running, then start it fresh
        // This ensures a clean restart
        if (this.scene.isActive('MenuScene')) {
          this.scene.stop('MenuScene');
          sceneLogger.log('DeathScene', 'MENUSCENE_STOPPED_BEFORE_RESTART');
        }
        
        import('../utils/MenuSceneDebugger').then(({ MenuSceneDebugger }) => {
          MenuSceneDebugger.logTransition('DeathScene', 'MenuScene', {
            sceneActive: this.scene.isActive(),
          });
        });
        
        // Use scene.start() to restart MenuScene
        // MenuScene will wait for renderer to be ready in its create() method
        this.scene.start('MenuScene');
        sceneLogger.log('DeathScene', 'MENUSCENE_STARTED');
        
        // Check scene states after transition
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((window as any).sceneLogger) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).sceneLogger.checkSceneStates(this.game);
          }
        }, 100);
      } catch (error) {
        sceneLogger.logError('DeathScene', 'MENU_TRANSITION_ERROR', error);
        this.isTransitioning = false;
      }
    });
    
    // Mark scene as ready
    this.isReady = true;
  }

  shutdown(): void {
    sceneLogger.log('DeathScene', 'SHUTDOWN', {
      isTransitioning: this.isTransitioning,
      sceneState: this.scene.isActive() ? 'ACTIVE' : 'INACTIVE',
    });
    
    // Clean up resources
    if (this.gameOverMusic) {
      this.gameOverMusic.stop();
      this.gameOverMusic.destroy();
      this.gameOverMusic = undefined;
    }
    
    // Clean up crack graphics
    if (this.crackGraphics) {
      this.crackGraphics.destroy();
      this.crackGraphics = undefined;
    }
    
    // Clean up floating humans
    this.floatingHumans.forEach(human => {
      if (human.sprite) {
        human.sprite.destroy();
      }
    });
    this.floatingHumans = [];
    
    // Clean up enemy ship
    
    this.isTransitioning = false;
  }

  /**
   * Create a crack through the middle of the damaged space station
   */
  private createCrack(): void {
    this.crackGraphics = this.add.graphics();
    this.crackGraphics.setDepth(-98.5); // Just above station, below fire
    
    // Generate crack shape once (relative to station center, will be rotated)
    // Use slightly smaller radius to account for line width and ensure it stays within sprite bounds
    const radius = this.stationSize * 0.5;
    const maxCrackRadius = radius * 0.98; // 98% of radius to ensure it stays within sprite bounds
    const jaggedness = 15; // Reduced for more natural look
    const numPoints = 15; // Fewer points for cleaner crack
    
    // Generate jagged points along a vertical line (will be rotated with station)
    // Use a seeded random for consistent shape
    let seed = 12345; // Fixed seed for consistent crack shape
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    // Main crack points - create natural-looking vertical crack
    // Start 5% from top edge, go through center, end 5% from bottom edge
    const crackStartY = -maxCrackRadius * 0.95; // 5% shorter on top
    const crackEndY = maxCrackRadius * 0.95; // 5% shorter on bottom
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      // Vertical position from start to end (5% shorter on each side)
      let baseY = crackStartY + (crackEndY - crackStartY) * t;
      
      // Horizontal offset - more variation in middle, less at edges
      const jaggedFactor = Math.sin(t * Math.PI); // 0 at edges, 1 in middle
      let offset = (random() * 2 - 1) * jaggedness * jaggedFactor;
      
      // Variable width - wider in middle sections for better visibility
      // Create 2-3 wider sections along the crack
      let width = 1.5; // Base width
      const widthVariation = Math.sin(t * Math.PI * 3) * 0.5 + 0.5; // Creates 3 peaks
      const widthVariation2 = Math.sin(t * Math.PI * 2.5) * 0.3 + 0.3; // Creates 2-3 more peaks
      width += widthVariation * 2.5; // Add up to 2.5 extra width
      width += widthVariation2 * 1.5; // Add up to 1.5 more width
      width = Math.max(1.5, Math.min(5.5, width)); // Clamp between 1.5 and 5.5
      
      // Clamp point to stay within maxCrackRadius
      // Calculate distance from center
      const distFromCenter = Math.sqrt(offset * offset + baseY * baseY);
      if (distFromCenter > maxCrackRadius) {
        // Scale down to stay within bounds
        const scale = maxCrackRadius / distFromCenter;
        offset = offset * scale;
        baseY = baseY * scale;
      }
      
      // Simple vertical crack with horizontal jaggedness
      this.crackPoints.push({
        x: offset,
        y: baseY,
        width: width,
      });
    }
    
    // Ensure first and last points are 5% shorter on each side
    if (this.crackPoints.length > 0) {
      const first = this.crackPoints[0]!;
      first.x = 0; // Start at center horizontally
      first.y = -maxCrackRadius * 0.95; // 5% shorter on top
      first.width = 2; // Slightly wider at edges
      
      const last = this.crackPoints[this.crackPoints.length - 1]!;
      last.x = 0; // End at center horizontally
      last.y = maxCrackRadius * 0.95; // 5% shorter on bottom
      last.width = 2; // Slightly wider at edges
    }
    
    // Generate branch cracks - fewer, more natural
    const branchCount = 4; // Reduced for cleaner look
    for (let i = 0; i < branchCount; i++) {
      // Pick a point in the middle third of the crack
      const branchIndex = Math.floor((numPoints / 3) + random() * (numPoints / 3)) + 1;
      if (branchIndex >= this.crackPoints.length - 1) continue;
      
      const branchPoint = this.crackPoints[branchIndex]!;
      
      // Perpendicular angle with slight variation
      const angleVariation = (random() - 0.5) * Math.PI / 4; // -45 to +45 degrees
      const perpAngle = Math.PI / 2 + angleVariation;
      
      // Calculate branch length that stays within station
      const branchDist = Math.sqrt(branchPoint.x * branchPoint.x + branchPoint.y * branchPoint.y); // Distance from center
      const maxBranchLength = Math.min(maxCrackRadius - branchDist, maxCrackRadius * 0.3);
      const branchLength = 10 + random() * maxBranchLength;
      
      const endX = branchPoint.x + Math.cos(perpAngle) * branchLength;
      const endY = branchPoint.y + Math.sin(perpAngle) * branchLength;
      const endDist = Math.sqrt(endX * endX + endY * endY);
      
      // Clamp branch end to maxCrackRadius to ensure it stays within sprite bounds
      let finalEndX = endX;
      let finalEndY = endY;
      if (endDist > maxCrackRadius) {
        const scale = maxCrackRadius / endDist;
        finalEndX = endX * scale;
        finalEndY = endY * scale;
      }
      
      this.crackBranches.push({
        start: branchPoint,
        end: {
          x: finalEndX,
          y: finalEndY,
        },
      });
    }
    
    this.updateCrack();
  }

  /**
   * Start pulsing animation for crack (brightness fades in and out)
   */
  private startCrackPulse(): void {
    // Pulse alpha between 0.2 and 0.6 for subtle glow effect
    this.tweens.add({
      targets: this,
      crackPulseAlpha: 0.6,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Update crack visual to match station rotation
   */
  private updateCrack(): void {
    if (!this.crackGraphics || !this.station || this.crackPoints.length === 0) return;
    
    this.crackGraphics.clear();
    
    const centerX = this.stationX;
    const centerY = this.stationY;
    const stationAngle = (this.station.angle * Math.PI) / 180;
    const cos = Math.cos(stationAngle);
    const sin = Math.sin(stationAngle);
    
    // Rotate and translate main crack points, and clamp to station radius
    // Note: crack points are in local space (x = horizontal offset, y = vertical position)
    const radius = this.stationSize * 0.5;
    const maxCrackRadius = radius * 0.98; // 98% of radius to ensure it stays within sprite bounds
    const rotatedPoints = this.crackPoints.map((pt) => {
      // Calculate rotated position in local space (relative to station center)
      const rotatedLocalX = pt.x * cos - pt.y * sin;
      const rotatedLocalY = pt.x * sin + pt.y * cos;
      
      // Clamp to maxCrackRadius to ensure it doesn't extend beyond sprite bounds
      const distFromCenter = Math.sqrt(rotatedLocalX * rotatedLocalX + rotatedLocalY * rotatedLocalY);
      let clampedLocalX = rotatedLocalX;
      let clampedLocalY = rotatedLocalY;
      if (distFromCenter > maxCrackRadius) {
        const scale = maxCrackRadius / distFromCenter;
        clampedLocalX = rotatedLocalX * scale;
        clampedLocalY = rotatedLocalY * scale;
      }
      
      // Convert to world coordinates
      return {
        x: centerX + clampedLocalX,
        y: centerY + clampedLocalY,
        width: pt.width,
      };
    });
    
    // Use pulse alpha for translucent pulsing effect
    const pulseAlpha = this.crackPulseAlpha;
    
    // Draw main crack with variable width and cleaner appearance
    // Outer shadow (dark edge) - slightly translucent, variable width
    for (let i = 0; i < rotatedPoints.length - 1; i++) {
      const pt1 = rotatedPoints[i]!;
      const pt2 = rotatedPoints[i + 1]!;
      const avgWidth = (pt1.width + pt2.width) / 2;
      
      this.crackGraphics.lineStyle(avgWidth * 1.2, 0x000000, 0.5 * pulseAlpha);
      this.crackGraphics.lineBetween(pt1.x, pt1.y, pt2.x, pt2.y);
    }
    
    // Middle layer (dark gray for depth) - translucent, variable width
    for (let i = 0; i < rotatedPoints.length - 1; i++) {
      const pt1 = rotatedPoints[i]!;
      const pt2 = rotatedPoints[i + 1]!;
      const avgWidth = (pt1.width + pt2.width) / 2;
      
      this.crackGraphics.lineStyle(avgWidth * 0.8, 0x333333, 0.4 * pulseAlpha);
      this.crackGraphics.lineBetween(pt1.x, pt1.y, pt2.x, pt2.y);
    }
    
    // Inner crack (darker orange/red glow) - translucent and pulsing, variable width
    for (let i = 0; i < rotatedPoints.length - 1; i++) {
      const pt1 = rotatedPoints[i]!;
      const pt2 = rotatedPoints[i + 1]!;
      const avgWidth = (pt1.width + pt2.width) / 2;
      
      this.crackGraphics.lineStyle(avgWidth * 0.6, 0xcc4400, pulseAlpha); // Darker orange/red
      this.crackGraphics.lineBetween(pt1.x, pt1.y, pt2.x, pt2.y);
    }
    
    // Inner core (darker red) - translucent and pulsing, variable width
    for (let i = 0; i < rotatedPoints.length - 1; i++) {
      const pt1 = rotatedPoints[i]!;
      const pt2 = rotatedPoints[i + 1]!;
      const avgWidth = (pt1.width + pt2.width) / 2;
      
      this.crackGraphics.lineStyle(avgWidth * 0.3, 0x990000, pulseAlpha * 1.2); // Darker red core
      this.crackGraphics.lineBetween(pt1.x, pt1.y, pt2.x, pt2.y);
    }
    
    // Draw branch cracks with cleaner appearance
    this.crackBranches.forEach((branch) => {
      const startRotated = {
        x: centerX + branch.start.x * cos - branch.start.y * sin,
        y: centerY + branch.start.x * sin + branch.start.y * cos,
      };
      const endRotated = {
        x: centerX + branch.end.x * cos - branch.end.y * sin,
        y: centerY + branch.end.x * sin + branch.end.y * cos,
      };
      
      // Outer shadow (thinner for branches, translucent)
      if (this.crackGraphics) {
        this.crackGraphics.lineStyle(4, 0x000000, 0.3 * pulseAlpha);
        this.crackGraphics.lineBetween(startRotated.x, startRotated.y, endRotated.x, endRotated.y);
        
        // Inner glow (thinner for branches, darker red, translucent and pulsing)
        this.crackGraphics.lineStyle(2, 0xaa0000, pulseAlpha * 0.9); // Darker red
        this.crackGraphics.lineBetween(startRotated.x, startRotated.y, endRotated.x, endRotated.y);
      }
    });
  }

  /**
   * Create burning effects (fire and smoke) on the damaged space station
   */
  private createBurningEffects(): void {
    if (!this.station) return;
    
    // Generate random fire positions spread across the station surface
    // Use seeded random for consistent placement
    let seed = 67890; // Different seed for fire positions
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    // Create 8-10 fire positions randomly distributed across the station
    const fireCount = 8;
    const firePositions: Array<{ x: number; y: number }> = [];
    const radius = this.stationSize * 0.45; // Slightly inside station edge
    
    // Ensure fires are spread out - avoid clustering
    const minDistance = this.stationSize * 0.15; // Minimum distance between fires
    
    for (let i = 0; i < fireCount; i++) {
      let attempts = 0;
      let x: number = 0;
      let y: number = 0;
      let validPosition = false;
      
      while (!validPosition && attempts < 50) {
        // Random angle and distance from center
        const angle = random() * Math.PI * 2;
        const distance = (0.3 + random() * 0.7) * radius; // 30-100% of radius
        
        x = Math.cos(angle) * distance;
        y = Math.sin(angle) * distance;
        
        // Check distance from other fires
        validPosition = true;
        for (const existing of firePositions) {
          const dx = x - existing.x;
          const dy = y - existing.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDistance) {
            validPosition = false;
            break;
          }
        }
        
        attempts++;
      }
      
      if (validPosition || attempts >= 50) {
        firePositions.push({ x, y });
      }
    }
    
    // Store fire positions for rotation updates
    this.firePositions = firePositions;
    
    // Ensure we have a particle texture for fire
    if (!this.textures.exists('explosion-particle')) {
      const circle = this.add.graphics();
      circle.fillStyle(0xffffff);
      circle.fillCircle(4, 4, 4);
      circle.generateTexture('explosion-particle', 8, 8);
      circle.destroy();
    }
    
    firePositions.forEach(pos => {
      // Fire emitter
      const fireEmitter = this.add.particles(
        this.stationX + pos.x,
        this.stationY + pos.y,
        'explosion-particle',
        {
          speed: { min: 20, max: 50 },
          scale: { start: 0.6, end: 0 },
          lifespan: 800,
          quantity: 6,
          tint: [0xffff00, 0xff6600, 0xff0000], // Yellow to orange to red
          angle: { min: 270 - 30, max: 270 + 30 }, // Upward with spread
          emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 3), quantity: 1 },
          blendMode: 'ADD',
          frequency: 100,
        }
      );
      fireEmitter.setDepth(-98);
      this.fireEmitters.push(fireEmitter);
      
      // Smoke emitter
      const smokeEmitter = this.add.particles(
        this.stationX + pos.x,
        this.stationY + pos.y,
        'explosion-particle',
        {
          speed: { min: 15, max: 35 },
          scale: { start: 0.5, end: 1.2 },
          lifespan: 2000,
          quantity: 4,
          tint: [0x222222, 0x444444, 0x333333], // Dark grey smoke
          alpha: { start: 0.8, end: 0 },
          angle: { min: 270 - 45, max: 270 + 45 }, // Upward with wider spread
          emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 3), quantity: 1 },
          blendMode: 'NORMAL',
          frequency: 150,
        }
      );
      smokeEmitter.setDepth(-97);
      this.smokeEmitters.push(smokeEmitter);
    });
  }

  /**
   * Create animated stars that fade in and out slowly, all out of sync (same as menu)
   */
  private createAnimatedStars(width: number, height: number): void {
    // Create small and medium stars
    const smallStars = 200;
    const mediumStars = 30;
    
    // Small stars
    for (let i = 0; i < smallStars; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 0.5;
      const brightness = Math.random() * 0.6 + 0.4;
      
      const star = this.add.graphics();
      star.fillStyle(0xffffff, brightness);
      star.fillRect(x, y, size, size);
      star.setDepth(-99);
      
      const delay = Math.random() * 3000;
      const duration = Math.random() * 2000 + 2000;
      const minAlpha = Math.random() * 0.3 + 0.1;
      
      this.tweens.add({
        targets: star,
        alpha: { from: brightness, to: minAlpha },
        duration: duration,
        delay: delay,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    }
    
    // Medium/bright stars (with glow effect)
    for (let i = 0; i < mediumStars; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 3 + 1;
      const brightness = Math.random() * 0.4 + 0.6;
      
      const star = this.add.graphics();
      star.fillStyle(0xffffff, brightness);
      star.fillCircle(x, y, size);
      star.setDepth(-99);
      
      const glow = this.add.graphics();
      glow.fillStyle(0xffffff, brightness * 0.3);
      glow.fillCircle(x, y, size * 2);
      glow.setDepth(-100);
      
      const delay = Math.random() * 4000;
      const duration = Math.random() * 3000 + 2500;
      const minAlpha = Math.random() * 0.2 + 0.2;
      
      this.tweens.add({
        targets: [star, glow],
        alpha: { from: brightness, to: minAlpha },
        duration: duration,
        delay: delay,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    }
  }


  /**
   * Create floating dead humans in space suits in the background
   */
  private createFloatingHumans(width: number, height: number): void {
    // Generate space suit texture if it doesn't exist
    if (!this.textures.exists('space-suit-human')) {
      this.generateSpaceSuitSprite();
    }
    
    // Spawn 5 humans already on screen
    const initialCount = 5;
    for (let i = 0; i < initialCount; i++) {
      this.spawnFloatingHumanOnScreen(width, height);
    }
  }

  /**
   * Generate a simple space-suited human sprite with bleeding
   */
  private generateSpaceSuitSprite(): void {
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
    
    this.textures.addCanvas('space-suit-human', canvas);
  }

  /**
   * Spawn a single floating human in a space suit (from off-screen edges)
   */
  private spawnFloatingHuman(width: number, height: number): void {
    // Create container for the human
    const humanData = this.createHumanSprite();
    const human = humanData.container;
    
    // Random starting position (off-screen edges)
    const edge = Math.random();
    if (edge < 0.25) {
      // Top
      human.x = Math.random() * width;
      human.y = -50;
    } else if (edge < 0.5) {
      // Right
      human.x = width + 50;
      human.y = Math.random() * height;
    } else if (edge < 0.75) {
      // Bottom
      human.x = Math.random() * width;
      human.y = height + 50;
    } else {
      // Left
      human.x = -50;
      human.y = Math.random() * height;
    }
    
    // Random drift velocity (slow, gentle)
    const angle = Math.random() * Math.PI * 2;
    const speed = 5 + Math.random() * 15; // 5-20 pixels/second
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    // Random rotation speed (slow tumbling)
    const rotationSpeed = (Math.random() - 0.5) * 0.02; // -0.01 to 0.01 rad/sec
    
    // Random floating motion
    const floatAmplitude = 2 + Math.random() * 3; // 2-5 pixels
    const floatSpeed = 0.5 + Math.random() * 1.0; // 0.5-1.5 cycles/sec
    const floatPhase = Math.random() * Math.PI * 2;
    
    // Random initial rotation
    human.setRotation(Math.random() * Math.PI * 2);
    
    // Slightly transparent (ghostly)
    human.setAlpha(0.7 + Math.random() * 0.3); // 0.7-1.0
    
    this.floatingHumans.push({
      sprite: human,
      headSprite: humanData.headSprite,
      bloodParticles: humanData.bloodParticles,
      bloodDrips: humanData.bloodDrips,
      vx,
      vy,
      rotationSpeed,
      floatAmplitude,
      floatSpeed,
      floatPhase,
      isDecapitated: humanData.isDecapitated,
      isFullySeparated: humanData.isFullySeparated || false,
      headOffsetX: humanData.headOffsetX,
      headOffsetY: humanData.headOffsetY,
      headVx: humanData.headVx,
      headVy: humanData.headVy,
      headRotationSpeed: humanData.headRotationSpeed,
    });
  }

  /**
   * Spawn a floating human already on screen (for initial 3)
   */
  private spawnFloatingHumanOnScreen(width: number, height: number): void {
    // Create container for the human
    const humanData = this.createHumanSprite();
    const human = humanData.container;
    
    // Random starting position within screen bounds
    human.x = 100 + Math.random() * (width - 200); // Avoid edges
    human.y = 100 + Math.random() * (height - 200);
    
    // Very slow drift velocity (almost stationary)
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5; // 2-7 pixels/second (slower)
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    // Random rotation speed (slow tumbling)
    const rotationSpeed = (Math.random() - 0.5) * 0.015; // -0.0075 to 0.0075 rad/sec (slower)
    
    // Random floating motion (gentle)
    const floatAmplitude = 1 + Math.random() * 2; // 1-3 pixels (gentler)
    const floatSpeed = 0.3 + Math.random() * 0.7; // 0.3-1.0 cycles/sec (slower)
    const floatPhase = Math.random() * Math.PI * 2;
    
    // Random initial rotation
    human.setRotation(Math.random() * Math.PI * 2);
    
    // Slightly transparent (ghostly)
    human.setAlpha(0.7 + Math.random() * 0.3); // 0.7-1.0
    
    this.floatingHumans.push({
      sprite: human,
      headSprite: humanData.headSprite,
      bloodParticles: humanData.bloodParticles,
      bloodDrips: humanData.bloodDrips,
      vx,
      vy,
      rotationSpeed,
      floatAmplitude,
      floatSpeed,
      floatPhase,
      isDecapitated: humanData.isDecapitated,
      isFullySeparated: humanData.isFullySeparated || false,
      headOffsetX: humanData.headOffsetX,
      headOffsetY: humanData.headOffsetY,
      headVx: humanData.headVx,
      headVy: humanData.headVy,
      headRotationSpeed: humanData.headRotationSpeed,
    });
  }

  /**
   * Create a human sprite with blood effects (shared by both spawn methods)
   * Returns both the container and info about whether it's decapitated
   */
  private createHumanSprite(): { container: Phaser.GameObjects.Container; isDecapitated: boolean; isFullySeparated: boolean; headSprite?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics; bloodParticles?: Phaser.GameObjects.Graphics[]; bloodDrips?: Array<{ graphics: Phaser.GameObjects.Graphics; y: number; speed: number }>; headOffsetX: number; headOffsetY: number; headVx: number; headVy: number; headRotationSpeed: number } {
    // Create container for the human
    const human = this.add.container(0, 0);
    human.setDepth(-98); // Behind crack, above background
    
    // 30% chance of being decapitated
    // Of decapitated, 50% are fully separated (head and torso drift independently)
    const isDecapitated = Math.random() < 0.3;
    const isFullySeparated = isDecapitated && Math.random() < 0.5;
    const scale = 0.8 + Math.random() * 0.4; // Vary size (0.8-1.2)
    
    let headSprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics | undefined;
    let bloodParticles: Phaser.GameObjects.Graphics[] | undefined;
    let bloodDrips: Array<{ graphics: Phaser.GameObjects.Graphics; y: number; speed: number }> | undefined;
    let headOffsetX = 0;
    let headOffsetY = 0;
    let headVx = 0;
    let headVy = 0;
    let headRotationSpeed = 0;
    
    if (isDecapitated) {
      // Create decapitated version - torso without head
      if (this.textures.exists('space-suit-human')) {
        // Create torso only (we'll need to draw it manually or modify the sprite)
        const torsoGraphics = this.add.graphics();
        this.drawTorsoOnly(torsoGraphics, scale);
        human.add(torsoGraphics);
      } else {
        // Fallback: simple graphics torso
        const torsoGraphics = this.add.graphics();
        torsoGraphics.fillStyle(0xe0e0e0);
        torsoGraphics.fillRect(-8, -4, 16, 20); // Body (no head)
        torsoGraphics.setScale(scale);
        human.add(torsoGraphics);
      }
      
      // Create separate head sprite
      if (isFullySeparated) {
        // Fully separated: head starts close to torso but will drift independently
        headOffsetX = 10 + Math.random() * 8; // 10-18 pixels to the right
        headOffsetY = -15 - Math.random() * 5; // 15-20 pixels up
        
        // Independent head velocity
        const headAngle = Math.random() * Math.PI * 2;
        const headSpeed = 3 + Math.random() * 8; // 3-11 pixels/second
        headVx = Math.cos(headAngle) * headSpeed;
        headVy = Math.sin(headAngle) * headSpeed;
        headRotationSpeed = (Math.random() - 0.5) * 0.03; // -0.015 to 0.015 rad/sec
      } else {
        // Connected decapitated: head offset from torso
        headOffsetX = 8 + Math.random() * 4; // 8-12 pixels to the right
        headOffsetY = -18 - Math.random() * 4; // 18-22 pixels up
      }
      
      if (this.textures.exists('space-suit-human')) {
        headSprite = this.add.sprite(headOffsetX, headOffsetY, 'space-suit-human');
        // Clip to show only head (top portion)
        headSprite.setScale(scale);
        headSprite.setCrop(0, 0, 32, 20); // Only show top 20 pixels (head area)
        human.add(headSprite);
      } else {
        // Fallback: simple graphics head
        headSprite = this.add.graphics();
        headSprite.fillStyle(0xffffff);
        headSprite.fillCircle(0, 0, 8); // Helmet
        headSprite.fillStyle(0x1a1a2e);
        headSprite.fillCircle(0, 0, 6); // Visor
        headSprite.setPosition(headOffsetX, headOffsetY);
        headSprite.setScale(scale);
        human.add(headSprite);
      }
      
      // Add blood dripping from head (bottom of head where it was cut)
      if (!isFullySeparated) {
        // Create floating blood particles between head and torso (only for connected variant)
        bloodParticles = [];
        const numBloodParticles = 3 + Math.floor(Math.random() * 4); // 3-6 particles
        for (let i = 0; i < numBloodParticles; i++) {
          const bloodParticle = this.add.graphics();
          const midX = headOffsetX / 2;
          const midY = headOffsetY / 2;
          const particleX = midX + (Math.random() - 0.5) * 6;
          const particleY = midY + (Math.random() - 0.5) * 6;
          
          // Red pixel/blood drop
          bloodParticle.fillStyle(0xcc0000, 0.9);
          bloodParticle.fillRect(particleX - 1, particleY - 1, 2, 2);
          bloodParticle.setScale(scale);
          human.add(bloodParticle);
          bloodParticles.push(bloodParticle);
        }
      }
      
      // Create blood drips from head (dripping down from where head was cut)
      bloodDrips = [];
      const numHeadDrips = 2 + Math.floor(Math.random() * 3); // 2-4 drips
      for (let i = 0; i < numHeadDrips; i++) {
        const dripGraphics = this.add.graphics();
        const dripX = headOffsetX + (Math.random() - 0.5) * 6; // Random position around head bottom
        const dripY = headOffsetY + 8; // Start at bottom of head
        const dripLength = 3 + Math.random() * 4; // 3-7 pixels long
        const dripSpeed = 10 + Math.random() * 15; // 10-25 pixels/second
        
        dripGraphics.fillStyle(0xcc0000, 0.9);
        dripGraphics.fillRect(dripX - 0.5, dripY, 1, dripLength);
        dripGraphics.setScale(scale);
        human.add(dripGraphics);
        bloodDrips.push({ graphics: dripGraphics, y: dripY, speed: dripSpeed });
      }
      
      // Create blood drips from torso neck (dripping down from where torso was cut)
      const numTorsoDrips = 2 + Math.floor(Math.random() * 3); // 2-4 drips
      for (let i = 0; i < numTorsoDrips; i++) {
        const dripGraphics = this.add.graphics();
        const dripX = (Math.random() - 0.5) * 8; // Random position around neck
        const dripY = -4; // Start at neck area
        const dripLength = 3 + Math.random() * 4; // 3-7 pixels long
        const dripSpeed = 10 + Math.random() * 15; // 10-25 pixels/second
        
        dripGraphics.fillStyle(0xcc0000, 0.9);
        dripGraphics.fillRect(dripX - 0.5, dripY, 1, dripLength);
        dripGraphics.setScale(scale);
        human.add(dripGraphics);
        if (!bloodDrips) bloodDrips = [];
        bloodDrips.push({ graphics: dripGraphics, y: dripY, speed: dripSpeed });
      }
      
      // Add blood to torso neck area
      const neckBlood = this.add.graphics();
      neckBlood.fillStyle(0x8b0000, 0.8);
      neckBlood.fillRect(-3, -4, 6, 2); // Blood at neck
      neckBlood.setScale(scale);
      human.add(neckBlood);
      
    } else {
      // Normal (intact) human
      if (this.textures.exists('space-suit-human')) {
        const sprite = this.add.sprite(0, 0, 'space-suit-human');
        sprite.setScale(scale);
        human.add(sprite);
        
        // Add additional blood graphics overlay for variety
        const bloodAmount = Math.random(); // 0-1, determines how much blood
        if (bloodAmount > 0.3) { // 70% chance of extra blood
          const bloodGraphics = this.add.graphics();
          const bloodColor = bloodAmount > 0.7 ? 0xcc0000 : 0x8b0000; // Brighter or darker red
          
          // Random blood streaks and spots
          const numStreaks = Math.floor(bloodAmount * 3) + 1; // 1-3 streaks
          for (let i = 0; i < numStreaks; i++) {
            const x = (Math.random() - 0.5) * 20;
            const y = (Math.random() - 0.5) * 20;
            const length = 3 + Math.random() * 5;
            bloodGraphics.fillStyle(bloodColor, 0.8);
            bloodGraphics.fillRect(x, y, 1.5, length);
          }
          
          // Random blood spots
          const numSpots = Math.floor(bloodAmount * 4) + 1; // 1-4 spots
          for (let i = 0; i < numSpots; i++) {
            const x = (Math.random() - 0.5) * 18;
            const y = (Math.random() - 0.5) * 20;
            const size = 1 + Math.random() * 2;
            bloodGraphics.fillStyle(bloodColor, 0.6);
            bloodGraphics.fillCircle(x, y, size);
          }
          
          bloodGraphics.setScale(scale);
          human.add(bloodGraphics);
        }
      } else {
        // Fallback: simple graphics representation with blood
        const graphics = this.add.graphics();
        graphics.fillStyle(0xe0e0e0);
        graphics.fillRect(-8, -4, 16, 20); // Body
        graphics.fillStyle(0xffffff);
        graphics.fillCircle(0, -10, 8); // Helmet
        graphics.fillStyle(0x1a1a2e);
        graphics.fillCircle(0, -10, 6); // Visor
        
        // Add blood accents
        graphics.fillStyle(0x8b0000);
        graphics.fillRect(-4, -2, 8, 2); // Blood on chest
        graphics.fillRect(-7, 2, 2, 4); // Blood on arm
        graphics.fillRect(5, 4, 2, 3); // Blood on other arm
        
        graphics.setScale(scale);
        human.add(graphics);
      }
    }
    
    return {
      container: human,
      isDecapitated,
      isFullySeparated,
      headSprite,
      bloodParticles,
      bloodDrips,
      headOffsetX,
      headOffsetY,
      headVx,
      headVy,
      headRotationSpeed,
    };
  }

  /**
   * Draw torso only (without head) for decapitated humans
   */
  private drawTorsoOnly(graphics: Phaser.GameObjects.Graphics, scale: number): void {
    // Body (starting from where head would end)
    graphics.fillStyle(0xe0e0e0);
    graphics.fillRect(-8, -4, 16, 20); // Body
    
    // Arms (extended)
    graphics.fillStyle(0xd0d0d0);
    graphics.fillRect(-12, -2, 4, 12); // Left arm
    graphics.fillRect(8, -2, 4, 12); // Right arm
    
    // Legs (slightly spread)
    graphics.fillStyle(0xc0c0c0);
    graphics.fillRect(-6, 12, 4, 4); // Left leg
    graphics.fillRect(2, 12, 4, 4); // Right leg
    
    // Oxygen tank on back
    graphics.fillStyle(0x888888);
    graphics.fillRect(4, 0, 6, 8);
    
    // Blood at neck area (where head was severed)
    graphics.fillStyle(0x8b0000);
    graphics.fillRect(-4, -4, 8, 3); // Blood at neck
    
    // Blood stains on body
    graphics.fillStyle(0x8b0000);
    graphics.fillRect(-3, 2, 6, 2); // Blood on chest
    graphics.fillRect(-11, 2, 2, 3); // Blood on left arm
    graphics.fillRect(9, 4, 2, 3); // Blood on right arm
    
    graphics.setScale(scale);
  }

  /**
   * Spawn a meteorite that flies directly toward the station (no force field to stop it)
   */
  private spawnMeteorite(): void {
    const { width, height } = this.cameras.main;
    
    if (!this.stationX || !this.stationY || !this.stationSize) return;
    
    // Spawn from outside screen
    let x: number, y: number, angle: number;
    const edge = Math.random();
    
    if (edge < 0.25) {
      // Top edge
      x = Math.random() * width;
      y = -50;
    } else if (edge < 0.5) {
      // Right edge
      x = width + 50;
      y = Math.random() * height;
    } else if (edge < 0.75) {
      // Bottom edge
      x = Math.random() * width;
      y = height + 50;
    } else {
      // Left edge
      x = -50;
      y = Math.random() * height;
    }
    
    // Calculate angle directly toward station center
    angle = Math.atan2(this.stationY - y, this.stationX - x);
    const speed = 400 + Math.random() * 400; // 400-800 pixels per second (faster than menu)
    
    // Create meteorite sprite
    const meteorite = this.add.sprite(x, y, 'meteorite');
    const scale = 0.05 + Math.random() * 0.05;
    meteorite.setScale(scale);
    meteorite.setRotation(angle + Math.PI / 2); // Point toward station
    meteorite.setDepth(-97);
    
    this.meteorites.push({
      sprite: meteorite,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed: speed,
    });
  }

  /**
   * Check if meteorite hits the station and explode (no force field, direct impact)
   */
  private checkMeteoriteCollisions(): void {
    if (!this.stationX || !this.stationY || !this.stationSize) return;
    
    const stationRadius = this.stationSize * 0.5; // Station radius
    
    for (let i = this.meteorites.length - 1; i >= 0; i--) {
      const meteor = this.meteorites[i]!;
      if (!meteor.sprite.active) continue;
      
      const dx = meteor.sprite.x - this.stationX;
      const dy = meteor.sprite.y - this.stationY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check collision with station (direct impact, no force field)
      const collisionRadius = stationRadius + 10; // Slight tolerance
      
      if (distance <= collisionRadius) {
        // Explode on impact!
        this.explodeMeteorite(meteor.sprite.x, meteor.sprite.y);
        meteor.sprite.destroy();
        this.meteorites.splice(i, 1);
      }
    }
  }

  /**
   * Create explosion effect when meteorite hits the station
   */
  private explodeMeteorite(x: number, y: number): void {
    if (!this.textures.exists('explosion-particle')) {
      const circle = this.add.graphics();
      circle.fillStyle(0xffffff);
      circle.fillCircle(4, 4, 4);
      circle.generateTexture('explosion-particle', 8, 8);
      circle.destroy();
    }
    
    // Create particle burst
    const particles = this.add.particles(x, y, 'explosion-particle', {
      speed: { min: 100, max: 300 }, // Faster particles for more impact
      scale: { start: 0.8, end: 0 }, // Larger explosion
      lifespan: 1000,
      quantity: 30, // More particles
      tint: [0xff6666, 0xff8888, 0xffaa00, 0xffffff, 0xff0000], // More red/orange
      angle: { min: 0, max: 360 },
      blendMode: 'ADD',
    });
    
    particles.setDepth(-96);
    
    this.time.delayedCall(1000, () => {
      particles.destroy();
    });
    
    // Create expanding circle effect
    const explosion = this.add.graphics();
    explosion.setDepth(-96);
    
    let radius = 0;
    const maxRadius = 50; // Larger explosion
    const duration = 400;
    
    this.tweens.add({
      targets: { radius: 0 },
      radius: maxRadius,
      duration: duration,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        radius = (tween.targets[0] as any).radius;
        const alpha = 1 - (radius / maxRadius);
        explosion.clear();
        explosion.lineStyle(5, 0xff6666, alpha);
        explosion.strokeCircle(x, y, radius);
        explosion.lineStyle(3, 0xffffff, alpha * 0.9);
        explosion.strokeCircle(x, y, radius * 0.8);
        explosion.lineStyle(2, 0xffaa00, alpha * 0.7);
        explosion.strokeCircle(x, y, radius * 0.6);
      },
      onComplete: () => {
        explosion.destroy();
      },
    });
  }

  update(_time: number, delta: number): void {
    // Log if update is called when scene should be transitioning
    if (this.isTransitioning) {
      sceneLogger.log('DeathScene', 'UPDATE_WHILE_TRANSITIONING', {
        isTransitioning: this.isTransitioning,
        sceneActive: this.scene.isActive(),
        scenePaused: this.scene.isPaused(),
        delta: delta,
      });
    }
    
    // Check if scene is still active but should be stopped
    if (!this.scene.isActive() && !this.scene.isPaused()) {
      sceneLogger.log('DeathScene', 'UPDATE_ON_INACTIVE_SCENE', {
        active: this.scene.isActive(),
        paused: this.scene.isPaused(),
        visible: this.scene.isVisible(),
      });
    }
    
    // Don't update until scene is ready
    if (!this.isReady || !this.cameras.main) {
      return;
    }
    
    const { width, height } = this.cameras.main;
    const deltaSeconds = delta / 1000;

    // Update meteorites
    for (let i = this.meteorites.length - 1; i >= 0; i--) {
      const meteor = this.meteorites[i]!;
      meteor.sprite.x += meteor.vx * deltaSeconds;
      meteor.sprite.y += meteor.vy * deltaSeconds;
      
      // Remove if off screen
      if (
        meteor.sprite.x < -100 ||
        meteor.sprite.x > width + 100 ||
        meteor.sprite.y < -100 ||
        meteor.sprite.y > height + 100
      ) {
        meteor.sprite.destroy();
        this.meteorites.splice(i, 1);
      }
    }
    
    // Check collisions (meteorites directly impact station)
    this.checkMeteoriteCollisions();
    
    // Spawn new meteorites more frequently (station is being bombarded)
    this.meteoriteSpawnTimer += delta;
    if (this.meteoriteSpawnTimer >= 3000) { // Every 3 seconds (faster than menu)
      this.meteoriteSpawnTimer = 0;
      this.spawnMeteorite();
    }
    
    // Update fire and smoke emitter positions to follow station rotation
    if (this.station) {
      const angle = (this.station.angle * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      // Update fire emitter positions (rotate with station)
      this.fireEmitters.forEach((emitter, index) => {
        if (index < this.firePositions.length) {
          const pos = this.firePositions[index]!;
          const rotatedX = pos.x * cos - pos.y * sin;
          const rotatedY = pos.x * sin + pos.y * cos;
          emitter.setPosition(this.stationX + rotatedX, this.stationY + rotatedY);
        }
      });
      
      // Update smoke emitter positions (same as fire)
      this.smokeEmitters.forEach((emitter, index) => {
        if (index < this.firePositions.length) {
          const pos = this.firePositions[index]!;
          const rotatedX = pos.x * cos - pos.y * sin;
          const rotatedY = pos.x * sin + pos.y * cos;
          emitter.setPosition(this.stationX + rotatedX, this.stationY + rotatedY);
        }
      });
      
      // Update crack to rotate with station (pulse is handled by tween)
      this.updateCrack();
    }
    
    // Easter egg: Kenny timer (60 seconds - auto spawn once)
    if (!this.kennySpawned) {
      this.kennyTimer += delta;
      if (this.kennyTimer >= 60000) { // 60 seconds
        if (this.kennys.length < 30) {
          this.spawnKenny(width, height);
        }
        this.kennySpawned = true; // Mark as spawned so it only happens once
      }
    }
    
    // Update all Kennys
    for (let i = this.kennys.length - 1; i >= 0; i--) {
      const kenny = this.kennys[i];
      if (!kenny || !kenny.active) {
        this.kennys.splice(i, 1);
        continue;
      }
      
      // Cache all getData() calls once per iteration
      const vx = kenny.getData('vx') || 0;
      const vy = kenny.getData('vy') || 0;
      let baseX = kenny.getData('baseX');
      let baseY = kenny.getData('baseY');
      const floatPhase = kenny.getData('floatPhase') || 0;
      const floatSpeed = kenny.getData('floatSpeed') || 0.5;
      const floatAmplitude = kenny.getData('floatAmplitude') || 2;
      
      // Initialize base position if not set
      if (baseX === undefined || baseY === undefined) {
        baseX = kenny.x;
        baseY = kenny.y;
      }
      
      // Update base position with velocity
      baseX += vx * deltaSeconds;
      baseY += vy * deltaSeconds;
      kenny.setData('baseX', baseX);
      kenny.setData('baseY', baseY);
      
      // Add floating motion (gentle perpendicular drift) - similar to floating humans
      const newFloatPhase = floatPhase + floatSpeed * deltaSeconds;
      kenny.setData('floatPhase', newFloatPhase);
      
      // Perpendicular offset for floating motion (perpendicular to movement direction)
      const angle = Math.atan2(vy, vx);
      const perpAngle = angle + Math.PI / 2; // Perpendicular angle
      const floatX = Math.cos(perpAngle) * Math.sin(newFloatPhase) * floatAmplitude;
      const floatY = Math.sin(perpAngle) * Math.sin(newFloatPhase) * floatAmplitude;
      
      // Set position: base position + floating offset
      kenny.x = baseX + floatX;
      kenny.y = baseY + floatY;
      
      // Rotation while floating (tumbling effect)
      kenny.rotation += 0.05 * deltaSeconds; // Increased rotation speed for more visible spinning
      
      // Ensure Kenny is visible
      kenny.setVisible(true);
      kenny.setActive(true);
      
      // Remove if off any screen edge (with margin)
      const margin = 100;
      if (kenny.x < -margin || kenny.x > width + margin || 
          kenny.y < -margin || kenny.y > height + margin) {
        kenny.destroy();
        this.kennys.splice(i, 1);
      }
    }
    
    // Update floating humans
    this.humanSpawnTimer += delta;
    if (this.humanSpawnTimer >= 1500) { // Spawn every 1.5 seconds (quicker)
      this.humanSpawnTimer = 0;
      this.spawnFloatingHuman(width, height);
    }
    
    for (let i = this.floatingHumans.length - 1; i >= 0; i--) {
      const human = this.floatingHumans[i]!;
      
      if (!human.sprite || !human.sprite.active) {
        this.floatingHumans.splice(i, 1);
        continue;
      }
      
      // Update position with drift
      human.sprite.x += human.vx * deltaSeconds;
      human.sprite.y += human.vy * deltaSeconds;
      
      // Add floating motion (gentle drift)
      human.floatPhase += human.floatSpeed * deltaSeconds;
      human.sprite.y += Math.sin(human.floatPhase) * human.floatAmplitude * deltaSeconds;
      
      // Slow rotation (tumbling)
      human.sprite.rotation += human.rotationSpeed * deltaSeconds;
      
      // Update decapitated head position and blood particles
      if (human.isDecapitated && human.headSprite) {
        if (human.isFullySeparated) {
          // Fully separated: head drifts independently
          human.headOffsetX += (human.headVx || 0) * deltaSeconds;
          human.headOffsetY += (human.headVy || 0) * deltaSeconds;
          
          // Set head position (relative to container)
          if (human.headSprite instanceof Phaser.GameObjects.Sprite) {
            human.headSprite.setPosition(human.headOffsetX, human.headOffsetY);
            human.headSprite.setRotation(human.headSprite.rotation + (human.headRotationSpeed || 0) * deltaSeconds);
          } else if (human.headSprite instanceof Phaser.GameObjects.Graphics) {
            human.headSprite.setPosition(human.headOffsetX, human.headOffsetY);
            human.headSprite.setRotation(human.headSprite.rotation + (human.headRotationSpeed || 0) * deltaSeconds);
          }
        } else {
          // Connected decapitated: head follows torso but with offset and slight independent float
          const headFloatPhase = human.floatPhase + Math.PI / 4; // Slightly out of phase
          const headFloatOffset = Math.sin(headFloatPhase) * human.floatAmplitude * 0.5;
          const headX = human.headOffsetX + Math.sin(human.floatPhase * 0.5) * 2;
          const headY = human.headOffsetY + headFloatOffset;
          
          // Set head position (relative to container)
          if (human.headSprite instanceof Phaser.GameObjects.Sprite) {
            human.headSprite.setPosition(headX, headY);
            human.headSprite.setRotation(human.sprite.rotation + human.rotationSpeed * deltaSeconds * 0.8);
          } else if (human.headSprite instanceof Phaser.GameObjects.Graphics) {
            human.headSprite.setPosition(headX, headY);
            human.headSprite.setRotation(human.sprite.rotation + human.rotationSpeed * deltaSeconds * 0.8);
          }
          
          // Update blood particles between head and torso
          if (human.bloodParticles) {
            human.bloodParticles.forEach((particle, index) => {
              if (particle && particle.active) {
                // Animate blood particles floating between head and torso
                const particlePhase = human.floatPhase + (index * 0.3);
                const midX = (human.headOffsetX + 0) / 2;
                const midY = (human.headOffsetY + 0) / 2;
                const particleX = midX + Math.sin(particlePhase) * 3;
                const particleY = midY + Math.cos(particlePhase * 1.2) * 2;
                particle.setPosition(particleX, particleY);
                particle.setRotation(particle.rotation + human.rotationSpeed * deltaSeconds * 0.5);
              }
            });
          }
        }
        
      }
      
      // Remove if off screen
      if (
        human.sprite.x < -150 ||
        human.sprite.x > width + 150 ||
        human.sprite.y < -150 ||
        human.sprite.y > height + 150
      ) {
        if (human.headSprite && human.headSprite.active) {
          human.headSprite.destroy();
        }
        if (human.bloodParticles) {
          for (let j = human.bloodParticles.length - 1; j >= 0; j--) {
            const p = human.bloodParticles[j];
            if (p && p.active) {
              p.destroy();
            }
          }
        }
        human.sprite.destroy();
        this.floatingHumans.splice(i, 1);
      }
    }
  }

  /**
   * Easter egg: Spawn company logo easter egg
   */
  private spawnKenny(width: number, height: number): void {
    // Check limit
    if (this.kennys.length >= 30) {
      return;
    }
    
    
    // Random starting position (off-screen edges)
    const edge = Math.random();
    let startX: number, startY: number;
    if (edge < 0.25) {
      // Top
      startX = Math.random() * width;
      startY = -50;
    } else if (edge < 0.5) {
      // Right
      startX = width + 50;
      startY = Math.random() * height;
    } else if (edge < 0.75) {
      // Bottom
      startX = Math.random() * width;
      startY = height + 50;
    } else {
      // Left
      startX = -50;
      startY = Math.random() * height;
    }
    
    // Random direction to cross the screen (aiming toward opposite side)
    // Calculate target point on opposite edge
    let targetX: number, targetY: number;
    if (edge < 0.25) {
      // Coming from top, target bottom
      targetX = Math.random() * width;
      targetY = height + 50;
    } else if (edge < 0.5) {
      // Coming from right, target left
      targetX = -50;
      targetY = Math.random() * height;
    } else if (edge < 0.75) {
      // Coming from bottom, target top
      targetX = Math.random() * width;
      targetY = -50;
    } else {
      // Coming from left, target right
      targetX = width + 50;
      targetY = Math.random() * height;
    }
    
    // Calculate velocity vector toward target
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = 80; // pixels per second
    const vx = (dx / distance) * speed;
    const vy = (dy / distance) * speed;
    
    // Create container for Kenny (now using company logo)
    const kenny = this.add.container(startX, startY);
    kenny.setDepth(-98); // Same depth as floating humans
    kenny.setVisible(true);
    kenny.setActive(true);
    kenny.setData('baseX', startX); // Store base X for floating motion
    kenny.setData('baseY', startY); // Store base Y for floating motion
    kenny.setData('vx', vx); // Store velocity X
    kenny.setData('vy', vy); // Store velocity Y
    
    // Calculate logo size: half of what's used on space station
    // On space station: logoSize = stationSize * 0.3
    // Station size is typically: Math.min(width * 0.6, height * 0.8)
    // So half size would be: Math.min(width * 0.6, height * 0.8) * 0.15
    const stationSize = Math.min(width * 0.6, height * 0.8);
    const logoSize = stationSize * 0.15; // Half of 0.3 (which is used on station)
    
    // Use company logo instead of Kenny sprite
    if (this.textures.exists('company-logo')) {
      const logoSprite = this.add.image(0, 0, 'company-logo');
      logoSprite.setDisplaySize(logoSize, logoSize);
      logoSprite.setOrigin(0.5, 0.5);
      logoSprite.setVisible(true);
      logoSprite.setActive(true);
      logoSprite.setAlpha(0.9);
      kenny.add(logoSprite);
    } else {
      // Fallback: create a simple placeholder if logo not found
      const placeholderGraphics = this.add.graphics();
      placeholderGraphics.setVisible(true);
      placeholderGraphics.setActive(true);
      placeholderGraphics.clear();
      placeholderGraphics.fillStyle(0xffffff, 1);
      placeholderGraphics.fillRect(-logoSize / 2, -logoSize / 2, logoSize, logoSize);
      kenny.add(placeholderGraphics);
    }
    
    // Add floating motion properties
    kenny.setData('floatPhase', Math.random() * Math.PI * 2);
    kenny.setData('floatSpeed', 0.5 + Math.random() * 0.5);
    kenny.setData('floatAmplitude', 2 + Math.random() * 2);
    
    // Add to array
    this.kennys.push(kenny);
  }
}

