#!/usr/bin/env node
/**
 * Create app icons for Electron from source PNG
 */

import { execSync } from 'child_process';
import { existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const sourceIcon = join(projectRoot, 'assets', 'logo', 'appicon.png');
const buildDir = join(projectRoot, 'build');
const outputIcon = join(buildDir, 'icon.png');

// Check if source icon exists
if (!existsSync(sourceIcon)) {
  console.log('Creating placeholder icon...');
  
  // Create a simple placeholder icon using ImageMagick or sharp
  try {
    const { default: sharp } = await import('sharp');
    
    // Create a simple game-themed icon (space background with text)
    const svg = `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#000428;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#004e92;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" fill="url(#bg)"/>
        <circle cx="512" cy="400" r="120" fill="#00ffff" opacity="0.8"/>
        <circle cx="512" cy="400" r="80" fill="#ffffff" opacity="0.6"/>
        <text x="512" y="650" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="#00ffff" text-anchor="middle">SYNAX</text>
        <text x="512" y="750" font-family="Arial, sans-serif" font-size="80" fill="#ffffff" text-anchor="middle">IN SPACE</text>
      </svg>
    `;
    
    await sharp(Buffer.from(svg))
      .resize(1024, 1024)
      .png()
      .toFile(outputIcon);
    
    console.log('✓ Created placeholder icon at', outputIcon);
  } catch (error) {
    console.error('Failed to create placeholder icon:', error.message);
    console.log('Please create a 1024x1024 PNG icon at:', outputIcon);
    process.exit(1);
  }
} else {
  // Copy existing icon
  copyFileSync(sourceIcon, outputIcon);
  console.log('✓ Copied icon from', sourceIcon, 'to', outputIcon);
}

// Generate platform-specific icons using sharp
try {
  console.log('Generating platform-specific icons...');
  
  const { default: sharp } = await import('sharp');
  
  // Ensure source icon is 1024x1024
  const resizedIcon = await sharp(outputIcon)
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  
  // For macOS, we'll create a basic .icns structure
  // Note: Full .icns creation requires iconutil or specialized tools
  // For now, we'll create a PNG that electron-builder can convert
  await sharp(resizedIcon)
    .resize(512, 512)
    .png()
    .toFile(join(buildDir, 'icon-512.png'));
  
  // For Windows, create ICO file
  // ICO format requires multiple sizes, we'll create a simple one
  await sharp(resizedIcon)
    .resize(256, 256)
    .png()
    .toFile(join(buildDir, 'icon-256.png'));
  
  console.log('✓ Generated base icons');
  console.log('Note: electron-builder will automatically convert these to .icns and .ico formats');
  console.log('If you need manual conversion:');
  console.log('  macOS: Use iconutil or online converter');
  console.log('  Windows: Use online ICO converter or ImageMagick');
} catch (error) {
  console.error('Failed to generate platform icons:', error.message);
  console.log('electron-builder can work with PNG icons and will convert them automatically');
}

