import type { Locale } from '@/contexts/LocaleContext';
import type { Course, EnrollmentCTA, Lesson, StudentTestimonial } from '@/types/course';

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
      vi: 'Momo học tiếng Anh ở nhà',
    },
    subtitle: {
      en: 'Home, family, and feelings',
      vi: 'Gia đình, ngôi nhà và cảm xúc',
    },
    description: {
      en: 'Learn family words, rooms, feelings, and cozy daily phrases through videos, games, read-aloud stories, quizzes, and stickers.',
      vi: 'Học từ vựng về gia đình, các phòng trong nhà, cảm xúc và câu nói hằng ngày qua video, trò chơi, truyện đọc, quiz và sticker.',
    },
    theme: { en: 'Home and Family', vi: 'Gia đình' },
    category: { en: 'Home and Family', vi: 'Gia đình' },
    cta: {
      headline: { en: 'Start the home adventure', vi: 'Bắt đầu hành trình ở nhà' },
      body: {
        en: 'Short lessons about family, rooms, and feelings help kids build a warm English routine.',
        vi: 'Các bài học ngắn về gia đình, căn phòng và cảm xúc giúp bé tạo thói quen học tiếng Anh thật gần gũi.',
      },
      buttonLabel: { en: 'Start this path', vi: 'Bắt đầu lộ trình' },
    },
  },
  nature: {
    title: {
      en: 'Momo Explores Animals and Nature',
      vi: 'Momo khám phá động vật và thiên nhiên',
    },
    subtitle: {
      en: 'Animals, jungle, weather, and nature words',
      vi: 'Động vật, rừng, thời tiết và từ vựng thiên nhiên',
    },
    description: {
      en: 'Meet animals, scan AR flashcards, listen to nature stories, and practice useful English words with playful mini games.',
      vi: 'Gặp các loài động vật, quét flashcard AR, nghe truyện thiên nhiên và luyện từ tiếng Anh qua các trò chơi nhỏ.',
    },
    theme: { en: 'Animals and Nature', vi: 'Động vật và thiên nhiên' },
    category: { en: 'Animals and Nature', vi: 'Động vật và thiên nhiên' },
    cta: {
      headline: { en: 'Jump into the nature trail', vi: 'Bước vào hành trình thiên nhiên' },
      body: {
        en: 'Kids can learn animal words, nature scenes, and AR flashcards in one bright route.',
        vi: 'Bé có thể học từ về động vật, cảnh thiên nhiên và flashcard AR trong một lộ trình rực rỡ.',
      },
      buttonLabel: { en: 'Explore now', vi: 'Khám phá ngay' },
    },
  },
  school_food: {
    title: {
      en: 'Momo Learns English at School',
      vi: 'Momo học tiếng Anh ở trường',
    },
    subtitle: {
      en: 'School, food, classroom, and lunch words',
      vi: 'Trường học, món ăn, lớp học và bữa trưa',
    },
    description: {
      en: 'Practice classroom words, lunch choices, colors, and friendly school phrases with videos, games, tracing, and cheerful quizzes.',
      vi: 'Luyện từ về lớp học, bữa trưa, màu sắc và câu giao tiếp ở trường qua video, trò chơi, tập nói và quiz vui.',
    },
    theme: { en: 'School and Food', vi: 'Trường học và món ăn' },
    category: { en: 'School and Food', vi: 'Trường học và món ăn' },
    cta: {
      headline: { en: 'Get ready for classroom English', vi: 'Sẵn sàng cho tiếng Anh trong lớp học' },
      body: {
        en: 'From lunch words to classroom phrases, this path keeps school English easy and playful.',
        vi: 'Từ từ vựng bữa trưa đến câu nói trong lớp, lộ trình này giúp tiếng Anh ở trường trở nên nhẹ nhàng và vui hơn.',
      },
      buttonLabel: { en: 'Open the path', vi: 'Mở lộ trình' },
    },
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
    role: { en: 'Young learner', vi: 'Học viên nhỏ' },
    quote: {
      en: 'The games make every lesson feel like playtime, and I remember the words faster.',
      vi: 'Trò chơi làm mỗi bài học như giờ chơi, và em nhớ từ mới nhanh hơn.',
    },
    avatar: 'L',
  },
  {
    name: 'Minh',
    role: { en: 'Parent', vi: 'Phụ huynh' },
    quote: {
      en: 'The short lessons and progress badges help my child stay excited after school.',
      vi: 'Bài học ngắn và huy hiệu tiến độ giúp con tôi hào hứng sau giờ học.',
    },
    avatar: 'M',
  },
];

const looksBroken = (value?: string | null) => {
  if (!value) return true;
  if (/ÃƒÂ¯Ã‚Â¿Ã‚Â½|ÃƒÆ’Ã†â€™|ÃƒÆ’Ã¢â‚¬Â |ÃƒÆ’Ã¢â‚¬Å¾|ÃƒÆ’Ã‚Â¡|Ãƒâ€šÃ‚Â»|\?{2,}|ÃƒÆ’Ã‚Â°|Ãƒâ€¦Ã‚Â¸|ÃƒÆ’Ã‚Â¢/.test(value)) return true;

  const trimmed = value.trim();
  const questionMarks = (trimmed.match(/\?/g) || []).length;
  if (questionMarks > 1) return true;
  if (questionMarks === 1 && trimmed.length <= 5) return true;
  if (questionMarks === 1 && !/[?!]$/.test(trimmed)) return true;

  return false;
};

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
  return source.map((item) => ({
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

export const cleanText = (value: string | undefined | null, fallback: string) =>
  (looksBroken(value) ? fallback : value || fallback);
