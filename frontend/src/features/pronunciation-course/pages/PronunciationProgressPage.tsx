// frontend/src/features/pronunciation-course/pages/PronunciationProgressPage.tsx
import { usePronunciationProgress } from '../hooks/usePronunciationCourse';
import { ProgressReport } from '../components/ProgressReport';

export function PronunciationProgressPage() {
  const { progress, loading, error } = usePronunciationProgress();

  return (
    <div className="min-h-screen bg-[#FFF8EE] p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-8 text-center">
          Báo cáo tiến độ
        </h1>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full" />
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-2xl text-center">
            {error}
          </div>
        )}

        {progress && <ProgressReport progress={progress} />}
      </div>
    </div>
  );
}
