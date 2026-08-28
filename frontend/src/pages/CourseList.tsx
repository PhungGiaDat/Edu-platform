import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { CourseCard } from '@/features/courses/components/CourseCard';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale, type Locale } from '@/contexts/LocaleContext';
import { colors, radius, shadows, transitions } from '@/design-tokens/claymorphic';
import { courseCategoryLabel } from '@/lib/courseLocale';
import {
  learningTopicMap,
  matchesTopic,
  scoreCourseForTopics,
  topicHint,
  topicLabel,
} from '@/lib/learningPathTopics';
import { courseService } from '@/services/CourseService';
import { learningPathService, type LearningPathPreferences } from '@/services/LearningPathService';
import '@/styles/course-catalog.css';
import type { Course, UserProgress } from '@/types/course';

type PathCard = {
  key: string;
  title: string;
  subtitle: string;
  mark: string;
  routeType: 'path' | 'category' | 'level';
  completedCourses: number;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  matchedCourses: number;
};

const copy = {
  en: {
    courseCatalog: 'Course Catalog',
    heroBody: 'Explore short lesson paths, beginner vocabulary, AR-ready activities, quizzes, and rewards built for young learners.',
    yourPaths: 'Your Topics',
    priorityTopics: 'Priority topics',
    noPriorityTopics: 'Choose priority topics in Learning Path to reorder courses here.',
    browseTopics: 'Browse recommended themes first',
    totalCourses: 'Total Courses',
    lessonsDone: 'Lessons Done',
    xpEarned: 'XP Earned',
    inProgress: 'In Progress',
    generateCourse: 'Generate sample course',
    generating: 'Generating...',
    noCoursesBody: 'No live courses are published yet. Demo courses stay visible so you can keep working on the flow.',
    noCoursesInCategory: 'No courses in this section yet',
    noCoursesInCategoryBody: 'Publish another course or choose a different path.',
    loadCourseError: 'Courses could not be loaded. Please try again.',
    generateCourseError: 'Could not generate a sample course. Check backend and MongoDB.',
    backToAllPaths: 'Back to all paths',
    progress: 'Progress',
    courses: 'courses',
    done: 'done',
    continueLearning: 'Continue learning',
    startLearning: 'Start learning',
    vocabulary: 'Vocabulary',
    fun: 'Fun',
    hourLabel: 'hours',
    recommended: 'Recommended',
    demo: 'Demo',
    allPaths: 'All topics',
  },
  vi: {
    courseCatalog: 'Danh sách khóa học',
    heroBody: 'Khám phá các lộ trình bài học ngắn, từ vựng cơ bản, hoạt động AR, quiz và phần thưởng dành cho trẻ nhỏ.',
    yourPaths: 'Chủ đề của bạn',
    priorityTopics: 'Chủ đề ưu tiên',
    noPriorityTopics: 'Hãy chọn chủ đề ưu tiên trong phần Lộ trình học để sắp xếp khóa học tại đây.',
    browseTopics: 'Xem trước các chủ đề được ưu tiên',
    totalCourses: 'Tổng khóa học',
    lessonsDone: 'Bài đã học',
    xpEarned: 'XP đã nhận',
    inProgress: 'Đang học',
    generateCourse: 'Tạo khóa học mẫu',
    generating: 'Đang tạo...',
    noCoursesBody: 'Hiện chưa có khóa học thật được publish. Các khóa học demo vẫn được giữ lại để bạn tiếp tục hoàn thiện luồng.',
    noCoursesInCategory: 'Chưa có khóa học trong mục này',
    noCoursesInCategoryBody: 'Hãy publish thêm khóa học hoặc chọn lộ trình khác.',
    loadCourseError: 'Không tải được khóa học. Vui lòng thử lại.',
    generateCourseError: 'Không tạo được khóa học mẫu. Hãy kiểm tra backend và MongoDB.',
    backToAllPaths: 'Về tất cả lộ trình',
    progress: 'Tiến độ',
    courses: 'khóa học',
    done: 'xong',
    continueLearning: 'Học tiếp',
    startLearning: 'Bắt đầu học',
    vocabulary: 'Từ vựng',
    fun: 'Vui',
    hourLabel: 'giờ',
    recommended: 'Ưu tiên',
    demo: 'Demo',
    allPaths: 'Tất cả chủ đề',
  },
} as const;

type CourseListCopy = Record<keyof typeof copy.en, string>;

const levelLabel: Record<Locale, Record<string, string>> = {
  en: {
    beginner: 'Beginner Journey',
    intermediate: 'Young Explorer',
    advanced: 'Brave Challenger',
  },
  vi: {
    beginner: 'Lộ trình bắt đầu',
    intermediate: 'Nhà thám hiểm nhỏ',
    advanced: 'Thử thách dũng cảm',
  },
};

const categoryFallback: Record<string, { en: string; vi: string; mark: string }> = {
  nature: { en: 'Animals and Nature', vi: 'Động vật và thiên nhiên', mark: 'AN' },
  home_family: { en: 'Home and Family', vi: 'Gia đình', mark: 'HF' },
  school_food: { en: 'School and Food', vi: 'Trường học và món ăn', mark: 'SF' },
};

const makeDemoLessons = (prefix: string) => Array.from({ length: 6 }, (_, index) => ({
  lesson_id: `${prefix}-lesson-${index + 1}`,
  title: ['Meet the words', 'Watch and listen', 'Tap the picture', 'Say it aloud', 'Play the quiz', 'Earn a sticker'][index],
  title_vi: ['Gặp từ mới', 'Xem và nghe', 'Chạm vào hình', 'Nói thật rõ', 'Chơi quiz', 'Nhận sticker'][index],
  order: index + 1,
  duration_minutes: 6,
  video_duration: 0,
  vocabulary: [],
  quiz: [],
  images: [],
  scene_images: [],
  generatedMedia: [],
})) as Course['lessons'];

const demoCourses: Course[] = [
  {
    course_id: 'demo-home-family',
    title: 'Momo Learns English at Home',
    description: 'A cheerful first course about family, rooms, feelings, and daily routines.',
    subtitle_vi: 'Gia đình, ngôi nhà và cảm xúc',
    theme: 'Home and Family',
    category_key: 'home_family',
    category_label: 'Home and Family',
    category_icon: 'HF',
    age_range: '5-8',
    level: 'beginner',
    description_vi: 'Khóa học vui về gia đình, các phòng trong nhà, cảm xúc và thói quen hằng ngày.',
    catalogPreview: [],
    studentTestimonials: [],
    lessons: makeDemoLessons('home'),
    is_published: true,
  },
  {
    course_id: 'demo-animals-nature',
    title: 'Momo Explores Animals and Nature',
    description: 'AR flashcards, nature stories, animal words, and playful mini games.',
    subtitle_vi: 'Động vật, rừng và thiên nhiên',
    theme: 'Animals and Nature',
    category_key: 'nature',
    category_label: 'Animals and Nature',
    category_icon: 'AN',
    age_range: '5-8',
    level: 'beginner',
    description_vi: 'Flashcard AR, truyện thiên nhiên, từ vựng động vật và trò chơi nhỏ.',
    catalogPreview: [],
    studentTestimonials: [],
    lessons: makeDemoLessons('nature'),
    is_published: true,
  },
  {
    course_id: 'demo-school-food',
    title: 'Momo Learns English at School',
    description: 'Classroom phrases, lunch words, colors, games, speaking practice, and rewards.',
    subtitle_vi: 'Trường học, lớp học và món ăn',
    theme: 'School and Food',
    category_key: 'school_food',
    category_label: 'School and Food',
    category_icon: 'SF',
    age_range: '5-8',
    level: 'beginner',
    description_vi: 'Câu giao tiếp ở lớp, món ăn, màu sắc, trò chơi, luyện nói và phần thưởng.',
    catalogPreview: [],
    studentTestimonials: [],
    lessons: makeDemoLessons('school'),
    is_published: true,
  },
];

const courseListTheme = {
  '--course-ink': colors.deepSlate,
  '--course-muted': colors.mediumGray,
  '--course-page': colors.skyBlueLight,
  '--course-yellow': colors.sunshineYellow,
  '--course-yellow-dark': colors.sunshineYellowDark,
  '--course-coral': colors.coralPink,
  '--course-coral-dark': colors.coralPinkDark,
  '--course-card-radius': radius['4xl'],
  '--course-card-shadow': shadows.clayLg,
  '--course-button-shadow': shadows.clayPink,
  '--course-motion': `${transitions.normal} ${transitions.springSubtle}`,
} as React.CSSProperties;

const pathPalette = [
  {
    shell: '#FFF1D7',
    border: 'rgba(255, 217, 61, 0.38)',
    shadow: '0 12px 0 rgba(229,184,0,0.18), 0 20px 34px rgba(26,39,68,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
    accent: colors.sunshineYellow,
    accentDark: colors.sunshineYellowDark,
  },
  {
    shell: '#EAF5FF',
    border: 'rgba(110, 185, 255, 0.34)',
    shadow: '0 12px 0 rgba(58,143,209,0.18), 0 20px 34px rgba(26,39,68,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
    accent: colors.skyBlue,
    accentDark: colors.skyBlueDark,
  },
  {
    shell: '#EEF9E7',
    border: 'rgba(180, 225, 151, 0.40)',
    shadow: '0 12px 0 rgba(125,199,96,0.18), 0 20px 34px rgba(26,39,68,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
    accent: colors.mintGreen,
    accentDark: colors.mintGreenDark,
  },
  {
    shell: '#FFE7E3',
    border: 'rgba(255, 159, 159, 0.40)',
    shadow: '0 12px 0 rgba(217,112,112,0.18), 0 20px 34px rgba(26,39,68,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
    accent: colors.coralPink,
    accentDark: colors.coralPinkDark,
  },
];

const pathVisuals: Record<string, string> = {
  home_family: '/learnar-assets/courses/momo-home-family-english-5-7/images/course-cover.png',
  nature: '/assets/flashcards/jungle_card.png',
  animals: '/assets/flashcards/elephant_card.png',
  school_food: '/assets/flashcards/apple01_card.png',
};

const getPathVisual = (path: PathCard) =>
  pathVisuals[path.key] || pathVisuals[path.routeType === 'category' ? path.key : 'home_family'];

const getLearnerId = (userId?: string | null, isGuest?: boolean) =>
  userId || (isGuest ? 'guest-learner' : null);

const initials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const getCourseProgress = (course: Course, progress?: UserProgress) => {
  const totalLessons = course.lessons.length;
  const completedLessons = progress?.completed_lessons?.length || 0;
  const progressPercent = totalLessons > 0
    ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
    : 0;
  return { totalLessons, completedLessons, progressPercent };
};

const isAnimalNatureCourse = (course: Course) => matchesTopic(course, 'animals') || matchesTopic(course, 'nature');

const buildCategoryPath = (
  categoryKey: string,
  courses: Course[],
  progressByCourse: Map<string, UserProgress>,
  locale: Locale,
  ui: CourseListCopy,
): PathCard | null => {
  const pathCourses = courses.filter((course) => (course.category_key || course.level) === categoryKey);
  if (pathCourses.length === 0) return null;

  const totals = pathCourses.reduce(
    (acc, course) => {
      const courseProgress = getCourseProgress(course, progressByCourse.get(course.course_id));
      return {
        completedCourses: acc.completedCourses + (courseProgress.progressPercent >= 100 ? 1 : 0),
        completedLessons: acc.completedLessons + courseProgress.completedLessons,
        totalLessons: acc.totalLessons + courseProgress.totalLessons,
      };
    },
    { completedCourses: 0, completedLessons: 0, totalLessons: 0 },
  );

  const first = pathCourses[0];
  const fallback = categoryFallback[categoryKey];
  const title = fallback ? fallback[locale] : courseCategoryLabel(first, locale);
  const progressPercent = totals.totalLessons > 0
    ? Math.round((totals.completedLessons / totals.totalLessons) * 100)
    : 0;

  return {
    key: categoryKey,
    title,
    subtitle: `${pathCourses.length} ${ui.courses}`,
    mark: fallback?.mark || initials(title),
    routeType: 'category',
    completedCourses: totals.completedCourses,
    completedLessons: totals.completedLessons,
    totalLessons: totals.totalLessons,
    progressPercent,
    matchedCourses: pathCourses.length,
  };
};

const buildLevelPath = (
  level: string,
  courses: Course[],
  progressByCourse: Map<string, UserProgress>,
  locale: Locale,
  ui: CourseListCopy,
): PathCard | null => {
  const pathCourses = courses.filter((course) => course.level === level);
  if (pathCourses.length === 0) return null;

  const totals = pathCourses.reduce(
    (acc, course) => {
      const courseProgress = getCourseProgress(course, progressByCourse.get(course.course_id));
      return {
        completedCourses: acc.completedCourses + (courseProgress.progressPercent >= 100 ? 1 : 0),
        completedLessons: acc.completedLessons + courseProgress.completedLessons,
        totalLessons: acc.totalLessons + courseProgress.totalLessons,
      };
    },
    { completedCourses: 0, completedLessons: 0, totalLessons: 0 },
  );

  const progressPercent = totals.totalLessons > 0
    ? Math.round((totals.completedLessons / totals.totalLessons) * 100)
    : 0;
  const title = levelLabel[locale][level] || level;

  return {
    key: level,
    title,
    subtitle: `${pathCourses.length} ${ui.courses}`,
    mark: initials(title),
    routeType: 'level',
    completedCourses: totals.completedCourses,
    completedLessons: totals.completedLessons,
    totalLessons: totals.totalLessons,
    progressPercent,
    matchedCourses: pathCourses.length,
  };
};

const buildTopicPath = (
  topicId: string,
  courses: Course[],
  progressByCourse: Map<string, UserProgress>,
  locale: Locale,
  ui: CourseListCopy,
): PathCard | null => {
  const matchingCourses = courses.filter((course) => matchesTopic(course, topicId));
  const topic = learningTopicMap[topicId as keyof typeof learningTopicMap];
  const totals = matchingCourses.reduce(
    (acc, course) => {
      const courseProgress = getCourseProgress(course, progressByCourse.get(course.course_id));
      return {
        completedCourses: acc.completedCourses + (courseProgress.progressPercent >= 100 ? 1 : 0),
        completedLessons: acc.completedLessons + courseProgress.completedLessons,
        totalLessons: acc.totalLessons + courseProgress.totalLessons,
      };
    },
    { completedCourses: 0, completedLessons: 0, totalLessons: 0 },
  );

  const progressPercent = totals.totalLessons > 0
    ? Math.round((totals.completedLessons / totals.totalLessons) * 100)
    : 0;

  return {
    key: topicId,
    title: topicLabel(topicId, locale),
    subtitle: matchingCourses.length > 0
      ? `${matchingCourses.length} ${ui.courses}`
      : topicHint(topicId, locale),
    mark: topic?.icon || initials(topicLabel(topicId, locale)),
    routeType: 'path',
    completedCourses: totals.completedCourses,
    completedLessons: totals.completedLessons,
    totalLessons: totals.totalLessons,
    progressPercent,
    matchedCourses: matchingCourses.length,
  };
};

const BookOpenIcon: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 7v14" />
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 1 4 18.5z" />
    <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v18h5.5a2.5 2.5 0 0 0 2.5-2.5z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const BoltIcon: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M13.5 2 4 14h6.7L9.5 22 20 9h-7.1L13.5 2Z" />
  </svg>
);

const RocketIcon: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4c3.5 1 5 3 6 6-3 1-5 2.5-7 5l-4-4c2.5-2 4-4 5-7Z" />
    <path d="M9 15 5 19" />
    <path d="M6 13 4 15" />
    <path d="M11 18 9 20" />
    <circle cx="15" cy="9" r="1.5" />
  </svg>
);

export const CourseList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { level, pathId, category } = useParams();
  const { user, isGuest } = useAuth();
  const { locale } = useLocale();
  const ui: CourseListCopy = copy[locale];
  const learnerId = getLearnerId(user?.id, isGuest);
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [preferences, setPreferences] = useState<LearningPathPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const activeFilter = category || level || pathId || (location.pathname.endsWith('/animals') ? 'animals' : null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [courseData, progressData, prefs] = await Promise.all([
          courseService.listCourses(),
          learnerId ? courseService.getProgress(learnerId).catch(() => []) : Promise.resolve([]),
          user?.id && !isGuest ? learningPathService.get(user.id).catch(() => null) : Promise.resolve(null),
        ]);

        setCourses(courseData);
        setProgress(progressData);
        setPreferences(prefs?.preferences || null);
      } catch (loadError) {
        console.error('[CourseList] load error:', loadError);
        setError(ui.loadCourseError);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [isGuest, learnerId, ui.loadCourseError, user?.id]);

  const priorityTopics = preferences?.priority_topics || [];
  const progressByCourse = useMemo(
    () => new Map(progress.map((item) => [item.course_id, item])),
    [progress],
  );

  const hasLiveCourses = courses.length > 0;
  const sourceCourses = hasLiveCourses ? courses : demoCourses;

  const orderedCourses = useMemo(() => {
    const nextCourses = [...sourceCourses];
    if (priorityTopics.length === 0) return nextCourses;

    return nextCourses.sort((left, right) => {
      const rightScore = scoreCourseForTopics(right, priorityTopics);
      const leftScore = scoreCourseForTopics(left, priorityTopics);
      if (rightScore !== leftScore) return rightScore - leftScore;
      return left.title.localeCompare(right.title);
    });
  }, [priorityTopics, sourceCourses]);

  const filteredCourses = useMemo(() => {
    if (!activeFilter) return orderedCourses;
    if (activeFilter === 'animals') return orderedCourses.filter(isAnimalNatureCourse);
    const topic = learningTopicMap[activeFilter as keyof typeof learningTopicMap];
    if (topic) return orderedCourses.filter((course) => matchesTopic(course, activeFilter));
    if (orderedCourses.some((course) => course.category_key === activeFilter)) {
      return orderedCourses.filter((course) => course.category_key === activeFilter);
    }
    if (['beginner', 'intermediate', 'advanced'].includes(activeFilter)) {
      return orderedCourses.filter((course) => course.level === activeFilter);
    }
    return orderedCourses.filter((course) => course.course_id === activeFilter);
  }, [activeFilter, orderedCourses]);

  const learningPaths = useMemo(() => {
    if (priorityTopics.length > 0) {
      return priorityTopics
        .map((topicId) => buildTopicPath(topicId, sourceCourses, progressByCourse, locale, ui))
        .filter((item): item is PathCard => Boolean(item));
    }

    const categoryKeys = Array.from(new Set(sourceCourses.map((course) => course.category_key || course.level))).sort();
    const categoryPaths = categoryKeys
      .map((categoryKey) => buildCategoryPath(categoryKey, sourceCourses, progressByCourse, locale, ui))
      .filter((item): item is PathCard => Boolean(item));
    if (categoryPaths.length > 0) return categoryPaths;

    const levels = Array.from(new Set(sourceCourses.map((course) => course.level))).sort();
    return levels
      .map((pathLevel) => buildLevelPath(pathLevel, sourceCourses, progressByCourse, locale, ui))
      .filter((item): item is PathCard => Boolean(item));
  }, [locale, priorityTopics, progressByCourse, sourceCourses, ui]);

  const totalLessons = sourceCourses.reduce((sum, course) => sum + course.lessons.length, 0);
  const completedLessons = hasLiveCourses
    ? progress.reduce((sum, item) => sum + (item.completed_lessons?.length || 0), 0)
    : 7;
  const totalXp = hasLiveCourses
    ? progress.reduce((sum, item) => sum + (item.total_xp || 0), 0)
    : 1240;
  const inProgress = hasLiveCourses
    ? progress.filter((item) => item.status === 'started').length
    : 2;

  const statCards = [
    { label: ui.totalCourses, value: sourceCourses.length, icon: BookOpenIcon, tone: 'text-sky-500' },
    { label: ui.lessonsDone, value: `${completedLessons}/${totalLessons}`, icon: CheckIcon, tone: 'text-emerald-500' },
    { label: ui.xpEarned, value: totalXp, icon: BoltIcon, tone: 'text-amber-500' },
    { label: ui.inProgress, value: inProgress, icon: RocketIcon, tone: 'text-rose-500' },
  ];

  const pageTitle = useMemo(() => {
    const topic = activeFilter ? learningTopicMap[activeFilter as keyof typeof learningTopicMap] : null;
    if (activeFilter && topic) return topicLabel(activeFilter, locale);
    if (activeFilter === 'animals') return locale === 'vi' ? 'Động vật và thiên nhiên' : 'Animals and Nature';
    if (activeFilter && sourceCourses.some((course) => course.category_key === activeFilter)) {
      return courseCategoryLabel(sourceCourses.find((course) => course.category_key === activeFilter)!, locale);
    }
    if (activeFilter && ['beginner', 'intermediate', 'advanced'].includes(activeFilter)) {
      return levelLabel[locale][activeFilter] || activeFilter;
    }
    return ui.courseCatalog;
  }, [activeFilter, locale, sourceCourses, ui.courseCatalog]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const course = await courseService.generateSampleCourse();
      setCourses((current) => {
        const withoutDuplicate = current.filter((item) => item.course_id !== course.course_id);
        return [course, ...withoutDuplicate];
      });
    } catch (generateError) {
      console.error('[CourseList] generate error:', generateError);
      setError(ui.generateCourseError);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="course-catalog"
      style={courseListTheme}
    >
      <div className="course-catalog__canvas">
        <header className="course-catalog__hero">
          <div className="course-catalog__hero-copy">
            <h1>{pageTitle}</h1>
            <p className="course-catalog__hero-body">{ui.heroBody}</p>

            <div className="course-catalog__priority-panel">
              <div>
                <span>{ui.priorityTopics}</span>
                <p>{priorityTopics.length > 0 ? ui.browseTopics : ui.noPriorityTopics}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/learning-path')}
                className="course-catalog__priority-action"
                aria-label={ui.priorityTopics}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </button>
            </div>

            {priorityTopics.length > 0 && (
              <div className="course-catalog__topic-list" aria-label={ui.priorityTopics}>
                {priorityTopics.map((topicId) => (
                  <button
                    key={topicId}
                    type="button"
                    onClick={() => navigate(`/courses/path/${topicId}`)}
                  >
                    {topicLabel(topicId, locale)}
                  </button>
                ))}
              </div>
            )}

            {!hasLiveCourses && !isLoading && (
              <div className="course-catalog__sample-notice">
                <p>{ui.noCoursesBody}</p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? ui.generating : ui.generateCourse}
                </button>
              </div>
            )}
          </div>

          <div className="course-catalog__hero-stage">
            <div
              className="course-catalog__hero-art"
              role="img"
              aria-label="Momo's home learning adventure"
            >
              <span className="course-catalog__hero-spark course-catalog__hero-spark--one" aria-hidden="true" />
              <span className="course-catalog__hero-spark course-catalog__hero-spark--two" aria-hidden="true" />
              <img
                src="/learnar-assets/courses/momo-home-family-english-5-7/images/course-cover.png"
                alt=""
              />
            </div>
          </div>
        </header>

        <section className="course-catalog__stats" aria-label="Course progress overview">
          {statCards.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`course-catalog__stat course-catalog__stat--${index}`}>
                <div className="course-catalog__stat-icon">
                  <Icon />
                </div>
                <div className="course-catalog__stat-value">{item.value}</div>
                <div className="course-catalog__stat-label">{item.label}</div>
              </div>
            );
          })}
        </section>

        {!activeFilter && (
          <section className="course-catalog__paths">
            <div className="course-catalog__section-heading">
              <div>
                <h2>{ui.yourPaths}</h2>
                <p>{priorityTopics.length > 0 ? ui.recommended : ui.allPaths}</p>
              </div>
              {!hasLiveCourses && <span className="course-catalog__demo-badge">{ui.demo}</span>}
            </div>

            <div className="course-catalog__path-grid">
              {learningPaths.map((path, index) => {
                const palette = pathPalette[index % pathPalette.length];
                const route = path.routeType === 'path'
                  ? `/courses/path/${path.key}`
                  : path.routeType === 'category'
                    ? `/courses/category/${path.key}`
                    : `/courses/level/${path.key}`;

                return (
                  <button
                    key={path.key}
                    type="button"
                    onClick={() => navigate(route)}
                    className="course-path-card"
                    style={{
                      '--path-shell': palette.shell,
                      '--path-border': palette.border,
                      '--path-shadow': palette.shadow,
                      '--path-accent': palette.accent,
                      '--path-accent-dark': palette.accentDark,
                    } as React.CSSProperties}
                  >
                    <span className="course-path-card__visual" aria-hidden="true">
                      <img src={getPathVisual(path)} alt="" />
                    </span>
                    <span className="course-path-card__content">
                      <span className="course-path-card__icon">{path.mark}</span>
                      <span className="course-path-card__title-row">
                        <span className="course-path-card__title">{path.title}</span>
                        {path.routeType === 'path' && <span className="course-path-card__recommendation">{ui.recommended}</span>}
                      </span>
                      <span className="course-path-card__subtitle">{path.subtitle}</span>
                      <span className="course-path-card__progress-row">
                        <span>{path.completedCourses} / {Math.max(path.matchedCourses, 1)} {ui.done}</span>
                        <strong>{path.progressPercent}%</strong>
                      </span>
                      <span className="course-path-card__progress-track" aria-hidden="true">
                        <span style={{ width: `${path.progressPercent}%` }} />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {activeFilter && (
          <div className="course-catalog__back-row">
            <button type="button" onClick={() => navigate('/courses')}>
              <span aria-hidden="true">‹</span>
              {ui.backToAllPaths}
            </button>
          </div>
        )}

        {error && <div className="course-catalog__error" role="alert">{error}</div>}

        <section className="course-catalog__courses" aria-label={ui.courseCatalog}>
          <div className="course-catalog__section-heading course-catalog__section-heading--courses">
            <div>
              <h2>{activeFilter ? pageTitle : ui.courseCatalog}</h2>
              <p>{activeFilter ? ui.allPaths : ui.browseTopics}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="course-catalog__skeleton-grid" aria-label="Loading courses">
              {[1, 2, 3].map((item) => <div key={item} className="course-catalog__skeleton" />)}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="course-catalog__empty-state">
              <div aria-hidden="true">?</div>
              <h2>{ui.noCoursesInCategory}</h2>
              <p>{ui.noCoursesInCategoryBody}</p>
            </div>
          ) : (
            <div className="course-list-grid course-catalog__course-grid">
              {filteredCourses.map((course, index) => {
                const courseProgress = getCourseProgress(course, progressByCourse.get(course.course_id));
                const totalCourseXp = course.lessons.reduce((sum, lesson) => sum + (lesson.reward?.xp || 0), 0);
                const firstLessonId = progressByCourse.get(course.course_id)?.current_lesson_id || course.lessons[0]?.lesson_id;
                const displayProgress = hasLiveCourses ? courseProgress.progressPercent : [35, 50, 22][index] || 30;
                const displayXp = hasLiveCourses ? totalCourseXp : [500, 350, 480][index] || 420;
                const duration = course.lessons.reduce((sum, lesson) => sum + (lesson.duration_minutes || 0), 0) || course.lessons.length * 6;
                const displayLevel = levelLabel[locale][course.level] || course.level;
                const tags = ['AR', ui.vocabulary, ui.fun];
                const completed = hasLiveCourses ? courseProgress.completedLessons : [2, 3, 1][index] || 0;
                const total = courseProgress.totalLessons || course.lessons.length || 1;

                return (
                  <CourseCard
                    key={course.course_id}
                    course={course}
                    locale={locale}
                    completedLessons={completed}
                    totalLessons={total}
                    progressPercent={displayProgress}
                    xp={displayXp}
                    durationMinutes={duration}
                    levelLabel={displayLevel}
                    actionLabel={completed > 0 ? ui.continueLearning : ui.startLearning}
                    progressLabel={ui.progress}
                    hourLabel={ui.hourLabel}
                    tags={tags}
                    isInteractive
                    onOpen={() => navigate(`/courses/${course.course_id}`)}
                    onStart={() => {
                      navigate(firstLessonId ? `/courses/${course.course_id}/lessons/${firstLessonId}` : `/courses/${course.course_id}`);
                    }}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CourseList;
