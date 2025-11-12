/**
 * Asset mappings for Kenney Space Shooter Redux
 * Maps game entity types to Kenney sprite names
 */

export const KENNEY_SPACE_SHOOTER_MAPPINGS = {
  // Player ship options
  player: [
    'playerShip1_blue',  // Primary choice
    'playerShip1_green',
    'playerShip1_orange',
    'playerShip1_red',
    'playerShip2_blue',
    'playerShip3_blue',
  ],
  
  // Enemy ships (different types)
  enemyChaser: [
    'enemyBlack1',
    'enemyBlack2',
    'enemyBlack3',
    'enemyBlack4',
    'enemyBlack5',
  ],
  
  enemyTurret: [
    'enemyRed1',
    'enemyRed2',
    'enemyRed3',
    'enemyRed4',
    'enemyRed5',
  ],
  
  enemySineFlyer: [
    'enemyBlue1',
    'enemyBlue2',
    'enemyBlue3',
    'enemyBlue4',
    'enemyBlue5',
    'enemyGreen1',
    'enemyGreen2',
  ],
  
  // Boss (use larger enemy ships or combine)
  boss: [
    'enemyBlack1',
    'enemyRed1',
    'enemyBlue1',
  ],
  
  // Bullets
  playerBullet: [
    'laserBlue01',
    'laserBlue02',
    'laserBlue03',
    'laserBlue04',
    'laserBlue05',
  ],
  
  enemyBullet: [
    'laserRed01',
    'laserRed02',
    'laserRed03',
    'laserRed04',
    'laserRed05',
  ],
  
  // Power-ups
  powerUpWeapon: [
    'powerupBlue_bolt',
    'powerupBlue_shield',
    'powerupBlue_star',
  ],
  
  powerUpBomb: [
    'powerupRed_bolt',
    'powerupRed_shield',
    'powerupRed_star',
  ],
  
  powerUpHealth: [
    'powerupGreen_bolt',
    'powerupGreen_shield',
    'powerupGreen_star',
  ],
  
  powerUpShield: [
    'powerupYellow_bolt',
    'powerupYellow_shield',
    'powerupYellow_star',
    'powerupBlue_shield',
  ],
  
  // Effects
  explosion: [
    'explosion1',
    'explosion2',
    'explosion3',
    'explosion4',
  ],
  
  // UI elements
  ui: {
    buttons: ['buttonBlue', 'buttonGreen', 'buttonRed'],
    panels: ['panelBlue', 'panelGreen', 'panelRed'],
  },
} as const;

/**
 * Get sprite name for entity type
 */
export function getKenneySprite(
  category: keyof typeof KENNEY_SPACE_SHOOTER_MAPPINGS,
  index: number = 0
): string {
  const sprites = KENNEY_SPACE_SHOOTER_MAPPINGS[category];
  if (Array.isArray(sprites)) {
    return sprites[Math.min(index, sprites.length - 1)] || sprites[0]!;
  }
  return '';
}

/**
 * Check if Kenney assets are available
 */
export function hasKenneyAssets(): boolean {
  // This will be checked at runtime by trying to load a test texture
  return false; // Will be set dynamically
}







