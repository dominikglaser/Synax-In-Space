#!/usr/bin/env node
/**
 * Script to set up Kenney Space Shooter Redux assets
 * 
 * This script:
 * 1. Copies Kenney sprites to the raw sprites folder
 * 2. Processes them into atlases
 * 3. Updates asset configuration
 * 
 * Usage:
 *   node scripts/setup-kenney-assets.mjs <kenney-download-path>
 * 
 * Example:
 *   node scripts/setup-kenney-assets.mjs ~/Downloads/space-shooter-redux
 */

import { readdir, stat, copyFile, mkdir, readFile, writeFile } from 'fs/promises';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const REQUIRED_SPRITES = {
  player: ['playerShip1_blue.png', 'playerShip2_blue.png'],
  enemy: ['enemyBlack1.png', 'enemyRed1.png', 'enemyBlue1.png'],
  bullet: ['laserBlue01.png', 'laserRed01.png'],
  powerup: ['powerupBlue_bolt.png', 'powerupRed_bolt.png', 'powerupGreen_bolt.png', 'powerupYellow_bolt.png'],
  explosion: ['explosion1.png', 'explosion2.png'],
};

async function findSpritesInDirectory(dir, pattern) {
  const files = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subFiles = await findSpritesInDirectory(fullPath, pattern);
        files.push(...subFiles);
      } else if (entry.isFile() && pattern.test(entry.name.toLowerCase())) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory might not exist or be accessible
  }
  
  return files;
}

async function setupKenneyAssets(sourceDir) {
  try {
    console.log('Setting up Kenney Space Shooter Redux assets...\n');
    
    // Check source directory
    const srcStats = await stat(sourceDir);
    if (!srcStats.isDirectory()) {
      console.error(`Source path is not a directory: ${sourceDir}`);
      process.exit(1);
    }
    
    // Find all PNG files
    console.log('Searching for sprite files...');
    const pngFiles = await findSpritesInDirectory(sourceDir, /\.png$/i);
    
    if (pngFiles.length === 0) {
      console.error('No PNG files found in source directory!');
      console.error('Make sure you extracted the Kenney Space Shooter Redux pack.');
      process.exit(1);
    }
    
    console.log(`Found ${pngFiles.length} sprite files\n`);
    
    // Copy to raw sprites folder
    const destDir = join(projectRoot, 'assets/raw/sprites');
    await mkdir(destDir, { recursive: true });
    
    console.log('Copying sprites to assets/raw/sprites/...');
    let copied = 0;
    for (const file of pngFiles) {
      const filename = basename(file);
      const destPath = join(destDir, filename);
      await copyFile(file, destPath);
      copied++;
      if (copied % 10 === 0) {
        process.stdout.write('.');
      }
    }
    console.log(`\nCopied ${copied} sprites\n`);
    
    // Build atlas
    console.log('Building sprite atlas...');
    try {
      await execAsync('npm run assets:atlas', { cwd: projectRoot });
      console.log('✓ Atlas built successfully\n');
    } catch (error) {
      console.error('Error building atlas:', error.message);
      console.error('Make sure spritesheet-js is installed: npm install');
      process.exit(1);
    }
    
    // Optimize
    console.log('Optimizing atlas...');
    try {
      await execAsync('npm run assets:opt', { cwd: projectRoot });
      console.log('✓ Atlas optimized\n');
    } catch (error) {
      console.warn('Warning: Could not optimize atlas (this is optional)');
    }
    
    console.log('✓ Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Restart your dev server');
    console.log('2. The game will automatically use Kenney sprites');
    console.log('3. If assets don\'t load, check the console for errors');
    
  } catch (error) {
    console.error('Error setting up assets:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const [,, sourceDir] = process.argv;

if (!sourceDir) {
  console.log('Usage: node scripts/setup-kenney-assets.mjs <kenney-download-path>');
  console.log('\nExample:');
  console.log('  node scripts/setup-kenney-assets.mjs ~/Downloads/space-shooter-redux');
  process.exit(1);
}

setupKenneyAssets(sourceDir);







