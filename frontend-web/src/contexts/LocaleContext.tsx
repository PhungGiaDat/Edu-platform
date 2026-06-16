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
    language: 'Ngon ngu',
    english: 'Tieng Anh',
    vietnamese: 'Tieng Viet',
    courseCatalog: 'Danh sach khoa hoc',
    heroKicker: 'Hoc tieng Anh that vui',
    heroTitle: 'Chon mot hanh trinh hoc tap ruc ro',
    heroBody: 'Kham pha bai hoc video ngan, tro choi tu vung, flashcard AR, quiz, phan thuong va theo doi tien do trong mot khu hoc tap than thien.',
    browseCourses: 'Xem khoa hoc',
    continueLearning: 'Hoc tiep',
    startLearning: 'Bat dau hoc',
    enrollNow: 'Dang ky hoc',
    coursePreview: 'Xem truoc khoa hoc',
    progressDemo: 'Theo doi tien do',
    testimonials: 'Cam nhan hoc vien',
    learningPaths: 'Lo trinh hoc',
    allPaths: 'Tat ca lo trinh',
    backToAllPaths: 'Ve tat ca lo trinh',
    courses: 'Khoa hoc',
    lessonsDone: 'Bai da hoc',
    xpEarned: 'XP da nhan',
    inProgress: 'Dang hoc',
    completed: 'hoan thanh',
    done: 'xong',
    age: 'Tuoi',
    lessons: 'bai hoc',
    noCourses: 'Chua co khoa hoc',
    noCoursesBody: 'Hay tao hoac publish khoa hoc trong MongoDB de bat dau Phase 1.',
    generateCourse: 'Tao khoa hoc mau',
    generating: 'Dang tao...',
    noCoursesInCategory: 'Chua co khoa hoc trong muc nay',
    noCoursesInCategoryBody: 'Publish them khoa hoc hoac chon lo trinh khac.',
    loadingCourses: 'Dang tai khoa hoc...',
    loadCourseError: 'Chua tai duoc khoa hoc. Hay thu lai.',
    generateCourseError: 'Chua tao duoc khoa hoc mau. Kiem tra backend va MongoDB.',
    sections: 'Phan hoc',
    rewardXp: 'XP thuong',
    progress: 'Tien do',
    courseSections: 'Cac phan hoc',
    review: 'On lai',
    startLesson: 'Hoc bai nay',
    studentVoices: 'Cam nhan hoc vien',
    courseNotFound: 'Khong tim thay khoa hoc.',
    loadingCourse: 'Dang tai khoa hoc...',
    back: 'Quay lai',
    minute: 'phut',
    words: 'tu',
    say: 'noi',
    game: 'tro choi',
    quiz: 'quiz',
    openingLesson: 'Dang mo bai hoc...',
    readyReward: 'San sang nhan thuong chua?',
    finishPrompt: 'Tra loi quiz, roi hoan thanh phan hoc nay.',
    previous: 'Truoc',
    next: 'Tiep',
    finish: 'Hoan thanh',
    grading: 'Dang cham diem...',
    lessonNotFound: 'Khong co bai hoc.',
    loadingLesson: 'Dang mo bai hoc...',
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

