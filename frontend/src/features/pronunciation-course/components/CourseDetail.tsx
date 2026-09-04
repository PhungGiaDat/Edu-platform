// frontend/src/features/pronunciation-course/components/CourseDetail.tsx
import type { PronunciationCourseDetail } from '../types';
import { WordCard } from './WordCard';

interface CourseDetailProps {
  course: PronunciationCourseDetail;
  onWordSelect: (wordId: string) => void;
  selectedWordId?: string;
  wordProgress: Record<string, number>;
}

export function CourseDetail({
  course,
  onWordSelect,
  selectedWordId,
  wordProgress,
}: CourseDetailProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{course.name_vi}</h2>
        <p className="text-gray-500">
          {course.progress.learned}/{course.progress.total} từ đã học
        </p>
        <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-green-400 rounded-full transition-all duration-500"
            style={{
              width: `${(course.progress.learned / course.progress.total) * 100}%`,
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {course.words.map((word) => (
          <WordCard
            key={word.word_id}
            word={word}
            stars={wordProgress[word.word_id] || 0}
            isLearned={(wordProgress[word.word_id] || 0) >= 3}
            isActive={selectedWordId === word.word_id}
            onClick={() => onWordSelect(word.word_id)}
          />
        ))}
      </div>
    </div>
  );
}
