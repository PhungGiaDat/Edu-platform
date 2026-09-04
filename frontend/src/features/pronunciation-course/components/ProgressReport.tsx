// frontend/src/features/pronunciation-course/components/ProgressReport.tsx
import type { PronunciationProgress } from '../types';

interface ProgressReportProps {
  progress: PronunciationProgress;
}

export function ProgressReport({ progress }: ProgressReportProps) {
  const maxCount = Math.max(...progress.words_per_topic.map((t) => t.count), 1);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-clay-lg">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Tiến độ học tập</h2>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-3xl font-bold text-sky-500">{progress.total_words_learned}</p>
          <p className="text-sm text-gray-500">Từ đã học</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-yellow-500">{progress.total_stars}</p>
          <p className="text-sm text-gray-500">Sao</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-green-500">{progress.current_streak}</p>
          <p className="text-sm text-gray-500">Ngày liên tiếp</p>
        </div>
      </div>

      {/* Favorite topic */}
      {progress.favorite_topic && (
        <div className="bg-yellow-50 rounded-2xl p-4 mb-6">
          <p className="text-sm text-gray-500">Chủ đề yêu thích nhất</p>
          <p className="font-bold text-lg text-slate-800">
            {progress.favorite_topic.topic_name}
          </p>
          <p className="text-sm text-gray-500">
            {progress.favorite_topic.count} từ đã học
          </p>
        </div>
      )}

      {/* Topic bars */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-700">Theo chủ đề</h3>
        {progress.words_per_topic.map((topic) => (
          <div key={topic.topic_id}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">{topic.topic_name}</span>
              <span className="text-gray-500">{topic.count} từ</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-sky-500 rounded-full transition-all duration-500"
                style={{ width: `${(topic.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
