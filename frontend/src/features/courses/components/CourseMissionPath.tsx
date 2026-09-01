import type { Lesson, UserProgress } from '@/types/course';
import { CodexPetSprite } from '@/features/pets/components/CodexPetSprite';
import { lessonDescription, lessonTitle } from '@/lib/courseLocale';
import type { Locale } from '@/contexts/LocaleContext';
import '@/styles/course-mission-path.css';

type MissionStatus = 'completed' | 'current' | 'locked';

type Mission = {
  lesson: Lesson;
  status: MissionStatus;
};

const copy = {
  en: {
    title: 'Your mission path',
    completed: 'Completed',
    current: 'Current mission',
    locked: 'Locked',
    open: 'Open mission',
    nextGuide: 'Lexi guides your next mission',
    completeGuide: 'Lexi is proud of every mission you finished',
    minute: 'min',
  },
  vi: {
    title: 'Đường đi nhiệm vụ',
    completed: 'Đã hoàn thành',
    current: 'Nhiệm vụ hiện tại',
    locked: 'Đang khóa',
    open: 'Mở nhiệm vụ',
    nextGuide: 'Lexi dẫn con tới nhiệm vụ tiếp theo',
    completeGuide: 'Lexi tự hào vì con đã hoàn thành mọi nhiệm vụ',
    minute: 'phút',
  },
} as const;

export function buildCourseMissions(lessons: Lesson[], progress: UserProgress | null): Mission[] {
  const orderedLessons = [...lessons].sort((left, right) => left.order - right.order);
  const completedLessonIds = new Set(progress?.completed_lessons ?? []);
  const firstUnfinished = orderedLessons.find((lesson) => !completedLessonIds.has(lesson.lesson_id));
  const requestedCurrent = orderedLessons.find(
    (lesson) => lesson.lesson_id === progress?.current_lesson_id && !completedLessonIds.has(lesson.lesson_id),
  );
  const currentLessonId = (requestedCurrent ?? firstUnfinished)?.lesson_id;
  let hasCurrent = false;

  return orderedLessons.map((lesson) => {
    if (completedLessonIds.has(lesson.lesson_id)) {
      return { lesson, status: 'completed' };
    }
    if (!hasCurrent && lesson.lesson_id === currentLessonId) {
      hasCurrent = true;
      return { lesson, status: 'current' };
    }
    return { lesson, status: 'locked' };
  });
}

export interface CourseMissionPathProps {
  lessons: Lesson[];
  progress: UserProgress | null;
  locale: Locale;
  onLessonOpen: (lessonId: string) => void;
}

export function CourseMissionPath({ lessons, progress, locale, onLessonOpen }: CourseMissionPathProps) {
  const ui = copy[locale];
  const missions = buildCourseMissions(lessons, progress);
  const activeMission = missions.find((mission) => mission.status === 'current');
  const mascotState = activeMission ? 'waving' : 'jumping';
  const mascotLabel = activeMission ? ui.nextGuide : ui.completeGuide;

  return (
    <section className="course-mission-path" aria-labelledby="course-mission-path-title">
      <header className="course-mission-path__heading">
        <div>
          <p className="course-mission-path__eyebrow">{ui.title}</p>
          <h2 id="course-mission-path-title">{ui.title}</h2>
        </div>
        <CodexPetSprite animationState={mascotState} label={mascotLabel} size={76} />
      </header>

      <ol className="course-mission-path__track">
        {missions.map(({ lesson, status }) => {
          const eligible = status !== 'locked';
          const statusLabel = ui[status];
          const description = lessonDescription(lesson, locale);
          const missionContent = (
            <>
              <span className="course-mission-path__node" aria-hidden="true">{lesson.order}</span>
              <span className="course-mission-path__copy">
                <span className="course-mission-path__meta">{statusLabel}</span>
                <span className="course-mission-path__name">{lessonTitle(lesson, locale)}</span>
                {description && <span className="course-mission-path__description">{description}</span>}
                <span className="course-mission-path__details">{lesson.duration_minutes} {ui.minute}</span>
              </span>
              {eligible && <span className="course-mission-path__action">{ui.open}</span>}
            </>
          );

          return (
            <li key={lesson.lesson_id} className={`course-mission-path__item course-mission-path__item--${status}`}>
              {eligible ? (
                <button
                  type="button"
                  className="course-mission-path__mission"
                  onClick={() => onLessonOpen(lesson.lesson_id)}
                  aria-label={`${lessonTitle(lesson, locale)} — ${statusLabel}`}
                >
                  {missionContent}
                </button>
              ) : (
                <article className="course-mission-path__mission" aria-label={`${lessonTitle(lesson, locale)} — ${statusLabel}`}>
                  {missionContent}
                </article>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default CourseMissionPath;
