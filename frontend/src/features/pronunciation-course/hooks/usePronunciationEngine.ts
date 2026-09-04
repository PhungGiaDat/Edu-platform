// frontend/src/features/pronunciation-course/hooks/usePronunciationEngine.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { PronunciationEngine } from '../services/pronunciationEngine';
import type { PronunciationWord, EvaluationResult } from '../types';

export type RecordingState = 'idle' | 'recording' | 'processing';

export function usePronunciationEngine() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcription, setTranscription] = useState('');
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const engineRef = useRef<PronunciationEngine | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleTranscription = useCallback((text: string, _isFinal: boolean) => {
    setTranscription(text);
  }, []);

  const handleRecordingStart = useCallback(() => {
    setRecordingState('recording');
    setTranscription('');
    setResult(null);
    setError(null);
    chunksRef.current = [];
  }, []);

  const handleRecordingEnd = useCallback((blob: Blob) => {
    setAudioBlob(blob);
    setRecordingState('processing');
  }, []);

  const handleResult = useCallback((evalResult: EvaluationResult) => {
    setResult(evalResult);
    setRecordingState('idle');
  }, []);

  const handleEngineError = useCallback((err: string) => {
    setError(err);
    setRecordingState('idle');
  }, []);

  useEffect(() => {
    const options = {
      onRecordingStart: handleRecordingStart,
      onRecordingEnd: handleRecordingEnd,
      onTranscription: handleTranscription,
      onResult: handleResult,
      onError: handleEngineError,
    };
    engineRef.current = new PronunciationEngine(options);

    return () => {
      engineRef.current?.destroy();
    };
  }, [handleTranscription, handleRecordingStart, handleRecordingEnd, handleResult, handleEngineError]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        handleRecordingEnd(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      engineRef.current?.startRecording();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to access microphone';
      handleEngineError(msg);
    }
  }, [handleRecordingEnd, handleEngineError]);

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    engineRef.current?.stopRecording();
  }, []);

  const evaluate = useCallback(
    async (word: PronunciationWord) => {
      if (!transcription) {
        handleEngineError('No transcription available');
        return;
      }
      const evalResult = await engineRef.current?.evaluate(
        transcription,
        word,
        audioBlob || undefined
      );
      if (evalResult) {
        handleResult(evalResult);
      }
    },
    [transcription, audioBlob, handleResult, handleEngineError]
  );

  const reset = useCallback(() => {
    setTranscription('');
    setResult(null);
    setError(null);
    setAudioBlob(null);
    setRecordingState('idle');
  }, []);

  return {
    recordingState,
    transcription,
    result,
    error,
    startRecording,
    stopRecording,
    evaluate,
    reset,
  };
}
