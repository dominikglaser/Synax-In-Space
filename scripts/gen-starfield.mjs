#!/usr/bin/env node

/**
 * Generate a static starfield PNG (optional utility)
 */

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

const width = 1280;
const height = 720;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Fill black background
ctx.fillStyle = '#000000';
ctx.fillRect(0, 0, width, height);

// Draw stars
ctx.fillStyle = '#ffffff';
for (let i = 0; i < 500; i++) {
  const x = Math.random() * width;
  const y = Math.random() * height;
  const size = Math.random() * 2 + 1;
  ctx.fillRect(x, y, size, size);
}

// Save to file
const buffer = canvas.toBuffer('image/png');
writeFileSync('assets/generated/starfield.png', buffer);
console.log('Starfield generated: assets/generated/starfield.png');

