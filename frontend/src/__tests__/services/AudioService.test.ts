import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiBaseMocks = vi.hoisted(() => ({
  getApiBase: vi.fn(() => 'https://api.example.test'),
}));

vi.mock('@/config', () => apiBaseMocks);

import { AudioService } from '@/services/AudioService';

class MockAudio {
  static instances: MockAudio[] = [];
  paused = true;
  onended: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });

  src: string;

  constructor(src: string) {
    this.src = src;
    MockAudio.instances.push(this);
  }
}

describe('AudioService pronunciation playback', () => {
  beforeEach(() => {
    MockAudio.instances = [];
    vi.stubGlobal('Audio', MockAudio);
    vi.stubGlobal('AudioContext', class {
      state = 'running';
      resume = vi.fn();
    });
    AudioService.stop();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts the provided vocabulary asset immediately and resolves only when playback ends', async () => {
    let resolved = false;

    const playback = AudioService.playPronunciation(
      'Elephant',
      'en',
      '/learnar-assets/courses/momo-nature/audio/elephant.wav',
    ).then(() => { resolved = true; });

    expect(MockAudio.instances[0]?.src).toBe('/learnar-assets/courses/momo-nature/audio/elephant.wav');
    expect(MockAudio.instances[0]?.play).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(resolved).toBe(false);

    MockAudio.instances[0]?.onended?.();
    await playback;
    expect(resolved).toBe(true);
  });

  it('stops active playback before starting a second pronunciation', () => {
    void AudioService.playPronunciation('Elephant', 'en', '/elephant.wav');
    const firstAudio = MockAudio.instances[0];

    void AudioService.playPronunciation('Trunk', 'en', '/trunk.wav');

    expect(firstAudio.pause).toHaveBeenCalledTimes(1);
    expect(MockAudio.instances[1]?.src).toBe('/trunk.wav');
  });

  it('tries the existing TTS stream after the vocabulary asset fails', async () => {
    const playback = AudioService.playPronunciation('Elephant', 'en', '/elephant.wav');

    MockAudio.instances[0]?.onerror?.(new Event('error'));
    await vi.waitFor(() => {
      expect(MockAudio.instances[1]?.src).toBe(
        'https://api.example.test/api/v1/pronunciation/tts/stream/Elephant?language=en',
      );
    });

    MockAudio.instances[1]?.onended?.();
    await playback;
  });

  it('rejects when audio and speech synthesis are both unavailable', async () => {
    const playback = AudioService.playPronunciation('Elephant', 'en', '/elephant.wav');
    MockAudio.instances[0]?.onerror?.(new Event('error'));

    await vi.waitFor(() => expect(MockAudio.instances).toHaveLength(2));
    MockAudio.instances[1]?.onerror?.(new Event('error'));

    await expect(playback).rejects.toBeDefined();
  });
});

describe('AudioService playback without a usable AudioContext', () => {
  beforeEach(() => {
    MockAudio.instances = [];
    vi.stubGlobal('Audio', MockAudio);
    // Reset the cached context so init() re-runs the AudioContext path.
    (AudioService as unknown as { audioContext: AudioContext | null }).audioContext = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('still starts HTMLAudioElement playback when AudioContext is absent', () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    AudioService.stop();

    void AudioService.playPronunciation('Elephant', 'en', '/elephant.wav');

    expect(MockAudio.instances[0]?.src).toBe('/elephant.wav');
    expect(MockAudio.instances[0]?.play).toHaveBeenCalledTimes(1);
  });

  it('still starts HTMLAudioElement playback when the AudioContext constructor throws', () => {
    vi.stubGlobal('AudioContext', class {
      constructor() {
        throw new Error('AudioContext blocked');
      }
    });
    AudioService.stop();

    void AudioService.playPronunciation('Elephant', 'en', '/elephant.wav');

    expect(MockAudio.instances[0]?.src).toBe('/elephant.wav');
    expect(MockAudio.instances[0]?.play).toHaveBeenCalledTimes(1);
  });
});
