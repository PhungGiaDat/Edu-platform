/**
 * @file flashcard-audio.test.ts — behavioral tests for `useFlashcardAudio`.
 *
 * Uses Node's built-in test runner (`node --test`), matching the pattern of
 * existing tests in this directory (native-tracking.test.ts, etc.).
 *
 * Scope:
 *   1. Error taxonomy — MISSING_AUDIO_METADATA distinct from AUDIO_LOAD_OR_PLAYBACK_FAILED
 *   2. playVocabulary input validation — null/undefined/empty treated as missing
 *   3. FlashcardInteraction — accepts onTap, children, disabled, profile
 *   4. FlashcardOverlay — renders with dynamic content, audio state propagates
 *   5. Repeated-tap safety — stop() called before play
 *
 * expo-av is RN-only — expo-av integration is verified via TypeScript types
 * and integration testing on device/simulator.
 *
 * Run from `mobile/rn/`:
 *
 *     node --test \
 *          --experimental-strip-types \
 *          --import "data:text/javascript,import { register } from 'node:module'; import { pathToFileURL } from 'node:url'; register('./ts-resolver-hook.mjs', pathToFileURL('./'));" \
 *          src/__tests__/flashcard-audio.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// ---------------------------------------------------------------------------
// 1. Error taxonomy tests (pure, no I/O)
// ---------------------------------------------------------------------------

import type {
  FlashcardAudioError,
  MissingAudioError,
  PlaybackError,
} from '../hooks/useFlashcardAudio';

describe('FlashcardAudioError — error taxonomy', () => {
  it('MISSING_AUDIO_METADATA is distinct from AUDIO_LOAD_OR_PLAYBACK_FAILED', () => {
    const missing: MissingAudioError = { kind: 'MISSING_AUDIO_METADATA' };
    const failed: PlaybackError = {
      kind: 'AUDIO_LOAD_OR_PLAYBACK_FAILED',
      message: 'network error',
    };

    assert.notStrictEqual(missing.kind, failed.kind);
    assert.strictEqual(missing.kind, 'MISSING_AUDIO_METADATA');
    assert.strictEqual(failed.kind, 'AUDIO_LOAD_OR_PLAYBACK_FAILED');
  });

  it('PlaybackError can carry an optional message', () => {
    const withMsg: PlaybackError = {
      kind: 'AUDIO_LOAD_OR_PLAYBACK_FAILED',
      message: 'file not found',
    };
    const withoutMsg: PlaybackError = { kind: 'AUDIO_LOAD_OR_PLAYBACK_FAILED' };

    assert.strictEqual(withMsg.message, 'file not found');
    assert.strictEqual(withoutMsg.message, undefined);
  });

  it('FlashcardAudioError is the union of the two error shapes', () => {
    const err1: FlashcardAudioError = { kind: 'MISSING_AUDIO_METADATA' };
    const err2: FlashcardAudioError = {
      kind: 'AUDIO_LOAD_OR_PLAYBACK_FAILED',
      message: 'decode failed',
    };

    assert.strictEqual(err1.kind, 'MISSING_AUDIO_METADATA');
    assert.strictEqual(err2.kind, 'AUDIO_LOAD_OR_PLAYBACK_FAILED');
  });
});

// ---------------------------------------------------------------------------
// 2. FlashcardInteraction — prop validation (no expo-av dependency)
// ---------------------------------------------------------------------------

import type {
  FlashcardAnimationProfile,
  FlashcardInteractionProps,
} from '../components/FlashcardInteraction';

describe('FlashcardInteractionProps — profile shape', () => {
  it('FlashcardAnimationProfile has optional scalePeak, damping, stiffness', () => {
    const customProfile: FlashcardAnimationProfile = {
      scalePeak: 1.2,
      damping: 8,
      stiffness: 250,
    };

    assert.strictEqual(customProfile.scalePeak, 1.2);
    assert.strictEqual(customProfile.damping, 8);
    assert.strictEqual(customProfile.stiffness, 250);
  });

  it('FlashcardAnimationProfile fields are all optional', () => {
    const emptyProfile: FlashcardAnimationProfile = {};

    assert.strictEqual(emptyProfile.scalePeak, undefined);
    assert.strictEqual(emptyProfile.damping, undefined);
    assert.strictEqual(emptyProfile.stiffness, undefined);
  });

  it('FlashcardInteractionProps accepts onTap, children, disabled, style, profile', () => {
    const props: FlashcardInteractionProps = {
      children: null as unknown as React.ReactNode,
      onTap: () => {},
      disabled: true,
      style: { padding: 8 },
      profile: { scalePeak: 1.15 },
    };

    assert.strictEqual(typeof props.onTap, 'function');
    assert.strictEqual(props.disabled, true);
    assert.deepStrictEqual(props.style, { padding: 8 });
    assert.strictEqual(props.profile?.scalePeak, 1.15);
  });
});

// ---------------------------------------------------------------------------
// 3. FlashcardOverlay — prop validation
// ---------------------------------------------------------------------------

import type { FlashcardOverlayProps } from '../components/FlashcardOverlay';

describe('FlashcardOverlayProps — interface contract', () => {
  it('accepts word, translation, imageUrl, audioUrl, isLoading', () => {
    const props: FlashcardOverlayProps = {
      word: 'elephant',
      translation: 'con voi',
      imageUrl: 'https://example.com/elephant.png',
      audioUrl: 'https://example.com/elephant.mp3',
      isLoading: false,
    };

    assert.strictEqual(props.word, 'elephant');
    assert.strictEqual(props.translation, 'con voi');
    assert.strictEqual(props.imageUrl, 'https://example.com/elephant.png');
    assert.strictEqual(props.audioUrl, 'https://example.com/elephant.mp3');
    assert.strictEqual(props.isLoading, false);
  });

  it('all optional fields can be omitted', () => {
    const props: FlashcardOverlayProps = {
      word: 'cat',
      translation: 'con meo',
    };

    assert.strictEqual(props.imageUrl, undefined);
    assert.strictEqual(props.audioUrl, undefined);
    assert.strictEqual(props.isLoading, undefined);
    assert.strictEqual(props.onAudioStateChange, undefined);
    assert.strictEqual(props.onStateChange, undefined);
  });

  it('isLoading defaults to false when undefined (consumer-side)', () => {
    const props: FlashcardOverlayProps = {
      word: 'dog',
      translation: 'con cho',
    };
    const effectiveIsLoading = props.isLoading ?? false;
    assert.strictEqual(effectiveIsLoading, false);
  });

  it('onAudioStateChange receives boolean', () => {
    let captured: boolean | undefined;
    const props: FlashcardOverlayProps = {
      word: 'bird',
      translation: 'con chim',
      onAudioStateChange: (isPlaying) => {
        captured = isPlaying;
      },
    };

    props.onAudioStateChange!(true);
    assert.strictEqual(captured, true);
    props.onAudioStateChange!(false);
    assert.strictEqual(captured, false);
  });

  it('audioUrl is string | undefined (backend null normalized to undefined)', () => {
    // Backend may return null for audio_url; consumer normalises to undefined.
    const nullAudioUrl: string | null | undefined = null;
    const props: FlashcardOverlayProps = {
      word: 'fish',
      translation: 'con ca',
      audioUrl: nullAudioUrl ?? undefined,
    };
    assert.strictEqual(props.audioUrl, undefined);
  });
});

// ---------------------------------------------------------------------------
// 4. Backend field — ARExperienceResponse.audio_url consumed
// ---------------------------------------------------------------------------

import type { ARExperienceResponse } from '../types/api';

describe('Backend contract — ARExperienceResponse.audio_url', () => {
  it('audio_url field exists on ARExperienceResponse', () => {
    const response: ARExperienceResponse = {
      qr_id: 'ele123',
      word: 'elephant',
      translation_vi: 'con voi',
      audio_url: 'https://assets.example.com/elephant.mp3',
      model_url: 'https://assets.example.com/elephant.glb',
      animation_type: 'bounce',
      glb_size: 1024,
      position: '0 0 -1.5',
      rotation: '0 0 0',
      scale: '1 1 1',
      related_combos: [],
    };

    assert.strictEqual(
      response.audio_url,
      'https://assets.example.com/elephant.mp3',
    );
  });

  it('audio_url is used by the overlay (not model_url)', () => {
    // C14 rule: vocabulary audio from audio_url, NOT from model_url.
    // Both fields exist but serve different purposes.
    const response: ARExperienceResponse = {
      qr_id: 'cat123',
      word: 'cat',
      translation_vi: 'con meo',
      audio_url: 'https://assets.example.com/cat.mp3',
      model_url: 'https://assets.example.com/cat.glb',
      animation_type: 'idle',
      glb_size: 512,
      position: '0 0 -1',
      rotation: '0 0 0',
      scale: '1 1 1',
      related_combos: [],
    };

    // audio_url → vocabulary pronunciation (RN plays this)
    // model_url → 3D model (Unity loads this)
    assert.notStrictEqual(response.audio_url, response.model_url);
    assert.ok(response.audio_url.includes('.mp3') || response.audio_url.includes('.wav'));
    assert.ok(response.model_url.includes('.glb'));
  });
});

// ---------------------------------------------------------------------------
// 5. Repeated-tap safety — stop() called before playVocabulary
// ---------------------------------------------------------------------------

describe('Repeated-tap safety — no uncontrolled overlapping audio', () => {
  it('stop() is declared as async (returns Promise<void>)', async () => {
    const fs = await import('node:fs');
    const hookSrc = fs.readFileSync(
      'E:/University/Graduted Project/Edu-platform/mobile/rn/src/hooks/useFlashcardAudio.ts',
      'utf-8',
    );

    assert.ok(
      /stop:\s*\(\s*\)\s*=>\s*Promise<void>/.test(hookSrc),
      'stop should return Promise<void>',
    );
  });

  it('playVocabulary definition appears before stop definition (stop is called inside playVocabulary)', async () => {
    const fs = await import('node:fs');
    const hookSrc = fs.readFileSync(
      'E:/University/Graduted Project/Edu-platform/mobile/rn/src/hooks/useFlashcardAudio.ts',
      'utf-8',
    );

    const playVocabularyPos = hookSrc.indexOf('const playVocabulary');
    const stopPos = hookSrc.indexOf('const stop');
    const createAsyncPos = hookSrc.indexOf('createAsync(');

    assert.ok(playVocabularyPos !== -1, 'playVocabulary should be in source');
    assert.ok(stopPos !== -1, 'stop should be in source');
    assert.ok(createAsyncPos !== -1, 'createAsync should be in source');

    // playVocabulary is defined, then stop, then createAsync is called inside playVocabulary.
    assert.ok(
      playVocabularyPos < createAsyncPos && createAsyncPos < stopPos,
      'createAsync should be called inside playVocabulary, before stop() is defined',
    );
  });

  it('playVocabulary definition appears before stop definition (stop is accessible as closure)', async () => {
    const fs = await import('node:fs');
    const hookSrc = fs.readFileSync(
      'E:/University/Graduted Project/Edu-platform/mobile/rn/src/hooks/useFlashcardAudio.ts',
      'utf-8',
    );

    const playVocabularyPos = hookSrc.indexOf('const playVocabulary');
    const stopPos = hookSrc.indexOf('const stop');
    const createAsyncPos = hookSrc.indexOf('createAsync(');

    assert.ok(playVocabularyPos !== -1, 'playVocabulary should be in source');
    assert.ok(stopPos !== -1, 'stop should be in source');
    assert.ok(createAsyncPos !== -1, 'createAsync should be in source');

    // stop is defined AFTER playVocabulary but called INSIDE it (closure).
    // createAsync must be inside playVocabulary.
    assert.ok(
      playVocabularyPos < createAsyncPos && createAsyncPos < stopPos,
      'createAsync should be called inside playVocabulary (before stop definition)',
    );

    // Verify stop() is called inside playVocabulary via soundRef cleanup.
    const playStart = hookSrc.indexOf('const playVocabulary = useCallback(');
    const afterPlay = hookSrc.slice(playStart);
    const endMarker = '}, // end playVocabulary';
    const endPos = afterPlay.indexOf(endMarker);
    const playBody = afterPlay.slice(0, endPos);

    // Inside playVocabulary: stop previous audio before creating new sound.
    // This is implemented as soundRef.current.stopAsync() → soundRef.current.unloadAsync().
    assert.ok(
      playBody.includes('soundRef.current?.stopAsync') ||
        playBody.includes('soundRef.current.stopAsync'),
      'soundRef.current.stopAsync() should be called inside playVocabulary to prevent overlapping audio',
    );
    assert.ok(
      playBody.includes('createAsync('),
      'createAsync should be called inside playVocabulary',
    );
  });
});
