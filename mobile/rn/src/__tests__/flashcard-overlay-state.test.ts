/**
 * @file flashcard-overlay-state.test.ts — source-contract tests for C15 overlay integration.
 *
 * Verifies the minimum non-speculative integration of `useFlashcardState`
 * into `FlashcardOverlay`:
 *   1. overlay imports and calls the hook with `word`
 *   2. image/speaker taps dispatch `TAP`
 *   3. parent can observe state via `onStateChange`
 *   4. C14 audio playback remains in place
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const OVERLAY_PATH =
  'E:/University/Graduted Project/Edu-platform/mobile/rn/src/components/FlashcardOverlay.tsx';

const overlaySrc = readFileSync(OVERLAY_PATH, 'utf-8');

describe('FlashcardOverlay C15 integration', () => {
  it('imports useFlashcardState and FlashcardState from the hook', () => {
    assert.ok(
      overlaySrc.includes("import { useFlashcardState, FlashcardState } from '../hooks/useFlashcardState';"),
      'FlashcardOverlay should import useFlashcardState and FlashcardState',
    );
  });

  it('accepts onStateChange as an optional prop', () => {
    assert.ok(
      overlaySrc.includes('onStateChange?: (state: FlashcardState) => void;'),
      'FlashcardOverlayProps should expose onStateChange',
    );
  });

  it('creates flashcard state from the current word identity', () => {
    assert.ok(
      overlaySrc.includes('const { state, dispatch } = useFlashcardState(word);'),
      'FlashcardOverlay should call useFlashcardState(word)',
    );
  });

  it('propagates state changes to the parent when requested', () => {
    assert.ok(
      overlaySrc.includes('onStateChange?.(state);'),
      'FlashcardOverlay should propagate state to the parent',
    );
    assert.ok(
      overlaySrc.includes('}, [state, onStateChange]);'),
      'state propagation effect should track state and onStateChange',
    );
  });

  it('dispatches TAP before replaying audio on image tap', () => {
    const imageTapStart = overlaySrc.indexOf('const handleImageTap = useCallback(() => {');
    const speakerTapStart = overlaySrc.indexOf('const handleSpeakerTap = useCallback(() => {');

    assert.ok(imageTapStart !== -1, 'handleImageTap should exist');
    assert.ok(speakerTapStart !== -1, 'handleSpeakerTap should exist');

    const imageTapBody = overlaySrc.slice(imageTapStart, speakerTapStart);
    const tapDispatchPos = imageTapBody.indexOf("dispatch({ type: 'TAP' });");
    const playPos = imageTapBody.indexOf('playVocabulary(audioUrl);');

    assert.ok(tapDispatchPos !== -1, 'handleImageTap should dispatch TAP');
    assert.ok(playPos !== -1, 'handleImageTap should still play audio');
    assert.ok(tapDispatchPos < playPos, 'TAP should dispatch before audio replay');
  });

  it('dispatches TAP before replaying audio on speaker tap', () => {
    const speakerTapStart = overlaySrc.indexOf('const handleSpeakerTap = useCallback(() => {');
    const showMissingAudioNotePos = overlaySrc.indexOf("const showMissingAudioNote = lastError?.kind === 'MISSING_AUDIO_METADATA';");

    assert.ok(speakerTapStart !== -1, 'handleSpeakerTap should exist');
    assert.ok(showMissingAudioNotePos !== -1, 'showMissingAudioNote should exist');

    const speakerTapBody = overlaySrc.slice(speakerTapStart, showMissingAudioNotePos);
    const tapDispatchPos = speakerTapBody.indexOf("dispatch({ type: 'TAP' });");
    const playPos = speakerTapBody.indexOf('playVocabulary(audioUrl);');

    assert.ok(tapDispatchPos !== -1, 'handleSpeakerTap should dispatch TAP');
    assert.ok(playPos !== -1, 'handleSpeakerTap should still play audio');
    assert.ok(tapDispatchPos < playPos, 'TAP should dispatch before audio replay');
  });

  it('preserves the existing audio hook boundary', () => {
    assert.ok(
      overlaySrc.includes('const { isPlaying, playVocabulary, stop, lastError } = useFlashcardAudio();'),
      'FlashcardOverlay should still use useFlashcardAudio',
    );
  });
});
