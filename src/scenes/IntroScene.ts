/**
 * IntroScene - Simple scrolling text story
 */

import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/constants';
import { musicSystem, MusicTheme } from '../systems/MusicSystem';
import { sceneLogger } from '../utils/SceneLogger';
import { KennyEasterEgg } from '../utils/KennyEasterEgg';

interface TextLine {
  text: Phaser.GameObjects.Text;
  baseY: number; // Base Y position for this line
  lineSpacing: number; // Spacing between lines
}

export class IntroScene extends Phaser.Scene {
  private seed: number = GAME_CONFIG.defaultSeed;
  private scrollSpeed: number = 50; // pixels per second
  private textLines: TextLine[] = [];
  private textFinished: boolean = false;
  private pressEnterText?: Phaser.GameObjects.Text;
  private pressEscText?: Phaser.GameObjects.Text;
  private storyMusic?: Phaser.Sound.BaseSound;
  private kennys: Phaser.GameObjects.Container[] = []; // Kenny easter egg
  private kennyKeyboardSetup: boolean = false; // Track if keyboard handler is set up
  private kennyTimer: number = 0;
  private kennySpawned: boolean = false; // Track if auto-spawn happened (60 seconds)

  constructor() {
    super({ key: 'IntroScene' });
  }

  init(data: { seed?: number }): void {
    this.seed = data?.seed ?? GAME_CONFIG.defaultSeed;
  }

  preload(): void {
    // Load custom story music MP3 file if it exists
    // Phaser will gracefully handle if the file doesn't exist
    this.load.audio('storyMusic', 'assets/music/story/Gamenax.mp3');
  }

  create(): void {
    const { width, height } = this.cameras.main;
    
    // Black background
    this.cameras.main.setBackgroundColor(0x000000);
    
    // Try to play custom MP3 music, fallback to procedural music
    try {
      // Check if the audio file was loaded successfully
      if (this.cache.audio.exists('storyMusic')) {
        // Stop procedural music
        musicSystem.stop();
        
        // Play custom MP3 file
        this.storyMusic = this.sound.add('storyMusic', {
          volume: 0.5,
          loop: true,
        });
        this.storyMusic.play();
      } else {
        // Fallback to procedural menu theme
        musicSystem.playTheme(MusicTheme.MENU);
      }
    } catch (error) {
      // Fallback to procedural music
      try {
        musicSystem.playTheme(MusicTheme.MENU);
      } catch (e) {
      }
    }
    
    // Create starfield background with fading stars
    this.createStarfield(width, height);
    
    // Setup Kenny easter egg (only once)
    if (!this.kennyKeyboardSetup) {
      KennyEasterEgg.setupKeyboardHandler(this, width, height, this.kennys);
      this.kennyKeyboardSetup = true;
    }
    
    // Reset Kenny timer when scene is created
    this.kennyTimer = 0;
    this.kennySpawned = false;
    
    // Create text content - split into individual lines
    // Each line is a single line, no word wrapping to avoid block scaling
    const introLines = [
      'A long time ago in a galaxy far, far away…',
      '',
      '',
      'Episode I — The Battle for Synax',
      '',
      '',
      'The peaceful Synax GmbH Space Station,',
      'home to the brilliant minds of the galaxy,',
      'stands as a beacon of innovation and hope.',
      '',
      '',
      'But dark forces have emerged from the void.',
      'Evil enemy fleets, cloaked in shadow,',
      'are closing in to annihilate Synax once and for all.',
      '',
      '',
      'As chaos spreads across the stars,',
      'one pilot rises to answer the call.',
      'The player must race to defend the station,',
      'fighting through waves of enemy ships',
      'to reach the besieged headquarters.',
      '',
      '',
      'It will be a treacherous and heroic journey.',
      'Failure will mean the end of Synax GmbH —',
      'and the fall of everything it stands for.',
    ];
    
    // Create separate text object for each line
    // First, find the longest line to calculate base font size for full width
    const longestLine = introLines.reduce((longest, line) => 
      line.length > longest.length ? line : longest, '');
    
    // Calculate font size needed for longest line to span full width (with some padding)
    // We'll use a test text object to measure, then scale from there
    const testText = this.add.text(0, 0, longestLine, {
      fontSize: '24px',
      fontFamily: 'monospace',
    });
    const testTextWidth = testText.width;
    testText.destroy();
    
    // Calculate base font size so longest line spans ~95% of screen width at scale 1.0
    const targetWidth = width * 0.95;
    const baseFontSize = Math.floor((24 * targetWidth) / testTextWidth);
    
    const lineSpacing = 40; // Spacing between lines
    const startY = height + 100; // Start below screen
    
    introLines.forEach((lineText, index) => {
      // Create text without word wrap - each line is truly a single line
      // Use baseFontSize so longest line will be full width at bottom
      const text = this.add.text(width / 2, 0, lineText, {
        fontSize: `${baseFontSize}px`,
        color: '#ffeb3b', // Yellow color (Star Wars style)
        fontFamily: 'monospace',
        align: 'center',
        // NO word wrap - each line scales as a single line
      });
      text.setOrigin(0.5, 0);
      
      // Calculate base Y position for this line
      const baseY = startY + (index * lineSpacing);
      text.setY(baseY);
      
      // Start with alpha 0, will fade in
      text.setAlpha(0);
      
      // Set initial scale to 1.0 (full size) at bottom
      // The scale will be updated in the update loop based on position
      text.setScale(1.0);
      
      this.textLines.push({
        text: text,
        baseY: baseY,
        lineSpacing: lineSpacing,
      });
    });

    // Fade in all text lines over first 2 seconds
    this.tweens.add({
      targets: this.textLines.map(line => line.text),
      alpha: 1,
      duration: 2000,
      ease: 'Linear',
    });

    // Input handlers
    if (this.input.keyboard) {
      const enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      enterKey.on('down', () => {
        if (this.textFinished) {
          this.startGame();
        }
      });
      
      const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      escKey.on('down', () => {
        this.returnToMenu();
      });
      
      this.input.keyboard.on('keydown-ENTER', () => {
        if (this.textFinished) {
          this.startGame();
        }
      });
      
      this.input.keyboard.on('keydown-ESC', () => {
        this.returnToMenu();
      });
    }

    // Calculate when text will finish scrolling
    // Estimate based on number of lines and spacing
    const totalLines = this.textLines.length;
    const estimatedTextHeight = totalLines * lineSpacing;
    const totalScrollDistance = estimatedTextHeight + height + 200;
    const scrollDuration = (totalScrollDistance / this.scrollSpeed) * 1000;
    
    this.time.delayedCall(scrollDuration, () => {
      this.showPressEnterMessage();
    });
  }

  update(time: number, delta: number): void {
    // Update Kennys
    const { width, height } = this.cameras.main;
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
    
    if (this.textFinished) return;

    // Scroll each line upward continuously with perspective scaling
    const deltaSeconds = delta / 1000;
    const scrollDelta = this.scrollSpeed * deltaSeconds;
    
    this.textLines.forEach((lineData) => {
      const text = lineData.text;
      
      // Update Y position
      lineData.baseY -= scrollDelta;
      text.setY(lineData.baseY);
      
      // Calculate scale and alpha based on Y position (Star Wars perspective effect)
      // Text should stay clearly readable until midpoint, then shrink more quickly
      // Bottom of screen (Y = height): scale = 1.0 (100% width), alpha = 1.0
      // Midpoint (Y = height/2): scale = ~0.85 (85% width, clearly readable), alpha = 1.0
      // Vanishing point (Y = -height): scale = 0.0 (disappears), alpha = 0.0
      const currentY = lineData.baseY;
      
      // Define vanishing point - where text completely disappears (above screen)
      const vanishingPointY = -height; // One screen height above top
      const bottomY = height; // Bottom of screen
      const midpointY = height / 2; // Midpoint of screen
      
      // Normalize Y position: 0 = vanishing point (disappears), 1 = bottom of screen
      // Text can go negative (above screen) to create the disappearing effect
      const totalRange = bottomY - vanishingPointY;
      let normalizedY = (currentY - vanishingPointY) / totalRange;
      
      // Clamp normalized Y between 0 and 1.2 (allow some overshoot for smooth fade)
      normalizedY = Math.max(0, Math.min(1.2, normalizedY));
      
      // Calculate scale with slower shrinking in bottom half
      // At normalizedY = 1.0 (bottom): scale = 1.0
      // At normalizedY = 0.75 (midpoint): scale = ~0.85 (clearly readable)
      // At normalizedY = 0.0 (vanishing point): scale = 0.0
      let scale: number;
      if (normalizedY >= 0.75) {
        // Bottom 25% of range: slow, gentle scaling (1.0 to 0.85)
        const t = (normalizedY - 0.75) / 0.25; // 0 to 1 in bottom quarter
        scale = 0.85 + (1.0 - 0.85) * t; // 0.85 to 1.0
      } else {
        // Top 75% of range: faster scaling (0.85 to 0.0)
        const t = normalizedY / 0.75; // 0 to 1 in top 75%
        // Use exponential curve for perspective effect
        const exponentialT = Math.pow(t, 1.5); // Accelerates as it approaches vanishing point
        scale = 0.0 + (0.85 - 0.0) * exponentialT; // 0.0 to 0.85
      }
      
      // Smooth continuous alpha fade
      // Text stays fully visible until it gets close to vanishing point
      // At normalizedY = 1.0 (bottom): alpha = 1.0
      // At normalizedY = 0.3: alpha starts fading
      // At normalizedY = 0.0 (vanishing point): alpha = 0.0
      let alpha: number;
      if (normalizedY >= 0.3) {
        // Bottom 70%: fully visible
        alpha = 1.0;
      } else {
        // Top 30%: smooth fade to zero
        const t = normalizedY / 0.3; // 0 to 1 in top 30%
        // Smooth fade using ease-out curve
        alpha = Math.pow(t, 1.5); // Fades faster near vanishing point
      }
      
      // Apply scale and alpha to text
      text.setScale(scale);
      text.setAlpha(alpha);
    });
  }

  private createStarfield(width: number, height: number): void {
    // Create multiple layers of stars with different sizes and fade speeds
    const starLayers = [
      { count: 50, size: 1, speed: 0.5, minAlpha: 0.2, maxAlpha: 0.8 }, // Small stars, slow fade
      { count: 30, size: 2, speed: 0.3, minAlpha: 0.3, maxAlpha: 1.0 }, // Medium stars, slower fade
      { count: 15, size: 3, speed: 0.2, minAlpha: 0.4, maxAlpha: 1.0 }, // Large stars, slowest fade
    ];

    starLayers.forEach((layer) => {
      for (let i = 0; i < layer.count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const star = this.add.rectangle(x, y, layer.size, layer.size, 0xffffff);
        star.setAlpha(layer.minAlpha);
        star.setDepth(-100);

        // Create pulsing animation for each star with random delay
        // Stars pulse between minAlpha and maxAlpha
        const delay = Math.random() * 2000; // Random delay 0-2 seconds
        const duration = (Math.random() * 3000 + 2000) / layer.speed; // 2-5 seconds adjusted by speed

        this.tweens.add({
          targets: star,
          alpha: { from: layer.minAlpha, to: layer.maxAlpha },
          duration: duration,
          delay: delay,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      }
    });
  }

  private showPressEnterMessage(): void {
    if (this.textFinished) return;
    
    this.textFinished = true;
    const { width, height } = this.cameras.main;
    
    // Show "Press Enter to Start" message
    this.pressEnterText = this.add.text(width / 2, height / 2 - 20, 'Press Enter to Start', {
      fontSize: '32px',
      color: '#ffeb3b', // Yellow color (matching story text)
      fontFamily: 'monospace',
      align: 'center',
    });
    this.pressEnterText.setOrigin(0.5, 0.5);
    
    // Add Esc to return message
    this.pressEscText = this.add.text(width / 2, height / 2 + 30, 'Press Esc to return to menu', {
      fontSize: '20px',
      color: '#ffeb3b', // Yellow color (matching story text)
      fontFamily: 'monospace',
      align: 'center',
    });
    this.pressEscText.setOrigin(0.5, 0.5);
    
    // Blinking effect for Enter message
    this.tweens.add({
      targets: this.pressEnterText,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private startGame(): void {
    sceneLogger.logTransition('IntroScene', 'GameScene', { seed: this.seed });
    
    try {
      // Stop story music if playing
      if (this.storyMusic) {
        this.storyMusic.stop();
        this.storyMusic.destroy();
        sceneLogger.log('IntroScene', 'MUSIC_STOPPED');
      }
      musicSystem.stop();
      
      const seedToUse = this.seed ?? GAME_CONFIG.defaultSeed;
      
      // Stop all tweens to prevent them from continuing to render
      this.tweens.killAll();
      sceneLogger.log('IntroScene', 'ALL_TWEENS_STOPPED');
      
      this.scene.start('GameScene', { seed: seedToUse });
      sceneLogger.log('IntroScene', 'GAMESCENE_STARTED');
      
      // Check scene states after transition
      setTimeout(() => {
        if ((window as any).sceneLogger) {
          (window as any).sceneLogger.checkSceneStates(this.game);
        }
      }, 100);
    } catch (error) {
      sceneLogger.logError('IntroScene', 'START_GAME_ERROR', error);
    }
  }

  private returnToMenu(): void {
    sceneLogger.logTransition('IntroScene', 'MenuScene');
    
    try {
      // Stop story music if playing
      if (this.storyMusic) {
        this.storyMusic.stop();
        this.storyMusic.destroy();
        this.storyMusic = undefined;
        sceneLogger.log('IntroScene', 'MUSIC_STOPPED');
      }
      
      // Stop procedural music
      musicSystem.stop();
      
      // Stop all other music sounds to ensure clean audio state
      const allSounds = this.sound.sounds;
      allSounds.forEach((sound) => {
        if (sound.key === 'storyMusic' || sound.key === 'menuMusic' || 
            sound.key === 'gameplayMusic' || sound.key === 'victoryMusic' || 
            sound.key === 'gameOverMusic') {
          sound.stop();
          sound.destroy();
        }
      });
      
      // Stop all tweens to prevent them from continuing to render
      this.tweens.killAll();
      sceneLogger.log('IntroScene', 'ALL_TWEENS_STOPPED');
      
      // Log transition
      import('../utils/MenuSceneDebugger').then(({ MenuSceneDebugger }) => {
        MenuSceneDebugger.logTransition('IntroScene', 'MenuScene', {
          sceneActive: this.scene.isActive(),
        });
      });
      
      // CRITICAL: Stop MenuScene first if it's running, then start it fresh
      // This ensures a clean restart
      if (this.scene.isActive('MenuScene')) {
        this.scene.stop('MenuScene');
        sceneLogger.log('IntroScene', 'MENUSCENE_STOPPED_BEFORE_RESTART');
      }
      
      // Use scene.start() to restart MenuScene
      // MenuScene will wait for renderer to be ready in its create() method
      this.scene.start('MenuScene');
      sceneLogger.log('IntroScene', 'MENUSCENE_STARTED');
      
      // Check scene states after transition
      setTimeout(() => {
        if ((window as any).sceneLogger) {
          (window as any).sceneLogger.checkSceneStates(this.game);
        }
      }, 100);
    } catch (error) {
      sceneLogger.logError('IntroScene', 'RETURN_TO_MENU_ERROR', error);
    }
  }
}
