#!/usr/bin/env node
/**
 * Optimize assets using system tools (if available)
 * Gracefully handles missing tools
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const atlasPath = join(projectRoot, 'assets', 'generated', 'atlases', 'game.png');

/**
 * Check if a command exists
 */
function commandExists(command) {
  return new Promise((resolve) => {
    const proc = spawn('which', [command], { stdio: 'ignore' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

/**
 * Run command and return success status
 */
function runCommand(command, args) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { stdio: 'ignore' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

async function optimizeAssets() {
  if (!existsSync(atlasPath)) {
    console.log('No atlas found to optimize. Run "npm run assets:atlas" first.');
    process.exit(0);
  }

  console.log('Optimizing assets...\n');

  let optimized = false;

  // Try pngquant (system tool)
  if (await commandExists('pngquant')) {
    console.log('Trying pngquant...');
    const success = await runCommand('pngquant', [
      '--force',
      '--output', atlasPath,
      '--',
      atlasPath
    ]);
    if (success) {
      console.log('✓ Optimized with pngquant');
      optimized = true;
    }
  }

  // Try optipng (system tool)
  if (await commandExists('optipng')) {
    console.log('Trying optipng...');
    const success = await runCommand('optipng', ['-o7', atlasPath]);
    if (success) {
      console.log('✓ Optimized with optipng');
      optimized = true;
    }
  }

  if (!optimized) {
    console.log('⚠ No optimization tools found. Install pngquant or optipng for asset optimization.');
    console.log('  macOS: brew install pngquant optipng');
    console.log('  Linux: apt-get install pngquant optipng');
    process.exit(0);
  }

  console.log('\n✓ Asset optimization complete');
}

optimizeAssets().catch((error) => {
  console.error('Error optimizing assets:', error.message);
  process.exit(0); // Don't fail, optimization is optional
});

