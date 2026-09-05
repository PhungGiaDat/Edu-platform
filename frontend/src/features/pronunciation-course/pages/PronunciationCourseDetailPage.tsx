// frontend/src/features/pronunciation-course/pages/PronunciationCourseDetailPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { CourseDetail } from '../components/CourseDetail';
import { RecordingButton } from '../components/RecordingButton';
import { FeedbackDisplay } from '../components/FeedbackDisplay';
import { usePronunciationCourseDetail, useLogAttempt } from '../hooks/usePronunciationCourse';
import { usePronunciationEngine } from '../hooks/usePronunciationEngine';
import type { PronunciationWord } from '../types';

export function PronunciationCourseDetailPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { course, loading } = usePronunciationCourseDetail(topicId || '');
  const { logAttempt } = useLogAttempt();
  const {
    recordingState,
    transcription,
    result,
    error,
    startRecording,
    stopRecording,
    evaluate,
    reset,
  } = usePronunciationEngine();

  const [selectedWord, setSelectedWord] = useState<PronunciationWord | null>(null);
  const [wordProgress, setWordProgress] = useState<Record<string, number>>({});
  const [lastXp, setLastXp] = useState<{ xp: number; levelUp: boolean } | null>(null);

  const handleWordSelect = (wordId: string) => {
    const word = course?.words.find((w) => w.word_id === wordId);
    if (word) {
      setSelectedWord(word);
      reset();
    }
  };

  useEffect(() => {
    if (recordingState === 'processing' && selectedWord && transcription) {
      evaluate(selectedWord).then(async (evalResult) => {
        if (evalResult) {
          const attemptResult = await logAttempt({
            user_id: user?.id || 'guest',
            topic_id: topicId || '',
            word_id: selectedWord.word_id,
            score: evalResult.score,
            stars: evalResult.stars,
            transcription: evalResult.transcription,
          });
          setLastXp({ xp: attemptResult.xpAwarded || 0, levelUp: !!attemptResult.levelUp });
          setWordProgress((prev) => ({
            ...prev,
            [selectedWord.word_id]: Math.max(
              prev[selectedWord.word_id] || 0,
              evalResult.stars
            ),
          }));
        }
      });
    }
  }, [recordingState, transcription, selectedWord, topicId, evaluate, logAttempt]);

  if (loading || !course) {
    return (
      <div className="min-h-screen bg-[#FFF8EE] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8EE] p-4 pb-80">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/pronunciation-course')}
          className="mb-4 text-sky-600 hover:text-sky-700 flex items-center gap-2 font-medium"
        >
          Quay lại
        </button>

        <CourseDetail
          course={course}
          onWordSelect={handleWordSelect}
          selectedWordId={selectedWord?.word_id}
          wordProgress={wordProgress}
        />

        {/* Practice panel */}
        {selectedWord && (
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-clay-lg p-6">
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">
              Luyện phát âm: {selectedWord.word}
            </h3>
            {selectedWord.phonetic && (
              <p className="text-center text-gray-500 mb-4">{selectedWord.phonetic}</p>
            )}

            {/* TTS play */}
            <div className="flex justify-center mb-4">
              <button
                onClick={() => {
                  const utterance = new SpeechSynthesisUtterance(selectedWord.word);
                  utterance.lang = 'en-US';
                  speechSynthesis.speak(utterance);
                }}
                className="bg-sky-100 text-sky-600 px-4 py-2 rounded-full shadow-clay flex items-center gap-2 hover:bg-sky-200 transition-colors"
              >
                Nghe mẫu
              </button>
            </div>

            <div className="flex flex-col items-center gap-4">
              <RecordingButton
                state={recordingState}
                onStart={startRecording}
                onStop={stopRecording}
              />

              {transcription && (
                <p className="text-sm text-gray-600">Bạn nói: &quot;{transcription}&quot;</p>
              )}

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              {result && <FeedbackDisplay result={result} xpAwarded={lastXp?.xp} levelUp={lastXp?.levelUp} />}

              {result && (
                <button
                  onClick={reset}
                  className="text-sky-600 hover:text-sky-700 text-sm font-medium"
                >
                  Thử lại từ khác
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
