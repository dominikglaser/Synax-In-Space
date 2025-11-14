/**
 * AudioSystem - WebAudio-based procedural SFX generation with Howler support
 */

import { Howl, Howler } from 'howler';

type SpriteMap = Record<string, [number, number, boolean?]>;

export class AudioSystem {
  private sprite?: Howl;
  private masterVolume: number = 0.7;
  private audioContext: AudioContext | null = null;

  /**
   * Initialize audio context (must be called after user interaction)
   */
  init(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }
  }

  /**
   * Load audio sprite from generated assets
   */
  loadSprite(urls: string[], json: { spritemap: SpriteMap }): void {
    this.sprite = new Howl({
      src: urls,
      sprite: json.spritemap as any,
      volume: this.masterVolume,
    });
  }

  /**
   * Play a sound effect by name (from sprite) or use procedural fallback
   */
  play(name: string, volume = 1): void {
    if (this.sprite) {
      // Use Howler sprite
      this.sprite.volume(volume * this.masterVolume);
      this.sprite.play(name);
    } else {
      // Fallback to procedural audio
      this.playProcedural(name, volume);
    }
  }

  /**
   * Procedural audio generation (fallback when sprite not available)
   */
  private playProcedural(name: string, volume: number): void {
    if (!this.audioContext) {
      this.init();
      if (!this.audioContext) return;
    }

    const buffer = this.generateSound(name);
    if (buffer) {
      this.playSound(buffer, volume);
    }
  }

  /**
   * Generate procedural sound buffer
   */
  private generateSound(name: string): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    let duration = 0.1;

    if (name === 'laser' || name === 'pew') {
      duration = 0.08;
      const frameCount = Math.floor(duration * sampleRate);
      const buffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
      const channelData = buffer.getChannelData(0);
      const startFreq = 2000;
      const endFreq = 1500;

      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        const progress = t / duration;
        const freq = startFreq - (startFreq - endFreq) * progress;
        const envelope = t < 0.005 ? t / 0.005 : t > duration - 0.04 ? (duration - t) / 0.04 : 1;
        let sample = Math.sin(2 * Math.PI * freq * t) * envelope;
        sample += Math.sin(2 * Math.PI * freq * 2 * t) * envelope * 0.3;
        channelData[i] = sample * 0.15 * this.masterVolume;
      }
      return buffer;
    } else if (name === 'boom') {
      duration = 0.3;
      const frameCount = Math.floor(duration * sampleRate);
      const buffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
      const channelData = buffer.getChannelData(0);

      for (let i = 0; i < frameCount; i++) {
        channelData[i] = (Math.random() * 2 - 1) * 0.5;
      }

      const filtered = new Float32Array(frameCount);
      const filterSize = 10;
      for (let i = 0; i < frameCount; i++) {
        let sum = 0;
        let count = 0;
        for (let j = Math.max(0, i - filterSize); j < Math.min(frameCount, i + filterSize); j++) {
          sum += channelData[j]!;
          count++;
        }
        filtered[i] = sum / count;
      }

      const attackTime = 0.01;
      const releaseTime = 0.2;
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        let envelope = 1;
        if (t < attackTime) {
          envelope = t / attackTime;
        } else if (t > duration - releaseTime) {
          envelope = (duration - t) / releaseTime;
        }
        channelData[i] = filtered[i]! * envelope * this.masterVolume;
      }
      return buffer;
    } else if (name === 'chime') {
      duration = 0.4;
      const frameCount = Math.floor(duration * sampleRate);
      const buffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
      const channelData = buffer.getChannelData(0);
      const baseFreq = 440;
      const harmonics = [1, 2, 3, 4];

      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        let sample = 0;
        harmonics.forEach((harmonic, index) => {
          const amplitude = 1 / (harmonic * (index + 1));
          sample += Math.sin(2 * Math.PI * baseFreq * harmonic * t) * amplitude;
        });
        const envelope = Math.exp(-t * 3);
        channelData[i] = sample * envelope * 0.2 * this.masterVolume;
      }
      return buffer;
    }

    return null;
  }

  /**
   * Play a sound buffer
   */
  private playSound(buffer: AudioBuffer, volume: number): void {
    if (!this.audioContext) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    gainNode.gain.value = volume * this.masterVolume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start(0);
  }

  /**
   * Legacy methods for compatibility
   */
  playPew(): void {
    this.play('laser', 1);
  }

  playBoom(): void {
    this.play('boom', 1);
  }

  playChime(): void {
    this.play('chime', 1);
  }

  playHit(): void {
    this.play('hit', 1);
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    Howler.volume(this.masterVolume);
    if (this.sprite) {
      this.sprite.volume(this.masterVolume);
    }
  }

  /**
   * Get master volume
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Set volume (alias for setMasterVolume)
   */
  setVolume(volume: number): void {
    this.setMasterVolume(volume);
  }

  /**
   * Get volume (alias for getMasterVolume)
   */
  getVolume(): number {
    return this.getMasterVolume();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.sprite) {
      this.sprite.unload();
      this.sprite = undefined;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance for backward compatibility
export const audioSystem = new AudioSystem();
