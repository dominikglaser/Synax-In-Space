/**
 * EndScene - Victory screen
 */

import Phaser from 'phaser';
import { getKenneySprite } from '../config/AssetMappings';
import { musicSystem, MusicTheme } from '../systems/MusicSystem';
import { sceneLogger } from '../utils/SceneLogger';
import { KennyEasterEgg } from '../utils/KennyEasterEgg';


export class EndScene extends Phaser.Scene {
  private station?: Phaser.GameObjects.Image;
  private ships: Phaser.GameObjects.Sprite[] = [];
  private stationX: number = 0;
  private stationY: number = 0;
  private stationSize: number = 0;
  private shipPositions: Array<{ x: number; y: number }> = [];
  private fireworkSpawnTimer: number = 0;
  private victoryMusic?: Phaser.Sound.BaseSound;
  private isTransitioning: boolean = false;
  private kennys: Phaser.GameObjects.Container[] = []; // Kenny easter egg
  private kennyKeyboardSetup: boolean = false; // Track if keyboard handler is set up
  private kennyTimer: number = 0;
  private kennySpawned: boolean = false; // Track if auto-spawn happened (60 seconds)

  constructor() {
    super({ key: 'EndScene' });
  }

  preload(): void {
    // Load custom victory music MP3 file if it exists
    // Phaser will gracefully handle if the file doesn't exist
    this.load.audio('victoryMusic', 'assets/music/victory/winax.mp3');
  }

  init(data: { playtime?: number }): void {
    sceneLogger.log('EndScene', 'INIT', { playtime: data?.playtime });
    // Store playtime in seconds
    this.data.set('playtime', data?.playtime ?? 0);
    this.isTransitioning = false;
  }

  create(): void {
    try {
      sceneLogger.log('EndScene', 'CREATE_START', {
        sceneState: this.scene.isActive() ? 'ACTIVE' : 'INACTIVE',
        scenePaused: this.scene.isPaused() ? 'PAUSED' : 'RUNNING',
        isTransitioning: this.isTransitioning,
      });
      
      // Reset transition flag when scene actually creates
      this.isTransitioning = false;
      
    // Ensure camera is visible
    this.cameras.main.setVisible(true);
    sceneLogger.log('EndScene', 'CAMERA_VISIBLE');
      
      // Ensure HUD scene is stopped
      if (this.scene.isActive('HUDScene')) {
        this.scene.stop('HUDScene');
        sceneLogger.log('EndScene', 'HUD_STOPPED');
      }
      
      // Stop all sounds from previous scenes (especially gameplay music)
      this.sound.stopAll();
      sceneLogger.log('EndScene', 'ALL_SOUNDS_STOPPED');
      
      // Stop procedural music
      try {
        musicSystem.stop();
      } catch (error) {
        sceneLogger.logError('EndScene', 'MUSIC_STOP_ERROR', error);
      }
      
      // Try to play custom MP3 music, fallback to procedural music
      try {
        // Check if the audio file was loaded successfully
        if (this.cache.audio.exists('victoryMusic')) {
          // Play custom MP3 file with fade-in to prevent crackle
          this.victoryMusic = this.sound.add('victoryMusic', {
            volume: 0, // Start at 0 volume
            loop: true,
          });
          this.victoryMusic.play();
          
          // Fade in smoothly
          this.tweens.add({
            targets: this.victoryMusic,
            volume: 0.5,
            duration: 300, // 300ms fade in
          });
          
          sceneLogger.log('EndScene', 'CUSTOM_MUSIC_PLAYING');
        } else {
          // Fallback to procedural victory theme
          sceneLogger.log('EndScene', 'CUSTOM_MUSIC_NOT_FOUND', 'Using procedural music');
          musicSystem.playTheme(MusicTheme.VICTORY);
        }
      } catch (error) {
        sceneLogger.logError('EndScene', 'MUSIC_INIT_ERROR', error);
        // Fallback to procedural music
        try {
          musicSystem.playTheme(MusicTheme.VICTORY);
        } catch (e) {
          sceneLogger.logError('EndScene', 'PROCEDURAL_MUSIC_ERROR', e);
        }
      }
      
      const { width, height } = this.cameras.main;
      sceneLogger.log('EndScene', 'CAMERA_DIMENSIONS', { width, height });
      
      // Check if required assets exist
      const requiredAssets = ['menu-background', 'space-station'];
      const missingAssets: string[] = [];
      for (const asset of requiredAssets) {
        if (!this.textures.exists(asset)) {
          missingAssets.push(asset);
        }
      }
      
      if (missingAssets.length > 0) {
        sceneLogger.logError('EndScene', 'MISSING_ASSETS', { missing: missingAssets });
        // Continue anyway - assets might be loaded elsewhere
      }
      
      // Space background (same as menu)
      try {
        if (this.textures.exists('menu-background')) {
          const bg = this.add.image(0, 0, 'menu-background').setOrigin(0, 0);
          bg.setDisplaySize(width, height);
          bg.setDepth(-100);
          sceneLogger.log('EndScene', 'BACKGROUND_CREATED');
        } else {
          sceneLogger.logError('EndScene', 'BACKGROUND_MISSING', 'menu-background texture not found');
          // Create a black background as fallback
          const bg = this.add.rectangle(0, 0, width, height, 0x000000);
          bg.setOrigin(0, 0);
          bg.setDepth(-100);
        }
      } catch (error) {
        sceneLogger.logError('EndScene', 'BACKGROUND_CREATE_ERROR', error);
      }
      
      // Create animated stars - slow pulsing, all out of sync
      try {
        this.createAnimatedStars(width, height);
        sceneLogger.log('EndScene', 'STARS_CREATED');
      } catch (error) {
        sceneLogger.logError('EndScene', 'STARS_CREATE_ERROR', error);
      }
      
      // Large space station in upper right - intact and healthy
      // ALWAYS set station position/size first, even if texture is missing
      // This ensures createPlayerShip and createForceField can use these values
      try {
        this.stationSize = Math.min(width * 0.6, height * 0.8);
        this.stationX = width - this.stationSize * 0.3;
        this.stationY = this.stationSize * 0.3;
        sceneLogger.log('EndScene', 'STATION_POSITION_SET', { 
          stationX: this.stationX, 
          stationY: this.stationY, 
          stationSize: this.stationSize 
        });
        
        if (this.textures.exists('space-station')) {
          this.station = this.add.image(this.stationX, this.stationY, 'space-station');
          this.station.setDisplaySize(this.stationSize, this.stationSize);
          this.station.setDepth(-99);
          this.station.setAlpha(1);
          this.station.setTint(0x6a7a8a); // Muted grey-blue tint (same as menu)
          
          // Slow rotation animation
          this.tweens.add({
            targets: this.station,
            angle: 360,
            duration: 120000, // 120 seconds (2 minutes) for full rotation
            ease: 'Linear',
            repeat: -1,
          });
          
          // Add company logo overlay on the space station
          if (this.textures.exists('company-logo')) {
            const logoSize = this.stationSize * 0.3; // Logo is 30% of station size
            const logo = this.add.image(this.stationX, this.stationY, 'company-logo');
            logo.setDisplaySize(logoSize, logoSize);
            logo.setDepth(-98); // In front of station
            logo.setOrigin(0.5, 0.5); // Center the logo
            logo.setAlpha(0.9); // Slightly transparent
            
            // Make logo rotate with the station
            this.tweens.add({
              targets: logo,
              angle: 360,
              duration: 120000, // Same duration as station
              ease: 'Linear',
              repeat: -1,
            });
          }
          
          sceneLogger.log('EndScene', 'STATION_CREATED');
        } else {
          sceneLogger.logError('EndScene', 'STATION_MISSING', 'space-station texture not found');
          // Station position is still set, so ships can still be positioned correctly
        }
      } catch (error) {
        sceneLogger.logError('EndScene', 'STATION_CREATE_ERROR', error);
        // Ensure position is set even on error
        if (this.stationSize === 0) {
          this.stationSize = Math.min(width * 0.6, height * 0.8);
          this.stationX = width - this.stationSize * 0.3;
          this.stationY = this.stationSize * 0.3;
        }
      }
      
      // Create pulsing force field around station (like menu)
      try {
        this.createForceField();
        sceneLogger.log('EndScene', 'FORCE_FIELD_CREATED');
      } catch (error) {
        sceneLogger.logError('EndScene', 'FORCE_FIELD_CREATE_ERROR', error);
      }
      
      // Generate new ship design textures
      try {
        this.generateNewShipDesign();
        sceneLogger.log('EndScene', 'SHIP_DESIGN_1_CREATED');
      } catch (error) {
        sceneLogger.logError('EndScene', 'SHIP_DESIGN_1_ERROR', error);
      }
      
      try {
        this.generateSecondShipDesign();
        sceneLogger.log('EndScene', 'SHIP_DESIGN_2_CREATED');
      } catch (error) {
        sceneLogger.logError('EndScene', 'SHIP_DESIGN_2_ERROR', error);
      }
      
      // Add player ship
      try {
        this.createPlayerShip(width, height);
        sceneLogger.log('EndScene', 'PLAYER_SHIP_CREATED');
      } catch (error) {
        sceneLogger.logError('EndScene', 'PLAYER_SHIP_CREATE_ERROR', error);
      }
      
      // Create animated fireworks
      try {
        this.setupFireworks(width, height);
        sceneLogger.log('EndScene', 'FIREWORKS_SETUP');
      } catch (error) {
        sceneLogger.logError('EndScene', 'FIREWORKS_SETUP_ERROR', error);
      }
    
      const playtime = this.data.get('playtime') as number ?? 0;
      
      // Format playtime as "X Minutes Y Seconds"
      const minutes = Math.floor(playtime / 60);
      const seconds = Math.floor(playtime % 60);
      
      // Build time text
      const minutesText = minutes === 1 ? '1 Minute' : `${minutes} Minutes`;
      const secondsText = seconds === 1 ? '1 Second' : `${seconds} Seconds`;
      
      let playtimeText: string;
      if (minutes === 0 && seconds === 0) {
        playtimeText = '0 Minutes and 0 Seconds';
      } else if (minutes === 0) {
        playtimeText = secondsText;
      } else if (seconds === 0) {
        playtimeText = minutesText;
      } else {
        playtimeText = `${minutesText} and ${secondsText}`;
      }
      
      // Victory message
      try {
        this.add
          .text(width / 2, height / 2 - 50, 'Congratulations, you won...', {
            fontSize: '32px',
            color: '#ffffff',
            fontFamily: 'monospace',
          })
          .setOrigin(0.5)
          .setDepth(100);
        
        this.add
          .text(width / 2, height / 2 - 10, 'You saved the Synax space station and therefore saved the universe...', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'monospace',
            wordWrap: { width: width * 0.8 },
            align: 'center',
          })
          .setOrigin(0.5)
          .setDepth(100);
        
        this.add
          .text(width / 2, height / 2 + 40, `It took you ${playtimeText} to do so.`, {
            fontSize: '24px',
            color: '#ffaa00',
            fontFamily: 'monospace',
          })
          .setOrigin(0.5)
          .setDepth(100);
        
        // Instructions
        this.add
          .text(width / 2, height / 2 + 100, 'Press ENTER to return to menu', {
            fontSize: '18px',
            color: '#888888',
            fontFamily: 'monospace',
          })
          .setOrigin(0.5)
          .setDepth(100);
        
        sceneLogger.log('EndScene', 'TEXT_CREATED');
      } catch (error) {
        sceneLogger.logError('EndScene', 'TEXT_CREATE_ERROR', error);
      }
      
      // Setup Kenny easter egg (only once)
      if (!this.kennyKeyboardSetup) {
        const { width, height } = this.cameras.main;
        KennyEasterEgg.setupKeyboardHandler(this, width, height, this.kennys);
        this.kennyKeyboardSetup = true;
      }
      
      // Reset Kenny timer when scene is created
      this.kennyTimer = 0;
      this.kennySpawned = false;
      
      // Input handler
      try {
        if (!this.input.keyboard) {
          sceneLogger.logError('EndScene', 'KEYBOARD_MISSING', 'Input keyboard not available');
        } else {
          this.input.keyboard.on('keydown-ENTER', () => {
      if (this.isTransitioning) {
        sceneLogger.log('EndScene', 'MENU_TRANSITION_BLOCKED', { isTransitioning: this.isTransitioning });
        return;
      }
      
      sceneLogger.logTransition('EndScene', 'MenuScene');
      this.isTransitioning = true;
      
      try {
        // Ensure HUD scene is stopped
        this.scene.stop('HUDScene');
        sceneLogger.log('EndScene', 'HUD_STOPPED');
        
        // Stop victory music if playing
        if (this.victoryMusic) {
          this.victoryMusic.stop();
          this.victoryMusic.destroy();
          sceneLogger.log('EndScene', 'MUSIC_STOPPED');
        }
        musicSystem.stop();
        
        // Stop all tweens to prevent them from continuing to render
        this.tweens.killAll();
        sceneLogger.log('EndScene', 'ALL_TWEENS_STOPPED');
        
        // Return to menu (no seed change - seed only changes manually via R key)
        import('../utils/MenuSceneDebugger').then(({ MenuSceneDebugger }) => {
          MenuSceneDebugger.logTransition('EndScene', 'MenuScene', {
            sceneActive: this.scene.isActive(),
          });
        });
        
        // CRITICAL: Stop MenuScene first if it's running, then start it fresh
        // This ensures a clean restart
        if (this.scene.isActive('MenuScene')) {
          this.scene.stop('MenuScene');
          sceneLogger.log('EndScene', 'MENUSCENE_STOPPED_BEFORE_RESTART');
        }
        
        // Use scene.start() to restart MenuScene
        // MenuScene will wait for renderer to be ready in its create() method
        this.scene.start('MenuScene');
        sceneLogger.log('EndScene', 'MENUSCENE_STARTED');
        
        // Check scene states after transition
        setTimeout(() => {
          if ((window as any).sceneLogger) {
            (window as any).sceneLogger.checkSceneStates(this.game);
          }
        }, 100);
      } catch (error) {
        sceneLogger.logError('EndScene', 'MENU_TRANSITION_ERROR', error);
        this.isTransitioning = false;
      }
    });
        }
      } catch (error) {
        sceneLogger.logError('EndScene', 'INPUT_HANDLER_ERROR', error);
      }
      
      sceneLogger.log('EndScene', 'CREATE_COMPLETE');
    } catch (error) {
      sceneLogger.logError('EndScene', 'CREATE_FATAL_ERROR', error);
      // Try to at least show some error message to the user
      try {
        const { width, height } = this.cameras.main;
        this.add
          .text(width / 2, height / 2, 'Error loading win screen. Check console for details.', {
            fontSize: '24px',
            color: '#ff0000',
            fontFamily: 'monospace',
          })
          .setOrigin(0.5)
          .setDepth(1000);
      } catch (e) {
        // Even error message creation failed
        sceneLogger.logError('EndScene', 'ERROR_MESSAGE_FAILED', e);
      }
    }
  }

  shutdown(): void {
    sceneLogger.log('EndScene', 'SHUTDOWN', {
      isTransitioning: this.isTransitioning,
      sceneState: this.scene.isActive() ? 'ACTIVE' : 'INACTIVE',
    });
    
    // Clean up resources
    if (this.victoryMusic) {
      this.victoryMusic.stop();
      this.victoryMusic.destroy();
      this.victoryMusic = undefined;
    }
    
    this.isTransitioning = false;
  }

  /**
   * Create pulsing reddish force field around space station (like menu)
   */
  private createForceField(): void {
    // Use the station position if available, otherwise calculate from scratch
    let stationX: number;
    let stationY: number;
    let radius: number;
    
    if (this.station && this.stationSize > 0) {
      // Use actual station position and size
      stationX = this.stationX;
      stationY = this.stationY;
      radius = this.stationSize * 0.55;
    } else {
      // Fallback: calculate position even if station doesn't exist
      const { width, height } = this.cameras.main;
      const stationSize = Math.min(width * 0.6, height * 0.8);
      stationX = width - stationSize * 0.3;
      stationY = stationSize * 0.3;
      radius = stationSize * 0.55;
    }
    
    const forceFieldGraphics = this.add.graphics();
    forceFieldGraphics.setDepth(-98);
    
    // Update force field with pulse effect
    this.tweens.add({
      targets: { pulse: 0 },
      pulse: 1,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const pulse = (tween.targets[0] as any).pulse;
        const pulseValue = Math.sin(pulse * Math.PI) * 0.15 + 0.45;
        
        forceFieldGraphics.clear();
        
        // Outer glow
        forceFieldGraphics.fillStyle(0xff4444, pulseValue * 0.3);
        forceFieldGraphics.fillCircle(stationX, stationY, radius * 1.1);
        
        // Main force field ring
        forceFieldGraphics.lineStyle(3, 0xff6666, pulseValue);
        forceFieldGraphics.strokeCircle(stationX, stationY, radius);
        
        // Inner glow
        forceFieldGraphics.lineStyle(1, 0xff8888, pulseValue * 0.7);
        forceFieldGraphics.strokeCircle(stationX, stationY, radius * 0.9);
      },
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
   * Create player ship and second ship positioned in upper half of screen
   */
  private createPlayerShip(width: number, height: number): void {
    // Ensure station position is set (fallback if it wasn't set earlier)
    if (this.stationSize === 0) {
      this.stationSize = Math.min(width * 0.6, height * 0.8);
      this.stationX = width - this.stationSize * 0.3;
      this.stationY = this.stationSize * 0.3;
      sceneLogger.log('EndScene', 'STATION_POSITION_FALLBACK', { 
        stationX: this.stationX, 
        stationY: this.stationY 
      });
    }
    
    const shipScale = 0.8;
    
    // Helper to get player ship texture
    const getPlayerShipTexture = (variantIndex: number = 0): { textureKey: string; frameKey?: string } => {
      if (this.textures.exists('game')) {
        const atlas = this.textures.get('game');
        // Use different player ship variants: 0 = playerShip1_blue, 4 = playerShip2_blue
        const kenneyPlayer = getKenneySprite('player', variantIndex);
        if (atlas.has(kenneyPlayer)) {
          return { textureKey: 'game', frameKey: kenneyPlayer };
        }
      }
      return { textureKey: 'player' };
    };
    
    // First ship - player ship (middle, upper half)
    const ship1X = width / 2; // Middle horizontally
    const ship1Y = height * 0.3; // Upper half of screen
    const ship1Texture = getPlayerShipTexture(0); // playerShip1_blue
    
    // Calculate angle to face the center of the station
    const dx1 = this.stationX - ship1X;
    const dy1 = this.stationY - ship1Y;
    const angleToStation1 = Math.atan2(dy1, dx1);
    
    const ship1 = this.add.sprite(ship1X, ship1Y, ship1Texture.textureKey, ship1Texture.frameKey);
    ship1.setScale(shipScale);
    ship1.setDepth(-97);
    ship1.setRotation(angleToStation1); // Face toward station center
    this.ships.push(ship1);
    this.shipPositions.push({ x: ship1X, y: ship1Y });
    
    // Second ship - different design (further left and higher)
    const ship2X = width / 2 - 150; // Further left
    const ship2Y = height * 0.2; // Higher up
    
    // Calculate angle to face the center of the station
    const dx2 = this.stationX - ship2X;
    const dy2 = this.stationY - ship2Y;
    const angleToStation2 = Math.atan2(dy2, dx2);
    
    // Use the new custom ship design (check if texture exists first)
    if (this.textures.exists('custom-ship')) {
      const ship2 = this.add.sprite(ship2X, ship2Y, 'custom-ship');
      ship2.setScale(shipScale);
      ship2.setDepth(-97);
      ship2.setRotation(angleToStation2); // Face toward station center
      this.ships.push(ship2);
      this.shipPositions.push({ x: ship2X, y: ship2Y });
    } else {
      sceneLogger.logError('EndScene', 'CUSTOM_SHIP_TEXTURE_MISSING', 'custom-ship texture not found');
    }
    
    // Third ship - lower right corner, facing the center of the station
    const ship3X = width - 100; // Lower right corner
    const ship3Y = height - 100; // Lower right corner
    
    // Calculate angle to face the center of the station
    const dx = this.stationX - ship3X;
    const dy = this.stationY - ship3Y;
    // atan2 gives angle from positive x-axis, but we want the ship to point toward station
    // The custom ship points right at 0°, so we use atan2 directly
    const angleToStation = Math.atan2(dy, dx);
    
    // Check if texture exists before creating ship
    if (this.textures.exists('custom-ship-2')) {
      const ship3 = this.add.sprite(ship3X, ship3Y, 'custom-ship-2');
      ship3.setScale(shipScale);
      ship3.setDepth(-97);
      ship3.setRotation(angleToStation); // Face toward station center
      this.ships.push(ship3);
      this.shipPositions.push({ x: ship3X, y: ship3Y });
    } else {
      sceneLogger.logError('EndScene', 'CUSTOM_SHIP_2_TEXTURE_MISSING', 'custom-ship-2 texture not found');
    }
  }

  /**
   * Generate a new ship design with grey, white, black, and red accents
   */
  private generateNewShipDesign(): void {
    // Check if texture already exists
    if (this.textures.exists('custom-ship')) {
      return;
    }
    
    const width = 120;
    const height = 84;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Main body - dark grey base
    ctx.fillStyle = '#4a4a4a'; // Medium grey
    ctx.strokeStyle = '#1a1a1a'; // Black outline
    ctx.lineWidth = 2;

    // Main fuselage (pointed nose, different shape)
    ctx.beginPath();
    ctx.moveTo(width, height / 2); // Nose
    ctx.lineTo(width - 20, height / 2 - 8);
    ctx.lineTo(width - 40, height / 2 - 16);
    ctx.lineTo(35, height / 2 - 22); // Top rear
    ctx.lineTo(20, height / 2 - 10);
    ctx.lineTo(10, height / 2); // Rear center
    ctx.lineTo(20, height / 2 + 10);
    ctx.lineTo(35, height / 2 + 22); // Bottom rear
    ctx.lineTo(width - 40, height / 2 + 16);
    ctx.lineTo(width - 20, height / 2 + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Secondary hull detail - lighter grey
    ctx.fillStyle = '#6a6a6a'; // Lighter grey
    ctx.beginPath();
    ctx.moveTo(width - 15, height / 2 - 5);
    ctx.lineTo(width - 35, height / 2 - 12);
    ctx.lineTo(28, height / 2 - 16);
    ctx.lineTo(18, height / 2);
    ctx.lineTo(28, height / 2 + 16);
    ctx.lineTo(width - 35, height / 2 + 12);
    ctx.lineTo(width - 15, height / 2 + 5);
    ctx.closePath();
    ctx.fill();

    // White accent panels
    ctx.fillStyle = '#ffffff'; // White
    ctx.beginPath();
    ctx.moveTo(width - 50, height / 2 - 8);
    ctx.lineTo(width - 55, height / 2 - 6);
    ctx.lineTo(width - 55, height / 2 + 6);
    ctx.lineTo(width - 50, height / 2 + 8);
    ctx.closePath();
    ctx.fill();

    // Red accent stripes
    ctx.fillStyle = '#ff4444'; // Red
    ctx.beginPath();
    ctx.moveTo(width - 30, height / 2 - 12);
    ctx.lineTo(width - 35, height / 2 - 10);
    ctx.lineTo(width - 35, height / 2 - 6);
    ctx.lineTo(width - 30, height / 2 - 8);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(width - 30, height / 2 + 12);
    ctx.lineTo(width - 35, height / 2 + 10);
    ctx.lineTo(width - 35, height / 2 + 6);
    ctx.lineTo(width - 30, height / 2 + 8);
    ctx.closePath();
    ctx.fill();

    // Main wings - different design, grey with black edges
    ctx.fillStyle = '#5a5a5a'; // Medium grey
    ctx.strokeStyle = '#1a1a1a'; // Black outline
    ctx.lineWidth = 2;
    
    // Top wing (left side) - more angular
    ctx.beginPath();
    ctx.moveTo(35, height / 2 - 22);
    ctx.lineTo(18, height / 2 - 32);
    ctx.lineTo(8, height / 2 - 30);
    ctx.lineTo(12, height / 2 - 20);
    ctx.lineTo(28, height / 2 - 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Top wing (right side)
    ctx.beginPath();
    ctx.moveTo(35, height / 2 - 22);
    ctx.lineTo(52, height / 2 - 32);
    ctx.lineTo(62, height / 2 - 30);
    ctx.lineTo(58, height / 2 - 20);
    ctx.lineTo(42, height / 2 - 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom wing (left side)
    ctx.beginPath();
    ctx.moveTo(35, height / 2 + 22);
    ctx.lineTo(18, height / 2 + 32);
    ctx.lineTo(8, height / 2 + 30);
    ctx.lineTo(12, height / 2 + 20);
    ctx.lineTo(28, height / 2 + 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom wing (right side)
    ctx.beginPath();
    ctx.moveTo(35, height / 2 + 22);
    ctx.lineTo(52, height / 2 + 32);
    ctx.lineTo(62, height / 2 + 30);
    ctx.lineTo(58, height / 2 + 20);
    ctx.lineTo(42, height / 2 + 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Red accent on wings
    ctx.fillStyle = '#ff4444'; // Red
    ctx.beginPath();
    ctx.moveTo(25, height / 2 - 18);
    ctx.lineTo(15, height / 2 - 28);
    ctx.lineTo(20, height / 2 - 28);
    ctx.lineTo(28, height / 2 - 18);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(25, height / 2 + 18);
    ctx.lineTo(15, height / 2 + 28);
    ctx.lineTo(20, height / 2 + 28);
    ctx.lineTo(28, height / 2 + 18);
    ctx.closePath();
    ctx.fill();

    // Black detail lines
    ctx.strokeStyle = '#1a1a1a'; // Black
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width - 25, height / 2 - 6);
    ctx.lineTo(30, height / 2 - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width - 25, height / 2 + 6);
    ctx.lineTo(30, height / 2 + 10);
    ctx.stroke();

    // Add texture to canvas
    this.textures.addCanvas('custom-ship', canvas);
  }

  /**
   * Generate a second new ship design with grey, white, black, and red accents (completely different shape)
   */
  private generateSecondShipDesign(): void {
    // Check if texture already exists
    if (this.textures.exists('custom-ship-2')) {
      return;
    }
    
    const width = 120;
    const height = 84;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Main body - compact, boxy design with angular shape
    ctx.fillStyle = '#4a4a4a'; // Medium grey
    ctx.strokeStyle = '#1a1a1a'; // Black outline
    ctx.lineWidth = 2;

    // Main fuselage - compact, angular design
    ctx.beginPath();
    ctx.moveTo(width, height / 2); // Nose point
    ctx.lineTo(width - 15, height / 2 - 12);
    ctx.lineTo(width - 30, height / 2 - 16);
    ctx.lineTo(50, height / 2 - 18); // Top rear
    ctx.lineTo(35, height / 2 - 8);
    ctx.lineTo(20, height / 2); // Rear center
    ctx.lineTo(35, height / 2 + 8);
    ctx.lineTo(50, height / 2 + 18); // Bottom rear
    ctx.lineTo(width - 30, height / 2 + 16);
    ctx.lineTo(width - 15, height / 2 + 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // White cockpit section
    ctx.fillStyle = '#ffffff'; // White
    ctx.beginPath();
    ctx.moveTo(width - 10, height / 2 - 8);
    ctx.lineTo(width - 25, height / 2 - 12);
    ctx.lineTo(45, height / 2 - 12);
    ctx.lineTo(30, height / 2);
    ctx.lineTo(45, height / 2 + 12);
    ctx.lineTo(width - 25, height / 2 + 12);
    ctx.lineTo(width - 10, height / 2 + 8);
    ctx.closePath();
    ctx.fill();

    // Black detail panel on nose
    ctx.fillStyle = '#1a1a1a'; // Black
    ctx.beginPath();
    ctx.moveTo(width - 40, height / 2 - 12);
    ctx.lineTo(width - 45, height / 2 - 10);
    ctx.lineTo(width - 45, height / 2 + 10);
    ctx.lineTo(width - 40, height / 2 + 12);
    ctx.closePath();
    ctx.fill();

    // Red accent stripes on fuselage
    ctx.fillStyle = '#ff4444'; // Red
    ctx.beginPath();
    ctx.moveTo(width - 20, height / 2 - 14);
    ctx.lineTo(width - 25, height / 2 - 12);
    ctx.lineTo(width - 25, height / 2 - 8);
    ctx.lineTo(width - 20, height / 2 - 10);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(width - 20, height / 2 + 14);
    ctx.lineTo(width - 25, height / 2 + 12);
    ctx.lineTo(width - 25, height / 2 + 8);
    ctx.lineTo(width - 20, height / 2 + 10);
    ctx.closePath();
    ctx.fill();

    // Side wings - small, forward-swept design
    ctx.fillStyle = '#5a5a5a'; // Medium grey
    ctx.strokeStyle = '#1a1a1a'; // Black outline
    ctx.lineWidth = 2;
    
    // Top wing (left side) - forward swept, compact
    ctx.beginPath();
    ctx.moveTo(50, height / 2 - 18);
    ctx.lineTo(40, height / 2 - 24);
    ctx.lineTo(30, height / 2 - 22);
    ctx.lineTo(38, height / 2 - 16);
    ctx.lineTo(45, height / 2 - 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Top wing (right side)
    ctx.beginPath();
    ctx.moveTo(50, height / 2 - 18);
    ctx.lineTo(60, height / 2 - 24);
    ctx.lineTo(70, height / 2 - 22);
    ctx.lineTo(62, height / 2 - 16);
    ctx.lineTo(55, height / 2 - 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom wing (left side)
    ctx.beginPath();
    ctx.moveTo(50, height / 2 + 18);
    ctx.lineTo(40, height / 2 + 24);
    ctx.lineTo(30, height / 2 + 22);
    ctx.lineTo(38, height / 2 + 16);
    ctx.lineTo(45, height / 2 + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom wing (right side)
    ctx.beginPath();
    ctx.moveTo(50, height / 2 + 18);
    ctx.lineTo(60, height / 2 + 24);
    ctx.lineTo(70, height / 2 + 22);
    ctx.lineTo(62, height / 2 + 16);
    ctx.lineTo(55, height / 2 + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Red accent on wing tips
    ctx.fillStyle = '#ff4444'; // Red
    ctx.beginPath();
    ctx.moveTo(42, height / 2 - 20);
    ctx.lineTo(35, height / 2 - 24);
    ctx.lineTo(38, height / 2 - 24);
    ctx.lineTo(45, height / 2 - 20);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(42, height / 2 + 20);
    ctx.lineTo(35, height / 2 + 24);
    ctx.lineTo(38, height / 2 + 24);
    ctx.lineTo(45, height / 2 + 20);
    ctx.closePath();
    ctx.fill();

    // Grey detail panels on sides
    ctx.fillStyle = '#6a6a6a'; // Lighter grey
    ctx.beginPath();
    ctx.moveTo(40, height / 2 - 10);
    ctx.lineTo(30, height / 2 - 6);
    ctx.lineTo(30, height / 2 + 6);
    ctx.lineTo(40, height / 2 + 10);
    ctx.closePath();
    ctx.fill();

    // Black detail lines
    ctx.strokeStyle = '#1a1a1a'; // Black
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width - 15, height / 2 - 10);
    ctx.lineTo(42, height / 2 - 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width - 15, height / 2 + 10);
    ctx.lineTo(42, height / 2 + 12);
    ctx.stroke();

    // Add texture to canvas
    this.textures.addCanvas('custom-ship-2', canvas);
  }

  /**
   * Setup fireworks system
   */
  private setupFireworks(width: number, height: number): void {
    // Ensure we have particle texture
    if (!this.textures.exists('explosion-particle')) {
      const circle = this.add.graphics();
      circle.fillStyle(0xffffff);
      circle.fillCircle(4, 4, 4);
      circle.generateTexture('explosion-particle', 8, 8);
      circle.destroy();
    }
    
    // Create initial fireworks
    this.spawnFirework(width, height);
  }

  /**
   * Check if a position overlaps with the space station or ships
   */
  private isPositionBlocked(x: number, y: number): boolean {
    // Check station (circular bounds)
    const stationRadius = this.stationSize / 2;
    const dxStation = x - this.stationX;
    const dyStation = y - this.stationY;
    const distToStation = Math.sqrt(dxStation * dxStation + dyStation * dyStation);
    if (distToStation < stationRadius + 50) { // 50px buffer
      return true;
    }
    
    // Check ships (circular bounds with 60px radius)
    const shipRadius = 60;
    for (const shipPos of this.shipPositions) {
      const dxShip = x - shipPos.x;
      const dyShip = y - shipPos.y;
      const distToShip = Math.sqrt(dxShip * dxShip + dyShip * dyShip);
      if (distToShip < shipRadius + 50) { // 50px buffer
        return true;
      }
    }
    
    return false;
  }

  /**
   * Spawn a firework explosion at random position (avoiding station and ships)
   */
  private spawnFirework(width: number, height: number): void {
    // Try to find a valid position (max 50 attempts)
    let x: number;
    let y: number;
    let attempts = 0;
    
    do {
      x = width * 0.1 + Math.random() * width * 0.8;
      y = height * 0.1 + Math.random() * height * 0.8;
      attempts++;
    } while (this.isPositionBlocked(x, y) && attempts < 50);
    
    // If we couldn't find a valid position, use the last generated one anyway
    // (shouldn't happen often, but prevents infinite loop)
    
    // Random firework color
    const colors = [
      0xff0000, // Red
      0x00ff00, // Green
      0x0000ff, // Blue
      0xffff00, // Yellow
      0xff00ff, // Magenta
      0x00ffff, // Cyan
      0xff8800, // Orange
    ];
    const primaryColor = colors[Math.floor(Math.random() * colors.length)]!;
    
    this.explodeFirework(x, y, primaryColor);
  }

  /**
   * Create firework explosion effect
   */
  private explodeFirework(x: number, y: number, color: number): void {
    
    // Create color variations for the explosion
    const colorVariations = [
      color,
      color + 0x222222,
      color - 0x222222,
      0xffffff,
    ];
    
    // Main explosion burst - partly translucent
    const explosion = this.add.particles(x, y, 'explosion-particle', {
      speed: { min: 80, max: 250 },
      scale: { start: 0.8, end: 0 },
      lifespan: 1500,
      quantity: 40,
      tint: colorVariations,
      alpha: { start: 0.6, end: 0 }, // Partly translucent
      angle: { min: 0, max: 360 },
      blendMode: 'ADD',
      gravityY: 50, // Slight gravity for falling effect
    });
    explosion.setDepth(-96);
    
    this.time.delayedCall(1500, () => {
      explosion.destroy();
    });
    
    // Secondary sparkles - partly translucent
    const sparkles = this.add.particles(x, y, 'explosion-particle', {
      speed: { min: 30, max: 100 },
      scale: { start: 0.4, end: 0 },
      lifespan: 2000,
      quantity: 30,
      tint: [0xffffff, color, color + 0x444444],
      alpha: { start: 0.5, end: 0 }, // Partly translucent
      angle: { min: 0, max: 360 },
      blendMode: 'ADD',
      frequency: -1, // One-time burst
    });
    sparkles.setDepth(-96);
    sparkles.explode(30);
    
    this.time.delayedCall(2000, () => {
      sparkles.destroy();
    });
    
    // Expanding ring effect - partly translucent
    const ring = this.add.graphics();
    ring.setDepth(-96);
    
    let radius = 0;
    const maxRadius = 60;
    const duration = 800;
    
    this.tweens.add({
      targets: { radius: 0 },
      radius: maxRadius,
      duration: duration,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        radius = (tween.targets[0] as any).radius;
        const alpha = (1 - (radius / maxRadius)) * 0.5; // Partly translucent (max 0.5 alpha)
        ring.clear();
        ring.lineStyle(3, color, alpha * 0.8);
        ring.strokeCircle(x, y, radius);
        ring.lineStyle(2, 0xffffff, alpha * 0.6);
        ring.strokeCircle(x, y, radius * 0.8);
      },
      onComplete: () => {
        ring.destroy();
      },
    });
  }

  update(time: number, delta: number): void {
    const { width, height } = this.cameras.main;
    
    // Update Kennys (always update, even if transitioning)
    KennyEasterEgg.updateKennys(this, width, height, delta, this.kennys);
    
    // Easter egg: Kenny timer (60 seconds - auto spawn once)
    if (!this.kennySpawned) {
      this.kennyTimer += delta;
      if (this.kennyTimer >= 60000) { // 60 seconds
        if (this.kennys.length < 30) {
          KennyEasterEgg.spawnKenny(this, width, height, this.kennys);
        }
        this.kennySpawned = true; // Mark as spawned so it only happens once
      }
    }
    
    // Stop updating if transitioning to prevent rendering issues
    if (this.isTransitioning || this.scene.isPaused()) {
      if (this.isTransitioning) {
        sceneLogger.log('EndScene', 'UPDATE_WHILE_TRANSITIONING', {
          isTransitioning: this.isTransitioning,
          sceneActive: this.scene.isActive(),
          scenePaused: this.scene.isPaused(),
          delta: delta,
        });
      }
      return;
    }
    
    // Check if scene is still active but should be stopped
    if (!this.scene.isActive() && !this.scene.isPaused()) {
      sceneLogger.log('EndScene', 'UPDATE_ON_INACTIVE_SCENE', {
        active: this.scene.isActive(),
        paused: this.scene.isPaused(),
        visible: this.scene.isVisible(),
      });
    }
    
    // Spawn new fireworks periodically
    this.fireworkSpawnTimer += delta;
    if (this.fireworkSpawnTimer >= 1000) { // Every 1 second
      this.fireworkSpawnTimer = 0;
      this.spawnFirework(width, height);
    }
  }
}

