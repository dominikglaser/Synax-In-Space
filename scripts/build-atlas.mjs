#!/usr/bin/env node
/**
 * Build sprite atlas using available tools
 * Falls back to different methods if ImageMagick isn't available
 */

import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const rawSpritesDir = join(projectRoot, 'assets', 'raw', 'sprites');
const atlasDir = join(projectRoot, 'assets', 'generated', 'atlases');

async function checkForSprites() {
  try {
    const files = await readdir(rawSpritesDir);
    const pngFiles = files.filter(f => f.endsWith('.png'));
    return pngFiles.length > 0;
  } catch {
    return false;
  }
}

async function buildAtlas() {
  console.log('🔨 Building sprite atlas...\n');
  
  // Check if sprites exist
  const hasSprites = await checkForSprites();
  if (!hasSprites) {
    console.log('⚠ No sprites found in assets/raw/sprites/');
    console.log('The game will use procedural assets.');
    console.log('\nTo use real assets:');
    console.log('1. Download from: https://kenney.nl/assets/space-shooter-redux');
    console.log('2. Extract and copy PNG files to assets/raw/sprites/');
    console.log('3. Run: npm run assets:atlas');
    return;
  }
  
  // Try spritesheet-js first
  try {
    console.log('Trying spritesheet-js...');
    await execAsync(`spritesheet-js assets/raw/sprites/**/*.png --format json --name game --path assets/generated/atlases --algorithm binary-tree --max-size 2048 --dpi 72`, {
      cwd: projectRoot,
    });
    console.log('✓ Atlas built successfully with spritesheet-js');
    return;
  } catch (error) {
    console.log('spritesheet-js failed (ImageMagick may be missing)');
  }
  
  // Try alternative: use sharp if available
  try {
    console.log('Trying alternative method with sharp...');
    const { default: sharp } = await import('sharp');
    const { readdir } = await import('fs/promises');
    const { mkdir } = await import('fs/promises');
    
    await mkdir(atlasDir, { recursive: true });
    
    const files = await readdir(rawSpritesDir);
    const pngFiles = files.filter(f => f.endsWith('.png'));
    
    if (pngFiles.length === 0) {
      throw new Error('No PNG files found');
    }
    
    console.log(`Found ${pngFiles.length} sprites. Creating atlas...`);
    
    // Simple atlas creation - just copy sprites for now
    // In production, you'd use a proper atlas builder
    console.log('⚠ Simple atlas creation not fully implemented');
    console.log('Please install ImageMagick: brew install imagemagick');
    console.log('Or use procedural assets (game works without atlas)');
    
  } catch (error) {
    console.error('Alternative method failed:', error.message);
    console.log('\n💡 Options:');
    console.log('1. Install ImageMagick: brew install imagemagick');
    console.log('2. Use procedural assets (game works without real assets)');
    console.log('3. Manually create atlas using TexturePacker or similar tool');
  }
}

buildAtlas().catch(console.error);







