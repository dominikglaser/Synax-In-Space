/**
 * GameScene - Main game loop
 */

import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/constants';
import { BALANCER, WEAPON_SPECS } from '../systems/Balancer';
import { RNG } from '../systems/RNG';
import { audioSystem } from '../systems/AudioSystem';
import { musicSystem, MusicTheme } from '../systems/MusicSystem';
import { createParallaxStarfield } from '../systems/Starfield';
import { BulletMLRunner } from '../systems/BulletMLRunner';
import { Pools } from '../systems/Pools';
import { Effects } from '../systems/Effects';
import { InputSystem } from '../systems/InputSystem';
import { SpawnerSystem } from '../systems/SpawnerSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { ParallaxSystem } from '../systems/ParallaxSystem';
import { ShadowSystem } from '../systems/ShadowSystem';
import { DepthOfFieldSystem } from '../systems/DepthOfFieldSystem';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { Enemy } from '../entities/Enemy';
import { PowerUp } from '../entities/PowerUp';
import { Boss } from '../entities/Boss';
import type { GameState } from '../types';
import { getKenneySprite } from '../config/AssetMappings';
import { sceneLogger } from '../utils/SceneLogger';
import { browserLogger } from '../utils/BrowserLogger';
import { getGodMode } from './MenuScene';

export class GameScene extends Phaser.Scene {
  private rng!: RNG;
  private player!: Player;
  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private powerUps: PowerUp[] = [];
  private boss: Boss | null = null;
  private pools!: Pools;
  private effects!: Effects;
  private inputSystem!: InputSystem;
  private spawnerSystem!: SpawnerSystem;
  private collisionSystem!: CollisionSystem;
  private parallaxSystem!: ParallaxSystem;
  private shadowSystem!: ShadowSystem;
  private depthOfFieldSystem!: DepthOfFieldSystem;
  private gameState: GameState = {
    score: 0,
    lives: BALANCER.playerLives,
    weaponTier: 0,
    bombs: BALANCER.bombsStart,
    shields: 1,
    stageTime: 0,
    bossActive: false,
    paused: false,
  };
  private fireTimer: number = 0;
  private stageStartTime: number = 0;
  private hudScene!: Phaser.Scene;
  private scrollingPaused: boolean = false;
  private bossPosition: number = 0;
  private bossTimer: number = 0; // Timer for boss spawns (pauses during boss fight)
  private bossCount: number = 0; // Track which boss number (1st, 2nd, 3rd, etc.)
  private spawnTimer: number = 0; // Separate timer for enemy spawning (never pauses, always runs)
  private lastSpawnCheckTime: number = 0; // Track last spawn check time to avoid duplicates
  private spawnRateMultiplier: number = 1.0; // Multiplier for enemy spawn rate (increases after each boss)
  private spawnCountMultiplier: number = 1.0; // Multiplier for number of enemies per spawn (increases every 15s)
  private lastSpawnCountIncreaseTime: number = 0; // Track when spawn count was last increased
  private gameOverTriggered: boolean = false; // Flag to prevent multiple game over calls
  private debugAfterFirstBoss: boolean = false; // Flag for debug mode starting after first boss
  private gameplayMusic?: Phaser.Sound.BaseSound;
  private isTransitioning: boolean = false; // Flag to prevent duplicate transitions

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Load custom gameplay music MP3 file if it exists
    // Phaser will gracefully handle if the file doesn't exist
    this.load.audio('gameplayMusic', 'assets/music/gameplay/Gamenax title screen (2).mp3');
  }

  init(data: { seed?: number; afterFirstBoss?: boolean }): void {
    sceneLogger.log('GameScene', 'INIT', { seed: data?.seed, afterFirstBoss: data?.afterFirstBoss });
    const seed = data?.seed ?? GAME_CONFIG.defaultSeed;
    this.rng = new RNG(seed);
    this.debugAfterFirstBoss = data?.afterFirstBoss ?? false;
    this.isTransitioning = false;
    this.gameOverTriggered = false;
    
    if (this.debugAfterFirstBoss) {
      // Start game after first boss defeat
      // First boss was defeated, so we're waiting for second boss
      this.stageStartTime = 50000; // 50 seconds (first boss spawn time)
      this.bossTimer = 0; // Reset timer, will count to 60 for second boss
      this.bossCount = 1; // First boss was spawned and defeated
      this.lastSpawnCheckTime = 0;
      this.spawnRateMultiplier = 1.5; // Increased after first boss
      this.spawnCountMultiplier = 1.0; // Reset for second phase
      this.lastSpawnCountIncreaseTime = 0;
    } else {
      // Normal game start
    this.stageStartTime = 0;
    this.bossTimer = 0;
    this.bossCount = 0;
    this.spawnTimer = 0;
    this.lastSpawnCheckTime = 0;
      this.spawnRateMultiplier = 1.0;
      this.spawnCountMultiplier = 1.0;
      this.lastSpawnCountIncreaseTime = 0;
    }
    
    // Set weapon tier to max (6) in debug mode
    const maxWeaponTier = 6;
    const weaponTier = this.debugAfterFirstBoss ? maxWeaponTier : 0;
    
    this.gameState = {
      score: 0,
      lives: BALANCER.playerLives,
      weaponTier: weaponTier,
      bombs: BALANCER.bombsStart,
      shields: 1,
      stageTime: this.stageStartTime / 1000,
      bossActive: false,
      paused: false,
    };
    this.gameOverTriggered = false;
  }

  create(): void {
    try {
      sceneLogger.log('GameScene', 'CREATE_START', { 
        sceneState: this.scene.isActive() ? 'ACTIVE' : 'INACTIVE',
        scenePaused: this.scene.isPaused() ? 'PAUSED' : 'RUNNING',
        sceneVisible: this.scene.isVisible(),
        existingObjects: {
          player: !!this.player,
          bullets: this.bullets.length,
          enemies: this.enemies.length,
          powerUps: this.powerUps.length,
          boss: !!this.boss,
        }
      });
      
      // Ensure camera is visible
      this.cameras.main.setVisible(true);
      sceneLogger.log('GameScene', 'CAMERA_VISIBLE');
    
    // CRITICAL: Clean up any leftover objects from previous game session
    // This is important when restarting the scene
    
    // Clean up systems first (they might have references to game objects)
    if (this.parallaxSystem && typeof (this.parallaxSystem as any).destroy === 'function') {
      try {
        (this.parallaxSystem as any).destroy();
      } catch (e) {
      }
    }
    
    if (this.player) {
      sceneLogger.log('GameScene', 'CLEANUP_OLD_PLAYER');
      this.player.destroy();
      this.player = undefined as any;
    }
    
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      if (bullet && bullet.active) {
        bullet.destroy();
      }
    }
    this.bullets = [];
    
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy && enemy.active) {
        enemy.destroy();
      }
    }
    this.enemies = [];
    
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      if (powerUp && powerUp.active) {
        powerUp.destroy();
      }
    }
    this.powerUps = [];
    
    if (this.boss) {
      this.boss.destroy();
      this.boss = null;
    }
    
    // Kill all tweens from previous session
    this.tweens.killAll();
    this.time.removeAllEvents();
    
    // Clear all children from display list
    this.children.removeAll(true);
    
    // Ensure camera is visible
    this.cameras.main.setVisible(true);
    sceneLogger.log('GameScene', 'CLEANUP_COMPLETE_CAMERA_VISIBLE');
    
    // Initialize audio
    audioSystem.init();
    
    // Stop any existing music first (procedural or MP3)
    // This ensures we don't have multiple music sources playing
    musicSystem.stop();
    
    // Stop and destroy any existing gameplay music if it exists
    if (this.gameplayMusic) {
      this.gameplayMusic.stop();
      this.gameplayMusic.destroy();
      this.gameplayMusic = undefined;
    }
    
    // Stop any other music sounds that might be playing (but not sound effects)
    // Get all sounds and stop only the ones that are music
    const allSounds = this.sound.sounds;
    allSounds.forEach((sound) => {
      if (sound.key === 'gameplayMusic' || sound.key === 'menuMusic' || 
          sound.key === 'victoryMusic' || sound.key === 'gameOverMusic' || 
          sound.key === 'storyMusic') {
        sound.stop();
      }
    });
    
    // Try to play custom MP3 music, fallback to procedural music
    try {
      // Check if the audio file was loaded successfully
      if (this.cache.audio.exists('gameplayMusic')) {
        // Ensure procedural music is stopped before playing MP3
        musicSystem.stop();
        
        // Play custom MP3 file
        this.gameplayMusic = this.sound.add('gameplayMusic', {
          volume: 0.5,
          loop: true,
        });
        this.gameplayMusic.play();
      } else {
        // Fallback to procedural gameplay theme
        // Ensure no MP3 music is playing
        if (this.gameplayMusic) {
          this.gameplayMusic.stop();
          this.gameplayMusic.destroy();
          this.gameplayMusic = undefined;
        }
        musicSystem.playTheme(MusicTheme.GAMEPLAY);
      }
    } catch (error) {
      // Fallback to procedural music
      try {
        musicSystem.playTheme(MusicTheme.GAMEPLAY);
      } catch (e) {
      }
    }

    // Launch HUD scene
    this.scene.launch('HUDScene');

    // Initialize systems (recreate them to ensure clean state)
    this.pools = new Pools();
    this.effects = new Effects(this);
    this.inputSystem = new InputSystem(this);
    this.spawnerSystem = new SpawnerSystem(this.rng);
    this.collisionSystem = new CollisionSystem();
    // Create new parallax system instance to ensure clean state
    this.parallaxSystem = new ParallaxSystem();
    this.shadowSystem = new ShadowSystem(this);
    this.depthOfFieldSystem = new DepthOfFieldSystem(this);

    // Create parallax backgrounds (rng is passed via scene for meteorite generation)
    (this as any).rng = this.rng;
    
    // Ensure renderer is ready before creating parallax layers
    // Use a small delay to ensure the scene is fully initialized
    this.time.delayedCall(50, () => {
      try {
        this.parallaxSystem.createLayers(this, this.shadowSystem, this.depthOfFieldSystem);
      } catch (e) {
        sceneLogger.logError('GameScene', 'PARALLAX_CREATE_ERROR', e);
      }
    });

    // Create player
    const { width, height } = this.cameras.main;
    this.player = new Player(this, 100, height / 2);
    this.player.setDepth(10);
    
    // In debug mode, set player to max weapon tier
    if (this.debugAfterFirstBoss) {
      const maxWeaponTier = 6;
      this.player.weaponTier = maxWeaponTier;
      this.gameState.weaponTier = maxWeaponTier;
    }
    
    // Add player to shadow system (not depth of field - player should always be in focus)
    this.shadowSystem.addCaster(this.player);

    // Get HUD scene reference
    this.hudScene = this.scene.get('HUDScene');
    this.updateHUD();

    // Set up camera
    this.cameras.main.setBounds(0, 0, width * 2, height);
    // Ensure camera starts at scroll position (0, 0) to prevent drift
    this.cameras.main.setScroll(0, 0);
    
      sceneLogger.log('GameScene', 'CREATE_COMPLETE');
      
      // Log Phaser game state
      browserLogger.logPhaserEvent('GameScene created', {
        renderer: this.game.renderer.type,
        width: this.game.scale.width,
        height: this.game.scale.height,
        isWebGL: this.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer,
      });
      
      // Log WebGL info if available
      if (this.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
        const gl = this.game.renderer.gl;
        if (gl) {
          browserLogger.logWebGLInfo({
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            version: gl.getParameter(gl.VERSION),
            shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
          });
        }
      }
    } catch (error) {
      sceneLogger.logError('GameScene', 'CREATE_FATAL_ERROR', error);
      // Don't show error message on screen - errors are logged to console for debugging
      // If there's a critical error, the scene won't work anyway, so showing an error
      // message on screen is confusing for users
    }
  }

  update(time: number, delta: number): void {
    // Log if update is called when scene should be transitioning
    if (this.isTransitioning || this.gameOverTriggered) {
      sceneLogger.log('GameScene', 'UPDATE_WHILE_TRANSITIONING', {
        isTransitioning: this.isTransitioning,
        gameOverTriggered: this.gameOverTriggered,
        sceneActive: this.scene.isActive(),
        scenePaused: this.scene.isPaused(),
        delta: delta,
      });
    }
    
    if (this.gameState.paused) {
      return;
    }

    // Update stage time
    this.stageStartTime += delta;
    this.gameState.stageTime = this.stageStartTime / 1000;

    // Update boss timer (only if not in boss fight)
    // Ensure delta is valid (normal range is 0-100ms, but allow up to 1000ms for first frame)
    if (!this.gameState.bossActive && delta > 0) {
      this.bossTimer += delta / 1000; // Convert to seconds
    }

    // Update spawn timer (ALWAYS runs, never pauses - enemies spawn continuously except during boss fights)
    if (delta > 0) {
      this.spawnTimer += delta / 1000; // Convert to seconds
    }

    // Update effects
    this.effects.update(time, delta);

    // Handle input
    const input = this.inputSystem.getInputState();

    // Pause
    if (this.inputSystem.isPauseJustPressed()) {
      this.pause();
      return;
    }

    // Update player
    this.updatePlayer(input, delta);
    this.player.update(delta);

    // Spawn enemies
    this.updateSpawning();

    // Update entities
    this.updateBullets(delta);
    this.updateEnemies(delta);
    this.updatePowerUps(delta);
    if (this.boss) {
      this.updateBoss(delta);
    }

    // Update parallax (only if not paused for boss fight)
    if (this.parallaxSystem && !this.scrollingPaused) {
      this.parallaxSystem.update(delta);
    }

    // Update shadow and depth of field systems (check if initialized)
    if (this.shadowSystem) {
      try {
        this.shadowSystem.update();
      } catch (e) {
        sceneLogger.logError('GameScene', 'SHADOW_SYSTEM_UPDATE_ERROR', e);
      }
    }
    if (this.depthOfFieldSystem) {
      try {
        this.depthOfFieldSystem.update();
      } catch (e) {
        sceneLogger.logError('GameScene', 'DEPTH_OF_FIELD_UPDATE_ERROR', e);
      }
    }

    // Check collisions
    this.checkCollisions();

    // Update HUD
    this.updateHUD();

    // Check game over
    if (!this.player.isAlive() && !this.gameOverTriggered) {
      this.gameOver();
    }
  }

  private updatePlayer(input: ReturnType<InputSystem['getInputState']>, delta: number): void {
    const deltaSeconds = delta / 1000;
    const speed = this.player.speed * deltaSeconds;

    // Movement
    if (input.left) {
      this.player.x -= speed;
    }
    if (input.right) {
      this.player.x += speed;
    }
    if (input.up) {
      this.player.y -= speed;
    }
    if (input.down) {
      this.player.y += speed;
    }

    // Clamp to screen bounds - account for sprite size
    const { width, height } = this.cameras.main;
    const playerHalfWidth = this.player.displayWidth / 2;
    const playerHalfHeight = this.player.displayHeight / 2;
    
    // During boss fight, prevent player from moving past boss
    if (this.gameState.bossActive && this.bossPosition > 0) {
      // Clamp x to keep sprite fully on screen, but also respect boss boundary
      const maxX = Math.min(this.bossPosition - 150, width - playerHalfWidth);
      this.player.x = Math.max(playerHalfWidth, Math.min(maxX, this.player.x));
    } else {
      // Clamp x so sprite stays fully within screen (left edge >= 0, right edge <= width)
      this.player.x = Math.max(playerHalfWidth, Math.min(width - playerHalfWidth, this.player.x));
    }
    
    // Clamp y so sprite stays fully within screen (top edge >= 0, bottom edge <= height)
    this.player.y = Math.max(playerHalfHeight, Math.min(height - playerHalfHeight, this.player.y));

    // Firing
    if (input.fire) {
      this.player.addChargeTime(delta);
      this.fireTimer += delta;
      const weaponSpec = this.player.getWeaponSpec();
      const fireInterval = 1000 / weaponSpec.fireRate;

      if (this.fireTimer >= fireInterval) {
        this.fireTimer = 0;
        this.fireBullets(weaponSpec, this.player.isChargeShotReady());
        if (this.player.isChargeShotReady()) {
          this.player.resetChargeTime();
        }
      }
    } else {
      this.player.resetChargeTime();
      this.fireTimer = 0;
    }

    // Bomb
    if (this.inputSystem.isBombJustPressed()) {
      this.useBomb();
    }
    
    // Shield
    if (this.inputSystem.isShieldJustPressed()) {
      this.useShield();
    }
  }

  private fireBullets(weaponSpec: typeof WEAPON_SPECS[0], isCharged: boolean): void {
    const damage = isCharged ? weaponSpec.damage * BALANCER.chargeShotDamage : weaponSpec.damage;
    const bulletSpeed = weaponSpec.bulletSpeed;
    const count = isCharged ? weaponSpec.bulletCount * 2 : weaponSpec.bulletCount;
    const spread = isCharged ? weaponSpec.spreadAngle * 1.5 : weaponSpec.spreadAngle;

    // Play sound once per shot, not once per bullet (prevents volume increase with weapon upgrades)
    audioSystem.playPew();

    // Try to use Kenney bullet sprite if available
    let bulletTexture = 'bullet-player';
    let bulletFrame: string | undefined = undefined;
    
    if (this.textures.exists('game')) {
      const atlas = this.textures.get('game');
      const kenneyBullet = getKenneySprite('playerBullet', 0);
      if (atlas.has(kenneyBullet)) {
        bulletTexture = 'game';
        bulletFrame = kenneyBullet;
      }
    }

    for (let i = 0; i < count; i++) {
      let angleOffset = 0;
      
      if (count === 1) {
        // Single bullet always goes straight
        angleOffset = 0;
      } else {
        // Multiple bullets: always have one straight (at index 0), others spread around it
        if (i === 0) {
          // First bullet always goes straight
          angleOffset = 0;
        } else {
          // Distribute remaining bullets evenly around the straight one
          // For 2 bullets: [straight, +spread/2]
          // For 3 bullets: [straight, -spread/2, +spread/2]
          // For 4 bullets: [straight, -spread/3, +spread/3, +spread*2/3]
          const spreadRad = (spread / 180) * Math.PI;
          const totalSpread = spreadRad * 0.5; // Half spread on each side
          const numSideBullets = count - 1;
          
          // Distribute from -totalSpread to +totalSpread
          if (numSideBullets === 1) {
            // Only one side bullet
            angleOffset = totalSpread;
          } else {
            // Multiple side bullets: distribute evenly
            const t = (i - 1) / (numSideBullets - 1); // 0 to 1
            angleOffset = -totalSpread + t * (totalSpread * 2);
          }
        }
      }
      
      const bullet = new Bullet(this, this.player.x, this.player.y, bulletTexture, true, bulletFrame);
      bullet.init(
        this.player.x,
        this.player.y,
        angleOffset,
        bulletSpeed,
        damage
      );

      if (isCharged) {
        bullet.setScale(BALANCER.chargeShotSize);
      }

      this.bullets.push(bullet);
    }
  }

  private updateSpawning(): void {
    // Simple rule: Enemies ALWAYS spawn EXCEPT when a boss is on screen
    // After second boss defeat, game ends (bossCount >= 2)
    
    // FIRST: Check if a boss should spawn (do this before enemy spawning to prevent same-frame spawning)
    // Spawn boss based on boss count and timer
    // First boss: spawn at 50 seconds
    // Second boss: spawn at 60 seconds (timer resets to 0 after first boss defeat)
    if (!this.gameState.bossActive && this.boss === null) {
      let shouldSpawn = false;
      let bossInterval = 0;
      
      if (this.bossCount === 0) {
        // Waiting for first boss - spawn at 50 seconds
        bossInterval = 50;
        // Spawn when timer reaches or exceeds 50 seconds
        shouldSpawn = this.bossTimer >= bossInterval;
      } else if (this.bossCount === 1) {
        // Waiting for second boss - spawn at 60 seconds
        bossInterval = 60;
        // Spawn when timer reaches or exceeds 60 seconds
        shouldSpawn = this.bossTimer >= bossInterval;
      }
      
      if (shouldSpawn) {
        const { width, height } = this.cameras.main;
        const bossX = width - 200; // Position boss on right side
        this.bossPosition = bossX;
        
        // Calculate boss HP: first boss = baseHP * 6 (doubled), second boss = baseHP * 18 (tripled)
        const baseHP = BALANCER.bossHP;
        const bossHP = this.bossCount === 0 ? baseHP * 6 : baseHP * 18;
        
        this.boss = new Boss(this, bossX, height / 2, this.rng);
        this.boss.maxHp = bossHP;
        this.boss.init(bossX, height / 2);
        this.gameState.bossActive = true;
        this.scrollingPaused = true;
        this.bossCount++;
        // Return immediately after spawning boss to prevent enemies from spawning in same frame
        return;
      }
    }
    
    // Don't spawn during boss fights or after second boss defeat
    // Check both bossActive flag AND if boss object exists
    if (this.gameState.bossActive || this.boss !== null || this.bossCount >= 2) {
      return;
    }
    
    // Determine which phase we're in for multiplier tracking
    const isPhase1 = this.bossCount === 0;
    const currentPhaseTime = this.bossTimer; // Use bossTimer which resets after first boss
    
    // Increase spawn count multiplier every 15 seconds (based on phase time)
    const timeSinceLastIncrease = currentPhaseTime - this.lastSpawnCountIncreaseTime;
    if (timeSinceLastIncrease >= 15) {
      this.spawnCountMultiplier *= 1.5;
      this.lastSpawnCountIncreaseTime = currentPhaseTime;
    }
    
    // Spawn enemies from schedule based on current phase time
    // Use bossTimer which resets after first boss, so:
    // Phase 1: 0-50s (bossTimer)
    // Phase 2: 0-60s (bossTimer resets to 0)
    const scaledPhaseTime = currentPhaseTime * this.spawnRateMultiplier;
    const scaledLastCheckTime = this.lastSpawnCheckTime * this.spawnRateMultiplier;
    
    // Check for spawns that should occur between last check and now
    // Enemies spawn continuously - no time limit, only pause during boss fights
    for (const spawn of BALANCER.spawnSchedule) {
      // Scale spawn time by multiplier
      const scaledSpawnTime = spawn.time / this.spawnRateMultiplier;
      
      // Check if this spawn should occur now
      // Handle timer reset (when bossTimer < lastSpawnCheckTime, timer was reset)
      const hasTimerReset = this.bossTimer < this.lastSpawnCheckTime;
      let shouldSpawn = false;
      
      if (hasTimerReset) {
        // Timer was reset (phase transition) - spawn everything from 0 to current time
        shouldSpawn = scaledSpawnTime <= scaledPhaseTime && scaledSpawnTime >= 0;
      } else {
        // Normal case - spawn if time has passed since last check
        // For phase 2, continue spawning beyond 60s by looping the schedule
        // If we're past the schedule, repeat it
        if (!isPhase1 && scaledPhaseTime > 69.5 / this.spawnRateMultiplier) {
          // Phase 2 and past schedule end - loop the schedule
          const scheduleEnd = 69.5 / this.spawnRateMultiplier;
          const loopTime = scaledPhaseTime % scheduleEnd;
          const loopLastCheck = scaledLastCheckTime % scheduleEnd;
          shouldSpawn = scaledSpawnTime > loopLastCheck && scaledSpawnTime <= loopTime;
        } else {
          // Normal case - spawn if time has passed since last check
          shouldSpawn = scaledSpawnTime > scaledLastCheckTime && scaledSpawnTime <= scaledPhaseTime;
        }
      }
      
      if (shouldSpawn) {
        // Spawn multiple enemies based on spawn count multiplier
        const baseCount = 1;
        const totalCount = Math.max(1, Math.round(baseCount * this.spawnCountMultiplier));
        
        // Use wider Y range to ensure enemies spawn across the full screen height
        const margin = 80; // Margin from top and bottom
        
        for (let i = 0; i < totalCount; i++) {
          // Slightly vary spawn position to avoid exact overlaps
          const xOffset = (i - (totalCount - 1) / 2) * 20; // Spread enemies horizontally
          const y = spawn.y ?? this.spawnerSystem.getRandomSpawnY(margin, this.cameras.main.height - margin);
          const enemy = new Enemy(this, spawn.x + xOffset, y, spawn.enemyType, this.rng);
          enemy.init(spawn.x + xOffset, y);
          enemy.setDepth(5);
          this.enemies.push(enemy);
          
          // Add enemy to shadow system (not depth of field - enemies should always be in focus)
          this.shadowSystem.addCaster(enemy);
        }
      }
    }
    
    // Update spawn check time (use phase time from bossTimer)
    this.lastSpawnCheckTime = currentPhaseTime;
  }

  private updateBullets(delta: number): void {
    const deltaSeconds = delta / 1000;
    
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      if (bullet.active) {
        bullet.update(delta);
        
        // Scroll enemy bullets with level (only if scrolling is active)
        if (!this.scrollingPaused && !bullet.isPlayerBullet) {
          bullet.x -= BALANCER.scrollSpeed * deltaSeconds;
        }
      } else {
        this.bullets.splice(i, 1);
        bullet.destroy();
      }
    }
  }

  private updateEnemies(delta: number): void {
    const deltaSeconds = delta / 1000;
    
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]!;
      if (enemy.active) {
        // Scroll enemies with level (only if scrolling is active)
        // Chaser enemies that have reached the edge control their own movement
        if (!this.scrollingPaused && !(enemy.enemyType === 'chaser' && enemy.reachedEdge)) {
          enemy.x -= BALANCER.scrollSpeed * deltaSeconds;
        }
        
        const updateResult = enemy.update(delta, this.player.x, this.player.y);
        
        // Handle explosion for chasers that return to edge
        if (updateResult === 'explode') {
          this.explodeEnemy(enemy);
          this.shadowSystem.removeCaster(enemy);
          this.enemies.splice(i, 1);
          enemy.destroy();
          continue;
        }
        
        // Remove enemies that have gone off the left edge
        if (enemy.x < -50) {
          enemy.setActive(false);
          enemy.setVisible(false);
          this.shadowSystem.removeCaster(enemy);
          this.enemies.splice(i, 1);
          enemy.destroy();
          continue;
        }
        
        if (updateResult === true) {
          this.enemyFire(enemy);
        }
      } else {
        this.shadowSystem.removeCaster(enemy);
        this.depthOfFieldSystem.removeObject(enemy);
        this.enemies.splice(i, 1);
        enemy.destroy();
      }
    }
  }

  private enemyFire(enemy: Enemy): void {
    const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
    
    // Try to use Kenney bullet sprite if available
    let bulletTexture = 'bullet-enemy';
    let bulletFrame: string | undefined = undefined;
    
    if (this.textures.exists('game')) {
      const atlas = this.textures.get('game');
      const kenneyBullet = getKenneySprite('enemyBullet', 0);
      if (atlas.has(kenneyBullet)) {
        bulletTexture = 'game';
        bulletFrame = kenneyBullet;
      }
    }
    
    const bullet = new Bullet(this, enemy.x, enemy.y, bulletTexture, false, bulletFrame);
    bullet.init(enemy.x, enemy.y, angle, BALANCER.enemyBulletSpeed, BALANCER.bulletDamage);
    this.bullets.push(bullet);
  }

  /**
   * Handle enemy explosion when chaser returns to edge after backtracking
   */
  private explodeEnemy(enemy: Enemy): void {
    const explosionRadius = 100; // Small explosion radius
    const explosionDamage = BALANCER.bulletDamage * 3; // Damage for explosion
    
    // Visual explosion effect
    this.effects.explosion(this, enemy.x, enemy.y, 0xff0000);
    audioSystem.playBoom();
    
    // Check if player is in explosion radius
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist <= explosionRadius) {
      // Player takes damage from explosion (unless god mode is enabled)
      if (!getGodMode()) {
        this.player.takeDamage();
        this.effects.hitFlash(this.player);
        this.effects.shake(BALANCER.shakeIntensity * 2, BALANCER.shakeDuration * 2);
        audioSystem.playHit();
      }
      
      if (!this.player.isAlive()) {
        this.effects.explosion(this, this.player.x, this.player.y);
        audioSystem.playBoom();
      }
    }
    
    // Clear bullets in explosion radius
    const clearedBullets = this.collisionSystem.getBulletsInRadius(
      enemy.x,
      enemy.y,
      explosionRadius,
      this.bullets
    );
    
    for (const bullet of clearedBullets) {
      bullet.setActive(false);
    }
  }

  private updatePowerUps(delta: number): void {
    const deltaSeconds = delta / 1000;
    
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      if (powerUp.active) {
        powerUp.update(delta);
        
        // Scroll power-ups with level (only if scrolling is active)
        if (!this.scrollingPaused) {
          powerUp.x -= BALANCER.scrollSpeed * deltaSeconds;
        }
      } else {
        this.powerUps.splice(i, 1);
        powerUp.destroy();
      }
    }
  }

  private updateBoss(delta: number): void {
    if (!this.boss || !this.boss.active) {
      return;
    }

    const shouldFire = this.boss.update(delta, this.player.x, this.player.y);
    if (shouldFire) {
      const patterns = this.boss.getFirePattern(this.player.x, this.player.y);
      for (const pattern of patterns) {
        const bullet = new Bullet(this, this.boss.x, this.boss.y, 'bullet-enemy', false);
        bullet.init(this.boss.x, this.boss.y, pattern.angle, pattern.speed, BALANCER.bulletDamage * 2);
        this.bullets.push(bullet);
      }
    }

    if (!this.boss.isAlive()) {
      this.gameState.score += BALANCER.scorePerKill.boss;
      this.effects.explosion(this, this.boss.x, this.boss.y);
      audioSystem.playBoom();
      this.boss.destroy();
      this.boss = null;
      this.gameState.bossActive = false;
      this.scrollingPaused = false; // Resume scrolling after boss defeat
      this.bossPosition = 0;
      
      // Check if second boss defeated (bossCount === 2 means second boss defeated)
      // bossCount increments AFTER boss spawn, so:
      // - First boss spawns: bossCount 0 -> 1, defeat: bossCount = 1
      // - Second boss spawns: bossCount 1 -> 2, defeat: bossCount = 2
      if (this.bossCount === 2) {
        // Game won! Transition to end scene
        // Prevent multiple calls
        if (this.gameOverTriggered || this.isTransitioning) {
          sceneLogger.log('GameScene', 'VICTORY_TRANSITION_BLOCKED', { 
            gameOverTriggered: this.gameOverTriggered, 
            isTransitioning: this.isTransitioning 
          });
          return;
        }
        
        sceneLogger.logTransition('GameScene', 'EndScene', { 
          playtime: this.gameState.stageTime,
          bossCount: this.bossCount 
        });
        
        this.gameOverTriggered = true;
        this.isTransitioning = true;
        
        try {
          // Pause the scene first to stop updates
          this.scene.pause();
          sceneLogger.log('GameScene', 'PAUSED');
          
          // Stop HUD scene before transitioning
          this.scene.stop('HUDScene');
          sceneLogger.log('GameScene', 'HUD_STOPPED');
          
          // Stop gameplay music immediately - don't fade, just stop
          if (this.gameplayMusic) {
            this.gameplayMusic.stop();
            this.gameplayMusic.destroy();
            this.gameplayMusic = undefined;
            sceneLogger.log('GameScene', 'MUSIC_STOPPED');
          }
          
          // Stop procedural music
          musicSystem.stop();
          
          // Stop all sounds from this scene to prevent them from continuing
          this.sound.stopAll();
          
          // Stop all tweens to prevent them from continuing to render
          this.tweens.killAll();
          sceneLogger.log('GameScene', 'ALL_TWEENS_STOPPED');
          
          // Transition immediately - don't delay the scene change
          // The new scene will handle its music fade-in
          this.scene.start('EndScene', { playtime: this.gameState.stageTime });
          sceneLogger.log('GameScene', 'ENDSCENE_STARTED');
        } catch (error) {
          sceneLogger.logError('GameScene', 'VICTORY_TRANSITION_ERROR', error);
          this.isTransitioning = false;
          this.gameOverTriggered = false;
        }
        return;
      }
      
      // After first boss defeat, reset timer to 0 and start counting for second boss
      if (this.bossCount === 1) {
        this.bossTimer = 0;
        this.lastSpawnCheckTime = 0;
        this.lastSpawnCountIncreaseTime = 0;
      }
      
      this.spawnRateMultiplier *= 1.5; // Increase spawn rate by 1.5x after each boss
    }
  }

  private checkCollisions(): void {
    // Cache filtered bullet arrays once per frame to avoid repeated filtering
    const enemyBullets = this.bullets.filter((b) => !b.isPlayerBullet);
    const playerBullets = this.bullets.filter((b) => b.isPlayerBullet);
    const activeEnemyBullets = enemyBullets.filter((b) => b.active);
    const activePlayerBullets = playerBullets.filter((b) => b.active);
    const activeEnemies = this.enemies.filter((e) => e.active);
    
    // Shield vs enemy bullets (check shield first, before player)
    if (this.player.isShielded) {
      const shieldHitBullets = this.collisionSystem.checkShieldBulletCollision(
        this.player,
        enemyBullets
      );
      for (const bullet of shieldHitBullets) {
        // Create explosion effect at bullet position
        this.effects.explosion(this, bullet.x, bullet.y, 0x00ffff);
        bullet.setActive(false);
        // Visual effect for bullet hitting shield
        this.effects.hitFlash(this.player);
      }
    }

    // Player vs enemy bullets (only check if not shielded)
    const hitBullet = this.collisionSystem.checkPlayerBulletCollision(
      this.player,
      activeEnemyBullets
    );
    if (hitBullet) {
      // Create explosion effect at bullet position
      this.effects.explosion(this, hitBullet.x, hitBullet.y, 0xff0000);
      hitBullet.setActive(false);
      // Player takes damage (unless god mode is enabled)
      if (!getGodMode()) {
        this.player.takeDamage();
        this.effects.hitFlash(this.player);
        this.effects.shake();
        audioSystem.playHit();
        if (!this.player.isAlive()) {
          this.effects.explosion(this, this.player.x, this.player.y);
          audioSystem.playBoom();
        }
      }
    }

    // Player bullets vs enemies
    const { width, height } = this.cameras.main;
    let collision = this.collisionSystem.checkBulletEnemyCollision(
      playerBullets,
      this.enemies,
      width,
      height
    );
    while (collision) {
      // Create explosion effect at bullet impact point (always, not just when enemy dies)
      this.effects.explosion(this, collision.bullet.x, collision.bullet.y, 0x00ffff);
      collision.bullet.setActive(false);
      const dead = collision.enemy.takeDamage(collision.bullet.damage);
      this.effects.hitFlash(collision.enemy);

      if (dead) {
        this.gameState.score += BALANCER.scorePerKill[collision.enemy.enemyType as keyof typeof BALANCER.scorePerKill] ?? 100;
        // Create larger explosion when enemy dies
        this.effects.explosion(this, collision.enemy.x, collision.enemy.y);
        audioSystem.playBoom();

        // Check for power-up drop
        const dropType = collision.enemy.shouldDropPowerUp();
        if (dropType) {
          // Don't spawn health power-ups if player is already at max lives
          if (dropType === 'health' && this.player.lives >= BALANCER.playerMaxLives) {
            // Skip health power-up if at max lives
          } else if (dropType === 'weapon' && this.player.weaponTier >= 6) {
            // Skip weapon power-up if at max weapon tier (tier 6)
          } else {
            this.spawnPowerUp(collision.enemy.x, collision.enemy.y, dropType);
          }
        }

        collision.enemy.setActive(false);
      }

      collision = this.collisionSystem.checkBulletEnemyCollision(
        activePlayerBullets,
        activeEnemies,
        width,
        height
      );
    }

    // Player bullets vs boss
    if (this.boss) {
      collision = this.collisionSystem.checkBulletBossCollision(
        playerBullets,
        this.boss
      );
      if (collision) {
        // Create explosion effect at bullet impact point (always, not just when boss dies)
        this.effects.explosion(this, collision.bullet.x, collision.bullet.y, 0x00ffff);
        collision.bullet.setActive(false);
        const dead = collision.boss.takeDamage(collision.bullet.damage);
        this.effects.hitFlash(collision.boss);
        if (dead) {
          this.gameState.score += BALANCER.scorePerKill.boss;
          // Create larger explosion when boss dies
          this.effects.explosion(this, collision.boss.x, collision.boss.y);
          audioSystem.playBoom();
        }
      }
    }

    // Player vs enemies
    const hitEnemy = this.collisionSystem.checkPlayerEnemyCollision(this.player, this.enemies);
    if (hitEnemy) {
      // Player takes damage (unless god mode is enabled)
      if (!getGodMode()) {
        this.player.takeDamage();
        this.effects.hitFlash(this.player);
        this.effects.shake();
        audioSystem.playHit();
      }
      hitEnemy.setActive(false);
    }

    // Player vs boss
    if (this.boss && this.collisionSystem.checkPlayerBossCollision(this.player, this.boss)) {
      // Player takes damage (unless god mode is enabled)
      if (!getGodMode()) {
        this.player.takeDamage();
        this.effects.hitFlash(this.player);
        this.effects.shake();
        audioSystem.playHit();
      }
    }

    // Player vs power-ups
    const powerUp = this.collisionSystem.checkPlayerPowerUpCollision(this.player, this.powerUps);
    if (powerUp) {
      this.collectPowerUp(powerUp);
      powerUp.setActive(false);
    }
  }

  private spawnPowerUp(x: number, y: number, type: 'weapon' | 'bomb' | 'health' | 'shield'): void {
    const powerUp = new PowerUp(this, x, y, { type, value: 1 });
    this.powerUps.push(powerUp);
  }

  private collectPowerUp(powerUp: PowerUp): void {
    audioSystem.playChime();

    if (powerUp.powerUpType.type === 'weapon') {
      this.player.upgradeWeapon();
      this.gameState.weaponTier = this.player.weaponTier;
    } else if (powerUp.powerUpType.type === 'bomb') {
      this.player.addBomb();
      this.gameState.bombs = this.player.bombs;
    } else if (powerUp.powerUpType.type === 'health') {
      if (this.player.lives < BALANCER.playerMaxLives) {
        this.player.addLife();
        this.gameState.lives = this.player.lives;
      }
    } else if (powerUp.powerUpType.type === 'shield') {
      this.player.addShield();
      this.gameState.shields = this.player.shields;
    }
  }

  private useBomb(): void {
    if (!this.player.useBomb()) {
      return;
    }

    this.gameState.bombs = this.player.bombs;
    audioSystem.playBoom();
    this.effects.shake(BALANCER.shakeIntensity * 2, BALANCER.shakeDuration * 2);

    // Create bomb wave visual effect
    const { width, height } = this.cameras.main;
    this.effects.bombWave(this, this.player.x, this.player.y, width, height);

    // Clear enemies in radius
    const clearedEnemies = this.collisionSystem.getEnemiesInRadius(
      this.player.x,
      this.player.y,
      BALANCER.bombClearRadius,
      this.enemies
    );

    for (const enemy of clearedEnemies) {
      this.gameState.score += BALANCER.scorePerKill[enemy.enemyType as keyof typeof BALANCER.scorePerKill] ?? 100;
      this.effects.explosion(this, enemy.x, enemy.y);
      enemy.setActive(false);
    }

    // Clear bullets in radius
    const clearedBullets = this.collisionSystem.getBulletsInRadius(
      this.player.x,
      this.player.y,
      BALANCER.bombClearRadius,
      this.bullets
    );

    for (const bullet of clearedBullets) {
      bullet.setActive(false);
    }
  }
  
  private useShield(): void {
    if (this.player.activateShield()) {
      this.gameState.shields = this.player.shields;
      audioSystem.playChime(); // Play a different sound or reuse chime
    }
  }

  private pause(): void {
    this.gameState.paused = true;
    this.scene.pause();
    this.scene.launch('PauseScene');
  }

  private updateHUD(): void {
    this.gameState.lives = this.player.lives;
    this.gameState.weaponTier = this.player.weaponTier;
    this.gameState.bombs = this.player.bombs;
    this.gameState.shields = this.player.shields;

    if (this.hudScene && 'updateHUD' in this.hudScene) {
      (this.hudScene as { updateHUD: (state: GameState) => void }).updateHUD(this.gameState);
    }
  }

  private gameOver(): void {
    // Prevent multiple calls
    if (this.gameOverTriggered || this.isTransitioning) {
      sceneLogger.log('GameScene', 'GAMEOVER_BLOCKED', { 
        gameOverTriggered: this.gameOverTriggered, 
        isTransitioning: this.isTransitioning 
      });
      return;
    }
    
    sceneLogger.logTransition('GameScene', 'DeathScene');
    this.gameOverTriggered = true;
    this.isTransitioning = true;
    
    try {
      // Stop gameplay music if playing
      if (this.gameplayMusic) {
        this.gameplayMusic.stop();
        this.gameplayMusic.destroy();
        sceneLogger.log('GameScene', 'MUSIC_STOPPED');
      }
      musicSystem.stop();
      
      // Game over logic - transition to death screen
      this.scene.pause();
      sceneLogger.log('GameScene', 'PAUSED');
      
      // Stop HUD scene before transitioning
      this.scene.stop('HUDScene');
      sceneLogger.log('GameScene', 'HUD_STOPPED');
      
      // Stop all tweens to prevent them from continuing to render
      this.tweens.killAll();
      sceneLogger.log('GameScene', 'ALL_TWEENS_STOPPED');
      
      this.scene.start('DeathScene');
      sceneLogger.log('GameScene', 'DEATHSCENE_STARTED');
      
      // Check scene states after transition
      setTimeout(() => {
        if ((window as any).sceneLogger) {
          (window as any).sceneLogger.checkSceneStates(this.game);
        }
      }, 100);
    } catch (error) {
      sceneLogger.logError('GameScene', 'GAMEOVER_TRANSITION_ERROR', error);
      this.isTransitioning = false;
      this.gameOverTriggered = false;
    }
  }

  shutdown(): void {
    sceneLogger.log('GameScene', 'SHUTDOWN', {
      isTransitioning: this.isTransitioning,
      gameOverTriggered: this.gameOverTriggered,
      sceneState: this.scene.isActive() ? 'ACTIVE' : 'INACTIVE',
      playerExists: !!this.player,
      bulletsCount: this.bullets.length,
      enemiesCount: this.enemies.length,
      powerUpsCount: this.powerUps.length,
      bossExists: !!this.boss,
    });
    
    // Stop all tweens and timers
    this.tweens.killAll();
    this.time.removeAllEvents();
    sceneLogger.log('GameScene', 'TWEENS_AND_TIMERS_CLEARED');
    
    // Stop all sounds
    this.sound.stopAll();
    
    // Clean up resources
    if (this.gameplayMusic) {
      this.gameplayMusic.stop();
      this.gameplayMusic.destroy();
      this.gameplayMusic = undefined;
    }
    
    // Destroy all game objects
    if (this.player) {
      this.player.destroy();
      this.player = undefined as any;
    }
    
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      if (bullet && bullet.active) {
        bullet.destroy();
      }
    }
    this.bullets = [];
    
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy && enemy.active) {
        enemy.destroy();
      }
    }
    this.enemies = [];
    
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      if (powerUp && powerUp.active) {
        powerUp.destroy();
      }
    }
    this.powerUps = [];
    
    if (this.boss) {
      this.boss.destroy();
      this.boss = null;
    }
    
    // Clean up systems
    if (this.effects) {
      // Effects cleanup if needed
    }
    
    if (this.parallaxSystem) {
      // Parallax cleanup if needed
    }
    
    sceneLogger.log('GameScene', 'ALL_OBJECTS_DESTROYED');
    
    this.isTransitioning = false;
    this.gameOverTriggered = false;
  }
}

