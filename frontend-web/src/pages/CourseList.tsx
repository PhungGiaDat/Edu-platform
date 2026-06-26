import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { CourseCard } from '@/components/CourseCard';
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
    heroKicker: 'Claymorphic learning hub',
    heroBody: 'Explore short lesson paths, beginner vocabulary, AR-ready activities, quizzes, and rewards built for young learners.',
    yourPaths: 'Your Learning Paths',
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
    allPaths: 'All paths',
  },
  vi: {
    courseCatalog: 'Danh sách khóa học',
    heroKicker: 'Trung tâm học tập claymorphic',
    heroBody: 'Khám phá các lộ trình bài học ngắn, từ vựng cơ bản, hoạt động AR, quiz và phần thưởng dành cho trẻ nhỏ.',
    yourPaths: 'Lộ trình học của bạn',
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
    allPaths: 'Tất cả lộ trình',
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
  vocabulary: [],
  quiz: [],
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

const LanguageSwitch: React.FC = () => {
  const { locale, setLocale } = useLocale();

  return (
    <div className="inline-flex items-center gap-2 rounded-full border-4 border-white bg-white p-1 shadow-[0_6px_0_rgba(91,141,239,0.12)]">
      {(['en', 'vi'] as Locale[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          className={`min-h-11 rounded-full px-4 text-sm font-black transition-colors ${
            locale === option ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-sky-50'
          }`}
        >
          {option === 'en' ? 'EN' : 'VI'}
        </button>
      ))}
    </div>
  );
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
      className="course-catalog min-h-screen w-full max-w-[100vw] min-w-0 overflow-x-hidden clay-bg-playful pb-[calc(env(safe-area-inset-bottom)+12rem)] md:pb-10"
      style={courseListTheme}
    >
      <div className="relative z-10 mx-auto w-full max-w-6xl min-w-0 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10">
        <header className="mx-auto mb-8 max-w-4xl text-center sm:mb-10">
          <div className="mb-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <div className="clay-badge clay-badge-yellow max-w-full text-center text-base sm:text-lg">
              <span>{ui.heroKicker}</span>
            </div>
            <LanguageSwitch />
          </div>
          <h1
            className="mb-5 text-5xl font-black leading-none text-slate-800 sm:text-6xl lg:text-7xl"
            style={{ fontFamily: "'Baloo 2', system-ui, sans-serif" }}
          >
            {pageTitle}
          </h1>
          <p className="mx-auto max-w-3xl text-xl font-semibold leading-9 text-slate-600 sm:text-2xl">
            {ui.heroBody}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {priorityTopics.length > 0 ? (
              priorityTopics.map((topicId) => (
                <button
                  key={topicId}
                  type="button"
                  onClick={() => navigate(`/courses/path/${topicId}`)}
                  className="rounded-full border-4 border-white bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-[0_6px_0_rgba(91,141,239,0.10)]"
                >
                  {topicLabel(topicId, locale)}
                </button>
              ))
            ) : (
              <div className="rounded-full border-4 border-white bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-[0_6px_0_rgba(91,141,239,0.10)]">
                {ui.noPriorityTopics}
              </div>
            )}
          </div>

          {!hasLiveCourses && !isLoading && (
            <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center gap-3 rounded-[28px] border-4 border-white bg-white p-4 shadow-[0_8px_0_rgba(91,141,239,0.10)] sm:flex-row sm:justify-between sm:text-left">
              <p className="text-sm font-black text-slate-600">{ui.noCoursesBody}</p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="clay-btn clay-btn-sm clay-btn-yellow shrink-0 disabled:opacity-60"
              >
                {isGenerating ? ui.generating : ui.generateCourse}
              </button>
            </div>
          )}
        </header>

        <section className="mb-9 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="clay-stat-card min-w-0 !rounded-[26px] !border-white/90 !bg-white/95 !p-5 sm:!p-7">
                <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center ${item.tone}`}>
                  <Icon />
                </div>
                <div className="clay-stat-number break-words !text-4xl sm:!text-5xl">{item.value}</div>
                <div className="clay-stat-label !text-base">{item.label}</div>
              </div>
            );
          })}
        </section>

        {!activeFilter && (
          <section className="mb-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2
                  className="text-4xl font-black leading-tight text-slate-800 sm:text-5xl"
                  style={{ fontFamily: "'Baloo 2', system-ui, sans-serif" }}
                >
                  {ui.yourPaths}
                </h2>
                <div className="mt-3 h-2 w-52 rounded-full" style={{ background: colors.coralPink }} />
              </div>
              {!hasLiveCourses && (
                <span className="clay-badge clay-badge-blue hidden text-xs sm:inline-flex">
                  {ui.demo}
                </span>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
                    className="group min-w-0 rounded-[34px] border-4 p-5 text-left transition-transform hover:-translate-y-1"
                    style={{
                      background: palette.shell,
                      borderColor: palette.border,
                      boxShadow: palette.shadow,
                    }}
                  >
                    <div className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] items-center gap-4">
                      <div
                        className="flex h-16 min-h-16 w-16 min-w-16 items-center justify-center rounded-3xl text-lg font-black text-slate-800"
                        style={{
                          background: palette.accent,
                          boxShadow: `0 7px 0 ${palette.accentDark}, inset 0 2px 0 rgba(255,255,255,0.65)`,
                        }}
                      >
                        {path.mark}
                      </div>
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="line-clamp-1 text-xl font-black text-slate-800">{path.title}</h3>
                          {path.routeType === 'path' && (
                            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600 shadow-[0_3px_0_rgba(15,23,42,0.08)]">
                              {ui.recommended}
                            </span>
                          )}
                        </div>
                        <p className="text-base font-bold text-slate-500">{path.subtitle}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm font-black text-slate-500">
                      <span>{path.completedCourses} / {Math.max(path.matchedCourses, 1)} {ui.done}</span>
                      <span className="text-sky-600">{path.progressPercent}%</span>
                    </div>
                    <div className="mt-2 h-4 overflow-hidden rounded-full bg-white/80 shadow-[inset_0_2px_4px_rgba(15,23,42,0.08)]">
                      <div
                        className="h-full rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                        style={{
                          width: `${path.progressPercent}%`,
                          background: palette.accent,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {activeFilter && (
          <div className="mb-5">
            <button type="button" onClick={() => navigate('/courses')} className="clay-btn clay-btn-sm clay-btn-white">
              {ui.backToAllPaths}
            </button>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-3xl border-4 border-white bg-rose-50 p-4 text-center font-black text-rose-600 shadow-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-72 animate-pulse rounded-[28px] bg-white/70" />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-[32px] border-4 border-white bg-white p-6 text-center shadow-[0_10px_0_rgba(91,141,239,0.12)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-yellow-100 text-2xl font-black text-amber-700">?</div>
            <h2 className="mt-3 text-2xl font-black text-slate-800">{ui.noCoursesInCategory}</h2>
            <p className="mt-2 font-bold text-slate-600">{ui.noCoursesInCategoryBody}</p>
          </div>
        ) : (
          <div className="course-list-grid grid min-w-0 gap-6 lg:grid-cols-2 xl:grid-cols-3 xl:gap-7">
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
      </div>
    </div>
  );
};

export default CourseList;
