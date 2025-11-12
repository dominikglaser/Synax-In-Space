#!/usr/bin/env node
/**
 * Automatic asset downloader for Synax In Space
 * Downloads required asset packs from various sources
 */

import { mkdir, writeFile, readFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import https from 'https';
import http from 'http';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Asset download configuration
// Using alternative free spaceship asset sources
const ASSETS_TO_DOWNLOAD = {
  'opengameart-spaceships': {
    name: 'OpenGameArt Spaceship Assets',
    // OpenGameArt spaceship pack - direct download
    url: 'https://opengameart.org/sites/default/files/spaceship-pack.zip',
    type: 'opengameart',
    category: 'ships',
    required: true,
    description: 'Ships, enemies, bullets, power-ups',
    fallbackUrl: 'https://opengameart.org/content/spaceship-pack',
  },
  'craftpix-spaceships': {
    name: 'CraftPix Free Spaceship Sprites',
    // Alternative: CraftPix free spaceship pack
    url: 'https://craftpix.net/file-uploads/freebies/files/Free-Pixel-Art-Enemy-Spaceship-2D-Sprites.zip',
    type: 'craftpix',
    category: 'ships',
    required: false,
    description: 'Enemy spaceships with animations',
    fallbackUrl: 'https://craftpix.net/freebies/free-pixel-art-enemy-spaceship-2d-sprites/',
  },
  'opengameart-space-shooter': {
    name: 'OpenGameArt Space Shooter Assets',
    // Another OpenGameArt option
    url: 'https://opengameart.org/sites/default/files/space-shooter.zip',
    type: 'opengameart',
    category: 'ships',
    required: false,
    description: 'Space shooter sprites',
    fallbackUrl: 'https://opengameart.org/content/space-shooter-assets',
  },
};

const DOWNLOAD_DIR = join(projectRoot, 'assets', 'downloads');
const EXTRACT_DIR = join(projectRoot, 'assets', 'kenney');

/**
 * Download a file from URL
 */
async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    // Configure to ignore SSL certificate errors for problematic sites
    const options = {
      rejectUnauthorized: false, // Allow self-signed certificates
    };
    
    const file = createWriteStream(dest);
    
    protocol.get(url, options, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        return downloadFile(response.headers.location, dest)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      // Handle gzip compression
      let stream = response;
      if (response.headers['content-encoding'] === 'gzip') {
        stream = response.pipe(createGunzip());
      }
      
      stream.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        file.close();
        reject(err);
      });
    }).on('error', reject);
  });
}

/**
 * Extract ZIP file
 */
async function extractZip(zipPath, extractTo) {
  try {
    // Try unzip first (macOS/Linux)
    await execAsync(`unzip -q -o "${zipPath}" -d "${extractTo}"`);
  } catch (error) {
    // Try 7z if available
    try {
      await execAsync(`7z x "${zipPath}" -o"${extractTo}" -y`);
    } catch (e) {
      // Try Python zipfile module as fallback
      try {
        await execAsync(`python3 -c "import zipfile, shutil; z=zipfile.ZipFile('${zipPath}'); z.extractall('${extractTo}'); z.close()"`);
      } catch (e2) {
        throw new Error('No ZIP extraction tool found. Please install unzip, 7z, or Python.');
      }
    }
  }
}

/**
 * Find PNG files recursively
 */
async function findPNGFiles(dir) {
  const { execAsync } = await import('child_process').then(m => ({ execAsync: promisify(m.exec) }));
  try {
    const { stdout } = await execAsync(`find "${dir}" -name "*.png" -type f`);
    return stdout.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Copy sprites to organized directory (raw/sprites for processing)
 */
async function organizeSprites(srcDir, destDir, assetName) {
  const pngFiles = await findPNGFiles(srcDir);
  
  if (pngFiles.length === 0) {
    console.warn(`⚠ No PNG files found in ${srcDir}`);
    return;
  }
  
  // Copy to raw/sprites for atlas generation
  const rawSpritesDir = join(projectRoot, 'assets', 'raw', 'sprites');
  await mkdir(rawSpritesDir, { recursive: true });
  
  // Also copy to organized kenney directory
  await mkdir(destDir, { recursive: true });
  
  // Copy all PNG files
  const { copyFile } = await import('fs/promises');
  let copied = 0;
  for (const file of pngFiles) {
    const filename = file.split('/').pop() || file.split('\\').pop();
    
    // Copy to raw/sprites for processing
    const rawDestPath = join(rawSpritesDir, filename);
    // Copy to organized directory
    const destPath = join(destDir, filename);
    
    try {
      await copyFile(file, rawDestPath);
      await copyFile(file, destPath);
      copied++;
    } catch (err) {
      console.warn(`Failed to copy ${file}: ${err.message}`);
    }
  }
  
  console.log(`✓ Copied ${copied} sprites to raw/sprites and ${destDir}`);
}

/**
 * Download and process a single asset
 */
async function downloadAsset(assetConfig) {
  const { name, url, fallbackUrl, category, required } = assetConfig;
  
  console.log(`\n📦 Downloading ${name}...`);
  
  // Check if URL is available
  if (!url) {
    console.log(`  ⚠ Automatic download not available for ${name}`);
    if (fallbackUrl) {
      console.log(`  📥 Please download manually from: ${fallbackUrl}`);
    }
    console.log(`  💡 After downloading, extract the ZIP and run:`);
    console.log(`     node scripts/organize-assets.mjs <extracted-path> ${category}`);
    
    // Check if assets already exist
    const rawSpritesDir = join(projectRoot, 'assets', 'raw', 'sprites');
    const { readdir } = await import('fs/promises');
    try {
      const files = await readdir(rawSpritesDir);
      const pngFiles = files.filter(f => f.endsWith('.png'));
      if (pngFiles.length > 0) {
        console.log(`  ✓ Found ${pngFiles.length} existing sprites in assets/raw/sprites/`);
        console.log(`  → You can skip manual download and run: npm run assets:atlas`);
        return true;
      }
    } catch {
      // Directory doesn't exist, that's fine
    }
    
    return false;
  }
  
  try {
    // Create download directory
    await mkdir(DOWNLOAD_DIR, { recursive: true });
    
    const zipName = `${url.split('/').pop() || name}.zip`;
    const zipPath = join(DOWNLOAD_DIR, zipName);
    
    // Download file
    console.log(`  Downloading from ${url}...`);
    await downloadFile(url, zipPath);
    console.log(`  ✓ Downloaded ${zipName}`);
    
    // Extract
    const extractPath = join(DOWNLOAD_DIR, name);
    await mkdir(extractPath, { recursive: true });
    
    console.log(`  Extracting...`);
    await extractZip(zipPath, extractPath);
    console.log(`  ✓ Extracted`);
    
    // Organize sprites
    const destDir = join(EXTRACT_DIR, category);
    await organizeSprites(extractPath, destDir, name);
    
    // Clean up
    const { rm } = await import('fs/promises');
    await rm(zipPath, { force: true });
    await rm(extractPath, { recursive: true, force: true });
    
    console.log(`  ✓ ${name} ready!`);
    return true;
  } catch (error) {
    console.error(`  ✗ Failed to download ${name}: ${error.message}`);
    if (fallbackUrl) {
      console.error(`  💡 Try downloading manually from: ${fallbackUrl}`);
    }
    if (required) {
      console.error(`  ⚠ This asset is REQUIRED. Game will use procedural fallbacks.`);
    }
    return false;
  }
}

/**
 * Main download function
 */
async function downloadAllAssets() {
  console.log('🚀 Synax In Space - Asset Downloader\n');
  console.log('Downloading required assets...\n');
  
  // Create directories
  await mkdir(DOWNLOAD_DIR, { recursive: true });
  await mkdir(EXTRACT_DIR, { recursive: true });
  
  const results = [];
  
  // Download required assets first
  for (const [key, config] of Object.entries(ASSETS_TO_DOWNLOAD)) {
    if (config.required) {
      const success = await downloadAsset(config);
      results.push({ key, success, required: true });
    }
  }
  
  // Download optional assets
  for (const [key, config] of Object.entries(ASSETS_TO_DOWNLOAD)) {
    if (!config.required) {
      const success = await downloadAsset(config);
      results.push({ key, success, required: false });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Download Summary\n');
  
  const required = results.filter(r => r.required);
  const optional = results.filter(r => !r.required);
  
  console.log('Required Assets:');
  required.forEach(({ key, success }) => {
    const status = success ? '✓' : '✗';
    const name = ASSETS_TO_DOWNLOAD[key].name;
    console.log(`  ${status} ${name}`);
  });
  
  if (optional.length > 0) {
    console.log('\nOptional Assets:');
    optional.forEach(({ key, success }) => {
      const status = success ? '✓' : '✗';
      const name = ASSETS_TO_DOWNLOAD[key].name;
      console.log(`  ${status} ${name}`);
    });
  }
  
  const allRequired = required.every(r => r.success);
  
  if (allRequired) {
    console.log('\n✅ All required assets downloaded successfully!');
    console.log('\nNext steps:');
    console.log('  1. Run: npm run assets:build');
    console.log('  2. Restart your dev server');
    console.log('  3. The game will automatically use the downloaded assets');
  } else {
    console.log('\n⚠️  Some required assets failed to download.');
    console.log('The game will use procedural fallbacks until assets are available.');
  }
  
  console.log('\n' + '='.repeat(50));
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadAllAssets().catch(console.error);
}

export { downloadAllAssets };

