/**
 * Course Theme System
 * Defines distinct visual identities for each course:
 * 1. Home & Family: Cozy, warm, domestic, gentle
 * 2. Animals & Nature: Adventurous, bright, natural, forest/river/sky
 * 3. School & Food: Energetic, colorful, educational, cheerful
 */

import type { Course } from '@/types/course';

export type CourseThemeKey = 'home' | 'nature' | 'school';

export interface CourseThemeConfig {
  key: CourseThemeKey;
  heroLessonId: string;
  badgeLabelEn: string;
  badgeLabelVi: string;
  themeLabelEn: string;
  themeLabelVi: string;
  taglineEn: string;
  taglineVi: string;
  mascotEmoji: string;
  mascotName: string;
  primaryAccent: string;
  secondaryAccent: string;
  accentGradient: string;
  heroBgGradient: string;
  cardBorder: string;
  cardBg: string;
  pillBg: string;
  pillText: string;
  reviewPillBg: string;
  chipBg: string;
  objectives: Array<{ icon: string; titleEn: string; titleVi: string; descEn: string; descVi: string }>;
  arHighlightsEn: string;
  arHighlightsVi: string;
  defaultCoverUrl: string;
}

export const COURSE_THEMES: Record<CourseThemeKey, CourseThemeConfig> = {
  home: {
    key: 'home',
    heroLessonId: 'hello-family',
    badgeLabelEn: '🏠 Home & Family World',
    badgeLabelVi: '🏠 Ngôi nhà & Gia đình ấm áp',
    themeLabelEn: 'Home, Family and Feelings',
    themeLabelVi: 'Gia đình, Ngôi nhà và Cảm xúc',
    taglineEn: 'Explore cozy rooms, family members, healthy habits, and cheerful emotions.',
    taglineVi: 'Khám phá các căn phòng ấm áp, các thành viên gia đình, thói quen sạch sẽ và cảm xúc vui tươi.',
    mascotEmoji: '🧸',
    mascotName: 'Cozy Momo',
    primaryAccent: '#FF9F43',
    secondaryAccent: '#FF6B6B',
    accentGradient: 'linear-gradient(135deg, #FF9F43 0%, #FF6B6B 100%)',
    heroBgGradient: 'linear-gradient(145deg, #FFF9F0 0%, #FFF0DE 50%, #FFE8D6 100%)',
    cardBorder: 'rgba(255, 159, 67, 0.35)',
    cardBg: '#FFFDF9',
    pillBg: '#FFF1D7',
    pillText: '#B45309',
    reviewPillBg: '#FEF3C7',
    chipBg: '#FFEFE5',
    objectives: [
      {
        icon: '👨‍👩‍👧',
        titleEn: 'Family Members',
        titleVi: 'Thành viên gia đình',
        descEn: 'Say Mom, Dad, Baby with natural pronunciation.',
        descVi: 'Gọi tên Bố, Mẹ, Em bé tự nhiên và rõ ràng.',
      },
      {
        icon: '🛏️',
        titleEn: 'Room & Toys',
        titleVi: 'Đồ vật trong phòng',
        descEn: 'Name Bed, Chair, Toy around the bedroom.',
        descVi: 'Nhận biết Giường, Ghế, Đồ chơi xung quanh phòng ngủ.',
      },
      {
        icon: '🍎',
        titleEn: 'Kitchen & Habits',
        titleVi: 'Nhà bếp & Thói quen',
        descEn: 'Identify healthy snacks and clean washing routines.',
        descVi: 'Gọi tên Táo, Sữa, Xà phòng và thói quen rửa tay sạch sẽ.',
      },
      {
        icon: '😊',
        titleEn: 'Feelings & Joy',
        titleVi: 'Cảm xúc & Niềm vui',
        descEn: 'Express Happy, Sad, Smile through playful stories.',
        descVi: 'Bày tỏ cảm xúc Vui vẻ, Buồn và Nụ cười qua truyện ngắn.',
      },
    ],
    arHighlightsEn: 'Selected lessons include 3D AR cards showing 3D interactive family home elements.',
    arHighlightsVi: 'Các bài học trọng tâm có hỗ trợ thẻ Flashcard AR 3D mô phỏng không gian gia đình trực quan.',
    defaultCoverUrl: '/learnar-assets/courses/momo-home-family-english-5-7/images/course-cover.webp',
  },
  nature: {
    key: 'nature',
    heroLessonId: 'meet-the-elephant',
    badgeLabelEn: '🌿 Forest & Animal Safari',
    badgeLabelVi: '🌿 Thám hiểm Rừng xanh & Muông thú',
    themeLabelEn: 'Animals and Nature',
    themeLabelVi: 'Động vật và Thiên nhiên kỳ thú',
    taglineEn: 'Journey through wild jungles, splashing rivers, tall green trees, and singing birds.',
    taglineVi: 'Hành trình khám phá rừng rậm nhiệt đới, dòng sông mát rượi, cây xanh và tiếng chim ca.',
    mascotEmoji: '🐘',
    mascotName: 'Explorer Momo',
    primaryAccent: '#10B981',
    secondaryAccent: '#0EA5E9',
    accentGradient: 'linear-gradient(135deg, #10B981 0%, #0EA5E9 100%)',
    heroBgGradient: 'linear-gradient(145deg, #F0FDF4 0%, #E0F2FE 50%, #DCFCE7 100%)',
    cardBorder: 'rgba(16, 185, 129, 0.35)',
    cardBg: '#FAFCF8',
    pillBg: '#DCFCE7',
    pillText: '#15803D',
    reviewPillBg: '#D1FAE5',
    chipBg: '#E8F8F0',
    objectives: [
      {
        icon: '🐘',
        titleEn: 'Gentle Giants',
        titleVi: 'Gặp bạn Voi khổng lồ',
        descEn: 'Discover Elephant, Big, Trunk with 3D models.',
        descVi: 'Khám phá bạn Voi, Vòi dài và kích thước To lớn qua mô hình 3D.',
      },
      {
        icon: '🌳',
        titleEn: 'Trees & Foliage',
        titleVi: 'Cây xanh & Lá rừng',
        descEn: 'Explore Tree, Leaf, Green in lush forest scenes.',
        descVi: 'Khám phá Cây xanh, Chiếc lá và Sắc xanh thiên nhiên.',
      },
      {
        icon: '🌊',
        titleEn: 'River & Sky',
        titleVi: 'Dòng sông & Bầu trời',
        descEn: 'Learn River, Water, Blue, Sun, Sky, Yellow.',
        descVi: 'Học từ vựng về Dòng sông, Nước mát, Mặt trời và Bầu trời.',
      },
      {
        icon: '🐦',
        titleEn: 'Wildlife Friends',
        titleVi: 'Bạn chim muông',
        descEn: 'Practice Bird, Fly, Small with animated audio.',
        descVi: 'Luyện phát âm Chú chim, Bay lượn và Nhỏ bé sinh động.',
      },
    ],
    arHighlightsEn: 'Hero lesson "Meet the Elephant" features interactive 3D AR animal image tracking.',
    arHighlightsVi: 'Bài học trọng tâm "Gặp bạn voi" tích hợp Flashcard AR 3D mô phỏng động vật sống động.',
    defaultCoverUrl: '/learnar-assets/courses/momo-nature-english-5-7/images/course-cover.webp',
  },
  school: {
    key: 'school',
    heroLessonId: 'my-classroom',
    badgeLabelEn: '🎒 Classroom & Bento World',
    badgeLabelVi: '🎒 Lớp học rực rỡ & Hộp cơm Bento',
    themeLabelEn: 'School and Food',
    themeLabelVi: 'Trường học, Số đếm và Món ăn ngon',
    taglineEn: 'Prepare for colorful classroom days, vibrant colors, counting games, and tasty lunchboxes.',
    taglineVi: 'Sẵn sàng cho những ngày đến lớp vui nhộn, màu sắc tươi sáng, đếm số và hộp cơm thơm ngon.',
    mascotEmoji: '📚',
    mascotName: 'Scholar Momo',
    primaryAccent: '#F59E0B',
    secondaryAccent: '#6366F1',
    accentGradient: 'linear-gradient(135deg, #F59E0B 0%, #6366F1 100%)',
    heroBgGradient: 'linear-gradient(145deg, #FEFCE8 0%, #F5F3FF 50%, #FEF9C3 100%)',
    cardBorder: 'rgba(245, 158, 11, 0.35)',
    cardBg: '#FCFCFA',
    pillBg: '#FEF3C7',
    pillText: '#B45309',
    reviewPillBg: '#EDE9FE',
    chipBg: '#FFFBEB',
    objectives: [
      {
        icon: '✏️',
        titleEn: 'Classroom Gear',
        titleVi: 'Đồ dùng học tập',
        descEn: 'Recognize Book, Pencil, Bag with ease.',
        descVi: 'Làm quen với Sách vở, Bút chì và Cặp sách xinh xắn.',
      },
      {
        icon: '🎨',
        titleEn: 'Color Palette',
        titleVi: 'Màu sắc tươi sáng',
        descEn: 'Master primary colors: Red, Blue, Yellow.',
        descVi: 'Phân biệt và gọi tên các màu cơ bản: Đỏ, Xanh, Vàng.',
      },
      {
        icon: '🔢',
        titleEn: 'Counting 1-2-3',
        titleVi: 'Đếm số vui nhộn',
        descEn: 'Count One, Two, Three with playful sound effects.',
        descVi: 'Đếm số Một, Hai, Ba qua các thử thách tương tác vui nhộn.',
      },
      {
        icon: '🍱',
        titleEn: 'Lunch & Actions',
        titleVi: 'Bữa trưa & Vận động',
        descEn: 'Name Rice, Egg, Juice and practice Run, Jump, Clap.',
        descVi: 'Gọi tên Cơm, Trứng, Nước ép và tập hành động Chạy, Nhảy, Vỗ tay.',
      },
    ],
    arHighlightsEn: 'Selected classroom objects support AR flashcards for interactive physical vocabulary scanning.',
    arHighlightsVi: 'Các dụng cụ học tập hỗ trợ thẻ AR Flashcard quét hình học tập tương tác.',
    defaultCoverUrl: '/learnar-assets/courses/momo-school-food-english-5-7/images/course-cover.webp',
  },
};

/**
 * Resolve the CourseThemeConfig dynamically from course properties.
 * Adheres to Section 19 of prompt: uses existing course fields first.
 */
export function getCourseTheme(course?: Course | null): CourseThemeConfig {
  if (!course) return COURSE_THEMES.home;

  const key = (course.category_key || '').toLowerCase();
  const theme = (course.theme || '').toLowerCase();
  const id = (course.course_id || '').toLowerCase();

  if (key.includes('nature') || theme.includes('nature') || theme.includes('animal') || id.includes('nature')) {
    return COURSE_THEMES.nature;
  }

  if (key.includes('school') || key.includes('food') || theme.includes('school') || id.includes('school')) {
    return COURSE_THEMES.school;
  }

  return COURSE_THEMES.home;
}
