/**
 * MusicSystem - C64 SID-style music generator
 * Implements the themes exactly as specified in the original task
 */

export enum MusicTheme {
  MENU = 'menu',
  GAMEPLAY = 'gameplay',
  GAME_OVER = 'gameover',
  VICTORY = 'victory',
}

interface Note {
  frequency: number;
  duration: number; // in beats (quarter note = 1 beat)
  startBeat: number; // beat position
}

export class MusicSystem {
  private audioContext: AudioContext | null = null;
  private currentTheme: MusicTheme | null = null;
  private isPlaying: boolean = false;
  private enabled: boolean = true;
  
  // Master gain and filter
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  
  // Voice gain nodes
  private voice1Gain: GainNode | null = null;
  private voice2Gain: GainNode | null = null;
  private voice3Gain: GainNode | null = null;
  
  // Scheduling
  private nextScheduleTime: number = 0;
  private scheduleInterval: number | null = null;
  private currentBeat: number = 0;
  private barCount: number = 0;
  private scheduledNotes: Set<string> = new Set();
  private loopLength: number = 64;

  constructor() {}

  /**
   * Initialize audio context
   */
  private init(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.25;
      this.masterGain.connect(this.audioContext.destination);
      
      this.filterNode = this.audioContext.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.Q.value = 2.5;
      this.filterNode.connect(this.masterGain);
      
      this.voice1Gain = this.audioContext.createGain();
      this.voice2Gain = this.audioContext.createGain();
      this.voice3Gain = this.audioContext.createGain();
      
      this.voice1Gain.gain.value = 0.6; // Lead voice - higher volume
      this.voice2Gain.gain.value = 0.7; // Bass voice - lower but audible
      this.voice3Gain.gain.value = 0.4;
      
      this.voice1Gain.connect(this.filterNode);
      this.voice2Gain.connect(this.filterNode);
      this.voice3Gain.connect(this.filterNode);
    }
  }

  /**
   * Play a music theme
   */
  playTheme(theme: MusicTheme): void {
    if (!this.enabled) return;
    
    try {
      if (this.currentTheme === theme && this.isPlaying) {
        return;
      }

      this.stop();
      this.init();
      if (!this.audioContext) {
        return;
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch((err) => {
        });
      }

      this.currentTheme = theme;
      this.isPlaying = true;
      this.nextScheduleTime = this.audioContext.currentTime;
      this.currentBeat = 0;
      this.barCount = 0;
      this.scheduledNotes.clear();

      const config = this.getThemeConfig(theme);
      let maxBeat = 0;
      config.pattern.voice1.forEach((note: Note) => {
        maxBeat = Math.max(maxBeat, note.startBeat + note.duration);
      });
      config.pattern.voice2.forEach((note: Note) => {
        maxBeat = Math.max(maxBeat, note.startBeat + note.duration);
      });
      this.loopLength = Math.max(16, Math.ceil(maxBeat / 16) * 16);

      this.scheduleLoop();
    } catch (error) {
      this.isPlaying = false;
    }
  }

  /**
   * Main scheduling loop
   */
  private scheduleLoop(): void {
    try {
      if (!this.audioContext || !this.isPlaying) return;
      
      if (this.audioContext.state === 'closed') {
        this.isPlaying = false;
        return;
      }

      const config = this.getThemeConfig(this.currentTheme!);
      // BPM constraints: Menu=100, Gameplay=130, GameOver=80, Victory=110
      const beatsPerSecond = config.tempo / 60;
      const secondsPerBeat = 1 / beatsPerSecond;
      const lookAhead = 0.5;
      const maxIterations = 100;
      let iterations = 0;

      while (this.nextScheduleTime < this.audioContext.currentTime + lookAhead && iterations < maxIterations) {
        iterations++;
        const beatPosition = this.currentBeat;
        const bar = Math.floor(this.currentBeat / 16);
        
        this.updateFilter(this.currentTheme!, bar);
        
        // Schedule all voices independently - they can all play simultaneously
        this.scheduleVoice1(config, this.nextScheduleTime, beatPosition, secondsPerBeat);
        this.scheduleVoice2(config, this.nextScheduleTime, beatPosition, secondsPerBeat);
        this.scheduleVoice3(this.currentTheme!, this.nextScheduleTime, beatPosition, secondsPerBeat, config.tempo);

        this.currentBeat += 0.125; // Advance by 1/32 beat for more precise scheduling
        this.nextScheduleTime += 0.125 * secondsPerBeat;
        
        if (this.currentBeat >= this.loopLength && this.loopLength > 0) {
          this.currentBeat = this.currentBeat % this.loopLength;
          this.scheduledNotes.clear();
          this.barCount = Math.floor(this.currentBeat / 16);
        } else if (this.currentBeat % 16 === 0 && this.currentBeat > 0) {
          this.barCount++;
        }
      }

      if (this.isPlaying) {
        this.scheduleInterval = setTimeout(() => {
          if (this.isPlaying) {
            this.scheduleLoop();
          }
        }, 100);
      }
    } catch (error) {
      this.isPlaying = false;
    }
  }

  /**
   * Schedule Voice 1 (Lead) - High synth
   */
  private scheduleVoice1(config: any, time: number, beatPosition: number, secondsPerBeat: number): void {
    if (!this.audioContext || !this.voice1Gain) return;

    const pattern = config.pattern.voice1;
    if (!pattern || pattern.length === 0) return;

    const beatInLoop = beatPosition % this.loopLength;
    const beatFloor = Math.floor(beatInLoop);
    const beatFrac = beatInLoop - beatFloor;

    for (const note of pattern) {
      const noteStart = Math.floor(note.startBeat % this.loopLength);
      const noteKey = `v1_${noteStart}_${beatFloor}`;
      
      // Trigger note when we reach the start beat (checking at the beginning of each beat)
      if (noteStart === beatFloor && beatFrac < 0.3 && !this.scheduledNotes.has(noteKey)) {
        this.scheduledNotes.add(noteKey);
        this.playNote(
          this.audioContext,
          note.frequency,
          note.duration * secondsPerBeat,
          time,
          this.voice1Gain,
          'square',
          true // vibrato
        );
        break;
      }
    }
  }

  /**
   * Schedule Voice 2 (Bass) - Deep synth
   */
  private scheduleVoice2(config: any, time: number, beatPosition: number, secondsPerBeat: number): void {
    if (!this.audioContext || !this.voice2Gain) return;

    const pattern = config.pattern.voice2;
    if (!pattern || pattern.length === 0) return;

    const beatInLoop = beatPosition % this.loopLength;
    const beatFloor = Math.floor(beatInLoop);
    const beatFrac = beatInLoop - beatFloor;

    for (const note of pattern) {
      const noteStart = Math.floor(note.startBeat % this.loopLength);
      const noteKey = `v2_${noteStart}_${beatFloor}`;
      
      // Trigger note when we reach the start beat (checking at the beginning of each beat)
      if (noteStart === beatFloor && beatFrac < 0.3 && !this.scheduledNotes.has(noteKey)) {
        this.scheduledNotes.add(noteKey);
        this.playNote(
          this.audioContext,
          note.frequency,
          note.duration * secondsPerBeat,
          time,
          this.voice2Gain,
          'square',
          false // no vibrato for bass
        );
        break;
      }
    }
  }

  /**
   * Schedule Voice 3 (FX/Arp/Drums) - Implemented according to spec
   */
  private scheduleVoice3(theme: MusicTheme, time: number, beatPosition: number, secondsPerBeat: number, tempo: number): void {
    if (!this.audioContext || !this.voice3Gain) return;

    const beat = Math.floor(beatPosition);
    const beatFraction = beatPosition % 1;
    
    if (theme === MusicTheme.GAMEPLAY) {
      // Enhanced drums: More frequent and varied patterns
      // Kick on beats 1 & 3
      if (beat % 4 === 0 && beatFraction < 0.1) {
        this.playNoise(this.audioContext, 0.125 * secondsPerBeat, time, 0.35); // Stronger kick
      }
      // Additional kick on off-beat for more groove
      if (beat % 4 === 2 && beatFraction < 0.1) {
        this.playNoise(this.audioContext, 0.125 * secondsPerBeat, time, 0.3);
      }
      // Hi-hat on off-beats and some syncopated hits
      if (beat % 2 === 1 && beatFraction < 0.1) {
        this.playNoise(this.audioContext, 0.0625 * secondsPerBeat, time, 0.12);
      }
      // Additional hi-hat on 16th note off-beats for more drive
      if (beatFraction >= 0.5 && beatFraction < 0.6 && beat % 2 === 0) {
        this.playNoise(this.audioContext, 0.03125 * secondsPerBeat, time, 0.08);
      }
      // Continuous arpeggio [C3-Eb3-G3] 1/16 for more texture
      const arpNotes = [130.81, 155.56, 196.00]; // C3, Eb3, G3
      const arpIndex = Math.floor(beatPosition * 4) % 3;
      const arpKey = `v3_arp_gameplay_${Math.floor(beatPosition * 4)}`;
      if (!this.scheduledNotes.has(arpKey)) {
        this.scheduledNotes.add(arpKey);
        this.playNote(this.audioContext, arpNotes[arpIndex]!, 0.25 * secondsPerBeat, time, this.voice3Gain, 'triangle', false);
      }
      // Occasional accent arpeggio at measure end
      if (beatPosition % 16 >= 15.5 && beatPosition % 16 < 15.75) {
        const accentArpIndex = Math.floor((beatPosition % 16 - 15.5) * 8) % 3;
        const accentKey = `v3_arp_acc_${Math.floor(beatPosition)}`;
        if (!this.scheduledNotes.has(accentKey)) {
          this.scheduledNotes.add(accentKey);
          this.playNote(this.audioContext, arpNotes[accentArpIndex]!, 0.03125 * secondsPerBeat, time, this.voice3Gain, 'triangle', false);
        }
      }
    } else if (theme === MusicTheme.MENU) {
      // Arp pattern [C3-Eb3-G3 fast 1/32 loop] under each chord
      const arpNotes = [130.81, 155.56, 196.00]; // C3, Eb3, G3
      const arpIndex = Math.floor(beatPosition * 8) % 3; // 1/32 notes = 8 per beat
      const arpKey = `v3_arp_menu_${Math.floor(beatPosition * 8)}`;
      if (!this.scheduledNotes.has(arpKey)) {
        this.scheduledNotes.add(arpKey);
        this.playNote(this.audioContext, arpNotes[arpIndex]!, 0.03125 * secondsPerBeat, time, this.voice3Gain, 'triangle', false);
      }
      // Noise burst (short 1/8) every 2nd beat
      if (beat % 2 === 1 && beatFraction < 0.1) {
        this.playNoise(this.audioContext, 0.125 * secondsPerBeat, time, 0.2);
      }
    } else if (theme === MusicTheme.GAME_OVER) {
      // Low noise fade at measure start
      // Slow arpeggio [Eb3-G3-C4] 1/32 with volume decreasing every bar
      if (beatPosition % 4 < 0.1) {
        const arpNotes = [155.56, 196.00, 261.63]; // Eb3, G3, C4
        const arpIndex = Math.floor(this.barCount) % 3;
        const volume = Math.max(0.1, 0.5 - (this.barCount % 4) * 0.1);
        const arpKey = `v3_arp_go_${Math.floor(beatPosition / 4)}`;
        if (!this.scheduledNotes.has(arpKey)) {
          this.scheduledNotes.add(arpKey);
          const osc = this.audioContext.createOscillator();
          const envelope = this.audioContext.createGain();
          envelope.gain.setValueAtTime(0, time);
          envelope.gain.linearRampToValueAtTime(volume * 0.3, time + 0.001);
          envelope.gain.linearRampToValueAtTime(0, time + 0.5 * secondsPerBeat);
          osc.type = 'triangle';
          osc.frequency.value = arpNotes[arpIndex]!;
          osc.connect(envelope);
          envelope.connect(this.voice3Gain);
          osc.start(time);
          osc.stop(time + 0.5 * secondsPerBeat);
        }
      }
    } else if (theme === MusicTheme.VICTORY) {
      // Continuous arpeggio [C3-Eb3-G3] 1/16 for full texture
      const arpNotes = [130.81, 155.56, 196.00]; // C3, Eb3, G3
      const arpIndex = Math.floor(beatPosition * 4) % 3; // 1/16 notes = 4 per beat
      const arpKey = `v3_arp_vic_${Math.floor(beatPosition * 4)}`;
      if (!this.scheduledNotes.has(arpKey)) {
        this.scheduledNotes.add(arpKey);
        this.playNote(this.audioContext, arpNotes[arpIndex]!, 0.25 * secondsPerBeat, time, this.voice3Gain, 'triangle', false);
      }
      // Continuous noise accent on every beat for more energy
      if (beatFraction < 0.1) {
        this.playNoise(this.audioContext, 0.0625 * secondsPerBeat, time, 0.15);
      }
      // Additional accent on measure ends
      if (beatPosition >= 15.5 && beatPosition < 15.6) {
        this.playNoise(this.audioContext, 0.125 * secondsPerBeat, time, 0.3);
      }
    }
  }

  /**
   * Play a note with envelope
   */
  private playNote(
    ctx: AudioContext,
    frequency: number,
    duration: number,
    startTime: number,
    destination: GainNode,
    waveType: OscillatorType,
    vibrato: boolean
  ): void {
    try {
      if (ctx.state === 'closed') return;
      
      const osc = ctx.createOscillator();
      const envelope = ctx.createGain();
      
      envelope.gain.setValueAtTime(0, startTime);
      envelope.gain.linearRampToValueAtTime(0.5, startTime + 0.005);
      envelope.gain.linearRampToValueAtTime(0.4, startTime + 0.105);
      envelope.gain.setValueAtTime(0.4, startTime + duration - 0.1);
      envelope.gain.linearRampToValueAtTime(0, startTime + duration);
      
      osc.type = waveType;
      osc.frequency.value = frequency;
      
      if (vibrato) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 6;
        lfoGain.gain.value = 2;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(startTime);
        lfo.stop(startTime + duration);
      }
      
      osc.connect(envelope);
      envelope.connect(destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (error) {
    }
  }

  /**
   * Play noise burst
   */
  private playNoise(ctx: AudioContext, duration: number, startTime: number, volume: number): void {
    try {
      if (ctx.state === 'closed' || !this.voice3Gain) return;
      
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * volume;
      }

      const source = ctx.createBufferSource();
      const envelope = ctx.createGain();
      envelope.gain.setValueAtTime(volume, startTime);
      envelope.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      source.buffer = buffer;
      source.connect(envelope);
      envelope.connect(this.voice3Gain);
      source.start(startTime);
      source.stop(startTime + duration);
    } catch (error) {
    }
  }

  /**
   * Update filter based on theme
   */
  private updateFilter(theme: MusicTheme, barCount: number): void {
    if (!this.filterNode || !this.audioContext) return;
    
    try {
      const baseFreq = this.audioContext.sampleRate * 0.5;
    
      if (theme === MusicTheme.MENU) {
        // Filter sweep: Start cutoff 30%, fade to 70% over 8 bars, then reset
        const cycle = barCount % 8;
        const cutoff = 0.3 + (0.4 * (cycle / 8));
        this.filterNode.frequency.value = baseFreq * cutoff;
      } else if (theme === MusicTheme.GAMEPLAY) {
        // Filter modulation: Every 2 bars, cutoff rises by +10%, then resets
        const cycle = barCount % 2;
        const cutoff = 0.5 + (0.1 * cycle);
        this.filterNode.frequency.value = baseFreq * cutoff;
      } else if (theme === MusicTheme.GAME_OVER) {
        // Low-pass sweep from 60% → 40% each bar, repeating
        const cycle = barCount % 1;
        const cutoff = 0.6 - (0.2 * cycle);
        this.filterNode.frequency.value = baseFreq * cutoff;
      } else if (theme === MusicTheme.VICTORY) {
        // Gentle high-pass + resonance 50% for brightness
        this.filterNode.type = 'highpass';
        this.filterNode.frequency.value = baseFreq * 0.3;
        this.filterNode.Q.value = 3.0;
      }
    } catch (error) {
    }
  }

  /**
   * Get theme configuration - Following exact spec notation:
   * -4 = quarter note (1 beat)
   * -8 = eighth note (0.5 beats)
   * -2 = half note (2 beats)
   * -32 = 32nd note (0.125 beats)
   */
  private getThemeConfig(theme: MusicTheme): any {
    const C1 = 32.70, G1 = 49.00, Ab1 = 51.91, F1 = 43.65, Bb0 = 29.14;
    const C2 = 65.41, G2 = 98.00, Ab2 = 103.83, F2 = 87.31;
    const Bb1 = 58.27;
    const C3 = 130.81, Eb3 = 155.56, F3 = 174.61, G3 = 196.00, Ab3 = 207.65;
    const C4 = 261.63, D4 = 293.66, Eb4 = 311.13, F4 = 349.23;
    const G4 = 392.00, Ab4 = 415.30, Bb4 = 466.16, C5 = 523.25;

    switch (theme) {
      case MusicTheme.MENU:
        // Menu Theme: "Echoes of Synax" - 100 BPM
        // Voice1: C4-4 Eb4-4 G4-4 Bb4-4 | Ab4-8 G4-8 F4-4 | G4-2 (hold) |
        return {
          tempo: 100,
          pattern: {
            voice1: [
              { frequency: C4, duration: 1, startBeat: 0 },    // C4-4 (quarter note)
              { frequency: Eb4, duration: 1, startBeat: 1 },  // Eb4-4
              { frequency: G4, duration: 1, startBeat: 2 },   // G4-4
              { frequency: Bb4, duration: 1, startBeat: 3 }, // Bb4-4
              { frequency: Ab4, duration: 0.5, startBeat: 4 }, // Ab4-8 (eighth note)
              { frequency: G4, duration: 0.5, startBeat: 4.5 }, // G4-8
              { frequency: F4, duration: 1, startBeat: 5 },    // F4-4
              { frequency: G4, duration: 2, startBeat: 6 },   // G4-2 (half note, hold)
            ],
            voice2: [
              // Voice2: C2-2 G2-2 Ab2-2 F2-2 | G2-4 (rest 4) |
              { frequency: C2, duration: 2, startBeat: 0 },   // C2-2 (half note)
              { frequency: G2, duration: 2, startBeat: 2 },   // G2-2
              { frequency: Ab2, duration: 2, startBeat: 4 },  // Ab2-2
              { frequency: F2, duration: 2, startBeat: 6 },  // F2-2
              { frequency: G2, duration: 4, startBeat: 8 },  // G2-4 (whole note, rest 4 after)
            ],
          },
        };

      case MusicTheme.GAMEPLAY:
        // Gameplay Theme: "Defend the Station" - 130 BPM
        // Continuous loop with no gaps - all voices playing throughout
        return {
          tempo: 130,
          pattern: {
            voice1: [
              // Continuous melody - no gaps, all notes connect
              { frequency: C4, duration: 0.5, startBeat: 0 },      // C4-8
              { frequency: D4, duration: 0.5, startBeat: 0.5 },   // D4-8
              { frequency: Eb4, duration: 0.5, startBeat: 1 },      // Eb4-8
              { frequency: G4, duration: 0.5, startBeat: 1.5 },    // G4-8
              { frequency: F4, duration: 0.5, startBeat: 2 },      // F4-8
              { frequency: G4, duration: 0.5, startBeat: 2.5 },   // G4-8
              { frequency: Ab4, duration: 0.5, startBeat: 3 },     // Ab4-8
              { frequency: Bb4, duration: 0.5, startBeat: 3.5 },  // Bb4-8
              { frequency: C5, duration: 0.5, startBeat: 4 },      // C5-8
              { frequency: Bb4, duration: 0.5, startBeat: 4.5 },   // Bb4-8
              { frequency: C5, duration: 0.5, startBeat: 5 },      // C5-8
              { frequency: G4, duration: 0.5, startBeat: 5.5 },   // G4-8
              { frequency: Eb4, duration: 0.5, startBeat: 6 },     // Eb4-8
              { frequency: F4, duration: 0.5, startBeat: 6.5 },   // F4-8
              { frequency: G4, duration: 0.5, startBeat: 7 },     // G4-8
              { frequency: Ab4, duration: 0.5, startBeat: 7.5 },  // Ab4-8
              { frequency: G4, duration: 0.5, startBeat: 8 },      // G4-8 (loop back)
              { frequency: F4, duration: 0.5, startBeat: 8.5 },   // F4-8
              { frequency: Eb4, duration: 0.5, startBeat: 9 },     // Eb4-8
              { frequency: D4, duration: 0.5, startBeat: 9.5 },   // D4-8
              { frequency: C4, duration: 0.5, startBeat: 10 },     // C4-8
              { frequency: D4, duration: 0.5, startBeat: 10.5 },   // D4-8
              { frequency: Eb4, duration: 0.5, startBeat: 11 },    // Eb4-8
              { frequency: G4, duration: 0.5, startBeat: 11.5 },   // G4-8
              { frequency: F4, duration: 0.5, startBeat: 12 },     // F4-8
              { frequency: Eb4, duration: 0.5, startBeat: 12.5 },  // Eb4-8
              { frequency: D4, duration: 0.5, startBeat: 13 },     // D4-8
              { frequency: C4, duration: 0.5, startBeat: 13.5 },   // C4-8
              { frequency: C4, duration: 0.5, startBeat: 14 },    // C4-8 (transition)
              { frequency: D4, duration: 0.5, startBeat: 14.5 },   // D4-8
              { frequency: Eb4, duration: 0.5, startBeat: 15 },    // Eb4-8
              { frequency: G4, duration: 0.5, startBeat: 15.5 },   // G4-8 (leads back to beat 0)
            ],
            voice2: [
              // Continuous bass line - no gaps
              { frequency: C2, duration: 0.5, startBeat: 0 },      // C2-8
              { frequency: C2, duration: 0.5, startBeat: 0.5 },   // C2-8
              { frequency: G2, duration: 0.5, startBeat: 1 },      // G2-8
              { frequency: G2, duration: 0.5, startBeat: 1.5 },    // G2-8
              { frequency: Ab2, duration: 0.5, startBeat: 2 },     // Ab2-8
              { frequency: F2, duration: 0.5, startBeat: 2.5 },   // F2-8
              { frequency: G2, duration: 0.5, startBeat: 3 },     // G2-8
              { frequency: G2, duration: 0.5, startBeat: 3.5 },   // G2-8
              { frequency: C2, duration: 0.5, startBeat: 4 },      // C2-8
              { frequency: C2, duration: 0.5, startBeat: 4.5 },   // C2-8
              { frequency: Bb1, duration: 0.5, startBeat: 5 },     // Bb1-8
              { frequency: G1, duration: 0.5, startBeat: 5.5 },    // G1-8
              { frequency: Ab1, duration: 0.5, startBeat: 6 },     // Ab1-8
              { frequency: G2, duration: 0.5, startBeat: 6.5 },    // G2-8
              { frequency: C2, duration: 0.5, startBeat: 7 },      // C2-8
              { frequency: C2, duration: 0.5, startBeat: 7.5 },   // C2-8
              { frequency: G2, duration: 0.5, startBeat: 8 },      // G2-8
              { frequency: G2, duration: 0.5, startBeat: 8.5 },   // G2-8
              { frequency: Ab2, duration: 0.5, startBeat: 9 },     // Ab2-8
              { frequency: F2, duration: 0.5, startBeat: 9.5 },   // F2-8
              { frequency: G2, duration: 0.5, startBeat: 10 },    // G2-8
              { frequency: G2, duration: 0.5, startBeat: 10.5 },   // G2-8
              { frequency: C2, duration: 0.5, startBeat: 11 },     // C2-8
              { frequency: C2, duration: 0.5, startBeat: 11.5 },   // C2-8
              { frequency: Bb1, duration: 0.5, startBeat: 12 },    // Bb1-8
              { frequency: G1, duration: 0.5, startBeat: 12.5 },   // G1-8
              { frequency: Ab1, duration: 0.5, startBeat: 13 },    // Ab1-8
              { frequency: G2, duration: 0.5, startBeat: 13.5 },   // G2-8
              { frequency: C2, duration: 0.5, startBeat: 14 },     // C2-8
              { frequency: C2, duration: 0.5, startBeat: 14.5 },  // C2-8
              { frequency: G2, duration: 0.5, startBeat: 15 },     // G2-8
              { frequency: G2, duration: 0.5, startBeat: 15.5 },  // G2-8 (leads back to beat 0)
            ],
          },
        };

      case MusicTheme.GAME_OVER:
        // Game Over Theme: "The Fall of Synax" - 80 BPM
        // Voice1: G3-4 Ab3-4 G3-8 F3-8 Eb3-4 | C3-2 (rest 2) |
        return {
          tempo: 80,
          pattern: {
            voice1: [
              { frequency: G3, duration: 1, startBeat: 0 },   // G3-4
              { frequency: Ab3, duration: 1, startBeat: 1 },  // Ab3-4
              { frequency: G3, duration: 0.5, startBeat: 2 }, // G3-8
              { frequency: F3, duration: 0.5, startBeat: 2.5 }, // F3-8
              { frequency: Eb3, duration: 1, startBeat: 3 },  // Eb3-4
              { frequency: C3, duration: 2, startBeat: 4 },   // C3-2 (rest 2 after)
            ],
            voice2: [
              // Voice2: C2-2 (rest 2) | G2-2 (rest 2) |
              { frequency: C2, duration: 2, startBeat: 0 },
              { frequency: G2, duration: 2, startBeat: 4 },
            ],
          },
        };

      case MusicTheme.VICTORY:
        // Victory Theme: "Synax Triumphant" - 110 BPM
        // Continuous loop with no gaps - all voices playing throughout
        return {
          tempo: 110,
          pattern: {
            voice1: [
              // Continuous melody - no gaps, all notes connect
              { frequency: C4, duration: 1, startBeat: 0 },      // C4-4
              { frequency: Eb4, duration: 1, startBeat: 1 },     // Eb4-4
              { frequency: G4, duration: 1, startBeat: 2 },      // G4-4
              { frequency: C5, duration: 1, startBeat: 3 },      // C5-4
              { frequency: Bb4, duration: 1, startBeat: 4 },     // Bb4-4
              { frequency: G4, duration: 1, startBeat: 5 },      // G4-4
              { frequency: Eb4, duration: 1, startBeat: 6 },     // Eb4-4
              { frequency: C5, duration: 1, startBeat: 7 },      // C5-4
              { frequency: C5, duration: 1, startBeat: 8 },      // C5-4
              { frequency: Bb4, duration: 1, startBeat: 9 },     // Bb4-4
              { frequency: G4, duration: 1, startBeat: 10 },     // G4-4
              { frequency: Eb4, duration: 1, startBeat: 11 },    // Eb4-4
              { frequency: C4, duration: 1, startBeat: 12 },     // C4-4
              { frequency: Eb4, duration: 1, startBeat: 13 },     // Eb4-4
              { frequency: G4, duration: 1, startBeat: 14 },      // G4-4
              { frequency: C5, duration: 1, startBeat: 15 },     // C5-4 (leads back to beat 0)
            ],
            voice2: [
              // Continuous lower bass line - using C2/G2/Ab2/F2 for better audibility
              { frequency: C2, duration: 1, startBeat: 0 },      // C2-4
              { frequency: G2, duration: 1, startBeat: 1 },     // G2-4
              { frequency: Ab2, duration: 1, startBeat: 2 },     // Ab2-4
              { frequency: F2, duration: 1, startBeat: 3 },     // F2-4
              { frequency: C2, duration: 1, startBeat: 4 },     // C2-4
              { frequency: G2, duration: 1, startBeat: 5 },     // G2-4
              { frequency: Ab2, duration: 1, startBeat: 6 },     // Ab2-4
              { frequency: F2, duration: 1, startBeat: 7 },     // F2-4
              { frequency: C2, duration: 1, startBeat: 8 },     // C2-4
              { frequency: G2, duration: 1, startBeat: 9 },     // G2-4
              { frequency: Ab2, duration: 1, startBeat: 10 },    // Ab2-4
              { frequency: F2, duration: 1, startBeat: 11 },     // F2-4
              { frequency: C2, duration: 1, startBeat: 12 },     // C2-4
              { frequency: G2, duration: 1, startBeat: 13 },     // G2-4
              { frequency: Ab2, duration: 1, startBeat: 14 },    // Ab2-4
              { frequency: F2, duration: 1, startBeat: 15 },     // F2-4 (leads back to beat 0)
            ],
          },
        };
        
      default:
        return {
          tempo: 100,
          pattern: {
            voice1: [],
            voice2: [],
          },
        };
    }
  }

  /**
   * Stop current music
   */
  stop(): void {
    this.isPlaying = false;
    
    if (this.scheduleInterval !== null) {
      clearTimeout(this.scheduleInterval);
      this.scheduleInterval = null;
    }
    
    this.scheduledNotes.clear();
  }

  /**
   * Set master volume
   */
  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Enable or disable music system
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
export const musicSystem = new MusicSystem();
