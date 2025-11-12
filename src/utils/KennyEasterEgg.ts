/**
 * Kenny Easter Egg utilities
 * Shared logic for spawning and updating Kenny sprites across scenes
 */

import Phaser from 'phaser';

export interface KennyContainer extends Phaser.GameObjects.Container {
  // Extended with data properties
}

export class KennyEasterEgg {
  /**
   * Spawn a Kenny from South Park
   */
  static spawnKenny(
    scene: Phaser.Scene,
    width: number,
    height: number,
    kennys: Phaser.GameObjects.Container[]
  ): void {
    // Check limit
    if (kennys.length >= 30) {
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
    const kenny = scene.add.container(startX, startY);
    kenny.setDepth(-98);
    kenny.setVisible(true);
    kenny.setActive(true);
    kenny.setData('baseX', startX);
    kenny.setData('baseY', startY);
    kenny.setData('vx', vx);
    kenny.setData('vy', vy);
    
    // Calculate logo size: half of what's used on space station
    // On space station: logoSize = stationSize * 0.3
    // Station size is typically: Math.min(width * 0.6, height * 0.8)
    // So half size would be: Math.min(width * 0.6, height * 0.8) * 0.15
    const stationSize = Math.min(width * 0.6, height * 0.8);
    const logoSize = stationSize * 0.15; // Half of 0.3 (which is used on station)
    
    // Use company logo instead of Kenny sprite
    if (scene.textures.exists('company-logo')) {
      const logoSprite = scene.add.image(0, 0, 'company-logo');
      logoSprite.setDisplaySize(logoSize, logoSize);
      logoSprite.setOrigin(0.5, 0.5);
      logoSprite.setVisible(true);
      logoSprite.setActive(true);
      logoSprite.setAlpha(0.9);
      kenny.add(logoSprite);
      console.log('Using company logo for easter egg');
    } else {
      // Fallback: create a simple placeholder if logo not found
      const placeholderGraphics = scene.add.graphics();
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
    kennys.push(kenny);
    
  }

  /**
   * Update all Kennys
   */
  static updateKennys(
    scene: Phaser.Scene,
    width: number,
    height: number,
    delta: number,
    kennys: Phaser.GameObjects.Container[]
  ): void {
    const deltaSeconds = delta / 1000;
    
    for (let i = kennys.length - 1; i >= 0; i--) {
      const kenny = kennys[i];
      if (!kenny || !kenny.active) {
        kennys.splice(i, 1);
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
      
      // Add floating motion (gentle perpendicular drift)
      const newFloatPhase = floatPhase + floatSpeed * deltaSeconds;
      kenny.setData('floatPhase', newFloatPhase);
      
      // Perpendicular offset for floating motion
      const angle = Math.atan2(vy, vx);
      const perpAngle = angle + Math.PI / 2;
      const floatX = Math.cos(perpAngle) * Math.sin(newFloatPhase) * floatAmplitude;
      const floatY = Math.sin(perpAngle) * Math.sin(newFloatPhase) * floatAmplitude;
      
      // Set position: base position + floating offset
      kenny.x = baseX + floatX;
      kenny.y = baseY + floatY;
      
      // Rotation while floating (tumbling effect)
      kenny.rotation += 0.05 * deltaSeconds;
      
      // Ensure Kenny is visible
      kenny.setVisible(true);
      kenny.setActive(true);
      
      // Remove if off any screen edge (with margin)
      const margin = 100;
      if (kenny.x < -margin || kenny.x > width + margin || 
          kenny.y < -margin || kenny.y > height + margin) {
        kenny.destroy();
        kennys.splice(i, 1);
      }
    }
  }

  /**
   * Setup keyboard handler for 'K' key
   */
  static setupKeyboardHandler(
    scene: Phaser.Scene,
    width: number,
    height: number,
    kennys: Phaser.GameObjects.Container[]
  ): void {
    if (!scene.input.keyboard) return;
    
    // Method 1: Using key code
    const kKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
    kKey.on('down', () => {
      if (kennys.length < 30) {
        KennyEasterEgg.spawnKenny(scene, width, height, kennys);
      }
    });
    
    // Method 2: Using event name (backup)
    scene.input.keyboard.on('keydown-K', () => {
      if (kennys.length < 30) {
        KennyEasterEgg.spawnKenny(scene, width, height, kennys);
      }
    });
    
    // Method 3: Generic keydown event (most reliable)
    scene.input.keyboard.on('keydown', (event: KeyboardEvent) => {
      if ((event.key === 'K' || event.key === 'k' || event.code === 'KeyK') && kennys.length < 30) {
        KennyEasterEgg.spawnKenny(scene, width, height, kennys);
      }
    });
  }
}


