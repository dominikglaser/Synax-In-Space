/**
 * Tone.js synthesizer for procedural audio generation
 */

import * as Tone from 'tone';

export interface SynthSounds {
  laser(): void;
  boom(): void;
  pickup(): void;
  hit(): void;
  menuMove(): void;
  menuSelect(): void;
}

/**
 * Initialize Tone.js synthesizer
 */
export async function initSynth(): Promise<SynthSounds> {
  await Tone.start();

  // Laser sound
  const laserSynth = new Tone.MembraneSynth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.05 },
  }).toDestination();

  // Boom sound
  const boomSynth = new Tone.NoiseSynth({
    noise: { type: 'brown' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 },
  }).toDestination();

  // Pickup sound
  const pickupSynth = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3 },
  }).toDestination();

  // Hit sound
  const hitSynth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.05 },
  }).toDestination();

  // Menu sounds
  const menuSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
  }).toDestination();

  return {
    laser(): void {
      laserSynth.triggerAttackRelease('C5', '16n');
    },
    boom(): void {
      boomSynth.triggerAttackRelease('8n');
    },
    pickup(): void {
      pickupSynth.triggerAttackRelease('C6', '8n');
    },
    hit(): void {
      hitSynth.triggerAttackRelease('16n');
    },
    menuMove(): void {
      menuSynth.triggerAttackRelease('C4', '16n');
    },
    menuSelect(): void {
      menuSynth.triggerAttackRelease('C5', '8n');
    },
  };
}

