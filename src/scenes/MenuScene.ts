/**
 * MenuScene - Title screen with seed display
 */

import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/constants';
import { RNG } from '../systems/RNG';
import { musicSystem, MusicTheme } from '../systems/MusicSystem';
import { sceneLogger } from '../utils/SceneLogger';
import { MenuSceneDebugger } from '../utils/MenuSceneDebugger';
import { KennyEasterEgg } from '../utils/KennyEasterEgg';

// Global god mode state (accessible from GameScene)
let globalGodMode: boolean = false;

export function getGodMode(): boolean {
  return globalGodMode;
}

export function setGodMode(enabled: boolean): void {
  globalGodMode = enabled;
  // Also update the config constant (for consistency)
  (GAME_CONFIG as any).godMode = enabled;
}

export class MenuScene extends Phaser.Scene {
  private seed: number = GAME_CONFIG.defaultSeed;
  private rng: RNG = new RNG(GAME_CONFIG.defaultSeed);
  private seedText?: Phaser.GameObjects.Text;
  private seedBox?: Phaser.GameObjects.Graphics;
  private seedBoxText?: Phaser.GameObjects.Text;
  private reseedText?: Phaser.GameObjects.Text;
  private forceFieldGraphics?: Phaser.GameObjects.Graphics;
  private forceFieldPulseTime: number = 0;
  private titleGlareGraphics?: Phaser.GameObjects.Graphics;
  private titleGlareTime: number = 0;
  private meteorites: Array<{
    sprite: Phaser.GameObjects.Sprite;
    vx: number;
    vy: number;
    speed: number;
  }> = [];
  private meteoriteSpawnTimer: number = 0;
  private brokenShips: Array<{
    sprite: Phaser.GameObjects.Sprite;
    vx: number;
    vy: number;
    rotationSpeed: number;
    speed: number;
  }> = [];
  private brokenShipSpawnTimer: number = 0;
  private kennys: Phaser.GameObjects.Container[] = []; // Kenny easter egg
  private kennyKeyboardSetup: boolean = false; // Track if keyboard handler is set up
  private kennyTimer: number = 0;
  private kennySpawned: boolean = false; // Track if auto-spawn happened (60 seconds)
  
  // Clean up arrays on scene restart
  private cleanupArrays(): void {
    // Clean up meteorites
    this.meteorites.forEach((meteor) => {
      if (meteor.sprite) {
        try {
          meteor.sprite.destroy();
        } catch (error) {
          // Silently handle destroy errors
        }
      }
    });
    this.meteorites = [];
    
    // Clean up broken ships
    this.brokenShips.forEach((ship) => {
      try {
        if (ship.sprite) {
          ship.sprite.destroy();
        }
      } catch (error) {
        // Silently handle destroy errors
      }
    });
    this.brokenShips = [];
    
    // Clean up Kennys
    this.kennys.forEach((kenny) => {
      try {
        kenny.destroy();
      } catch (error) {
        // Silently handle destroy errors
      }
    });
    this.kennys = [];
  }
  
  private debugDropdownOpen: boolean = false;
  private debugDropdownButton?: Phaser.GameObjects.Text;
  private debugBossButton?: Phaser.GameObjects.Text;
  private testButton?: Phaser.GameObjects.Text;
  private deathButton?: Phaser.GameObjects.Text;
  private godModeButton?: Phaser.GameObjects.Text;
  private storyButton?: Phaser.GameObjects.Text;
  private storyGlowTexts: Phaser.GameObjects.Text[] = [];
  private menuMusic?: Phaser.Sound.BaseSound;
  private isTransitioning: boolean = false;
  private godModeEnabled: boolean = false;

  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data: { seed?: number }): void {
    // Reset Kenny keyboard setup flag when scene restarts
    this.kennyKeyboardSetup = false;
    
    // Seed can be set manually via R key, but not automatically
    // This init method is kept for compatibility but doesn't auto-update seed
    if (data?.seed !== undefined) {
      sceneLogger.log('MenuScene', 'SEED_PROVIDED_IN_INIT', { 
        providedSeed: data.seed, 
        currentSeed: this.seed,
        note: 'Seed will not be auto-updated from EndScene' 
      });
      // Don't auto-update - seed only changes via manual R key press
    }
  }

  preload(): void {
    // Load custom menu music MP3 file if it exists
    // Phaser will gracefully handle if the file doesn't exist
    this.load.audio('menuMusic', 'assets/music/menu/Gamenax title screen (1).mp3');
  }

  create(): void {
    MenuSceneDebugger.log('CREATE_START', {
      sceneState: this.scene.isActive() ? 'ACTIVE' : 'INACTIVE',
      existingChildren: this.children.list.length,
    });
    
    // CRITICAL: Clean up any leftover objects from previous scene instance
    // This is important when restarting the scene
    this.cleanupArrays();
    this.tweens.killAll();
    this.time.removeAllEvents();
    
    // Clear all children from display list to prevent conflicts
    this.children.removeAll(true);
    
    // Reset transition flag when scene actually creates (CRITICAL - ensure it's always false on create)
    this.isTransitioning = false;
    
    // Sync god mode state with global state
    this.godModeEnabled = getGodMode();
    
    // Ensure camera is visible
    try {
      this.cameras.main.setVisible(true);
      this.cameras.main.setScroll(0, 0);
    } catch (error) {
      MenuSceneDebugger.logError('CAMERA_SETUP_ERROR', error);
    }
    
    // CRITICAL: Wait for renderer to be fully ready before creating content
    // After scene transitions, we need more time for the previous scene to fully clean up
    // and for the renderer/texture manager to be ready for new content
    this.time.delayedCall(250, () => {
      const renderer = this.game.renderer as any;
      const gl = renderer?.gl;
      
      // Check if renderer and WebGL context are valid
      if (!renderer || !gl || !gl.canvas) {
        MenuSceneDebugger.logError('RENDERER_NOT_READY', {
          renderer: !!renderer,
          gl: !!gl,
          canvas: !!gl?.canvas,
        });
        // Retry after another delay
        this.time.delayedCall(50, () => {
          if (this.scene.isActive()) {
            this.createMenuContent();
          }
        });
        return;
      }
      
      // Check if WebGL context is lost
      if (gl.isContextLost && gl.isContextLost()) {
        MenuSceneDebugger.logError('WEBGL_CONTEXT_LOST', {});
        // Retry after another delay
        this.time.delayedCall(50, () => {
          if (this.scene.isActive()) {
            this.createMenuContent();
          }
        });
        return;
      }
      
      // Double-check scene is still active
      if (!this.scene.isActive()) {
        MenuSceneDebugger.log('SCENE_NOT_ACTIVE_ANymore', {});
        return;
      }
      
      // Renderer is ready, create content
      this.createMenuContent();
    });
  }
  
  private createMenuContent(): void {
    MenuSceneDebugger.log('CREATE_MENU_CONTENT_START', {
      sceneActive: this.scene.isActive(),
      childrenCount: this.children.list.length,
    });
    
    // Final renderer check before creating objects
    const renderer = this.game.renderer as any;
    const gl = renderer?.gl;
    if (!renderer || !gl || !gl.canvas || (gl.isContextLost && gl.isContextLost())) {
      MenuSceneDebugger.logError('RENDERER_CHECK_FAILED_IN_CREATE', {
        renderer: !!renderer,
        gl: !!gl,
        canvas: !!gl?.canvas,
        contextLost: gl?.isContextLost ? gl.isContextLost() : 'unknown',
      });
      // Retry after a delay
      this.time.delayedCall(100, () => {
        if (this.scene.isActive()) {
          this.createMenuContent();
        }
      });
      return;
    }
    
    // CRITICAL: Check if texture manager is ready
    // Text creation requires textures to be ready, and after scene transitions
    // the texture manager might need extra time to recover
    const textureManager = this.textures;
    if (!textureManager || !textureManager.list) {
      MenuSceneDebugger.logError('TEXTURE_MANAGER_NOT_READY', {
        textureManager: !!textureManager,
        list: !!textureManager?.list,
      });
      // Retry after a longer delay to allow texture manager to recover
      this.time.delayedCall(200, () => {
        if (this.scene.isActive()) {
          this.createMenuContent();
        }
      });
      return;
    }
    
    // Wrap entire content creation in try-catch to handle renderer errors
    try {
      // CRITICAL: Do NOT try to modify existing text objects during scene creation
      // After scene transitions, old text objects may exist but their textures are invalid
      // We'll recreate all UI elements, so we don't need to sync old objects
      // Clear references to prevent using invalid objects
      this.godModeButton = undefined;
      
      // Ensure HUD scene is stopped when menu is shown
      if (this.scene.isActive('HUDScene')) {
        this.scene.stop('HUDScene');
        sceneLogger.log('MenuScene', 'HUD_STOPPED');
      }
      
      // Ensure camera is visible and active
      try {
        this.cameras.main.setVisible(true);
      } catch (error) {
        sceneLogger.logError('MenuScene', 'CAMERA_VISIBILITY_ERROR', error);
      }
      
      // Try to play custom MP3 music, fallback to procedural music
      try {
        // Stop procedural music first
        musicSystem.stop();
        
        // Stop and destroy any existing menu music instance to prevent duplicates
        if (this.menuMusic) {
          this.menuMusic.stop();
          this.menuMusic.destroy();
          this.menuMusic = undefined;
        }
        
        // Stop any other music sounds that might be playing from previous scenes
        // This ensures clean audio state when returning from story or other scenes
        const allSounds = this.sound.sounds;
        allSounds.forEach((sound) => {
          if (sound.key === 'storyMusic' || sound.key === 'gameplayMusic' || 
              sound.key === 'victoryMusic' || sound.key === 'gameOverMusic') {
            sound.stop();
            sound.destroy();
          }
        });
        
        // Small delay to ensure previous sounds are fully stopped
        this.time.delayedCall(100, () => {
          // Check if the audio file was loaded successfully
          if (this.cache.audio.exists('menuMusic')) {
            // Play custom MP3 file
            this.menuMusic = this.sound.add('menuMusic', {
              volume: 0.5,
              loop: true,
            });
            this.menuMusic.play();
          } else {
            // Fallback to procedural menu theme
            musicSystem.playTheme(MusicTheme.MENU);
          }
        });
      } catch (error) {
        // Fallback to procedural music
        try {
          musicSystem.playTheme(MusicTheme.MENU);
        } catch (e) {
        }
      }
      
      const { width, height } = this.cameras.main;

      // Space background (without stars - we'll animate them separately)
      // Check if texture exists before creating
      if (!this.textures.exists('menu-background')) {
        const error = new Error('menu-background texture does not exist');
        MenuSceneDebugger.logError('BACKGROUND_TEXTURE_MISSING', error);
        throw error;
      }
      
      try {
        const bg = this.add.image(0, 0, 'menu-background').setOrigin(0, 0);
        bg.setDisplaySize(width, height);
        bg.setDepth(-100);
        bg.setVisible(true);
        bg.setActive(true);
        
        // Verify background is actually in the display list
        const bgInList = this.children.list.includes(bg);
        if (!bgInList) {
          throw new Error('Background created but not in children list');
        }
        
        MenuSceneDebugger.log('BACKGROUND_CREATED', {
          visible: bg.visible,
          active: bg.active,
          childrenCount: this.children.list.length,
        });
      } catch (error) {
        MenuSceneDebugger.logError('BACKGROUND_CREATION_FAILED', error);
        MenuSceneDebugger.logRendererState(this.game, 'BACKGROUND_CREATION_FAILED');
        throw error; // Re-throw to be caught by outer try-catch
      }
      
      // Create animated stars - slow pulsing, all out of sync
      // Defer this to avoid creating too many objects at once
      this.time.delayedCall(10, () => {
        this.createAnimatedStars(width, height);
      });
      
      // Large space station in upper right - muted grey and blue, solid
      const stationSize = Math.min(width * 0.6, height * 0.8);
      const stationX = width - stationSize * 0.3;
      const stationY = stationSize * 0.3;
      const station = this.add.image(stationX, stationY, 'space-station');
      station.setDisplaySize(stationSize, stationSize);
      station.setDepth(-91); // Behind shield, in front of stars (-100)
      station.setAlpha(1); // Fully opaque
      station.setTint(0xffffff); // No tint - full opacity
      station.setBlendMode(Phaser.BlendModes.NORMAL); // Ensure normal blend mode
      
      // Store station position and size for force field and meteorites
      (this as any).station = station;
      (this as any).stationSize = stationSize;
      (this as any).stationX = stationX;
      (this as any).stationY = stationY;
      
      // Add company logo overlay on the space station
      let logo: Phaser.GameObjects.Image | undefined;
      if (this.textures.exists('company-logo')) {
        const logoSize = stationSize * 0.3; // Logo is 30% of station size
        logo = this.add.image(stationX, stationY, 'company-logo');
        logo.setDisplaySize(logoSize, logoSize);
        logo.setDepth(-90); // Slightly in front of station
        logo.setOrigin(0.5, 0.5); // Center the logo
        logo.setAlpha(0.9); // Slightly transparent
      }
      
      // Slow rotation animation - very slow (rotate both station and logo together)
      const rotationTargets = logo ? [station, logo] : [station];
      this.tweens.add({
        targets: rotationTargets,
        angle: 360,
        duration: 120000, // 120 seconds (2 minutes) for full rotation - half speed again
        ease: 'Linear',
        repeat: -1,
      });
      
      // Create pulsing force field around station - defer slightly
      this.time.delayedCall(5, () => {
        this.createForceField();
      });

      // Title - pixel art style with white outline and black fill, twice the size
      // CRITICAL: Text creation requires canvas context to be fully ready
      // After scene transitions, we need to wait for the texture manager to recover
      let title: Phaser.GameObjects.Text;
      try {
        title = this.add
          .text(width / 2, height / 2 - 100, 'SYNAX IN SPACE', {
            fontSize: '96px', // Doubled from 48px
            color: '#000000', // Black inside
            fontFamily: 'monospace',
            stroke: '#ffffff', // White outline
            strokeThickness: 8, // Thicker outline for pixel art look
            align: 'center',
          })
          .setOrigin(0.5)
          .setDepth(100);
      } catch (textError) {
        MenuSceneDebugger.logError('TITLE_TEXT_CREATION_FAILED', textError);
        // If text creation fails, wait longer before retrying
        // Texture manager needs more time to recover after scene transitions
        this.time.delayedCall(300, () => {
          if (this.scene.isActive()) {
            this.createMenuContent();
          }
        });
        return;
      }
      
      // Additional pixel art effect - add small shadow offset for depth
      this.add
        .text(width / 2 + 4, height / 2 - 96, 'SYNAX IN SPACE', {
          fontSize: '96px',
          color: '#000000',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5)
        .setDepth(99);
      
      // Create pulsing white glare/glow that exactly follows text outline
      // Store references for animation
      (this as any).titleText = title;
      (this as any).titleGlowTexts = [];
      
      // Create many glow copies positioned around text to follow exact outline
      // Create enough copies to surround the text completely
      // Defer glow creation to avoid creating too many text objects at once
      (this as any).titleGlowTexts = [];
      const glowCount = 24; // More copies for smoother glow outline
      this.time.delayedCall(20, () => {
        for (let i = 0; i < glowCount; i++) {
          try {
            const glowText = this.add
              .text(width / 2, height / 2 - 100, 'SYNAX IN SPACE', {
                fontSize: '96px',
                color: '#ff6666', // Force field red color (matches main force field ring)
                fontFamily: 'monospace',
                stroke: '#ff6666', // Force field red color (matches main force field ring)
                strokeThickness: 8,
                align: 'center',
              })
              .setOrigin(0.5)
              .setDepth(98)
              .setAlpha(0) // Start invisible
              .setBlendMode(Phaser.BlendModes.ADD);
            
            (this as any).titleGlowTexts.push(glowText);
          } catch (glowError) {
            MenuSceneDebugger.logError('TITLE_GLOW_TEXT_CREATION_FAILED', glowError);
            // Continue creating other glow texts even if one fails
          }
        }
      });
      
      // Pulsing glow animation
      this.tweens.add({
        targets: { glow: 0 },
        glow: 1,
        duration: 2000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        onUpdate: (tween: Phaser.Tweens.Tween) => {
          const glow = (tween.targets[0] as any).glow;
          this.updateTitleGlare(glow);
        },
      });

      // Instructions with shadow - add fading blink animation
      const instructions = this.add
        .text(width / 2, height / 2 + 50, 'Press ENTER to Start', {
          fontSize: '24px',
          color: '#00ffff',
          fontFamily: 'monospace',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(100);
      
      // Story button - below the "Press ENTER to Start" text, styled like title
      try {
        this.storyButton = this.add
          .text(width / 2, height / 2 + 150, 'Story', {
            fontSize: '48px', // Bigger, like title
            color: '#000000', // Black inside
            fontFamily: 'monospace',
            stroke: '#ffffff', // White outline
            strokeThickness: 4, // Thicker outline
            align: 'center',
          })
          .setOrigin(0.5)
          .setDepth(100)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            this.startStory();
          })
          .on('pointerover', () => {
            this.storyButton!.setScale(1.05); // Subtle scale on hover
          })
          .on('pointerout', () => {
            this.storyButton!.setScale(1.0);
          });
      } catch (textError) {
        MenuSceneDebugger.logError('STORY_BUTTON_TEXT_CREATION_FAILED', textError);
        // If text creation fails, retry after a delay
        this.time.delayedCall(100, () => {
          if (this.scene.isActive()) {
            this.createMenuContent();
          }
        });
        return;
      }
      
      // Create glow effect for Story button (matching title glow)
      // Defer glow creation to avoid creating too many text objects at once
      this.storyGlowTexts = [];
      const storyGlowCount = 24; // Same number as title glow
      this.time.delayedCall(25, () => {
        for (let i = 0; i < storyGlowCount; i++) {
          try {
            const glowText = this.add
              .text(width / 2, height / 2 + 150, 'Story', {
                fontSize: '48px',
                color: '#ff6666', // Force field red color (matches title glow)
                fontFamily: 'monospace',
                stroke: '#ff6666', // Force field red color
                strokeThickness: 4,
                align: 'center',
              })
              .setOrigin(0.5)
              .setDepth(98)
              .setAlpha(0) // Start invisible
              .setBlendMode(Phaser.BlendModes.ADD);
            
            this.storyGlowTexts.push(glowText);
          } catch (glowError) {
            MenuSceneDebugger.logError('STORY_GLOW_TEXT_CREATION_FAILED', glowError);
            // Continue creating other glow texts even if one fails
          }
        }
      });
      
      // Pulsing glow animation for Story button (matching title style)
      this.tweens.add({
        targets: { glow: 0 },
        glow: 1,
        duration: 2000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        onUpdate: (tween: Phaser.Tweens.Tween) => {
          const glow = (tween.targets[0] as any).glow;
          this.updateStoryGlow(glow);
        },
      });
      
    // Arrow pointing at Story button from Click Me text - defer to avoid creating too many objects at once
    this.time.delayedCall(30, () => {
      try {
        const storyButtonX = width / 2;
        const storyButtonY = height / 2 + 150;
        const storyButtonHeight = 48; // Approximate height of 48px font
        const storyButtonWidth = 120; // Approximate width of "Story" text at 48px
        
        // Calculate lower left corner of Story button
        const storyButtonLowerLeftX = storyButtonX - storyButtonWidth / 2;
        const storyButtonLowerLeftY = storyButtonY + storyButtonHeight / 2;
        
        // Position Click Me text first (below and to the left)
        const clickMeTextX = storyButtonLowerLeftX - 135; // Left of story button (slightly more to the left)
        const clickMeTextY = storyButtonLowerLeftY + 50; // Below story button
        
        // Create container to group arrow and text together
        const arrowTextContainer = this.add.container(0, 0);
        arrowTextContainer.setDepth(100);
        
        // "Click Me First!!!" text (relative to container)
        const clickMeText = this.add
          .text(0, 0, 'Click Me First!!!', {
            fontSize: '20px',
            color: '#00ffff',
            fontFamily: 'monospace',
            stroke: '#000000',
            strokeThickness: 3,
            fontStyle: 'bold',
          })
          .setOrigin(0.5, 0.5); // Center origin for alignment
        
        // Arrow starts from horizontal middle of Click Me text, slightly above
        const arrowStartX = 0; // Relative to container (middle of text horizontally)
        const arrowStartY = -15; // Slightly above the text (relative to container)
        
        // Arrow ends at vertical middle of Story button's left edge (without touching it)
        const arrowEndX = storyButtonLowerLeftX - 5; // Left edge of button, 5px away to avoid touching
        const arrowEndY = storyButtonY; // Vertical middle of button
        
        // Calculate arrow length and angle (using absolute positions)
        const absoluteArrowStartX = clickMeTextX;
        const absoluteArrowStartY = clickMeTextY - 15;
        const dx = arrowEndX - absoluteArrowStartX;
        const dy = arrowEndY - absoluteArrowStartY;
        const fullDistance = Math.sqrt(dx * dx + dy * dy);
        const arrowLength = fullDistance - 30; // Make arrow shorter so it doesn't touch the button
        const arrowAngle = Math.atan2(dy, dx);
        
        // Create arrow using graphics (relative to container)
        const arrowGraphics = this.add.graphics();
        
        // Arrow parameters
        const arrowWidth = 20;
        
        // Arrow shaft (line) - drawn from origin to arrowLength, pointing right
        arrowGraphics.lineStyle(4, 0x00ffff, 1); // Cyan color, matching instructions
        arrowGraphics.lineBetween(arrowStartX, arrowStartY, arrowStartX + arrowLength, arrowStartY);
        
        // Arrow head (triangle) - pointing right at the end
        arrowGraphics.fillStyle(0x00ffff, 1);
        arrowGraphics.beginPath();
        arrowGraphics.moveTo(arrowStartX + arrowLength, arrowStartY); // Tip of arrow at end
        arrowGraphics.lineTo(arrowStartX + arrowLength - arrowWidth, arrowStartY - arrowWidth / 2); // Back left and up
        arrowGraphics.lineTo(arrowStartX + arrowLength - arrowWidth, arrowStartY + arrowWidth / 2); // Back left and down
        arrowGraphics.closePath();
        arrowGraphics.fillPath();
        arrowGraphics.lineStyle(4, 0x00ffff, 1);
        arrowGraphics.strokePath();
        
        // Rotate arrow to point at story button
        arrowGraphics.setRotation(arrowAngle);
        
        // Add both text and arrow to container
        arrowTextContainer.add([clickMeText, arrowGraphics]);
        
        // Position container at click me text position
        arrowTextContainer.setPosition(clickMeTextX, clickMeTextY);
        
        // Add pulsing alpha animation to arrow only (doesn't affect position)
        this.tweens.add({
          targets: arrowGraphics,
          alpha: { from: 0.6, to: 1.0 },
          duration: 1000,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
        
        // Add bobbing animation to container ONLY (moves both arrow and text together synchronously)
        // This is the ONLY animation that affects position - both elements move as one
        this.tweens.add({
          targets: arrowTextContainer,
          x: { from: clickMeTextX - 5, to: clickMeTextX + 5 },
          y: { from: clickMeTextY - 5, to: clickMeTextY + 5 },
          duration: 1500,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      } catch (arrowError) {
        // If arrow creation fails (e.g., renderer not ready), log but don't break the scene
        MenuSceneDebugger.logError('ARROW_CREATION_ERROR', arrowError);
        // Scene will continue without the arrow - this is non-critical
      }
    });

    // Fading blink animation for instructions
    this.tweens.add({
        targets: instructions,
        alpha: { from: 1, to: 0.3 },
        duration: 1000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });

      // Translucent box in upper left for seed display (1.5x size, hidden by default)
      const boxPadding = 12;
      const boxWidth = 150; // 1.5x of 100
      const boxHeight = 53; // 1.5x of 35 (rounded)
      const boxX = boxPadding;
      const boxY = boxPadding;
      
      // Create translucent background box (hidden by default)
      this.seedBox = this.add.graphics();
      this.seedBox.fillStyle(0x0044aa, 0.6); // Blue with 60% opacity
      this.seedBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 4);
      this.seedBox.lineStyle(2, 0xffffff, 0.8); // White border
      this.seedBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 4);
      this.seedBox.setDepth(100);
      this.seedBox.setVisible(false); // Hidden by default
      
      // Seed display in upper left box - no space from top border
      // Note: create() is called each time the scene is created, so seedText will be undefined
      // The seed is updated in init() before create() runs, so this will use the correct seed
      this.seedText = this.add
        .text(boxX + boxPadding, boxY + boxPadding, `Seed: ${this.seed}`, {
          fontSize: '14px', // Adjusted to fit box
          color: '#ffffff',
          fontFamily: 'monospace',
        })
        .setOrigin(0, 0)
        .setDepth(101)
        .setVisible(false); // Hidden by default
      
      // Re-seed instructions in upper left box - with space from seed text
      this.reseedText = this.add
        .text(boxX + boxPadding, boxY + boxPadding + 22, 'Press R to re-seed', {
          fontSize: '11px', // Adjusted to fit box
          color: '#aaaaaa',
          fontFamily: 'monospace',
        })
        .setOrigin(0, 0)
        .setDepth(101)
        .setVisible(false); // Hidden by default

      // Defer creation of less critical UI elements to avoid creating too many objects at once
      this.time.delayedCall(40, () => {
        // Controls - bigger and at bottom edge, centered
        this.add
          .text(width / 2, height - 20, 'WASD/Arrows: Move | Space: Fire | B: Bomb | N: Shield | ESC: Pause | P: Debug Tools | O: Seed Info', {
            fontSize: '18px', // Bigger font
            color: '#444444',
            fontFamily: 'monospace',
          })
          .setOrigin(0.5);

        // Debugging Tools dropdown - upper right corner (hidden by default)
        const padding = 20;
        const dropdownX = width - padding;
        const dropdownY = padding;
        this.debugDropdownButton = this.add
          .text(dropdownX, dropdownY, '[Debugging Tools ▼]', {
            fontSize: '14px',
            color: '#ffaa00',
            fontFamily: 'monospace',
            backgroundColor: '#333333',
            padding: { x: 10, y: 5 },
          })
          .setOrigin(1, 0) // Right-aligned, top-aligned
          .setInteractive({ useHandCursor: true })
          .setVisible(false) // Hidden by default
          .on('pointerdown', () => {
            this.toggleDebugDropdown();
          })
          .on('pointerover', () => {
            this.debugDropdownButton!.setColor('#ffff00');
          })
          .on('pointerout', () => {
            this.debugDropdownButton!.setColor('#ffaa00');
          });

        // Debug button to start after first boss defeat (hidden by default)
        this.debugBossButton = this.add
          .text(dropdownX, dropdownY + 30, '[DEBUG: AFTER FIRST BOSS]', {
            fontSize: '14px',
            color: '#ffaa00',
            fontFamily: 'monospace',
            backgroundColor: '#333333',
            padding: { x: 10, y: 5 },
          })
          .setOrigin(1, 0) // Right-aligned, top-aligned
          .setInteractive({ useHandCursor: true })
          .setVisible(false)
          .on('pointerdown', () => {
            this.startGameAfterFirstBoss();
          })
          .on('pointerover', () => {
            this.debugBossButton!.setColor('#ffff00');
          })
          .on('pointerout', () => {
            this.debugBossButton!.setColor('#ffaa00');
          });

        // Test button for win condition (hidden by default)
        this.testButton = this.add
          .text(dropdownX, dropdownY + 60, '[TEST: I WON]', {
            fontSize: '14px',
            color: '#ffaa00',
            fontFamily: 'monospace',
            backgroundColor: '#333333',
            padding: { x: 10, y: 5 },
          })
          .setOrigin(1, 0) // Right-aligned, top-aligned
          .setInteractive({ useHandCursor: true })
          .setVisible(false)
          .on('pointerdown', () => {
            this.testWin();
          })
          .on('pointerover', () => {
            this.testButton!.setColor('#ffff00');
          })
          .on('pointerout', () => {
            this.testButton!.setColor('#ffaa00');
          });

        // Death button for game over screen (hidden by default)
        this.deathButton = this.add
          .text(dropdownX, dropdownY + 90, '[TEST: PLAYER DEATH]', {
            fontSize: '14px',
            color: '#ffaa00',
            fontFamily: 'monospace',
            backgroundColor: '#333333',
            padding: { x: 10, y: 5 },
          })
          .setOrigin(1, 0) // Right-aligned, top-aligned
          .setInteractive({ useHandCursor: true })
          .setVisible(false)
          .on('pointerdown', () => {
            this.testDeath();
          })
          .on('pointerover', () => {
            this.deathButton!.setColor('#ffff00');
          })
          .on('pointerout', () => {
            this.deathButton!.setColor('#ffaa00');
          });

        // God mode toggle button (hidden by default)
        this.godModeButton = this.add
          .text(dropdownX, dropdownY + 120, '[GOD MODE: OFF]', {
            fontSize: '14px',
            color: '#ffaa00',
            fontFamily: 'monospace',
            backgroundColor: '#333333',
            padding: { x: 10, y: 5 },
          })
          .setOrigin(1, 0) // Right-aligned, top-aligned
          .setInteractive({ useHandCursor: true })
          .setVisible(false)
          .on('pointerdown', () => {
            this.toggleGodMode();
          })
          .on('pointerover', () => {
            this.godModeButton!.setColor('#ffff00');
          })
          .on('pointerout', () => {
            this.godModeButton!.setColor('#ffaa00');
          });
      });

      // Setup keyboard handlers after a short delay to ensure scene is fully active
      // The scene might not be active immediately when create() is called
      this.time.delayedCall(100, () => {
        this.setupKeyboardHandlers();
      });
      
      // Also set up immediately (in case the delay isn't needed)
    this.setupKeyboardHandlers();
    
    // Note: Kenny easter egg keyboard handler is set up in setupKeyboardHandlers()
    // to ensure it's initialized when keyboard is available
    
    const backgroundExists = this.children.list.some((child: any) => 
      child && child.type === 'Image' && child.texture && child.texture.key === 'menu-background'
    );
    
    // CRITICAL: Log all children to see what's actually in the scene
    MenuSceneDebugger.log('CREATE_MENU_CONTENT_SUCCESS', {
      backgroundExists,
      totalChildren: this.children.list.length,
      children: this.children.list.map((child: any) => ({
        type: child.type,
        visible: child.visible,
        active: child.active,
        alpha: child.alpha,
        textureKey: child.texture?.key,
        depth: child.depth,
      })),
      sceneActive: this.scene.isActive(),
      sceneVisible: this.scene.isVisible(),
      cameraVisible: this.cameras.main.visible,
      cameraAlpha: this.cameras.main.alpha,
    });
    
    } catch (error) {
      MenuSceneDebugger.logError('CREATE_MENU_CONTENT_FAILED', error);
      MenuSceneDebugger.logRendererState(this.game, 'CREATE_MENU_CONTENT_FAILED');
      
      // Even if creation fails, try to create a simple test object
      try {
        const { width, height } = this.cameras.main;
        const errorText = this.add.text(width / 2, height / 2, 'ERROR: Menu failed to load. Check console.', {
          fontSize: '24px',
          color: '#ff0000',
          fontFamily: 'monospace',
        });
        errorText.setOrigin(0.5);
        errorText.setDepth(1000);
        MenuSceneDebugger.log('ERROR_TEXT_CREATED', {
          errorTextVisible: errorText.visible,
          errorTextInChildren: this.children.list.includes(errorText),
        });
      } catch (errorTextError) {
        MenuSceneDebugger.logError('ERROR_TEXT_CREATION_FAILED', errorTextError);
      }
      
      // Retry after a short delay if creation failed
      this.time.delayedCall(100, () => {
        if (this.scene.isActive()) {
          try {
            this.createMenuContent();
          } catch (retryError) {
            MenuSceneDebugger.logError('CREATE_MENU_CONTENT_RETRY_FAILED', retryError);
          }
        }
      });
    }
  }
  
  /**
   * Setup keyboard input handlers
   */
  private setupKeyboardHandlers(): void {
    // First, ensure the scene can receive input
    this.input.keyboard?.clearCaptures();
    this.input.keyboard?.enableGlobalCapture();
    
    if (this.input.keyboard) {
      sceneLogger.log('MenuScene', 'KEYBOARD_INPUT_AVAILABLE', {
        sceneActive: this.scene.isActive(),
        scenePaused: this.scene.isPaused(),
        sceneVisible: this.scene.isVisible(),
      });
      
      // Method 1: Use key codes directly (most reliable)
      const enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      enterKey.on('down', () => {
        sceneLogger.log('MenuScene', 'ENTER_KEY_PRESSED', { 
          isTransitioning: this.isTransitioning,
          sceneActive: this.scene.isActive(),
          scenePaused: this.scene.isPaused(),
        });
        this.startGame();
      });

      const rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
      rKey.on('down', () => {
        this.reseed();
      });
      
      // Test win with T key
      const tKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
      tKey.on('down', () => {
        this.testWin();
      });
      
      // Toggle debug tools with P key
      const pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
      pKey.on('down', () => {
        this.toggleDebugToolsVisibility();
      });
      
      // Toggle seed box with O key
      const oKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O);
      oKey.on('down', () => {
        this.toggleSeedBoxVisibility();
      });
      
      // Setup Kenny easter egg (only once)
      if (!this.kennyKeyboardSetup) {
        const { width, height } = this.cameras.main;
        KennyEasterEgg.setupKeyboardHandler(this, width, height, this.kennys);
        this.kennyKeyboardSetup = true;
      }
      
      // Reset Kenny timer when scene is created
      this.kennyTimer = 0;
      this.kennySpawned = false;
      
      // Method 2: Also try event name format (like other scenes use)
      this.input.keyboard.on('keydown-ENTER', () => {
        sceneLogger.log('MenuScene', 'ENTER_EVENT_KEYDOWN', { 
          isTransitioning: this.isTransitioning,
          sceneActive: this.scene.isActive(),
        });
        this.startGame();
      });
      
      // Method 3: Also listen for keydown events directly
      this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.code === 'Enter' || event.keyCode === 13) {
          sceneLogger.log('MenuScene', 'ENTER_KEYDOWN_EVENT', { 
            isTransitioning: this.isTransitioning,
            sceneActive: this.scene.isActive(),
            key: event.key,
            code: event.code,
            keyCode: event.keyCode,
          });
          event.preventDefault();
          this.startGame();
        }
      });
    } else {
      sceneLogger.logError('MenuScene', 'KEYBOARD_NOT_AVAILABLE', 'Keyboard input not available!');
    }
    
    // Fallback: ALWAYS set up global keyboard event as backup
    const globalHandler = (event: KeyboardEvent) => {
      if (this.scene.isActive() && !this.scene.isPaused()) {
        if (event.key === 'Enter' || event.code === 'Enter' || event.keyCode === 13) {
          sceneLogger.log('MenuScene', 'ENTER_GLOBAL_HANDLER', { 
            isTransitioning: this.isTransitioning,
            sceneActive: this.scene.isActive(),
          });
          event.preventDefault();
          this.startGame();
        } else if (event.key === 'r' || event.key === 'R') {
          this.reseed();
        } else if (event.key === 't' || event.key === 'T') {
          this.testWin();
        } else if (event.key === 'p' || event.key === 'P') {
          this.toggleDebugToolsVisibility();
        } else if (event.key === 'o' || event.key === 'O') {
          this.toggleSeedBoxVisibility();
        }
      }
    };
    
    // Remove any existing listener first
    if ((this as any)._globalKeyHandler) {
      window.removeEventListener('keydown', (this as any)._globalKeyHandler, true);
    }
    window.addEventListener('keydown', globalHandler, true); // Use capture phase
    
    // Store handler for cleanup
    (this as any)._globalKeyHandler = globalHandler;
  }

  /**
   * Create pulsing reddish force field around space station
   */
  private createForceField(): void {
    this.forceFieldGraphics = this.add.graphics();
    this.forceFieldGraphics.setDepth(-90); // In front of station, so station shows through translucent shield
    this.forceFieldGraphics.setBlendMode(Phaser.BlendModes.ADD); // Additive blend for translucent effect
    this.updateForceField();
    
    // Ensure explosion-particle texture exists for meteorite trails
    if (!this.textures.exists('explosion-particle')) {
      const circle = this.add.graphics();
      circle.fillStyle(0xffffff);
      circle.fillCircle(4, 4, 4);
      circle.generateTexture('explosion-particle', 8, 8);
      circle.destroy();
    }
  }
  
  /**
   * Update force field visual (pulsing effect)
   */
  private updateForceField(): void {
    if (!this.forceFieldGraphics) return;
    
    const station = (this as any).station;
    const stationSize = (this as any).stationSize;
    const stationX = (this as any).stationX;
    const stationY = (this as any).stationY;
    
    if (!station || !stationSize) return;
    
    // Pulse effect - oscillate between 0.2 and 0.5 opacity (more translucent so stars show through)
    const pulse = Math.sin(this.forceFieldPulseTime * 0.005) * 0.15 + 0.35;
    const radius = stationSize * 0.55; // Slightly larger than station
    
    this.forceFieldGraphics.clear();
    
    // Outer glow
    this.forceFieldGraphics.fillStyle(0xff4444, pulse * 0.3);
    this.forceFieldGraphics.fillCircle(stationX, stationY, radius * 1.1);
    
    // Main force field ring (outer ring - this is where meteorites explode)
    this.forceFieldGraphics.lineStyle(3, 0xff6666, pulse);
    this.forceFieldGraphics.strokeCircle(stationX, stationY, radius);
    
    // Inner glow
    this.forceFieldGraphics.lineStyle(1, 0xff8888, pulse * 0.7);
    this.forceFieldGraphics.strokeCircle(stationX, stationY, radius * 0.9);
    
    // Store force field radius for collision detection
    (this as any).forceFieldRadius = radius;
  }
  
  /**
   * Spawn a meteorite that flies toward the station
   */
  private spawnMeteorite(): void {
    // CRITICAL: Don't spawn if background doesn't exist
    const hasBackground = this.children.list.some((child: any) => 
      child && child.type === 'Image' && child.texture && child.texture.key === 'menu-background'
    );
    
    if (!hasBackground) {
      return;
    }
    
    const { width, height } = this.cameras.main;
    const stationX = (this as any).stationX;
    const stationY = (this as any).stationY;
    const stationSize = (this as any).stationSize;
    const forceFieldRadius = (this as any).forceFieldRadius;
    
    if (!stationX || !stationY || !stationSize) {
      return;
    }
    
    // Ensure meteorites spawn far enough from the station
    const stationRadius = forceFieldRadius || (stationSize * 0.55);
    const minSpawnDistance = stationRadius * 1.5; // Must spawn at least 1.5x the force field radius away
    
    let x: number, y: number, angle: number;
    let attempts = 0;
    const maxAttempts = 20;
    
    // Spawn from outside screen, ensuring it's not inside the station area
    do {
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
      
      // Check distance from station - if too close, try a different position
      const dx = x - stationX;
      const dy = y - stationY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If far enough away, use this position
      if (distance >= minSpawnDistance) {
        break;
      }
      
      attempts++;
      // If we've tried too many times, force a position far from the station
      if (attempts >= maxAttempts) {
        // Force spawn in a corner far from the station
        const corners = [
          { x: -100, y: -100 },
          { x: width + 100, y: -100 },
          { x: width + 100, y: height + 100 },
          { x: -100, y: height + 100 },
        ];
        const corner = corners[Math.floor(Math.random() * corners.length)]!;
        x = corner.x;
        y = corner.y;
        break;
      }
    } while (true);
    
    // Calculate angle toward station
    angle = Math.atan2(stationY - y, stationX - x);
    const speed = 300 + Math.random() * 400; // 300-700 pixels per second (much faster)
    
    // Create meteorite sprite - 10th of original size
    const meteorite = this.add.sprite(x, y, 'meteorite');
    const scale = (0.05 + Math.random() * 0.05); // 0.05-0.1 (10th of original 0.5-1.0)
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
   * Spawn a broken spaceship that tumbles toward the station
   */
  private spawnBrokenShip(): void {
    const { width, height } = this.cameras.main;
    const stationX = (this as any).stationX;
    const stationY = (this as any).stationY;
    const stationSize = (this as any).stationSize;
    const forceFieldRadius = (this as any).forceFieldRadius;
    
    if (!stationX || !stationY || !stationSize) return;
    
    // Ensure broken ships spawn far enough from the station
    const stationRadius = forceFieldRadius || (stationSize * 0.55);
    const minSpawnDistance = stationRadius * 1.5;
    
    let x: number, y: number, angle: number;
    let attempts = 0;
    const maxAttempts = 20;
    
    // Spawn from outside screen, ensuring it's not inside the station area
    do {
      const edge = Math.random();
      
      if (edge < 0.25) {
        x = Math.random() * width;
        y = -100;
      } else if (edge < 0.5) {
        x = width + 100;
        y = Math.random() * height;
      } else if (edge < 0.75) {
        x = Math.random() * width;
        y = height + 100;
      } else {
        x = -100;
        y = Math.random() * height;
      }
      
      const dx = x - stationX;
      const dy = y - stationY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance >= minSpawnDistance) {
        break;
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        const corners = [
          { x: -150, y: -150 },
          { x: width + 150, y: -150 },
          { x: width + 150, y: height + 150 },
          { x: -150, y: height + 150 },
        ];
        const corner = corners[Math.floor(Math.random() * corners.length)]!;
        x = corner.x;
        y = corner.y;
        break;
      }
    } while (true);
    
    // Calculate angle toward station
    angle = Math.atan2(stationY - y, stationX - x);
    const speed = 150 + Math.random() * 100; // 150-250 pixels per second (slower than meteorites)
    const rotationSpeed = (Math.random() - 0.5) * 0.003; // Random tumbling rotation speed
    
    // Create broken spaceship sprite
    const ship = this.add.sprite(x, y, 'broken-ship');
    const scale = 0.3 + Math.random() * 0.2; // 0.3-0.5 scale
    ship.setScale(scale);
    ship.setRotation(Math.random() * Math.PI * 2); // Random starting rotation
    ship.setDepth(-97);
    
    this.brokenShips.push({
      sprite: ship,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotationSpeed: rotationSpeed,
      speed: speed,
    });
  }
  
  /**
   * Check if broken ship hits force field and explode
   */
  private checkBrokenShipCollisions(): void {
    const stationX = (this as any).stationX;
    const stationY = (this as any).stationY;
    const forceFieldRadius = (this as any).forceFieldRadius;
    
    if (!forceFieldRadius) return;
    
    for (let i = this.brokenShips.length - 1; i >= 0; i--) {
      const ship = this.brokenShips[i]!;
      const dx = ship.sprite.x - stationX;
      const dy = ship.sprite.y - stationY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check collision with outer ring of force field
      const ringThickness = 10; // Larger tolerance for bigger ships
      if (distance >= forceFieldRadius - ringThickness && distance <= forceFieldRadius + ringThickness) {
        // Explode with bigger effect!
        this.explodeBrokenShip(ship.sprite.x, ship.sprite.y);
        ship.sprite.destroy();
        this.brokenShips.splice(i, 1);
      }
    }
  }
  
  /**
   * Create explosion effect when broken ship hits force field (bigger than meteorite)
   */
  private explodeBrokenShip(x: number, y: number): void {
    // Particle burst - half the size
    const particles = this.add.particles(x, y, 'explosion-particle', {
      speed: { min: 50, max: 200 }, // Half the speed range
      scale: { start: 0.5, end: 0 }, // Half the scale
      lifespan: 1000,
      quantity: 20, // Half the quantity
      tint: [0xff6666, 0xff8888, 0xffaa00, 0xffffff, 0xaaaaaa],
      angle: { min: 0, max: 360 },
      blendMode: 'ADD',
    });
    
    particles.setDepth(-96);
    
    this.time.delayedCall(1000, () => {
      particles.destroy();
    });
    
    // Expanding circle effect - half the size
    const explosion = this.add.graphics();
    explosion.setDepth(-96);
    
    let radius = 0;
    const maxRadius = 30; // Half of 60
    const duration = 500;
    
    this.tweens.add({
      targets: { radius: 0 },
      radius: maxRadius,
      duration: duration,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        radius = (tween.targets[0] as any).radius;
        const alpha = 1 - (radius / maxRadius);
        explosion.clear();
        explosion.lineStyle(3, 0xff6666, alpha); // Half the line width (3 instead of 6)
        explosion.strokeCircle(x, y, radius);
        explosion.lineStyle(1.5, 0xffffff, alpha * 0.9); // Half the line width (1.5 instead of 3)
        explosion.strokeCircle(x, y, radius * 0.8);
      },
      onComplete: () => {
        explosion.destroy();
      },
    });
  }
  
  /**
   * Check if meteorite hits force field and explode
   */
  private checkMeteoriteCollisions(): void {
    const stationX = (this as any).stationX;
    const stationY = (this as any).stationY;
    const forceFieldRadius = (this as any).forceFieldRadius;
    
    if (!forceFieldRadius || !stationX || !stationY) return;
    
    for (let i = this.meteorites.length - 1; i >= 0; i--) {
      const meteor = this.meteorites[i]!;
      if (!meteor.sprite.active) continue;
      
      const dx = meteor.sprite.x - stationX;
      const dy = meteor.sprite.y - stationY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check collision with outer ring of force field (not the station itself)
      // Increased tolerance to account for fast-moving meteorites and ring thickness
      const ringThickness = 10; // Increased from 5
      
      // Check if meteorite is at or past the force field boundary
      // Also check if it crossed the boundary (was outside, now inside)
      if (distance <= forceFieldRadius + ringThickness && distance >= forceFieldRadius - ringThickness) {
        // Explode!
        this.explodeMeteorite(meteor.sprite.x, meteor.sprite.y);
        meteor.sprite.destroy();
        this.meteorites.splice(i, 1);
      } else if (distance < forceFieldRadius - ringThickness) {
        // Meteorite passed through the force field - explode at boundary
        // Calculate point on force field boundary closest to current position
        const angle = Math.atan2(dy, dx);
        const boundaryX = stationX + Math.cos(angle) * forceFieldRadius;
        const boundaryY = stationY + Math.sin(angle) * forceFieldRadius;
        this.explodeMeteorite(boundaryX, boundaryY);
        meteor.sprite.destroy();
        this.meteorites.splice(i, 1);
      }
    }
  }
  
  /**
   * Create explosion effect when meteorite hits force field
   */
  private explodeMeteorite(x: number, y: number): void {
    // Ensure we have a particle texture
    if (!this.textures.exists('explosion-particle')) {
      const circle = this.add.graphics();
      circle.fillStyle(0xffffff);
      circle.fillCircle(4, 4, 4);
      circle.generateTexture('explosion-particle', 8, 8);
      circle.destroy();
    }
    
    // Create particle burst
    const particles = this.add.particles(x, y, 'explosion-particle', {
      speed: { min: 50, max: 200 },
      scale: { start: 0.5, end: 0 },
      lifespan: 500,
      quantity: 20,
      tint: [0xff6666, 0xff8888, 0xffaa00, 0xffffff],
      angle: { min: 0, max: 360 },
      blendMode: 'ADD',
    });
    
    particles.setDepth(-96);
    
    // Remove particles after animation
    this.time.delayedCall(500, () => {
      particles.destroy();
    });
    
    // Create expanding circle effect
    const explosion = this.add.graphics();
    explosion.setDepth(-96);
    
    let radius = 0;
    const maxRadius = 30;
    const duration = 300;
    
    this.tweens.add({
      targets: { radius: 0 },
      radius: maxRadius,
      duration: duration,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        radius = (tween.targets[0] as any).radius;
        const alpha = 1 - (radius / maxRadius);
        explosion.clear();
        explosion.lineStyle(4, 0xff6666, alpha);
        explosion.strokeCircle(x, y, radius);
        explosion.lineStyle(2, 0xffffff, alpha * 0.8);
        explosion.strokeCircle(x, y, radius * 0.7);
      },
      onComplete: () => {
        explosion.destroy();
      },
    });
  }
  
  /**
   * Update story button glow effect - exactly follows text outline using multiple text layers
   */
  private updateStoryGlow(pulse: number): void {
    if (!this.storyButton || this.storyGlowTexts.length === 0) return;
    
    // Pulse between much lower opacity (more translucent) - 0.1 and 0.3
    const baseOpacity = 0.1 + (pulse * 0.2);
    
    // Get story button position
    const storyX = this.storyButton.x;
    const storyY = this.storyButton.y;
    
    // Maximum glow expansion
    const maxExpansion = 8 + pulse * 12; // 8-20px expansion
    
    // Create offsets in a grid pattern around the text
    const offsets: Array<{ x: number; y: number }> = [];
    const step = maxExpansion / 2;
    
    // Generate offsets in all directions
    for (let dx = -maxExpansion; dx <= maxExpansion; dx += step) {
      for (let dy = -maxExpansion; dy <= maxExpansion; dy += step) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0 && distance <= maxExpansion) {
          offsets.push({ x: dx, y: dy });
        }
      }
    }
    
    // Limit to available glow texts
    const offsetsToUse = offsets.slice(0, this.storyGlowTexts.length);
    
    this.storyGlowTexts.forEach((glowText: Phaser.GameObjects.Text, index: number) => {
      if (index >= offsetsToUse.length) {
        glowText.setAlpha(0);
        return;
      }
      
      const offset = offsetsToUse[index]!;
      
      // Position glow copy
      glowText.setPosition(storyX + offset.x, storyY + offset.y);
      
      // Opacity based on distance from center
      const distance = Math.sqrt(offset.x * offset.x + offset.y * offset.y);
      const normalizedDistance = Math.min(distance / maxExpansion, 1);
      const opacity = baseOpacity * (1 - normalizedDistance * 0.5);
      
      glowText.setAlpha(opacity);
      glowText.setBlendMode(Phaser.BlendModes.ADD);
      glowText.setScale(1); // Keep same scale to follow text exactly
    });
  }

  /**
   * Update title glare effect - exactly follows text outline using multiple text layers
   */
  private updateTitleGlare(pulse: number): void {
    const title = (this as any).titleText;
    const glowTexts = (this as any).titleGlowTexts;
    
    if (!title || !glowTexts || glowTexts.length === 0) return;
    
    // Pulse between much lower opacity (more translucent) - 0.1 and 0.3
    const baseOpacity = 0.1 + (pulse * 0.2);
    
    // Get title position
    const titleX = title.x;
    const titleY = title.y;
    
    // Maximum glow expansion
    const maxExpansion = 8 + pulse * 12; // 8-20px expansion
    
    // Update each glow layer to follow the exact text shape
    glowTexts.forEach((glowText: Phaser.GameObjects.Text, index: number) => {
      if (!glowText.active) return;
      
      const layerIndex = index;
      const totalLayers = glowTexts.length;
      
      // Calculate expansion for this layer (outer layers expand more)
      const expansion = (maxExpansion * (layerIndex + 1)) / totalLayers;
      
      // Position glow text with slight offset to create glow effect
      // Use multiple offsets to create glow around entire text
      const offsets = [
        { x: -expansion, y: -expansion }, // Top-left
        { x: expansion, y: -expansion },  // Top-right
        { x: -expansion, y: expansion },  // Bottom-left
        { x: expansion, y: expansion },   // Bottom-right
        { x: 0, y: -expansion },         // Top
        { x: 0, y: expansion },          // Bottom
        { x: -expansion, y: 0 },         // Left
        { x: expansion, y: 0 },          // Right
      ];
      
      // For this layer, create multiple copies at different offsets
      // Use blend mode for additive glow
      glowText.setPosition(titleX, titleY);
      
      // Calculate opacity for this layer (decreases for outer layers)
      const layerOpacity = baseOpacity * (1 - (layerIndex / totalLayers) * 0.6);
      
      // Set properties for glow effect
      glowText.setAlpha(layerOpacity);
      glowText.setBlendMode(Phaser.BlendModes.ADD);
      
      // Create offset copies for full glow around text
      // We'll use a simpler approach: scale and position adjustments
      const scaleOffset = 1 + (expansion / 100);
      glowText.setScale(scaleOffset);
      
      // For better effect, we'll create multiple copies in the update
      // Actually, let's use a different approach - create glow using shadow/blur effect
    });
    
    // Create glow by positioning copies in all directions around the text
    // This creates a glow that exactly follows the text outline
    const offsets: Array<{ x: number; y: number }> = [];
    
    // Create offsets in a grid pattern around the text
    const gridSize = 5; // 5x5 grid = 25 positions (but we'll use fewer)
    const step = maxExpansion / 2;
    
    // Generate offsets in all directions
    for (let dx = -maxExpansion; dx <= maxExpansion; dx += step) {
      for (let dy = -maxExpansion; dy <= maxExpansion; dy += step) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0 && distance <= maxExpansion) {
          offsets.push({ x: dx, y: dy });
        }
      }
    }
    
    // Limit to available glow texts
    const offsetsToUse = offsets.slice(0, glowTexts.length);
    
    glowTexts.forEach((glowText: Phaser.GameObjects.Text, index: number) => {
      if (index >= offsetsToUse.length) {
        glowText.setAlpha(0);
        return;
      }
      
      const offset = offsetsToUse[index]!;
      
      // Position glow copy
      glowText.setPosition(titleX + offset.x, titleY + offset.y);
      
      // Opacity based on distance from center
      const distance = Math.sqrt(offset.x * offset.x + offset.y * offset.y);
      const normalizedDistance = Math.min(distance / maxExpansion, 1);
      const opacity = baseOpacity * (1 - normalizedDistance * 0.5);
      
      glowText.setAlpha(opacity);
      glowText.setBlendMode(Phaser.BlendModes.ADD);
      glowText.setScale(1); // Keep same scale to follow text exactly
    });
  }
  
  /**
   * Update scene - animate force field and meteorites
   */
  update(time: number, delta: number): void {
    // CRITICAL: Don't run update logic until main content is created
    // Check if background exists (indicates createMenuContent completed successfully)
    const background = this.children.list.find((child: any) => 
      child && child.type === 'Image' && child.texture && child.texture.key === 'menu-background'
    );
    const hasBackground = !!background;
    
    if (!hasBackground) {
      // Content not created yet, don't run update logic
      // This prevents meteorites from spawning before scene is ready
      
      // CRITICAL: If we have meteorites but no background, something is wrong
      // Clean them up to prevent them from being visible
      if (this.meteorites.length > 0 || this.brokenShips.length > 0) {
        MenuSceneDebugger.log('CLEANUP_ORPHANED_OBJECTS', {
          meteoritesCount: this.meteorites.length,
          brokenShipsCount: this.brokenShips.length,
          childrenCount: this.children.list.length,
        });
        this.cleanupArrays();
      }
      
      return;
    }
    
    // Verify background is visible and active
    if (background && (!background.visible || !background.active)) {
      MenuSceneDebugger.logError('BACKGROUND_NOT_VISIBLE_OR_ACTIVE', {
        visible: background.visible,
        active: background.active,
        alpha: background.alpha,
      });
    }
    
    // Update force field pulse
    this.forceFieldPulseTime += delta;
    this.updateForceField();
    
    // Update meteorites
    const deltaSeconds = delta / 1000;
    for (let i = this.meteorites.length - 1; i >= 0; i--) {
      const meteor = this.meteorites[i]!;
      meteor.sprite.x += meteor.vx * deltaSeconds;
      meteor.sprite.y += meteor.vy * deltaSeconds;
      
      // Remove if off screen
      const { width, height } = this.cameras.main;
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
    
    // Check collisions
    this.checkMeteoriteCollisions();
    
    // Spawn new meteorites periodically - twice as often (every 6 seconds)
    this.meteoriteSpawnTimer += delta;
    if (this.meteoriteSpawnTimer >= 6000) { // Every 6 seconds (twice as often as 12 seconds)
      this.meteoriteSpawnTimer = 0;
      this.spawnMeteorite();
    }
    
    // Spawn broken spaceships periodically (less frequent than meteorites)
    this.brokenShipSpawnTimer += delta;
    if (this.brokenShipSpawnTimer >= 25000) { // Every 25 seconds
      this.brokenShipSpawnTimer = 0;
      this.spawnBrokenShip();
    }
    
    // Easter egg: Kenny timer (60 seconds - auto spawn once)
    if (!this.kennySpawned) {
      this.kennyTimer += delta;
      if (this.kennyTimer >= 60000) { // 60 seconds
        const { width, height } = this.cameras.main;
        if (this.kennys.length < 30) {
          KennyEasterEgg.spawnKenny(this, width, height, this.kennys);
        }
        this.kennySpawned = true; // Mark as spawned so it only happens once
      }
    }
    
    // Update broken ships
    for (let i = this.brokenShips.length - 1; i >= 0; i--) {
      const ship = this.brokenShips[i]!;
      ship.sprite.x += ship.vx * deltaSeconds;
      ship.sprite.y += ship.vy * deltaSeconds;
      ship.sprite.rotation += ship.rotationSpeed * deltaSeconds; // Tumbling rotation
      
      // Remove if off screen
      const { width, height } = this.cameras.main;
      if (
        ship.sprite.x < -200 ||
        ship.sprite.x > width + 200 ||
        ship.sprite.y < -200 ||
        ship.sprite.y > height + 200
      ) {
        ship.sprite.destroy();
        this.brokenShips.splice(i, 1);
      }
    }
    
    // Check broken ship collisions with force field
    this.checkBrokenShipCollisions();
    
    // Update Kennys
    const { width, height } = this.cameras.main;
    KennyEasterEgg.updateKennys(this, width, height, delta, this.kennys);
  }
  
  /**
   * Create animated stars that fade in and out slowly, all out of sync
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
      const brightness = Math.random() * 0.6 + 0.4; // Start brightness
      
      const star = this.add.graphics();
      star.fillStyle(0xffffff, brightness);
      star.fillRect(x, y, size, size);
      star.setDepth(-100); // Behind station and shield
      
      // Random delay and duration for each star (out of sync)
      const delay = Math.random() * 3000; // 0-3 seconds delay
      const duration = Math.random() * 2000 + 2000; // 2-4 seconds duration
      const minAlpha = Math.random() * 0.3 + 0.1; // Fade to 10-40% opacity
      
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
      const brightness = Math.random() * 0.4 + 0.6; // Start brighter
      
      // Main star
      const star = this.add.graphics();
      star.fillStyle(0xffffff, brightness);
      star.fillCircle(x, y, size);
      star.setDepth(-100); // Behind station and shield
      
      // Glow effect
      const glow = this.add.graphics();
      glow.fillStyle(0xffffff, brightness * 0.3);
      glow.fillCircle(x, y, size * 2);
      glow.setDepth(-101); // Behind stars
      
      // Random delay and duration (different from small stars)
      const delay = Math.random() * 4000; // 0-4 seconds delay
      const duration = Math.random() * 3000 + 2500; // 2.5-5.5 seconds duration
      const minAlpha = Math.random() * 0.2 + 0.2; // Fade to 20-40% opacity
      
      // Animate both star and glow together
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

  private startGame(): void {
    sceneLogger.log('MenuScene', 'START_GAME_CALLED', { 
      isTransitioning: this.isTransitioning,
      sceneActive: this.scene.isActive(),
      scenePaused: this.scene.isPaused(),
      sceneVisible: this.scene.isVisible(),
    });
    
    if (this.isTransitioning) {
      sceneLogger.log('MenuScene', 'START_GAME_BLOCKED', { 
        isTransitioning: this.isTransitioning,
        reason: 'Already transitioning'
      });
      console.warn('Start game blocked: already transitioning');
      return;
    }
    
    sceneLogger.logTransition('MenuScene', 'GameScene', { seed: this.seed });
    this.isTransitioning = true;
    
    try {
      // Stop menu music if playing
      if (this.menuMusic) {
        this.menuMusic.stop();
        this.menuMusic.destroy();
        sceneLogger.log('MenuScene', 'MUSIC_STOPPED');
      }
      musicSystem.stop();
      
      // Stop all tweens to prevent them from continuing to render
      this.tweens.killAll();
      sceneLogger.log('MenuScene', 'ALL_TWEENS_STOPPED');
      
      // Skip particle cleanup - it's not critical and was causing errors
      // The scene.start() will handle cleanup automatically
      
      // Check if GameScene exists before trying to start it
      const gameSceneExists = this.scene.get('GameScene');
      if (!gameSceneExists) {
        sceneLogger.logError('MenuScene', 'GAMESCENE_NOT_FOUND', 'GameScene does not exist in scene manager');
        this.isTransitioning = false;
        return;
      }
      
      sceneLogger.log('MenuScene', 'GAMESCENE_EXISTS', { 
        sceneKey: gameSceneExists.scene.key,
        isActive: gameSceneExists.scene.isActive(),
        isPaused: gameSceneExists.scene.isPaused(),
      });
      
      // Hide this scene's camera to prevent it from rendering
      this.cameras.main.setVisible(false);
      sceneLogger.log('MenuScene', 'CAMERA_HIDDEN');
      
      // Pass seed to game scene
      // Note: scene.start() automatically stops the current scene, so don't call stop() manually
      sceneLogger.log('MenuScene', 'CALLING_SCENE_START', { 
        seed: this.seed,
        currentScene: this.scene.key,
        targetScene: 'GameScene',
      });
      
      // CRITICAL: Start the game scene - this must happen
      this.scene.start('GameScene', { seed: this.seed });
      sceneLogger.log('MenuScene', 'GAMESCENE_START_CALLED', { seed: this.seed });
      
      // Verify GameScene started after a short delay
      setTimeout(() => {
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
          sceneLogger.log('MenuScene', 'GAMESCENE_VERIFICATION', {
            isActive: gameScene.scene.isActive(),
            isPaused: gameScene.scene.isPaused(),
            isVisible: gameScene.scene.isVisible(),
          });
          
          if (!gameScene.scene.isActive()) {
            sceneLogger.logError('MenuScene', 'GAMESCENE_NOT_ACTIVE', 'GameScene did not become active after start()');
            // Restore menu scene
            this.cameras.main.setVisible(true);
            this.isTransitioning = false;
          }
        } else {
          sceneLogger.logError('MenuScene', 'GAMESCENE_MISSING_AFTER_START', 'GameScene missing after start() call');
          // Restore menu scene
          this.cameras.main.setVisible(true);
          this.isTransitioning = false;
        }
      }, 200);
      
      // Check scene states after transition
      setTimeout(() => {
        if ((window as any).sceneLogger) {
          (window as any).sceneLogger.checkSceneStates(this.game);
        }
      }, 100);
    } catch (error) {
      sceneLogger.logError('MenuScene', 'START_GAME_ERROR', error);
      
      // Even if there's an error, try to start the game scene anyway
      // This ensures the game can still start even if cleanup fails
      try {
        sceneLogger.log('MenuScene', 'ATTEMPTING_RECOVERY_START', 'Trying to start GameScene despite error');
        this.scene.start('GameScene', { seed: this.seed });
        sceneLogger.log('MenuScene', 'RECOVERY_START_SUCCESS', 'GameScene started despite error');
      } catch (recoveryError) {
        sceneLogger.logError('MenuScene', 'RECOVERY_START_FAILED', recoveryError);
        // Restore camera visibility in case of complete failure
        this.cameras.main.setVisible(true);
      }
      
      this.isTransitioning = false;
    }
  }

  private startStory(): void {
    if (this.isTransitioning) {
      sceneLogger.log('MenuScene', 'START_STORY_BLOCKED', { isTransitioning: this.isTransitioning });
      return;
    }
    
    sceneLogger.logTransition('MenuScene', 'IntroScene', { seed: this.seed });
    this.isTransitioning = true;
    
    try {
      // Stop menu music if playing
      if (this.menuMusic) {
        this.menuMusic.stop();
        this.menuMusic.destroy();
        sceneLogger.log('MenuScene', 'MUSIC_STOPPED');
      }
      musicSystem.stop();
      
      // Stop all tweens to prevent them from continuing to render
      this.tweens.killAll();
      sceneLogger.log('MenuScene', 'ALL_TWEENS_STOPPED');
      
      // Pass seed to intro scene (which will show the story)
      this.scene.start('IntroScene', { seed: this.seed });
      sceneLogger.log('MenuScene', 'INTROSCENE_STARTED');
      
      // Check scene states after transition
      setTimeout(() => {
        if ((window as any).sceneLogger) {
          (window as any).sceneLogger.checkSceneStates(this.game);
        }
      }, 100);
    } catch (error) {
      sceneLogger.logError('MenuScene', 'START_STORY_ERROR', error);
      this.isTransitioning = false;
    }
  }

  private reseed(): void {
    // Generate new random seed
    this.seed = Math.floor(Math.random() * 1000000);
    this.rng = new RNG(this.seed); // Create new RNG instance with new seed
    if (this.seedText) {
      this.seedText.setText(`Seed: ${this.seed}`);
    }
  }

  private toggleDebugToolsVisibility(): void {
    // Toggle visibility of debug dropdown button
    if (this.debugDropdownButton) {
      const isVisible = this.debugDropdownButton.visible;
      this.debugDropdownButton.setVisible(!isVisible);
      
      // If hiding, also close the dropdown and hide all items
      if (isVisible) {
        this.debugDropdownOpen = false;
        if (this.debugBossButton) {
          this.debugBossButton.setVisible(false);
        }
        if (this.testButton) {
          this.testButton.setVisible(false);
        }
        if (this.deathButton) {
          this.deathButton.setVisible(false);
        }
        if (this.godModeButton) {
          this.godModeButton.setVisible(false);
        }
        this.debugDropdownButton.setText('[Debugging Tools ▼]');
      }
      
      sceneLogger.log('MenuScene', 'DEBUG_TOOLS_VISIBILITY_TOGGLED', { visible: !isVisible });
    }
  }

  private toggleDebugDropdown(): void {
    this.debugDropdownOpen = !this.debugDropdownOpen;
    
    // Show/hide dropdown items
    if (this.debugBossButton) {
      this.debugBossButton.setVisible(this.debugDropdownOpen);
    }
    if (this.testButton) {
      this.testButton.setVisible(this.debugDropdownOpen);
    }
    if (this.deathButton) {
      this.deathButton.setVisible(this.debugDropdownOpen);
    }
    if (this.godModeButton) {
      this.godModeButton.setVisible(this.debugDropdownOpen);
    }
    
    // Update arrow indicator
    if (this.debugDropdownButton) {
      this.debugDropdownButton.setText(
        this.debugDropdownOpen ? '[Debugging Tools ▲]' : '[Debugging Tools ▼]'
      );
    }
  }

  private toggleSeedBoxVisibility(): void {
    // Toggle visibility of seed box and all its elements
    const isVisible = this.seedBox ? !this.seedBox.visible : true;
    
    if (this.seedBox) {
      this.seedBox.setVisible(isVisible);
    }
    if (this.seedText) {
      this.seedText.setVisible(isVisible);
    }
    if (this.reseedText) {
      this.reseedText.setVisible(isVisible);
    }
    
    sceneLogger.log('MenuScene', 'SEED_BOX_VISIBILITY_TOGGLED', { visible: isVisible });
  }

  private toggleGodMode(): void {
    this.godModeEnabled = !this.godModeEnabled;
    setGodMode(this.godModeEnabled);
    
    // Update button text
    if (this.godModeButton) {
      this.godModeButton.setText(this.godModeEnabled ? '[GOD MODE: ON]' : '[GOD MODE: OFF]');
      this.godModeButton.setColor(this.godModeEnabled ? '#00ff00' : '#ffaa00');
    }
    
    sceneLogger.log('MenuScene', 'GOD_MODE_TOGGLED', { enabled: this.godModeEnabled });
  }

  private startGameAfterFirstBoss(): void {
    if (this.isTransitioning) {
      sceneLogger.log('MenuScene', 'START_GAME_AFTER_FIRST_BOSS_BLOCKED', { isTransitioning: this.isTransitioning });
      return;
    }
    
    sceneLogger.logTransition('MenuScene', 'GameScene', { seed: this.seed, afterFirstBoss: true });
    this.isTransitioning = true;
    
    try {
      // Stop menu music if playing
      if (this.menuMusic) {
        this.menuMusic.stop();
        this.menuMusic.destroy();
        sceneLogger.log('MenuScene', 'MUSIC_STOPPED');
      }
      musicSystem.stop();
      
      // Stop all tweens to prevent them from continuing to render
      this.tweens.killAll();
      sceneLogger.log('MenuScene', 'ALL_TWEENS_STOPPED');
      
      // Skip intro and go directly to game with afterFirstBoss flag
      this.scene.start('GameScene', { seed: this.seed, afterFirstBoss: true });
      sceneLogger.log('MenuScene', 'GAMESCENE_STARTED_AFTER_FIRST_BOSS');
      
      // Check scene states after transition
      setTimeout(() => {
        if ((window as any).sceneLogger) {
          (window as any).sceneLogger.checkSceneStates(this.game);
        }
      }, 100);
    } catch (error) {
      sceneLogger.logError('MenuScene', 'START_GAME_AFTER_FIRST_BOSS_ERROR', error);
      this.isTransitioning = false;
    }
  }

  private testWin(): void {
    if (this.isTransitioning) {
      sceneLogger.log('MenuScene', 'TEST_WIN_BLOCKED', { isTransitioning: this.isTransitioning });
      return;
    }
    
    sceneLogger.logTransition('MenuScene', 'EndScene', { playtime: 0, test: true });
    this.isTransitioning = true;
    
    try {
      // Stop menu music if playing
      if (this.menuMusic) {
        this.menuMusic.stop();
        this.menuMusic.destroy();
        sceneLogger.log('MenuScene', 'MUSIC_STOPPED');
      }
      musicSystem.stop();
      
      // Stop all tweens to prevent them from continuing to render
      this.tweens.killAll();
      sceneLogger.log('MenuScene', 'ALL_TWEENS_STOPPED');
      
      // Test win condition - go directly to end scene with 0 playtime
      this.scene.start('EndScene', { playtime: 0 });
      sceneLogger.log('MenuScene', 'ENDSCENE_STARTED');
      
      // Check scene states after transition
      setTimeout(() => {
        if ((window as any).sceneLogger) {
          (window as any).sceneLogger.checkSceneStates(this.game);
        }
      }, 100);
    } catch (error) {
      sceneLogger.logError('MenuScene', 'TEST_WIN_ERROR', error);
      this.isTransitioning = false;
    }
  }

  private testDeath(): void {
    if (this.isTransitioning) {
      sceneLogger.log('MenuScene', 'TEST_DEATH_BLOCKED', { isTransitioning: this.isTransitioning });
      return;
    }
    
    sceneLogger.logTransition('MenuScene', 'DeathScene', { test: true });
    this.isTransitioning = true;
    
    try {
      // Stop menu music if playing
      if (this.menuMusic) {
        this.menuMusic.stop();
        this.menuMusic.destroy();
        sceneLogger.log('MenuScene', 'MUSIC_STOPPED');
      }
      musicSystem.stop();
      
      // Stop all tweens to prevent them from continuing to render
      this.tweens.killAll();
      sceneLogger.log('MenuScene', 'ALL_TWEENS_STOPPED');
      
      // Test death condition - go directly to death scene
      this.scene.start('DeathScene');
      sceneLogger.log('MenuScene', 'DEATHSCENE_STARTED');
      
      // Check scene states after transition
      setTimeout(() => {
        if ((window as any).sceneLogger) {
          (window as any).sceneLogger.checkSceneStates(this.game);
        }
      }, 100);
    } catch (error) {
      sceneLogger.logError('MenuScene', 'TEST_DEATH_ERROR', error);
      this.isTransitioning = false;
    }
  }

  shutdown(): void {
    MenuSceneDebugger.log('SHUTDOWN_START', {
      meteoritesCount: this.meteorites.length,
      brokenShipsCount: this.brokenShips.length,
      childrenCount: this.children.list.length,
    });
    
    // CRITICAL: Clean up all dynamic objects before shutdown
    this.cleanupArrays();
    
    // Kill all tweens
    this.tweens.killAll();
    
    // Remove all timers
    this.time.removeAllEvents();
    
    // Clean up global keyboard handler
    if ((this as any)._globalKeyHandler) {
      window.removeEventListener('keydown', (this as any)._globalKeyHandler, true);
      (this as any)._globalKeyHandler = undefined;
    }
    
    // Clean up resources
    if (this.menuMusic) {
      this.menuMusic.stop();
      this.menuMusic.destroy();
      this.menuMusic = undefined;
    }
    
    // Clear references to prevent memory leaks
    this.forceFieldGraphics = undefined;
    this.station = undefined;
    this.storyButton = undefined;
    this.titleText = undefined;
    this.storyGlowTexts = [];
    
    // Clear all children
    this.children.removeAll(true);
    
    this.isTransitioning = false;
  }
}


