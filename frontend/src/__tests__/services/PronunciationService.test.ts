import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class MockRecognition {
  static instance: MockRecognition;
  continuous = false;
  interimResults = false;
  lang = '';
  maxAlternatives = 0;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();

  constructor() {
    MockRecognition.instance = this;
  }
}

class MockMediaRecorder {
  static isTypeSupported = vi.fn<(type: string) => boolean>(() => true);
  static instance: MockMediaRecorder;
  state = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  start = vi.fn(() => { this.state = 'recording'; });
  stop = vi.fn(() => { this.state = 'inactive'; });

  stream: MediaStream;
  options?: MediaRecorderOptions;

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    this.stream = stream;
    this.options = options;
    MockMediaRecorder.instance = this;
  }
}

describe('PronunciationService browser fallback', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('SpeechRecognition', MockRecognition);
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: MockRecognition,
    });
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    ['This is my mom.', '  THIS is my mom  ', 100, true],
    ['This is my mom.', 'Mom', 21, false],
    ['It is a butterfly.', 'butterfly', 25, false],
    ['It is a butterfly.', 'It is a butterfly', 100, true],
    ['cat', 'the cat', 96, true],
    ['cat', 'caterpillar', 27, false],
  ])('scores expected "%s" against transcript "%s"', async (expected, transcript, accuracy, isCorrect) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ emoji: '', message: 'Keep practicing' }),
    }));
    const { default: PronunciationService } = await import(
      '@/features/pronunciation/services/PronunciationService'
    );
    const { eventBus } = await import('@/runtime/EventBus');
    const started = vi.fn();
    eventBus.on('PRONUNCIATION_STARTED', started);
    const onResult = vi.fn();
    const service = new PronunciationService();

    await service.startListening(expected, onResult);
    MockRecognition.instance.onresult?.({ results: [[{ transcript, confidence: 0.9 }]] });

    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(expect.objectContaining({
      transcript, accuracy, isCorrect,
    })));
    expect(started).toHaveBeenCalledWith(expect.objectContaining({ expectedWord: expected.toLowerCase() }));
  });

  it('chooses the complete sentence over a partial-word recognition alternative', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ emoji: '', message: 'Well done' }),
    }));
    const { default: PronunciationService } = await import(
      '@/features/pronunciation/services/PronunciationService'
    );
    const service = new PronunciationService();
    const onResult = vi.fn();
    await service.startListening('This is my mom.', onResult);

    MockRecognition.instance.onresult?.({ results: [[
      { transcript: 'Mom', confidence: 0.99 },
      { transcript: 'This is my mom', confidence: 0.8 },
    ]] });

    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(expect.objectContaining({
      transcript: 'This is my mom', accuracy: 100, isCorrect: true,
    })));
  });

  it('continues the active attempt with server recording before emitting a terminal Web Speech error', async () => {
    const stopTrack = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: stopTrack }],
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ available: true }),
    }));

    const { default: PronunciationService } = await import(
      '@/features/pronunciation/services/PronunciationService'
    );
    const { eventBus } = await import('@/runtime/EventBus');
    const service = new PronunciationService();
    const errors: string[] = [];
    eventBus.on<{ error: string }>('PRONUNCIATION_ERROR', ({ error }) => errors.push(error));

    await service.startListening('Elephant');
    MockRecognition.instance.onerror?.({ error: 'service-not-allowed' });

    await vi.waitFor(() => expect(getUserMedia).toHaveBeenCalledWith({ audio: true }));
    expect(MockMediaRecorder.instance.start).toHaveBeenCalledTimes(1);
    expect(errors).toEqual([]);
  });

  it('uploads MP4 recordings with an MP4 filename', async () => {
    const getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    MockMediaRecorder.isTypeSupported.mockImplementation((type: string) => type === 'audio/mp4');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ available: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'Elephant', confidence: 0.9 }) });
    vi.stubGlobal('fetch', fetchMock);

    const { default: PronunciationService } = await import(
      '@/features/pronunciation/services/PronunciationService'
    );
    const service = new PronunciationService();
    await service.startListening('Elephant');
    MockRecognition.instance.onerror?.({ error: 'service-not-allowed' });
    await vi.waitFor(() => expect(getUserMedia).toHaveBeenCalledWith({ audio: true }));

    MockMediaRecorder.instance.ondataavailable?.({ data: new Blob(['audio'], { type: 'audio/mp4' }) });
    await MockMediaRecorder.instance.onstop?.();

    const body = fetchMock.mock.calls[1][1].body as FormData;
    const audio = body.get('audio') as File;
    expect(audio.name).toBe('recording.mp4');
    expect(audio.type).toBe('audio/mp4');
  });

  it('re-tries Web Speech on the next attempt after a transient fallback error', async () => {
    const getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ available: true }),
    }));

    const { default: PronunciationService } = await import(
      '@/features/pronunciation/services/PronunciationService'
    );
    const service = new PronunciationService();

    // First attempt errors and falls back to server.
    await service.startListening('Elephant');
    expect(MockRecognition.instance.start).toHaveBeenCalledTimes(1);
    MockRecognition.instance.onerror?.({ error: 'network' });
    await vi.waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));

    // Second attempt must probe Web Speech again, not stay stuck on server.
    await service.startListening('Elephant');
    expect(MockRecognition.instance.start).toHaveBeenCalledTimes(2);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('emits a friendly terminal error only when server fallback is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ available: false }),
    }));

    const { default: PronunciationService } = await import(
      '@/features/pronunciation/services/PronunciationService'
    );
    const { eventBus } = await import('@/runtime/EventBus');
    const service = new PronunciationService();
    const errors: string[] = [];
    eventBus.on<{ error: string }>('PRONUNCIATION_ERROR', ({ error }) => errors.push(error));

    await service.startListening('Elephant');
    MockRecognition.instance.onerror?.({ error: 'service-not-allowed' });

    await vi.waitFor(() => expect(errors).toEqual(['speech-recognition-unavailable']));
    expect(errors).not.toContain('service-not-allowed');
  });
});
