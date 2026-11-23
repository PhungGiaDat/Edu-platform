/**
 * SoundEffectService - Audio feedback for UI interactions
 * 
 * Uses Web Audio API for low-latency sound effects + preloaded audio files
 * for more complex sounds. Designed for kid-friendly interactions.
 * 
 * Usage:
 *   await SoundEffectService.play('tap');
 *   await SoundEffectService.play('success');
 *   await SoundEffectService.playTone(440, 0.1); // Custom beep
 */

type SoundType = 
  | 'tap'
  | 'success'
  | 'error'
  | 'correct'
  | 'incorrect'
  | 'combo'
  | 'levelUp'
  | 'cardFlip'
  | 'match'
  | 'pop'
  | 'whoosh'
  | 'chime'
  | 'click'
  | 'notification'
  | 'chestOpen'
  | 'reward';

interface SoundConfig {
  frequency?: number;     // Hz for generated tones
  duration?: number;      // seconds
  type?: OscillatorType;  // sine, square, triangle, sawtooth
  volume?: number;        // 0-1
  url?: string;           // URL for audio file
  ramp?: boolean;         // Fade out
}

// Sound configurations - mix of Web Audio generated and audio files
const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  // Generated tones (instant, no network)
  tap: {
    frequency: 800,
    duration: 0.05,
    type: 'sine',
    volume: 0.2,
    ramp: true,
  },
  
  click: {
    frequency: 1000,
    duration: 0.03,
    type: 'square',
    volume: 0.15,
    ramp: true,
  },
  
  pop: {
    frequency: 400,
    duration: 0.08,
    type: 'sine',
    volume: 0.3,
    ramp: true,
  },
  
  // Success sounds
  success: {
    frequency: 523.25, // C5
    duration: 0.15,
    type: 'sine',
    volume: 0.3,
    ramp: true,
  },
  
  correct: {
    frequency: 659.25, // E5 
    duration: 0.12,
    type: 'triangle',
    volume: 0.35,
    ramp: true,
  },
  
  // Error sounds
  error: {
    frequency: 200,
    duration: 0.2,
    type: 'sawtooth',
    volume: 0.25,
    ramp: true,
  },
  
  incorrect: {
    frequency: 150,
    duration: 0.25,
    type: 'square',
    volume: 0.2,
    ramp: true,
  },
  
  // Game sounds
  cardFlip: {
    frequency: 600,
    duration: 0.06,
    type: 'sine',
    volume: 0.2,
    ramp: true,
  },
  
  match: {
    frequency: 880, // A5
    duration: 0.15,
    type: 'sine',
    volume: 0.35,
    ramp: true,
  },
  
  // Special sounds (use audio files for more complex sounds)
  combo: {
    url: '/sounds/combo.mp3',
    volume: 0.5,
  },
  
  levelUp: {
    url: '/sounds/level-up.mp3',
    volume: 0.5,
  },
  
  whoosh: {
    frequency: 300,
    duration: 0.2,
    type: 'sine',
    volume: 0.2,
    ramp: true,
  },
  
  chime: {
    frequency: 1046.5, // C6
    duration: 0.3,
    type: 'sine',
    volume: 0.25,
    ramp: true,
  },
  
  notification: {
    frequency: 700,
    duration: 0.1,
    type: 'triangle',
    volume: 0.3,
    ramp: true,
  },

  // Reward chest sounds
  chestOpen: {
    url: '/sounds/chest-open.mp3',
    volume: 0.6,
  },

  reward: {
    url: '/sounds/reward.mp3',
    volume: 0.6,
  },
};

class SoundEffectServiceClass {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    // Load user preferences
    if (typeof localStorage !== 'undefined') {
      const savedEnabled = localStorage.getItem('sound_enabled');
      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true';
      }
      
      const savedVolume = localStorage.getItem('sound_volume');
      if (savedVolume !== null) {
        this.volume = parseFloat(savedVolume);
      }
    }
  }

  /**
   * Initialize AudioContext (must be called after user interaction)
   */
  private async initAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    
    // Resume if suspended (browsers require user interaction)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    return this.audioContext;
  }

  /**
   * Check if sound is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable sound
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sound_enabled', String(enabled));
    }
  }

  /**
   * Toggle sound on/off
   */
  toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sound_volume', String(this.volume));
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Play a predefined sound effect
   */
  async play(type: SoundType): Promise<void> {
    if (!this.enabled) return;

    const config = SOUND_CONFIGS[type];
    if (!config) {
      console.warn(`[SoundEffectService] Unknown sound type: ${type}`);
      return;
    }

    try {
      if (config.url) {
        // Play audio file
        await this.playAudioFile(config.url, config.volume ?? 1);
      } else if (config.frequency) {
        // Generate tone
        await this.playTone(
          config.frequency,
          config.duration ?? 0.1,
          config.type ?? 'sine',
          config.volume ?? 0.3,
          config.ramp ?? true
        );
      }
    } catch (error) {
      // Silently fail - sound might not work in all contexts
      console.debug(`[SoundEffectService] Failed to play ${type}:`, error);
    }
  }

  /**
   * Play a custom tone using Web Audio API
   */
  async playTone(
    frequency: number,
    duration: number = 0.1,
    type: OscillatorType = 'sine',
    volume: number = 0.3,
    ramp: boolean = true
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      const ctx = await this.initAudioContext();
      
      // Create oscillator
      const oscillator = ctx.createOscillator();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      // Create gain node for volume control
      const gainNode = ctx.createGain();
      const finalVolume = volume * this.volume;
      gainNode.gain.setValueAtTime(finalVolume, ctx.currentTime);
      
      // Ramp down to avoid clicks
      if (ramp) {
        gainNode.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + duration
        );
      }
      
      // Connect and play
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.debug('[SoundEffectService] Failed to play tone:', error);
    }
  }

  /**
   * Play a sequence of tones (for melodies)
   */
  async playSequence(
    notes: { frequency: number; duration: number }[],
    type: OscillatorType = 'sine',
    volume: number = 0.3
  ): Promise<void> {
    if (!this.enabled) return;

    for (const note of notes) {
      await this.playTone(note.frequency, note.duration, type, volume, true);
      // Small gap between notes
      await new Promise(resolve => setTimeout(resolve, note.duration * 1000 + 20));
    }
  }

  /**
   * Play success melody (C-E-G chord arpeggio)
   */
  async playSuccessMelody(): Promise<void> {
    await this.playSequence([
      { frequency: 523.25, duration: 0.1 },  // C5
      { frequency: 659.25, duration: 0.1 },  // E5
      { frequency: 783.99, duration: 0.15 }, // G5
    ], 'sine', 0.3);
  }

  /**
   * Play error sound (descending)
   */
  async playErrorSound(): Promise<void> {
    await this.playSequence([
      { frequency: 400, duration: 0.1 },
      { frequency: 300, duration: 0.15 },
    ], 'sawtooth', 0.2);
  }

  /**
   * Play combo fanfare
   */
  async playComboFanfare(): Promise<void> {
    // Try audio file first, fallback to generated
    try {
      await this.playAudioFile('/sounds/combo.mp3', 0.5);
    } catch {
      // Fallback to generated melody
      await this.playSequence([
        { frequency: 523.25, duration: 0.08 }, // C5
        { frequency: 659.25, duration: 0.08 }, // E5
        { frequency: 783.99, duration: 0.08 }, // G5
        { frequency: 1046.5, duration: 0.2 },  // C6
      ], 'sine', 0.35);
    }
  }

  /**
   * Play audio file (for complex sounds)
   */
  private async playAudioFile(url: string, volume: number = 1): Promise<void> {
    if (!this.enabled) return;

    try {
      // Check cache first
      let audio = this.audioCache.get(url);
      
      if (!audio) {
        audio = new Audio(url);
        audio.preload = 'auto';
        
        // Only cache if it loads successfully
        await new Promise<void>((resolve, reject) => {
          audio!.oncanplaythrough = () => resolve();
          audio!.onerror = () => reject(new Error(`Failed to load ${url}`));
          audio!.load();
        });
        
        this.audioCache.set(url, audio);
      }
      
      // Clone for overlapping plays
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = volume * this.volume;
      await clone.play();
    } catch (error) {
      // File might not exist, use fallback tone
      console.debug(`[SoundEffectService] Audio file not found: ${url}, using fallback`);
      await this.playTone(600, 0.15, 'sine', 0.3, true);
    }
  }

  /**
   * Preload audio files for faster playback
   */
  async preload(types: SoundType[]): Promise<void> {
    for (const type of types) {
      const config = SOUND_CONFIGS[type];
      if (config.url) {
        try {
          const audio = new Audio(config.url);
          audio.preload = 'auto';
          audio.load();
          this.audioCache.set(config.url, audio);
        } catch {
          // Ignore preload failures
        }
      }
    }
  }

  /**
   * Unlock audio context (call on first user interaction)
   */
  async unlock(): Promise<void> {
    try {
      await this.initAudioContext();
      // Play silent sound to unlock
      await this.playTone(1, 0.001, 'sine', 0);
    } catch {
      // Ignore unlock failures
    }
  }
}

// Export singleton instance
export const SoundEffectService = new SoundEffectServiceClass();

// Export class for testing
export { SoundEffectServiceClass };

// Export types
export type { SoundType };

// Default export for convenience
export default SoundEffectService;
