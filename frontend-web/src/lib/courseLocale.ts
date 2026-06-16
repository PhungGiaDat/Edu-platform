import type { Course, EnrollmentCTA, Lesson, StudentTestimonial } from '@/types/course';
import type { Locale } from '@/contexts/LocaleContext';

type LocalizedText = {
  en: string;
  vi: string;
};

type CourseCopy = {
  title: LocalizedText;
  subtitle: LocalizedText;
  description: LocalizedText;
  theme: LocalizedText;
  category: LocalizedText;
  preview?: Array<{ label: LocalizedText; value: string; color: string }>;
  cta?: {
    headline: LocalizedText;
    body: LocalizedText;
    buttonLabel: LocalizedText;
  };
  testimonials?: Array<{
    name: string;
    role: LocalizedText;
    quote: LocalizedText;
    avatar: string;
  }>;
};

const courseCopyByKey: Record<string, CourseCopy> = {
  home_family: {
    title: {
      en: 'Momo Learns English at Home',
      vi: 'Momo hoc tieng Anh o nha',
    },
    subtitle: {
      en: 'Home, family, and feelings',
      vi: 'Gia dinh, ngoi nha va cam xuc',
    },
    description: {
      en: 'Learn family words, rooms, feelings, and cozy daily phrases through videos, games, read-aloud stories, quizzes, and stickers.',
      vi: 'Hoc tu ve gia dinh, cac phong trong nha, cam xuc va cau noi hang ngay qua video, tro choi, truyen doc, quiz va sticker.',
    },
    theme: { en: 'Home and Family', vi: 'Gia dinh' },
    category: { en: 'Home and Family', vi: 'Gia dinh' },
  },
  nature: {
    title: {
      en: 'Momo Explores Animals and Nature',
      vi: 'Momo kham pha dong vat va thien nhien',
    },
    subtitle: {
      en: 'Animals, jungle, weather, and nature words',
      vi: 'Dong vat, rung, thoi tiet va tu vung thien nhien',
    },
    description: {
      en: 'Meet animals, scan AR flashcards, listen to nature stories, and practice useful English words with playful mini games.',
      vi: 'Gap cac loai dong vat, quet flashcard AR, nghe truyen thien nhien va luyen tu tieng Anh qua cac tro choi nho.',
    },
    theme: { en: 'Animals and Nature', vi: 'Dong vat va thien nhien' },
    category: { en: 'Animals and Nature', vi: 'Dong vat va thien nhien' },
  },
  school_food: {
    title: {
      en: 'Momo Learns English at School',
      vi: 'Momo hoc tieng Anh o truong',
    },
    subtitle: {
      en: 'School, food, classroom, and lunch words',
      vi: 'Truong hoc, mon an, lop hoc va bua trua',
    },
    description: {
      en: 'Practice classroom words, lunch choices, colors, and friendly school phrases with videos, games, tracing, and cheerful quizzes.',
      vi: 'Luyen tu ve lop hoc, bua trua, mau sac va cau giao tiep o truong qua video, tro choi, tap noi va quiz vui.',
    },
    theme: { en: 'School and Food', vi: 'Truong hoc va mon an' },
    category: { en: 'School and Food', vi: 'Truong hoc va mon an' },
  },
};

const fallbackTestimonials: Array<{
  name: string;
  role: LocalizedText;
  quote: LocalizedText;
  avatar: string;
}> = [
  {
    name: 'Lina',
    role: { en: 'Young learner', vi: 'Hoc vien nho' },
    quote: {
      en: 'The games make every lesson feel like playtime, and I remember the words faster.',
      vi: 'Tro choi lam moi bai hoc nhu gio choi, va em nho tu moi nhanh hon.',
    },
    avatar: 'L',
  },
  {
    name: 'Minh',
    role: { en: 'Parent', vi: 'Phu huynh' },
    quote: {
      en: 'The short lessons and progress badges help my child stay excited after school.',
      vi: 'Bai hoc ngan va huy hieu tien do giup con toi hao hung sau gio hoc.',
    },
    avatar: 'M',
  },
];

const looksBroken = (value?: string | null) => !value || /�|Ã|Æ|Ä|á|»|\?{2,}|ð|Ÿ|â/.test(value);

const pick = (text: LocalizedText, locale: Locale) => text[locale] || text.en;

export const getCourseCopy = (course: Course): CourseCopy | undefined => {
  const key = course.category_key || '';
  if (courseCopyByKey[key]) return courseCopyByKey[key];

  const haystack = `${course.course_id} ${course.title} ${course.theme} ${course.description || ''}`.toLowerCase();
  if (haystack.includes('home') || haystack.includes('family')) return courseCopyByKey.home_family;
  if (haystack.includes('nature') || haystack.includes('animal') || haystack.includes('jungle')) return courseCopyByKey.nature;
  if (haystack.includes('school') || haystack.includes('food')) return courseCopyByKey.school_food;

  return undefined;
};

export const courseTitle = (course: Course, locale: Locale) => {
  const copy = getCourseCopy(course);
  if (copy) return pick(copy.title, locale);
  const preferred = locale === 'vi' ? course.subtitle_vi : course.title;
  return looksBroken(preferred) ? course.title || course.theme || course.course_id : preferred;
};

export const courseSubtitle = (course: Course, locale: Locale) => {
  const copy = getCourseCopy(course);
  if (copy) return pick(copy.subtitle, locale);
  const preferred = locale === 'vi' ? course.subtitle_vi : course.theme;
  return looksBroken(preferred) ? course.theme || course.level : preferred;
};

export const courseDescription = (course: Course, locale: Locale) => {
  const copy = getCourseCopy(course);
  if (copy) return pick(copy.description, locale);
  const preferred = locale === 'vi' ? course.description_vi : course.description;
  const fallback = course.description || course.description_vi || '';
  return looksBroken(preferred) ? (looksBroken(fallback) ? courseSubtitle(course, locale) : fallback) : preferred || fallback;
};

export const courseTheme = (course: Course, locale: Locale) => {
  const copy = getCourseCopy(course);
  if (copy) return pick(copy.theme, locale);
  return looksBroken(course.theme) ? courseSubtitle(course, locale) : course.theme;
};

export const courseCategoryLabel = (course: Course, locale: Locale) => {
  const copy = getCourseCopy(course);
  if (copy) return pick(copy.category, locale);
  return looksBroken(course.category_label) ? courseTheme(course, locale) : course.category_label;
};

export const enrollmentCta = (course: Course, locale: Locale, fallbackButton: string): EnrollmentCTA => {
  const copy = getCourseCopy(course);
  if (copy?.cta) {
    return {
      headline: pick(copy.cta.headline, locale),
      body: pick(copy.cta.body, locale),
      buttonLabel: pick(copy.cta.buttonLabel, locale),
    };
  }
  return {
    headline: courseTitle(course, locale),
    body: courseDescription(course, locale),
    buttonLabel: course.enrollmentCta?.buttonLabel && !looksBroken(course.enrollmentCta.buttonLabel)
      ? course.enrollmentCta.buttonLabel
      : fallbackButton,
  };
};

export const testimonials = (course: Course, locale: Locale): StudentTestimonial[] => {
  const copy = getCourseCopy(course);
  const source = copy?.testimonials || fallbackTestimonials;
  return source.map(item => ({
    name: item.name,
    role: pick(item.role, locale),
    quote: pick(item.quote, locale),
    avatar: item.avatar,
  }));
};

export const lessonTitle = (lesson: Lesson, locale: Locale) => {
  if (locale === 'vi' && lesson.title_vi && !looksBroken(lesson.title_vi)) return lesson.title_vi;
  return looksBroken(lesson.title) ? `Lesson ${lesson.order}` : lesson.title;
};

export const lessonDescription = (lesson: Lesson, locale: Locale) => {
  if (locale === 'vi' && lesson.title_vi && !looksBroken(lesson.title_vi)) return lesson.title_vi;
  if (lesson.description && !looksBroken(lesson.description)) return lesson.description;
  return lessonTitle(lesson, locale);
};

export const cleanText = (value: string | undefined | null, fallback: string) => {
  return looksBroken(value) ? fallback : value || fallback;
};

