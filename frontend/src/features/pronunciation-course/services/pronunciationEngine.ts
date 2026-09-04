// frontend/src/features/pronunciation-course/services/pronunciationEngine.ts
import { pronunciationCourseApi } from './courseApi';
import type { EvaluationResult, PronunciationWord } from '../types';

/** Levenshtein distance for fuzzy string matching */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function calculateBrowserScore(
  transcription: string,
  expectedWord: string
): { score: number; stars: number } {
  const normalized = (s: string) => s.toLowerCase().trim();
  const t = normalized(transcription);
  const e = normalized(expectedWord);

  if (t === e) {
    return { score: 100, stars: 3 };
  }

  const maxLen = Math.max(t.length, e.length);
  const distance = levenshteinDistance(t, e);
  let score = Math.round(((maxLen - distance) / maxLen) * 100);

  // Kid bonus: children often add s/es plural or slight variations
  if (t === e + 's' || t === e + 'es' || t === e.replace(/s$/, '')) {
    score = Math.min(100, score + 20);
  }

  const stars = score >= 85 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0;
  return { score, stars };
}

const FEEDBACK_MESSAGES: Record<number, string[]> = {
  3: ['Tuyệt vời! Phát âm hoàn hảo!', 'Xuất sắc lắm!', 'Con giỏi lắm!'],
  2: ['Tốt lắm! Cố gắng thêm một chút nhé!', 'Gần hoàn hảo rồi!', 'Rất tốt!'],
  1: ['Đang tiến bộ! Nghe lại và thử lại nào!', 'Thử lại nhé, con sẽ làm được!'],
  0: ['Thử lại nhé! Nhấn loa để nghe mẫu!', 'Chưa đúng, đừng nản lòng!'],
};

function getFeedback(stars: number): string {
  const messages = FEEDBACK_MESSAGES[stars] || FEEDBACK_MESSAGES[0];
  return messages[Math.floor(Math.random() * messages.length)];
}

export interface PronunciationEngineOptions {
  /** Callback when recording starts */
  onRecordingStart?: () => void;
  /** Callback when recording ends with audio blob */
  onRecordingEnd?: (audioBlob: Blob) => void;
  /** Callback for real-time transcription (Web Speech API) */
  onTranscription?: (text: string, isFinal: boolean) => void;
  /** Callback for final result */
  onResult?: (result: EvaluationResult) => void;
  /** Callback for errors */
  onError?: (error: string) => void;
}

export class PronunciationEngine {
  private recognition: SpeechRecognition | null = null;
  private options: PronunciationEngineOptions;
  private isRecording = false;

  constructor(options: PronunciationEngineOptions) {
    this.options = options;
    this.initRecognition();
  }

  private initRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      this.options.onError?.('Web Speech API not supported');
      return;
    }

    this.recognition = new SR();
    this.recognition.lang = 'en-US';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event) => {
      const result = event.results[0];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;
      this.options.onTranscription?.(transcript, isFinal);
    };

    this.recognition.onerror = (event) => {
      this.options.onError?.(event.error);
    };

    this.recognition.onend = () => {
      this.isRecording = false;
    };
  }

  async startRecording(): Promise<void> {
    if (!this.recognition) {
      this.options.onError?.('Speech recognition not available');
      return;
    }

    this.isRecording = true;
    this.options.onRecordingStart?.();

    try {
      this.recognition.start();
    } catch {
      this.isRecording = false;
      this.options.onError?.('Failed to start recording');
    }
  }

  stopRecording(): void {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }
  }

  async evaluate(
    transcription: string,
    expectedWord: PronunciationWord,
    audioBlob?: Blob
  ): Promise<EvaluationResult> {
    // Step 1: Browser-side fuzzy match
    const { score, stars } = calculateBrowserScore(transcription, expectedWord.word);

    let evaluationMethod: 'browser' | 'huggingface' = 'browser';
    let finalScore = score;
    let finalStars = stars;
    let feedback = getFeedback(stars);

    // Step 2: Borderline case → HuggingFace evaluation
    if (score >= 50 && score < 70 && audioBlob) {
      try {
        const hfResult = await pronunciationCourseApi.huggingfaceEvaluate(
          audioBlob,
          expectedWord.word
        );
        evaluationMethod = 'huggingface';
        finalScore = hfResult.score;
        finalStars = hfResult.stars;
        feedback = hfResult.feedback || getFeedback(finalStars);
      } catch {
        // Fallback to browser result
        console.warn('HuggingFace evaluation failed, using browser result');
      }
    }

    return {
      score: finalScore,
      stars: finalStars,
      feedback,
      transcription,
      evaluation_method: evaluationMethod,
    };
  }

  destroy() {
    if (this.recognition) {
      this.recognition.abort();
    }
  }
}

// Type augmentation for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
