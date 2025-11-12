#!/usr/bin/env node

/**
 * Print a recommended daily seed for the game
 */

const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');

// Generate seed based on date
const dateSeed = parseInt(`${year}${month}${day}`, 10);

// Or use random seed
const randomSeed = Math.floor(Math.random() * 1e9);

console.log('Recommended seeds for today:');
console.log(`  Date-based: ${dateSeed}`);
console.log(`  Random: ${randomSeed}`);
console.log(`\nUse in game: seed=${dateSeed}`);

