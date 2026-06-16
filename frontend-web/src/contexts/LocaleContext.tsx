import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Locale = 'en' | 'vi';

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const STORAGE_KEY = 'edu-platform-locale';

const messages: Record<Locale, Record<string, string>> = {
  en: {
    language: 'Language',
    english: 'English',
    vietnamese: 'Vietnamese',
    courseCatalog: 'Course Catalog',
    heroKicker: 'Playful English learning',
    heroTitle: 'Choose a bright learning adventure',
    heroBody: 'Explore short video lessons, vocabulary games, AR flashcards, quizzes, rewards, and progress tracking in one kid-friendly course hub.',
    browseCourses: 'Browse courses',
    continueLearning: 'Continue learning',
    startLearning: 'Start learning',
    enrollNow: 'Enroll now',
    coursePreview: 'Course catalog preview',
    progressDemo: 'Progress tracking demo',
    testimonials: 'Student testimonials',
    learningPaths: 'Learning paths',
    allPaths: 'All paths',
    backToAllPaths: 'Back to all paths',
    courses: 'Courses',
    lessonsDone: 'Lessons done',
    xpEarned: 'XP earned',
    inProgress: 'In progress',
    completed: 'completed',
    done: 'done',
    age: 'Age',
    lessons: 'lessons',
    noCourses: 'No courses yet',
    noCoursesBody: 'Generate or publish courses in MongoDB to start Phase 1.',
    generateCourse: 'Generate sample course',
    generating: 'Generating...',
    noCoursesInCategory: 'No courses in this section yet',
    noCoursesInCategoryBody: 'Publish another course or pick a different learning path.',
    loadingCourses: 'Loading courses...',
    loadCourseError: 'Courses could not be loaded. Please try again.',
    generateCourseError: 'Could not generate a sample course. Check backend and MongoDB.',
    sections: 'Sections',
    rewardXp: 'Reward XP',
    progress: 'Progress',
    courseSections: 'Course sections',
    review: 'Review',
    startLesson: 'Start lesson',
    studentVoices: 'Student voices',
    courseNotFound: 'Course not found.',
    loadingCourse: 'Loading course...',
    back: 'Back',
    minute: 'min',
    words: 'words',
    say: 'say',
    game: 'game',
    quiz: 'quiz',
    openingLesson: 'Opening lesson...',
    readyReward: 'Ready for your reward?',
    finishPrompt: 'Answer the quiz, then finish this section.',
    previous: 'Previous',
    next: 'Next',
    finish: 'Finish',
    grading: 'Grading...',
    lessonNotFound: 'Lesson not found.',
    loadingLesson: 'Opening lesson...',
  },
  vi: {
    language: 'Ngôn ngữ',
    english: 'Tiếng Anh',
    vietnamese: 'Tiếng Việt',
    courseCatalog: 'Danh sách khóa học',
    heroKicker: 'Học tiếng Anh thật vui',
    heroTitle: 'Chọn một hành trình học tập rực rỡ',
    heroBody: 'Khám phá bài học video ngắn, trò chơi từ vựng, flashcard AR, quiz, phần thưởng và theo dõi tiến độ trong một khu học tập thân thiện.',
    browseCourses: 'Xem khóa học',
    continueLearning: 'Học tiếp',
    startLearning: 'Bắt đầu học',
    enrollNow: 'Đăng ký học',
    coursePreview: 'Xem trước khóa học',
    progressDemo: 'Theo dõi tiến độ',
    testimonials: 'Cảm nhận học viên',
    learningPaths: 'Lộ trình học',
    allPaths: 'Tất cả lộ trình',
    backToAllPaths: 'Về tất cả lộ trình',
    courses: 'Khóa học',
    lessonsDone: 'Bài đã học',
    xpEarned: 'XP đã nhận',
    inProgress: 'Đang học',
    completed: 'hoàn thành',
    done: 'xong',
    age: 'Tuổi',
    lessons: 'bài học',
    noCourses: 'Chưa có khóa học',
    noCoursesBody: 'Bạn vẫn có thể xem bản demo bên dưới. Hãy tạo hoặc publish khóa học trong MongoDB để dùng dữ liệu thật.',
    generateCourse: 'Tạo khóa học mẫu',
    generating: 'Đang tạo...',
    noCoursesInCategory: 'Chưa có khóa học trong mục này',
    noCoursesInCategoryBody: 'Publish thêm khóa học hoặc chọn lộ trình khác.',
    loadingCourses: 'Đang tải khóa học...',
    loadCourseError: 'Chưa tải được khóa học. Hãy thử lại.',
    generateCourseError: 'Chưa tạo được khóa học mẫu. Kiểm tra backend và MongoDB.',
    sections: 'Phần học',
    rewardXp: 'XP thưởng',
    progress: 'Tiến độ',
    courseSections: 'Các phần học',
    review: 'Ôn lại',
    startLesson: 'Học bài này',
    studentVoices: 'Cảm nhận học viên',
    courseNotFound: 'Không tìm thấy khóa học.',
    loadingCourse: 'Đang tải khóa học...',
    back: 'Quay lại',
    minute: 'phút',
    words: 'từ',
    say: 'nói',
    game: 'trò chơi',
    quiz: 'quiz',
    openingLesson: 'Đang mở bài học...',
    readyReward: 'Sẵn sàng nhận thưởng chưa?',
    finishPrompt: 'Trả lời quiz, rồi hoàn thành phần học này.',
    previous: 'Trước',
    next: 'Tiếp',
    finish: 'Hoàn thành',
    grading: 'Đang chấm điểm...',
    lessonNotFound: 'Không có bài học.',
    loadingLesson: 'Đang mở bài học...',
  },
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'vi' || stored === 'en' ? stored : 'en';
    } catch {
      return 'en';
    }
  });

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    try {
      localStorage.setItem(STORAGE_KEY, nextLocale);
    } catch {
      // Ignore storage failures.
    }
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    t: (key: string) => messages[locale][key] || messages.en[key] || key,
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used inside LocaleProvider');
  }
  return context;
};
