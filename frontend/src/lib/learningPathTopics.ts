import type { Locale } from '@/contexts/LocaleContext';
import type { Course } from '@/types/course';

export type LearningTopicId =
  | 'family'
  | 'school'
  | 'nature'
  | 'animals'
  | 'food'
  | 'colors_shapes'
  | 'body_clothes'
  | 'transport'
  | 'weather'
  | 'places';

type LocalizedCopy = Record<Locale, string>;

export type LearningTopic = {
  id: LearningTopicId;
  name: LocalizedCopy;
  hint: LocalizedCopy;
  icon: string;
  wordCount: number;
  ageBand: '5-8';
  relatedCourseKeys: string[];
  keywords: string[];
};

export const learningTopics: LearningTopic[] = [
  {
    id: 'family',
    name: { en: 'Family', vi: 'Gia dinh' },
    hint: { en: 'Mom, dad, sister, brother, baby', vi: 'Me, ba, chi em, anh em, em be' },
    icon: 'HF',
    wordCount: 12,
    ageBand: '5-8',
    relatedCourseKeys: ['home_family'],
    keywords: ['family', 'home', 'mother', 'father', 'room', 'feelings'],
  },
  {
    id: 'school',
    name: { en: 'School', vi: 'Truong hoc' },
    hint: { en: 'Book, pencil, teacher, desk, bag', vi: 'Sach, but chi, giao vien, ban hoc, cap sach' },
    icon: 'SC',
    wordCount: 11,
    ageBand: '5-8',
    relatedCourseKeys: ['school_food'],
    keywords: ['school', 'classroom', 'teacher', 'book', 'pencil', 'desk'],
  },
  {
    id: 'nature',
    name: { en: 'Nature', vi: 'Thien nhien' },
    hint: { en: 'Tree, flower, sun, rain, river', vi: 'Cay, hoa, mat troi, mua, song' },
    icon: 'NT',
    wordCount: 10,
    ageBand: '5-8',
    relatedCourseKeys: ['nature'],
    keywords: ['nature', 'tree', 'flower', 'sun', 'rain', 'river', 'forest'],
  },
  {
    id: 'animals',
    name: { en: 'Animals', vi: 'Dong vat' },
    hint: { en: 'Cat, dog, bird, fish, elephant', vi: 'Meo, cho, chim, ca, voi' },
    icon: 'AN',
    wordCount: 15,
    ageBand: '5-8',
    relatedCourseKeys: ['animals'],
    keywords: ['animal', 'animals', 'cat', 'dog', 'bird', 'fish', 'elephant', 'jungle'],
  },
  {
    id: 'food',
    name: { en: 'Food', vi: 'Do an' },
    hint: { en: 'Apple, milk, bread, rice, water', vi: 'Tao, sua, banh mi, com, nuoc' },
    icon: 'FD',
    wordCount: 14,
    ageBand: '5-8',
    relatedCourseKeys: ['school_food'],
    keywords: ['food', 'fruit', 'meal', 'lunch', 'apple', 'bread', 'rice'],
  },
  {
    id: 'colors_shapes',
    name: { en: 'Colors & Shapes', vi: 'Mau sac va hinh khoi' },
    hint: { en: 'Red, blue, circle, square, star', vi: 'Do, xanh, hinh tron, hinh vuong, ngoi sao' },
    icon: 'CS',
    wordCount: 8,
    ageBand: '5-8',
    relatedCourseKeys: ['school_food'],
    keywords: ['color', 'colors', 'shape', 'shapes', 'circle', 'square', 'star'],
  },
  {
    id: 'body_clothes',
    name: { en: 'Body & Clothes', vi: 'Co the va quan ao' },
    hint: { en: 'Hand, head, shirt, shoes, hat', vi: 'Tay, dau, ao, giay, mu' },
    icon: 'BC',
    wordCount: 10,
    ageBand: '5-8',
    relatedCourseKeys: ['home_family', 'school_food'],
    keywords: ['body', 'clothes', 'shirt', 'shoes', 'hat', 'hand', 'head'],
  },
  {
    id: 'transport',
    name: { en: 'Transport', vi: 'Phuong tien' },
    hint: { en: 'Car, bus, bike, train, plane', vi: 'Xe hoi, xe buyt, xe dap, tau hoa, may bay' },
    icon: 'TR',
    wordCount: 9,
    ageBand: '5-8',
    relatedCourseKeys: [],
    keywords: ['transport', 'vehicle', 'vehicles', 'car', 'bus', 'bike', 'train', 'plane'],
  },
  {
    id: 'weather',
    name: { en: 'Weather', vi: 'Thoi tiet' },
    hint: { en: 'Sunny, rainy, windy, cloudy, cold', vi: 'Nang, mua, gio, nhieu may, lanh' },
    icon: 'WT',
    wordCount: 8,
    ageBand: '5-8',
    relatedCourseKeys: ['nature'],
    keywords: ['weather', 'sunny', 'rainy', 'windy', 'cloudy', 'cold'],
  },
  {
    id: 'places',
    name: { en: 'Places', vi: 'Dia diem' },
    hint: { en: 'Home, park, classroom, shop, zoo', vi: 'Nha, cong vien, lop hoc, cua hang, so thu' },
    icon: 'PL',
    wordCount: 10,
    ageBand: '5-8',
    relatedCourseKeys: ['home_family', 'school_food', 'nature'],
    keywords: ['place', 'places', 'home', 'park', 'classroom', 'shop', 'zoo'],
  },
];

export const learningTopicMap = Object.fromEntries(
  learningTopics.map((topic) => [topic.id, topic]),
) as Record<LearningTopicId, LearningTopic>;

export const topicLabel = (topicId: string, locale: Locale) =>
  learningTopicMap[topicId as LearningTopicId]?.name[locale] || topicId;

export const topicHint = (topicId: string, locale: Locale) =>
  learningTopicMap[topicId as LearningTopicId]?.hint[locale] || '';

export const topicWordCount = (topicId: string) =>
  learningTopicMap[topicId as LearningTopicId]?.wordCount || 0;

const courseHaystack = (course: Course) =>
  [
    course.course_id,
    course.title,
    course.subtitle_vi,
    course.theme,
    course.category_key,
    course.category_label,
    course.description,
    course.description_vi,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export const matchesTopic = (course: Course, topicId: string) => {
  const topic = learningTopicMap[topicId as LearningTopicId];
  if (!topic) return false;

  if (topic.relatedCourseKeys.includes(course.category_key)) {
    return true;
  }

  const haystack = courseHaystack(course);
  return topic.keywords.some((keyword) => haystack.includes(keyword));
};

export const scoreCourseForTopics = (course: Course, topicIds: string[]) =>
  topicIds.reduce((score, topicId, index) => {
    if (!matchesTopic(course, topicId)) return score;
    return score + (topicIds.length - index) * 100;
  }, 0);

