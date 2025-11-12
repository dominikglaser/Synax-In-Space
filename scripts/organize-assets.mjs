#!/usr/bin/env node
/**
 * Helper script to organize downloaded assets into the project structure
 * 
 * Usage:
 *   node scripts/organize-assets.mjs <source-dir> <asset-type>
 * 
 * Examples:
 *   node scripts/organize-assets.mjs ~/Downloads/space-shooter-redux ships
 *   node scripts/organize-assets.mjs ~/Downloads/ui-pack ui
 */

import { readdir, stat, copyFile, mkdir } from 'fs/promises';
import { join, extname, resolve, normalize } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Sanitize file path to prevent path traversal attacks
 */
function sanitizePath(filePath, baseDir) {
  const resolved = resolve(baseDir, filePath);
  const normalized = normalize(resolved);
  if (!normalized.startsWith(resolve(baseDir))) {
    throw new Error('Path traversal detected');
  }
  return normalized;
}

const ASSET_MAP = {
  ships: 'assets/kenney/ships',
  planets: 'assets/kenney/planets',
  'space-kit': 'assets/kenney/space-kit',
  monsters: 'assets/kenney/monsters',
  characters: 'assets/kenney/characters',
  dungeon: 'assets/kenney/dungeon',
  ui: 'assets/kenney/ui',
  particles: 'assets/kenney/particles',
  sfx: 'assets/audio/sfx',
  music: 'assets/audio/music',
  ambience: 'assets/audio/ambience',
};

async function copyRecursive(src, dest, baseSrc, baseDest) {
  const entries = await readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    // Sanitize paths to prevent path traversal
    const srcPath = sanitizePath(join(src, entry.name), baseSrc);
    const destPath = sanitizePath(join(dest, entry.name), baseDest);
    
    if (entry.isDirectory()) {
      await mkdir(destPath, { recursive: true });
      await copyRecursive(srcPath, destPath, baseSrc, baseDest);
    } else {
      // Only copy image and audio files
      const ext = extname(entry.name).toLowerCase();
      const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.wav', '.ogg', '.mp3', '.json', '.txt'];
      
      if (allowedExts.includes(ext)) {
        await copyFile(srcPath, destPath);
        console.log(`  Copied: ${entry.name}`);
      }
    }
  }
}

async function organizeAssets(sourceDir, assetType) {
  if (!assetType || !ASSET_MAP[assetType]) {
    console.error('Invalid asset type. Available types:');
    console.error(Object.keys(ASSET_MAP).join(', '));
    process.exit(1);
  }

  // Sanitize source directory path to prevent path traversal
  let sanitizedSourceDir;
  try {
    sanitizedSourceDir = sanitizePath(sourceDir, '/');
  } catch (error) {
    console.error(`Invalid source path: ${error.message}`);
    process.exit(1);
  }

  const destDir = join(projectRoot, ASSET_MAP[assetType]);
  
  try {
    const srcStats = await stat(sanitizedSourceDir);
    if (!srcStats.isDirectory()) {
      console.error(`Source path is not a directory: ${sanitizedSourceDir}`);
      process.exit(1);
    }

    console.log(`Organizing assets from: ${sanitizedSourceDir}`);
    console.log(`Destination: ${destDir}`);
    
    await mkdir(destDir, { recursive: true });
    // Pass base directories for path traversal protection
    await copyRecursive(sanitizedSourceDir, destDir, sanitizedSourceDir, resolve(projectRoot));
    
    console.log('\n✓ Assets organized successfully!');
    console.log(`\nNext steps:`);
    console.log(`1. If these are sprites, copy to assets/raw/sprites/ and run: npm run assets:build`);
    console.log(`2. If these are audio, copy to assets/raw/audio/ and run: npm run assets:audio`);
  } catch (error) {
    console.error('Error organizing assets:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const [,, sourceDir, assetType] = process.argv;

if (!sourceDir || !assetType) {
  console.log('Usage: node scripts/organize-assets.mjs <source-dir> <asset-type>');
  console.log('\nAsset types:');
  console.log(Object.keys(ASSET_MAP).map(k => `  - ${k}`).join('\n'));
  process.exit(1);
}

organizeAssets(sourceDir, assetType);







