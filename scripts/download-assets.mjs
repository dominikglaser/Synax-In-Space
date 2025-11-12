#!/usr/bin/env node
/**
 * Automatic asset downloader for Synax In Space
 * Downloads required asset packs from various sources
 */

import { mkdir, writeFile, readFile } from 'fs/promises';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { join, dirname, resolve, normalize } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import https from 'https';
import http from 'http';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { URL } from 'url';

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

// Security: Maximum file size for downloads (100MB)
const MAX_DOWNLOAD_SIZE = 100 * 1024 * 1024;

/**
 * Validate and sanitize URL to prevent SSRF attacks
 */
function validateUrl(urlString) {
  try {
    const url = new URL(urlString);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol');
    }
    // Prevent localhost/internal network access (SSRF protection)
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.') ||
      hostname === '[::1]' ||
      hostname === '::1'
    ) {
      throw new Error('Local/internal network access not allowed');
    }
    return urlString;
  } catch (error) {
    throw new Error(`Invalid or unsafe URL: ${error.message}`);
  }
}

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

/**
 * Sanitize filename to prevent command injection
 */
function sanitizeFilename(filename) {
  // Remove any characters that could be used for command injection
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Download a file from URL with security checks
 */
async function downloadFile(url, dest) {
  // Validate URL before downloading
  const validatedUrl = validateUrl(url);
  
  return new Promise((resolve, reject) => {
    const protocol = validatedUrl.startsWith('https') ? https : http;
    
    // SECURITY: Enable SSL certificate verification (default behavior)
    // Only use secure connections with proper certificate validation
    const options = {
      rejectUnauthorized: true, // Require valid SSL certificates
    };
    
    const file = createWriteStream(dest);
    let downloadedBytes = 0;
    
    protocol.get(validatedUrl, options, (response) => {
      // Check content length if provided
      const contentLength = parseInt(response.headers['content-length'] || '0', 10);
      if (contentLength > MAX_DOWNLOAD_SIZE) {
        file.close();
        reject(new Error(`File too large: ${contentLength} bytes (max: ${MAX_DOWNLOAD_SIZE})`));
        return;
      }
      
      // Handle redirects (with validation)
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        const redirectUrl = response.headers.location;
        if (!redirectUrl) {
          reject(new Error('Invalid redirect: no location header'));
          return;
        }
        // Validate redirect URL
        try {
          const validatedRedirect = validateUrl(redirectUrl.startsWith('http') ? redirectUrl : new URL(redirectUrl, validatedUrl).toString());
          return downloadFile(validatedRedirect, dest)
            .then(resolve)
            .catch(reject);
        } catch (error) {
          reject(new Error(`Invalid redirect URL: ${error.message}`));
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        file.close();
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      // Track downloaded bytes to enforce size limit
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (downloadedBytes > MAX_DOWNLOAD_SIZE) {
          file.close();
          response.destroy();
          reject(new Error(`Download exceeded maximum size: ${MAX_DOWNLOAD_SIZE} bytes`));
        }
      });
      
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
    }).on('error', (err) => {
      file.close();
      // Provide more helpful error message for SSL errors
      if (err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || err.code === 'CERT_HAS_EXPIRED' || err.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
        reject(new Error(`SSL certificate verification failed. This may indicate a security issue. Error: ${err.message}`));
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Extract ZIP file with secure path handling
 */
async function extractZip(zipPath, extractTo) {
  // Sanitize paths to prevent path traversal
  const sanitizedZipPath = sanitizePath(zipPath, projectRoot);
  const sanitizedExtractTo = sanitizePath(extractTo, projectRoot);
  
  try {
    // Use spawn with array arguments to prevent command injection
    // Try unzip first (macOS/Linux)
    await new Promise((resolve, reject) => {
      const proc = spawn('unzip', ['-q', '-o', sanitizedZipPath, '-d', sanitizedExtractTo], {
        stdio: 'ignore'
      });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`unzip exited with code ${code}`));
      });
      proc.on('error', reject);
    });
  } catch (error) {
    // Try 7z if available
    try {
      await new Promise((resolve, reject) => {
        const proc = spawn('7z', ['x', sanitizedZipPath, `-o${sanitizedExtractTo}`, '-y'], {
          stdio: 'ignore'
        });
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`7z exited with code ${code}`));
        });
        proc.on('error', reject);
      });
    } catch (e) {
      // Try Python zipfile module as fallback (using spawn for security)
      try {
        const pythonScript = `
import zipfile
import sys
z = zipfile.ZipFile(sys.argv[1])
z.extractall(sys.argv[2])
z.close()
`;
        await new Promise((resolve, reject) => {
          const proc = spawn('python3', ['-c', pythonScript, sanitizedZipPath, sanitizedExtractTo], {
            stdio: 'ignore'
          });
          proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`python3 exited with code ${code}`));
          });
          proc.on('error', reject);
        });
      } catch (e2) {
        throw new Error('No ZIP extraction tool found. Please install unzip, 7z, or Python.');
      }
    }
  }
}

/**
 * Find PNG files recursively with secure path handling
 */
async function findPNGFiles(dir) {
  // Sanitize directory path
  const sanitizedDir = sanitizePath(dir, projectRoot);
  
  try {
    // Use spawn with array arguments to prevent command injection
    const stdout = await new Promise((resolve, reject) => {
      const proc = spawn('find', [sanitizedDir, '-name', '*.png', '-type', 'f'], {
        stdio: ['ignore', 'pipe', 'ignore']
      });
      let output = '';
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });
      proc.on('close', (code) => {
        if (code === 0 || code === null) resolve(output);
        else reject(new Error(`find exited with code ${code}`));
      });
      proc.on('error', reject);
    });
    
    return stdout.trim().split('\n').filter(Boolean).map(file => {
      // Sanitize each file path
      return sanitizePath(file, projectRoot);
    });
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
    const rawFilename = file.split('/').pop() || file.split('\\').pop();
    // Sanitize filename to prevent path traversal
    const filename = sanitizeFilename(rawFilename);
    
    // Copy to raw/sprites for processing - ensure paths are safe
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
    // Validate URL before processing
    const validatedUrl = validateUrl(url);
    
    // Create download directory
    await mkdir(DOWNLOAD_DIR, { recursive: true });
    
    // Sanitize filename to prevent path traversal and command injection
    const rawZipName = validatedUrl.split('/').pop() || name;
    const sanitizedZipName = sanitizeFilename(rawZipName.replace(/\.zip$/, '') + '.zip');
    const zipPath = join(DOWNLOAD_DIR, sanitizedZipName);
    
    // Download file
    console.log(`  Downloading from ${validatedUrl}...`);
    await downloadFile(validatedUrl, zipPath);
    console.log(`  ✓ Downloaded ${sanitizedZipName}`);
    
    // Extract - sanitize name to prevent path traversal
    const sanitizedName = sanitizeFilename(name);
    const extractPath = join(DOWNLOAD_DIR, sanitizedName);
    await mkdir(extractPath, { recursive: true });
    
    console.log(`  Extracting...`);
    await extractZip(zipPath, extractPath);
    console.log(`  ✓ Extracted`);
    
    // Organize sprites - sanitize category to prevent path traversal
    const sanitizedCategory = sanitizeFilename(category);
    const destDir = join(EXTRACT_DIR, sanitizedCategory);
    await organizeSprites(extractPath, destDir, sanitizedName);
    
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

