#!/usr/bin/env node
/**
 * Build audio sprites (optional - gracefully handles missing tools)
 * Uses system ffmpeg if available, otherwise skips
 */

import { readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const audioSourceDir = join(projectRoot, 'assets', 'raw', 'audio');
const audioOutputDir = join(projectRoot, 'assets', 'generated', 'audio', 'sfx');

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

async function buildAudio() {
  try {
    const files = await readdir(audioSourceDir);
    const wavFiles = files.filter(f => f.endsWith('.wav'));

    if (wavFiles.length === 0) {
      console.log('No WAV files found in assets/raw/audio/');
      console.log('Audio sprite generation skipped (optional)');
      process.exit(0);
    }

    // Check for ffmpeg (modern, secure alternative)
    if (await commandExists('ffmpeg')) {
      console.log('Building audio sprites with ffmpeg...');
      // Note: This is a simplified version. For full audio sprite functionality,
      // you'd need to concatenate files and create a JSON manifest.
      console.log('⚠ Full audio sprite generation requires additional setup.');
      console.log('  For now, individual audio files can be used directly.');
      process.exit(0);
    }

    console.log('⚠ Audio sprite generation requires ffmpeg.');
    console.log('  Install: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)');
    console.log('  Audio sprite generation skipped (optional)');
    process.exit(0);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('No audio source directory found.');
      console.log('Audio sprite generation skipped (optional)');
      process.exit(0);
    }
    throw error;
  }
}

buildAudio().catch((error) => {
  console.error('Error building audio:', error.message);
  process.exit(0); // Don't fail, audio sprites are optional
});

